$(document).ready(function(){

	var markerSrc = supportsSVG() ? 'marker.svg' : 'marker.png';
	var viewportHeight = $(window).height();
	var m1 = new Marker($('<img src="'+markerSrc+'" class="marker marker1"/>'));
	var m2 = new Marker($('<img src="'+markerSrc+'" class="marker marker2"/>'));
	var heightToView = getHeightToView(m1, m2);
	
	caculateProgress();

	$(window).on('scroll', function(){
		caculateProgress();			
	});

	$(window).on('resize', function(){
		viewportHeight = $(window).height();
		caculateProgress();
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

		heightToView = getHeightToView(m1, m2);

		caculateProgress();
	});

	function caculateProgress(){
		if(m1.positioned == 'final' && m2.positioned == 'final'){
			var viewedHeight = viewportHeight - m1.screenTop() - Math.max(0, viewportHeight - m2.screenTop()) ;

			var progress = (viewedHeight/heightToView)*100;
		
			$('.progress').css('width', progress+'%');
		}
	}

});

function Marker(jqueryNode){
	var $this = this;
	
	this.node = jqueryNode;

	this.src = this.node.get(0).src;

	this.node.on('click', function(e){
		if($this.positioned == 'final'){
			$('body').css('cursor', 'url('+$this.src+'), auto');

			if(supportsSVG()){
				$this.node.get(0).src = 'markerdashed.svg';
			}

			tooltip = $('<p class="tooltip">Please click on the end position you wish for this marker.</p>');
	
			$('body').append(tooltip);
			
			$this.positioned = 'pending';
			
			$this.tooltip = tooltip;

		}

		e.stopPropagation();
	});

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

			if(supportsSVG()){
				this.node.get(0).src = 'marker.svg';
			}
			
			this.positioned = 'final';
			
			this.tooltip.remove();

			$('body').css('cursor', 'default');
		}	
	}			
};

function getHeightToView(m1, m2){
	return Math.abs(m2.top() - m1.top());
}

function supportsSVG() {
    return !!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', "svg").createSVGRect;
  }

