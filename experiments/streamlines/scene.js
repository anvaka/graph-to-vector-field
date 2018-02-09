var fs = require('fs');
var PImage = require('pureimage');

var imageWidth = 800;
var imageHeight = 800;

module.exports = function createScene(fileName, sceneBBox) {
  var scene = PImage.make(imageWidth, imageHeight);

  var ctx = scene.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.strokeStyle = 'rgb(255, 255, 255, 0.4)'

  var api = {
    drawStreamline: drawStreamline,
    save: save
  };

  return api;

  function drawStreamline(streamLine) {
    var from = getScenePos(streamLine[0]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    for (var i = 1; i < streamLine.length; ++i) {
      var p = getScenePos(streamLine[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  function save() {
    PImage.encodePNGToStream(scene, fs.createWriteStream(fileName)).then(()=> {
        console.log('wrote out the png file to ' + fileName);
    }).catch(e => {
        console.log('there was an error writing', e);
    });
  }

  function getScenePos(modelPos) {
    var tx = (modelPos.x - sceneBBox.left)/sceneBBox.size;
    var ty = (modelPos.y - sceneBBox.top)/sceneBBox.size;

    return {
      y: (1 - ty) * imageHeight,
      x: tx * imageWidth
    }
  }
}