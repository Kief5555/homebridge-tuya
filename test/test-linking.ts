#!/usr/bin/env node
/**
 * Test Script: QR Code Linking Flow
 * 
 * This script tests the QR code generation and linking flow.
 * Run with: npx tsx test/test-linking.ts
 * 
 * Requirements:
 * - Tuya Smart or Smart Life app installed on your phone
 * - A Tuya account with at least one device
 */

import { TuyaLinkingAuth } from '../src/api/TuyaLinkingAuth.js';
import QRCode from 'qrcode';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           TUYA LINKING CODE TEST SCRIPT                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();

  // Select region
  console.log('Available regions:');
  console.log('  1. US (Western America)');
  console.log('  2. EU (Europe)');
  console.log('  3. CN (China)');
  console.log('  4. IN (India)');
  console.log();

  const regionChoice = await question('Select region (1-4) [1]: ');
  const regions = ['US', 'EU', 'CN', 'IN'] as const;
  const region = regions[parseInt(regionChoice) - 1] || 'US';

  console.log(`\nUsing region: ${region}`);
  console.log();

  // Initialize linking auth
  const auth = new TuyaLinkingAuth(region);

  try {
    // Get QR code
    console.log('Generating QR code...');
    const qrData = await auth.getQRCode();
    const qrUrl = auth.generateQRCodeUrl(qrData.qrcode);

    console.log();
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   SCAN WITH TUYA APP                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log();

    // Print QR code to terminal
    const qrText = await QRCode.toString(qrUrl, { type: 'terminal', small: true });
    console.log(qrText);

    console.log(`\nQR Code expires in ${qrData.expiresIn} seconds`);
    console.log();
    console.log('Instructions:');
    console.log('  1. Open Tuya Smart or Smart Life app');
    console.log('  2. Tap the + button (Add Device)');
    console.log('  3. Tap the scan icon (top right)');
    console.log('  4. Scan this QR code');
    console.log('  5. Confirm authorization in the app');
    console.log();

    // Poll for authorization
    console.log('Waiting for authorization...');
    console.log('(Press Ctrl+C to cancel)');
    console.log();

    const tokens = await auth.pollForAuthorization();

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   AUTHORIZATION SUCCESSFUL!                    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log();
    console.log('Tokens received:');
    console.log(`  User ID: ${tokens.uid}`);
    console.log(`  Access Token: ${tokens.accessToken.substring(0, 20)}...`);
    console.log(`  Expires in: ${tokens.expiresIn} seconds`);
    console.log();
    console.log('✅ The linking flow works! You can now use these tokens in the plugin.');

  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  } finally {
    auth.destroy();
    rl.close();
  }
}

main();
