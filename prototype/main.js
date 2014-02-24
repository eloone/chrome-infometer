$(document).ready(function(){

	var viewportHeight = $(window).height();
	var m1 = new Marker($('.marker1'));
	var m2 = new Marker($('.marker2'));
	var heightToView = Math.max( Math.abs(m2.top() - m1.top()) - viewportHeight, 0);
	caculateProgress();

	window.onscroll = function(){
		if(m1.positioned == 'final' && m2.positioned == 'final'){
			caculateProgress();			
		}
	};
		
	$(document).on('click', function(e){
		m1.updatePosition(e.pageY);
		m2.updatePosition(e.pageY);
	});
	
	$(document).on('markerMoved', function(e){
		heightToView = Math.max( Math.abs(m2.top() - m1.top()) - viewportHeight, 0);
		if(m1.top()>viewportHeight){
			heightToView = Math.abs(m2.top() - m1.top());
		}
		caculateProgress();
	});

	function caculateProgress(){

		//var viewedHeight = Math.max($(document).scrollTop() - m1.top(), 0);
		var viewedHeight = viewportHeight - m1.screenTop() ;
console.log(viewedHeight);
console.log(heightToView);
		var progress = (viewedHeight/heightToView)*100;
	
		$('.progress').css('width', progress+'%');
	}
	//resize
});

var markerMoved = new Event('markerMoved');

function Marker(jqueryNode){
	var $this = this;
	
	this.node = jqueryNode;
	
	this.node.on('click', function(e){
		if($this.positioned == 'final'){
			tooltip = $('<span>Please click on the end position you wish for this marker.</span>');
			
			tooltip.css({
				position:'absolute',
				left: $this.left() + $this.width() + 5 + 'px',
				top : $this.top()- 5 + 'px'
			});
	
			$('body').append(tooltip);
			
			$this.positioned = 'pending';
			
			$this.tooltip = tooltip;

		}
		e.stopPropagation();
	});
}

Marker.prototype = {
	top : function(){
		return $(this.node).offset().top;
	},
	screenTop : function(){
		return this.node.get(0).getBoundingClientRect().top;
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
		
		document.dispatchEvent(markerMoved);
	},
	updatePosition : function(y){
		if(this.positioned == 'pending'){
			this.moveTo(y);
			
			this.positioned = 'final';
			
			this.tooltip.remove();
		}	
	}			
};

