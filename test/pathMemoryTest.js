var test = require('tap').test;
var createPathMemory = require('../experiments/pathMemory');

test('it can remember path', (t) => {
  var pathMemory = createPathMemory();
  pathMemory.rememberPath([{id: '0,0'}, {id: '0,1'}]);

  t.equals(pathMemory.getMaxSeen(), 1);
  t.equals(pathMemory.getSeenCount({id: '0,0'}, {id: '0,1'}), 1);
  t.equals(pathMemory.getSeenCount({id: '0,1'}, {id: '0,0'}), 1);

  t.end();
});

test('it can remember count', (t) => {
  var pathMemory = createPathMemory();
  pathMemory.rememberPath([{id: '0,0'}, {id: '0,1'}]);
  pathMemory.rememberPath([{id: '0,1'}, {id: '0,0'}]);

  t.equals(pathMemory.getMaxSeen(), 2);
  t.equals(pathMemory.getSeenCount({id: '0,0'}, {id: '0,1'}), 2);

  t.end();
})

test('it can simplify path', (t) => {
  var pathMemory = createPathMemory();
  pathMemory.rememberPath([{id: '0,0'}, {id: '0,1'}, {id: '0,2'}, {id: '0,3'}], 'a', 'b');
  pathMemory.rememberPath([{id: '-1,2'}, {id: '0,2'}, {id: '1,2'}], 'c', 'd');

  pathMemory.simplify();

  var count = 0;
  pathMemory.forEachEdge(edge => {
    count += 1;
    t.notOk(edge.id === '0,1');
  });
  t.equals(count, 4, 'expected four edges only');
  t.end();
})

test('it can simplify diagonal path', (t) => {
  var pathMemory = createPathMemory();
  pathMemory.rememberPath([{id: '0,0'}, {id: '1,1'}, {id: '2,2'}, {id: '3,3'}], 'a', 'b');

  pathMemory.simplify();

  var count = 0;
  pathMemory.forEachEdge(() => {
    count += 1;
  });
  t.equals(count, 1, 'expected one edge only');
  t.end();
})