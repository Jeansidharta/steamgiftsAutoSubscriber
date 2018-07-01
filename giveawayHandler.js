const STATUS_GIVEAWAY_DUPLICATED = "giveaway duplicated";
const STATUS_GIVEAWAY_EXPIRED = "giveaway expired"
const STATUS_GIVEAWAY_UNKNOWN = "unknown";
const STATUS_GIVEAWAY_JOINABLE = "can subscribe";
const STATUS_GIVEAWAY_LOADING = "loading";

const CONTEXT_GIVEAWAY = "giveaway";

chrome.runtime.onMessage.addListener((message)=>{

let log = console.log;

function getExpirationDate(){
   let dateDiv = document.getElementsByClassName("featured__columns")[0];
   dateDiv = dateDiv.firstElementChild.lastElementChild;
   return parseInt(dateDiv.getAttribute("data-timestamp"));
}

function getElement(className){
   let isHidden = false;
   let isDisabled = false;
   let element = document.getElementsByClassName(className)[0];
   if(element != null){
      let tokens = element.className.split(" ");
      tokens.forEach((element)=>{
         if(element == "is-hidden") isHidden = true;
         if(element == "is-disabled") isDisabled = true;
      });
   }
   return {
      "element": element,
      "isHidden": isHidden,
      "isDisabled": isDisabled,
      "clickable" : !isHidden && !isDisabled && element != null
   };
}


function getGiveawayStatus(){

   let status = "none";
   let subscribeButton = getElement("sidebar__entry-insert");
   let unsubscribeButton = getElement("sidebar__entry-delete");
   let errorButton = getElement("sidebar__error");
   let loadingButton = getElement("sidebar__entry-loading");
   let timestamp = getExpirationDate();

   if(!subscribeButton.element){
      log("didnt find the button, looking for an error...");
      if(errorButton.element){
         log("error is" + errorButton.element.innerText);
         status = errorButton.element.innerText.trim();
      }
      else{
         log("didnt find the error... looking for the timestamp");
         log("timestamp is " + timestamp);
         if(Date.now() > timestamp){
            log("oh! this is expired!");
            status = STATUS_GIVEAWAY_EXPIRED;
         }
         else{
            log("then i dont know what to do :(");
            status = STATUS_GIVEAWAY_UNKNOWN;
         }
      }
   }
   else if(!subscribeButton.clickable){
      log("i cant click it...");
      if(!loadingButton.isHidden){
         log("yes! yes! its loading! phew");
         status = STATUS_GIVEAWAY_LOADING;
      }
      else if(unsubscribeButton.clickable){
         log("ah! i've already entered in this giveaway");
         status = STATUS_GIVEAWAY_DUPLICATED;
      }
      else{
         log("well, the delete button is not clickable, so it should be working");
         status = STATUS_GIVEAWAY_UNKNOWN;
      }
   }
   else status = STATUS_GIVEAWAY_JOINABLE;
   return {
      "status": status,
      "subscribeButton": subscribeButton,
      "unsubscribeButton": unsubscribeButton,
      "errorButton": errorButton
   };
}

function replyOnStatus(statusExpected, statusIgnorable){
   if(typeof(statusIgnorable) == "string") statusIgnorable = [statusIgnorable];
   let handler = setInterval(()=>{
      let giveaway = getGiveawayStatus();
      if(giveaway.status == statusExpected){
         chrome.runtime.sendMessage(
            {
               "message" : message,
               "success": true,
               "context": CONTEXT_GIVEAWAY
            }
         );
         log("the operation was supposedly complete");
         clearInterval(handler);
      }
      else{
         let flag = false;
         for(let aux = 0; aux < statusIgnorable.length; aux ++){
            if(giveaway.status == statusIgnorable[aux]){
               flag = true;
               break;
            }
         }
         if(!flag){
            log("something went wrong");
            log(giveaway.status);
            chrome.runtime.sendMessage(
               {
                  "message" : giveaway.status,
                  "success": false,
                  "context": CONTEXT_GIVEAWAY
               }
            );
            clearInterval(handler);
         }
      }
   }, 100);
}

let giveawayStatus = getGiveawayStatus();
log(message.message);
if(message.message == "subscribe"){
   if(giveawayStatus.status == STATUS_GIVEAWAY_JOINABLE)
      giveawayStatus.subscribeButton.element.click();
   replyOnStatus(STATUS_GIVEAWAY_DUPLICATED, STATUS_GIVEAWAY_LOADING);
}

if(message.message == "unsubscribe"){
   if(giveawayStatus.status == STATUS_GIVEAWAY_DUPLICATED)
      giveawayStatus.unsubscribeButton.element.click();
   replyOnStatus(STATUS_GIVEAWAY_JOINABLE, STATUS_GIVEAWAY_LOADING);
}

});
