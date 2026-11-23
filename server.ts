import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from './server/authMiddleware.ts';
import {
  searchCatalogAsync,
  getMarketStockBundle,
  getBatchQuotes,
  getSectorOverview,
  STOCK_CATALOG,
} from './server/marketData.ts';
import { computeTechnicalIndicators, runForecastingEngine } from './server/forecastingEngine.ts';
import {
  analyzeStockWithGemini,
  analyzeNewsSentimentWithGemini,
  askInvestmentAssistant,
} from './server/geminiService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  // Basic security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Health and configuration status (no secrets exposed)
  app.get('/api/health', (_req, res) => {
    const hasAlphaVantage = Boolean(process.env.ALPHA_VANTAGE_API_KEY);
    const hasFinnhub = Boolean(process.env.FINNHUB_API_KEY);
    const hasYahooFinance = true;
    const hasGemini = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    const hasPythonForecaster = Boolean(process.env.PYTHON_FORECASTER_URL);

    res.json({
      status: 'ok',
      marketDataMode: hasAlphaVantage || hasFinnhub || hasYahooFinance ? 'LIVE_CONFIGURED' : 'DEMO_DATA',
      providers: {
        yahooFinance: hasYahooFinance,
        alphaVantage: hasAlphaVantage,
        finnhub: hasFinnhub,
        gemini: hasGemini,
        pythonForecaster: hasPythonForecaster,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Market catalog & dynamic NSE/global stock search
  app.get('/api/market/search', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : '';
      const market = typeof req.query.market === 'string' ? req.query.market : 'All';
      const { results, liveSearch } = await searchCatalogAsync(q, market);
      res.json({
        results,
        totalCatalog: STOCK_CATALOG.length,
        isDemo: !liveSearch && !process.env.ALPHA_VANTAGE_API_KEY && !process.env.FINNHUB_API_KEY,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Stock search failed',
      });
    }
  });

  // Batch quotes for portfolio, watchlist, and overview cards
  app.get('/api/market/quotes', async (req, res) => {
    try {
      const raw = typeof req.query.symbols === 'string' ? req.query.symbols : '';
      const symbols = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const quotes = await getBatchQuotes(symbols);
      res.json({ quotes });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to fetch batch quotes',
      });
    }
  });

  // Sector-wise analytics
  app.get('/api/market/sectors', async (_req, res) => {
    try {
      const { sectors, isDemo } = await getSectorOverview();
      res.json({
        sectors,
        isDemo,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to compute sector analytics',
      });
    }
  });

  // Quote, historical prices, and technical indicators
  app.get('/api/market/stock/:symbol', async (req, res) => {
    try {
      const symbol = String(req.params.symbol || '').trim().toUpperCase();
      if (!/^[A-Z0-9.\-]{1,24}$/.test(symbol)) {
        res.status(400).json({ error: 'Invalid stock symbol format.' });
        return;
      }
      const daysParam = Number(req.query.days) || 260;
      const bundle = await getMarketStockBundle(symbol, daysParam);
      const technicals = computeTechnicalIndicators(bundle.history);
      res.json({ bundle, technicals });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to load market data',
      });
    }
  });

  // Quantitative time-series forecasting endpoint (1d, 7d, 30d)
  app.post('/api/forecast', async (req, res) => {
    try {
      const { symbol, horizonDays } = req.body as { symbol?: string; horizonDays?: number };
      const cleanSymbol = String(symbol || '').trim().toUpperCase();
      if (!/^[A-Z0-9.\-]{1,24}$/.test(cleanSymbol)) {
        res.status(400).json({ error: 'Invalid stock symbol.' });
        return;
      }
      if (
        horizonDays !== undefined &&
        horizonDays !== 1 &&
        horizonDays !== 7 &&
        horizonDays !== 30
      ) {
        res.status(400).json({ error: 'horizonDays must be 1, 7, or 30.' });
        return;
      }
      const validHorizon: 1 | 7 | 30 =
        horizonDays === 1 ? 1 : horizonDays === 30 ? 30 : 7;

      const bundle = await getMarketStockBundle(cleanSymbol, 260);
      const technicals = computeTechnicalIndicators(bundle.history);
      const forecast = await runForecastingEngine(
        cleanSymbol,
        bundle.history,
        validHorizon,
        technicals
      );

      res.json({
        isDemo: bundle.isDemo,
        dataSource: bundle.dataSource,
        forecast,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Forecast computation failed',
      });
    }
  });

  // Protected AI routes (requires verified Firebase ID token)
  app.post('/api/ai/analyze-stock', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { symbol, horizonDays } = req.body as { symbol?: string; horizonDays?: number };
      const cleanSymbol = String(symbol || '').trim().toUpperCase();
      if (!/^[A-Z0-9.\-]{1,24}$/.test(cleanSymbol)) {
        res.status(400).json({ error: 'Invalid stock symbol.' });
        return;
      }
      if (
        horizonDays !== undefined &&
        horizonDays !== 1 &&
        horizonDays !== 7 &&
        horizonDays !== 30
      ) {
        res.status(400).json({ error: 'horizonDays must be 1, 7, or 30.' });
        return;
      }
      const validHorizon: 1 | 7 | 30 =
        horizonDays === 1 ? 1 : horizonDays === 30 ? 30 : 7;

      const bundle = await getMarketStockBundle(cleanSymbol, 260);
      const technicals = computeTechnicalIndicators(bundle.history);
      const forecast = await runForecastingEngine(
        cleanSymbol,
        bundle.history,
        validHorizon,
        technicals
      );
      const analysis = await analyzeStockWithGemini(bundle, technicals, forecast);

      res.json({ analysis, isDemo: bundle.isDemo });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Gemini stock analysis failed',
      });
    }
  });

  app.post('/api/ai/news-sentiment', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { symbol } = req.body as { symbol?: string };
      const cleanSymbol = String(symbol || '').trim().toUpperCase();
      if (!/^[A-Z0-9.\-]{1,24}$/.test(cleanSymbol)) {
        res.status(400).json({ error: 'Invalid stock symbol.' });
        return;
      }
      const bundle = await getMarketStockBundle(cleanSymbol, 60);
      const report = await analyzeNewsSentimentWithGemini(
        bundle.meta.symbol,
        bundle.meta.companyName,
        bundle.meta.sector
      );
      res.json(report);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'News sentiment analysis failed',
      });
    }
  });

  app.post('/api/ai/research-assistant', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { question, context } = req.body as {
        question?: string;
        context?: {
          symbol?: string;
          price?: number;
          currency?: string;
          rsi14?: number;
          riskLevel?: string;
          portfolioSummary?: string;
          history?: Array<{ role: 'user' | 'assistant'; content: string }>;
        };
      };
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        res.status(400).json({ error: 'Question cannot be empty.' });
        return;
      }
      const answer = await askInvestmentAssistant(question.slice(0, 1200), context ?? {});
      res.json({ answer });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'AI Research Assistant failed',
      });
    }
  });

  // Protected Admin diagnostic endpoint
  app.get('/api/admin/system-status', requireAdmin, async (_req: AuthenticatedRequest, res) => {
    res.json({
      catalogSize: STOCK_CATALOG.length,
      marketDataMode: 'LIVE_API',
      pythonForecasterConfigured: Boolean(process.env.PYTHON_FORECASTER_URL),
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      serverTime: new Date().toISOString(),
    });
  });

  // Frontend Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Investor Forecasting System listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
