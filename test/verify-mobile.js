
import axios from 'axios';
import crypto from 'crypto';

const TUYA_CLIENT_ID = 'HA_3y9q4ak7g4ephrvke';
const ACCESS_TOKEN = '284ffb0667c43109d191b8f75dbe276d';
const REFRESH_TOKEN = 'dffd35e577ff0ea7fb78a6a5e75d0da7';

async function testMobileFlow(baseUrl, label) {
  console.log(`\nTesting ${label} (${baseUrl})...`);

  const rid = crypto.randomUUID();
  const hashKey = crypto.createHash('md5').update(rid + REFRESH_TOKEN).digest('hex');

  // Generate Secret
  let message = hashKey;
  const hmacSecret = crypto.createHmac('sha256', rid).update(message).digest('hex').substring(0, 16);
  // console.log('Secret:', hmacSecret); // Debug

  const t = Date.now().toString();
  const headers = {
    'X-appKey': TUYA_CLIENT_ID,
    'X-requestId': rid,
    'X-sid': '',
    'X-time': t,
    'X-token': ACCESS_TOKEN,
  };

  const headerKeys = ['X-appKey', 'X-requestId', 'X-sid', 'X-time', 'X-token'];
  let headerSignStr = '';

  for (const key of headerKeys) {
    const val = headers[key] || '';
    if (val !== '') {
      headerSignStr += key + '=' + val + '||';
    }
  }

  if (headerSignStr.endsWith('||')) {
    headerSignStr = headerSignStr.slice(0, -2);
  }

  // params encdata for GET?
  // SDK query_homes has no params. So query_encdata is empty.
  // sign_str += query_encdata (which is empty)
  // sign_str += body_encdata (which is empty)

  // console.log('Sign String:', headerSignStr); // Debug

  const signHmac = crypto.createHmac('sha256', hashKey).update(headerSignStr).digest('hex');
  headers['X-sign'] = signHmac;

  // Try both path variations if needed, but SDK uses /v1.0/m/life/users/homes
  const path = '/v1.0/m/life/users/homes';

  try {
    const url = baseUrl + path;
    const response = await axios.get(url, { headers });
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);

    if (response.data.result) {
      console.log('✅ SUCCESS! Got encrypted result.');
      // Decryption check
      try {
        const cipherData = response.data.result;
        const fullBuffer = Buffer.from(cipherData, 'base64');
        const nonce = fullBuffer.subarray(0, 12);
        const ciphertextWithTag = fullBuffer.subarray(12);
        const tag = ciphertextWithTag.subarray(ciphertextWithTag.length - 16);
        const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - 16);

        const decipher = crypto.createDecipheriv('aes-128-gcm', hmacSecret, nonce);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        console.log('Decrypted Result:', decrypted.toString('utf8'));
      } catch (e) {
        console.log('Decryption failed:', e.message);
      }
    } else {
      console.log('Error Msg:', response.data.msg);
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
  await testMobileFlow('https://openapi.tuyaus.com', 'US Open API');
}

run();
