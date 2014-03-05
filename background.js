var storageChangesQueue = [];
var storageSynced = false;

function cleanStorage(all){
	var total = 0, remove = [];
	
	if(!all){
		chrome.storage.sync.get(null, clean);
	}else{
		clean(all);
	}
	
	function clean(all){
		for(var url in all){
			total++;
		}
		console.log('total');
		console.log(total);
		if(total > 500){
			for(var url in all){
				if(all[url].enabled === false && m1Top === null){
					remove.push(url);
				}
			}
			
			chrome.storage.sync.remove(remove, function(){
				if(chrome.runtime.lastError){
					console.log(chrome.runtime.lastError);
				}
				
				console.log('sync storage clean');
			});
			
			if(remove.length == 0){
				//remove the 250 least recent
				
				var sortedByDate = mergeSortByDate(all);
			}			
		}
	}

	setTimeout(cleanStorage, 1.8e+6);
}

function initStorage(){
	chrome.storage.local.get(null, function(all){
		console.log(all);
	});
	
	chrome.storage.sync.get(null, function(all){
		console.log('content in sync after set');
		console.log(all);
		
		cleanStorage(all);
		
		if(isEmpty(all)){
			chrome.storage.local.clear();
		}
		
		chrome.storage.local.set(all, function(){
			console.log('local done');
			
			storageSynced = true;
		});
		
	});
	
}

function syncStorage(){
	console.log('hello extension');
	console.log('storageChangesQueue in syncStorage');
	console.log(storageChangesQueue);
	
	while(storageChangesQueue.length > 0){
		storageSynced = false;
		
		var changed = storageChangesQueue.pop();
		
		for(var url in changed){
			if(typeof(changed[url].newValue) !== 'undefined'){
				var newValue = {};
				newValue[url] = changed[url].newValue;
				
				chrome.storage.sync.set(newValue, function(){
					if(!chrome.runtime.lastError){
						storageSynced = true;
					}
					console.log('sync storage synced');						
				});

				console.log(newValue);
			}
		}
	}
	
	//less than 10 write operations per minute
	setTimeout(syncStorage, 7000);
}

initStorage();
syncStorage();
console.log('storageSynced after initStorage');
console.log(storageSynced);

/* * * * chrome events * * * */
setTimeout(function(){
		console.log('hello me');
	}, 1000);

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

		if(isEmpty(settings)){
			settings = {
				enabled : false,
				m1Top : null,
				m2Top : null,
				url : url,
				time : Date.now()
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
		chrome.storage.sync.getBytesInUse(key, function(bytes){
			console.log('bytes in use');
			console.log(bytes);
		});
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
		
		console.log(currentTab);

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
