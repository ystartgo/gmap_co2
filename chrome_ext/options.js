
const def={metro:0.041,bus:0.105,car:0.192,motorcycle:0.103};
async function init(){
  const s=await chrome.storage.local.get(["factors","defaults"]);const f=s.factors||def;Object.keys(def).forEach(k=>{document.getElementById(k).value=String(f[k]);});const d=s.defaults||{passengers:1};document.getElementById("passengers").value=String(d.passengers||1);document.getElementById("save").addEventListener("click",async()=>{const nf={metro:parseFloat(document.getElementById("metro").value||"0"),bus:parseFloat(document.getElementById("bus").value||"0"),car:parseFloat(document.getElementById("car").value||"0"),motorcycle:parseFloat(document.getElementById("motorcycle").value||"0")};const nd={passengers:Math.max(parseInt(document.getElementById("passengers").value||"1",10),1)};await chrome.storage.local.set({factors:nf,defaults:nd});});
}
document.addEventListener("DOMContentLoaded",init);
