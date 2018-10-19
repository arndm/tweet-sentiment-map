var module = angular.module('app', []);

module.factory('socket', function($rootScope){
    var socket = io.connect(window.location.href);
  	return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
            	var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
	      	socket.emit(eventName, data, function () {
	        	$rootScope.$apply(function () {
	          		if (callback) {
	            		callback.apply(socket, data);
	          		}
	        	});
	      	})
	    }
    };
});

module.factory('GoogleMap', function(){
    
  var myLatlng = new google.maps.LatLng(17.7850,-12.4183);
  var light_grey_style = [{"featureType":"landscape","stylers":[{"saturation":-100},{"lightness":65},{"visibility":"on"}]},{"featureType":"poi","stylers":[{"saturation":-100},{"lightness":51},{"visibility":"simplified"}]},{"featureType":"road.highway","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"road.arterial","stylers":[{"saturation":-100},{"lightness":30},{"visibility":"on"}]},{"featureType":"road.local","stylers":[{"saturation":-100},{"lightness":40},{"visibility":"on"}]},{"featureType":"transit","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"administrative.province","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"labels","stylers":[{"visibility":"on"},{"lightness":-25},{"saturation":-100}]},{"featureType":"water","elementType":"geometry","stylers":[{"hue":"#ffff00"},{"lightness":-25},{"saturation":-97}]}];
  var myOptions = {
    zoom: 2,
    center: myLatlng,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.LEFT_BOTTOM
    },
    styles: light_grey_style
  };
  return new google.maps.Map(document.getElementById("map-canvas"), myOptions);
});

module.controller('MapController', function($scope, GoogleMap, socket){
	var keyword = null;
	var markers = [];
	$scope.showLimitMessage = false;
	$scope.keyword = null;
	$scope.stopBtnValue = 'Stop';
	$scope.trends = [];

	$scope.RestartBtnClick = function(){
		for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
        markers = [];
		keyword = $scope.keyword.trim();
	}

	$scope.StopBtnClick = function(){
		if($scope.stopBtnValue === 'Stop')
			$scope.stopBtnValue = 'Continue';
		else
			$scope.stopBtnValue = 'Stop';
	}

	socket.on('connected', function(){
		socket.emit('start-streaming');
		socket.emit('get-trends');
	});
	socket.on('new-tweet', function(tweet){
		$scope.showLimitMessage = false;
		if($scope.stopBtnValue === 'Stop' &&
			(!keyword || keyword.length === 0 
				|| tweet.text.toLowerCase().indexOf(keyword.toLowerCase()) > -1))
		{
			var icon = null;
			if(tweet.sentiment.score < 0)
				icon = '../res/img/marker-red.png';
			if(tweet.sentiment.score == 0)
				icon = '../res/img/marker-yellow.png';
			if(tweet.sentiment.score > 0)
				icon = '../res/img/marker-green.png';
			
			
			
			var tweetLocation = new google.maps.LatLng(tweet.outputPoint.lng,tweet.outputPoint.lat);
            
            
            var marker = new google.maps.Marker({
			map: GoogleMap,
	        title: '@' + tweet.user.name,
			position: tweetLocation,
			draggable: false,
	        animation: google.maps.Animation.DROP,
	        icon: icon
												});
		    setTimeout(function(){
            marker.setMap(GoogleMap);
            },600);
			markers.push(marker);
           
		    

	       	var info = '<div class="row text-center tweet-info-window">'
	      				+	'<div class="col-md-2 text-center">' 
	      				+		'<img class="img-responsive" src=' + tweet.user.profile_image_url + '></img>'
	      				+	'</div>'
	      				+	'<div class="col-md-10 text-left">' 
	      				+		'<p>' + '@' + tweet.user.name + '</p>'
	      				+ 		'<p><strong>' + tweet.text + '</strong></p>'
	      				+ 		'<p>' + tweet.created_at;
	      	if(tweet.place){
	      		info += '<br>' 
	      				+ tweet.place.name + ', ' 
	      				+ tweet.place.country;
	      	}
	      	info += '</p></div></div>';

	      	var infowindow = new google.maps.InfoWindow({
	        	  content: info,
	        	  maxWidth: 350
	      	});
	      	google.maps.event.addListener(marker, 'click', function(){
	        	infowindow.open(GoogleMap, marker);
	      	});
      	}
	});

	socket.on('new-trends', function(trends){
		$scope.trends = trends;
	});

	socket.on('stream-error', function(){
		$scope.showLimitMessage = true;
	});
});