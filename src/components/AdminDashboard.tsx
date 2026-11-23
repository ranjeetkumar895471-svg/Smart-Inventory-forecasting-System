import React, { useEffect, useState } from 'react';
import {
  Users,
  Activity,
  Database,
  RefreshCw,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  fetchAllUsersAdmin,
  updateUserRoleStatusAdmin,
  fetchAuditLogsAdmin,
  fetchCatalogAndSnapshots,
  syncCatalogToFirestoreAdmin,
} from '../services/firestoreService';
import {
  searchStocksApi,
  fetchStockBundleApi,
  fetchAdminSystemStatusApi,
} from '../services/api';
import type { UserProfile, AuditLogRecord } from '../types';
import { formatTimestamp } from '../utils/formatters';

interface AdminDashboardProps {
  currentUser: UserProfile;
}

export function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'activity' | 'database'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [dbStats, setDbStats] = useState<{
    stocksCount: number;
    snapshotsCount: number;
    stocks: Array<Record<string, unknown>>;
    snapshots: Array<Record<string, unknown>>;
  }>({ stocksCount: 0, snapshotsCount: 0, stocks: [], snapshots: [] });
  const [sysStatus, setSysStatus] = useState<{
    catalogSize: number;
    marketDataMode: string;
    pythonForecasterConfigured: boolean;
    geminiConfigured: boolean;
    serverTime: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [uList, aLogs, dbRes, statusRes] = await Promise.all([
        fetchAllUsersAdmin(),
        fetchAuditLogsAdmin(),
        fetchCatalogAndSnapshots(),
        fetchAdminSystemStatusApi(),
      ]);
      setUsers(uList);
      setLogs(aLogs);
      setDbStats({
        stocksCount: dbRes.stocks.length,
        snapshotsCount: dbRes.historicalPrices.length,
        stocks: dbRes.stocks,
        snapshots: dbRes.historicalPrices,
      });
      setSysStatus(statusRes);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load admin metrics. Ensure you are signed in with an authorized admin account.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser.role === 'admin') {
      void loadAdminData();
    } else {
      setLoading(false);
    }
  }, [currentUser.role]);

  if (currentUser.role !== 'admin') {
    return (
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-8 max-w-xl space-y-3">
        <div className="flex items-center gap-2 text-amber-400">
          <ShieldCheck className="w-5 h-5" />
          <h2 className="text-lg font-display font-bold text-white">
            Administrator Access Restricted
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Your account ({currentUser.email}) has the <span className="font-mono">investor</span> role.
          User management, audit logs, and database catalog synchronization are restricted to verified administrators under Cloud Firestore RBAC rules.
        </p>
      </div>
    );
  }

  const handleRoleToggle = async (u: UserProfile) => {
    if (u.uid === currentUser.uid) {
      setNotice('You cannot demote your own active admin session.');
      return;
    }
    setError(null);
    const nextRole = u.role === 'admin' ? 'investor' : 'admin';
    try {
      await updateUserRoleStatusAdmin(u.uid, u.email, nextRole, u.status);
      setUsers((prev) => prev.map((x) => (x.uid === u.uid ? { ...x, role: nextRole } : x)));
      setNotice(`Updated ${u.email} role to ${nextRole}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role.');
    }
  };

  const handleStatusToggle = async (u: UserProfile) => {
    if (u.uid === currentUser.uid) {
      setNotice('You cannot suspend your own active admin session.');
      return;
    }
    setError(null);
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      await updateUserRoleStatusAdmin(u.uid, u.email, u.role, nextStatus);
      setUsers((prev) => prev.map((x) => (x.uid === u.uid ? { ...x, status: nextStatus } : x)));
      setNotice(`Updated ${u.email} status to ${nextStatus}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status.');
    }
  };

  const handleSyncCatalogToFirestore = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      const catRes = await searchStocksApi('');
      const snapshots = await Promise.all(
        catRes.results.map(async (item) => {
          const b = await fetchStockBundleApi(item.symbol, 90);
          const lastBar = b.bundle.history[b.bundle.history.length - 1];
          return {
            symbol: item.symbol,
            exchange: item.exchange,
            dataSource: b.bundle.dataSource,
            pointsCount: b.bundle.history.length,
            lastDate: lastBar.date,
            latestClose: lastBar.close,
          };
        })
      );
      await syncCatalogToFirestoreAdmin(catRes.results, snapshots);
      setNotice(
        `Synced ${catRes.results.length} stocks and ${snapshots.length} historical price snapshots to Cloud Firestore.`
      );
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Database sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  // Aggregate activity counts by action type
  const actionCounts = logs.reduce<Record<string, number>>((acc, item) => {
    acc[item.action] = (acc[item.action] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Admin KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-800 rounded-xl bg-[#0B1120] divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-400">Registered Users</p>
          <p className="text-2xl font-mono font-bold text-white tabular-nums">{users.length}</p>
          <p className="text-xs text-slate-400">
            {users.filter((u) => u.status === 'active').length} active accounts
          </p>
        </div>
        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-400">Audit Events Logged</p>
          <p className="text-2xl font-mono font-bold text-white tabular-nums">{logs.length}</p>
          <p className="text-xs text-slate-400">Immutable Firestore trail</p>
        </div>
        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-400">Firestore Stock Records</p>
          <p className="text-2xl font-mono font-bold text-white tabular-nums">
            {dbStats.stocksCount}
          </p>
          <p className="text-xs text-slate-400">
            {dbStats.snapshotsCount} historical snapshots
          </p>
        </div>
        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-400">Backend Providers</p>
          <p className="text-lg font-display font-bold text-white">
            {sysStatus?.marketDataMode || 'DEMO_DATA'}
          </p>
          <p className="text-xs text-slate-400">
            Gemini {sysStatus?.geminiConfigured ? 'Ready' : 'Unset'} · Python{' '}
            {sysStatus?.pythonForecasterConfigured ? 'External' : 'Built-in'}
          </p>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#0B1120] border border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            User Management
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'activity'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Analytics &amp; Activity Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'database'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Database Management
          </button>
        </div>

        <button
          type="button"
          onClick={() => void loadAdminData()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Admin Data
        </button>
      </div>

      {notice && (
        <div className="p-3 rounded-lg bg-blue-950/60 border border-blue-700/60 text-xs text-blue-200">
          {notice}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-10 flex items-center justify-center gap-2 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          Loading admin telemetry from Cloud Firestore...
        </div>
      ) : (
        <>
          {activeTab === 'users' && (
            <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-display font-semibold text-white">
                User Directory &amp; Role Controls
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 pr-4 font-medium">Name / UID</th>
                      <th className="py-2.5 px-3 font-medium">Email</th>
                      <th className="py-2.5 px-3 font-medium">Role</th>
                      <th className="py-2.5 px-3 font-medium">Status</th>
                      <th className="py-2.5 px-3 font-medium">Currency</th>
                      <th className="py-2.5 pl-3 text-right font-medium">Governance Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-800/30">
                        <td className="py-3 pr-4">
                          <span className="font-medium text-white">{u.displayName}</span>
                          <span className="block font-mono text-[11px] text-slate-500">
                            {u.uid.slice(0, 14)}...
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{u.email}</td>
                        <td className="py-3 px-3 font-mono text-blue-400">{u.role}</td>
                        <td
                          className={`py-3 px-3 font-mono ${
                            u.status === 'active' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {u.status}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {u.preferredCurrency}
                        </td>
                        <td className="py-3 pl-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => void handleRoleToggle(u)}
                            className="px-2.5 py-1 rounded border border-slate-700 text-slate-200 hover:border-blue-500"
                          >
                            Toggle Role
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStatusToggle(u)}
                            className="px-2.5 py-1 rounded border border-slate-700 text-slate-200 hover:border-amber-500"
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(actionCounts).map(([action, count]) => (
                  <div
                    key={action}
                    className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-1"
                  >
                    <p className="text-xs font-mono text-slate-400 truncate">{action}</p>
                    <p className="text-xl font-mono font-bold text-white tabular-nums">{count}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-display font-semibold text-white">
                  Recent Audit &amp; Activity Stream
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 pr-4 font-medium">Action</th>
                        <th className="py-2 px-3 font-medium">User</th>
                        <th className="py-2 px-3 font-medium">Resource</th>
                        <th className="py-2 px-3 font-medium">Details</th>
                        <th className="py-2 pl-3 text-right font-medium">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {logs.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 pr-4 font-mono text-blue-400">{l.action}</td>
                          <td className="py-2.5 px-3 text-slate-300">{l.userEmail}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{l.resource}</td>
                          <td className="py-2.5 px-3 text-slate-200">{l.details}</td>
                          <td className="py-2.5 pl-3 text-right font-mono text-slate-400">
                            {formatTimestamp(l.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-display font-semibold text-white">
                    Firestore Collections &amp; Market Snapshot Sync
                  </h3>
                  <p className="text-xs text-slate-400">
                    Synchronize the master stock catalog (`stocks`) and latest historical price metadata (`historicalPrices`) to Cloud Firestore.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleSyncCatalogToFirestore}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shrink-0"
                >
                  <Database className="w-4 h-4" />
                  {syncing ? 'Syncing Firestore...' : 'Sync Market Catalog & Snapshots'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-2">
                  <p className="text-xs font-semibold text-slate-200">
                    Synced `stocks` Collection ({dbStats.stocksCount})
                  </p>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/70 text-xs">
                    {dbStats.stocks.length === 0 ? (
                      <p className="text-slate-400 py-4">
                        No stock catalog records in Firestore yet. Click &quot;Sync Market Catalog&quot; above.
                      </p>
                    ) : (
                      dbStats.stocks.map((s, idx) => (
                        <div key={idx} className="py-2 flex justify-between">
                          <span className="font-mono text-blue-400">
                            {String(s.symbol)} · {String(s.exchange)}
                          </span>
                          <span className="text-slate-300">{String(s.companyName)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-2">
                  <p className="text-xs font-semibold text-slate-200">
                    Synced `historicalPrices` Snapshots ({dbStats.snapshotsCount})
                  </p>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/70 text-xs">
                    {dbStats.snapshots.length === 0 ? (
                      <p className="text-slate-400 py-4">
                        No historical snapshots persisted yet. Click &quot;Sync Market Catalog&quot; above.
                      </p>
                    ) : (
                      dbStats.snapshots.map((h, idx) => (
                        <div key={idx} className="py-2 flex justify-between font-mono">
                          <span className="text-slate-200">
                            {String(h.symbol)} ({String(h.pointsCount)} bars)
                          </span>
                          <span className="text-slate-400">
                            {String(h.latestClose)} · {String(h.dataSource)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
