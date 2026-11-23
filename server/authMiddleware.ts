import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: VerifiedFirebaseUser;
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'ranjeetkumar895471@gmail.com';

function loadFirebaseConfig(): { projectId: string; databaseId: string } {
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as {
        projectId?: string;
        firestoreDatabaseId?: string;
      };
      if (raw.projectId) {
        return {
          projectId: raw.projectId,
          databaseId: raw.firestoreDatabaseId || '(default)',
        };
      }
    }
  } catch {
    // Fallback below
  }
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
  };
}

const { projectId: FIREBASE_PROJECT_ID, databaseId: FIRESTORE_DATABASE_ID } = loadFirebaseConfig();

let cachedCerts: Record<string, string> = {};
let certsExpiry = 0;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiry && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error(`Failed to fetch Firebase public keys: ${resp.status}`);
  }
  const certs = (await resp.json()) as Record<string, string>;
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = certs;
  certsExpiry = now + maxAgeSec * 1000;
  return certs;
}

function decodeBase64Url(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64');
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT token');
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(decodeBase64Url(headerB64).toString('utf-8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf-8')) as {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid token algorithm or key ID');
  }
  if (!FIREBASE_PROJECT_ID) {
    throw new Error('Firebase project ID not configured on server');
  }

  const certs = await getGooglePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Unknown signing certificate');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signature = decodeBase64Url(sigB64);
  if (!verifier.verify(cert, signature)) {
    throw new Error('Invalid token signature');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < nowSec) {
    throw new Error('Token expired');
  }
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error('Token audience mismatch');
  }
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error('Token issuer mismatch');
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Missing subject');
  }

  return {
    uid: payload.sub,
    email: payload.email || '',
    emailVerified: Boolean(payload.email_verified),
    name: payload.name,
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Empty authorization token.' });
    return;
  }
  try {
    const verified = await verifyFirebaseIdToken(token);
    if (!verified.emailVerified) {
      res.status(403).json({ error: 'Verified email required for API access.' });
      return;
    }
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : 'Invalid or expired session token',
    });
  }
}

async function checkFirestoreAdminDoc(uid: string, token: string): Promise<boolean> {
  if (!FIREBASE_PROJECT_ID) return false;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      FIREBASE_PROJECT_ID
    )}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents/admins/${encodeURIComponent(
      uid
    )}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, async () => {
    if (!req.user) return;
    if (req.user.email === BOOTSTRAPPED_ADMIN_EMAIL && req.user.emailVerified) {
      next();
      return;
    }
    const token = req.headers.authorization?.slice(7).trim() || '';
    if (token && req.user.emailVerified && (await checkFirestoreAdminDoc(req.user.uid, token))) {
      next();
      return;
    }
    res.status(403).json({ error: 'Administrator privileges required.' });
  });
}
