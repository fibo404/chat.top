import { FastifyInstance } from 'fastify';
import * as ledgerService from '../services/ledger.service';
import { depositToPiggy } from '../services/jupiter.service';

export async function syndicateRoutes(
  app: FastifyInstance
): Promise<void> {

  // GET /api/syndicate/status
  app.get('/status', async () => {
    const ledger = ledgerService.loadLedger();
    return {
      syndicate: ledger.syndicate,
      treasury: ledger.treasury,
      memberCount: ledger.members.length,
      thesesCount: ledger.theses.length,
      tradeCount: ledger.trades.length,
    };
  });

  // GET /api/syndicate/leaderboard
  app.get('/leaderboard', async () => {
    return {
      leaderboard: ledgerService.getLeaderboard(),
    };
  });

  // GET /api/syndicate/members
  app.get('/members', async () => {
    const ledger = ledgerService.loadLedger();
    return { members: ledger.members };
  });

  // GET /api/syndicate/theses
  app.get('/theses', async () => {
    const ledger = ledgerService.loadLedger();
    return { theses: ledger.theses };
  });

  // GET /api/syndicate/trades
  app.get('/trades', async () => {
    const ledger = ledgerService.loadLedger();
    return { trades: ledger.trades };
  });

  // POST /api/syndicate/deposit-piggy
  app.post('/deposit-piggy', async () => {
    const result = await depositToPiggy();
    return {
      success: true,
      ...result,
    };
  });
}
