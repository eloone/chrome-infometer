/* * * * activation * * * */
console.log('CLIENT JS NEW');

var EventProxy = new ExtensionEventProxy();
var scrollEvent = new ExtensionEvent('scroll');
var resizeEvent = new ExtensionEvent('resize');

window.addEventListener('scroll', function(){
	EventProxy.emit(scrollEvent);
});

window.addEventListener('resize', function(){
	EventProxy.emit(resizeEvent);
});

chrome.runtime.onConnect.addListener(function(port) {
	port.postMessage({data : 'connected'});

	port.onMessage.addListener(function onMessage(request) {
console.log(request);
		if(request.method == 'install'){
				console.log('install event from port');

				// this is equivalent to a page load
				chromeInfometer = new Extension(request.settings);
					
				port.postMessage({data : 'installed Extension from port'});
		}

		// called when clicked and when tab is activated
		if(request.method == 'updateStatus'){
			if(document.readyState == 'complete'){
				if(getCurrentExtension()){

					if(!equals(request.settings, chromeInfometer.settings, {filter : ['date', 'time']})){

						chromeInfometer.init(request.settings);

						port.postMessage({data : 'extension is updated'});

					}else{
						console.log('no changes in settings');
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

/* * * * librairies * * * */
function getCurrentExtension(){
	if(typeof chromeInfometer != 'undefined' && chromeInfometer instanceof Extension){
		return chromeInfometer;
	}

	return null;
}

function Extension(settings){

	this.settings = settings || {};
	
	this.port = chrome.runtime.connect();

	this.init(settings);

}

Extension.prototype = {
	init :	function(settings){
		console.log('settings before update');
		console.log(settings);
		
		if(isUndefined(settings)){
			// problem in getting data in storage
			return;
		}

		//should never happen
		if(isEmpty(settings)){
			console.log('unexpected format for settings in init');
			return;
		}else{
			this.settings = settings;
		}

		if(this.settings.enabled === true){
			this.enable();
		}else{
			this.disable();
		}			
	},
			
	enable : function(){
		console.log('enable function');
		this.cleanDom();

		this.viewportHeight = window.innerHeight;
		this.m1 = new Marker(['chrome-extension-infometer-marker1']);
		this.m2 = new Marker(['chrome-extension-infometer-marker2']);
		this.header = new Header();

		this.attachEvents();

		if(this.settings.m1Top !== null){
			this.m1.moveTo(this.settings.m1Top);
		}else{
			this.m1.moveTo(60);
		}

		if(this.settings.m2Top !== null){			
			this.m2.moveTo(this.settings.m2Top);
		}else{
			this.m2.moveTo(200);
		}
		
		this.calculateProgress();		
	},
			
	disable : function(){
		console.log('disable function');
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
	
		EventProxy.listen('overlayClicked', function(e){self.onOverlayClick(e)});
		
		EventProxy.listen('markerMovedAway', function(){self.onMarkerMoved()});
		
		EventProxy.listen('markerClicked', function(){self.onMarkerClicked()});

		EventProxy.listen('headerClicked', function(){self.onHeaderClicked()});
	},
	
	detachEvents : function(){
		var self = this;
		
		EventProxy.unlisten('scroll', function(){self.onWindowScroll()});
		
		EventProxy.unlisten('resize', function(){self.onWindowResize()});
	
		EventProxy.unlisten('overlayClicked', function(e){self.onOverlayClick(e)});
		
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
	
	onOverlayClick : function(e){
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

function Header(){
	var progress = document.createElement('span'),
		header = document.createElement('div'),
		tooltip = document.createElement('p'),
		eventHeaderClicked = new ExtensionEvent('headerClicked');
	
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
		EventProxy.emit(eventHeaderClicked);
	});
	
	document.body.className += ' chrome-extension-infometer-body';
	document.body.insertBefore(header, document.body.firstChild);
}

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

// performs shallow equal between 2 objects
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
