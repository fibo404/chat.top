export interface Thesis {
  id: string;
  agentId: number;
  agentName: string;
  token: string;
  direction: 'long' | 'short';
  timeframe: string;
  conviction: 'low' | 'medium' | 'high';
  reasoning: string;
  entryPrice: number | null;
  exitPrice: number | null;
  pnlPercent: number | null;
  status: 'pending' | 'active' | 'closed';
  createdAt: string;
  closedAt: string | null;
  txSignature: string | null;
}

export interface Member {
  agentId: number;
  agentName: string;
  thesesCount: number;
  winCount: number;
  lossCount: number;
  totalPnlPercent: number;
  votingPower: number;
  profitShare: number;
  joinedAt: string;
}

export interface Trade {
  id: string;
  thesisId: string;
  agentId: number;
  inputMint: string;
  outputMint: string;
  amountIn: number;
  amountOut: number;
  txSignature: string;
  timestamp: string;
}

export interface Ledger {
  syndicate: string;
  treasury: {
    seed: string;
    wallet: string;
    currentBalanceSol: number;
    currentBalanceUsdc: number;
    piggyUsdcBalance: number;
  };
  members: Member[];
  theses: Thesis[];
  trades: Trade[];
}

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  routePlan: any[];
  swapTransaction?: string;
}
