dragHandler = (node, parentNode, cb)->
    position = 0
    node.addEventListener 'mousedown', (e)->
      parentNode.addEventListener 'mousemove', reportMovement
      position = e.clientX
      return

    parentNode.addEventListener 'mouseup', ->
      parentNode.removeEventListener 'mousemove', reportMovement
      return

    reportMovement = (e)->
      movement = e.clientX - position
      position = e.clientX
      cb movement
      return

module.exports = dragHandler
