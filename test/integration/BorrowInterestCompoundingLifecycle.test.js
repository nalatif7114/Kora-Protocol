const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Kora Protocol — Borrowing & Interest Accrual Lifecycle (Integration)", function () {
  let admin, supplier, borrower, treasury;
  let config, reserveManager, lendingPool, rateModel;
  let mockUSDC;

  const SECONDS_PER_YEAR = 31536000;

  beforeEach(async function () {
    [admin, supplier, borrower, treasury] = await ethers.getSigners();

    // 1. Deploy Config
    const KoraConfig = await ethers.getContractFactory("KoraConfig");
    config = await KoraConfig.deploy(admin.address, treasury.address);
    await config.waitForDeployment();

    // 2. Deploy ReserveManager
    const KoraReserveManager = await ethers.getContractFactory("KoraReserveManager");
    reserveManager = await KoraReserveManager.deploy(await config.getAddress());
    await reserveManager.waitForDeployment();

    // 3. Deploy LendingPool
    const KoraLendingPool = await ethers.getContractFactory("KoraLendingPool");
    lendingPool = await KoraLendingPool.deploy(
      await config.getAddress(),
      await reserveManager.getAddress()
    );
    await lendingPool.waitForDeployment();

    await reserveManager.setLendingPool(await lendingPool.getAddress());

    // 4. Rate Model (80% optimal, 2% base, 4% slope1, 75% slope2)
    const KoraInterestRateModel = await ethers.getContractFactory("KoraInterestRateModel");
    rateModel = await KoraInterestRateModel.deploy(
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.02", 27),
      ethers.parseUnits("0.04", 27),
      ethers.parseUnits("0.75", 27)
    );
    await rateModel.waitForDeployment();

    // 5. Deploy Mock USDC (6 decimals)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // 6. Initialize Reserve
    await lendingPool.initReserve(
      await mockUSDC.getAddress(),
      6,
      0,
      0,
      ethers.parseUnits("0.10", 18), // 10% reserve factor
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.85", 18),
      ethers.parseUnits("0.05", 18)
    );
    await lendingPool.setInterestRateModel(await mockUSDC.getAddress(), await rateModel.getAddress());

    // Supplier deposits 100,000 USDC
    const supplyAmount = ethers.parseUnits("100000", 6);
    await mockUSDC.mint(supplier.address, supplyAmount);
    await mockUSDC.connect(supplier).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(supplier).supply(await mockUSDC.getAddress(), supplyAmount, supplier.address);
  });

  it("executes borrow, 1-year interest compounding, and full repayment with accrued yield", async function () {
    const usdcAddress = await mockUSDC.getAddress();

    // Step 1: Borrower borrows 50,000 USDC (50% utilization)
    const borrowPrincipal = ethers.parseUnits("50000", 6);
    await lendingPool.connect(borrower).borrow(usdcAddress, borrowPrincipal, borrower.address);

    // Initial debt = ~50,000 USDC
    expect(await lendingPool.getDebtBalance(usdcAddress, borrower.address)).to.be.closeTo(
      borrowPrincipal,
      ethers.parseUnits("0.001", 6)
    );

    // Dynamic rate at U = 50%: 2% + (50/80)*4% = 4.5% APR (0.045e27)
    const initialReserveData = await lendingPool.getReserveData(usdcAddress);
    expect(initialReserveData.currentBorrowRate).to.be.closeTo(
      ethers.parseUnits("0.045", 27),
      ethers.parseUnits("0.00001", 27)
    );

    // Step 2: Fast forward 1 year in time
    const latestBlock = await ethers.provider.getBlock("latest");
    const targetTimestamp = latestBlock.timestamp + SECONDS_PER_YEAR;
    await ethers.provider.send("evm_setNextBlockTimestamp", [targetTimestamp]);
    await ethers.provider.send("evm_mine");

    // Step 3: Trigger index update
    await reserveManager.updateCumulativeIndexes(usdcAddress);

    const updatedReserve = await lendingPool.getReserveData(usdcAddress);
    // Borrow index should be ~1.045 RAY (4.5% interest)
    expect(updatedReserve.borrowIndex).to.be.closeTo(
      ethers.parseUnits("1.045", 27),
      ethers.parseUnits("0.0001", 27)
    );

    // Borrower's debt is now 50,000 * 1.045 = ~52,250 USDC
    const compoundedDebt = await lendingPool.getDebtBalance(usdcAddress, borrower.address);
    expect(compoundedDebt).to.be.closeTo(
      ethers.parseUnits("52250", 6),
      ethers.parseUnits("0.1", 6)
    );

    // Step 4: Borrower repays partial 20,000 USDC
    await mockUSDC.mint(borrower.address, ethers.parseUnits("100000", 6));
    await mockUSDC.connect(borrower).approve(await lendingPool.getAddress(), ethers.MaxUint256);

    const partialRepay = ethers.parseUnits("20000", 6);
    await lendingPool.connect(borrower).repay(usdcAddress, partialRepay, borrower.address);

    const remainingDebt = await lendingPool.getDebtBalance(usdcAddress, borrower.address);
    expect(remainingDebt).to.be.closeTo(
      ethers.parseUnits("32250", 6),
      ethers.parseUnits("0.5", 6)
    );

    // Step 5: Borrower repays full remaining debt
    await lendingPool.connect(borrower).repay(usdcAddress, ethers.MaxUint256, borrower.address);

    expect(await lendingPool.getDebtBalance(usdcAddress, borrower.address)).to.equal(0n);
    expect(await lendingPool.getTotalDebt(usdcAddress)).to.equal(0n);

    // Pool liquid cash is now 100k principal + all accrued interest from the borrower!
    const poolCash = await lendingPool.getAvailableLiquidity(usdcAddress);
    expect(poolCash).to.be.greaterThan(ethers.parseUnits("102200", 6));
  });
});
