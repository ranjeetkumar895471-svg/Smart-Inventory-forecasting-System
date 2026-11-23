import { GoogleGenAI, Type } from '@google/genai';
import { fetchYahooNewsHeadlines, type MarketStockBundle } from './marketData.ts';
import type { TechnicalSnapshot, ForecastResult } from './forecastingEngine.ts';

function parseGeminiJson<T>(rawText: string | undefined): T {
  const cleaned = (rawText ?? '{}')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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

export async function analyzeStockWithGemini(
  bundle: MarketStockBundle,
  technicals: TechnicalSnapshot,
  forecast: ForecastResult
): Promise<StockAIAnalysis> {
  const ai = getGeminiClient();
  const prompt = `Analyze the equity ${bundle.meta.companyName} (${bundle.meta.symbol}, Exchange: ${bundle.meta.exchange}, Sector: ${bundle.meta.sector}, Currency: ${bundle.meta.currency}).
Data Source Mode: ${bundle.isDemo ? 'DEMO DATA (Historical benchmark simulation)' : bundle.dataSource}.
Latest Price: ${bundle.currentPrice} ${bundle.meta.currency} (${bundle.changePercent}% daily change).
52-Week Range: ${bundle.low52Week} - ${bundle.high52Week}.
Computed Technical Indicators:
- SMA20: ${technicals.sma20}, SMA50: ${technicals.sma50}, SMA200: ${technicals.sma200}
- EMA12: ${technicals.ema12}, EMA26: ${technicals.ema26}
- RSI(14): ${technicals.rsi14} (${technicals.rsiSignal})
- MACD: ${technicals.macd}, Signal: ${technicals.macdSignal}, Histogram: ${technicals.macdHistogram} (${technicals.macdTrend})
- Bollinger Bands (20, 2): Lower ${technicals.bbLower}, Middle ${technicals.bbMiddle}, Upper ${technicals.bbUpper}
- Annualized Volatility: ${technicals.annualizedVolatilityPct}%, Max Drawdown: ${technicals.maxDrawdownPct}%
Quantitative Forecasting Engine (${forecast.horizonDays}-day horizon, ${forecast.modelName}):
- Point Estimate (${forecast.horizonDays}D): ${forecast.predictedPrice} ${bundle.meta.currency} (${forecast.expectedChangePct}%)
- 80% Confidence Interval: ${forecast.lower80} to ${forecast.upper80}
- 95% Confidence Interval: ${forecast.lower95} to ${forecast.upper95}
- Historical Backtest Validation (${forecast.backtest.validationWindowDays} windows): MAPE ${forecast.backtest.mapePct}%, Directional Accuracy ${forecast.backtest.directionalAccuracyPct}%
- Risk Rating: ${forecast.risk.level} (Score ${forecast.risk.score}/100)

Provide an objective institutional equity research synthesis grounded strictly in these metrics, explicitly interpreting the ${forecast.horizonDays}-day forecast band and downside risks. Do NOT guarantee profits or future returns.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a senior quantitative equity analyst. Explain technical indicators, probabilistic 1D/7D/30D forecast intervals, and downside risks clearly. Never guarantee returns or issue unconditional buy/sell commands.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executiveSummary: { type: Type.STRING },
          technicalInterpretation: { type: Type.STRING },
          bullCase: { type: Type.STRING },
          bearCase: { type: Type.STRING },
          keyRisks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          horizonOutlook: { type: Type.STRING },
          disclaimer: { type: Type.STRING },
        },
        required: [
          'executiveSummary',
          'technicalInterpretation',
          'bullCase',
          'bearCase',
          'keyRisks',
          'horizonOutlook',
          'disclaimer',
        ],
      },
    },
  });

  return parseGeminiJson<StockAIAnalysis>(response.text);
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

export async function analyzeNewsSentimentWithGemini(
  symbol: string,
  companyName: string,
  sector: string
): Promise<NewsSentimentReport> {
  let liveHeadlines: Array<{ headline: string; source: string; datetime: number; summary: string }> = [];
  let isDemoNews = true;

  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey && !symbol.endsWith('.NS') && !symbol.endsWith('.BO')) {
    try {
      const to = new Date().toISOString().slice(0, 10);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 14);
      const from = fromDate.toISOString().slice(0, 10);
      const resp = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
          symbol
        )}&from=${from}&to=${to}&token=${encodeURIComponent(finnhubKey)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (resp.ok) {
        const rawNews = (await resp.json()) as Array<{
          headline?: string;
          source?: string;
          datetime?: number;
          summary?: string;
        }>;
        if (Array.isArray(rawNews) && rawNews.length > 0) {
          liveHeadlines = rawNews.slice(0, 5).map((n) => ({
            headline: n.headline || 'Market Update',
            source: n.source || 'Finnhub Wire',
            datetime: n.datetime || Math.floor(Date.now() / 1000),
            summary: n.summary || '',
          }));
          isDemoNews = false;
        }
      }
    } catch {
      // Fall through to Yahoo Finance news
    }
  }

  if (liveHeadlines.length === 0) {
    const bySym = await fetchYahooNewsHeadlines(symbol);
    const byName = bySym.length > 0 ? bySym : await fetchYahooNewsHeadlines(companyName);
    if (byName.length > 0) {
      liveHeadlines = byName;
      isDemoNews = false;
    }
  }

  const ai = getGeminiClient();
  const formattedHeadlines = liveHeadlines.map((n) => ({
    headline: n.headline,
    source: n.source,
    publishedDate: new Date(n.datetime * 1000).toISOString().slice(0, 10),
    context: n.summary,
  }));

  const prompt =
    formattedHeadlines.length > 0
      ? `Classify sentiment (Positive/Neutral/Negative), assign an integer impactScore from 1 to 10, and summarize market implications for these real recent news items regarding ${companyName} (${symbol}, ${sector}):\n${JSON.stringify(
          formattedHeadlines
        )}`
      : `No live news feed items were returned for ${companyName} (${symbol}). Create 4 realistic DEMO_NEWS_DIGEST market briefings reflecting typical earnings, regulatory, margin, and macro themes for ${companyName} (${symbol}) in the ${sector} sector. Mark sources clearly as "Demo Market Digest" and evaluate their sentiment polarity and investor impact.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a financial news sentiment analyst. Be factual, balanced, and highlight both positive catalysts and downside risks.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallSentiment: { type: Type.STRING, enum: ['Positive', 'Neutral', 'Negative'] },
          sentimentSummary: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                source: { type: Type.STRING },
                publishedAt: { type: Type.STRING },
                sentiment: { type: Type.STRING, enum: ['Positive', 'Neutral', 'Negative'] },
                impactScore: { type: Type.NUMBER },
                summary: { type: Type.STRING },
              },
              required: ['headline', 'source', 'publishedAt', 'sentiment', 'impactScore', 'summary'],
            },
          },
        },
        required: ['overallSentiment', 'sentimentSummary', 'items'],
      },
    },
  });

  const parsed = parseGeminiJson<Omit<NewsSentimentReport, 'symbol' | 'isDemoNews'>>(response.text);

  return {
    symbol,
    isDemoNews,
    ...parsed,
  };
}

export async function askInvestmentAssistant(
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
): Promise<string> {
  const ai = getGeminiClient();
  const historyText = (context.history ?? [])
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Investor' : 'Research Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `Context:
- Active Equity: ${context.symbol ?? 'None selected'} (${context.price ?? 'N/A'} ${context.currency ?? ''})
- RSI(14): ${context.rsi14 ?? 'N/A'}, Risk Profile: ${context.riskLevel ?? 'N/A'}
- Portfolio Snapshot: ${context.portfolioSummary ?? 'Not provided'}

Recent Conversation:
${historyText}

Investor Question: ${question}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are the Smart Investor Research Assistant. Provide structured, educational investment analysis covering Indian (NSE/BSE) and global equities, technical indicators, portfolio diversification, and risk management. Never guarantee profits, never invent live prices not provided in context, and always include a concise risk note when discussing forecasts.',
    },
  });

  return response.text ?? 'Unable to generate research response at this time.';
}
