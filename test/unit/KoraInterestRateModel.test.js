const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KoraInterestRateModel (Unit Tests)", function () {
  let rateModel;

  const WAD = ethers.parseUnits("1", 18);
  const RAY = ethers.parseUnits("1", 27);

  // Model parameters:
  // U_optimal = 80% (0.80 WAD)
  // Base Rate = 2% (0.02 RAY)
  // Slope 1 = 4% (0.04 RAY) -> Rate at kink = 2% + 4% = 6%
  // Slope 2 = 75% (0.75 RAY) -> Rate at 100% = 6% + 75% = 81%
  const optimalU = ethers.parseUnits("0.80", 18);
  const baseRate = ethers.parseUnits("0.02", 27);
  const slope1 = ethers.parseUnits("0.04", 27);
  const slope2 = ethers.parseUnits("0.75", 27);

  beforeEach(async function () {
    const KoraInterestRateModel = await ethers.getContractFactory("KoraInterestRateModel");
    rateModel = await KoraInterestRateModel.deploy(optimalU, baseRate, slope1, slope2);
    await rateModel.waitForDeployment();
  });

  describe("Parameter Getters & Validation", function () {
    it("initializes with correct curve parameters", async function () {
      expect(await rateModel.optimalUtilization()).to.equal(optimalU);
      expect(await rateModel.baseBorrowRate()).to.equal(baseRate);
      expect(await rateModel.slope1()).to.equal(slope1);
      expect(await rateModel.slope2()).to.equal(slope2);
    });

    it("reverts deployment on invalid optimal utilization (0 or >= 100%)", async function () {
      const KoraInterestRateModel = await ethers.getContractFactory("KoraInterestRateModel");
      await expect(
        KoraInterestRateModel.deploy(0n, baseRate, slope1, slope2)
      ).to.be.revertedWithCustomError(rateModel, "InvalidModelParameters");

      await expect(
        KoraInterestRateModel.deploy(WAD, baseRate, slope1, slope2)
      ).to.be.revertedWithCustomError(rateModel, "InvalidModelParameters");
    });
  });

  describe("Utilization Rate Calculations", function () {
    it("returns 0% utilization when pool is completely empty", async function () {
      expect(await rateModel.getUtilizationRate(0n, 0n)).to.equal(0n);
    });

    it("calculates accurate utilization ratios", async function () {
      // Cash = 60k, Debt = 40k -> U = 40% (0.40 WAD)
      const u40 = await rateModel.getUtilizationRate(
        ethers.parseUnits("60000", 6),
        ethers.parseUnits("40000", 6)
      );
      expect(u40).to.equal(ethers.parseUnits("0.40", 18));

      // Cash = 20k, Debt = 80k -> U = 80% (0.80 WAD)
      const u80 = await rateModel.getUtilizationRate(
        ethers.parseUnits("20000", 6),
        ethers.parseUnits("80000", 6)
      );
      expect(u80).to.equal(ethers.parseUnits("0.80", 18));

      // Cash = 0, Debt = 100k -> U = 100% (1.00 WAD)
      const u100 = await rateModel.getUtilizationRate(0n, ethers.parseUnits("100000", 6));
      expect(u100).to.equal(ethers.parseUnits("1.00", 18));
    });
  });

  describe("Two-Kink Dynamic Rate Calculations", function () {
    const reserveFactor = ethers.parseUnits("0.10", 18); // 10%

    it("0% Utilization: Borrow APR = 2% (Base Rate), Supply APY = 0%", async function () {
      const [borrowRate, supplyRate] = await rateModel.calculateInterestRates(
        ethers.parseUnits("100000", 6),
        0n,
        reserveFactor
      );
      expect(borrowRate).to.equal(ethers.parseUnits("0.02", 27));
      expect(supplyRate).to.equal(0n);
    });

    it("40% Utilization (Below Kink): Borrow APR = 4%, Supply APY = 1.44%", async function () {
      // U = 40%
      // Borrow APR = 2% + (40/80) * 4% = 4.0%
      // Gross Supply = 4.0% * 40% = 1.6%
      // Net Supply (90%) = 1.6% * 0.90 = 1.44%
      const [borrowRate, supplyRate] = await rateModel.calculateInterestRates(
        ethers.parseUnits("60000", 6),
        ethers.parseUnits("40000", 6),
        reserveFactor
      );
      expect(borrowRate).to.equal(ethers.parseUnits("0.04", 27));
      expect(supplyRate).to.equal(ethers.parseUnits("0.0144", 27));
    });

    it("80% Utilization (At Kink): Borrow APR = 6%, Supply APY = 4.32%", async function () {
      // U = 80%
      // Borrow APR = 2% + 4% = 6.0%
      // Gross Supply = 6.0% * 80% = 4.8%
      // Net Supply (90%) = 4.8% * 0.90 = 4.32%
      const [borrowRate, supplyRate] = await rateModel.calculateInterestRates(
        ethers.parseUnits("20000", 6),
        ethers.parseUnits("80000", 6),
        reserveFactor
      );
      expect(borrowRate).to.equal(ethers.parseUnits("0.06", 27));
      expect(supplyRate).to.equal(ethers.parseUnits("0.0432", 27));
    });

    it("90% Utilization (Above Kink): Borrow APR = 43.5%, Supply APY = 35.235%", async function () {
      // U = 90%
      // Borrow APR = 2% + 4% + ((90-80)/(100-80)) * 75% = 6% + (10/20)*75% = 6% + 37.5% = 43.5%
      // Gross Supply = 43.5% * 90% = 39.15%
      // Net Supply (90%) = 39.15% * 0.90 = 35.235%
      const [borrowRate, supplyRate] = await rateModel.calculateInterestRates(
        ethers.parseUnits("10000", 6),
        ethers.parseUnits("90000", 6),
        reserveFactor
      );
      expect(borrowRate).to.equal(ethers.parseUnits("0.435", 27));
      expect(supplyRate).to.equal(ethers.parseUnits("0.35235", 27));
    });

    it("100% Utilization (Max): Borrow APR = 81%, Supply APY = 72.9%", async function () {
      // U = 100%
      // Borrow APR = 2% + 4% + 75% = 81.0%
      // Net Supply = 81% * 100% * 0.90 = 72.9%
      const [borrowRate, supplyRate] = await rateModel.calculateInterestRates(
        0n,
        ethers.parseUnits("100000", 6),
        reserveFactor
      );
      expect(borrowRate).to.equal(ethers.parseUnits("0.81", 27));
      expect(supplyRate).to.equal(ethers.parseUnits("0.729", 27));
    });
  });
});
