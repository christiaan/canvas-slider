class HtmlViewport
  constructor: (@node, @images)->
    @_setPosition 0

  render: (x)->
    @_setPosition x
    @images.forEach (image)=> image.draw(this)

  drawImage: (image, x, y)->
    x -= @position
    image.style.left = x + 'px'
    image.style.top = y + 'px'

  _setPosition: (position)->
    position = Math.min position, @node.clientWidth * (@images.length - 1)
    position = Math.max 0, position
    @position = position


module.exports = HtmlViewport
