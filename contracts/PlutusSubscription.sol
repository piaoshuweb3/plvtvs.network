// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PlutusSubscription
 * @dev PLVTVS.ONE — Decentralized subscription verification core.
 *
 * Designed for Base L2 (low gas, fast finality). Users purchase
 * time-based subscriptions by paying native ETH; the contract records
 * their expiry timestamp on-chain. The PLVTVS backend reads this state
 * to gate access to the dashboard, avatar deployment, and yield streams.
 *
 * Pricing tiers (configurable by owner):
 *   0 — 30 days   @ 0.005 ETH
 *   1 — 90 days   @ 0.012 ETH
 *   2 — 365 days  @ 0.04  ETH
 *
 * Compile with Solidity v0.8.20+ via Remix (https://remix.ethereum.org)
 * or solc. Deploy to Base Sepolia (chainId 84532) or Base Mainnet (8453).
 *
 * ─── Deployment Instructions ───
 *
 * 1. Open Remix IDE: https://remix.ethereum.org
 * 2. Create a new file `PlutusSubscription.sol` and paste this source.
 * 3. Compile: select compiler v0.8.20+ (Solidity tab → Compile).
 * 4. Deploy (MetaMask / injected provider):
 *    a. Switch MetaMask to Base Sepolia (chainId 84532).
 *       RPC: https://sepolia.base.org
 *       Explorer: https://sepolia.basescan.org
 *       Faucet: https://www.alchemy.com/faucets/base-sepolia
 *    b. In Remix "Deploy & Run" tab, set Environment = "Injected Provider".
 *    c. Select "PlutusSubscription" contract and click "Deploy".
 *    d. Confirm the MetaMask transaction (gas ≈ 0.0005 ETH on Sepolia).
 * 5. After deployment, copy the contract address and update .env:
 *    NEXT_PUBLIC_PLVTVS_SUBSCRIPTION_CONTRACT=0x<deployed_address>
 * 6. Optional: verify on Basescan via
 *    https://sepolia.basescan.org/verifyContract
 *
 * 7. For Base Mainnet (chainId 8453), repeat steps 4-6:
 *    RPC: https://mainnet.base.org
 *    Explorer: https://basescan.org
 *
 * Owner wallet (immutable after deploy unless transferOwnership is called):
 *   0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1
 */

contract PlutusSubscription {
    /// @notice Ultimate admin wallet — controls pricing, withdrawals, ownership
    address public contractOwner;

    /// @notice The wallet that actually deployed the contract (immutable, public record)
    address public immutable contractDeployer;

    struct PricingTier {
        uint256 duration; // subscription length in seconds
        uint256 price;    // price in wei
        bool isActive;    // can this tier be purchased
    }

    /// @notice User address => subscription expiry timestamp (seconds)
    mapping(address => uint256) public subscriptionExpiresAt;

    /// @notice Tier ID => tier config
    mapping(uint256 => PricingTier) public pricingTiers;
    uint256 public totalTiers;

    event Subscribed(address indexed user, uint256 tierId, uint256 newExpiryTimestamp, uint256 pricePaid);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event TierUpdated(uint256 indexed tierId, uint256 duration, uint256 price, bool isActive);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == contractOwner, "PLVTVS: Caller is not the owner");
        _;
    }

    constructor() {
        contractOwner = 0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1;
        contractDeployer = msg.sender;

        // Default tiers
        pricingTiers[0] = PricingTier(30 days, 0.005 ether, true);
        pricingTiers[1] = PricingTier(90 days, 0.012 ether, true);
        pricingTiers[2] = PricingTier(365 days, 0.04 ether, true);
        totalTiers = 3;
    }

    /// @notice Purchase or extend a subscription
    /// @param _tierId 0=monthly, 1=quarterly, 2=annual
    function purchaseSubscription(uint256 _tierId) external payable {
        require(_tierId < totalTiers, "PLVTVS: Invalid pricing tier");
        PricingTier memory tier = pricingTiers[_tierId];
        require(tier.isActive, "PLVTVS: This tier is currently disabled");
        require(msg.value >= tier.price, "PLVTVS: Insufficient ETH sent");

        uint256 currentExpiry = subscriptionExpiresAt[msg.sender];
        uint256 newExpiry;

        // Extend if still active, else start fresh from now
        if (currentExpiry > block.timestamp) {
            newExpiry = currentExpiry + tier.duration;
        } else {
            newExpiry = block.timestamp + tier.duration;
        }

        subscriptionExpiresAt[msg.sender] = newExpiry;

        // Refund overpayment
        if (msg.value > tier.price) {
            payable(msg.sender).transfer(msg.value - tier.price);
        }

        emit Subscribed(msg.sender, _tierId, newExpiry, tier.price);
    }

    /// @notice Core auth interface — is this wallet currently subscribed?
    function isSubscriptionActive(address _user) external view returns (bool isValid) {
        return subscriptionExpiresAt[_user] > block.timestamp;
    }

    /// @notice Remaining seconds of subscription (0 if expired)
    function getRemainingTime(address _user) external view returns (uint256) {
        if (subscriptionExpiresAt[_user] <= block.timestamp) {
            return 0;
        }
        return subscriptionExpiresAt[_user] - block.timestamp;
    }

    /// @notice Owner updates / adds a tier
    function setPricingTier(
        uint256 _tierId,
        uint256 _duration,
        uint256 _price,
        bool _isActive
    ) external onlyOwner {
        pricingTiers[_tierId] = PricingTier(_duration, _price, _isActive);
        if (_tierId >= totalTiers) {
            totalTiers = _tierId + 1;
        }
        emit TierUpdated(_tierId, _duration, _price, _isActive);
    }

    /// @notice Owner withdraws accumulated ETH
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "PLVTVS: No funds available");

        (bool success, ) = payable(contractOwner).call{value: balance}("");
        require(success, "PLVTVS: ETH Transfer failed");

        emit FundsWithdrawn(contractOwner, balance);
    }

    /// @notice Transfer contract ownership to a new wallet address
    /// @dev Only the current owner can call this. Emits OwnershipTransferred.
    /// @param newOwner The address to receive ownership of the contract
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "PLVTVS: New owner is the zero address");
        require(newOwner != contractOwner, "PLVTVS: New owner is the same as current");
        address oldOwner = contractOwner;
        contractOwner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    receive() external payable {}
}
