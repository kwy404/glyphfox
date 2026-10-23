<script>
  import { bool, loadAll, missingFor, smartMarkup, startTick } from './smart.js';

  let { class: className = undefined, style = undefined, children = undefined, ...props } = $props();
  let version = $state(0);
  let now = $state(0);

  $effect(() => {
    const missing = missingFor(props);
    if (missing.length) loadAll(missing).then(() => version++);
  });
  $effect(() => {
    if (!props.kind || !bool(props.tick)) return undefined;
    return startTick(props.kind, { seconds: props.seconds, time: props.time, date: props.date }, () => now++);
  });

  const out = $derived.by(() => {
    void version;
    void now;
    return smartMarkup(props, className);
  });
</script>

<svg {...out.attrs} {...out.rest} {style}>{@html out.inner}{#if children}{@render children()}{/if}</svg>
