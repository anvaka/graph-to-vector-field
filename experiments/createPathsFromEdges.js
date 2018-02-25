var getXY = require('./getXY');

module.exports = createPathsFromEdges;

function createPathsFromEdges(pathMemory) {
  var graph = pathMemory.getGraph();
  var nodes = [];
  var routes = [];
  var visited = new Set();

  graph.forEachNode(node => {
    nodes.push({
      id: node.id,
      maxWidth: getMaxWidth(node.links),
      links: node.links
    });
  });

  nodes.sort((a, b) => { b.maxWidth - a.maxWidth });

  nodes.forEach(node => dfsRoute(node));

  return routes;

  function dfsRoute(startNode, width, route) {
    if (visited.has(startNode.id)) {
      if (!route) return;

      var startPos = getXY(startNode.id);
      route.push({
        width: width || 0,
        x: startPos[0],
        y: startPos[1]
      })
      if (route.length === 2) {
        route[0].width = width;
      }
      if(!route.added && route.length > 1) {
        route.added = true;
        routes.push(route);
      }
      return;
    }

    visited.add(startNode.id);
    if (!route) route = [];

    var startPos = getXY(startNode.id);
    route.push({
      width: width || 0,
      x: startPos[0],
      y: startPos[1]
    })
    if (route.length === 2) {
      route[0].width = width;
    }
    var links = startNode.links;
    // if (links.length === 1) {
    //   routes.push(route);
    //   return;
    // }
    //prefer heavy routes first
    links.sort((a, b) => b.data - a.data);
    for (var i = 0; i < links.length; ++i) {
      var link = links[i];
      if (link.toId === startNode.id) continue;

      var nextNode = link.toId;// === startNode.id ? link.toId : link.fromId;
      //if (visited.has(nextNode))  continue;

      var width = pathMemory.getEdgeWidth(link);
      dfsRoute(graph.getNode(nextNode), width, route);
      if (!route.added && route.length > 1) {
        route.added = true;
        routes.push(route);
      }
      // we are branching off from here
      if (i < links.length - 1) {
        route = [{
          width: width,
          x: startPos[0],
          y: startPos[1]
        }]
      }
    }
    if (!route.added && route.length > 1) {
      route.added = true;
      routes.push(route);
    }
  }

  function getMaxWidth(links) {
    var w = 0;
    for (var i = 0; i < links.length; ++i) if (links[i].data > w) w = links[i].data;
    return w;
  }
}