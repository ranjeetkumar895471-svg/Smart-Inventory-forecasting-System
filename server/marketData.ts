export interface StockCatalogEntry {
  symbol: string;
  companyName: string;
  exchange: string;
  market: 'India' | 'International';
  sector: string;
  currency: 'INR' | 'USD';
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

export const STOCK_CATALOG: StockCatalogEntry[] = [
  {
    symbol: 'RELIANCE.NS',
    companyName: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    market: 'India',
    sector: 'Energy & Conglomerates',
    currency: 'INR',
    marketCapTier: 'Large Cap',
    basePrice: 1294.5,
    annualDrift: 0.11,
    annualVolatility: 0.22,
    description: 'Diversified Indian conglomerate spanning refining, petrochemicals, retail, and telecom (Jio).',
  },
  {
    symbol: 'TCS.NS',
    companyName: 'Tata Consultancy Services Ltd.',
    exchange: 'NSE',
    market: 'India',
    sector: 'Technology',
    currency: 'INR',
    marketCapTier: 'Large Cap',
    basePrice: 4128.0,
    annualDrift: 0.10,
    annualVolatility: 0.19,
    description: 'Global IT services, consulting, and enterprise digital transformation leader.',
  },
  {
    symbol: 'HDFCBANK.NS',
    companyName: 'HDFC Bank Ltd.',
    exchange: 'NSE',
    market: 'India',
    sector: 'Financial Services',
    currency: 'INR',
    marketCapTier: 'Large Cap',
    basePrice: 1742.2,
    annualDrift: 0.11,
    annualVolatility: 0.18,
    description: 'India’s largest private sector bank across retail, corporate banking, and treasury.',
  },
  {
    symbol: 'INFY.NS',
    companyName: 'Infosys Ltd.',
    exchange: 'NSE',
    market: 'India',
    sector: 'Technology',
    currency: 'INR',
    marketCapTier: 'Large Cap',
    basePrice: 1865.4,
    annualDrift: 0.12,
    annualVolatility: 0.23,
    description: 'Global digital services and enterprise AI modernization provider.',
  },
  {
    symbol: 'ICICIBANK.NS',
    companyName: 'ICICI Bank Ltd.',
    exchange: 'NSE',
    market: 'India',
    sector: 'Financial Services',
    currency: 'INR',
    marketCapTier: 'Large Cap',
    basePrice: 1288.75,
    annualDrift: 0.13,
    annualVolatility: 0.21,
    description: 'Major Indian private banking and financial services institution.',
  },
  {
    symbol: 'BHARTIARTL.NS',
    companyName: 'Bharti Airtel Ltd.',
    exchange: 'NSE',
    market: 'India',
    sector: 'Telecommunications',
    currency: 'INR',
    marketCapTier: 'Large Cap',
    basePrice: 1584.3,
    annualDrift: 0.14,
    annualVolatility: 0.24,
    description: 'Leading telecommunications operator across India and Africa.',
  },
  {
    symbol: 'TATAMOTORS.NS',
    companyName: 'Tata Motors Ltd.',
    exchange: 'NSE',
    market: 'India',
    sector: 'Automotive',
    currency: 'INR',
    marketCapTier: 'Large Cap',
    basePrice: 824.6,
    annualDrift: 0.15,
    annualVolatility: 0.34,
    description: 'Indian automotive manufacturer covering EVs, commercial fleets, and Jaguar Land Rover.',
  },
  {
    symbol: 'SUNPHARMA.NS',
    companyName: 'Sun Pharmaceutical Industries Ltd.',
    exchange: 'NSE',
    market: 'India',
    sector: 'Healthcare',
    currency: 'INR',
    marketCapTier: 'Large Cap',
    basePrice: 1796.1,
    annualDrift: 0.12,
    annualVolatility: 0.20,
    description: 'Specialty and generic pharmaceuticals manufacturer with global reach.',
  },
  {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    exchange: 'NASDAQ',
    market: 'International',
    sector: 'Technology',
    currency: 'USD',
    marketCapTier: 'Large Cap',
    basePrice: 229.8,
    annualDrift: 0.12,
    annualVolatility: 0.21,
    description: 'Consumer hardware, silicon, and high-margin digital services ecosystem.',
  },
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    market: 'International',
    sector: 'Technology',
    currency: 'USD',
    marketCapTier: 'Large Cap',
    basePrice: 418.5,
    annualDrift: 0.14,
    annualVolatility: 0.22,
    description: 'Enterprise cloud infrastructure (Azure), productivity software, and AI platforms.',
  },
  {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    market: 'International',
    sector: 'Semiconductors',
    currency: 'USD',
    marketCapTier: 'Large Cap',
    basePrice: 141.9,
    annualDrift: 0.22,
    annualVolatility: 0.44,
    description: 'Accelerated computing GPUs, data center networking, and AI infrastructure.',
  },
  {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    exchange: 'NASDAQ',
    market: 'International',
    sector: 'Technology',
    currency: 'USD',
    marketCapTier: 'Large Cap',
    basePrice: 176.4,
    annualDrift: 0.13,
    annualVolatility: 0.25,
    description: 'Search, YouTube, Google Cloud, and foundational AI research.',
  },
  {
    symbol: 'AMZN',
    companyName: 'Amazon.com, Inc.',
    exchange: 'NASDAQ',
    market: 'International',
    sector: 'Technology',
    currency: 'USD',
    marketCapTier: 'Large Cap',
    basePrice: 204.2,
    annualDrift: 0.14,
    annualVolatility: 0.28,
    description: 'Global e-commerce logistics and AWS cloud computing leader.',
  },
  {
    symbol: 'TSLA',
    companyName: 'Tesla, Inc.',
    exchange: 'NASDAQ',
    market: 'International',
    sector: 'Automotive',
    currency: 'USD',
    marketCapTier: 'Large Cap',
    basePrice: 338.7,
    annualDrift: 0.16,
    annualVolatility: 0.49,
    description: 'Electric vehicles, utility-scale battery storage, and autonomous driving systems.',
  },
  {
    symbol: 'JPM',
    companyName: 'JPMorgan Chase & Co.',
    exchange: 'NYSE',
    market: 'International',
    sector: 'Financial Services',
    currency: 'USD',
    marketCapTier: 'Large Cap',
    basePrice: 242.1,
    annualDrift: 0.10,
    annualVolatility: 0.19,
    description: 'Global institutional banking, commercial lending, and asset management.',
  },
  {
    symbol: 'ASML',
    companyName: 'ASML Holding N.V.',
    exchange: 'NASDAQ',
    market: 'International',
    sector: 'Semiconductors',
    currency: 'USD',
    marketCapTier: 'Large Cap',
    basePrice: 692.4,
    annualDrift: 0.15,
    annualVolatility: 0.32,
    description: 'Extreme ultraviolet (EUV) lithography systems critical for advanced chipmaking.',
  },
];

// Simple deterministic PRNG so demo benchmark fallback series remain reproducible across reloads
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSymbol(sym: string): number {
  let h = 2166136261;
  for (let i = 0; i < sym.length; i++) {
    h ^= sym.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function generateDeterministicHistory(meta: StockCatalogEntry, days: number): OHLCVBar[] {
  const rand = mulberry32(hashSymbol(meta.symbol));
  const totalDays = Math.max(days, 260);
  const dt = 1 / 252;
  const dailyMu = (meta.annualDrift - 0.5 * meta.annualVolatility * meta.annualVolatility) * dt;
  const dailySigma = meta.annualVolatility * Math.sqrt(dt);

  const closes: number[] = [];
  let price = meta.basePrice * 0.82;
  for (let i = 0; i < totalDays; i++) {
    const u1 = Math.max(rand(), 1e-7);
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const cycle = Math.sin(i / 18) * 0.0025;
    price = price * Math.exp(dailyMu + cycle + dailySigma * z);
    closes.push(price);
  }

  const scaleFactor = meta.basePrice / closes[closes.length - 1];
  const bars: OHLCVBar[] = [];
  const today = new Date();
  const tradingDate = new Date(today);
  const dates: string[] = [];

  while (dates.length < totalDays) {
    const day = tradingDate.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(tradingDate.toISOString().slice(0, 10));
    }
    tradingDate.setDate(tradingDate.getDate() - 1);
  }
  dates.reverse();

  for (let i = 0; i < totalDays; i++) {
    const close = Number((closes[i] * scaleFactor).toFixed(2));
    const prev = i === 0 ? close : Number((closes[i - 1] * scaleFactor).toFixed(2));
    const spread = Math.max(close * (0.006 + rand() * 0.014), 0.05);
    const open = Number((prev * (1 + (rand() - 0.5) * 0.006)).toFixed(2));
    const high = Number((Math.max(open, close) + spread * rand()).toFixed(2));
    const low = Number(Math.max(0.01, Math.min(open, close) - spread * rand()).toFixed(2));
    const baseVol = meta.currency === 'INR' ? 4_800_000 : 18_500_000;
    const volume = Math.round(baseVol * (0.65 + rand() * 0.9));

    bars.push({
      date: dates[i],
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return bars.slice(-days);
}

interface CacheEntry {
  expiresAt: number;
  bundle: MarketStockBundle;
}

const bundleCache = new Map<string, CacheEntry>();
const searchCache = new Map<string, { expiresAt: number; results: StockCatalogEntry[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function tryAlphaVantage(meta: StockCatalogEntry, days: number): Promise<OHLCVBar[] | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;

  const avSymbol = meta.symbol.endsWith('.NS')
    ? `${meta.symbol.replace('.NS', '')}.BSE`
    : meta.symbol;

  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
      avSymbol
    )}&outputsize=full&apikey=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      'Time Series (Daily)'?: Record<
        string,
        {
          '1. open': string;
          '2. high': string;
          '3. low': string;
          '4. close': string;
          '5. volume': string;
        }
      >;
    };
    const series = json['Time Series (Daily)'];
    if (!series) return null;

    const bars: OHLCVBar[] = Object.entries(series)
      .map(([date, ohlc]) => ({
        date,
        open: Number(ohlc['1. open']),
        high: Number(ohlc['2. high']),
        low: Number(ohlc['3. low']),
        close: Number(ohlc['4. close']),
        volume: Number(ohlc['5. volume']),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);

    return bars.length >= 30 ? bars : null;
  } catch {
    return null;
  }
}

async function tryFinnhub(meta: StockCatalogEntry, days: number): Promise<OHLCVBar[] | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || meta.market === 'India') {
    return null;
  }
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - Math.max(days + 120, 400) * 86400;
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(
      meta.symbol
    )}&resolution=D&from=${from}&to=${to}&token=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      s?: string;
      t?: number[];
      o?: number[];
      h?: number[];
      l?: number[];
      c?: number[];
      v?: number[];
    };
    if (data.s !== 'ok' || !data.t || !data.c || data.c.length < 30) return null;

    const bars: OHLCVBar[] = data.t.map((ts, idx) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      open: Number((data.o?.[idx] ?? data.c![idx]).toFixed(2)),
      high: Number((data.h?.[idx] ?? data.c![idx]).toFixed(2)),
      low: Number((data.l?.[idx] ?? data.c![idx]).toFixed(2)),
      close: Number(data.c![idx].toFixed(2)),
      volume: Math.round(data.v?.[idx] ?? 0),
    }));
    return bars.slice(-days);
  } catch {
    return null;
  }
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        longName?: string;
        shortName?: string;
        currency?: string;
        exchangeName?: string;
        fullExchangeName?: string;
        regularMarketPrice?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
}

async function tryYahooFinance(
  meta: StockCatalogEntry,
  days: number
): Promise<{
  bars: OHLCVBar[];
  updatedMeta: StockCatalogEntry;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
} | null> {
  const range = days > 180 ? '2y' : '1y';
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

  for (const host of hosts) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(
        meta.symbol
      )}?range=${range}&interval=1d`;
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SmartInvestorBot/1.0)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(7000),
      });
      if (!resp.ok) continue;

      const json = (await resp.json()) as YahooChartResponse;
      const result = json.chart?.result?.[0];
      const timestamps = result?.timestamp;
      const quote = result?.indicators?.quote?.[0];
      if (!result || !timestamps || !quote || !quote.close) continue;

      const byDate = new Map<string, OHLCVBar>();
      for (let i = 0; i < timestamps.length; i++) {
        const closeVal = quote.close[i];
        if (closeVal === null || closeVal === undefined || !Number.isFinite(closeVal) || closeVal <= 0) {
          continue;
        }
        const dateStr = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
        const openVal = quote.open?.[i];
        const highVal = quote.high?.[i];
        const lowVal = quote.low?.[i];
        const volVal = quote.volume?.[i];

        const cleanClose = Number(closeVal.toFixed(2));
        byDate.set(dateStr, {
          date: dateStr,
          open: Number((openVal && Number.isFinite(openVal) ? openVal : cleanClose).toFixed(2)),
          high: Number((highVal && Number.isFinite(highVal) ? highVal : cleanClose).toFixed(2)),
          low: Number((lowVal && Number.isFinite(lowVal) ? lowVal : cleanClose).toFixed(2)),
          close: cleanClose,
          volume: volVal && Number.isFinite(volVal) ? Math.round(volVal) : 0,
        });
      }

      const sortedBars = Array.from(byDate.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-days);

      if (sortedBars.length < 20) continue;

      // Sync latest bar close with live regularMarketPrice if present and valid
      const liveMktPrice = result.meta?.regularMarketPrice;
      if (liveMktPrice && Number.isFinite(liveMktPrice) && liveMktPrice > 0) {
        const lastIdx = sortedBars.length - 1;
        sortedBars[lastIdx] = {
          ...sortedBars[lastIdx],
          close: Number(liveMktPrice.toFixed(2)),
          high: Math.max(sortedBars[lastIdx].high, Number(liveMktPrice.toFixed(2))),
          low: Math.min(sortedBars[lastIdx].low, Number(liveMktPrice.toFixed(2))),
        };
      }

      // Compute empirical volatility & drift from live closes
      const closes = sortedBars.map((b) => b.close);
      const logRets: number[] = [];
      for (let i = 1; i < closes.length; i++) {
        logRets.push(Math.log(closes[i] / Math.max(closes[i - 1], 0.01)));
      }
      const meanLog = logRets.reduce((a, b) => a + b, 0) / Math.max(logRets.length, 1);
      const varLog =
        logRets.reduce((acc, r) => acc + (r - meanLog) ** 2, 0) /
        Math.max(logRets.length - 1, 1);
      const empVol = Number(Math.sqrt(varLog * 252).toFixed(3));
      const empDrift = Number((meanLog * 252).toFixed(3));

      const rawCurrency = result.meta?.currency?.toUpperCase();
      const currency: 'INR' | 'USD' =
        rawCurrency === 'INR' || meta.symbol.endsWith('.NS') || meta.symbol.endsWith('.BO')
          ? 'INR'
          : 'USD';

      const exchangeName =
        result.meta?.fullExchangeName ||
        (meta.symbol.endsWith('.NS')
          ? 'NSE'
          : meta.symbol.endsWith('.BO')
          ? 'BSE'
          : result.meta?.exchangeName || meta.exchange);

      const updatedMeta: StockCatalogEntry = {
        ...meta,
        companyName: result.meta?.longName || result.meta?.shortName || meta.companyName,
        exchange: exchangeName.slice(0, 24),
        market: currency === 'INR' ? 'India' : 'International',
        currency,
        basePrice: sortedBars[sortedBars.length - 1].close,
        annualDrift: Number.isFinite(empDrift) ? empDrift : meta.annualDrift,
        annualVolatility: Number.isFinite(empVol) && empVol > 0 ? empVol : meta.annualVolatility,
      };

      return {
        bars: sortedBars,
        updatedMeta,
        fiftyTwoWeekHigh: result.meta?.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: result.meta?.fiftyTwoWeekLow,
      };
    } catch {
      continue;
    }
  }
  return null;
}

export function searchCatalog(query: string, market?: string): StockCatalogEntry[] {
  const q = query.trim().toLowerCase();
  return STOCK_CATALOG.filter((item) => {
    if (market && market !== 'All' && item.market !== market) return false;
    if (!q) return true;
    return (
      item.symbol.toLowerCase().includes(q) ||
      item.companyName.toLowerCase().includes(q) ||
      item.sector.toLowerCase().includes(q) ||
      item.exchange.toLowerCase().includes(q)
    );
  });
}

export async function searchCatalogAsync(
  query: string,
  market?: string
): Promise<{ results: StockCatalogEntry[]; liveSearch: boolean }> {
  const localMatches = searchCatalog(query, market);
  const q = query.trim();
  if (q.length < 2) {
    return { results: localMatches, liveSearch: true };
  }

  const cacheKey = `${q.toUpperCase()}_${market || 'All'}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { results: cached.results, liveSearch: true };
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      q
    )}&quotesCount=10&newsCount=0`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SmartInvestorBot/1.0)' },
      signal: AbortSignal.timeout(4500),
    });
    if (!resp.ok) {
      return { results: localMatches, liveSearch: false };
    }
    const json = (await resp.json()) as {
      quotes?: Array<{
        symbol?: string;
        shortname?: string;
        longname?: string;
        quoteType?: string;
        exchDisp?: string;
        exchange?: string;
        sectorDisp?: string;
        sector?: string;
        industryDisp?: string;
      }>;
    };

    const bySymbol = new Map<string, StockCatalogEntry>();
    for (const item of localMatches) {
      bySymbol.set(item.symbol, item);
    }

    for (const quote of json.quotes || []) {
      const sym = quote.symbol?.trim().toUpperCase();
      if (!sym || !/^[A-Z0-9.\-]{1,24}$/.test(sym)) continue;
      if (quote.quoteType && quote.quoteType !== 'EQUITY' && quote.quoteType !== 'ETF') continue;

      const isIndian =
        sym.endsWith('.NS') ||
        sym.endsWith('.BO') ||
        quote.exchange === 'NSI' ||
        quote.exchange === 'BSE';
      const entryMarket: 'India' | 'International' = isIndian ? 'India' : 'International';
      if (market && market !== 'All' && entryMarket !== market) continue;

      if (!bySymbol.has(sym)) {
        const companyName = quote.longname || quote.shortname || sym;
        const sector = quote.sectorDisp || quote.sector || 'General Equities';
        const exchange = quote.exchDisp || (isIndian ? 'NSE' : quote.exchange || 'US');
        bySymbol.set(sym, {
          symbol: sym,
          companyName: companyName.slice(0, 120),
          exchange: exchange.slice(0, 24),
          market: entryMarket,
          sector: sector.slice(0, 64),
          currency: isIndian ? 'INR' : 'USD',
          marketCapTier: 'Large Cap',
          basePrice: isIndian ? 1200 : 120,
          annualDrift: 0.11,
          annualVolatility: 0.25,
          description: `${companyName} (${exchange}) — ${quote.industryDisp || sector}.`,
        });
      }
    }

    const merged = Array.from(bySymbol.values());
    searchCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, results: merged });
    return { results: merged, liveSearch: true };
  } catch {
    return { results: localMatches, liveSearch: false };
  }
}

export async function fetchYahooNewsHeadlines(
  queryOrSymbol: string
): Promise<Array<{ headline: string; source: string; datetime: number; summary: string }>> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      queryOrSymbol
    )}&quotesCount=1&newsCount=6`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SmartInvestorBot/1.0)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      news?: Array<{
        title?: string;
        publisher?: string;
        providerPublishTime?: number;
        link?: string;
        type?: string;
      }>;
    };
    return (json.news || [])
      .filter((n) => Boolean(n.title))
      .slice(0, 5)
      .map((n) => ({
        headline: n.title || 'Market Update',
        source: n.publisher || 'Yahoo Finance Wire',
        datetime: n.providerPublishTime || Math.floor(Date.now() / 1000),
        summary: n.link ? `Published by ${n.publisher || 'Market Wire'} (${n.link})` : '',
      }));
  } catch {
    return [];
  }
}

export async function getMarketStockBundle(
  rawSymbol: string,
  days = 260
): Promise<MarketStockBundle> {
  const cleanSymbol = rawSymbol.trim().toUpperCase();
  const safeDays = Math.min(Math.max(days, 60), 365);
  const cacheKey = `${cleanSymbol}_${safeDays}`;

  const cached = bundleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.bundle;
  }

  let meta = STOCK_CATALOG.find((s) => s.symbol === cleanSymbol);
  if (!meta) {
    const isIndian = cleanSymbol.endsWith('.NS') || cleanSymbol.endsWith('.BO');
    meta = {
      symbol: cleanSymbol,
      companyName: `${cleanSymbol} Equity`,
      exchange: isIndian ? 'NSE' : 'US',
      market: isIndian ? 'India' : 'International',
      sector: 'General Equities',
      currency: isIndian ? 'INR' : 'USD',
      marketCapTier: 'Mid Cap',
      basePrice: isIndian ? 1250 : 145,
      annualDrift: 0.1,
      annualVolatility: 0.28,
      description: 'Equity ticker evaluated through the Smart Investor Forecasting Engine.',
    };
  }

  let history: OHLCVBar[] | null = null;
  let dataSource: MarketStockBundle['dataSource'] = 'DEMO_DATA';
  let isDemo = true;
  let providerNotice =
    'DEMO DATA — Live market feeds are temporarily unavailable for this ticker. Displaying deterministic benchmark historical series.';
  let yahoo52High: number | undefined;
  let yahoo52Low: number | undefined;

  const finnhubBars = await tryFinnhub(meta, safeDays);
  if (finnhubBars) {
    history = finnhubBars;
    dataSource = 'FINNHUB';
    isDemo = false;
    providerNotice = 'Live daily OHLCV market feed via Finnhub REST API.';
  } else {
    const avBars = await tryAlphaVantage(meta, safeDays);
    if (avBars) {
      history = avBars;
      dataSource = 'ALPHA_VANTAGE';
      isDemo = false;
      providerNotice = 'Live daily OHLCV market feed via Alpha Vantage API.';
    } else {
      const yahooRes = await tryYahooFinance(meta, safeDays);
      if (yahooRes) {
        history = yahooRes.bars;
        meta = yahooRes.updatedMeta;
        yahoo52High = yahooRes.fiftyTwoWeekHigh;
        yahoo52Low = yahooRes.fiftyTwoWeekLow;
        dataSource = 'YAHOO_FINANCE';
        isDemo = false;
        providerNotice = `Live market price and historical OHLCV feed via Yahoo Finance (${meta.exchange}, ${meta.currency}).`;
      }
    }
  }

  if (!history) {
    history = generateDeterministicHistory(meta, safeDays);
  }

  const latest = history[history.length - 1];
  const prev = history[history.length - 2] ?? latest;
  const change = Number((latest.close - prev.close).toFixed(2));
  const changePercent = Number(((change / Math.max(prev.close, 0.01)) * 100).toFixed(2));
  const high52Week = Number(
    (yahoo52High ?? Math.max(...history.map((b) => b.high))).toFixed(2)
  );
  const low52Week = Number(
    (yahoo52Low ?? Math.min(...history.map((b) => b.low))).toFixed(2)
  );
  const avgVolume = Math.round(
    history.reduce((acc, b) => acc + b.volume, 0) / Math.max(history.length, 1)
  );

  const bundle: MarketStockBundle = {
    meta,
    isDemo,
    dataSource,
    providerNotice,
    lastUpdated: new Date().toISOString(),
    currentPrice: latest.close,
    previousClose: prev.close,
    change,
    changePercent,
    high52Week,
    low52Week,
    avgVolume,
    history,
  };

  bundleCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, bundle });
  return bundle;
}

export async function getBatchQuotes(symbols: string[]) {
  const unique = Array.from(
    new Set(
      symbols
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z0-9.\-]{1,24}$/.test(s))
    )
  ).slice(0, 24);

  const settled = await Promise.allSettled(
    unique.map((sym) => getMarketStockBundle(sym, 60))
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<MarketStockBundle> => r.status === 'fulfilled'
    )
    .map((r) => {
      const b = r.value;
      return {
        symbol: b.meta.symbol,
        companyName: b.meta.companyName,
        exchange: b.meta.exchange,
        sector: b.meta.sector,
        currency: b.meta.currency,
        currentPrice: b.currentPrice,
        changePercent: b.changePercent,
        isDemo: b.isDemo,
        dataSource: b.dataSource,
      };
    });
}

export async function getSectorOverview() {
  const sectorMap = new Map<
    string,
    {
      sector: string;
      stocks: Array<{
        symbol: string;
        companyName: string;
        currency: 'INR' | 'USD';
        price: number;
        changePercent: number;
        volatility: number;
      }>;
    }
  >();

  const bundles = await Promise.all(
    STOCK_CATALOG.map((entry) => getMarketStockBundle(entry.symbol, 90))
  );

  for (const b of bundles) {
    const sector = b.meta.sector;
    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, { sector, stocks: [] });
    }
    sectorMap.get(sector)!.stocks.push({
      symbol: b.meta.symbol,
      companyName: b.meta.companyName,
      currency: b.meta.currency,
      price: b.currentPrice,
      changePercent: b.changePercent,
      volatility: Number((b.meta.annualVolatility * 100).toFixed(1)),
    });
  }

  const sectors = Array.from(sectorMap.values()).map((group) => {
    const avgChange =
      group.stocks.reduce((acc, s) => acc + s.changePercent, 0) / group.stocks.length;
    const avgVolatility =
      group.stocks.reduce((acc, s) => acc + s.volatility, 0) / group.stocks.length;
    return {
      sector: group.sector,
      stockCount: group.stocks.length,
      avgChangePercent: Number(avgChange.toFixed(2)),
      avgVolatility: Number(avgVolatility.toFixed(1)),
      stocks: group.stocks,
    };
  });

  return {
    sectors,
    isDemo: bundles.every((b) => b.isDemo),
  };
}
