import{d as a}from"./chunk.JA4DXUXM.js";import{k as d}from"./chunk.EXWUTZMF.js";var l="gf-collection",c=new Set;function i(){try{let e=JSON.parse(localStorage.getItem(l)||"[]");return Array.isArray(e)?e.filter(n=>n&&typeof n.body=="string"&&n.name):[]}catch{return[]}}function f(e){try{localStorage.setItem(l,JSON.stringify(e))}catch{}for(let n of c)n(e)}function $(e){return c.add(e),()=>c.delete(e)}function m(e){return String(e||"icon").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"icon"}function v(e){let n=i(),o=Date.now(),s={id:e.id||`i${o.toString(36)}${Math.random().toString(36).slice(2,6)}`,name:m(e.name),body:e.body,tags:e.tags||[],categories:e.categories&&e.categories.length?e.categories:["shapes"],source:e.source||"editor",updated:o},r=n.findIndex(t=>t.id===s.id);return r>=0?n[r]=s:n.unshift(s),f(n),s}function w(e){f(i().filter(n=>n.id!==e))}function S(e){return i().find(n=>n.id===e)||null}function p(e){let n=new Map;return e.map(o=>{let s=n.get(o.name)||0;return n.set(o.name,s+1),{...o,file:s?`${o.name}-${s+1}`:o.name}})}function u(e){return d.canonicalSvg(e.body)}function j(e=i()){return a(p(e).map(n=>({name:`icons/${n.file}.svg`,data:u(n)})))}function h(e=i()){return`<svg xmlns="http://www.w3.org/2000/svg">
${p(e).map(n=>`<symbol id="gf-${n.file}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${n.body}</symbol>`).join(`
`)}
</svg>
`}function b(e=i(),n="my-glyphfox-icons"){let o=p(e),s=[];s.push({name:"package.json",data:JSON.stringify({name:n,version:"0.1.0",description:`${o.length} icons drawn with the glyphfox studio`,type:"module",main:"./index.js",types:"./index.d.ts",exports:{".":{types:"./index.d.ts",default:"./index.js"},"./sprite.svg":"./sprite.svg","./icons/*":"./icons/*"},files:["index.js","index.d.ts","sprite.svg","icons","icons.json"],keywords:["icons","svg","glyphfox"],license:"MIT",peerDependencies:{glyphfox:">=1.0.0"},peerDependenciesMeta:{glyphfox:{optional:!0}}},null,2)+`
`});let r=t=>"icon"+t.split("-").map(g=>g[0].toUpperCase()+g.slice(1)).join("").replace(/[^A-Za-z0-9]/g,"");s.push({name:"index.js",data:`// Icon data in the glyphfox format. Render with toSvg from glyphfox:
//   import { renderToString } from 'glyphfox/core';
${o.map(t=>`export const ${r(t.file)} = ${JSON.stringify({name:t.file,body:t.body,tags:t.tags,categories:t.categories})};`).join(`
`)}
`}),s.push({name:"index.d.ts",data:`import type { IconData } from 'glyphfox';
${o.map(t=>`export declare const ${r(t.file)}: IconData;`).join(`
`)}
`}),s.push({name:"icons.json",data:JSON.stringify(Object.fromEntries(o.map(t=>[t.file,{body:t.body,tags:t.tags,categories:t.categories}])),null,2)+`
`}),s.push({name:"sprite.svg",data:h(e)});for(let t of o)s.push({name:`icons/${t.file}.svg`,data:u(t)}),s.push({name:`icons/${t.file}.json`,data:JSON.stringify({categories:t.categories,tags:t.tags},null,2)+`
`});return s.push({name:"README.md",data:`# ${n}

${o.length} icons drawn with the [glyphfox studio](https://kwy404.github.io/glyphfox/studio.html), in the glyphfox format (24 grid, stroke 2, round joins).

\`\`\`js
import { renderToString } from 'glyphfox/core';
import { ${o[0]?r(o[0].file):"iconName"} } from '${n}';

el.innerHTML = renderToString(${o[0]?r(o[0].file):"iconName"}, { size: 24, weight: 1.5 });
\`\`\`
`}),a(s)}export{i as a,$ as b,m as c,v as d,w as e,S as f,u as g,j as h,h as i,b as j};
