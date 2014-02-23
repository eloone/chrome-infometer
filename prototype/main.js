$(document).ready(function(){

	var viewportHeight = $(window).height();
	var m1Top = $('.marker1').offset().top;
	var m2Top = $('.marker2').offset().top;
	var heightToView = Math.max( Math.abs(m2Top - m1Top) - viewportHeight, 0);

	caculateProgress();

	window.onscroll = function(){

		caculateProgress();
	};

	function caculateProgress(){

		var viewedHeight = Math.max($(document).scrollTop() - m1Top, 0);

		var progress = (viewedHeight/heightToView)*100;
	
		$('.progress').css('width', progress+'%');
	}
	
});

