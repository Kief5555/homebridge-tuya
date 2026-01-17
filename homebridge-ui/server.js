/**
 * Custom UI Server for Homebridge Config UI X
 * 
 * Provides endpoints for the QR code linking flow.
 * Uses embedded Tuya credentials - no user configuration needed.
 */

import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import QRCode from 'qrcode';
import crypto from 'crypto';
import axios from 'axios';

// Embedded credentials (same as Home Assistant)
const TUYA_CLIENT_ID = 'HA_3y9q4ak7g4ephrvke';
const TUYA_SCHEMA = 'haauthorize';

// Tuya API endpoints by region
const ENDPOINTS = {
  US: 'https://openapi.tuyaus.com',
  EU: 'https://openapi.tuyaeu.com',
  CN: 'https://openapi.tuyacn.com',
  IN: 'https://openapi.tuyain.com',
};

class TuyaUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    this.linkingState = null;

    // Register request handlers
    this.onRequest('/start-linking', this.startLinking.bind(this));
    this.onRequest('/check-status', this.checkStatus.bind(this));
    this.onRequest('/get-config', this.getConfig.bind(this));

    this.ready();
  }

  /**
     * Sign a Tuya API request (simplified for haauthorize schema)
     */
  signRequest(method, path, body) {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();

    const bodyStr = body ? JSON.stringify(body) : '';
    const contentHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
    const stringToSign = [method, contentHash, '', path].join('\n');

    // For haauthorize schema, use empty secret
    const signStr = TUYA_CLIENT_ID + timestamp + nonce + stringToSign;
    const sign = crypto.createHmac('sha256', '').update(signStr).digest('hex').toUpperCase();

    return {
      'client_id': TUYA_CLIENT_ID,
      't': timestamp,
      'sign': sign,
      'sign_method': 'HMAC-SHA256',
      'nonce': nonce,
      'Content-Type': 'application/json',
    };
  }

  /**
     * Start the linking process - generate QR code
     */
  async startLinking(payload) {
    try {
      const region = payload.region || 'US';
      const baseUrl = ENDPOINTS[region] || ENDPOINTS.US;

      const path = '/v1.0/iot-03/open-api-qrcode/token';
      const body = { schema: TUYA_SCHEMA };
      const headers = this.signRequest('POST', path, body);

      const response = await axios.post(baseUrl + path, body, { headers });

      if (!response.data.success || !response.data.result) {
        throw new Error(`Tuya API error: ${response.data.msg || 'Unknown error'}`);
      }

      const { qrcode, expire_time } = response.data.result;

      // Generate QR code data URL
      const qrData = `tuyaSmart--qrLogin?token=${qrcode}`;
      const qrImage = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });

      // Store state
      this.linkingState = {
        qrcode,
        region,
        baseUrl,
        expiresAt: Date.now() + expire_time * 1000,
      };

      return { success: true, qrImage, expiresIn: expire_time };
    } catch (error) {
      console.error('Start linking failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
     * Check the linking status
     */
  async checkStatus() {
    try {
      if (!this.linkingState) {
        return { success: false, error: 'No linking in progress' };
      }

      if (Date.now() > this.linkingState.expiresAt) {
        this.linkingState = null;
        return { success: true, status: 'expired' };
      }

      const path = '/v1.0/iot-03/open-api-qrcode/result';
      const body = { qrcode: this.linkingState.qrcode };
      const headers = this.signRequest('POST', path, body);

      const response = await axios.post(this.linkingState.baseUrl + path, body, { headers });

      if (!response.data.success) {
        if (response.data.code === 1106) {
          this.linkingState = null;
          return { success: true, status: 'expired' };
        }
        throw new Error(`Tuya API error: ${response.data.msg}`);
      }

      const result = response.data.result;
      const statusMap = { '0': 'pending', '1': 'scanned', '2': 'authorized' };
      const status = statusMap[result?.status?.toString()] || 'pending';

      if (status === 'authorized' && result?.result) {
        const tokens = {
          accessToken: result.result.access_token,
          refreshToken: result.result.refresh_token,
          expiresIn: result.result.expire_time,
          expiresAt: Date.now() + result.result.expire_time * 1000,
          uid: result.result.uid,
        };

        this.linkingState = null;
        return { success: true, status: 'authorized', tokens };
      }

      return { success: true, status };
    } catch (error) {
      console.error('Check status failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
     * Get current config
     */
  async getConfig() {
    try {
      const config = await this.getPluginConfig();
      return { success: true, config: config[0] || {} };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

(() => new TuyaUiServer())();
