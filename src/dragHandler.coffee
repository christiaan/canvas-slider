dragHandler = (node, parentNode, cb)->
    position = 0
    node.addEventListener 'mousedown', (e)->
      parentNode.addEventListener 'mousemove', reportMovement
      node.classList.add 'dragging'
      position = e.clientX
      return

    parentNode.addEventListener 'mouseup', ->
      parentNode.removeEventListener 'mousemove', reportMovement
      node.classList.remove 'dragging'
      return

    reportMovement = (e)->
      movement = e.clientX - position
      position = e.clientX
      cb movement
      return

module.exports = dragHandler
