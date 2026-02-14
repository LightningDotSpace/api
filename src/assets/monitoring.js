function fmt(n, decimals) {
  if (n == null) return '-';
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals != null ? decimals : 0,
    maximumFractionDigits: decimals != null ? decimals : 8,
  });
}

function colorClass(n) {
  if (n > 0) return 'positive';
  if (n < 0) return 'negative';
  return '';
}

function truncate(s, len) {
  if (!s) return '-';
  if (s.length <= len) return s;
  return s.substring(0, len) + '...';
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

  var html = '';

  // Lightning Channels
  html += '<div class="section">';
  html += '<h2>Lightning Channels</h2>';
  if (data.channels.length === 0) {
    html += '<div class="loading">No channel data available</div>';
  } else {
    html += '<table>';
    html += '<tr><th>Peer</th><th class="number">Capacity</th><th class="number">Local Balance</th><th class="number">Remote Balance</th></tr>';
    for (var i = 0; i < data.channels.length; i++) {
      var ch = data.channels[i];
      html += '<tr>';
      html += '<td title="' + ch.name + '">' + truncate(ch.name, 24) + '</td>';
      html += '<td class="number">' + fmt(ch.capacity) + '</td>';
      html += '<td class="number">' + fmt(ch.localBalance) + '</td>';
      html += '<td class="number">' + fmt(ch.remoteBalance) + '</td>';
      html += '</tr>';
    }
    html += '</table>';
  }
  html += '</div>';

  // Balances
  html += '<div class="section">';
  html += '<h2>Balances</h2>';
  if (data.balances.length === 0) {
    html += '<div class="loading">No balance data available</div>';
  } else {
    html += '<table>';
    html +=
      '<tr><th>Asset</th><th class="number">Onchain</th><th class="number">LND Onchain</th><th class="number">Lightning</th><th class="number">Citrea</th><th class="number">Customer</th><th class="number">LDS Balance</th><th class="number">LDS in CHF</th></tr>';
    for (var i = 0; i < data.balances.length; i++) {
      var b = data.balances[i];
      html += '<tr>';
      html += '<td>' + b.assetName + (b.assetSymbol ? ' (' + b.assetSymbol + ')' : '') + '</td>';
      html += '<td class="number">' + fmt(b.onchainBalance) + '</td>';
      html += '<td class="number">' + fmt(b.lndOnchainBalance) + '</td>';
      html += '<td class="number">' + fmt(b.lightningBalance) + '</td>';
      html += '<td class="number">' + fmt(b.citreaBalance) + '</td>';
      html += '<td class="number">' + fmt(b.customerBalance) + '</td>';
      html += '<td class="number ' + colorClass(b.ldsBalance) + '">' + fmt(b.ldsBalance) + '</td>';
      html += '<td class="number ' + colorClass(b.ldsBalanceInCHF) + '">' + fmt(b.ldsBalanceInCHF, 2) + '</td>';
      html += '</tr>';
    }
    html += '</table>';
  }
  html += '</div>';

  // EVM Balances
  html += '<div class="section">';
  html += '<h2>EVM Balances</h2>';
  if (data.evmBalances.length === 0) {
    html += '<div class="loading">No EVM balance data available</div>';
  } else {
    for (var i = 0; i < data.evmBalances.length; i++) {
      var evm = data.evmBalances[i];
      html += '<h3 style="font-size:13px;color:#aaa;margin:12px 0 6px;text-transform:capitalize;">' + evm.blockchain + '</h3>';
      html += '<table>';
      html += '<tr><th>Token</th><th class="number">Balance</th></tr>';
      html += '<tr><td>' + evm.nativeSymbol + ' (native)</td><td class="number">' + fmt(evm.nativeBalance) + '</td></tr>';
      for (var j = 0; j < evm.tokens.length; j++) {
        var t = evm.tokens[j];
        html += '<tr><td>' + t.symbol + '</td><td class="number">' + fmt(t.balance) + '</td></tr>';
      }
      html += '</table>';
    }
  }
  html += '</div>';

  content.innerHTML = html;
}

loadData();
