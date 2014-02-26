//Called when content script sends message
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.method == "getStorage"){
    	 chrome.storage.sync.get(request.key, function(result){
    		 sendResponse({data: result});   		
         });    	        
    }
    
    return true;
});

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
 var page_url = tab.url.replace(/([^#]*)#.*/, '$1');
//chrome.storage.sync.clear();
//return;
 chrome.storage.sync.get(page_url, init);

 function init(saved){
 	var settings = saved[page_url] || {},
 		save = {};
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
			m2Top : null
		 };
	 }

	 save[page_url] = settings;
	 
	 chrome.storage.sync.set(save, function(){
		 chrome.tabs.executeScript({
			 file: 'init.js'
		 });
	 });
 }
 
 function isEmpty(obj){
	 for (var key in obj) {
	    if (hasOwnProperty.call(obj, key)) return false;
	 }
	 
	 return true;
 }
  
});
