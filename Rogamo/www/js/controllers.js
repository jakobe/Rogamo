angular.module('rogamo.controllers', [])

.controller('KurentoCtrl', function ($scope) {
    $scope.$on('$ionicView.loaded', function (viewInfo, state) {

        var args = {
            ws_uri: 'ws://195.225.105.124:8888/kurento',
            hat_uri: 'http://files.kurento.org/imgs/mario-wings.png',
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
                remoteVideo: videoOutput,
                connectionConstraints: {
                    offerToReceiveAudio: false,
                    offerToReceiveVideo: true
                }
            };

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