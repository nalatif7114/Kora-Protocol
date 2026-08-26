const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KoraMath (Unit Tests)", function () {
  let mathHarness;

  const WAD = ethers.parseUnits("1", 18);
  const RAY = ethers.parseUnits("1", 27);
  const HALF_WAD = ethers.parseUnits("0.5", 18);
  const HALF_RAY = ethers.parseUnits("0.5", 27);

  beforeEach(async function () {
    const KoraMathHarness = await ethers.getContractFactory("KoraMathHarness");
    mathHarness = await KoraMathHarness.deploy();
    await mathHarness.waitForDeployment();
  });

  describe("WAD Arithmetic (10^18)", function () {
    it("wadMul: correctly multiplies with floor rounding", async function () {
      const a = ethers.parseUnits("2", 18);
      const b = ethers.parseUnits("3", 18);
      const result = await mathHarness.wadMul(a, b);
      expect(result).to.equal(ethers.parseUnits("6", 18));

      // Precision test: fraction that truncates
      const resTrunc = await mathHarness.wadMul(1n, 1n);
      expect(resTrunc).to.equal(0n); // 1 * 1 / 1e18 = 0
    });

    it("wadMul: returns 0 when either operand is 0", async function () {
      expect(await mathHarness.wadMul(0n, WAD)).to.equal(0n);
      expect(await mathHarness.wadMul(WAD, 0n)).to.equal(0n);
    });

    it("wadMulUp: correctly multiplies with ceil rounding", async function () {
      const a = ethers.parseUnits("2", 18);
      const b = ethers.parseUnits("3", 18);
      expect(await mathHarness.wadMulUp(a, b)).to.equal(ethers.parseUnits("6", 18));

      // Ceil test: 1 * 1 / 1e18 rounds UP to 1
      const resCeil = await mathHarness.wadMulUp(1n, 1n);
      expect(resCeil).to.equal(1n);
    });

    it("wadDiv: correctly divides with floor rounding", async function () {
      const a = ethers.parseUnits("6", 18);
      const b = ethers.parseUnits("2", 18);
      expect(await mathHarness.wadDiv(a, b)).to.equal(ethers.parseUnits("3", 18));

      // Fraction truncation
      const res = await mathHarness.wadDiv(1n, 2n);
      expect(res).to.equal(HALF_WAD);
    });

    it("wadDiv: reverts on division by zero", async function () {
      await expect(mathHarness.wadDiv(WAD, 0n)).to.be.revertedWithCustomError(
        mathHarness,
        "DivisionByZero"
      );
    });

    it("wadDivUp: correctly divides with ceil rounding", async function () {
      const a = ethers.parseUnits("6", 18);
      const b = ethers.parseUnits("2", 18);
      expect(await mathHarness.wadDivUp(a, b)).to.equal(ethers.parseUnits("3", 18));

      // 1 WAD + 1 divided by 2 WAD -> 0.5 WAD + 1
      const num = WAD + 1n;
      const den = WAD * 2n;
      const result = await mathHarness.wadDivUp(num, den);
      expect(result).to.equal(HALF_WAD + 1n);
    });
  });

  describe("RAY Arithmetic (10^27)", function () {
    it("rayMul: correctly multiplies with floor rounding", async function () {
      const a = ethers.parseUnits("2", 27);
      const b = ethers.parseUnits("3", 27);
      expect(await mathHarness.rayMul(a, b)).to.equal(ethers.parseUnits("6", 27));

      expect(await mathHarness.rayMul(1n, 1n)).to.equal(0n);
    });

    it("rayMulUp: correctly multiplies with ceil rounding", async function () {
      const a = ethers.parseUnits("2", 27);
      const b = ethers.parseUnits("3", 27);
      expect(await mathHarness.rayMulUp(a, b)).to.equal(ethers.parseUnits("6", 27));

      expect(await mathHarness.rayMulUp(1n, 1n)).to.equal(1n);
    });

    it("rayDiv: correctly divides with floor rounding", async function () {
      const a = ethers.parseUnits("10", 27);
      const b = ethers.parseUnits("2", 27);
      expect(await mathHarness.rayDiv(a, b)).to.equal(ethers.parseUnits("5", 27));
    });

    it("rayDiv: reverts on division by zero", async function () {
      await expect(mathHarness.rayDiv(RAY, 0n)).to.be.revertedWithCustomError(
        mathHarness,
        "DivisionByZero"
      );
    });

    it("rayDivUp: correctly divides with ceil rounding", async function () {
      const a = ethers.parseUnits("10", 27);
      const b = ethers.parseUnits("2", 27);
      expect(await mathHarness.rayDivUp(a, b)).to.equal(ethers.parseUnits("5", 27));

      const num = RAY + 1n;
      const den = RAY * 2n;
      expect(await mathHarness.rayDivUp(num, den)).to.equal(HALF_RAY + 1n);
    });
  });

  describe("Conversions & Compounding", function () {
    it("rayToWad and wadToRay: converts without loss when scaled by 1e9", async function () {
      const wadVal = ethers.parseUnits("123.456", 18);
      const rayVal = await mathHarness.wadToRay(wadVal);
      expect(rayVal).to.equal(ethers.parseUnits("123.456", 27));

      const convertedBack = await mathHarness.rayToWad(rayVal);
      expect(convertedBack).to.equal(wadVal);
    });

    it("rayToWadUp: rounds up when there is remainder in ray to wad conversion", async function () {
      const rayWithDust = ethers.parseUnits("1", 27) + 1n;
      expect(await mathHarness.rayToWad(rayWithDust)).to.equal(WAD);
      expect(await mathHarness.rayToWadUp(rayWithDust)).to.equal(WAD + 1n);
    });

    it("calculateLinearInterest: calculates linear compounding accurately", async function () {
      const annualRate = ethers.parseUnits("0.10", 27); // 10% APR in RAY
      const lastUpdate = 1000;
      const oneYearLater = 1000 + 31536000;

      const factorOneYear = await mathHarness.calculateLinearInterest(annualRate, lastUpdate, oneYearLater);
      // Factor should be exactly 1.10 in RAY = 1.1e27
      expect(factorOneYear).to.equal(ethers.parseUnits("1.10", 27));

      // Same timestamp returns RAY (factor = 1.0)
      const factorZero = await mathHarness.calculateLinearInterest(annualRate, lastUpdate, lastUpdate);
      expect(factorZero).to.equal(RAY);
    });
  });
});
