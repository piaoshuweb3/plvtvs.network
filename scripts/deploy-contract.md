# PlutusSubscription — Deploy Guide

How to deploy `contracts/PlutusSubscription.sol` to Base Sepolia (testnet) using **Remix IDE**.

## Prerequisites

- [MetaMask](https://metamask.io/) browser extension installed
- A wallet with **Base Sepolia ETH** (free — see below)

---

## 1. Get Base Sepolia Test ETH

| Faucet | Link |
|--------|------|
| Alchemy Base Sepolia Faucet | https://www.alchemy.com/faucets/base-sepolia |
| Coinbase Faucet (if you have a Coinbase account) | https://www.coinbase.com/faucets/base-sepolia-faucet |
| Bware Labs Faucet | https://bwarelabs.com/faucets/base-sepolia |

You'll need ~0.0005 ETH for the deploy. 0.01 ETH is plenty.

## 2. Add Base Sepolia to MetaMask

If you don't already have Base Sepolia in your network list:

| Field | Value |
|-------|-------|
| Network Name | Base Sepolia |
| RPC URL | https://sepolia.base.org |
| Chain ID | 84532 |
| Currency Symbol | ETH |
| Block Explorer | https://sepolia.basescan.org |

Or use [Chainlist](https://chainlist.org/?search=base+sepolia) to add it with one click.

## 3. Deploy with Remix IDE

### 3.1 Open Remix

Go to https://remix.ethereum.org

### 3.2 Create the contract file

1. In the **File Explorer** (left sidebar), right-click the `contracts` folder → **New File**
2. Name it `PlutusSubscription.sol`
3. Copy the entire contents of `contracts/PlutusSubscription.sol` from this repo and paste
4. Save (Ctrl+S)

### 3.3 Compile

1. Open the **Solidity Compiler** tab (icon: 🏗️)
2. Select compiler version **0.8.20** or higher
3. Click **Compile PlutusSubscription.sol**
4. You should see a green checkmark — no errors

### 3.4 Deploy

1. Open the **Deploy & Run Transactions** tab (icon: ⚡)
2. Set **Environment** to **"Injected Provider - MetaMask"**
3. MetaMask will pop up — confirm the connection
4. Make sure MetaMask is on **Base Sepolia** network
5. Under **Contract**, select `PlutusSubscription`
6. Click **Deploy** (orange button)
7. MetaMask will prompt you to confirm the transaction — **Confirm**

### 3.5 Get the deployed address

After the transaction confirms:

1. In Remix, scroll to **Deployed Contracts** at the bottom of the Deploy tab
2. Click the copy icon 📋 next to the deployed contract address
3. **It will look like:** `0x...` (42 characters)

## 4. Update .env

In the project root `.env`, replace the placeholder:

```bash
# Before:
NEXT_PUBLIC_PLVTVS_SUBSCRIPTION_CONTRACT=0x0000000000000000000000000000000000000000

# After (example):
NEXT_PUBLIC_PLVTVS_SUBSCRIPTION_CONTRACT=0xa1B2c3D4e5F6789012345678901234567890abcd
```

## 5. Verify Contract (Optional but Recommended)

### 5.1 Flatten the source

In Remix, right-click `PlutusSubscription.sol` → **Flatten**. Save the flattened output.

### 5.2 Verify on Basescan

1. Go to https://sepolia.basescan.org/address/YOUR_DEPLOYED_ADDRESS
2. Click the **Contract** tab
3. Click **Verify and Publish**
4. Fill in:
   - **Compiler Type:** Solidity (Single File)
   - **Compiler Version:** v0.8.20 (or whatever you compiled with)
   - **License:** MIT
5. Paste the **flattened** source code
6. Click **Verify and Publish**

Once verified, anyone can read the contract on Basescan and interact with it directly.

## 6. Quick Test After Deploy

In Remix's **Deployed Contracts** panel, you can interact with the deployed contract:

1. **Check owner:** call `contractOwner` → should return `0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1`
2. **Check deployer:** call `contractDeployer` → should return your deploy wallet
3. **Check tiers:** call `pricingTiers` with `0`, `1`, `2`
4. **Purchase (test):** switch to a different wallet in MetaMask → call `purchaseSubscription` with tier `0` and value `0.005 ETH`

## Deploying to Base Mainnet

When ready for production, repeat steps 3-5 with:

| Field | Value |
|-------|-------|
| Network | Base Mainnet |
| Chain ID | 8453 |
| RPC | https://mainnet.base.org |
| Explorer | https://basescan.org |

Then update `.env`:
```bash
NEXT_PUBLIC_PLVTVS_SUBSCRIPTION_CONTRACT=0x<mainnet_address>
NEXT_PUBLIC_BASE_CHAIN=base
```

Reminder: Mainnet deployment costs **real ETH**. Gas is low on Base (~$0.01–$0.10), but still real money.

---

**Last updated:** 2026-06-27
