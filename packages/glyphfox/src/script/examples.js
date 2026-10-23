// Glyph script examples for the studio playground and the docs. Each one
// is an original drawing that compiles to an icon passing the lint.

/** Playground examples: { id, title, source }. */
export const EXAMPLES = [
  {
    id: 'sun',
    title: 'Sun',
    source: `# A sun: one disc and one ray, turned eight times.
name sun
tags weather, day, light
category weather

circle 12 12 4
repeat 8 {
  line 12 2 12 4.5   # the ray at twelve o'clock
}
`,
  },
  {
    id: 'flower',
    title: 'Flower',
    source: `# A flower: one petal repeated around the center.
name flower
tags nature, plant, bloom
category nature

let petals = 5
circle 12 12 2
repeat petals {
  ellipse 12 4.5 2 2.5   # turned petals become exact arcs
}
`,
  },
  {
    id: 'fox-face',
    title: 'Fox face',
    source: `# A fox face: draw the left half once, mirror it, add the eyes.
name fox-face
tags fox, animal, face
category animals

mirror x {
  polyline 12 8, 8.5 8, 4 3, 3 12, 12 21   # ear, cheek and chin
  dot 8.5 13                               # the eye
}
dot 12 17.5                                # the nose sits on the axis
`,
  },
  {
    id: 'card',
    title: 'Card',
    source: `# A payment card: a rounded rectangle, a stripe and a chip line.
name card
tags payment, credit, wallet
category commerce

rect 2 5 20 14 radius 2
line 2 10 22 10
line 6 15 10 15
`,
  },
  {
    id: 'gauge',
    title: 'Gauge',
    source: `# A gauge: an open arc, five ticks along it and a needle.
name gauge
tags speed, meter, dashboard
category data

let cy = 14
arc 12 cy 9 from -120 to 120   # 0 is twelve o'clock, angles turn clockwise
group rotate -120 around 12 cy {
  repeat 5 around 12 cy step 60 {
    line 12 cy-7 12 cy-5.5
  }
}
line 12 cy 15.5 cy-3.5
dot 12 cy
`,
  },
  {
    id: 'gear',
    title: 'Gear',
    source: `# A gear: a hub, a ring and eight rounded teeth.
name gear
tags settings, cog, machine
category interface

circle 12 12 3
circle 12 12 6.5
repeat 8 {
  rect 10.5 2.5 3 3 radius 0.75   # turned rects become paths
}
`,
  },
  {
    id: 'bolt',
    title: 'Bolt',
    source: `# A bolt: raw path data, scaled a little around the center.
name bolt
tags power, energy, flash
category weather

group scale 0.9 {
  path "M13 2 4 14h7l-1 8 9-12h-7l1-8z"
}
`,
  },
  {
    id: 'bubble',
    title: 'Chat bubble',
    source: `# A chat bubble with a duotone fill under the outline.
name chat-bubble
tags chat, message, talk
category communication

duotone {
  rect 3 4 18 13 radius 3   # the fill takes the secondary color
}
rect 3 4 18 13 radius 3
polyline 8 17, 8 21, 12.5 17
line 8 9 16 9
line 8 12.5 13 12.5
`,
  },
];
