import { jsPDF } from 'jspdf';
import type {
  MarketStockBundle,
  TechnicalSnapshot,
  ForecastResult,
  StockAIAnalysis,
} from '../types';
import { formatMoney, formatPct } from './formatters';

export function downloadEquityPdfReport(params: {
  bundle: MarketStockBundle;
  technicals: TechnicalSnapshot;
  forecast: ForecastResult;
  aiAnalysis?: StockAIAnalysis | null;
}) {
  const { bundle, technicals, forecast, aiAnalysis } = params;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  let y = 48;

  const checkPageBreak = (needed = 48) => {
    if (y + needed > 780) {
      doc.addPage();
      y = 48;
    }
  };

  // Header band
  doc.setFillColor(11, 17, 32);
  doc.rect(0, 0, pageWidth, 88, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SMART INVESTOR FORECASTING SYSTEM', margin, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Quantitative Equity & Risk Research Report  |  Generated ${new Date().toLocaleString()}`,
    margin,
    56
  );
  doc.text(
    `Data Mode: ${bundle.isDemo ? 'DEMO DATA (Historical Benchmark Simulation)' : bundle.dataSource}`,
    margin,
    72
  );

  y = 116;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`${bundle.meta.companyName} (${bundle.meta.symbol})`, margin, y);

  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${bundle.meta.exchange}  ·  ${bundle.meta.sector}  ·  Currency: ${bundle.meta.currency}  ·  ${bundle.meta.marketCapTier}`,
    margin,
    y
  );

  // Market & Forecast KPI Summary box
  y += 22;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 82, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Latest Price', margin + 14, y + 20);
  doc.text(`${forecast.horizonDays}-Day Point Forecast`, margin + 150, y + 20);
  doc.text('95% Confidence Band', margin + 305, y + 20);
  doc.text('Risk Profile', margin + 440, y + 20);

  doc.setFontSize(12);
  doc.text(formatMoney(bundle.currentPrice, bundle.meta.currency), margin + 14, y + 40);
  doc.text(
    `${formatMoney(forecast.predictedPrice, bundle.meta.currency)} (${formatPct(forecast.expectedChangePct)})`,
    margin + 150,
    y + 40
  );
  doc.text(
    `${formatMoney(forecast.lower95, bundle.meta.currency)} – ${formatMoney(forecast.upper95, bundle.meta.currency)}`,
    margin + 305,
    y + 40
  );
  doc.text(`${forecast.risk.level} (${forecast.risk.score}/100)`, margin + 440, y + 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Daily Change: ${formatPct(bundle.changePercent)}   |   Backtest MAPE: ${forecast.backtest.mapePct}%   |   Directional Accuracy: ${forecast.backtest.directionalAccuracyPct}%`,
    margin + 14,
    y + 64
  );

  // Technical Indicators Section
  y += 108;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Technical Indicators & Volatility Diagnostics', margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const techLines = [
    `Moving Averages: SMA(20) ${formatMoney(technicals.sma20, bundle.meta.currency)}  |  SMA(50) ${formatMoney(technicals.sma50, bundle.meta.currency)}  |  SMA(200) ${formatMoney(technicals.sma200, bundle.meta.currency)}`,
    `Exponential MA: EMA(12) ${formatMoney(technicals.ema12, bundle.meta.currency)}  |  EMA(26) ${formatMoney(technicals.ema26, bundle.meta.currency)}`,
    `Momentum & Oscillators: RSI(14) = ${technicals.rsi14} (${technicals.rsiSignal})  |  MACD = ${technicals.macd} (Signal ${technicals.macdSignal}, ${technicals.macdTrend})`,
    `Bollinger Bands (20, 2): Lower ${formatMoney(technicals.bbLower, bundle.meta.currency)}  |  Middle ${formatMoney(technicals.bbMiddle, bundle.meta.currency)}  |  Upper ${formatMoney(technicals.bbUpper, bundle.meta.currency)}`,
    `Risk Metrics: Annualized Volatility ${technicals.annualizedVolatilityPct}%  |  Max Historical Drawdown ${technicals.maxDrawdownPct}%  |  30-Day Return ${formatPct(technicals.periodReturn30dPct)}`,
  ];
  for (const line of techLines) {
    const wrapped = doc.splitTextToSize(line, contentWidth);
    for (const wLine of wrapped) {
      checkPageBreak(18);
      doc.text(wLine, margin, y);
      y += 14;
    }
    y += 2;
  }

  // Forecasting & Historical Validation Section
  y += 14;
  checkPageBreak(90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('2. Quantitative Forecast & Historical Backtest Validation', margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Model Architecture: ${forecast.modelName} (${forecast.engineSource})`, margin, y);
  y += 16;
  const backtestWrapped = doc.splitTextToSize(
    `Out-of-Sample Walk-Forward (${forecast.backtest.validationWindowDays} bars): MAE ${forecast.backtest.mae}  |  RMSE ${forecast.backtest.rmse}  |  MAPE ${forecast.backtest.mapePct}%  |  Directional Accuracy ${forecast.backtest.directionalAccuracyPct}%`,
    contentWidth
  );
  doc.text(backtestWrapped, margin, y);
  y += backtestWrapped.length * 14 + 4;
  const riskLines = doc.splitTextToSize(`Risk Assessment (${forecast.risk.level}): ${forecast.risk.rationale}`, contentWidth);
  doc.text(riskLines, margin, y);
  y += riskLines.length * 14 + 8;

  // Gemini AI Synthesis if available
  if (aiAnalysis) {
    checkPageBreak(120);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('3. AI Equity Research Synthesis (Gemini)', margin, y);
    y += 18;

    const sections: Array<[string, string]> = [
      ['Executive Summary', aiAnalysis.executiveSummary],
      ['Technical Interpretation', aiAnalysis.technicalInterpretation],
      ['Bull Case Drivers', aiAnalysis.bullCase],
      ['Bear Case & Downside Risks', aiAnalysis.bearCase],
      ['Horizon Outlook', aiAnalysis.horizonOutlook],
    ];

    for (const [label, body] of sections) {
      checkPageBreak(48);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(label, margin, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      const wrapped = doc.splitTextToSize(body, contentWidth);
      for (const line of wrapped) {
        checkPageBreak(16);
        doc.text(line, margin, y);
        y += 13;
      }
      y += 6;
    }

    if (aiAnalysis.keyRisks && aiAnalysis.keyRisks.length > 0) {
      checkPageBreak(48);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Key Risk Factors', margin, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      for (const rk of aiAnalysis.keyRisks) {
        const wrapped = doc.splitTextToSize(`• ${rk}`, contentWidth);
        for (const line of wrapped) {
          checkPageBreak(16);
          doc.text(line, margin, y);
          y += 13;
        }
      }
      y += 6;
    }
  }

  // Mandatory Risk Disclaimer
  checkPageBreak(70);
  y += 10;
  doc.setDrawColor(217, 119, 6);
  doc.setFillColor(255, 251, 235);
  doc.roundedRect(margin, y, contentWidth, 56, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14);
  doc.text('IMPORTANT RISK DISCLOSURE & NON-GUARANTEE NOTICE', margin + 12, y + 16);
  doc.setFont('helvetica', 'normal');
  const warnText = doc.splitTextToSize(
    `${forecast.risk.warning} This document is generated for informational research only and does not constitute personalized investment advice.`,
    contentWidth - 24
  );
  doc.text(warnText, margin + 12, y + 30);

  doc.save(`${bundle.meta.symbol}_Research_Forecast_${forecast.horizonDays}D.pdf`);
}
