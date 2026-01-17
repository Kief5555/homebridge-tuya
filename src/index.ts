/**
 * Homebridge Tuya Plugin Entry Point
 */

import type { API } from 'homebridge';

import { TuyaPlatform } from './platform.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

export default (api: API): void => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, TuyaPlatform);
};

export { TuyaPlatform } from './platform.js';
export type { TuyaPlatformConfig } from './platform.js';
export { TuyaAccessory } from './platformAccessory.js';
