import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("==================================================");
  console.log("Deploying Kora Protocol Core Contracts...");
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("==================================================");

  // 1. Deploy Config
  const KoraConfig = await ethers.getContractFactory("KoraConfig");
  const config = await KoraConfig.deploy(deployer.address, deployer.address);
  await config.waitForDeployment();
  const configAddress = await config.getAddress();
  console.log("✔ KoraConfig deployed to:", configAddress);

  // 2. Deploy ReserveManager
  const KoraReserveManager = await ethers.getContractFactory("KoraReserveManager");
  const reserveManager = await KoraReserveManager.deploy(configAddress);
  await reserveManager.waitForDeployment();
  const reserveManagerAddress = await reserveManager.getAddress();
  console.log("✔ KoraReserveManager deployed to:", reserveManagerAddress);

  // 3. Deploy OracleManager
  const KoraOracleManager = await ethers.getContractFactory("KoraOracleManager");
  const oracleManager = await KoraOracleManager.deploy(configAddress);
  await oracleManager.waitForDeployment();
  const oracleManagerAddress = await oracleManager.getAddress();
  console.log("✔ KoraOracleManager deployed to:", oracleManagerAddress);

  // 4. Deploy RiskEngine
  const KoraRiskEngine = await ethers.getContractFactory("KoraRiskEngine");
  const riskEngine = await KoraRiskEngine.deploy(
    reserveManagerAddress,
    oracleManagerAddress,
    configAddress
  );
  await riskEngine.waitForDeployment();
  const riskEngineAddress = await riskEngine.getAddress();
  console.log("✔ KoraRiskEngine deployed to:", riskEngineAddress);

  // 5. Deploy LiquidationEngine
  const KoraLiquidationEngine = await ethers.getContractFactory("KoraLiquidationEngine");
  const liquidationEngine = await KoraLiquidationEngine.deploy(
    reserveManagerAddress,
    oracleManagerAddress,
    riskEngineAddress,
    configAddress
  );
  await liquidationEngine.waitForDeployment();
  const liquidationEngineAddress = await liquidationEngine.getAddress();
  console.log("✔ KoraLiquidationEngine deployed to:", liquidationEngineAddress);

  // 6. Deploy LendingPool
  const KoraLendingPool = await ethers.getContractFactory("KoraLendingPool");
  const lendingPool = await KoraLendingPool.deploy(configAddress, reserveManagerAddress);
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  console.log("✔ KoraLendingPool deployed to:", lendingPoolAddress);

  // 7. Wire Dependencies
  await reserveManager.setLendingPool(lendingPoolAddress);
  await riskEngine.setLendingPool(lendingPoolAddress);
  await lendingPool.setRiskEngine(riskEngineAddress);
  await lendingPool.setLiquidationEngine(liquidationEngineAddress);
  console.log("✔ Protocol modules linked and configured.");

  // 8. Deploy Default Interest Rate Model (80% optimal, 2% base, 4% slope1, 75% slope2)
  const KoraInterestRateModel = await ethers.getContractFactory("KoraInterestRateModel");
  const rateModel = await KoraInterestRateModel.deploy(
    ethers.parseUnits("0.80", 18),
    ethers.parseUnits("0.02", 27),
    ethers.parseUnits("0.04", 27),
    ethers.parseUnits("0.75", 27)
  );
  await rateModel.waitForDeployment();
  const rateModelAddress = await rateModel.getAddress();
  console.log("✔ KoraInterestRateModel deployed to:", rateModelAddress);

  // 9. Deploy Mock Tokens & Oracles for local testing
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();

  const mockWETH = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
  await mockWETH.waitForDeployment();
  const wethAddress = await mockWETH.getAddress();

  const MockAggregatorV3 = await ethers.getContractFactory("MockAggregatorV3");
  const mockUSDCFeed = await MockAggregatorV3.deploy(8, "USDC / USD", 1n * 10n ** 8n);
  await mockUSDCFeed.waitForDeployment();

  const mockETHFeed = await MockAggregatorV3.deploy(8, "ETH / USD", 3000n * 10n ** 8n);
  await mockETHFeed.waitForDeployment();

  await oracleManager.setAssetSource(usdcAddress, await mockUSDCFeed.getAddress(), 86400);
  await oracleManager.setAssetSource(wethAddress, await mockETHFeed.getAddress(), 86400);

  // 10. Initialize Initial Reserves
  await lendingPool.initReserve(
    usdcAddress,
    6,
    ethers.parseUnits("10000000", 6), // 10M USDC Cap
    ethers.parseUnits("8000000", 6),  // 8M USDC Borrow Cap
    ethers.parseUnits("0.10", 18),    // 10% Reserve Factor
    ethers.parseUnits("0.80", 18),    // 80% LTV
    ethers.parseUnits("0.85", 18),    // 85% LT
    ethers.parseUnits("0.05", 18)     // 5% Bonus
  );
  await lendingPool.setInterestRateModel(usdcAddress, rateModelAddress);

  await lendingPool.initReserve(
    wethAddress,
    18,
    ethers.parseUnits("5000", 18),    // 5,000 WETH Cap
    ethers.parseUnits("4000", 18),    // 4,000 WETH Borrow Cap
    ethers.parseUnits("0.10", 18),    // 10% Reserve Factor
    ethers.parseUnits("0.75", 18),    // 75% LTV
    ethers.parseUnits("0.80", 18),    // 80% LT
    ethers.parseUnits("0.05", 18)     // 5% Bonus
  );
  await lendingPool.setInterestRateModel(wethAddress, rateModelAddress);
  console.log("✔ Initial USDC and WETH reserves initialized.");

  // 11. Export Deployment Registry
  const deploymentData = {
    network: "hardhat",
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    contracts: {
      KoraConfig: configAddress,
      KoraReserveManager: reserveManagerAddress,
      KoraOracleManager: oracleManagerAddress,
      KoraRiskEngine: riskEngineAddress,
      KoraLiquidationEngine: liquidationEngineAddress,
      KoraLendingPool: lendingPoolAddress,
      KoraInterestRateModel: rateModelAddress,
      MockUSDC: usdcAddress,
      MockWETH: wethAddress,
    },
  };

  const exportDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(exportDir, "deployment-local.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("✔ Deployment artifacts written to deployments/deployment-local.json");
  console.log("==================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
