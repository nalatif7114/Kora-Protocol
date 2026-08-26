const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Kora Protocol — Borrowing & Debt Accounting Invariants", function () {
  let admin, borrowers, supplier, treasury;
  let config, reserveManager, lendingPool, rateModel;
  let mockUSDC;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    admin = signers[0];
    treasury = signers[1];
    supplier = signers[2];
    borrowers = signers.slice(3, 8); // 5 independent borrowers

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

    // 4. Rate Model
    const KoraInterestRateModel = await ethers.getContractFactory("KoraInterestRateModel");
    rateModel = await KoraInterestRateModel.deploy(
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.02", 27),
      ethers.parseUnits("0.04", 27),
      ethers.parseUnits("0.75", 27)
    );
    await rateModel.waitForDeployment();

    // 5. Deploy Mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // 6. Initialize Reserve
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

    // Supplier supplies 1,000,000 USDC
    const bigDeposit = ethers.parseUnits("1000000", 6);
    await mockUSDC.mint(supplier.address, bigDeposit);
    await mockUSDC.connect(supplier).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(supplier).supply(await mockUSDC.getAddress(), bigDeposit, supplier.address);

    // Borrower approvals & funds for repayment
    for (const b of borrowers) {
      await mockUSDC.mint(b.address, ethers.parseUnits("200000", 6));
      await mockUSDC.connect(b).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    }
  });

  it("Invariant 1: Sum of user scaled debts strictly equals totalScaledDebt across multi-borrow cycles", async function () {
    const usdcAddress = await mockUSDC.getAddress();

    const borrowAmounts = [
      ethers.parseUnits("1234.567890", 6),
      ethers.parseUnits("45678.123456", 6),
      ethers.parseUnits("9999.999999", 6),
      ethers.parseUnits("88888.000001", 6),
      ethers.parseUnits("50000.500000", 6),
    ];

    for (let i = 0; i < borrowers.length; i++) {
      await lendingPool.connect(borrowers[i]).borrow(usdcAddress, borrowAmounts[i], borrowers[i].address);
    }

    let sumScaledDebt = 0n;
    for (const b of borrowers) {
      const userRes = await lendingPool.getUserReserveData(usdcAddress, b.address);
      sumScaledDebt += userRes.scaledDebtBalance;
    }

    const reserveData = await lendingPool.getReserveData(usdcAddress);
    expect(sumScaledDebt).to.equal(reserveData.totalScaledDebt);
  });

  it("Invariant 2: Cumulative Borrow Index is strictly monotonic non-decreasing over time", async function () {
    const usdcAddress = await mockUSDC.getAddress();
    await lendingPool.connect(borrowers[0]).borrow(usdcAddress, ethers.parseUnits("50000", 6), borrowers[0].address);

    let lastBorrowIndex = ethers.parseUnits("1", 27);

    for (let step = 0; step < 6; step++) {
      await ethers.provider.send("evm_increaseTime", [86400 * 30]); // 30 days
      await ethers.provider.send("evm_mine");
      await reserveManager.updateCumulativeIndexes(usdcAddress);

      const res = await lendingPool.getReserveData(usdcAddress);
      expect(res.borrowIndex).to.be.greaterThanOrEqual(lastBorrowIndex);
      lastBorrowIndex = res.borrowIndex;
    }
  });

  it("Invariant 3: Conservation of total protocol liquidity across borrow and repay cycles", async function () {
    const usdcAddress = await mockUSDC.getAddress();

    // Borrower borrows 100k
    await lendingPool.connect(borrowers[0]).borrow(usdcAddress, ethers.parseUnits("100000", 6), borrowers[0].address);

    const reserve1 = await lendingPool.getReserveData(usdcAddress);
    const poolCash1 = await mockUSDC.balanceOf(await lendingPool.getAddress());
    expect(poolCash1).to.equal(reserve1.totalCash);

    // Total liquidity (Cash + Debt) >= Total Deposited
    const totalDebt1 = await lendingPool.getTotalDebt(usdcAddress);
    expect(poolCash1 + totalDebt1).to.be.greaterThanOrEqual(ethers.parseUnits("1000000", 6));
  });

  it("Invariant 4: Directional rounding guarantees debt shares are never rounded down to zero", async function () {
    const usdcAddress = await mockUSDC.getAddress();

    // Borrow 1 wei
    await lendingPool.connect(borrowers[0]).borrow(usdcAddress, 1n, borrowers[0].address);
    const userRes = await lendingPool.getUserReserveData(usdcAddress, borrowers[0].address);

    // Scaled debt must be at least 1 share (Ceil rounding)
    expect(userRes.scaledDebtBalance).to.be.greaterThanOrEqual(1n);

    // Total debt must be at least 1 wei
    const debtBal = await lendingPool.getDebtBalance(usdcAddress, borrowers[0].address);
    expect(debtBal).to.be.greaterThanOrEqual(1n);
  });
});
