var graph = require('miserables');
//var graph = require('ngraph.generators').grid(4, 3);
var readFieldFromImage = require('./readFieldFromImage');
var fs = require('fs');
var path = require('path');
var createGraph = require('ngraph.graph');
var pathMemory = require('./pathMemory')();
var Canvas = require('canvas');
var saveSvg = require('./saveSvg');

//var graph = require('./getSocialGraph')();
//var graph = require('ngraph.fromdot')(fs.readFileSync('./data/twit/part.dot', 'utf8'));
//var graph = require('ngraph.fromdot')(fs.readFileSync('./data/reddit.dot', 'utf8'));

var DRAW_NODES = true;

var MAP_THEME = {
  background: '#F0EDE5',
  nodeColor: '#CB6866',
  linkColor: '#DDB885'
}
var BLUE_THEME = {
  background: '#0E2D5B',
  nodeColor: '#9fffff',
  linkColor: 'rgba(120, 255, 255, 0.8)',
  nodeBorder: '#78FFFF',
}

var textureVelocity;
var currentTheme = BLUE_THEME;// MAP_THEME;

var OUT_IMAGE_NAME = (new Date()).toISOString().replace(/:/g, '.');

var textureName = path.join('out', 'routes' + OUT_IMAGE_NAME + '.png');
var routeFileName = path.join('out', 'model_' + OUT_IMAGE_NAME + '.json');
var svgFileName = path.join('out', 'svg_' + OUT_IMAGE_NAME + '.svg');

let gridAlignedCellSize = 20;
var CELL_WIDTH = 1;
var LAYOUT_ITERATIONS = 1500;
var largestCost = 0;

assignSizeToNodes(graph);

// readFieldFromImage('/Users/anvaka/projects/graph-to-vector-field/data/city.png', (textureApi) => {
//   textureVelocity = textureApi;
//   start();
// });
start();

function assignSizeToNodes(graph) {
  var maxDegree = 0; // 
  var minDegree = Number.POSITIVE_INFINITY;
  var nodeScore = Object.create(null);
  graph.forEachNode(node => {
    if (!node.data) node.data = {};
    if (!node.links) {
      node.data.degree = 0;
      return;
    }

    var degree = 0;
    for (var i = 0; i < node.links.length; ++i) {
      var link = node.links[i];
      if (link.toId === node.id) degree += 1;
    }
    if (node.data.degree !== undefined) throw new Error('Data already has degree');
    node.data.degree = degree;

    if (degree > maxDegree) maxDegree = degree;
    if (degree < minDegree) minDegree = degree;
  });

  graph.forEachNode(node => {
    node.data.size = getBucket(node.data.degree, minDegree, maxDegree, 4) + 6;
  })

  function getBucket(value, min, max, bucketsCount) {
    let slice = (value - min) / (max - min);
    return Math.round(slice * bucketsCount);
  }
}

// Main code:
function start() {
  var layout = layoutGraph(graph);
  var bounds = moveToPosition(graph, layout);
  var width = bounds.x2 - bounds.x1;
  var height = bounds.y2 - bounds.y1;
  bounds.x1 -=  30
  bounds.x2 +=  30;
  bounds.y1 -=  30;
  bounds.y2 +=  30;
  width += 60;
  height += 60;
  console.log(bounds);

  var scene = new Canvas(width, height);
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

  savePng(scene, textureName) .then(()=> {
      console.log('Wrote out the png file to ' + textureName);
      console.log('Model file saved to ' + routeFileName);
  }).catch(e => {
      console.log('there was an error writing', e);
  });

  function drawVelocityHeatmap(graph) {
    var scene = new Canvas(width, height);
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
    savePng(scene, textureName).then(()=> {
      console.log('Wrote heatmap png file to ' + textureName);
    }).catch(e => {
      console.log('there was an error writing', e);
    });

    function drawSegment(from, to, strength) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${Math.round(strength * 255)}, 0, 0, 0.61)`;
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
      pathMemory.rememberPath(npath, graph.getNode(link.toId), graph.getNode(link.fromId));
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
      var lineWidth = ctx.lineWidth = pathMemory.getEdgeWidth(v);

      ctx.moveTo(from[0] * CELL_WIDTH, from[1] * CELL_WIDTH);
      ctx.lineTo(to[0] * CELL_WIDTH, to[1] * CELL_WIDTH);
      edges.push({ from, to, lineWidth })
      ctx.stroke();
    });

    if (DRAW_NODES) {
      ctx.fillStyle = currentTheme.nodeColor;
      ctx.strokeStyle = currentTheme.nodeColor;
      pathMemory.moveRootsOut();
      pathMemory.forEachRoot(root => {
        var pos = root.pos;
        if (!pos) return;

        var leftTop = pos.leftTop;
        var leftBottom = pos.leftBottom;
        var topRight = pos.topRight;
        var bottomRight = pos.bottomRight;
        // ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(leftTop.x, leftTop.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(leftBottom.x, leftBottom.y);
        //ctx.lineTo(leftTop.x, leftTop.y);

        ctx.stroke();
        //ctx.closePath();
        ctx.fill();
        //ctx.fillText(root.id, pos.center.x, pos.center.y)
      });

      /*
      graph.forEachNode(node => {
        var pos = layout.getNodePosition(node.id);
        var rw = 8; var rh = 8;
        var x = pos.x - bounds.x1;
        var y = pos.y - bounds.y1;
        ctx.fillRect(x - rw/2, y - rh/2, rw, rh);

        nodes.push({x: Math.round(x), y: Math.round(y)});
      });
      */
    }

    var svg = saveSvg(pathMemory);
    fs.writeFileSync(svgFileName, `<svg viewBox="0 0 ${width} ${height}"><g id="scene">
${svg}
</g></svg>`);
    return {nodes, edges }
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
      springLength : 30,
      springCoeff : 0.0008,
      dragCoeff : 0.02,
      gravity : -1.2
    });

    for(var i = 0; i < LAYOUT_ITERATIONS; ++i) layout.step();

    // var adjustStep = 6;

    // graph.forEachNode(node => {
    //   var pos = layout.getNodePosition(node.id);
    //   layout.setNodePosition(node.id, 
    //     Math.floor(pos.x / adjustStep) * adjustStep,
    //     Math.floor(pos.y / adjustStep) * adjustStep
    //   );
    // })
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
    // var l = Math.sqrt()
    // return {
    //   x: field(x, y, 1),
    //   y: field(x, y, 1)
    // }

    var v = getNearestNodeDistance(x, y, layout);

    // var v = 0;

    // for (var i = 0; i < 10; ++i) {
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

function moveToPosition(graph, layout) {
  let seenPos = new Set();

  var bounds = {
    x1: Number.POSITIVE_INFINITY,
    y1: Number.POSITIVE_INFINITY,
    x2: Number.NEGATIVE_INFINITY,
    y2: Number.NEGATIVE_INFINITY
  };

  graph.forEachNode(node => {
    let pos = layout.getNodePosition(node.id);
    let nodeSize = gridAlignedCellSize / 2;
    let x = gridAlignedCellSize * Math.round((pos.x - nodeSize) / gridAlignedCellSize);
    let y = gridAlignedCellSize * Math.round((pos.y - nodeSize) / gridAlignedCellSize);
    let key = x + ';' + y;
    let t = 1;
    // Move out if it is already occupied
    while (seenPos.has(key)) {
      let sx = Math.random() < 0.5 ? 1 : -1;
      let sy = Math.random() < 0.5 ? 1 : -1;
      x = gridAlignedCellSize * (Math.round((pos.x - nodeSize) / gridAlignedCellSize) + sx * t);
      y = gridAlignedCellSize * (Math.round((pos.y - nodeSize) / gridAlignedCellSize) + sy * t);
      key = x + ';' + y;
      t += 1;
    }

    seenPos.add(key);
    pos.x = x + nodeSize;
    pos.y = y + nodeSize;
    
    updateBounds(pos.x, pos.y);
  })

  return bounds;

  function updateBounds(x, y) {
    if (x < bounds.x1) bounds.x1 = x;
    if (x > bounds.x2) bounds.x2 = x;
    if (y < bounds.y1) bounds.y1 = y;
    if (y > bounds.y2) bounds.y2 = y;
  }
}

function savePng(canvas, outFileName) {
  return new Promise((resolve, reject) => {
    var out = fs.createWriteStream(outFileName);
    var stream = canvas.pngStream();
    stream.on('data', function(chunk){ out.write(chunk); });
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}