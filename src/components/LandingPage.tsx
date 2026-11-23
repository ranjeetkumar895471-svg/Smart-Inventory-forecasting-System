import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  BarChart3,
  Cpu,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { searchStocksApi, fetchStockBundleApi } from '../services/api';
import type { StockCatalogEntry, MarketStockBundle } from '../types';
import { formatMoney, formatPct } from '../utils/formatters';

interface LandingPageProps {
  onOpenAuth: (mode: 'investor' | 'admin') => void;
  onEnterWorkspace: () => void;
  isAuthenticated: boolean;
}

export function LandingPage({
  onOpenAuth,
  onEnterWorkspace,
  isAuthenticated,
}: LandingPageProps) {
  const [featured, setFeatured] = useState<MarketStockBundle[]>([]);
  const [catalogCount, setCatalogCount] = useState<number>(16);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await searchStocksApi('');
        if (!active) return;
        setCatalogCount(res.totalCatalog);
        const picks: StockCatalogEntry[] = [
          res.results.find((s) => s.symbol === 'RELIANCE.NS'),
          res.results.find((s) => s.symbol === 'TCS.NS'),
          res.results.find((s) => s.symbol === 'NVDA'),
          res.results.find((s) => s.symbol === 'AAPL'),
        ].filter((x): x is StockCatalogEntry => Boolean(x));

        const bundles = await Promise.all(
          picks.map((p) => fetchStockBundleApi(p.symbol, 90).then((r) => r.bundle))
        );
        if (active) setFeatured(bundles);
      } catch {
        // Non-blocking landing preview
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100">
      {/* Three-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#070B14]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-lg font-display font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Smart Investor
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#capabilities" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Capabilities
            </a>
            <a href="#architecture" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Forecasting Engine
            </a>
            <a href="#markets" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Market Coverage
            </a>
            <button
              type="button"
              onClick={() => onOpenAuth('admin')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Admin Console
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={isAuthenticated ? onEnterWorkspace : () => onOpenAuth('investor')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {isAuthenticated ? 'Open Workspace' : 'Launch Platform'}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Split */}
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
              <div className="space-y-5">
                <p className="text-xs font-medium tracking-wide text-blue-400">
                  Indian NSE &amp; Global Equities · Quantitative Forecasting · Gemini Research
                </p>
                <h1
                  className="font-display font-bold tracking-tight text-white leading-[1.08]"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
                >
                  Probabilistic market forecasting and disciplined equity research
                </h1>
                <p className="text-base text-slate-300 leading-relaxed max-w-xl">
                  Combine historical walk-forward time-series modeling, institutional technical
                  indicators (RSI, MACD, SMA, EMA, Bollinger Bands), and server-side Gemini
                  synthesis in one transparent investor workspace.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={isAuthenticated ? onEnterWorkspace : () => onOpenAuth('investor')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors whitespace-nowrap shrink-0"
                >
                  {isAuthenticated ? 'Go to Investor Dashboard' : 'Sign In to Investor Terminal'}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('admin')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 font-medium text-sm transition-colors whitespace-nowrap shrink-0"
                >
                  Admin Access
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 relative rounded-xl overflow-hidden border border-slate-800 bg-[#0E1525] min-h-[320px]">
              <img
                src="/src/assets/images/hero_fintech_studio_1795408650951.jpg"
                alt="Institutional quantitative investment analytics research floor"
                referrerPolicy="no-referrer"
                className="w-full h-full lg:h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070B14]/90 via-[#070B14]/25 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
                <span>1-Day, 7-Day &amp; 30-Day Confidence Intervals</span>
                <span className="font-mono text-slate-200">Walk-Forward Backtesting</span>
              </div>
            </div>
          </div>

          {/* 4-Column Quantitative Strip below hero */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-800 rounded-xl bg-[#0B1120] divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
            <div className="p-5 space-y-1">
              <p className="text-xs text-slate-400">Market Universe</p>
              <p className="text-2xl font-display font-bold text-white tabular-nums">
                {catalogCount}+ Equities
              </p>
              <p className="text-xs text-slate-400">NSE India (INR) &amp; US Global (USD)</p>
            </div>
            <div className="p-5 space-y-1">
              <p className="text-xs text-slate-400">Forecast Horizons</p>
              <p className="text-2xl font-display font-bold text-white tabular-nums">
                1D · 7D · 30D
              </p>
              <p className="text-xs text-slate-400">80% &amp; 95% confidence fan bounds</p>
            </div>
            <div className="p-5 space-y-1">
              <p className="text-xs text-slate-400">Technical Suite</p>
              <p className="text-2xl font-display font-bold text-white tabular-nums">
                5 Core Indicators
              </p>
              <p className="text-xs text-slate-400">RSI, MACD, SMA, EMA, Bollinger Bands</p>
            </div>
            <div className="p-5 space-y-1">
              <p className="text-xs text-slate-400">Transparency Policy</p>
              <p className="text-2xl font-display font-bold text-white">No Return Guarantees</p>
              <p className="text-xs text-slate-400">Explicit Demo vs. Live API labeling</p>
            </div>
          </div>
        </section>

        {/* Live / Demo Benchmark Preview */}
        <section id="markets" className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-800/70">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-white">
                Benchmark Equity Watch
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Snapshot from the backend market adapter (explicitly tagged DEMO DATA when live keys are absent).
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400">
              {featured[0]?.isDemo ? 'DEMO DATA MODE ACTIVE' : 'LIVE API FEED'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((item) => (
              <div
                key={item.meta.symbol}
                className="p-5 rounded-xl border border-slate-800 bg-[#0B1120] space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.meta.symbol}</p>
                    <p className="text-xs text-slate-400 truncate max-w-[170px]">
                      {item.meta.companyName}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{item.meta.exchange}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-xl font-mono font-semibold text-white tabular-nums">
                    {formatMoney(item.currentPrice, item.meta.currency)}
                  </p>
                  <p
                    className={`text-xs font-mono font-medium tabular-nums ${
                      item.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatPct(item.changePercent)}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  {item.meta.sector} · {item.isDemo ? 'Demo Series' : item.dataSource}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Core Capabilities Bento */}
        <section id="capabilities" className="max-w-7xl mx-auto px-6 py-14 border-t border-slate-800/70">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl font-display font-bold text-white">
              End-to-End Investment Analytics Architecture
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Every module executes against verified backend calculations, Cloud Firestore persistence, and server-side Gemini synthesis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 p-6 rounded-xl border border-slate-800 bg-[#0B1120] space-y-3">
              <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>01. Time-Series Forecasting &amp; Historical Validation</span>
              </div>
              <h3 className="text-lg font-display font-semibold text-white">
                Damped Holt-Winters Projections with Walk-Forward Accuracy
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Generates 1-day, 7-day, and 30-day trajectories alongside 80% and 95% volatility-scaled confidence intervals. Every forecast executes a rolling out-of-sample backtest reporting MAE, RMSE, MAPE, and Directional Accuracy before projecting forward.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-[#0B1120] space-y-3">
              <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                <ShieldAlert className="w-4 h-4" />
                <span>02. Risk Classification</span>
              </div>
              <h3 className="text-lg font-display font-semibold text-white">
                Low, Medium &amp; High Dispersion
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Quantifies annualized volatility, max historical drawdown, and RSI overextension into transparent risk scores and mandatory non-guarantee warnings.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-[#0B1120] space-y-3">
              <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                <BarChart3 className="w-4 h-4" />
                <span>03. Portfolio &amp; P&amp;L Simulator</span>
              </div>
              <h3 className="text-lg font-display font-semibold text-white">
                Real-Time Holdings &amp; Brokerage Calculator
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Track NSE and US equity positions in Cloud Firestore, monitor allocation weights, and simulate net P&amp;L after brokerage and tax friction.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-[#0B1120] space-y-3">
              <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                <Cpu className="w-4 h-4" />
                <span>04. Server-Side Gemini Research</span>
              </div>
              <h3 className="text-lg font-display font-semibold text-white">
                Stock Thesis, News Sentiment &amp; Assistant
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Gemini analyzes computed technicals and news briefings strictly on the backend, producing balanced bull/bear cases and interactive Q&amp;A.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-[#0B1120] space-y-3">
              <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                <FileSpreadsheet className="w-4 h-4" />
                <span>05. PDF Reports &amp; Admin Governance</span>
              </div>
              <h3 className="text-lg font-display font-semibold text-white">
                Exportable Research &amp; RBAC Audit Logs
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Export formatted PDF research dossiers in one click while administrators manage users, database snapshots, and activity audit logs.
              </p>
            </div>
          </div>
        </section>

        {/* Architecture Showcase */}
        <section id="architecture" className="max-w-7xl mx-auto px-6 py-14 border-t border-slate-800/70">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-5 rounded-xl overflow-hidden border border-slate-800 bg-[#0B1120] min-h-[280px]">
              <img
                src="/src/assets/images/quant_engine_architecture_1795408651130.jpg"
                alt="Quantitative modeling terminal architecture"
                referrerPolicy="no-referrer"
                className="w-full h-full lg:h-full object-cover"
              />
            </div>
            <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
              <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                <Layers className="w-4 h-4" />
                <span>Modular Python-Compatible Forecasting Architecture</span>
              </div>
              <h2 className="text-2xl font-display font-bold text-white">
                Designed for Empirical Verification, Not Black-Box Claims
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Gemini is never presented as a standalone price oracle. Quantitative projections originate from our statistical time-series engine (with a drop-in FastAPI Python microservice endpoint in <code className="font-mono text-blue-300">/python_forecaster</code>), while Gemini synthesizes indicators, macro risk, and sentiment into human-readable research.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={isAuthenticated ? onEnterWorkspace : () => onOpenAuth('investor')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                >
                  Open Interactive Terminal
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070B14] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            Smart Investor Forecasting System · Quantitative Research &amp; Portfolio Analytics
          </p>
          <p>
            Disclaimer: Statistical projections and AI research summaries do not guarantee future investment returns.
          </p>
        </div>
      </footer>
    </div>
  );
}
