/**
 * PolFun Box - Entry Point for Vega OS
 * IPTV Player Application
 */

import { AppRegistry } from 'react-native';
import { App } from './src/App';
import { name as appName } from './app.json';

// Rejestracja głównego komponentu aplikacji
AppRegistry.registerComponent(appName, () => App);

// Dla Vega OS - dodatkowa rejestracja
if (typeof global.registerComponent === 'function') {
    global.registerComponent(appName, () => App);
}
