initStorage();
syncStorage();
console.log('storageSynced after initStorage');
console.log(storageSynced);

/* * * * chrome events * * * */
chrome.runtime.onInstalled.addListener(function(info){
	console.log('installed or enabled');
	refreshContentScripts();
});

chrome.management.onEnabled.addListener(function(info){
	console.log('enabled');
	chrome.runtime.reload();
	refreshContentScripts();
});

chrome.runtime.onSuspend.addListener(function(){
	//disableContentScripts();
	chrome.tabs.executeScript(tab.id, {
            file: 'disable.js'
        });
});

chrome.runtime.onSuspendCanceled.addListener(function (){
	chrome.tabs.executeScript(tab.id, {
            code: 'alert("suspended canceled")'
        });
});

chrome.runtime.onConnect.addListener(function(port){
	port.onMessage.addListener(function(post) {
		console.log('in port on message');
		console.log(post);
		if(typeof port.sender.tab == 'undefined'){
			return;
		}
		
		var urlKey = port.sender.tab.url.replace(/([^#]*)#.*/, '$1');
	
		if(post.method == 'updateSettings'){
	
			updateSettings(urlKey, post.data, function(){
				console.log('updated settings');
			});
		}

	});
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
	console.log('tab updated');
	console.log(changeInfo);

	if(changeInfo.status == 'complete'){
		var url = tab.url.replace(/([^#]*)#.*/, '$1');
		
	//chrome.storage.local.clear();	
		getSettings(url, function(settings){
			var port = chrome.tabs.connect(tab.id);
			
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

		getSettings(url, function(settings){
			console.log(console.log(JSON.stringify(settings)));
			port.postMessage({method: "updateStatus", settings : settings, from : 'tab activated'});
		});

		updateIcon();
	});
});

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
 
 var urlKey = tab.url.replace(/([^#]*)#.*/, '$1');
 var port = chrome.tabs.connect(tab.id);
 //chrome.storage.local.clear();
 getSettings(urlKey, init);
 
 function init(settings){
 	 console.log('settings');
	 console.log(settings);

	 if(settings.enabled === true){
	 	settings.enabled = false;
	 }else{
	 	settings.enabled = true;
	 }

	updateSettings(urlKey, settings, function(){

		port.postMessage({method: "updateStatus", settings : settings, from : 'click on icon'});
		
		updateIcon();
	});
 }  

});

chrome.storage.onChanged.addListener(function(changes, areaName){
	console.log('changes');
	console.log(changes);
	console.log('areaName');
	console.log(areaName);
	if(areaName == 'local'){
		storageSynced = false;
		storageChangesQueue.unshift(changes);
	}
	console.log('storageChangesQueue in onChanged');
	console.log(storageChangesQueue);
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

function getSettings(url, callback){
	
	getStorage(url, function(settings){
		//it gets a date once it is stored only
		//nothing is stored until the icon is clicked 
		//so if the record is empty it has the following disabled settings
		if(isEmpty(settings)){
			settings = {
				enabled : false,
				m1Top : null,
				m2Top : null,
				url : url
			};
		}
		
		if(typeof callback == 'function'){
			callback(settings);
		}
	});
}

function getStorage(key, callback){
	console.log('storageSynced in getStorage');
	console.log(storageSynced);
	
	if(storageSynced === true){
		chrome.storage.sync.get(key, onResult);
	}else{
		chrome.storage.local.get(key, onResult);
	}
	
	
	function onResult(res){
		if(chrome.runtime.lastError){
			console.log(chrome.runtime.lastError);
		}
		//if nothing res = {}
		var result = res;

		if(typeof(res[key]) != 'undefined'){
			result = res[key];				
		}

		if(typeof(callback) == 'function'){
			callback(result);
		}
	}
	
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
		
		settings['time'] = Date.now();
		settings['date'] = new Date().toString();

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
		//don't change anything if there is no result => the current tab must be a devtools tab
		if(typeof currentTab == 'undefined'){		
			return;
		}
		
		//otherwise update the icon
		var id = currentTab.id;
		var urlKey = currentTab.url.replace(/([^#]*)#.*/, '$1');
		
		getSettings(urlKey, function(settings){
			if(settings.enabled === true){
				setEnabled();
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
