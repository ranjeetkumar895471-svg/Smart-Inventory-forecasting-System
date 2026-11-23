import React, { useState } from 'react';
import { FileText, Trash2, ExternalLink, TrendingUp, FileDown, Loader2 } from 'lucide-react';
import type { ResearchReportRecord, SavedForecastRecord } from '../types';
import { deleteForecastRecord, deleteResearchReport } from '../services/firestoreService';
import { fetchForecastApi, fetchStockBundleApi } from '../services/api';
import { formatTimestamp } from '../utils/formatters';
import { downloadEquityPdfReport } from '../utils/pdfReportGenerator';

interface ReportsArchiveProps {
  reports: ResearchReportRecord[];
  forecasts: SavedForecastRecord[];
  onInspectSymbol: (sym: string) => void;
}

export function ReportsArchive({
  reports,
  forecasts,
  onInspectSymbol,
}: ReportsArchiveProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDirectDownloadPdf = async (
    id: string,
    symbol: string,
    horizonDays: 1 | 7 | 30
  ) => {
    setBusyId(id);
    setError(null);
    try {
      const [stockRes, fcRes] = await Promise.all([
        fetchStockBundleApi(symbol, 120),
        fetchForecastApi(symbol, horizonDays),
      ]);
      downloadEquityPdfReport({
        bundle: stockRes.bundle,
        technicals: stockRes.technicals,
        forecast: fcRes.forecast,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate PDF report.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteForecast = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await deleteForecastRecord(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete forecast record.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteReport = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await deleteResearchReport(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete report record.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* Saved Forecasts */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <h2 className="text-base font-display font-semibold text-white">
            Saved Probabilistic Forecasts ({forecasts.length})
          </h2>
        </div>

        {forecasts.length === 0 ? (
          <p className="text-sm text-slate-400">
            No saved forecast runs yet. Open Stock Explorer and click &quot;Save Forecast&quot; to log predictions in Cloud Firestore.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Symbol</th>
                  <th className="py-2.5 px-3 font-medium">Horizon</th>
                  <th className="py-2.5 px-3 text-right font-medium">Base Price</th>
                  <th className="py-2.5 px-3 text-right font-medium">Predicted</th>
                  <th className="py-2.5 px-3 text-right font-medium">95% CI Range</th>
                  <th className="py-2.5 px-3 font-medium">Risk · Accuracy</th>
                  <th className="py-2.5 pl-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                {forecasts.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-4 text-blue-400 font-semibold">
                      {f.symbol}
                      {f.isDemo && (
                        <span className="block font-sans text-[11px] font-normal text-amber-400">
                          DEMO DATA
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">{f.horizonDays}D</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{f.currentPrice}</td>
                    <td className="py-2.5 px-3 text-right text-white font-semibold">
                      {f.predictedPrice}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {f.lower95} – {f.upper95}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">
                      {f.riskLevel} · MAPE {f.mape}% ({f.directionalAccuracy}% dir)
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === f.id}
                          onClick={() => void handleDirectDownloadPdf(f.id, f.symbol, f.horizonDays)}
                          title="Download PDF Report"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-700 text-slate-200 hover:border-blue-500 font-sans disabled:opacity-50"
                        >
                          {busyId === f.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <FileDown className="w-3 h-3" />
                          )}
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspectSymbol(f.symbol)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-700 text-slate-200 hover:border-blue-500 font-sans"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </button>
                        <button
                          type="button"
                          disabled={busyId === f.id}
                          onClick={() => void handleDeleteForecast(f.id)}
                          title="Delete saved forecast"
                          className="p-1.5 rounded border border-slate-800 text-slate-400 hover:text-rose-400 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Exported PDF Report Records */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <h2 className="text-base font-display font-semibold text-white">
            Exported PDF Research Reports ({reports.length})
          </h2>
        </div>

        {reports.length === 0 ? (
          <p className="text-sm text-slate-400">
            No PDF reports exported yet. Click &quot;Export PDF&quot; inside Stock Explorer to generate and archive a downloadable PDF dossier.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((rpt) => (
              <div
                key={rpt.id}
                className="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-display font-semibold text-white">{rpt.title}</p>
                    <p className="text-xs text-slate-400">
                      {rpt.symbol} · {rpt.reportType} · {rpt.riskLevel} Risk ·{' '}
                      {formatTimestamp(rpt.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === rpt.id}
                    onClick={() => void handleDeleteReport(rpt.id)}
                    className="p-1.5 rounded border border-slate-800 text-slate-400 hover:text-rose-400 disabled:opacity-50"
                    title="Delete report record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{rpt.summary}</p>
                <div className="flex items-center gap-4 pt-1">
                  <button
                    type="button"
                    disabled={busyId === rpt.id}
                    onClick={() =>
                      void handleDirectDownloadPdf(rpt.id, rpt.symbol, rpt.horizonDays)
                    }
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline disabled:opacity-50"
                  >
                    {busyId === rpt.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    Download PDF ({rpt.horizonDays}D)
                  </button>
                  <button
                    type="button"
                    onClick={() => onInspectSymbol(rpt.symbol)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open {rpt.symbol}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
