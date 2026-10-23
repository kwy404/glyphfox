<script>
  import Icon from './Icon.svelte';
  import { EMPTY, morphStore } from './glyph.js';

  let { name = undefined, icon = undefined, ...props } = $props();
  const store = morphStore(null, {
    get duration() {
      return props.duration;
    },
    get delay() {
      return props.delay;
    },
    get weight() {
      return props.weight;
    },
    get size() {
      return props.size;
    },
  });
  let frame = $state(null);
  $effect(() => store.subscribe((v) => (frame = v)));
  $effect(() => {
    store.set(icon || name);
  });
</script>

<Icon {...props} icon={frame ? frame.icon : EMPTY} variant={props.variant ?? (frame && frame.variant)} />
