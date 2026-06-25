import { PrismaClient } from '@prisma/client';
import { SUPER_ADMIN_WALLETS, OPERATOR_WALLETS } from './plvtvs/auth-constants';

// ============================================================
// PLVTVS.ONE — Database Abstraction Layer
// In Vercel serverless, uses in-memory store. In local dev, uses Prisma.
// ============================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  plvtvsMemDb?: PlvtvsMemDb;
};

const isServerless =
  !!process.env.VERCEL ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
  !!process.env.CF_PAGES;

const databaseUrl = process.env.DATABASE_URL || 'file:./db/custom.db';

interface MemUser {
  id: string;
  walletAddress: string;
  email: string | null;
  username: string | null;
  role: 'USER' | 'OPERATOR' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  avatarSeed: string | null;
  subscriptionTier: number;
  subscriptionExpiresAt: Date | null;
  totalYield: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MemLog {
  id: string;
  userId: string | null;
  sector: string | null;
  level: string;
  message: string;
  metadata: string | null;
  createdAt: Date;
}

class PlvtvsMemDb {
  users: Map<string, MemUser> = new Map();
  logs: MemLog[] = [];

  constructor() {
    for (const wallet of SUPER_ADMIN_WALLETS) {
      const w = wallet.toLowerCase();
      this.users.set(w, {
        id: `mem-admin-${w.slice(2, 10)}`,
        walletAddress: w,
        email: null,
        username: null,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        avatarSeed: w,
        subscriptionTier: 0,
        subscriptionExpiresAt: null,
        totalYield: 0,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    for (const wallet of OPERATOR_WALLETS) {
      const w = wallet.toLowerCase();
      this.users.set(w, {
        id: `mem-op-${w.slice(2, 10)}`,
        walletAddress: w,
        email: null,
        username: null,
        role: 'OPERATOR',
        status: 'ACTIVE',
        avatarSeed: w,
        subscriptionTier: 0,
        subscriptionExpiresAt: null,
        totalYield: 0,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  genId(): string {
    return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

if (isServerless && !globalForPrisma.plvtvsMemDb) {
  globalForPrisma.plvtvsMemDb = new PlvtvsMemDb();
}

let prismaClient: PrismaClient | undefined;
if (!isServerless || databaseUrl.startsWith('postgresql') || databaseUrl.startsWith('mysql')) {
  try {
    prismaClient =
      globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
      });
    globalForPrisma.prisma = prismaClient;
  } catch (e) {
    console.error('[db] PrismaClient init failed:', e);
  }
}

export const db = prismaClient as PrismaClient;
export const memDb = globalForPrisma.plvtvsMemDb;
export const isUsingMemDb = isServerless && !prismaClient;

export function getMemDb(): PlvtvsMemDb {
  if (!memDb) throw new Error('Memory DB not initialized');
  return memDb;
}
