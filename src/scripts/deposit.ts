import 'dotenv/config';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';

const JUP_API_KEY = process.env.JUPITER_API_KEY || '';
const ULTRA_API = 'https://api.jup.ag/ultra/v1';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const PIGGY_USDC = 'F35yYmTR6PqkbTx449P1eGhB57mRhWAdYs93eCo2dMZR';

const AMOUNT_SOL = 0.18;
const LAMPORTS = Math.floor(AMOUNT_SOL * 1_000_000_000);

async function swap(
  connection: Connection,
  keypair: Keypair,
  inputMint: string,
  outputMint: string,
  amount: number
): Promise<{ signature: string; outAmount: string }> {
  const pubkey = keypair.publicKey.toBase58();

  // Get order (quote + unsigned tx)
  const url = `${ULTRA_API}/order?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&taker=${pubkey}`;
  const orderRes = await fetch(url, {
    headers: { 'x-api-key': JUP_API_KEY },
  });
  if (!orderRes.ok) {
    const text = await orderRes.text();
    throw new Error(`Order failed: ${orderRes.status} ${text}`);
  }
  const order = await orderRes.json() as any;
  console.log(`  Quote: ${order.inAmount} -> ${order.outAmount}`);

  // Deserialize, sign
  const txBuf = Buffer.from(order.transaction, 'base64');
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([keypair]);

  // Execute via Ultra
  const signedBase64 = Buffer.from(tx.serialize()).toString('base64');
  const execRes = await fetch(`${ULTRA_API}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': JUP_API_KEY,
    },
    body: JSON.stringify({
      signedTransaction: signedBase64,
      requestId: order.requestId,
    }),
  });

  const execData = await execRes.json() as any;
  console.log(`  Execute response:`, JSON.stringify(execData));

  if (execData.signature) {
    // Wait for confirmation
    console.log(`  Waiting for confirmation...`);
    await connection.confirmTransaction(execData.signature, 'confirmed');
    return { signature: execData.signature, outAmount: order.outAmount };
  }

  if (execData.status === 'Failed' || !execRes.ok) {
    throw new Error(`Execute failed: ${JSON.stringify(execData)}`);
  }

  // Fallback: send directly
  console.log('  No sig in response, sending directly...');
  const sig = await connection.sendTransaction(tx, {
    skipPreflight: false,
    maxRetries: 3,
  });
  await connection.confirmTransaction(sig, 'confirmed');
  return { signature: sig, outAmount: order.outAmount };
}

async function main() {
  const rpc = process.env.SOLANA_RPC_URL!;
  const secret = JSON.parse(process.env.SOLANA_PRIVATE_KEY!);
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
  const connection = new Connection(rpc, 'confirmed');
  const pubkey = keypair.publicKey.toBase58();

  console.log(`Wallet: ${pubkey}`);
  const bal = await connection.getBalance(keypair.publicKey);
  console.log(`Balance: ${bal / 1e9} SOL`);

  // Step 1: SOL -> USDC
  console.log(`\nStep 1: Swapping ${AMOUNT_SOL} SOL -> USDC...`);
  const r1 = await swap(connection, keypair, SOL_MINT, USDC_MINT, LAMPORTS);
  console.log(`✅ SOL->USDC done! Sig: ${r1.signature}`);
  console.log(`   USDC: ${Number(r1.outAmount) / 1e6}`);
  console.log(`   https://solscan.io/tx/${r1.signature}`);

  await new Promise((r) => setTimeout(r, 3000));

  // Step 2: USDC -> piggyUSDC
  const usdcRaw = Number(r1.outAmount);
  console.log(`\nStep 2: Swapping ${usdcRaw / 1e6} USDC -> piggyUSDC...`);
  try {
    const r2 = await swap(connection, keypair, USDC_MINT, PIGGY_USDC, usdcRaw);
    console.log(`✅ USDC->piggyUSDC done! Sig: ${r2.signature}`);
    console.log(`   piggyUSDC: ${Number(r2.outAmount) / 1e6}`);
    console.log(`   https://solscan.io/tx/${r2.signature}`);
  } catch (e: any) {
    console.log(`⚠️ piggyUSDC swap failed: ${e.message}`);
    console.log(`   Keeping ${usdcRaw / 1e6} USDC in wallet.`);
  }

  console.log('\nDone! 🏛️');
}

main().catch(console.error);
