/**
 * React Native Entry Point for Vega OS
 * Amazon Fire TV Application
 */

import { AppRegistry, LogBox } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';

// Temporary workaround for problem with nested text
// not working currently.
LogBox.ignoreAllLogs();

// Register main application component
AppRegistry.registerComponent(appName, () => App);
