/**
 * PlvtvsRealtimeEngine — Base Sepolia chain data engine
 * ======================================================
 * Pulls live on-chain data from Base Sepolia and formats it as
 * dashboard log events. Every data source is wrapped in its own
 * try-catch so a single failing RPC call never takes down the
 * whole pipeline.
 *
 * When the RPC endpoint is unreachable the engine gracefully
 * degrades to offline mode and emits a single warning instead
 * of crashing.
 *
 * @module plvtvs/chain/realtime-engine
 */

import {
  createPublicClient,
  http,
  parseAbi,
  parseAbiItem,
  type Address,
} from "viem";
import { baseSepolia } from "viem/chains";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Structured log event consumed by the dashboard logger */
export interface LogEvent {
  sector: "SOCIAL" | "ECOM" | "CRYPTO" | "SYSTEM";
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
  message: string;
  source?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RPC_URL = "https://sepolia.base.org";
const RPC_TIMEOUT_MS = 6000;
const DEFAULT_INTERVAL_MS = 8000;

/** Number of past blocks to scan for subscription events each tick */
const EVENT_SCAN_BLOCKS = BigInt(50);

/**
 * Known Aerodrome pool address on Base Sepolia.
 * @todo Replace with the real deployed pool address once Aerodrome is
 *       configured on the target testnet.
 */
const AERODROME_ETH_USDC_POOL =
  "0x0000000000000000000000000000000000000000" as Address;

// ─── ABIs ────────────────────────────────────────────────────────────────────

/** Minimal Aerodrome pool ABI — just enough to read reserves */
const AERODROME_POOL_ABI = parseAbi([
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
]);

/**
 * Subscribed event as defined in PlutusSubscription.sol.
 * Signature: Subscribed(address indexed user, uint256 tierId, uint256 newExpiryTimestamp, uint256 pricePaid)
 */
const SUBSCRIBED_EVENT = parseAbiItem(
  "event Subscribed(address indexed user, uint256 tierId, uint256 newExpiryTimestamp, uint256 pricePaid)"
);

/** Contract address from env — same key used by the client hook */
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_PLVTVS_SUBSCRIPTION_CONTRACT ||
  "0x0000000000000000000000000000000000000000") as Address;

/** Whether the subscription contract is actually deployed */
const IS_CONTRACT_DEPLOYED =
  CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format a bigint into a compact human-readable string.
 * e.g. 1234567n → "1.23M"
 */
function fmtBig(value: bigint, decimals = 2): string {
  if (value < BigInt(1_000)) return value.toString();
  if (value < BigInt(1_000_000))
    return (Number(value) / 1e3).toFixed(decimals) + "K";
  if (value < BigInt(1_000_000_000))
    return (Number(value) / 1e6).toFixed(decimals) + "M";
  return (Number(value) / 1e9).toFixed(decimals) + "B";
}

/**
 * Truncate a hex address for display.
 * e.g. 0xb868284df92b63e108c133be8e259a53d8e8bb6c → "0xb868...bb6c"
 */
function shortAddr(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export class PlvtvsRealtimeEngine {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
  private active = false;
  private interval: ReturnType<typeof setInterval> | null = null;
  private onLog: ((event: LogEvent) => void) | null = null;
  private rpcAvailable: boolean | null = null;

  constructor() {
    this.client = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL, { timeout: RPC_TIMEOUT_MS }),
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Start the real-time data pump.
   *
   * Calls `onLog` with collected events on every tick.
   * If the RPC is unreachable the engine emits a single warning and
   * does **not** start the interval — callers should fall back to
   * simulated data in that case.
   *
   * @param onLog  Callback that receives formatted log events.
   * @param intervalMs  Tick interval in milliseconds (default 8000).
   */
  async start(
    onLog: (event: LogEvent) => void,
    intervalMs = DEFAULT_INTERVAL_MS,
  ): Promise<void> {
    this.onLog = onLog;

    const reachable = await this.isRpcAvailable();
    if (!reachable) {
      onLog({
        sector: "SYSTEM",
        level: "WARN",
        message: "Base RPC unreachable — running in offline mode",
        source: "base-chain",
      });
      return;
    }

    this.active = true;

    // Fire an immediate tick so the dashboard has data right away
    await this.tick();

    this.interval = setInterval(() => {
      void this.tick();
    }, intervalMs);
  }

  /** Stop the data pump and clear the interval. */
  stop(): void {
    this.active = false;
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /** Whether the engine is currently running. */
  get isActive(): boolean {
    return this.active;
  }

  // ── RPC health ───────────────────────────────────────────────────────────

  /**
   * Test whether the Base Sepolia RPC is reachable.
   * Caches the result so repeated calls are free.
   */
  async isRpcAvailable(): Promise<boolean> {
    if (this.rpcAvailable !== null) return this.rpcAvailable;

    try {
      await this.client.getBlockNumber();
      this.rpcAvailable = true;
    } catch {
      this.rpcAvailable = false;
    }

    return this.rpcAvailable;
  }

  // ── Data collection ──────────────────────────────────────────────────────

  /**
   * Execute every data collector independently and return the
   * union of all successful results.
   *
   * Returns a single offline-mode warning when the RPC is down.
   */
  async collectAll(): Promise<LogEvent[]> {
    // Re-check every call so a recovering RPC is picked up
    const reachable = await this.isRpcAvailable();
    if (!reachable) {
      return [
        {
          sector: "SYSTEM",
          level: "WARN",
          message: "Base RPC unreachable — running in offline mode",
          source: "base-chain",
        },
      ];
    }

    const results = await Promise.allSettled([
      this.safeCollect(() => this.fetchBaseBlockActivity()),
      this.safeCollect(() => this.fetchDeFiPools()),
      this.safeCollect(() => this.fetchMempoolActivity()),
      this.safeCollect(() => this.fetchContractEvents()),
    ]);

    const events: LogEvent[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value !== null) {
        const val = result.value as LogEvent | LogEvent[];
        if (Array.isArray(val)) {
          events.push(...val);
        } else {
          events.push(val);
        }
      }
      // Individual failures are logged inside safeCollect – swallowed here
    }

    return events;
  }

  // ── Collectors ───────────────────────────────────────────────────────────

  /**
   * Fetch the latest confirmed block on Base Sepolia.
   *
   * @example output
   *   "[CRYPTO] Base L2 block #14258763 confirmed · 12 txns · 2.4M gas"
   */
  async fetchBaseBlockActivity(): Promise<LogEvent | null> {
    const blockNumber = await this.client.getBlockNumber();
    const block = await this.client.getBlock({
      blockNumber,
      includeTransactions: true,
    });

    // After includeTransactions:true, block.transactions is an array of objects
    const txCount = (block.transactions as readonly object[]).length;

    return {
      sector: "CRYPTO",
      level: "INFO",
      message: `Base L2 block #${blockNumber} confirmed · ${txCount} txn${txCount !== 1 ? "s" : ""} · ${fmtBig(block.gasUsed)} gas`,
      source: "base-chain",
    };
  }

  /**
   * Query known Aerodrome liquidity pools on Base Sepolia.
   *
   * Falls back silently when the pool address is not yet deployed.
   *
   * @example output
   *   "[CRYPTO] Aerodrome ETH/USDC pool · reserves: 12.5 ETH / 34,200 USDC"
   */
  async fetchDeFiPools(): Promise<LogEvent | null> {
    // Placeholder guard — skip when pool is not deployed yet
    if (
      AERODROME_ETH_USDC_POOL ===
      "0x0000000000000000000000000000000000000000"
    ) {
      return null;
    }

    const [reserve0, reserve1] = (await this.client.readContract({
      address: AERODROME_ETH_USDC_POOL,
      abi: AERODROME_POOL_ABI,
      functionName: "getReserves",
    })) as [bigint, bigint, number];

    // Raw reserves — no decimals applied (testnet values are arbitrary)
    return {
      sector: "CRYPTO",
      level: "INFO",
      message: `Aerodrome ETH/USDC pool · reserves: ${fmtBig(reserve0)} / ${fmtBig(reserve1)}`,
      source: "base-chain",
    };
  }

  /**
   * Sample pending transactions from the mempool via the pending block tag.
   *
   * Falls back to the latest confirmed block if the RPC does not support
   * the `pending` block tag (common on public endpoints).
   *
   * @example output
   *   "[CRYPTO] Mempool activity (pending): 8 txns · gas avg 15.2 gwei"
   */
  async fetchMempoolActivity(): Promise<LogEvent | null> {
    // Attempt pending block first; fall back to latest
    // Using `any` because "pending" and "latest" have different return shapes
    // (pending has number:null, latest has number:bigint).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let block: any;
    let isPending = false;

    try {
      block = await this.client.getBlock({
        blockTag: "pending",
        includeTransactions: true,
      });
      isPending = true;
    } catch {
      // Some RPCs (including public Base Sepolia) reject `pending`
      block = await this.client.getBlock({
        blockTag: "latest",
        includeTransactions: true,
      });
    }

    // After includeTransactions:true, transactions are objects, not hashes
    const txs: readonly object[] = block.transactions as readonly object[];
    if (txs.length === 0) return null;

    // Compute average effective gas price across all tx types
    let totalGasPrice = BigInt(0);
    for (const tx of txs) {
      const t = tx as { gasPrice?: bigint; maxFeePerGas?: bigint };
      if (t.gasPrice) {
        totalGasPrice += t.gasPrice;
      } else if (t.maxFeePerGas) {
        totalGasPrice += t.maxFeePerGas;
      }
    }

    const avgGwei =
      txs.length > 0
        ? Number(totalGasPrice / BigInt(txs.length)) / 1e9
        : 0;

    const label = isPending ? "pending" : "latest";

    return {
      sector: "CRYPTO",
      level: "INFO",
      message: `Mempool activity (${label}): ${txs.length} txn${txs.length !== 1 ? "s" : ""} · gas avg ${avgGwei.toFixed(1)} gwei`,
      source: "base-chain",
    };
  }

  /**
   * Scan recent blocks for `Subscribed` events emitted by the
   * PlutusSubscription contract.
   *
   * Skips silently when the contract is not yet deployed.
   *
   * @example output
   *   "[SYSTEM] New on-chain subscription detected · wallet 0xb868...bb6c · tier 2"
   */
  async fetchContractEvents(): Promise<LogEvent[] | null> {
    if (!IS_CONTRACT_DEPLOYED) return null;

    const currentBlock = await this.client.getBlockNumber();
    const fromBlock =
      currentBlock - EVENT_SCAN_BLOCKS > BigInt(0)
        ? currentBlock - EVENT_SCAN_BLOCKS
        : BigInt(0);

    const logs = await this.client.getLogs({
      address: CONTRACT_ADDRESS,
      event: SUBSCRIBED_EVENT,
      fromBlock,
      toBlock: "latest",
    });

    if (logs.length === 0) return null;

    return logs.map((log: { args: unknown }) => {
      const args = log.args as {
        user?: string;
        tierId?: bigint;
        newExpiryTimestamp?: bigint;
        pricePaid?: bigint;
      };

      return {
        sector: "SYSTEM" as const,
        level: "SUCCESS" as const,
        message: `New on-chain subscription detected · wallet ${shortAddr(args.user ?? "0x")} · tier ${args.tierId ?? BigInt(0)}`,
        source: "base-chain",
      };
    });
  }

  // ── Internals ────────────────────────────────────────────────────────────

  /** Execute a single collector tick and push events to onLog. */
  private async tick(): Promise<void> {
    const events = await this.collectAll();
    for (const event of events) {
      this.onLog?.(event);
    }
  }

  /**
   * Wrap a collector function so a thrown error never escapes.
   * Returns `null` when the collector fails — the caller can
   * simply filter out the nulls.
   */
  private async safeCollect<T extends LogEvent | LogEvent[] | null>(
    fn: () => Promise<T>,
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[PlvtvsRealtimeEngine] collector failed: ${msg}`);
      return null;
    }
  }
}

/** Singleton convenience — most callers only need one engine. */
export const realtimeEngine = new PlvtvsRealtimeEngine();
