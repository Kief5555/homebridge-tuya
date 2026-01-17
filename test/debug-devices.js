
import axios from 'axios';

const TUYA_CLIENT_ID = 'HA_3y9q4ak7g4ephrvke';
// Token from user's log
const ACCESS_TOKEN = '284ffb0667c43109d191b8f75dbe276d';
const UID = 'az1768373111596ery7V';

const US_GATEWAY = 'https://openapi.tuyaus.com';
const HA_GATEWAY = 'https://apigw.iotbing.com';

function signRequest(method, path, body, accessToken) {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();

  const bodyStr = body ? JSON.stringify(body) : '';
  const contentHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const stringToSign = [method, contentHash, '', path].join('\n');

  // Signature string construction for API calls with token

  // Try 1: Standard calculation: client_id + access_token + t + nonce + stringToSign (This matches TuyaOpenAPI.ts logic roughly but let's check order)
  // TuyaOpenAPI.ts: TUYA_CLIENT_ID + timestamp + this.tokens.accessToken + nonce + stringToSign;
  // Wait, TuyaOpenAPI.ts says: TUYA_CLIENT_ID + timestamp + accessToken + nonce + stringToSign
  // Docs often say: client_id + access_token + t + nonce + stringToSign

  // Let's implement what's in TuyaOpenAPI.ts to test it exactly first
  const signStrTs = TUYA_CLIENT_ID + timestamp + accessToken + nonce + stringToSign;

  const sign = crypto.createHmac('sha256', '').update(signStrTs).digest('hex').toUpperCase();

  return {
    headers: {
      'client_id': TUYA_CLIENT_ID,
      't': timestamp,
      'sign': sign,
      'sign_method': 'HMAC-SHA256',
      'nonce': nonce,
      'access_token': accessToken,
      'Content-Type': 'application/json',
    },
    debugSignStr: signStrTs,
  };
}

// Alternative signature construction (client_id + token + t...)
function signRequestAlt(method, path, body, accessToken) {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const bodyStr = body ? JSON.stringify(body) : '';
  const contentHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const stringToSign = [method, contentHash, '', path].join('\n');


  const signStr = TUYA_CLIENT_ID + accessToken + timestamp + nonce + stringToSign;
  const sign = crypto.createHmac('sha256', '').update(signStr).digest('hex').toUpperCase();

  return {
    headers: {
      'client_id': TUYA_CLIENT_ID,
      't': timestamp,
      'sign': sign,
      'sign_method': 'HMAC-SHA256',
      'nonce': nonce,
      'access_token': accessToken,
      'Content-Type': 'application/json',
    },
  };
}


async function testDeviceList(baseUrl, label, signFunc = signRequest) {
  const path = `/v1.0/users/${UID}/devices`;
  console.log(`\n--- Testing ${label}: ${baseUrl}${path} ---`);

  const { headers } = signFunc('GET', path, null, ACCESS_TOKEN);

  try {
    const response = await axios.get(baseUrl + path, { headers });
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    if (response.data.success) {
      console.log('✅ SUCCESS! Found devices:', response.data.result.length);
    } else {
      console.log('❌ API Error:', response.data.msg);
      console.log('Code:', response.data.code);
    }
  } catch (error) {
    if (error.response) {
      console.log('❌ HTTP Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network/Code Error:', error.message);
    }
  }
}

async function run() {
  console.log('Starting Tuya Device List Diagnostic...');

  // 1. Test US Gateway with Standard Signature (Current Implementation)
  await testDeviceList(US_GATEWAY, 'US Gateway (Standard Sig)');

  // 2. Test HA Gateway with Standard Signature
  await testDeviceList(HA_GATEWAY, 'HA Gateway (Standard Sig)');

  // 3. Test US Gateway with Alt Signature
  await testDeviceList(US_GATEWAY, 'US Gateway (Alt Sig: ID+Token+T)', signRequestAlt);

  // 4. Test HA Gateway with Alt Signature
  await testDeviceList(HA_GATEWAY, 'HA Gateway (Alt Sig: ID+Token+T)', signRequestAlt);
}

run();
