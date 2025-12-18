# TestApp - React Native for Amazon Vega OS/Kepler

A React Native application optimized for Amazon Fire TV devices running Vega OS (Kepler runtime). This is a starter template designed specifically for Linux-based TV environments.

## Features

- ✅ **Vega OS/Kepler Compatible**: Built for Amazon Fire TV Stick and similar devices
- ✅ **TV-Optimized UI**: Large fonts and layouts designed for 10-foot viewing
- ✅ **Remote Control Support**: Full D-PAD navigation and Fire TV remote compatibility
- ✅ **Landscape Orientation**: Locked to landscape mode for TV displays
- ✅ **React Native 0.72**: Modern React Native with TypeScript support

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
│   └── App.tsx          # Main application component
├── assets/              # Images and resources
├── index.js             # Entry point
├── app.json             # App configuration
├── manifest.toml        # Vega OS manifest
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── metro.config.js      # Metro bundler config
└── babel.config.js      # Babel config
```

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

### Welcome Screen

The app displays a welcome screen with:
- Application title and branding
- Platform information (Vega OS/Kepler)
- React Native version
- Navigation instructions

### Fire TV Remote Support

- **D-PAD Navigation**: Up, Down, Left, Right arrows
- **Select**: OK/Center button
- **Back**: Returns to previous screen or exits app
- **Home**: Returns to Fire TV home screen

## Development in VS Code

Recommended VS Code extensions:
- React Native Tools
- ESLint
- TypeScript
- Prettier

## Customization

### Changing Colors

Edit `src/App.tsx` and modify the `styles` object:

```typescript
const styles = StyleSheet.create({
    container: {
        backgroundColor: '#0d1117', // Change background color
    },
    title: {
        color: '#58a6ff', // Change title color
    },
    // ... other styles
});
```

### Adding New Screens

Create new components in the `src/` directory and import them in `App.tsx`.

### Modifying TV Behavior

TV event handling is in `App.tsx`:

```typescript
useEffect(() => {
    const tvEventHandler = new TVEventHandler();
    
    tvEventHandler.enable(undefined, (cmp, evt) => {
        if (evt && evt.eventType) {
            // Handle TV events here
            console.log('TV Event:', evt.eventType);
        }
    });

    return () => tvEventHandler.disable();
}, []);
```

## Troubleshooting

### Build fails
- Ensure Node.js version is 18 or higher
- Run `npm run clean` and reinstall dependencies

### App doesn't start on Fire TV
- Check that the manifest.toml is correctly configured
- Verify the app is signed properly in Vega Studio

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

Contributions are welcome! Please ensure any changes maintain compatibility with Vega OS/Kepler runtime.
