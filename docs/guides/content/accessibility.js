export default {
  slug: 'accessibility',
  group: 'topics',
  order: 30,
  icon: 'accessibility',
  short: 'Accessibility',
  related: ['animated-icons', 'tailwind', 'web-components', 'react'],
  title: 'Accessible SVG icons with glyphfox: labels and contrast',
  description: 'Make glyphfox icons accessible: decorative by default, titles and labels, icon only buttons, status icons, contrast, reduced motion and right to left layouts.',
  h1: 'Accessible icons',
  lead: 'Most icons sit next to a label and should stay out of the way of assistive technology; a few carry meaning on their own and need a name. glyphfox gets the first case right by default and makes the second a single prop.',
  sections: [
    {
      id: 'defaults',
      h: 'Decorative by default',
      blocks: [
        ['p', 'defaults.p', 'Every glyphfox icon renders with <code>aria-hidden="true"</code> unless you give it a name. Screen readers skip it, which is what you want for an icon next to visible text: the text already says what the control does, and an extra "image" in the announcement is noise.'],
        ['code', 'js', 'output.html', `<!-- <DownloadIcon /> next to a label -->
<button type="button">
  <svg class="glyphfox glyphfox-download" aria-hidden="true" ...>...</svg>
  Download
</button>`],
        ['p', 'defaults.p2', 'The same default applies everywhere: the React, Vue, Svelte and Angular components, the <code>glyph-fox</code> element, the plain HTML runtime and the strings from <code>toSvg</code>. You only change it when an icon is the only carrier of its meaning.'],
      ],
    },
    {
      id: 'title',
      h: 'Icons that carry meaning',
      blocks: [
        ['p', 'title.p', 'Pass <code>title</code> and the icon becomes an image with a name. The renderer adds three things: a <code>&lt;title&gt;</code> element as the first child, <code>role="img"</code> and <code>aria-label</code> with the same text, so the name is exposed consistently across browsers and screen readers.'],
        ['code', 'js', 'Status.jsx', `import { CircleCheckIcon, TriangleAlertIcon } from 'glyphfox/react';

export function SyncStatus({ ok }) {
  return ok
    ? <CircleCheckIcon title="Synced" color="#15803d" />
    : <TriangleAlertIcon title="Sync failed" color="#b91c1c" />;
}`],
        ['code', 'js', 'output.html', `<svg class="glyphfox glyphfox-circle-check" role="img" aria-label="Synced" ...>
  <title>Synced</title>
  ...
</svg>`],
        ['p', 'title.label', 'In React, Vue and Svelte you can also pass <code>aria-label</code> or <code>aria-labelledby</code> straight to the component. They land on the <code>svg</code>, and the icon stops being decorative on its own, without the <code>&lt;title&gt;</code> element and its hover tooltip. <code>decorative</code> overrides the automatic choice in both directions: <code>decorative</code> hides an icon even with a title, <code>decorative={false}</code> exposes it.'],
        ['p', 'title.words', 'Write the name for what the icon means in this place, not for what it depicts. A <a href="../icons/trash.html">trash</a> icon is "Delete draft", not "Trash can"; a <a href="../icons/circle-check.html">circle check</a> in a list of payments is "Paid".'],
      ],
    },
    {
      id: 'controls',
      h: 'Icon only buttons and links',
      blocks: [
        ['p', 'controls.p', 'When an icon is the only content of a button or a link, name the control, not the icon. The control is what receives focus and what a screen reader announces; the icon inside stays decorative.'],
        ['code', 'js', 'Toolbar.jsx', `import { XIcon, SettingsIcon, SearchIcon } from 'glyphfox/react';

export function Toolbar({ onClose }) {
  return (
    <>
      <button type="button" aria-label="Close dialog" onClick={onClose}>
        <XIcon />
      </button>

      <a href="/settings" aria-label="Settings">
        <SettingsIcon />
      </a>

      <button type="submit">
        <SearchIcon />
        <span className="visually-hidden">Search the docs</span>
      </button>
    </>
  );
}`],
        ['p', 'controls.hidden', 'Visually hidden text, the third pattern, is translated by browser translation tools, which often skip attributes; prefer it on multilingual sites. A typical <code>visually-hidden</code> class clips the element to one pixel without removing it from the accessibility tree.'],
        ['code', 'css', 'app.css', `.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}`],
        ['p', 'controls.state', 'Toggles need their state, not a new name. A menu button that morphs from <code>menu</code> to <code>x</code> keeps its label and sets <code>aria-expanded</code>; a play button that morphs to <code>pause</code> changes its label or uses <code>aria-pressed</code>. The morph is the visual half of that change; the <a href="animated-icons.html">animated icons guide</a> shows both halves together.'],
      ],
    },
    {
      id: 'status',
      h: 'Status, color and contrast',
      blocks: [
        ['p', 'status.p', 'Color alone must not carry meaning (WCAG 1.4.1). Use different shapes for different states, such as <code>circle-check</code>, <code>circle-alert</code> and <code>circle-x</code>, and pair them with text where you can. Badges help too: <code>file+check</code> and <code>file+alert</code> differ in shape, not only in color.'],
        ['p', 'status.contrast', 'Icons that people need to understand the page or to find a control must reach a contrast of 3 to 1 against their background (WCAG 1.4.11, non text contrast). Measure the stroke color, because that is what draws the shape; the translucent duotone layer is a decoration on top of it. Decorative icons next to text are not covered by the rule, but low contrast still makes them harder to scan.'],
        ['p', 'status.weight', 'Thin strokes look lighter than their color suggests, because antialiasing blends them with the background. glyphfox compensates below 24 pixels by making the stroke up to 30 percent heavier; at 14 or 16 pixels on a muted color, a <code>weight</code> of 2.25 or 2.5 keeps icons readable. <code>absoluteWeight</code> turns the compensation off, so use it with care at small sizes.'],
      ],
    },
    {
      id: 'motion',
      h: 'Motion',
      blocks: [
        ['p', 'motion.p', 'Every living state and every morph respects <code>prefers-reduced-motion: reduce</code>: presets do not play, CSS morphs switch without a transition and component morphs jump to their final shape. The end state stays visible, so no information is lost.'],
        ['p', 'motion.p2', 'Content that moves on its own for more than five seconds needs a way to pause it (WCAG 2.2.2). Tie looping animations such as <code>spin</code> to the process they show and stop them when it ends, and avoid looping attention seekers such as a bell that shakes forever.'],
      ],
    },
    {
      id: 'rtl',
      h: 'Right to left layouts',
      blocks: [
        ['p', 'rtl.p', 'In Arabic, Hebrew or Persian interfaces, icons that point along the reading direction must flip: back and forward arrows, chevrons in breadcrumbs, reply and undo. <code>mirrorRtl</code> adds a class that mirrors the icon whenever it is inside <code>dir="rtl"</code>, so the same markup works in both directions.'],
        ['code', 'js', 'Pager.jsx', `import { ChevronLeftIcon, ChevronRightIcon } from 'glyphfox/react';

export function Pager({ onPrev, onNext }) {
  return (
    <nav aria-label="Pagination">
      <button type="button" onClick={onPrev}><ChevronLeftIcon mirrorRtl /> Previous</button>
      <button type="button" onClick={onNext}>Next <ChevronRightIcon mirrorRtl /></button>
    </nav>
  );
}`],
        ['p', 'rtl.not', 'Do not mirror icons whose direction does not follow the text: media controls such as <code>play</code> and <code>fast-forward</code> keep pointing right, a <code>clock</code> keeps turning clockwise, a <code>check</code> stays as it is, and <code>rotate-cw</code> still means clockwise.'],
      ],
    },
    {
      id: 'others',
      h: 'Masks, sprites, the element and Angular',
      blocks: [
        ['ul', 'others.list', [
          '<strong>Tailwind CSS classes</strong> render an empty element with a mask, which has no semantics at all. Add <code>aria-hidden="true"</code> and give the control a visually hidden label. In Windows high contrast mode a mask icon can vanish; the <a href="tailwind.html">Tailwind CSS guide</a> has the fix.',
          '<strong>SVG sprites</strong> leave the outer <code>svg</code> to you: add <code>aria-hidden="true"</code> for a decorative icon, or <code>role="img"</code> and <code>aria-label</code> for a meaningful one. The <a href="svg-sprite.html">sprite guide</a> has examples.',
          '<strong>The <code>glyph-fox</code> element and the Angular <code>gf-icon</code></strong> render the <code>svg</code> inside the host element. An <code>aria-label</code> on the host makes the inner <code>svg</code> an image but does not name it, and a label on a generic element is not announced reliably. Use the <code>title</code> attribute or input, which names the inner <code>svg</code>.',
        ]],
        ['code', 'js', 'index.html', `<!-- names the inner svg: role img, aria-label and a title -->
<glyph-fox name="circle-alert" title="Payment failed"></glyph-fox>

<!-- Angular -->
<gf-icon name="circle-alert" title="Payment failed"></gf-icon>`],
      ],
    },
    {
      id: 'testing',
      h: 'Test it',
      blocks: [
        ['ol', 'testing.list', [
          'Open the accessibility tree in your browser devtools and select the control: its name should be the label you wrote, and decorative icons should not appear at all.',
          'Navigate with a screen reader: VoiceOver on macOS and iOS, NVDA on Windows, TalkBack on Android. Listen for doubled names and for anything announced as just "image".',
          'Emulate <code>prefers-reduced-motion</code> and <code>forced-colors</code> in the rendering tools of Chromium devtools and check that icons stay visible and still.',
          'Check contrast of meaningful icons with a color picker against the actual background, including hover and focus states.',
        ]],
      ],
    },
    {
      id: 'props',
      h: 'Props that matter here',
      blocks: [
        ['props', 'react', ['title', 'decorative', 'mirrorRtl', 'color', 'weight', 'absoluteWeight']],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Naming the control and the icon', 'A <code>title</code> on an icon inside a button that already has a label makes screen readers announce both, and the <code>&lt;title&gt;</code> also shows as a hover tooltip. Name one thing: the control.'],
          ['An image without a name', '<code>decorative={false}</code> with no <code>title</code> and no <code>aria-label</code> exposes an image with no name, which screen readers announce as "image" or by its file name. Give every exposed icon a name.'],
          ['State that only the icon shows', 'A morph from <code>copy</code> to <code>check</code> is invisible to a screen reader. Announce the result in text: change the button label, or put "Copied" in a live region with <code>role="status"</code>.'],
          ['Tooltips from titles', 'The browser tooltip from <code>&lt;title&gt;</code> appears on mouse hover only, never on focus or touch. Do not put information there that is not available another way.'],
          ['Labels on the host element', 'On <code>glyph-fox</code> and <code>gf-icon</code>, use <code>title</code> rather than <code>aria-label</code>, as described above.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'every-icon', q: 'Should every icon have a title?', a: 'No. Most icons sit next to text or inside a labelled control, and a title there only adds noise. Give a title to icons that stand alone and carry information, such as a status icon in a table cell.' },
    { id: 'aria-hidden', q: 'Is aria-hidden enough for decorative icons?', a: 'Yes. <code>aria-hidden="true"</code>, which glyphfox adds by default, removes the icon from the accessibility tree. SVG icons are not focusable, so there is nothing else to hide.' },
  ],
};
