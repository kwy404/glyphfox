<script>
  import { untrack } from 'svelte';
  import { statusMarkup, tween } from './smart.js';

  let { state: status = 'idle', class: className = undefined, style = undefined, ...props } = $props();
  let from = $state(null);
  let to = $state(untrack(() => status));
  let p = $state(1);

  $effect(() => {
    const next = status;
    const current = untrack(() => to);
    if (next === current) return undefined;
    from = current;
    to = next;
    p = 0;
    const duration = untrack(() => props.duration);
    const delay = untrack(() => props.delay);
    return tween(0, 1, { duration: duration === undefined ? 450 : Number(duration), delay: delay === undefined ? 0 : Number(delay) }, (v) => {
      p = v;
    });
  });

  const out = $derived(statusMarkup(from, to, p, props, className));
</script>

<svg {...out.attrs} {...out.rest} {style}>{@html out.inner}</svg>
