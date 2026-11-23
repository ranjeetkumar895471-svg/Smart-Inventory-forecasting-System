import React, { useEffect, useState } from 'react';
import { Newspaper, Loader2, RefreshCw } from 'lucide-react';
import { fetchNewsSentimentApi, searchStocksApi } from '../services/api';
import type { NewsSentimentReport, StockCatalogEntry } from '../types';

interface NewsSentimentProps {
  selectedSymbol: string;
  onSelectSymbol: (sym: string) => void;
}

export function NewsSentiment({ selectedSymbol, onSelectSymbol }: NewsSentimentProps) {
  const [catalog, setCatalog] = useState<StockCatalogEntry[]>([]);
  const [report, setReport] = useState<NewsSentimentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    searchStocksApi('').then((res) => setCatalog(res.results)).catch(() => {});
  }, []);

  const loadSentiment = async (sym: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNewsSentimentApi(sym);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to evaluate news sentiment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSentiment(selectedSymbol);
  }, [selectedSymbol]);

  const sentimentColor = (s: string) =>
    s === 'Positive'
      ? 'text-emerald-400'
      : s === 'Negative'
      ? 'text-rose-400'
      : 'text-amber-400';

  return (
    <div className="space-y-6">
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Newspaper className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-base font-display font-bold text-white">
              Financial News &amp; Gemini Sentiment Analysis
            </h2>
            <p className="text-xs text-slate-400">
              Evaluates market headlines and polarity for the selected equity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedSymbol}
            onChange={(e) => onSelectSymbol(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-xs text-white"
          >
            {(catalog.some((c) => c.symbol === selectedSymbol)
              ? catalog
              : [
                  {
                    symbol: selectedSymbol,
                    companyName: selectedSymbol,
                    exchange: 'MARKET',
                    sector: 'Equity',
                    market: selectedSymbol.endsWith('.NS') || selectedSymbol.endsWith('.BO') ? 'India' : 'International',
                    currency: selectedSymbol.endsWith('.NS') || selectedSymbol.endsWith('.BO') ? 'INR' : 'USD',
                    marketCapTier: 'Large Cap',
                    basePrice: 0,
                    annualDrift: 0,
                    annualVolatility: 0.25,
                    description: '',
                  },
                  ...catalog,
                ]
            ).map((c) => (
              <option key={c.symbol} value={c.symbol}>
                {c.symbol} · {c.companyName}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadSentiment(selectedSymbol)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-10 flex items-center justify-center gap-2 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          Evaluating news sentiment for {selectedSymbol}...
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-200">
          {error}
        </div>
      )}

      {report && !loading && (
        <div className="space-y-4">
          <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">Aggregate Sentiment:</span>
                <span className={`font-semibold ${sentimentColor(report.overallSentiment)}`}>
                  {report.overallSentiment}
                </span>
              </div>
              <span className="text-xs font-mono text-amber-400">
                {report.isDemoNews ? 'DEMO NEWS DIGEST' : 'LIVE MARKET NEWS'}
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{report.sentimentSummary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.items.map((item, idx) => (
              <div
                key={idx}
                className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {item.source} · {item.publishedAt}
                  </span>
                  <span className={`font-medium ${sentimentColor(item.sentiment)}`}>
                    {item.sentiment} ({item.impactScore}/10)
                  </span>
                </div>
                <h3 className="text-sm font-display font-semibold text-white leading-snug">
                  {item.headline}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
