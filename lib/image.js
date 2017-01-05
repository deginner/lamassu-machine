/*
This file adapted from a v4l2camera example.
https://github.com/bellbind/node-v4l2camera/blob/master/examples/capture-via-yuyv.js

The MIT License (MIT)
Copyright (c) 2013 bellbind, 2017 isysd
*/
var pngjs = require("pngjs");

var asPng = function (rgb, width, height, cb) {
    var png = new pngjs.PNG({
        width: width, height: height, deflateLevel: 1, deflateStrategy: 1,
    });
    var size = width * height;
    for (var i = 0; i < size; i++) {
        png.data[i * 4 + 0] = rgb[i * 3 + 0];
        png.data[i * 4 + 1] = rgb[i * 3 + 1];
        png.data[i * 4 + 2] = rgb[i * 3 + 2];
        png.data[i * 4 + 3] = 255;
    }
    return png
};

// yuyv data handling
var minmax = function (min, v, max) {
    return (v < min) ? min : (max < v) ? max : v;
};
var yuv2r = function (y, u, v) {
    return minmax(0, (y + 359 * v) >> 8, 255);
};
var yuv2g = function (y, u, v) {
    return minmax(0, (y + 88 * v - 183 * u) >> 8, 255);
};
var yuv2b = function (y, u, v) {
    return minmax(0, (y + 454 * u) >> 8, 255);
};
var yuyv2rgb = function (yuyv, width, height) {
    var rgb = new Array(width * height * 3);
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j += 2) {
            var index = i * width + j;
            var y0 = yuyv[index * 2 + 0] << 8;
            var u = yuyv[index * 2 + 1] - 128;
            var y1 = yuyv[index * 2 + 2] << 8;
            var v = yuyv[index * 2 + 3] - 128;
            rgb[index * 3 + 0] = yuv2r(y0, u, v);
            rgb[index * 3 + 1] = yuv2g(y0, u, v);
            rgb[index * 3 + 2] = yuv2b(y0, u, v);
            rgb[index * 3 + 3] = yuv2r(y1, u, v);
            rgb[index * 3 + 4] = yuv2g(y1, u, v);
            rgb[index * 3 + 5] = yuv2b(y1, u, v);
        }
    }
    return rgb;
};

module.exports = {
  yuyv2rgb: yuyv2rgb,
  asPng: asPng
}
