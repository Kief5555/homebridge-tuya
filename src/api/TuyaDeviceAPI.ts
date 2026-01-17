/**
 * Tuya Device API
 * 
 * Handles device discovery and control using Tuya OpenAPI.
 */

import { TuyaOpenAPI } from './TuyaOpenAPI.js';
import type { Logger } from 'homebridge';

export interface TuyaDevice {
  id: string;
  name: string;
  uid: string;
  local_key: string;
  category: string;
  product_id: string;
  product_name: string;
  sub: boolean; // Is this a sub-device?
  uuid: string;
  owner_id: string;
  online: boolean;
  status: TuyaDeviceStatus[];
  time_zone: string;
  ip: string;
  create_time: number;
  update_time: number;
  active_time: number;
  icon: string;
  model: string;
}

export interface TuyaDeviceStatus {
  code: string;
  value: boolean | number | string;
}

export interface TuyaDeviceCommand {
  code: string;
  value: boolean | number | string;
}

// Device category mapping to HomeKit accessory types
export const DEVICE_CATEGORIES = {
  // Lights
  dj: 'light',           // Light
  dd: 'light',           // Light strip
  fwd: 'light',          // Ambient light
  dc: 'light',           // Light string
  xdd: 'light',          // Ceiling light
  fsd: 'light',          // Ceiling fan light
  
  // Switches & Outlets
  kg: 'switch',          // Switch
  cz: 'outlet',          // Socket/outlet
  pc: 'outlet',          // Power strip
  
  // Climate
  kt: 'thermostat',      // Air conditioner
  wk: 'thermostat',      // Thermostat
  rs: 'heater',          // Heater
  
  // Fans
  fs: 'fan',             // Fan
  fskg: 'fan',           // Ceiling fan with light (fan mode)
  
  // Sensors
  pir: 'motion_sensor',  // PIR sensor
  mcs: 'contact_sensor', // Door/window sensor
  wsdcg: 'temp_sensor',  // Temp/humidity sensor
  ywbj: 'smoke_sensor',  // Smoke detector
  rqbj: 'gas_sensor',    // Gas detector
  sj: 'leak_sensor',     // Water leak sensor
  
  // Covers
  cl: 'cover',           // Curtain
  clkg: 'cover',         // Curtain switch
  ckmkzq: 'cover',       // Garage door
  
  // Other
  sp: 'camera',          // Camera
  bh: 'humidifier',      // Humidifier
  cs: 'dehumidifier',    // Dehumidifier
  xxj: 'air_purifier',   // Air purifier
} as const;

export type DeviceCategory = keyof typeof DEVICE_CATEGORIES;
export type AccessoryType = typeof DEVICE_CATEGORIES[DeviceCategory];

export class TuyaDeviceAPI {
  constructor(
    private readonly api: TuyaOpenAPI,
    private readonly log?: Logger,
  ) {}

  /**
   * Get all devices for the authenticated user
   */
  public async getDeviceList(): Promise<TuyaDevice[]> {
    const tokens = this.api.getTokens();
    if (!tokens?.uid) {
      throw new Error('No authenticated user. Please link your account first.');
    }

    const response = await this.api.request<TuyaDevice[]>(
      `/v1.0/users/${tokens.uid}/devices`,
      'GET',
    );

    if (!response.success || !response.result) {
      throw new Error(`Failed to get device list: ${response.msg}`);
    }

    this.log?.debug('Found', response.result.length, 'devices');

    return response.result;
  }

  /**
   * Get the current status of a device
   */
  public async getDeviceStatus(deviceId: string): Promise<TuyaDeviceStatus[]> {
    const response = await this.api.request<TuyaDeviceStatus[]>(
      `/v1.0/devices/${deviceId}/status`,
      'GET',
    );

    if (!response.success || !response.result) {
      throw new Error(`Failed to get device status: ${response.msg}`);
    }

    return response.result;
  }

  /**
   * Get detailed device information
   */
  public async getDeviceInfo(deviceId: string): Promise<TuyaDevice> {
    const response = await this.api.request<TuyaDevice>(
      `/v1.0/devices/${deviceId}`,
      'GET',
    );

    if (!response.success || !response.result) {
      throw new Error(`Failed to get device info: ${response.msg}`);
    }

    return response.result;
  }

  /**
   * Send commands to a device
   */
  public async sendCommands(deviceId: string, commands: TuyaDeviceCommand[]): Promise<boolean> {
    const response = await this.api.request<boolean>(
      `/v1.0/devices/${deviceId}/commands`,
      'POST',
      { commands },
    );

    if (!response.success) {
      throw new Error(`Failed to send commands: ${response.msg}`);
    }

    return response.result ?? true;
  }

  /**
   * Turn a device on or off
   */
  public async setDevicePower(deviceId: string, on: boolean): Promise<boolean> {
    return this.sendCommands(deviceId, [{ code: 'switch_led', value: on }]);
  }

  /**
   * Set brightness (for lights)
   */
  public async setBrightness(deviceId: string, brightness: number): Promise<boolean> {
    // Tuya uses 10-1000 scale for brightness
    const value = Math.round(brightness * 10);
    return this.sendCommands(deviceId, [{ code: 'bright_value_v2', value }]);
  }

  /**
   * Set color temperature (for lights, in Kelvin)
   */
  public async setColorTemperature(deviceId: string, kelvin: number): Promise<boolean> {
    // Tuya uses 0-1000 scale for color temp
    // Map from typical 2700K-6500K range
    const value = Math.round(((kelvin - 2700) / (6500 - 2700)) * 1000);
    return this.sendCommands(deviceId, [{ code: 'temp_value_v2', value }]);
  }

  /**
   * Set HSV color (for RGB lights)
   */
  public async setColor(deviceId: string, h: number, s: number, v: number): Promise<boolean> {
    // Tuya expects HSV in specific format
    const colorValue = {
      h: Math.round(h),           // 0-360
      s: Math.round(s * 10),      // 0-1000
      v: Math.round(v * 10),      // 0-1000
    };
    return this.sendCommands(deviceId, [
      { code: 'colour_data_v2', value: JSON.stringify(colorValue) },
    ]);
  }

  /**
   * Get the accessory type for a device category
   */
  public getAccessoryType(category: string): AccessoryType | undefined {
    return DEVICE_CATEGORIES[category as DeviceCategory];
  }
}
