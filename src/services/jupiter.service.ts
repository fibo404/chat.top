import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { JupiterQuote } from '../types';
import * as ledgerService from './ledger.service';

const JUPITER_API = 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const PIGGY_USDC_MINT = 'F35yYmTR6PqkbTx449P1eGhB57mRhWAdYs93eCo2dMZR';

function getConnection(): Connection {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) throw new Error('SOLANA_RPC_URL not set');
  return new Connection(rpcUrl, 'confirmed');
}

function getKeypair(): Keypair {
  const raw = process.env.SOLANA_PRIVATE_KEY;
  if (!raw) throw new Error('SOLANA_PRIVATE_KEY not set');
  const secret = JSON.parse(raw) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export async function getQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: number,
  slippageBps = 50
): Promise<JupiterQuote> {
  const url = new URL(`${JUPITER_API}/quote`);
  url.searchParams.set('inputMint', inputMint);
  url.searchParams.set('outputMint', outputMint);
  url.searchParams.set('amount', String(amountLamports));
  url.searchParams.set('slippageBps', String(slippageBps));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jupiter quote failed: ${res.status} ${body}`);
  }
  return (await res.json()) as JupiterQuote;
}

export async function getSwapTransaction(
  quote: JupiterQuote,
  userPublicKey: string
): Promise<string> {
  const res = await fetch(`${JUPITER_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jupiter swap failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.swapTransaction as string;
}

async function signAndSend(
  swapTxBase64: string
): Promise<string> {
  const connection = getConnection();
  const keypair = getKeypair();

  const txBuf = Buffer.from(swapTxBase64, 'base64');
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([keypair]);

  const sig = await connection.sendTransaction(tx, {
    skipPreflight: false,
    maxRetries: 3,
  });
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

export async function swapTokens(
  inputMint: string,
  outputMint: string,
  amountLamports: number
): Promise<{ signature: string; outAmount: string }> {
  const keypair = getKeypair();
  const pubkey = keypair.publicKey.toBase58();

  const quote = await getQuote(
    inputMint, outputMint, amountLamports
  );
  const swapTx = await getSwapTransaction(quote, pubkey);
  const signature = await signAndSend(swapTx);

  return { signature, outAmount: quote.outAmount };
}

export async function depositToPiggy(): Promise<{
  solToUsdcSig: string;
  usdcToPiggySig: string;
  piggyAmount: string;
}> {
  const amountSol = 1_000_000_000; // 1 SOL in lamports

  console.log('[Syndicate] Step 1: Swapping 1 SOL -> USDC...');
  const solToUsdc = await swapTokens(
    SOL_MINT, USDC_MINT, amountSol
  );
  console.log(
    `[Syndicate] SOL->USDC done. Sig: ${solToUsdc.signature}, ` +
    `USDC received: ${solToUsdc.outAmount}`
  );

  const usdcAmount = Number(solToUsdc.outAmount);

  console.log('[Syndicate] Step 2: Swapping USDC -> piggyUSDC...');
  const usdcToPiggy = await swapTokens(
    USDC_MINT, PIGGY_USDC_MINT, usdcAmount
  );
  console.log(
    `[Syndicate] USDC->piggyUSDC done. Sig: ${usdcToPiggy.signature}, ` +
    `piggyUSDC received: ${usdcToPiggy.outAmount}`
  );

  const piggyFloat = Number(usdcToPiggy.outAmount) / 1e6;
  ledgerService.updateTreasuryBalance(0, 0, piggyFloat);

  ledgerService.addTrade({
    id: `trade-deposit-sol-usdc-${Date.now()}`,
    thesisId: 'seed-deposit',
    agentId: 896,
    inputMint: SOL_MINT,
    outputMint: USDC_MINT,
    amountIn: amountSol,
    amountOut: usdcAmount,
    txSignature: solToUsdc.signature,
    timestamp: new Date().toISOString(),
  });

  ledgerService.addTrade({
    id: `trade-deposit-usdc-piggy-${Date.now()}`,
    thesisId: 'seed-deposit',
    agentId: 896,
    inputMint: USDC_MINT,
    outputMint: PIGGY_USDC_MINT,
    amountIn: usdcAmount,
    amountOut: Number(usdcToPiggy.outAmount),
    txSignature: usdcToPiggy.signature,
    timestamp: new Date().toISOString(),
  });

  console.log(
    `[Syndicate] Deposit complete. piggyUSDC balance: ${piggyFloat}`
  );

  return {
    solToUsdcSig: solToUsdc.signature,
    usdcToPiggySig: usdcToPiggy.signature,
    piggyAmount: usdcToPiggy.outAmount,
  };
}
