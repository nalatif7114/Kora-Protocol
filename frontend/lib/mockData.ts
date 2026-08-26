export interface MarketReserve {
  symbol: string;
  name: string;
  decimals: number;
  priceUSD: number;
  totalSupplied: number;
  totalBorrowed: number;
  availableLiquidity: number;
  utilizationRate: number;
  supplyAPY: number;
  borrowAPR: number;
  ltv: number;
  liquidationThreshold: number;
  liquidationBonus: number;
  walletBalance: number;
  userSupplied: number;
  userBorrowed: number;
  isCollateral: boolean;
}

export interface VulnerablePosition {
  userAddress: string;
  collateralAsset: string;
  collateralAmount: number;
  collateralUSD: number;
  debtAsset: string;
  debtAmount: number;
  debtUSD: number;
  healthFactor: number;
  closeFactor: number;
  isExtreme: boolean;
  maxRepayUSD: number;
  estimatedProfitUSD: number;
}

export const INITIAL_RESERVES: MarketReserve[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    priceUSD: 1.00,
    totalSupplied: 12500000,
    totalBorrowed: 8400000,
    availableLiquidity: 4100000,
    utilizationRate: 0.672,
    supplyAPY: 0.0468,
    borrowAPR: 0.0582,
    ltv: 0.80,
    liquidationThreshold: 0.85,
    liquidationBonus: 0.05,
    walletBalance: 25000,
    userSupplied: 10000,
    userBorrowed: 0,
    isCollateral: true,
  },
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    priceUSD: 3150.00,
    totalSupplied: 4200,
    totalBorrowed: 2600,
    availableLiquidity: 1600,
    utilizationRate: 0.619,
    supplyAPY: 0.0385,
    borrowAPR: 0.0510,
    ltv: 0.75,
    liquidationThreshold: 0.80,
    liquidationBonus: 0.05,
    walletBalance: 12.5,
    userSupplied: 8.0,
    userBorrowed: 0,
    isCollateral: true,
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    priceUSD: 64200.00,
    totalSupplied: 380,
    totalBorrowed: 210,
    availableLiquidity: 170,
    utilizationRate: 0.552,
    supplyAPY: 0.0295,
    borrowAPR: 0.0440,
    ltv: 0.70,
    liquidationThreshold: 0.75,
    liquidationBonus: 0.05,
    walletBalance: 0.85,
    userSupplied: 0.5,
    userBorrowed: 0,
    isCollateral: true,
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    priceUSD: 1.00,
    totalSupplied: 6200000,
    totalBorrowed: 4300000,
    availableLiquidity: 1900000,
    utilizationRate: 0.693,
    supplyAPY: 0.0512,
    borrowAPR: 0.0625,
    ltv: 0.75,
    liquidationThreshold: 0.80,
    liquidationBonus: 0.05,
    walletBalance: 15000,
    userSupplied: 0,
    userBorrowed: 0,
    isCollateral: false,
  },
];

export const INITIAL_RADAR_POSITIONS: VulnerablePosition[] = [
  {
    userAddress: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    collateralAsset: "WETH",
    collateralAmount: 8.4,
    collateralUSD: 26460,
    debtAsset: "USDC",
    debtAmount: 23200,
    debtUSD: 23200,
    healthFactor: 0.912,
    closeFactor: 1.00,
    isExtreme: true,
    maxRepayUSD: 23200,
    estimatedProfitUSD: 1160,
  },
  {
    userAddress: "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be",
    collateralAsset: "WBTC",
    collateralAmount: 0.65,
    collateralUSD: 41730,
    debtAsset: "USDC",
    debtAmount: 32000,
    debtUSD: 32000,
    healthFactor: 0.978,
    closeFactor: 0.50,
    isExtreme: false,
    maxRepayUSD: 16000,
    estimatedProfitUSD: 800,
  },
  {
    userAddress: "0x1111111254fb6c44bac0bed2854e76f90643097d",
    collateralAsset: "WETH",
    collateralAmount: 15.0,
    collateralUSD: 47250,
    debtAsset: "DAI",
    debtAmount: 36500,
    debtUSD: 36500,
    healthFactor: 1.035,
    closeFactor: 0.50,
    isExtreme: false,
    maxRepayUSD: 18250,
    estimatedProfitUSD: 912.5,
  },
];
