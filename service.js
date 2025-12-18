// Service entry point for headless services
// This file is required for Vega OS compatibility

import { HeadlessEntryPointRegistry } from '@amazon-devices/headless-task-manager';

// Register service entry points
// These can be extended in the future for background services
HeadlessEntryPointRegistry.registerHeadlessEntryPoint2(
  'com.testapp.vegaos.interface.provider::onStartService',
  () => async () => {
    console.log('Service started');
  },
);

HeadlessEntryPointRegistry.registerHeadlessEntryPoint2(
  'com.testapp.vegaos.interface.provider::onStopService',
  () => async () => {
    console.log('Service stopped');
  },
);
