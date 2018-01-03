var graph = require('miserables');
// var graph = require('ngraph.generators').grid(4, 4);
// var graph = require('./getSocialGraph')();

var PImage = require('pureimage');
var fs = require('fs');
var path = require('path');
var createGraph = require('ngraph.graph');

var DRAW_NODES = true;
var MAP_THEME = {
  background: '#F0EDE5',
  nodeColor: '#CB6866',
  linkColor: '#DDB885'
}
var BLUE_THEME = {
  background: '#0E2D5B',
  nodeColor: '#9fffff',
  linkColor: '#78FFFF',
}

var currentTheme = BLUE_THEME;// MAP_THEME;

var OUT_IMAGE_NAME = (new Date()).toISOString().replace(/:/g, '.');
var textureName = path.join('out', 'routes' + OUT_IMAGE_NAME + '.png');
var routeFileName = path.join('out', 'model_' + OUT_IMAGE_NAME + '.json');

var pathMemory = require('./pathMemory')();

var cellWidth = 4;
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
console.log(bounds);

var scene = PImage.make(width, height);
var ctx = scene.getContext('2d');

ctx.imageSmoothingEnabled = false;
ctx.fillStyle = currentTheme.background;
ctx.fillRect(0,0,width,height);

var sortedNodesByDegree = [];
graph.forEachNode(node => {
  var links = graph.getLinks(node.id);
  sortedNodesByDegree.push({
    id: node.id,
    linksCount: (links && links.length) || 0
  });
});
sortedNodesByDegree.sort((x, y) => y.linksCount - x.linksCount);
console.log(sortedNodesByDegree[0])

var gridGraph = makeGridGraph(layout);
console.log(gridGraph.getLinksCount())
var path = require('ngraph.path');
var largestCost = 1;

var pathFinder = path.aStar(gridGraph, {
  distance(fromNode, toNode, link) {
    var seenCount = getSeenCount(fromNode, toNode);
    let lengthReducer = seenCount === 0 ? 1 : (Math.exp(-0.8 * seenCount + Math.log(1 - 0.5)) + 0.5)
    return link.data.cost * lengthReducer;
  },
 heuristic(from, to) {
   let fromPos = from.data;
   let toPos = to.data;
   var r = largestCost * gridGraph.getLinksCount();
   return path.aStar.l2(fromPos, toPos) * Math.exp(-0.001 * r * r) ;
 }
});

var routeMap = routeEdges(layout, graph);

fs.writeFileSync(routeFileName, JSON.stringify(routeMap), 'utf8');

PImage.encodePNGToStream(scene, fs.createWriteStream(textureName)).then(()=> {
    console.log('Wrote out the png file to ' + textureName);
    console.log('Model file saved to ' + routeFileName);
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

  var maxV = 0;
  for (var col = 0; col < cellsX; col += 1) {
    for (var row = 0; row < cellsY; row += 1) {
      var x = (col * cellWidth + bounds.x1);
      var y = (row * cellWidth + bounds.y1);

      var v = getVelocity(x, y, layout);
      if (Math.abs(v) > maxV) maxV = Math.abs(v);

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
      // var diag = connect(from, getKey(col + 1, row + 1));
    }
  }

  return gridGraph;

  function connect(from, to) {
    var fromNode = gridGraph.getNode(from);
    var toNode = gridGraph.getNode(to);

    var costX = (fromNode.data.vx + toNode.data.vx)/2;
    var costY = (fromNode.data.vy + toNode.data.vy)/2;

   // var costX = maxV - Math.abs(fromNode.data.vx) - Math.abs(toNode.data.vx);
   // var costY = maxV - Math.abs(fromNode.data.vy) - Math.abs(toNode.data.vy);
    var cost = Math.sqrt(costX * costX + costY*costY);
    if (cost > largestCost) largestCost = cost;
    return gridGraph.addLink(from, to, {cost});
  }
}

function getKey(col, row) {
  return `${col},${row}`;
}

function routeEdges(layout, graph) {
  var linksCount = graph.getLinksCount();
  var processed = 0;
  graph.forEachLink(link => {
    console.log('Processing ' + processed + ' out of ' + linksCount);
    processed += 1;
    // if (processed > 100) return;
    var fromPos = layout.getNodePosition(link.fromId);
    var toPos = layout.getNodePosition(link.toId);
    var gridFrom = getGridNode(fromPos);
    var gridTo = getGridNode(toPos);

    let path = pathFinder.find(gridFrom, gridTo);
    // drawPath(path);
    // This would draw original edges
    // drawPath([{
    //   data: fromPos
    // }, {
    //   data: toPos
    // }]);
    pathMemory.rememberPath(path, link.fromId, link.toId);
  });

  return saveRoutes();
}

function saveRoutes() {
  var edges = [], nodes = [];
  pathMemory.forEachEdge((v, k) => {
    var edgeParts = k.split(';');
    var from = edgeParts[0].split(',').map(v => parseInt(v, 10));
    var to = edgeParts[1].split(',').map(v => parseInt(v, 10));
    ctx.beginPath();
    ctx.strokeStyle = currentTheme.linkColor;
    var lineWidth = Math.round(Math.pow(Math.round(4 * v/pathMemory.getMaxSeen()), 1.4)) + 1;
    ctx.lineWidth = lineWidth;

    ctx.moveTo(from[0] * cellWidth, from[1] * cellWidth);
    ctx.lineTo(to[0] * cellWidth, to[1] * cellWidth);
    edges.push({ from, to, lineWidth })
    ctx.stroke();
  });

  if (DRAW_NODES) {
    ctx.fillStyle = currentTheme.nodeColor;
    graph.forEachNode(node => {
      var pos = layout.getNodePosition(node.id);
      var rw = 8; var rh = 8;
      var x = pos.x - bounds.x1;
      var y = pos.y - bounds.y1;
      ctx.fillRect(x - rw/2, y - rh/2, rw, rh);

      nodes.push({x: Math.round(x), y: Math.round(y)});
    });
  }

  return {nodes, edges}
}

function drawPath(path) {
  var pt = getPos(path[1]);
  ctx.beginPath();
  ctx.strokeStyle = currentTheme.linkColor
  ctx.moveTo(pt.x, pt.y)
  for (var i = 4; i < path.length - 4; ++i) {
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

  var adjustStep = 6;

  graph.forEachNode(node => {
    var pos = layout.getNodePosition(node.id);
    layout.setNodePosition(node.id, 
      Math.floor(pos.x / adjustStep) * adjustStep,
      Math.floor(pos.y / adjustStep) * adjustStep
    );
  })
  return layout;
}

function length(x, y) {
  return Math.sqrt(x * x + y * y);
}

function field(cx, cy, scale) {
  var l = length(cx, cy);
  //return  Math.cos(cy/4.) * Math.cos(cx/4)*Math.exp(-l * l * 0.06 / scale);
  return  Math.cos(l/6.)*Math.exp(-l * l * 0.006 / scale);
}

function getVelocity(x, y, layout) {
  var a = Math.PI/3.;
  var px = x * Math.cos(a) - y * Math.sin(a);
  var py = y * Math.cos(a) + x * Math.sin(a);
  var v = Math.cos(px/6) * Math.cos(py/6) ;

  for (var i = 0; i < 40; ++i) {
    var sn = sortedNodesByDegree[i];
    var pos = layout.getNodePosition(sn.id);
    v += field(x - pos.x, y - pos.y, sn.linksCount);
  }
  return {x: v, y: v};
}