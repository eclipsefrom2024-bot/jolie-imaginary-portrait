const SPRITE_COLS = 5, SPRITE_ROWS = 4;
const ASSETS = [{"id": "faces-0", "category": "faces", "name": "太陽臉", "x": 0, "y": 0}, {"id": "faces-1", "category": "faces", "name": "切面臉", "x": 1, "y": 0}, {"id": "faces-2", "category": "faces", "name": "雲朵臉", "x": 2, "y": 0}, {"id": "eyes-0", "category": "eyes", "name": "圓眼", "x": 3, "y": 0}, {"id": "eyes-1", "category": "eyes", "name": "睫毛眼", "x": 4, "y": 0}, {"id": "eyes-2", "category": "eyes", "name": "閉眼", "x": 0, "y": 1}, {"id": "eyes-3", "category": "eyes", "name": "三角眼", "x": 1, "y": 1}, {"id": "features-0", "category": "features", "name": "幾何鼻", "x": 2, "y": 1}, {"id": "features-1", "category": "features", "name": "側鼻", "x": 3, "y": 1}, {"id": "features-2", "category": "features", "name": "紅嘴", "x": 4, "y": 1}, {"id": "features-3", "category": "features", "name": "微笑嘴", "x": 0, "y": 2}, {"id": "style-0", "category": "style", "name": "斜帽", "x": 1, "y": 2}, {"id": "style-1", "category": "style", "name": "圓帽", "x": 2, "y": 2}, {"id": "style-2", "category": "style", "name": "波浪髮", "x": 3, "y": 2}, {"id": "style-3", "category": "style", "name": "吊墜耳環", "x": 4, "y": 2}, {"id": "decor-0", "category": "decor", "name": "花朵", "x": 0, "y": 3}, {"id": "decor-1", "category": "decor", "name": "瓷器紋樣", "x": 1, "y": 3}, {"id": "decor-2", "category": "decor", "name": "幾何山", "x": 2, "y": 3}, {"id": "decor-3", "category": "decor", "name": "裝飾眼", "x": 3, "y": 3}];
const BG_COLORS = ["#F7F2E8","#F7D6D0","#D7E9EA","#E5DEB4","#D8C5E5","#F6C970","#C8DFB5","#F4B89D","#D8D2CA"];

const artboard = document.getElementById("artboard");
const objectLayer = document.getElementById("objectLayer");
const toolbar = document.getElementById("toolbar");
const assetGrid = document.getElementById("assetGrid");
const bgPalette = document.getElementById("bgPalette");
let activeTab = "faces";
let selected = null;
let objects = [];
let undoStack = [];
let gesture = null;
let pointers = new Map();

function spritePosition(asset){
  return `${asset.x * 25}% ${asset.y * (100/(SPRITE_ROWS-1))}%`;
}
function saveState(){
  undoStack.push(JSON.stringify({bg:artboard.style.background, objects:objects.map(o=>({...o}))}));
  if(undoStack.length>25) undoStack.shift();
}
function restoreState(state){
  const data=JSON.parse(state);
  artboard.style.background=data.bg || BG_COLORS[0];
  objects=data.objects || [];
  selected=null;
  renderObjects();
  renderPalette();
}
function uid(){return "o"+Date.now()+Math.random().toString(16).slice(2)}
function renderAssets(){
  assetGrid.innerHTML="";
  ASSETS.filter(a=>a.category===activeTab).forEach(asset=>{
    const btn=document.createElement("button");
    btn.className="asset-btn";
    btn.innerHTML=`<span class="asset-swatch" style="background-position:${spritePosition(asset)}"></span><span class="asset-name">${asset.name}</span>`;
    btn.addEventListener("click",()=>addObject(asset));
    assetGrid.appendChild(btn);
  });
}
function addObject(asset, preset={}){
  saveState();
  objects.push({
    id:uid(), assetId:asset.id,
    x:preset.x ?? 50+(Math.random()*10-5),
    y:preset.y ?? 42+(Math.random()*10-5),
    size:preset.size ?? 25,
    rotate:preset.rotate ?? 0,
    locked:false,
    z:objects.length+1
  });
  renderObjects();
  selectById(objects.at(-1).id);
}
function findAsset(id){return ASSETS.find(a=>a.id===id)}
function renderObjects(){
  objectLayer.innerHTML="";
  objects.sort((a,b)=>a.z-b.z).forEach(o=>{
    const asset=findAsset(o.assetId); if(!asset) return;
    const node=document.createElement("div");
    node.className="object"+(selected?.id===o.id?" selected":"");
    node.dataset.id=o.id;
    node.style.left=`${o.x}%`; node.style.top=`${o.y}%`; node.style.width=`${o.size}%`;
    node.style.transform=`translate(-50%,-50%) rotate(${o.rotate}deg)`;
    node.style.zIndex=o.z;
    node.innerHTML=`<div class="sprite-object" style="background-position:${spritePosition(asset)}"></div>`;
    node.addEventListener("pointerdown",startObjectPointer);
    objectLayer.appendChild(node);
  });
  updateToolbar();
}
function selectById(id){
  selected=objects.find(o=>o.id===id)||null;
  renderObjects();
}
function updateToolbar(){
  if(!selected){toolbar.classList.add("hidden");return;}
  const y=Math.min(selected.y+selected.size/2+7, 82);
  toolbar.style.left=selected.x+"%";
  toolbar.style.top=y+"%";
  toolbar.classList.remove("hidden");
  document.getElementById("lockHandle").textContent=selected.locked?"🔒":"🔓";
}
function artPoint(e){
  const r=artboard.getBoundingClientRect();
  return {x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100};
}
function startObjectPointer(e){
  e.preventDefault();e.stopPropagation();
  const id=e.currentTarget.dataset.id;
  const obj=objects.find(o=>o.id===id); if(!obj) return;
  selected=obj;
  pointers.set(e.pointerId,artPoint(e));
  if(obj.locked){renderObjects();return;}
  saveState();
  gesture={type:"move",id:obj.id,pointerId:e.pointerId,start:artPoint(e),origin:{x:obj.x,y:obj.y}};
  if(e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
  renderObjects();
}
function onPointerMove(e){
  if(pointers.has(e.pointerId)) pointers.set(e.pointerId,artPoint(e));
  if(!gesture||!selected||selected.locked)return;
  const p=artPoint(e);
  if(gesture.type==="move"&&gesture.pointerId===e.pointerId){
    selected.x=gesture.origin.x+(p.x-gesture.start.x);
    selected.y=gesture.origin.y+(p.y-gesture.start.y);
    renderObjects();
  } else if(gesture.type==="scale"&&gesture.pointerId===e.pointerId){
    const dx=p.x-gesture.center.x,dy=p.y-gesture.center.y;
    const currentDistance=Math.hypot(dx,dy);
    // Move the handle away from the object to enlarge; toward it to shrink.
    const distanceChange=currentDistance-gesture.startDistance;
    selected.size=Math.max(8,Math.min(60,gesture.startSize+distanceChange*1.45));
    renderObjects();
  } else if(gesture.type==="rotate"&&gesture.pointerId===e.pointerId){
    const a=Math.atan2(p.y-gesture.center.y,p.x-gesture.center.x)*180/Math.PI;
    selected.rotate=gesture.startRotate+(a-gesture.startAngle);
    renderObjects();
  }
}
function onPointerUp(e){pointers.delete(e.pointerId);if(gesture?.pointerId===e.pointerId)gesture=null;}
artboard.addEventListener("pointermove",onPointerMove);
artboard.addEventListener("pointerup",onPointerUp);
artboard.addEventListener("pointercancel",onPointerUp);
artboard.addEventListener("pointerdown",(e)=>{if(e.target===artboard||e.target===objectLayer){selected=null;renderObjects();}});

function beginTool(type,e){
  if(!selected||selected.locked)return;
  e.preventDefault();e.stopPropagation();
  saveState();
  const p=artPoint(e);
  gesture={
    type,
    pointerId:e.pointerId,
    center:{x:selected.x,y:selected.y},
    startSize:selected.size,
    startRotate:selected.rotate,
    startAngle:Math.atan2(p.y-selected.y,p.x-selected.x)*180/Math.PI,
    startDistance:Math.hypot(p.x-selected.x,p.y-selected.y)
  };
}
document.getElementById("scaleHandle").addEventListener("pointerdown",e=>beginTool("scale",e));
document.getElementById("rotateHandle").addEventListener("pointerdown",e=>beginTool("rotate",e));
document.getElementById("lockHandle").addEventListener("click",()=>{if(selected){selected.locked=!selected.locked;renderObjects();}});
document.getElementById("deleteHandle").addEventListener("click",()=>{if(selected){saveState();objects=objects.filter(o=>o.id!==selected.id);selected=null;renderObjects();}});

document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  tab.classList.add("active");activeTab=tab.dataset.tab;renderAssets();
}));
function renderPalette(){
  bgPalette.innerHTML="";
  BG_COLORS.forEach(c=>{
    const b=document.createElement("button");b.className="bg-dot"+(artboard.style.background===c?" active":"");b.style.background=c;
    b.addEventListener("click",()=>{saveState();artboard.style.background=c;renderPalette();});
    bgPalette.appendChild(b);
  });
}
document.getElementById("forwardBtn").addEventListener("click",()=>{if(selected){saveState();selected.z=Math.max(...objects.map(o=>o.z))+1;renderObjects();}});
document.getElementById("backBtn").addEventListener("click",()=>{if(selected){saveState();selected.z=Math.min(...objects.map(o=>o.z))-1;renderObjects();}});
document.getElementById("undoBtn").addEventListener("click",()=>{const s=undoStack.pop();if(s)restoreState(s);});
document.getElementById("resetBtn").addEventListener("click",()=>{saveState();objects=[];selected=null;artboard.style.background=BG_COLORS[0];renderObjects();renderPalette();});
document.getElementById("randomBtn").addEventListener("click",()=>{
  saveState(); objects=[]; selected=null; artboard.style.background=BG_COLORS[Math.floor(Math.random()*BG_COLORS.length)];
  const choose=(cat)=>{const a=ASSETS.filter(x=>x.category===cat);return a[Math.floor(Math.random()*a.length)]};
  [[choose("faces"),50,42,38,0],[choose("eyes"),43,36,16,-8],[choose("eyes"),58,38,14,13],[choose("features"),50,48,15,0],[choose("features"),50,59,16,0],[choose("style"),50,20,30,0],[choose("decor"),21,67,16,0],[choose("decor"),80,69,16,0]].forEach(([a,x,y,size,rotate])=>{
    objects.push({id:uid(),assetId:a.id,x,y,size,rotate,locked:false,z:objects.length+1});
  });
  renderObjects();renderPalette();
});

function loadSprite(){
  return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src="sprite.png?v=10";});
}
async function exportPng(){
  const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;
  const ctx=canvas.getContext("2d");ctx.fillStyle=artboard.style.background||BG_COLORS[0];ctx.fillRect(0,0,1080,1350);
  const sprite=await loadSprite();const cellW=sprite.width/SPRITE_COLS,cellH=sprite.height/SPRITE_ROWS;
  [...objects].sort((a,b)=>a.z-b.z).forEach(o=>{
    const asset=findAsset(o.assetId);const cx=(o.x/100)*1080,cy=(o.y/100)*1350*0.866;const sz=(o.size/100)*1080;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(o.rotate*Math.PI/180);
    ctx.drawImage(sprite,asset.x*cellW,asset.y*cellH,cellW,cellH,-sz/2,-sz/2,sz,sz);ctx.restore();
  });
  ctx.fillStyle="rgba(255,255,255,.94)";ctx.fillRect(0,1170,1080,180);ctx.textAlign="center";ctx.fillStyle="#171514";
  ctx.font="700 46px Georgia, serif";ctx.fillText("我的想像肖像",540,1225);
  ctx.font="700 17px Arial";ctx.fillText("PICASSO IMAGINARY PORTRAITS · 莉．瓷藝博物館",540,1270);
  ctx.fillStyle="#5F574F";ctx.font="14px Arial";ctx.fillText("2026.07.01–09.30 · #MyImaginaryPortrait #JolieMuseum",540,1312);
  return await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
}
document.getElementById("downloadBtn").addEventListener("click",async()=>{
  const btn=document.getElementById("downloadBtn"),original=btn.textContent;btn.disabled=true;btn.textContent="正在生成作品…";
  try{const blob=await exportPng();const file=new File([blob],"my-imaginary-portrait-jolie-museum.png",{type:"image/png"});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file]});}
    else{const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }catch(err){console.error(err);alert("圖片產生失敗，請重新整理後再試一次。");}
  finally{btn.disabled=false;btn.textContent=original;}
});
renderAssets();renderPalette();document.getElementById("randomBtn").click();
