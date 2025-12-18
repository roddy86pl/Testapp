# TestApp - React Native for Amazon Vega OS/Kepler

A React Native application optimized for Amazon Fire TV devices running Vega OS (Kepler runtime). This application uses WebView to display an HTML/JavaScript-based IPTV player.

## Architecture

This app uses a **hybrid architecture**:
- **React Native (Vega OS/Kepler)**: Native wrapper that provides WebView and handles TV remote events
- **HTML/JavaScript**: The main application logic in `index.html`, `scripts.js`, and `styles.css`
- **WebView Bridge**: Communication layer between React Native and the web application

## Features

- ✅ **Vega OS/Kepler Compatible**: Built for Amazon Fire TV Stick and similar devices
- ✅ **IPTV Player**: Full-featured streaming application with HLS.js support
- ✅ **TV-Optimized UI**: Interface designed for 10-foot viewing
- ✅ **Remote Control Support**: Full D-PAD navigation and Fire TV remote compatibility
- ✅ **WebView Bridge**: Device information and event handling between native and web layers
- ✅ **Landscape Orientation**: Locked to landscape mode for TV displays

## System Requirements

- **Target Platform**: Amazon Vega OS/Kepler (Linux-based)
- **Device**: Amazon Fire TV Stick, Fire TV devices
- **Node.js**: Version 18 or higher
- **Development Tools**: 
  - Visual Studio Code (recommended)
  - Vega Studio (for deployment)

## Project Structure

```
Testapp/
├── src/
│   └── App.tsx              # React Native WebView wrapper
├── assets/
│   └── web/
│       ├── index.html       # Main HTML application
│       ├── scripts.js       # Application logic (IPTV player)
│       └── styles.css       # Styling
├── index.js                 # React Native entry point
├── app.json                 # App configuration
├── manifest.toml            # Vega OS manifest
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── metro.config.js          # Metro bundler config
└── babel.config.js          # Babel config
```

## How It Works

1. **React Native Layer** (`src/App.tsx`):
   - Loads WebView component from `@amazon-devices/webview`
   - Handles Fire TV remote events (D-PAD, Back button)
   - Generates device code
   - Injects JavaScript bridge into WebView
   - Communicates with HTML app via `postMessage`

2. **Web Application Layer** (`assets/web/`):
   - `index.html`: UI structure and layout
   - `scripts.js`: IPTV player logic, HLS.js integration, navigation
   - `styles.css`: TV-optimized styling
   - Receives TV events from React Native
   - Sends messages back to native layer

3. **Bridge Communication**:
   - React Native → WebView: Device info, TV events, back button
   - WebView → React Native: Navigation state, exit requests, logs

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Testapp
```

2. Install dependencies:
```bash
npm install
```

### Development

Start the Metro bundler:
```bash
npm start
```

### Building for Vega OS

Build for specific architectures:

```bash
# Build for ARMv7 (most Fire TV Sticks)
npm run build:armv7

# Build for ARM64/AArch64 (newer Fire TV devices)
npm run build:aarch64

# Build for x86_64 (emulator/testing)
npm run build:x86_64

# Generic build
npm run build:app
```

### Deployment

Use Vega Studio to deploy the built application to your Fire TV device.

## Application Features

### IPTV Player

The web application (`assets/web/`) includes:
- Device code registration
- IPTV server configuration
- Live TV channels with categories
- Video-on-Demand (VOD) movies and series
- HLS.js video player
- D-PAD navigation optimized for TV remotes

### Fire TV Remote Support

- **D-PAD Navigation**: Up, Down, Left, Right arrows
- **Select**: OK/Center button
- **Back**: Returns to previous screen or exits app
- **Media Controls**: Play, Pause, Fast Forward, Rewind (if supported)

## Development in VS Code

Recommended VS Code extensions:
- React Native Tools
- ESLint
- TypeScript
- Prettier

## Customization

### Modifying the Web Application

Edit files in `assets/web/`:
- `index.html`: Change UI structure
- `scripts.js`: Modify application logic
- `styles.css`: Update styling

### Changing WebView Behavior

Edit `src/App.tsx`:
- Modify injected JavaScript bridge
- Update message handlers
- Change device code generation

### Adding Native Features

Extend `src/App.tsx` with additional React Native modules:
```typescript
import { SomeNativeModule } from '@amazon-devices/some-module';
```

## WebView Bridge API

### Messages from React Native to WebView

```javascript
// In WebView (scripts.js)
window.addEventListener('message', function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'DEVICE_INFO') {
        // Device information received
        console.log(data.deviceCode, data.platform, data.brand);
    }
    if (data.type === 'TV_EVENT') {
        // TV remote event received
        console.log(data.eventType); // 'up', 'down', 'left', 'right', 'select'
    }
});
```

### Messages from WebView to React Native

```javascript
// In WebView (scripts.js)
if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'EXIT_APP'
    }));
}
```

## Troubleshooting

### WebView doesn't load
- Verify files are in `assets/web/` directory
- Check that `file:///android_asset/web/index.html` path is correct
- Enable debug mode to see console logs

### Remote control not working
- Ensure `TVEventHandler` is enabled in App.tsx
- Check that key events are being forwarded to WebView
- Verify JavaScript bridge is injected properly

### Build fails
- Ensure Node.js version is 18 or higher
- Run `npm run clean` and reinstall dependencies
- Check that all Vega OS dependencies are installed

## Platform Compatibility

| Platform | Support |
|----------|---------|
| Amazon Vega OS/Kepler | ✅ Yes |
| Amazon Fire TV | ✅ Yes |
| Android TV | ❌ No |
| Web | ❌ No |
| Android Mobile | ❌ No |

This application is **specifically designed for Amazon Vega OS** and Fire TV devices, not for general Android or web platforms.

## License

MIT

## Contributing

Contributions are welcome! Please ensure any changes maintain compatibility with Vega OS/Kepler runtime and the WebView bridge architecture.
