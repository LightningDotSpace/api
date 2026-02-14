const http = require('http');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'src', 'assets');

const MOCK_DATA = {
  channels: [
    { name: 'peer-alice', capacity: 5000000, localBalance: 3000000, remoteBalance: 2000000 },
  ],
  balances: [
    {
      assetName: 'BTC',
      assetSymbol: 'B',
      onchainBalance: 35390000,
      lndOnchainBalance: 35300000,
      lightningBalance: 128180000,
      citreaBalance: 60010000,
      customerBalance: 161260000,
      ldsBalance: 97640000,
      ldsBalanceInCHF: 5000.0,
      assetPriceInCHF: 50000.0,
    },
  ],
  evmBalances: [
    {
      blockchain: 'ethereum',
      nativeSymbol: 'ETH',
      nativeBalance: 0.5,
      tokens: [
        { symbol: 'WBTC', address: '0xwbtc', balance: 0.0037 },
        { symbol: 'USDC', address: '0xusdc', balance: 839.99 },
        { symbol: 'USDT', address: '0xusdt', balance: 2630.35 },
      ],
    },
    {
      blockchain: 'citrea',
      nativeSymbol: 'cBTC',
      nativeBalance: 0.6001,
      tokens: [
        { symbol: 'WBTCe', address: '0xwbtce', balance: 0.0012 },
        { symbol: 'JUSD', address: '0xjusd', balance: 57999.35 },
      ],
    },
    {
      blockchain: 'polygon',
      nativeSymbol: 'MATIC',
      nativeBalance: 10.0,
      tokens: [
        { symbol: 'USDT', address: '0xusdt-poly', balance: 40091.03 },
      ],
    },
  ],
  timestamp: new Date().toISOString(),
};

function generateBtcHistory(range) {
  const now = Date.now();
  const intervals = { '24h': { count: 24, step: 60 * 60 * 1000 }, '7d': { count: 28, step: 6 * 60 * 60 * 1000 }, '30d': { count: 30, step: 24 * 60 * 60 * 1000 } };
  const cfg = intervals[range] || intervals['24h'];
  const points = [];
  for (let i = cfg.count; i >= 0; i--) {
    const ts = new Date(now - i * cfg.step).toISOString();
    const base = 0.95 + Math.sin(i * 0.3) * 0.05;
    points.push({ timestamp: ts, netBalance: parseFloat(base.toFixed(8)) });
  }
  return points;
}

function generateUsdHistory(range) {
  const now = Date.now();
  const intervals = { '24h': { count: 24, step: 60 * 60 * 1000 }, '7d': { count: 28, step: 6 * 60 * 60 * 1000 }, '30d': { count: 30, step: 24 * 60 * 60 * 1000 } };
  const cfg = intervals[range] || intervals['24h'];
  const points = [];
  for (let i = cfg.count; i >= 0; i--) {
    const ts = new Date(now - i * cfg.step).toISOString();
    const base = 101000 + Math.sin(i * 0.4) * 2000;
    points.push({ timestamp: ts, totalBalance: parseFloat(base.toFixed(2)) });
  }
  return points;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:3099');

  if (url.pathname === '/monitoring/btc/history') {
    const range = url.searchParams.get('range') || '24h';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ points: generateBtcHistory(range), range }));
    return;
  }

  if (url.pathname === '/monitoring/usd/history') {
    const range = url.searchParams.get('range') || '24h';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ points: generateUsdHistory(range), range }));
    return;
  }

  if (req.url === '/monitoring/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(MOCK_DATA));
    return;
  }

  const routes = {
    '/monitoring': 'monitoring.html',
    '/monitoring/monitoring.js': 'monitoring.js',
    '/monitoring/btc': 'monitoring-btc.html',
    '/monitoring/btc.js': 'monitoring-btc.js',
    '/monitoring/usd': 'monitoring-usd.html',
    '/monitoring/usd.js': 'monitoring-usd.js',
    '/monitoring/chart.min.js': 'chart.min.js',
    '/monitoring/chartjs-adapter-date-fns.min.js': 'chartjs-adapter-date-fns.min.js',
  };

  const file = routes[req.url];
  if (file) {
    const filePath = path.join(ASSETS, file);
    const contentType = file.endsWith('.js') ? 'application/javascript' : 'text/html';
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(3099, () => {
  console.log('Mock server running on http://localhost:3099');
});
