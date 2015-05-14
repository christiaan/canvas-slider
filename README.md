# Canvas Image Slider

A simple fluid image slider using a `<canvas>` or `<div>` node.

To create a slider simply create a structure like this.

```html
<canvas class="slider" width="640" height="400">
  <img src="http://lorempixel.com/640/400"/>
  <img src="http://lorempixel.com/g/600/400"/>
  <img src="http://lorempixel.com/640/150"/>
  <img src="http://lorempixel.com/500/400"/>
</canvas>
```

Or this

```html
<div class="slider" style="width: 400px; height: 500px">
  <img src="http://lorempixel.com/400/500"/>
  <img src="http://lorempixel.com/g/360/500"/>
  <img src="http://lorempixel.com/150/150"/>
  <img src="http://lorempixel.com/350/350"/>
</div>
```

## Development
The only requirement is to have either [nodejs][1] or [iojs][2] installed.

Start with `npm install` to install all dependencies.

Then run `npm run serve` and go to [localhost:3030](http://localhost:3030)

 [1]: https://nodejs.org/
 [2]: https://iojs.org/
