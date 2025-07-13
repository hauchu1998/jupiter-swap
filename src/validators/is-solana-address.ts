import { PublicKey } from '@solana/web3.js';

export const isSolanaAddress = (address: string) => {
  if (address === 'native') return true;

  try {
    const pubKey = new PublicKey(address);
    return !!pubKey;
  } catch (_e) {
    return false;
  }
};
