const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KoraLendingPool — Repay (Unit Tests)", function () {
  let admin, supplier, borrower, payer, treasury;
  let config, reserveManager, lendingPool, rateModel;
  let mockUSDC;

  beforeEach(async function () {
    [admin, supplier, borrower, payer, treasury] = await ethers.getSigners();

    const KoraConfig = await ethers.getContractFactory("KoraConfig");
    config = await KoraConfig.deploy(admin.address, treasury.address);
    await config.waitForDeployment();

    const KoraReserveManager = await ethers.getContractFactory("KoraReserveManager");
    reserveManager = await KoraReserveManager.deploy(await config.getAddress());
    await reserveManager.waitForDeployment();

    const KoraLendingPool = await ethers.getContractFactory("KoraLendingPool");
    lendingPool = await KoraLendingPool.deploy(
      await config.getAddress(),
      await reserveManager.getAddress()
    );
    await lendingPool.waitForDeployment();

    await reserveManager.setLendingPool(await lendingPool.getAddress());

    const KoraInterestRateModel = await ethers.getContractFactory("KoraInterestRateModel");
    rateModel = await KoraInterestRateModel.deploy(
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.02", 27),
      ethers.parseUnits("0.04", 27),
      ethers.parseUnits("0.75", 27)
    );
    await rateModel.waitForDeployment();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

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

    // Supplier supplies 100k USDC
    const usdcDeposit = ethers.parseUnits("100000", 6);
    await mockUSDC.mint(supplier.address, usdcDeposit);
    await mockUSDC.connect(supplier).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(supplier).supply(await mockUSDC.getAddress(), usdcDeposit, supplier.address);

    // Borrower borrows 40k USDC
    const borrowAmount = ethers.parseUnits("40000", 6);
    await lendingPool.connect(borrower).borrow(await mockUSDC.getAddress(), borrowAmount, borrower.address);

    // Borrower & Payer approvals
    await mockUSDC.connect(borrower).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await mockUSDC.connect(payer).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    // Mint extra to cover accrued block-time interest
    await mockUSDC.mint(borrower.address, ethers.parseUnits("50000", 6));
    await mockUSDC.mint(payer.address, ethers.parseUnits("50000", 6));
  });

  describe("Partial & Full Repayments", function () {
    it("repays partial debt and decreases borrower debt balance", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      const repayAmount = ethers.parseUnits("15000", 6);

      const tx = await lendingPool.connect(borrower).repay(usdcAddress, repayAmount, borrower.address);

      await expect(tx).to.emit(lendingPool, "Repay");

      expect(await lendingPool.getDebtBalance(usdcAddress, borrower.address)).to.be.closeTo(
        ethers.parseUnits("25000", 6),
        ethers.parseUnits("0.001", 6)
      );
      expect(await lendingPool.getTotalDebt(usdcAddress)).to.be.closeTo(
        ethers.parseUnits("25000", 6),
        ethers.parseUnits("0.001", 6)
      );
      expect(await lendingPool.getAvailableLiquidity(usdcAddress)).to.equal(ethers.parseUnits("75000", 6));
    });

    it("repays on behalf of borrower by a third party", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      const repayAmount = ethers.parseUnits("10000", 6);

      await expect(lendingPool.connect(payer).repay(usdcAddress, repayAmount, borrower.address))
        .to.emit(lendingPool, "Repay");

      expect(await lendingPool.getDebtBalance(usdcAddress, borrower.address)).to.be.closeTo(
        ethers.parseUnits("30000", 6),
        ethers.parseUnits("0.001", 6)
      );
    });

    it("repays full debt using type(uint256).max", async function () {
      const usdcAddress = await mockUSDC.getAddress();

      await lendingPool.connect(borrower).repay(usdcAddress, ethers.MaxUint256, borrower.address);

      expect(await lendingPool.getDebtBalance(usdcAddress, borrower.address)).to.equal(0n);
      expect(await lendingPool.getTotalDebt(usdcAddress)).to.equal(0n);
      expect(await lendingPool.getAvailableLiquidity(usdcAddress)).to.be.greaterThanOrEqual(ethers.parseUnits("100000", 6));
    });
  });

  describe("Validation & Reverts", function () {
    it("reverts on zero repay amount", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await expect(
        lendingPool.connect(borrower).repay(usdcAddress, 0, borrower.address)
      ).to.be.revertedWithCustomError(lendingPool, "ZeroAmount");
    });

    it("reverts on zero onBehalfOf address", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await expect(
        lendingPool.connect(borrower).repay(usdcAddress, 1000, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(lendingPool, "ZeroAddress");
    });

    it("reverts when attempting to repay for an address with no debt", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await expect(
        lendingPool.connect(borrower).repay(usdcAddress, 1000, supplier.address)
      ).to.be.revertedWithCustomError(reserveManager, "NoDebt");
    });

    it("reverts when asset is paused", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await config.connect(admin).setAssetPaused(usdcAddress, true);

      await expect(
        lendingPool.connect(borrower).repay(usdcAddress, 1000, borrower.address)
      ).to.be.revertedWithCustomError(lendingPool, "ProtocolOrAssetPaused");
    });
  });
});
