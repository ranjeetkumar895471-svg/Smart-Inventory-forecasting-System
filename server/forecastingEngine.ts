import type { OHLCVBar } from './marketData.ts';

export interface TechnicalSeriesPoint {
  date: string;
  close: number;
  sma20: number | null;
  sma50: number | null;
  ema12: number | null;
  ema26: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
}

export interface TechnicalSnapshot {
  latestClose: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  rsi14: number;
  rsiSignal: 'Oversold' | 'Neutral' | 'Overbought';
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  macdTrend: 'Bullish Crossover' | 'Bearish Momentum' | 'Neutral';
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  annualizedVolatilityPct: number;
  maxDrawdownPct: number;
  periodReturn30dPct: number;
  series: TechnicalSeriesPoint[];
}

export interface ForecastPoint {
  step: number;
  date: string;
  point: number;
  lower80: number;
  upper80: number;
  lower95: number;
  upper95: number;
}

export interface RiskAssessment {
  level: 'Low' | 'Medium' | 'High';
  score: number;
  annualizedVolatilityPct: number;
  maxDrawdownPct: number;
  rsiRegime: string;
  rationale: string;
  warning: string;
}

export interface BacktestMetrics {
  validationWindowDays: number;
  mae: number;
  rmse: number;
  mapePct: number;
  directionalAccuracyPct: number;
}

export interface ForecastResult {
  symbol: string;
  horizonDays: 1 | 7 | 30;
  engineSource: 'typescript-quant' | 'python-microservice';
  modelName: string;
  currentPrice: number;
  predictedPrice: number;
  expectedChangePct: number;
  lower80: number;
  upper80: number;
  lower95: number;
  upper95: number;
  trajectory: ForecastPoint[];
  backtest: BacktestMetrics;
  risk: RiskAssessment;
  disclaimer: string;
}

function computeSMA(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = Number((sum / period).toFixed(2));
  }
  return out;
}

function computeEMA(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = Number(ema.toFixed(2));
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    out[i] = Number(ema.toFixed(2));
  }
  return out;
}

function computeRSI(values: number[], period = 14): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (values.length <= period) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  out[period] = avgLoss === 0 ? 100 : Number((100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : Number((100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
  }
  return out;
}

export function computeTechnicalIndicators(history: OHLCVBar[]): TechnicalSnapshot {
  const closes = history.map((b) => b.close);
  const n = closes.length;

  const sma20Arr = computeSMA(closes, 20);
  const sma50Arr = computeSMA(closes, 50);
  const sma200Arr = computeSMA(closes, Math.min(200, n));
  const ema12Arr = computeEMA(closes, 12);
  const ema26Arr = computeEMA(closes, 26);
  const rsi14Arr = computeRSI(closes, 14);

  const macdLine: Array<number | null> = closes.map((_, i) =>
    ema12Arr[i] !== null && ema26Arr[i] !== null
      ? Number((ema12Arr[i]! - ema26Arr[i]!).toFixed(2))
      : null
  );

  const validMacdIndices: number[] = [];
  const validMacdVals: number[] = [];
  macdLine.forEach((v, idx) => {
    if (v !== null) {
      validMacdIndices.push(idx);
      validMacdVals.push(v);
    }
  });
  const macdSignalCompact = computeEMA(validMacdVals, 9);
  const macdSignalArr: Array<number | null> = new Array(n).fill(null);
  validMacdIndices.forEach((origIdx, k) => {
    macdSignalArr[origIdx] = macdSignalCompact[k];
  });

  const bbUpperArr: Array<number | null> = new Array(n).fill(null);
  const bbLowerArr: Array<number | null> = new Array(n).fill(null);
  for (let i = 19; i < n; i++) {
    const slice = closes.slice(i - 19, i + 1);
    const mean = sma20Arr[i]!;
    const variance = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / slice.length;
    const std = Math.sqrt(variance);
    bbUpperArr[i] = Number((mean + 2 * std).toFixed(2));
    bbLowerArr[i] = Number(Math.max(0.01, mean - 2 * std).toFixed(2));
  }

  // Log returns for annualized volatility and max drawdown
  const logReturns: number[] = [];
  for (let i = 1; i < n; i++) {
    logReturns.push(Math.log(closes[i] / Math.max(closes[i - 1], 0.01)));
  }
  const meanRet = logReturns.reduce((a, b) => a + b, 0) / Math.max(logReturns.length, 1);
  const varianceRet =
    logReturns.reduce((acc, r) => acc + (r - meanRet) ** 2, 0) /
    Math.max(logReturns.length - 1, 1);
  const annualizedVolatilityPct = Number((Math.sqrt(varianceRet) * Math.sqrt(252) * 100).toFixed(2));

  let peak = closes[0];
  let maxDd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (peak - c) / peak;
    if (dd > maxDd) maxDd = dd;
  }

  const lookback30 = closes[Math.max(0, n - 31)];
  const latestClose = closes[n - 1];
  const periodReturn30dPct = Number((((latestClose - lookback30) / lookback30) * 100).toFixed(2));

  const series: TechnicalSeriesPoint[] = history.map((bar, i) => {
    const macd = macdLine[i];
    const sig = macdSignalArr[i];
    return {
      date: bar.date,
      close: bar.close,
      sma20: sma20Arr[i],
      sma50: sma50Arr[i],
      ema12: ema12Arr[i],
      ema26: ema26Arr[i],
      bbUpper: bbUpperArr[i],
      bbLower: bbLowerArr[i],
      rsi14: rsi14Arr[i],
      macd,
      macdSignal: sig,
      macdHist: macd !== null && sig !== null ? Number((macd - sig).toFixed(2)) : null,
    };
  });

  const last = series[series.length - 1];
  const rsi14 = last.rsi14 ?? 50;
  const rsiSignal: TechnicalSnapshot['rsiSignal'] =
    rsi14 >= 70 ? 'Overbought' : rsi14 <= 30 ? 'Oversold' : 'Neutral';

  const macdVal = last.macd ?? 0;
  const macdSig = last.macdSignal ?? 0;
  const macdHist = last.macdHist ?? 0;
  const macdTrend: TechnicalSnapshot['macdTrend'] =
    macdHist > 0 ? 'Bullish Crossover' : macdHist < 0 ? 'Bearish Momentum' : 'Neutral';

  return {
    latestClose,
    sma20: last.sma20 ?? latestClose,
    sma50: last.sma50 ?? latestClose,
    sma200: sma200Arr[n - 1] ?? latestClose,
    ema12: last.ema12 ?? latestClose,
    ema26: last.ema26 ?? latestClose,
    rsi14,
    rsiSignal,
    macd: macdVal,
    macdSignal: macdSig,
    macdHistogram: macdHist,
    macdTrend,
    bbUpper: last.bbUpper ?? latestClose * 1.04,
    bbMiddle: last.sma20 ?? latestClose,
    bbLower: last.bbLower ?? latestClose * 0.96,
    annualizedVolatilityPct,
    maxDrawdownPct: Number((maxDd * 100).toFixed(2)),
    periodReturn30dPct,
    series,
  };
}

// Damped Holt Linear Exponential Smoothing + Mean-Reverting Drift
function holtDampedForecast(closes: number[], horizon: number): number[] {
  const alpha = 0.36;
  const beta = 0.14;
  const phi = 0.88; // damping factor prevents runaway extrapolation

  let level = closes[0];
  let trend = closes.length > 1 ? closes[1] - closes[0] : 0;

  for (let i = 1; i < closes.length; i++) {
    const prevLevel = level;
    level = alpha * closes[i] + (1 - alpha) * (level + phi * trend);
    trend = beta * (level - prevLevel) + (1 - beta) * phi * trend;
  }

  const out: number[] = [];
  let phiSum = 0;
  for (let h = 1; h <= horizon; h++) {
    phiSum += Math.pow(phi, h);
    out.push(Math.max(0.01, level + phiSum * trend));
  }
  return out;
}

function addTradingDays(baseDateStr: string, tradingDaysOffset: number): string {
  const d = new Date(`${baseDateStr}T00:00:00Z`);
  let added = 0;
  while (added < tradingDaysOffset) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}

export async function runForecastingEngine(
  symbol: string,
  history: OHLCVBar[],
  horizonDays: 1 | 7 | 30,
  technicals: TechnicalSnapshot
): Promise<ForecastResult> {
  // Optional Python forecasting microservice hook
  const pythonUrl = process.env.PYTHON_FORECASTER_URL;
  if (pythonUrl) {
    try {
      const resp = await fetch(`${pythonUrl.replace(/\/$/, '')}/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          horizon_days: horizonDays,
          closes: history.map((b) => b.close),
          dates: history.map((b) => b.date),
        }),
      });
      if (resp.ok) {
        const pyResult = (await resp.json()) as ForecastResult;
        return { ...pyResult, engineSource: 'python-microservice' };
      }
    } catch {
      // Fallback transparently to TypeScript quantitative engine
    }
  }

  const closes = history.map((b) => b.close);
  const currentPrice = closes[closes.length - 1];
  const lastDate = history[history.length - 1].date;

  // Horizon-matched walk-forward historical backtest
  const evalStep =
    horizonDays === 1
      ? 1
      : horizonDays === 7 && closes.length >= 45
      ? 7
      : horizonDays === 30 && closes.length >= 80
      ? 15
      : 1;
  const maxOrigins = Math.min(25, Math.max(8, Math.floor((closes.length - evalStep) * 0.2)));
  const startIdx = Math.max(15, closes.length - maxOrigins - evalStep);
  let evalCount = 0;
  let absErrSum = 0;
  let sqErrSum = 0;
  let apeSum = 0;
  let dirHits = 0;

  for (let origin = startIdx; origin + evalStep < closes.length; origin++) {
    const trainSlice = closes.slice(0, origin + 1);
    const predTrajectory = holtDampedForecast(trainSlice, evalStep);
    const pred = predTrajectory[evalStep - 1];
    const basePrice = closes[origin];
    const actual = closes[origin + evalStep];
    const err = actual - pred;
    absErrSum += Math.abs(err);
    sqErrSum += err * err;
    apeSum += Math.abs(err) / Math.max(actual, 0.01);
    if ((pred - basePrice) * (actual - basePrice) >= 0) {
      dirHits++;
    }
    evalCount++;
  }

  const safeEvalCount = Math.max(evalCount, 1);
  const mae = Number((absErrSum / safeEvalCount).toFixed(2));
  const rmse = Number(Math.sqrt(sqErrSum / safeEvalCount).toFixed(2));
  const mapePct = Number(((apeSum / safeEvalCount) * 100).toFixed(2));
  const directionalAccuracyPct = Number(((dirHits / safeEvalCount) * 100).toFixed(1));
  const valWindow = safeEvalCount;

  // Generate horizon trajectory with volatility-scaled confidence intervals
  const rawForecasts = holtDampedForecast(closes, horizonDays);
  const dailySigma = technicals.annualizedVolatilityPct / 100 / Math.sqrt(252);

  const trajectory: ForecastPoint[] = rawForecasts.map((pt, idx) => {
    const step = idx + 1;
    const sigmaH = pt * dailySigma * Math.sqrt(step);
    const lower80 = Number(Math.max(0.01, pt - 1.2816 * sigmaH).toFixed(2));
    const upper80 = Number((pt + 1.2816 * sigmaH).toFixed(2));
    const lower95 = Number(Math.max(0.01, pt - 1.96 * sigmaH).toFixed(2));
    const upper95 = Number((pt + 1.96 * sigmaH).toFixed(2));
    return {
      step,
      date: addTradingDays(lastDate, step),
      point: Number(pt.toFixed(2)),
      lower80,
      upper80,
      lower95,
      upper95,
    };
  });

  const terminal = trajectory[trajectory.length - 1];
  const expectedChangePct = Number(
    (((terminal.point - currentPrice) / Math.max(currentPrice, 0.01)) * 100).toFixed(2)
  );

  // Quantitative risk classification (Low, Medium, High)
  let riskScore = 0;
  if (technicals.annualizedVolatilityPct > 32) riskScore += 45;
  else if (technicals.annualizedVolatilityPct > 22) riskScore += 25;
  else riskScore += 10;

  if (technicals.maxDrawdownPct > 22) riskScore += 35;
  else if (technicals.maxDrawdownPct > 12) riskScore += 20;
  else riskScore += 8;

  if (technicals.rsi14 >= 72 || technicals.rsi14 <= 28) riskScore += 20;
  else riskScore += 5;

  const riskLevel: RiskAssessment['level'] =
    riskScore >= 65 ? 'High' : riskScore >= 38 ? 'Medium' : 'Low';

  const risk: RiskAssessment = {
    level: riskLevel,
    score: Math.min(100, riskScore),
    annualizedVolatilityPct: technicals.annualizedVolatilityPct,
    maxDrawdownPct: technicals.maxDrawdownPct,
    rsiRegime: `${technicals.rsi14} (${technicals.rsiSignal})`,
    rationale:
      riskLevel === 'High'
        ? `Elevated annualized volatility (${technicals.annualizedVolatilityPct}%) and historical drawdown (${technicals.maxDrawdownPct}%) widen the 95% confidence band.`
        : riskLevel === 'Medium'
        ? `Moderate historical volatility (${technicals.annualizedVolatilityPct}%) with balanced momentum suggests disciplined position sizing.`
        : `Contained annualized volatility (${technicals.annualizedVolatilityPct}%) and lower historical drawdown (${technicals.maxDrawdownPct}%) indicate steadier price dispersion.`,
    warning:
      'Probabilistic time-series projections reflect historical volatility and trend structure only. Markets are subject to macro shocks and no returns are guaranteed.',
  };

  return {
    symbol,
    horizonDays,
    engineSource: 'typescript-quant',
    modelName: 'Damped Holt-Winters + Volatility Interval Ensemble',
    currentPrice,
    predictedPrice: terminal.point,
    expectedChangePct,
    lower80: terminal.lower80,
    upper80: terminal.upper80,
    lower95: terminal.lower95,
    upper95: terminal.upper95,
    trajectory,
    backtest: {
      validationWindowDays: valWindow,
      mae,
      rmse,
      mapePct,
      directionalAccuracyPct,
    },
    risk,
    disclaimer:
      'Informational research output only — not personalized financial advice or a guarantee of future performance.',
  };
}
