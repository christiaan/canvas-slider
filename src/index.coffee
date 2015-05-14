CanvasViewport = require './CanvasViewport'
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
  setInterval ->
    viewport.render(x);
    x += 1;
  , 16

centered = (size, available)->
  short = available - size
  return 0 if short <= 0

  return Math.floor(short / 2)
