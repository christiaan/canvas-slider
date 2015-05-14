CanvasViewport = require './CanvasViewport'
dragHandler = require './dragHandler'
Image = require './Image'

window.onload = ->
  node = document.getElementById('slider')
  images = Array.prototype.map.call(node.children, (image, index)->
    x = (index * node.width) + centered(image.width, node.width)
    y = centered(image.height, node.height)
    new Image(image, x, y)
  )

  viewport = new CanvasViewport(node, images)

  x = 0
  viewport.render x

  dragHandler node, document, (movement)->
    x += movement
    viewport.render x

centered = (size, available)->
  short = available - size
  return 0 if short <= 0

  return Math.floor(short / 2)
