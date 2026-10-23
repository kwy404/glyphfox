// glyphfox command line: search, show, copy in any format, fuse, morph,
// build subsets (sprite, CSS masks or a small package), lint and Fox-ify.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FORMATS,
  LAYOUTS,
  MODIFIER_NAMES,
  categories,
  componentName,
  getIcon,
  iconNames,
  parseSpec,
  propsFromAttributes,
  renderIcon,
  resolve,
  search,
  snippet,
  strokeWidth,
  toDataUri,
  toSvg,
} from '../index.js';
import { distToPolylines, flattenNode, pointInPolygon } from '../core/geometry.js';
import { iconNodes, nodesToString, splitLayers } from '../core/nodes.js';
import { solidLayers } from '../core/solid.js';
import { canonicalSvg, lintSvg } from '../core/lint.js';
import { foxify } from '../core/foxify.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, '..', '..', 'package.json'), 'utf8'));

const BOOLEAN = new Set(['absolute-weight', 'flip-x', 'flip-y', 'mirror-rtl', 'active', 'decorative', 'json', 'print', 'no-clipboard', 'help', 'version', 'canonical']);

/** Parses argv into { positionals, flags }. */
export function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h') flags.help = true;
    else if (a === '-v') flags.version = true;
    else if (a === '-o') flags.out = argv[++i];
    else if (a === '-f') flags.format = argv[++i];
    else if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const key = eq >= 0 ? a.slice(2, eq) : a.slice(2);
      if (eq >= 0) flags[key] = a.slice(eq + 1);
      else if (BOOLEAN.has(key)) flags[key] = true;
      else if (key === 'loop') {
        const next = argv[i + 1];
        if (next !== undefined && /^\d+$/.test(next)) flags.loop = argv[++i];
        else flags.loop = 'true';
      } else {
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('--')) flags[key] = true;
        else flags[key] = argv[++i];
      }
    } else positionals.push(a);
  }
  return { positionals, flags };
}

/** Shared props from flags (same names as the HTML attributes). */
export function propsFromFlags(flags) {
  return propsFromAttributes((name) => {
    const v = flags[name];
    if (v === undefined) return null;
    return v === true ? '' : String(v);
  });
}

const HELP = `glyphfox ${pkg.version}: original icons on a 24 grid

Usage
  glyphfox search <words...>        find icons by name, tag or category
  glyphfox show <spec>              details, a terminal preview and the SVG
  glyphfox copy <spec>              print a snippet and copy it to the clipboard
  glyphfox fuse <a> <b> [...]       combine 2 to 10 icons into one
  glyphfox morph <from> <to>        CSS only morph between two icons
  glyphfox build <specs...>         build a subset: sprite, css or package
  glyphfox list | categories        list icons or categories
  glyphfox lint <file.svg...>       check SVG files against the icon rules
  glyphfox foxify <file.svg>        convert any SVG to the glyphfox style

Specs
  file              an icon
  file+check@tr     a modifier badge (${MODIFIER_NAMES.join(', ')})
  cloud&lock:side   a fusion (${LAYOUTS.join(', ')})
  heart/solid       a style (outline, duotone, solid)

Options
  --format <f>      ${FORMATS.join(', ')} (copy, fuse)
  --size --color --secondary-color --secondary-opacity --weight
  --absolute-weight --corners --variant --rotate --flip-x --flip-y
  --mirror-rtl --animate --trigger --active --duration --delay --loop
  --modifier --modifier-corner --morph-to --title --decorative
  --layout --gap    fusion layout and knockout gap
  --type <t>        sprite, css or package (build)
  --from <file>     read names from a file, one per line (build)
  --out, -o <path>  write to a file or directory
  --category <c>    filter (search, list)
  --json            machine readable output
  --print           print only, do not touch the clipboard
`;

function out(text, flags, io) {
  if (flags.out) {
    const file = resolvePath(io.cwd, flags.out);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text.endsWith('\n') ? text : text + '\n');
    io.err(`wrote ${flags.out}`);
  } else io.log(text);
}

function copyToClipboard(text) {
  const tries =
    process.platform === 'win32'
      ? [['clip', []]]
      : process.platform === 'darwin'
        ? [['pbcopy', []]]
        : [
            ['wl-copy', []],
            ['xclip', ['-selection', 'clipboard']],
            ['xsel', ['--clipboard', '--input']],
          ];
  for (const [cmd, args] of tries) {
    try {
      const r = spawnSync(cmd, args, { input: text, stdio: ['pipe', 'ignore', 'ignore'], shell: process.platform === 'win32' });
      if (r.status === 0) return true;
    } catch {
      // try the next tool
    }
  }
  return false;
}

/** Terminal preview drawn with half blocks. */
export function preview(spec, props = {}, width = 32) {
  const icon = resolve(spec, props);
  const sw = strokeWidth({ ...props, size: 24 });
  const variant = props.variant || parseSpec(typeof spec === 'string' ? spec : '').variant || 'outline';
  const { primary, secondary } = splitLayers(iconNodes(icon));
  const layers = solidLayers(icon);
  const strokes = [];
  for (const n of variant === 'solid' && layers ? layers.strokes : primary) strokes.push(...flattenNode(n, 0.2));
  const fills = [];
  if (variant === 'solid' && layers) for (const g of layers.groups) for (const n of g.fill) for (const p of flattenNode(n, 0.2)) if (p.closed) fills.push(p.points);
  if (variant === 'duotone' && secondary) for (const p of flattenNode(secondary, 0.2)) if (p.closed) fills.push(p.points);
  const on = (i, j) => {
    const pt = [((i + 0.5) / width) * 24, ((j + 0.5) / width) * 24];
    if (distToPolylines(pt, strokes) <= sw / 2 + 0.15) return true;
    let inside = false;
    for (const poly of fills) if (pointInPolygon(pt, poly)) inside = !inside;
    return inside;
  };
  const lines = [];
  for (let j = 0; j < width; j += 2) {
    let line = '';
    for (let i = 0; i < width; i++) {
      const a = on(i, j);
      const b = on(i, j + 1);
      line += a && b ? '█' : a ? '▀' : b ? '▄' : ' ';
    }
    lines.push(line.replace(/\s+$/, ''));
  }
  return lines.join('\n');
}

const slug = (spec) =>
  String(spec)
    .replace(/\+/g, '_')
    .replace(/&/g, '__')
    .replace(/[:@/]/g, '-');

const ident = (id) => id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');

function cssEscape(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => String.fromCharCode(92) + c);
}

const ANIM_CSS = `@keyframes gf-spin{to{transform:rotate(360deg)}}@keyframes gf-pulse{50%{transform:scale(.88);opacity:.5}}
.gf-spin{animation:gf-spin 1s linear infinite}.gf-pulse{animation:gf-pulse 1.5s cubic-bezier(.4,0,.6,1) infinite}
@media (prefers-reduced-motion:reduce){.gf-spin,.gf-pulse{animation:none}}`;

/** Builds a subset. Returns a map of relative file paths to contents. */
export function buildSubset(specs, { type = 'sprite', name = 'my-icons', props = {} } = {}) {
  const files = {};
  const items = specs.map((spec) => {
    const svg = toSvg(spec, { ...props, decorative: true });
    const node = renderIcon(resolve(spec, props), { ...props, decorative: true, variant: props.variant || parseSpec(spec).variant });
    return { spec, id: slug(spec), svg, node };
  });
  const symbol = ({ id, node }) => {
    const [, a, kids] = node;
    const keep = ['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'color'];
    const attrs = keep
      .filter((k) => a[k] !== undefined)
      .map((k) => ` ${k}="${a[k]}"`)
      .join('');
    return `<symbol id="gf-${id}"${attrs}>${nodesToString(kids)}</symbol>`;
  };
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg">\n${items.map(symbol).join('\n')}\n</svg>\n`;
  if (type === 'sprite') {
    files['sprite.svg'] = sprite;
  } else if (type === 'css') {
    const rules = items.map(({ spec, svg }) => {
      const url = toDataUri(svg.replace(/ class="[^"]*"/, '').replace(/ aria-hidden="true"/, ''));
      return `.gf-${cssEscape(spec)}{--gf-icon:url("${url}")}`;
    });
    files['glyphfox.css'] = `/* glyphfox subset: ${items.length} icons. Usage: <span class="gf gf-NAME"></span> */
.gf{display:inline-block;width:1em;height:1em;flex-shrink:0;vertical-align:-.125em;background-color:currentColor;-webkit-mask:var(--gf-icon) no-repeat center/100% 100%;mask:var(--gf-icon) no-repeat center/100% 100%}
${rules.join('\n')}
${ANIM_CSS}
`;
  } else if (type === 'package') {
    files['package.json'] =
      JSON.stringify(
        {
          name,
          version: '0.1.0',
          description: `${items.length} icons built with glyphfox`,
          type: 'module',
          main: './index.js',
          types: './index.d.ts',
          exports: { '.': { types: './index.d.ts', default: './index.js' }, './sprite.svg': './sprite.svg', './icons/*': './icons/*' },
          files: ['index.js', 'index.d.ts', 'sprite.svg', 'icons'],
          license: 'MIT',
          keywords: ['icons', 'svg', 'glyphfox'],
        },
        null,
        2,
      ) + '\n';
    files['index.js'] = `// Generated by glyphfox build. Each export is an SVG string.\n${items.map(({ spec, id, svg }) => `/** ${spec} */\nexport const ${ident(id)} = ${JSON.stringify(svg)};`).join('\n')}\n`;
    files['index.d.ts'] = items.map(({ id }) => `export declare const ${ident(id)}: string;`).join('\n') + '\n';
    files['sprite.svg'] = sprite;
    for (const { id, svg } of items) files[`icons/${id}.svg`] = svg + '\n';
    const first = items[0] ? ident(items[0].id) : 'icon';
    files['README.md'] = `# ${name}\n\n${items.length} icons built with [glyphfox](https://kwy404.github.io/glyphfox/).\n\n\`\`\`js\nimport { ${first} } from '${name}';\n\nelement.innerHTML = ${first};\n\`\`\`\n`;
  } else {
    throw new RangeError(`unknown build type "${type}" (use sprite, css or package)`);
  }
  return files;
}

function readNames(flags, positionals, io) {
  const names = [...positionals];
  if (flags.from) {
    const text = readFileSync(resolvePath(io.cwd, flags.from), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const t = line.replace(/#.*$/, '').trim();
      if (t) names.push(...t.split(/[\s,]+/));
    }
  }
  return names;
}

/** Runs the CLI and returns the exit code. io: { log, err, cwd, clipboard, tty } (tests). */
export async function main(argv = process.argv.slice(2), io = {}) {
  io = {
    log: (s) => process.stdout.write(s + '\n'),
    err: (s) => process.stderr.write(s + '\n'),
    cwd: process.cwd(),
    clipboard: copyToClipboard,
    tty: Boolean(process.stdout.isTTY),
    ...io,
  };
  const { positionals, flags } = parseArgs(argv);
  const [cmd, ...args] = positionals;
  if (flags.version) {
    io.log(pkg.version);
    return 0;
  }
  if (!cmd || flags.help || cmd === 'help') {
    io.log(HELP);
    return cmd || flags.help ? 0 : 1;
  }
  const props = propsFromFlags(flags);
  try {
    switch (cmd) {
      case 'search':
      case 'find': {
        const results = search(args.join(' '), { limit: flags.limit ? Number(flags.limit) : 30, category: flags.category });
        if (flags.json) io.log(JSON.stringify(results.map((r) => ({ name: r.name, categories: r.categories, tags: r.tags })), null, 2));
        else if (!results.length) io.err(`no icons match "${args.join(' ')}"`);
        else {
          const w = Math.max(...results.map((r) => r.name.length));
          for (const r of results) io.log(`${r.name.padEnd(w)}  ${r.categories.join(', ')}  ${r.tags.slice(0, 6).join(' ')}`);
        }
        return results.length ? 0 : 1;
      }
      case 'list': {
        const list = iconNames.filter((n) => !flags.category || getIcon(n).categories.includes(flags.category));
        io.log(flags.json ? JSON.stringify(list) : list.join('\n'));
        return 0;
      }
      case 'categories': {
        const counts = categories.map((c) => [c, iconNames.filter((n) => getIcon(n).categories.includes(c)).length]);
        io.log(flags.json ? JSON.stringify(Object.fromEntries(counts)) : counts.map(([c, k]) => `${c} (${k})`).join('\n'));
        return 0;
      }
      case 'show':
      case 'info': {
        const spec = args[0];
        if (!spec) throw new Error('usage: glyphfox show <spec>');
        const icon = resolve(spec, props);
        const svg = toSvg(spec, props);
        const comp = componentName(parseSpec(spec).names[0]);
        if (flags.json) {
          io.log(JSON.stringify({ name: icon.name, categories: icon.categories, tags: icon.tags, component: comp, svg }, null, 2));
          return 0;
        }
        io.log(icon.name);
        io.log(`categories  ${icon.categories.join(', ')}`);
        io.log(`tags        ${icon.tags.join(', ')}`);
        io.log(`component   ${comp}`);
        io.log('');
        io.log(preview(spec, props));
        io.log('');
        io.log(svg);
        return 0;
      }
      case 'copy':
      case 'get': {
        const spec = args[0];
        if (!spec) throw new Error('usage: glyphfox copy <spec> [--format svg]');
        const format = flags.format || 'svg';
        const text = snippet(format, spec, props, { svg: toSvg(spec, props), version: pkg.version });
        if (flags.out) out(text, flags, io);
        else io.log(text);
        if (!flags.print && !flags['no-clipboard'] && !flags.out && io.tty) {
          if (io.clipboard(text)) io.err(`copied ${spec} as ${format}`);
          else io.err('could not reach the clipboard (printed above)');
        }
        return 0;
      }
      case 'fuse': {
        if (args.length < 2) throw new Error('usage: glyphfox fuse <a> <b> [...] [--layout overlap]');
        const spec = args.join('&') + (flags.layout ? `:${flags.layout}` : '');
        const gap = flags.gap === undefined ? undefined : Number(flags.gap);
        const format = flags.format || 'svg';
        if (format === 'svg' && flags.canonical) out(canonicalSvg(resolve(spec, { ...props, gap }).body), flags, io);
        else out(snippet(format, spec, props, { svg: toSvg(spec, { ...props, gap }), version: pkg.version }), flags, io);
        return 0;
      }
      case 'morph': {
        if (args.length < 2) throw new Error('usage: glyphfox morph <from> <to> [--trigger hover]');
        out(toSvg(args[0], { trigger: 'hover', ...props, morphTo: args[1] }), flags, io);
        return 0;
      }
      case 'build': {
        const names = readNames(flags, args, io);
        if (!names.length) throw new Error('usage: glyphfox build <specs...> [--type sprite|css|package] [--out dir]');
        for (const n of names) resolve(n, props);
        const type = flags.type || 'sprite';
        const files = buildSubset(names, { type, name: flags.name || 'my-icons', props });
        const dir = resolvePath(io.cwd, flags.out || (type === 'package' ? flags.name || 'my-icons' : '.'));
        for (const [rel, text] of Object.entries(files)) {
          const file = join(dir, rel);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, text);
        }
        const k = Object.keys(files).length;
        io.err(`built ${names.length} icon${names.length === 1 ? '' : 's'} as ${type} in ${flags.out || '.'} (${k} file${k === 1 ? '' : 's'})`);
        return 0;
      }
      case 'lint': {
        if (!args.length) throw new Error('usage: glyphfox lint <file.svg...>');
        let bad = 0;
        for (const f of args) {
          const problems = lintSvg(readFileSync(resolvePath(io.cwd, f), 'utf8'));
          for (const p of problems) io.log(`${f}: [${p.rule}] ${p.message}`);
          if (problems.length) bad++;
        }
        io.log(`${args.length} file${args.length === 1 ? '' : 's'} checked, ${bad} with problems`);
        return bad ? 1 : 0;
      }
      case 'foxify': {
        const f = args[0];
        if (!f || !existsSync(resolvePath(io.cwd, f))) throw new Error('usage: glyphfox foxify <file.svg> [--out file]');
        const r = foxify(readFileSync(resolvePath(io.cwd, f), 'utf8'), { snap: flags.snap ? Number(flags.snap) : undefined, fit: flags.fit });
        for (const n of r.notes) io.err(n);
        for (const p of r.problems) io.err(`[${p.rule}] ${p.message}`);
        out(r.svg, flags, io);
        return r.problems.length ? 1 : 0;
      }
      default:
        io.err(`unknown command "${cmd}"\n`);
        io.log(HELP);
        return 1;
    }
  } catch (err) {
    io.err(`glyphfox: ${err.message}`);
    return 1;
  }
}
