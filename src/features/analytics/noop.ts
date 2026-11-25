import type { MonitoringBackend } from './types';

/**
 * Nothing is sent: Expo Go (no native Firebase module), web, Jest, or a build made without the
 * Firebase files (app.config.js leaves the Firebase plugins out, F07).
 */
export const noopMonitoring: MonitoringBackend = {
  init: () => {},
  logEvent: () => {},
  recordError: () => {},
};
