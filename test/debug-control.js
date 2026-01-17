
import axios from 'axios';
import crypto from 'crypto';

const TUYA_CLIENT_ID = 'HA_3y9q4ak7g4ephrvke';
// Use tokens from logs
const ACCESS_TOKEN = 'ad757025ded3c09d69b05403b5d9d792';
const REFRESH_TOKEN = '0fc54bf3421215463acfe536ab85b969';
const REGION_URL = 'https://openapi.tuyaus.com';

// Device ID from logs
const DEVICE_ID = '05320627807d3a317afe';

class SimpleMobileAPI {
  constructor() {
    this.client = axios.create({ baseURL: REGION_URL });
    this.tokens = { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN };
  }

  async request(path, method = 'GET', params = {}, body = {}) {
    const rid = crypto.randomUUID();
    const hashKey = crypto.createHash('md5').update(rid + this.tokens.refreshToken).digest('hex');
    const secret = this.generateSecret(rid, '', hashKey);

    let finalParams = { ...params };
    let queryEncData = '';
    if (Object.keys(params).length > 0) {
      const jsonParams = JSON.stringify(params);
      queryEncData = this.encrypt(jsonParams, secret);
      finalParams = { encdata: queryEncData };
    }

    let finalBody = { ...body };
    let bodyEncData = '';
    if (Object.keys(body).length > 0) {
      const jsonBody = JSON.stringify(body);
      bodyEncData = this.encrypt(jsonBody, secret);
      finalBody = { encdata: bodyEncData };
    }

    const t = Date.now().toString();
    const headers = {
      'X-appKey': TUYA_CLIENT_ID,
      'X-requestId': rid,
      'X-sid': '',
      'X-time': t,
      'X-token': this.tokens.accessToken,
    };

    headers['X-sign'] = this.sign(hashKey, queryEncData, bodyEncData, headers);

    try {
      console.log(`Request: ${method} ${path}`);
      if (method === 'POST') {
        console.log('Body:', JSON.stringify(body));
      }

      const res = await this.client.request({
        url: path,
        method,
        params: finalParams,
        data: Object.keys(finalBody).length ? finalBody : undefined,
        headers,
      });

      if (res.data.result && typeof res.data.result === 'string') {
        const decrypted = this.decrypt(res.data.result, secret);
        try {
          res.data.result = JSON.parse(decrypted);
        } catch {
          res.data.result = decrypted;
        }
      }
      return res.data;
    } catch (e) {
      console.error('Error:', e.message, e.response?.data);
      return { success: false, msg: e.message };
    }
  }

  generateSecret(rid, sid, hashKey) {
    let message = hashKey;
    if (sid) {
      const mod = 16;
      const length = sid.length < mod ? sid.length : mod;
      let ecode = '';
      for (let i = 0; i < length; i++) {
        ecode += sid[sid.charCodeAt(i) % mod];
      }
      message += '_' + ecode;
    }
    const hmac = crypto.createHmac('sha256', rid);
    hmac.update(message);
    return hmac.digest('hex').substring(0, 16);
  }

  sign(hashKey, queryEnc, bodyEnc, headers) {
    const headerKeys = ['X-appKey', 'X-requestId', 'X-sid', 'X-time', 'X-token'];
    let str = '';
    for (const k of headerKeys) {
      const val = headers[k];
      if (val) {
        str += `${k}=${val}||`;
      }
    }
    if (str.endsWith('||')) {
      str = str.slice(0, -2);
    }

    if (queryEnc) {
      str += queryEnc;
    }
    if (bodyEnc) {
      str += bodyEnc;
    }
    return crypto.createHmac('sha256', hashKey).update(str).digest('hex');
  }

  encrypt(data, secret) {
    const nonce = this.randomNonce(12);
    const secretBuf = Buffer.from(secret, 'utf8');
    const nonceBuf = Buffer.from(nonce, 'utf8');
    const cipher = crypto.createCipheriv('aes-128-gcm', secretBuf, nonceBuf);
    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();
    return nonceBuf.toString('base64') + Buffer.concat([encrypted, tag]).toString('base64');
  }

  decrypt(data, secret) {
    const full = Buffer.from(data, 'base64');
    const nonce = full.subarray(0, 12);
    const cipherTextTag = full.subarray(12);
    const tag = cipherTextTag.subarray(cipherTextTag.length - 16);
    const cipherText = cipherTextTag.subarray(0, cipherTextTag.length - 16);
    const decipher = crypto.createDecipheriv('aes-128-gcm', Buffer.from(secret, 'utf8'), nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf8');
  }

  randomNonce(len) {
    const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }
}

async function run() {
  const api = new SimpleMobileAPI();

  // Try to toggle power
  console.log('\n--- Sending Command (Toggle Power) ---');
  // Using simple command first
  const commands = [{ code: 'switch_led', value: true }];

  const result = await api.request(`/v1.1/m/thing/${DEVICE_ID}/commands`, 'POST', {}, { commands });
  console.log(JSON.stringify(result, null, 2));
}

run();
