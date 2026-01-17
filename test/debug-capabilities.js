
import axios from 'axios';
import crypto from 'crypto';

const TUYA_CLIENT_ID = 'HA_3y9q4ak7g4ephrvke';
// You might need to update these from your latest successful run logs or hardcode newly retrieved ones if expired, 
// but for now let's use the logic to get them or assume user provides valid ones in a real scenario. 
// Since I can't interactively login, I'll rely on the user to put valid tokens or I can look at logs if provided.
// The user provided logs show: 
// Mobile Tokens: {"accessToken":"ad757025ded3c09d69b05403b5d9d792","refreshToken":"0fc54bf3421215463acfe536ab85b969", ...}
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
    if (Object.keys(params).length > 0) {
      const jsonParams = JSON.stringify(params);
      finalParams = { encdata: this.encrypt(jsonParams, secret) };
    }

    let finalBody = { ...body };
    if (Object.keys(body).length > 0) {
      const jsonBody = JSON.stringify(body);
      finalBody = { encdata: this.encrypt(jsonBody, secret) };
    }

    const t = Date.now().toString();
    const headers = {
      'X-appKey': TUYA_CLIENT_ID,
      'X-requestId': rid,
      'X-sid': '',
      'X-time': t,
      'X-token': this.tokens.accessToken,
    };

    headers['X-sign'] = this.sign(hashKey, finalParams.encdata || '', finalBody.encdata || '', headers);

    try {
      console.log(`Request: ${method} ${path}`);
      const res = await this.client.request({ url: path, method, params: finalParams, data: Object.keys(finalBody).length ? finalBody : undefined, headers });

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

  // 1. Get Device Details (Status + Basic Info)
  console.log('\n--- Querying Device Details ---');
  const details = await api.request('/v1.0/m/life/ha/devices/detail', 'GET', { devIds: DEVICE_ID });
  console.log(JSON.stringify(details, null, 2));

  // 2. Get Specifications (Functions + Status Range)
  console.log('\n--- Querying Device Specifications ---');
  const specs = await api.request(`/v1.1/m/life/${DEVICE_ID}/specifications`, 'GET');
  console.log(JSON.stringify(specs, null, 2));
}

run();
