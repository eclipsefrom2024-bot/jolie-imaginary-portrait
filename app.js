const svgNS = "http://www.w3.org/2000/svg";
const artboard = document.getElementById("artboard");
const portraitLayer = document.getElementById("portraitLayer");
const decorationLayer = document.getElementById("decorationLayer");
const bg = document.getElementById("bg");
const selectionBox = document.getElementById("selectionBox");
const selectionRect = document.getElementById("selectionRect");
const assetGrid = document.getElementById("assetGrid");
const assetTemplate = document.getElementById("assetTemplate");

const COLORS = ["#F7F2E8","#F7D6D0","#D7E9EA","#E5DEB4","#D8C5E5","#F6C970","#C8DFB5","#F4B89D","#D8D2CA"];
const palette = ["#1B6F7A","#D65454","#E5A63F","#4E8D63","#6C4A86","#0F3057","#E99EBA","#E7E1D2","#1C1A18"];

let selected = null;
let activeTab = "faces";
let dragging = false;
let dragStart = null;
let undoStack = [];

function el(name, attrs={}, parent=null){
  const node = document.createElementNS(svgNS,name);
  Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));
  if(parent) parent.appendChild(node);
  return node;
}
function toSvg(str){
  const wrap = document.createElementNS(svgNS, "g");
  wrap.innerHTML = str.trim();
  return wrap;
}
function svgDataUri(markup){
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
}
function viewBoxGroup(content){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${content}</svg>`;
}
function shape(contents, name, layer="portrait"){
  return {name, contents, layer};
}

// Original decorative assets. They are intentionally generic and do not copy any particular artwork.
const ASSETS = {
  faces: [
    shape(`<path d="M48 32 C88 0 170 14 194 58 C218 102 192 204 126 214 C66 222 26 170 34 100 C36 70 38 48 48 32Z" fill="#F6C970" stroke="#1C1A18" stroke-width="8"/><path d="M118 27 L115 216" stroke="#1C1A18" stroke-width="8"/>`, "太陽臉"),
    shape(`<path d="M51 25 L191 40 L210 151 L146 216 L42 178 L26 84 Z" fill="#D7E9EA" stroke="#1C1A18" stroke-width="8"/><path d="M36 86 L204 149 M116 30 L145 212" stroke="#1C1A18" stroke-width="8"/>`, "切面臉"),
    shape(`<path d="M41 49 Q122 -4 201 50 Q231 109 192 181 Q135 235 65 190 Q1 134 41 49Z" fill="#F4B89D" stroke="#1C1A18" stroke-width="8"/><circle cx="72" cy="68" r="18" fill="#D65454" stroke="#1C1A18" stroke-width="6"/>`, "雲朵臉"),
  ],
  eyes: [
    shape(`<path d="M28 118 Q95 45 205 115 Q116 184 28 118Z" fill="#fff" stroke="#1C1A18" stroke-width="9"/><circle cx="117" cy="116" r="33" fill="#1B6F7A" stroke="#1C1A18" stroke-width="8"/><circle cx="117" cy="116" r="11" fill="#1C1A18"/>`, "圓眼"),
    shape(`<path d="M28 120 Q116 50 205 120 Q118 175 28 120Z" fill="#fff" stroke="#1C1A18" stroke-width="9"/><path d="M55 80 L28 44 M85 68 L72 26 M118 66 L118 20 M151 70 L172 26 M181 84 L209 47" stroke="#1C1A18" stroke-width="8" stroke-linecap="round"/><path d="M84 120 Q116 94 151 120 Q118 147 84 120Z" fill="#E5A63F" stroke="#1C1A18" stroke-width="7"/>`, "睫毛眼"),
    shape(`<path d="M33 132 Q116 60 202 126" fill="none" stroke="#1C1A18" stroke-width="13" stroke-linecap="round"/><path d="M52 147 Q115 181 190 145" fill="none" stroke="#D65454" stroke-width="9" stroke-linecap="round"/>`, "閉眼"),
    shape(`<path d="M35 60 L202 60 L126 208 Z" fill="#fff" stroke="#1C1A18" stroke-width="8"/><circle cx="122" cy="109" r="30" fill="#6C4A86" stroke="#1C1A18" stroke-width="7"/>`, "三角眼"),
  ],
  features: [
    shape(`<path d="M108 22 L170 177 L101 208 L66 170 L111 118 L55 102 Z" fill="#E5A63F" stroke="#1C1A18" stroke-width="8"/>`, "幾何鼻"),
    shape(`<path d="M48 121 Q122 15 198 111 Q173 189 115 199 Q55 182 48 121Z" fill="#D7E9EA" stroke="#1C1A18" stroke-width="8"/><path d="M96 116 Q122 84 153 116" fill="none" stroke="#1C1A18" stroke-width="8"/>`, "側鼻"),
    shape(`<path d="M31 112 Q93 68 122 107 Q159 55 211 108 Q156 183 120 184 Q77 177 31 112Z" fill="#D65454" stroke="#1C1A18" stroke-width="8"/><path d="M48 112 Q117 135 194 108" fill="none" stroke="#1C1A18" stroke-width="8"/>`, "紅嘴"),
    shape(`<path d="M33 116 Q110 38 205 112 Q124 191 33 116Z" fill="#F6C970" stroke="#1C1A18" stroke-width="8"/><path d="M68 123 Q119 151 175 118" fill="none" stroke="#1C1A18" stroke-width="8"/>`, "微笑嘴"),
  ],
  style: [
    shape(`<path d="M20 165 Q88 30 205 75 L219 131 Q126 94 29 218Z" fill="#0F3057" stroke="#1C1A18" stroke-width="8"/><path d="M46 160 L200 96 M37 191 L201 129" stroke="#F6C970" stroke-width="10"/>`, "斜帽"),
    shape(`<path d="M22 112 Q112 13 214 101 L199 150 Q111 104 39 165Z" fill="#D65454" stroke="#1C1A18" stroke-width="8"/><circle cx="161" cy="69" r="27" fill="#F6C970" stroke="#1C1A18" stroke-width="7"/>`, "圓帽"),
    shape(`<path d="M113 15 C52 47 52 107 73 145 C91 177 48 210 19 221" fill="none" stroke="#1C1A18" stroke-width="16" stroke-linecap="round"/><path d="M121 16 C188 44 183 116 158 144 C136 171 184 206 218 221" fill="none" stroke="#1C1A18" stroke-width="16" stroke-linecap="round"/><path d="M82 50 Q117 15 159 48" fill="none" stroke="#6C4A86" stroke-width="20" stroke-linecap="round"/>`, "波浪髮"),
    shape(`<circle cx="91" cy="65" r="33" fill="#F7D6D0" stroke="#1C1A18" stroke-width="8"/><path d="M91 99 L91 204" stroke="#1C1A18" stroke-width="8"/><path d="M58 140 L91 175 L125 140" fill="#E5A63F" stroke="#1C1A18" stroke-width="8"/>`, "吊墜耳環"),
  ],
  decor: [
    shape(`<path d="M121 23 C140 66 187 72 207 110 C174 125 161 160 168 207 C129 194 90 205 59 216 C72 176 52 142 25 114 C62 88 79 53 82 24 C99 49 106 53 121 23Z" fill="#E99EBA" stroke="#1C1A18" stroke-width="8"/><circle cx="118" cy="120" r="25" fill="#F6C970" stroke="#1C1A18" stroke-width="8"/>`, "花朵"),
    shape(`<path d="M34 76 Q111 12 205 77 Q138 139 38 207 Q3 141 34 76Z" fill="#fff" stroke="#1C1A18" stroke-width="8"/><path d="M52 78 L193 78 M40 110 L178 110 M37 145 L151 145 M45 178 L117 178" stroke="#1B6F7A" stroke-width="13"/><circle cx="174" cy="158" r="24" fill="#D65454" stroke="#1C1A18" stroke-width="7"/>`, "瓷器紋樣"),
    shape(`<path d="M36 214 L78 27 L132 111 L196 30 L213 213Z" fill="#D8C5E5" stroke="#1C1A18" stroke-width="8"/><path d="M65 177 L90 133 L116 177 L142 132 L167 177" fill="none" stroke="#1C1A18" stroke-width="10"/>`, "幾何山"),
    shape(`<circle cx="120" cy="120" r="86" fill="none" stroke="#1C1A18" stroke-width="8"/><path d="M61 120 Q120 50 179 120 Q120 191 61 120Z" fill="#F6C970" stroke="#1C1A18" stroke-width="8"/><circle cx="120" cy="120" r="28" fill="#1B6F7A"/>`, "裝飾眼"),
  ]
};

function renderPreview(content){
  return viewBoxGroup(content);
}

function renderAssets(){
  assetGrid.innerHTML = "";
  ASSETS[activeTab].forEach(asset=>{
    const frag = assetTemplate.content.cloneNode(true);
    const btn = frag.querySelector(".asset-btn");
    frag.querySelector(".asset-preview").innerHTML = renderPreview(asset.contents);
    frag.querySelector(".asset-name").textContent = asset.name;
    btn.addEventListener("click",()=>addAsset(asset));
    assetGrid.appendChild(frag);
  });
}

function addAsset(asset, preset={}){
  pushUndo();
  const layer = asset.layer === "decor" ? decorationLayer : portraitLayer;
  const g = el("g", {class:"movable", "data-name":asset.name, tabindex:"0"}, layer);
  g.innerHTML = asset.contents;
  const x = preset.x ?? 540 + (Math.random()*90-45);
  const y = preset.y ?? 510 + (Math.random()*90-45);
  const scale = preset.scale ?? 1;
  const rotate = preset.rotate ?? 0;
  g.dataset.x=x; g.dataset.y=y; g.dataset.scale=scale; g.dataset.rotate=rotate;
  updateTransform(g);
  g.addEventListener("pointerdown", onPointerDown);
  g.addEventListener("click", (e)=>{e.stopPropagation(); select(g);});
  select(g);
}

function updateTransform(node){
  node.setAttribute("transform",`translate(${node.dataset.x} ${node.dataset.y}) rotate(${node.dataset.rotate}) scale(${node.dataset.scale}) translate(-120 -120)`);
  if(node===selected) updateSelectionBox();
}

function select(node){
  selected = node;
  [...document.querySelectorAll(".movable")].forEach(n=>n.classList.remove("is-selected"));
  if(selected){
    selected.classList.add("is-selected");
    scaleRange.value = selected.dataset.scale || 1;
    rotateRange.value = selected.dataset.rotate || 0;
    selectionBox.setAttribute("display","block");
    updateSelectionBox();
  } else selectionBox.setAttribute("display","none");
}

function updateSelectionBox(){
  if(!selected) return;
  const bb = selected.getBBox();
  const x = parseFloat(selected.dataset.x), y=parseFloat(selected.dataset.y);
  const s = parseFloat(selected.dataset.scale);
  const pad = 16;
  selectionRect.setAttribute("x", x + (bb.x-120)*s - pad);
  selectionRect.setAttribute("y", y + (bb.y-120)*s - pad);
  selectionRect.setAttribute("width", bb.width*s + pad*2);
  selectionRect.setAttribute("height", bb.height*s + pad*2);
}

function svgPoint(evt){
  const pt = artboard.createSVGPoint();
  pt.x = evt.clientX; pt.y=evt.clientY;
  return pt.matrixTransform(artboard.getScreenCTM().inverse());
}

function onPointerDown(evt){
  evt.stopPropagation();
  const node = evt.currentTarget;
  select(node);
  dragging = true;
  const p = svgPoint(evt);
  dragStart = {px:p.x,py:p.y,x:parseFloat(node.dataset.x),y:parseFloat(node.dataset.y)};
  node.setPointerCapture(evt.pointerId);
  pushUndo();
}
artboard.addEventListener("pointermove",(evt)=>{
  if(!dragging||!selected) return;
  const p=svgPoint(evt);
  selected.dataset.x = dragStart.x+(p.x-dragStart.px);
  selected.dataset.y = dragStart.y+(p.y-dragStart.py);
  updateTransform(selected);
});
artboard.addEventListener("pointerup",()=>{dragging=false;});
artboard.addEventListener("pointerdown",(e)=>{
  if(e.target===artboard || e.target===bg){ select(null); }
});

const scaleRange = document.getElementById("scaleRange");
const rotateRange = document.getElementById("rotateRange");
scaleRange.addEventListener("input",()=>{if(selected){selected.dataset.scale=scaleRange.value;updateTransform(selected);}});
rotateRange.addEventListener("input",()=>{if(selected){selected.dataset.rotate=rotateRange.value;updateTransform(selected);}});

document.getElementById("removeSelected").addEventListener("click",()=>{
  if(selected){pushUndo(); selected.remove(); select(null);}
});
document.getElementById("forwardBtn").addEventListener("click",()=>{
  if(selected){pushUndo(); selected.parentNode.appendChild(selected); updateSelectionBox();}
});
document.getElementById("backBtn").addEventListener("click",()=>{
  if(selected){pushUndo(); selected.parentNode.insertBefore(selected, selected.parentNode.firstChild); updateSelectionBox();}
});

function stateSnapshot(){
  return {
    bg:bg.getAttribute("fill"),
    portrait:portraitLayer.innerHTML,
    decor:decorationLayer.innerHTML
  };
}
function pushUndo(){
  undoStack.push(stateSnapshot());
  if(undoStack.length>25) undoStack.shift();
}
function bindMovables(){
  document.querySelectorAll(".movable").forEach(g=>{
    g.addEventListener("pointerdown", onPointerDown);
    g.addEventListener("click",(e)=>{e.stopPropagation();select(g);});
  });
}
document.getElementById("undoBtn").addEventListener("click",()=>{
  const prev=undoStack.pop(); if(!prev) return;
  bg.setAttribute("fill",prev.bg); portraitLayer.innerHTML=prev.portrait; decorationLayer.innerHTML=prev.decor; bindMovables(); select(null);
});
document.getElementById("resetBtn").addEventListener("click",()=>{
  pushUndo(); portraitLayer.innerHTML=""; decorationLayer.innerHTML=""; bg.setAttribute("fill",COLORS[0]); select(null); document.querySelectorAll(".bg-dot").forEach((d,i)=>d.classList.toggle("active",i===0));
});
document.getElementById("randomBtn").addEventListener("click",()=>{
  pushUndo(); portraitLayer.innerHTML=""; decorationLayer.innerHTML="";
  const picks=[
    ["faces",0, {x:540,y:540,scale:1.8}],
    ["eyes",Math.floor(Math.random()*ASSETS.eyes.length), {x:480,y:450,scale:.88,rotate:-8}],
    ["eyes",Math.floor(Math.random()*ASSETS.eyes.length), {x:620,y:470,scale:.68,rotate:18}],
    ["features",Math.floor(Math.random()*2), {x:545,y:560,scale:.65,rotate:Math.random()*40-20}],
    ["features",2+Math.floor(Math.random()*2), {x:545,y:680,scale:.78,rotate:Math.random()*20-10}],
    ["style",Math.floor(Math.random()*ASSETS.style.length), {x:540,y:265,scale:1.15,rotate:Math.random()*18-9}],
    ["decor",Math.floor(Math.random()*ASSETS.decor.length), {x:215,y:840,scale:.7,rotate:Math.random()*30-15}],
    ["decor",Math.floor(Math.random()*ASSETS.decor.length), {x:835,y:850,scale:.7,rotate:Math.random()*30-15}],
  ];
  bg.setAttribute("fill", COLORS[Math.floor(Math.random()*COLORS.length)]);
  picks.forEach(([cat,idx,p])=>addAsset(ASSETS[cat][idx],p));
  select(null);
});
function renderPalette(){
  const holder=document.getElementById("bgPalette");
  COLORS.forEach((c,i)=>{
    const b=document.createElement("button");
    b.className="bg-dot"+(i===0?" active":"");
    b.style.background=c;
    b.title=`背景色 ${i+1}`;
    b.addEventListener("click",()=>{
      pushUndo(); bg.setAttribute("fill",c);
      document.querySelectorAll(".bg-dot").forEach(x=>x.classList.remove("active")); b.classList.add("active");
    });
    holder.appendChild(b);
  });
}
document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  tab.classList.add("active"); activeTab=tab.dataset.tab; renderAssets();
}));

function serializeSvgForExport(){
  const clone = artboard.cloneNode(true);
  clone.querySelector("#selectionBox")?.remove();
  clone.setAttribute("width","1080"); clone.setAttribute("height","1350");
  clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
  const style = document.createElementNS(svgNS,"style");
  style.textContent = `.export-title{font-family:Georgia,serif;font-size:46px;font-weight:700;fill:#171514}.export-sub{font-family:Arial,sans-serif;font-size:17px;font-weight:700;fill:#2d2924}.export-meta{font-family:Arial,sans-serif;font-size:14px;fill:#5f574f}`;
  clone.insertBefore(style, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}
document.getElementById("downloadBtn").addEventListener("click",()=>{
  const svgText=serializeSvgForExport();
  const blob=new Blob([svgText],{type:"image/svg+xml;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const img=new Image();
  img.onload=()=>{
    const canvas=document.createElement("canvas");
    canvas.width=1080; canvas.height=1350;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle=bg.getAttribute("fill"); ctx.fillRect(0,0,1080,1350);
    ctx.drawImage(img,0,0);
    URL.revokeObjectURL(url);
    const a=document.createElement("a");
    a.download="my-imaginary-portrait-jolie-museum.png";
    a.href=canvas.toDataURL("image/png");
    a.click();
  };
  img.src=url;
});

renderAssets();
renderPalette();
document.getElementById("randomBtn").click();
