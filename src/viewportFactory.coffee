CanvasViewport = require './CanvasViewport'
HtmlViewport = require './HtmlViewport'

module.exports = (node, images)->
  if node and node.tagName.toLowerCase() == 'canvas'
    return new CanvasViewport(node, images)
  else if node and node.tagName.toLowerCase() == 'div'
    return new HtmlViewport(node, images)
  else
    throw new Error 'CanvasSlider expects a canvas node'
