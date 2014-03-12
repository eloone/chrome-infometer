/* Main content script for the client that is injected in every tab visited once the extension is enabled */

/* * * * activation * * * */

//initialization at each page load or when the script is run from extension at enabled/installed events

//the EventProxy allows the extension to manage its own events 
//without the risk of attaching events several times to the client window
//client window doesn't access this script but the events on document/window are shared so don't mess with the client events
var EventProxy = new ExtensionEventProxy();
var scrollEvent = new ExtensionEvent('scroll');
var resizeEvent = new ExtensionEvent('resize');

window.addEventListener('scroll', function(){
	EventProxy.emit(scrollEvent);
});

window.addEventListener('resize', function(){
	EventProxy.emit(resizeEvent);
});

//called when the extension connects to this script
chrome.runtime.onConnect.addListener(function(port) {
	port.postMessage({data : 'connected'});

	port.onMessage.addListener(function onMessage(request) {

		//this method is called by the extension when the extension is enabled or installed
		//or when the page is loaded
		if(request.method == 'install'){

			// this is equivalent to a page load
			chromeInfometer = new Extension(request.settings);
				
			port.postMessage({data : 'installed Extension from port'});
		}

		// called when extension icon is clicked and when tab is activated
		if(request.method == 'updateStatus'){
			
			if(document.readyState == 'complete'){
				
				if(getCurrentExtension()){

					if(!equals(request.settings, chromeInfometer.settings, {filter : ['date', 'time']})){

						chromeInfometer.init(request.settings);

						port.postMessage({data : 'extension is updated'});

					}else{
						port.postMessage({data : 'extension is idle'});
					}
					
				}else{
					port.postMessage({data : 'no extension installed'});
				}
			}else{
				port.postMessage({data : 'document not ready'});
			}			
		}

	});
});

/* * * * extension and its elements * * * */

//returns the current extension if the instance already exists
function getCurrentExtension(){
	if(typeof chromeInfometer != 'undefined' && chromeInfometer instanceof Extension){
		return chromeInfometer;
	}

	return null;
}

//extension constructor for the current tab
function Extension(settings){

	this.settings = settings || {};
	
	//this port is used to send messages to the extension in the back
	this.port = chrome.runtime.connect();

	this.init(settings);

}

Extension.prototype = {
	init :	function(settings){

		if(isUndefined(settings)){
			// problem in getting data from storage
			return;
		}

		if(isEmpty(settings)){
			//should never happen since if no record is equivalent to disabled settings
			return;
		}else{
			this.settings = settings;
		}

		if(this.settings.enabled === true){
			//enabling the extension shows the extension elements on the page
			this.enable();
		}else{
			//disabling the extension removes the extension elements from the page
			this.disable();
		}			
	},
			
	enable : function(){

		this.cleanDom();

		this.viewportHeight = window.innerHeight;
		this.m1 = new Marker(['chrome-extension-infometer-marker1']);
		this.m2 = new Marker(['chrome-extension-infometer-marker2']);
		this.header = new Header();

		this.attachEvents();

		//m1Top == null when the icon has never been clicked -> the extension has never been activated
		if(this.settings.m1Top !== null){
			//if it's not the first time we positioned the marker with the positions in the settings
			this.m1.moveTo(this.settings.m1Top);
		}else{
			//if it's the first time the icon is clicked by default the first marker is positioned here
			this.m1.moveTo(60);
		}

		//idem for m2Top
		if(this.settings.m2Top !== null){			
			this.m2.moveTo(this.settings.m2Top);
		}else{
			this.m2.moveTo(200);
		}
		
		this.calculateProgress();		
	},
			
	disable : function(){

		this.cleanDom();
		
		document.body.className = document.body.className.replace(/chrome-extension-infometer-body/g, '');
		
		this.detachEvents();

		delete this;
	},
	
	attachEvents : function(){
		var self = this;

		this.detachEvents();
		
		EventProxy.listen('scroll', function(){self.onWindowScroll()});
		
		EventProxy.listen('resize', function(){self.onWindowResize()});
	
		EventProxy.listen('overlayClicked', function(e){self.onOverlayClicked(e)});
		
		EventProxy.listen('markerMovedAway', function(){self.onMarkerMoved()});
		
		EventProxy.listen('markerClicked', function(){self.onMarkerClicked()});

		EventProxy.listen('headerClicked', function(){self.onHeaderClicked()});
	},
	
	detachEvents : function(){
		var self = this;
		
		EventProxy.unlisten('scroll', function(){self.onWindowScroll()});
		
		EventProxy.unlisten('resize', function(){self.onWindowResize()});
	
		EventProxy.unlisten('overlayClicked', function(e){self.onOverlayClicked(e)});
		
		EventProxy.unlisten('markerMovedAway', function(){self.onMarkerMoved()});
		
		EventProxy.unlisten('markerClicked',  function(){self.onMarkerClicked()});

		EventProxy.unlisten('headerClicked',  function(){self.onHeaderClicked()});
	},
	
	calculateProgress : function(){
		if(this.m1.positioned == 'final' && this.m2.positioned == 'final'){
			var viewedHeight = this.viewportHeight - this.m1.screenTop() - Math.max(0, this.viewportHeight - this.m2.screenTop()) ;

			var progress = Math.max((viewedHeight/this.heightToView)*100, 0);

			this.header.progressBar.style.width = progress+'%';
		}
	},
	
	getHeightToView : function(){
		return Math.abs(this.m2.top() - this.m1.top());
	},
	
	cleanDom : function(){
		var elts = document.querySelectorAll('.chrome-extension-infometer');

		if(elts.length > 0){
			for(var i = 0; i < elts.length; i++){
				elts[i].parentNode.removeChild(elts[i]);
			}
		}

	},
	
	onWindowScroll : function(){
		this.calculateProgress();	
	},
	
	onWindowResize : function(){
		this.viewportHeight = window.innerHeight;
		this.calculateProgress();
	},
	
	onOverlayClicked : function(e){
		this.m1.updatePosition(e.pageY);
		this.m2.updatePosition(e.pageY);
	},

	onHeaderClicked : function(){
		var m1Top = this.m1.top() - this.m1.fixedHeight()/2;

		window.scrollTo(0, m1Top);
	},
	
	onMarkerMoved : function(){
		var save = {}, self = this;

		this.header.removeTooltip();

		if(this.m1.top() > this.m2.top()){
			var tmp = this.m2;
			this.m2 = this.m1;
			this.m1 = tmp;
		}

		this.settings.m1Top = this.m1.positioned == 'final' ? this.m1.top() : this.settings.m1Top;
		this.settings.m2Top = this.m2.positioned == 'final' ? this.m2.top() : this.settings.m2Top;
		
		if(this.m1.positioned == 'final' && this.m2.positioned == 'final'){
			this.port.postMessage({
				method : 'updateSettings',
				data : {
					m1Top : self.settings.m1Top,
					m2Top : self.settings.m2Top
				}
			});
		}
		
		this.heightToView = this.getHeightToView();

		this.calculateProgress();
	},
	
	onMarkerClicked : function(){
		this.header.addTooltip();

		this.overlay = new Overlay();	
	}
};

//header constructor = progress bar + tooltip
function Header(){
	var progress = document.createElement('span'),
		header = document.createElement('div'),
		tooltip = document.createElement('p'),
		eventHeaderClicked = new ExtensionEvent('headerClicked'),
		infometerImg = chrome.extension.getURL('images/infometer.png');
	
	progress.className = 'chrome-extension-infometer-progress';
	header.className = 'chrome-extension-infometer chrome-extension-infometer-header';
	tooltip.className = 'chrome-extension-infometer-tooltip';
	
	header.style.background = '#ddd url("'+infometerImg+'") no-repeat right center';
	
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
		EventProxy.emit(eventHeaderClicked);
	});
	
	document.body.className += ' chrome-extension-infometer-body';
	document.body.insertBefore(header, document.body.firstChild);
}

//overlay constructor used when positioning a moving marker
function Overlay(){
	var tmpOverlay = document.createElement('div'),
		eventOverlayClicked = new ExtensionEvent('overlayClicked'),
		markerSvg = chrome.extension.getURL("images/marker.svg");

	tmpOverlay.className = 'chrome-extension-infometer chrome-extension-infometer-overlay';

	tmpOverlay.style.setProperty("cursor", 'url('+markerSvg+'), auto', "important");
	
	document.body.appendChild(tmpOverlay);

	tmpOverlay.addEventListener('click', onClick);

	function onClick(e){
		eventOverlayClicked.pageY = e.pageY;
		tmpOverlay.style.cursor = 'default';

		EventProxy.emit(eventOverlayClicked);

		tmpOverlay.removeEventListener('click', onClick);
		document.body.removeChild(tmpOverlay);
		e.stopPropagation();
	}

	return tmpOverlay;

}

//marker constructor
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

		if($this.positioned == 'final'){

			EventProxy.emit($this.eventMarkerClicked);
			
			$this.node.src = $this.srcDashed;
			
			$this.positioned = 'pending';
		}

		e.stopPropagation();
	});
	
	this.node.src = this.src;
	
	document.body.appendChild(this.node);
}

Marker.prototype = {
	eventMoved : new ExtensionEvent('markerMovedAway'),
	
	eventMarkerClicked : new ExtensionEvent('markerClicked'),
	
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
		
		EventProxy.emit(this.eventMoved);
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

/* * * * event library * * * */

function ExtensionEvent(type, data){
	if(typeof type !== 'string'){
		throw new Error('Expecting type to be a string in ExtensionEvent');
	}
	
	this.type = type;
	this.data = data || {};
}

function ExtensionEventProxy(){
	var events = {};
	
	this.emit = function(event){
		if(!(event instanceof ExtensionEvent)){
			throw new Error('Expecting event to be an instance of ExtensionEvent');
		}
		
		if(!events[event.type]){
			return;
		}
		
		var listeners = events[event.type];
		
		for(var i = 0; i < listeners.length; i++){
			if(typeof listeners[i] === 'function'){
				listeners[i](event);
			}
		}					
		
	};
	
	this.listen = function(eventType, handler){
		if(typeof handler !== 'function'){
			throw new Error('Expecting handler to be an instance of Function');
		}

		if(typeof(eventType) !== 'string'){
			throw new Error('Expecting eventType to be a string');
		}
		
		if(typeof events[eventType] == 'undefined'){
			events[eventType] = [handler];
		}else{
			events[eventType].push(handler);
		}		
	};
	
	this.unlisten = function(eventType, handler){
		if(typeof handler !== 'function'){
			throw new Error('Expecting handler to be an instance of Function');
		}
		
		if(typeof(eventType) !== 'string'){
			throw new Error('Expecting eventType to be a string');
		}
		
		if(!events[eventType]){
			return;
		}
		
		var listeners = events[eventType];
		
		for(var i = 0; i < listeners.length; i ++ ){
			if(listeners[i] == handler || listeners[i].toString() == handler.toString() ){
				listeners.splice(i, 1);
			}
		}	
	};
}

/* * * * utils * * * */

//performs shallow equal between 2 objects
//@options has key 'filter' to ignore keys we don't want to compare with
function equals(o1, o2, options){
	var equal = false;

	for(var key in o1){
		if(options && options.filter){
			if(options.filter.indexOf(key) > -1){
				continue;
			}
		}

		if(o1[key] == o2[key]){
			equal = true;
		}else{
			equal = false;
			break;
		}
		
	}

  return equal;
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
