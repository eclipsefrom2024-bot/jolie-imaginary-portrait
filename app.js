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

// iPhone Safari is more reliable when movable SVG assets are rendered as data-URI images.
// This avoids Safari's inconsistent parsing of SVG fragments inserted into an SVG <g>.
function makeSvgDataUri(markup){
  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${markup}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(fullSvg);
}
function appendAssetImage(parent, markup){
  const image = document.createElementNS(svgNS, "image");
  const uri = makeSvgDataUri(markup);
  image.setAttribute("x", "0");
  image.setAttribute("y", "0");
  image.setAttribute("width", "240");
  image.setAttribute("height", "240");
  image.setAttribute("preserveAspectRatio", "xMidYMid meet");
  image.setAttribute("href", uri);
  image.setAttributeNS("http://www.w3.org/1999/xlink", "href", uri);
  parent.appendChild(image);
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
  // Preview is inserted in HTML, where SVG markup is safe to render.
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
  appendAssetImage(g, asset.contents);
  const hit = el("rect", {x:"0", y:"0", width:"240", height:"240", fill:"transparent", "pointer-events":"all"}, g);
  // Keep the hit area behind the visual asset.
  g.insertBefore(hit, g.firstChild);
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

const deleteHandle = document.getElementById("deleteHandle");
const lockHandle = document.getElementById("lockHandle");
const lockIcon = document.getElementById("lockIcon");
const rotateHandle = document.getElementById("rotateHandle");
const scaleHandle = document.getElementById("scaleHandle");

let gesture = null;
let activePointers = new Map();

function isLocked(node){
  return node?.dataset.locked === "true";
}
function setLocked(node, locked){
  if(!node) return;
  node.dataset.locked = locked ? "true" : "false";
  node.style.opacity = locked ? ".84" : "1";
  lockIcon.textContent = locked ? "🔒" : "🔓";
}
function select(node){
  selected = node;
  [...document.querySelectorAll(".movable")].forEach(n=>n.classList.remove("is-selected"));
  if(selected){
    selected.classList.add("is-selected");
    if(scaleRange) scaleRange.value = selected.dataset.scale || 1;
    if(rotateRange) rotateRange.value = selected.dataset.rotate || 0;
    setLocked(selected, isLocked(selected));
    selectionBox.setAttribute("display","block");
    updateSelectionBox();
  } else {
    selectionBox.setAttribute("display","none");
  }
}
function getSelectionMetrics(){
  if(!selected) return null;
  const bb = selected.getBBox();
  const x = parseFloat(selected.dataset.x), y=parseFloat(selected.dataset.y);
  const s = parseFloat(selected.dataset.scale);
  const pad = 18;
  return {
    x: x + (bb.x-120)*s - pad,
    y: y + (bb.y-120)*s - pad,
    w: bb.width*s + pad*2,
    h: bb.height*s + pad*2,
    cx: x + ((bb.x + bb.width/2)-120)*s,
    cy: y + ((bb.y + bb.height/2)-120)*s
  };
}
function updateSelectionBox(){
  if(!selected) return;
  const m = getSelectionMetrics();
  selectionRect.setAttribute("x", m.x);
  selectionRect.setAttribute("y", m.y);
  selectionRect.setAttribute("width", m.w);
  selectionRect.setAttribute("height", m.h);
  // Keep all controls directly below the selected object, in an easy-to-reach row.
  // Stay above the exported footer so the controls remain tappable.
  const toolbarY = Math.min(m.y + m.h + 62, 1110);
  const startX = Math.max(72, Math.min(m.cx - 105, 1008 - 210));
  scaleHandle.setAttribute("transform", `translate(${startX} ${toolbarY})`);
  rotateHandle.setAttribute("transform", `translate(${startX + 70} ${toolbarY})`);
  lockHandle.setAttribute("transform", `translate(${startX + 140} ${toolbarY})`);
  deleteHandle.setAttribute("transform", `translate(${startX + 210} ${toolbarY})`);
  lockIcon.textContent = isLocked(selected) ? "🔒" : "🔓";
}
function svgPoint(evt){
  const pt = artboard.createSVGPoint();
  pt.x = evt.clientX; pt.y=evt.clientY;
  return pt.matrixTransform(artboard.getScreenCTM().inverse());
}
function pointDistance(a,b){ return Math.hypot(b.x-a.x,b.y-a.y); }
function pointAngle(a,b){ return Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI; }

function beginMove(evt, node){
  if(isLocked(node)) return;
  const p = svgPoint(evt);
  gesture = {
    type:"move",
    node,
    pointerId:evt.pointerId,
    startX:parseFloat(node.dataset.x),
    startY:parseFloat(node.dataset.y),
    startPoint:p
  };
  pushUndo();
  node.setPointerCapture?.(evt.pointerId);
}
function beginHandleGesture(evt, type){
  if(!selected || isLocked(selected)) return;
  evt.preventDefault(); evt.stopPropagation();
  const p=svgPoint(evt), m=getSelectionMetrics();
  gesture={
    type,
    node:selected,
    pointerId:evt.pointerId,
    startPoint:p,
    center:{x:m.cx,y:m.cy},
    startScale:parseFloat(selected.dataset.scale),
    startRotate:parseFloat(selected.dataset.rotate),
    startDistance:Math.max(1, Math.hypot(p.x-m.cx,p.y-m.cy)),
    startAngle:Math.atan2(p.y-m.cy,p.x-m.cx)*180/Math.PI
  };
  pushUndo();
  artboard.setPointerCapture?.(evt.pointerId);
}
function onPointerDown(evt){
  evt.stopPropagation();
  const node = evt.currentTarget;
  select(node);
  activePointers.set(evt.pointerId, {point:svgPoint(evt), node});
  // Second finger on the same unlocked object = IG-style pinch / rotate.
  const same = [...activePointers.entries()].filter(([,v])=>v.node===node);
  if(same.length >= 2 && !isLocked(node)){
    const [a,b] = same.slice(-2).map(([,v])=>v.point);
    const m=getSelectionMetrics();
    gesture = {
      type:"pinch",
      node,
      ids:same.slice(-2).map(([id])=>id),
      startScale:parseFloat(node.dataset.scale),
      startRotate:parseFloat(node.dataset.rotate),
      startDistance:Math.max(1,pointDistance(a,b)),
      startAngle:pointAngle(a,b),
      startCenter:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},
      origin:{x:parseFloat(node.dataset.x),y:parseFloat(node.dataset.y)}
    };
    pushUndo();
    return;
  }
  beginMove(evt,node);
}
function onPointerMove(evt){
  if(activePointers.has(evt.pointerId)) activePointers.get(evt.pointerId).point = svgPoint(evt);
  if(!gesture || !selected) return;
  const p=svgPoint(evt);
  const node=gesture.node;
  if(gesture.type==="move" && evt.pointerId===gesture.pointerId){
    node.dataset.x=gesture.startX+(p.x-gesture.startPoint.x);
    node.dataset.y=gesture.startY+(p.y-gesture.startPoint.y);
    updateTransform(node);
  } else if(gesture.type==="rotate" && evt.pointerId===gesture.pointerId){
    const angle=Math.atan2(p.y-gesture.center.y,p.x-gesture.center.x)*180/Math.PI;
    node.dataset.rotate=gesture.startRotate+(angle-gesture.startAngle);
    if(rotateRange) rotateRange.value=node.dataset.rotate;
    updateTransform(node);
  } else if(gesture.type==="scale" && evt.pointerId===gesture.pointerId){
    const dist=Math.max(1,Math.hypot(p.x-gesture.center.x,p.y-gesture.center.y));
    node.dataset.scale=Math.min(3,Math.max(.25,gesture.startScale*(dist/gesture.startDistance)));
    if(scaleRange) scaleRange.value=node.dataset.scale;
    updateTransform(node);
  } else if(gesture.type==="pinch" && gesture.ids.includes(evt.pointerId)){
    const pts=gesture.ids.map(id=>activePointers.get(id)?.point).filter(Boolean);
    if(pts.length===2){
      const [a,b]=pts;
      const dist=Math.max(1,pointDistance(a,b));
      const angle=pointAngle(a,b);
      const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      node.dataset.scale=Math.min(3,Math.max(.25,gesture.startScale*(dist/gesture.startDistance)));
      node.dataset.rotate=gesture.startRotate+(angle-gesture.startAngle);
      node.dataset.x=gesture.origin.x+(center.x-gesture.startCenter.x);
      node.dataset.y=gesture.origin.y+(center.y-gesture.startCenter.y);
      if(scaleRange) scaleRange.value=node.dataset.scale; rotateRange.value=node.dataset.rotate;
      updateTransform(node);
    }
  }
}
function endPointer(evt){
  activePointers.delete(evt.pointerId);
  if(gesture?.pointerId===evt.pointerId || (gesture?.ids && gesture.ids.includes(evt.pointerId))) gesture=null;
}
artboard.addEventListener("pointermove", onPointerMove);
artboard.addEventListener("pointerup", endPointer);
artboard.addEventListener("pointercancel", endPointer);
artboard.addEventListener("pointerdown",(e)=>{
  if(e.target===artboard || e.target===bg){ select(null); }
});

deleteHandle.addEventListener("pointerdown",(e)=>{
  e.preventDefault(); e.stopPropagation();
  if(selected){pushUndo(); selected.remove(); select(null);}
});
lockHandle.addEventListener("pointerdown",(e)=>{
  e.preventDefault(); e.stopPropagation();
  if(selected) setLocked(selected,!isLocked(selected));
});
rotateHandle.addEventListener("pointerdown",(e)=>beginHandleGesture(e,"rotate"));
scaleHandle.addEventListener("pointerdown",(e)=>beginHandleGesture(e,"scale"));
const scaleRange = document.getElementById("scaleRange");
const rotateRange = document.getElementById("rotateRange");
scaleRange?.addEventListener("input",()=>{if(selected){selected.dataset.scale=scaleRange.value;updateTransform(selected);}});
rotateRange?.addEventListener("input",()=>{if(selected){selected.dataset.rotate=rotateRange.value;updateTransform(selected);}});

// The visible delete action now lives in the on-canvas toolbar.
// Keep this optional for older layouts only.
document.getElementById("removeSelected")?.addEventListener("click",()=>{
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
    if(isLocked(g)) g.style.opacity=".84";
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

function loadImage(src){
  return new Promise((resolve,reject)=>{
    const image = new Image();
    image.onload = ()=>resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function exportPortraitBlob(){
  // Export directly from the canvas object data instead of rasterizing the whole SVG.
  // This is much more reliable on iPhone Safari when the artwork contains SVG data-URI images.
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = bg.getAttribute("fill") || "#F7F2E8";
  ctx.fillRect(0, 0, 1080, 1350);

  async function drawLayer(layer){
    const objects = [...layer.querySelectorAll(".movable")];
    for(const object of objects){
      const imageNode = object.querySelector("image");
      if(!imageNode) continue;

      const src = imageNode.getAttribute("href") || imageNode.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if(!src) continue;

      const image = await loadImage(src);
      const x = parseFloat(object.dataset.x || "540");
      const y = parseFloat(object.dataset.y || "540");
      const scale = parseFloat(object.dataset.scale || "1");
      const rotate = parseFloat(object.dataset.rotate || "0") * Math.PI / 180;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotate);
      ctx.scale(scale, scale);
      ctx.translate(-120, -120);
      ctx.drawImage(image, 0, 0, 240, 240);
      ctx.restore();
    }
  }

  // Keep the same layer order as the interactive canvas.
  await drawLayer(decorationLayer);
  await drawLayer(portraitLayer);

  // Footer lockup
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.fillRect(0, 1170, 1080, 180);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#171514";
  ctx.font = "700 46px Georgia, serif";
  ctx.fillText("我的想像肖像", 540, 1225);

  ctx.fillStyle = "#2D2924";
  ctx.font = "700 17px Arial, sans-serif";
  ctx.fillText("PICASSO IMAGINARY PORTRAITS · 莉．瓷藝博物館", 540, 1270);

  ctx.fillStyle = "#5F574F";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText("2026.07.01–09.30 · #MyImaginaryPortrait #JolieMuseum", 540, 1312);

  return await new Promise(resolve=>canvas.toBlob(resolve, "image/png"));
}

document.getElementById("downloadBtn").addEventListener("click", async ()=>{
  const btn = document.getElementById("downloadBtn");
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "正在生成作品…";

  try{
    const pngBlob = await exportPortraitBlob();
    if(!pngBlob) throw new Error("PNG export failed");

    const filename = "my-imaginary-portrait-jolie-museum.png";
    const file = new File([pngBlob], filename, {type:"image/png"});

    // On iPhone / Android, prefer native share sheet so visitors can choose “Save Image”.
    // Share only the image file for broader iOS compatibility.
    if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file]});
      return;
    }

    // Desktop / unsupported browser fallback: regular download.
    const url = URL.createObjectURL(pngBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
  } catch(err){
    // User cancelling the share sheet is not an error that needs an alert.
    if(err?.name !== "AbortError"){
      console.error(err);
      alert("目前無法產生圖片，請再試一次。");
    }
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
});

renderAssets();
renderPalette();
document.getElementById("randomBtn").click();
