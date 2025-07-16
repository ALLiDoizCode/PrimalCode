// AO Client
//
// TypeScript client for communicating with AO processes

import { AOMessage, AOResponse, AOClientConfig } from './types';

export class AOClient {
  private config: AOClientConfig;

  constructor(config: AOClientConfig) {
    this.config = config;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  async sendMessage(_message: AOMessage): Promise<AOResponse> {
    // Mock implementation for testing
    // In production, this would send messages to the AO gateway
    return Promise.resolve({
      Action: 'Mock-Response',
      Data: '{}',
      From: 'mock-process',
    });
  }

  async getProcessInfo(processId: string): Promise<unknown> {
    // Mock implementation
    return Promise.resolve({
      processId,
      name: 'Mock Process',
      owner: 'mock-owner',
      created: Date.now(),
    });
  }
}