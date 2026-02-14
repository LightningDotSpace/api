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
    content.textContent = 'Failed to load data: ' + e.message;
  }
}

function render(data) {
  var content = document.getElementById('content');
  document.getElementById('timestamp').textContent = 'Last updated: ' + new Date(data.timestamp).toLocaleString();

  var btcBalance = null;
  for (var i = 0; i < data.balances.length; i++) {
    if (data.balances[i].assetName === 'BTC') {
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

var btcChart = null;

async function loadChart(range) {
  var buttons = document.querySelectorAll('.range-buttons button');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.toggle('active', buttons[i].textContent === range);
  }

  try {
    var res = await fetch('/monitoring/btc/history?range=' + range);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    renderChart(data.points);
  } catch (e) {
    var container = document.querySelector('.chart-container');
    if (container) container.textContent = 'Failed to load chart: ' + e.message;
  }
}

function renderChart(points) {
  var ctx = document.getElementById('btcChart');
  if (!ctx) return;

  if (btcChart) btcChart.destroy();

  var labels = [];
  var netData = [];

  for (var i = 0; i < points.length; i++) {
    labels.push(new Date(points[i].timestamp));
    netData.push(points[i].netBalance);
  }

  btcChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Net BTC Balance',
          data: netData,
          borderColor: '#4fc3f7',
          backgroundColor: 'rgba(79,195,247,0.1)',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.2,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#888', font: { family: "'Courier New', monospace", size: 11 } } },
        tooltip: {
          callbacks: {
            label: function (ctx) { return ctx.dataset.label + ': ' + fmtBtc(ctx.parsed.y) + ' BTC'; },
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: { tooltipFormat: 'MMM d, HH:mm' },
          grid: { color: '#1a1a1a' },
          ticks: { color: '#555', font: { family: "'Courier New', monospace", size: 10 }, maxTicksLimit: 8 },
        },
        y: {
          grid: { color: '#1a1a1a' },
          ticks: {
            color: '#555',
            font: { family: "'Courier New', monospace", size: 10 },
            callback: function (v) { return v.toFixed(4); },
          },
        },
      },
    },
  });
}

async function loadUtxos() {
  var container = document.getElementById('utxo-content');
  try {
    var res = await fetch('/monitoring/btc/utxos');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    renderUtxos(data);
  } catch (e) {
    container.innerHTML = '<div class="error">Failed to load UTXOs: ' + e.message + '</div>';
  }
}

function renderUtxos(data) {
  var container = document.getElementById('utxo-content');
  var html = '<table>';
  html += '<tr><th>TXID</th><th>Vout</th><th>Address</th><th class="number">BTC</th><th class="number">Confirmations</th></tr>';

  for (var i = 0; i < data.utxos.length; i++) {
    var u = data.utxos[i];
    var shortTxid = u.txid.substring(0, 8) + '...' + u.txid.substring(u.txid.length - 8);
    html += '<tr>';
    html += '<td><a href="https://mempool.space/tx/' + u.txid + '" target="_blank" rel="noopener">' + shortTxid + '</a></td>';
    html += '<td>' + u.vout + '</td>';
    html += '<td>' + u.address + '</td>';
    html += '<td class="number">' + fmtBtc(u.amount) + '</td>';
    html += '<td class="number">' + u.confirmations.toLocaleString() + '</td>';
    html += '</tr>';
  }

  html += '<tr class="total-row">';
  html += '<td>' + data.count + ' UTXOs</td><td></td><td></td>';
  html += '<td class="number">' + fmtBtc(data.totalAmount) + '</td>';
  html += '<td></td>';
  html += '</tr>';
  html += '</table>';

  container.innerHTML = html;
}

loadData();
loadChart('24h');
loadUtxos();

var rangeButtons = document.querySelectorAll('.range-buttons button[data-range]');
for (var i = 0; i < rangeButtons.length; i++) {
  rangeButtons[i].addEventListener('click', function () {
    loadChart(this.getAttribute('data-range'));
  });
}
