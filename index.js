/**
 * React Native Entry Point for Vega OS
 * Amazon Fire TV Application
 */

import { AppRegistry } from 'react-native';
import { App } from './src/App';
import { name as appName } from './app.json';

// Register main application component
AppRegistry.registerComponent(appName, () => App);

// For Vega OS - additional registration
if (typeof global.registerComponent === 'function') {
    global.registerComponent(appName, () => App);
}
