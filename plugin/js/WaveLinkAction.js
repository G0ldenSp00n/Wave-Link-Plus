function WaveLinkAction(inContext, inSettings, inUUID) {
    this.context = inContext;
    this.settings = inSettings;
    this.uuid = inUUID;

    this.awl = new AppWaveLink();
    this.wlc = new WaveLinkClient();

    this.svgIcon = null;
    this.svgIcon2 = null;

    // Time for setVolume() fading interval in ms
    this.interval = 100;

    this.UP_MAC = this.wlc.UP_MAC; 
    this.UP_WINDOWS = this.wlc.UP_WINDOWS; 

    if (this.settings.inputMixer == null) {
        this.settings.inputMixer = "local";
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }
    
    if (this.settings.volValue == null) {
        this.settings.volValue = 25;
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }

    if (this.settings.activeProfile == null) {
        this.settings.activeProfile = "inputs";
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }

    if (this.settings.channelPos == null) {
        this.settings.channelPos = "1";
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }

    if (this.settings.name == null) {
        this.settings.name = "";
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }

    if (this.settings.isConfigured == null) {
        this.settings.isConfigured = false;
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }

    if (this.settings.isLinked == null) {
        this.settings.isLinked = false;
        this.awl.saveSettings(this.uuid, this.context, this.settings);
    }

    this.listeners = [];

    this.removeListeners = function() {
        this.listeners.forEach(function(e, i) {
            e();
            e = null;
        });
        this.listeners = [];
    };

    this.localization = {};
    
    if (this.typ == 'MixerMute' || this.typ == 'MonitorMute') {  
        // Load the localizations
        getLocalization('com.elgato.wavelink.sdPlugin/' + 'en', function(inStatus, inLocalization) { 
            if (inStatus) {
                // Save public localization
                this.localization = inLocalization['Actions'];
            } else {
                //log(inLocalization);
            }
        });
    }
    this.updatePI = function(isConnected, isUpToDate, settings) {
        if (!isConnected || !isUpToDate) {
            var json = {
                "action": "com.elgato.wavelink.switchmonitoring", 
                "event": "sendToPropertyInspector", 
                "context": this.context, 
                "payload": { 
                    "AppIsConnected" : isConnected,
                    "WLIsUpToDate" : isUpToDate
                }
            };
        } else {
            var newMixerList = {};

            this.wlc.mixers.forEach(mixer => {
                newMixerList[mixer.channelPos] = [ mixer.name, mixer.mixerId, mixer.isLinked ];
            });

            var outputList = this.wlc.localOutputList;

            var json = {
                "action": "com.elgato.wavelink.switchmonitoring", 
                "event": "sendToPropertyInspector", 
                "context": this.context, 
                "payload": { 
                    newMixerList,
                    outputList,
                    settings
                }
            };
        }
        this.awl.sendToSD(json);
    };

    this.fixName = (name, maxlen = 8, suffix = '...') => {
        return (name && name.length > maxlen ? name.slice(0, maxlen - 1) + suffix : name);
    };

    if (this.typ == "ToggleMonitorMixOutput") {
        this.listeners.push(
            this.wlc.on("monitorMixChanged", state => {
                this.setKeyIcons();
             }
        )
        );
    };

    if (this.typ == "SwitchMonitoring") {
        this.listeners.push(
            this.wlc.on("switchStateChanged", state => {
                this.setKeyIcons();
             }
        )
        );
    };
    
    if(this.typ == "MixerMute") {
        this.listeners.push(
            this.wlc.on("inputMixerChanged", (mixerId) => {
                if(this.settings.mixId == mixerId || this.settings.channelPos == this.wlc.mixers.find(mixer => mixer.mixerId == mixerId).channelPos) {
                    this.setKeyIcons();
                }
            })
        );
    };

    if (this.typ == "MonitorMute") {
        this.listeners.push(
            this.wlc.on("outputMixerChanged", state => {
                this.setKeyIcons();
            })
        );
    }

    if (this.typ == "SetMicrophoneSettings") {
        this.listeners.push(
            this.wlc.on("micSettingsChanged", state => {
                this.setKeyIcons();
            })
        );
    }

    
    this.listeners.push(
        this.wlc.on("setKeyIcons", state => {
            this.setKeyIcons();
        })
    );

    this.getMixId = (device) => {
        var mixerId = "";
        var isSDXL = false;

        // If the saved mixerID is available, return it. If not, look if the virtual device is a external Input
        if (this.UP_WINDOWS) {

            if (!this.settings) {
                mixerDefault = this.wlc.mixers.find(mixer => mixer.channelPos == 1);
                mixerId = mixerDefault.mixerId;
            } else {
                const mixerWin = this.wlc.mixers.find(mixer => this.settings.mixId == mixer.mixerId);

                if (mixerWin) {
                    mixerId = mixerWin.mixerId;
                } else {
                    const extInput = this.wlc.mixers.find(mixer => mixer.channelPos == this.settings.channelPos);
                    
                    if (extInput && extInput.inputType == 4) {
                        mixerId = extInput.mixerId;
                    }
                }
            }
        }

        // On mac, search for a saved mixerID first
        if(this.UP_MAC) {
            var isConfigured = this.settings.isConfigured;
            const mixerMac = this.wlc.mixers.find(mixer => this.settings.mixId == mixer.mixerId);
            if (mixerMac) {
                mixerId = mixerMac.mixerId;
            } else {
                // If no mixerID is found, get the Stream Deck type
                if (device) {
                    const deviceType = this.awl.devices.find(deviceType => deviceType.id == device)
                    if (deviceType.type == 2) {
                        isSDXL = true;
                    }
                }
                // For standard Stream Deck profile, put the apps in the right folder. 
                if (!isSDXL && !isConfigured) {
                    this.settings.isConfigured = true;

                    switch (parseInt(this.settings.channelPos)) {
                        case 1:
                            const mainMicrophone = this.wlc.mixers.find(mixer => mixer.inputType == 1);
                            this.settings.mixId = mixerId = mainMicrophone.mixerId;
                            //this.settings.bgColor = mainMicrophone.bgColor;
                            this.awl.saveSettings(this.uuid, this.context, this.settings);
                            break;
                        case 3:
                            const defaultMusicApps = [ "com.spotify.client", "com.apple.iTunes", "com.apple.Music" ];
                            this.settings.mixId = mixerId = this.findMacApp(defaultMusicApps);
                            this.awl.saveSettings(this.uuid, this.context, this.settings);
                            //var mixer = this.wlc.mixers.find(mixer => mixer.mixerId == mixerId);
                            //if (mixer) mixer.bgColor = '#FF00E8';
                            break;
                        case 4:
                            const defaultBrowserApps = [ "com.google.Chrome", "org.mozilla.firefox", "com.apple.Safari" ];
                            this.settings.mixId = mixerId = this.findMacApp(defaultBrowserApps);
                            this.awl.saveSettings(this.uuid, this.context, this.settings);
                            //var mixer = this.wlc.mixers.find(mixer => mixer.mixerId == mixerId);
                            //if (mixer) mixer.bgColor = '#B521FF';
                            break;
                        case 5:
                            const defaultVoiceChatApps = [ "com.hnc.Discord", "us.zoom.xos", "com.microsoft.teams", "com.skype.skype", "com.tinyspeck.slackmacgap" ];
                            this.settings.mixId = mixerId = this.findMacApp(defaultVoiceChatApps);
                            this.awl.saveSettings(this.uuid, this.context, this.settings);
                            //var mixer = this.wlc.mixers.find(mixer => mixer.mixerId == mixerId);
                            //if (mixer) mixer.bgColor = "#CFD924";
                            break;
                        case 6:
                            const defaultSFXApps = [ "com.elgato.StreamDeck" ];
                            this.settings.mixId = mixerId = this.findMacApp(defaultSFXApps);
                            this.awl.saveSettings(this.uuid, this.context, this.settings);
                            //var mixer = this.wlc.mixers.find(mixer => mixer.mixerId == mixerId);
                            //if (mixer) mixer.bgColor = "#FF6C3E";
                            break;
                        default:
                            break;
                    }
                } else {
                    // For Stream Deck XL, use the channel position to fill all space
                    const mixerMac = this.wlc.mixers.find(mixer => this.settings.channelPos == mixer.channelPos);
                    if (mixerMac && !isConfigured) {
                        this.settings.mixId = mixerId = mixerMac.mixerId;
                        this.settings.isConfigured = true;
                        this.awl.saveSettings(this.uuid, this.context, this.settings);                        
                        //mixerMac.bgColor = this.wlc.bgColors[this.settings.channelPos];
                    }
                }
            }
        }

        return mixerId;
    };

    this.fadeVolume = (fn, delay) => {

        var ms = 100;

        if (delay > 0) {
            setTimeout(() => { 
            this.fadeVolume(fn, delay - ms)
            fn();
            }, ms)   
        }
    }

    this.findMacApp = (apps) => {
        var mixerId = "";
        isFirstApp = false;
        apps.forEach(app => {
            const foundApp = this.wlc.mixers.find(mixer => mixer.mixerId == app);
            if (foundApp && !isFirstApp) {
                mixerId = app;
                this.settings.mixId = app;
                isFirstApp = true;
            }
        });
        return mixerId;
    }
}