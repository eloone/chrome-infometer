//Called when content script sends message
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.method == "getStorage"){
      chrome.storage.sync.get(request.key, function(result){
    	  sendResponse({data: result});
      });
      
      return true;
    }
});


// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
 var page_url = tab.url.replace(/([^#]*)#.*/, '$1');

 console.log(page_url);
 chrome.storage.sync.set({'t' : 'test'}, function(){
	 console.log('ok store');
	 
	 chrome.storage.sync.get('t', function(f){
		 console.log(f);
	 });
 });


 function init(settings){
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
	 
	 chrome.storage.sync.set({page_url : settings}, function(){
		 chrome.storage.sync.get(page_url, function(f){
				console.log(f);
			});
	 });
	 console.log(page_url);
	console.log(settings);
	
	
	
	 if(settings.enabled === true){
		 chrome.tabs.executeScript({
			 file: 'enable.js'
		 });
	 }else{
		 chrome.tabs.executeScript({
			 file: 'disable.js'
		 });
	 }
 }
 
 function isEmpty(obj){
	 for (var key in obj) {
	    if (hasOwnProperty.call(obj, key)) return false;
	 }
	 
	 return true;
 }
  
});
