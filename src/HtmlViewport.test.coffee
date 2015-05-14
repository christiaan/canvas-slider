assert = require 'assert'
Image = require './Image'

HtmlViewport = require './HtmlViewport'

describe 'HtmlViewport', ->
  it 'should update all offsets', ->
    canvas = {
      clientWidth: 200,
      height: 100,
    }
    images = [
      new Image({width: 200, height: 100, style: {}}, 0, 0),
      new Image({width: 200, height: 100, style: {}}, 100, 0),
      new Image({width: 200, height: 100, style: {}}, 200, 0),
      new Image({width: 200, height: 100, style: {}}, 300, 0),
      new Image({width: 200, height: 100, style: {}}, 400, 0),
    ]
    viewport = new HtmlViewport(canvas, images);

    viewport.render 200

    assert.equal images[1].node.style.left, '-100px'
    assert.equal images[2].node.style.left, '0px'
    assert.equal images[3].node.style.left, '100px'
