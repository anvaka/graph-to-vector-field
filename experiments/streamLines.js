var Vector = require('./Vector');
var rk4 = require('./rk4');

module.exports = createStreamLines;

function createStreamLines(getVelocity, bbox) {
  var start = new Vector(-5, 0);
  var seedPointsQueue = [start];
  var takenPoints = [];
  var dSep = 1;
  var timeStep = dSep * 0.5;
  var smallestStep = 0.01;
  var streamLines = [];
  var lineId = 0;

  while (seedPointsQueue.length > 0) {
    var candidate = seedPointsQueue.shift();
    if (isValid(candidate)) {
      lineId += 1;
      var streamLine = drawStreamLine(candidate);
      if (streamLine.length > 1) streamLines.push(streamLine);
    } 
  }

  return streamLines;
  function key(p) { return p.x + ',' + p.y; }

  function drawStreamLine(startFrom) {
    var integrateForward = true, forwardPos = startFrom;

    var thisLine = new Set();
    var points = [startFrom];
    startFrom.lineId = lineId;
    addSeedCandidates(startFrom);
    thisLine.add(key(startFrom));
    takenPoints.push(startFrom);
    while(integrateForward) {
      if (integrateForward) {
        var forwardV = rk4(forwardPos, timeStep, getVelocity);
        if (!forwardV) {
          // degenerate point
          integrateForward = false;
          break;
        }
        var newForwardPos = forwardPos.add(forwardV);
        var fwKey = key(newForwardPos);
        if (thisLine.has(fwKey)) {
          integrateForward = false;
        } else if (outsideVisibleZone(newForwardPos)) {
          integrateForward = false;
        } else if (Math.abs(newForwardPos.distanceTo(forwardPos)) >= smallestStep  && isValid(newForwardPos, lineId)) {
          addSeedCandidates(newForwardPos);
          points.push(newForwardPos);
          forwardPos = newForwardPos;
          forwardPos.lineId = lineId;
          takenPoints.push(forwardPos);
          thisLine.add(fwKey);
        } else {
          integrateForward = false;
        }
      }
    }

    // var integrateBackward = true, backwardPos = startFrom;
    // while(integrateForward) {
    //     var backwardV = rk4(backwardPos, -timeStep, getVelocity);
    //     var newBackwardPos = backwardPos.add(backwardV);
    //     if (outsideVisibleZone(newBackwardPos)) {
    //       integrateBackward = false;
    //     } else if (Math.abs(newBackwardPos.distanceTo(backwardPos)) >= smallestStep && isValid(newBackwardPos)) {
    //       addSeedCandidates(newBackwardPos);
    //       points.unshift(newBackwardPos);
    //       backwardPos = newBackwardPos;
    //       takenPoints.push(backwardPos);
    //     } else {
    //       integrateBackward = false;
    //     }
    // }

    return points;
  }

  function addSeedCandidates(p) {
    var v = getVelocity(p);
    if (!v) return;
    var orth = new Vector(-v.y, v.x);
    orth.normalize();
    seedPointsQueue.push(p.add(new Vector(orth.x * dSep, orth.y * dSep)));
    seedPointsQueue.push(p.add(new Vector(-orth.x * dSep, -orth.y * dSep)));
  }

  function outsideVisibleZone(p) {
    return !(bbox.minX <= p.x && p.x <= bbox.maxX &&
           bbox.minY <= p.y && p.y <= bbox.maxY);
  }

  function isValid(candidate, lineId) {
    if (outsideVisibleZone(candidate)) return false;
    var foundPoint = findNearestPoint(candidate, lineId);
    return foundPoint === null || Math.abs(foundPoint.distanceTo(candidate)) >= dSep;
  }

  function findNearestPoint(candidate, lineId) {
    var nearestCandidate = null;
    var minDistance = Number.POSITIVE_INFINITY;
    for (var i = 0; i < takenPoints.length; ++i) {
      var other = takenPoints[i];
      if (lineId !== undefined && other.lineId === lineId) continue;

      if (candidate.equals(other)) continue;

      var distanceTo = candidate.distanceTo(other);
      if (distanceTo < minDistance) {
        minDistance = distanceTo;
        nearestCandidate = other;
      }
    }

    return nearestCandidate;
  }
}