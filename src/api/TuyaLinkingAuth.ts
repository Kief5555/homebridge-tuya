/**
 * Tuya Linking Code Authentication
 * 
 * Implements the QR code / linking code OAuth flow for Tuya Smart Life app.
 * This allows users to scan a QR code with their Tuya app to authorize access.
 * 
 * Uses embedded credentials - users don't need a Tuya developer account.
 */

import axios from 'axios';
import crypto from 'crypto';
import type { Logger } from 'homebridge';
import { TUYA_CLIENT_ID, TUYA_SCHEMA } from './credentials.js';

// Regional API endpoints
export const TUYA_ENDPOINTS = {
  US: 'https://openapi.tuyaus.com',
  EU: 'https://openapi.tuyaeu.com',
  CN: 'https://openapi.tuyacn.com',
  IN: 'https://openapi.tuyain.com',
} as const;

export type TuyaRegion = keyof typeof TUYA_ENDPOINTS;

export interface TuyaTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
  uid: string;
}

export interface QRCodeData {
  qrcode: string;
  expiresIn: number;
}

export interface QRAuthStatus {
  status: 'pending' | 'scanned' | 'authorized' | 'expired';
  tokens?: TuyaTokens;
}

/**
 * TuyaLinkingAuth handles the QR code linking flow
 * 
 * Flow:
 * 1. Call getQRCode() to get a QR token
 * 2. Generate QR image from the token
 * 3. User scans with Tuya/Smart Life app
 * 4. Poll checkAuthStatus() until authorized
 * 5. Use tokens for API access
 */
export class TuyaLinkingAuth {
  private baseUrl: string;
  private currentQRToken?: string;
  private pollingTimer?: NodeJS.Timeout;

  constructor(
    private readonly region: TuyaRegion = 'US',
    private readonly log?: Logger,
  ) {
    this.baseUrl = TUYA_ENDPOINTS[region];
  }

  /**
   * Generate a signed request for the linking API
   * Uses the HMAC-SHA256 signing method required by Tuya
   */
  private signRequest(
    method: string,
    path: string,
    body?: object,
    accessToken?: string,
  ): { headers: Record<string, string>; url: string } {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();

    // Content hash
    const bodyStr = body ? JSON.stringify(body) : '';
    const contentHash = crypto.createHash('sha256').update(bodyStr).digest('hex');

    // Build string to sign
    const stringToSign = [method.toUpperCase(), contentHash, '', path].join('\n');

    // Build signature string
    // For the haauthorize schema, we use empty string as secret since Tuya handles it
    let signStr = TUYA_CLIENT_ID + timestamp;
    if (accessToken) {
      signStr += accessToken;
    }
    signStr += nonce + stringToSign;

    // Sign with empty secret (Tuya's linking flow handles auth differently)
    const sign = crypto
      .createHmac('sha256', '')
      .update(signStr)
      .digest('hex')
      .toUpperCase();

    return {
      headers: {
        'client_id': TUYA_CLIENT_ID,
        't': timestamp,
        'sign': sign,
        'sign_method': 'HMAC-SHA256',
        'nonce': nonce,
        'Content-Type': 'application/json',
        ...(accessToken && { 'access_token': accessToken }),
      },
      url: this.baseUrl + path,
    };
  }

  /**
   * Get a QR code token for linking
   */
  public async getQRCode(): Promise<QRCodeData> {
    const path = '/v1.0/iot-03/open-api-qrcode/token';
    const body = { schema: TUYA_SCHEMA };

    const { headers, url } = this.signRequest('POST', path, body);

    const response = await axios.post(url, body, { headers });
    const data = response.data;

    if (!data.success || !data.result) {
      throw new Error(`Failed to get QR code: ${data.msg || 'Unknown error'}`);
    }

    this.currentQRToken = data.result.qrcode;

    this.log?.debug('Got QR code token, expires in', data.result.expire_time, 'seconds');

    return {
      qrcode: data.result.qrcode,
      expiresIn: data.result.expire_time,
    };
  }

  /**
   * Generate the QR code data URL
   * This is what should be encoded into the QR image
   */
  public generateQRCodeUrl(token?: string): string {
    const qrToken = token || this.currentQRToken;
    if (!qrToken) {
      throw new Error('No QR token available. Call getQRCode() first.');
    }
    // Format that Tuya/Smart Life app recognizes
    return `tuyaSmart--qrLogin?token=${qrToken}`;
  }

  /**
   * Check the authorization status
   */
  public async checkAuthStatus(): Promise<QRAuthStatus> {
    if (!this.currentQRToken) {
      throw new Error('No QR token available. Call getQRCode() first.');
    }

    const path = '/v1.0/iot-03/open-api-qrcode/result';
    const body = { qrcode: this.currentQRToken };

    const { headers, url } = this.signRequest('POST', path, body);

    const response = await axios.post(url, body, { headers });
    const data = response.data;

    if (!data.success) {
      // Error code 1106 typically means expired
      if (data.code === 1106 || (data.msg && data.msg.includes('expired'))) {
        this.currentQRToken = undefined;
        return { status: 'expired' };
      }
      throw new Error(`Failed to check status: ${data.msg || 'Unknown error'}`);
    }

    const result = data.result;
    if (!result) {
      return { status: 'pending' };
    }

    // Status codes: 0=pending, 1=scanned, 2=authorized
    const statusMap: Record<string, QRAuthStatus['status']> = {
      '0': 'pending',
      '1': 'scanned',
      '2': 'authorized',
    };

    const status = statusMap[result.status?.toString()] || 'pending';

    if (status === 'authorized' && result.result) {
      const tokens: TuyaTokens = {
        accessToken: result.result.access_token,
        refreshToken: result.result.refresh_token,
        expiresIn: result.result.expire_time,
        expiresAt: Date.now() + result.result.expire_time * 1000,
        uid: result.result.uid,
      };

      this.currentQRToken = undefined;
      return { status: 'authorized', tokens };
    }

    return { status };
  }

  /**
   * Poll for authorization until complete or timeout
   */
  public pollForAuthorization(
    intervalMs = 2000,
    timeoutMs = 180000,
  ): Promise<TuyaTokens> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const poll = async () => {
        try {
          const status = await this.checkAuthStatus();

          switch (status.status) {
            case 'authorized':
              this.stopPolling();
              if (status.tokens) {
                resolve(status.tokens);
              } else {
                reject(new Error('Authorization completed but no tokens received'));
              }
              break;

            case 'expired':
              this.stopPolling();
              reject(new Error('QR code expired. Please generate a new one.'));
              break;

            case 'scanned':
              this.log?.debug('QR code scanned, waiting for authorization...');
              break;

            case 'pending':
              if (Date.now() - startTime > timeoutMs) {
                this.stopPolling();
                reject(new Error('Authorization timed out.'));
              }
              break;
          }
        } catch (error) {
          this.stopPolling();
          reject(error);
        }
      };

      this.pollingTimer = setInterval(poll, intervalMs);
      poll(); // Run immediately
    });
  }

  /**
   * Stop polling
   */
  public stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
  }

  /**
   * Clean up
   */
  public destroy(): void {
    this.stopPolling();
  }
}
