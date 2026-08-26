const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KoraOracleManager (Unit Tests)", function () {
  let admin, user, treasury;
  let config, oracleManager;
  let mockETHFeed, mockUSDCFeed, mockBTCFeed, mockToken;

  beforeEach(async function () {
    [admin, user, treasury] = await ethers.getSigners();

    // 1. Deploy Config
    const KoraConfig = await ethers.getContractFactory("KoraConfig");
    config = await KoraConfig.deploy(admin.address, treasury.address);
    await config.waitForDeployment();

    // 2. Deploy OracleManager
    const KoraOracleManager = await ethers.getContractFactory("KoraOracleManager");
    oracleManager = await KoraOracleManager.deploy(await config.getAddress());
    await oracleManager.waitForDeployment();

    // 3. Deploy Mock Aggregators (8 decimals standard Chainlink feeds)
    const MockAggregatorV3 = await ethers.getContractFactory("MockAggregatorV3");
    // ETH = $3,000 (8 decimals)
    mockETHFeed = await MockAggregatorV3.deploy(8, "ETH / USD", 3000n * 10n ** 8n);
    await mockETHFeed.waitForDeployment();

    // USDC = $1.00 (8 decimals)
    mockUSDCFeed = await MockAggregatorV3.deploy(8, "USDC / USD", 1n * 10n ** 8n);
    await mockUSDCFeed.waitForDeployment();

    // BTC = $60,000 (8 decimals)
    mockBTCFeed = await MockAggregatorV3.deploy(8, "BTC / USD", 60000n * 10n ** 8n);
    await mockBTCFeed.waitForDeployment();

    // Mock token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Test", "TST", 18);
    await mockToken.waitForDeployment();
  });

  describe("Price Feed Registration & Normalization", function () {
    it("registers 8-decimal feed and normalizes price to 18-decimal USD base unit", async function () {
      const tokenAddress = await mockToken.getAddress();
      const feedAddress = await mockETHFeed.getAddress();
      const maxStaleness = 3600; // 1 hour

      await expect(oracleManager.connect(admin).setAssetSource(tokenAddress, feedAddress, maxStaleness))
        .to.emit(oracleManager, "AssetSourceUpdated")
        .withArgs(tokenAddress, feedAddress, maxStaleness);

      const price = await oracleManager.getAssetPrice(tokenAddress);
      // Normalized price: 3000 * 10^18
      expect(price).to.equal(ethers.parseUnits("3000", 18));
    });

    it("normalizes $1.00 USDC price to exactly 1e18 WAD", async function () {
      const tokenAddress = await mockToken.getAddress();
      await oracleManager.connect(admin).setAssetSource(tokenAddress, await mockUSDCFeed.getAddress(), 3600);

      const price = await oracleManager.getAssetPrice(tokenAddress);
      expect(price).to.equal(ethers.parseUnits("1", 18));
    });

    it("reverts registration when caller is unauthorized", async function () {
      const tokenAddress = await mockToken.getAddress();
      await expect(
        oracleManager.connect(user).setAssetSource(tokenAddress, await mockETHFeed.getAddress(), 3600)
      ).to.be.revertedWithCustomError(oracleManager, "Unauthorized");
    });
  });

  describe("Staleness & Safety Validations", function () {
    it("reverts on unconfigured asset feed", async function () {
      const unconfigured = ethers.Wallet.createRandom().address;
      await expect(oracleManager.getAssetPrice(unconfigured)).to.be.revertedWithCustomError(
        oracleManager,
        "FeedNotConfigured"
      );
    });

    it("reverts on non-positive price (<= 0)", async function () {
      const tokenAddress = await mockToken.getAddress();
      await oracleManager.connect(admin).setAssetSource(tokenAddress, await mockETHFeed.getAddress(), 3600);

      await mockETHFeed.updateAnswer(0n);
      await expect(oracleManager.getAssetPrice(tokenAddress)).to.be.revertedWithCustomError(
        oracleManager,
        "InvalidPrice"
      );

      await mockETHFeed.updateAnswer(-100n);
      await expect(oracleManager.getAssetPrice(tokenAddress)).to.be.revertedWithCustomError(
        oracleManager,
        "InvalidPrice"
      );
    });

    it("reverts when price update timestamp exceeds max allowable staleness window", async function () {
      const tokenAddress = await mockToken.getAddress();
      const maxStaleness = 1800; // 30 minutes
      await oracleManager.connect(admin).setAssetSource(tokenAddress, await mockETHFeed.getAddress(), maxStaleness);

      // Advance time by 40 minutes (2400s)
      await ethers.provider.send("evm_increaseTime", [2400]);
      await ethers.provider.send("evm_mine");

      await expect(oracleManager.getAssetPrice(tokenAddress)).to.be.revertedWithCustomError(
        oracleManager,
        "StalePrice"
      );
    });

    it("reverts on stale round data (answeredInRound < roundId)", async function () {
      const tokenAddress = await mockToken.getAddress();
      await oracleManager.connect(admin).setAssetSource(tokenAddress, await mockETHFeed.getAddress(), 3600);

      const latestBlock = await ethers.provider.getBlock("latest");
      // Round 5, answered in round 4
      await mockETHFeed.updateRoundData(5, 3000n * 10n ** 8n, latestBlock.timestamp, 4);

      await expect(oracleManager.getAssetPrice(tokenAddress)).to.be.revertedWithCustomError(
        oracleManager,
        "StaleRound"
      );
    });
  });
});
