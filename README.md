# TestApp - Native React Native for Amazon Vega OS/Kepler

A fully native React Native IPTV application optimized for Amazon Fire TV devices running Vega OS (Kepler runtime). Built entirely with React Native components - no WebView.

## Architecture

This is a **100% native React Native application**:
- Pure React Native components (no HTML/CSS/JavaScript web files)
- Native Fire TV remote control handling
- Optimized for TV displays (10-foot UI)
- TypeScript for type safety

## Features

- ✅ **Vega OS/Kepler Compatible**: Built for Amazon Fire TV Stick and similar devices
- ✅ **Native IPTV Player**: Login, Live TV, Movies, Series
- ✅ **TV-Optimized UI**: Large fonts and touch targets for TV viewing
- ✅ **Remote Control Support**: Full D-PAD navigation and Fire TV remote compatibility
- ✅ **Device Code Authentication**: Unique code generation for easy login
- ✅ **Landscape Orientation**: Locked to landscape mode for TV displays
- ✅ **React Native 0.72**: Modern React Native with TypeScript

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
│   ├── App.tsx                  # Main app component with navigation
│   ├── screens/
│   │   ├── LoginScreen.tsx      # Login with device code / form
│   │   └── HomeScreen.tsx       # Main menu (Live TV, Movies, Series)
│   └── utils/
│       └── deviceCode.ts        # Device code generation
├── index.js                     # React Native entry point
├── app.json                     # App configuration
├── manifest.toml                # Vega OS manifest
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── metro.config.js              # Metro bundler config
└── babel.config.js              # Babel config
```

## Screens

### 1. Login Screen
- **Device Code Display**: Shows unique 8-character code
- **Device Login**: One-click login using device code
- **Manual Registration**: Form for server URL, username, password
- **TV Navigation**: Fully navigable with Fire TV remote

### 2. Home Screen
- **Header**: Clock, app logo, user info, expiry date
- **Live TV Card**: Large card with channel count
- **Movies Card**: Navigate to movies library
- **Series Card**: Navigate to series library
- **Account Card**: User settings and information

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

### Device Code Authentication

The app generates a unique 8-character device code that can be used for authentication:
- Code is based on device's unique ID (or random if unavailable)
- Displayed on login screen
- Used for pairing with IPTV service

### Fire TV Remote Support

- **D-PAD Navigation**: Up, Down, Left, Right arrows
- **Select**: OK/Center button to activate buttons
- **Back**: Returns to previous screen or shows exit confirmation
- **hasTVPreferredFocus**: Primary button gets initial focus

### TV-Optimized UI

All components are designed for 10-foot viewing:
- Large fonts (24px - 80px)
- High contrast colors
- Sufficient touch targets
- Focus indicators
- Landscape orientation only

## Development in VS Code

Recommended VS Code extensions:
- React Native Tools
- ESLint
- TypeScript
- Prettier

## Customization

### Adding New Screens

Create new screen components in `src/screens/`:

```typescript
// src/screens/LiveTVScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const LiveTVScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Live TV Channels</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0d1117' },
    title: { fontSize: 48, color: '#fff' },
});
```

### Modifying Colors

Edit component StyleSheets:
```typescript
const styles = StyleSheet.create({
    container: {
        backgroundColor: '#0d1117', // Dark background
    },
    title: {
        color: '#58a6ff', // Blue accent
    },
});
```

### Adding API Integration

Create service files in `src/services/`:

```typescript
// src/services/iptvApi.ts
export async function loginWithDeviceCode(code: string) {
    const response = await fetch('https://api.example.com/device/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceCode: code }),
    });
    return response.json();
}
```

## Navigation Flow

```
LoginScreen
    ├─ Device Login Button → API Call → HomeScreen
    └─ Manual Registration Form → API Call → HomeScreen

HomeScreen
    ├─ Live TV Card → LiveTVScreen (TODO)
    ├─ Movies Card → MoviesScreen (TODO)
    ├─ Series Card → SeriesScreen (TODO)
    └─ Account Card → AccountScreen (TODO)
```

## Troubleshooting

### Buttons not focusable
- Ensure `hasTVPreferredFocus={true}` is set on primary button
- Use `TouchableOpacity` instead of `TouchableHighlight` for better TV support
- Add `accessible={true}` to focusable components

### Build fails
- Ensure Node.js version is 18 or higher
- Run `npm run clean` and reinstall dependencies
- Check that all dependencies are compatible with React Native 0.72

### App doesn't start on Fire TV
- Check that `manifest.toml` is correctly configured
- Verify landscape orientation is set
- Ensure TV input is enabled in manifest

## Platform Compatibility

| Platform | Support |
|----------|---------|
| Amazon Vega OS/Kepler | ✅ Yes |
| Amazon Fire TV | ✅ Yes |
| Android TV | ❌ No* |
| Web | ❌ No |
| Android Mobile | ❌ No |

*While React Native code could work on Android TV, this app is specifically configured for Vega OS/Kepler runtime.

## Technology Stack

- **Framework**: React Native 0.72.0
- **Language**: TypeScript
- **UI**: Native React Native components (View, Text, TextInput, TouchableOpacity)
- **Navigation**: State-based screen switching
- **Remote Control**: TVEventHandler from React Native
- **Build**: Metro bundler, Babel
- **Deployment**: Vega Studio

## Next Steps

To complete the IPTV functionality:

1. **API Integration**:
   - Implement actual API calls in login handlers
   - Add services for fetching channels, movies, series

2. **Additional Screens**:
   - LiveTVScreen with channel list
   - PlayerScreen for video playback
   - MoviesScreen with VOD library
   - SeriesScreen with episodes

3. **Video Player**:
   - Integrate video player component
   - Add HLS/DASH stream support
   - Implement playback controls

4. **Persistence**:
   - Add AsyncStorage for login state
   - Cache user preferences
   - Remember last watched content

## License

MIT

## Contributing

Contributions are welcome! Please ensure any changes maintain compatibility with Vega OS/Kepler runtime and follow the native React Native architecture (no WebView).
