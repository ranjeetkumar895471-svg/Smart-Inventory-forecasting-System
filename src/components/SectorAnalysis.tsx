import React, { useEffect, useState } from 'react';
import { Loader2, ArrowUpRight } from 'lucide-react';
import { fetchSectorOverviewApi } from '../services/api';
import type { SectorSummary } from '../types';
import { SectorPerformanceChart } from './charts/StockCharts';
import { formatMoney, formatPct } from '../utils/formatters';

interface SectorAnalysisProps {
  onSelectSymbol: (sym: string) => void;
}

export function SectorAnalysis({ onSelectSymbol }: SectorAnalysisProps) {
  const [sectors, setSectors] = useState<SectorSummary[]>([]);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSectors = () => {
    setLoading(true);
    setError(null);
    fetchSectorOverviewApi()
      .then((res) => {
        setSectors(res.sectors);
        setIsDemo(res.isDemo);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load sector overview.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSectors();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-10 flex items-center justify-center gap-2 text-sm text-slate-300">
        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        Aggregating sector performance and volatility profiles...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-950/40 border border-rose-800 rounded-xl p-6 flex items-center justify-between gap-4 text-xs text-rose-200">
        <span>{error}</span>
        <button
          type="button"
          onClick={loadSectors}
          className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-medium shrink-0"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-bold text-white">
              Sector-Wise Dispersion &amp; Momentum Analysis
            </h2>
            <p className="text-xs text-slate-400">
              Cross-market comparison across Indian NSE and international equities ·{' '}
              {isDemo ? 'DEMO DATA BENCHMARKS' : 'LIVE API'}
            </p>
          </div>
        </div>
        <SectorPerformanceChart
          labels={sectors.map((s) => s.sector)}
          avgChanges={sectors.map((s) => s.avgChangePercent)}
          avgVolatilities={sectors.map((s) => s.avgVolatility)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sectors.map((sec) => (
          <div
            key={sec.sector}
            className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 space-y-4"
          >
            <div className="flex items-baseline justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-display font-semibold text-white">{sec.sector}</h3>
                <p className="text-xs text-slate-400">
                  {sec.stockCount} tracked equities · Avg Volatility {sec.avgVolatility}%
                </p>
              </div>
              <span
                className={`text-sm font-mono font-semibold tabular-nums ${
                  sec.avgChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatPct(sec.avgChangePercent)}
              </span>
            </div>

            <div className="divide-y divide-slate-800/60">
              {sec.stocks.map((st) => (
                <button
                  key={st.symbol}
                  type="button"
                  onClick={() => onSelectSymbol(st.symbol)}
                  className="w-full py-2.5 flex items-center justify-between text-xs hover:bg-slate-800/30 px-2 rounded transition-colors text-left"
                >
                  <div>
                    <span className="font-mono font-medium text-blue-400">{st.symbol}</span>
                    <span className="text-slate-300 ml-2">{st.companyName}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    <span className="text-white">{formatMoney(st.price, st.currency)}</span>
                    <span
                      className={st.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                    >
                      {formatPct(st.changePercent)}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
