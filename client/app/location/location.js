angular.module('dinnerDaddy.location', ['dinnerDaddy.showmatch'])

.controller('LocationController', function ($scope, $rootScope, $location, $cookies, $window, $routeParams, Auth, LocationFactory, Socket) {
  if (!$rootScope.matched) {
    $rootScope.matched = JSON.parse($window.localStorage.getItem('matched'));
    var currentImageURL = $rootScope.matched.image_url;
    $rootScope.currRestaurantImageHD = currentImageURL.slice(0,currentImageURL.length-6) + 'l.jpg';
  }

  if (!$rootScope.user) {
    Auth.getUser($cookies.get('fbId'))
    .then(function(data) {
      $rootScope.user = data.user;
    });
  }

  var id = parseInt( $routeParams.id );

  var origin = [];
  var map = new google.maps.Map(document.getElementById('mapcontainer'), {
    center: {
      lat: $rootScope.matched.location.coordinate.latitude,
      lng: $rootScope.matched.location.coordinate.longitude
    },
    scrollwheel: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 11
  });

  var info = new google.maps.InfoWindow();

  var distanceMatrixService = new google.maps.DistanceMatrixService();
  var directionService = new google.maps.DirectionsService();
  var directionRenderer = new google.maps.DirectionsRenderer({preserveViewport: true, suppressMarkers: true});
  directionRenderer.setMap(map);

  var restaurant = {
    name: $rootScope.matched.name,
    location: [
      $rootScope.matched.location.coordinate.latitude,
      $rootScope.matched.location.coordinate.longitude
    ]
  };

  $scope.origin;
  $scope.destination;
  $scope.restaurantName = restaurant.name;
  $scope.restaurantLocation = restaurant.location;
  $scope.transport = google.maps.TravelMode.DRIVING;

  $scope.data = {
      availableOptions: [
        {id: 'driving', name: 'DRIVING'},
        {id: 'walking', name: 'WALKING'}
      ],
    selectedOption: {id: 'driving', name: 'DRIVING'} //This sets the default value of the select in the ui
  };

  $scope.groupList = [];

  $scope.updateMode = function () {
    $scope.transport = google.maps.TravelMode[$scope.data.selectedOption.name];
    LocationFactory.getDistance(origin, $scope.restaurantLocation, $scope.transport).then(function (distances) {
      $scope.distance = distances.distance.text;
      $scope.duration = distances.duration.text;
    });
    showRoutes();
  };

  var showRoutes = function () {
    var routeQuery = {
      origin: $scope.origin,
      destination: $scope.destination,
      travelMode: $scope.transport,
      unitSystem: google.maps.UnitSystem.IMPERIAL
    };

    directionService.route(routeQuery, function (result, status) {
      if (status === google.maps.DirectionsStatus.OK) {
        directionRenderer.setDirections(result);
        bounds = new google.maps.LatLngBounds();
        bounds.extend(result.routes[0].overview_path[0]);
        var k = result.routes[0].overview_path.length;
        bounds.extend(result.routes[0].overview_path[k-1]);
        panning = true;
        map.panTo(bounds.getCenter());  
      }
    });
  };

  //position is fed in from google
  var success = function (position, username) {
    //gathering coordinates from user geolocation
    var coords = new google.maps.LatLng(position.coords.latitude, position.coords.longitude)
    //this pushes to the var origin array in the controller scope
    origin.push([position.coords.latitude, position.coords.longitude].join(','))

    //$scope origin is 'coords', which is a google function to gather marker data, does not accept arrays
    $scope.origin = coords;

    var restaurantCoords = new google.maps.LatLng($scope.restaurantLocation[0], $scope.restaurantLocation[1]);
    $scope.destination = restaurantCoords;

    //setting up options for new google Maps Marker
    var user = new google.maps.Marker({
      position: coords,
      title: $rootScope.user.username,
      map: map,
      icon: '../../assets/guy.png'
    });

    var restaurant = new google.maps.Marker({
      position: restaurantCoords,
      title: $scope.restaurantName,
      map: map,
      icon: '../../assets/burger.png'
    });

    /* ===== SETUP SOCKET USER LOCATIONS ==== */
    var sessionId = $window.localStorage.getItem('sessionId');

    Socket.emit('userlocation', {'userLocation' : coords, 'sessionId': sessionId, 'username': $cookies.get('name')});
    Socket.on('userData', function (allInfo) {
      $scope.groupList.push(allInfo);
    });

    //Event listeners for marker info
    google.maps.event.addListener(user, 'click', (function (user) {
      return function () {
        info.setContent($rootScope.user.username);
        info.open(map, user);
      }
    })(user));

    google.maps.event.addListener(restaurant, 'click', (function (restaurant) {
      return function () {
        info.setContent($scope.restaurantName);
        info.open(map, restaurant);
      }
    })(restaurant));

    LocationFactory.getDistance(origin, $scope.restaurantLocation, $scope.transport).then(function (distances) {
      $scope.distance = distances.distance.text;
      $scope.duration = distances.duration.text;
    });
    showRoutes();
  };

  var verify = function (username) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(success);
    } else {
      console.error('User rejected location access');
    }
  };
  //setInterval should keep getting user geodata every second
  //setInterval(verify(username), 1000);
  verify();
})

.factory('LocationFactory', function ($http, $cookies) {

/* 
The plan is to have a marker type specific to users, and a marker type for the designated restaurant
In a given session, each user will have unique coordinates and in the success function,
the coordinates will be fed into the server socket. The deployed version will give a shared socket,
so the coordinates for all group members can bubble up from server to each client */

  //getDistance expects an array of two Number coordinates 
  var getDistance = function (origin, restaurant, transport) {

    var data = {
      origin: origin,
      restaurant: restaurant,
      transport: transport
    };
    return $http({
      method: 'POST',
      url: '/api/location',
      data: data
    }).then(function (distance) {
      return distance.data;
    });

  };

  return {
    getDistance: getDistance
  }

});