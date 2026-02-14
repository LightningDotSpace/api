function fmtUsd(n) {
  if (n == null) return '-';
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

var USD_TOKENS = [
  { symbol: 'JUSD', chain: 'citrea', label: 'Citrea' },
  { symbol: 'USDC', chain: 'ethereum', label: 'Ethereum' },
  { symbol: 'USDT', chain: 'ethereum', label: 'Ethereum' },
  { symbol: 'USDT', chain: 'polygon', label: 'Polygon' },
];

async function loadData() {
  var content = document.getElementById('content');
  try {
    var res = await fetch('/monitoring/data');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    render(data);
  } catch (e) {
    content.innerHTML = '<div class="error">Failed to load data: ' + e.message + '</div>';
  }
}

function render(data) {
  var content = document.getElementById('content');
  document.getElementById('timestamp').textContent = 'Last updated: ' + new Date(data.timestamp).toLocaleString();

  var evmByChain = {};
  for (var i = 0; i < data.evmBalances.length; i++) {
    evmByChain[data.evmBalances[i].blockchain] = data.evmBalances[i];
  }

  var holdings = [];
  var totalHoldings = 0;

  for (var i = 0; i < USD_TOKENS.length; i++) {
    var def = USD_TOKENS[i];
    var balance = 0;
    var evm = evmByChain[def.chain];
    if (evm) {
      for (var j = 0; j < evm.tokens.length; j++) {
        if (evm.tokens[j].symbol === def.symbol) {
          balance = evm.tokens[j].balance || 0;
          break;
        }
      }
    }
    holdings.push({ token: def.symbol, chain: def.label, usd: balance });
    totalHoldings += balance;
  }

  var html = '';

  // Holdings Breakdown
  html += '<div class="section">';
  html += '<h2>USD Holdings Breakdown</h2>';
  html += '<table>';
  html += '<tr><th>Token</th><th>Chain</th><th class="number">USD</th></tr>';
  for (var i = 0; i < holdings.length; i++) {
    var h = holdings[i];
    html += '<tr>';
    html += '<td>' + h.token + '</td>';
    html += '<td>' + h.chain + '</td>';
    html += '<td class="number">' + fmtUsd(h.usd) + '</td>';
    html += '</tr>';
  }
  html += '<tr class="total-row">';
  html += '<td>Total</td><td></td>';
  html += '<td class="number">' + fmtUsd(totalHoldings) + '</td>';
  html += '</tr>';
  html += '</table>';
  html += '</div>';

  content.innerHTML = html;
}

loadData();
