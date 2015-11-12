angular.module('rogamo.controllers', [])

.controller('KurentoCtrl', function ($scope) {
    $scope.$on('$ionicView.loaded', function (viewInfo, state) {

        var args = {
            ws_uri: 'ws://kurento.lab.fiware.org:8888/kurento',//;'ws://195.225.105.124:8888/kurento',
            hat_uri: 'https://cdn4.iconfinder.com/data/icons/desktop-halloween/256/Hat.png',
            ice_servers: undefined
        };

        function setIceCandidateCallbacks(webRtcPeer, webRtcEp, onerror) {
            webRtcPeer.on('icecandidate', function (candidate) {
                console.log("Local candidate:", candidate);

                candidate = kurentoClient.register.complexTypes.IceCandidate(candidate);

                webRtcEp.addIceCandidate(candidate, onerror)
            });

            webRtcEp.on('OnIceCandidate', function (event) {
                var candidate = event.candidate;

                console.log("Remote candidate:", candidate);

                webRtcPeer.addIceCandidate(candidate, onerror);
            });
        }

        console.log('CTRL - $ionicView.loaded', viewInfo, state, args);
        //console = new Console();

        var pipeline;
        var webRtcPeer;

        var videoInput = document.getElementById('videoInput');
        var videoOutput = document.getElementById('videoOutput');

        var startButton = document.getElementById("start");
        var stopButton = document.getElementById("stop");
        stopButton.addEventListener("click", stop);


        function stop() {
            if (webRtcPeer) {
                webRtcPeer.dispose();
                webRtcPeer = null;
            }

            if (pipeline) {
                pipeline.release();
                pipeline = null;
            }

            hideSpinner(videoInput, videoOutput);
        }

        function onError(error) {
            if (error) {
                console.error(error);
                stop();
            }
        }


        startButton.addEventListener("click", function start() {
            console.log("WebRTC loopback starting");

            showSpinner(videoInput, videoOutput);

            var options = {
                localVideo: videoInput,
                remoteVideo: videoOutput
            };
            if (window.device && window.device.platform === 'iOS') {
                options.connectionConstraints = {
                    offerToReceiveAudio: false,
                    offerToReceiveVideo: true
                };
                 options.mediaConstraints = {
                     audio : false,
                     video : {
                         mandatory : {
                             width: 120,
                             framerate : 10
                         }
                     }
                 };
            }

            if (args.ice_servers) {
                console.log("Use ICE servers: " + args.ice_servers);
                options.configuration = {
                    iceServers: JSON.parse(args.ice_servers)
                };
            } else {
                console.log("Use freeice")
            }

            webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
                if (error) return onError(error)

                this.generateOffer(onOffer)
            });
        });

        function onOffer(error, sdpOffer) {
            console.log("onOffer");

            if (error) return onError(error)

            kurentoClient(args.ws_uri, function (error, client) {
                if (error) return onError(error);

                client.create('MediaPipeline', function (error, _pipeline) {
                    if (error) return onError(error);

                    pipeline = _pipeline;

                    console.log("Got MediaPipeline");

                    pipeline.create('WebRtcEndpoint', function (error, webRtcEp) {
                        if (error) return onError(error);

                        setIceCandidateCallbacks(webRtcPeer, webRtcEp, onError)

                        console.log("Got WebRtcEndpoint");

                        webRtcEp.processOffer(sdpOffer, function (error, sdpAnswer) {
                            if (error) return onError(error);

                            console.log("SDP answer obtained. Processing...");

                            webRtcPeer.processAnswer(sdpAnswer, onError);
                        });
                        webRtcEp.gatherCandidates(onError);

                        //Hello world loopback:
                        //webRtcEp.connect(webRtcEp, function (error) {
                        //    if (error) return onError(error);

                        //    console.log("Loopback established");
                        //});

                        //Magic Mirror pipeline:
                        pipeline.create('FaceOverlayFilter', function (error, filter) {
                            if (error) return onError(error);

                            console.log("Got FaceOverlayFilter");

                            filter.setOverlayedImage(args.hat_uri, -0.35, -1.2, 1.6, 1.6,
                            function (error) {
                                if (error) return onError(error);

                                console.log("Set overlay image");
                            });

                            console.log("Connecting...");

                            client.connect(webRtcEp, filter, webRtcEp, function (error) {
                                if (error) return onError(error);

                                console.log("WebRtcEndpoint --> filter --> WebRtcEndpoint");
                            });
                        });
                    });
                });
            });
        }

        function showSpinner() {
            for (var i = 0; i < arguments.length; i++) {
                arguments[i].poster = 'img/transparent-1px.png';
                arguments[i].style.background = "center transparent url('img/spinner.gif') no-repeat";
            }
        }

        function hideSpinner() {
            for (var i = 0; i < arguments.length; i++) {
                arguments[i].src = '';
                arguments[i].poster = 'img/webrtc.png';
                arguments[i].style.background = '';
            }
        }

        /**
         * Lightbox utility (to display media pipeline image in a modal dialog)
         */
        $(document).delegate('*[data-toggle="lightbox"]', 'click', function (event) {
            event.preventDefault();
            $(this).ekkoLightbox();
        });

    });
})

.controller('KurentoPointerCtrl', function ($scope) {
    var pipeline,
        webRtcPeer,
        videoInput,
        videoOutput,
        maxForward = 50,
        maxBackward = 50,
        maxTurnLeft = 50,
        maxTurnRight = 50,
        forwardCount,
        backwardCount,
        turnLeftCount,
        turnRightCount,
        forwardIntervalId,
        backwardIntervalId,
        turnLeftIntervalId,
        turnRightIntervalId;

    function stop() {
        if (pipeline) {
            pipeline.release();
            pipeline = null;
        }

        if (webRtcPeer) {
            webRtcPeer.dispose();
            webRtcPeer = null;
        }

        hideSpinner(videoInput, videoOutput);
    }

    function hideSpinner() {
        for (var i = 0; i < arguments.length; i++) {
            arguments[i].src = '';
            arguments[i].poster = 'img/webrtc.png';
            arguments[i].style.background = '';
        }
    }

    $scope.$on('$ionicView.leave', function (viewInfo, state) {
        stop();
        if (backwardIntervalId && backwardIntervalId > 0) {
            clearInterval(backwardIntervalId);
            backwardIntervalId = null;
        }
        if (forwardIntervalId && forwardIntervalId > 0) {
            clearInterval(forwardIntervalId);
            forwardIntervalId = null;
        }
        if (turnLeftIntervalId && turnLeftIntervalId > 0) {
            clearInterval(turnLeftIntervalId);
            turnLeftIntervalId = null;
        }
        if (turnRightIntervalId && turnRightIntervalId > 0) {
            clearInterval(turnRightIntervalId);
            turnRightIntervalId = null;
        }
    });

    $scope.$on('$ionicView.enter', function (viewInfo, state) {
        forwardCount = 0;
        backwardCount = 0;
        turnLeftCount = 0;
        turnRightCount = 0;
    });


    $scope.$on('$ionicView.loaded', function (viewInfo, state) {

        var args = {
            ws_uri: 'ws://195.225.105.124:8888/kurento',
            ice_servers: undefined
        };

        var filter = null;


        function setIceCandidateCallbacks(webRtcPeer, webRtcEp, onerror) {
            webRtcPeer.on('icecandidate', function (candidate) {
                console.log("Local candidate:", candidate);

                candidate = kurentoClient.register.complexTypes.IceCandidate(candidate);

                webRtcEp.addIceCandidate(candidate, onerror)
            });

            webRtcEp.on('OnIceCandidate', function (event) {
                var candidate = event.candidate;

                console.log("Remote candidate:", candidate);

                webRtcPeer.addIceCandidate(candidate, onerror);
            });
        }

        console.log('CTRL - $ionicView.loaded', viewInfo, state, args);
        //console = new Console();
        kurentoClient.register('kurento-module-pointerdetector')

        const PointerDetectorWindowMediaParam = kurentoClient.register.complexTypes.PointerDetectorWindowMediaParam
        const WindowParam = kurentoClient.register.complexTypes.WindowParam

        videoInput = document.getElementById('videoInput');
        videoOutput = document.getElementById('videoOutput');

        var startButton = document.getElementById("start");
        var stopButton = document.getElementById("stop");
        var calibrateButton = document.getElementById("calibrate");
        var triggerWindowIn0Button = document.getElementById("triggerWindowIn0");
        var triggerWindowIn1Button = document.getElementById("triggerWindowIn1");
        triggerWindowIn0Button.addEventListener("touchstart", function () {
            if (filter) {
                filter._events.WindowIn({ windowId: 'window0' });
            }
        });
        triggerWindowIn1Button.addEventListener("touchstart", function () {
            if (filter) {
                filter._events.WindowIn({ windowId: 'window1' });
            }
        });


        stopButton.addEventListener("click", stop);
        calibrateButton.addEventListener("click", calibrate);


        startButton.addEventListener("click", function start() {
            console.log("WebRTC loopback starting");

            showSpinner(videoInput, videoOutput);

            var options =
            {
                localVideo: videoInput,
                remoteVideo: videoOutput
            }
            if (window.device && window.device.platform === 'iOS') {
                options.connectionConstraints = {
                    offerToReceiveAudio: false,
                    offerToReceiveVideo: true
                }
            }

            if (args.ice_servers) {
                console.log("Use ICE servers: " + args.ice_servers);
                options.configuration = {
                    iceServers: JSON.parse(args.ice_servers)
                };
            } else {
                console.log("Use freeice")
            }

            webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
                if (error) return onError(error)

                this.generateOffer(onOffer)
            });
        });

        function onOffer(error, sdpOffer) {
            if (error) return onError(error);

            console.log("onOffer");

            kurentoClient(args.ws_uri, function (error, client) {
                if (error) return onError(error);

                client.create('MediaPipeline', function (error, _pipeline) {
                    if (error) return onError(error);

                    pipeline = _pipeline;

                    console.log("Got MediaPipeline");

                    pipeline.create('WebRtcEndpoint', function (error, webRtc) {
                        if (error) return onError(error);

                        console.log("Got WebRtcEndpoint");

                        setIceCandidateCallbacks(webRtcPeer, webRtc, onError)

                        webRtc.processOffer(sdpOffer, function (error, sdpAnswer) {
                            if (error) return onError(error);

                            console.log("SDP answer obtained. Processing ...");

                            webRtc.gatherCandidates(onError);
                            webRtcPeer.processAnswer(sdpAnswer);
                        });

                        var calibrateWidth = 30,
                            windowWidth = 80,
                            centerX = 270 / 2,
                            centerY = 360 / 2,
                            padding = 50;

                        var options =
                        {
                            calibrationRegion: WindowParam({
                                topRightCornerX: centerX - (calibrateWidth / 2),
                                topRightCornerY: centerY - (calibrateWidth / 2),
                                width: calibrateWidth,
                                height: calibrateWidth
                            })
                        };

                        pipeline.create('PointerDetectorFilter', options, function (error, _filter) {
                            if (error) return onError(error);

                            filter = _filter;

                            var options = PointerDetectorWindowMediaParam({
                                id: 'backward',
                                height: windowWidth,
                                width: windowWidth,
                                upperRightX: centerX - (windowWidth / 2),
                                upperRightY: centerY - (calibrateWidth / 2) - windowWidth - padding
                            });

                            filter.addWindow(options, onError);

                            options = PointerDetectorWindowMediaParam({
                                id: 'forward',
                                height: windowWidth,
                                width: windowWidth,
                                upperRightX: centerX - (windowWidth / 2),
                                upperRightY: centerY + (calibrateWidth / 2) + padding
                            });

                            filter.addWindow(options, onError);
                            
                            options = PointerDetectorWindowMediaParam({
                                id: 'right',
                                height: windowWidth,
                                width: windowWidth,
                                upperRightX: centerX - windowWidth - (calibrateWidth / 2) - padding,
                                upperRightY: centerY - (windowWidth / 2)
                            });

                            filter.addWindow(options, onError);
                            
                            options = PointerDetectorWindowMediaParam({
                                id: 'left',
                                height: windowWidth,
                                width: windowWidth,
                                upperRightX: centerX + (calibrateWidth / 2) + padding,
                                upperRightY: centerY - (windowWidth / 2)
                            });

                            filter.addWindow(options, onError);

                            filter.on('WindowIn', function (data) {
                                console.log("Event window in detected in window " + data.windowId);
                                if (data.windowId === 'backward') {
                                    if (backwardIntervalId && backwardIntervalId > 0) {
                                        clearInterval(backwardIntervalId);
                                        backwardIntervalId = null;
                                    }
                                    backwardIntervalId = setInterval(function () {
                                        backwardCount++;
                                        if (backwardCount < maxBackward) {
                                            cordova.plugins.doubleRobotics.drive("driveBackward");
                                        } else {
                                            if (backwardIntervalId && backwardIntervalId > 0) {
                                                clearInterval(backwardIntervalId);
                                                backwardIntervalId = null;
                                            }
                                        }
                                    }, 50);
                                }
                                if (data.windowId === 'forward') {
                                    if (forwardIntervalId && forwardIntervalId > 0) {
                                        clearInterval(forwardIntervalId);
                                        forwardIntervalId = null;
                                    }
                                    forwardIntervalId = setInterval(function () {
                                        forwardCount++;
                                        if (forwardCount < maxForward) {
                                            cordova.plugins.doubleRobotics.drive("driveForward");
                                        } else {
                                            if (forwardIntervalId && forwardIntervalId > 0) {
                                                clearInterval(forwardIntervalId);
                                                forwardIntervalId = null;
                                            }
                                        }
                                    }, 50);
                                }
                                if (data.windowId === 'left') {
                                    if (turnLeftIntervalId && turnLeftIntervalId > 0) {
                                        clearInterval(turnLeftIntervalId);
                                        turnLeftIntervalId = null;
                                    }
                                    turnLeftIntervalId = setInterval(function () {
                                        turnLeftCount++;
                                        if (turnLeftCount < maxTurnLeft) {
                                            cordova.plugins.doubleRobotics.drive("turnLeft");
                                        } else {
                                            if (turnLeftIntervalId && turnLeftIntervalId > 0) {
                                                clearInterval(turnLeftIntervalId);
                                                turnLeftIntervalId = null;
                                            }
                                        }
                                    }, 50);
                                }
                                if (data.windowId === 'right') {
                                    if (turnRightIntervalId && turnRightIntervalId > 0) {
                                        clearInterval(turnRightIntervalId);
                                        turnRightIntervalId = null;
                                    }
                                    turnRightIntervalId = setInterval(function () {
                                        turnRightCount++;
                                        if (turnRightCount < maxTurnRight) {
                                            cordova.plugins.doubleRobotics.drive("turnRight");
                                        } else {
                                            if (turnRightIntervalId && turnRightIntervalId > 0) {
                                                clearInterval(turnRightIntervalId);
                                                turnRightIntervalId = null;
                                            }
                                        }
                                    }, 50);
                                }

                            });

                            filter.on('WindowOut', function (data) {
                                console.log("Event window out detected in window " + data.windowId);
                                if (data.windowId === 'backward') {
                                    if (backwardIntervalId && backwardIntervalId > 0) {
                                        clearInterval(backwardIntervalId);
                                        backwardIntervalId = null;
                                    }
                                    backwardCount = 0;
                                }
                                if (data.windowId === 'forward') {
                                    if (forwardIntervalId && forwardIntervalId > 0) {
                                        clearInterval(forwardIntervalId);
                                        forwardIntervalId = null;
                                    }
                                    forwardCount = 0;
                                }
                                if (data.windowId === 'left') {
                                    if (turnLeftIntervalId && turnLeftIntervalId > 0) {
                                        clearInterval(turnLeftIntervalId);
                                        turnLeftIntervalId = null;
                                    }
                                    turnLeftCount = 0;
                                }
                                if (data.windowId === 'right') {
                                    if (turnRightIntervalId && turnRightIntervalId > 0) {
                                        clearInterval(turnRightIntervalId);
                                        turnRightIntervalId = null;
                                    }
                                    turnRightCount = 0;
                                }
                            });

                            console.log("Connecting ...");
                            client.connect(webRtc, filter, webRtc, function (error) {
                                if (error) return onError(error);
                                document.getElementById('inputDimensions').innerText = "INPUT VIDEO - w: " + videoInput.videoWidth + ", h: " + videoInput.videoHeight;
                                setTimeout(function() { document.getElementById('outputDimensions').innerText = "OUTPUT VIDEO - w: " + videoOutput.videoWidth + ", h: " + videoOutput.videoHeight;}, 2000);
                                console.log("WebRtcEndpoint --> Filter --> WebRtcEndpoint");
                            });
                        });
                    });
                });
            });
        }
        function calibrate() {
            if (filter) filter.trackColorFromCalibrationRegion(onError);
        }

        function onError(error) {
            if (error) console.error(error);
        }

        function showSpinner() {
            for (var i = 0; i < arguments.length; i++) {
                arguments[i].poster = 'img/transparent-1px.png';
                arguments[i].style.background = "center transparent url('img/spinner.gif') no-repeat";
            }
        }

        /**
         * Lightbox utility (to display media pipeline image in a modal dialog)
         */
        $(document).delegate('*[data-toggle="lightbox"]', 'click', function (event) {
            event.preventDefault();
            $(this).ekkoLightbox();
        });




    });
})

.controller('RobotCtrl', function ($scope) {
            function pole(command) {
                cordova.plugins.doubleRobotics.pole(command);
            };
            function kickstand(command) {
                cordova.plugins.doubleRobotics.kickstand(command);
            };
            function drive(command) {
                cordova.plugins.doubleRobotics.drive(command);
            };
            function addBtnHandler(id, func, command) {
                document.getElementById(id).addEventListener('touchstart', function() { func(command); }, false);
            };
            $scope.$on('$ionicView.loaded', function (viewInfo, state) {
                       addBtnHandler('poleDown', pole, 'poleDown');
                       addBtnHandler('poleStop', pole, 'poleStop');
                       addBtnHandler('poleUp', pole, 'poleUp');
                       
                       addBtnHandler('deployKickstands', kickstand, 'deployKickstands');
                       addBtnHandler('retractKickstands', kickstand, 'retractKickstands');
                       
                       addBtnHandler('driveBackward', drive, 'driveBackward');
                       addBtnHandler('driveForward', drive, 'driveForward');
                       addBtnHandler('turnLeft', drive, 'turnLeft');
                       addBtnHandler('turnRight', drive, 'turnRight');
                       
               });
            }).controller('ArCtrl', function ($scope) {
                          $scope.$on('$ionicView.loaded', function (viewInfo, state) {
                                     var video = null;
                                     var canvas = null;
                                     var photo = null;
                                     var startbutton = null;
                                     var webRtcStream;
                                     video = document.getElementById('video');

                                     document.getElementById('startVideo').addEventListener('touchstart', function() {
                                                                                            //alert('start video...');
                                                                                            navigator.getUserMedia(
                                                                                                                   {
                                                                                                                   video: true,
                                                                                                                   audio: false
                                                                                                                   },
                                                                                                                   function (stream) {
                                                                                                                   webRtcStream = stream;
                                                                                                                   video.src = window.URL.createObjectURL(stream);
                                                                                                                   console.log("video.play()...");
                                                                                                                   video.play();
                                                                                                                   },
                                                                                                                   function (err) {
                                                                                                                   console.log("An error occured! " + err);
                                                                                                                   }
                                                                                                                   );
                                                                                            }, false);
                                     document.getElementById('stopVideo').addEventListener('touchstart', function() {
                                                                                           if (webRtcStream) webRtcStream.stop();
                                                                                           }, false);
                                     
                                     });
                          });
