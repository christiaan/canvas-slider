class Image
  constructor: (@node, @x, @y)->

  draw: (viewport)->
    viewport.drawImage(@node, @x, @y)

module.exports = Image
