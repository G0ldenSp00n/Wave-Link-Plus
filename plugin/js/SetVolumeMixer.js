let selectedMixer = null;
let registeredListeners = {};
function SetVolumeMixer(inContext, inSettings) {

    this.typ = "SetVolumeMixer";

    this.onKeyDown = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {
        if (!this.wlc.isConnected || !this.wlc.isMicrophoneConnected || !this.wlc.isWLUpToDate) {
            this.awl.showAlert(inContext);
        } else {
            const mixId = this.getMixId();
            const mixer = this.wlc.getMixer(mixId);
            const isNotBlocked = mixer.isNotBlockedLocal;
            
            if (mixer && mixer.isAvailable && isNotBlocked) {
                this.wlc.rpc.call("getMicrophoneSettings").then((micSettings) => {
                    this.wlc.setMicOutputVolume(mixer.localVolIn);
                    selectedMixer = mixId;
                    console.log('running reset', selectedMixer)
                    Object.keys(registeredListeners).forEach( key => {
                        registeredListeners[key]();
                    })
                });
            } else {
                this.awl.showAlert(inContext);
            }
        }
    };

    this.registerMixerListener = function() {
        if (inSettings.mixId !== '' && !registeredListeners[inSettings.mixId]) {
            registeredListeners[inSettings.mixId] = this.setKeyIcons;
            this.wlc.on("micSettingsChanged", state => {
                if (selectedMixer === inSettings.mixId) {
                    if (!this.wlc.isConnected || !this.wlc.isMicrophoneConnected || !this.wlc.isWLUpToDate) {
                        this.awl.showAlert(inContext);
                    } else {
                        this.wlc.rpc.call("getMicrophoneSettings").then((micSettings) => {
                            this.wlc.setVolume('input', selectedMixer, 'local', micSettings.microphoneOutputVolume, 0);
                        });
                    }
                }
            });                  
        }
    }

    this.onKeyUp = function(inContext, inSettings, inCoordinates, inUserDesiredState, inState) {}

    this.setKeyIcons = () => {
        const mixId = this.getMixId();
        const mixer = this.wlc.getMixer(mixId);
        const selectedState = selectedMixer === mixId ? 1 : 0;

        const icons = {
            'Wave': './images/actions/Wave.svg',
            'System': './images/actions/System.svg',
            'Music': './images/actions/Output Local.svg',
            'Browser': './images/actions/Browser.svg',
            'Voice Chat': './images/actions/Voice Chat.svg',
            'SFX': './images/actions/SFX.svg',
            'Game': './images/actions/Game.svg',
            'AUX': './images/actions/AUX 1.svg'
        };

        if (mixer && mixer.isAvailable) {
            if (true) {
                this.svgIcon = new SVGIconWL({
                    icons,
                    icon: mixer.icon,
                    layerOrder: ["background", "icon"]
                });

                this.svgIcon2 = new SVGIconWL({
                    icons,
                    icon: mixer.icon,
                    layerOrder: ["background", "icon", "mute"]
                });

                this.svgIcon.backgroundColor = mixer.bgColor;
                this.svgIcon2.backgroundColor = mixer.bgColor;

                this.svgIcon.on('changed', () => {
                    const img = this.svgIcon.toBase64(true);
                    this.awl.setImage(inContext, img, 0);
                }); 
                
                this.svgIcon2.on('changed', () => {
                    const img = this.svgIcon2.toBase64(true);
                    this.awl.setImage(inContext, img, 1);
                });
            }

            this.awl.setState(inContext, ~~selectedState);
        } 
    }

    WaveLinkAction.call(this, inContext, inSettings, "com.elgato.wavelink.setvolumemixer");
};