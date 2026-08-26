const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Kora Protocol — End-to-End Liquidation Lifecycle (Integration)", function () {
  let admin, alice, bob, liquidator, treasury;
  let config, reserveManager, oracleManager, riskEngine, liquidationEngine, lendingPool;
  let mockWETH, mockUSDC, mockETHFeed, mockUSDCFeed;

  beforeEach(async function () {
    [admin, alice, bob, liquidator, treasury] = await ethers.getSigners();

    // 1. Deploy Config
    const KoraConfig = await ethers.getContractFactory("KoraConfig");
    config = await KoraConfig.deploy(admin.address, treasury.address);
    await config.waitForDeployment();

    // 2. Deploy ReserveManager
    const KoraReserveManager = await ethers.getContractFactory("KoraReserveManager");
    reserveManager = await KoraReserveManager.deploy(await config.getAddress());
    await reserveManager.waitForDeployment();

    // 3. Deploy OracleManager
    const KoraOracleManager = await ethers.getContractFactory("KoraOracleManager");
    oracleManager = await KoraOracleManager.deploy(await config.getAddress());
    await oracleManager.waitForDeployment();

    // 4. Deploy RiskEngine
    const KoraRiskEngine = await ethers.getContractFactory("KoraRiskEngine");
    riskEngine = await KoraRiskEngine.deploy(
      await reserveManager.getAddress(),
      await oracleManager.getAddress(),
      await config.getAddress()
    );
    await riskEngine.waitForDeployment();

    // 5. Deploy LiquidationEngine
    const KoraLiquidationEngine = await ethers.getContractFactory("KoraLiquidationEngine");
    liquidationEngine = await KoraLiquidationEngine.deploy(
      await reserveManager.getAddress(),
      await oracleManager.getAddress(),
      await riskEngine.getAddress(),
      await config.getAddress()
    );
    await liquidationEngine.waitForDeployment();

    // 6. Deploy LendingPool
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
    await lendingPool.initReserve(
      await mockWETH.getAddress(),
      18,
      0,
      0,
      ethers.parseUnits("0.10", 18),
      ethers.parseUnits("0.75", 18), // 75% LTV
      ethers.parseUnits("0.80", 18), // 80% LT
      ethers.parseUnits("0.05", 18)  // 5% Bonus
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
  });

  it("executes complete market drop, partial liquidation, collateral seizure with bonus, and restores solvency", async function () {
    const wethAddress = await mockWETH.getAddress();
    const usdcAddress = await mockUSDC.getAddress();

    // Step 1: Alice deposits 10 WETH ($30,000 USD collateral)
    await mockWETH.mint(alice.address, ethers.parseUnits("10", 18));
    await mockWETH.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(alice).supply(wethAddress, ethers.parseUnits("10", 18), alice.address);
    await lendingPool.connect(alice).setUserUseReserveAsCollateral(wethAddress, true);

    // Step 2: Bob deposits 100,000 USDC
    await mockUSDC.mint(bob.address, ethers.parseUnits("100000", 6));
    await mockUSDC.connect(bob).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(bob).supply(usdcAddress, ethers.parseUnits("100000", 6), bob.address);

    // Step 3: Alice borrows 20,000 USDC ($20k debt)
    await lendingPool.connect(alice).borrow(usdcAddress, ethers.parseUnits("20000", 6), alice.address);

    // Initial Alice state: HF = (10 * 3000 * 0.80) / 20000 = 24000 / 20000 = 1.20
    let account = await lendingPool.getUserAccountData(alice.address);
    expect(account.healthFactor).to.equal(ethers.parseUnits("1.20", 18));

    // Step 4: Market Crash — ETH price drops from $3,000 to $2,400 (-20%)
    await mockETHFeed.updateAnswer(2400n * 10n ** 8n);

    // Alice new state: Collateral = $24,000, Threshold = $19,200, Debt = $20,000
    // HF = 19,200 / 20,000 = 0.96 < 1.0 (Liquidatable under 50% close factor)
    account = await lendingPool.getUserAccountData(alice.address);
    expect(account.healthFactor).to.equal(ethers.parseUnits("0.96", 18));

    // Step 5: Liquidator prepares funds
    await mockUSDC.mint(liquidator.address, ethers.parseUnits("50000", 6));
    await mockUSDC.connect(liquidator).approve(await lendingPool.getAddress(), ethers.MaxUint256);

    const liquidatorWethBefore = await mockWETH.balanceOf(liquidator.address);
    const liquidatorUsdcBefore = await mockUSDC.balanceOf(liquidator.address);

    // Step 6: Liquidator executes liquidationCall
    // Repays 50% of debt = 10,000 USDC
    // Seizes: $10,000 * 1.05 / $2,400 = $10,500 / $2,400 = 4.375 WETH
    const tx = await lendingPool.connect(liquidator).liquidationCall(
      wethAddress,
      usdcAddress,
      alice.address,
      ethers.MaxUint256,
      liquidator.address
    );

    await expect(tx)
      .to.emit(lendingPool, "LiquidationCall")
      .withArgs(
        wethAddress,
        usdcAddress,
        alice.address,
        ethers.parseUnits("10000", 6),
        ethers.parseUnits("4.375", 18),
        liquidator.address,
        false // Not extreme (HF was 0.96 >= 0.95)
      );

    // Verify Liquidator balances
    const liquidatorWethAfter = await mockWETH.balanceOf(liquidator.address);
    const liquidatorUsdcAfter = await mockUSDC.balanceOf(liquidator.address);

    expect(liquidatorUsdcBefore - liquidatorUsdcAfter).to.equal(ethers.parseUnits("10000", 6));
    expect(liquidatorWethAfter - liquidatorWethBefore).to.equal(ethers.parseUnits("4.375", 18));

    // Step 7: Verify Alice's restored account health
    // Remaining Debt = 10,000 USDC
    // Remaining Collateral = 10 - 4.375 = 5.625 WETH = $13,500 USD
    // Weighted Threshold = $13,500 * 0.80 = $10,800 USD
    // Restored HF = $10,800 / $10,000 = 1.08 > 1.0 (SOLVENT!)
    const aliceFinalAccount = await lendingPool.getUserAccountData(alice.address);
    expect(aliceFinalAccount.totalDebtUSD).to.equal(ethers.parseUnits("10000", 18));
    expect(aliceFinalAccount.totalCollateralUSD).to.equal(ethers.parseUnits("13500", 18));
    expect(aliceFinalAccount.healthFactor).to.equal(ethers.parseUnits("1.08", 18));
  });
});
