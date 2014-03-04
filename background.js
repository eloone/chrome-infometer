/* * * * chrome events * * * */
chrome.management.onInstalled.addListener(function(info){
	console.log('installed');
	refreshContentScripts();
});

chrome.management.onEnabled.addListener(function(info){
	console.log('enabled');
	refreshContentScripts();
});

chrome.management.onDisabled.addListener(function(info){
	disableContentScripts();
});

chrome.runtime.onConnect.addListener(function(port){
	console.log('connected to port');
	console.log(port);

	port.onMessage.addListener(function(post) {
		console.log('in port on message');
		console.log(post);
		
		var urlKey = port.sender.tab.url.replace(/([^#]*)#.*/, '$1');
	
		if(post.method == 'updateSettings'){
	
			updateSettings(urlKey, post.data, function(){
				console.log('updated settings');
			});
		}

	});
});

//Called when content script sends message
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	var urlKey = sender.tab.url.replace(/([^#]*)#.*/, '$1');
		console.log('in runtime on message');
		console.log(request);
    
	if (request.method == 'getStorage'){
         getStorage(urlKey, function(result){
    		 sendResponse({data: result});  
         });
    	 
    	 return true;
    }
    
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
	console.log('tab updated');
	console.log(changeInfo);
	//chrome.tabs.sendMessage(tab.id, {method : 'install', from : 'tab updated'});
	if(changeInfo.status == 'complete'){
		var url = tab.url.replace(/([^#]*)#.*/, '$1');
		var port = chrome.tabs.connect(tab.id);
	//chrome.storage.local.clear();	
		getStorage(url, function(settings){
			if(isEmpty(settings)){
				settings = {
					enabled : false,
					m1Top : null,
					m2Top : null,
					url : url
				}
			}
			
			port.postMessage({method : 'install', settings : settings, from : 'tab updated'});
			
			updateIcon();
		});
	}

});

chrome.tabs.onActivated.addListener(function(activeInfo) {
	console.log('tab activated');

	chrome.tabs.get(activeInfo.tabId, function(tab){
		var url = tab.url.replace(/([^#]*)#.*/, '$1');
		var port = chrome.tabs.connect(tab.id);

		getStorage(url, function(settings){
			port.postMessage({method: "updateStatus", settings : settings, from : 'tab activated'});
		});

		updateIcon();
	});
});

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
 
 var page_url = tab.url.replace(/([^#]*)#.*/, '$1');
 var port = chrome.tabs.connect(tab.id);
 //chrome.storage.local.clear();
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

		 port.postMessage({method: "updateStatus", settings : settings, from : 'click on icon'});
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
            file: 'client.js'//scripts[i]
        }, function(){
        	if(i == s){
        		//chrome.tabs.sendMessage(tab.id, {method : 'install', from : 'injector'});
        		var port = chrome.tabs.connect(tab.id);
        		port.postMessage({method : 'install', from : 'injector'});
        	}
        });
    }
}

function disableContentScripts(){
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
	                injectDisableJsIntoTab(currentTab);
	            }
	        }
	    }
	});
}

function injectDisableJsIntoTab(tab) {
        chrome.tabs.executeScript(tab.id, {
            file: 'disable.js'
        });
    
}

function getSettings(){
	
}

function getStorage(key, callback){

	chrome.storage.local.get(key, function(res){
		console.log(chrome.runtime.lastError);
		console.log(res);
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
		var urlKey = currentTab.url.replace(/([^#]*)#.*/, '$1');
		
		getStorage(urlKey, function(settings){
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
