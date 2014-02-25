function enableExtension(){
	
	var viewportHeight = $(window).height();
	var m1 = new Marker($('<img src="" class="marker marker1"/>'));
	var m2 = new Marker($('<img src="" class="marker marker2"/>'));
	var heightToView = getHeightToView(m1, m2);
	var header = new Header($('<div class="infometer"><span class="progress"></span></div>'));
	var pageUrl = window.location.href.replace(/([^#]*)#.*/, '$1');
	console.log(pageUrl);
	
	//var settings = chrome.storage.sync.get(pageUrl, init) || {};
	
	chrome.runtime.sendMessage({method: "getStorage", key : pageUrl}, function(response) {
		console.log(response);
	});
	
	function init(settings){
		console.log(settings);
		if(settings.m1Top){
			m1.moveTo(settings.m1Top);
		}
		
		if(settings.m2Top){
			m2.moveTo(settings.m2Top);
		}	
	
		calculateProgress();
	
		$(window).on('scroll', function(){
			calculateProgress();			
		});
	
		$(window).on('resize', function(){
			viewportHeight = $(window).height();
			calculateProgress();
		});
	
		$(document).on('click', function(e){
			m1.updatePosition(e.pageY);
			m2.updatePosition(e.pageY);
		});
		
		$(document).on('markerMoved', function(e){
			
			if(m1.top() > m2.top()){
				var tmp = m2;
				m2 = m1;
				m1 = tmp;
			}
			
			settings.m1Top = m1.top();
			settings.m2Top = m2.top();
			
			chrome.storage.sync.set({pageUrl : settings});
			
			heightToView = getHeightToView(m1, m2);
	
			calculateProgress();
		});
	}
	
	function calculateProgress(){
		if(m1.positioned == 'final' && m2.positioned == 'final'){
			var viewedHeight = viewportHeight - m1.screenTop() - Math.max(0, viewportHeight - m2.screenTop()) ;

			var progress = (viewedHeight/heightToView)*100;
		
			$('.progress').css('width', progress+'%');
		}
	}
}

function disableExtension(){
	console.log('OK !!!');
}

function Header(jqueryNode){
	this.node = jqueryNode;
	
	$('body').append(this.node);
}

function Marker(jqueryNode){
	var markerSvg = chrome.extension.getURL("prototype/marker.svg");
	var markerDashed = chrome.extension.getURL("prototype/markerdashed.svg");
	var markerSrc = markerSvg;
	
	var $this = this;
	
	this.node = jqueryNode;

	this.src = markerSrc;
	
	this.srcDashed = markerDashed;
	
	this.node.on('click', function(e){
		if($this.positioned == 'final'){
			$('body').css('cursor', 'url('+$this.src+'), auto');

			if(supportsSVG()){
				$this.node.get(0).src = $this.srcDashed;
			}

			tooltip = $('<p class="tooltip">Please click on the end position you wish for this marker.</p>');
	
			$('body').append(tooltip);
			
			$this.positioned = 'pending';
			
			$this.tooltip = tooltip;

		}

		e.stopPropagation();
	});
	
	this.node.get(0).src = this.src;
	
	$('body').append(this.node);

}

Marker.prototype = {
	eventMoved : new Event("markerMoved"),
	top : function(){
		return $(this.node).offset().top + this.fixedHeight()/2;
	},
	screenTop : function(){
		return this.node.get(0).getBoundingClientRect().top + this.fixedHeight()/2;
	},
	left : function(){
		return $(this.node).offset().left;
	},
	width : function(){
		return $(this.node).width();
	},
	positioned : 'final',
	moveTo : function(y){
		
		this.node.css({
			left : 0,
			top : y
		});
		
		document.dispatchEvent(this.eventMoved);
	},
	fixedHeight : function(){
		if(this.positioned == 'final'){
			this.height = this.node.height();
		}

		return this.height;
	},
	updatePosition : function(y){
		if(this.positioned == 'pending'){
			this.moveTo(y);

			this.node.get(0).src = this.src;
			
			this.positioned = 'final';
			
			this.tooltip.remove();

			$('body').css('cursor', 'default');
		}	
	}			
};

function getHeightToView(m1, m2){
	return Math.abs(m2.top() - m1.top());
}

