// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic'])
.config(function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/')

    $stateProvider.state('home', {
        url: '/home',
        views: {
            home: {
                templateUrl: 'home.html'
            }
        }
    })

    $stateProvider.state('ar', {
        url: '/ar',
        views: {
            ar: {
                templateUrl: 'ar.html'
            }
        }
    })

    $stateProvider.state('robot', {
        url: '/robot',
        views: {
            robot: {
                templateUrl: 'robot.html'
            }
        }
    })

    $stateProvider.state('help', {
        url: '/help',
        views: {
            help: {
                templateUrl: 'help.html'
            }
        }
    })
})
.run(function($ionicPlatform) {
    $ionicPlatform.ready(function () {
        console.log("App ready.");
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    //if(window.cordova && window.cordova.plugins.Keyboard) {
    //  cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    //}
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})
