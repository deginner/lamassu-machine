var v4l2camera = require('v4l2camera')
var jpg = require('jpeg-turbo')
var url = require('url')
var bitcoinAddressValidator = require('bitcoin-address')
var dashAddressValidator = require('darkcoin-address')
var Canvas = require('canvas')
  , Image = Canvas.Image
  , qrcode = require('jsqrcode')(Canvas)

var configuration = null
var width
var height
var cancelFlag = false

module.exports = {
  config: config,
  scanMainQR: scanMainQR,
  cancel: cancel
}

function config (_configuration) {
  configuration = _configuration
}

function cancel () {
  cancelFlag = true
}

// resultCallback returns final scan result
// captureCallback returns result of a frame capture
function scan (mode, resultCallback, captureCallback) {
  var cam = new v4l2camera.Camera(configuration.device)
  var modeConfig = configuration[mode]
  var width = modeConfig.width
  var height = modeConfig.height
  var processing = false

  cancelFlag = false
  var camcfg = {
    formatName: 'MJPG',
    format: 1196444237,
    width: width,
    height: height
  }
  cam.configSet(camcfg)
  cam.start()
  var handle = setInterval(capture, 200)
  function capture () {
    if (processing) return

    if (cancelFlag) {
      clearInterval(handle)
      cam.stop()
      return resultCallback()
    }

    processing = true
    cam.capture(function (success) {
      if (!success) return
      var frame = cam.frameRaw()
      captureCallback(null, frame, function(err, result) {
        if (result) {
          clearInterval(handle)
          cam.stop()
          return resultCallback(null, result)
        }
        processing = false
      })
    })
  }
}

function scanQR (callback) {
  scan('qr', callback, function (err, frame, _callback) {
    if (err) return _callback()
    var result;
    var image = new Image()
    image.onload = function(){
      try{
        result = qrcode.decode(image)
        console.log('result of qr code: ' + result);
        if (!result) return _callback()
        _callback(null, result.toString())
      }catch(e){
        console.log('unable to read qr code for reason ' + e);
        if (e.toString().indexOf("extraneous bytes") < 0) return _callback()
      }
    }
    image.src = Buffer(frame)
  })
}


function scanMainQR (cryptoCode, callback) {
  scanQR(function (err, result) {
    if (err) return callback(err)
    if (!result) return callback(null, null)
    var resultStr = result.toString()

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
  })
}

function processBitcoinURI (data) {
  var address = parseBitcoinURI(data)
  if (!address) return null
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
