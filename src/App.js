import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Sun, Moon } from 'lucide-react';

const TOKENS = [
  { 
    symbol: 'BTC', 
    name: 'Bitcoin', 
    color: '#f7931a'
  },
  { 
    symbol: 'ETH', 
    name: 'Ethereum', 
    color: '#627eea'
  },
  { 
    symbol: 'SOL', 
    name: 'Solana', 
    color: '#14f195'
  }
];

const TIMEFRAMES = [
  { label: '15 Minute', slug: '15m', windowMinutes: 15 },
  { label: '1 Hour', slug: '1h', windowMinutes: 60 },
  { label: '4 Hour', slug: '4h', windowMinutes: 240 },
  { label: '1 Day', slug: '1d', windowMinutes: 1440 }
];

function App() {
  const [marketData, setMarketData] = useState({});
  const [startPrices, setStartPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [currentWindows, setCurrentWindows] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [countdowns, setCountdowns] = useState({});
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });

  // Load persisted start prices on mount
  useEffect(() => {
    const savedStartPrices = localStorage.getItem('startPrices');
    const savedWindows = localStorage.getItem('currentWindows');
    
    if (savedStartPrices) {
      setStartPrices(JSON.parse(savedStartPrices));
    }
    if (savedWindows) {
      setCurrentWindows(JSON.parse(savedWindows));
    }
  }, []);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const theme = {
    light: {
      bg: '#F3F4F6',
      cardBg: '#FFFFFF',
      text: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      hover: '#F9FAFB',
      accent: '#7C3AED'
    },
    dark: {
      bg: '#0B0E14',
      cardBg: '#1A1D26',
      text: '#F9FAFB',
      textSecondary: '#9CA3AF',
      border: '#2D3139',
      hover: '#252932',
      accent: '#A78BFA'
    }
  };

  const t = darkMode ? theme.dark : theme.light;

  const getWindowStart = useCallback((windowMinutes) => {
    const now = new Date();
    
    const etFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const etParts = etFormatter.formatToParts(now);
    const etDate = new Date(
      parseInt(etParts.find(p => p.type === 'year').value),
      parseInt(etParts.find(p => p.type === 'month').value) - 1,
      parseInt(etParts.find(p => p.type === 'day').value),
      parseInt(etParts.find(p => p.type === 'hour').value),
      parseInt(etParts.find(p => p.type === 'minute').value),
      parseInt(etParts.find(p => p.type === 'second').value)
    );
    
    const minutes = etDate.getMinutes();
    const hours = etDate.getHours();
    
    let windowTime = new Date(etDate);
    
    if (windowMinutes === 15) {
      const windowMinute = Math.floor(minutes / 15) * 15;
      windowTime.setMinutes(windowMinute);
    } else if (windowMinutes === 60) {
      windowTime.setMinutes(0);
    } else if (windowMinutes === 240) {
      const windowHour = Math.floor(hours / 4) * 4;
      windowTime.setHours(windowHour);
      windowTime.setMinutes(0);
    } else if (windowMinutes === 1440) {
      if (hours < 20) {
        windowTime.setDate(windowTime.getDate() - 1);
      }
      windowTime.setHours(20);
      windowTime.setMinutes(0);
    }
    
    windowTime.setSeconds(0);
    windowTime.setMilliseconds(0);
    
    return windowTime.getTime();
  }, []);

  const getNextWindowTime = useCallback((windowMinutes) => {
    const current = new Date(getWindowStart(windowMinutes));
    return new Date(current.getTime() + windowMinutes * 60 * 1000);
  }, [getWindowStart]);

  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date();
      const newCountdowns = {};
      
      TIMEFRAMES.forEach(tf => {
        const next = getNextWindowTime(tf.windowMinutes);
        const seconds = Math.floor((next - now) / 1000);
        newCountdowns[tf.slug] = seconds;
      });
      
      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [getNextWindowTime]);

  const getPolymarketUrl = useCallback((tokenSymbol, timeframeSlug) => {
    const window = currentWindows[timeframeSlug];
    if (!window) return '#';
    
    const date = new Date(window);
    const tokenName = TOKENS.find(t => t.symbol === tokenSymbol)?.name.toLowerCase() || tokenSymbol.toLowerCase();
    
    if (timeframeSlug === '15m') {
      const windowTimestamp = Math.floor(window / 1000);
      const slug = `${tokenSymbol.toLowerCase()}-updown-15m-${windowTimestamp}`;
      return `https://polymarket.com/event/${slug}`;
    } 
    else if (timeframeSlug === '1h') {
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                      'july', 'august', 'september', 'october', 'november', 'december'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      let hour = date.getHours();
      const ampm = hour >= 12 ? 'pm' : 'am';
      hour = hour % 12 || 12;
      
      const slug = `${tokenName}-up-or-down-${month}-${day}-${hour}${ampm}-et`;
      return `https://polymarket.com/event/${slug}`;
    }
    else if (timeframeSlug === '4h') {
      const windowTimestamp = Math.floor(window / 1000);
      const slug = `${tokenSymbol.toLowerCase()}-updown-4h-${windowTimestamp}`;
      return `https://polymarket.com/event/${slug}`;
    }
    else if (timeframeSlug === '1d') {
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                      'july', 'august', 'september', 'october', 'november', 'december'];
      
      const marketDate = new Date(date);
      marketDate.setDate(marketDate.getDate() + 1);
      
      const month = months[marketDate.getMonth()];
      const day = marketDate.getDate();
      
      const slug = `${tokenName}-up-or-down-on-${month}-${day}`;
      return `https://polymarket.com/event/${slug}`;
    }
    
    return '#';
  }, [currentWindows]);

  const formatCountdown = (seconds) => {
    if (seconds < 0) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchChainlinkPrices = useCallback(async () => {
  setRefreshing(true);
  try {
    // Always use deployed URL for now
    const response = await fetch('https://poly-screener.vercel.app/api/prices');
    const prices = await response.json();
    
    console.log('Fetched prices:', prices); // Debug log
    
    if (prices.error) {
      console.error('API error:', prices.error);
      setRefreshing(false);
      return;
    }

    setMarketData(prices);
    
      
      const newWindows = {};
      const newStartPrices = { ...startPrices };
      
      TIMEFRAMES.forEach(tf => {
        const currentWindow = getWindowStart(tf.windowMinutes);
        newWindows[tf.slug] = currentWindow;
        
        if (!currentWindows[tf.slug] || currentWindow !== currentWindows[tf.slug]) {
          if (!newStartPrices[tf.slug]) {
            newStartPrices[tf.slug] = {};
          }
          newStartPrices[tf.slug] = { ...prices };
        } else if (!newStartPrices[tf.slug]) {
          newStartPrices[tf.slug] = { ...prices };
        }
      });
      
      setCurrentWindows(newWindows);
      setStartPrices(newStartPrices);
      
      // Persist to localStorage
      localStorage.setItem('startPrices', JSON.stringify(newStartPrices));
      localStorage.setItem('currentWindows', JSON.stringify(newWindows));
      
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching prices:', err);
    }
    setRefreshing(false);
  }, [currentWindows, startPrices, getWindowStart]);

  useEffect(() => {
    const initialize = async () => {
      await fetchChainlinkPrices();
      setLoading(false);
    };

    initialize();
  }, [fetchChainlinkPrices]);

  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      fetchChainlinkPrices();
    }, 15000);

    return () => clearInterval(interval);
  }, [loading, fetchChainlinkPrices]);

  const calculateChange = (current, start) => {
    if (!start || start === 0) return { value: 0, percent: 0 };
    const value = current - start;
    const percent = (value / start) * 100;
    return { value, percent };
  };

  const getBiggestMover = (timeframeSlug) => {
    const tfStartPrices = startPrices[timeframeSlug];
    if (!tfStartPrices) return null;
    
    let maxChange = 0;
    let biggestToken = null;
    
    TOKENS.forEach(token => {
      const current = marketData[token.symbol];
      const start = tfStartPrices[token.symbol];
      if (current && start) {
        const change = Math.abs(calculateChange(current, start).percent);
        if (change > maxChange) {
          maxChange = change;
          biggestToken = token.symbol;
        }
      }
    });
    
    return biggestToken;
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: t.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center', color: t.text }}>
          <RefreshCw style={{ 
            width: 48, 
            height: 48, 
            margin: '0 auto 16px', 
            animation: 'spin 1s linear infinite' 
          }} />
          <div style={{ fontSize: '20px' }}>Loading markets...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: t.bg,
      padding: '20px 12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      transition: 'background 0.3s ease'
    }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 15px rgba(167, 139, 250, 0.4); }
          50% { box-shadow: 0 0 25px rgba(167, 139, 250, 0.6); }
        }
        @media (max-width: 768px) {
          .table-header, .table-row {
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 8px !important;
          }
          .asset-cell {
            grid-column: 1 / -1 !important;
          }
          .timer-desktop {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .timer-mobile {
            display: none !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ 
              fontSize: 'clamp(24px, 5vw, 36px)', 
              fontWeight: 'bold', 
              color: t.text, 
              margin: '0 0 4px 0'
            }}>
              Polymarket Tracker
            </h1>
            <p style={{ 
              fontSize: 'clamp(12px, 3vw, 14px)', 
              color: t.textSecondary, 
              margin: 0
            }}>
              Real-time price tracking synced with Polymarket
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              background: t.cardBg,
              border: `1px solid ${t.border}`,
              borderRadius: '8px',
              padding: '10px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: t.text,
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = t.hover}
            onMouseLeave={(e) => e.currentTarget.style.background = t.cardBg}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>

        {/* Timeframe Tables */}
        {TIMEFRAMES.map((timeframe, tfIndex) => {
          const biggestMover = getBiggestMover(timeframe.slug);
          const tfStartPrices = startPrices[timeframe.slug] || {};
          const hasStartPrices = Object.keys(tfStartPrices).length > 0;

          return (
            <div key={timeframe.slug} style={{ marginBottom: tfIndex < TIMEFRAMES.length - 1 ? '32px' : '0' }}>
              {/* Timeframe Header */}
              <h2 style={{ 
                fontSize: 'clamp(18px, 4vw, 22px)', 
                fontWeight: '600', 
                color: t.text,
                margin: '0 0 12px 0',
                padding: '0 4px'
              }}>
                {timeframe.label}
              </h2>

              {/* Table Header */}
              <div className="table-header" style={{
                background: t.cardBg,
                borderRadius: '12px 12px 0 0',
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: '140px 1fr 1fr 1fr 90px',
                gap: '12px',
                alignItems: 'center',
                borderBottom: `1px solid ${t.border}`
              }}>
                <div style={{ color: t.textSecondary, fontSize: 'clamp(10px, 2.5vw, 11px)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ASSET
                </div>
                <div style={{ color: t.textSecondary, fontSize: 'clamp(10px, 2.5vw, 11px)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  START
                </div>
                <div style={{ color: t.textSecondary, fontSize: 'clamp(10px, 2.5vw, 11px)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  CURRENT
                </div>
                <div style={{ color: t.textSecondary, fontSize: 'clamp(10px, 2.5vw, 11px)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  CHANGE
                </div>
                <div className="timer-desktop" style={{ color: t.textSecondary, fontSize: 'clamp(10px, 2.5vw, 11px)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  RESET
                </div>
              </div>

              {/* Table Rows */}
              <div style={{
                background: t.cardBg,
                borderRadius: '0 0 12px 12px',
                overflow: 'hidden',
                boxShadow: darkMode ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                {TOKENS.map((token, index) => {
                  const currentPrice = marketData[token.symbol] || 0;
                  const startPrice = tfStartPrices[token.symbol] || 0;
                  const change = calculateChange(currentPrice, startPrice);
                  const isPositive = change.value >= 0;
                  const isBiggestMover = token.symbol === biggestMover;

                  return (
                    <a
                      key={token.symbol}
                      href={getPolymarketUrl(token.symbol, timeframe.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="table-row asset-cell"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '140px 1fr 1fr 1fr 90px',
                        gap: '12px',
                        alignItems: 'center',
                        padding: '16px',
                        borderBottom: index < TOKENS.length - 1 ? `1px solid ${t.border}` : 'none',
                        background: isBiggestMover ? (darkMode ? 'rgba(167, 139, 250, 0.08)' : 'rgba(124, 58, 237, 0.05)') : 'transparent',
                        borderLeft: isBiggestMover ? `3px solid ${t.accent}` : '3px solid transparent',
                        animation: isBiggestMover ? 'glow 2s ease-in-out infinite' : 'none',
                        transition: 'all 0.2s ease',
                        textDecoration: 'none',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!isBiggestMover) {
                          e.currentTarget.style.background = t.hover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isBiggestMover) {
                          e.currentTarget.style.background = 'transparent';
                        } else {
                          e.currentTarget.style.background = darkMode ? 'rgba(167, 139, 250, 0.08)' : 'rgba(124, 58, 237, 0.05)';
                        }
                      }}
                    >
                      {/* Asset */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: 'clamp(32px, 8vw, 40px)',
                          height: 'clamp(32px, 8vw, 40px)',
                          borderRadius: '50%',
                          background: token.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'clamp(14px, 3.5vw, 18px)',
                          fontWeight: 'bold',
                          color: 'white',
                          flexShrink: 0
                        }}>
                          {token.symbol[0]}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ 
                            fontSize: 'clamp(14px, 3.5vw, 16px)', 
                            fontWeight: '600', 
                            color: t.text,
                            marginBottom: '2px'
                          }}>
                            {token.symbol}
                          </div>
                          <div className="timer-mobile" style={{ 
                            fontSize: 'clamp(10px, 2.5vw, 11px)', 
                            color: t.textSecondary,
                            fontFamily: 'monospace'
                          }}>
                            {formatCountdown(countdowns[timeframe.slug] || 0)}
                          </div>
                        </div>
                      </div>

                      {/* Starting */}
                      <div>
                        <div style={{ fontSize: 'clamp(9px, 2vw, 10px)', color: t.textSecondary, marginBottom: '4px' }}>
                          Start
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 15px)', fontWeight: '500', color: t.textSecondary }}>
                          {formatPrice(startPrice)}
                        </div>
                      </div>

                      {/* Current */}
                      <div>
                        <div style={{ fontSize: 'clamp(9px, 2vw, 10px)', color: t.textSecondary, marginBottom: '4px' }}>
                          Current
                        </div>
                        <div style={{ fontSize: 'clamp(14px, 3.5vw, 17px)', fontWeight: '600', color: t.text }}>
                          {formatPrice(currentPrice)}
                        </div>
                      </div>

                      {/* Change */}
                      <div>
                        <div style={{ fontSize: 'clamp(9px, 2vw, 10px)', color: t.textSecondary, marginBottom: '4px' }}>
                          Change
                        </div>
                        <div style={{ 
                          fontSize: 'clamp(14px, 3.5vw, 17px)', 
                          fontWeight: '600', 
                          color: hasStartPrices ? (isPositive ? '#10B981' : '#EF4444') : t.textSecondary
                        }}>
                          {hasStartPrices ? `${isPositive ? '+' : ''}${change.percent.toFixed(2)}%` : '--'}
                        </div>
                      </div>

                      {/* Reset Timer (Desktop) */}
                      <div className="timer-desktop">
                        <div style={{ fontSize: 'clamp(9px, 2vw, 10px)', color: t.textSecondary, marginBottom: '4px' }}>
                          Reset
                        </div>
                        <div style={{ 
                          fontSize: 'clamp(12px, 2.5vw, 14px)', 
                          fontWeight: '600', 
                          color: t.accent,
                          fontFamily: 'monospace'
                        }}>
                          {formatCountdown(countdowns[timeframe.slug] || 0)}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '32px',
          color: t.textSecondary,
          fontSize: 'clamp(11px, 2.5vw, 12px)'
        }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px',
            background: t.cardBg,
            padding: '8px 16px',
            borderRadius: '8px',
            border: `1px solid ${t.border}`
          }}>
            {refreshing && <RefreshCw style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />}
            <span>Updated {lastUpdate?.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;