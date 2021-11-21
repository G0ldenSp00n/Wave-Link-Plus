function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {

    var settings = {};
    var channelList = [];
    var jsonPayload = {};
    var newMixerList = {};
    var outputList = {};
    var action = {};
    
    const supportedLanguage = [ 'en' ];
    var appLg = JSON.parse(inInfo)['application']['language'];
    var language = supportedLanguage.find(lang => lang == appLg) || 'en'; 
    var localization = {};
    
    var confSwitchProfile = false;

    websocket = new WebSocket("ws://127.0.0.1:" + inPort);

    // WebSocket is connected, send message
    websocket.onopen = function () {
        // Register property inspector to Stream Deck
        registerPluginOrPI(inRegisterEvent, inUUID);
        console.log("PI registered");
    };

    websocket.onmessage = function (evt) {
        // Received message from Stream Deck
        var jsonObj = JSON.parse(evt.data);
        var event = jsonObj['event'];
        jsonPayload = jsonObj['payload'];
        newMixerList = jsonPayload['newMixerList'];
        outputList = jsonPayload['outputList'];
        newSettings = jsonPayload['settings'];

        var actionInfo = JSON.parse(inActionInfo);
        settings = actionInfo['payload']['settings'];

        action = actionInfo['action'];
        var context = actionInfo['context'];

        // Take settings from updatePI(), because if PI is
        // active, no settings will be updated
        if (newSettings != null)
        {   
            if (settings != newSettings) {
                settings = newSettings;
            }
        }


        // Load the localizations
        getLocalization(language, function(inStatus, inLocalization) { 
            if (inStatus) {
                // Save public localization
                localization = inLocalization['PI'];
                showPI();
            } else {
                log(inLocalization);
            }
        });

        showPI = () => {   
            if(event == "sendToPropertyInspector") {
                console.log("sendToPropertyInspector")
                if(!jsonPayload["AppIsConnected"] && jsonPayload["AppIsConnected"] != undefined) {
                    const msg = document.getElementById("msg");
                    msg.innerHTML = `<details class="message caution"><summary class="error">${localization['msg_notice_toLaunchApp']}</summary></details>`;
                    msg.classList.remove('hidden');
                    hidePlaceholders();
                }
                else if (!jsonPayload["WLIsUpToDate"] && jsonPayload["WLIsUpToDate"] != undefined) {
                    const msg = document.getElementById("msg");
                    msg.innerHTML = `<details class="message caution"><summary class="error">${localization['msg_notice_toUpdateApp']}</summary></details>`;
                    msg.classList.remove('hidden');
                    hidePlaceholders();
                } else {
                    const msg = document.getElementById("msg");
                    msg.classList.add('hidden');
                    
                    switch (action) {
                        case "com.g0ldensp00n.wavelinkplus.controlvolumemixer":
                            setInputSliderSelection();
                            setMixerSelection();
                            break;         
                        default:
                            break;
                    }
                }
            }
        };
    }

    setOutputSelection = () => {
        const outputSelectionLocal = localization['setOutput'];
  
        if (settings.primOutput == null) { settings.primOutput = outputList[0].value; saveSettings(action, inUUID, settings); }

        var setOutputSelection = '<div class="sdpi-wrapper" id="action-select-div"> \
                                    <div class="sdpi-item"> \
                                        <div class="sdpi-item-label">' + outputSelectionLocal['label'] + '</div> \
                                        <select class="sdpi-item-value select" id="primary-select">'
                                            + outputList.map( output => {
                                                return "<option value='" + output.value + "'>" + output.name + "</option>"
                                            });
        setOutputSelection +=           '</select> \
                                        </div> \
                                </div>';

        document.getElementById("placeholder_LocalOutputSelection").innerHTML = setOutputSelection;

        document.getElementById("primary-select").value = settings.primOutput;

        document.getElementById("primary-select").addEventListener("change", sliderChanged = (inEvent) => {
            settings.primOutput = inEvent.target.value;
            saveSettings(action, inUUID, settings);
        })
    }

    toggleOutputSelection = () => {
        const outputSelectionLocal = localization['toggleOutput'];

        if (settings.primOutput == null) { settings.primOutput = outputList[0].value; saveSettings(action, inUUID, settings); }
        if (settings.secOutput == null) { settings.secOutput = outputList[1].value; saveSettings(action, inUUID, settings); }

        var setOutputSelection = '<div class="sdpi-wrapper" id="action-select-div"> \
                                    <div class="sdpi-item"> \
                                        <div class="sdpi-item-label">' + outputSelectionLocal['labelPrimary'] + '</div> \
                                        <select class="sdpi-item-value select" id="primary-select">'
                                            + outputList.map( output => {
                                                if (output.value == settings.secOutput)
                                                    return
                                                else
                                                    return "<option value='" + output.value + "'>" + output.name + "</option>"
                                            });
        setOutputSelection +=           '</select> \
                                        </div> \
                                    <div class="sdpi-item"> \
                                        <div class="sdpi-item-label">' + outputSelectionLocal['labelSecondary'] + '</div> \
                                        <select class="sdpi-item-value select" id="secondary-select">'
                                            + outputList.map( output => {
                                                if (output.value == settings.primOutput)
                                                    return
                                                else
                                                    return "<option value='" + output.value + "'>" + output.name + "</option>"
                                            });
        setOutputSelection +=           '</select> \
                                    </div> \
                                </div>';

        document.getElementById("placeholder_LocalOutputSelection").innerHTML = setOutputSelection;



        document.getElementById("primary-select").value = settings.primOutput;
        document.getElementById("secondary-select").value = settings.secOutput;

        document.getElementById("primary-select").addEventListener("change", sliderChanged = (inEvent) => {
            settings.primOutput = inEvent.target.value;
            saveSettings(action, inUUID, settings);
            toggleOutputSelection();
        })

        document.getElementById("secondary-select").addEventListener("change", sliderChanged = (inEvent) => {
            settings.secOutput = inEvent.target.value;
            saveSettings(action, inUUID, settings);
            toggleOutputSelection();
        })

    }

    setMicSettingsAction = () => {
        const micSettingsLocal = localization['micSettings'];

        var actionSelection = `<div class="sdpi-wrapper" id="action-select-div"> \
                                    <div class="sdpi-item"> \
                                        <div class="sdpi-item-label">${micSettingsLocal['label']}</div> \
                                            <select class="sdpi-item-value select" id="action-select"> \
                                                <option value="none">${micSettingsLocal['none']}</option> \
                                                <option value="adjustGain">${micSettingsLocal['adjustGain']}</option> \
                                                <option value="setGain">${micSettingsLocal['setGain']}</option> \
                                                <option value="adjustOutput">${micSettingsLocal['adjustOutput']}</option> \
                                                <option value="setOutput">${micSettingsLocal['setOutput']}</option> \
                                                <option value="adjustMic/PcBalance">${micSettingsLocal['adjustMic/PcBalance']}</option> \
                                                <option value="setMic/PcBalance">${micSettingsLocal['setMic/PcBalance']}</option> \
                                                <option value="setLowcut">${micSettingsLocal['setLowcut']}</option> \
                                                <option value="setClipguard">${micSettingsLocal['setClipguard']}</option> \
                                            </select> \
                                        </div> \
                                    </div>`;

        document.getElementById("placeholder_ActionSelection").innerHTML = actionSelection;

        if (settings.micSettingsAction == "undefined" || settings.micSettingsAction == null) 
        {
            settings.micSettingsAction = "none";
        }

        document.getElementById("action-select").value = settings.micSettingsAction;

        document.getElementById("action-select").addEventListener("change", sliderChanged = (inEvent) => {
            settings.micSettingsAction = inEvent.target.value;
            saveSettings(action, inUUID, settings);
            setMicSettingsAction();
        })

        document.getElementById("placeholder_VolumeSelection").innerHTML = "";

        switch (settings.micSettingsAction) {
            case "adjustGain":
                setVolumeSelection();
                break;
            case "setGain":
                setVolumeRange();
                break;
            case "adjustOutput":
                setVolumeSelection();
                break;
            case "setOutput":
                setVolumeRange();
                break;    
            case "adjustMic/PcBalance":
                setVolumeSelection();
                break;  
            case "setMic/PcBalance":
                setVolumeRange();
                break;      
            default:
                break;
        }
    }

    setInputSliderSelection = (isInputMute = false) => {
        const outputLocal = localization['outputSelection'];

        var allOption = isInputMute ? `<option value='all'>${outputLocal['all'] == undefined ? 'All' : outputLocal['all']}</option>` : `` ;

        sliderSelection = `<div class='sdpi-item'> \
                                <div class='sdpi-item-label'>${outputLocal['label']}</div> \
                                    <select class='sdpi-item-value select' id='inputmixer-select'> \
                                        <option value='local'>${outputLocal['local']}</option> \
                                        <option value='stream'>${outputLocal['stream']}</option>` +
                                        allOption +
                                    `</select> \
                                </div> \
                            </div>`;

        document.getElementById('placeholder_InputSliderSelection').innerHTML = sliderSelection;

        document.getElementById("inputmixer-select").value = settings.inputMixer;

        document.getElementById("inputmixer-select").addEventListener("change", sliderChanged = (inEvent) => {
            settings.inputMixer = inEvent.target.value;
            saveSettings(action, inUUID, settings);
        })
    }

    setVolumeSelection = () => {
        const volumeSelectLocal = localization['volumeSelection'];

        var labelPC = "";
        var labelMic = "";

        if (settings.micSettingsAction == "adjustMic/PcBalance") {
            labelPC = volumeSelectLocal['pc']
            labelMic = volumeSelectLocal['mic']
        }

        var volumeSelection =   `<div class="sdpi-wrapper" id="volume-select-div"> \
                                    <div class="sdpi-item"> \
                                        <div class="sdpi-item-label">${volumeSelectLocal['label']}</div> \
                                        <select class="sdpi-item-value select" id="volume-select"> \
                                            <option value="-25">-25${labelMic}</option> \
                                            <option value="-20">-20${labelMic}</option> \
                                            <option value="-15">-15${labelMic}</option> \
                                            <option value="-10">-10${labelMic}</option> \
                                            <option value="-5">-5${labelMic}</option> \
                                            <option value="5">+5${labelPC}</option> \
                                            <option value="10">+10${labelPC}</option> \
                                            <option value="15">+15${labelPC}</option> \
                                            <option value="20">+20${labelPC}</option> \
                                            <option value="25">+25${labelPC}</option> \
                                        </select> \
                                    </div> \
                                </div>`;

        document.getElementById("placeholder_VolumeSelection").innerHTML = volumeSelection;
 
        document.getElementById("volume-select").value = settings.volValue;

        document.getElementById("volume-select").addEventListener("change", volumeChanged = (inEvent) => 
        {
            settings.volValue = parseInt(inEvent.target.value);
            saveSettings(action, inUUID, settings);
        })
    }

    setVolumeRange = () => {
        const volumeRangeLocal = localization['volumeRange'];
        const label = settings.micSettingsAction == "setGain" ? volumeRangeLocal['setGain'] : settings.micSettingsAction == "setMicPC" ? volumeRangeLocal['setMic']: volumeRangeLocal['setVol'];
        const labelPC = settings.micSettingsAction == "setMic/PcBalance" ? volumeRangeLocal['pc'] : "100";
        const labelMic = settings.micSettingsAction == "setMic/PcBalance" ? volumeRangeLocal['mic'] : "0";

        var volumeRange =   `<div type="range" class="sdpi-item" id="volume-range"> \
                                <div class="sdpi-item-label">${label}</div> \
                                <div class="sdpi-item-value"> \
                                    <span class="clickable" value="0">${labelMic}</span> \
                                    <input class="floating-tooltip" data-suffix="%" type="range" min="0" max="100" id="vol-range"> \
                                    <span class="clickable" value="100">${labelPC}</span> \
                                </div> \
                            </div>`;

            document.getElementById("placeholder_VolumeSelection").innerHTML = volumeRange;

            const volRange = document.querySelector('input[type=range]');
            const tooltip = document.querySelector('.sdpi-info-label');
            const tw = tooltip.getBoundingClientRect().width;

            // Select the saved VolumeValue
            document.getElementById("vol-range").value = settings.volValue;
            tooltip.textContent = settings.volValue + "%";

            // If rangeslider changed, save the new VolumeValue
            document.getElementById("volume-range").addEventListener("change", volumeChanged = (inEvent) => 
            {
                settings.volValue = parseInt(inEvent.target.value);
                saveSettings(action, inUUID, settings);
            })
        
            const fn = () => {
                const rangeRect = volRange.getBoundingClientRect();
                const w = rangeRect.width - tw / 2;
                const percnt = (volRange.value - volRange.min) / (volRange.max - volRange.min);
                if (tooltip.classList.contains('hidden')) {
                    tooltip.style.top = '-1000px';
                } else {
                    tooltip.style.left = `${rangeRect.left + Math.round(w * percnt) - tw / 4}px`;
                    tooltip.textContent = Math.round(100 * percnt) + "%";
                    tooltip.style.top = `${rangeRect.top - 17}px`;
                }
            };
        
            if (volRange) {
                volRange.addEventListener(
                    'mouseenter',
                    function() {
                        tooltip.classList.remove('hidden');
                        tooltip.classList.add('shown');
                        fn();
                    },
                    false
                );
        
                volRange.addEventListener(
                    'mouseout',
                    function() {
                        tooltip.classList.remove('shown');
                        tooltip.classList.add('hidden');
                        fn();
                    },
                    false
                );
                volRange.addEventListener('input', fn, false);
            }
    }

    setFading = () => {
        const fadingLocal = localization['fadingSelection'];
        const unit = fadingLocal['unit'];

        var fadingSelection =   `<div class="sdpi-wrapper" id="volume-select-div"> \
                                    <div class="sdpi-item"> \
                                        <div class="sdpi-item-label">${fadingLocal['label']}</div> \
                                        <select class="sdpi-item-value select" id="fading-select"> \
                                            <option value=0>${fadingLocal['off']}</option> \
                                            <option value=500>${fadingLocal['500ms']}${unit}</option> \
                                            <option value=1000>${fadingLocal['1000ms']}${unit}</option> \
                                            <option value=1500>${fadingLocal['1500ms']}${unit}</option> \
                                            <option value=2000>${fadingLocal['2000ms']}${unit}</option> \
                                            <option value=2500>${fadingLocal['2500ms']}${unit}</option> \
                                            <option value=3000>${fadingLocal['3000ms']}${unit}</option> \
                                        </select> \
                                    </div> \
                                </div>`;
                                

        document.getElementById("placeholder_FadingSelection").innerHTML = fadingSelection;

        if (settings.fadingDelay == undefined || settings.fadingDelay == null) {
            settings.fadingDelay = 0;
        }

        document.getElementById("fading-select").value = settings.fadingDelay;

        document.getElementById("fading-select").addEventListener("change", sliderChanged = (inEvent) => {
            settings.fadingDelay = parseInt(inEvent.target.value);
            saveSettings(action, inUUID, settings);
        })
    }

    setMixerSelection = () => {
        channelList = [];
        Object.entries(newMixerList).map(e => { 
            channelList.push( { channelPos: e[0], name: e[1][0], mixerId: e[1][1], isLinked:  e[1][2] });           
        });

        const mixerLocal = localization['mixerSelection'];
        const label = mixerLocal['label'];

        var mixerSelection = "<div class='mixer-sdpi-wrapper' id='mixer-select-div'> \
                                <div class='sdpi-item'> \
                                    <div class='sdpi-item-label'>" + label + "</div> \
                                    <select class='sdpi-item-value select' id='mixer-select'>"
                                        + channelList.map( mixer => {
                                                return "<option value=" + mixer.channelPos + ">" + mixer.name + "</option>"
                                            });
                                        +
                                    "</select> \
                                </div> \
                            </div>";

        if (settings.mixId == "undefined" || settings.mixId == null) 
        {
            channelList.forEach(mixer => { if (mixer.channelPos == 1) settings.mixId = mixer.mixerId; });
            saveSettings(action, inUUID, settings);
        }

        document.getElementById("placeholder_InputMixerSelection").innerHTML = mixerSelection;

        const mixer = channelList.find(mixer => mixer.mixerId == settings.mixId);
        
        document.getElementById("mixer-select").value = mixer ? mixer.channelPos : 'N/A';

        document.getElementById("mixer-select").addEventListener("change", mixerChanged = (inEvent) => {                          
            settings.channelPos = inEvent.target.value;
            channelList.forEach(mixer => { 
                if (mixer.channelPos == settings.channelPos) {
                    settings.mixId = mixer.mixerId;
                    saveSettings(action, inUUID, settings);
                }
            });   
        })
    }

    setLinkInputs = () => {
        const linkLocal = localization['linkInputs'];
        const mixer = channelList.find(mixer => mixer.mixerId == settings.mixId);

        var linked =    `<div class='mixer-sdpi-wrapper' id='linkedInputsRb-div'>
                            <div type="radio" class="sdpi-item" id="linkedInputsRb">                    
                                <div class='sdpi-item-label'>${linkLocal['label']}</div>
                                <div class='sdpi-item'>
                                    <div class='sdpi-item-child'>
                                        <input id='rdio1' type='radio' value='on' name='rdio' >
                                        <label for='rdio1' class='sdpi-item-label'><span></span>${linkLocal['on']}</label>
                                    </div>
                                    <div class='sdpi-item-child'>
                                        <input id='rdio2' type='radio' value='off' name='rdio' checked>
                                        <label for='rdio2' class='sdpi-item-label'><span></span>${linkLocal['off']}</label>
                                    </div>
                                </div>
                            </div>
                        </div>`

        document.getElementById('placeholder_LinkInputs').innerHTML = linked;              
        
        if (mixer) {
            console.log(mixer)
            var rb = mixer.isLinked ? 'rdio1' : 'rdio2';
            document.getElementById(rb).checked = true;
            console.log(mixer.isLinked ? 'on' : 'off')
        }

        const linkedRb1 = document.getElementById("rdio1");
        const linkedRb2 = document.getElementById("rdio2");
        
        linkedRb1.addEventListener("change", radiochanged = (inEvent) => { 
            settings.isLinked = true;
            saveSettings(action, inUUID, settings);
        })
        linkedRb2.addEventListener("change", radiochanged = (inEvent) => { 
            settings.isLinked = false;
            saveSettings(action, inUUID, settings);
        })
    }

    setProfileSelection = () => {
        const profileLocal = localization['switchProfile'];
        const label = profileLocal['label'];

        var profileSelection = `<div class='mixer-sdpi-wrapper' id='profile-select-div'> \
                                    <div class='sdpi-item'> \
                                        <div class='sdpi-item-label'>${label}</div> \
                                        <select class='sdpi-item-value select' id='profile-select'> \
                                            <option value='WL1'>WL1</option> \
                                            <option value='WL2'>WL2</option> \
                                        </select> \
                                    </div> \
                                </div>`;

        document.getElementById("placeholder_MixerTyp").innerHTML = profileSelection;

        document.getElementById("profile-select").value = settings.activeProfile;

        document.getElementById("profile-select").addEventListener("change", profileChanged = (inEvent) => {
            settings.activeProfile = inEvent.target.value;
            saveSettings(action, inUUID, settings);
        })
    }

    function hidePlaceholders() {
        document.getElementById("placeholder_ActionSelection").innerHTML = "";
        document.getElementById("placeholder_MixerTyp").innerHTML = "";
        document.getElementById("placeholder_InputMixerSelection").innerHTML = "";
        document.getElementById("placeholder_InputSliderSelection").innerHTML = "";
        document.getElementById("placeholder_VolumeSelection").innerHTML = "";
    }

    function saveSettings(inAction, inUUID, inSettings) {
        if (websocket) {
            const json = {
                "action": inAction,
                "event": "setSettings",
                "context": inUUID,
                "payload": inSettings
            };
            websocket.send(JSON.stringify(json));
        }
    }
}