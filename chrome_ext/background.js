chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
  if(msg&&msg.type==="CAPTURE"){chrome.tabs.captureVisibleTab({format:"png"},dataUrl=>{sendResponse({dataUrl});});return true;}
});
