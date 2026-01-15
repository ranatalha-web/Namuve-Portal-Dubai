/**
 * Disable Console Logging for Silent Mode
 * This utility disables all console output for a completely silent browser experience
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
  trace: console.trace,
  table: console.table,
  group: console.group,
  groupEnd: console.groupEnd,
  groupCollapsed: console.groupCollapsed,
  time: console.time,
  timeEnd: console.timeEnd,
  count: console.count,
  assert: console.assert
};

/**
 * Disable all console methods
 */
export const disableConsole = () => {
  console.log = () => { };
  console.error = () => { };
  console.warn = () => { };
  console.info = () => { };
  console.debug = () => { };
  console.trace = () => { };
  console.table = () => { };
  console.group = () => { };
  console.groupEnd = () => { };
  console.groupCollapsed = () => { };
  console.time = () => { };
  console.timeEnd = () => { };
  console.count = () => { };
  console.assert = () => { };
};

/**
 * Re-enable all console methods (for debugging)
 */
export const enableConsole = () => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
  console.trace = originalConsole.trace;
  console.table = originalConsole.table;
  console.group = originalConsole.group;
  console.groupEnd = originalConsole.groupEnd;
  console.groupCollapsed = originalConsole.groupCollapsed;
  console.time = originalConsole.time;
  console.timeEnd = originalConsole.timeEnd;
  console.count = originalConsole.count;
  console.assert = originalConsole.assert;
};

// Auto-disable console on import (for silent mode)
// TEMPORARILY DISABLED FOR DEBUGGING
// disableConsole(); // ← DISABLED to enable console logs for debugging

export default { disableConsole, enableConsole };
