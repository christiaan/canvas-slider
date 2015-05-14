EventEmitter = require('events').EventEmitter

dragHandler = (node, parentNode)->
  events = new EventEmitter()
  position = 0
  node.addEventListener 'mousedown', (e)->
    parentNode.addEventListener 'mousemove', reportMovement
    position = e.clientX
    events.emit 'dragStart'
    return

  parentNode.addEventListener 'mouseup', ->
    parentNode.removeEventListener 'mousemove', reportMovement
    events.emit 'dragStop'
    return

  reportMovement = (e)->
    movement = e.clientX - position
    position = e.clientX
    events.emit 'movement', movement
    return

  return events

module.exports = dragHandler
