// AO Types
//
// TypeScript type definitions for AO process communication

export interface AOMessage {
  Target: string;
  Action: string;
  Data: string;
  Tags?: { [key: string]: string };
}

export interface AOResponse {
  Action: string;
  Data: string;
  From: string;
  Tags?: { [key: string]: string };
}

export interface AOClientConfig {
  gateway: string;
  wallet: string;
}

export interface AOProcessInfo {
  processId: string;
  name: string;
  owner: string;
  created: number;
}

export interface ProcessMessage {
  Action: string;
  Data: string;
  Tags: { [key: string]: string };
}

export interface ProcessResponse {
  Action: string;
  Data: string;
  From: string;
  Tags?: { [key: string]: string };
}