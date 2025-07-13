export interface JupiterQuoteParams {
  fromWalletAddress: string;
  toWalletAddress?: string;
  fromTokenMint: string;
  toTokenMint: string;
  amount: string;
  swapMode: 'ExactIn' | 'ExactOut';
  direct?: boolean;
  restrictIntermediateTokens?: boolean;
  slippageBps?: number;
  maxAccounts?: number;
  includePriorityFee?: boolean;
  includeJitoTips?: boolean;
  dexes?: string[];
}
