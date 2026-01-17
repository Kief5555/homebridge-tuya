<p align="center">
  <img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge Tuya

[![npm](https://img.shields.io/npm/v/homebridge-tuya)](https://www.npmjs.com/package/homebridge-tuya)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Control your Tuya / Smart Life devices through HomeKit using Homebridge.

## ✨ Features

- **No Developer Account Needed** - Just scan a QR code with your Tuya/Smart Life app
- **Simple Setup** - No Access ID, Access Secret, or cloud project required
- **Automatic Device Discovery** - All devices from your Tuya app are discovered automatically
- **Wide Device Support** - Lights, switches, outlets, fans, sensors, and more

## 📱 Supported Devices

| Category | Devices |
|----------|---------|
| 💡 Lights | Bulbs, LED strips, ceiling lights, dimmers |
| 🔌 Outlets | Smart plugs, power strips |
| 🔘 Switches | Wall switches, scene switches |
| 🌀 Fans | Standing fans, ceiling fans |
| 🚪 Sensors | Door/window, motion, temperature |
| 🪟 Covers | Curtains, blinds, garage doors |

## 🚀 Installation

### Via Homebridge UI (Recommended)

1. Open the Homebridge UI
2. Go to **Plugins**
3. Search for `homebridge-tuya`
4. Click **Install**

### Via npm

```bash
npm install -g homebridge-tuya
```

## ⚙️ Configuration

### Step 1: Add the Plugin

In the Homebridge UI, go to **Plugins** → **Homebridge Tuya** → **Settings**.

### Step 2: Select Your Region

Choose the region that matches your Tuya account:
- 🇺🇸 US (Western America)
- 🇪🇺 EU (Europe)
- 🇨🇳 CN (China)
- 🇮🇳 IN (India)

### Step 3: Link Your Account

1. Click **Link Tuya Account**
2. A QR code will appear
3. Open the **Tuya Smart** or **Smart Life** app on your phone
4. Tap **+** (Add Device) → **Scan** (QR code icon)
5. Scan the QR code
6. Confirm authorization in the app

That's it! Your devices will appear in HomeKit after restarting Homebridge.

## 📋 Example Config

```json
{
  "platforms": [
    {
      "platform": "TuyaPlatform",
      "name": "Tuya",
      "region": "US",
      "pollingInterval": 60
    }
  ]
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `platform` | string | **Required** | Must be `TuyaPlatform` |
| `name` | string | `Tuya` | Display name in Homebridge logs |
| `region` | string | `US` | Data center region: `US`, `EU`, `CN`, or `IN` |
| `pollingInterval` | number | `60` | How often to poll for device updates (seconds) |
| `hiddenAccessories` | array | `[]` | Device IDs or names to hide from HomeKit |

## 🔧 Development

### Build

```bash
npm install
npm run build
```

### Test

```bash
# Test API signature generation
npx tsx test/test-signature.ts

# Test QR code linking (interactive)
npx tsx test/test-linking.ts

# Test device discovery
npx tsx test/test-devices.ts
```

### Watch Mode

```bash
npm run watch
```

## ❓ FAQ

### Why don't I need a Tuya Developer Account?

This plugin uses the same embedded credentials as Home Assistant's Tuya integration. The linking flow works directly with your Tuya/Smart Life app account - no developer portal needed.

### My device isn't showing up

1. Make sure the device is online in your Tuya/Smart Life app
2. Restart Homebridge after linking
3. Check the Homebridge logs for errors

### Can I use this with devices from the old homebridge-tuya-web plugin?

Yes! If your devices work with the Tuya Smart or Smart Life app, they'll work with this plugin. Just uninstall the old plugin first to avoid conflicts.

## 📄 License

Apache-2.0

## 🙏 Credits

- [Home Assistant Tuya Integration](https://www.home-assistant.io/integrations/tuya/) - For the embedded credentials approach
- [homebridge-tuya-web](https://github.com/milo526/homebridge-tuya-web) - Original inspiration
