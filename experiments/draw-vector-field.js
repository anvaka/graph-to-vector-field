var fs = require('fs');
var path = require('path');
var PImage = require('pureimage');
var Vector = require('./Vector');

var minX = -100;
var minY = -100;
var maxX = 100;
var maxY = 100;

var imageWidth = 640;
var imageHeight = 640;

var scene = PImage.make(imageWidth, imageHeight);

var ctx = scene.getContext('2d');
ctx.strokeStyle = '#ffffff'
// var imgData = ctx.getImageData();
for (var i = -50; i < 50; ++i) {
  drawTrace(ctx, i * 2, i * 2);
}

var fileName = 'field.png';
PImage.encodePNGToStream(scene, fs.createWriteStream(fileName)).then(()=> {
    console.log('wrote out the png file to ' + fileName);
}).catch(e => {
    console.log('there was an error writing', e);
});

function rk4(point) {
  var u_h = 0.01;
  var k1 = getVelocity(point );
  var k2 = getVelocity(point.add(k1.mulScalar(u_h * 0.5)));
  var k3 = getVelocity(point.add(k2.mulScalar(u_h * 0.5)));
  var k4 = getVelocity(point.add(k3.mulScalar(u_h)));

  return k1.mulScalar(u_h / 6).add(k2.mulScalar(u_h/3)).add(k3.mulScalar(u_h/3)).add(k4.mulScalar(u_h/6));
}

function drawTrace(ctx, x, y) {
  var seenPoints = new Set();
  var pos = new Vector(x, y);
  ctx.beginPath();
  ctx.moveTo(imageWidth * (x - minX)/(maxX - minX), imageHeight * (y - minY) / (maxY - minY));

  var iterations = 0;
  while(true) {
    var key = x + ',' + y;
    if (seenPoints.has(key)) break;
    seenPoints.add(key);

    var velocity = rk4(pos);
    var newPos = pos.add(velocity);
    if (pos.distanceTo(newPos) < 1e-4) break;

    x = newPos.x;
    y = newPos.y;
    ctx.lineTo(imageWidth * (x - minX)/(maxX - minX), imageHeight * (y - minY) / (maxY - minY));
    pos = newPos;
    iterations += 1;
    if (iterations > 1000) break;
  }
  ctx.stroke();
}

function getVelocity(p) {
  return new Vector(-p.y, p.x);
}
