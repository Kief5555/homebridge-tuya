/**
 * Tuya API Module
 * 
 * Re-exports all API classes for convenient importing.
 */

export { TUYA_CLIENT_ID, TUYA_SCHEMA } from './credentials.js';

export { TuyaLinkingAuth, TUYA_ENDPOINTS } from './TuyaLinkingAuth.js';
export type { TuyaRegion, TuyaTokens, QRCodeData, QRAuthStatus } from './TuyaLinkingAuth.js';

export { TuyaOpenAPI } from './TuyaOpenAPI.js';
export type { TuyaApiResponse } from './TuyaOpenAPI.js';

export { TuyaMobileAPI } from './TuyaMobileAPI.js';

export { TuyaDeviceAPI, DEVICE_CATEGORIES } from './TuyaDeviceAPI.js';
export type { 
  TuyaDevice, 
  TuyaDeviceStatus, 
  TuyaDeviceCommand, 
  DeviceCategory, 
  AccessoryType,
} from './TuyaDeviceAPI.js';
