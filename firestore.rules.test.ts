/**
 * Firestore Security Rules Adversarial Verification Suite ("Dirty Dozen")
 * Maps each adversarial payload against firestore.rules gates.
 */

export interface AdversarialCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  enforcingGate: string;
  payload: Record<string, unknown>;
}

export const DIRTY_DOZEN_CASES: AdversarialCase[] = [
  {
    id: 1,
    name: 'Self-Privilege Escalation on Registration',
    collection: 'users',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: "incoming().role == 'investor' || isBootstrappedAdmin()",
    payload: { uid: 'attacker1', email: 'attacker@example.com', role: 'admin', status: 'active' }
  },
  {
    id: 2,
    name: 'Role Mutation on User Update',
    collection: 'users',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: "incoming().diff(existing()).affectedKeys().hasOnly(['displayName', 'preferredCurrency', 'updatedAt'])",
    payload: { role: 'admin' }
  },
  {
    id: 3,
    name: 'Cross-Tenant Portfolio Write',
    collection: 'portfolios',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().userId == request.auth.uid',
    payload: { id: 'hold1', userId: 'victim_uid', symbol: 'AAPL', quantity: 10, avgBuyPrice: 200 }
  },
  {
    id: 4,
    name: 'Shadow Field Injection',
    collection: 'portfolios',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'data.keys().hasOnly([...])',
    payload: { id: 'hold2', userId: 'attacker1', symbol: 'TCS.NS', isApproved: true }
  },
  {
    id: 5,
    name: 'Path ID Poisoning',
    collection: 'watchlists',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: "id.matches('^[a-zA-Z0-9_\\\\-]+$') && id.size() <= 128",
    payload: { id: 'bad$id!with/slash', userId: 'attacker1', symbol: 'INFY.NS' }
  },
  {
    id: 6,
    name: 'Client Timestamp Forgery',
    collection: 'forecasts',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().createdAt == request.time',
    payload: { id: 'fc1', userId: 'attacker1', createdAt: '2020-01-01T00:00:00Z' }
  },
  {
    id: 7,
    name: 'PII Blanket Read on Another User',
    collection: 'users',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'request.auth.uid == userId || isAdmin()',
    payload: { targetUid: 'victim_uid' }
  },
  {
    id: 8,
    name: 'Unscoped Portfolio List Query',
    collection: 'portfolios',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'resource.data.userId == request.auth.uid || isBootstrappedAdmin()',
    payload: { query: 'all_documents_without_where_userId' }
  },
  {
    id: 9,
    name: 'Unauthorized Stock Catalog Modification',
    collection: 'stocks',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'isAdmin()',
    payload: { symbol: 'FAKE', companyName: 'Fake Corp', exchange: 'NSE' }
  },
  {
    id: 10,
    name: 'Audit Log Tampering',
    collection: 'auditLogs',
    operation: 'delete',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'allow update, delete: if false;',
    payload: { logId: 'log_123' }
  },
  {
    id: 11,
    name: 'Unverified Email Admin Spoof',
    collection: 'admins',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'request.auth.token.email_verified == true',
    payload: { uid: 'spoof1', email: 'ranjeetkumar895471@gmail.com', email_verified: false }
  },
  {
    id: 12,
    name: 'Negative Quantity Value Poisoning',
    collection: 'portfolios',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'data.quantity is number && data.quantity > 0',
    payload: { id: 'hold3', userId: 'attacker1', symbol: 'NVDA', quantity: -50, avgBuyPrice: 120 }
  }
];
