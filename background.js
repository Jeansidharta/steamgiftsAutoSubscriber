let operation = "";
let wasPageOpenedByUser = true;
let log = console.log;
let openedTabsCount = 0;
let closedTabsCount = 0;
let wasAutoOperation = false;
const maximumPoints = 300;
const minimumPoints = 100;
const CONTEXT_BACKGROUND = "background";

chrome.alarms.create("update user info", {"periodInMinutes": 10});
chrome.runtime.onInstalled.addListener(()=>{chrome.storage.local.userPoints = 0;});
chrome.browserAction.setBadgeText({"text": "????"});

function messageSteamGifts(message, data, args){
   if(args === undefined) args = {};
   chrome.tabs.query(
      {"url":["*://www.steamgifts.com/", "*://www.steamgifts.com/giveaways/*"]},
      (tabs)=>{
         if(tabs.length == 0){
            openGiveawayInNewTab(
               "https://www.steamgifts.com/", 
               {
                  "message": message,
                  "data": data,
                  "context": CONTEXT_BACKGROUND
               }
            );
            wasPageOpenedByUser = false;
         }
         else{
            let tab = tabs[0];
            log("realoading page");
            reloadPage(tab.id, ()=>{
               log("page reloaded");
               chrome.tabs.sendMessage(
                  tab.id,
                  {
                     "message": message,
                     "data": data,
                     "context": CONTEXT_BACKGROUND
                  }
               );
               wasPageOpenedByUser = true;
            });
         }
      }
   );
}

function closeSteamGifts(){
   chrome.tabs.query(
      {"url":["*://www.steamgifts.com/", "*://www.steamgifts.com/giveaways/*"]},
      (tabs)=>{
         if(tabs.length == 0) log("could not find steamgifts page to close");
         else chrome.tabs.remove(tabs[0].id);
      }
   );
}

function reloadPage(tabId, callback){
   chrome.tabs.executeScript(tabId, {"code": "location.reload();"});
   chrome.tabs.onUpdated.addListener(function listener(tabID, info){
      if(tabID == tabId && info.status == "complete"){
         callback();
         chrome.tabs.onUpdated.removeListener(listener);
      }
   });
}

function openGiveawayInNewTab(url, args){
   chrome.tabs.create({"url": url, "active": false, "index": 99999}, (tab)=>{
      chrome.tabs.onUpdated.addListener(function listener(tabID, info){
         if(tabID == tab.id && info.status == "complete"){
            chrome.tabs.sendMessage(tab.id, args);
            chrome.tabs.onUpdated.removeListener(listener);
         }
      });
   });
}

function openAllGiveawaysTabs(giveaways, message){
   for(let aux = 0; aux < giveaways.length; aux ++){
      let element = giveaways[aux];
      setTimeout(()=>openGiveawayInNewTab(
         element.link,
         {"message": message, "context": CONTEXT_BACKGROUND}
      ), aux * 100);
   }
}

chrome.alarms.onAlarm.addListener((alarm)=>{
   if(alarm.name == "update user info"){
      messageSteamGifts("getPoints");
   }
});

chrome.tabs.onRemoved.addListener((tabID, tabInfo)=>{
});

chrome.runtime.onMessage.addListener((message, sender)=>{
   if(message.message == "receiveGiveaways"){
      let targetGiveaways;
      let targetMessage;

      if(operation == "subscribeToAll"){
         targetGiveaways = message.data.toEnter;
         targetMessage = "subscribe";
      }
      else if(operation == "unsubscribeToAll"){
         targetGiveaways = message.data.alreadyIn;
         targetMessage = "unsubscribe";
      }

      if(wasAutoOperation){
         targetGiveaways.sort((e1, e2)=>e1.cost - e2.cost);
      }
      openAllGiveawaysTabs(targetGiveaways, targetMessage);
      openedTabsCount = targetGiveaways.length;
      closedTabsCount = 0;
      if(!wasPageOpenedByUser)
         chrome.tabs.remove(sender.tab.id);
   }

   else if(message.message == "receivePoints"){
      if(!wasPageOpenedByUser)
         chrome.tabs.remove(sender.tab.id);
      chrome.storage.local.userPoints = message.data;
      chrome.browserAction.setBadgeText({"text": message.data.toString(10)});
   }

   else if(message.message == "requestPoints"){
      chrome.runtime.sendMessage(
         {
            "message": "sendPointsToPopup",
            "data": chrome.storage.local.userPoints,
            "context": CONTEXT_BACKGROUND
         }
      );
   }

   else if(message.message == "popupOpenGiveaways"){
      wasAutoOperation = false;
      messageSteamGifts("getGiveaways");
      operation = "subscribeToAll";
   }

   else if(message.message == "popupCloseGiveaways"){
      wasAutoOperation = false;
      messageSteamGifts("getGiveaways");
      operation = "unsubscribeToAll";
   }

   else if(message.success !== undefined){
      log(message.message);
      chrome.tabs.remove(sender.tab.id);
      closedTabsCount ++;
      if(closedTabsCount == openedTabsCount){
         messageSteamGifts("getPoints");
      }
   }

   else{
      log("invalid message");
   }
});

messageSteamGifts("getPoints");
