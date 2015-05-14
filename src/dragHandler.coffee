dragHandler = (node, parentNode, cb)->
    position = 0
    node.addEventListener 'mousedown', (e)->
      parentNode.addEventListener 'mousemove', reportMovement
      position = e.clientX
      return

    parentNode.addEventListener 'mouseup', (e)->
      parentNode.removeEventListener 'mousemove', reportMovement
      return

    reportMovement = (e)->
      movement = position - e.clientX
      position = e.clientX
      cb movement
      return

module.exports = dragHandler
