// The 256 pairing words of a live session: glyphfox icon names and tags, so
// every word has a picture. Each word carries 8 bits, six words carry 48.
// Never reorder or edit this list: both devices must read the same words.

export const WORDLIST = Object.freeze(
  [
    'activity album anchor archive atlas atom award bank banknote battery beach bed bee bell bike bird',
    'bold bone book bookmark braces brackets briefcase bug building bunny bus butterfly cactus calendar camera car',
    'cat chain check cherry cinema circle city clock cloud code coffee compass cone copy crop cross',
    'crown crystal cube cursor cylinder database desert diamond dice disc dog dollar door download droplet earth',
    'ellipse expand eye feather file film filter fish flag flame flask flight flower folder forest forward',
    'fox frown fuel gallery gamepad garden gauge ghost gift glasses globe grid harbor heading heart hexagon',
    'history home honey hotel image inbox italic jewel key keyboard king kite kitten laptop layers leaf',
    'library link list loader locate lock magic mail map maximize medal melody menu message mic minimize',
    'minus monitor moon morning mountain mouse move mushroom music network night ocean octagon office orbit owl',
    'package palette paper paragraph pause peace pencil pentagon percent phone pin plane planet play plug plus',
    'pound power printer prize puppy puzzle pyramid queen quill quote rabbit radio rain rainbow receipt redo',
    'refresh repeat reply rewind ribbon rocket route safe saturn save scan school scissors search send server',
    'settings shapes share shield ship shirt shrink shuffle signal signpost siren sliders smile snail snow sparkle',
    'speaker sphere spiral sprout square star stop store storm sun sunrise sunset table tablet tag target',
    'tent terminal thunder ticket timer tornado tower train trash tree triangle trophy truck turtle umbrella underline',
    'undo unlock upload user utensils video vinyl volume wallet watch waves whale wifi wind wings winter',
  ]
    .join(' ')
    .split(' '),
);
