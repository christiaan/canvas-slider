assert = require 'assert'

CanvasViewport = require './CanvasViewport'

describe 'CanvasViewport', ->
  it 'should only draw images inside the viewport', ->
    context = {
      clearRect: ()->
      drawImage: ()->
    }
    canvas = {
      getContext: -> context
    }
    viewport = new CanvasViewport(canvas, []);
