var graph = require('miserables');
var createGraph = require('ngraph.graph');
var PImage = require('pureimage');
var fs = require('fs');
var path = require('path');
var OUT_IMAGE_NAME = (new Date()).toISOString().replace(/:/g, '.');
var textureName = 'routes' + OUT_IMAGE_NAME + '.png';
var pathMemory = require('./pathMemory')();

var cellWidth = 1;
var LAYOUT_ITERATIONS = 1500;
// Main code:
var layout = layoutGraph(graph);
var bounds = layout.getGraphRect();
var width = bounds.x2 - bounds.x1;
var height = bounds.y2 - bounds.y1;
bounds.x1 -= width * .05
bounds.x2 += width * .05;
bounds.y1 -= height * .05;
bounds.y2 += height * .05;
width += width * 0.1;
height += height * 0.1;
var scene = PImage.make(width, height);
var ctx = scene.getContext('2d');
ctx.fillStyle = '#0E2D5B';
ctx.fillRect(0,0,width,height);

var gridGraph = makeGridGraph(layout);
var path = require('ngraph.path');

let maxReducer = (Math.exp(-0.8 * gridGraph.getLinksCount() + Math.log(1 - 0.5)) + 0.5)
var pathFinder = path.aStar(gridGraph, {
  distance(fromNode, toNode, link) {
    var seenCount = getSeenCount(fromNode, toNode);
    let lengthReducer = seenCount === 0 ? 1 : (Math.exp(-0.8 * seenCount + Math.log(1 - 0.5)) + 0.5)
    return link.data.cost * lengthReducer;
  },
  heuristic(from, to) {
    let fromPos = from.data;
    let toPos = to.data;
    return path.aStar.l2(fromPos, toPos) * maxReducer;
}
});

console.log(gridGraph.getLinksCount())

routeEdges(layout, graph);

PImage.encodePNGToStream(scene, fs.createWriteStream(textureName)).then(()=> {
    console.log('wrote out the png file to ' + textureName);
}).catch(e => {
    console.log('there was an error writing', e);
});

function getSeenCount(from, to) {
  return pathMemory.getSeenCount(from, to);
}

function makeGridGraph(layout) {
  var gridGraph = createGraph();

  var cellsX = width/cellWidth;
  var cellsY = height/cellWidth;

  for (var col = 0; col < cellsX; col += 1) {
    for (var row = 0; row < cellsY; row += 1) {
      var x = (col * cellWidth + bounds.x1);
      var y = (row * cellWidth + bounds.y1);

      var v = getVelocity(x, y, layout);
      gridGraph.addNode(getKey(col, row), {
        vx: (v.x),
        vy: (v.y),
        x: x,
        y: y
      });
    }
  }

  for (var col = 0; col < cellsX - 1; col += 1) {
    for (var row = 0; row < cellsY - 1; row += 1) {
      var from = (getKey(col, row));
      connect(from, getKey(col + 1, row));
      connect(from, getKey(col, row + 1));
//      var diag = connect(from, getKey(col + 1, row + 1));
    }
  }

  return gridGraph;

  function connect(from, to) {
    var fromNode = gridGraph.getNode(from);
    var toNode = gridGraph.getNode(to);

    var costX = (fromNode.data.vx + toNode.data.vx)/2;
    var costY = (fromNode.data.vy + toNode.data.vy)/2;

    var cost = Math.sqrt(costX * costX + costY*costY);
    return gridGraph.addLink(from, to, {cost});
  }
}

function getKey(col, row) {
  return `${col},${row}`;
}

function rbf(r, eps = 0.008) {
  //return 1./(1 + r * r);
  return Math.exp(-r * r * eps);
}


function routeEdges(layout, graph) {
  graph.forEachLink(link => {
    var fromPos = layout.getNodePosition(link.fromId);
    var toPos = layout.getNodePosition(link.toId);
    var gridFrom = getGridNode(fromPos);
    var gridTo = getGridNode(toPos);

    let path = pathFinder.find(gridFrom, gridTo);
    drawPath(path);
    pathMemory.rememberPath(path);
  })

  ctx.fillStyle = '#9fffff';

  graph.forEachNode(node => {
    var pos = layout.getNodePosition(node.id);
    ctx.beginPath();
    ctx.arc(pos.x - bounds.x1,pos.y - bounds.y1,5,0,2*Math.PI, true);
    ctx.closePath();
    ctx.fill();
  })
}

function drawPath(path) {
  var pt = getPos(path[0]);
  ctx.beginPath();
  ctx.strokeStyle = '#78FFFF'
  ctx.moveTo(pt.x, pt.y)
  for (var i = 1; i < path.length; ++i) {
    var to = getPos(path[i]);
    ctx.lineTo(to.x, to.y);
  }
  ctx.stroke();
}

function getPos(cell) {
  return {
    x: cell.data.x - bounds.x1,
    y: cell.data.y - bounds.y1
  };
}

function getGridNode(pos) {
  var xr = (pos.x - bounds.x1)/width;
  var yr = (pos.y - bounds.y1)/height;

  var xCellCount = width/cellWidth;
  var yCellCount = height/cellWidth;

  var col = Math.floor(xCellCount * xr);
  var row = Math.floor(yCellCount * yr);

  return getKey(col, row);
}

function layoutGraph(graph) {
  console.log('running layout...')

  var layout = require('ngraph.forcelayout')(graph, {
    springLength : 35,
    springCoeff : 0.00055,
    dragCoeff : 0.09,
    gravity : -1
  });

  for(var i = 0; i < LAYOUT_ITERATIONS; ++i) layout.step();

  return layout;
}

function vectorField(x, y) {
  return {
    x: x,
    y: y
  }
}
function length(x, y) {
  return Math.sqrt(x * x + y * y);
}

function getVelocity(x, y, layout) {
  var v = {x: 0, y: 0};
  if (-100 < x && x < 0 && -100 < y && y < 0) return {x: Math.sin(length(y, x))*y, y: 0}; // Math.sin(length(x, y))};
  return {x: x, y: y};

  graph.forEachNode(node => {
    var pos = layout.getNodePosition(node.id);
    var px = x - pos.x;
    var py = y - pos.y;
    var d = getLength(px, py);
    if (d < 1e-5) return;

    var vf = vectorField(px, py);

    v.x += vf.x * rbf(d, 0.009);
    v.y += vf.y * rbf(d, 0.009);
  });

  return v;
}

function getLength(x, y) {
  return Math.sqrt(x * x + y * y);
}