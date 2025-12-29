module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Simple test response first
    const prices = {
      BTC: 95000,
      ETH: 3400,
      SOL: 190
    };
    
    res.status(200).json(prices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
