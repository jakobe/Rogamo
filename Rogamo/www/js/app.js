// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic', 'rogamo.controllers'])

.config(function ($stateProvider, $urlRouterProvider) {

    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js

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

    $stateProvider.state('kurento', {
        url: '/kurento',
        views: {
            kurento: {
                templateUrl: 'kurento.html',
                controller: 'KurentoCtrl'
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

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/home')

})
.run(function($ionicPlatform) {
  $ionicPlatform.ready(function () {
    console.log("App ready.");
    //alert("App ready");
    //alert("window.device.platform: " + window.device.platform);
    if (window.device && window.device.platform === 'iOS') {
        if (window.cordova && window.cordova.plugins.iosrtc) {
            cordova.plugins.iosrtc.registerGlobals();
        }
    }
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    //if(window.cordova && window.cordova.plugins.Keyboard) {
    //  cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    //}
    //if(window.StatusBar) {
    //  StatusBar.styleDefault();
    //}
  });
})
