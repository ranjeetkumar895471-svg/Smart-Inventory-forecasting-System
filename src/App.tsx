import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, sendEmailVerification, signOut, type User } from 'firebase/auth';
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  Bookmark,
  PieChart,
  Newspaper,
  Bot,
  FileText,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  MailCheck,
  AlertCircle,
} from 'lucide-react';
import { auth } from './firebase';
import {
  ensureUserProfile,
  subscribePortfolio,
  subscribeWatchlist,
  subscribeForecasts,
  subscribeReports,
  updateUserCurrency,
  logUserActivity,
} from './services/firestoreService';
import { fetchBatchQuotesApi, fetchSystemHealth, searchStocksApi } from './services/api';
import type {
  UserProfile,
  PortfolioHolding,
  WatchlistItem,
  SavedForecastRecord,
  ResearchReportRecord,
  MarketStockBundle,
  TechnicalSnapshot,
  ForecastResult,
  StockCatalogEntry,
} from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './components/LandingPage';
import { AuthView } from './components/AuthView';
import { StockExplorer } from './components/StockExplorer';
import { PortfolioManager } from './components/PortfolioManager';
import { WatchlistView } from './components/WatchlistView';
import { SectorAnalysis } from './components/SectorAnalysis';
import { NewsSentiment } from './components/NewsSentiment';
import { ResearchAssistant } from './components/ResearchAssistant';
import { ReportsArchive } from './components/ReportsArchive';
import { AdminDashboard } from './components/AdminDashboard';
import { formatMoney, formatPct } from './utils/formatters';

type WorkspaceTab =
  | 'overview'
  | 'explorer'
  | 'portfolio'
  | 'watchlist'
  | 'sectors'
  | 'news'
  | 'assistant'
  | 'reports'
  | 'admin';

function MainApp() {
  const [viewMode, setViewMode] = useState<'landing' | 'auth' | 'workspace'>('landing');
  const [authPortal, setAuthPortal] = useState<'investor' | 'admin'>('investor');
  const authPortalRef = useRef<'investor' | 'admin'>('investor');
  authPortalRef.current = authPortal;

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [authReady, setAuthReady] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [authSyncError, setAuthSyncError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE.NS');

  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [savedForecasts, setSavedForecasts] = useState<SavedForecastRecord[]>([]);
  const [reports, setReports] = useState<ResearchReportRecord[]>([]);
  const [catalogPreview, setCatalogPreview] = useState<StockCatalogEntry[]>([]);
  const [liveOverviewQuotes, setLiveOverviewQuotes] = useState<
    Record<string, { price: number; changePct: number; isDemo: boolean }>
  >({});
  const [marketMode, setMarketMode] = useState<'DEMO_DATA' | 'LIVE_CONFIGURED'>('LIVE_CONFIGURED');
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);

  const [activeBundle, setActiveBundle] = useState<MarketStockBundle | null>(null);
  const [activeTechnicals, setActiveTechnicals] = useState<TechnicalSnapshot | null>(null);
  const [activeForecast, setActiveForecast] = useState<ForecastResult | null>(null);

  useEffect(() => {
    fetchSystemHealth()
      .then((h) => setMarketMode(h.marketDataMode))
      .catch(() => {});
    searchStocksApi('')
      .then((res) => {
        const preview = res.results.slice(0, 8);
        setCatalogPreview(preview);
        return fetchBatchQuotesApi(preview.map((s) => s.symbol));
      })
      .then((qRes) => {
        if (!qRes) return;
        const map: Record<string, { price: number; changePct: number; isDemo: boolean }> = {};
        for (const q of qRes.quotes) {
          map[q.symbol] = {
            price: q.currentPrice,
            changePct: q.changePercent,
            isDemo: q.isDemo,
          };
        }
        setLiveOverviewQuotes(map);
        if (qRes.quotes.length > 0) {
          setMarketMode(qRes.quotes.every((q) => q.isDemo) ? 'DEMO_DATA' : 'LIVE_CONFIGURED');
        }
      })
      .catch(() => {});
  }, []);

  const syncVerifiedSession = async (firebaseUser: User) => {
    setAuthSyncError(null);
    const userProf = await ensureUserProfile(
      firebaseUser.uid,
      firebaseUser.email || '',
      firebaseUser.displayName || 'Investor'
    );
    setUnverifiedUser(null);
    setProfile(userProf);
    setViewMode('workspace');
    if (authPortalRef.current === 'admin' && userProf.role === 'admin') {
      setActiveTab('admin');
    }
    void logUserActivity('USER_SESSION_START', `users/${firebaseUser.uid}`, 'Signed into platform');
  };

  const attachSubscriptions = (uid: string) => {
    unsubsRef.current.forEach((fn) => fn());
    unsubsRef.current = [
      subscribePortfolio(uid, setHoldings, (e) => setSyncWarning(e.message)),
      subscribeWatchlist(uid, setWatchlist, (e) => setSyncWarning(e.message)),
      subscribeForecasts(uid, setSavedForecasts, (e) => setSyncWarning(e.message)),
      subscribeReports(uid, setReports, (e) => setSyncWarning(e.message)),
    ];
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubsRef.current.forEach((fn) => fn());
      unsubsRef.current = [];
      setSyncWarning(null);

      if (!firebaseUser) {
        setProfile(null);
        setUnverifiedUser(null);
        setAuthSyncError(null);
        setHoldings([]);
        setWatchlist([]);
        setSavedForecasts([]);
        setReports([]);
        setAuthReady(true);
        return;
      }

      if (!firebaseUser.emailVerified) {
        setProfile(null);
        setUnverifiedUser(firebaseUser);
        setAuthReady(true);
        return;
      }

      try {
        await syncVerifiedSession(firebaseUser);
        attachSubscriptions(firebaseUser.uid);
      } catch (err) {
        console.error('Profile sync failed:', err);
        setAuthSyncError(
          err instanceof Error ? err.message : 'Unable to sync your Cloud Firestore profile.'
        );
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      unsubAuth();
      unsubsRef.current.forEach((fn) => fn());
      unsubsRef.current = [];
    };
  }, []);

  const handleOpenAuth = (portal: 'investor' | 'admin') => {
    setAuthPortal(portal);
    setViewMode('auth');
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setViewMode('landing');
    setActiveTab('overview');
  };

  const handleRefreshVerification = async () => {
    if (!unverifiedUser) return;
    setVerifyNotice(null);
    try {
      await unverifiedUser.reload();
      if (auth.currentUser?.emailVerified) {
        await auth.currentUser.getIdToken(true);
        await syncVerifiedSession(auth.currentUser);
        attachSubscriptions(auth.currentUser.uid);
      } else {
        setVerifyNotice(
          'Email is still unverified. Click the verification link in your inbox, then retry.'
        );
      }
    } catch (err) {
      setVerifyNotice(
        err instanceof Error ? err.message : 'Could not verify account status right now.'
      );
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser) return;
    setVerifyNotice(null);
    try {
      await sendEmailVerification(unverifiedUser);
      setVerifyNotice(`Verification email sent to ${unverifiedUser.email}.`);
    } catch (err) {
      setVerifyNotice(
        err instanceof Error ? err.message : 'Unable to send verification email right now.'
      );
    }
  };

  const openSymbolInExplorer = (sym: string) => {
    setSelectedSymbol(sym);
    setActiveTab('explorer');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#070B14] text-slate-300 flex items-center justify-center text-sm">
        Initializing Smart Investor Workspace...
      </div>
    );
  }

  if (viewMode === 'landing') {
    return (
      <LandingPage
        isAuthenticated={Boolean(profile)}
        onOpenAuth={handleOpenAuth}
        onEnterWorkspace={() => setViewMode('workspace')}
      />
    );
  }

  if (unverifiedUser) {
    return (
      <div className="min-h-screen bg-[#070B14] text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#0B1120] border border-slate-800 rounded-xl p-7 space-y-5">
          <div className="flex items-center gap-2.5 text-blue-400">
            <MailCheck className="w-5 h-5" />
            <h1 className="text-lg font-display font-bold text-white">Verify Your Email Address</h1>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Cloud Firestore security rules require a verified email before accessing portfolio or
            forecasting data. Check <span className="font-mono text-white">{unverifiedUser.email}</span>{' '}
            for your verification link.
          </p>
          {verifyNotice && (
            <div className="p-3 rounded-lg bg-blue-950/60 border border-blue-700/60 text-xs text-blue-200">
              {verifyNotice}
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => void handleRefreshVerification()}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              I&apos;ve Verified — Enter Workspace
            </button>
            <button
              type="button"
              onClick={() => void handleResendVerification()}
              className="w-full py-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 text-xs transition-colors"
            >
              Resend Verification Email
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="w-full py-2 px-4 rounded-lg text-slate-400 hover:text-white text-xs"
            >
              Sign Out &amp; Use Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authSyncError && !profile) {
    return (
      <div className="min-h-screen bg-[#070B14] text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#0B1120] border border-rose-800/70 rounded-xl p-7 space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <h1 className="text-base font-display font-bold text-white">Profile Sync Issue</h1>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{authSyncError}</p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full py-2.5 px-4 rounded-lg border border-slate-700 text-xs text-slate-200 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'auth' && !profile) {
    return <AuthView initialPortal={authPortal} onBack={() => setViewMode('landing')} />;
  }

  if (!profile) {
    return <AuthView initialPortal={authPortal} onBack={() => setViewMode('landing')} />;
  }

  if (profile.status === 'suspended') {
    return (
      <div className="min-h-screen bg-[#070B14] text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#0B1120] border border-amber-800/70 rounded-xl p-7 space-y-4">
          <h1 className="text-lg font-display font-bold text-white">Account Suspended</h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            This account ({profile.email}) is currently suspended by an administrator. Contact your platform administrator for restoration.
          </p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full py-2.5 px-4 rounded-lg border border-slate-700 text-xs text-slate-200 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const navItems: Array<{
    id: WorkspaceTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
  }> = [
    { id: 'overview', label: 'Investor Overview', icon: LayoutDashboard },
    { id: 'explorer', label: 'Forecasting & Charts', icon: TrendingUp },
    { id: 'portfolio', label: 'Portfolio & P&L', icon: Briefcase },
    { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
    { id: 'sectors', label: 'Sector Analysis', icon: PieChart },
    { id: 'news', label: 'News & Sentiment', icon: Newspaper },
    { id: 'assistant', label: 'AI Research Assistant', icon: Bot },
    { id: 'reports', label: 'Reports & Forecasts', icon: FileText },
    { id: 'admin', label: 'Admin Console', icon: ShieldCheck, adminOnly: true },
  ];

  const visibleNav = navItems.filter((item) => !item.adminOnly || profile.role === 'admin');

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-800/80 bg-[#0B1120]">
        <div className="px-5 py-5 border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => setViewMode('landing')}
            className="text-left"
          >
            <span className="text-base font-display font-bold text-white block">
              Smart Investor
            </span>
            <span className="text-xs text-slate-400">Forecasting System</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="text-xs">
            <p className="font-medium text-white truncate">{profile.displayName}</p>
            <p className="text-slate-400 truncate">{profile.email}</p>
            <p className="text-blue-400 font-mono mt-0.5">Role: {profile.role}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-2 px-3 rounded-lg border border-slate-700 hover:border-slate-500 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-full bg-[#0B1120] border-r border-slate-800 flex flex-col z-10">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-display font-bold text-white text-sm">Smart Investor</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium ${
                      activeTab === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2 px-3 rounded-lg border border-slate-700 text-xs text-slate-300 flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#070B14]/90 backdrop-blur-md px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-800 text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-display font-semibold text-white">
                {navItems.find((n) => n.id === activeTab)?.label}
              </h1>
              <p className="text-xs text-slate-400">
                Active Ticker: <span className="font-mono text-blue-400">{selectedSymbol}</span> ·{' '}
                {marketMode === 'DEMO_DATA' ? 'DEMO DATA MODE' : 'LIVE MARKET API'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1 p-1 bg-[#0B1120] border border-slate-800 rounded-lg text-xs">
              {(['INR', 'USD'] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => {
                    setProfile((p) => (p ? { ...p, preferredCurrency: cur } : p));
                    void updateUserCurrency(profile.uid, cur);
                  }}
                  className={`px-2.5 py-1 rounded font-mono ${
                    profile.preferredCurrency === cur
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('explorer')}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              Forecast Equity
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-7 max-w-7xl w-full mx-auto">
          {syncWarning && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-200 flex items-center justify-between gap-3">
              <span>Cloud Firestore sync notice: {syncWarning}</span>
              <button
                type="button"
                onClick={() => setSyncWarning(null)}
                className="text-rose-300 hover:text-white shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Investor KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-800 rounded-xl bg-[#0B1120] divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
                <div className="p-5 space-y-1">
                  <p className="text-xs text-slate-400">Portfolio Holdings</p>
                  <p className="text-2xl font-mono font-bold text-white tabular-nums">
                    {holdings.length} Positions
                  </p>
                  <p className="text-xs text-slate-400">Synced with Cloud Firestore</p>
                </div>
                <div className="p-5 space-y-1">
                  <p className="text-xs text-slate-400">Watchlist Alerts</p>
                  <p className="text-2xl font-mono font-bold text-white tabular-nums">
                    {watchlist.length} Tracked
                  </p>
                  <p className="text-xs text-slate-400">NSE &amp; Global coverage</p>
                </div>
                <div className="p-5 space-y-1">
                  <p className="text-xs text-slate-400">Saved Forecast Runs</p>
                  <p className="text-2xl font-mono font-bold text-white tabular-nums">
                    {savedForecasts.length} Models
                  </p>
                  <p className="text-xs text-slate-400">1D, 7D &amp; 30D horizons</p>
                </div>
                <div className="p-5 space-y-1">
                  <p className="text-xs text-slate-400">PDF Research Archive</p>
                  <p className="text-2xl font-mono font-bold text-white tabular-nums">
                    {reports.length} Reports
                  </p>
                  <p className="text-xs text-slate-400">Downloadable client dossiers</p>
                </div>
              </div>

              {/* Quick Launch Indian & Global Equities */}
              <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-display font-semibold text-white">
                      Quick Equity Forecasting Terminal
                    </h2>
                    <p className="text-xs text-slate-400">
                      Select an Indian NSE or international stock to inspect technicals, confidence bands, and Gemini AI research.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sectors')}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    View All Sectors
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {catalogPreview.map((st) => {
                    const liveQ = liveOverviewQuotes[st.symbol];
                    const displayPrice = liveQ?.price ?? st.basePrice;
                    const displayChangePct = liveQ?.changePct;
                    return (
                      <button
                        key={st.symbol}
                        type="button"
                        onClick={() => openSymbolInExplorer(st.symbol)}
                        className="p-4 rounded-xl bg-[#070B14] border border-slate-800 hover:border-blue-500 text-left space-y-2 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-blue-400">
                            {st.symbol}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <p className="text-xs font-medium text-white truncate">{st.companyName}</p>
                        <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                          <span className="text-slate-200">
                            {formatMoney(displayPrice, st.currency)}
                          </span>
                          {displayChangePct !== undefined ? (
                            <span
                              className={
                                displayChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }
                            >
                              {formatPct(displayChangePct)}
                            </span>
                          ) : (
                            <span className="text-slate-500">{st.exchange}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Portfolio & Watchlist Quick Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-display font-semibold text-white">
                      Recent Portfolio Holdings
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('portfolio')}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Manage Portfolio
                    </button>
                  </div>
                  {holdings.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4">
                      No holdings added yet. Open Portfolio &amp; P&amp;L to log positions.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-800/70 text-xs">
                      {holdings.slice(0, 5).map((h) => (
                        <div key={h.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-medium text-white">{h.symbol}</span>
                            <span className="text-slate-400 ml-2">{h.quantity} shares</span>
                          </div>
                          <span className="font-mono text-slate-300 tabular-nums">
                            Avg {formatMoney(h.avgBuyPrice, h.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-display font-semibold text-white">
                      Active Watchlist
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('watchlist')}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Open Watchlist
                    </button>
                  </div>
                  {watchlist.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4">
                      No watchlist equities saved yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-800/70 text-xs">
                      {watchlist.slice(0, 5).map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => openSymbolInExplorer(w.symbol)}
                          className="w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-800/30 px-1 rounded"
                        >
                          <div>
                            <span className="font-mono font-medium text-blue-400">{w.symbol}</span>
                            <span className="text-slate-400 ml-2">{w.companyName}</span>
                          </div>
                          <span className="font-mono text-slate-300 tabular-nums">
                            Target {formatMoney(w.targetPrice ?? 0, w.currency)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'explorer' && (
            <StockExplorer
              selectedSymbol={selectedSymbol}
              onSelectSymbol={setSelectedSymbol}
              onStockLoaded={(b, t, f) => {
                setActiveBundle(b);
                setActiveTechnicals(t);
                setActiveForecast(f);
              }}
            />
          )}

          {activeTab === 'portfolio' && (
            <PortfolioManager
              holdings={holdings}
              onInspectSymbol={openSymbolInExplorer}
            />
          )}

          {activeTab === 'watchlist' && (
            <WatchlistView
              items={watchlist}
              onInspectSymbol={openSymbolInExplorer}
            />
          )}

          {activeTab === 'sectors' && (
            <SectorAnalysis onSelectSymbol={openSymbolInExplorer} />
          )}

          {activeTab === 'news' && (
            <NewsSentiment
              selectedSymbol={selectedSymbol}
              onSelectSymbol={setSelectedSymbol}
            />
          )}

          {activeTab === 'assistant' && (
            <ResearchAssistant
              activeBundle={activeBundle}
              activeTechnicals={activeTechnicals}
              activeForecast={activeForecast}
              holdings={holdings}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsArchive
              reports={reports}
              forecasts={savedForecasts}
              onInspectSymbol={openSymbolInExplorer}
            />
          )}

          {activeTab === 'admin' && <AdminDashboard currentUser={profile} />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
