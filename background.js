let blockedSites = [];
let schedule = {};
let isLocked = true;

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === "install") {
    chrome.storage.sync.set({isFirstRun: true});
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (isLocked && shouldBlockNow()) {
      let url = new URL(details.url);
      if (blockedSites.some(site => url.hostname.includes(site))) {
        return {cancel: true};
      }
    }
    return {cancel: false};
  },
  {urls: ["<all_urls>"]},
  ["blocking"]
);

function shouldBlockNow() {
  let now = new Date();
  let day = now.getDay();
  let time = now.getHours() * 60 + now.getMinutes();
  
  return schedule[day] && schedule[day].some(range => time >= range.start && time < range.end);
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action === "checkFirstRun") {
      chrome.storage.sync.get('isFirstRun', function(data) {
        sendResponse({isFirstRun: data.isFirstRun});
      });
      return true;
    } else if (request.action === "setPassword") {
      chrome.storage.sync.set({password: request.password, isFirstRun: false}, function() {
        sendResponse({success: true});
      });
      return true;
    } else if (request.action === "unlock") {
      chrome.storage.sync.get('password', function(data) {
        if (request.password === data.password) {
          isLocked = false;
          sendResponse({success: true});
        } else {
          sendResponse({success: false});
        }
      });
      return true;
    } else if (request.action === "lock") {
      isLocked = true;
      sendResponse({success: true});
    } else if (request.action === "updateSchedule" && !isLocked) {
      schedule = request.schedule;
      chrome.storage.sync.set({schedule: schedule}, function() {
        sendResponse({success: true});
      });
      return true;
    } else if (request.action === "updateSites" && !isLocked) {
      blockedSites = request.sites;
      chrome.storage.sync.set({blockedSites: blockedSites}, function() {
        sendResponse({success: true});
      });
      return true;
    } else if (request.action === "getSites") {
      sendResponse({sites: blockedSites});
    } else if (request.action === "getSchedule") {
      sendResponse({schedule: schedule});
    } else {
      sendResponse({success: false});
    }
  }
);

chrome.storage.sync.get(['schedule', 'blockedSites'], function(result) {
  if (result.schedule) schedule = result.schedule;
  if (result.blockedSites) blockedSites = result.blockedSites;
});
