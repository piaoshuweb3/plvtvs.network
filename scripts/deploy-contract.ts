// ============================================================
// PLVTVS.ONE — Contract Deployment Script (Base Sepolia)
// ============================================================
// Compiles PlutusSubscription.sol with solc and deploys via viem.
// Usage: npx tsx scripts/deploy-contract.ts
//
// Prerequisites:
//   .env: PRIVATE_KEY=0x...   (deployer wallet — this wallet pays gas)
//   .env: NEXT_PUBLIC_PLVTVS_ADMIN_WALLET=0x...  (contract owner, hardcoded)
//
// The deployer wallet MUST hold Base Sepolia ETH for gas (~0.001 ETH).
// Faucet: https://www.alchemy.com/faucets/base-sepolia
// ============================================================

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

// ============================================================
// Step 0: Install solc if missing
// ============================================================
const cwd = resolve(".");
const envPath = join(cwd, ".env");

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  if (!existsSync(envPath)) return env;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
  }
  return env;
}

function updateEnv(key: string, value: string) {
  if (!existsSync(envPath)) {
    console.error("[ERROR] .env not found at", envPath);
    return;
  }
  let content = readFileSync(envPath, "utf-8");
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }
  writeFileSync(envPath, content, "utf-8");
  console.log(`[ENV] Updated ${key}=${value}`);
}

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  PLVTVS.ONE — PlutusSubscription Deployer");
  console.log("  Target: Base Sepolia (chainId 84532)");
  console.log("═══════════════════════════════════════════════\n");

  // --- Load env ---
  const env = loadEnv();
  const privateKey = env.PRIVATE_KEY;
  const adminWallet = env.NEXT_PUBLIC_PLVTVS_ADMIN_WALLET;

  if (!privateKey) {
    console.error("[ERROR] PRIVATE_KEY not set in .env");
    console.error("  Add: PRIVATE_KEY=0xyour_private_key_here");
    process.exit(1);
  }
  if (!adminWallet) {
    console.error("[ERROR] NEXT_PUBLIC_PLVTVS_ADMIN_WALLET not set in .env");
    process.exit(1);
  }

  const normalizedKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  if (normalizedKey.length !== 64) {
    console.error("[ERROR] Invalid private key length. Must be 64 hex chars.");
    process.exit(1);
  }

  // --- Install solc if needed ---
  console.log("[STEP 1/5] Checking solc compiler...");
  try {
    execSync("npx solc --version", { stdio: "pipe", cwd });
  } catch {
    console.log("  solc not found, installing solc@0.8.20...");
    execSync("npm install --no-save solc@0.8.20", { stdio: "inherit", cwd });
  }

  // --- Compile ---
  console.log("[STEP 2/5] Compiling PlutusSubscription.sol...");
  const solc = require("solc");
  const contractPath = join(cwd, "contracts", "PlutusSubscription.sol");
  const source = readFileSync(contractPath, "utf-8");

  const input = {
    language: "Solidity",
    sources: { "PlutusSubscription.sol": { content: source } },
    settings: {
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter((e: any) => e.severity === "error");
    if (errors.length > 0) {
      console.error("[ERROR] Compilation failed:");
      for (const e of errors) console.error("  ", e.formattedMessage);
      process.exit(1);
    }
    // Warnings only — print them
    for (const e of output.errors) {
      if (e.severity === "warning") console.warn("  [WARN]", e.formattedMessage);
    }
  }

  const contractArtifact = output.contracts["PlutusSubscription.sol"]["PlutusSubscription"];
  const abi = contractArtifact.abi;
  const bytecode = "0x" + contractArtifact.evm.bytecode.object;

  console.log("  ✅ Compilation successful");
  console.log(`  Bytecode size: ${(bytecode.length - 2) / 2} bytes`);
  console.log(`  ABI functions: ${abi.filter((a: any) => a.type === "function").length}`);

  // --- Deploy ---
  console.log("[STEP 3/5] Deploying to Base Sepolia...");

  const { createPublicClient, createWalletClient, http, defineChain } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");

  // Base Sepolia chain definition
  const baseSepolia = defineChain({
    id: 84532,
    name: "Base Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: {
        http: [
          "https://base-sepolia-rpc.publicnode.com",
          "https://sepolia.base.org",
        ],
      },
    },
    blockExplorers: {
      default: { name: "Basescan", url: "https://sepolia.basescan.org" },
    },
    testnet: true,
  });

  const account = privateKeyToAccount(`0x${normalizedKey}` as `0x${string}`);
  const deployerAddr = account.address;

  console.log(`  Deployer address: ${deployerAddr}`);
  console.log(`  Contract owner:   ${adminWallet}`);

  const RPC_URL = "https://base-sepolia-rpc.publicnode.com";
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const balance = await publicClient.getBalance({ address: deployerAddr });
  console.log(`  Deployer balance:  ${(Number(balance) / 1e18).toFixed(6)} ETH`);

  if (balance === 0n) {
    console.error("[ERROR] Deployer wallet has 0 ETH. Get test ETH from:");
    console.error("  https://www.alchemy.com/faucets/base-sepolia");
    process.exit(1);
  }
  if (balance < 100000000000000n) {
    // < 0.0001 ETH
    console.warn("  ⚠️  Balance is very low. Deployment may fail due to gas.");
  }

  const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
    account,
  });

  console.log("  Sending deployment transaction...");

  const deployHash = await walletClient.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
    account,
  });

  console.log(`  Tx hash: ${deployHash}`);
  console.log(`  Explorer: https://sepolia.basescan.org/tx/${deployHash}`);

  // --- Wait for receipt ---
  console.log("[STEP 4/5] Waiting for confirmation (Base Sepolia ~2-3 blocks)...");

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: deployHash,
    timeout: 120_000,
  });

  const contractAddress = receipt.contractAddress!;
  console.log(`  ✅ Contract deployed!`);
  console.log(`  Address: ${contractAddress}`);
  console.log(`  Block:   ${receipt.blockNumber}`);
  console.log(`  Gas used: ${receipt.gasUsed}`);
  console.log(`  Explorer: https://sepolia.basescan.org/address/${contractAddress}`);

  // --- Update .env ---
  console.log("[STEP 5/5] Updating .env with deployed address...");
  updateEnv("NEXT_PUBLIC_PLVTVS_SUBSCRIPTION_CONTRACT", contractAddress);

  console.log("\n═══════════════════════════════════════════════");
  console.log("  🎉 DEPLOYMENT COMPLETE");
  console.log(`  Contract: ${contractAddress}`);
  console.log(`  Owner:    ${adminWallet}`);
  console.log(`  Chain:    Base Sepolia (84532)`);
  console.log("═══════════════════════════════════════════════");
  console.log("\nNext steps:");
  console.log("  1. Verify on Basescan:");
  console.log(`     https://sepolia.basescan.org/address/${contractAddress}#code`);
  console.log("  2. Test subscription purchase from the app");
  console.log("  3. Commit updated .env to repo");
}

main().catch((e) => {
  console.error("\n[FATAL]", e.message);
  process.exit(1);
});
