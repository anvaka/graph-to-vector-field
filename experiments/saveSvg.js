
var getPathFromPolyline = require('./getPathFromPolyline');
var createPathsFromEdges = require('./createPathsFromEdges');

module.exports = function saveSvg(pathMemory) {
  var polyLines = createPathsFromEdges(pathMemory);

  var paths = polyLines.map(poly => {
    var data = getPathFromPolyline(poly);
    return '<path d="' + data + '"></path>';
  })


  pathMemory.forEachRoot(root => {
    var pos = root.pos;
    if (!pos) return;

    var leftTop = pos.leftTop;
    var leftBottom = pos.leftBottom;
    var topRight = pos.topRight;
    var bottomRight = pos.bottomRight;
    // ctx.lineWidth = 1;

    var data = `M${leftTop.x},${leftTop.y}L${topRight.x},${topRight.y} ${bottomRight.x},${bottomRight.y} ${leftBottom.x},${leftBottom.y}z`;
    paths.push(`<path d='${data}' class='building' title='${root.id}'></path>`)
  });

  return paths.join('\n');
}