/**
 * TypeScript declarations to prevent console usage in MCP servers
 * 
 * MCP servers using stdio transport cannot use console logging as it interferes
 * with the protocol communication over stdin/stdout.
 * 
 * This file makes console methods unavailable at compile time.
 */

declare global {
  interface Console {
    log: never;
    error: never;
    warn: never;
    info: never;
    debug: never;
    trace: never;
    dir: never;
    dirxml: never;
    table: never;
    group: never;
    groupCollapsed: never;
    groupEnd: never;
    clear: never;
    count: never;
    countReset: never;
    time: never;
    timeEnd: never;
    timeLog: never;
  }

  namespace NodeJS {
    interface Process {
      stdout: {
        write: never;
      };
      stderr: {
        write: never;
      };
    }
  }
}

export {};