CanvasViewport = require './CanvasViewport'
dragHandler = require './dragHandler'
Image = require './Image'

module.exports = (node)->
  images = getImages node

  viewport = new CanvasViewport(node, images)

  x = 0
  viewport.render x

  dragHandler node, node.ownerDocument, (movement)->
    x -= movement
    viewport.render x

getImages = (node)->
  Array.prototype.map.call node.children, (image, index)->
    x = (index * node.width) + centered(image.width, node.width)
    y = centered(image.height, node.height)
    new Image(image, x, y)

centered = (size, available)->
  short = available - size
  if short <= 0 then 0 else Math.floor(short / 2)
