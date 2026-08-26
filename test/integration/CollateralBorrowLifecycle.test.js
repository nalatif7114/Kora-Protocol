const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Kora Protocol — Multi-Asset Collateral & Borrowing Lifecycle (Integration)", function () {
  let admin, alice, bob, treasury;
  let config, reserveManager, oracleManager, riskEngine, lendingPool, rateModel;
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

    // 6. Rate Model
    const KoraInterestRateModel = await ethers.getContractFactory("KoraInterestRateModel");
    rateModel = await KoraInterestRateModel.deploy(
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.02", 27),
      ethers.parseUnits("0.04", 27),
      ethers.parseUnits("0.75", 27)
    );
    await rateModel.waitForDeployment();

    // 7. Deploy Mock Tokens & Oracles
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
      ethers.parseUnits("0.05", 18)
    );
    await lendingPool.setInterestRateModel(await mockWETH.getAddress(), await rateModel.getAddress());

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
    await lendingPool.setInterestRateModel(await mockUSDC.getAddress(), await rateModel.getAddress());
  });

  it("completes full collateral deposit, borrow, safe partial withdrawal, and repayment workflow", async function () {
    const wethAddress = await mockWETH.getAddress();
    const usdcAddress = await mockUSDC.getAddress();

    // Step 1: Alice deposits 10 WETH ($30,000 USD collateral)
    await mockWETH.mint(alice.address, ethers.parseUnits("10", 18));
    await mockWETH.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(alice).supply(wethAddress, ethers.parseUnits("10", 18), alice.address);
    await lendingPool.connect(alice).setUserUseReserveAsCollateral(wethAddress, true);

    // Step 2: Bob deposits 100,000 USDC into pool
    await mockUSDC.mint(bob.address, ethers.parseUnits("100000", 6));
    await mockUSDC.connect(bob).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(bob).supply(usdcAddress, ethers.parseUnits("100000", 6), bob.address);

    // Step 3: Alice borrows 10,000 USDC ($10,000 USD debt)
    // 10 WETH = $30,000 collateral, $24,000 threshold, $10,000 debt -> HF = 2.40
    await lendingPool.connect(alice).borrow(usdcAddress, ethers.parseUnits("10000", 6), alice.address);

    let account = await lendingPool.getUserAccountData(alice.address);
    expect(account.healthFactor).to.be.closeTo(
      ethers.parseUnits("2.40", 18),
      ethers.parseUnits("0.001", 18)
    );

    // Step 4: Alice safely withdraws 2 WETH (leaving 8 WETH = $24,000 collateral, $19,200 threshold)
    // Post HF = $19,200 / $10,000 = 1.92 > 1.0 (Allowed)
    await lendingPool.connect(alice).withdraw(wethAddress, ethers.parseUnits("2", 18), alice.address);

    account = await lendingPool.getUserAccountData(alice.address);
    expect(account.healthFactor).to.be.closeTo(
      ethers.parseUnits("1.92", 18),
      ethers.parseUnits("0.001", 18)
    );

    // Step 5: Alice attempts to withdraw another 5 WETH (leaving only 3 WETH = $9,000 collateral, $7,200 threshold < $10k debt)
    // This drops HF < 1.0 and must revert
    await expect(
      lendingPool.connect(alice).withdraw(wethAddress, ethers.parseUnits("5", 18), alice.address)
    ).to.be.revertedWithCustomError(riskEngine, "HealthFactorBelowOne");

    // Step 6: Alice repays full USDC debt
    await mockUSDC.mint(alice.address, ethers.parseUnits("20000", 6));
    await mockUSDC.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(alice).repay(usdcAddress, ethers.MaxUint256, alice.address);

    account = await lendingPool.getUserAccountData(alice.address);
    expect(account.totalDebtUSD).to.equal(0n);
    expect(account.healthFactor).to.equal(ethers.MaxUint256);

    // Step 7: Alice can now withdraw all remaining 8 WETH
    await lendingPool.connect(alice).withdraw(wethAddress, ethers.MaxUint256, alice.address);
    expect(await lendingPool.getSupplyBalance(wethAddress, alice.address)).to.equal(0n);
  });
});
