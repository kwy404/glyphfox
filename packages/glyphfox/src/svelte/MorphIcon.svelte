<script>
  import { untrack } from 'svelte';
  import Icon from './Icon.svelte';
  import { EMPTY, morphStore } from './glyph.js';

  let { name = undefined, icon = undefined, ...props } = $props();
  const store = morphStore(
    untrack(() => icon || name),
    {
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
    },
  );
  let frame = $state(null);
  const unsubscribe = store.subscribe((v) => (frame = v));
  $effect(() => unsubscribe);
  $effect(() => {
    store.set(icon || name);
  });
</script>

<Icon {...props} icon={frame ? frame.icon : EMPTY} variant={props.variant ?? (frame && frame.variant)} />
