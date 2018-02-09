// trying to implement http://web.cs.ucdavis.edu/~ma/SIGGRAPH02/course23/notes/papers/Jobard.pdf
var Vector = require('../Vector');
var createScene = require('./scene');
var  createLookupGrid = require('./createLookupGrid');

var rk4 = require('../rk4');

function run () {
  var bbox = {
    left: -5,
    top: -5,
    size: 10
  };
  var dSep = 1./bbox.size;
  var dTest = dSep * 0.5;

  var grid = createLookupGrid(bbox, dSep);

  var scene = createScene('test1.png', bbox);
  var timeStep = 0.01;

  var seedPoint = new Vector(Math.random() * bbox.size + bbox.left, Math.random() * bbox.size + bbox.top);
  var streamLine = computeStreamline(seedPoint)
  var streamLines = [];
  streamLines.push(streamLine);
  var currentStreamlineIdx = 0;

  while(currentStreamlineIdx < streamLines.length) {
    var currentStreamLine = streamLines[currentStreamlineIdx];
    var validCandidate = selectValidCandidate(currentStreamLine);
    if (validCandidate) {
      streamLines.push(computeStreamline(validCandidate));
    } else {
      currentStreamlineIdx += 1;
    }
  }

  streamLines.forEach(streamLine => scene.drawStreamline(streamLine));
  scene.save();

  function selectValidCandidate(streamLine) {
    for (var i = 0; i < streamLine.length; ++i) {
      var p = streamLine[i];
      var v = vectorField(p);
      if (!v) continue;
      // Check orthogonal coordinates
      var cx = p.x - v.y * dSep;
      var cy = p.y + v.x * dSep;

      if (!isOutside(cx, cy) && !grid.isTaken(cx, cy, checkMinDistance)) return new Vector(cx, cy);

      var nx = p.x + v.y * dSep;
      var ny = p.y - v.x * dSep;
      if (!isOutside(nx, ny) && !grid.isTaken(nx, ny, checkMinDistance)) return new Vector(nx, ny);
    }
  }

  function checkMinDistance(distanceToCandidate) {
    return distanceToCandidate < dTest;
  }

  function computeStreamline(pos) {
    var points = [];
    points.push(pos)
    grid.occupyCoordinates(pos);
    var start = pos;
    var newPos;

    while(true) {
      var velocity = rk4(pos, timeStep, vectorField);
      if (!velocity) break; // Hit the singularity.

      newPos = pos.add(velocity);
      if (isOutside(newPos.x, newPos.y)) break;

      if(grid.isTaken(newPos.x, newPos.y, forwardCheck)) break;

      points.push(newPos);
      grid.occupyCoordinates(newPos);
      pos = newPos;
    }

    // let's try the opposite direction;
    pos = start;

    while(true) {
      var velocity = rk4(pos, timeStep, vectorField);
      if (!velocity) break; // Singularity
      velocity = velocity.mulScalar(-1);
      newPos = pos.add(velocity);
      if (isOutside(newPos.x, newPos.y)) break;

      if(grid.isTaken(newPos.x, newPos.y, backwardCheck)) break;

      points.unshift(newPos);
      grid.occupyCoordinates(newPos);
      pos = newPos;
    }

    return points;

    function forwardCheck(distanceToCandidate, candidate) {
      if (distanceToCandidate > dTest) return false;

      // We probably hit ourselves via circle?
      if (samePoint(newPos, candidate)) return true;

      // need to look back and see if this candidate is one of our own
      for (var i = 0; i < 30; ++i) {
        var idx = points.length - i - 1;
        if (idx < 0) return true; // None of ours.
        var ourPoint = points[idx];
        if (samePoint(ourPoint, candidate)) {
          // this is ours. Don't consider it blocking.
          return false;
        }
      }

      // The point is taken.
      return true;
    }
    function backwardCheck(distanceToCandidate, candidate) {
      if (distanceToCandidate > dTest) return false;

      // We probably hit ourselves via circle?
      if (samePoint(newPos, candidate)) return true;

      // need to look back and see if this candidate is one of our own
      for (var i = 0; i < 30; ++i) {
        if (i >= points.length) return true; // None of ours.

        var ourPoint = points[i];
        if (samePoint(ourPoint, candidate)) {
          // this is ours. Don't consider it blocking.
          return false;
        }
      }

      // The point is taken.
      return true;
    }
  }

  function isOutside(x, y) {
    return x < bbox.left || x > bbox.left + bbox.size || 
           y < bbox.top || y > bbox.top + bbox.size;
  }
}

function samePoint(a, b) {
  return a.x === b.x && a.y === b.y;
}

function vectorField(p) {
  var v = new Vector(
     Math.sin(p.y),
     Math.sin(1.)
  );
  if (v.length() === 0) return;
  v.normalize();
  return v;
}
