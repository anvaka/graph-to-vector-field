var test = require('tap').test;
var createLookupGrid = require('../experiments/streamlines/createLookupGrid');

test('it can find cells', (t) => {
  var grid = createLookupGrid({
    left: -10,
    top: -10,
    size: 20
  }, 1);
  grid.occupyCoordinates({x: -4, y: 0});

  t.notOk(grid.isTaken(-5, 0), '(-5, 0) should not be taken');
  t.notOk(grid.isTaken(-3.25, 0), '(-3.75, 0) should not be taken');
  t.notOk(grid.isTaken(-4.85, 0), '(-3.75, 0) should not be taken');

  t.ok(grid.isTaken(-3.75, 0), '(-3.75, 0) should be taken');
  t.ok(grid.isTaken(-4.25, 0), '(-4.25, 0) should be taken');
  t.ok(grid.isTaken(-4, 0.49), '(-4, 0.49) should be taken');
  t.ok(grid.isTaken(-4, -0.49), '(-4, 0.49) should be taken');

  t.end();
})