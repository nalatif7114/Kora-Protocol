const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KoraRiskEngine (Unit Tests)", function () {
  let admin, alice, bob, treasury;
  let config, reserveManager, oracleManager, riskEngine, lendingPool;
  let mockWETH, mockUSDC, mockETHFeed, mockUSDCFeed;

  beforeEach(async function () {
    [admin, alice, bob, treasury] = await ethers.getSigners();

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

    // 5. LendingPool
    const KoraLendingPool = await ethers.getContractFactory("KoraLendingPool");
    lendingPool = await KoraLendingPool.deploy(
      await config.getAddress(),
      await reserveManager.getAddress()
    );
    await lendingPool.waitForDeployment();

    await reserveManager.setLendingPool(await lendingPool.getAddress());
    await lendingPool.setRiskEngine(await riskEngine.getAddress());
    await riskEngine.setLendingPool(await lendingPool.getAddress());

    // 6. Deploy Mock Tokens & Oracles
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

    // 7. Initialize Reserves
    // WETH: 75% LTV, 80% Liquidation Threshold, 5% Bonus
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

    // USDC: 80% LTV, 85% Liquidation Threshold
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

  describe("Account Liquidity & Health Factor Computation", function () {
    it("returns infinite health factor (max uint256) when user has zero debt", async function () {
      const accountData = await riskEngine.getUserAccountData(alice.address);
      expect(accountData.totalDebtUSD).to.equal(0n);
      expect(accountData.healthFactor).to.equal(ethers.MaxUint256);
    });

    it("evaluates collateral, borrowing capacity, and health factor accurately", async function () {
      const wethAddress = await mockWETH.getAddress();
      const usdcAddress = await mockUSDC.getAddress();

      // Alice deposits 10 WETH ($3,000 * 10 = $30,000 USD)
      const depositWETH = ethers.parseUnits("10", 18);
      await mockWETH.mint(alice.address, depositWETH);
      await mockWETH.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(alice).supply(wethAddress, depositWETH, alice.address);

      // Enable WETH as collateral
      await riskEngine.connect(alice).setUserUseReserveAsCollateral(wethAddress, alice.address, true);

      // Total Collateral = $30,000 USD
      // Available Borrows (75% LTV) = $30,000 * 0.75 = $22,500 USD
      // Weighted Liquidation Threshold (80%) = $30,000 * 0.80 = $24,000 USD
      let data = await riskEngine.getUserAccountData(alice.address);
      expect(data.totalCollateralUSD).to.equal(ethers.parseUnits("30000", 18));
      expect(data.availableBorrowsUSD).to.equal(ethers.parseUnits("22500", 18));
      expect(data.ltv).to.equal(ethers.parseUnits("0.75", 18));
      expect(data.currentLiquidationThreshold).to.equal(ethers.parseUnits("0.80", 18));
      expect(data.healthFactor).to.equal(ethers.MaxUint256);

      // Bob deposits 100k USDC so there is liquidity to borrow
      await mockUSDC.mint(bob.address, ethers.parseUnits("100000", 6));
      await mockUSDC.connect(bob).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(bob).supply(usdcAddress, ethers.parseUnits("100000", 6), bob.address);

      // Alice borrows 15,000 USDC ($15,000 USD debt)
      const borrowAmount = ethers.parseUnits("15000", 6);
      await lendingPool.connect(alice).borrow(usdcAddress, borrowAmount, alice.address);

      // Post-borrow state:
      // Total Debt = $15,000 USD
      // Available Borrows = $22,500 - $15,000 = $7,500 USD
      // Health Factor = $24,000 / $15,000 = 1.60 WAD
      data = await riskEngine.getUserAccountData(alice.address);
      expect(data.totalDebtUSD).to.equal(ethers.parseUnits("15000", 18));
      expect(data.availableBorrowsUSD).to.equal(ethers.parseUnits("7500", 18));
      expect(data.healthFactor).to.equal(ethers.parseUnits("1.60", 18));
    });

    it("reverts borrow when requested amount exceeds available collateral borrowing power", async function () {
      const wethAddress = await mockWETH.getAddress();
      const usdcAddress = await mockUSDC.getAddress();

      // Alice deposits 10 WETH ($30,000 USD) -> Max borrow $22,500
      await mockWETH.mint(alice.address, ethers.parseUnits("10", 18));
      await mockWETH.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(alice).supply(wethAddress, ethers.parseUnits("10", 18), alice.address);
      await riskEngine.connect(alice).setUserUseReserveAsCollateral(wethAddress, alice.address, true);

      // Bob deposits liquidity
      await mockUSDC.mint(bob.address, ethers.parseUnits("100000", 6));
      await mockUSDC.connect(bob).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(bob).supply(usdcAddress, ethers.parseUnits("100000", 6), bob.address);

      // Alice attempts to borrow $22,501 USDC (exceeds $22,500)
      const excessiveBorrow = ethers.parseUnits("22501", 6);
      await expect(
        lendingPool.connect(alice).borrow(usdcAddress, excessiveBorrow, alice.address)
      ).to.be.revertedWithCustomError(riskEngine, "InsufficientCollateral");
    });
  });

  describe("Collateral Toggles & Withdrawal Protection", function () {
    it("reverts disabling collateral if active debt causes health factor to fall below 1.0", async function () {
      const wethAddress = await mockWETH.getAddress();
      const usdcAddress = await mockUSDC.getAddress();

      // Alice deposits 10 WETH, borrows 15,000 USDC
      await mockWETH.mint(alice.address, ethers.parseUnits("10", 18));
      await mockWETH.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(alice).supply(wethAddress, ethers.parseUnits("10", 18), alice.address);
      await riskEngine.connect(alice).setUserUseReserveAsCollateral(wethAddress, alice.address, true);

      await mockUSDC.mint(bob.address, ethers.parseUnits("100000", 6));
      await mockUSDC.connect(bob).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(bob).supply(usdcAddress, ethers.parseUnits("100000", 6), bob.address);

      await lendingPool.connect(alice).borrow(usdcAddress, ethers.parseUnits("15000", 6), alice.address);

      // Alice attempts to disable WETH collateral while holding $15k debt
      await expect(
        riskEngine.connect(alice).setUserUseReserveAsCollateral(wethAddress, alice.address, false)
      ).to.be.revertedWithCustomError(riskEngine, "CannotDisableCollateral");
    });

    it("reverts collateral withdrawal that would drop health factor below 1.0", async function () {
      const wethAddress = await mockWETH.getAddress();
      const usdcAddress = await mockUSDC.getAddress();

      // 10 WETH ($30k collateral, $24k threshold), $15k debt -> HF = 1.60
      await mockWETH.mint(alice.address, ethers.parseUnits("10", 18));
      await mockWETH.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(alice).supply(wethAddress, ethers.parseUnits("10", 18), alice.address);
      await riskEngine.connect(alice).setUserUseReserveAsCollateral(wethAddress, alice.address, true);

      await mockUSDC.mint(bob.address, ethers.parseUnits("100000", 6));
      await mockUSDC.connect(bob).approve(await lendingPool.getAddress(), ethers.MaxUint256);
      await lendingPool.connect(bob).supply(usdcAddress, ethers.parseUnits("100000", 6), bob.address);

      await lendingPool.connect(alice).borrow(usdcAddress, ethers.parseUnits("15000", 6), alice.address);

      // If Alice withdraws 5 WETH ($15k remaining collateral, $12k threshold), HF = 12k / 15k = 0.80 < 1.0 -> Reverts!
      await expect(
        lendingPool.connect(alice).withdraw(wethAddress, ethers.parseUnits("5", 18), alice.address)
      ).to.be.revertedWithCustomError(riskEngine, "HealthFactorBelowOne");
    });
  });
});
