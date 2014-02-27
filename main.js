function Extension(){
	var _extension = this;
	
	_extension.pageUrl = window.location.href.replace(/([^#]*)#.*/, '$1');

	chrome.runtime.sendMessage({method: "getStorage", key : _extension.pageUrl}, function(res){
		_extension.init(res);
	});
	
	this.init = function(settings){
		console.log('settings');
		console.log(settings);
		if(settings && 'data' in settings){
			if(typeof(settings.data[_extension.pageUrl]) !== 'undefined'){
				_extension.settings = settings.data[_extension.pageUrl];
			}else{
				chrome.runtime.sendMessage({method: "setDisabled"});
				return;
			}
		}else{
			chrome.runtime.sendMessage({method: "setDisabled"});
			return;
		}

		if(_extension.settings.enabled === true){
			this.enable();
		}else{
			this.disable();
		}
	};
	
	this.enable = function(){
		_extension.viewportHeight = window.innerHeight;
		_extension.m1 = new Marker(['chrome-extension-infometer-marker1']);
		_extension.m2 = new Marker(['chrome-extension-infometer-marker2']);
		_extension.header = new Header();
		
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
		var extensionElts = document.querySelectorAll('.chrome-extension-infometer');
		
		for(var i=0;i < extensionElts.length; i++){
			document.body.removeChild(extensionElts[i]);
		}
		
		document.body.className = document.body.className.replace(/chrome-extension-infometer-body/g, '');
		
		this.detachEvents();
		
		chrome.runtime.sendMessage({method: "setDisabled"});
	};
	
	this.attachEvents = function(){
		window.addEventListener('scroll', _extension.onWindowScroll);
		
		window.addEventListener('resize', _extension.onWindowResize);
	
		document.addEventListener('click', _extension.onDocumentClick);
		
		document.addEventListener('markerMoved',  _extension.onMarkerMoved);
		
		document.addEventListener('markerClicked',  _extension.onMarkerClicked);
	};
	
	this.detachEvents = function(){
		window.removeEventListener('scroll', _extension.onWindowScroll);
		
		window.removeEventListener('resize', _extension.onWindowResize);
	
		document.removeEventListener('click', _extension.onDocumentClick);
		
		document.removeEventListener('markerMoved', _extension.onMarkerMoved);
		
		document.removeEventListener('markerClicked',  _extension.onMarkerClicked);
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
	
	/* * * * events handlers * * * */
	this.onWindowScroll = function(){
		_extension.calculateProgress();	
	};
	
	this.onWindowResize = function(){
		_extension.viewportHeight = window.innerHeight;
		_extension.calculateProgress();
	};
	
	this.onDocumentClick = function(e){
		_extension.m1.updatePosition(e.pageY);
		_extension.m2.updatePosition(e.pageY);
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

		chrome.storage.sync.set(save);
		
		_extension.heightToView = _extension.getHeightToView();

		_extension.calculateProgress();
	};
	
	this.onMarkerClicked = function(){
		_extension.header.addTooltip();
	};
}

function Header(){
	var progress = document.createElement('span'),
		header = document.createElement('div'),
		tooltip = document.createElement('p');
	
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
	
	document.body.className += ' chrome-extension-infometer-body';
	document.body.insertBefore(header, document.body.firstChild);
}

function Marker(classes){
	var classes = classes || [];
	var markerSvg = chrome.extension.getURL("prototype/marker.svg");
	var markerDashed = chrome.extension.getURL("prototype/markerdashed.svg");
	
	var $this = this;
	
	this.node = document.createElement('img');
	
	this.node.className = "chrome-extension-infometer chrome-extension-infometer-marker "+ classes.join(' ');

	this.src = markerSvg;
	
	this.srcDashed = markerDashed;
	
	this.node.addEventListener('click', function(e){
		
		if($this.positioned == 'final'){
			document.dispatchEvent($this.eventMarkerClicked);
			
			document.body.style.cursor = 'url('+$this.src+'), auto';
			
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

			document.body.style.cursor = 'default';
		}	
	}			
};


