const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KoraLendingPool — Withdraw (Unit Tests)", function () {
  let admin, alice, bob, treasury;
  let config, reserveManager, lendingPool;
  let mockUSDC;

  const WAD = ethers.parseUnits("1", 18);
  const RAY = ethers.parseUnits("1", 27);

  beforeEach(async function () {
    [admin, alice, bob, treasury] = await ethers.getSigners();

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

    // Alice mints and deposits 10,000 USDC
    const depositAmount = ethers.parseUnits("10000", 6);
    await mockUSDC.mint(alice.address, depositAmount);
    await mockUSDC.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await lendingPool.connect(alice).supply(await mockUSDC.getAddress(), depositAmount, alice.address);
  });

  describe("Partial & Full Withdrawals", function () {
    it("withdraws partial amount and updates user and pool balances", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      const withdrawAmount = ethers.parseUnits("4000", 6);

      const aliceInitialBal = await mockUSDC.balanceOf(alice.address);

      const tx = await lendingPool.connect(alice).withdraw(usdcAddress, withdrawAmount, alice.address);
      await expect(tx)
        .to.emit(lendingPool, "Withdraw")
        .withArgs(usdcAddress, alice.address, alice.address, withdrawAmount, withdrawAmount);

      const aliceFinalBal = await mockUSDC.balanceOf(alice.address);
      expect(aliceFinalBal - aliceInitialBal).to.equal(withdrawAmount);

      const aliceRemainingSupply = await lendingPool.getSupplyBalance(usdcAddress, alice.address);
      expect(aliceRemainingSupply).to.equal(ethers.parseUnits("6000", 6));

      const poolLiquidity = await lendingPool.getAvailableLiquidity(usdcAddress);
      expect(poolLiquidity).to.equal(ethers.parseUnits("6000", 6));
    });

    it("withdraws to a different recipient address", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      const withdrawAmount = ethers.parseUnits("2000", 6);

      const bobInitialBal = await mockUSDC.balanceOf(bob.address);

      await lendingPool.connect(alice).withdraw(usdcAddress, withdrawAmount, bob.address);

      const bobFinalBal = await mockUSDC.balanceOf(bob.address);
      expect(bobFinalBal - bobInitialBal).to.equal(withdrawAmount);
    });

    it("withdraws full balance when passing type(uint256).max", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      const aliceInitialBal = await mockUSDC.balanceOf(alice.address);

      await lendingPool.connect(alice).withdraw(usdcAddress, ethers.MaxUint256, alice.address);

      const aliceFinalBal = await mockUSDC.balanceOf(alice.address);
      expect(aliceFinalBal - aliceInitialBal).to.equal(ethers.parseUnits("10000", 6));

      const aliceRemaining = await lendingPool.getSupplyBalance(usdcAddress, alice.address);
      expect(aliceRemaining).to.equal(0n);

      const poolLiquidity = await lendingPool.getAvailableLiquidity(usdcAddress);
      expect(poolLiquidity).to.equal(0n);
    });
  });

  describe("Validation & Reverts", function () {
    it("reverts on zero amount", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await expect(
        lendingPool.connect(alice).withdraw(usdcAddress, 0, alice.address)
      ).to.be.revertedWithCustomError(lendingPool, "ZeroAmount");
    });

    it("reverts on zero recipient address", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await expect(
        lendingPool.connect(alice).withdraw(usdcAddress, 1000, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(lendingPool, "ZeroAddress");
    });

    it("reverts on withdrawal exceeding user balance", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      const excessiveAmount = ethers.parseUnits("10001", 6);

      await expect(
        lendingPool.connect(alice).withdraw(usdcAddress, excessiveAmount, alice.address)
      ).to.be.revertedWithCustomError(reserveManager, "InsufficientBalance");
    });

    it("reverts when asset is paused", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await config.connect(admin).setAssetPaused(usdcAddress, true);

      await expect(
        lendingPool.connect(alice).withdraw(usdcAddress, 1000, alice.address)
      ).to.be.revertedWithCustomError(lendingPool, "ProtocolOrAssetPaused");
    });
  });
});
