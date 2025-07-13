import {
  createJupiterApiClient,
  QuoteGetRequest,
  QuoteResponse,
  SwapApi,
  SwapResponse,
} from '@jup-ag/api';
import { JupiterQuoteParams } from './types';
import { isSolanaAddress } from './validators';
import { WSOL_MINT } from './constants';
import { BigNumber } from 'bignumber.js';

export class JupiterSwap {
  private apiKey: string;

  private client: SwapApi;

  constructor({ apiKey, baseUrl }: { apiKey: string; baseUrl?: string }) {
    this.apiKey = apiKey;

    const basePath = baseUrl || 'https://api.jup.ag';

    this.client = createJupiterApiClient({
      basePath,
      apiKey: this.apiKey,
    });
  }

  /**
   * Gets a quote for swapping tokens on Jupiter and prepares the swap transaction
   *
   * @param fromTokenMint - The mint address of the token to swap from (use 'native' for SOL)
   * @param toTokenMint - The mint address of the token to swap to (use 'native' for SOL)
   * @param amount - The amount of tokens to swap (must be an integer). The unit should be lamports.
   * @param fromWalletAddress - The wallet address that will execute the swap
   * @param toWalletAddress - The wallet address that will receive the swapped tokens. If not provided, the tokens will be swapped to the same wallet as the fromWalletAddress.
   * @param swapMode - The swap mode ('ExactIn' | 'ExactOut')
   * @param direct - Whether to only use direct routes (no intermediate tokens)
   * @param restrictIntermediateTokens - Array of token mints to restrict as intermediate tokens
   * @param slippageBps - Slippage tolerance in basis points (1-10000)
   * @param maxAccounts - Maximum number of accounts to include in the transaction
   * @param dexes - Array of DEX names to use for routing
   * @param includePriorityFee - Whether to include priority fees in the transaction, if Jito tips is true, this will be ignored
   * @param includeJitoTips - Whether to include Jito tips (not yet implemented)
   *
   * @returns Promise that resolves to a combined object containing:
   *   - QuoteResponse: Token amounts, price impact, route information
   *   - SwapResponse: Prepared swap transaction data including:
   *     - swapTransaction: Base64 encoded transaction
   *     - lastValidBlockHeight: Block height until transaction is valid
   *     - computeUnitPriceMicroLamports: Priority fee information
   *
   * @throws Error if fromTokenMint or toTokenMint are invalid Solana addresses
   * @throws Error if amount is not an integer
   */
  public async getQuote(
    params: JupiterQuoteParams
  ): Promise<QuoteResponse & SwapResponse> {
    const quoteRequest = this.createJupiterQuoteRequest(params);
    const quote = await this.client.quoteGet(quoteRequest);

    const swapResponse = await this.getQuoteTransaction({
      params,
      quote,
    });

    return { ...quote, ...swapResponse };
  }

  private createJupiterQuoteRequest(
    params: JupiterQuoteParams
  ): QuoteGetRequest {
    if (!isSolanaAddress(params.fromTokenMint)) {
      throw new Error('Invalid from token mint');
    }

    if (!isSolanaAddress(params.toTokenMint)) {
      throw new Error('Invalid to token mint');
    }

    const amount = new BigNumber(params.amount);
    if (!amount.isInteger()) {
      throw new Error('Amount must be an integer');
    }

    return {
      inputMint:
        params.fromTokenMint === 'native' ? WSOL_MINT : params.fromTokenMint,
      outputMint:
        params.toTokenMint === 'native' ? WSOL_MINT : params.toTokenMint,
      amount: new BigNumber(params.amount).toNumber(),
      swapMode: params.swapMode,
      onlyDirectRoutes: params.direct,
      restrictIntermediateTokens: params.restrictIntermediateTokens,
      slippageBps: params.slippageBps,
      dynamicSlippage: !params.slippageBps,
      maxAccounts: params.maxAccounts,
      dexes: params.dexes,
    };
  }

  private async getQuoteTransaction({
    params,
    quote,
  }: {
    params: JupiterQuoteParams;
    quote: QuoteResponse;
  }) {
    const swapResponse = await this.client.swapPost({
      swapRequest: {
        userPublicKey: params.fromWalletAddress,
        // TODO: get toWalletAddress ATA token
        // destinationTokenAccount: '',
        quoteResponse: quote,
        useSharedAccounts: true,
        dynamicComputeUnitLimit:
          params.includePriorityFee && !params.includeJitoTips,
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: params.includePriorityFee
          ? {
              priorityLevelWithMaxLamports: {
                priorityLevel: 'veryHigh',
                maxLamports: 10000000,
              },
            }
          : undefined,
        dynamicSlippage: !params.slippageBps ? true : undefined,
      },
    });

    return swapResponse;

    // TODO: add jito tips
    // const swapTransaction = swapResponse.swapTransaction;

    // const versionedTransaction = VersionedTransaction.deserialize(
    //   Buffer.from(swapTransaction, 'base64')
    // )
  }

  // Add your methods here
  public async swap(): Promise<void> {
    // Implement swap logic
  }
}
