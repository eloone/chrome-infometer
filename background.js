var iconStatus = {};


/* * * * chrome events * * * */
chrome.management.onInstalled.addListener(function(info){
	console.log('installed');
	refreshContentScripts();
	updateIcon();
});

chrome.management.onEnabled.addListener(function(info){
	console.log('enabled');
	refreshContentScripts();
	updateIcon();
});

//Called when content script sends message
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	
    if (request.method == 'getStorage'){
    	/* chrome.storage.local.get(request.key, function(result){
    	 	console.log('in getStorage');
    	 	console.log(result);
    		 sendResponse({data: result});   		
         }); */


         getStorage(request.key, function(result){
         	console.log('in getStorage');
    	 	console.log(result);
    		 sendResponse({data: result});  
         });
    	 
    	 return true;
    }

    if(request.method == 'setEnabled'){
    	console.log('sender');
    	console.log(sender);
    	console.log('message setEnabled');
    	//setEnabled();

    	iconStatus[sender.tab.id] = true;
    }
    
    if(request.method == 'setDisabled'){
    	//setDisabled();
    	iconStatus[sender.tab.id] = false;
    }
    
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
	console.log('tab activated');
/*chrome.tabs.getCurrent(function(tab){
	console.log('getCurrent');
console.log(tab);
	});*/
	/*chrome.tabs.sendMessage(activeInfo.tabId, {method : 'updateStatus', from : 'tab activated'}, function(res){
	 		console.log(chrome.runtime.lastError);
	 		if(!res) return;
	 		console.log('executed from client '+res.data);
	 });*/
	
	/*var port = chrome.tabs.connect(activeInfo.tabId);

	port.onMessage.addListener(function(msg) {
		console.log(chrome.runtime.lastError);
		console.log('message from '+ activeInfo.tabId);
		console.log(msg);

		if(msg.data == 'connected'){
			chrome.tabs.get(activeInfo.tabId, function(tab){
				var url = tab.url.replace(/([^#]*)#./, '$1');

	/*			getStorage(url, function(settings){
					var enabled = false;

					if('enabled' in settings){
						enabled = settings.enabled;
					}
console.log(enabled);
					if(enabled === true){
						setEnabled();
					}else{
						setDisabled();
					}

					port.postMessage({method: "updateStatus", settings : settings, from : 'tab activated'});

				});

			});
		}
	});*/

	chrome.tabs.get(activeInfo.tabId, function(tab){
		var url = tab.url.replace(/([^#]*)#.*/, '$1');
console.log(url);
		if(url.match(/^https?/)){
			var port = chrome.tabs.connect(tab.id);

			port.onMessage.addListener(onMessage);

			function onMessage(msg){
				if(msg.data == 'connected'){
					getStorage(url, function(settings){
						/*var enabled = false;

						if('enabled' in settings){
							enabled = settings.enabled;
						}
			console.log(enabled);
						if(enabled === true){
							//setEnabled();
						}else{
							setDisabled();
						}*/

						port.postMessage({method: "updateStatus", settings : settings, from : 'tab activated'});

					});
				}
			}
			
		}

		updateIcon(tab);
	});

	

	console.log(iconStatus);


});

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
 
 var page_url = tab.url.replace(/([^#]*)#.*/, '$1');

 chrome.storage.local.get(page_url, init);

 function init(saved){
 	var settings = saved[page_url] || {},
 		save = {};
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

	 chrome.storage.local.set(save, function(){

	 	if(chrome.runtime.lastError){
	 		console.log(chrome.runtime.lastError);
	 	}

		 chrome.tabs.sendMessage(tab.id, {method : 'updateStatus', from : 'click'}, function(res){
		 		console.log(chrome.runtime.lastError);
		 		console.log('executed from client '+res.data);
		 });
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

function updateIcon(tab){
	console.log('updateIcon');

		console.log('tab from updateIcon');
		console.log(tab);
		if(typeof tab == 'undefined'){
			setDisabled();
		}else{

			var id = tab.id;

			if(id in iconStatus){
				if(iconStatus[id] === true){
					console.log('iconStatus[ '+id+' ] is true');
					setEnabled();
				}else{
					console.log('iconStatus[ '+id+' ] is false');
					setDisabled();
				}
			}else{
				console.log('no '+id+' in iconStatus');
				setDisabled();
			}
		}
	
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
