var graph = require('miserables');
//var graph = require('ngraph.generators').grid(8, 8);
var readFieldFromImage = require('./readFieldFromImage');
var PImage = require('pureimage');
var fs = require('fs');
var path = require('path');
var createGraph = require('ngraph.graph');
var pathMemory = require('./pathMemory')();

//var graph = require('./getSocialGraph')();
//var graph = require('ngraph.fromdot')(fs.readFileSync('./data/twit/graph.dot', 'utf8'));

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

var textureVelocity;
var currentTheme = BLUE_THEME;// MAP_THEME;

var OUT_IMAGE_NAME = (new Date()).toISOString().replace(/:/g, '.');

var textureName = path.join('out', 'routes' + OUT_IMAGE_NAME + '.png');
var routeFileName = path.join('out', 'model_' + OUT_IMAGE_NAME + '.json');

var CELL_WIDTH = 1;
var LAYOUT_ITERATIONS = 1500;
var largestCost = 0;

// readFieldFromImage('/Users/anvaka/projects/graph-to-vector-field/data/city2.png', (textureApi) => {
//   textureVelocity = textureApi;
//   start();
// });
start();

// Main code:
function start() {
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
  drawVelocityHeatmap(gridGraph);
  console.log(gridGraph.getLinksCount())
  //return;
  var npath = require('ngraph.path');

  var pathFinder = npath.aStar(gridGraph, {
    distance(fromNode, toNode, link) {
      var seenCount = pathMemory.getSeenCount(fromNode, toNode);
      let lengthReducer = seenCount === 0 ? 1 : (Math.exp(-0.8 * seenCount + Math.log(1 - 0.5)) + 0.5)
      return link.data.cost * lengthReducer;
    },
    heuristic(from, to) {
      let fromPos = from.data;
      let toPos = to.data;
      var r = largestCost * gridGraph.getLinksCount();
      return npath.aStar.l2(fromPos, toPos) * Math.exp(-0.001 * r * r) ;
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

  function drawVelocityHeatmap(graph) {
    var scene = PImage.make(width, height);
    var ctx = scene.getContext('2d');

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = currentTheme.background;
    ctx.fillRect(0,0,width,height);

    graph.forEachLink(link => {
      var from = getPos(graph.getNode(link.fromId));
      var to = getPos(graph.getNode(link.toId));
      drawSegment(from, to, link.data.cost/largestCost);
    });

    var textureName = path.join('out', 'velocity' + OUT_IMAGE_NAME + '.png');
    PImage.encodePNGToStream(scene, fs.createWriteStream(textureName)).then(()=> {
        console.log('Wrote heatmap png file to ' + textureName);
    }).catch(e => {
        console.log('there was an error writing', e);
    });

    function drawSegment(from, to, strength) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${Math.round(strength * 255)}, 0, 0, 1)`;
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke();
    }
  }

  function makeGridGraph(layout) {
    var gridGraph = createGraph();

    var cellsX = width/CELL_WIDTH;
    var cellsY = height/CELL_WIDTH;

    var maxVx = Number.NEGATIVE_INFINITY;
    var maxVy = Number.NEGATIVE_INFINITY;
    var minVx = Number.POSITIVE_INFINITY;
    var minVy = Number.POSITIVE_INFINITY;
    var maxV = 0;
    for (var col = 0; col < cellsX; col += 1) {
      for (var row = 0; row < cellsY; row += 1) {
        var x = (col * CELL_WIDTH + bounds.x1);
        var y = (row * CELL_WIDTH + bounds.y1);

        var v = getVelocity(x, y, layout);
        if (minVx > v.x) minVx = v.x; if (maxVx < v.x) maxVx = v.x;
        if (minVy > v.y) minVy = v.y; if (maxVy < v.y) maxVy = v.y;

        var vLength = length(v.x, v.y);
        if (vLength > maxV) maxV = vLength;

        gridGraph.addNode(getGridNodeKey(col, row), {
          vx: (v.x),
          vy: (v.y),
          x: x,
          y: y
        });
      }
    }
    console.log('Max v: ', maxV);

    for (var col = 0; col < cellsX - 1; col += 1) {
      for (var row = 0; row < cellsY - 1; row += 1) {
        var from = (getGridNodeKey(col, row));
        connect(from, getGridNodeKey(col + 1, row));
        connect(from, getGridNodeKey(col, row + 1));
        // var diag = connect(from, getGridNodeKey(col + 1, row + 1));
      }
    }

    return gridGraph;

    function connect(from, to) {
      var fromNode = gridGraph.getNode(from).data;
      var toNode = gridGraph.getNode(to).data;

      var costX = (fromNode.vx + toNode.vx)/(maxV * 2);
      var costY = (fromNode.vy + toNode.vy)/(maxV * 2);

      // var costX = (fromNode.vx + toNode.vx)/2;
      // var costY = (fromNode.vy + toNode.vy)/2;
      var cost = Math.sqrt(costX * costX + costY*costY);

      // var velocityVector = Math.atan2(costY, costX);
      // if (velocityVector < 0) velocityVector = Math.PI * 2 + velocityVector;
      // var positionVector = Math.atan2(fromNode.y - toNode.y, fromNode.x - toNode.x)
      // if (positionVector < 0) positionVector = Math.PI * 2 + positionVector;
      // cost = Math.abs(positionVector - velocityVector)*Math.sqrt(costX * costX + costY * costY);

      // var costX = 2*maxV - Math.abs(fromNode.vx) - Math.abs(toNode.vx);
      // var costY = 2*maxV - Math.abs(fromNode.vy) - Math.abs(toNode.vy);
      // var cost = Math.sqrt(costX * costX + costY*costY);
      if (cost > largestCost) largestCost = cost;
      return gridGraph.addLink(from, to, {cost});
    }
  }

  function getGridNodeKey(col, row) {
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

      let npath = pathFinder.find(gridFrom, gridTo);
      // drawPath(path);
      // This would draw original edges
      // drawPath([{
      //   data: fromPos
      // }, {
      //   data: toPos
      // }]);

      // Path is inverted, thus we put toId first, and fromId last:
      pathMemory.rememberPath(npath, link.toId, link.fromId);
    });

    return saveRoutes();
  }

  function saveRoutes() {
    var edges = [], nodes = [];
    pathMemory.simplify();
    pathMemory.forEachEdge(v => {
      var from = v.fromId.split(',').map(v => parseInt(v, 10));
      var to = v.toId.split(',').map(v => parseInt(v, 10));
      ctx.beginPath();
      ctx.strokeStyle = currentTheme.linkColor;
      var lineWidth = Math.round(Math.pow(Math.round(4 * v.data/pathMemory.getMaxSeen()), 1.4)) + 1;
      ctx.lineWidth = lineWidth;

      ctx.moveTo(from[0] * CELL_WIDTH, from[1] * CELL_WIDTH);
      ctx.lineTo(to[0] * CELL_WIDTH, to[1] * CELL_WIDTH);
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

    var xCellCount = width/CELL_WIDTH;
    var yCellCount = height/CELL_WIDTH;

    var col = Math.floor(xCellCount * xr);
    var row = Math.floor(yCellCount * yr);

    return getGridNodeKey(col, row);
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
    if (textureVelocity) {
      var dx = (x - bounds.x1)/width;
      var dy = (y - bounds.y1)/height;
      return textureVelocity.get(dx, dy);
    }
    //return {x: -y, y: x};

    var v = getNearestNodeDistance(x, y, layout);

    // for (var i = 0; i < 40; ++i) {
    //   var sn = sortedNodesByDegree[i];
    //   var pos = layout.getNodePosition(sn.id);
    //   v += field(x - pos.x, y - pos.y, sn.linksCount);
    // }
    return {x: v, y: v};
  }

  function getNearestNodeDistance(x, y, layout) {
    var minL = Number.POSITIVE_INFINITY;
    layout.forEachBody(body => {
      var distToBody = length(body.pos.x - x, body.pos.y - y);
      if (distToBody < minL) {
        minL = distToBody;
      }
    });

    return minL;
  }
}
