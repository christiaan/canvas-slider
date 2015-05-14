CanvasSlider = require './CanvasSlider'

canvasSlider = window.canvasSlider || {}

canvasSlider.createFrom = (node) ->

  images = Array.prototype.map.call(node.children, (image, index)->
    {
      node: image,
      x: index * node.width,
      y: 0
    }
  )

  slider = new CanvasSlider(node, images)

  slider.render 0

window.canvasSlider = canvasSlider
