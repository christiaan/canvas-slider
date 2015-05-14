canvasSlider = require './canvasSlider'

window.onload = ->
  nodes = document.getElementsByClassName('slider')
  Array.prototype.forEach.call nodes, canvasSlider

