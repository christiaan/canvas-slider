assert = require 'assert'

dragHandler = require './dragHandler'

node = {
  listeners: {},
  classList: {
    list: {}
    add: (cssClass)->
      @list[cssClass] = true
    remove: (cssClass)->
      delete @list[cssClass]
  }
  addEventListener: (event, cb)->
    @listeners[event] = cb
  removeEventListener: (event, cb)->
    delete @listeners[event] if @listeners[event] == cb
}

describe 'dragHandler', ->
  it 'should report movement on mousemove', ->
    movement = null
    dragHandler(node, node).on 'movement', (x)->
      movement = x

    node.listeners.mousedown {clientX: 0}
    node.listeners.mousemove {clientX: 10}
    assert.equal movement, 10

    node.listeners.mousemove {clientX: 5}
    assert.equal movement, -5

    node.listeners.mouseup()
    assert.ok !node.listeners.mousemove

  it 'should indicate dragging by adding a class', ->
    dragStart = false
    dragStop = false
    dragHandler(node, node)
      .on('dragStart', -> dragStart = true)
      .on('dragStop', -> dragStop = true)

    node.listeners.mousedown {clientX: 0}
    assert.ok dragStart, 'dragStart should be emitted'
    assert.ok !dragStop, 'dragStop should not be emitted'

    node.listeners.mouseup()
    assert.ok dragStop, 'dragStop should be emitted'
