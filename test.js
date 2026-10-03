const E=require('./www/engine.js');
let bad=0;
const hexRe=/^#[0-9A-F]{6}$/;
function check(res,label){
  if(res.categories.length!==3) {console.log(label,'cats');bad++}
  res.categories.forEach(c=>{ if(c.items.length<3){console.log(label,c.id,'few');bad++}
    c.items.forEach(i=>{ if(!hexRe.test(i.hex)||!i.name||!i.why||!i.pieces.length||!i.shoes){console.log(label,c.id,JSON.stringify(i));bad++}})});
  if(res.avoid.length<3||res.avoid.some(a=>!hexRe.test(a.hex))){console.log(label,'avoid',JSON.stringify(res.avoid));bad++}
}
for(const k of Object.keys(E.BOTTOMS)) for(const g of E.GARMENTS) for(const f of E.FORMALITY) check(E.recommend({bottomKey:k,garment:g,formality:f}),k+g+f);
for(const h of ['#6B7040','#FFFFFF','#000000','#808080','#ff0000','#1f2a44','5C3A21','#C2B280']) check(E.recommend({customHex:h,garment:'Chinos',formality:'Smart Casual'}),'custom '+h);
console.log(JSON.stringify(E.recommend({customHex:'#6B7040',garment:'Chinos',formality:'Relaxed Casual'}).categories[2].items[0]));
console.log(E.normHex('zzz'), E.normHex('abc123'));
console.log(bad?('FAIL '+bad):'ALL OK');
// new feature checks
const P={skin:'tan',undertone:'warm',hair:'grey'};
for(const k of Object.keys(E.BOTTOMS)) for(const s of ['any','summer','autumn','winter','spring']) for(const c of ['hot','mild','cool']) check(E.recommend({bottomKey:k,garment:'Jeans',formality:'Relaxed Casual',profile:P,season:s,climate:c}),'prof '+k+s+c);
for(const t of E.TOPS){const r=E.recommendBottoms({topHex:t.hex,topName:t.name,garment:'Chinos',formality:'Smart Casual',profile:P,season:'winter',climate:'cool'}); const n=r.groups.reduce((a,g)=>a+g.items.length,0); if(n!==9){console.log('tops-first count',t.name,n);bad++}}
for(const h of ['#000000','#FFFFFF','#FF00FF','#808080','#6B7040']){const r=E.recommendBottoms({topHex:h,garment:'Chinos',formality:'Relaxed Casual'}); if(!r.groups.length){console.log('no groups',h);bad++}}
const wm=E.wardrobeMatches({tops:[{name:'a',hex:'#F7F7F4'},{name:'b',hex:'#39FF14'}],bottoms:[{name:'x',hex:'#6B7040'},{name:'y',hex:'#123456'}]},P,'any');
if(wm.length!==2||wm.some(m=>m.matches.length!==2)){console.log('wardrobe shape');bad++}
if(wm[0].matches[0].top.name!=='a'){console.log('wardrobe order');bad++}
console.log(bad?('FAIL2 '+bad):'ALL OK 2');
