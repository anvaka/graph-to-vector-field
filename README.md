# Graph to vector field

This is just a toy project. It performs layout of a graph, and then encodes positions
of graph's nodes into a vector field.

Here is a [live demo](https://anvaka.github.io/fieldplay/?dt=0.001&fo=0.998&dp=0.009&cm=2&cx=0.37329999999999997&cy=0.5571999999999999&w=1.6052&h=1.6052&showBindings=1&i0=https%3A%2F%2Fgist.githubusercontent.com%2Fanvaka%2Febc18e3ffe05b0709a7ae933261fa2e9%2Fraw%2F239bc655a1269884d271a9418af0d7bd95b906ec%2Fmiserables.png&vf=%2F%2F%20p.x%20and%20p.y%20are%20current%20coordinates%0A%2F%2F%20v.x%20and%20v.y%20is%20a%20velocity%20at%20point%20p%0Avec2%20get_velocity%28vec2%20p%29%20%7B%0A%20%20vec2%20v%20%3D%20vec2%280.%2C%200.%29%3B%0A%0A%20%20%2F%2F%20change%20this%20to%20get%20a%20new%20vector%20field%0A%20%20vec4%20c%20%3D%20texture2D%28input0%2C%20vec2%28mod%28p.x%2C1.%29%2C%201.%20-%20mod%28p.y%2C%201.%29%29%29%3B%0A%20%20v.x%20%3D%20%28c.r%20%2B%20c.g%2F255.%29%20-%200.5%3B%0A%20%20v.y%20%3D%200.5%20-%20%28c.b%20%2B%20c.a%2F255.%29%3B%0A%0A%20%20return%20%28v%29%3B%0A%7D&code=%2F%2F%20p.x%20and%20p.y%20are%20current%20coordinates%0A%2F%2F%20v.x%20and%20v.y%20is%20a%20velocity%20at%20point%20p%0Avec2%20get_velocity%28vec2%20p%29%20%7B%0A%20%20vec2%20v%20%3D%20vec2%280.%2C%200.%29%3B%0A%0A%20%20%2F%2F%20change%20this%20to%20get%20a%20new%20vector%20field%0A%20%20vec4%20c%20%3D%20texture2D%28input0%2C%20vec2%28mod%28p.x%2C1.%29%2C%201.%20-%20mod%28p.y%2C%201.%29%29%29%3B%0A%20%20v.x%20%3D%20%28c.r%20%2B%20c.g%2F255.%29%20-%200.5%3B%0A%20%20v.y%20%3D%200.5%20-%20%28c.b%20%2B%20c.a%2F255.%29%3B%0A%0A%20%20return%20%28v%29%3B%0A%7D&pc=40000) for the following graph: 

![miserables layout](https://gist.githubusercontent.com/anvaka/ebc18e3ffe05b0709a7ae933261fa2e9/raw/239bc655a1269884d271a9418af0d7bd95b906ec/miserables_layout.png)

See overlaid animation here: https://twitter.com/anvaka/status/944101777149849600

*NOTE:* I didn't realize this code would be interesting to community, and I had no intention to share it originally. 
But since many people have asked about it on Twitter, I'm quickly releasing it as is, so that you could play with it.

# How to get started with this code?

## Setup
Make sure you have [node](https://nodejs.org/) installed, and perform this one-time setup

``` sh
git clone https://github.com/anvaka/graph-to-vector-field
cd graph-to-vector-field
npm install
```

## Generating textures

To build a default graph and texture, type in your terminal

``` sh
npm run build
```

This will create a new texture and store it into the `out/` folder. The texture would look like this

![example](https://gist.githubusercontent.com/anvaka/ebc18e3ffe05b0709a7ae933261fa2e9/raw/239bc655a1269884d271a9418af0d7bd95b906ec/miserables.png)

## Visualizing textures as a vector field

Let's use our texture in the [field play](https://anvaka.github.io/fieldplay/?). 

You will need to enable a secret UI component, by adding `?showBindings=1` to the query string (or simply [click here](https://anvaka.github.io/fieldplay/?showBindings=1) ).

The `showBindings` is an experimental feature ([discussed here](https://www.reddit.com/r/fieldplay/comments/7jenqz/image_binding_seeking_for_early_feedback/) ).
It will enable you to add an image, and use it from the vector field code.

![demo](https://i.imgur.com/A2PkoOK.png)

Now we need an http server with enabled CORS headers. For you convenience, I already included `http-server` into
this module. Just type in the new terminal window:

``` sh
npm start
```

This command will start a local server in the `out/` folder.

Open your generated vector field texture, and paste its address to the `input0`
text field:

![pasted](https://i.imgur.com/xfl5Mr2.png)

Finally, we need to modify the vector field code to read value from the texture. Set vector field UI to:

``` glsl
// p.x and p.y are current coordinates
// v.x and v.y is a velocity at point p
vec2 get_velocity(vec2 p) {
  vec2 v = vec2(0., 0.);

  vec4 c = texture2D(input0, vec2(mod(p.x,1.), 1. - mod(p.y, 1.)));
  v.x = (c.r + c.g/255.) - 0.5;
  v.y = 0.5 - (c.b + c.a/255.);

  return (v);
}
```

That's it. You should see the animated vector field.

## Changing base vector field texture

I tried to [document the code](https://github.com/anvaka/graph-to-vector-field/blob/master/index.js) that generates vector field texture. The easiest place to start
is to change a [vector field definition](https://github.com/anvaka/graph-to-vector-field/blob/0e750e4aab8c13e0b70b9b8c919d4eadc4c49428/index.js#L42-L54) in the javascript file. 

You can also [try other graphs](https://github.com/anvaka/graph-to-vector-field/blob/0e750e4aab8c13e0b70b9b8c919d4eadc4c49428/index.js#L31-L39), [play with](https://github.com/anvaka/graph-to-vector-field/blob/0e750e4aab8c13e0b70b9b8c919d4eadc4c49428/index.js#L56-L64) various [RBF functions](https://en.wikipedia.org/wiki/Radial_basis_function). 

Remember to run `npm run build` after each modification, so that a new vector field texture is created in the `out/` folder.

*Note:* Current implementation doesn't necessary need to use graphs. Any set of points would do
just fine. Though, as mentioned above - this was a toy project to learn how to encode graphs.
I had plans to leverage graph structure in the future, that's why we are dealing with them here.

# Thanks!

Thank you for your interest in this project!

If you run into any issue - please open a bug here or ping me over [email](mailto:anvaka@gmail.com).
I'd be happy to help.

I wish you to have very happy holidays!