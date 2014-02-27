//reset if click on extension icon
if(typeof(chromeInfometer) != 'undefined' && chromeInfometer instanceof Extension){
	chromeInfometer = new Extension();
};

window.addEventListener('load', function(){
	chromeInfometer = new Extension();
});

