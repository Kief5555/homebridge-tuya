
import axios from 'axios';

const TUYA_CLIENT_ID = 'HA_3y9q4ak7g4ephrvke';
const TUYA_SCHEMA = 'haauthorize';
const MOCK_USER_CODE = '123456';

// Testing both the specific gateway found in SDK and the standard regional URL
const API_GATEWAY = 'https://apigw.iotbing.com';
const US_GATEWAY = 'https://openapi.tuyaus.com';

async function testHaEndpoint(baseUrl, label) {
  const path = '/v1.0/m/life/home-assistant/qrcode/tokens';
  const url = `${baseUrl}${path}?clientid=${TUYA_CLIENT_ID}&usercode=${MOCK_USER_CODE}&schema=${TUYA_SCHEMA}`;

  console.log(`\n--- Testing ${label}: ${path} [POST] ---`);
  console.log(`URL: ${url}`);

  try {
    // SDK uses POST with no body and no special headers
    const response = await axios.post(url, {}, { headers: {} });

    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    if (response.data.success) {
      console.log('✅ VALID ENDPOINT FOUND!');
      console.log('Result:', JSON.stringify(response.data.result, null, 2));
    } else {
      // Validation might fail on user code, but getting a semantic error (not 404/uri invalid) is success here
      console.log('❌ API Error (Expected if user code invalid):', response.data.msg);
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
  console.log('Starting Tuya HA Endpoint Diagnostic...');

  await testHaEndpoint(API_GATEWAY, 'SDK Gateway (iotbing)');
  await testHaEndpoint(US_GATEWAY, 'US Gateway (tuyaus)');
}

run();
