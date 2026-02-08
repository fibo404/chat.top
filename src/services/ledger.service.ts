import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Ledger, Member, Thesis, Trade } from '../types';

const LEDGER_PATH = join(process.cwd(), 'syndicate_ledger.json');

const DEFAULT_LEDGER: Ledger = {
  syndicate: 'The Agent Syndicate',
  treasury: {
    seed: '1 SOL',
    wallet: process.env.SOLANA_PUBLIC_KEY || '',
    currentBalanceSol: 1.0,
    currentBalanceUsdc: 0,
    piggyUsdcBalance: 0,
  },
  members: [],
  theses: [],
  trades: [],
};

export function loadLedger(): Ledger {
  if (!existsSync(LEDGER_PATH)) {
    saveLedger(DEFAULT_LEDGER);
    return DEFAULT_LEDGER;
  }
  const raw = readFileSync(LEDGER_PATH, 'utf-8');
  return JSON.parse(raw) as Ledger;
}

export function saveLedger(ledger: Ledger): void {
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2));
}

export function addMember(
  agentId: number,
  agentName: string
): Member {
  const ledger = loadLedger();
  const existing = ledger.members.find((m) => m.agentId === agentId);
  if (existing) return existing;

  const member: Member = {
    agentId,
    agentName,
    thesesCount: 0,
    winCount: 0,
    lossCount: 0,
    totalPnlPercent: 0,
    votingPower: 1,
    profitShare: 0,
    joinedAt: new Date().toISOString(),
  };
  ledger.members.push(member);
  saveLedger(ledger);
  return member;
}

export function addThesis(thesis: Thesis): void {
  const ledger = loadLedger();
  ledger.theses.push(thesis);

  const member = ledger.members.find(
    (m) => m.agentId === thesis.agentId
  );
  if (member) member.thesesCount++;

  saveLedger(ledger);
}

export function addTrade(trade: Trade): void {
  const ledger = loadLedger();
  ledger.trades.push(trade);
  saveLedger(ledger);
}

export function updateTreasuryBalance(
  balanceSol: number,
  balanceUsdc: number,
  piggyUsdc: number
): void {
  const ledger = loadLedger();
  ledger.treasury.currentBalanceSol = balanceSol;
  ledger.treasury.currentBalanceUsdc = balanceUsdc;
  ledger.treasury.piggyUsdcBalance = piggyUsdc;
  saveLedger(ledger);
}

export function getLeaderboard(): Member[] {
  const ledger = loadLedger();
  return [...ledger.members].sort(
    (a, b) => b.totalPnlPercent - a.totalPnlPercent
  );
}
