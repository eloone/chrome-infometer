/* * * * activation * * * */
//var PORT = chrome.runtime.connect();

//called when page is reloaded
window.addEventListener('load', function(){
	chromeInfometer = new Extension();
	console.log(chromeInfometer);
	chromeInfometer.init();

	console.log('load event');
});
console.log('CLIENT JS');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
	if(!request){
		sendResponse({data : 'no request object in install request'});
		return;
	}
	//called when installed/updated/enabled
	if(request.method == 'install'){
		if(document.readyState == 'complete'){
			console.log('install event');
			//this is equivalent to a page load
			chromeInfometer = new Extension();
			chromeInfometer.init();
			sendResponse({data : 'installed Extension'});
		}
	}

});
//chrome.runtime.onMessage.addListener(onMessage);
chrome.runtime.onConnect.addListener(function(port) {
	port.postMessage({data : 'connected'});

	port.onMessage.addListener(function onMessage(request) {
		console.log('on message');
		console.log(request);
	
	//called when clicked and when tab is activated	
	if(request.method == 'updateStatus'){
		if(document.readyState == 'complete'){
			if(getCurrentExtension()){
				chromeInfometer.update(request.settings);
				console.log('updateStatus');
				//sendResponse({data : 'extension is updated'});
				port.postMessage({data : 'extension is updated'});
			}else{
				//sendResponse({data : 'no extension installed'});
				port.postMessage({data : 'no extension installed'});
			}
		}else{
			//sendResponse({data : 'document not ready'});

			port.postMessage({data : 'document not ready'});
		}
		
	}

});
});



/* * * * librairies * * * */
function getCurrentExtension(){
	if(typeof chromeInfometer != 'undefined' && chromeInfometer instanceof Extension){
		return chromeInfometer;
	}

	return null;
}

function Extension(){
	var _extension = this;

	_extension.settings = {};

	this.init = function(){
	
		var pageUrl = window.location.href.replace(/([^#]*)#.*/, '$1');

		chrome.runtime.sendMessage({method: "getStorage", key : pageUrl}, function(res){
			/*var settings = null;
*/
			if(res && 'data' in res){
				_extension.update(res.data);
			}
			//else //the extension has never been activated on this url or nothing returned from chrome.storage

			//else log
		});

	};
		
	this.update = function(settings){
		console.log('settings before update');
		console.log(settings);

		/*if(equals(_extension.settings, settings)){
			//no change of settings do nothing
			console.log('no change in extension settings');
			return;
		}*/

		if(isUndefined(settings)){
			//problem in getting data in storage
			return;
		}

		if(isEmpty(settings)){
			_extension.settings.enabled = false;
		}else{

			if(typeof settings.enabled == 'undefined'){
				console.log('unexpected format for settings in update ');
				return;
			}

			_extension.settings = settings;
		}

		console.log('_extension.settings in update');
		console.log(_extension.settings);

		if(_extension.settings.enabled === true){
			this.enable();
		}else{
			this.disable();
		}
	};
	
	this.enable = function(){
		console.log('enable function');
		this.cleanDom();

		_extension.viewportHeight = window.innerHeight;
		_extension.m1 = new Marker(['chrome-extension-infometer-marker1']);
		_extension.m2 = new Marker(['chrome-extension-infometer-marker2']);
		_extension.header = new Header();
		console.log('enable');
		this.attachEvents();

		if(_extension.settings.m1Top !== null){
			_extension.m1.moveTo(_extension.settings.m1Top);
		}else{
			_extension.m1.moveTo(60);
		}

		if(_extension.settings.m2Top !== null){			
			_extension.m2.moveTo(_extension.settings.m2Top);
		}else{
			_extension.m2.moveTo(200);
		}
		
		_extension.calculateProgress();
		
		chrome.runtime.sendMessage({method: "setEnabled"});
		
	};
	
	this.disable = function(){
		console.log('disable function');
		this.cleanDom();
		
		document.body.className = document.body.className.replace(/chrome-extension-infometer-body/g, '');
		
		this.detachEvents();
		
		chrome.runtime.sendMessage({method: "setDisabled"});

		delete this;
	};
	
	this.attachEvents = function(){
		window.addEventListener('scroll', _extension.onWindowScroll);
		
		window.addEventListener('resize', _extension.onWindowResize);
	
		document.addEventListener('overlayClicked', _extension.onOverlayClick);
		
		document.addEventListener('markerMoved',  _extension.onMarkerMoved);
		
		document.addEventListener('markerClicked',  _extension.onMarkerClicked);

		document.addEventListener('headerClicked',  _extension.onHeaderClicked);
	};
	
	this.detachEvents = function(){
		window.removeEventListener('scroll', _extension.onWindowScroll);
		
		window.removeEventListener('resize', _extension.onWindowResize);
	
		document.removeEventListener('overlayClicked', _extension.onOverlayClick);
		
		document.removeEventListener('markerMoved', _extension.onMarkerMoved);
		
		document.removeEventListener('markerClicked',  _extension.onMarkerClicked);

		document.removeEventListener('headerClicked',  _extension.onHeaderClicked);
	};
	
	this.calculateProgress = function(){
		if(_extension.m1.positioned == 'final' && _extension.m2.positioned == 'final'){
			var viewedHeight = _extension.viewportHeight - _extension.m1.screenTop() - Math.max(0, _extension.viewportHeight - _extension.m2.screenTop()) ;

			var progress = Math.max((viewedHeight/_extension.heightToView)*100, 0);

			this.header.progressBar.style.width = progress+'%';
		}
	};
	
	this.getHeightToView = function(){
		return Math.abs(_extension.m2.top() - _extension.m1.top());
	};

	this.cleanDom = function(){
		var elts = document.querySelectorAll('.chrome-extension-infometer');

		if(elts.length > 0){
			for(var i = 0; i < elts.length; i++){
				elts[i].parentNode.removeChild(elts[i]);
			}
		}

	};
	
	/* * * * events handlers * * * */
	this.onWindowScroll = function(){
		_extension.calculateProgress();	
	};
	
	this.onWindowResize = function(){
		_extension.viewportHeight = window.innerHeight;
		_extension.calculateProgress();
	};
	
	this.onOverlayClick = function(e){
		console.log('this.onOverlayClick');
		console.log(e);
		_extension.m1.updatePosition(e.pageY);
		_extension.m2.updatePosition(e.pageY);
	};

	this.onHeaderClicked = function(){
		var m1Top = _extension.m1.top() - _extension.m1.fixedHeight()/2;

		window.scrollTo(0, m1Top);
	};
	
	this.onMarkerMoved = function(){
		var save = {};
		
		_extension.header.removeTooltip();
		
		if(_extension.m1.top() > _extension.m2.top()){
			var tmp = _extension.m2;
			_extension.m2 = _extension.m1;
			_extension.m1 = tmp;
		}

		_extension.settings.m1Top = _extension.m1.positioned == 'final' ? _extension.m1.top() : _extension.settings.m1Top;
		_extension.settings.m2Top = _extension.m2.positioned == 'final' ? _extension.m2.top() : _extension.settings.m2Top;

		save[_extension.pageUrl] = _extension.settings;

		chrome.storage.local.set(save);
		
		_extension.heightToView = _extension.getHeightToView();

		_extension.calculateProgress();
	};
	
	this.onMarkerClicked = function(){
		_extension.header.addTooltip();

		_extension.overlay = new Overlay();
	
	};
}

function Header(){
	var progress = document.createElement('span'),
		header = document.createElement('div'),
		tooltip = document.createElement('p'),
		eventHeaderClicked = new Event('headerClicked');
	
	progress.className = 'chrome-extension-infometer-progress';
	header.className = 'chrome-extension-infometer chrome-extension-infometer-header';
	tooltip.className = 'chrome-extension-infometer-tooltip';
	
	tooltip.innerHTML = 'Please click on the end position you wish for this marker.';
	header.appendChild(progress);
	
	this.node = header;
	this.progressBar = progress;
	
	this.addTooltip = function(){
		if(tooltip.parentNode === null){
			this.node.appendChild(tooltip);
		}
	};
	
	this.removeTooltip = function(){
		if(tooltip.parentNode === this.node){
			this.node.removeChild(tooltip);
		}
	};

	this.node.addEventListener('click', function(e){
		document.dispatchEvent(eventHeaderClicked);
	});
	
	document.body.className += ' chrome-extension-infometer-body';
	document.body.insertBefore(header, document.body.firstChild);
}

function Overlay(){
	var tmpOverlay = document.createElement('div'),
		eventOverlayClicked = new Event('overlayClicked'),
		markerSvg = chrome.extension.getURL("images/marker.svg");

	tmpOverlay.className = 'chrome-extension-infometer chrome-extension-infometer-overlay';
	//tmpOverlay.style.cursor = 'url('+markerSvg+'), auto !important';

	tmpOverlay.style.setProperty("cursor", 'url('+markerSvg+'), auto', "important");
	
	document.body.appendChild(tmpOverlay);

	tmpOverlay.addEventListener('click', onClick);

	function onClick(e){
		eventOverlayClicked.pageY = e.pageY;
		tmpOverlay.style.cursor = 'default';
		document.dispatchEvent(eventOverlayClicked);
		tmpOverlay.removeEventListener('click', onClick);
		document.body.removeChild(tmpOverlay);
		e.stopPropagation();
	}

	return tmpOverlay;

}

function Marker(classes){
	var classes = classes || [];
	var markerSvg = chrome.extension.getURL("images/marker.svg");
	var markerDashed = chrome.extension.getURL("images/markerdashed.svg");
	
	var $this = this;
	
	this.node = document.createElement('img');
	
	this.node.className = "chrome-extension-infometer chrome-extension-infometer-marker "+ classes.join(' ');

	this.src = markerSvg;
	
	this.srcDashed = markerDashed;
	
	this.node.addEventListener('click', function(e){
		console.log('marker click');

		if($this.positioned == 'final'){
			document.dispatchEvent($this.eventMarkerClicked);
			
			$this.node.src = $this.srcDashed;
			
			$this.positioned = 'pending';
		}

		e.stopPropagation();
	});
	
	this.node.src = this.src;
	
	document.body.appendChild(this.node);
}

Marker.prototype = {
	eventMoved : new Event('markerMoved'),
	eventMarkerClicked : new Event('markerClicked'),
	top : function(){
		return this.node.offsetTop + this.fixedHeight()/2;
	},
	screenTop : function(){
		return this.node.getBoundingClientRect().top + this.fixedHeight()/2;
	},
	left : function(){
		return this.node.offsetLeft;
	},
	width : function(){
		return this.node.offsetWidth;
	},
	positioned : 'pending',
	moveTo : function(y){	

		this.node.style.left = 0 + 'px';
		this.node.style.top = y + 'px';
		
		this.positioned = 'final';
		
		document.dispatchEvent(this.eventMoved);
	},
	fixedHeight : function(){
		if(this.positioned == 'final'){
			this.height = this.node.offsetHeight;
		}

		return this.height;
	},
	updatePosition : function(y){
		if(this.positioned == 'pending'){
			this.moveTo(y);

			this.node.src = this.src;

		}	
	}			
};

//performs shallow equal between 2 objects
function equals(o1, o2){
  return JSON.stringify(o1) == JSON.stringify(o2);
}

function isEmpty(obj){

	if(obj === null){
		return true;
	}

	 for (var key in obj) {
	    if (hasOwnProperty.call(obj, key)) return false;
	 }
	 
	 return true;
}

function isUndefined(v){
	if(typeof v == 'undefined'){
		return true;
	}

	return false;
}

