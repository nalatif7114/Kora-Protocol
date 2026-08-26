const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KoraLendingPool — Borrow (Unit Tests)", function () {
  let admin, supplier, borrower, recipient, treasury;
  let config, reserveManager, lendingPool, rateModel;
  let mockUSDC, mockWETH;

  beforeEach(async function () {
    [admin, supplier, borrower, recipient, treasury] = await ethers.getSigners();

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

    // 4. Deploy Rate Model (80% optimal, 2% base, 4% slope1, 75% slope2)
    const KoraInterestRateModel = await ethers.getContractFactory("KoraInterestRateModel");
    rateModel = await KoraInterestRateModel.deploy(
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.02", 27),
      ethers.parseUnits("0.04", 27),
      ethers.parseUnits("0.75", 27)
    );
    await rateModel.waitForDeployment();

    // 5. Deploy Mock Tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    mockWETH = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    await mockWETH.waitForDeployment();

    // 6. Initialize Reserves
    await lendingPool.initReserve(
      await mockUSDC.getAddress(),
      6,
      0,
      ethers.parseUnits("80000", 6), // 80k USDC borrow cap
      ethers.parseUnits("0.10", 18),
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.85", 18),
      ethers.parseUnits("0.05", 18)
    );
    await lendingPool.setInterestRateModel(await mockUSDC.getAddress(), await rateModel.getAddress());

    await lendingPool.initReserve(
      await mockWETH.getAddress(),
      18,
      0,
      ethers.parseUnits("50", 18), // 50 WETH borrow cap
      ethers.parseUnits("0.10", 18),
      ethers.parseUnits("0.75", 18),
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.05", 18)
    );

    // Supplier provides initial liquidity
    const usdcDeposit = ethers.parseUnits("100000", 6);
    await mockUSDC.mint(supplier.address, usdcDeposit);
    await mockUSDC.connect(supplier).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(supplier).supply(await mockUSDC.getAddress(), usdcDeposit, supplier.address);

    const wethDeposit = ethers.parseUnits("100", 18);
    await mockWETH.mint(supplier.address, wethDeposit);
    await mockWETH.connect(supplier).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(supplier).supply(await mockWETH.getAddress(), wethDeposit, supplier.address);
  });

  describe("Borrow Execution & Accounting", function () {
    it("borrows 6-decimal USDC and verifies debt balance and event emission", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      const borrowAmount = ethers.parseUnits("40000", 6);

      const borrowerInitialBal = await mockUSDC.balanceOf(borrower.address);

      const tx = await lendingPool.connect(borrower).borrow(usdcAddress, borrowAmount, borrower.address);

      await expect(tx).to.emit(lendingPool, "Borrow");

      const borrowerFinalBal = await mockUSDC.balanceOf(borrower.address);
      expect(borrowerFinalBal - borrowerInitialBal).to.equal(borrowAmount);

      expect(await lendingPool.getDebtBalance(usdcAddress, borrower.address)).to.be.closeTo(
        borrowAmount,
        ethers.parseUnits("0.001", 6)
      );
      expect(await lendingPool.getTotalDebt(usdcAddress)).to.be.closeTo(
        borrowAmount,
        ethers.parseUnits("0.001", 6)
      );
      expect(await lendingPool.getAvailableLiquidity(usdcAddress)).to.equal(ethers.parseUnits("60000", 6));

      // Check dynamic interest rate update (40% utilization -> 4% borrow rate)
      const reserveData = await lendingPool.getReserveData(usdcAddress);
      expect(reserveData.currentBorrowRate).to.be.closeTo(
        ethers.parseUnits("0.04", 27),
        ethers.parseUnits("0.00001", 27)
      );
      expect(reserveData.currentLiquidityRate).to.be.closeTo(
        ethers.parseUnits("0.0144", 27),
        ethers.parseUnits("0.00001", 27)
      );
    });

    it("borrows to a distinct third-party recipient address", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      const borrowAmount = ethers.parseUnits("10000", 6);

      const recipientBefore = await mockUSDC.balanceOf(recipient.address);
      await lendingPool.connect(borrower).borrow(usdcAddress, borrowAmount, recipient.address);
      const recipientAfter = await mockUSDC.balanceOf(recipient.address);

      expect(recipientAfter - recipientBefore).to.equal(borrowAmount);
      // Borrower holds the debt, recipient holds the cash
      expect(await lendingPool.getDebtBalance(usdcAddress, borrower.address)).to.be.closeTo(
        borrowAmount,
        ethers.parseUnits("0.001", 6)
      );
      expect(await lendingPool.getDebtBalance(usdcAddress, recipient.address)).to.equal(0n);
    });
  });

  describe("Validation & Reverts", function () {
    it("reverts on zero borrow amount", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await expect(
        lendingPool.connect(borrower).borrow(usdcAddress, 0, borrower.address)
      ).to.be.revertedWithCustomError(lendingPool, "ZeroAmount");
    });

    it("reverts on zero recipient address", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await expect(
        lendingPool.connect(borrower).borrow(usdcAddress, 1000, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(lendingPool, "ZeroAddress");
    });

    it("reverts when borrowing more than pool available liquidity", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      const excessiveAmount = ethers.parseUnits("100001", 6); // Pool only has 100k

      await expect(
        lendingPool.connect(borrower).borrow(usdcAddress, excessiveAmount, borrower.address)
      ).to.be.revertedWithCustomError(reserveManager, "InsufficientLiquidity");
    });

    it("reverts when borrow cap is exceeded", async function () {
      const wethAddress = await mockWETH.getAddress(); // Borrow cap is 50 WETH
      const excessiveAmount = ethers.parseUnits("51", 18);

      await expect(
        lendingPool.connect(borrower).borrow(wethAddress, excessiveAmount, borrower.address)
      ).to.be.revertedWithCustomError(reserveManager, "BorrowCapExceeded");
    });

    it("reverts when asset is paused", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await config.connect(admin).setAssetPaused(usdcAddress, true);

      await expect(
        lendingPool.connect(borrower).borrow(usdcAddress, 1000, borrower.address)
      ).to.be.revertedWithCustomError(lendingPool, "ProtocolOrAssetPaused");
    });
  });
});
