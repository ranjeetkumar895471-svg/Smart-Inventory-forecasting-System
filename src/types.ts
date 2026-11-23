export type CurrencyCode = 'INR' | 'USD';
export type UserRole = 'investor' | 'admin';
export type AccountStatus = 'active' | 'suspended';
export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  preferredCurrency: CurrencyCode;
  status: AccountStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StockCatalogEntry {
  symbol: string;
  companyName: string;
  exchange: string;
  market: 'India' | 'International';
  sector: string;
  currency: CurrencyCode;
  marketCapTier: 'Large Cap' | 'Mid Cap' | 'Small Cap';
  basePrice: number;
  annualDrift: number;
  annualVolatility: number;
  description: string;
}

export interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketStockBundle {
  meta: StockCatalogEntry;
  isDemo: boolean;
  dataSource: 'YAHOO_FINANCE' | 'ALPHA_VANTAGE' | 'FINNHUB' | 'DEMO_DATA';
  providerNotice: string;
  lastUpdated: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high52Week: number;
  low52Week: number;
  avgVolume: number;
  history: OHLCVBar[];
}

export interface TechnicalSeriesPoint {
  date: string;
  close: number;
  sma20: number | null;
  sma50: number | null;
  ema12: number | null;
  ema26: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
}

export interface TechnicalSnapshot {
  latestClose: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  rsi14: number;
  rsiSignal: 'Oversold' | 'Neutral' | 'Overbought';
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  macdTrend: 'Bullish Crossover' | 'Bearish Momentum' | 'Neutral';
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  annualizedVolatilityPct: number;
  maxDrawdownPct: number;
  periodReturn30dPct: number;
  series: TechnicalSeriesPoint[];
}

export interface ForecastPoint {
  step: number;
  date: string;
  point: number;
  lower80: number;
  upper80: number;
  lower95: number;
  upper95: number;
}

export interface ForecastResult {
  symbol: string;
  horizonDays: 1 | 7 | 30;
  engineSource: 'typescript-quant' | 'python-microservice';
  modelName: string;
  currentPrice: number;
  predictedPrice: number;
  expectedChangePct: number;
  lower80: number;
  upper80: number;
  lower95: number;
  upper95: number;
  trajectory: ForecastPoint[];
  backtest: {
    validationWindowDays: number;
    mae: number;
    rmse: number;
    mapePct: number;
    directionalAccuracyPct: number;
  };
  risk: {
    level: RiskLevel;
    score: number;
    annualizedVolatilityPct: number;
    maxDrawdownPct: number;
    rsiRegime: string;
    rationale: string;
    warning: string;
  };
  disclaimer: string;
}

export interface StockAIAnalysis {
  executiveSummary: string;
  technicalInterpretation: string;
  bullCase: string;
  bearCase: string;
  keyRisks: string[];
  horizonOutlook: string;
  disclaimer: string;
}

export interface NewsSentimentItem {
  headline: string;
  source: string;
  publishedAt: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  impactScore: number;
  summary: string;
}

export interface NewsSentimentReport {
  symbol: string;
  isDemoNews: boolean;
  overallSentiment: 'Positive' | 'Neutral' | 'Negative';
  sentimentSummary: string;
  items: NewsSentimentItem[];
}

export interface PortfolioHolding {
  id: string;
  userId: string;
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  currency: CurrencyCode;
  quantity: number;
  avgBuyPrice: number;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  currency: CurrencyCode;
  targetPrice?: number;
  createdAt?: unknown;
}

export interface SavedForecastRecord {
  id: string;
  userId: string;
  symbol: string;
  horizonDays: 1 | 7 | 30;
  modelName: string;
  currentPrice: number;
  predictedPrice: number;
  lower95: number;
  upper95: number;
  riskLevel: RiskLevel;
  mape: number;
  directionalAccuracy: number;
  isDemo: boolean;
  createdAt?: unknown;
}

export interface ResearchReportRecord {
  id: string;
  userId: string;
  symbol: string;
  title: string;
  reportType: 'Equity Forecast' | 'Portfolio Summary' | 'Risk & Technical';
  horizonDays: 1 | 7 | 30;
  riskLevel: RiskLevel;
  summary: string;
  createdAt?: unknown;
}

export interface AuditLogRecord {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details: string;
  createdAt?: unknown;
}

export interface SectorSummary {
  sector: string;
  stockCount: number;
  avgChangePercent: number;
  avgVolatility: number;
  stocks: Array<{
    symbol: string;
    companyName: string;
    currency: CurrencyCode;
    price: number;
    changePercent: number;
    volatility: number;
  }>;
}
