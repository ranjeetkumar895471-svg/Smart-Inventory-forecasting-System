import React, { useEffect, useState } from 'react';
import { Trash2, ExternalLink, Plus } from 'lucide-react';
import type { WatchlistItem, StockCatalogEntry } from '../types';
import {
  addToWatchlist,
  removeFromWatchlist,
  updateWatchlistTarget,
} from '../services/firestoreService';
import { fetchBatchQuotesApi, fetchStockBundleApi, searchStocksApi } from '../services/api';
import { formatMoney, formatPct } from '../utils/formatters';

interface WatchlistViewProps {
  items: WatchlistItem[];
  onInspectSymbol: (sym: string) => void;
}

export function WatchlistView({ items, onInspectSymbol }: WatchlistViewProps) {
  const [catalog, setCatalog] = useState<StockCatalogEntry[]>([]);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [selectedAdd, setSelectedAdd] = useState('NVDA');
  const [targetInput, setTargetInput] = useState('');
  const [prices, setPrices] = useState<Record<string, { price: number; changePct: number }>>({});
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      searchStocksApi(symbolSearch)
        .then((res) => {
          if (!active) return;
          setCatalog(res.results);
          if (res.results.length > 0 && !res.results.some((c) => c.symbol === selectedAdd)) {
            setSelectedAdd(res.results[0].symbol);
          }
        })
        .catch(() => {});
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [symbolSearch]);

  // Fetch live quote when selected symbol changes to suggest realistic +8% target
  useEffect(() => {
    let active = true;
    if (!selectedAdd) return;
    fetchStockBundleApi(selectedAdd, 60)
      .then((res) => {
        if (active) setTargetInput(String((res.bundle.currentPrice * 1.08).toFixed(2)));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedAdd]);

  useEffect(() => {
    let active = true;
    if (items.length === 0) {
      setPrices({});
      return;
    }
    fetchBatchQuotesApi(items.map((w) => w.symbol))
      .then((res) => {
        if (!active) return;
        const map: Record<string, { price: number; changePct: number }> = {};
        for (const q of res.quotes) {
          map[q.symbol] = { price: q.currentPrice, changePct: q.changePercent };
        }
        setPrices(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [items]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const cleanSym = selectedAdd.trim().toUpperCase();
    if (!/^[A-Z0-9.\-]{1,24}$/.test(cleanSym)) {
      setError('Select or search a valid equity symbol.');
      return;
    }
    if (items.some((w) => w.symbol === cleanSym)) {
      setError(`${cleanSym} is already in your watchlist.`);
      return;
    }
    const parsedTarget = Number(targetInput);
    if (targetInput.trim() && (!Number.isFinite(parsedTarget) || parsedTarget < 0)) {
      setError('Target price must be zero or positive.');
      return;
    }

    setAdding(true);
    try {
      let meta = catalog.find((c) => c.symbol === cleanSym);
      if (!meta) {
        const fetched = await fetchStockBundleApi(cleanSym, 60);
        meta = fetched.bundle.meta;
      }
      await addToWatchlist({
        symbol: meta.symbol,
        companyName: meta.companyName,
        exchange: meta.exchange,
        sector: meta.sector,
        currency: meta.currency,
        targetPrice: parsedTarget > 0 ? parsedTarget : undefined,
      });
      setNotice(`Added ${meta.symbol} to watchlist.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add equity to watchlist.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (item: WatchlistItem) => {
    setError(null);
    setBusyId(item.id);
    try {
      await removeFromWatchlist(item.id, item.symbol);
      setNotice(`Removed ${item.symbol} from watchlist.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove watchlist item.');
    } finally {
      setBusyId(null);
    }
  };

  const handleTargetUpdate = async (item: WatchlistItem, rawVal: string) => {
    const val = Number(rawVal);
    if (!Number.isFinite(val) || val < 0 || val === (item.targetPrice ?? 0)) return;
    setError(null);
    try {
      await updateWatchlistTarget(item.id, val);
      setNotice(`Updated ${item.symbol} alert target to ${formatMoney(val, item.currency)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update target price.');
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 space-y-3"
      >
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-200">
            {error}
          </div>
        )}
        {notice && (
          <div className="p-3 rounded-lg bg-blue-950/60 border border-blue-700/60 text-xs text-blue-200">
            {notice}
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="w-full sm:w-56">
            <label className="block text-xs text-slate-400 mb-1">Filter / Search Symbol</label>
            <input
              type="text"
              value={symbolSearch}
              onChange={(e) => setSymbolSearch(e.target.value)}
              placeholder="e.g. WIPRO, AAPL, META..."
              className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-xs text-white placeholder-slate-500"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs text-slate-400 mb-1">Add Equity to Watchlist</label>
            <select
              value={selectedAdd}
              onChange={(e) => setSelectedAdd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-xs text-white"
            >
              {catalog.map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {c.symbol} — {c.companyName} ({c.currency})
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-44">
            <label className="block text-xs text-slate-400 mb-1">Target Price Alert</label>
            <input
              type="number"
              min="0"
              step="any"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="Auto +8%"
              className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-xs text-white font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {adding ? 'Adding...' : 'Track Symbol'}
          </button>
        </div>
      </form>

      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-display font-semibold text-white">
          Investment Watchlist ({items.length})
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 py-6">
            Your watchlist is empty. Select a stock above or click &quot;Watchlist&quot; inside Stock Explorer.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const live = prices[item.symbol];
              const target = item.targetPrice ?? 0;
              const gapPct =
                live && target > 0 ? ((target - live.price) / live.price) * 100 : null;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-semibold text-blue-400">
                        {item.symbol}
                      </p>
                      <p className="text-xs text-slate-300">{item.companyName}</p>
                      <p className="text-xs text-slate-500">
                        {item.exchange} · {item.sector}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void handleRemove(item)}
                      className="p-1.5 rounded border border-slate-800 text-slate-400 hover:text-rose-400 disabled:opacity-50"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-mono font-bold text-white tabular-nums">
                      {live ? formatMoney(live.price, item.currency) : 'Loading...'}
                    </span>
                    {live && (
                      <span
                        className={`text-xs font-mono tabular-nums ${
                          live.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatPct(live.changePct)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Target:</span>
                      <input
                        type="number"
                        defaultValue={target}
                        onBlur={(e) => void handleTargetUpdate(item, e.target.value)}
                        className="w-24 px-2 py-1 rounded bg-[#0B1120] border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    {gapPct !== null && (
                      <span className="font-mono text-slate-300 tabular-nums">
                        {formatPct(gapPct)} to target
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onInspectSymbol(item.symbol)}
                    className="w-full py-1.5 rounded-lg border border-slate-700 hover:border-blue-500 text-xs text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Run Forecast &amp; Technicals
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
