module.exports = getPathFromPolyLine;

function line(start, end) {
  return {
    start: start,
    end: end,
    intersect: intersect
  };
  
  function intersect(otherLine) { 
    if (isEqual(otherLine.start, start) ||
        isEqual(otherLine.end, start)) return start;
    
    if (isEqual(otherLine.end, end) ||
       isEqual(otherLine.start, end)) return end;
    
    var dx = end.x - start.x;
    var dy = end.y - start.y;
    var xIntersect;
    var oDx = otherLine.end.x - otherLine.start.x;
    var oDy = otherLine.end.y - otherLine.start.y;

    var k2 = oDy/oDx; // other line's slope: y = k2 * x + b2
    var k1 = dy/dx; // our own slope y = k1 * x + b1
    
    var b1 = start.y - k1 * start.x;
    var b2 = otherLine.start.y - k2 * otherLine.start.x; // other line intercept.
    
    if (oDx === 0 && dx === 0) { 
      return {
        x: (otherLine.start.x + start.x) * 0.5,
        y: (otherLine.start.y + start.y) * 0.5
      }
    }

    if (Math.abs(k1 - k2) < 0.001) {
      // lines are parallel to each other. we assume intersection in the middle:
      var xi = (otherLine.start.x + end.x)/2;
      return {
        x: xi,
        y: b1 + xi * k1
      }
    }
    if (oDx === 0) {
      // other line is parallel to y. Intersect ourselves with it
      return {
        x: otherLine.start.x,
        y: b1 + otherLine.start.x * k1
      }
    }
    
    if (dx === 0) {
      // current line is parallel to Y axis, intersection is at x coordinate:
      xIntersect = start.x; // === end.x, so doesn't matter
    } else {
      // finally, compute x where both lines intersect:
      xIntersect = (b2 - b1)/(k1 - k2);
    }
    
    return {
      x: xIntersect,
      y: k2 * xIntersect + b2
    }
  }
}

function isEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

function getPathFromPolyLine(poly) {
  var forward = [];
  var backward = [];
  var prev = poly[0];
  var prevWidth = prev.width || 1, prevForward, prevBackward;

  for (var i = 1; i < poly.length; ++i) {
    var next = poly[i]; 
    var dx = next.x - prev.x;
    var dy = next.y - prev.y;
 
    var nextWidth = (next.width === undefined) ? prevWidth : next.width;
    
    if (dx === 0 && dy === 0) continue;
    
    var l = Math.sqrt(dx * dx + dy*dy);
    var tx = dx / l;
    var ty = dy / l;
    // normal vector:
    var nx = -ty;
    var ny = tx;
//     nextWidth = 2;
    // the line that is defined by the normal vector on path forward:
    var forwardLine = line({
      x: prev.x + nx * nextWidth/2,
      y: prev.y + ny * nextWidth/2
    }, {
      x: next.x + nx * nextWidth/2,
      y: next.y + ny * nextWidth/2    
    });
    
    var backwardLine = line({
      x: prev.x - nx * nextWidth/2,
      y: prev.y - ny * nextWidth/2 
    }, {
      x: next.x - nx * nextWidth/2,
      y: next.y - ny * nextWidth/2    
    });

    if (i === 1) {
      // just started.
      forward.push(forwardLine.start);
      backward.push(backwardLine.start);
    } 
    if (i > 1) { 
      
      var fwIntersect = forwardLine.intersect(prevForward);
      if (!fwIntersect) {
        console.log(i, nextWidth, poly);
        throw new Error('Parallel line? How so?');
      }

      var bwIntersect = backwardLine.intersect(prevBackward);
      if (!bwIntersect) {
        throw new Error('Parallel line? How so?');
      }
      forward.push(fwIntersect);
      backward.push(bwIntersect);
    }
   
    
    // Note: i could be both === 1 and === poly.length - 1
    if (i === poly.length - 1) { 
      // finished the path
      forward.push(forwardLine.end);
      backward.push(backwardLine.end);
    }
    prevForward = forwardLine;
    prevBackward = backwardLine;
    prev = next;
    prevWidth = nextWidth;
  }
  
  return unitePoints(forward, backward);
}

function unitePoints(forward, backward) {
  if (forward.length !== backward.length) throw new Error('Lenght should be the same');
   
  var first = forward[0];
  var start = 'M' + first.x + ',' + first.y + 'L';
  var backPart = backward[0].x + ',' + backward[0].y;
  for(var i = 1; i < forward.length; ++i) {
    var f = forward[i];
    start += ' ' + f.x + ',' + f.y;
    var b = backward[i];
    backPart = b.x + ',' + b.y + ' '  + backPart;
  }
  return start + ' ' + backPart
}