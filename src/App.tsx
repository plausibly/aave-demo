import { useEffect, useState } from 'react'
import { ethers, Contract } from 'ethers';
import PoolAddressProviderABI from "./contracts/AavePoolAddressProviderABI.json";
import DataProviderABI from "./contracts/AaveProtocolDataProviderABI.json";
import './App.css'

// getReserveData response - https://aave.com/docs/developers/smart-contracts/view-contracts 
interface ReserveData {
  unbacked: bigint,
  accruedToTreasuryScaled: bigint,
  totalAToken: bigint,
  totalStableDebt: bigint,
  totalVariableDebt: bigint,
  liquidityRate: bigint,
  variableBorrowRate: bigint,
  stableBorrowRate: bigint,
  liquidityIndex: bigint,
  variableBorrowIndex: bigint,
  lastUpdateTimestamp: number
};

const TOKEN = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const POOL_PROVIDER_ADDR = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";
const ETHERS_PROVIDER = ethers.getDefaultProvider();

const POOL_PROVIDER = new Contract(POOL_PROVIDER_ADDR, PoolAddressProviderABI, ETHERS_PROVIDER);

/**
 * Calculate APY from reserve data rate
 * @param rawRate The rate in "ray" format (27 decimals as per AAVE docs)
 * @returns Calculated APY based on the rate
 */
function calculateAPY(rawRate: bigint) {
  const secondsPerYear = 31536000; // AAVE uses seconds in their js math library
  let rate = Number(ethers.formatUnits(rawRate, 27));
  rate = (Math.pow(1 + (rate/secondsPerYear), secondsPerYear) - 1) * 100;

  return rate.toFixed(2);
}

async function fetchData() {
  const poolAddress = await POOL_PROVIDER.getPoolDataProvider();
  const dataProviderContract = new Contract(poolAddress, DataProviderABI, ETHERS_PROVIDER);
  const reserveData: ReserveData = await dataProviderContract.getReserveData(TOKEN);

  return {
    supply: ethers.formatUnits(reserveData.totalAToken, 6),
    borrow: ethers.formatUnits(reserveData.totalVariableDebt, 6),
    supplyAPY: calculateAPY(reserveData.liquidityRate),
    borrowAPY: calculateAPY(reserveData.variableBorrowRate),
  }
}

function App() {
  const [totalSupply, setTotalSupply] = useState("");
  const [supplyAPY, setSupplyAPY] = useState("");
  const [totalBorrow, setTotalBorrow] = useState("");
  const [borrowAPY, setBorrowAPY] = useState("");

  useEffect(() => {
    console.log("Reloading");
    fetchData().then(
      res => {
        setTotalSupply(res.supply);
        setTotalBorrow(res.borrow);
        setSupplyAPY(res.supplyAPY);
        setBorrowAPY(res.borrowAPY);
      }
    );
  }, [totalBorrow, totalSupply, borrowAPY, supplyAPY]);


  return (
    <>
      <h1>USDC Market Data</h1>
      <div className="card">
        <h3>Total Supply: {totalSupply} </h3>
        <h3>Total Borrowed: {totalBorrow} </h3>
        <h3>Supply APY: {supplyAPY}%</h3>
        <h3>Borrow APY: {borrowAPY}%</h3>
      </div>
      <p>
        source: AAVE
      </p>
    </>
  )
}

export default App
