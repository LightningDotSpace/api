function fmtBtc(n) {
  if (n == null) return '-';
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  });
}

function colorClass(n) {
  if (n > 0) return 'positive';
  if (n < 0) return 'negative';
  return '';
}

function satsToBtc(sats) {
  return (sats || 0) / 100000000;
}

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

  var btcBalance = null;
  for (var i = 0; i < data.balances.length; i++) {
    if (data.balances[i].assetSymbol === 'BTC') {
      btcBalance = data.balances[i];
      break;
    }
  }

  var wbtcEthereum = 0;
  var wbtceCitrea = 0;
  for (var i = 0; i < data.evmBalances.length; i++) {
    var evm = data.evmBalances[i];
    for (var j = 0; j < evm.tokens.length; j++) {
      var t = evm.tokens[j];
      if (evm.blockchain === 'ethereum' && t.symbol === 'WBTC') {
        wbtcEthereum = t.balance || 0;
      }
      if (evm.blockchain === 'citrea' && t.symbol === 'WBTCe') {
        wbtceCitrea = t.balance || 0;
      }
    }
  }

  var onchainBtc = btcBalance ? satsToBtc(btcBalance.onchainBalance) : 0;
  var lndOnchain = btcBalance ? satsToBtc(btcBalance.lndOnchainBalance) : 0;
  var lightning = btcBalance ? satsToBtc(btcBalance.lightningBalance) : 0;
  var cbtc = btcBalance ? satsToBtc(btcBalance.citreaBalance) : 0;
  var customerBtc = btcBalance ? satsToBtc(btcBalance.customerBalance) : 0;

  var holdings = [
    { source: 'Onchain BTC', location: 'Bitcoin', btc: onchainBtc },
    { source: 'LND Onchain', location: 'LND Wallet', btc: lndOnchain },
    { source: 'Lightning', location: 'LN Channels', btc: lightning },
    { source: 'cBTC', location: 'Citrea', btc: cbtc },
    { source: 'WBTC', location: 'Ethereum', btc: wbtcEthereum },
    { source: 'WBTCe', location: 'Citrea', btc: wbtceCitrea },
  ];

  var totalHoldings = 0;
  for (var i = 0; i < holdings.length; i++) {
    totalHoldings += holdings[i].btc;
  }

  var netPosition = totalHoldings - customerBtc;

  var html = '';

  // Holdings Breakdown
  html += '<div class="section">';
  html += '<h2>BTC Holdings Breakdown</h2>';
  html += '<table>';
  html += '<tr><th>Source</th><th>Location</th><th class="number">BTC</th></tr>';
  for (var i = 0; i < holdings.length; i++) {
    var h = holdings[i];
    html += '<tr>';
    html += '<td>' + h.source + '</td>';
    html += '<td>' + h.location + '</td>';
    html += '<td class="number">' + fmtBtc(h.btc) + '</td>';
    html += '</tr>';
  }
  html += '<tr class="total-row">';
  html += '<td>Total</td><td></td>';
  html += '<td class="number">' + fmtBtc(totalHoldings) + '</td>';
  html += '</tr>';
  html += '</table>';
  html += '</div>';

  // Balance Sheet
  html += '<div class="section">';
  html += '<h2>BTC Balance Sheet</h2>';
  html += '<table>';
  html += '<tr><th></th><th class="number">BTC</th></tr>';
  html += '<tr><td>Total Holdings</td><td class="number">' + fmtBtc(totalHoldings) + '</td></tr>';
  html += '<tr><td>Customer Balance</td><td class="number negative">' + fmtBtc(-customerBtc) + '</td></tr>';
  html += '<tr class="total-row">';
  html += '<td>LDS Net Position</td>';
  html += '<td class="number ' + colorClass(netPosition) + '">' + fmtBtc(netPosition) + '</td>';
  html += '</tr>';
  html += '</table>';
  html += '</div>';

  content.innerHTML = html;
}

loadData();
