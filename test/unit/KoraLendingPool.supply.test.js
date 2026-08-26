const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KoraLendingPool — Supply (Unit Tests)", function () {
  let admin, alice, bob, treasury;
  let config, reserveManager, lendingPool;
  let mockUSDC, mockWETH;

  const WAD = ethers.parseUnits("1", 18);
  const RAY = ethers.parseUnits("1", 27);

  beforeEach(async function () {
    [admin, alice, bob, treasury] = await ethers.getSigners();

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

    // 4. Authorize LendingPool in ReserveManager
    await reserveManager.setLendingPool(await lendingPool.getAddress());

    // 5. Deploy Mock Tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    mockWETH = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    await mockWETH.waitForDeployment();

    // 6. Initialize Reserves (USDC 6 dec, WETH 18 dec)
    await lendingPool.initReserve(
      await mockUSDC.getAddress(),
      6,
      0, // Unlimited supply cap
      0,
      ethers.parseUnits("0.10", 18),
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.85", 18),
      ethers.parseUnits("0.05", 18)
    );

    await lendingPool.initReserve(
      await mockWETH.getAddress(),
      18,
      ethers.parseUnits("1000", 18), // 1000 WETH supply cap
      0,
      ethers.parseUnits("0.10", 18),
      ethers.parseUnits("0.75", 18),
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.05", 18)
    );

    // Mint test tokens to Alice and Bob
    await mockUSDC.mint(alice.address, ethers.parseUnits("50000", 6));
    await mockUSDC.mint(bob.address, ethers.parseUnits("50000", 6));
    await mockWETH.mint(alice.address, ethers.parseUnits("500", 18));
    await mockWETH.mint(bob.address, ethers.parseUnits("1500", 18));

    // Approve LendingPool
    await mockUSDC.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await mockUSDC.connect(bob).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await mockWETH.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await mockWETH.connect(bob).approve(await lendingPool.getAddress(), ethers.MaxUint256);
  });

  describe("Basic Supply Operations", function () {
    it("supplies 6-decimal token (USDC) and computes scaled shares correctly", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      const usdcAddress = await mockUSDC.getAddress();

      const tx = await lendingPool.connect(alice).supply(usdcAddress, depositAmount, alice.address);
      
      // On initial index (1e27), scaled shares == deposit amount
      await expect(tx)
        .to.emit(lendingPool, "Supply")
        .withArgs(usdcAddress, alice.address, alice.address, depositAmount, depositAmount);

      const userBalance = await lendingPool.getSupplyBalance(usdcAddress, alice.address);
      expect(userBalance).to.equal(depositAmount);

      const poolBalance = await lendingPool.getAvailableLiquidity(usdcAddress);
      expect(poolBalance).to.equal(depositAmount);

      const userReserve = await lendingPool.getUserReserveData(usdcAddress, alice.address);
      expect(userReserve.scaledSupplyBalance).to.equal(depositAmount);
    });

    it("supplies 18-decimal token (WETH) on behalf of another user", async function () {
      const depositAmount = ethers.parseUnits("10", 18);
      const wethAddress = await mockWETH.getAddress();

      // Alice supplies on behalf of Bob
      await expect(lendingPool.connect(alice).supply(wethAddress, depositAmount, bob.address))
        .to.emit(lendingPool, "Supply")
        .withArgs(wethAddress, alice.address, bob.address, depositAmount, depositAmount);

      // Bob receives the supply balance, Alice gets nothing
      expect(await lendingPool.getSupplyBalance(wethAddress, bob.address)).to.equal(depositAmount);
      expect(await lendingPool.getSupplyBalance(wethAddress, alice.address)).to.equal(0n);
    });
  });

  describe("Validation & Reverts", function () {
    it("reverts on zero deposit amount", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await expect(
        lendingPool.connect(alice).supply(usdcAddress, 0, alice.address)
      ).to.be.revertedWithCustomError(lendingPool, "ZeroAmount");
    });

    it("reverts on zero recipient address (onBehalfOf = 0)", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await expect(
        lendingPool.connect(alice).supply(usdcAddress, 1000, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(lendingPool, "ZeroAddress");
    });

    it("reverts when asset is paused", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await config.connect(admin).setAssetPaused(usdcAddress, true);

      await expect(
        lendingPool.connect(alice).supply(usdcAddress, 1000, alice.address)
      ).to.be.revertedWithCustomError(lendingPool, "ProtocolOrAssetPaused");
    });

    it("reverts when global protocol is paused", async function () {
      const usdcAddress = await mockUSDC.getAddress();
      await config.connect(admin).pauseProtocol();

      await expect(
        lendingPool.connect(alice).supply(usdcAddress, 1000, alice.address)
      ).to.be.revertedWithCustomError(lendingPool, "ProtocolOrAssetPaused");
    });

    it("reverts when supply cap is exceeded", async function () {
      const wethAddress = await mockWETH.getAddress(); // Cap is 1000 WETH
      const excessiveAmount = ethers.parseUnits("1001", 18);

      await expect(
        lendingPool.connect(bob).supply(wethAddress, excessiveAmount, bob.address)
      ).to.be.revertedWithCustomError(reserveManager, "SupplyCapExceeded");
    });
  });
});
