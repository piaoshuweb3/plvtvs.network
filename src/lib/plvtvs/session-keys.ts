// ============================================================
// PLVTVS.ONE — ERC-4337 Session Key Management Module
// ============================================================
// Enables "autonomous on-chain execution": a user authorizes a
// time-limited session key that the backend can use to sign
// UserOperations without manual confirmation every time.
//
// Dependencies:
//   - viem (privateKeyToAccount, createPublicClient, http, etc.)
//   - permissionless (createSmartAccountClient) — helpers for 4337
//   - Bundler endpoint via env var NEXT_PUBLIC_BUNDLER_URL
//
// Storage:
//   - Currently in-memory Map (sessionKeyStore).
//   - TODO: Migrate to encrypted database (e.g. Prisma + AES-256-GCM)
//     with encryption key from environment variable.
// ============================================================

import { http, createPublicClient, type Address, type Hex } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// Types
// ============================================================

/** Permission scope for a session key */
export interface SessionKeyPermissions {
  /** Maximum ETH value allowed per transaction (decimal string, e.g. "0.1") */
  maxEthPerTx: string;
  /** Whitelist of contract addresses the session key may interact with */
  allowedContracts: string[];
  /** Whitelist of 4-byte function selectors (e.g. ["0xa9059cbb"]) */
  allowedFunctions: string[];
}

/** Represents a user-authorized session key for ERC-4337 operations */
export interface SessionKey {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Associated user ID (from DB / mem DB) */
  userId: string;
  /** User's smart-account (ERC-4337) address on Base */
  walletAddress: string;
  /** Session key private key (hex-encoded 32 bytes).
   *  WARNING: Stored in memory — TODO: encrypt with AES-256-GCM key from env. */
  sessionPrivateKey: string;
  /** Session key public address derived from the private key */
  sessionAddress: string;
  /** Permission scope for this session key */
  permissions: SessionKeyPermissions;
  /** Unix timestamp (seconds) after which the key is invalid */
  expiresAt: number;
  /** Whether the key is currently active (not revoked / expired) */
  isActive: boolean;
  /** ISO-8601 timestamp of creation */
  createdAt: string;
  /** ISO-8601 timestamp of last usage, or null if never used */
  lastUsedAt: string | null;
}

/**
 * A minimal UserOperation structure for ERC-4337.
 * In production, this would be the full packed UserOperation
 * from permissionless / EIP-4337. We keep it simple here for
 * the module boundary.
 */
export interface UserOperation {
  sender: string;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
}

// ============================================================
// Configuration
// ============================================================

/** Default Pimlico Bundler URL for Base Sepolia (public demo endpoint) */
const DEFAULT_BUNDLER_URL = 'https://api.pimlico.io/v2/84532/rpc';

/** Read bundler URL from environment, fall back to default */
function getBundlerUrl(): string {
  return process.env.NEXT_PUBLIC_BUNDLER_URL || DEFAULT_BUNDLER_URL;
}

/** Determine the active chain from env or default to Base Sepolia */
function getChain() {
  const chainEnv = process.env.NEXT_PUBLIC_BASE_CHAIN || 'base-sepolia';
  return chainEnv === 'base' ? base : baseSepolia;
}

/** Public client for on-chain reads */
const publicClient = createPublicClient({
  chain: getChain(),
  transport: http(getBundlerUrl()),
});

// ============================================================
// In-Memory Session Key Store
// ============================================================
// TODO: Migrate to encrypted Prisma-backed storage.
// The loadFromStorage / saveToStorage interface is designed to
// make a future DB migration straightforward.

const sessionKeyStore = new Map<string, SessionKey>();

/** Persist the current in-memory store (no-op for now).
 *  TODO: serialize to a durable store (Prisma / Redis / encrypted file). */
export function saveToStorage(): void {
  // Placeholder — in-memory store is ephemeral.
  // In production this would flush to DB.
}

/** Reload session keys from a durable store (no-op for now).
 *  TODO: hydrate from Prisma / Redis / encrypted file. */
export function loadFromStorage(): void {
  // Placeholder — in-memory store starts empty on cold start.
}

// ============================================================
// Core Functions
// ============================================================

/**
 * Generate a fresh random session keypair using viem.
 * The private key should be encrypted before storage in production.
 *
 * @returns A new ECDSA keypair (secp256k1).
 */
export function generateSessionKey(): { privateKey: string; address: string } {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    privateKey,
    address: account.address,
  };
}

/**
 * Create a new session key for a user's smart-account wallet.
 * The key is stored in memory with an expiration date.
 *
 * @param walletAddress - The user's ERC-4337 smart-account address.
 * @param userId - The user's internal ID (from DB).
 * @param permissions - Allowed spend / contract / function scope.
 * @param durationDays - Number of days before the session key expires.
 * @returns The newly created SessionKey object.
 *
 * @example
 * ```ts
 * const sk = await createSessionKey(
 *   "0xSmartAccount...",
 *   "user-abc",
 *   { maxEthPerTx: "0.1", allowedContracts: [], allowedFunctions: [] },
 *   7
 * );
 * ```
 */
export async function createSessionKey(
  walletAddress: string,
  userId: string,
  permissions: SessionKeyPermissions,
  durationDays: number,
): Promise<SessionKey> {
  const { privateKey, address } = generateSessionKey();
  const now = new Date();
  const expiresAt = Math.floor(now.getTime() / 1000) + durationDays * 86400;

  const sessionKey: SessionKey = {
    id: uuidv4(),
    userId,
    walletAddress: walletAddress.toLowerCase(),
    sessionPrivateKey: privateKey,
    sessionAddress: address,
    permissions: {
      maxEthPerTx: permissions.maxEthPerTx,
      allowedContracts: permissions.allowedContracts.map((c) => c.toLowerCase()),
      allowedFunctions: permissions.allowedFunctions,
    },
    expiresAt,
    isActive: true,
    createdAt: now.toISOString(),
    lastUsedAt: null,
  };

  sessionKeyStore.set(sessionKey.id, sessionKey);
  saveToStorage();
  return sessionKey;
}

/**
 * Validate whether a session key is still usable (active + not expired).
 *
 * @param sessionKeyId - The UUID of the session key to validate.
 * @returns `true` if the key is active and not expired; `false` otherwise.
 */
export async function validateSessionKey(sessionKeyId: string): Promise<boolean> {
  const key = sessionKeyStore.get(sessionKeyId);
  if (!key || !key.isActive) return false;

  const now = Math.floor(Date.now() / 1000);
  if (key.expiresAt <= now) {
    // Auto-revoke expired keys
    key.isActive = false;
    saveToStorage();
    return false;
  }

  return true;
}

/**
 * Revoke (deactivate) a session key immediately.
 *
 * @param sessionKeyId - The UUID of the session key to revoke.
 * @returns `true` if the key was found and revoked; `false` if not found.
 */
export async function revokeSessionKey(sessionKeyId: string): Promise<boolean> {
  const key = sessionKeyStore.get(sessionKeyId);
  if (!key) return false;

  key.isActive = false;
  saveToStorage();
  return true;
}

/**
 * List all active (non-revoked, non-expired) session keys for a wallet.
 *
 * @param walletAddress - The user's smart-account address.
 * @returns Array of active SessionKey objects.
 */
export async function listActiveSessionKeys(
  walletAddress: string,
): Promise<Omit<SessionKey, 'sessionPrivateKey'>[]> {
  const addr = walletAddress.toLowerCase();
  const now = Math.floor(Date.now() / 1000);

  const results: Omit<SessionKey, 'sessionPrivateKey'>[] = [];
  for (const key of sessionKeyStore.values()) {
    if (key.walletAddress === addr && key.isActive && key.expiresAt > now) {
      const { sessionPrivateKey, ...safe } = key;
      results.push(safe);
    }
  }
  return results;
}

/**
 * Look up a session key by ID. Returns the full object (including private key)
 * — this is internal infrastructure; never expose the private key via API.
 *
 * @param sessionKeyId - The UUID of the session key.
 * @returns The full SessionKey, or null if not found.
 */
async function getSessionKeyById(sessionKeyId: string): Promise<SessionKey | null> {
  const key = sessionKeyStore.get(sessionKeyId);
  if (!key || !key.isActive) return null;

  const now = Math.floor(Date.now() / 1000);
  if (key.expiresAt <= now) {
    key.isActive = false;
    saveToStorage();
    return null;
  }

  return key;
}

/**
 * Build a signed UserOperation using a session key.
 *
 * This is a simplified implementation. In production you would:
 * 1. Use `permissionless`'s `createSmartAccountClient` with a bundler
 * 2. Call `sendUserOperation` / `prepareUserOperation` from permissionless
 * 3. The session key signs the UserOperation hash
 *
 * @param sessionKeyId - The UUID of the session key to use.
 * @param target - The destination contract address.
 * @param value - Amount of native ETH to send (in wei).
 * @param data - Encoded calldata (hex string).
 * @returns A signed UserOperation ready to submit to the bundler.
 *
 * @throws If the session key is invalid, expired, or exceeds permissions.
 */
export async function buildUserOperation(
  sessionKeyId: string,
  target: string,
  value: bigint,
  data: string,
): Promise<UserOperation> {
  const key = await getSessionKeyById(sessionKeyId);
  if (!key) {
    throw new Error('Session key not found, revoked, or expired');
  }

  // Permission check: max ETH per tx
  const maxWei = BigInt(
    Math.floor(parseFloat(key.permissions.maxEthPerTx) * 1e18),
  );
  if (value > maxWei) {
    throw new Error(
      `Transaction value ${value} exceeds session limit ${maxWei} wei`,
    );
  }

  // Permission check: allowed contracts
  if (key.permissions.allowedContracts.length > 0) {
    if (!key.permissions.allowedContracts.includes(target.toLowerCase())) {
      throw new Error(
        `Target contract ${target} is not in the session key allowlist`,
      );
    }
  }

  // Permission check: allowed function selectors
  if (key.permissions.allowedFunctions.length > 0) {
    const selector = data.slice(0, 10); // "0x" + 8 hex chars = 4 bytes
    if (!key.permissions.allowedFunctions.includes(selector)) {
      throw new Error(
        `Function selector ${selector} is not in the session key allowlist`,
      );
    }
  }

  // Build a minimal UserOperation.
  // In production this would go through permissionless bundler estimation.
  const senderAccount = privateKeyToAccount(key.sessionPrivateKey as Hex);

  // Minimal packed UserOperation (will be filled by bundler estimation in prod)
  const userOp: UserOperation = {
    sender: key.walletAddress as Address,
    nonce: 0n,
    initCode: '0x' as Hex,
    callData: data as Hex,
    callGasLimit: 200_000n,
    verificationGasLimit: 100_000n,
    preVerificationGas: 50_000n,
    maxFeePerGas: 10_000_000_000n, // 10 gwei placeholder
    maxPriorityFeePerGas: 1_000_000_000n, // 1 gwei placeholder
    paymasterAndData: '0x' as Hex,
    signature: '0x' as Hex,
  };

  // Sign the UserOperation hash with the session key
  // In a full implementation, you'd use permissionless' signUserOperation
  const hashToSign = await sha256UserOp(userOp);
  const signature = await senderAccount.signMessage({
    message: { raw: hashToSign },
  });
  userOp.signature = signature;

  // Update last used timestamp
  key.lastUsedAt = new Date().toISOString();
  saveToStorage();

  return userOp;
}

/**
 * Send a UserOperation to the bundler, signed by a session key.
 * Combines buildUserOperation + submit to bundler in one call.
 *
 * @param sessionKeyId - The UUID of the session key to use.
 * @param target - The destination contract address.
 * @param value - Amount of native ETH to send (in wei).
 * @param data - Encoded calldata (hex string).
 * @returns The transaction hash from the bundler.
 *
 * @example
 * ```ts
 * const { txHash } = await sendUserOperation(
 *   sessionKey.id,
 *   "0xContractAddress",
 *   0n,
 *   "0xencodedCalldata"
 * );
 * ```
 */
export async function sendUserOperation(
  sessionKeyId: string,
  target: string,
  value: bigint,
  data: string,
): Promise<{ txHash: string }> {
  const userOp = await buildUserOperation(sessionKeyId, target, value, data);

  // Submit to bundler via eth_sendUserOperation RPC
  // In production, use permissionless' sendUserOperation / waitForUserOperationReceipt
  const bundlerUrl = getBundlerUrl();

  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_sendUserOperation',
    params: [userOp, userOp.sender],
  });

  const response = await fetch(bundlerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bundler returned ${response.status}: ${errorText}`);
  }

  const result = await response.json() as {
    result?: string;
    error?: { message: string };
  };

  if (result.error) {
    throw new Error(`Bundler error: ${result.error.message}`);
  }

  return { txHash: result.result! };
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Compute a keccak256 hash of a UserOperation for signing.
 * This is a simplified version; in production use
 * `getUserOperationHash` from permissionless / viem.
 */
async function sha256UserOp(userOp: UserOperation): Promise<Hex> {
  const { encodeAbiParameters, keccak256 } = await import('viem');
  // Pack the UserOperation fields for hashing (simplified EIP-4337 packing)
  const packed = encodeAbiParameters(
    [
      { type: 'address' },
      { type: 'uint256' },
      { type: 'bytes32' },
      { type: 'bytes32' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'bytes32' },
    ],
    [
      userOp.sender as Address,
      userOp.nonce,
      keccak256(userOp.initCode),
      keccak256(userOp.callData),
      userOp.callGasLimit,
      userOp.verificationGasLimit,
      userOp.preVerificationGas,
      userOp.maxFeePerGas,
      userOp.maxPriorityFeePerGas,
      keccak256(userOp.paymasterAndData),
    ],
  );
  return keccak256(packed);
}

// ============================================================
// Recovery / Admin Helpers
// ============================================================

/**
 * Clear all session keys for a given wallet address. Useful for
 * security rotation — revoke all sessions at once.
 *
 * @param walletAddress - The user's smart-account address.
 * @returns Number of keys revoked.
 */
export async function revokeAllSessionKeys(
  walletAddress: string,
): Promise<number> {
  const addr = walletAddress.toLowerCase();
  let count = 0;
  for (const key of sessionKeyStore.values()) {
    if (key.walletAddress === addr && key.isActive) {
      key.isActive = false;
      count++;
    }
  }
  if (count > 0) saveToStorage();
  return count;
}

/**
 * Return the total number of stored session keys (active + inactive).
 * Useful for debugging / monitoring.
 */
export function totalStoredKeys(): number {
  return sessionKeyStore.size;
}
