class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(other) {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  mulScalar(scalar) {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  distanceTo(other) {
    var dx = other.x - this.x;
    var dy = other.y - this.y;

    return Math.sqrt(dx * dx + dy * dy);
  }
}
module.exports = Vector;