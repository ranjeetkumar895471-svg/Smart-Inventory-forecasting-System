import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Calculator, ExternalLink, ArrowDownUp } from 'lucide-react';
import type { AuditLogRecord, PortfolioHolding, StockCatalogEntry } from '../types';
import {
  addPortfolioHolding,
  buyMorePortfolioHolding,
  deletePortfolioHolding,
  fetchUserAuditLogs,
  sellPortfolioHolding,
  updatePortfolioHolding,
} from '../services/firestoreService';
import { fetchBatchQuotesApi, fetchStockBundleApi, searchStocksApi } from '../services/api';
import { auth } from '../firebase';
import { formatMoney, formatPct, formatTimestamp } from '../utils/formatters';
import { PortfolioAllocationDoughnut } from './charts/StockCharts';

interface PortfolioManagerProps {
  holdings: PortfolioHolding[];
  onInspectSymbol: (sym: string) => void;
}

export function PortfolioManager({ holdings, onInspectSymbol }: PortfolioManagerProps) {
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [catalog, setCatalog] = useState<StockCatalogEntry[]>([]);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [newSymbol, setNewSymbol] = useState('RELIANCE.NS');
  const [newQty, setNewQty] = useState('15');
  const [newBuyPrice, setNewBuyPrice] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tradeHistory, setTradeHistory] = useState<AuditLogRecord[]>([]);

  // Buy More / Sell Modal State
  const [tradeModal, setTradeModal] = useState<{
    holding: PortfolioHolding;
    side: 'BUY' | 'SELL';
    qty: string;
    price: string;
  } | null>(null);

  // Profit & Loss Calculator State
  const [calcBuyPrice, setCalcBuyPrice] = useState('1000');
  const [calcSellPrice, setCalcSellPrice] = useState('1185');
  const [calcQty, setCalcQty] = useState('50');
  const [calcFeePct, setCalcFeePct] = useState('0.25');
  const [calcCurrency, setCalcCurrency] = useState<'INR' | 'USD'>('INR');

  const refreshTradeHistory = () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    fetchUserAuditLogs(uid)
      .then((logs) => {
        setTradeHistory(
          logs.filter((l) => l.action === 'PORTFOLIO_BUY' || l.action === 'PORTFOLIO_SELL')
        );
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshTradeHistory();
  }, [holdings.length]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      searchStocksApi(symbolSearch)
        .then((res) => {
          if (!active) return;
          setCatalog(res.results);
          if (res.results.length > 0 && !res.results.some((c) => c.symbol === newSymbol)) {
            setNewSymbol(res.results[0].symbol);
          }
        })
        .catch(() => {});
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [symbolSearch]);

  // Fetch live price when selected symbol in Add form changes
  useEffect(() => {
    let active = true;
    if (!newSymbol) return;
    fetchStockBundleApi(newSymbol, 60)
      .then((res) => {
        if (active) setNewBuyPrice(String(res.bundle.currentPrice));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [newSymbol]);

  useEffect(() => {
    let active = true;
    const uniqueSymbols = Array.from(new Set(holdings.map((h) => h.symbol)));
    if (uniqueSymbols.length === 0) {
      setLivePrices({});
      return;
    }

    fetchBatchQuotesApi(uniqueSymbols)
      .then((res) => {
        if (!active) return;
        const map: Record<string, number> = {};
        for (const q of res.quotes) map[q.symbol] = q.currentPrice;
        setLivePrices(map);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [holdings]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const cleanSym = newSymbol.trim().toUpperCase();
    if (!/^[A-Z0-9.\-]{1,24}$/.test(cleanSym)) {
      setError('Enter or select a valid stock symbol.');
      return;
    }
    const qty = Number(newQty);
    const price = Number(newBuyPrice);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      setError('Quantity and average buy price must be greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      let meta = catalog.find((c) => c.symbol === cleanSym);
      if (!meta) {
        const fetched = await fetchStockBundleApi(cleanSym, 60);
        meta = fetched.bundle.meta;
      }
      const existing = holdings.find((h) => h.symbol === meta.symbol);
      if (existing) {
        const res = await buyMorePortfolioHolding({
          id: existing.id,
          symbol: existing.symbol,
          currency: existing.currency,
          currentQty: existing.quantity,
          currentAvgPrice: existing.avgBuyPrice,
          addQty: qty,
          buyPrice: price,
          notes: newNotes || existing.notes,
        });
        setNotice(
          `Added +${qty} shares to ${existing.symbol}. Updated avg cost: ${formatMoney(
            res.nextAvg,
            existing.currency
          )}.`
        );
      } else {
        await addPortfolioHolding({
          symbol: meta.symbol,
          companyName: meta.companyName,
          exchange: meta.exchange,
          sector: meta.sector,
          currency: meta.currency,
          quantity: qty,
          avgBuyPrice: price,
          notes: newNotes,
        });
        setNotice(`Added ${qty} shares of ${meta.symbol} at ${formatMoney(price, meta.currency)}.`);
      }
      setNewNotes('');
      refreshTradeHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save holding.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeModal) return;
    setError(null);
    setNotice(null);
    const qty = Number(tradeModal.qty);
    const price = Number(tradeModal.price);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      setError('Trade quantity and price must be positive numbers.');
      return;
    }
    const { holding, side } = tradeModal;
    setActionBusyId(holding.id);
    try {
      if (side === 'BUY') {
        const res = await buyMorePortfolioHolding({
          id: holding.id,
          symbol: holding.symbol,
          currency: holding.currency,
          currentQty: holding.quantity,
          currentAvgPrice: holding.avgBuyPrice,
          addQty: qty,
          buyPrice: price,
          notes: holding.notes,
        });
        setNotice(
          `Bought +${qty} ${holding.symbol} @ ${formatMoney(
            price,
            holding.currency
          )}. New Qty: ${res.nextQty}, Weighted Avg: ${formatMoney(res.nextAvg, holding.currency)}.`
        );
      } else {
        const res = await sellPortfolioHolding({
          id: holding.id,
          symbol: holding.symbol,
          currency: holding.currency,
          currentQty: holding.quantity,
          currentAvgPrice: holding.avgBuyPrice,
          sellQty: qty,
          sellPrice: price,
          notes: holding.notes,
        });
        const sign = res.realizedPnl >= 0 ? '+' : '';
        setNotice(
          `Sold ${qty} ${holding.symbol} @ ${formatMoney(
            price,
            holding.currency
          )}. Realized P&L: ${sign}${formatMoney(res.realizedPnl, holding.currency)}.`
        );
      }
      setTradeModal(null);
      refreshTradeHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade execution failed.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleQuickIncrement = async (h: PortfolioHolding) => {
    setError(null);
    setActionBusyId(h.id);
    try {
      const mkt = livePrices[h.symbol] ?? h.avgBuyPrice;
      await buyMorePortfolioHolding({
        id: h.id,
        symbol: h.symbol,
        currency: h.currency,
        currentQty: h.quantity,
        currentAvgPrice: h.avgBuyPrice,
        addQty: 1,
        buyPrice: mkt,
        notes: h.notes,
      });
      setNotice(`Bought +1 ${h.symbol} at ${formatMoney(mkt, h.currency)}.`);
      refreshTradeHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to increment position.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteHolding = async (h: PortfolioHolding) => {
    setError(null);
    setActionBusyId(h.id);
    try {
      await deletePortfolioHolding(h.id, h.symbol);
      setNotice(`Removed ${h.symbol} from portfolio.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove holding.');
    } finally {
      setActionBusyId(null);
    }
  };

  // Portfolio summaries split by currency
  const inrHoldings = holdings.filter((h) => h.currency === 'INR');
  const usdHoldings = holdings.filter((h) => h.currency === 'USD');

  const sumGroup = (list: PortfolioHolding[]) => {
    let invested = 0;
    let current = 0;
    for (const h of list) {
      const mkt = livePrices[h.symbol] ?? h.avgBuyPrice;
      invested += h.quantity * h.avgBuyPrice;
      current += h.quantity * mkt;
    }
    const pnl = current - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
    return { invested, current, pnl, pnlPct };
  };

  const inrTotals = sumGroup(inrHoldings);
  const usdTotals = sumGroup(usdHoldings);

  // Allocation chart data
  const sectorWeights = new Map<string, number>();
  for (const h of holdings) {
    const val = h.quantity * (livePrices[h.symbol] ?? h.avgBuyPrice);
    const normalizedUsd = h.currency === 'INR' ? val / 84 : val;
    sectorWeights.set(h.sector, (sectorWeights.get(h.sector) ?? 0) + normalizedUsd);
  }

  // P&L Calculator computations
  const cBuy = Math.max(0, Number(calcBuyPrice) || 0);
  const cSell = Math.max(0, Number(calcSellPrice) || 0);
  const cQty = Math.max(0, Number(calcQty) || 0);
  const cFeeRate = Math.max(0, Number(calcFeePct) || 0) / 100;

  const grossBuy = cBuy * cQty;
  const grossSell = cSell * cQty;
  const totalFees = (grossBuy + grossSell) * cFeeRate;
  const netPnl = grossSell - grossBuy - totalFees;
  const netRoi = grossBuy > 0 ? (netPnl / grossBuy) * 100 : 0;
  const breakevenSell = cQty > 0 ? (grossBuy + totalFees) / cQty : 0;

  return (
    <div className="space-y-6">
      {/* Portfolio Valuation Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 space-y-2">
          <p className="text-xs text-slate-400">Indian Portfolio (INR · NSE)</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-mono font-bold text-white tabular-nums">
              {formatMoney(inrTotals.current, 'INR')}
            </p>
            <p
              className={`text-sm font-mono font-medium tabular-nums ${
                inrTotals.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {inrTotals.pnl >= 0 ? '+' : ''}
              {formatMoney(inrTotals.pnl, 'INR')} ({formatPct(inrTotals.pnlPct)})
            </p>
          </div>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            Invested: {formatMoney(inrTotals.invested, 'INR')} · {inrHoldings.length} positions
          </p>
        </div>

        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 space-y-2">
          <p className="text-xs text-slate-400">International Portfolio (USD · NASDAQ/NYSE)</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-mono font-bold text-white tabular-nums">
              {formatMoney(usdTotals.current, 'USD')}
            </p>
            <p
              className={`text-sm font-mono font-medium tabular-nums ${
                usdTotals.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {usdTotals.pnl >= 0 ? '+' : ''}
              {formatMoney(usdTotals.pnl, 'USD')} ({formatPct(usdTotals.pnlPct)})
            </p>
          </div>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            Invested: {formatMoney(usdTotals.invested, 'USD')} · {usdHoldings.length} positions
          </p>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-lg bg-blue-950/60 border border-blue-700/60 text-xs text-blue-200">
          {notice}
        </div>
      )}

      {/* Add Holding Form + Sector Allocation Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form
          onSubmit={handleAdd}
          className="lg:col-span-7 bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h3 className="text-base font-display font-semibold text-white">
            Buy / Add Portfolio Position
          </h3>
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-200">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Search Any NSE / International Equity (optional filter)
            </label>
            <input
              type="text"
              value={symbolSearch}
              onChange={(e) => setSymbolSearch(e.target.value)}
              placeholder="Type e.g. WIPRO, ZOMATO, META, AMD to filter or load..."
              className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-xs text-white placeholder-slate-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Equity Symbol</label>
              <select
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-xs text-white"
              >
                {catalog.map((c) => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.symbol} ({c.currency})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Quantity</label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Buy Price (Auto Live)</label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={newBuyPrice}
                onChange={(e) => setNewBuyPrice(e.target.value)}
                placeholder="Fetching..."
                className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-xs text-white font-mono"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Optional thesis or entry note..."
              className="flex-1 px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-xs text-white placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shrink-0 disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Executing...' : 'Buy / Add Holding'}
            </button>
          </div>
        </form>

        <div className="lg:col-span-5 bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-3">
          <h3 className="text-base font-display font-semibold text-white">
            Sector Exposure Allocation
          </h3>
          {holdings.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">
              Add positions to visualize normalized sector weights.
            </p>
          ) : (
            <PortfolioAllocationDoughnut
              labels={Array.from(sectorWeights.keys())}
              values={Array.from(sectorWeights.values()).map((v) => Number(v.toFixed(2)))}
            />
          )}
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-display font-semibold text-white">
          Tracked Holdings ({holdings.length})
        </h3>
        {holdings.length === 0 ? (
          <p className="text-sm text-slate-400 py-6">
            No portfolio holdings saved yet. Use the form above or add equities from Stock Explorer.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Symbol</th>
                  <th className="py-2.5 px-3 font-medium">Sector</th>
                  <th className="py-2.5 px-3 text-right font-medium">Qty</th>
                  <th className="py-2.5 px-3 text-right font-medium">Avg Cost</th>
                  <th className="py-2.5 px-3 text-right font-medium">Current</th>
                  <th className="py-2.5 px-3 text-right font-medium">Unrealized P&amp;L</th>
                  <th className="py-2.5 pl-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {holdings.map((h) => {
                  const mkt = livePrices[h.symbol] ?? h.avgBuyPrice;
                  const pnl = (mkt - h.avgBuyPrice) * h.quantity;
                  const pnlPct = ((mkt - h.avgBuyPrice) / h.avgBuyPrice) * 100;
                  const busy = actionBusyId === h.id;
                  return (
                    <tr key={h.id} className="hover:bg-slate-800/30">
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => onInspectSymbol(h.symbol)}
                          className="text-left group"
                        >
                          <span className="font-mono font-semibold text-blue-400 group-hover:underline">
                            {h.symbol}
                          </span>
                          <span className="block text-slate-400">{h.companyName}</span>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{h.sector}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-white">
                        {h.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                        {formatMoney(h.avgBuyPrice, h.currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-white">
                        {formatMoney(mkt, h.currency)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono tabular-nums font-medium ${
                          pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {pnl >= 0 ? '+' : ''}
                        {formatMoney(pnl, h.currency)} ({formatPct(pnlPct)})
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              setTradeModal({
                                holding: h,
                                side: 'BUY',
                                qty: '5',
                                price: String(mkt),
                              })
                            }
                            className="px-2 py-1 rounded border border-emerald-700/70 text-emerald-300 hover:bg-emerald-950/50 disabled:opacity-50"
                          >
                            Buy
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              setTradeModal({
                                holding: h,
                                side: 'SELL',
                                qty: String(h.quantity),
                                price: String(mkt),
                              })
                            }
                            className="px-2 py-1 rounded border border-amber-700/70 text-amber-300 hover:bg-amber-950/50 disabled:opacity-50"
                          >
                            Sell
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleQuickIncrement(h)}
                            title="Quick buy +1 share at current price"
                            className="px-2 py-1 rounded border border-slate-700 text-slate-300 hover:text-white disabled:opacity-50"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => onInspectSymbol(h.symbol)}
                            title="Forecast & Technicals"
                            className="p-1.5 rounded border border-slate-700 text-slate-300 hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDeleteHolding(h)}
                            title="Remove holding"
                            className="p-1.5 rounded border border-rose-800/70 text-rose-400 hover:bg-rose-950/50 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trade History Ledger (Buy & Sell Realized P&L) */}
      {tradeHistory.length > 0 && (
        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-blue-400" />
            <h3 className="text-base font-display font-semibold text-white">
              Recent Buy / Sell Order Ledger
            </h3>
          </div>
          <div className="divide-y divide-slate-800/60 text-xs">
            {tradeHistory.slice(0, 8).map((tx) => (
              <div key={tx.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-mono font-semibold ${
                      tx.action === 'PORTFOLIO_SELL' ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {tx.action === 'PORTFOLIO_SELL' ? 'SELL' : 'BUY'}
                  </span>
                  <span className="text-slate-200">{tx.details}</span>
                </div>
                <span className="font-mono text-slate-500">{formatTimestamp(tx.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buy More / Sell Shares Modal */}
      {tradeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleExecuteTrade}
            className="w-full max-w-md bg-[#0B1120] border border-slate-700 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-white">
                {tradeModal.side === 'BUY' ? 'Buy More' : 'Sell'} {tradeModal.holding.symbol}
              </h3>
              <div className="flex items-center gap-1 p-1 bg-[#070B14] border border-slate-800 rounded-lg text-xs">
                {(['BUY', 'SELL'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setTradeModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              side: s,
                              qty:
                                s === 'SELL'
                                  ? String(prev.holding.quantity)
                                  : prev.qty,
                            }
                          : null
                      )
                    }
                    className={`px-2.5 py-1 rounded font-medium ${
                      tradeModal.side === s
                        ? s === 'BUY'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Currently Held: {tradeModal.holding.quantity} shares @ Avg{' '}
              {formatMoney(tradeModal.holding.avgBuyPrice, tradeModal.holding.currency)}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  {tradeModal.side === 'BUY' ? 'Additional Shares' : 'Shares to Sell'}
                </label>
                <input
                  type="number"
                  min="0.0001"
                  max={tradeModal.side === 'SELL' ? tradeModal.holding.quantity : undefined}
                  step="any"
                  value={tradeModal.qty}
                  onChange={(e) =>
                    setTradeModal((prev) => (prev ? { ...prev, qty: e.target.value } : null))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Execution Price ({tradeModal.holding.currency})
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={tradeModal.price}
                  onChange={(e) =>
                    setTradeModal((prev) => (prev ? { ...prev, price: e.target.value } : null))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white font-mono"
                />
              </div>
            </div>

            {tradeModal.side === 'SELL' && (
              <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800 text-xs flex justify-between">
                <span className="text-slate-400">Estimated Realized P&amp;L:</span>
                {(() => {
                  const est =
                    ((Number(tradeModal.price) || 0) - tradeModal.holding.avgBuyPrice) *
                    (Number(tradeModal.qty) || 0);
                  return (
                    <span
                      className={`font-mono font-semibold ${
                        est >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {est >= 0 ? '+' : ''}
                      {formatMoney(est, tradeModal.holding.currency)}
                    </span>
                  );
                })()}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTradeModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionBusyId === tradeModal.holding.id}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white disabled:opacity-60"
              >
                {actionBusyId === tradeModal.holding.id
                  ? 'Processing...'
                  : `Confirm ${tradeModal.side}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profit & Loss Calculator */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-400" />
            <h3 className="text-base font-display font-semibold text-white">
              Trade Profit &amp; Loss Calculator
            </h3>
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#070B14] border border-slate-800 rounded-lg">
            {(['INR', 'USD'] as const).map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => setCalcCurrency(cur)}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  calcCurrency === cur ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Entry / Buy Price ({calcCurrency})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={calcBuyPrice}
              onChange={(e) => setCalcBuyPrice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Target / Exit Price ({calcCurrency})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={calcSellPrice}
              onChange={(e) => setCalcSellPrice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Quantity (Shares)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={calcQty}
              onChange={(e) => setCalcQty(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Brokerage &amp; Taxes (% each side)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={calcFeePct}
              onChange={(e) => setCalcFeePct(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#070B14] border border-slate-800">
          <div>
            <p className="text-xs text-slate-400">Capital Deployed</p>
            <p className="text-base font-mono font-semibold text-white tabular-nums">
              {formatMoney(grossBuy, calcCurrency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Estimated Fees &amp; STT</p>
            <p className="text-base font-mono font-semibold text-amber-400 tabular-nums">
              {formatMoney(totalFees, calcCurrency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Breakeven Exit Price</p>
            <p className="text-base font-mono font-semibold text-slate-200 tabular-nums">
              {formatMoney(breakevenSell, calcCurrency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Net Profit / Loss &amp; ROI</p>
            <p
              className={`text-base font-mono font-bold tabular-nums ${
                netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {netPnl >= 0 ? '+' : ''}
              {formatMoney(netPnl, calcCurrency)} ({formatPct(netRoi)})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
