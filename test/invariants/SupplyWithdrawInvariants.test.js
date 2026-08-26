const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Kora Protocol — Supply & Withdraw Accounting Invariants", function () {
  let admin, users, treasury;
  let config, reserveManager, lendingPool;
  let mockUSDC;

  const SECONDS_PER_YEAR = 31536000;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    admin = signers[0];
    treasury = signers[1];
    users = signers.slice(2, 8); // 6 independent users

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

    // 4. Deploy Mock USDC
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

    // Distribute tokens and approve pool for all users
    for (const user of users) {
      await mockUSDC.mint(user.address, ethers.parseUnits("100000", 6));
      await mockUSDC.connect(user).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    }
  });

  it("Invariant 1 & 2: Sum of user scaled balances strictly equals totalScaledSupply across random actions", async function () {
    const usdcAddress = await mockUSDC.getAddress();

    // Random deposit amounts
    const depositAmounts = [
      ethers.parseUnits("1234.567890", 6),
      ethers.parseUnits("9876.543210", 6),
      ethers.parseUnits("500.000001", 6),
      ethers.parseUnits("43210.999999", 6),
      ethers.parseUnits("1.000000", 6),
      ethers.parseUnits("7777.777777", 6),
    ];

    for (let i = 0; i < users.length; i++) {
      await lendingPool.connect(users[i]).supply(usdcAddress, depositAmounts[i], users[i].address);
    }

    // Verify Invariant: sum(userScaledBalances) == totalScaledSupply
    let sumScaled = 0n;
    for (const user of users) {
      const userRes = await lendingPool.getUserReserveData(usdcAddress, user.address);
      sumScaled += userRes.scaledSupplyBalance;
    }

    const reserveData = await lendingPool.getReserveData(usdcAddress);
    expect(sumScaled).to.equal(reserveData.totalScaledSupply);

    // Verify Invariant: pool ERC20 balance == totalCash
    const poolBal = await mockUSDC.balanceOf(await lendingPool.getAddress());
    expect(poolBal).to.equal(reserveData.totalCash);
  });

  it("Invariant 3: Liquidity Index is strictly monotonic non-decreasing", async function () {
    const usdcAddress = await mockUSDC.getAddress();
    await lendingPool.connect(users[0]).supply(usdcAddress, ethers.parseUnits("1000", 6), users[0].address);

    const rate = ethers.parseUnits("0.05", 27); // 5% APR
    await lendingPool.connect(admin).setReserveRates(usdcAddress, rate, 0n);

    let lastIndex = ethers.parseUnits("1", 27);

    for (let step = 0; step < 5; step++) {
      await ethers.provider.send("evm_increaseTime", [86400 * 30]); // 30 days
      await ethers.provider.send("evm_mine");
      await reserveManager.updateCumulativeIndexes(usdcAddress);

      const currentRes = await lendingPool.getReserveData(usdcAddress);
      expect(currentRes.liquidityIndex).to.be.greaterThanOrEqual(lastIndex);
      lastIndex = currentRes.liquidityIndex;
    }
  });

  it("Invariant 4: Rounding direction prevents share inflation and protects pool solvency", async function () {
    const usdcAddress = await mockUSDC.getAddress();

    // 1 wei deposit test
    await lendingPool.connect(users[0]).supply(usdcAddress, 1n, users[0].address);
    const userRes = await lendingPool.getUserReserveData(usdcAddress, users[0].address);
    expect(userRes.scaledSupplyBalance).to.equal(1n);

    // Full withdrawal of 1 wei
    await lendingPool.connect(users[0]).withdraw(usdcAddress, 1n, users[0].address);
    const userResAfter = await lendingPool.getUserReserveData(usdcAddress, users[0].address);
    expect(userResAfter.scaledSupplyBalance).to.equal(0n);

    const reserveAfter = await lendingPool.getReserveData(usdcAddress);
    expect(reserveAfter.totalScaledSupply).to.equal(0n);
    expect(reserveAfter.totalCash).to.equal(0n);
  });
});
