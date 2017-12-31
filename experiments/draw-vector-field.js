var fs = require('fs');
var PImage = require('pureimage');
var Vector = require('./Vector');
var createVectorField = require('./createVectorField')
var createStreamLines = require('./streamLines');

var minX = -50;
var minY = -50;
var maxX = 50;
var maxY = 50;

var imageWidth = 640;
var imageHeight = 640;

var scene = PImage.make(imageWidth, imageHeight);

var ctx = scene.getContext('2d');
ctx.strokeStyle = 'rgb(255, 255, 255, 0.4)'

// var vectorField = createVectorField(getVelocity);

// for (var i = -50; i < 50; ++i) {
//   var trace = vectorField.trace(i * 2, i * 2);
//   drawTrace(ctx, trace)
// }

var lines = createStreamLines(getVelocity, {minX, minY, maxX, maxY});
lines.forEach(line => {
  drawTrace(ctx, line);
});


var fileName = 'field1.png';
PImage.encodePNGToStream(scene, fs.createWriteStream(fileName)).then(()=> {
    console.log('wrote out the png file to ' + fileName);
}).catch(e => {
    console.log('there was an error writing', e);
});

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

  var eps = 0.006;
  var v = v1.mulScalar(Math.exp(-l1 * l1 * eps)).add(v2.mulScalar(Math.exp(-l2 * l2 * eps)));
  // return new Vector(-p.y, p.x);
  var res = new Vector(-v.y, v.x);
  if (res.length() === 0) return;

  res.normalize();

  return res;
}
