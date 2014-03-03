/* * * * chrome events * * * */
chrome.management.onInstalled.addListener(function(info){
	console.log('installed');
	refreshContentScripts();
});

chrome.management.onEnabled.addListener(function(info){
	console.log('enabled');
	refreshContentScripts();
});

//Called when content script sends message
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	var urlKey = sender.tab.url.replace(/([^#]*)#.*/, '$1');
	
    if (request.method == 'getStorage'){
         getStorage(urlKey, function(result){
    		 sendResponse({data: result});  
         });
    	 
    	 return true;
    }

    if(request.method == 'setEnabled'){
    	updateSettings(urlKey, {url : urlKey, enabled : true});
    }
    
    if(request.method == 'setDisabled'){
    	updateSettings(urlKey, {url : urlKey, enabled : false});
    }
    
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
	console.log('tab updated');

	updateIcon();
	
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
	console.log('tab activated');

	chrome.tabs.get(activeInfo.tabId, function(tab){
		var url = tab.url.replace(/([^#]*)#.*/, '$1');
		var port = chrome.tabs.connect(tab.id);

		port.onMessage.addListener(function(msg){
			if(msg.data == 'connected'){
				getStorage(url, function(settings){
					port.postMessage({method: "updateStatus", settings : settings, from : 'tab activated'});
				});
			}
		});

		updateIcon();
	});
});

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
 
 var page_url = tab.url.replace(/([^#]*)#.*/, '$1');
 var port = chrome.tabs.connect(tab.id);
 
 getStorage(page_url, init);
 
 function init(settings){
 	var save = {};
 	 console.log('settings');
	 console.log(settings);
	 
	 if(!isEmpty(settings)){
		 if(settings.enabled === true){
			 settings.enabled = false;
		 }else{
			 settings.enabled = true;
		 }
	 }else{
		 settings = {
			enabled : true,
			m1Top : null,
			m2Top : null,
			url : page_url
		 };
	 }

	 save[page_url] = settings;

	 console.log('save');
	 console.log(save);
	 
	 setStorage(save, function(){
		 console.log('setStorage is successful');
		// chrome.tabs.sendMessage(tab.id, {method : 'updateStatus', settings : settings, from : 'click'});
		 port.postMessage({method: "updateStatus", settings : settings, from : 'click'});
		 updateIcon();
	 });
 }  
});

/* * * * libraries * * * */
function refreshContentScripts(){
	// Get all windows
	chrome.windows.getAll({
	    populate: true
	}, function (windows) {
	    var w = windows.length, currentWindow;
	    for( var i = 0; i < w; i++ ) {
	        currentWindow = windows[i];
	        var t = currentWindow.tabs.length, currentTab;
	        for( var j = 0; j < t; j++ ) {
	            currentTab = currentWindow.tabs[j];
	            // Skip chrome:// 
	            if( /^https?:/.test(currentTab.url) ) {
	                injectJsIntoTab(currentTab);
	            }
	        }
	    }
	});
}

function injectJsIntoTab(tab) {
	chrome.manifest = chrome.app.getDetails();
    var scripts = chrome.manifest.content_scripts[0].js;
    var s = scripts.length;

    for( var i = 0; i < s; i++ ) {
        chrome.tabs.executeScript(tab.id, {
            file: scripts[i]
        }, function(){
        	if(i == s){
        		chrome.tabs.sendMessage(tab.id, {method : 'install', from : 'injector'});
        	}
        });
    }
}

function getStorage(key, callback){

	chrome.storage.local.get(key, function(res){
		//if nothing res = {}
		var result = res;

		if(typeof(res[key]) != 'undefined'){
			result = res[key];				
		}

		if(typeof(callback) == 'function'){
			callback(result);
		}
	});
}

function setStorage(save, callback){
	chrome.storage.local.set(save, function(){
		if(chrome.runtime.lastError){
			console.log('error in setStorage save');
	 		console.log(chrome.runtime.lastError);
	 		return;
	 	}
		
		if(typeof callback == 'function'){
			callback();
		}
	});
}

function updateSettings(urlKey, changes, callback){
	getStorage(urlKey, function(settings){
		var save = {};
		
		for(var key in changes){
			if(changes.hasOwnProperty(key)){
				settings[key] = changes[key];
			}
		}
		
		save[urlKey] = settings;
		
		setStorage(save, function(){
			if(typeof callback == 'function'){
				callback();
			}
		});
	});
}

function updateIcon(){
	console.log('updateIcon');
	
	chrome.tabs.query(
	  {currentWindow: true, active : true, windowType : 'normal'},
	  function(tabArray){
		  var currentTab = tabArray[0];
		console.log(currentTab);
		//don't change anything if there is no result => the current tab must be a devtools tab
		if(typeof currentTab == 'undefined'){		
			return;
		}
		
		//otherwise update the icon
		var id = currentTab.id;
		var keyUrl = currentTab.url.replace(/([^#]*)#.*/, '$1');
		
		getStorage(keyUrl, function(settings){
			if('enabled' in  settings){
				if(settings.enabled === true){
					setEnabled();
				}else{
					setDisabled();
				}
			}else{
				setDisabled();
			}
		});
		
		/*if(id in iconStatus){
			if(iconStatus[id] === true){
				console.log('iconStatus[ '+id+' ] is true');
				setEnabled();
			}else{
				console.log('iconStatus[ '+id+' ] is false');
				setDisabled();
			}
		}else{
			//for non http tabs
			console.log('no '+id+' in iconStatus');
			iconStatus[id] = false;
			setDisabled();
		}*/

	  }
	);	
}

function setEnabled(tab){
	console.log('setEnabled');
	 chrome.browserAction.setBadgeText({text : 'ON'});
	 chrome.browserAction.setBadgeBackgroundColor({color : '#fec603'});
	 chrome.browserAction.setTitle({title : 'Infometer is active'});
}

function setDisabled(){
	console.log('setDisabled');
	 chrome.browserAction.setBadgeText({text : 'OFF'});
	 chrome.browserAction.setBadgeBackgroundColor({color : [140,140,140,255]});
	 chrome.browserAction.setTitle({title : 'Infometer is inactive'});
}

function isEmpty(obj){
	 for (var key in obj) {
	    if (hasOwnProperty.call(obj, key)) return false;
	 }
	 
	 return true;
}
