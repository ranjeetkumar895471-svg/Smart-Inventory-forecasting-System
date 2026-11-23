import { getAuthBearerToken } from '../firebase';
import type {
  StockCatalogEntry,
  MarketStockBundle,
  TechnicalSnapshot,
  ForecastResult,
  StockAIAnalysis,
  NewsSentimentReport,
  SectorSummary,
} from '../types';

async function handleJson<T>(resp: Response): Promise<T> {
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${resp.status})`);
  }
  return data as T;
}

export async function fetchSystemHealth() {
  const resp = await fetch('/api/health');
  return handleJson<{
    status: string;
    marketDataMode: 'LIVE_CONFIGURED' | 'DEMO_DATA';
    providers: {
      yahooFinance?: boolean;
      alphaVantage: boolean;
      finnhub: boolean;
      gemini: boolean;
      pythonForecaster: boolean;
    };
    timestamp: string;
  }>(resp);
}

export async function searchStocksApi(query: string, market = 'All') {
  const params = new URLSearchParams({ q: query, market });
  const resp = await fetch(`/api/market/search?${params.toString()}`);
  return handleJson<{
    results: StockCatalogEntry[];
    totalCatalog: number;
    isDemo: boolean;
  }>(resp);
}

export async function fetchBatchQuotesApi(symbols: string[]) {
  if (symbols.length === 0) return { quotes: [] };
  const params = new URLSearchParams({ symbols: symbols.join(',') });
  const resp = await fetch(`/api/market/quotes?${params.toString()}`);
  return handleJson<{
    quotes: Array<{
      symbol: string;
      companyName: string;
      exchange: string;
      sector: string;
      currency: 'INR' | 'USD';
      currentPrice: number;
      changePercent: number;
      isDemo: boolean;
      dataSource: string;
    }>;
  }>(resp);
}

export async function fetchStockBundleApi(symbol: string, days = 260) {
  const resp = await fetch(
    `/api/market/stock/${encodeURIComponent(symbol)}?days=${days}`
  );
  return handleJson<{
    bundle: MarketStockBundle;
    technicals: TechnicalSnapshot;
  }>(resp);
}

export async function fetchForecastApi(symbol: string, horizonDays: 1 | 7 | 30) {
  const resp = await fetch('/api/forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, horizonDays }),
  });
  return handleJson<{
    isDemo: boolean;
    dataSource: string;
    forecast: ForecastResult;
  }>(resp);
}

export async function fetchSectorOverviewApi() {
  const resp = await fetch('/api/market/sectors');
  return handleJson<{
    sectors: SectorSummary[];
    isDemo: boolean;
  }>(resp);
}

export async function analyzeStockAiApi(symbol: string, horizonDays: 1 | 7 | 30) {
  const token = await getAuthBearerToken();
  const resp = await fetch('/api/ai/analyze-stock', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ symbol, horizonDays }),
  });
  return handleJson<{
    analysis: StockAIAnalysis;
    isDemo: boolean;
  }>(resp);
}

export async function fetchNewsSentimentApi(symbol: string) {
  const token = await getAuthBearerToken();
  const resp = await fetch('/api/ai/news-sentiment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ symbol }),
  });
  return handleJson<NewsSentimentReport>(resp);
}

export async function askResearchAssistantApi(
  question: string,
  context: {
    symbol?: string;
    price?: number;
    currency?: string;
    rsi14?: number;
    riskLevel?: string;
    portfolioSummary?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }
) {
  const token = await getAuthBearerToken();
  const resp = await fetch('/api/ai/research-assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, context }),
  });
  return handleJson<{ answer: string }>(resp);
}

export async function fetchAdminSystemStatusApi() {
  const token = await getAuthBearerToken();
  const resp = await fetch('/api/admin/system-status', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return handleJson<{
    catalogSize: number;
    marketDataMode: string;
    pythonForecasterConfigured: boolean;
    geminiConfigured: boolean;
    serverTime: string;
  }>(resp);
}
