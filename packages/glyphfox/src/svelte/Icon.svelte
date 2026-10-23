<script>
  import { untrack } from 'svelte';
  import { EMPTY, bool, loadAll, morphFrame, morphGoal, resolveNow, strokeWidth, tween, view } from './glyph.js';

  let {
    icon = undefined,
    name = undefined,
    gap = undefined,
    size = undefined,
    color = undefined,
    secondaryColor = undefined,
    secondaryOpacity = undefined,
    weight = undefined,
    absoluteWeight = undefined,
    corners = undefined,
    variant = undefined,
    rotate = undefined,
    flipX = undefined,
    flipY = undefined,
    mirrorRtl = undefined,
    animate = undefined,
    trigger = undefined,
    active = undefined,
    duration = undefined,
    delay = undefined,
    loop = undefined,
    modifier = undefined,
    modifierCorner = undefined,
    morphTo = undefined,
    title = undefined,
    decorative = undefined,
    class: className = undefined,
    style = undefined,
    onclick = undefined,
    onmouseenter = undefined,
    onmouseleave = undefined,
    children = undefined,
    ...rest
  } = $props();

  let version = $state(0);
  let mounted = $state(false);
  let hovered = $state(false);
  let toggled = $state(false);
  let run = $state(null);
  let p = $state(morphTo && trigger === 'state' && bool(active) ? 1 : 0);
  let last = null;

  const glyph = $derived({ size, color, secondaryColor, secondaryOpacity, weight, absoluteWeight, corners, variant, rotate, flipX, flipY, mirrorRtl, animate, trigger, active, duration, delay, loop, modifier, modifierCorner, title });
  const sw = $derived(strokeWidth(glyph));
  const base = $derived.by(() => {
    void version;
    return resolveNow(icon || name, sw, gap);
  });
  const target = $derived.by(() => {
    void version;
    return resolveNow(morphTo, sw, gap);
  });

  $effect(() => {
    const missing = [...base.missing, ...target.missing];
    if (missing.length) loadAll(missing).then(() => version++);
  });
  $effect(() => {
    mounted = true;
  });

  const trig = $derived(trigger || 'mount');
  const goal = $derived(target.value ? morphGoal(trig, { active: bool(active), hovered, toggled, mounted }) : 0);
  $effect(() => {
    const g = goal;
    void target.value;
    const from = untrack(() => p);
    return tween(from, g, { duration: duration === undefined ? 450 : Number(duration), delay: delay === undefined ? 0 : Number(delay) }, (v) => {
      p = v;
    });
  });

  const out = $derived.by(() => {
    const t = target.value;
    if (t) last = t;
    const drawTarget = t || (p > 0 ? last : null);
    const baseIcon = base.value ? base.value.icon : EMPTY;
    const v = variant ?? (base.value && base.value.variant);
    const frame = morphFrame(baseIcon, drawTarget && drawTarget.icon, p, { variant: v, targetVariant: drawTarget && drawTarget.variant });
    const labelled = rest['aria-label'] !== undefined || rest['aria-labelledby'] !== undefined;
    const dec = decorative !== undefined ? decorative : title ? false : !labelled;
    return view(frame.icon, { ...glyph, variant: frame.variant, class: className, run, decorative: dec });
  });

  function handleClick(e) {
    if (onclick) onclick(e);
    if (trig === 'click' && (animate || morphTo)) {
      toggled = !toggled;
      run = run === '1' ? '2' : '1';
    }
  }
  function handleEnter(e) {
    if (onmouseenter) onmouseenter(e);
    if (trig === 'hover' && morphTo) hovered = true;
  }
  function handleLeave(e) {
    if (onmouseleave) onmouseleave(e);
    if (trig === 'hover' && morphTo) hovered = false;
  }
</script>

<svg {...out.attrs} {...rest} {style} onclick={handleClick} onmouseenter={handleEnter} onmouseleave={handleLeave}>{@html out.inner}{#if children}{@render children()}{/if}</svg>
