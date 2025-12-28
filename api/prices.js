const { ethers } = require('ethers');

const CHAINLINK_ABI = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)"
];

const FEEDS = {
  BTC: '0xc907E116054Ad103354f2D350FD2514433D57F6f',
  ETH: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
  SOL: '0x10C8264C0935b3B9870013e057f330Ff3e9C56dC'
};

let cache = null;
let cacheTime = 0;
const CACHE_DURATION = 10000; // 10 seconds

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Return cached data if fresh
  if (cache && Date.now() - cacheTime < CACHE_DURATION) {
    return res.status(200).json(cache);
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(
      `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    );
    
    const prices = {};
    
    for (const [symbol, address] of Object.entries(FEEDS)) {
      const contract = new ethers.Contract(address, CHAINLINK_ABI, provider);
      const roundData = await contract.latestRoundData();
      const decimals = await contract.decimals();
      prices[symbol] = Number(roundData.answer) / Math.pow(10, Number(decimals));
    }
    
    cache = prices;
    cacheTime = Date.now();
    
    res.status(200).json(prices);
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ error: error.message });
  }
};