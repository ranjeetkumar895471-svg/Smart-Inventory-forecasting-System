import React, { useState } from 'react';
import { Send, Loader2, Bot } from 'lucide-react';
import { askResearchAssistantApi } from '../services/api';
import type {
  MarketStockBundle,
  TechnicalSnapshot,
  ForecastResult,
  PortfolioHolding,
} from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ResearchAssistantProps {
  activeBundle: MarketStockBundle | null;
  activeTechnicals: TechnicalSnapshot | null;
  activeForecast: ForecastResult | null;
  holdings: PortfolioHolding[];
}

const SUGGESTED_PROMPTS = [
  'Explain what the current RSI and MACD readings imply for risk management.',
  'How wide is the 30-day 95% confidence interval and why?',
  'Review sector concentration risks across my current portfolio.',
  'Compare Indian NSE tech large caps vs. US semiconductor volatility.',
];

export function ResearchAssistant({
  activeBundle,
  activeTechnicals,
  activeForecast,
  holdings,
}: ResearchAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'I am your Smart Investor Research Assistant. Ask about technical indicators, confidence intervals, sector diversification, or risk management for your active equity and portfolio. Note: All analysis is informational and never guarantees returns.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendQuestion = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const nextHistory = [...messages, { role: 'user' as const, content: q }];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    const portfolioSummary =
      holdings.length > 0
        ? holdings
            .map((h) => `${h.symbol} (${h.quantity} sh @ ${h.avgBuyPrice} ${h.currency})`)
            .join('; ')
        : 'No holdings recorded yet';

    try {
      const res = await askResearchAssistantApi(q, {
        symbol: activeBundle?.meta.symbol,
        price: activeBundle?.currentPrice,
        currency: activeBundle?.meta.currency,
        rsi14: activeTechnicals?.rsi14,
        riskLevel: activeForecast?.risk.level,
        portfolioSummary,
        history: nextHistory,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Research assistant error: ${
            err instanceof Error ? err.message : 'Unable to reach Gemini backend.'
          }`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0B1120] border border-slate-800 rounded-xl flex flex-col h-[calc(100vh-180px)] min-h-[540px]">
      <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Bot className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-base font-display font-bold text-white">
              AI Investment Research Assistant
            </h2>
            <p className="text-xs text-slate-400">
              Grounded in {activeBundle?.meta.symbol || 'selected equity'} technicals and{' '}
              {holdings.length} portfolio holdings
            </p>
          </div>
        </div>
      </div>

      {/* Suggested prompts */}
      <div className="px-5 py-3 border-b border-slate-800/70 flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => void sendQuestion(p)}
            className="px-3 py-1.5 rounded-lg bg-[#070B14] border border-slate-800 hover:border-blue-500 text-xs text-slate-300 transition-colors text-left"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#070B14] border border-slate-800 text-slate-200'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            Generating research response...
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendQuestion(input);
        }}
        className="p-4 border-t border-slate-800 flex items-center gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about RSI signals, valuation risks, portfolio diversification, or macro drivers..."
          className="flex-1 px-4 py-2.5 rounded-lg bg-[#070B14] border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>
    </div>
  );
}
