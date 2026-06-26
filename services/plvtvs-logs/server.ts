import { createServer } from "node:http";
import { Server } from "socket.io";

// ─── Constants ───────────────────────────────────────────────────────────────

const PORT = 3030;
const MAX_LOGS = 1000;
const HISTORY_SIZE = 50;
const SECTORS = ["SOCIAL", "ECOM", "CRYPTO", "SYSTEM"] as const;
type Sector = (typeof SECTORS)[number];

const BANNER = `
██████╗ ██╗    ██╗   ████████╗██╗   ██╗███████╗
██╔══██╗██║    ██║   ╚══██╔══╝██║   ██║██╔════╝
██████╔╝██║    ██║█████╗██║   ██║   ██║███████╗
██╔═══╝ ██║    ██║╚════╝██║   ╚██╗ ██╔╝╚════██║
██║     ███████╗██║      ██║    ╚████╔╝ ███████║
╚═╝     ╚══════╝╚═╝      ╚═╝     ╚═══╝  ╚══════╝

  ██╗      ██████╗  ██████╗ ███████╗
  ██║     ██╔═══██╗██╔════╝ ██╔════╝
  ██║     ██║   ██║██║  ███╗███████╗
  ██║     ██║   ██║██║   ██║╚════██║
  ███████╗╚██████╔╝╚██████╔╝███████║
  ╚══════╝ ╚═════╝  ╚═════╝ ╚══════╝

  ███████╗███████╗██████╗ ██╗   ██╗██╗ ██████╗███████╗
  ██╔════╝██╔════╝██╔══██╗██║   ██║██║██╔════╝██╔════╝
  ███████╗█████╗  ██████╔╝██║   ██║██║██║     █████╗
  ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██║██║     ██╔══╝
  ███████║███████╗██║  ██║ ╚████╔╝ ██║╚██████╗███████╗
  ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚═╝ ╚═════╝╚══════╝

          v1.0.0  —  booting up...
`;

// ─── Simulated log templates ─────────────────────────────────────────────────

const SOCIAL_TEMPLATES = [
  "Spawning digital echo node #${id}. Dispatched multi-threaded viral feed.",
  "Intercepting attention vector from X API. Yielding ad-pool ${eth} ETH.",
  "Signal booster engaged. Amplifying reach by ${pct}% across meta-clusters.",
  "Synthetic persona #${id} deployed to trending thread. Engagement delta: +${pct}%.",
  "Scraping sentiment topology from Reddit firehose. Polarity score: ${eth}.",
  "Dark-social tracker detected cascade event. Propagation rate: ${pct} nodes/sec.",
  "Attention arbitrage window opened on X. Bid-ask spread: ${eth} units.",
  "Viral coefficient optimizer tuned. Current K-factor: ${pct}.",
];

const ECOM_TEMPLATES = [
  "Puppeteer cluster detected arbitrage discrepancy. Profit margin: ${pct}%.",
  "Shopify dynamic storefront cloned. Routing fulfillment automation.",
  "Headless browser scraped 2,412 SKU prices. Delta threshold: ${eth}% below MAP.",
  "Proxy rotation complete. 48 residential IPs in pool. Cooldown: ${pct}s.",
  "Checkout bot primed for limited drop. Latency budget: ${pct}ms.",
  "Inventory delta alert: stock dropped ${pct} units on competitor A.",
  "Dynamic pricing model updated. Elasticity coefficient: ${eth}.",
  "Fulfillment webhook received. Order pipeline depth: ${id} queued.",
];

const CRYPTO_TEMPLATES = [
  "Mempool sniffer captured whale transaction on Base L2. Size: ${eth} ETH.",
  "Executing flash-loan sandwich arbitrage via Aerodrome liquidity pool.",
  "MEV relay received bundle #${id}. Priority fee: ${eth} gwei.",
  "Cross-chain bridge arbitrage detected. Spread: ${pct}% ETH→ARB.",
  "Uniswap V4 hook triggered. TVL delta: +${eth} ETH in pool.",
  "Validator node produced block #${id}. Tips earned: ${eth} ETH.",
  "RPC endpoint routing optimized. Median block time: ${pct}ms.",
  "DeFi yield aggregator rebalanced. APY shifted to ${pct}% on Aave V4.",
];

const SYSTEM_TEMPLATES = [
  "Node heartbeat confirmed. Cluster latency: ${pct}ms.",
  "Database checkpoint completed. ${id} records synchronized.",
  "Log rotation triggered. Archived ${id} entries to cold storage.",
  "WebSocket connection pool: ${id} active. Memory pressure: ${pct}%.",
  "SSL certificate renewed. Expiry: ${id} days. Cipher suite: TLS_AES_256_GCM.",
  "Healthcheck passed. Uptime: ${id}h. Error rate: ${pct}%.",
  "System prune complete. Freed ${eth} MB of stale cache.",
  "Thread pool scaled to ${id} workers. Throughput: ${pct} req/s.",
];

const TEMPLATE_MAP: Record<Sector, string[]> = {
  SOCIAL: SOCIAL_TEMPLATES,
  ECOM: ECOM_TEMPLATES,
  CRYPTO: CRYPTO_TEMPLATES,
  SYSTEM: SYSTEM_TEMPLATES,
};

// ─── State ───────────────────────────────────────────────────────────────────

const logs: LogEntry[] = [];
let logIdCounter = 0;
let activeClients = 0;
let lastExternalLogTime = Date.now();
let simInterval: ReturnType<typeof setInterval> | null = null;

interface LogEntry {
  id: number;
  sector: Sector;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  timestamp: string;
  source: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function roll(low: number, high: number, decimals = 1): number {
  const val = low + Math.random() * (high - low);
  return Math.round(val * 10 ** decimals) / 10 ** decimals;
}

function fillTemplate(template: string, sector: Sector): string {
  const eth = roll(0.01, 20, 3);
  const pct = roll(0.1, 99, 1);
  const id = Math.floor(roll(100, 99999, 0));
  return template
    .replace(/\$\{eth\}/g, String(eth))
    .replace(/\$\{pct\}/g, String(pct))
    .replace(/\$\{id\}/g, String(id));
}

function generateLog(): LogEntry {
  const sector = pick(SECTORS);
  const templates = TEMPLATE_MAP[sector];
  const template = pick(templates);
  const message = fillTemplate(template, sector);

  // Occasionally inject a WARN or ERROR
  const levelRoll = Math.random();
  const level: LogEntry["level"] =
    levelRoll < 0.05 ? "ERROR" : levelRoll < 0.15 ? "WARN" : "INFO";

  return {
    id: ++logIdCounter,
    sector,
    level,
    message,
    timestamp: new Date().toISOString(),
    source: "plvtvs-core",
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function addLog(
  sector: Sector,
  level: LogEntry["level"],
  message: string,
  source = "external",
): LogEntry {
  const entry: LogEntry = {
    id: ++logIdCounter,
    sector,
    level,
    message,
    timestamp: new Date().toISOString(),
    source,
  };

  logs.push(entry);
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }

  lastExternalLogTime = Date.now();

  // Broadcast to all connected clients
  io.emit("plvtvs:log", entry);
  return entry;
}

// ─── Server setup ────────────────────────────────────────────────────────────

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

// ─── Socket events ───────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  activeClients++;

  // Send history snapshot (last 50)
  const recent = logs.slice(-HISTORY_SIZE);
  socket.emit("plvtvs:history", { logs: recent });

  // Send current stats
  socket.emit("plvtvs:stats", {
    totalLogs: logs.length,
    activeClients,
  });

  // Handle client stat requests
  socket.on("plvtvs:get-stats", () => {
    socket.emit("plvtvs:stats", {
      totalLogs: logs.length,
      activeClients,
    });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    activeClients = Math.max(0, activeClients - 1);
    io.emit("plvtvs:stats", {
      totalLogs: logs.length,
      activeClients,
    });
  });
});

// ─── Simulated log pump ──────────────────────────────────────────────────────

function scheduleNextSimLog() {
  const delay = 3000 + Math.random() * 5000; // 3-8 seconds
  simInterval = setTimeout(() => {
    // Only generate sim logs if no external logs came in for 60+ seconds
    if (Date.now() - lastExternalLogTime > 60_000) {
      const entry = generateLog();
      logs.push(entry);
      if (logs.length > MAX_LOGS) {
        logs.splice(0, logs.length - MAX_LOGS);
      }
      io.emit("plvtvs:log", entry);
    }
    scheduleNextSimLog();
  }, delay);
}

// Start the pump immediately
scheduleNextSimLog();

// ─── Periodic log cleanup (every 5 min) ─────────────────────────────────────

setInterval(() => {
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }
}, 300_000);

// ─── Boot ────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(BANNER);
  console.log(`  ✓ WebSocket server listening on ws://localhost:${PORT}`);
  console.log(`  ✓ Max logs: ${MAX_LOGS} | History snapshot: ${HISTORY_SIZE}`);
  console.log(`  ✓ Simulated logs: ON (activates after 60s of inactivity)`);
  console.log(`  ✓ CORS: *`);
  console.log(`\n  Ready.\n`);
});
