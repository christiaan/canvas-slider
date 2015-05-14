assert = require 'assert'
Image = require './Image'

CanvasViewport = require './CanvasViewport'

describe 'CanvasViewport', ->
  it 'should only draw images inside the viewport', ->
    context = {
      images: [],
      clearRect: ()->
      drawImage: (image)->
        @images.push image
    }
    canvas = {
      width: 200,
      height: 100,
      getContext: -> context
    }
    images = [
      new Image({width: 200, height: 100}, 0, 0),
      new Image({width: 200, height: 100}, 100, 0),
      new Image({width: 200, height: 100}, 200, 0),
      new Image({width: 200, height: 100}, 300, 0),
      new Image({width: 200, height: 100}, 400, 0),
    ]
    viewport = new CanvasViewport(canvas, images);

    viewport.render 200

    assert.equal context.images.length, 3
    assert.equal context.images[0], images[1].node
    assert.equal context.images[1], images[2].node
    assert.equal context.images[2], images[3].node
