module.exports = function createPathMemory() {
  var seenCount = new Map();
  var maxSeenValue = 0;

  return {
    rememberPath,
    getSeenCount,
    forEachEdge,
    getMaxSeen() {
      return maxSeenValue;
    }
  }

  function forEachEdge(cb) {
    seenCount.forEach(cb);
  }

  function rememberPath(path) {
    var from = path[0];
    for (var i = 1; i < path.length; ++i) {
      var to = path[i];
      rememberEdge(from, to);
      from = to;
    }
  }

  function getSeenCount(from, to) {
    var key = getEdgeKey(from, to);
    return seenCount.get(key) || 0;
  }

  function rememberEdge(from, to) {
    var key = getEdgeKey(from, to);
    var seenValue = (seenCount.get(key) || 0) + 1;
    if (seenValue > maxSeenValue) maxSeenValue = seenValue;
    seenCount.set(key, seenValue);
  }

  function getEdgeKey(from, to) {
    return from.id < to.id ? from.id + ';' + to.id : to.id + ';' + from.id;
  }
}