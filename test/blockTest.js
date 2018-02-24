var test = require('tap').test;
var createBlockPlacement = require('../experiments/blockPlacement');

test('it can place nodes', (t) => {
  var placement = createBlockPlacement([{
    minX: -10, minY: 0,
    maxX: 10, maxY: 0,
    line: { length: 20 }
  }]);

  var left = {};
  var right = {};
  placement.place(left, [-10, 0]);
  placement.place(right, [10, 0]);
  t.ok(left.pos.x === 0); t.ok(right.pos.x === 0);
  t.ok(Math.abs(left.pos.y) === 6);
  t.ok(Math.abs(right.pos.y) === 6);
  t.end();
})