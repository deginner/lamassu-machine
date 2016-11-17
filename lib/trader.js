'use strict'

var fs = require('fs')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var async = require('async')
var uuid = require('node-uuid')
var BigNumber = require('bignumber.js')
var R = require('ramda')
var retry = require('retry')
var bitjws = require('bitjws-js')
var request = require('request');

var _t0 = null
var sequenceNumber = 0
var pid = uuid.v4()


var Trader = function (config) {
  if (!(this instanceof Trader)) return new Trader(config)
  EventEmitter.call(this)
  this.protocol = config.protocol || 'https'
  this.rejectUnauthorized = typeof config.rejectUnauthorized === 'undefined'
  ? true
  : !!config.rejectUnauthorized

  this.config = config
  this.exchangeRate = null
  this.fiatExchangeRate = null
  this.balances = {'BTC': null, 'DASH': null}
  this._rates = {'BTC': {'cashIn': null, 'cashOut': null},
                 'DASH': {'cashIn': null, 'cashOut': null}}
  this.locale = null

  this.exchange = null
  this.balanceTimer = null
  this.balanceRetries = 0
  this.balanceTriggers = null
  this.tickerExchange = null
  this.transferExchange = null
  this.pollTimer = null
  this.pollRetries = 0
  this.txLimit = null
  this.fiatTxLimit = 50  // TODO: make configurable
  this.idVerificationLimit = null
  this.idVerificationEnabled = false
  this.twoWayMode = false
  this.coins = []
  this.state = null
}
util.inherits(Trader, EventEmitter)

Trader.prototype.init = function init (connectionInfo) {
//  var self = this
  this.config.privkey = bitjws.wifToPriv(this.config.wif);
  this.txLimit = this.config.txLimit
  this.idVerificationLimit = this.config.idVerificationLimit
  this.idVerificationEnabled = false && this.config.idVerificationEnabled
  this.locale = {currency: 'USD', localeInfo: {
    primaryLocale: 'en-US',
    primaryLocales: ['en-US', 'ja-JP', 'es-MX', 'he-IL', 'ar-SA'],
    country: 'PA'
  }}
//    if (this.config.cartridges) {
//      this.cartridges = this.config.cartridges
//      this.virtualCartridges = this.config.cartridges.virtualCartridges.map(toInt)
//      this.cartridgesUpdateId = this.config.cartridges.id
//    }
//    this.twoWayMode = this.config.twoWayMode
  this.fiatTxLimit = this.config.fiatTxLimit
  this.zeroConfLimit = this.config.zeroConfLimit
}

Trader.prototype._request = function _request (options, cb) {
  var protocol = this.protocol || 'https'
  var self = this

  console.log('DEBUG2')

  var headers = {'Content-Type': 'application/jose'};
  var message = bitjws.signSerialize(options.path, options.body, this.config.privkey.key, 1800);
  var data = {
    url: this.config.baseURL + options.path,
    body: message,
    headers: headers,
    method: options.method.toUpperCase()
  }
  request(data, function(err, raw, body) {
    if(err) {
      cb(err, null);
    } else if (raw.statusCode != 200) {
      cb(body, null);
    } else {
      var decoded = bitjws.validateDeserialize('/response', body, true);
      if(decoded.header.kid != self.config.serverKey) {
        return cb("bad server key " +  decoded.header.kid + " expected " + self.config.serverKey, null);
      }
      self.emit('networkUp')
      cb(null, decoded.payload);
    }
  });
}

Trader.prototype.run = function run () {
  var self = this

  self.trigger()
  self.triggerInterval = setInterval(function () {
    self.trigger()
  }, this.config.settings.pollInterval)
}

Trader.prototype.stop = function stop () {
  if (this.triggerInterval) clearInterval(this.triggerInterval)
}

Trader.prototype.verifyUser = function verifyUser (idRec, cb) {
  console.log(idRec)
  // TODO isysd wtf is this?
  console.log("isysd isysd isysd verifyUser wtf?")
//  this._request({
//    path: '/verify_user',
//    method: 'POST',
//    body: idRec
//  }, cb)
}

Trader.prototype.rates = function rates (cryptoCode) {
  if (this._rates && this._rates[cryptoCode] && this._rates[cryptoCode].cashIn && this._rates[cryptoCode].cashIn > new BigNumber(0)) return this._rates[cryptoCode]
  else throw new Error('No rates record')
}

Trader.prototype.verifyTransaction = function verifyTransaction (idRec) {
  console.log(idRec)
  // TODO isysd query desw for transaction_state
}

Trader.prototype.reportEvent = function reportEvent (eventType, note) {
  var rec = {
    eventType: eventType,
    note: note,
    deviceTime: Date.now()
  }
  // TODO isysd log locally? git? email?
}

Trader.prototype.sendCoins = function sendCoins (tx, cb) {
//  tx.sequenceNumber = ++sequenceNumber
  var amount = (tx.cryptoAtoms / 1e8).toFixed(8);
  console.log('Server: sending coins: %s', amount)
  console.log(JSON.stringify(tx, null, 2))
  this.balance -= tx.fiat
  console.log('Remaining balance: %d', this.balance)
  var network = tx.cryptoCode == 'BTC' ? 'bitcoin' : 'dash'
  this._request({'path': '/debit', body:{'network': network, 'currency': tx.cryptoCode, 'amount': amount, 'address': tx.toAddress,
                       'reference': tx.id}, 'method': 'post'}, function(err, debit){
//    console.log(debit)
    if(err) cb(err)
    else cb(null, {txId:tx.id})
  });

//  this._request({
//    path: '/send',
//    method: 'POST',
//    body: tx,
//    repeatUntilSuccess: true
//  }, function (err, result) {
//    if (!err) return cb(null, result)
//    if (err.name === 'InsufficientFunds') return cb(err)
//    if (err.name === 'networkDown') return cb(new Error('sendCoins timeout'))
//    return cb(new Error('General server error'))
//  })

  sequenceNumber = 0
}

Trader.prototype.trigger = function trigger () {
  var self = this

  console.log('DEBUG1')

  // self.exchangeRate = self._rates['BTC']['cashIn']
  // self.fiatExchangeRate = self._rates['BTC']['cashOut']

  // get BTC/USD rate
  request({
    url: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
    method: "GET"
  }, function(err, raw, body) {
    if(err) {
      cb(err, null);
    } else if (raw.statusCode != 200) {
      cb(body, null);
    } else {
      var rates = JSON.parse(body)
      self._rates['BTC'] = {
        cashIn: new BigNumber(rates.result["XXBTZUSD"]["a"][0]),
        cashOut: new BigNumber(rates.result["XXBTZUSD"]["b"][0])
      }
    }
  })

  // get DASH/USD rate
  request({
    url: "https://poloniex.com/public?command=returnTicker",
    method: "GET"
  }, function(err, raw, body) {
    if(err) {
      cb(err, null);
    } else if (raw.statusCode != 200) {
      cb(body, null);
    } else {
      var rates = JSON.parse(body)
      self._rates['DASH'] = {
        cashIn: new BigNumber(rates['USDT_DASH']["lowestAsk"]),
        cashOut: new BigNumber(rates['USDT_DASH']["highestBid"])
      }
    }
  })

  self._request({'path': '/balance', 'body': {}, 'method': 'get'}, function(err, res) {
    if (err) {
      self.emit('networkDown')
      return
    }
    self.balance = 1000 // TODO isysd fill w balances
    self.coins = []
    for (var i = 0; i < res.data.length; i++) {
      if(!self.balances.hasOwnProperty(res.data[i].currency)) continue
      self.balances[res.data[i].currency] = new BigNumber(res.data[i].available)
      self.coins.push(res.data[i].currency)
    }

    if (self.coins.length === 0) {
      console.log('No responsive coins, going to Network Down.')
      return self.emit('networkDown')
    }

    self.emit('pollUpdate')
    self.emit('networkUp')
  });
}

Trader.prototype.trade = function trade (rec, cb) {
  rec.sequenceNumber = ++sequenceNumber
  // TODO isysd make a trade using broker
//  this._request({
//    path: '/trade',
//    method: 'POST',
//    body: rec,
//    repeatUntilSuccess: true
//  }, cb)
}

Trader.prototype.stateChange = function stateChange (state, isIdle) {
  this.state = {state: state, isIdle: isIdle}
}

Trader.prototype.cashOut = function cashOut (tx, cb) {
  var config = this.config
  var result = null
  var t0 = Date.now()
  var timeOut = config.settings.sendTimeout

  var interval = config.settings.retryInterval
  var self = this

  // for backwards compatibility
  tx.satoshis = tx.cryptoAtoms
  // TODO isysd who cares we made a cash out? log?
//  function _cashOut (cb) {
//    self._request({
//      path: '/cash_out',
//      method: 'POST',
//      body: tx
//    }, function (err, body) {
//      if (!err && body) result = body.toAddress
//      if (err || result === null) return setTimeout(cb, interval)
//      cb()
//    })
//  }

  function testResponse () {
    return result !== null || Date.now() - t0 > timeOut
  }

  function handler (err) {
    if (err) return cb(err)
    if (result === null) return cb(new Error('cashOut timeout'))
    cb(null, result)
  }

  async.doUntil(_cashOut, testResponse, handler)
}

Trader.prototype.waitForDispense = function waitForDispense (tx, status, cb) {
  var self = this

  var notSeenError = new Error('Not seen')
  var operation = retry.operation({
    factor: 1,
    minTimeout: 2000,
    retries: 60
  })

  operation.attempt(function () {
  // TODO isysd wtf do we do here? local check of status?
//    self._request({
//      path: '/await_dispense/' + tx.id + '?status=' + status,
//      method: 'GET'
//    }, function (err, res) {
//      if (!err && res.statusCode && res.statusCode !== 200) err = notSeenError
//
//      if (operation.retry(err)) return
//      if (err) return cb(operation.mainError())
//
//      var updatedTx = R.assoc('status', res.tx.status, tx)
//
//      return cb(null, updatedTx)
//    })
  })
}

Trader.prototype.registerRedeem = function registerRedeem (txId) {
  // TODO isysd obsolete
//  this._request({
//    path: '/register_redeem/' + txId,
//    method: 'POST',
//    repeatUntilSuccess: true
//  }, function (err) {
//    if (err) return console.log(err)
//  })
}

Trader.prototype.dispense = function dispense (tx, cb) {
  // TODO isysd obsolete?
//  this._request({
//    path: '/dispense',
//    method: 'POST',
//    body: {tx: tx}
//  }, function (err, res) {
//    if (err) return cb(err)
//    if (!res.dispense) return cb(new Error('Could not dispense: ' + res.reason))
//    return cb(null, res.txId)
//  })
}

// TODO: repeat until success
Trader.prototype.dispenseAck = function dispenseAck (tx, cartridges) {
  // TODO isysd obsolete?
//  this._request({
//    path: '/dispense_ack',
//    method: 'POST',
//    body: {tx: tx, cartridges: cartridges}
//  }, function (err) {
//    if (err) console.log(err)
//  })
}

function toInt (str) {
  return parseInt(str, 10)
}

function _richError (errMessage, name) {
  var err = new Error(errMessage)
  err.name = name
  return err
}

module.exports = Trader
