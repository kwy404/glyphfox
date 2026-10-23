import{a as k,d as b}from"./chunk.TYEFTYRG.js";import{c as x,g as f,h as g,i as $,l as y,m as h,p as v,r as p}from"./chunk.FOUL5M6U.js";var t={seed:"#7c5cff",bg:"#14112b",weight:2,corners:"round",variant:"outline",mark:"star",name:"@acme/icons"},s=[];function B(e,n,r){let i=o=>[1,3,5].map(u=>parseInt(o.slice(u,u+2),16)),a=i(e),l=i(n);return"#"+a.map((o,u)=>Math.round(o+(l[u]-o)*r).toString(16).padStart(2,"0")).join("")}function E(e={}){return{weight:t.weight,corners:t.corners,variant:t.variant,color:t.seed,secondaryColor:B(t.seed,"#ffffff",.35),...e}}function m(e,n){return y(e,E(n))}function S(){return h(t.mark)?t.mark:s[0].name}function c(e,{maskable:n=!1}={}){let r=n?e*.24:e*.18,i=m(S(),{size:e-r*2,color:B(t.seed,"#ffffff",.15)}),a=n?0:e*.22;return`<svg xmlns="http://www.w3.org/2000/svg" width="${e}" height="${e}" viewBox="0 0 ${e} ${e}"><rect width="${e}" height="${e}" rx="${a}" fill="${t.bg}"/><g transform="translate(${r} ${r})">${i}</g></svg>`}function w(){let e=f("[data-br-grid]");e.innerHTML=s.slice(0,96).map(n=>`<div title="${n.name}">${m(n.name,{size:28})}</div>`).join(""),f("[data-br-marks]").innerHTML=[[$("brand.favicon16"),c(16).replace(/rx="[^"]*"/,'rx="3"')],["32",c(32)],["180",c(96)],[$("brand.maskable"),c(96,{maskable:!0}).replace("<rect ",'<rect rx="48" ')]].map(([n,r])=>`<figure>${r}<figcaption>${n}</figcaption></figure>`).join("")}async function d(e,n){let r=await k(e,n,n),i=await new Promise(a=>r.toBlob(a,"image/png"));return new Uint8Array(await i.arrayBuffer())}function A(e){let n=new DataView(new ArrayBuffer(6+e.length*16));n.setUint16(2,1,!0),n.setUint16(4,e.length,!0);let r=6+e.length*16;return e.forEach(({size:i,data:a},l)=>{let o=6+l*16;n.setUint8(o,i>=256?0:i),n.setUint8(o+1,i>=256?0:i),n.setUint16(o+4,1,!0),n.setUint16(o+6,32,!0),n.setUint32(o+8,a.length,!0),n.setUint32(o+12,r,!0),r+=a.length}),new Blob([new Uint8Array(n.buffer),...e.map(i=>i.data)],{type:"image/x-icon"})}function j(){let e=s.map(n=>`.icon-${n.name}{--icon:url("${x.toDataUri(m(n.name,{color:void 0,secondaryColor:void 0}).replace(/ class="[^"]*"/,"").replace(/ aria-hidden="true"/,""))}")}`);return`/* ${t.name} icons, built with the glyphfox brand kit */
:root{--brand:${t.seed}}
.icon{display:inline-block;width:1em;height:1em;flex-shrink:0;vertical-align:-.125em;background-color:var(--brand,currentColor);-webkit-mask:var(--icon) no-repeat center/100% 100%;mask:var(--icon) no-repeat center/100% 100%}
${e.join(`
`)}
`}function U(){return`<svg xmlns="http://www.w3.org/2000/svg">
${s.map(e=>{let n=m(e.name),r=n.replace(/^<svg[^>]*>/,"").replace(/<\/svg>$/,""),i=["viewBox","fill","stroke","stroke-width","stroke-linecap","stroke-linejoin","color"].map(a=>{let l=new RegExp(`\\s${a}="([^"]*)"`).exec(n.slice(0,n.indexOf(">")));return l?` ${a}="${l[1]}"`:""});return`<symbol id="${e.name}"${i.join("")}>${r}</symbol>`}).join(`
`)}
</svg>
`}async function M(e){let n=t.name.replace(/^@[^/]+\//,"").replace(/[^a-z0-9-]+/gi,"-")||"icons";if(e==="sprite")return p(U(),`${n}-sprite.svg`,"image/svg+xml");if(e==="css")return p(j(),`${n}.css`,"text/css");if(e==="favicon"){let a=c(16).replace(/rx="[^"]*"/,'rx="3"'),l=A([{size:16,data:await d(a,16)},{size:32,data:await d(c(32),32)},{size:48,data:await d(c(48),48)}]),o=[{name:"favicon.svg",data:c(32)},{name:"favicon.ico",data:new Uint8Array(await l.arrayBuffer())},{name:"README.txt",data:`<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
`}];return p(b(o),`${n}-favicon.zip`,"application/zip")}if(e==="app"){let a=[{name:"apple-touch-icon.png",data:await d(c(180).replace(/rx="[^"]*"/,'rx="0"'),180)},{name:"icon-192.png",data:await d(c(192),192)},{name:"icon-512.png",data:await d(c(512),512)},{name:"icon-maskable-512.png",data:await d(c(512,{maskable:!0}),512)},{name:"manifest.webmanifest",data:JSON.stringify({icons:[{src:"icon-192.png",sizes:"192x192",type:"image/png"},{src:"icon-512.png",sizes:"512x512",type:"image/png"},{src:"icon-maskable-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}],theme_color:t.bg,background_color:t.bg},null,2)+`
`}];return p(b(a),`${n}-app-icons.zip`,"application/zip")}let r=a=>"icon"+a.split("-").map(l=>l[0].toUpperCase()+l.slice(1)).join(""),i=[{name:"package.json",data:JSON.stringify({name:t.name,version:"1.0.0",description:`${s.length} brand icons themed with the glyphfox brand kit`,type:"module",main:"./index.js",types:"./index.d.ts",exports:{".":{types:"./index.d.ts",default:"./index.js"},"./sprite.svg":"./sprite.svg","./icons.css":"./icons.css","./icons/*":"./icons/*"},files:["index.js","index.d.ts","sprite.svg","icons.css","icons"],license:"MIT",keywords:["icons","svg","glyphfox"]},null,2)+`
`},{name:"index.js",data:`// Brand icons as SVG strings (color ${t.seed}, weight ${t.weight}, ${t.corners} corners, ${t.variant}).
${s.map(a=>`export const ${r(a.name)} = ${JSON.stringify(m(a.name))};`).join(`
`)}
`},{name:"index.d.ts",data:s.map(a=>`export declare const ${r(a.name)}: string;`).join(`
`)+`
`},{name:"sprite.svg",data:U()},{name:"icons.css",data:j()},{name:"README.md",data:`# ${t.name}

${s.length} icons from [glyphfox](https://kwy404.github.io/glyphfox/) themed for the brand: color \`${t.seed}\`, weight ${t.weight}, ${t.corners} corners, ${t.variant} style.

\`\`\`js
import { ${r(s[0].name)} } from '${t.name}';

button.innerHTML = ${r(s[0].name)};
\`\`\`

\`\`\`html
<link rel="stylesheet" href="node_modules/${t.name}/icons.css">
<span class="icon icon-${s[0].name}"></span>
\`\`\`
`},...s.map(a=>({name:`icons/${a.name}.svg`,data:m(a.name)+`
`}))];p(b(i),`${n}-brand-kit.zip`,"application/zip")}function D(e){s=e.icons,h(t.mark)||(t.mark=h("heart")?"heart":s[0].name),f('[data-br="mark"]').value=t.mark;for(let n of g("[data-br]"))n.addEventListener("input",()=>{let r=n.dataset.br;t[r]=n.type==="range"?Number(n.value):n.value;let i=f(`[data-br-o="${r}"]`);i&&(i.textContent=n.value),w()});for(let n of g("[data-br-seg]"))n.addEventListener("click",r=>{let i=r.target.closest("button");if(i){for(let a of g("button",n))a.setAttribute("aria-pressed",String(a===i));t[n.dataset.brSeg]=i.value,w()}});for(let n of g("[data-br-dl]"))n.addEventListener("click",async()=>{try{n.disabled=!0,await M(n.dataset.brDl),v($("toast.downloaded"))}catch(r){v(r.message)}finally{n.disabled=!1}});w()}export{D as initBrand};
