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
    content.textContent = 'Failed to load data: ' + e.message;
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

var usdChart = null;

async function loadChart(range) {
  var buttons = document.querySelectorAll('.range-buttons button');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.toggle('active', buttons[i].textContent === range);
  }

  try {
    var res = await fetch('/monitoring/usd/history?range=' + range);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    renderChart(data.points);
  } catch (e) {
    var container = document.querySelector('.chart-container');
    if (container) container.textContent = 'Failed to load chart: ' + e.message;
  }
}

function renderChart(points) {
  var ctx = document.getElementById('usdChart');
  if (!ctx) return;

  if (usdChart) usdChart.destroy();

  var labels = [];
  var totalData = [];

  for (var i = 0; i < points.length; i++) {
    labels.push(new Date(points[i].timestamp));
    totalData.push(points[i].totalBalance);
  }

  usdChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total USD Holdings',
          data: totalData,
          borderColor: '#66bb6a',
          backgroundColor: 'rgba(102,187,106,0.1)',
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
            label: function (ctx) { return ctx.dataset.label + ': $' + fmtUsd(ctx.parsed.y); },
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
            callback: function (v) { return '$' + v.toLocaleString(); },
          },
        },
      },
    },
  });
}

loadData();
loadChart('24h');
