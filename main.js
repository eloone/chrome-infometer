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
				return;
			}
		}else{
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
		_extension.m1 = new Marker(['marker1']);
		_extension.m2 = new Marker(['marker2']);
		//_extension.heightToView = _extension.getHeightToView();
		_extension.header = new Header($('<div class="chrome-extension-infometer infometer"><span class="chrome-extension-infometer progress"></span></div>'));
		
		this.attachEvents();
		
		if(_extension.settings.m1Top){
			_extension.m1.moveTo(_extension.settings.m1Top);
		}else{
			_extension.m1.moveTo(60);
		}

		if(_extension.settings.m2Top){
			
			_extension.m2.moveTo(_extension.settings.m2Top);
			console.log('m2 moved '+_extension.settings.m2Top);
		}else{
			_extension.m1.moveTo(200);
			console.log('m2 moved '+200);
		}	
		
		_extension.calculateProgress();
		
	};
	
	this.disable = function(){
		$('.chrome-extension-infometer').remove();
		
		this.detachEvents();
	};
	
	this.attachEvents = function(){
		window.addEventListener('scroll', _extension.onWindowScroll);
		
		window.addEventListener('resize', _extension.onWindowResize);
	
		document.addEventListener('click', _extension.onDocumentClick);
		
		document.addEventListener('markerMoved',  _extension.onMarkerMoved);		
	};
	
	this.detachEvents = function(){
		window.removeEventListener('scroll', _extension.onWindowScroll);
		
		window.removeEventListener('resize', _extension.onWindowResize);
	
		document.removeEventListener('click', _extension.onDocumentClick);
		
		document.removeEventListener('markerMoved', _extension.onMarkerMoved);
	};
	
	this.calculateProgress = function(){
		if(_extension.m1.positioned == 'final' && _extension.m2.positioned == 'final'){
			var viewedHeight = _extension.viewportHeight - _extension.m1.screenTop() - Math.max(0, _extension.viewportHeight - _extension.m2.screenTop()) ;

			var progress = (viewedHeight/_extension.heightToView)*100;
			/*console.log('viewedHeight');
			console.log(viewedHeight);
			console.log('_extension.heightToView');
			console.log(_extension.heightToView);
*/
			$('.progress').css('width', progress+'%');
		}
	};
	
	this.getHeightToView = function(){
		/*console.log('_extension.m2.top()');
		console.log(_extension.m2.top());
		console.log('_extension.m1.top()');
		console.log(_extension.m1.top());
		console.log($(_extension.m2.node).offset());*/
		return Math.abs(_extension.m2.top() - _extension.m1.top());
	};
	
	/* * * * events handlers * * * */
	this.onWindowScroll = function(){
		console.log('scroll');
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
		console.log('marker moved');
		var save = {};
		
		if(_extension.m1.top() > _extension.m2.top()){
			var tmp = _extension.m2;
			_extension.m2 = _extension.m1;
			_extension.m1 = tmp;
		}

		_extension.settings.m1Top = _extension.m1.positioned == 'final' ? _extension.m1.top() : _extension.settings.m1Top;
		_extension.settings.m2Top = _extension.m2.positioned == 'final' ? _extension.m2.top() : _extension.settings.m2Top;

		save[_extension.pageUrl] = _extension.settings;
		console.log('save');
console.log(save);
		chrome.storage.sync.set(save);
		
		_extension.heightToView = _extension.getHeightToView();
console.log('_extension.heightToView');
console.log(_extension.heightToView);
		_extension.calculateProgress();
	};
}

function Header(jqueryNode){
	this.node = jqueryNode;

	$('body').append(this.node);

}

function Marker(classes){
	var classes = classes || [];
	var markerSvg = chrome.extension.getURL("prototype/marker.svg");
	var markerDashed = chrome.extension.getURL("prototype/markerdashed.svg");
	var markerSrc = markerSvg;
	
	var $this = this;
	
	this.node = document.createElement('img');
	
	this.node.className = "chrome-extension-infometer marker "+ classes.join(' ');

	this.src = markerSrc;
	
	this.srcDashed = markerDashed;
	
	this.node.addEventListener('click', function(e){
		if($this.positioned == 'final'){
			$('body').css('cursor', 'url('+$this.src+'), auto');

			$this.node.src = $this.srcDashed;
			
			tooltip = $('<p class="tooltip">Please click on the end position you wish for this marker.</p>');
	
			$('body').append(tooltip);
			
			$this.positioned = 'pending';
			
			$this.tooltip = tooltip;

		}

		e.stopPropagation();
	});
	
	this.node.src = this.src;
	
	document.body.appendChild(this.node);
}

Marker.prototype = {
	eventMoved : new Event("markerMoved"),
	top : function(){
		console.log('in top()');
		console.log(this.node.offsetTop);
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
		console.log('in moveTo');
		console.log(this.node.offsetTop);		
		this.node.style.left = 0 + 'px';
		this.node.style.top = y + 'px';
		console.log('in moveTo2');
		console.log(this.node.offsetTop);
		
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
			
			this.positioned = 'final';
			
			this.tooltip.remove();

			$('body').css('cursor', 'default');
		}	
	}			
};


