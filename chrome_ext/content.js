const defaultFactors={metro:0.041,bus:0.105,car:0.192,motorcycle:0.103};
let factorsCache=null;
let defaultsCache={passengers:1};
const i18n={
  "zh-TW":{title:"CO2",toggle:"縮小/展開",transport:"交通工具",distance:"距離(km)",passengers:"乘客數",factor:"係數",pkm:"pkm",co2e:"CO2e(kg)",add:"新增到列表",clear:"清除列表",export:"匯出Excel(CSV)",capture:"下載截圖",listCountPrefix:"列表筆數：",carried:"已帶入左側路線",added:"已新增到列表",cleared:"已清除列表",capSuccess:"已下載截圖",capFail:"截圖失敗",capError:"截圖錯誤",distFail:"距離未解析",sendToCO2:"匯到CO2"},
  "zh-CN":{title:"CO2",toggle:"收起/展开",transport:"交通工具",distance:"距离(km)",passengers:"乘客数",factor:"系数",pkm:"pkm",co2e:"CO2e(kg)",add:"新增到列表",clear:"清除列表",export:"导出Excel(CSV)",capture:"下载截图",listCountPrefix:"列表条数：",carried:"已载入左侧路线",added:"已新增到列表",cleared:"已清除列表",capSuccess:"已下载截图",capFail:"截图失败",capError:"截图错误",distFail:"距离未解析",sendToCO2:"发送到CO2"},
  "en":{title:"CO2",toggle:"Collapse/Expand",transport:"Transport",distance:"Distance (km)",passengers:"Passengers",factor:"Factor",pkm:"pkm",co2e:"CO2e (kg)",add:"Add to list",clear:"Clear list",export:"Export Excel (CSV)",capture:"Download screenshot",listCountPrefix:"Items:",carried:"Loaded from left panel",added:"Added to list",cleared:"List cleared",capSuccess:"Screenshot saved",capFail:"Screenshot failed",capError:"Screenshot error",distFail:"Distance not parsed",sendToCO2:"Send to CO2"},
  "ja":{title:"CO2",toggle:"折りたたみ/展開",transport:"交通手段",distance:"距離(km)",passengers:"乗客数",factor:"係数",pkm:"pkm",co2e:"CO2e(kg)",add:"リストに追加",clear:"リストをクリア",export:"Excel(CSV)を書き出し",capture:"スクリーンショットを保存",listCountPrefix:"件数：",carried:"左側のルートを読み込みました",added:"リストに追加しました",cleared:"リストをクリアしました",capSuccess:"スクリーンショット保存",capFail:"スクリーンショット失敗",capError:"スクリーンショットエラー",distFail:"距離を解析できません",sendToCO2:"CO2へ送信"}
};
function getLocale(){const l=(navigator.language||"zh-TW").toLowerCase();if(l.includes("ja"))return"ja";if(l.includes("zh")&&(l.includes("tw")||l.includes("hant")))return"zh-TW";if(l.includes("zh")&&(l.includes("cn")||l.includes("hans")))return"zh-CN";return"en";}
const LOC=getLocale();
const t=(k)=> (i18n[LOC]&&i18n[LOC][k])||i18n.en[k]||k;
function getTravelMode(){
  try{const u=new URL(location.href);const tm=u.searchParams.get("travelmode");if(tm)return tm;}catch(e){}
  return null;
}
function guessMode(){
  const tm=getTravelMode();if(tm==="transit")return "metro";if(tm==="driving")return "car";return "car";
}
function detectHighway(){
  const texts=queryTexts().join("\n").toLowerCase();
  const keys=["國道","高速公路","高速","highway","freeway","expressway","高速道路"];for(const k of keys){if(texts.includes(k))return true;}return false;
}
const defaultSpeeds={metro:40,bus:40,car_surface:50,car_highway:100,motorcycle:50};
function queryTexts(){
  const out=[];
  const pane=document.querySelector('div.widget-pane-content');
  if(pane){out.push(pane.innerText||'');}
  document.querySelectorAll('[aria-label]').forEach(e=>{const al=e.getAttribute('aria-label');if(al)out.push(al);});
  const scene=document.querySelector('#scene');if(scene){out.push(scene.getAttribute('aria-label')||'');}
  out.push(document.body.innerText||'');
  return out;
}
function parseDistanceKm(){
  const texts=queryTexts();
  for(const t of texts){
    if(!t) continue;
    const m=t.match(/(?:\(|（)?\s*([0-9]+(?:\.[0-9]+)?)\s*(公里|km)\s*(?:\)|）)?/i);
    if(m) return parseFloat(m[1]);
  }
  return null;
}
async function loadFactors(){
  if(factorsCache)return factorsCache;const s=await chrome.storage.local.get(["factors","defaults"]);factorsCache=s.factors||defaultFactors;defaultsCache=s.defaults||{passengers:1};return factorsCache;
}
function createPanel(){
  const host=document.createElement("div");host.id="co2-panel-host";const shadow=host.attachShadow({mode:"open"});const wrap=document.createElement("div");wrap.className="co2-panel";wrap.innerHTML=`
    <div class="co2-title"><span>${t('title')}</span><button id="toggle" title="${t('toggle')}">▾</button></div>
    <div class="co2-row"><label>${t('transport')}</label><select id="modeSel"><option value="metro">捷運</option><option value="bus">公車</option><option value="car">汽車</option><option value="motorcycle">機車</option></select></div>
    <div class="co2-row"><label>${t('distance')}</label><input id="dist" type="number" step="0.01"/></div>
    <div class="co2-row"><label>${t('passengers')}</label><input id="pass" type="number" value="1" min="1"/></div>
    <div class="co2-row"><label>${t('factor')}</label><input id="factor" type="number" step="0.0001"/></div>
    <div class="co2-row"><label>道路型態</label><select id="road"><option value="surface">省道/平面</option><option value="highway">國道/高速</option></select></div>
    <div class="co2-row"><label>速度(km/hr)</label><input id="speed" type="number" step="1"/></div>
    <div class="co2-row" data-mini="true"><label>${t('pkm')}</label><input id="pkm" type="text" disabled/></div>
    <div class="co2-row" data-mini="true"><label>${t('co2e')}</label><input id="co2" type="text" disabled/></div>
    <div class="co2-row"><label>時間(分)</label><input id="timeMin" type="text" disabled/></div>
    <div class="co2-actions"><button id="addBtn">${t('add')}</button><button id="clearBtn">${t('clear')}</button><button id="expBtn">${t('export')}</button><button id="capBtn">${t('capture')}</button></div>
    <div class="co2-status" id="status"></div>
    <div class="co2-resizer" id="resizer"></div>
  `;const style=document.createElement("style");style.textContent=`
    .co2-panel{position:fixed;right:16px;bottom:16px;z-index:999999;background:#fff;border:1px solid #ccc;border-radius:8px;padding:12px;box-shadow:0 2px 8px rgba(0,0,0,.2);font-family:system-ui;width:var(--co2-width,480px);min-width:240px;max-width:480px;font-size:12px;box-sizing:border-box;position:fixed}
    .co2-panel *{box-sizing:border-box}
    .co2-title{display:flex;align-items:center;justify-content:space-between;font-weight:600;margin-bottom:8px}
    .co2-title button#toggle{width:28px;height:28px;line-height:26px;border:1px solid #bbb;border-radius:6px;background:#f7f7f7}
    .co2-panel.collapsed{min-width:auto;padding:6px;bottom:120px;opacity:.9}
    .co2-panel.collapsed .co2-row{display:none}
    .co2-panel.collapsed .co2-row[data-mini="true"]{display:flex}
    .co2-panel.collapsed .co2-actions{display:flex}
    .co2-panel.collapsed .co2-actions button{display:none}
    .co2-panel.collapsed .co2-actions #capBtn{display:inline-flex}
    .co2-row{display:flex;align-items:center;gap:8px;margin:6px 0}
    .co2-row label{width:84px}
    .co2-row input,.co2-row select{flex:1;height:var(--co2-row-height,24px);padding:4px 8px;border:1px solid #ccc;border-radius:4px}
    .co2-actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
    .co2-actions button{height:30px;line-height:28px;padding:0 12px;border:1px solid #999;background:#f7f7f7;border-radius:6px;cursor:pointer}
    button{padding:6px 10px;border:1px solid #999;background:#f7f7f7;border-radius:6px;cursor:pointer}
    .co2-status{margin-top:6px;font-size:12px;color:#666}
    .co2-resizer{position:absolute;right:6px;bottom:6px;width:12px;height:12px;border-right:2px solid #bbb;border-bottom:2px solid #bbb;cursor:nwse-resize;opacity:.8}
  `;shadow.append(style,wrap);document.documentElement.appendChild(host);return {shadow,wrap};
}
function calcAndSet(){
  const root=document.querySelector("#co2-panel-host").shadowRoot;const dist=parseFloat(root.querySelector("#dist").value||"0");const pass=Math.max(parseInt(root.querySelector("#pass").value||"1",10),1);const factor=parseFloat(root.querySelector("#factor").value||"0");const speed=parseFloat(root.querySelector("#speed")?.value||"0");const pkm=dist*pass;const co2=pkm*factor;root.querySelector("#pkm").value=pkm.toFixed(3);root.querySelector("#co2").value=co2.toFixed(6);const tmin=(speed>0&&dist>0)?(dist/speed*60):0;const tm=root.querySelector("#timeMin");if(tm)tm.value=speed>0?tmin.toFixed(1):"";
}
async function init(){
  const {shadow}=createPanel();const root=shadow;const fs=await loadFactors();const uiState=(await chrome.storage.local.get(['ui'])).ui||{collapsed:false};const panel=root.querySelector('.co2-panel');applyPanelPos(panel, uiState);if(uiState.collapsed){panel.classList.add('collapsed');setCollapsedSafePos(panel);}root.querySelector('#toggle').addEventListener('click',async()=>{panel.classList.toggle('collapsed');const collapsed=panel.classList.contains('collapsed');if(collapsed){setCollapsedSafePos(panel);}else{if(uiState&&uiState.panelPos){applyPanelPos(panel, uiState);}else{setExpandedSafePos(panel);} }await chrome.storage.local.set({ui:{...uiState,collapsed}});});const stop=(e)=>{e.stopPropagation();};shadow.addEventListener('keydown',stop,true);shadow.addEventListener('keypress',stop,true);shadow.addEventListener('keyup',stop,true);enableDrag(panel, root.querySelector('.co2-title'));
  const sz=uiState&&uiState.panelSize?uiState.panelSize:{width:480,row:24};panel.style.setProperty('--co2-width', (sz.width||480)+'px');panel.style.setProperty('--co2-row-height', (sz.row||24)+'px');
root.querySelector("#modeSel").value=guessMode();const d=parseDistanceKm();if(d)root.querySelector("#dist").value=String(d);root.querySelector("#pass").value=String(Math.max(parseInt(defaultsCache.passengers||1,10),1));const mode=root.querySelector("#modeSel").value;root.querySelector("#factor").value=String(fs[mode]);const rd=root.querySelector("#road");if(rd)rd.value=detectHighway()?"highway":"surface";const setDefaultSpeed=()=>{const m=root.querySelector("#modeSel").value;const r=root.querySelector("#road")?.value||"surface";let sp=0;if(m==="motorcycle")sp=defaultSpeeds.motorcycle;else if(m==="car")sp=r==="highway"?defaultSpeeds.car_highway:defaultSpeeds.car_surface;else if(m==="bus")sp=defaultSpeeds.bus;else sp=defaultSpeeds.metro;const sEl=root.querySelector("#speed");if(sEl)sEl.value=String(sp);};setDefaultSpeed();calcAndSet();root.querySelector("#modeSel").addEventListener("change",()=>{const m=root.querySelector("#modeSel").value;root.querySelector("#factor").value=String((factorsCache||fs)[m]);setDefaultSpeed();calcAndSet();});["#dist","#pass","#factor","#speed"].forEach(sel=>root.querySelector(sel)?.addEventListener("input",calcAndSet));root.querySelector("#road")?.addEventListener("change",()=>{setDefaultSpeed();calcAndSet();});root.querySelector("#addBtn").addEventListener("click",async()=>{const trip=collectTrip();const s=await chrome.storage.local.get(["trips"]);const arr=s.trips||[];arr.push(trip);await chrome.storage.local.set({trips:arr});toast(`${t('added')} (${t('listCountPrefix')}${arr.length})`);setStatus(`${t('listCountPrefix')}${arr.length}`);});root.querySelector("#clearBtn").addEventListener("click",async()=>{await chrome.storage.local.set({trips:[]});toast(t('cleared'));setStatus(`${t('listCountPrefix')}0`);});root.querySelector("#expBtn").addEventListener("click",exportCSV);root.querySelector("#capBtn").addEventListener("click",async()=>{try{const res=await chrome.runtime.sendMessage({type:"CAPTURE"});if(res&&res.dataUrl){const cropped=await cropToMap(res.dataUrl);if(cropped){downloadDataUrl(cropped,`gmaps_${Date.now()}.png`);toast(t('capSuccess'));setStatus(t('capSuccess'));}else{toast(t('capFail'));setStatus(t('capFail'));}}else{toast(t('capFail'));setStatus(t('capFail'));}}catch(e){toast(t('capError'));setStatus(t('capError'));}});
  injectInlineButton(panel);
  const mo=new MutationObserver(()=>{const nd=parseDistanceKm();if(nd){root.querySelector("#dist").value=String(nd);calcAndSet();}injectInlineButton(panel);positionFloatButtonNearPane();});mo.observe(document.body,{subtree:true,childList:true});
  const res=root.querySelector('#resizer');let rx=0,rw=0;res.addEventListener('mousedown',e=>{rx=e.clientX;rw=panel.getBoundingClientRect().width;document.addEventListener('mousemove',onResize);document.addEventListener('mouseup',stopResize);});function onResize(e){const dx=e.clientX-rx;const w=Math.min(480,Math.max(280,rw+dx));panel.style.setProperty('--co2-width', w+'px');const rh=Math.min(36,Math.max(26, Math.round(28 + (w-320)/20)));panel.style.setProperty('--co2-row-height', rh+'px');}async function stopResize(){document.removeEventListener('mousemove',onResize);document.removeEventListener('mouseup',stopResize);const w=parseInt(getComputedStyle(panel).getPropertyValue('--co2-width'))||320;const rh=parseInt(getComputedStyle(panel).getPropertyValue('--co2-row-height'))||30;const st=await chrome.storage.local.get(['ui']);const ui=st.ui||{};ui.panelSize={width:w,row:rh};await chrome.storage.local.set({ui});}
}
function collectTrip(){
  const root=document.querySelector("#co2-panel-host").shadowRoot;const origin=getInputText("origin");const destination=getInputText("destination");const mode=root.querySelector("#modeSel").value;const dist=parseFloat(root.querySelector("#dist").value||"0");const pass=Math.max(parseInt(root.querySelector("#pass").value||"1",10),1);const factor=parseFloat(root.querySelector("#factor").value||"0");const pkm=dist*pass;const co2=pkm*factor;return {dept:"",ticket:"",emp_id:"",emp_name:"",date:new Date().toISOString().slice(0,10),origin,destination,mode,passengers:pass,distance_km:dist,factor,co2};
}
function getInputText(type){
  const qs=document.querySelectorAll("input[aria-label],input,textarea");let best="";qs.forEach(e=>{const ph=(e.getAttribute('aria-label')||e.placeholder||'').toLowerCase();const v=(e.value||"").trim();if(v && /from|origin|出發地|起點/.test(ph))best=v;});if(!best){qs.forEach(e=>{const ph=(e.getAttribute('aria-label')||e.placeholder||'').toLowerCase();const v=(e.value||"").trim();if(v && /to|destination|目的地|終點/.test(ph))best=v;});}
  return best;
}
function toast(text){
  const root=document.querySelector('#co2-panel-host').shadowRoot;let t=root.querySelector('#toast');if(!t){t=document.createElement('div');t.id='toast';t.style.cssText='position:fixed;right:16px;bottom:80px;background:rgba(0,0,0,.75);color:#fff;padding:8px 12px;border-radius:8px;z-index:1000000;font-size:12px;';root.appendChild(t);}t.textContent=text;clearTimeout(t._timer);t.style.display='block';t._timer=setTimeout(()=>{t.style.display='none'},1800);
}
function setStatus(text){
  const root=document.querySelector('#co2-panel-host').shadowRoot;const el=root.querySelector('#status');if(el)el.textContent=text||'';
}
function enableDrag(panel, handle){
  let dragging=false, sx=0, sy=0, px=0, py=0;
  handle.addEventListener('mousedown',e=>{dragging=true;sx=e.clientX;sy=e.clientY;const r=panel.getBoundingClientRect();px=r.left;py=r.top;document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);});
  function onMove(e){if(!dragging)return;const nx=px+(e.clientX-sx);const ny=py+(e.clientY-sy);panel.style.left=nx+'px';panel.style.top=ny+'px';panel.style.right='auto';panel.style.bottom='auto';}
  async function onUp(){dragging=false;document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);const r=panel.getBoundingClientRect();const st=await chrome.storage.local.get(['ui']);const ui=st.ui||{};ui.panelPos={left:r.left,top:r.top};await chrome.storage.local.set({ui});}
}
function findActionButton(){
  const labels=["傳送至裝置","傳送到裝置","將路線傳送至手機","发送到你的手机","发送到设备","Send to your phone","Send to device","スマートフォンに送信"];
  const nodes=document.querySelectorAll('button,div[role="button"]');
  for(const n of nodes){
    const al=(n.getAttribute('aria-label')||'').trim();
    const txt=(n.textContent||'').trim();
    for(const l of labels){
      if(al.includes(l)||txt.includes(l)) return n;
    }
  }
  return null;
}
function injectInlineButton(panel){
  let btn=document.getElementById('co2-inline-btn');
  if(btn) return;
  const target=findActionButton();
  if(!target) return;
  const container=target.parentElement;
  if(!container) return;
  btn=document.createElement('button');
  btn.id='co2-inline-btn';
  btn.innerHTML=`<span class="co2-icon">${bwCo2Icon()}</span>`;
  btn.title=t('sendToCO2');
  const cs=getComputedStyle(target);
  const rect=target.getBoundingClientRect();
  const h=Math.round(rect.height||parseInt(cs.height)||28);
  styleIconButton(btn,h,cs);
  container.appendChild(btn);
  btn.addEventListener('click',()=>{
    const d=parseDistanceKm();
    if(d){
      const root=document.querySelector('#co2-panel-host').shadowRoot;
      root.querySelector('#dist').value=String(d);
      calcAndSet();
      panel.classList.remove('collapsed');
      setStatus(t('carried'));
      toast(t('carried'));
    }else{
      toast(t('distFail'));
    }
  });
}
function positionFloatButtonNearPane(){
  let btn=document.getElementById('co2-float-btn');
  const pane=document.querySelector('div.widget-pane-content');
  if(!pane){if(btn)btn.remove();return;}
  if(document.getElementById('co2-inline-btn')){if(btn)btn.remove();return;}
  const r=pane.getBoundingClientRect();
  if(!btn){btn=document.createElement('button');btn.id='co2-float-btn';btn.innerHTML=`<span class="co2-icon">${bwCo2Icon()}</span>`;btn.title=t('sendToCO2');btn.style.cssText='position:fixed;z-index:999999;';document.body.appendChild(btn);btn.addEventListener('click',()=>{const d=parseDistanceKm();if(d){const root=document.querySelector('#co2-panel-host').shadowRoot;root.querySelector('#dist').value=String(d);calcAndSet();panel.classList.remove('collapsed');setStatus(t('carried'));toast(t('carried'));}});} 
  styleIconButton(btn, Math.round(r.height*0.06));
  btn.style.left=(r.right+8)+'px';
  btn.style.top=(r.top+8)+'px';
}
function applyPanelPos(panel, ui){
  if(ui&&ui.panelPos&&typeof ui.panelPos.left==='number'&&typeof ui.panelPos.top==='number'){
    panel.style.left=ui.panelPos.left+'px';
    panel.style.top=ui.panelPos.top+'px';
    panel.style.right='auto';
    panel.style.bottom='auto';
  }else{
    setExpandedSafePos(panel);
  }
}
function setCollapsedSafePos(panel){
  panel.style.left='auto';
  panel.style.top='auto';
  panel.style.right='16px';
  panel.style.bottom='160px';
}
function setExpandedSafePos(panel){
  panel.style.left='622px';
  panel.style.right='auto';
  panel.style.top='434px';
  panel.style.bottom='auto';
}
function styleCo2Btn(btn, h, cs){
  const height = Math.max(h||28, 24);
  btn.style.display='inline-flex';
  btn.style.alignItems='center';
  btn.style.justifyContent='center';
  btn.style.height=height+'px';
  btn.style.lineHeight=height+'px';
  btn.style.padding='0 12px';
  btn.style.border=(cs&&cs.borderWidth?cs.borderWidth:'1px')+' '+(cs&&cs.borderStyle?cs.borderStyle:'solid')+' '+(cs&&cs.borderColor?cs.borderColor:'#999');
  btn.style.borderRadius=(cs&&cs.borderRadius?cs.borderRadius:'16px');
  btn.style.background=(cs&&cs.backgroundColor?cs.backgroundColor:'#fff');
  btn.style.color=(cs&&cs.color?cs.color:'#333');
  btn.style.cursor='pointer';
  btn.style.whiteSpace='nowrap';
  const icon=btn.querySelector('.co2-icon');
  if(icon){
    icon.style.display='inline-flex';
    icon.style.alignItems='center';
    icon.style.justifyContent='center';
    icon.style.width=height+'px';
    icon.style.height=height+'px';
    icon.style.borderRadius='50%';
    icon.style.marginRight='6px';
    icon.style.transition='background-color .2s ease';
    const svg=icon.querySelector('svg');
    if(svg){svg.setAttribute('width', String(Math.round(height*0.7)));svg.setAttribute('height', String(Math.round(height*0.7)));}
  }
  btn.addEventListener('mouseenter',()=>{const i=btn.querySelector('.co2-icon');if(i)i.style.backgroundColor='rgba(0,0,0,.08)';});
  btn.addEventListener('mouseleave',()=>{const i=btn.querySelector('.co2-icon');if(i)i.style.backgroundColor='transparent';});
}
function styleIconButton(btn, h, cs){
  const height = 24;
  btn.style.display='inline-flex';
  btn.style.alignItems='center';
  btn.style.justifyContent='center';
  btn.style.height=height+'px';
  btn.style.width=height+'px';
  btn.style.padding='0';
  btn.style.border='none';
  btn.style.background='transparent';
  btn.style.cursor='pointer';
  const icon=btn.querySelector('.co2-icon');
  if(icon){
    icon.style.display='inline-flex';
    icon.style.alignItems='center';
    icon.style.justifyContent='center';
    icon.style.width=height+'px';
    icon.style.height=height+'px';
    icon.style.borderRadius='50%';
    icon.style.transition='background-color .2s ease';
    const svg=icon.querySelector('svg');
    if(svg){svg.setAttribute('width','24');svg.setAttribute('height','24');}
  }
  btn.addEventListener('mouseenter',()=>{const i=btn.querySelector('.co2-icon');if(i)i.style.backgroundColor='rgba(0,0,0,.08)';});
  btn.addEventListener('mouseleave',()=>{const i=btn.querySelector('.co2-icon');if(i)i.style.backgroundColor='transparent';});
}
function bwCo2Icon(){
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-label="CO2 icon" role="img">
  <g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5.5"/>
    <circle cx="5.2" cy="5.2" r="2.2"/>
    <circle cx="5.2" cy="18.8" r="2.2"/>
    <circle cx="18.5" cy="12" r="2.2"/>
    <line x1="7.2" y1="7.2" x2="9.4" y2="9.4"/>
    <line x1="7.2" y1="16.8" x2="9.4" y2="14.6"/>
    <line x1="14.6" y1="12" x2="16.3" y2="12"/>
  </g>
</svg>`;
}
function downloadDataUrl(dataUrl,filename){
  const a=document.createElement('a');a.href=dataUrl;a.download=filename;document.body.appendChild(a);a.click();a.remove();
}
async function cropToMap(dataUrl){
  const el=document.querySelector('#scene')||document.querySelector('canvas');if(!el)return null;const r=el.getBoundingClientRect();const dpr=window.devicePixelRatio||1;const sx=Math.round(r.left*dpr),sy=Math.round(r.top*dpr),sw=Math.round(r.width*dpr),sh=Math.round(r.height*dpr);const img=new Image();img.src=dataUrl;await img.decode();const canvas=document.createElement('canvas');canvas.width=sw;canvas.height=sh;const ctx=canvas.getContext('2d');ctx.drawImage(img,sx,sy,sw,sh,0,0,sw,sh);return canvas.toDataURL('image/png');}
/* removed downloads API usage in content script */
async function exportCSV(){
  const s=await chrome.storage.local.get(["trips"]);
  const trips=s.trips||[];
  const cur=collectTrip();
  trips.push(cur);
  const head=["查查屬區","申請單號","員工編號","員工姓名","出發日期","起點","終點","交通工具","乘客數","每人單次里程(pkm)","運輸碳排放係數(kgCO2e/pkm)","CO2e(kg)"];
  const rows=[head];
  trips.forEach(t=>{rows.push([t.dept,t.ticket,t.emp_id,t.emp_name,t.date,t.origin,t.destination,t.mode,String(t.passengers),String(t.distance_km),String(t.factor),String(t.co2)]);});
  const csv=rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="S3C6_商務旅行_Demo-2025.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}else{init();}
