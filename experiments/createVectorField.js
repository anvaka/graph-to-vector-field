var Vector = require('./Vector');
var rk4 = require('./rk4');

module.exports = createVectorField;

function createVectorField(getVelocity, options) {
  options = options || {};
  var timeStep = options.t || 0.01;
  return {
    trace
  }

  function trace(x, y, maxIterations) {
    maxIterations = maxIterations || 1000;
    var seenPoints = new Set();
    var pos = new Vector(x, y);
    var trace = [pos];
    var iterations = 0;
    while(true) {
      var key = x + ',' + y;
      if (seenPoints.has(key)) break;
      seenPoints.add(key);

      var velocity = rk4(pos, timeStep, getVelocity);
      var newPos = pos.add(velocity);
      if (pos.distanceTo(newPos) < 1e-4) break;

      x = newPos.x;
      y = newPos.y;
      trace.push(newPos);
      pos = newPos;
      iterations += 1;
      if (iterations > maxIterations) break;
    }
    return trace;
  }
}