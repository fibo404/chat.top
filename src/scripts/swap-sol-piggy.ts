import 'dotenv/config';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';

const JUP_API_KEY = process.env.JUPITER_API_KEY || '';
const ULTRA_API = 'https://api.jup.ag/ultra/v1';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const PIGGY_USDC = 'F35yYmTR6PqkbTx449P1eGhB57mRhWAdYs93eCo2dMZR';

async function main() {
  const secret = JSON.parse(process.env.SOLANA_PRIVATE_KEY!);
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
  const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
  const pubkey = keypair.publicKey.toBase58();

  const bal = await connection.getBalance(keypair.publicKey);
  console.log(`Wallet: ${pubkey}`);
  console.log(`Balance: ${bal / 1e9} SOL`);

  // Leave 0.02 SOL for fees
  const swapAmount = Math.floor(bal - 20_000_000);
  console.log(`\nSwapping ${swapAmount / 1e9} SOL -> piggyUSDC directly...`);

  const url = `${ULTRA_API}/order?inputMint=${SOL_MINT}&outputMint=${PIGGY_USDC}&amount=${swapAmount}&taker=${pubkey}`;
  const orderRes = await fetch(url, { headers: { 'x-api-key': JUP_API_KEY } });

  if (!orderRes.ok) {
    const text = await orderRes.text();
    console.log(`Direct route failed: ${text}`);
    console.log('Trying SOL -> USDC -> piggyUSDC in 2 steps...');
    // fallback to 2-step would go here
    return;
  }

  const order = await orderRes.json() as any;
  console.log(`Quote: ${order.inAmount} -> ${order.outAmount} piggyUSDC (${Number(order.outAmount) / 1e6})`);

  const txBuf = Buffer.from(order.transaction, 'base64');
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([keypair]);

  const signedBase64 = Buffer.from(tx.serialize()).toString('base64');
  const execRes = await fetch(`${ULTRA_API}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': JUP_API_KEY },
    body: JSON.stringify({ signedTransaction: signedBase64, requestId: order.requestId }),
  });

  const execData = await execRes.json() as any;
  console.log(`Status: ${execData.status}`);

  if (execData.signature) {
    console.log(`Waiting for confirmation...`);
    await connection.confirmTransaction(execData.signature, 'confirmed');
    console.log(`\n✅ Done! Sig: ${execData.signature}`);
    console.log(`   piggyUSDC received: ${Number(execData.totalOutputAmount || order.outAmount) / 1e6}`);
    console.log(`   https://solscan.io/tx/${execData.signature}`);
  } else {
    console.log(`Execute response:`, JSON.stringify(execData));
  }
}

main().catch(console.error);
