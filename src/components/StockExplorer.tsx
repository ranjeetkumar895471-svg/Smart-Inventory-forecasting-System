import React, { useEffect, useState } from 'react';
import {
  Search,
  Sparkles,
  BookmarkPlus,
  Briefcase,
  FileDown,
  ShieldAlert,
  Save,
  TrendingUp,
  Info,
  Loader2,
} from 'lucide-react';
import {
  searchStocksApi,
  fetchStockBundleApi,
  fetchForecastApi,
  analyzeStockAiApi,
} from '../services/api';
import {
  addPortfolioHolding,
  addToWatchlist,
  saveForecastRecord,
  saveResearchReport,
} from '../services/firestoreService';
import type {
  StockCatalogEntry,
  MarketStockBundle,
  TechnicalSnapshot,
  ForecastResult,
  StockAIAnalysis,
} from '../types';
import {
  PriceAndForecastChart,
  RSIChart,
  MACDChart,
} from './charts/StockCharts';
import { formatMoney, formatPct, formatVolume } from '../utils/formatters';
import { downloadEquityPdfReport } from '../utils/pdfReportGenerator';

interface StockExplorerProps {
  selectedSymbol: string;
  onSelectSymbol: (sym: string) => void;
  onStockLoaded?: (bundle: MarketStockBundle, technicals: TechnicalSnapshot, forecast: ForecastResult) => void;
}

export function StockExplorer({
  selectedSymbol,
  onSelectSymbol,
  onStockLoaded,
}: StockExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'All' | 'India' | 'International'>('All');
  const [catalog, setCatalog] = useState<StockCatalogEntry[]>([]);

  const [daysWindow, setDaysWindow] = useState<60 | 120 | 260>(120);
  const [horizonDays, setHorizonDays] = useState<1 | 7 | 30>(7);

  const [bundle, setBundle] = useState<MarketStockBundle | null>(null);
  const [technicals, setTechnicals] = useState<TechnicalSnapshot | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);

  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showEMA12, setShowEMA12] = useState(false);
  const [showBollinger, setShowBollinger] = useState(true);

  const [aiAnalysis, setAiAnalysis] = useState<StockAIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Quick Add Portfolio Modal state
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyQty, setBuyQty] = useState('10');
  const [buyPrice, setBuyPrice] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await searchStocksApi(searchQuery, marketFilter);
        if (active) setCatalog(res.results);
      } catch {
        // Ignore transient search error
      }
    })();
    return () => {
      active = false;
    };
  }, [searchQuery, marketFilter]);

  useEffect(() => {
    let active = true;
    setLoadingData(true);
    setLoadError(null);
    setAiAnalysis(null);
    setAiError(null);
    (async () => {
      try {
        const [stockRes, fcRes] = await Promise.all([
          fetchStockBundleApi(selectedSymbol, daysWindow),
          fetchForecastApi(selectedSymbol, horizonDays),
        ]);
        if (!active) return;
        setBundle(stockRes.bundle);
        setTechnicals(stockRes.technicals);
        setForecast(fcRes.forecast);
        setBuyPrice(String(stockRes.bundle.currentPrice));
        onStockLoaded?.(stockRes.bundle, stockRes.technicals, fcRes.forecast);
      } catch (err) {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Unable to fetch market data.');
        }
      } finally {
        if (active) setLoadingData(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedSymbol, daysWindow, horizonDays]);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleRunAiAnalysis = async () => {
    if (!bundle) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await analyzeStockAiApi(bundle.meta.symbol, horizonDays);
      setAiAnalysis(res.analysis);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Gemini AI analysis failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveForecast = async () => {
    if (!forecast || !bundle) return;
    setSavingAction(true);
    try {
      await saveForecastRecord({
        symbol: bundle.meta.symbol,
        horizonDays: forecast.horizonDays,
        modelName: forecast.modelName,
        currentPrice: forecast.currentPrice,
        predictedPrice: forecast.predictedPrice,
        lower95: forecast.lower95,
        upper95: forecast.upper95,
        riskLevel: forecast.risk.level,
        mape: forecast.backtest.mapePct,
        directionalAccuracy: forecast.backtest.directionalAccuracyPct,
        isDemo: bundle.isDemo,
      });
      notify(`Saved ${forecast.horizonDays}-day forecast for ${bundle.meta.symbol} to Firestore.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save forecast.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleAddWatchlist = async () => {
    if (!bundle) return;
    setSavingAction(true);
    try {
      await addToWatchlist({
        symbol: bundle.meta.symbol,
        companyName: bundle.meta.companyName,
        exchange: bundle.meta.exchange,
        sector: bundle.meta.sector,
        currency: bundle.meta.currency,
        targetPrice: forecast?.predictedPrice ?? bundle.currentPrice,
      });
      notify(`Added ${bundle.meta.symbol} to your Watchlist.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not add to watchlist.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleExportPdf = async () => {
    if (!bundle || !technicals || !forecast) return;
    downloadEquityPdfReport({ bundle, technicals, forecast, aiAnalysis });
    try {
      await saveResearchReport({
        symbol: bundle.meta.symbol,
        title: `${bundle.meta.companyName} (${forecast.horizonDays}D Forecast Report)`,
        reportType: 'Equity Forecast',
        horizonDays: forecast.horizonDays,
        riskLevel: forecast.risk.level,
        summary:
          aiAnalysis?.executiveSummary ||
          `${forecast.horizonDays}-day projection ${formatMoney(
            forecast.predictedPrice,
            bundle.meta.currency
          )} (${formatPct(forecast.expectedChangePct)}), 95% CI ${formatMoney(
            forecast.lower95,
            bundle.meta.currency
          )}–${formatMoney(forecast.upper95, bundle.meta.currency)}. Backtest MAPE ${
            forecast.backtest.mapePct
          }%.`,
      });
      notify(`Downloaded PDF report and archived summary in Firestore.`);
    } catch {
      notify(`PDF downloaded.`);
    }
  };

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bundle) return;
    const qty = Number(buyQty);
    const price = Number(buyPrice);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      notify('Enter positive quantity and average buy price.');
      return;
    }
    setSavingAction(true);
    try {
      await addPortfolioHolding({
        symbol: bundle.meta.symbol,
        companyName: bundle.meta.companyName,
        exchange: bundle.meta.exchange,
        sector: bundle.meta.sector,
        currency: bundle.meta.currency,
        quantity: qty,
        avgBuyPrice: price,
      });
      setShowBuyModal(false);
      notify(`Added ${qty} shares of ${bundle.meta.symbol} to Portfolio.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to add holding.');
    } finally {
      setSavingAction(false);
    }
  };

  const riskColor = (level: string) =>
    level === 'High'
      ? 'text-rose-400'
      : level === 'Medium'
      ? 'text-amber-400'
      : 'text-emerald-400';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchQuery.trim().toUpperCase();
    if (!raw) return;
    const exact = catalog.find((c) => c.symbol.toUpperCase() === raw);
    if (exact) {
      onSelectSymbol(exact.symbol);
      return;
    }
    if (/^[A-Z0-9.\-]{1,24}$/.test(raw)) {
      onSelectSymbol(raw);
    } else if (catalog.length > 0) {
      onSelectSymbol(catalog[0].symbol);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any NSE (.NS/.BO) or global symbol/company (e.g. RELIANCE.NS, WIPRO.NS, NVDA, META)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            {searchQuery.trim().length > 0 && (
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
              >
                Load Stock
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#070B14] border border-slate-800 rounded-lg shrink-0">
            {(['All', 'India', 'International'] as const).map((mkt) => (
              <button
                key={mkt}
                type="button"
                onClick={() => setMarketFilter(mkt)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  marketFilter === mkt
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mkt === 'All' ? 'All Markets' : mkt === 'India' ? 'India (NSE)' : 'Global (US)'}
              </button>
            ))}
          </div>
        </form>

        {/* Quick Equity Selector Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {catalog.length === 0 && searchQuery.trim() ? (
            <button
              type="button"
              onClick={() => {
                const sym = searchQuery.trim().toUpperCase();
                if (/^[A-Z0-9.\-]{1,24}$/.test(sym)) onSelectSymbol(sym);
              }}
              className="px-3 py-1.5 rounded-lg border border-blue-500/60 bg-blue-600/10 text-xs text-blue-300"
            >
              Query ticker directly: <span className="font-mono font-semibold">{searchQuery.trim().toUpperCase()}</span>
            </button>
          ) : (
            catalog.map((item) => (
              <button
                key={item.symbol}
                type="button"
                onClick={() => onSelectSymbol(item.symbol)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedSymbol === item.symbol
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-[#070B14] border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="font-mono">{item.symbol}</span>
                <span className="text-slate-400 ml-1.5 hidden sm:inline">
                  · {item.companyName.split(' ')[0]}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-blue-950/60 border border-blue-700/60 text-xs text-blue-200">
          {feedback}
        </div>
      )}

      {loadingData && (
        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-12 flex items-center justify-center gap-3 text-sm text-slate-300">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          Computing technical indicators and time-series forecast for {selectedSymbol}...
        </div>
      )}

      {loadError && !loadingData && (
        <div className="bg-rose-950/40 border border-rose-800 rounded-xl p-5 text-sm text-rose-200">
          {loadError}
        </div>
      )}

      {bundle && technicals && forecast && !loadingData && (
        <>
          {/* Transparent Data Source Notice */}
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              bundle.isDemo
                ? 'bg-amber-950/30 border-amber-700/50 text-amber-200'
                : 'bg-emerald-950/30 border-emerald-700/50 text-emerald-200'
            }`}
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">
                {bundle.isDemo ? 'DEMO DATA MODE:' : `${bundle.dataSource} LIVE FEED:`}
              </span>{' '}
              {bundle.providerNotice}
            </div>
          </div>

          {/* Equity Header + Primary Actions */}
          <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="text-2xl font-display font-bold text-white">
                    {bundle.meta.companyName}
                  </h2>
                  <span className="font-mono text-sm text-blue-400">{bundle.meta.symbol}</span>
                </div>
                <p className="text-xs text-slate-400">
                  {bundle.meta.exchange} · {bundle.meta.sector} · {bundle.meta.marketCapTier} · Currency{' '}
                  {bundle.meta.currency}
                </p>
                <p className="text-xs text-slate-400 max-w-2xl pt-1">{bundle.meta.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBuyModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Add to Portfolio
                </button>
                <button
                  type="button"
                  disabled={savingAction}
                  onClick={handleAddWatchlist}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Watchlist
                </button>
                <button
                  type="button"
                  disabled={savingAction}
                  onClick={handleSaveForecast}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Forecast
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Export PDF
                </button>
              </div>
            </div>

            {/* 4 KPI Strip */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-800 rounded-xl bg-[#070B14] divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
              <div className="p-4 space-y-1">
                <p className="text-xs text-slate-400">Latest Close</p>
                <p className="text-xl font-mono font-bold text-white tabular-nums">
                  {formatMoney(bundle.currentPrice, bundle.meta.currency)}
                </p>
                <p
                  className={`text-xs font-mono tabular-nums ${
                    bundle.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatPct(bundle.changePercent)} daily ({bundle.change >= 0 ? '+' : ''}
                  {bundle.change})
                </p>
              </div>

              <div className="p-4 space-y-1">
                <p className="text-xs text-slate-400">{forecast.horizonDays}-Day Point Forecast</p>
                <p className="text-xl font-mono font-bold text-white tabular-nums">
                  {formatMoney(forecast.predictedPrice, bundle.meta.currency)}
                </p>
                <p
                  className={`text-xs font-mono tabular-nums ${
                    forecast.expectedChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatPct(forecast.expectedChangePct)} expected drift
                </p>
              </div>

              <div className="p-4 space-y-1">
                <p className="text-xs text-slate-400">95% Confidence Interval</p>
                <p className="text-base font-mono font-semibold text-white tabular-nums pt-0.5">
                  {formatMoney(forecast.lower95, bundle.meta.currency)} –{' '}
                  {formatMoney(forecast.upper95, bundle.meta.currency)}
                </p>
                <p className="text-xs text-slate-400 font-mono tabular-nums">
                  80% Band: {formatMoney(forecast.lower80, bundle.meta.currency)} –{' '}
                  {formatMoney(forecast.upper80, bundle.meta.currency)}
                </p>
              </div>

              <div className="p-4 space-y-1">
                <p className="text-xs text-slate-400">Risk &amp; Validation Accuracy</p>
                <p className={`text-xl font-display font-bold ${riskColor(forecast.risk.level)}`}>
                  {forecast.risk.level} Risk ({forecast.risk.score}/100)
                </p>
                <p className="text-xs text-slate-400 font-mono tabular-nums">
                  Backtest MAPE {forecast.backtest.mapePct}% · Dir {forecast.backtest.directionalAccuracyPct}%
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Chart & Horizon Controls */}
          <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-display font-semibold text-white">
                  Historical Price, Overlays &amp; {forecast.horizonDays}-Day Forecast Fan
                </h3>
                <p className="text-xs text-slate-400">
                  Engine: {forecast.modelName} ({forecast.engineSource})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Forecast Horizon Selector */}
                <div className="flex items-center gap-1 p-1 bg-[#070B14] border border-slate-800 rounded-lg">
                  {([1, 7, 30] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHorizonDays(h)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        horizonDays === h
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {h}D Forecast
                    </button>
                  ))}
                </div>

                {/* History Depth Selector */}
                <div className="flex items-center gap-1 p-1 bg-[#070B14] border border-slate-800 rounded-lg">
                  {([60, 120, 260] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDaysWindow(d)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        daysWindow === d
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}D History
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Technical Indicator Toggles */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 mr-1">Overlays:</span>
              {[
                { label: 'SMA (20)', active: showSMA20, toggle: () => setShowSMA20((v) => !v) },
                { label: 'SMA (50)', active: showSMA50, toggle: () => setShowSMA50((v) => !v) },
                { label: 'EMA (12)', active: showEMA12, toggle: () => setShowEMA12((v) => !v) },
                {
                  label: 'Bollinger Bands (20,2)',
                  active: showBollinger,
                  toggle: () => setShowBollinger((v) => !v),
                },
              ].map((ov) => (
                <button
                  key={ov.label}
                  type="button"
                  onClick={ov.toggle}
                  className={`px-2.5 py-1 rounded border transition-colors ${
                    ov.active
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-[#070B14] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ov.label}
                </button>
              ))}
            </div>

            <PriceAndForecastChart
              series={technicals.series}
              forecastTrajectory={forecast.trajectory}
              currency={bundle.meta.currency}
              showSMA20={showSMA20}
              showSMA50={showSMA50}
              showEMA12={showEMA12}
              showBollinger={showBollinger}
            />

            {/* RSI & MACD Subcharts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-3 border-t border-slate-800/70">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">RSI (14) Momentum Oscillator</span>
                  <span className="font-mono text-slate-400">
                    Current: {technicals.rsi14} ({technicals.rsiSignal})
                  </span>
                </div>
                <RSIChart series={technicals.series} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">MACD (12, 26, 9) Trend</span>
                  <span className="font-mono text-slate-400">
                    {technicals.macd} / Sig {technicals.macdSignal} ({technicals.macdTrend})
                  </span>
                </div>
                <MACDChart series={technicals.series} />
              </div>
            </div>
          </div>

          {/* Technical Metrics, Backtest Validation & Risk Warning */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-display font-semibold text-white">
                Computed Technical Readings
              </h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                  <dt className="text-slate-400">SMA 20 / 50 / 200</dt>
                  <dd className="font-mono text-slate-200 tabular-nums">
                    {technicals.sma20} / {technicals.sma50} / {technicals.sma200}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                  <dt className="text-slate-400">EMA 12 / 26</dt>
                  <dd className="font-mono text-slate-200 tabular-nums">
                    {technicals.ema12} / {technicals.ema26}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                  <dt className="text-slate-400">Bollinger Band Range</dt>
                  <dd className="font-mono text-slate-200 tabular-nums">
                    {technicals.bbLower} – {technicals.bbUpper}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                  <dt className="text-slate-400">30-Day Return</dt>
                  <dd className="font-mono text-slate-200 tabular-nums">
                    {formatPct(technicals.periodReturn30dPct)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">52W Range · Avg Vol</dt>
                  <dd className="font-mono text-slate-200 tabular-nums">
                    {bundle.low52Week}–{bundle.high52Week} · {formatVolume(bundle.avgVolume)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-display font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Walk-Forward Backtest Accuracy
              </h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                  <dt className="text-slate-400">Validation Window</dt>
                  <dd className="font-mono text-slate-200 tabular-nums">
                    {forecast.backtest.validationWindowDays} trading days
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                  <dt className="text-slate-400">Mean Absolute Error (MAE)</dt>
                  <dd className="font-mono text-slate-200 tabular-nums">
                    {formatMoney(forecast.backtest.mae, bundle.meta.currency)}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                  <dt className="text-slate-400">Root Mean Squared Error (RMSE)</dt>
                  <dd className="font-mono text-slate-200 tabular-nums">
                    {formatMoney(forecast.backtest.rmse, bundle.meta.currency)}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                  <dt className="text-slate-400">Mean Abs % Error (MAPE)</dt>
                  <dd className="font-mono text-slate-200 tabular-nums">
                    {forecast.backtest.mapePct}%
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Directional Hit Rate</dt>
                  <dd className="font-mono text-emerald-400 tabular-nums">
                    {forecast.backtest.directionalAccuracyPct}%
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-display font-semibold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Risk Assessment &amp; Warning
              </h3>
              <p className={`text-sm font-semibold ${riskColor(forecast.risk.level)}`}>
                {forecast.risk.level} Risk Classification (Score: {forecast.risk.score}/100)
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{forecast.risk.rationale}</p>
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-700/40 text-xs text-amber-200 leading-relaxed">
                {forecast.risk.warning}
              </div>
            </div>
          </div>

          {/* Gemini AI Stock Analysis Section */}
          <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-display font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  AI Stock Analysis (Gemini)
                </h3>
                <p className="text-xs text-slate-400">
                  Synthesizes computed technical indicators, backtest accuracy, and dispersion bounds server-side.
                </p>
              </div>
              <button
                type="button"
                disabled={aiLoading}
                onClick={handleRunAiAnalysis}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Synthesizing Research...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate AI Equity Thesis
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-200">
                {aiError}
              </div>
            )}

            {aiAnalysis && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="md:col-span-2 p-4 rounded-lg bg-[#070B14] border border-slate-800 space-y-1.5">
                  <p className="text-xs font-semibold text-blue-400">Executive Summary</p>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {aiAnalysis.executiveSummary}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[#070B14] border border-slate-800 space-y-1.5">
                  <p className="text-xs font-semibold text-emerald-400">Bull Case Drivers</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiAnalysis.bullCase}</p>
                </div>
                <div className="p-4 rounded-lg bg-[#070B14] border border-slate-800 space-y-1.5">
                  <p className="text-xs font-semibold text-rose-400">Bear Case &amp; Vulnerabilities</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiAnalysis.bearCase}</p>
                </div>
                <div className="p-4 rounded-lg bg-[#070B14] border border-slate-800 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-200">Technical Interpretation</p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {aiAnalysis.technicalInterpretation}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[#070B14] border border-slate-800 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-400">Key Risk Factors</p>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {aiAnalysis.keyRisks.map((rk, idx) => (
                      <li key={idx}>{rk}</li>
                    ))}
                  </ul>
                </div>
                <div className="md:col-span-2 text-xs text-slate-400">
                  {aiAnalysis.horizonOutlook} · {aiAnalysis.disclaimer}
                </div>
              </div>
            )}
          </div>

          {/* Historical Market Data Table */}
          <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-display font-semibold text-white">
              Historical Market Data (Recent Sessions)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 pr-4 font-medium">Date</th>
                    <th className="py-2.5 px-4 text-right font-medium">Open</th>
                    <th className="py-2.5 px-4 text-right font-medium">High</th>
                    <th className="py-2.5 px-4 text-right font-medium">Low</th>
                    <th className="py-2.5 px-4 text-right font-medium">Close</th>
                    <th className="py-2.5 pl-4 text-right font-medium">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                  {bundle.history
                    .slice(-15)
                    .reverse()
                    .map((bar) => (
                      <tr key={bar.date} className="hover:bg-slate-800/30">
                        <td className="py-2 pr-4 text-slate-300">{bar.date}</td>
                        <td className="py-2 px-4 text-right text-slate-300">
                          {formatMoney(bar.open, bundle.meta.currency)}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-300">
                          {formatMoney(bar.high, bundle.meta.currency)}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-300">
                          {formatMoney(bar.low, bundle.meta.currency)}
                        </td>
                        <td className="py-2 px-4 text-right text-white font-medium">
                          {formatMoney(bar.close, bundle.meta.currency)}
                        </td>
                        <td className="py-2 pl-4 text-right text-slate-400">
                          {formatVolume(bar.volume)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add to Portfolio Modal */}
          {showBuyModal && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <form
                onSubmit={handleAddPortfolio}
                className="w-full max-w-md bg-[#0B1120] border border-slate-700 rounded-xl p-6 space-y-4"
              >
                <h3 className="text-lg font-display font-bold text-white">
                  Add {bundle.meta.symbol} to Portfolio
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Share Quantity</label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={buyQty}
                      onChange={(e) => setBuyQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Average Buy Price ({bundle.meta.currency})
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBuyModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white"
                  >
                    {savingAction ? 'Saving...' : 'Save Position'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
