class CanvasViewport
  constructor: (@node, @images)->
    @context = @node.getContext '2d'
    @_setPosition 0

  render: (x)->
    @_setPosition x
    @context.fillStyle = 'pink'
    @context.fillRect 0, 0, @node.width, @node.height
    @images.forEach (image)=> image.draw(this)

  drawImage: (image, x, y)->
    x -= @position
    [x, width, sx] = axisFitOnCanvas(x, image.width, @node.width)
    [y, height, sy] = axisFitOnCanvas(y, image.height, @node.height)
    return if width == 0 or height == 0

    # drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    @context.drawImage(image, sx, sy, width, height, x, y, width, height);
    return

  _setPosition: (position)->
    position = Math.min position, @node.width * (@images.length - 1)
    position = Math.max 0, position
    @position = position

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
