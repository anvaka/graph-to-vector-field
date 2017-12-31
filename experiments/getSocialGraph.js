var createGraph = require('ngraph.graph');

module.exports = getGraph;

function getGraph() {
  // Note: anvaka.json is not committed. I don't want to share my social graph :).
  let socialData = require('../data/anvaka.json')
  return parseJSONGraph(socialData);
}

function parseJSONGraph(jsonGraph) {
  const graph = createGraph();

  jsonGraph.nodes.forEach(n => {
    graph.addNode(n.id, n.data);
  });
  
  jsonGraph.links.forEach(l => {
    graph.addLink(l.fromId, l.toId)
  })

  return graph;
}
