const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KoraLiquidationEngine (Unit Tests)", function () {
  let admin, alice, bob, liquidator, treasury;
  let config, reserveManager, oracleManager, riskEngine, liquidationEngine, lendingPool;
  let mockWETH, mockUSDC, mockETHFeed, mockUSDCFeed;

  beforeEach(async function () {
    [admin, alice, bob, liquidator, treasury] = await ethers.getSigners();

    // 1. Config
    const KoraConfig = await ethers.getContractFactory("KoraConfig");
    config = await KoraConfig.deploy(admin.address, treasury.address);
    await config.waitForDeployment();

    // 2. ReserveManager
    const KoraReserveManager = await ethers.getContractFactory("KoraReserveManager");
    reserveManager = await KoraReserveManager.deploy(await config.getAddress());
    await reserveManager.waitForDeployment();

    // 3. OracleManager
    const KoraOracleManager = await ethers.getContractFactory("KoraOracleManager");
    oracleManager = await KoraOracleManager.deploy(await config.getAddress());
    await oracleManager.waitForDeployment();

    // 4. RiskEngine
    const KoraRiskEngine = await ethers.getContractFactory("KoraRiskEngine");
    riskEngine = await KoraRiskEngine.deploy(
      await reserveManager.getAddress(),
      await oracleManager.getAddress(),
      await config.getAddress()
    );
    await riskEngine.waitForDeployment();

    // 5. LiquidationEngine
    const KoraLiquidationEngine = await ethers.getContractFactory("KoraLiquidationEngine");
    liquidationEngine = await KoraLiquidationEngine.deploy(
      await reserveManager.getAddress(),
      await oracleManager.getAddress(),
      await riskEngine.getAddress(),
      await config.getAddress()
    );
    await liquidationEngine.waitForDeployment();

    // 6. LendingPool
    const KoraLendingPool = await ethers.getContractFactory("KoraLendingPool");
    lendingPool = await KoraLendingPool.deploy(
      await config.getAddress(),
      await reserveManager.getAddress()
    );
    await lendingPool.waitForDeployment();

    await reserveManager.setLendingPool(await lendingPool.getAddress());
    await lendingPool.setRiskEngine(await riskEngine.getAddress());
    await lendingPool.setLiquidationEngine(await liquidationEngine.getAddress());
    await riskEngine.setLendingPool(await lendingPool.getAddress());

    // 7. Mock Tokens & Oracles
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockWETH = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    await mockWETH.waitForDeployment();

    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    const MockAggregatorV3 = await ethers.getContractFactory("MockAggregatorV3");
    // WETH = $3,000, USDC = $1.00
    mockETHFeed = await MockAggregatorV3.deploy(8, "ETH / USD", 3000n * 10n ** 8n);
    await mockETHFeed.waitForDeployment();
    mockUSDCFeed = await MockAggregatorV3.deploy(8, "USDC / USD", 1n * 10n ** 8n);
    await mockUSDCFeed.waitForDeployment();

    await oracleManager.connect(admin).setAssetSource(await mockWETH.getAddress(), await mockETHFeed.getAddress(), 3600);
    await oracleManager.connect(admin).setAssetSource(await mockUSDC.getAddress(), await mockUSDCFeed.getAddress(), 3600);

    // 8. Initialize Reserves
    // WETH: 75% LTV, 80% LT, 5% bonus
    await lendingPool.initReserve(
      await mockWETH.getAddress(),
      18,
      0,
      0,
      ethers.parseUnits("0.10", 18),
      ethers.parseUnits("0.75", 18),
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.05", 18)
    );

    // USDC: 80% LTV, 85% LT
    await lendingPool.initReserve(
      await mockUSDC.getAddress(),
      6,
      0,
      0,
      ethers.parseUnits("0.10", 18),
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.85", 18),
      ethers.parseUnits("0.05", 18)
    );
  });

  describe("Liquidation Eligibility & Calculations", function () {
    it("reverts liquidation calculation on healthy account (HF >= 1.0)", async function () {
      const wethAddress = await mockWETH.getAddress();
      const usdcAddress = await mockUSDC.getAddress();

      // Alice deposits 10 WETH ($30k collateral), borrows 10k USDC -> HF = 2.40
      await mockWETH.mint(alice.address, ethers.parseUnits("10", 18));
      await mockWETH.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(alice).supply(wethAddress, ethers.parseUnits("10", 18), alice.address);
      await lendingPool.connect(alice).setUserUseReserveAsCollateral(wethAddress, true);

      await mockUSDC.mint(bob.address, ethers.parseUnits("100000", 6));
      await mockUSDC.connect(bob).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(bob).supply(usdcAddress, ethers.parseUnits("100000", 6), bob.address);

      await lendingPool.connect(alice).borrow(usdcAddress, ethers.parseUnits("10000", 6), alice.address);

      await expect(
        liquidationEngine.calculateLiquidationOpportunity(wethAddress, usdcAddress, alice.address, 1000)
      ).to.be.revertedWithCustomError(liquidationEngine, "HealthFactorNotLiquidatable");
    });

    it("applies 50% close factor for moderately unhealthy position (0.95 <= HF < 1.0)", async function () {
      const wethAddress = await mockWETH.getAddress();
      const usdcAddress = await mockUSDC.getAddress();

      // Alice deposits 10 WETH ($30k), borrows 22,000 USDC ($22k debt). Initial HF = 24k / 22k = 1.09
      await mockWETH.mint(alice.address, ethers.parseUnits("10", 18));
      await mockWETH.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(alice).supply(wethAddress, ethers.parseUnits("10", 18), alice.address);
      await lendingPool.connect(alice).setUserUseReserveAsCollateral(wethAddress, true);

      await mockUSDC.mint(bob.address, ethers.parseUnits("100000", 6));
      await mockUSDC.connect(bob).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(bob).supply(usdcAddress, ethers.parseUnits("100000", 6), bob.address);

      await lendingPool.connect(alice).borrow(usdcAddress, ethers.parseUnits("22000", 6), alice.address);

      // Price drops: WETH from $3,000 to $2,700
      // Collateral = $27,000, Threshold = $21,600, Debt = $22,000 -> HF = 21,600 / 22,000 = 0.9818 (Between 0.95 and 1.0)
      await mockETHFeed.updateAnswer(2700n * 10n ** 8n);

      const opportunity = await liquidationEngine.calculateLiquidationOpportunity(
        wethAddress,
        usdcAddress,
        alice.address,
        ethers.MaxUint256
      );

      // Applicable close factor = 50% (0.50 WAD)
      expect(opportunity.applicableCloseFactor).to.equal(ethers.parseUnits("0.50", 18));
      // Max repayable debt = 22,000 * 50% = 11,000 USDC
      expect(opportunity.actualDebtToCover).to.equal(ethers.parseUnits("11000", 6));
      expect(opportunity.liquidationBonus).to.equal(ethers.parseUnits("0.05", 18));

      // Seized WETH: $11,000 * 1.05 / $2,700 = $11,550 / 2700 = 4.277777777777777777 WETH
      expect(opportunity.collateralToSeize).to.be.closeTo(
        ethers.parseUnits("4.277777777777777777", 18),
        ethers.parseUnits("0.0001", 18)
      );
    });

    it("applies 100% close factor for severely unhealthy position (HF < 0.95)", async function () {
      const wethAddress = await mockWETH.getAddress();
      const usdcAddress = await mockUSDC.getAddress();

      // Alice deposits 10 WETH, borrows 22,000 USDC
      await mockWETH.mint(alice.address, ethers.parseUnits("10", 18));
      await mockWETH.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(alice).supply(wethAddress, ethers.parseUnits("10", 18), alice.address);
      await lendingPool.connect(alice).setUserUseReserveAsCollateral(wethAddress, true);

      await mockUSDC.mint(bob.address, ethers.parseUnits("100000", 6));
      await mockUSDC.connect(bob).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(bob).supply(usdcAddress, ethers.parseUnits("100000", 6), bob.address);

      await lendingPool.connect(alice).borrow(usdcAddress, ethers.parseUnits("22000", 6), alice.address);

      // Severe price crash: WETH drops to $2,300
      // Collateral = $23,000, Threshold = $18,400, Debt = $22,000 -> HF = 18,400 / 22,000 = 0.8363 < 0.95
      await mockETHFeed.updateAnswer(2300n * 10n ** 8n);

      const opportunity = await liquidationEngine.calculateLiquidationOpportunity(
        wethAddress,
        usdcAddress,
        alice.address,
        ethers.MaxUint256
      );

      // Extreme close factor = 100% (1.00 WAD)
      expect(opportunity.applicableCloseFactor).to.equal(ethers.parseUnits("1.00", 18));
      // Max repayable debt = full 22,000 USDC
      expect(opportunity.actualDebtToCover).to.equal(ethers.parseUnits("22000", 6));
    });
  });
});
