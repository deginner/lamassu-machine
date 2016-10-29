
function cryptoUrl (cryptoCode, address, amount) {
  switch (cryptoCode) {
    case 'BTC': return 'bitcoin:' + address + '?amount=' + amount
    case 'DASH': return 'dash:' + address + '?amount=' + amount
  }
}

global.cryptoUrl = cryptoUrl
