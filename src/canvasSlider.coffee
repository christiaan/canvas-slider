viewportFactory = require './viewportFactory'
dragHandler = require './dragHandler'
Image = require './Image'

module.exports = (node)->

  viewport = viewportFactory(node, getImages node)

  viewport.render 0

  dragHandler(node, node.ownerDocument)
    .on('movement', (movement)-> viewport.render viewport.position - movement)
    .on('dragStart', -> node.classList.add 'dragging')
    .on('dragStop', -> node.classList.remove 'dragging')

getImages = (node)->
  Array.prototype.map.call node.children, (image, index)->
    if image.tagName.toLowerCase() != 'img'
      throw new Error 'Canvas slider expects the canvas to contain IMG nodes.'

    x = (index * node.clientWidth) + centered(image.width, node.clientWidth)
    y = centered(image.height, node.clientHeight)
    new Image(image, x, y)

centered = (size, available)->
  short = available - size
  if short <= 0 then 0 else Math.floor(short / 2)
