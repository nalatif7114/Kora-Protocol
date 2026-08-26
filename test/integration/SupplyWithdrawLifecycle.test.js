const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Kora Protocol — Supply & Withdraw Full Lifecycle (Integration)", function () {
  let admin, alice, bob, treasury;
  let config, reserveManager, lendingPool;
  let mockUSDC;

  const SECONDS_PER_YEAR = 31536000;

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

    await reserveManager.setLendingPool(await lendingPool.getAddress());

    // 4. Deploy Mock USDC (6 decimals)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // 5. Initialize Reserve
    await lendingPool.initReserve(
      await mockUSDC.getAddress(),
      6,
      0, // unlimited supply cap
      0,
      ethers.parseUnits("0.10", 18), // 10% reserve factor
      ethers.parseUnits("0.80", 18),
      ethers.parseUnits("0.85", 18),
      ethers.parseUnits("0.05", 18)
    );

    // Distribute tokens & approve
    await mockUSDC.mint(alice.address, ethers.parseUnits("20000", 6));
    await mockUSDC.mint(bob.address, ethers.parseUnits("20000", 6));
    await mockUSDC.connect(alice).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await mockUSDC.connect(bob).approve(await lendingPool.getAddress(), ethers.MaxUint256);
  });

  it("executes multi-depositor lifecycle with 10% APR index accrual and exact payouts", async function () {
    const usdcAddress = await mockUSDC.getAddress();

    // Step 1: Alice deposits 10,000 USDC
    const aliceDeposit = ethers.parseUnits("10000", 6);
    await lendingPool.connect(alice).supply(usdcAddress, aliceDeposit, alice.address);

    // Step 2: Bob deposits 5,000 USDC
    const bobDeposit = ethers.parseUnits("5000", 6);
    await lendingPool.connect(bob).supply(usdcAddress, bobDeposit, bob.address);

    expect(await lendingPool.getSupplyBalance(usdcAddress, alice.address)).to.equal(aliceDeposit);
    expect(await lendingPool.getSupplyBalance(usdcAddress, bob.address)).to.equal(bobDeposit);
    expect(await lendingPool.getTotalSupply(usdcAddress)).to.equal(ethers.parseUnits("15000", 6));

    // Step 3: Admin sets 10% Supply APR (in RAY = 0.10e27)
    const annualRate = ethers.parseUnits("0.10", 27);
    await lendingPool.connect(admin).setReserveRates(usdcAddress, annualRate, 0n);

    // Advance exact block timestamp
    const latestBlock = await ethers.provider.getBlock("latest");
    const targetTimestamp = latestBlock.timestamp + SECONDS_PER_YEAR;
    await ethers.provider.send("evm_setNextBlockTimestamp", [targetTimestamp]);
    await ethers.provider.send("evm_mine");

    // Freeze further accrual at 1-year mark
    await lendingPool.connect(admin).setReserveRates(usdcAddress, 0n, 0n);

    // In a live system, borrowers pay interest into the pool. We calculate exact accrued interest:
    const totalSupply = await lendingPool.getTotalSupply(usdcAddress);
    const initialDeposits = ethers.parseUnits("15000", 6);
    const yieldInjection = totalSupply - initialDeposits;

    await mockUSDC.mint(admin.address, yieldInjection);
    await mockUSDC.connect(admin).approve(await lendingPool.getAddress(), yieldInjection);
    await lendingPool.connect(admin).addReserveLiquidity(usdcAddress, yieldInjection);

    const reserveData = await lendingPool.getReserveData(usdcAddress);
    // Index should now be ~1.10 RAY (allowing for minor block mining delta)
    expect(reserveData.liquidityIndex).to.be.closeTo(
      ethers.parseUnits("1.10", 27),
      ethers.parseUnits("0.0001", 27)
    );

    // Step 5: Check dynamic balances with accrued interest
    // Alice balance: ~11,000 USDC
    const aliceUpdatedBal = await lendingPool.getSupplyBalance(usdcAddress, alice.address);
    expect(aliceUpdatedBal).to.be.closeTo(
      ethers.parseUnits("11000", 6),
      ethers.parseUnits("0.1", 6)
    );

    // Bob balance: ~5,500 USDC
    const bobUpdatedBal = await lendingPool.getSupplyBalance(usdcAddress, bob.address);
    expect(bobUpdatedBal).to.be.closeTo(
      ethers.parseUnits("5500", 6),
      ethers.parseUnits("0.1", 6)
    );

    // Step 6: Alice withdraws full balance (including interest)
    const aliceBeforeBal = await mockUSDC.balanceOf(alice.address);
    await lendingPool.connect(alice).withdraw(usdcAddress, ethers.MaxUint256, alice.address);
    const aliceAfterBal = await mockUSDC.balanceOf(alice.address);

    expect(aliceAfterBal - aliceBeforeBal).to.be.closeTo(
      ethers.parseUnits("11000", 6),
      ethers.parseUnits("0.1", 6)
    );
    expect(await lendingPool.getSupplyBalance(usdcAddress, alice.address)).to.equal(0n);

    // Step 7: Bob withdraws partial 2,000 USDC, then full remainder
    await lendingPool.connect(bob).withdraw(usdcAddress, ethers.parseUnits("2000", 6), bob.address);

    const bobBeforeBal = await mockUSDC.balanceOf(bob.address);
    await lendingPool.connect(bob).withdraw(usdcAddress, ethers.MaxUint256, bob.address);
    const bobAfterBal = await mockUSDC.balanceOf(bob.address);

    expect(bobAfterBal - bobBeforeBal).to.be.closeTo(
      ethers.parseUnits("3500", 6),
      ethers.parseUnits("0.1", 6)
    );
    expect(await lendingPool.getSupplyBalance(usdcAddress, bob.address)).to.equal(0n);
    expect(await lendingPool.getTotalSupply(usdcAddress)).to.equal(0n);
  });
});
