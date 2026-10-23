<script>
  import Icon from './Icon.svelte';
  import { EMPTY, fuse, loadAll, resolveNow, strokeWidth } from './glyph.js';

  let { icons = [], layout = undefined, gap = undefined, scale = undefined, offsets = undefined, ...props } = $props();
  let version = $state(0);
  const sw = $derived(strokeWidth(props));
  const parts = $derived.by(() => {
    void version;
    return icons.map((spec) => resolveNow(spec, sw, gap));
  });
  $effect(() => {
    const missing = parts.flatMap((r) => r.missing);
    if (missing.length) loadAll(missing).then(() => version++);
  });
  const fused = $derived.by(() => {
    if (parts.length < 2 || !parts.every((r) => r.value)) return EMPTY;
    try {
      return fuse(
        parts.map((r) => r.value.icon),
        { layout, gap: gap === undefined ? undefined : Number(gap), scale, offsets, weight: sw },
      );
    } catch (err) {
      console.warn(`glyphfox: ${err.message}`);
      return EMPTY;
    }
  });
</script>

<Icon icon={fused} {...props} />
