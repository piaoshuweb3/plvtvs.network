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
 */

contract PlutusSubscription {
    address public contractOwner;

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

    modifier onlyOwner() {
        require(msg.sender == contractOwner, "PLVTVS: Caller is not the owner");
        _;
    }

    constructor() {
        contractOwner = msg.sender;

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

    receive() external payable {}
}
