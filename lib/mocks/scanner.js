var Parser = require('../../lib/compliance/parsepdf417')
var PairingData = require('../pairingdata')

var bitcoinAddressValidator = require('bitcoin-address')
var dashAddressValidator = require('darkcoin-address')
var url = require('url')

module.exports = {
  config: config,
  scanPairingCode: scanPairingCode,
  scanMainQR: scanMainQR,
  scanPDF417: scanPDF417,
  scanPhotoID: scanPhotoID,
  cancel: cancel,
  parseDashURI: parseDashURI
}

var configuration = null
var _cancelCb = null

function config (_configuration) {
  configuration = _configuration.mock.data
}

function scanPairingCode (callback) {
  console.log('DEBUG13: %j', configuration.pairingData)
  var pairingData = PairingData.process(configuration.pairingData)
  return setTimeout(function () { callback(null, pairingData) }, 500)
}

function scanMainQR (cryptoCode, callback) {
  setTimeout(function () {
    var resultStr = configuration.qrData[cryptoCode]

    switch (cryptoCode) {
      case 'BTC':
        callback(null, processBitcoinURI(resultStr))
        break
      case 'DASH':
        callback(null, processDashURI(resultStr))
        break
      default:
        throw new Error('Unsupported coin: ' + cryptoCode)
    }
  }, 2000)
}

function scanPDF417 (callback) {
  var pdf417Data = configuration.pdf417Data
  setTimeout(function () { callback(null, Parser.parse(pdf417Data)) }, 800)
}

function scanPhotoID (callback) {
  var fakeLicense = configuration.fakeLicense
  setTimeout(function () { callback(null, fakeLicense) }, 800)
}

function cancel () {
  if (_cancelCb) _cancelCb()
}

function processBitcoinURI (data) {
  var address = parseBitcoinURI(data)
  if (!address) return null

  console.log('DEBUG16: *%s*', address)
  if (!bitcoinAddressValidator.validate(address)) {
    console.log('Invalid bitcoin address: %s', address)
    return null
  }
  return address
}

function parseBitcoinURI (uri) {
  var res = /^(bitcoin:\/{0,2})?(\w+)/.exec(uri)
  var address = res && res[2]
  if (!address) {
    return null
  } else return address
}

function processDashURI (data) {
  var address = parseDashURI(data)
  if (!address) return null

  console.log('DEBUG16: *%s*', address)
  if (!dashAddressValidator.validate(address)) {
    console.log('Invalid dash address: %s', address)
    return null
  }
  return address
}

function parseDashURI (uri) {
  var res = /^(dash:\/{0,2})?(\w+)/.exec(uri)
  var address = res && res[2]
  if (!address) {
    return null
  } else return address
}
