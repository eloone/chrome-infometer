/* Main background script that communicates with the client and enables the extension */


//tracks the state of the connection to the content script {tabId : true | 'pending'} per tab if the tab's content script connected
//otherwise the id of the tab is not defined in the object
//allows to track which tabs need to be reloaded to make the extension work otherwise there is a port disconnection error
//this happens when chrome doesn't manage to inject a content script in a tab, it happens
var TabsConnected = {};

/* * * * storage daemons * * * */
initStorage();
syncStorage();

/* * * * chrome events * * * */

//called when the extension is first installed or the runtime is reloaded
chrome.runtime.onInstalled.addListener(function(info){
	refreshContentScripts();
	updateIcon();
});

//called when the extension is enabled and at chrome updates
chrome.management.onEnabled.addListener(function(info){
	//enabling/disabling the extension doesn't reload the runtime which causes port disconnections
	//so we force runtime reload when enabling the extension it triggers the onInstalled hook
	//for now off because it does not behave ok when published
	//chrome.runtime.reload();
});

//called when the client connects to the extension
chrome.runtime.onConnect.addListener(function(port){
	//as soons as a content script connects we trace the connection status here
	if(port.sender.tab){
		TabsConnected[port.sender.tab.id] = true;
		updateIcon();
	}

	port.onMessage.addListener(function(post) {
		
		if(typeof port.sender.tab == 'undefined'){
			return;
		}

		if(typeof post.data != 'undefined'){
			console.log(post.data);
		}
		
		var urlKey = port.sender.tab.url.replace(/([^#]*)#.*/, '$1');
	
		if(post.method == 'updateSettings'){	
			
			updateSettings(urlKey, post.data);

		}

	});
});

//called when tab is reloaded
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){

	if(changeInfo.status == 'complete'){
		//if tab just opened we set the connection status to pending until client script connects
		TabsConnected[tab.id] = TabsConnected[tab.id] || 'pending';

		var url = tab.url.replace(/([^#]*)#.*/, '$1');
		
		getSettings(url, function(settings){
			var port = chrome.tabs.connect(tab.id);
			port.postMessage({method : 'install', settings : settings, from : 'tab updated'});
			updateIcon();
		});
	}

});

//called when tab is activated
chrome.tabs.onActivated.addListener(function(activeInfo) {

	chrome.tabs.get(activeInfo.tabId, function(tab){
		var url = tab.url.replace(/([^#]*)#.*/, '$1');
		var port = chrome.tabs.connect(tab.id);

		//if tab just opened we set the connection status to pending until client script connects
		TabsConnected[tab.id] = TabsConnected[tab.id] || 'pending';

		getSettings(url, function(settings){
			port.postMessage({method: "updateStatus", settings : settings, from : 'tab activated'});
		});

		updateIcon();
		
	});
});

//called when the icon is clicked
chrome.browserAction.onClicked.addListener(function(tab) {
 
 var urlKey = tab.url.replace(/([^#]*)#.*/, '$1');
 var port = chrome.tabs.connect(tab.id);
 var isHttp = urlKey.match(/^https?/);
 var isBlocked = urlKey.match(/chrome\.google\.com\/webstore/);

 //if it is still pending it means it never connected
 if(TabsConnected[tab.id] == 'pending'){
 	delete TabsConnected[tab.id];
 }

 if(!isHttp || isBlocked){
 	return;
 }

 getSettings(urlKey, init);
 
 function init(settings){

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

//called when the storage is being changed
chrome.storage.onChanged.addListener(function(changes, areaName){

	//we put the changes in a queue that will later be ingested by the syncStorage daemon
	//we do this to avoid writing more than the allowed limit in the sync storage
	if(areaName == 'local'){
		storageSynced = false;
		storageChangesQueue.unshift(changes);
	}

});

/* * * * libraries * * * */

//gets the settings for a tab depending on its url
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

//writes the changed settings in the storage
//called when icon is clicked and when client asks to update the settings
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

//gets the record from the storage
function getStorage(key, callback){

	//ideally the record should always come from the sync storage
	//but if it is not synced yet we get record from local storage
	if(storageSynced === true){
		chrome.storage.sync.get(key, onResult);
	}else{
		chrome.storage.local.get(key, onResult);
	}
	
	function onResult(res){
		try{
			if(chrome.runtime.lastError){				
		 		console.log('error in setStorage getStorage');
				console.error(chrome.runtime.lastError);
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
		catch(e){
			onStorageError(e);
		}
	}
	
}

//writes the settings in the local storage to avoid sync storage limitation
//local storage is not limited in any way
function setStorage(save, callback){
	chrome.storage.local.set(save, function(){
		try{
			if(chrome.runtime.lastError){
				console.log('error in setStorage');
		 		console.error(chrome.runtime.lastError);
		 		return;
		 	}
			
			if(typeof callback == 'function'){
				callback();
			}
		}
		catch(e){
			onStorageError(e);
		}
	});
}

function onStorageError(e){
	//if the content script is not reloaded when the extension is updated/reloaded
	//storage callbacks provoke a disconnected port error
	//this can happen when chrome doesn't manage to inject the content script it happens
	console.error(e);

	var msg = e.message;
	//should never happen if the content scripts are refreshed every enable/install
	//but sometimes it happens
	if(msg == 'Attempting to use a disconnected port object'){
		updateIcon({error : 'disconnected'});
	}
}

/* * * * icon updates * * * */

//called at every change of tab reloaded or activated
//it just updates the icon based on the current tab returned by the tab query
//the icon updates are independant from the client script
function updateIcon(params){

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
		var isHttp = urlKey.match(/^https?/);
		var isBlocked = urlKey.match(/chrome\.google\.com\/webstore/);
		
		//content scripts are blocked on the webstore
		if(!isHttp || isBlocked){
			setError('blocked');
			return;
		}

		//case when port disconnected from storage fcts
		if(params && params.error){
			delete TabsConnected[id];

			if(params.error == 'disconnected'){
				setError('reload');			
			}

			return;
		}

		//case when tab exists but never connected
		if(typeof TabsConnected[id] == 'undefined'){
			setError('reload');
			return;
		}

		if(TabsConnected[id] == 'pending'){
			setDisabled();
		}

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

//sets the icon in error if some error happens
function setError(msg){
	var title = "";

	chrome.browserAction.setBadgeText({text : 'ERR'});
	chrome.browserAction.setBadgeBackgroundColor({color : '#B01100'});

	switch(msg){
		case 'reload':
			title = 'Please reload this tab to use Infometer';
			break;
		case 'blocked':
			chrome.browserAction.setBadgeText({text : 'OFF'});
			title = "Infometer doesn't work on this type of page";
			break;
		default :
			title = 'An error occured';
			break;
	}

	chrome.browserAction.setTitle({title : title});
}

//switches the icon on
function setEnabled(tab){
	 chrome.browserAction.setBadgeText({text : 'ON'});
	 chrome.browserAction.setBadgeBackgroundColor({color : '#fec603'});
	 chrome.browserAction.setTitle({title : 'Infometer is active'});
}

//switches the icon off
function setDisabled(){
	 chrome.browserAction.setBadgeText({text : 'OFF'});
	 chrome.browserAction.setBadgeBackgroundColor({color : [140,140,140,255]});
	 chrome.browserAction.setTitle({title : 'Infometer is inactive'});
}

/* * * * utils * * * */

//forces all tabs in all windows to rerun their content scripts
//used when extension is enabled or installed
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

//inject all content scripts in the manifest in a given tab
function injectJsIntoTab(tab) {
	chrome.manifest = chrome.app.getDetails();
    var scripts = chrome.manifest.content_scripts[0].js;
    var s = scripts.length; 
    
    for( var i = 0; i < s; i++ ) {
        chrome.tabs.executeScript(tab.id, {
            file: scripts[i]
        }, function(){	
        	if(i == s){
        		var port = chrome.tabs.connect(tab.id);
        		port.postMessage({method : 'install', from : 'injector'});
        	}
        });
    }
}

function isEmpty(obj){
	 for (var key in obj) {
	    if (hasOwnProperty.call(obj, key)) return false;
	 }
	 
	 return true;
}
