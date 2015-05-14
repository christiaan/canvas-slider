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
var HtmlViewport;

HtmlViewport = (function() {
  function HtmlViewport(node, images) {
    this.node = node;
    this.images = images;
    this._setPosition(0);
  }

  HtmlViewport.prototype.render = function(x) {
    this._setPosition(x);
    return this.images.forEach((function(_this) {
      return function(image) {
        return image.draw(_this);
      };
    })(this));
  };

  HtmlViewport.prototype.drawImage = function(image, x, y) {
    x -= this.position;
    image.style.left = x + 'px';
    return image.style.top = y + 'px';
  };

  HtmlViewport.prototype._setPosition = function(position) {
    position = Math.min(position, this.node.clientWidth * (this.images.length - 1));
    position = Math.max(0, position);
    return this.position = position;
  };

  return HtmlViewport;

})();

module.exports = HtmlViewport;



},{}],4:[function(require,module,exports){
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



},{}],5:[function(require,module,exports){
var Image, centered, dragHandler, getImages, viewportFactory;

viewportFactory = require('./viewportFactory');

dragHandler = require('./dragHandler');

Image = require('./Image');

module.exports = function(node) {
  var viewport;
  viewport = viewportFactory(node, getImages(node));
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
    x = (index * node.clientWidth) + centered(image.width, node.clientWidth);
    y = centered(image.height, node.clientHeight);
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



},{"./Image":4,"./dragHandler":6,"./viewportFactory":7}],6:[function(require,module,exports){
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



},{"events":1}],7:[function(require,module,exports){
var CanvasViewport, HtmlViewport;

CanvasViewport = require('./CanvasViewport');

HtmlViewport = require('./HtmlViewport');

module.exports = function(node, images) {
  if (node && node.tagName.toLowerCase() === 'canvas') {
    return new CanvasViewport(node, images);
  } else if (node && node.tagName.toLowerCase() === 'div') {
    return new HtmlViewport(node, images);
  } else {
    throw new Error('CanvasSlider expects a canvas node');
  }
};



},{"./CanvasViewport":2,"./HtmlViewport":3}],8:[function(require,module,exports){
var canvasSlider;

canvasSlider = require('./canvasSlider');

window.onload = function() {
  var nodes;
  nodes = document.getElementsByClassName('slider');
  return Array.prototype.forEach.call(nodes, canvasSlider);
};



},{"./canvasSlider":5}]},{},[8])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9ob21lL2NocmlzdGlhYW4vdG1wL2NhbnZhcy1zbGlkZXIvc3JjL0NhbnZhc1ZpZXdwb3J0LmNvZmZlZSIsIi9ob21lL2NocmlzdGlhYW4vdG1wL2NhbnZhcy1zbGlkZXIvc3JjL0h0bWxWaWV3cG9ydC5jb2ZmZWUiLCIvaG9tZS9jaHJpc3RpYWFuL3RtcC9jYW52YXMtc2xpZGVyL3NyYy9JbWFnZS5jb2ZmZWUiLCIvaG9tZS9jaHJpc3RpYWFuL3RtcC9jYW52YXMtc2xpZGVyL3NyYy9jYW52YXNTbGlkZXIuY29mZmVlIiwiL2hvbWUvY2hyaXN0aWFhbi90bXAvY2FudmFzLXNsaWRlci9zcmMvZHJhZ0hhbmRsZXIuY29mZmVlIiwiL2hvbWUvY2hyaXN0aWFhbi90bXAvY2FudmFzLXNsaWRlci9zcmMvdmlld3BvcnRGYWN0b3J5LmNvZmZlZSIsIi9ob21lL2NocmlzdGlhYW4vdG1wL2NhbnZhcy1zbGlkZXIvc3JjL2luZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QURmLENBQUE7O0FBQUEsTUFHTSxDQUFDLE9BQVAsR0FBaUIsU0FBQyxJQUFELEVBQU8sTUFBUCxHQUFBO0FBQ2YsRUFBQSxJQUFHLElBQUEsSUFBUyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQWIsQ0FBQSxDQUFBLEtBQThCLFFBQTFDO0FBQ0UsV0FBVyxJQUFBLGNBQUEsQ0FBZSxJQUFmLEVBQXFCLE1BQXJCLENBQVgsQ0FERjtHQUFBLE1BRUssSUFBRyxJQUFBLElBQVMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFiLENBQUEsQ0FBQSxLQUE4QixLQUExQztBQUNILFdBQVcsSUFBQSxZQUFBLENBQWEsSUFBYixFQUFtQixNQUFuQixDQUFYLENBREc7R0FBQSxNQUFBO0FBR0gsVUFBVSxJQUFBLEtBQUEsQ0FBTSxvQ0FBTixDQUFWLENBSEc7R0FIVTtBQUFBLENBSGpCLENBQUE7Ozs7O0FDQUEsSUFBQSxZQUFBOztBQUFBLFlBQUEsR0FBZSxPQUFBLENBQVEsZ0JBQVIsQ0FBZixDQUFBOztBQUFBLE1BRU0sQ0FBQyxNQUFQLEdBQWdCLFNBQUEsR0FBQTtBQUNkLE1BQUEsS0FBQTtBQUFBLEVBQUEsS0FBQSxHQUFRLFFBQVEsQ0FBQyxzQkFBVCxDQUFnQyxRQUFoQyxDQUFSLENBQUE7U0FDQSxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUF4QixDQUE2QixLQUE3QixFQUFvQyxZQUFwQyxFQUZjO0FBQUEsQ0FGaEIsQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJjbGFzcyBDYW52YXNWaWV3cG9ydFxuICBjb25zdHJ1Y3RvcjogKEBub2RlLCBAaW1hZ2VzKS0+XG4gICAgQGNvbnRleHQgPSBAbm9kZS5nZXRDb250ZXh0ICcyZCdcbiAgICBAX3NldFBvc2l0aW9uIDBcblxuICByZW5kZXI6ICh4KS0+XG4gICAgQF9zZXRQb3NpdGlvbiB4XG4gICAgQGNvbnRleHQuY2xlYXJSZWN0IDAsIDAsIEBub2RlLndpZHRoLCBAbm9kZS5oZWlnaHRcbiAgICBAaW1hZ2VzLmZvckVhY2ggKGltYWdlKT0+IGltYWdlLmRyYXcodGhpcylcblxuICBkcmF3SW1hZ2U6IChpbWFnZSwgeCwgeSktPlxuICAgIHggLT0gQHBvc2l0aW9uXG4gICAgW3gsIHdpZHRoLCBzeF0gPSBheGlzRml0T25DYW52YXMoeCwgaW1hZ2Uud2lkdGgsIEBub2RlLndpZHRoKVxuICAgIFt5LCBoZWlnaHQsIHN5XSA9IGF4aXNGaXRPbkNhbnZhcyh5LCBpbWFnZS5oZWlnaHQsIEBub2RlLmhlaWdodClcbiAgICByZXR1cm4gaWYgd2lkdGggPT0gMCBvciBoZWlnaHQgPT0gMFxuXG4gICAgIyBkcmF3SW1hZ2UoaW1hZ2UsIHN4LCBzeSwgc1dpZHRoLCBzSGVpZ2h0LCBkeCwgZHksIGRXaWR0aCwgZEhlaWdodClcbiAgICBAY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIHN4LCBzeSwgd2lkdGgsIGhlaWdodCwgeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgcmV0dXJuXG5cbiAgX3NldFBvc2l0aW9uOiAocG9zaXRpb24pLT5cbiAgICBwb3NpdGlvbiA9IE1hdGgubWluIHBvc2l0aW9uLCBAbm9kZS53aWR0aCAqIChAaW1hZ2VzLmxlbmd0aCAtIDEpXG4gICAgcG9zaXRpb24gPSBNYXRoLm1heCAwLCBwb3NpdGlvblxuICAgIEBwb3NpdGlvbiA9IHBvc2l0aW9uXG5cbmF4aXNGaXRPbkNhbnZhcyA9IChwb3NpdGlvbiwgc2l6ZSwgYXZhaWxhYmxlKS0+XG4gIHNvdXJjZVBvc2l0aW9uID0gMFxuICBpZiBwb3NpdGlvbiArIHNpemUgPCAwXG4gICAgc2l6ZSA9IDBcbiAgZWxzZSBpZiBwb3NpdGlvbiA8IDBcbiAgICBvdmVyZHVlID0gMCAtIHBvc2l0aW9uXG4gICAgc2l6ZSAtPSBvdmVyZHVlXG4gICAgc291cmNlUG9zaXRpb24gKz0gb3ZlcmR1ZVxuICAgIHBvc2l0aW9uID0gMFxuICBlbHNlIGlmIHBvc2l0aW9uID4gYXZhaWxhYmxlXG4gICAgc2l6ZSA9IDBcbiAgZWxzZSBpZiBwb3NpdGlvbiArIHNpemUgPiBhdmFpbGFibGVcbiAgICBzaXplID0gYXZhaWxhYmxlIC0gcG9zaXRpb25cblxuICBbcG9zaXRpb24sIHNpemUsIHNvdXJjZVBvc2l0aW9uXVxuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2FudmFzVmlld3BvcnRcbiIsImNsYXNzIEh0bWxWaWV3cG9ydFxuICBjb25zdHJ1Y3RvcjogKEBub2RlLCBAaW1hZ2VzKS0+XG4gICAgQF9zZXRQb3NpdGlvbiAwXG5cbiAgcmVuZGVyOiAoeCktPlxuICAgIEBfc2V0UG9zaXRpb24geFxuICAgIEBpbWFnZXMuZm9yRWFjaCAoaW1hZ2UpPT4gaW1hZ2UuZHJhdyh0aGlzKVxuXG4gIGRyYXdJbWFnZTogKGltYWdlLCB4LCB5KS0+XG4gICAgeCAtPSBAcG9zaXRpb25cbiAgICBpbWFnZS5zdHlsZS5sZWZ0ID0geCArICdweCdcbiAgICBpbWFnZS5zdHlsZS50b3AgPSB5ICsgJ3B4J1xuXG4gIF9zZXRQb3NpdGlvbjogKHBvc2l0aW9uKS0+XG4gICAgcG9zaXRpb24gPSBNYXRoLm1pbiBwb3NpdGlvbiwgQG5vZGUuY2xpZW50V2lkdGggKiAoQGltYWdlcy5sZW5ndGggLSAxKVxuICAgIHBvc2l0aW9uID0gTWF0aC5tYXggMCwgcG9zaXRpb25cbiAgICBAcG9zaXRpb24gPSBwb3NpdGlvblxuXG5cbm1vZHVsZS5leHBvcnRzID0gSHRtbFZpZXdwb3J0XG4iLCJjbGFzcyBJbWFnZVxuICBjb25zdHJ1Y3RvcjogKEBub2RlLCBAeCwgQHkpLT5cblxuICBkcmF3OiAodmlld3BvcnQpLT5cbiAgICB2aWV3cG9ydC5kcmF3SW1hZ2UoQG5vZGUsIEB4LCBAeSlcblxubW9kdWxlLmV4cG9ydHMgPSBJbWFnZVxuIiwidmlld3BvcnRGYWN0b3J5ID0gcmVxdWlyZSAnLi92aWV3cG9ydEZhY3RvcnknXG5kcmFnSGFuZGxlciA9IHJlcXVpcmUgJy4vZHJhZ0hhbmRsZXInXG5JbWFnZSA9IHJlcXVpcmUgJy4vSW1hZ2UnXG5cbm1vZHVsZS5leHBvcnRzID0gKG5vZGUpLT5cblxuICB2aWV3cG9ydCA9IHZpZXdwb3J0RmFjdG9yeShub2RlLCBnZXRJbWFnZXMgbm9kZSlcblxuICB2aWV3cG9ydC5yZW5kZXIgMFxuXG4gIGRyYWdIYW5kbGVyKG5vZGUsIG5vZGUub3duZXJEb2N1bWVudClcbiAgICAub24oJ21vdmVtZW50JywgKG1vdmVtZW50KS0+IHZpZXdwb3J0LnJlbmRlciB2aWV3cG9ydC5wb3NpdGlvbiAtIG1vdmVtZW50KVxuICAgIC5vbignZHJhZ1N0YXJ0JywgLT4gbm9kZS5jbGFzc0xpc3QuYWRkICdkcmFnZ2luZycpXG4gICAgLm9uKCdkcmFnU3RvcCcsIC0+IG5vZGUuY2xhc3NMaXN0LnJlbW92ZSAnZHJhZ2dpbmcnKVxuXG5nZXRJbWFnZXMgPSAobm9kZSktPlxuICBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwgbm9kZS5jaGlsZHJlbiwgKGltYWdlLCBpbmRleCktPlxuICAgIGlmIGltYWdlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSAhPSAnaW1nJ1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdDYW52YXMgc2xpZGVyIGV4cGVjdHMgdGhlIGNhbnZhcyB0byBjb250YWluIElNRyBub2Rlcy4nXG5cbiAgICB4ID0gKGluZGV4ICogbm9kZS5jbGllbnRXaWR0aCkgKyBjZW50ZXJlZChpbWFnZS53aWR0aCwgbm9kZS5jbGllbnRXaWR0aClcbiAgICB5ID0gY2VudGVyZWQoaW1hZ2UuaGVpZ2h0LCBub2RlLmNsaWVudEhlaWdodClcbiAgICBuZXcgSW1hZ2UoaW1hZ2UsIHgsIHkpXG5cbmNlbnRlcmVkID0gKHNpemUsIGF2YWlsYWJsZSktPlxuICBzaG9ydCA9IGF2YWlsYWJsZSAtIHNpemVcbiAgaWYgc2hvcnQgPD0gMCB0aGVuIDAgZWxzZSBNYXRoLmZsb29yKHNob3J0IC8gMilcbiIsIkV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlclxuXG5kcmFnSGFuZGxlciA9IChub2RlLCBwYXJlbnROb2RlKS0+XG4gIGV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXIoKVxuICBwb3NpdGlvbiA9IDBcbiAgbm9kZS5hZGRFdmVudExpc3RlbmVyICdtb3VzZWRvd24nLCAoZSktPlxuICAgIHBhcmVudE5vZGUuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgcmVwb3J0TW92ZW1lbnRcbiAgICBwb3NpdGlvbiA9IGUuY2xpZW50WFxuICAgIGV2ZW50cy5lbWl0ICdkcmFnU3RhcnQnXG4gICAgcmV0dXJuXG5cbiAgcGFyZW50Tm9kZS5hZGRFdmVudExpc3RlbmVyICdtb3VzZXVwJywgLT5cbiAgICBwYXJlbnROb2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIgJ21vdXNlbW92ZScsIHJlcG9ydE1vdmVtZW50XG4gICAgZXZlbnRzLmVtaXQgJ2RyYWdTdG9wJ1xuICAgIHJldHVyblxuXG4gIHJlcG9ydE1vdmVtZW50ID0gKGUpLT5cbiAgICBtb3ZlbWVudCA9IGUuY2xpZW50WCAtIHBvc2l0aW9uXG4gICAgcG9zaXRpb24gPSBlLmNsaWVudFhcbiAgICBldmVudHMuZW1pdCAnbW92ZW1lbnQnLCBtb3ZlbWVudFxuICAgIHJldHVyblxuXG4gIHJldHVybiBldmVudHNcblxubW9kdWxlLmV4cG9ydHMgPSBkcmFnSGFuZGxlclxuIiwiQ2FudmFzVmlld3BvcnQgPSByZXF1aXJlICcuL0NhbnZhc1ZpZXdwb3J0J1xuSHRtbFZpZXdwb3J0ID0gcmVxdWlyZSAnLi9IdG1sVmlld3BvcnQnXG5cbm1vZHVsZS5leHBvcnRzID0gKG5vZGUsIGltYWdlcyktPlxuICBpZiBub2RlIGFuZCBub2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PSAnY2FudmFzJ1xuICAgIHJldHVybiBuZXcgQ2FudmFzVmlld3BvcnQobm9kZSwgaW1hZ2VzKVxuICBlbHNlIGlmIG5vZGUgYW5kIG5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09ICdkaXYnXG4gICAgcmV0dXJuIG5ldyBIdG1sVmlld3BvcnQobm9kZSwgaW1hZ2VzKVxuICBlbHNlXG4gICAgdGhyb3cgbmV3IEVycm9yICdDYW52YXNTbGlkZXIgZXhwZWN0cyBhIGNhbnZhcyBub2RlJ1xuIiwiY2FudmFzU2xpZGVyID0gcmVxdWlyZSAnLi9jYW52YXNTbGlkZXInXG5cbndpbmRvdy5vbmxvYWQgPSAtPlxuICBub2RlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3NsaWRlcicpXG4gIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwgbm9kZXMsIGNhbnZhc1NsaWRlclxuXG4iXX0=
