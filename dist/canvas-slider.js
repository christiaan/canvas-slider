(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
var CanvasViewport, axisFitOnCanvas;

CanvasViewport = (function() {
  function CanvasViewport(node, images) {
    this.node = node;
    this.images = images;
    this.context = this.node.getContext('2d');
    this._setPosition(0);
  }

  CanvasViewport.prototype.render = function(x) {
    this._setPosition(x);
    this.context.clearRect(0, 0, this.node.width, this.node.height);
    return this.images.forEach((function(_this) {
      return function(image) {
        return image.draw(_this);
      };
    })(this));
  };

  CanvasViewport.prototype.drawImage = function(image, x, y) {
    var height, ref, ref1, sx, sy, width;
    x -= this.position;
    ref = axisFitOnCanvas(x, image.width, this.node.width), x = ref[0], width = ref[1], sx = ref[2];
    ref1 = axisFitOnCanvas(y, image.height, this.node.height), y = ref1[0], height = ref1[1], sy = ref1[2];
    if (width === 0 || height === 0) {
      return;
    }
    this.context.drawImage(image, sx, sy, width, height, x, y, width, height);
  };

  CanvasViewport.prototype._setPosition = function(position) {
    position = Math.min(position, this.node.width * (this.images.length - 1));
    position = Math.max(0, position);
    return this.position = position;
  };

  return CanvasViewport;

})();

axisFitOnCanvas = function(position, size, available) {
  var overdue, sourcePosition;
  sourcePosition = 0;
  if (position + size < 0) {
    size = 0;
  } else if (position < 0) {
    overdue = 0 - position;
    size -= overdue;
    sourcePosition += overdue;
    position = 0;
  } else if (position > available) {
    size = 0;
  } else if (position + size > available) {
    size = available - position;
  }
  return [position, size, sourcePosition];
};

module.exports = CanvasViewport;



},{}],3:[function(require,module,exports){
var Image;

Image = (function() {
  function Image(node, x, y) {
    this.node = node;
    this.x = x;
    this.y = y;
  }

  Image.prototype.draw = function(viewport) {
    return viewport.drawImage(this.node, this.x, this.y);
  };

  return Image;

})();

module.exports = Image;



},{}],4:[function(require,module,exports){
var CanvasViewport, Image, centered, dragHandler, getImages;

CanvasViewport = require('./CanvasViewport');

dragHandler = require('./dragHandler');

Image = require('./Image');

module.exports = function(node) {
  var images, viewport;
  if (!node || node.tagName.toLowerCase() !== 'canvas') {
    throw new Error('CanvasSlider expects a canvas node');
  }
  images = getImages(node);
  viewport = new CanvasViewport(node, images);
  viewport.render(0);
  return dragHandler(node, node.ownerDocument).on('movement', function(movement) {
    return viewport.render(viewport.position - movement);
  }).on('dragStart', function() {
    return node.classList.add('dragging');
  }).on('dragStop', function() {
    return node.classList.remove('dragging');
  });
};

getImages = function(node) {
  return Array.prototype.map.call(node.children, function(image, index) {
    var x, y;
    if (image.tagName.toLowerCase() !== 'img') {
      throw new Error('Canvas slider expects the canvas to contain IMG nodes.');
    }
    x = (index * node.width) + centered(image.width, node.width);
    y = centered(image.height, node.height);
    return new Image(image, x, y);
  });
};

centered = function(size, available) {
  var short;
  short = available - size;
  if (short <= 0) {
    return 0;
  } else {
    return Math.floor(short / 2);
  }
};



},{"./CanvasViewport":2,"./Image":3,"./dragHandler":5}],5:[function(require,module,exports){
var EventEmitter, dragHandler;

EventEmitter = require('events').EventEmitter;

dragHandler = function(node, parentNode) {
  var events, position, reportMovement;
  events = new EventEmitter();
  position = 0;
  node.addEventListener('mousedown', function(e) {
    parentNode.addEventListener('mousemove', reportMovement);
    position = e.clientX;
    events.emit('dragStart');
  });
  parentNode.addEventListener('mouseup', function() {
    parentNode.removeEventListener('mousemove', reportMovement);
    events.emit('dragStop');
  });
  reportMovement = function(e) {
    var movement;
    movement = e.clientX - position;
    position = e.clientX;
    events.emit('movement', movement);
  };
  return events;
};

module.exports = dragHandler;



},{"events":1}],6:[function(require,module,exports){
var canvasSlider;

canvasSlider = require('./canvasSlider');

window.onload = function() {
  var nodes;
  nodes = document.getElementsByClassName('slider');
  return Array.prototype.forEach.call(nodes, canvasSlider);
};



},{"./canvasSlider":4}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9ob21lL2NocmlzdGlhYW4vdG1wL2NhbnZhcy1zbGlkZXIvc3JjL0NhbnZhc1ZpZXdwb3J0LmNvZmZlZSIsIi9ob21lL2NocmlzdGlhYW4vdG1wL2NhbnZhcy1zbGlkZXIvc3JjL0ltYWdlLmNvZmZlZSIsIi9ob21lL2NocmlzdGlhYW4vdG1wL2NhbnZhcy1zbGlkZXIvc3JjL2NhbnZhc1NsaWRlci5jb2ZmZWUiLCIvaG9tZS9jaHJpc3RpYWFuL3RtcC9jYW52YXMtc2xpZGVyL3NyYy9kcmFnSGFuZGxlci5jb2ZmZWUiLCIvaG9tZS9jaHJpc3RpYWFuL3RtcC9jYW52YXMtc2xpZGVyL3NyYy9pbmRleC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQSxJQUFBLCtCQUFBOztBQUFBO0FBQ2UsRUFBQSx3QkFBQyxJQUFELEVBQVEsTUFBUixHQUFBO0FBQ1gsSUFEWSxJQUFDLENBQUEsT0FBRCxJQUNaLENBQUE7QUFBQSxJQURtQixJQUFDLENBQUEsU0FBRCxNQUNuQixDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsT0FBRCxHQUFXLElBQUMsQ0FBQSxJQUFJLENBQUMsVUFBTixDQUFpQixJQUFqQixDQUFYLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxZQUFELENBQWMsQ0FBZCxDQURBLENBRFc7RUFBQSxDQUFiOztBQUFBLDJCQUlBLE1BQUEsR0FBUSxTQUFDLENBQUQsR0FBQTtBQUNOLElBQUEsSUFBQyxDQUFBLFlBQUQsQ0FBYyxDQUFkLENBQUEsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxTQUFULENBQW1CLENBQW5CLEVBQXNCLENBQXRCLEVBQXlCLElBQUMsQ0FBQSxJQUFJLENBQUMsS0FBL0IsRUFBc0MsSUFBQyxDQUFBLElBQUksQ0FBQyxNQUE1QyxDQURBLENBQUE7V0FFQSxJQUFDLENBQUEsTUFBTSxDQUFDLE9BQVIsQ0FBZ0IsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUMsS0FBRCxHQUFBO2VBQVUsS0FBSyxDQUFDLElBQU4sQ0FBVyxLQUFYLEVBQVY7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFoQixFQUhNO0VBQUEsQ0FKUixDQUFBOztBQUFBLDJCQVNBLFNBQUEsR0FBVyxTQUFDLEtBQUQsRUFBUSxDQUFSLEVBQVcsQ0FBWCxHQUFBO0FBQ1QsUUFBQSxnQ0FBQTtBQUFBLElBQUEsQ0FBQSxJQUFLLElBQUMsQ0FBQSxRQUFOLENBQUE7QUFBQSxJQUNBLE1BQWlCLGVBQUEsQ0FBZ0IsQ0FBaEIsRUFBbUIsS0FBSyxDQUFDLEtBQXpCLEVBQWdDLElBQUMsQ0FBQSxJQUFJLENBQUMsS0FBdEMsQ0FBakIsRUFBQyxVQUFELEVBQUksY0FBSixFQUFXLFdBRFgsQ0FBQTtBQUFBLElBRUEsT0FBa0IsZUFBQSxDQUFnQixDQUFoQixFQUFtQixLQUFLLENBQUMsTUFBekIsRUFBaUMsSUFBQyxDQUFBLElBQUksQ0FBQyxNQUF2QyxDQUFsQixFQUFDLFdBQUQsRUFBSSxnQkFBSixFQUFZLFlBRlosQ0FBQTtBQUdBLElBQUEsSUFBVSxLQUFBLEtBQVMsQ0FBVCxJQUFjLE1BQUEsS0FBVSxDQUFsQztBQUFBLFlBQUEsQ0FBQTtLQUhBO0FBQUEsSUFNQSxJQUFDLENBQUEsT0FBTyxDQUFDLFNBQVQsQ0FBbUIsS0FBbkIsRUFBMEIsRUFBMUIsRUFBOEIsRUFBOUIsRUFBa0MsS0FBbEMsRUFBeUMsTUFBekMsRUFBaUQsQ0FBakQsRUFBb0QsQ0FBcEQsRUFBdUQsS0FBdkQsRUFBOEQsTUFBOUQsQ0FOQSxDQURTO0VBQUEsQ0FUWCxDQUFBOztBQUFBLDJCQW1CQSxZQUFBLEdBQWMsU0FBQyxRQUFELEdBQUE7QUFDWixJQUFBLFFBQUEsR0FBVyxJQUFJLENBQUMsR0FBTCxDQUFTLFFBQVQsRUFBbUIsSUFBQyxDQUFBLElBQUksQ0FBQyxLQUFOLEdBQWMsQ0FBQyxJQUFDLENBQUEsTUFBTSxDQUFDLE1BQVIsR0FBaUIsQ0FBbEIsQ0FBakMsQ0FBWCxDQUFBO0FBQUEsSUFDQSxRQUFBLEdBQVcsSUFBSSxDQUFDLEdBQUwsQ0FBUyxDQUFULEVBQVksUUFBWixDQURYLENBQUE7V0FFQSxJQUFDLENBQUEsUUFBRCxHQUFZLFNBSEE7RUFBQSxDQW5CZCxDQUFBOzt3QkFBQTs7SUFERixDQUFBOztBQUFBLGVBeUJBLEdBQWtCLFNBQUMsUUFBRCxFQUFXLElBQVgsRUFBaUIsU0FBakIsR0FBQTtBQUNoQixNQUFBLHVCQUFBO0FBQUEsRUFBQSxjQUFBLEdBQWlCLENBQWpCLENBQUE7QUFDQSxFQUFBLElBQUcsUUFBQSxHQUFXLElBQVgsR0FBa0IsQ0FBckI7QUFDRSxJQUFBLElBQUEsR0FBTyxDQUFQLENBREY7R0FBQSxNQUVLLElBQUcsUUFBQSxHQUFXLENBQWQ7QUFDSCxJQUFBLE9BQUEsR0FBVSxDQUFBLEdBQUksUUFBZCxDQUFBO0FBQUEsSUFDQSxJQUFBLElBQVEsT0FEUixDQUFBO0FBQUEsSUFFQSxjQUFBLElBQWtCLE9BRmxCLENBQUE7QUFBQSxJQUdBLFFBQUEsR0FBVyxDQUhYLENBREc7R0FBQSxNQUtBLElBQUcsUUFBQSxHQUFXLFNBQWQ7QUFDSCxJQUFBLElBQUEsR0FBTyxDQUFQLENBREc7R0FBQSxNQUVBLElBQUcsUUFBQSxHQUFXLElBQVgsR0FBa0IsU0FBckI7QUFDSCxJQUFBLElBQUEsR0FBTyxTQUFBLEdBQVksUUFBbkIsQ0FERztHQVZMO1NBYUEsQ0FBQyxRQUFELEVBQVcsSUFBWCxFQUFpQixjQUFqQixFQWRnQjtBQUFBLENBekJsQixDQUFBOztBQUFBLE1BMENNLENBQUMsT0FBUCxHQUFpQixjQTFDakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLEtBQUE7O0FBQUE7QUFDZSxFQUFBLGVBQUMsSUFBRCxFQUFRLENBQVIsRUFBWSxDQUFaLEdBQUE7QUFBZ0IsSUFBZixJQUFDLENBQUEsT0FBRCxJQUFlLENBQUE7QUFBQSxJQUFSLElBQUMsQ0FBQSxJQUFELENBQVEsQ0FBQTtBQUFBLElBQUosSUFBQyxDQUFBLElBQUQsQ0FBSSxDQUFoQjtFQUFBLENBQWI7O0FBQUEsa0JBRUEsSUFBQSxHQUFNLFNBQUMsUUFBRCxHQUFBO1dBQ0osUUFBUSxDQUFDLFNBQVQsQ0FBbUIsSUFBQyxDQUFBLElBQXBCLEVBQTBCLElBQUMsQ0FBQSxDQUEzQixFQUE4QixJQUFDLENBQUEsQ0FBL0IsRUFESTtFQUFBLENBRk4sQ0FBQTs7ZUFBQTs7SUFERixDQUFBOztBQUFBLE1BTU0sQ0FBQyxPQUFQLEdBQWlCLEtBTmpCLENBQUE7Ozs7O0FDQUEsSUFBQSx1REFBQTs7QUFBQSxjQUFBLEdBQWlCLE9BQUEsQ0FBUSxrQkFBUixDQUFqQixDQUFBOztBQUFBLFdBQ0EsR0FBYyxPQUFBLENBQVEsZUFBUixDQURkLENBQUE7O0FBQUEsS0FFQSxHQUFRLE9BQUEsQ0FBUSxTQUFSLENBRlIsQ0FBQTs7QUFBQSxNQUlNLENBQUMsT0FBUCxHQUFpQixTQUFDLElBQUQsR0FBQTtBQUNmLE1BQUEsZ0JBQUE7QUFBQSxFQUFBLElBQUcsQ0FBQSxJQUFBLElBQVMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFiLENBQUEsQ0FBQSxLQUE4QixRQUExQztBQUNFLFVBQVUsSUFBQSxLQUFBLENBQU0sb0NBQU4sQ0FBVixDQURGO0dBQUE7QUFBQSxFQUdBLE1BQUEsR0FBUyxTQUFBLENBQVUsSUFBVixDQUhULENBQUE7QUFBQSxFQUtBLFFBQUEsR0FBZSxJQUFBLGNBQUEsQ0FBZSxJQUFmLEVBQXFCLE1BQXJCLENBTGYsQ0FBQTtBQUFBLEVBT0EsUUFBUSxDQUFDLE1BQVQsQ0FBZ0IsQ0FBaEIsQ0FQQSxDQUFBO1NBU0EsV0FBQSxDQUFZLElBQVosRUFBa0IsSUFBSSxDQUFDLGFBQXZCLENBQ0UsQ0FBQyxFQURILENBQ00sVUFETixFQUNrQixTQUFDLFFBQUQsR0FBQTtXQUFhLFFBQVEsQ0FBQyxNQUFULENBQWdCLFFBQVEsQ0FBQyxRQUFULEdBQW9CLFFBQXBDLEVBQWI7RUFBQSxDQURsQixDQUVFLENBQUMsRUFGSCxDQUVNLFdBRk4sRUFFbUIsU0FBQSxHQUFBO1dBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFmLENBQW1CLFVBQW5CLEVBQUg7RUFBQSxDQUZuQixDQUdFLENBQUMsRUFISCxDQUdNLFVBSE4sRUFHa0IsU0FBQSxHQUFBO1dBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFmLENBQXNCLFVBQXRCLEVBQUg7RUFBQSxDQUhsQixFQVZlO0FBQUEsQ0FKakIsQ0FBQTs7QUFBQSxTQW1CQSxHQUFZLFNBQUMsSUFBRCxHQUFBO1NBQ1YsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBcEIsQ0FBeUIsSUFBSSxDQUFDLFFBQTlCLEVBQXdDLFNBQUMsS0FBRCxFQUFRLEtBQVIsR0FBQTtBQUN0QyxRQUFBLElBQUE7QUFBQSxJQUFBLElBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFkLENBQUEsQ0FBQSxLQUErQixLQUFsQztBQUNFLFlBQVUsSUFBQSxLQUFBLENBQU0sd0RBQU4sQ0FBVixDQURGO0tBQUE7QUFBQSxJQUdBLENBQUEsR0FBSSxDQUFDLEtBQUEsR0FBUSxJQUFJLENBQUMsS0FBZCxDQUFBLEdBQXVCLFFBQUEsQ0FBUyxLQUFLLENBQUMsS0FBZixFQUFzQixJQUFJLENBQUMsS0FBM0IsQ0FIM0IsQ0FBQTtBQUFBLElBSUEsQ0FBQSxHQUFJLFFBQUEsQ0FBUyxLQUFLLENBQUMsTUFBZixFQUF1QixJQUFJLENBQUMsTUFBNUIsQ0FKSixDQUFBO1dBS0ksSUFBQSxLQUFBLENBQU0sS0FBTixFQUFhLENBQWIsRUFBZ0IsQ0FBaEIsRUFOa0M7RUFBQSxDQUF4QyxFQURVO0FBQUEsQ0FuQlosQ0FBQTs7QUFBQSxRQTRCQSxHQUFXLFNBQUMsSUFBRCxFQUFPLFNBQVAsR0FBQTtBQUNULE1BQUEsS0FBQTtBQUFBLEVBQUEsS0FBQSxHQUFRLFNBQUEsR0FBWSxJQUFwQixDQUFBO0FBQ0EsRUFBQSxJQUFHLEtBQUEsSUFBUyxDQUFaO1dBQW1CLEVBQW5CO0dBQUEsTUFBQTtXQUEwQixJQUFJLENBQUMsS0FBTCxDQUFXLEtBQUEsR0FBUSxDQUFuQixFQUExQjtHQUZTO0FBQUEsQ0E1QlgsQ0FBQTs7Ozs7QUNBQSxJQUFBLHlCQUFBOztBQUFBLFlBQUEsR0FBZSxPQUFBLENBQVEsUUFBUixDQUFpQixDQUFDLFlBQWpDLENBQUE7O0FBQUEsV0FFQSxHQUFjLFNBQUMsSUFBRCxFQUFPLFVBQVAsR0FBQTtBQUNaLE1BQUEsZ0NBQUE7QUFBQSxFQUFBLE1BQUEsR0FBYSxJQUFBLFlBQUEsQ0FBQSxDQUFiLENBQUE7QUFBQSxFQUNBLFFBQUEsR0FBVyxDQURYLENBQUE7QUFBQSxFQUVBLElBQUksQ0FBQyxnQkFBTCxDQUFzQixXQUF0QixFQUFtQyxTQUFDLENBQUQsR0FBQTtBQUNqQyxJQUFBLFVBQVUsQ0FBQyxnQkFBWCxDQUE0QixXQUE1QixFQUF5QyxjQUF6QyxDQUFBLENBQUE7QUFBQSxJQUNBLFFBQUEsR0FBVyxDQUFDLENBQUMsT0FEYixDQUFBO0FBQUEsSUFFQSxNQUFNLENBQUMsSUFBUCxDQUFZLFdBQVosQ0FGQSxDQURpQztFQUFBLENBQW5DLENBRkEsQ0FBQTtBQUFBLEVBUUEsVUFBVSxDQUFDLGdCQUFYLENBQTRCLFNBQTVCLEVBQXVDLFNBQUEsR0FBQTtBQUNyQyxJQUFBLFVBQVUsQ0FBQyxtQkFBWCxDQUErQixXQUEvQixFQUE0QyxjQUE1QyxDQUFBLENBQUE7QUFBQSxJQUNBLE1BQU0sQ0FBQyxJQUFQLENBQVksVUFBWixDQURBLENBRHFDO0VBQUEsQ0FBdkMsQ0FSQSxDQUFBO0FBQUEsRUFhQSxjQUFBLEdBQWlCLFNBQUMsQ0FBRCxHQUFBO0FBQ2YsUUFBQSxRQUFBO0FBQUEsSUFBQSxRQUFBLEdBQVcsQ0FBQyxDQUFDLE9BQUYsR0FBWSxRQUF2QixDQUFBO0FBQUEsSUFDQSxRQUFBLEdBQVcsQ0FBQyxDQUFDLE9BRGIsQ0FBQTtBQUFBLElBRUEsTUFBTSxDQUFDLElBQVAsQ0FBWSxVQUFaLEVBQXdCLFFBQXhCLENBRkEsQ0FEZTtFQUFBLENBYmpCLENBQUE7QUFtQkEsU0FBTyxNQUFQLENBcEJZO0FBQUEsQ0FGZCxDQUFBOztBQUFBLE1Bd0JNLENBQUMsT0FBUCxHQUFpQixXQXhCakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLFlBQUE7O0FBQUEsWUFBQSxHQUFlLE9BQUEsQ0FBUSxnQkFBUixDQUFmLENBQUE7O0FBQUEsTUFFTSxDQUFDLE1BQVAsR0FBZ0IsU0FBQSxHQUFBO0FBQ2QsTUFBQSxLQUFBO0FBQUEsRUFBQSxLQUFBLEdBQVEsUUFBUSxDQUFDLHNCQUFULENBQWdDLFFBQWhDLENBQVIsQ0FBQTtTQUNBLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQXhCLENBQTZCLEtBQTdCLEVBQW9DLFlBQXBDLEVBRmM7QUFBQSxDQUZoQixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsImNsYXNzIENhbnZhc1ZpZXdwb3J0XG4gIGNvbnN0cnVjdG9yOiAoQG5vZGUsIEBpbWFnZXMpLT5cbiAgICBAY29udGV4dCA9IEBub2RlLmdldENvbnRleHQgJzJkJ1xuICAgIEBfc2V0UG9zaXRpb24gMFxuXG4gIHJlbmRlcjogKHgpLT5cbiAgICBAX3NldFBvc2l0aW9uIHhcbiAgICBAY29udGV4dC5jbGVhclJlY3QgMCwgMCwgQG5vZGUud2lkdGgsIEBub2RlLmhlaWdodFxuICAgIEBpbWFnZXMuZm9yRWFjaCAoaW1hZ2UpPT4gaW1hZ2UuZHJhdyh0aGlzKVxuXG4gIGRyYXdJbWFnZTogKGltYWdlLCB4LCB5KS0+XG4gICAgeCAtPSBAcG9zaXRpb25cbiAgICBbeCwgd2lkdGgsIHN4XSA9IGF4aXNGaXRPbkNhbnZhcyh4LCBpbWFnZS53aWR0aCwgQG5vZGUud2lkdGgpXG4gICAgW3ksIGhlaWdodCwgc3ldID0gYXhpc0ZpdE9uQ2FudmFzKHksIGltYWdlLmhlaWdodCwgQG5vZGUuaGVpZ2h0KVxuICAgIHJldHVybiBpZiB3aWR0aCA9PSAwIG9yIGhlaWdodCA9PSAwXG5cbiAgICAjIGRyYXdJbWFnZShpbWFnZSwgc3gsIHN5LCBzV2lkdGgsIHNIZWlnaHQsIGR4LCBkeSwgZFdpZHRoLCBkSGVpZ2h0KVxuICAgIEBjb250ZXh0LmRyYXdJbWFnZShpbWFnZSwgc3gsIHN5LCB3aWR0aCwgaGVpZ2h0LCB4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICByZXR1cm5cblxuICBfc2V0UG9zaXRpb246IChwb3NpdGlvbiktPlxuICAgIHBvc2l0aW9uID0gTWF0aC5taW4gcG9zaXRpb24sIEBub2RlLndpZHRoICogKEBpbWFnZXMubGVuZ3RoIC0gMSlcbiAgICBwb3NpdGlvbiA9IE1hdGgubWF4IDAsIHBvc2l0aW9uXG4gICAgQHBvc2l0aW9uID0gcG9zaXRpb25cblxuYXhpc0ZpdE9uQ2FudmFzID0gKHBvc2l0aW9uLCBzaXplLCBhdmFpbGFibGUpLT5cbiAgc291cmNlUG9zaXRpb24gPSAwXG4gIGlmIHBvc2l0aW9uICsgc2l6ZSA8IDBcbiAgICBzaXplID0gMFxuICBlbHNlIGlmIHBvc2l0aW9uIDwgMFxuICAgIG92ZXJkdWUgPSAwIC0gcG9zaXRpb25cbiAgICBzaXplIC09IG92ZXJkdWVcbiAgICBzb3VyY2VQb3NpdGlvbiArPSBvdmVyZHVlXG4gICAgcG9zaXRpb24gPSAwXG4gIGVsc2UgaWYgcG9zaXRpb24gPiBhdmFpbGFibGVcbiAgICBzaXplID0gMFxuICBlbHNlIGlmIHBvc2l0aW9uICsgc2l6ZSA+IGF2YWlsYWJsZVxuICAgIHNpemUgPSBhdmFpbGFibGUgLSBwb3NpdGlvblxuXG4gIFtwb3NpdGlvbiwgc2l6ZSwgc291cmNlUG9zaXRpb25dXG5cblxubW9kdWxlLmV4cG9ydHMgPSBDYW52YXNWaWV3cG9ydFxuIiwiY2xhc3MgSW1hZ2VcbiAgY29uc3RydWN0b3I6IChAbm9kZSwgQHgsIEB5KS0+XG5cbiAgZHJhdzogKHZpZXdwb3J0KS0+XG4gICAgdmlld3BvcnQuZHJhd0ltYWdlKEBub2RlLCBAeCwgQHkpXG5cbm1vZHVsZS5leHBvcnRzID0gSW1hZ2VcbiIsIkNhbnZhc1ZpZXdwb3J0ID0gcmVxdWlyZSAnLi9DYW52YXNWaWV3cG9ydCdcbmRyYWdIYW5kbGVyID0gcmVxdWlyZSAnLi9kcmFnSGFuZGxlcidcbkltYWdlID0gcmVxdWlyZSAnLi9JbWFnZSdcblxubW9kdWxlLmV4cG9ydHMgPSAobm9kZSktPlxuICBpZiAhbm9kZSBvciBub2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSAhPSAnY2FudmFzJ1xuICAgIHRocm93IG5ldyBFcnJvciAnQ2FudmFzU2xpZGVyIGV4cGVjdHMgYSBjYW52YXMgbm9kZSdcblxuICBpbWFnZXMgPSBnZXRJbWFnZXMgbm9kZVxuXG4gIHZpZXdwb3J0ID0gbmV3IENhbnZhc1ZpZXdwb3J0KG5vZGUsIGltYWdlcylcblxuICB2aWV3cG9ydC5yZW5kZXIgMFxuXG4gIGRyYWdIYW5kbGVyKG5vZGUsIG5vZGUub3duZXJEb2N1bWVudClcbiAgICAub24oJ21vdmVtZW50JywgKG1vdmVtZW50KS0+IHZpZXdwb3J0LnJlbmRlciB2aWV3cG9ydC5wb3NpdGlvbiAtIG1vdmVtZW50KVxuICAgIC5vbignZHJhZ1N0YXJ0JywgLT4gbm9kZS5jbGFzc0xpc3QuYWRkICdkcmFnZ2luZycpXG4gICAgLm9uKCdkcmFnU3RvcCcsIC0+IG5vZGUuY2xhc3NMaXN0LnJlbW92ZSAnZHJhZ2dpbmcnKVxuXG5nZXRJbWFnZXMgPSAobm9kZSktPlxuICBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwgbm9kZS5jaGlsZHJlbiwgKGltYWdlLCBpbmRleCktPlxuICAgIGlmIGltYWdlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSAhPSAnaW1nJ1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdDYW52YXMgc2xpZGVyIGV4cGVjdHMgdGhlIGNhbnZhcyB0byBjb250YWluIElNRyBub2Rlcy4nXG5cbiAgICB4ID0gKGluZGV4ICogbm9kZS53aWR0aCkgKyBjZW50ZXJlZChpbWFnZS53aWR0aCwgbm9kZS53aWR0aClcbiAgICB5ID0gY2VudGVyZWQoaW1hZ2UuaGVpZ2h0LCBub2RlLmhlaWdodClcbiAgICBuZXcgSW1hZ2UoaW1hZ2UsIHgsIHkpXG5cbmNlbnRlcmVkID0gKHNpemUsIGF2YWlsYWJsZSktPlxuICBzaG9ydCA9IGF2YWlsYWJsZSAtIHNpemVcbiAgaWYgc2hvcnQgPD0gMCB0aGVuIDAgZWxzZSBNYXRoLmZsb29yKHNob3J0IC8gMilcbiIsIkV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlclxuXG5kcmFnSGFuZGxlciA9IChub2RlLCBwYXJlbnROb2RlKS0+XG4gIGV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXIoKVxuICBwb3NpdGlvbiA9IDBcbiAgbm9kZS5hZGRFdmVudExpc3RlbmVyICdtb3VzZWRvd24nLCAoZSktPlxuICAgIHBhcmVudE5vZGUuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgcmVwb3J0TW92ZW1lbnRcbiAgICBwb3NpdGlvbiA9IGUuY2xpZW50WFxuICAgIGV2ZW50cy5lbWl0ICdkcmFnU3RhcnQnXG4gICAgcmV0dXJuXG5cbiAgcGFyZW50Tm9kZS5hZGRFdmVudExpc3RlbmVyICdtb3VzZXVwJywgLT5cbiAgICBwYXJlbnROb2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIgJ21vdXNlbW92ZScsIHJlcG9ydE1vdmVtZW50XG4gICAgZXZlbnRzLmVtaXQgJ2RyYWdTdG9wJ1xuICAgIHJldHVyblxuXG4gIHJlcG9ydE1vdmVtZW50ID0gKGUpLT5cbiAgICBtb3ZlbWVudCA9IGUuY2xpZW50WCAtIHBvc2l0aW9uXG4gICAgcG9zaXRpb24gPSBlLmNsaWVudFhcbiAgICBldmVudHMuZW1pdCAnbW92ZW1lbnQnLCBtb3ZlbWVudFxuICAgIHJldHVyblxuXG4gIHJldHVybiBldmVudHNcblxubW9kdWxlLmV4cG9ydHMgPSBkcmFnSGFuZGxlclxuIiwiY2FudmFzU2xpZGVyID0gcmVxdWlyZSAnLi9jYW52YXNTbGlkZXInXG5cbndpbmRvdy5vbmxvYWQgPSAtPlxuICBub2RlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3NsaWRlcicpXG4gIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwgbm9kZXMsIGNhbnZhc1NsaWRlclxuXG4iXX0=
