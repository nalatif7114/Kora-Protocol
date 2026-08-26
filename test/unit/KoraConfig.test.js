const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("KoraConfig (Unit Tests)", function () {
  let admin, riskAdmin, emergencyAdmin, user, treasury, newTreasury;
  let config;

  const WAD = ethers.parseUnits("1", 18);

  beforeEach(async function () {
    [admin, riskAdmin, emergencyAdmin, user, treasury, newTreasury] = await ethers.getSigners();

    const KoraConfig = await ethers.getContractFactory("KoraConfig");
    config = await KoraConfig.deploy(admin.address, treasury.address);
    await config.waitForDeployment();

    // Grant roles
    const RISK_ROLE = await config.RISK_ADMIN_ROLE();
    const EMERGENCY_ROLE = await config.EMERGENCY_ADMIN_ROLE();

    await config.connect(admin).grantRole(RISK_ROLE, riskAdmin.address);
    await config.connect(admin).grantRole(EMERGENCY_ROLE, emergencyAdmin.address);
  });

  describe("Initialization & Default Parameters", function () {
    it("initializes with expected default risk values", async function () {
      expect(await config.closeFactorNormal()).to.equal(ethers.parseUnits("0.50", 18));
      expect(await config.closeFactorExtreme()).to.equal(ethers.parseUnits("1.00", 18));
      expect(await config.extremeHealthFactorThreshold()).to.equal(ethers.parseUnits("0.95", 18));
      expect(await config.defaultLiquidationBonus()).to.equal(ethers.parseUnits("0.05", 18));
      expect(await config.defaultLiquidationThreshold()).to.equal(ethers.parseUnits("0.80", 18));
      expect(await config.getTreasury()).to.equal(treasury.address);
    });

    it("reverts deployment on zero admin or treasury address", async function () {
      const KoraConfig = await ethers.getContractFactory("KoraConfig");
      await expect(
        KoraConfig.deploy(ethers.ZeroAddress, treasury.address)
      ).to.be.revertedWithCustomError(config, "ZeroAddress");
      await expect(
        KoraConfig.deploy(admin.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(config, "ZeroAddress");
    });
  });

  describe("Access Control & Role Permissions", function () {
    it("allows RISK_ADMIN_ROLE to update closeFactorNormal within bounds", async function () {
      const newCloseFactor = ethers.parseUnits("0.40", 18);
      await expect(config.connect(riskAdmin).setCloseFactorNormal(newCloseFactor))
        .to.emit(config, "RiskParameterUpdated")
        .withArgs("closeFactorNormal", ethers.parseUnits("0.50", 18), newCloseFactor);

      expect(await config.closeFactorNormal()).to.equal(newCloseFactor);
    });

    it("reverts when unauthorized caller attempts to update risk parameters", async function () {
      const newCloseFactor = ethers.parseUnits("0.40", 18);
      await expect(
        config.connect(user).setCloseFactorNormal(newCloseFactor)
      ).to.be.revertedWithCustomError(config, "AccessControlUnauthorizedAccount");
    });

    it("reverts when closeFactorNormal is out of bounds", async function () {
      // Too low (< 10%)
      await expect(
        config.connect(riskAdmin).setCloseFactorNormal(ethers.parseUnits("0.05", 18))
      ).to.be.revertedWithCustomError(config, "InvalidParameterValue");

      // Too high (> 50%)
      await expect(
        config.connect(riskAdmin).setCloseFactorNormal(ethers.parseUnits("0.60", 18))
      ).to.be.revertedWithCustomError(config, "InvalidParameterValue");
    });

    it("allows updating extreme health factor threshold with validation", async function () {
      const newThreshold = ethers.parseUnits("0.90", 18);
      await expect(config.connect(riskAdmin).setExtremeHealthFactorThreshold(newThreshold))
        .to.emit(config, "RiskParameterUpdated")
        .withArgs("extremeHealthFactorThreshold", ethers.parseUnits("0.95", 18), newThreshold);

      expect(await config.extremeHealthFactorThreshold()).to.equal(newThreshold);
    });
  });

  describe("Emergency Pause Operations", function () {
    it("allows EMERGENCY_ADMIN_ROLE to pause protocol", async function () {
      expect(await config.isProtocolPaused()).to.be.false;

      await expect(config.connect(emergencyAdmin).pauseProtocol())
        .to.emit(config, "ProtocolPaused")
        .withArgs(emergencyAdmin.address);

      expect(await config.isProtocolPaused()).to.be.true;
    });

    it("allows DEFAULT_ADMIN_ROLE to unpause protocol", async function () {
      await config.connect(emergencyAdmin).pauseProtocol();
      expect(await config.isProtocolPaused()).to.be.true;

      await expect(config.connect(admin).unpauseProtocol())
        .to.emit(config, "ProtocolUnpaused")
        .withArgs(admin.address);

      expect(await config.isProtocolPaused()).to.be.false;
    });

    it("allows pausing individual asset", async function () {
      const mockAsset = ethers.Wallet.createRandom().address;
      expect(await config.isAssetPaused(mockAsset)).to.be.false;

      await expect(config.connect(emergencyAdmin).setAssetPaused(mockAsset, true))
        .to.emit(config, "AssetPaused")
        .withArgs(mockAsset, emergencyAdmin.address);

      expect(await config.isAssetPaused(mockAsset)).to.be.true;

      await expect(config.connect(emergencyAdmin).setAssetPaused(mockAsset, false))
        .to.emit(config, "AssetUnpaused")
        .withArgs(mockAsset, emergencyAdmin.address);

      expect(await config.isAssetPaused(mockAsset)).to.be.false;
    });
  });

  describe("Treasury Management", function () {
    it("allows admin to update treasury address", async function () {
      await expect(config.connect(admin).setTreasury(newTreasury.address))
        .to.emit(config, "TreasuryUpdated")
        .withArgs(treasury.address, newTreasury.address);

      expect(await config.getTreasury()).to.equal(newTreasury.address);
    });

    it("reverts when setting treasury to zero address", async function () {
      await expect(
        config.connect(admin).setTreasury(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(config, "ZeroAddress");
    });
  });
});
