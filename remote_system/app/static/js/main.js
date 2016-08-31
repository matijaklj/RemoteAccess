'use strict';
var app = angular.module('RemoteSystemApp', ['ngRoute']);

app.config(
	function($routeProvider) {
		$routeProvider.
	    when("/index", {
	        templateUrl: "/static/templates/main.html"
	    }).
	    when("/registers", {
	    	templateUrl: "/static/templates/registers.html"
	    }).
	    when("/settings", {
	    	templateUrl: "/static/templates/settings.html"
	    }).
	    when("/scpi_server", {
	    	templateUrl: "/static/templates/scpi_server.html"
	    }).
	    when("/saved_data", {
	    	templateUrl: "/static/templates/saved_data.html"
	    }).
	    otherwise({
	    	redirectTo : "/index"
	    });
	}
);

app.factory('connectedPitaya', function($rootScope) {
	console.log("CONNECTED PITAYA");
	var shared_rp = {};
	var rp_init = {
		'ip': 'DISCONNECTED',
		'name': '--',
		'active': '--',
		'version': '--',
		'fs': '--',
		'fpga': '--',
		'connected': false,
		'apps': null,
		'latency': 'N/A'
	};

	shared_rp.rp = rp_init;
	shared_rp.apps = null;
	shared_rp.prepBroadCastPitaya = function(
		data, apps, connected, latency){
		
		if (data) {
			this.rp = data;
			this.rp.connected = true;
			this.rp.latency = latency;
		} else {
			this.rp = rp_init;
		}

		if (app) {
			this.apps = apps;
		}

		//Broadcast message to all other controllers
		this.broadCastPitaya();
	};

	shared_rp.broadCastPitaya = function() {
		$rootScope.$broadcast('handleBroadcast');
	}

	return shared_rp;
});

app.config( 
	function($interpolateProvider) {
		$interpolateProvider.startSymbol('{$').endSymbol('$}');
	}
);

app.controller('basePageController', [
	'$scope', '$http', '$rootScope', 'connectedPitaya', 
	function($scope, $http, $rootScope, connectedPitaya) {

	$scope.connected = connectedPitaya.rp.connected;
	$scope.rp = connectedPitaya.rp;

	$scope.base_url =
	  		'http://' + document.domain + ':' + location.port
	var url = $scope.base_url + '/index'

	$http.post(url)
	.success(function(response) {
			console.log("SUCCESS");
			$scope.avaliable_pitaya = response.data.avaliable_rp;
		})
		.error(function(response) {
    		console.log(response.success);
  	});

	$scope.$on('handleBroadcast', function() {
		$scope.rp = connectedPitaya.rp;
		$scope.connected = connectedPitaya.rp.connected;
	});		
}]);

app.controller('mainPageController', [
	'$scope', '$http', '$timeout', '$rootScope', 'connectedPitaya',
	function($scope, $http, $timeout, $rootScope, connectedPitaya) {

		$scope.connected = connectedPitaya.connected;
		$scope.rp = connectedPitaya.rp;
		$scope.latency = connectedPitaya.latency;

		$scope.base_url =
	  			'http://' + document.domain + ':' + location.port;

		$scope.changePitayaState = function(cls, ip, name) {
    		
	  		var init_url = $scope.base_url + '/' + cls;
			$http.post(init_url, {'ip': ip, 'name': name})
				.success(function(data) {
					if (cls == 'connect') {
						$scope.poolLatency();
						connectedPitaya.prepBroadCastPitaya(
							data.data.rp,
							data.data.apps,
							true,
							$scope.latency);
						$scope.avaliable_apps = data.data.apps;
						console.log($scope.avaliable_apps);
					} else {
						connectedPitaya.prepBroadCastPitaya(
							null,
							null,
							false,
							"N/A");
					}
	  			})
				.error(function(error) {
	    			console.log(error);
	  		});
		};

		$scope.poolLatency = function latency() {
	        $http.get('/latency')
	        	.success(function(response) {
	            	$scope.latency = response.data;
	            	connectedPitaya.latency = $scope.latency;
	            	var promise = $timeout(latency, 1000);
	            	if ($scope.connected == false) {
	            		$timeout.cancel(promise);
	            		$scope.latency = 'N/A';
	            	}
	        	});
	    };

		$scope.$on('handleBroadcast', function() {
			console.log('BROADCAST');
			$scope.rp = connectedPitaya.rp;
			$scope.connected = connectedPitaya.rp.connected;
			$scope.latency = connectedPitaya.latency;
		});
	}
]);

app.controller('scpiController', [
	'$scope', '$http', '$rootScope', 'connectedPitaya', 
	function($scope, $http, $rootScope, connectedPitaya) {
		var scpi_url = $scope.base_url + '/scpi_server';

		console.log(scpi_url);
		
		$scope.executeScpiCommand = function(scpi_command, scpi_args) {
			$http.post(scpi_url, 
				{ 'scpi_command': scpi_command,
				  'scpi_args': scpi_args,
				  'type': 'single' })
				.success(function(response) {
					console.log("Success");
				});
		}
	}
]);

app.controller('settingsController', [
	'$scope', '$http', '$timeout', '$rootScope', 'connectedPitaya',
	function($scope, $http, $timeout, $rootScope, connectedPitaya) {

		var settings_url = $scope.base_url + '/settings';

		$scope.addUser = function(user) {
			$http.post(
				settings_url, 
				{ 'data': user, 'type': 'user' })
					.success(function(response) {
						console.log("ADDED USER");
					});
		};

		$scope.addPitaya = function(rp) {
			$http.post(settings_url, {'data': rp, 'type': 'pitaya'})
				.success(function(response) {
					console.log("ADDED PITAYA");
				});
		}
	}
]);

app.controller('registerController', [
	'$scope', '$http', '$rootScope', 'connectedPitaya',
	function($scope, $http, $rootScope, connectedPitaya) {
		$scope.registers = [{}, {}, {}, {}, {}, {}]
		$scope.base_url =
		  		'http://' + document.domain + ':' + location.port
		var url = $scope.base_url + '/registers';

		$http.post(url)
		.success(function(response) {
				$scope.registers = response.data;
				console.log($scope.registers);
				console.log($scope.registers[0]);
			})
			.error(function(response) {
	    		console.log(response.success);
	  	});

		$scope.range = function(count, start){
		  var ratings = []; 
		  for (var i = start; i < count; i++) { 
		    ratings.push(i) 
		  } 
		  return ratings;
		}
	}
]);

app.controller('savedDataController', [
	'$scope', '$http', '$rootScope', 'connectedPitaya',
	function($scope, $http, $rootScope, connectedPitaya) {
		
		$scope.showModal = false;
		$scope.name = "";
		$scope.data = [[]];
		$scope.date = "";
		$scope.app = "";
		$scope.saved_data_list = {}

		$scope.showData = function(name, data){
    		$scope.name = name;
    		$scope.data = data.data;
    		$scope.date = data.date;
    		$scope.app = data.app;
    		$scope.showModal = !$scope.showModal;
    		$scope.data = data;
		};

		$scope.base_url = 
		  	'http://' + document.domain + ':' + location.port
	}
]);

app.directive('modal', function () {
    return {
      templateUrl: "/static/templates/data_modal.html",
      restrict: 'E',
      transclude: true,
      replace:true,
      scope:true,
      link: function postLink(scope, element, attrs) {
          scope.$watch(attrs.visible, function(value){
          if(value == true) {
            $(element).modal('show');
          }
          else {
            $(element).modal('hide');
       	  }
        });

        $(element).on('shown.bs.modal', function(){
          scope.$apply(function(){
            scope.$parent[attrs.visible] = true;
            var data = scope[attrs.ngModel];
            $.plot(
            	$('#placeholder'), 
            	[scope.data], 
            	{ lines: { lineWidth: 1 }});
          });
        });

        $(element).on('hidden.bs.modal', function(){
          scope.$apply(function(){
            scope.$parent[attrs.visible] = false;
          });
        });
      }
    };
  });