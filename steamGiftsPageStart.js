chrome.runtime.onMessage.addListener((message)=>{
let log = console.log;
const CONTEXT_MAINPAGE = "mainPage";

function parseHeading (heading){
   let name = "undefined", cost = "undefined", copies = "undefined";

   for(let aux = 0; aux < heading.children.length; aux ++){
      let child = heading.children[aux];
      if(child.tagName == "A" && child.className == "giveaway__heading__name"){
         name = child.innerHTML;
      }
      else if(child.tagName == "SPAN" && child.className == "giveaway__heading__thin"){
         let newString = child.innerHTML.substring(1);
         let num = parseInt(newString);
         if(isNaN(num)) throw("invalid cost reading");

         if(child.innerHTML.indexOf("Copies") != -1){
            newString = newString.substring(num.toString(10).length);
            while(newString[0] == ","){
               newString = newString.substring(1);
               num = 1000 * num + parseInt(newString);
               newString = newString.substring(num.toString(10).length);
            }
            copies = num;
         }
         else cost = num;
      }
      else if(child.tagName == "A" && child.className == "giveaway__icon");
      else if(child.tagName == "I");
      else log("invalid tag!\nname: " + child.tagName + "\nclass: " + child.className);
   }
   return {"name": name, "cost": cost, "copies": copies}
}

function parseColumns(colum){
   let level = "undefined";
   let expirationDate = "undefined";
   let publishDate = "undefined";
   let userName = "undefined";
   let publisherName = "undefined";
   let publisherProfilePath = "undefined";
   let isRegionRestricted = false;
   for(let aux = 0; aux < colum.children.length; aux ++){
      let child = colum.children[aux];
      if(child.tagName == "DIV"){
         if(child.className == ""){
            for(let aux1 = 0; aux1 < child.children.length; aux1 ++){
               let child2 = child.children[aux1];
               if(child2.tagName == "SPAN")
                  expirationDate = child2.getAttribute("data-timestamp");
               else if(child2.tagName == "I");
               else log("invalid tag!\nname: " + child2.tagName + "\nclass: " + child2.className);
            }
         }
         else{
            let classes = child.className.split(" ");
            if(classes[0] == "giveaway__column--contributor-level"){
               level = parseInt(child.innerHTML.substring(6));
            }
            else if(classes[0] == "giveaway__column--width-fill"){
               for(let aux1 = 0; aux1 < child.children.length; aux1 ++){
                  let child2 = child.children[aux1];
                  if(child2.tagName == "SPAN"){
                     publishDate = child2.getAttribute("data-timestamp");
                  }
                  else if(child2.tagName == "A" && child2.className == "giveaway__username"){
                     publisherName = child2.innerHTML;
                     publisherProfilePath = child2.href;
                  }
                  else log("invalid tag!\nname: " + child2.tagName + "\nclass: " + child2.className);
               }
            }
         }
      }
      else if(child.tagName == "A" && child.className == "giveaway__column--region-restricted"){
         isRegionRestricted = true;
      }
      else log("invalid tag!\nname: " + child.tagName + "\nclass: " + child.className);
   }
   return {
      "level": level,
      "expirationDate": expirationDate,
      "publisherProfilePath": publisherProfilePath,
      "publisherName": publisherName,
      "publishDate": publishDate,
      "isRegionRestricted": isRegionRestricted
   };
}

function parseLinks(linksTable){
   let commentsLink = "undefined";
   let commentsNumber = "undefined";
   let entriesLink = "undefined";
   let entriesNumber = "undefined";
   entriesNumber = parseInt(linksTable.firstElementChild.lastElementChild.innerHTML);
   entriesLink = linksTable.firstElementChild.href;
   commentsNumber = parseInt(linksTable.lastElementChild.lastElementChild.innerHTML);
   commentsLink = linksTable.lastElementChild.href;
   return {
      "entriesNumber": entriesNumber,
      "entriesLink": entriesLink,
      "commentsLink": commentsLink,
      "commentsNumber": commentsNumber
   }
}

function parseSumary(sumary){
   let heading = "undefined";
   let colum = "undefined";
   let links = "undefined";
   for(let aux = 0; aux < sumary.children.length; aux ++){
      let child = sumary.children[aux];
      if(child.tagName == "H2" && child.className == "giveaway__heading"){
         heading = parseHeading(child);
      }
      else if(child.tagName == "DIV" && child.className == "giveaway__columns"){
         colum = parseColumns(child);
      }
      else if(child.tagName == "DIV" && child.className == "giveaway__links"){
         links = parseLinks(child);
      }
      else throw("invalid tag!\nname: " + child.tagName + "\nclass: " + child.className);
   }
   return {...heading, ...colum, ...links};
}

function parseGiveaway(giveaway){
   let sumary = {};
   let link = "undefined";
   let alreadyIn = false;

   for(let aux = 0; aux < giveaway.children.length; aux ++){
      let child = giveaway.children[aux];
      if(child.tagName == "DIV" && child.className == "giveaway__summary"){
         sumary = parseSumary(child);
      }
      else if(child.tagName == "A" && child.className == "giveaway_image_avatar"){
      }
      else if(child.tagName == "A" && child.className == "giveaway_image_thumbnail"){
         link = child.href;
      }
      else if(child.tagName == "A" && child.className == "giveaway_image_thumbnail_missing"){
         link = child.href;
      }
      else log("invalid tag!\nname: " + child.tagName + "\nclass: " + child.className);
   }

   if(giveaway.className.split(" ").length > 1)
      alreadyIn = true;

   return {...sumary, "link": link, "alreadyIn": alreadyIn}
}

function getUserStats(){
   let pointsElement = document.getElementsByClassName("nav__points")[0];
   let levelElement = pointsElement.parentElement.lastElementChild;
   let points = parseInt(pointsElement.innerHTML);
   let level = parseInt(levelElement.innerHTML.substring(6));

   return {"points": points, "level": level};
}

function organizeGiveaways(){
   let giveawaysHTML = document.getElementsByClassName("giveaway__row-inner-wrap");
   let userStats = getUserStats();
   let totalCost = 0;
   let toEnter = [];
   let levelTooHigh = [];
   let notEnoughPoints = [];
   let alreadyIn = [];
   for(let aux = 0; aux < giveawaysHTML.length; aux ++){
      let parsed = parseGiveaway(giveawaysHTML[aux]);
      if(parsed.alreadyIn)
         alreadyIn.push(parsed);
      else if((parsed.level === "undefined" || parsed.level <= userStats.level)){
         if(parsed.cost + totalCost <= userStats.points){
            toEnter.push(parsed);
            totalCost += parsed.cost;
         }
         else notEnoughPoints.push(parsed);
      }
      else{
         let parent = giveawaysHTML[aux].parentElement;
         levelTooHigh.push(parent);
      }
   }
   return {
      "toEnter": toEnter,
      "levelTooHigh": levelTooHigh,
      "totalCost": totalCost,
      "alreadyIn": alreadyIn,
      "userPoints": userStats.points
   };
}

if(message.message == "getGiveaways"){
   let giveaways = organizeGiveaways();
   chrome.runtime.sendMessage(
      {
         "message": "receiveGiveaways",
         "data": giveaways,
         "context": CONTEXT_MAINPAGE
      }
   );
}
else if(message.message == "getPoints"){
   let points = getUserStats().points;
   chrome.runtime.sendMessage(
      {
         "message": "receivePoints",
         "data": points,
         "context": CONTEXT_MAINPAGE
      }
   );
}

});
