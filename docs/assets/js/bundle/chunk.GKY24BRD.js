import{a as M,d as F}from"./chunk.EAZGDD3S.js";import{j,o as m,p as k,q as v,t as l,u as x,x as E,z as T}from"./chunk.XVXU2NDV.js";var N={seed:"#7c5cff",bg:"#14112b",weight:2,corners:"round",variant:"outline",mark:"star",name:"@acme/icons"},V={favicon:{radius:.22,pad:.1},touch:{radius:0,pad:.18},app:{radius:.22,pad:.18},maskable:{radius:0,pad:.26},store:{radius:0,pad:.2},foreground:{radius:0,pad:.3,transparent:!0}},J=[["favicon/favicon-16.png","favicon",16],["favicon/favicon-32.png","favicon",32],["favicon/apple-touch-icon.png","touch",180],["favicon/icon-192.png","app",192],["favicon/icon-512.png","app",512],["favicon/icon-maskable-192.png","maskable",192],["favicon/icon-maskable-512.png","maskable",512],["app/app-store-1024.png","store",1024],["app/play-store-512.png","store",512],["app/android-foreground-432.png","foreground",432]],_=[16,32,48],K=`MIT License

Copyright (c) 2026 Alexandre Kohler

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;function D(e,n,o){let t=i=>[1,3,5].map(p=>parseInt(i.slice(p,p+2),16)),r=t(e),a=t(n);return"#"+r.map((i,p)=>Math.round(i+(a[p]-i)*o).toString(16).padStart(2,"0")).join("")}function w(e){return{color:e.seed,secondary:D(e.seed,"#ffffff",.35),mark:D(e.seed,"#ffffff",.15),surface:e.bg}}function $(e,n={}){let o=w(e);return{weight:e.weight,corners:e.corners,variant:e.variant,color:o.color,secondaryColor:o.secondary,...n}}function I(e){return String(e).replace(/^@[^/]+\//,"").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"")||"icons"}function R(e){let n=/^@([^/]+)\//.exec(String(e));return(n?n[1]:I(e)).toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"")||"icons"}function S(e){return"icon"+e.split("-").map(n=>n[0].toUpperCase()+n.slice(1)).join("")}function O(e){return e.replace(/^<svg([^>]*)>/,(n,o)=>`<svg${o.replace(/\s(?:class|aria-hidden)="[^"]*"/g,"")}>`)}function d(e,n,o,t){let r=V[o],a=w(n),i=Math.round(t*r.pad*100)/100,p=Math.round((t-i*2)*100)/100,s=O(e(n.mark,$(n,{size:p,color:r.transparent?a.color:a.mark}))),u=r.transparent?"":`<rect width="${t}" height="${t}" rx="${Math.round(t*r.radius*100)/100}" fill="${a.surface}"/>`;return`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 ${t} ${t}">${u}<g transform="translate(${i} ${i})">${s}</g></svg>`}function z(e){let n=6+e.length*16,o=new Uint8Array(n+e.reduce((a,i)=>a+i.data.length,0)),t=new DataView(o.buffer);t.setUint16(2,1,!0),t.setUint16(4,e.length,!0);let r=n;return e.forEach(({size:a,data:i},p)=>{let s=6+p*16;t.setUint8(s,a>=256?0:a),t.setUint8(s+1,a>=256?0:a),t.setUint16(s+4,1,!0),t.setUint16(s+6,32,!0),t.setUint32(s+8,i.length,!0),t.setUint32(s+12,r,!0),o.set(i,r),r+=i.length}),o}function L(e,n,o){let t=R(n.name),r=w(n);return`<svg xmlns="http://www.w3.org/2000/svg">
${o.map(i=>{let p=O(e(i,$(n))),s=/^<svg([^>]*)>/.exec(p)[1],u=["viewBox","fill","stroke","stroke-width","stroke-linecap","stroke-linejoin"].map(b=>{let c=new RegExp(`\\s${b}="([^"]*)"`).exec(s);return c?` ${b}="${c[1]}"`:""}).join(""),y=p.replace(/^<svg[^>]*>/,"").replace(/<\/svg>$/,"").replace(/(<g class="gf-secondary[^"]*"[^>]*?) color="([^"]*)"/,`$1 style="color:var(--${t}-secondary,$2)"`);return`<symbol id="${i}"${u} style="color:var(--${t}-color,${r.color})">${y}</symbol>`}).join(`
`)}
</svg>
`}function U(e,n,o){let t=R(n.name),r=w(n),a=o.map(i=>{let p=O(e(i,$(n,{color:"#000",secondaryColor:"#000"}))).replace(/\scolor="[^"]*"/g,"");return`.${t}-icon-${i}{--${t}-glyph:url("${j(p)}")}`});return`/* ${n.name}: ${o.length} icons themed with the glyphfox brand kit (weight ${n.weight}, ${n.corners} corners, ${n.variant}). */
:root {
  --${t}-color: ${r.color};
  --${t}-secondary: ${r.secondary};
  --${t}-mark: ${r.mark};
  --${t}-surface: ${r.surface};
  --${t}-icon-size: 1em;
}
.${t}-icon {
  display: inline-block;
  width: var(--${t}-icon-size);
  height: var(--${t}-icon-size);
  flex-shrink: 0;
  vertical-align: -0.125em;
  background-color: var(--${t}-color);
  -webkit-mask: var(--${t}-glyph) no-repeat center / 100% 100%;
  mask: var(--${t}-glyph) no-repeat center / 100% 100%;
}
${a.join(`
`)}
`}function q(e){let n=w(e),o=(t,r,a)=>({src:t,sizes:`${r}x${r}`,type:"image/png",...a?{purpose:a}:{}});return{name:e.name,icons:[o("icon-192.png",192),o("icon-512.png",512),o("icon-maskable-192.png",192,"maskable"),o("icon-maskable-512.png",512,"maskable")],theme_color:n.color,background_color:n.surface,display:"standalone"}}function X(e,n,o){return{name:e.name,version:"0.1.0",description:`${n} brand icons themed with the glyphfox brand kit`,license:"MIT",type:"module",main:"./index.js",types:"./index.d.ts",exports:{".":{types:"./index.d.ts",default:"./index.js"},"./sprite.svg":"./sprite.svg","./icons.css":"./icons.css","./svg/*":"./svg/*","./favicon/*":"./favicon/*","./app/*":"./app/*","./package.json":"./package.json"},files:["index.js","index.d.ts","sprite.svg","icons.css","svg","favicon","app"],sideEffects:["*.css"],keywords:["icons","svg","brand","glyphfox"],glyphfox:{version:o,seed:e.seed,background:e.bg,weight:e.weight,corners:e.corners,variant:e.variant,mark:e.mark}}}function Z(e,n){let o=R(e.name),t=n.includes("heart")?"heart":n[0];return`# ${e.name}

${n.length} icons from [glyphfox](https://kwy404.github.io/glyphfox/) themed for the brand: color \`${e.seed}\`, weight ${e.weight}, ${e.corners} corners, ${e.variant} style.

## Files

- \`svg/\`: every icon as a themed SVG file
- \`sprite.svg\`: one symbol per icon, \`<svg><use href="sprite.svg#${t}"/></svg>\`
- \`icons.css\`: the brand variables and a mask class per icon
- \`favicon/\`: favicon.ico, favicon.svg, PNG favicons, the apple touch icon, app icons and the web manifest (see head.html)
- \`app/\`: store icons (1024 and 512) and an Android adaptive icon foreground

## Use

\`\`\`js
import { ${S(t)} } from '${e.name}';

button.innerHTML = ${S(t)};
\`\`\`

\`\`\`html
<link rel="stylesheet" href="node_modules/${e.name}/icons.css">
<span class="${o}-icon ${o}-icon-${t}"></span>
\`\`\`

Override \`--${o}-color\`, \`--${o}-secondary\` and \`--${o}-icon-size\` to adjust the theme in CSS; the sprite reads the same variables.
`}var Q=`<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
`;async function P({names:e,settings:n,render:o,png:t,version:r=""}){if(!e.length)throw new Error("the brand kit needs at least one icon");let a={...N,...n};e.includes(a.mark)||(a.mark=e[0]);let i=`${I(a.name)}/`,p=[],s=(c,f)=>p.push({name:i+c,data:f}),u=e.map(c=>[c,O(o(c,$(a)))]);s("package.json",JSON.stringify(X(a,e.length,r),null,2)+`
`),s("README.md",Z(a,e)),s("LICENSE",`The icons in this package come from glyphfox (https://github.com/kwy404/glyphfox) and are used under its license:

${K}`),s("index.js",`// ${a.name}: brand icons as SVG strings.
${u.map(([c,f])=>`export const ${S(c)} = ${JSON.stringify(f)};`).join(`
`)}
`),s("index.d.ts",u.map(([c])=>`export declare const ${S(c)}: string;`).join(`
`)+`
`),s("sprite.svg",L(o,a,e)),s("icons.css",U(o,a,e));for(let[c,f]of u)s(`svg/${c}.svg`,f+`
`);let y=new Map;for(let[c,f,A]of J){let H=await t(d(o,a,f,A),A);y.set(`${f}:${A}`,H),s(c,H)}let b=[];for(let c of _)b.push({size:c,data:y.get(`favicon:${c}`)||await t(d(o,a,"favicon",c),c)});return s("favicon/favicon.ico",z(b)),s("favicon/favicon.svg",d(o,a,"favicon",32)+`
`),s("favicon/manifest.webmanifest",JSON.stringify(q(a),null,2)+`
`),s("favicon/head.html",Q),p}var g={...N},h=[],G="",C=0,W=()=>({...g,mark:x(g.mark)?g.mark:h[0]});async function ee(e,n){let o=await M(e,n,n),t=await new Promise((r,a)=>o.toBlob(i=>i?r(i):a(new Error("could not encode a PNG")),"image/png"));return new Uint8Array(await t.arrayBuffer())}function Y(){C=0;let e=W();m("[data-br-grid]").innerHTML=h.map(o=>`<div title="${o}">${l(o,$(e,{size:28}))}</div>`).join(""),m("[data-br-count]").textContent=v("brand.count",{n:h.length});let n=[[v("brand.favicon16"),d(l,e,"favicon",16)],["32",d(l,e,"favicon",32)],["180",d(l,e,"touch",180).replace(/width="180" height="180"/,'width="72" height="72"')],["192",d(l,e,"app",192).replace(/width="192" height="192"/,'width="72" height="72"')],[v("brand.maskable"),d(l,e,"maskable",192).replace(/width="192" height="192"/,'width="72" height="72" class="br-maskable"')]];m("[data-br-marks]").innerHTML=n.map(([o,t])=>`<figure>${t}<figcaption>${o}</figcaption></figure>`).join("")}var B=()=>{C||(C=requestAnimationFrame(Y))};async function ne(e){let n=W(),o=I(n.name);if(e==="sprite")return T(L(l,n,h),`${o}-sprite.svg`,"image/svg+xml");if(e==="css")return T(U(l,n,h),`${o}.css`,"text/css");E(v("brand.building"));let t=await P({names:h,settings:n,render:l,png:ee,version:G});T(F(t),`${o}-brand-kit.zip`,"application/zip")}function se(e){h=e.icons.map(n=>n.name),G=e.version||"",x(g.mark)||(g.mark=x("heart")?"heart":h[0]),m('[data-br="mark"]').value=g.mark;for(let n of k("[data-br]"))n.addEventListener("input",()=>{let o=n.dataset.br;g[o]=n.type==="range"?Number(n.value):n.value;let t=m(`[data-br-o="${o}"]`);t&&(t.textContent=n.value),B()});for(let n of k("[data-br-seg]"))n.addEventListener("click",o=>{let t=o.target.closest("button");if(t){for(let r of k("button",n))r.setAttribute("aria-pressed",String(r===t));g[n.dataset.brSeg]=t.value,B()}});for(let n of k("[data-br-dl]"))n.addEventListener("click",async()=>{try{n.disabled=!0,await ne(n.dataset.brDl),E(v("toast.downloaded"))}catch(o){E(o.message)}finally{n.disabled=!1}});Y()}export{se as initBrand,ee as pngBytes};
