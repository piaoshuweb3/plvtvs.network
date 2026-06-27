/**
 * PLVTVS Smart Account Deployer — ERC-4337
 * ==========================================
 * Deploys a LightAccount (Alchemy's audited SimpleAccount variant)
 * for the admin wallet on Base Sepolia. Once deployed, the session
 * keys module can sign UserOperations on behalf of this account.
 *
 * Usage: npx tsx scripts/deploy-smart-account.ts
 * Requires: PRIVATE_KEY env var, Base Sepolia ETH for gas
 */

import { readFileSync } from "fs";
import { resolve } from "path";

async function main() {
  console.log("PLVTVS Smart Account Deployer\n");

  // Read private key from .env
  const cwd = resolve(".");
  const envLines = readFileSync(resolve(cwd, ".env"), "utf8").split("\n");
  const pkLine = envLines.find(l => l.startsWith("PRIVATE_KEY="));
  const pk = process.env.PRIVATE_KEY || pkLine?.split("=")[1]?.trim() || "";
  const cleanPk = pk.startsWith("0x") ? pk.slice(2) : pk;

  if (cleanPk.length !== 64) {
    console.error("PRIVATE_KEY not set. Use: $env:PRIVATE_KEY='0x...'");
    process.exit(1);
  }

  const { privateKeyToAccount } = await import("viem/accounts");
  const { createPublicClient, createWalletClient, http, parseAbi, defineChain } = await import("viem");
  type Hex = `0x${string}`;
  type Address = `0x${string}`;

  const account = privateKeyToAccount(`0x${cleanPk}` as Hex);
  console.log("Owner:", account.address);

  // Base Sepolia
  const baseSepolia = defineChain({
    id: 84532, name: "Base Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
    testnet: true,
  });

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
  const walletClient = createWalletClient({ chain: baseSepolia, transport: http(), account });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance:", (Number(balance) / 1e18).toFixed(6), "ETH");
  if (balance < 10000000000000n) { // < 0.00001 ETH
    console.error("Insufficient balance. Need ~0.001 ETH for deployment.");
    process.exit(1);
  }

  // LightAccount factory address on Base Sepolia
  // Using Alchemy's LightAccount factory (v2.0)
  const LIGHT_ACCOUNT_FACTORY = "0x00000055C0b4fA41dde26A74435ff03692292FBD" as Address;

  const factoryAbi = parseAbi([
    "function createAccount(address owner, uint256 salt) external returns (address)",
    "function getAddress(address owner, uint256 salt) external view returns (address)",
  ]);

  // Compute deterministic address
  const salt = 0n; // Use salt=0 for first deployment
  const predicted = await publicClient.readContract({
    address: LIGHT_ACCOUNT_FACTORY,
    abi: factoryAbi,
    functionName: "getAddress",
    args: [account.address, salt],
  }) as Address;

  // Check if already deployed
  const code = await publicClient.getBytecode({ address: predicted });
  if (code && code !== "0x") {
    console.log("\n✅ Smart Account already deployed!");
    console.log("Address:", predicted);
    console.log("Add to .env: NEXT_PUBLIC_SMART_ACCOUNT_ADDRESS=" + predicted);
    return;
  }

  console.log("Deploying LightAccount...");
  console.log("Predicted address:", predicted);

  const deployHash = await walletClient.writeContract({
    address: LIGHT_ACCOUNT_FACTORY,
    abi: factoryAbi,
    functionName: "createAccount",
    args: [account.address, salt],
  });

  console.log("Tx hash:", deployHash);
  console.log("Waiting for confirmation...");

  await publicClient.waitForTransactionReceipt({ hash: deployHash, timeout: 60000 });

  console.log("\n✅ Smart Account deployed!");
  console.log("Address:", predicted);
  console.log("Add to .env: NEXT_PUBLIC_SMART_ACCOUNT_ADDRESS=" + predicted);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
