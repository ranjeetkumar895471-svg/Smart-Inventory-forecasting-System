import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import type { TechnicalSeriesPoint, ForecastPoint, CurrencyCode } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

const BASE_GRID_COLOR = 'rgba(148, 163, 184, 0.08)';
const BASE_TICK_COLOR = '#94A3B8';

export function PriceAndForecastChart({
  series,
  forecastTrajectory,
  currency,
  showSMA20,
  showSMA50,
  showEMA12,
  showBollinger,
}: {
  series: TechnicalSeriesPoint[];
  forecastTrajectory: ForecastPoint[];
  currency: CurrencyCode;
  showSMA20: boolean;
  showSMA50: boolean;
  showEMA12: boolean;
  showBollinger: boolean;
}) {
  const recent = series;
  const histLabels = recent.map((p) => p.date);
  const fcLabels = forecastTrajectory.map((f) => f.date);
  const labels = [...histLabels, ...fcLabels];

  const padHist = (vals: Array<number | null>) => [
    ...vals,
    ...new Array(forecastTrajectory.length).fill(null),
  ];

  const lastClose = recent[recent.length - 1]?.close ?? null;
  const forecastLine = [
    ...new Array(Math.max(recent.length - 1, 0)).fill(null),
    lastClose,
    ...forecastTrajectory.map((f) => f.point),
  ];
  const upper95Line = [
    ...new Array(Math.max(recent.length - 1, 0)).fill(null),
    lastClose,
    ...forecastTrajectory.map((f) => f.upper95),
  ];
  const lower95Line = [
    ...new Array(Math.max(recent.length - 1, 0)).fill(null),
    lastClose,
    ...forecastTrajectory.map((f) => f.lower95),
  ];

  const datasets: Array<{
    label: string;
    data: Array<number | null>;
    borderColor: string;
    backgroundColor?: string;
    borderWidth: number;
    borderDash?: number[];
    pointRadius: number;
    fill?: boolean | string;
    tension: number;
  }> = [
    {
      label: 'Close Price',
      data: padHist(recent.map((p) => p.close)),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0.2,
    },
    {
      label: 'Forecast Point Estimate',
      data: forecastLine,
      borderColor: '#10B981',
      borderWidth: 2,
      borderDash: [5, 4],
      pointRadius: 2,
      fill: false,
      tension: 0.25,
    },
    {
      label: '95% Upper Bound',
      data: upper95Line,
      borderColor: 'rgba(16, 185, 129, 0.35)',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderWidth: 1,
      borderDash: [3, 3],
      pointRadius: 0,
      fill: '+1',
      tension: 0.25,
    },
    {
      label: '95% Lower Bound',
      data: lower95Line,
      borderColor: 'rgba(16, 185, 129, 0.35)',
      borderWidth: 1,
      borderDash: [3, 3],
      pointRadius: 0,
      fill: false,
      tension: 0.25,
    },
  ];

  if (showSMA20) {
    datasets.push({
      label: 'SMA (20)',
      data: padHist(recent.map((p) => p.sma20)),
      borderColor: '#F59E0B',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.2,
    });
  }
  if (showSMA50) {
    datasets.push({
      label: 'SMA (50)',
      data: padHist(recent.map((p) => p.sma50)),
      borderColor: '#8B5CF6',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.2,
    });
  }
  if (showEMA12) {
    datasets.push({
      label: 'EMA (12)',
      data: padHist(recent.map((p) => p.ema12)),
      borderColor: '#06B6D4',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.2,
    });
  }
  if (showBollinger) {
    datasets.push(
      {
        label: 'BB Upper',
        data: padHist(recent.map((p) => p.bbUpper)),
        borderColor: 'rgba(148, 163, 184, 0.45)',
        borderWidth: 1,
        borderDash: [2, 2],
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'BB Lower',
        data: padHist(recent.map((p) => p.bbLower)),
        borderColor: 'rgba(148, 163, 184, 0.45)',
        borderWidth: 1,
        borderDash: [2, 2],
        pointRadius: 0,
        tension: 0.2,
      }
    );
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: '#CBD5E1', boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        borderColor: '#1E293B',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            if (ctx.parsed.y === null || ctx.parsed.y === undefined || Number.isNaN(ctx.parsed.y)) {
              return '';
            }
            const sym = currency === 'INR' ? '₹' : '$';
            return `${ctx.dataset.label}: ${sym}${Number(ctx.parsed.y).toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: BASE_GRID_COLOR },
        ticks: { color: BASE_TICK_COLOR, maxTicksLimit: 9, font: { size: 10 } },
      },
      y: {
        grid: { color: BASE_GRID_COLOR },
        ticks: {
          color: BASE_TICK_COLOR,
          font: { size: 10 },
          callback: (val) => `${currency === 'INR' ? '₹' : '$'}${val}`,
        },
      },
    },
  };

  return (
    <div className="h-[340px] w-full">
      <Line data={{ labels, datasets }} options={options} />
    </div>
  );
}

export function RSIChart({ series }: { series: TechnicalSeriesPoint[] }) {
  const recent = series;
  const labels = recent.map((p) => p.date);
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#CBD5E1', boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        backgroundColor: '#0F172A',
        borderColor: '#1E293B',
        borderWidth: 1,
      },
    },
    scales: {
      x: { grid: { color: BASE_GRID_COLOR }, ticks: { color: BASE_TICK_COLOR, maxTicksLimit: 6, font: { size: 10 } } },
      y: {
        min: 0,
        max: 100,
        grid: { color: BASE_GRID_COLOR },
        ticks: { color: BASE_TICK_COLOR, stepSize: 20, font: { size: 10 } },
      },
    },
  };

  return (
    <div className="h-[190px] w-full">
      <Line
        data={{
          labels,
          datasets: [
            {
              label: 'RSI (14)',
              data: recent.map((p) => p.rsi14),
              borderColor: '#38BDF8',
              borderWidth: 1.75,
              pointRadius: 0,
              tension: 0.2,
            },
            {
              label: 'Overbought (70)',
              data: recent.map(() => 70),
              borderColor: 'rgba(239, 68, 68, 0.45)',
              borderWidth: 1,
              borderDash: [4, 4],
              pointRadius: 0,
            },
            {
              label: 'Oversold (30)',
              data: recent.map(() => 30),
              borderColor: 'rgba(16, 185, 129, 0.45)',
              borderWidth: 1,
              borderDash: [4, 4],
              pointRadius: 0,
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}

export function MACDChart({ series }: { series: TechnicalSeriesPoint[] }) {
  const recent = series;
  const labels = recent.map((p) => p.date);
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#CBD5E1', boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        backgroundColor: '#0F172A',
        borderColor: '#1E293B',
        borderWidth: 1,
      },
    },
    scales: {
      x: { grid: { color: BASE_GRID_COLOR }, ticks: { color: BASE_TICK_COLOR, maxTicksLimit: 6, font: { size: 10 } } },
      y: { grid: { color: BASE_GRID_COLOR }, ticks: { color: BASE_TICK_COLOR, font: { size: 10 } } },
    },
  };

  return (
    <div className="h-[190px] w-full">
      <Bar
        data={{
          labels,
          datasets: [
            {
              type: 'bar',
              label: 'Histogram',
              data: recent.map((p) => p.macdHist ?? 0),
              backgroundColor: recent.map((p) =>
                (p.macdHist ?? 0) >= 0 ? 'rgba(16, 185, 129, 0.55)' : 'rgba(239, 68, 68, 0.55)'
              ),
            },
            {
              type: 'line' as unknown as 'bar',
              label: 'MACD',
              data: recent.map((p) => p.macd ?? 0),
              borderColor: '#3B82F6',
              borderWidth: 1.5,
              pointRadius: 0,
            } as never,
            {
              type: 'line' as unknown as 'bar',
              label: 'Signal',
              data: recent.map((p) => p.macdSignal ?? 0),
              borderColor: '#F59E0B',
              borderWidth: 1.5,
              pointRadius: 0,
            } as never,
          ],
        }}
        options={options}
      />
    </div>
  );
}

export function SectorPerformanceChart({
  labels,
  avgChanges,
  avgVolatilities,
}: {
  labels: string[];
  avgChanges: number[];
  avgVolatilities: number[];
}) {
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#CBD5E1', font: { size: 11 } } },
    },
    scales: {
      x: { grid: { color: BASE_GRID_COLOR }, ticks: { color: BASE_TICK_COLOR, font: { size: 10 } } },
      y: { grid: { color: BASE_GRID_COLOR }, ticks: { color: BASE_TICK_COLOR, font: { size: 10 } } },
    },
  };

  return (
    <div className="h-[280px] w-full">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: 'Avg Daily Change (%)',
              data: avgChanges,
              backgroundColor: 'rgba(59, 130, 246, 0.75)',
              borderRadius: 4,
            },
            {
              label: 'Avg Annualized Volatility (%)',
              data: avgVolatilities,
              backgroundColor: 'rgba(245, 158, 11, 0.65)',
              borderRadius: 4,
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}

export function PortfolioAllocationDoughnut({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const palette = ['#2563EB', '#0EA5E9', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6'];
  return (
    <div className="h-[240px] w-full">
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: labels.map((_, idx) => palette[idx % palette.length]),
              borderColor: '#0E1525',
              borderWidth: 2,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#CBD5E1', boxWidth: 12, font: { size: 11 } },
            },
          },
        }}
      />
    </div>
  );
}
