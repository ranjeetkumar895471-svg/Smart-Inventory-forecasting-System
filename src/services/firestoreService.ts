import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  db,
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
} from '../firebase';
import type {
  UserProfile,
  PortfolioHolding,
  WatchlistItem,
  SavedForecastRecord,
  ResearchReportRecord,
  AuditLogRecord,
  CurrencyCode,
  StockCatalogEntry,
  RiskLevel,
} from '../types';

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '');
}

function clampStr(val: string, max: number): string {
  return val.trim().slice(0, max);
}

export async function logUserActivity(
  action: string,
  resource: string,
  details: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const id = makeSafeId('log');
  const path = `auditLogs/${id}`;
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      id,
      userId: user.uid,
      userEmail: clampStr(user.email || 'user@unknown', 200),
      action: clampStr(action, 80),
      resource: clampStr(resource, 120),
      details: clampStr(details, 500),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName: string
): Promise<UserProfile> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    const isBootstrapAdmin = email === BOOTSTRAPPED_ADMIN_EMAIL;
    const profile: UserProfile = {
      uid,
      email: clampStr(email, 200),
      displayName: clampStr(displayName || email.split('@')[0] || 'Investor', 100),
      role: isBootstrapAdmin ? 'admin' : 'investor',
      preferredCurrency: 'INR',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, profile);
    return profile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateUserCurrency(uid: string, preferredCurrency: CurrencyCode) {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      preferredCurrency,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribePortfolio(
  userId: string,
  onData: (items: PortfolioHolding[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'portfolios';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as PortfolioHolding);
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error('Portfolio sync error'));
      }
    }
  );
}

export async function addPortfolioHolding(input: {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  currency: CurrencyCode;
  quantity: number;
  avgBuyPrice: number;
  notes?: string;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');
  if (input.quantity <= 0 || input.avgBuyPrice <= 0) {
    throw new Error('Quantity and average buy price must be positive.');
  }

  const id = makeSafeId('hold');
  const path = `portfolios/${id}`;
  const payload: Record<string, unknown> = {
    id,
    userId: user.uid,
    symbol: input.symbol.trim().toUpperCase().slice(0, 24),
    companyName: clampStr(input.companyName, 120),
    exchange: clampStr(input.exchange, 24),
    sector: clampStr(input.sector, 64),
    currency: input.currency,
    quantity: Number(input.quantity),
    avgBuyPrice: Number(input.avgBuyPrice),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.notes && input.notes.trim()) {
    payload.notes = clampStr(input.notes, 400);
  }

  try {
    await setDoc(doc(db, 'portfolios', id), payload);
    await logUserActivity(
      'PORTFOLIO_BUY',
      `portfolios/${id}`,
      `Bought ${input.quantity} shares of ${input.symbol} at ${input.avgBuyPrice} ${input.currency}`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updatePortfolioHolding(
  id: string,
  quantity: number,
  avgBuyPrice: number,
  notes?: string
) {
  const path = `portfolios/${id}`;
  if (quantity <= 0 || avgBuyPrice <= 0) {
    throw new Error('Quantity and buy price must be positive.');
  }
  try {
    const updateData: Record<string, unknown> = {
      quantity: Number(quantity),
      avgBuyPrice: Number(avgBuyPrice),
      updatedAt: serverTimestamp(),
    };
    if (notes !== undefined) {
      updateData.notes = clampStr(notes, 400);
    }
    await updateDoc(doc(db, 'portfolios', id), updateData);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function buyMorePortfolioHolding(params: {
  id: string;
  symbol: string;
  currency: CurrencyCode;
  currentQty: number;
  currentAvgPrice: number;
  addQty: number;
  buyPrice: number;
  notes?: string;
}) {
  const { id, symbol, currency, currentQty, currentAvgPrice, addQty, buyPrice, notes } = params;
  if (addQty <= 0 || buyPrice <= 0) {
    throw new Error('Buy quantity and execution price must be greater than zero.');
  }
  const nextQty = Number((currentQty + addQty).toFixed(4));
  const nextAvg = Number(
    ((currentQty * currentAvgPrice + addQty * buyPrice) / nextQty).toFixed(4)
  );
  await updatePortfolioHolding(id, nextQty, nextAvg, notes);
  await logUserActivity(
    'PORTFOLIO_BUY',
    `portfolios/${id}`,
    `Bought +${addQty} ${symbol} @ ${buyPrice} ${currency} (New Avg: ${nextAvg.toFixed(2)} ${currency})`
  );
  return { nextQty, nextAvg };
}

export async function sellPortfolioHolding(params: {
  id: string;
  symbol: string;
  currency: CurrencyCode;
  currentQty: number;
  currentAvgPrice: number;
  sellQty: number;
  sellPrice: number;
  notes?: string;
}) {
  const { id, symbol, currency, currentQty, currentAvgPrice, sellQty, sellPrice, notes } = params;
  if (sellQty <= 0 || sellPrice <= 0) {
    throw new Error('Sell quantity and exit price must be greater than zero.');
  }
  if (sellQty > currentQty + 1e-6) {
    throw new Error(`Cannot sell ${sellQty} shares; only ${currentQty} held.`);
  }
  const realizedPnl = Number(((sellPrice - currentAvgPrice) * sellQty).toFixed(2));
  const remainingQty = Number((currentQty - sellQty).toFixed(4));
  const path = `portfolios/${id}`;

  try {
    if (remainingQty <= 0.0001) {
      await deleteDoc(doc(db, 'portfolios', id));
    } else {
      await updatePortfolioHolding(id, remainingQty, currentAvgPrice, notes);
    }
    const sign = realizedPnl >= 0 ? '+' : '';
    await logUserActivity(
      'PORTFOLIO_SELL',
      path,
      `Sold ${sellQty} ${symbol} @ ${sellPrice} ${currency} | Realized P&L: ${sign}${realizedPnl} ${currency}`
    );
    return { realizedPnl, remainingQty: Math.max(0, remainingQty) };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deletePortfolioHolding(id: string, symbol: string) {
  const path = `portfolios/${id}`;
  try {
    await deleteDoc(doc(db, 'portfolios', id));
    await logUserActivity('PORTFOLIO_REMOVE', path, `Removed ${symbol} holding`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeWatchlist(
  userId: string,
  onData: (items: WatchlistItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'watchlists';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as WatchlistItem));
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error('Watchlist sync error'));
      }
    }
  );
}

export async function addToWatchlist(input: {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  currency: CurrencyCode;
  targetPrice?: number;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');
  const normalizedSymbol = input.symbol.trim().toUpperCase().slice(0, 24);
  if (!normalizedSymbol) throw new Error('Valid symbol is required.');

  const existingSnap = await getDocs(
    query(collection(db, 'watchlists'), where('userId', '==', user.uid))
  );
  if (existingSnap.docs.some((d) => String(d.data().symbol || '').toUpperCase() === normalizedSymbol)) {
    throw new Error(`${normalizedSymbol} is already tracked in your watchlist.`);
  }

  const id = makeSafeId('watch');
  const path = `watchlists/${id}`;
  const payload: Record<string, unknown> = {
    id,
    userId: user.uid,
    symbol: normalizedSymbol,
    companyName: clampStr(input.companyName, 120),
    exchange: clampStr(input.exchange, 24),
    sector: clampStr(input.sector, 64),
    currency: input.currency,
    createdAt: serverTimestamp(),
  };
  if (input.targetPrice !== undefined && input.targetPrice >= 0) {
    payload.targetPrice = Number(input.targetPrice);
  }

  try {
    await setDoc(doc(db, 'watchlists', id), payload);
    await logUserActivity('WATCHLIST_ADD', path, `Added ${normalizedSymbol} to watchlist`);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateWatchlistTarget(id: string, targetPrice: number) {
  const path = `watchlists/${id}`;
  try {
    await updateDoc(doc(db, 'watchlists', id), { targetPrice: Number(targetPrice) });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function removeFromWatchlist(id: string, symbol: string) {
  const path = `watchlists/${id}`;
  try {
    await deleteDoc(doc(db, 'watchlists', id));
    await logUserActivity('WATCHLIST_REMOVE', path, `Removed ${symbol} from watchlist`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeForecasts(
  userId: string,
  onData: (items: SavedForecastRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'forecasts';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as SavedForecastRecord));
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error('Forecast sync error'));
      }
    }
  );
}

export async function saveForecastRecord(input: {
  symbol: string;
  horizonDays: 1 | 7 | 30;
  modelName: string;
  currentPrice: number;
  predictedPrice: number;
  lower95: number;
  upper95: number;
  riskLevel: RiskLevel;
  mape: number;
  directionalAccuracy: number;
  isDemo: boolean;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');
  const id = makeSafeId('fc');
  const path = `forecasts/${id}`;
  try {
    await setDoc(doc(db, 'forecasts', id), {
      id,
      userId: user.uid,
      symbol: input.symbol.trim().toUpperCase().slice(0, 24),
      horizonDays: input.horizonDays,
      modelName: clampStr(input.modelName, 80),
      currentPrice: Number(input.currentPrice),
      predictedPrice: Number(input.predictedPrice),
      lower95: Number(input.lower95),
      upper95: Number(input.upper95),
      riskLevel: input.riskLevel,
      mape: Number(input.mape),
      directionalAccuracy: Number(input.directionalAccuracy),
      isDemo: Boolean(input.isDemo),
      createdAt: serverTimestamp(),
    });
    await logUserActivity(
      'FORECAST_SAVED',
      path,
      `Saved ${input.horizonDays}d forecast for ${input.symbol}`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteForecastRecord(id: string) {
  const path = `forecasts/${id}`;
  try {
    await deleteDoc(doc(db, 'forecasts', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeReports(
  userId: string,
  onData: (items: ResearchReportRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'reports';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as ResearchReportRecord));
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error('Reports sync error'));
      }
    }
  );
}

export async function saveResearchReport(input: {
  symbol: string;
  title: string;
  reportType: 'Equity Forecast' | 'Portfolio Summary' | 'Risk & Technical';
  horizonDays: 1 | 7 | 30;
  riskLevel: RiskLevel;
  summary: string;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');
  const id = makeSafeId('rpt');
  const path = `reports/${id}`;
  try {
    await setDoc(doc(db, 'reports', id), {
      id,
      userId: user.uid,
      symbol: input.symbol.trim().toUpperCase().slice(0, 24),
      title: clampStr(input.title, 160),
      reportType: input.reportType,
      horizonDays: input.horizonDays,
      riskLevel: input.riskLevel,
      summary: clampStr(input.summary, 1500),
      createdAt: serverTimestamp(),
    });
    await logUserActivity('REPORT_EXPORTED', path, `Generated PDF report for ${input.symbol}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteResearchReport(id: string) {
  const path = `reports/${id}`;
  try {
    await deleteDoc(doc(db, 'reports', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Admin operations
export async function fetchAllUsersAdmin(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => d.data() as UserProfile);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function updateUserRoleStatusAdmin(
  uid: string,
  userEmail: string,
  role: 'investor' | 'admin',
  status: 'active' | 'suspended'
) {
  const path = `users/${uid}`;
  const currentAdmin = auth.currentUser;
  try {
    await updateDoc(doc(db, 'users', uid), {
      role,
      status,
      updatedAt: serverTimestamp(),
    });
    // Sync /admins/{uid} collection so promoted admins pass Firestore isAdmin() rules
    if (role === 'admin' && currentAdmin) {
      await setDoc(doc(db, 'admins', uid), {
        uid,
        email: clampStr(userEmail, 200),
        grantedBy: clampStr(currentAdmin.uid, 128),
        createdAt: serverTimestamp(),
      });
    } else if (role === 'investor') {
      try {
        await deleteDoc(doc(db, 'admins', uid));
      } catch {
        // Ignore if /admins/{uid} did not exist
      }
    }
    await logUserActivity('ADMIN_USER_UPDATE', path, `Updated user ${uid} role=${role}, status=${status}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fetchAuditLogsAdmin(): Promise<AuditLogRecord[]> {
  const path = 'auditLogs';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AuditLogRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function fetchUserAuditLogs(userId: string): Promise<AuditLogRecord[]> {
  const path = 'auditLogs';
  try {
    const q = query(collection(db, path), where('userId', '==', userId), limit(30));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AuditLogRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function fetchCatalogAndSnapshots() {
  try {
    const [stocksSnap, histSnap] = await Promise.all([
      getDocs(collection(db, 'stocks')),
      getDocs(collection(db, 'historicalPrices')),
    ]);
    return {
      stocks: stocksSnap.docs.map((d) => d.data()),
      historicalPrices: histSnap.docs.map((d) => d.data()),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'stocks');
  }
}

export async function syncCatalogToFirestoreAdmin(
  catalog: StockCatalogEntry[],
  snapshots: Array<{
    symbol: string;
    exchange: string;
    dataSource: string;
    pointsCount: number;
    lastDate: string;
    latestClose: number;
  }>
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Admin authentication required');

  try {
    for (const s of catalog) {
      await setDoc(doc(db, 'stocks', s.symbol), {
        symbol: s.symbol,
        companyName: clampStr(s.companyName, 120),
        exchange: clampStr(s.exchange, 24),
        sector: clampStr(s.sector, 64),
        currency: s.currency,
        marketCapTier: s.marketCapTier,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
    }

    for (const snap of snapshots) {
      const id = `hist_${snap.symbol.replace(/[^a-zA-Z0-9_\-]/g, '_')}`;
      await setDoc(doc(db, 'historicalPrices', id), {
        id,
        symbol: snap.symbol,
        exchange: snap.exchange,
        dataSource: snap.dataSource,
        pointsCount: snap.pointsCount,
        lastDate: snap.lastDate,
        latestClose: snap.latestClose,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
    }

    await logUserActivity(
      'ADMIN_DB_SYNC',
      'stocks & historicalPrices',
      `Synced ${catalog.length} equities and ${snapshots.length} historical snapshots`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'stocks');
  }
}
