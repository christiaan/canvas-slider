class CanvasViewport
  constructor: (@node, @images)->
    @context = @node.getContext '2d'

  render: (x)->
    x = Math.max 0, Math.min x, @node.width * (@images.length - 1)
    @context.fillStyle = 'pink'
    @context.fillRect 0, 0, @node.width, @node.height
    @images.forEach (image)=>
      @_drawImage image.node, image.x - x, image.y


  _drawImage: (image, x, y)->
    [x, width, sx] = axisFitOnCanvas(x, image.width, @node.width)
    [y, height, sy] = axisFitOnCanvas(y, image.height, @node.height)
    return if width == 0 or height == 0

    # drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    @context.drawImage(image, sx, sy, width, height, x, y, width, height);
    return


axisFitOnCanvas = (position, size, available)->
  sourcePosition = 0
  if position + size < 0
    size = 0
  else if position < 0
    overdue = 0 - position
    size -= overdue
    sourcePosition += overdue
    position = 0
  else if position > available
    size = 0
  else if position + size > available
    size = available - position

  [position, size, sourcePosition]


module.exports = CanvasViewport
