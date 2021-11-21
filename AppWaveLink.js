function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) 
{
    new AppWaveLink().init(inPort, inPluginUUID, inRegisterEvent, inInfo);
}   

class AppWaveLink {

    static instance;

    constructor() {
        if (AppWaveLink.instance) {
            //debug("AWL Instance returned.");
            return AppWaveLink.instance;
        }
        //debug("No AWL Instance found...");
        AppWaveLink.instance = this;
    }

    init(inPort, inPluginUUID, inRegisterEvent, inInfo) {

        this.inPort = inPort;
        this.inRegisterEvent = inRegisterEvent;
        this.inPluginUUID = inPluginUUID;

        this.profile = "local";
        this.activePI = "";

        this.event = ELGEvents.eventEmitter();
        this.on = this.event.on;
        this.emit = this.event.emit;

        this.actions = {};
        
        var infoObj = JSON.parse(inInfo)
        this.wlc = new WaveLinkClient(infoObj["application"]["platform"]);
        this.devices = infoObj["devices"];

        this.websocket = new WebSocket("ws://127.0.0.1:" + this.inPort);

        this.websocket.onopen = () => {
                if (this.websocket) {
                    var json = {
                        "event": this.inRegisterEvent,
                        "uuid": this.inPluginUUID
                    };
            
                    this.websocket.send(JSON.stringify(json));
                    debug("Plug-In registered");   
                }
            }        

        this.websocket.onmessage = (evt) => {
            var jsonObj = JSON.parse(evt.data);
            var event = jsonObj["event"];
            var action = jsonObj["action"];
            var context = jsonObj["context"];
            var device = jsonObj["device"];
            var jsonPayload = jsonObj["payload"];

            // debug("SD message: " + event);

            if (event == "applicationDidLaunch") {
                if (jsonPayload["application"].includes("WaveLink")) {
                    this.wlc.tryToConnect();
                    setTimeout(() => { 
                        if (!this.wlc.isConnected) {  
                            this.wlc.setAppIsRunning(true);
                            this.wlc.tryToConnect();
                        }
                    }, 1000)
                }
            }

            if (event == "applicationDidTerminate") {
                if (jsonPayload["application"].includes("WaveLink")) {
                    this.wlc.setConnectState(false);
                    this.wlc.setAppIsRunning(false);
                    this.updatePI();
                }
            }   

            if (event == "willAppear") {

                var settings = jsonPayload["settings"];
                const volMixer = new SetVolumeMixer(context, settings);

                switch (action) {
                    case "com.g0ldensp00n.wavelinkplus.controlvolumemixer":
                        this.actions[context] = volMixer;
                        break;
                    default:
                        break;
                }

                volMixer.registerMixerListener();
                if (this.wlc.isConnected) {
                    Object.keys(this.actions).forEach( key => {
                        if (key == context) {
                            if (this.actions[context] !== volMixer) {
                                this.actions[context].setKeyIcons();                            
                            }
                        }
                    });
                } 
            }

            if (event == "willDisappear") {
                // Remove current instance from array
              if (context in this.actions) {
                  this.actions[context].removeListeners();
                  delete this.actions[context];
              }
          }

            if (event == "keyUp") {
                var settings = jsonPayload["settings"];
                var coordinates = jsonPayload["coordinates"];
                var userDesiredState = jsonPayload["userDesiredState"];
                var state = jsonPayload["state"];

                    if (context in this.actions) {
                        this.actions[context].onKeyUp(context, settings, coordinates, userDesiredState, state);
                    }
            }

            if (event == "keyDown") {
                var settings = jsonPayload["settings"];
                var coordinates = jsonPayload["coordinates"];
                var userDesiredState = jsonPayload["userDesiredState"];
                var state = jsonPayload["state"];

                    if (context in this.actions)
                    {
                        this.actions[context].onKeyDown(context, settings, coordinates, userDesiredState, state);
                    }
            }

            if (event == "propertyInspectorDidDisappear") {
                this.activePI = "";
            }

            if (event == "propertyInspectorDidAppear") {
                Object.keys(this.actions).forEach( key => {
                    if (key == context) {
                        this.activePI = context;
                        this.actions[context].updatePI(this.wlc.isConnected, this.wlc.isWLUpToDate);
                    }
                });
                
            } else if (event == "didReceiveSettings") {

                var settings = jsonPayload["settings"];
                var mixId = settings["mixId"];
                var inputMixer = settings["inputMixer"];
                var volValue = settings["volValue"];
                var fadingDelay = settings["fadingDelay"];
                var isLinked = settings["isLinked"];
                var micSettingsAction = settings["micSettingsAction"];
                var activeProfile = settings["activeProfile"];
                var primOutput = settings["primOutput"];
                var secOutput = settings["secOutput"];

                Object.keys(this.actions).forEach( key => {
                    if (key == context) {
                        if (this.actions[context].settings["mixId"] != mixId)
                        {
                            this.actions[context].settings["mixId"] = mixId;
                            this.actions[context].setKeyIcons();
                        }
                        if (this.actions[context].settings["inputMixer"] != inputMixer)
                        {
                            this.actions[context].settings["inputMixer"] = inputMixer;
                            this.actions[context].setKeyIcons();
                        }
                        if (this.actions[context].settings["volValue"] != volValue) {
                            this.actions[context].settings["volValue"] = volValue;
                            this.actions[context].setKeyIcons();
                        }
                        if (this.actions[context].settings["micSettingsAction"] != micSettingsAction) {
                            this.actions[context].settings["micSettingsAction"] = micSettingsAction;
                            this.actions[context].setKeyIcons();
                        }
                        if (this.actions[context].settings["fadingDelay"] != fadingDelay) {
                            this.actions[context].settings["fadingDelay"] = fadingDelay;
                        }
                        // Setting link inputmixer from plugin atm. deactivated
                        /*
                        const mixer= this.wlc.getMixer(mixId);
                        if (mixer && this.actions[context].typ == "AdjustVolumeMixer" && mixer.isLinked != isLinked) {
                            this.wlc.getMixer(mixId).isLinked = isLinked;
                            this.wlc.setInputMixer(mixId, inputMixer);
                        }
                        */
                        if (this.actions[context].settings["primOutput"] != primOutput) {
                            this.actions[context].settings["primOutput"] = primOutput;
                        }
                        if (this.actions[context].settings["secOutput"] != secOutput) {
                            this.actions[context].settings["secOutput"] = secOutput;
                        }
                        
                        this.actions[context].settings["activeProfile"] = activeProfile;

                    }
                });

                //this.wlc.emit("UpdateKeys");
            }       
        }
    }

    updatePI() {
        if (this.activePI != "") this.actions[this.activePI].updatePI(this.wlc.isConnected, this.wlc.isWLUpToDate, this.actions[this.activePI].settings);
    }
    
    sendToSD(json) {
        this.websocket.send(JSON.stringify(json));
    }

    showAlert(context) {
        var json = {
            "event": "showAlert",
            "context": context
        };
        
        this.websocket.send(JSON.stringify(json));
    }

    showOk(context) {
        var json = {
            "event": "showOk",
            "context": context,
        };

        this.websocket.send(JSON.stringify(json));
    }

    setState(context, state) {

        var json = {
            "event": "setState",
            "context": context,
            "payload": {
                "state": state
            }
        };
    
        this.websocket.send(JSON.stringify(json));
    }

    setTitle(context, titel) {
        var json = {
            "event": "setTitle",
            "context": context,
            "payload": {
                "title": titel,
                "target": 0
            }
        };

        this.websocket.send(JSON.stringify(json));
    }

    setImage(context, img, state) {     

        var json = {
            "event": "setImage",
            "context": context,
            "payload": {
                "image": img,
                "target": 0,
                "state": state
            }
        };
        
        this.websocket.send(JSON.stringify(json));
    }

    switchProfile(profile, device) 
    {
        switch (profile) {
            case "WL1":
                var switchProfile = "Wave Link 1";
                break;
            case "WL2":
                var switchProfile = "Wave Link 2";
                break;
            default:
                break;
        }  

        if (switchProfile != null) {
            var json = 
            {
                "event": "switchToProfile",
                "context": this.inPluginUUID,
                "device": device,
                "payload": {
                    "profile": switchProfile
               }
            };    
        }
        this.websocket.send(JSON.stringify(json));
    }

    saveSettings(inAction, inUUID, inSettings) {
        if (this.websocket) {
        const json = {
            "action": inAction,
            "event": "setSettings",
            "context": inUUID,
            "payload": inSettings
        };

        this.websocket.send(JSON.stringify(json));
        }
    }

    loadSettings(inAction, inUUID, inSettings) {
        if (this.websocket) {
        const json = {
            "event": "getSettings",
            "context": inUUID
        };

        this.websocket.send(JSON.stringify(json));
        }
    }


};

debugMode = false;

function debug(...args) {
    if (debugMode) console.log(...args)
}