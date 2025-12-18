// Task entry point for background tasks
// This file is required for Vega OS compatibility

import { HeadlessEntryPointRegistry } from '@amazon-devices/headless-task-manager';

// Register task entry points
// These can be extended in the future for background tasks
HeadlessEntryPointRegistry.registerHeadlessEntryPoint(
  'com.testapp.vegaos.onInstallOrUpdateTask::doTask',
  () => async () => {
    console.log('Install/Update task executed');
  },
);
