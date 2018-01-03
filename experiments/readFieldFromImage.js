var PImage = require('pureimage');
var fs = require('fs');
var chroma = require('chroma-js');

module.exports = readFieldFromImage;

function readFieldFromImage(path, done) {
  PImage.decodePNGFromStream(fs.createReadStream(path)).then(img => {
    var width = img.width;
    var height = img.height;

    var imgData = img.getContext('2d').getImageData();

    var api = {get};

    done(api);

    function get(dx, dy) {
      var x = Math.round(dx * width);
      var y = Math.round(dy * height);
      let i = imgData.calculateIndex(x, y);

      var r = imgData.data[i + 0];
      var g = imgData.data[i + 1];
      var b = imgData.data[i + 2];
      var color = chroma(r, g, b).hsl();
      var v = 100 * (color[2]);
      // console.log(x, y, v);
      return {x: v, y: v};
    }
  })
}