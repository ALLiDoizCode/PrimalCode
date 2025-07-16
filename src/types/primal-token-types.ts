export interface PrimalTokenDeposit {
  amount: number;
  deposited_by: string;
  deposited_at: Date;
  purpose: "environmental_modification" | "future_use";
}

export interface PrimalTokenTransaction {
  transaction_id: string;
  amount: number;
  type: "deduction" | "deposit" | "refund";
  purpose: string;
  timestamp: Date;
  modification_id?: string;
}

export interface Player {
  wallet_address: string;
  primal_token_balance: number;
  unlocked_tools: EnvironmentalTool[];
  ecosystem_mastery: {
    route_id: string;
    mastery_level: number;
    specialization: string;
  }[];
  capture_collection: string[];
  session_history: SessionData[];
  token_transaction_history: PrimalTokenTransaction[];
}

export interface EnvironmentalTool {
  name: string;
  unlocked_at: Date;
  usage_count: number;
}

export interface SessionData {
  session_id: string;
  start_time: Date;
  end_time?: Date;
  actions_taken: string[];
}

export interface TokenValidationResult {
  valid: boolean;
  current_balance: number;
  required_amount: number;
  message: string;
}

export interface TokenDeductionResult {
  success: boolean;
  transaction_id: string;
  new_balance: number;
  message: string;
}

export const PRIMAL_TOKEN_COSTS = {
  PLACE_FOOD: 10,
  MODIFY_WEATHER: 25,
  BUILD_SHELTER: 50
} as const;