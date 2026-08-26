const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Kora Protocol — Liquidation Solvency & Health Invariants", function () {
  let admin, borrower, liquidator, supplier, treasury;
  let config, reserveManager, oracleManager, riskEngine, liquidationEngine, lendingPool;
  let mockWETH, mockUSDC, mockETHFeed, mockUSDCFeed;

  beforeEach(async function () {
    [admin, borrower, liquidator, supplier, treasury] = await ethers.getSigners();

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

    // 7. Mock Tokens & Feeds
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockWETH = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    await mockWETH.waitForDeployment();

    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    const MockAggregatorV3 = await ethers.getContractFactory("MockAggregatorV3");
    mockETHFeed = await MockAggregatorV3.deploy(8, "ETH / USD", 3000n * 10n ** 8n);
    await mockETHFeed.waitForDeployment();
    mockUSDCFeed = await MockAggregatorV3.deploy(8, "USDC / USD", 1n * 10n ** 8n);
    await mockUSDCFeed.waitForDeployment();

    await oracleManager.connect(admin).setAssetSource(await mockWETH.getAddress(), await mockETHFeed.getAddress(), 3600);
    await oracleManager.connect(admin).setAssetSource(await mockUSDC.getAddress(), await mockUSDCFeed.getAddress(), 3600);

    // 8. Initialize Reserves
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

    // Initial deposits
    await mockUSDC.mint(supplier.address, ethers.parseUnits("500000", 6));
    await mockUSDC.connect(supplier).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(supplier).supply(await mockUSDC.getAddress(), ethers.parseUnits("500000", 6), supplier.address);

    await mockWETH.mint(borrower.address, ethers.parseUnits("10", 18));
    await mockWETH.connect(borrower).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(borrower).supply(await mockWETH.getAddress(), ethers.parseUnits("10", 18), borrower.address);
    await lendingPool.connect(borrower).setUserUseReserveAsCollateral(await mockWETH.getAddress(), true);

    await mockUSDC.mint(liquidator.address, ethers.parseUnits("100000", 6));
    await mockUSDC.connect(liquidator).approve(await lendingPool.getAddress(), ethers.MaxUint256);
  });

  it("Invariant 1: Healthy positions (HF >= 1.0) can never be liquidated", async function () {
    const wethAddress = await mockWETH.getAddress();
    const usdcAddress = await mockUSDC.getAddress();

    // Borrower borrows 10k USDC ($30k collateral, $10k debt -> HF = 2.40)
    await lendingPool.connect(borrower).borrow(usdcAddress, ethers.parseUnits("10000", 6), borrower.address);

    await expect(
      lendingPool.connect(liquidator).liquidationCall(
        wethAddress,
        usdcAddress,
        borrower.address,
        ethers.MaxUint256,
        liquidator.address
      )
    ).to.be.revertedWithCustomError(liquidationEngine, "HealthFactorNotLiquidatable");
  });

  it("Invariant 2 & 3: Liquidation strictly decreases debt and strictly increases Health Factor", async function () {
    const wethAddress = await mockWETH.getAddress();
    const usdcAddress = await mockUSDC.getAddress();

    // Borrower borrows 22k USDC ($30k collateral, $22k debt -> HF = 1.09)
    await lendingPool.connect(borrower).borrow(usdcAddress, ethers.parseUnits("22000", 6), borrower.address);

    // Price crash: ETH drops to $2,500 ($25k collateral, $20k threshold, $22k debt -> HF = 20k/22k = 0.9090 < 0.95 Extreme!)
    await mockETHFeed.updateAnswer(2500n * 10n ** 8n);

    const preLiqAccount = await lendingPool.getUserAccountData(borrower.address);
    expect(preLiqAccount.healthFactor).to.be.lessThan(ethers.parseUnits("1", 18));

    // Execute full liquidation
    await lendingPool.connect(liquidator).liquidationCall(
      wethAddress,
      usdcAddress,
      borrower.address,
      ethers.MaxUint256,
      liquidator.address
    );

    const postLiqAccount = await lendingPool.getUserAccountData(borrower.address);

    // Invariant: Post-liquidation debt is strictly less than pre-liquidation debt
    expect(postLiqAccount.totalDebtUSD).to.be.lessThan(preLiqAccount.totalDebtUSD);

    // Invariant: Post-liquidation Health Factor is strictly greater than pre-liquidation Health Factor
    expect(postLiqAccount.healthFactor).to.be.greaterThan(preLiqAccount.healthFactor);
  });
});
