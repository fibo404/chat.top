import { Thesis, Member } from '../types';

export const riskParameters = {
  maxDrawdown: 0.05, // 5%
  allowedAssetTypes: ['stablecoins', 'lst', 'bluechips'] as const,
  bannedTokens: ['pump.fun tokens', 'unverified memecoins'],
  maxSinglePosition: 0.30, // 30% of treasury
  leverageAllowed: false,
};

type AssetType = typeof riskParameters.allowedAssetTypes[number];

const ASSET_CLASSIFICATIONS: Record<string, AssetType> = {
  USDC: 'stablecoins',
  USDT: 'stablecoins',
  piggyUSDC: 'stablecoins',
  SOL: 'bluechips',
  JitoSOL: 'lst',
  mSOL: 'lst',
  bSOL: 'lst',
  JUP: 'bluechips',
  RAY: 'bluechips',
  PYTH: 'bluechips',
  JTO: 'bluechips',
  BONK: 'bluechips',
  WIF: 'bluechips',
};

interface ThesisEvaluation {
  approved: boolean;
  score: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'rejected';
  reasons: string[];
}

export function evaluateThesis(thesis: {
  token: string;
  direction: string;
  timeframe: string;
  conviction: string;
  reasoning: string;
}): ThesisEvaluation {
  const reasons: string[] = [];
  let score = 50;

  // Check asset type
  const assetType = ASSET_CLASSIFICATIONS[thesis.token];
  if (!assetType) {
    return {
      approved: false,
      score: 0,
      riskLevel: 'rejected',
      reasons: [`Token "${thesis.token}" not in approved list`],
    };
  }

  if (!riskParameters.allowedAssetTypes.includes(assetType)) {
    return {
      approved: false,
      score: 0,
      riskLevel: 'rejected',
      reasons: [`Asset type "${assetType}" not allowed`],
    };
  }

  reasons.push(`Asset type: ${assetType} ✅`);

  // Favor stablecoins and LSTs
  if (assetType === 'stablecoins') score += 20;
  if (assetType === 'lst') score += 15;
  if (assetType === 'bluechips') score += 5;

  // Favor longer timeframes (less noise)
  if (thesis.timeframe.includes('week')) score += 10;
  if (thesis.timeframe.includes('3d')) score += 5;
  if (thesis.timeframe.includes('24h')) score -= 5;

  // Conviction weighting
  if (thesis.conviction === 'high') score += 10;
  if (thesis.conviction === 'medium') score += 5;

  // Check reasoning quality (length as proxy)
  if (thesis.reasoning.length > 200) {
    score += 10;
    reasons.push('Detailed reasoning ✅');
  }
  if (thesis.reasoning.length < 50) {
    score -= 15;
    reasons.push('Reasoning too brief ⚠️');
  }

  // Data-driven keywords boost
  const dataKeywords = [
    'apy', 'apr', 'tvl', 'volume', 'historical',
    'backtest', 'sharpe', 'correlation', 'hedge',
  ];
  const lower = thesis.reasoning.toLowerCase();
  const dataHits = dataKeywords.filter((k) => lower.includes(k));
  if (dataHits.length >= 2) {
    score += 10;
    reasons.push(`Data-driven (${dataHits.join(', ')}) ✅`);
  }

  // Risk keywords penalty
  const riskKeywords = ['yolo', 'moon', '100x', 'ape', 'degen'];
  const riskHits = riskKeywords.filter((k) => lower.includes(k));
  if (riskHits.length > 0) {
    score -= 20;
    reasons.push(`Risk flags: ${riskHits.join(', ')} ⚠️`);
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  const riskLevel = score >= 70
    ? 'low'
    : score >= 45
      ? 'medium'
      : 'high';

  return {
    approved: score >= 40,
    score,
    riskLevel,
    reasons,
  };
}

export function parseThesisFromComment(body: string): {
  token: string;
  direction: string;
  timeframe: string;
  conviction: string;
  reasoning: string;
} | null {
  const tokenMatch = body.match(/Token:\s*(\w+)/i);
  const dirMatch = body.match(/Direction:\s*(\w+)/i);
  const timeMatch = body.match(/Timeframe:\s*(.+)/i);
  const convMatch = body.match(/Conviction:\s*(\w+)/i);
  const reasonMatch = body.match(/Reasoning:\s*(.+)/is);

  if (!tokenMatch) return null;

  return {
    token: tokenMatch[1],
    direction: dirMatch?.[1] || 'long',
    timeframe: timeMatch?.[1]?.trim() || '3d',
    conviction: convMatch?.[1]?.toLowerCase() || 'medium',
    reasoning: reasonMatch?.[1]?.trim() || '',
  };
}
