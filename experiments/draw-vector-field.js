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
ctx.strokeStyle = 'rgb(255, 255, 255, 0.4)'
for (var i = -50; i < 50; ++i) {
  var trace = computeTrace(i * 2, i * 2);
  drawTrace(ctx, trace)
}

var fileName = 'field1.png';
PImage.encodePNGToStream(scene, fs.createWriteStream(fileName)).then(()=> {
    console.log('wrote out the png file to ' + fileName);
}).catch(e => {
    console.log('there was an error writing', e);
});

function rk4(point) {
  var u_h = 0.1;
  var k1 = getVelocity(point);
  var k2 = getVelocity(point.add(k1.mulScalar(u_h * 0.5)));
  var k3 = getVelocity(point.add(k2.mulScalar(u_h * 0.5)));
  var k4 = getVelocity(point.add(k3.mulScalar(u_h)));

  return k1.mulScalar(u_h / 6).add(k2.mulScalar(u_h/3)).add(k3.mulScalar(u_h/3)).add(k4.mulScalar(u_h/6));
}

function computeTrace(x, y) {
  var seenPoints = new Set();
  var pos = new Vector(x, y);
  var trace = [pos];
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
    trace.push(newPos);
    pos = newPos;
    iterations += 1;
    if (iterations > 1000) break;
  }
  return trace;
}

function drawTrace(ctx, trace) {
  if (trace.length < 2) return;
  var dx = (maxX - minX), dy = (maxY - minY);
  var x = trace[0].x;
  var y = trace[0].y;
  ctx.beginPath();
  ctx.moveTo(imageWidth * (x - minX)/dx, imageHeight * (y - minY)/dy);
  trace.forEach(p => {
    var x = p.x; var y = p.y;
    ctx.lineTo(imageWidth * (x - minX)/dx, imageHeight * (y - minY) / dy)
  });

  ctx.stroke();
}

function getVelocity(p) {
  var v1 = new Vector(p.x - 30, p.y);
  var v2 = new Vector(p.x + 30, p.y);
  var l1 = v1.length();
  var l2 = v2.length();

  var eps = 0.0006;
  var v = v1.mulScalar(Math.exp(-l1 * l1 * eps)).add(v2.mulScalar(Math.exp(-l2 * l2 * eps)));
  // return new Vector(-p.y, p.x);
  var res = new Vector(-v.y, v.x);
  if (res.length() > 0) res.normalize()
  return res;
}
