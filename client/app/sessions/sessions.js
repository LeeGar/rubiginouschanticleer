angular.module('dinnerDaddy.sessions', [])

.controller('SessionsController', function ($scope, $cookies, Session, Auth, Socket) {
  $scope.username = $cookies.get('name');
  $scope.sessions = [];

  $scope.sessionName = '';

  $scope.fetchSessions = function() {
    Session.fetchSessions().then(function(sessions) {
      $scope.sessions = sessions;
    });
  }

  // $scope.fetchSessions();
  //this function listens to a event emitted by server.js-'new session' and recieves and appends the new session
  Socket.on('newSession', function(data) {
    $scope.sessions.push(data);
  });

  // TODO: Create functions to make buttons work
  $scope.setSession = Session.setSession;

  $scope.createSession = function() {
    Session.createSession($scope.sessionName)
    .then(function() {
      console.log('created session');
      Socket.emit('session', {sessionName: $scope.sessionName});
      $scope.joinSession($scope.sessionName);
    })
    .catch(function(error) {
      console.error(error);
    });
  };

  var emitJoin = function(username, sessionName) {
    //this function emits a new join event to the socket.
    Socket.emit('newJoin', {
      username: username,
      sessionName: sessionName
    });
    $location.path('/lobby');
  };

  // sessionName is from a given session in the view, or from creation
  $scope.joinSession = function(sessionName) {
    Session.setSession(sessionName);
    Session.joinSession($scope.username, sessionName)
    .then(function() {
      emitJoin($scope.username, sessionName);
    })
    .catch(function(err) {
      console.error(err);
    });
  };


  $scope.getFriends = function (user) {
    console.log($cookies)
    Session.getFriends();
  };

})

.factory('Session', function($http, $window, $location) {

    var createSession = function(sessionName) {
      return $http({
        method: 'POST',
        url: '/api/sessions',
        data: {
          sessionName: sessionName
        }
      });
    };

    var fetchSessions = function() {
      return $http.get ('/api/sessions')
      .then(function(response) {
        return response.data;
      }, function(err) {
        console.error(err);
      }); 
    };

    var joinSession = function(sessionName, username) {
      return $http({
        method: 'POST',
        url: '/api/sessions/users',
        data: {
          sessionName: sessionName,
          username: username
        }
      });
    };

    var setSession = function(sessionName) {
      $window.localStorage.setItem('sessionName', sessionName);
    }; 

    var getSession = function() {
      var sessionName = $window.localStorage.getItem('sessionName');
      return $http.get('/api/sessions/' + sessionName)
      .then(function(res) {
        return res.data;
      }, function(err) {
        console.error(err);
      });
    };

    var getFriends = function (user) {

    }

    return {
      createSession: createSession,
      fetchSessions: fetchSessions,
      joinSession: joinSession,
      setSession: setSession,
      getSession: getSession,
      getFriends: getFriends
    }
})
