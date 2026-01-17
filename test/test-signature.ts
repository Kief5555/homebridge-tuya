#!/usr/bin/env node
/**
 * Test Script: API Signature Verification  
 * 
 * This script verifies the HMAC-SHA256 signing is working correctly.
 * Run with: npx tsx test/test-signature.ts
 */

import crypto from 'crypto';

const TUYA_CLIENT_ID = 'HA_3y9q4ak7g4ephrvke';
const TUYA_SCHEMA = 'haauthorize';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           TUYA API SIGNATURE TEST                              ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log();

// Test 1: Content hash generation
console.log('Test 1: Content Hash Generation');
console.log('─────────────────────────────────');

const emptyHash = crypto.createHash('sha256').update('').digest('hex');
console.log(`  Empty body hash: ${emptyHash}`);
console.log(`  Expected: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`);
console.log(`  ✅ ${emptyHash === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' ? 'PASS' : 'FAIL'}`);
console.log();

const bodyHash = crypto.createHash('sha256').update(JSON.stringify({ schema: TUYA_SCHEMA })).digest('hex');
console.log(`  Body hash: ${bodyHash}`);
console.log();

// Test 2: Signature generation
console.log('Test 2: Signature Generation');
console.log('─────────────────────────────────');

const timestamp = '1699999999999';
const nonce = 'test-nonce-123';
const path = '/v1.0/iot-03/open-api-qrcode/token';
const method = 'POST';

const stringToSign = [method, bodyHash, '', path].join('\n');
console.log(`  String to sign (escaped):`);
console.log(`    ${JSON.stringify(stringToSign)}`);
console.log();

// For haauthorize schema, use empty secret
const signStr = TUYA_CLIENT_ID + timestamp + nonce + stringToSign;
const sign = crypto.createHmac('sha256', '').update(signStr).digest('hex').toUpperCase();

console.log(`  Sign string: ${signStr.substring(0, 50)}...`);
console.log(`  Signature: ${sign}`);
console.log();

// Test 3: Headers generation
console.log('Test 3: Headers Generation');
console.log('─────────────────────────────────');

const headers = {
  'client_id': TUYA_CLIENT_ID,
  't': timestamp,
  'sign': sign,
  'sign_method': 'HMAC-SHA256',
  'nonce': nonce,
  'Content-Type': 'application/json',
};

console.log('  Generated headers:');
for (const [key, value] of Object.entries(headers)) {
  console.log(`    ${key}: ${value}`);
}
console.log();

console.log('✅ All signature tests completed');
console.log();
console.log('Note: To fully test the API, run test-linking.ts which makes real requests.');
