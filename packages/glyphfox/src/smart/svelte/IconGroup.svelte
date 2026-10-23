<script>
  import { bool, groupCss, groupItems, nextRun } from './smart.js';

  let {
    animate = 'pop',
    stagger = 60,
    delay = 0,
    from = undefined,
    trigger = 'mount',
    active = undefined,
    duration = undefined,
    loop = undefined,
    icons = undefined,
    count = undefined,
    as = 'span',
    class: className = undefined,
    style = undefined,
    onclick = undefined,
    children = undefined,
    ...props
  } = $props();
  let run = $state(null);

  const group = $derived({ animate, stagger, delay, from, trigger, active, duration, loop, run });
  const items = $derived(icons ? groupItems(icons, group, props) : []);
  const css = $derived(icons ? null : groupCss({ animate, stagger, delay, from, trigger, duration, loop, count }));
  const classes = $derived(['glyphfox-group', css && css.className, trigger === 'state' && bool(active) && 'gf-on', className].filter(Boolean).join(' '));

  function handleClick(e) {
    if (onclick) onclick(e);
    if (trigger === 'click') run = nextRun(run);
  }
</script>

<svelte:element this={as} class={classes} {style} role="group" data-gf-run={icons ? undefined : run} onclick={handleClick} {...props}>
  {#if icons}{#each items as item, i (i)}{@html item}{/each}{:else if children}{@render children()}{/if}{#if css}{@html `<style>${css.css}</style>`}{/if}
</svelte:element>
