// AO Process Base Class
//
// Base class for interacting with AO processes

import { AOClient } from './client';
import { AOMessage, AOClientConfig, ProcessMessage, ProcessResponse } from './types';

export { ProcessMessage, ProcessResponse };

export class AOProcess {
  protected client: AOClient;
  protected processId: string;

  constructor(processId: string, config?: AOClientConfig) {
    this.processId = processId;
    this.client = new AOClient(config || {
      gateway: 'https://ao-gateway.arweave.net',
      wallet: 'mock-wallet'
    });
  }

  /**
   * Send a message to the AO process
   */
  async sendMessage(message: ProcessMessage): Promise<ProcessResponse> {
    const aoMessage: AOMessage = {
      Target: this.processId,
      Action: message.Action,
      Data: message.Data,
      Tags: message.Tags
    };

    const response = await this.client.sendMessage(aoMessage);
    
    return {
      Action: response.Action,
      Data: response.Data,
      From: response.From,
      Tags: response.Tags
    };
  }

  /**
   * Get process information
   */
  async getProcessInfo(): Promise<any> {
    return await this.client.getProcessInfo(this.processId);
  }

  /**
   * Get the process ID
   */
  getProcessId(): string {
    return this.processId;
  }
}