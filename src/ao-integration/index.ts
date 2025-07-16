/**
 * AO Integration Module
 * Main entry point for AO process integration
 */

export * from './ao-client';
export * from './message-schemas';

// Re-export commonly used types and functions
export type {
  AOMessage,
  AOResponse,
  MonsterState
} from './ao-client';

export {
  AOClient,
  AOClientManager,
  createAOClient,
  aoClientManager
} from './ao-client';