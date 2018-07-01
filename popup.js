let log = console.log;

document.querySelector("#subscribe").addEventListener("mousedown", ()=>{
   chrome.runtime.sendMessage({"message": "popupOpenGiveaways"});
});

document.querySelector("#unsubscribe").addEventListener("mousedown", ()=>{
   chrome.runtime.sendMessage({"message": "popupCloseGiveaways"});
});

chrome.runtime.sendMessage({"message": "requestPoints", "context": "popup"});
chrome.runtime.onMessage.addListener((message)=>{
   if(message.message == "sendPointsToPopup"){
      document.querySelector("#pointsShow").innerText = message.data.toString();
   }
});
