module.exports = createLookupGrid;

class Cell {
  constructor() {
    this.children = null;
  }

  occupy(point) {
    if (!this.children) this.children = [];
    this.children.push(point);
  }

  isTaken(x, y, dist) {
    if (!this.children) return false;

    for(var i = 0; i < this.children.length; ++i) {
      var p = this.children[i];
      var dx = p.x - x, dy = p.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < dist) return true;
    }

    return false;
  }
}

function createLookupGrid(bbox, dSep) {
  var dTest = dSep * 0.5;
  var cellsCount = Math.ceil(bbox.size / dSep);

  var cells = buildCells();

  var api = {
    occupyCoordinates,
    isTaken
  };

  return api;

  function occupyCoordinates(point) {
    var x = point.x, y = point.y;
    getCellByCoordinates(x, y).occupy(point);
  }

  function isTaken(x, y) {
    var cx = gridX(x);
    var cy = gridY(y);
    for (var col = -1; col < 2; ++col) {
      var currentCellX = cx + col;
      if (currentCellX < 0 || currentCellX >= cellsCount) continue;
      
      for (var row = -1; row < 2; ++row) {
        var currentCellY = cy + row;
        if (currentCellY < 0 || currentCellY >= cellsCount) continue;

        if (cells[currentCellX][currentCellY].isTaken(x, y, dTest)) return true;
      }
    }

    return false;
  }

  function buildCells() {
    var result = [];
    for (var y = 0; y < cellsCount; ++y) {
      var col = [];
      result.push(col);
      for (var x = 0; x < cellsCount; ++x) {
        col.push(new Cell());
      }
    }
    return result;
  }

  function getCellByCoordinates(x, y) {
    assertInBounds(x, y);

    return cells[gridX(x)][gridY(y)];
  }

  function gridX(x) {
    return Math.floor(cellsCount * (x - bbox.left)/bbox.size);
  }

  function gridY(y) {
    return Math.floor(cellsCount * (y - bbox.top)/bbox.size);
  }

  function assertInBounds(x, y) {
    if (bbox.left > x || bbox.left + bbox.size < x ) {
      throw new Error('x is out of bounds');
    }
    if (bbox.top > y || bbox.top + bbox.size < y ) {
      throw new Error('y is out of bounds');
    }
  }
}