#!/usr/bin/env node
/**
 * Test Script: Device Discovery
 * 
 * This script tests device discovery after linking.
 * Run with: npx tsx test/test-devices.ts <tokens-file>
 * 
 * The tokens file should be a JSON file with the tokens from test-linking.ts
 */

import { TuyaOpenAPI } from '../src/api/TuyaOpenAPI.js';
import { TuyaDeviceAPI } from '../src/api/TuyaDeviceAPI.js';
import type { TuyaTokens, TuyaRegion } from '../src/api/TuyaLinkingAuth.js';
import fs from 'fs';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           TUYA DEVICE DISCOVERY TEST                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();

  // Check for tokens file argument
  const tokensArg = process.argv[2];
  
  let tokens: TuyaTokens;
  let region: TuyaRegion = 'US';

  if (tokensArg) {
    // Load from file
    try {
      const data = JSON.parse(fs.readFileSync(tokensArg, 'utf-8'));
      tokens = data.tokens;
      region = data.region || 'US';
    } catch {
      console.error('Failed to read tokens file. Format: { "tokens": {...}, "region": "US" }');
      process.exit(1);
    }
  } else {
    // Check environment variables
    const accessToken = process.env.TUYA_ACCESS_TOKEN;
    const refreshToken = process.env.TUYA_REFRESH_TOKEN;
    const uid = process.env.TUYA_UID;
    region = (process.env.TUYA_REGION as TuyaRegion) || 'US';

    if (!accessToken || !refreshToken || !uid) {
      console.log('Usage: npx tsx test/test-devices.ts <tokens-file>');
      console.log();
      console.log('Or set environment variables:');
      console.log('  TUYA_ACCESS_TOKEN=...');
      console.log('  TUYA_REFRESH_TOKEN=...');
      console.log('  TUYA_UID=...');
      console.log('  TUYA_REGION=US|EU|CN|IN');
      console.log();
      console.log('Run test-linking.ts first to get tokens.');
      process.exit(1);
    }

    tokens = {
      accessToken,
      refreshToken,
      uid,
      expiresIn: 7200,
      expiresAt: Date.now() + 7200 * 1000,
    };
  }

  console.log(`Using region: ${region}`);
  console.log(`User ID: ${tokens.uid}`);
  console.log();

  // Initialize API
  const api = new TuyaOpenAPI(region);
  api.setTokens(tokens);

  const deviceApi = new TuyaDeviceAPI(api);

  try {
    console.log('Discovering devices...');
    console.log();

    const devices = await deviceApi.getDeviceList();

    if (devices.length === 0) {
      console.log('No devices found.');
      console.log('Make sure you have devices added in your Tuya/Smart Life app.');
      return;
    }

    console.log(`Found ${devices.length} device(s):`);
    console.log();

    for (const device of devices) {
      const type = deviceApi.getAccessoryType(device.category) || 'unknown';
      
      console.log('┌─────────────────────────────────────────────────────────────────');
      console.log(`│ ${device.name}`);
      console.log('├─────────────────────────────────────────────────────────────────');
      console.log(`│ ID:       ${device.id}`);
      console.log(`│ Category: ${device.category} (${type})`);
      console.log(`│ Product:  ${device.product_name || 'N/A'}`);
      console.log(`│ Online:   ${device.online ? '✅ Yes' : '❌ No'}`);
      
      if (device.status && device.status.length > 0) {
        console.log('│ Status:');
        for (const status of device.status) {
          console.log(`│   - ${status.code}: ${JSON.stringify(status.value)}`);
        }
      }
      
      console.log('└─────────────────────────────────────────────────────────────────');
      console.log();
    }

    console.log('✅ Device discovery successful!');

  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  } finally {
    api.destroy();
  }
}

main();
