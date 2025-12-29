module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Use global cache that persists between function calls
  let cache = global.priceCache;
  let cacheTime = global.priceCacheTime || 0;
  const CACHE_DURATION = 30000; // 30 seconds
  
  // Return cached data if fresh
  if (cache && Date.now() - cacheTime < CACHE_DURATION) {
    return res.status(200).json(cache);
  }
  
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform to match our format
    const prices = {
      BTC: data.bitcoin.usd,
      ETH: data.ethereum.usd,
      SOL: data.solana.usd
    };
    
    // Store in global cache
    global.priceCache = prices;
    global.priceCacheTime = Date.now();
    
    res.status(200).json(prices);
  } catch (error) {
    console.error('Error fetching prices:', error);
    
    // If cache exists but is stale, return it anyway
    if (cache) {
      return res.status(200).json(cache);
    }
    
    res.status(500).json({ error: error.message });
  }
};
