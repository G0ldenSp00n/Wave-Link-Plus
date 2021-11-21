// super-tiny emitter - needs 'function' to keep 'this' private
/*eslint-env es6*/

const Events = function(instance) {
    const _cbs = [];
    instance.on = (key, callback) => !_cbs[key] ? _cbs[key] = [callback] : _cbs[key].push(callback);
    instance.emit = (key, ...params) => _cbs[key] && _cbs[key].forEach(cb => cb(...params));
};
'use strict';

/**
 * 
 */
class SVGIcon {

    /**
     * SVGIcon constructor
     * @constructor
     * @param {*} settings          String, Object or Array of urls to load as initial icons
     * @param {Object} inOptions    Object with additional initial properties to set
     * @param {Boolean} inDebug     Enable debugging
     * @property  {String} text place text in text-boxes
     * <br><br>can also be an object specifying the individual boxes (e.g. {text: {upper: 'Hello', lower: 'World', middle:''}})
     * @property  {String} icon name of the shown icon
     * @property  {Array} layerOrder change the layer-order of the icon-layers
     * * <br> 
     * <br>Note: This can also be used to show/hide layers... just pass the name of the layers to get shown in the array
     * @property {String} backgroundColor any CSS color-string
     * <br> e.g.
     * <br>&nbsp;&nbsp;&nbsp;`#fff` - even hex-color with transparency is supported, e.g. #ffffff80 (50% white)
     * <br>&nbsp;&nbsp;&nbsp;`white` - also named colors
     * @property  {String} fontColor font-color of text-boxes
     * <br><br>can also be an object specifying the individual boxes (e.g. {fontColor: {upper: 'green'}})
     * @property  {Number} fontSize font-size of text-boxes
     * <br><br>can also be an object specifying the individual boxes (e.g. {fontSize: {upper: 24, middle: 96}})
     * 
     * @property  {Number} fontWeight font-weight of text-boxes
     * <br><br>can also be an object specifying the individual boxes (e.g. {fontWeight: {upper: 'normal', middle: 'bold'}})
     * @property  {Number} fontStyle font-style of text-boxes
     * <br><br>can also be an object specifying the individual boxes (e.g. {fontStyle: {upper: 'italics', middle: 'normal'}})
     * @property  {Number} opacity opacity of the icon including all layers. Range: 0.0 ... 1.0 (default: 1)
     * @property  {Number} scale the overall scale of the icon, including all sub-layers (default: 1)
     * @property  {String} textStroke stroke-color of the SVG  (default: 'black')
     * @property  {Number} textStrokeWidth stroke-width of the SVG  (default: 3)
     *
     */
    constructor (settings = {}, inOptions = {}, inDebug = false) {

        // //console.log("SVGIcon", settings);
        let baseIconContainerCreated = false;

        const textAlignDefault = {
            textAnchor: "middle",
            textLeft: 72
        };


        const isColor = (inColor) => {
            const s = new Option().style;
            s.color = inColor ? inColor.toLowerCase() : '#fff';
            return s.color != "";
        };

        const extend = (obj, inValue) => {
            for(let e in inValue) {
                obj[e] = inValue[e];
            }
            return obj;
        };

        const initProps = (svg) => {
            const bg = this.findBackground(svg);
            if(bg) {
                this._fixLayer(bg, 'id');
            }
            if(settings && settings.backgroundColor) {
                this._options.backgroundColor = settings.backgroundColor;
            } else {
                this._options.backgroundColor = bg && bg.getAttribute('fill') || 'transparent';
            }

            if(svg.height.baseVal.value > 144) {
                if(!this.layerProps.hasOwnProperty('icon')) {
                    this.layerProps.icon = {};
                }
                this.layerProps['icon'].transform = `scale(${144 / svg.height.baseVal.value || 1})`;
                //console.log("--------- ADJUST SCALE -----", this.id, svg.height.baseVal.value, this.layerProps['icon']);
            }

            this.iconSVG = svg;
            this.showIconLayer("#background", false); // hide background from icon
        };

        const getTextAlign = (value) => {
            let textAnchor = 'middle';
            let textLeft = 72;
            if(value == 'left' || value == 'start') {
                textAnchor = "start";
                textLeft = 2;
            } else if(value == 'middle' || value == 'center') {
                textAnchor = "middle";
                textLeft = 72;
            } else if(value == 'right' || value == 'end') {
                textAnchor = "end";
                textLeft = 144;
            }
            return {textAnchor, textLeft};
        };

        this.debug = false;
        this.updateLock = true;

        this.id = "noid";
        this.icons = {};
        this.layers = {};
        this.layerProps = {};
        this.iconSVG = null;
        this.element = null;

        this.setDbgWithColor('#ccff00');

        this.events = new Events(this);
        this._syncMode = true;
        this.initialIcon = '';

        this._p = (o, prop, defaultValue) => o && o[prop] ? `${prop}="${o && o[prop] !== undefined ? o[prop] : defaultValue}"` : '';
        this._props = o => `${this._p(o, 'opacity', 1)} ${this._p(o, 'transform', '')} ${this._p(o, 'x', '')}`;

        // set reacitve default values...
        this._options = {
            color: '#FFF',
            backgroundColor: settings && settings.backgroundColor ? settings.backgroundColor : 'transparent',
            opacity: 1,
            scale: 1,
            _layerOrder: ["background", "icon", "text"],
            _font: 'Helvetica',
            _text: {
                upper: '',
                middle: '',
                lower: '',
            },
            _textOpacity: {
                upper: 1,
                middle: 1,
                lower: 1,
            },
            _fontColor: {
                upper: '#fff',
                middle: '#fff',
                lower: '#fff',
            },
            _fontSize: {
                upper: 24,
                middle: 24,
                lower: 24,
            },
            _fontStyle: {
                upper: 'normal', //italic, obligue
                middle: 'normal',
                lower: 'normal',
            },
            _fontWeight: {
                upper: 'bold',
                middle: 'bold', //'normal', //bold
                lower: 'bold',
            },
            _textStroke: {
                upper: 'black',
                middle: 'black',
                lower: 'black',
            },
            _textStrokeWidth: {
                upper: 3,
                middle: 0,
                lower: 3,
            },
            _textAlign: {
                upper: textAlignDefault,
                middle: textAlignDefault,
                lower: textAlignDefault
            },
            _icon: this.initialIcon,
            /**
             * The icon's name
             * @param {String} Name of the icon to show
             * @returns {String} The current icon's name.  {@link showIconLayer}
             */
            icon: (value) => {
                if(value) {
                    this._icon = value; // this is very optimistic ¯\_(ツ)_/¯
                    if(this.iconSVG == this.stringToSVG(this.icons[value])) {
                        this.dbg("++++++ ICON already there:", value);
                    } else {
                        this.dbg('---setting icon:', value);
                    }

                    this.getIcons().then(() => {
                        const svg = this.icons[value];
                        if(svg) {
                            initProps(svg);
                            // } else {
                            //     //console.log('NO SUCH ICON: ', this.id, value, this.icons, svg);
                            //     //console.log(this.icons);
                        }
                    });
                }
                return this._icon;
            },
            text: (value) => this.setTextAttributes(value, '_text'),
            textOpacity: (value) => this.setTextAttributes(value, '_textOpacity'),
            font: (value) => this.setTextAttributes(value, '_font'),
            fontColor: (value) => this.setTextAttributes(value, '_fontColor', {validate: isColor}),
            fontSize: (value) => this.setTextAttributes(value, '_fontSize', {validate: (v) => v > 0}),
            /**
          
           *
           * @name SVGIcon#fontStyle
           * @type String
           * @default "bold" <br>
           * possible values: 'normal,bold'
           * @returns {String} the current font-style
           */
            fontStyle: (value) => this.setTextAttributes(value, '_fontStyle'),
            /**
           * 
           * @summary set the font-weight of the textboxes<br>
           * .
           * the value is any CSS string (including hex with transparency e.g. #ffffff80)
           * 
           * @description Some description
           * - Example bullet
           * - Example bullet
           * @tag Hello
           * 
           * @example
           * #ffffff80
           * also: Passing an object with the text-members is possible too 
           * @example
           * fontSize: {
           *    upper: 24,
           *    middle: 96
           * }
           * 
           * @name SVGIcon#fontWeight
           * @type String
           * @default "bold"
           * @returns {String} the current stroke-color<br>
           */
            fontWeight: (value) => this.setTextAttributes(value, '_fontWeight'),

            /**
            * set the stroke-color of the textboxes
            * @name SVGIcon#textStroke
            * @type String
            * @default "black"
            * @returns {String} the current stroke-color
            */
            textStroke: (value) => this.setTextAttributes(value, '_textStroke'),

            /**
           * set the stroke-width of the textboxes
           * @name SVGIcon#textStrokeWidth
           * @type Number
           * @default 3
           * @returns {Number} the current stroke-width
           */
            textStrokeWidth: (value) => this.setTextAttributes(value, '_textStrokeWidth'),

            /**
             * set the complete icon's layer order
             * @name SVGIcon#layerOrder
             * @type Array
             * @default ["background", "underlay", "mute", "icon", "overlay", "text"]
             * @returns {Array} the current layer order
             */
            layerOrder: (value) => {
                if(Array.isArray(value)) {this._layerOrder = value;}
                return this._layerOrder;
            },
            /**
            * @name SVGIcon#innerHTMLSync
            */
            innerHTMLSync: (options) => this.innerHTMLFn(options),
            /**
             * Align text-boxes<br>
             * possible values "start", "middle", "end", "left", "center", "right"<br>
             * Passing an object with the text-members is possible too<br>
             * <br>
             *  textAlign: {<br>
             *    upper: 'start',<br>
             *    middle: 'middle'<br>
             * }<br>
             * @example
             * textAlign: {
             *    upper: 'start',
             *    middle: 'middle'
             * }
             * @name SVGIcon#textAlign
             * @type String
             * @default "middle"
             * @returns {Array} the current layer order
             */
            textAlign: (inValue) => this.setTextAttributes(inValue, '_textAlign', {setter: getTextAlign})
        };


        /** 
         * END OPTIONS
         */

        if(settings && settings.icons && settings.icon) {
            if(typeof settings === 'string') {
                this.dbg("-------- SETTINGS = STRING:", settings);
                // this.getIconPromise = this.loadIcons(settings);
                const loadedSVG = this.loadSVGSync(settings, false);
                //console.log(loadedSVG);
                if(loadedSVG) initProps(this.stringToSVG(loadedSVG));
                baseIconContainerCreated = true;
            } else if(typeof settings === 'object') {
                const tIcon = settings.icons[settings.icon];
                this.dbg("-------- SETTINGS = OBJECT:", settings, settings.icon, tIcon);
                if(tIcon) {
                    const loadedSVG = this.loadSVGSync(tIcon, false);
                    if(loadedSVG) initProps(this.stringToSVG(loadedSVG));
                    baseIconContainerCreated = true;
                }
            }
        }

        /**
         * Apply passed settings object's values to the internal options
         */

        let moreSettings;
        if(typeof settings === 'string') {
            moreSettings = inOptions;
        } else {
            moreSettings = settings;
        }

        this.dbg("MORESETTINGS", moreSettings, typeof moreSettings);

        if(moreSettings && typeof moreSettings === 'object') {
            Object.keys(this._options).forEach(o => {
                if(o.charAt(0) == '_' && typeof this._options[o] === 'object') {
                    const p = o.slice(1);
                    let inValue = moreSettings[p];
                    if(p.includes('textAlign')) {
                        this.setTextAttributes(inValue, '_textAlign', {setter: getTextAlign}, this._options);
                    } else if(moreSettings.hasOwnProperty(p)) {
                        if(p.includes('fontColor')) {
                            this.setTextAttributes(inValue, '_fontColor', null, this._options);
                        } else {
                            extend(this._options[o], inValue);
                        }
                    }
                }
            });
        }

        if(typeof settings === 'string') {  // new SVGIcon('./svgimages/AUX.svg')
            this.getIconPromise = this.loadIcons(settings);
        } else if(typeof settings === 'object' && Array.isArray(settings)) {
            this.getIconPromise = this.loadIcons(settings);
        } else if(typeof settings === 'object' && settings.hasOwnProperty('icons')) {
            this.getIconPromise = this.loadIcons(settings.icons);
        } else {
            // create fallback icon
            const svg = this.createIcon();
            this.icons = {'auto': svg};
            this.getIconPromise = Promise.resolve(svg);
            initProps(svg);
            baseIconContainerCreated = true;
        }

        if(!baseIconContainerCreated) {
            this.getIconPromise.then(d => {
                let tSvg = this.icons[Object.keys(this.icons)[0]];
                initProps(tSvg);
            });
        }

        // Making properties reactive
        // this allows e.g. setting the property without additional
        // accessor or wrapper
        // e.g.  svgIcon.showBackground = true
        // see below for an alternative ES6 way

        Object.keys(this._options).forEach(o => this._defineProperty.call(this, o));

        this._addLayers();

        this.getIconPromise.then(svg => {
            this.dbg("LOADED", this.icon, this.updateLock);
            this.update(true);
        });

    } /* END constructor */

    loaded = () => this._syncMode ? Promise.resolve() : this.getIconPromise.then(svg => svg);
    toTitleCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    /**
     * hideBackground
    * Hide the SVGIcon's background (note: if the icon contains a background you can show/hide it using).
    * @returns {String} The text in the lower text-box.  {@link showIconLayer}
    */

    hideBackground = () => this.showBackground = false;
    toggleBackground = () => this.showBackground = !this.showBackground;
    findBackground = (svg) => svg.querySelector("#background") || svg.querySelector("#Background") || svg.querySelector('rect');

    setBackground = (value) => { this.backgroundColor = value; } //console.log(this.backgroundColor); 

    setTextAttributes = (value, prop, options, trgt) => {
        if(value === undefined) return this[prop];
        const obj = trgt || this;
        const validate = (options && options.validate && typeof options.validate === 'function') ? options.validate : () => true;
        const setter = (options && options.setter && typeof options.setter === 'function') ? options.setter : (v) => v;
        let dirty = false;

        if(typeof value == 'string' || typeof value == 'number') {
            if(validate(value)) {
                let newValue = setter(value);
                obj[prop] = {
                    upper: newValue,
                    middle: newValue,
                    lower: newValue
                };
                dirty = true;
            }
        } else if(typeof value == 'object') {
            for(let e in value) {
                if(validate(value[e]) && obj[prop][e] !== setter(value[e])) {
                    dirty = true;
                    obj[prop][e] = setter(value[e]);
                };
            }
        }
        if(dirty) this.update();
    };

    getIconLayer = (selector) => selector && this.iconSVG && this.iconSVG.querySelector(selector);
    queryIconAll = (selector) => selector && this.iconSVG && this.iconSVG.querySelectorAll(selector);
    querySelector = (selector) => selector && this.iconSVG && this.iconSVG.querySelector(selector);
    querySelectorAll = (selector) => selector && this.iconSVG && this.iconSVG.querySelectorAll(selector);

    /**
     * showIconLayer<br>
     * show or hide a layer _INSIDE_ the icon {@link hideBackground}<br>
     * @param {String} selector 
     * @param {Boolean} showOrHide 
     * @returns {Object} The currently processed layer or NULL
     */
    showIconLayer = (selector, showOrHide) => {
        this.setIconLayerProperty(selector, 'opacity', showOrHide == true ? 1 : 0);
    };

    setIconLayerProperty = (selector, prop, value) => {
        const lyr = this.getIconLayer(selector);
        if(lyr) {
            lyr.setAttribute(prop, value);
            this.update();
        }
    };

    setIconProperty = this.setIconLayerProperty;

    /**
     * 
     */
    _addLayers = () => {
        this.addLayer('background', (o) => `<path ${this._props(o)} fill="${o.backgroundColor || this._options.backgroundColor}" d="M0 0h144v144H0z"/>`);

        // moved to subclass
        // this.addLayer('underlay', (o) => underlay_local_svg_temp, {visible: false});
        // this.addLayer('mute', (o) => `<rect ${this._props(o)} width="128" height="128" x="8" y="8" fill="#0E0B1DCC" rx="20"/>`, {visible: false, opacity: .7}, ['overlay']);

        this.addLayer('icon', (o) => `<g ${this._props(o)} class="icon">${this.iconSVG && typeof this.iconSVG === 'object' ? this.iconSVG.innerHTML : this.iconSVG}</g>`);

        this.addLayer('overlay', (o) => `<g ${this._props(o)} ><path id="overlay" fill="#000" d="M29.5736 25.9167l90.5097 90.5097-5.6569 5.6569-90.5097-90.5097 5.6569-5.6569z"/>
                               <path fill="#FFF" d="M29.5736 23.9167l90.5097 90.5097-5.6569 5.6569-90.5097-90.5097 5.6569-5.6569z"/></g>`, {visible: false, opacity: .9}, ['mute']);


        this.addLayer('text', (opt) => {
            const o = this._options;
            const txtIntro = `<text xml:space="preserve" font-family="${o._font}" alignment-baseline="central"`;
            const offs = 3;
            const txtLayer = (which, y) => `${o._text[which] !== "" ? `${txtIntro} opacity="${o._textOpacity[which] || 1}" text-anchor="${o._textAlign[which].textAnchor}"  font-size="${o._fontSize[which]}" font-style="${o._fontStyle[which]}" font-weight="${o._fontWeight[which]}" x="${o._textAlign[which].textLeft}" y="${y}" fill="${o._fontColor[which] || '#fff'}" stroke="${o._textStrokeWidth[which] > 0 ? o._textStroke[which] : 'transparent'}" paint-order="stroke" stroke-width="${o._textStrokeWidth[which]}" >${o._text[which]}</text>` : ''}`;
            const g = `<g ${this._props(opt)}  >
            ${txtLayer('upper', o._fontSize.upper + offs)}
            ${txtLayer('middle', 72 + o._fontSize.middle / 3)}
            ${txtLayer('lower', 144 - offs - o._fontSize.lower / 4)}
             </g> `;
            // //console.log(g);
            return g;
        });
    };

    /**
     * Add a layer to the layer-stack<br>
     * There are a couple of ways to add a layer to the icon<br>
     * <br>
     * • dd layer from SVG string<br>
     * svgIcon.addLayer('ovalo', '<ellipse width="64" height="64" fill="#00cc00" cx="94" cy="66" rx="30" ry="30"></ellipse>');<br>
     * <br>
     * • add layer from relative path<br>
     * svgIcon.addLayer('ovalo_rel', './svgimages/oval.svg');<br><br>
     * • add layer from url<br>
     * svgIcon.addLayer('kclogo', 'https://kc.smm.io/beta/svgimages/kc.svg');<br><br>
     * <br>
     * @param {String} inLayerName String, Object or Array of urls to load as initial icons
     * @param {Function} callback 
     * @param {Object} defaultOptions Object with properties used as default properties for the layer {@link _addLayers}
     * @param {Array} linkedLayersArray Array of layerNames which are linked to the current layer     
     */
    addLayer = (inLayerName, inParam, defaultOptions = {visible: true}, linkedLayersArray = []) => {
        return new Promise((resolve, reject) => {
            const layerName = inLayerName && typeof inLayerName === 'string' && inLayerName.length ? inLayerName : `layer_${this.layers.length}`;
            if(layerName == 'icon' && this.layers.hasOwnProperty(layerName)) {
                console.info("Cant replace base icon layer... Exiting...");
                resolve();
                return;
            }
            const prop = `show${this.toTitleCase(layerName)}`;
            this._makeProxy(layerName, defaultOptions);

            var callback; // = inParam;
            if(typeof inParam === 'function') {
                callback = inParam;
            } else if(typeof inParam === 'string') {
                // poor man's svg check
                if(inParam.endsWith('.svg')) {
                    return this.getIcon(inParam).then(svg => {
                        return this.addLayer(inLayerName, svg, defaultOptions, linkedLayersArray);
                    });
                }
                callback = (o) => `<g ${this._props(o)}>${inParam}</g>`;
            } else if(inParam.constructor === SVGSVGElement) {
                if(inParam.firstElementChild.hasAttribute("opacity")) {
                    const opc = inParam.firstElementChild.getAttribute("opacity");
                    this.layerProps[layerName].opacity = opc;
                }
                if(inParam.firstElementChild.hasAttribute("transform")) {
                    const transform = inParam.firstElementChild.getAttribute("transform");
                    this.layerProps[layerName].transform = transform;
                }
                inParam.firstElementChild.setAttribute("opacity", "`${o.opacity}`");
                callback = (o) => `<g ${this._props(o)}>${inParam.innerHTML}</g>`;
            } else {
                callback = (o) => '';
                //console.log("CALLBACK IS NOT A FUNCTION", typeof inParam);
            }

            // if(this.layers.hasOwnProperty(layerName)) {
            //     delete this.layers.layerName;
            //     //console.log(callback, typeof inParam, this.layers);
            // }

            /**
             * Allow adding private properties to the layerProps
             * which are still reactive (means: changing such a property)
             * will update the icon and issue an 'emit' event
             */


            Object.defineProperty(this.layers, layerName, {
                enumerable: true,
                configurable: true,
                get: (v) => {
                    return callback(this.layerProps[layerName] || this._options);
                },
                set: (value, k) => {
                    if(inLayerName === 'icon') {
                        console.error("Can't replace main icon layer... Exiting unchanged!");
                        return;
                    };
                    callback = (o) => `<g ${this._props(o)}>${value}</g>`;
                    if(inLayerName === 'icon') {
                        this.icons[inLayerName] = value; ///+++andy
                        //console.log("----->> ", inLayerName, value);
                        // const svg = this.icons[inLayerName];
                        this.iconSVG = value;
                        // initProps(svg);
                    }
                    this.update();
                }
            });

            // add default value
            // this[prop] = defaultOptions.visible === true;
            // this.layerProps[layerName].visible = defaultOptions.visible === true;
            // linkedLayersArray.forEach(lyrNme => this.layerProps.hasOwnProperty(lyrNme) && (this.layerProps[lyrNme].visible = defaultOptions.visible == true));

            // make reactive
            this._defineProperty.call(this, prop);

            // add behaviour
            this[prop] = value => {
                if(value !== undefined) {
                    this.layerProps[layerName].visible = value;
                    linkedLayersArray.forEach(lyrNme => this.layerProps.hasOwnProperty(lyrNme) && (this.layerProps[lyrNme].visible = value));
                }
                return this.layerProps[layerName].visible;
            };

            this[prop] = defaultOptions.visible === true;


            resolve();

        });
    };

    /**
     * 
     * @param {String} inLayerName The name of the layer to remove
     */
    removeLayer = (inLayerName) => {
        if(inLayerName && typeof inLayerName === 'string' && inLayerName.length && this.layers.hasOwnProperty(inLayerName)) {
            const prop = `show${this.toTitleCase(inLayerName)}`;
            delete this[prop];
            delete this.layers[inLayerName];
        }
    };
    innerHTMLFn(options) {
        const getLyr = layerName => this.layerProps.hasOwnProperty(layerName) && this.layerProps[layerName].visible ? this.layers[layerName] : '';
        return `<svg xmlns = "http://www.w3.org/2000/svg" viewBox = "0 0 144 144"><defs><clipPath id="clip"><rect x="0" y="0" width="144" height="144" opacity="0" /></clipPath></defs>
                 <g opacity="${this._options.opacity}" transform="scale (${this._options.scale})" clip-path="url(#clip)">
                 ${ this._options._layerOrder.map(getLyr).join('\n')}
                 </g></svg>`;
    };

    innerHTML(options) {
        return this.getIconPromise.then((icn) => {
            return this.innerHTMLFn(options);
        });
    }

    /**
     * Encode Unicode to ASCII then to base64
     * @param {string} data
     * @return {string}
     */
    utoa(data) {
        return btoa(unescape(encodeURIComponent(data)));
    }

    /**
     * Decode base64 to ASCII then to Unicode
     * @param {string} b64
     * @return {string}
     */
    atou(b64) {
        return decodeURIComponent(escape(atob(b64)));
    }

    /**
     * return base64 encoded SVGIcon
     * @return {string}
     */
    toBase64(containsUnicode = false) {
        return containsUnicode ? `data:image/svg+xml;base64,${this.utoa(this.innerHTMLFn())}` : `data:image/svg+xml;base64,${btoa(this.innerHTMLFn())}`;
    }
    toSVGDataURL(unencoded = false) {
        return unencoded ?
            `data:image/svg+xml,${this.innerHTMLFn()}` :
            'data:image/svg+xml,' + encodeURIComponent(this.innerHTMLFn())
                .replace(/'/g, '%27')
                .replace(/"/g, '%22');
    }

    toDataURL(type = 'image/png') {
        switch(type) {
            case 'image/jpeg':
            case 'image/png':
                return this.toType(null, null, type);
                break;
            default:
                return this.toSVGDataURL();
        }
    }

    async toPNG(elm, callback) {
        return this.toType(elm, callback, 'image/png');
    }

    async toJPG(elm, callback) {
        return this.toType(elm, callback, 'image/jpeg');
    }

    async toSVG(elm, callback) {
        const svg = this.toSVGDataURL();
        if(elm && elm instanceof Image) elm.src = svg;
        if(callback) callback(svg);
        return svg;
    }

    async toType(elm, callback, inType = 'image/png') {
        const type = ['image/jpeg', 'image/png'].includes(inType) ? inType : 'image/png';
        return await this.toElement(null, type, callback).then(dataUrl => {
            if(elm && elm instanceof Image) elm.src = dataUrl;
            return dataUrl;
        });
    }

    toCanvas(canvas, _cb, elm) {
        const img = (elm && elm instanceof Image) ? elm : new Image(canvas.width, canvas.height);
        img.onload = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            if(_cb) _cb();
        };
        img.onerror = (err) => //console.log("Error in toCanvas", err, elm, img, canvas, _cb);
        img.src = this.toSVGDataURL();
    }

    async toElement(elm, type = 'image/png', _cb) {
        return new Promise(resolve => {
            if(_cb) {
                const canvas = document.createElement('canvas');
                const sze = 288;
                canvas.height = canvas.width = sze;
                this.toCanvas(canvas, () => {
                    const dataUrl = canvas.toDataURL(type);
                    if(_cb) _cb(dataUrl);
                    resolve(dataUrl);
                }, elm);
            } else {
                resolve(this.toSVG(elm));
            }
        });
    }


    getBackgroundColor(svg) {
        const bg = this.findBackground(svg);
        return bg && bg.getAttribute("fill") || '#FFF';
    }

    /** DRAWING */

    lock = () => this.updateLock = true;

    unlock = (forceRedraw) => forceRedraw === true ? this.update(forceRedraw) : this.updateLock = false;

    _makeProxy(layerName, defaultOptions) {
        const that = this;
        const handler = {
            get: function(target, key) {
                if(typeof target[key] === 'object' && target[key] !== null) {
                    if(!(key in target)) {
                        //console.log("KEY not found", key, target);
                    }
                    return new Proxy(target[key], handler);
                } else {
                    return target[key];
                }
            },
            set: function(target, key, value) {
                if(target[key] !== value) {
                    target[key] = value;
                    that.update();
                }
                return true;
            }
        };
        // merge automatically added properties
        if(this.layerProps.hasOwnProperty(layerName)) {
            defaultOptions = Object.assign(defaultOptions, this.layerProps[layerName]);
        }
        this.layerProps[layerName] = new Proxy(defaultOptions, handler);
    }

    _defineProperty(o) {
        Object.defineProperty(this, o, {
            enumerable: true,
            configurable: true,
            get: () => {
                if(typeof this._options[o] === 'function') {
                    return this._options[o]();
                }
                return this._options[o];
            },
            set: (v, k) => {
                if(typeof this._options[o] === 'function') {
                    this._options[o](v, o);
                } else {
                    this._options[o] = v;
                }
                this.update();
                return this._options[o];
            }
        });
    };

    _fixLayer = (lyr, attr) => {
        const a = lyr.getAttribute(attr);
        if(a) lyr.setAttribute(attr, a.toLowerCase());
    };
    /**
     * Update the icon and emit a 'changed' event, if the icon is unlocked
     * @param {Boolean} unlock  'unlock' the icon 
     */
    update(unlock = false) {
        if(this.element) {
            this.innerHTML(null, "Update").then(html => {
                this.element.innerHTML = html;
            });
        }
        if(unlock === true) this.updateLock = false;
        if(!this.updateLock) {
            this.emit('changed');
        }
    }
    setOutputNode(el) {
        this.element = el;
    }

    drawToElement(el, options) {
        this.element = el;
        el.innerHTML = this.innerHTMLSync(options);
        // this.innerHTML(options).then(html => el.innerHTML = html);
    }
    /**
     * 
     * @param {String} url      element-path (or relative path) to load
     * @param {Boolean} async   load sync (this is much faster in local environments)
     */
    loadSVGSync(url, async = false, cb) {
        const req = new XMLHttpRequest(); // use XMLHttpRequest, otherwise we can not run from the file:// protocol
        if(!this._syncMode) req.responseType = "text"; //"application/xml"; // ""image/svg+xml";
        req.onload = () => {
            if(cb) cb(req.response);
            return (req.response);
        };
        ['abort', 'error'].forEach((evt) => {req.addEventListener(evt, (error) => {console.log(error);});});
        req.open('GET', url, false); //false marks this as SYNCHRONOUS
        req.send();
        return req.response;
    }

    /**
     * loadSVG
     * @param {String} url      element-path (or relative path) to load
     * @returns {Promise}
     */
    loadSVG(url, inSync) {
        const useAsync = !this._syncMode;
        return new Promise(function(resolve, reject) {
            const req = new XMLHttpRequest(); // use XMLHttpRequest, otherwise we can not run from the file:// protocol
            req.withCredentials = true; // should be default anyway
            if(useAsync) req.responseType = "text"; //"application/xml"; // ""image/svg+xml";
            req.onload = () => {
                resolve({
                    ok: true,
                    // arrayBuffer: () => Promise.resolve(req.response),
                    result: () => Promise.resolve(req.response)
                });
            };
            ['abort', 'error'].forEach((evt) => {req.addEventListener(evt, (error) => {reject(error);});});
            // req.open('GET', url);
            req.open('GET', url, useAsync);  //false marks this as SYNCHRONOUS
            req.send();
        });
    }
    /**
     * Return all loaded icons names
     * @returns {String}
     */
    async getIcons() {
        return this.getIconPromise.then(() => this.icons);
    }
    /**
     * Return an icon's svg
     * @returns {Object}
     */
    async getSVG() {
        return this.getIconPromise.then(() => this.iconSVG);
    }

    stringToSVG(res) {

        // const div = document.createElement("div");
        // let svg = String(res);
        // if(!res.match(/^\s*<\s*svg(?:\s|>)/)) {
        //     svg = `<svg>${svg}</svg>`;
        // }
        // div.innerHTML = svg;
        // return div.querySelector('svg');

        // return this.parseSVGString(res);

        const doc = new DOMParser().parseFromString(
            res,
            "image/svg+xml"
        );
        return doc.querySelector('svg') || {};
    }

    // parseSVGString(res = "") {
    //     const div = document.createElement("div");
    //     let svg = String(res);
    //     if(!res.match(/^\s*<\s*svg(?:\s|>)/)) {
    //         svg = `<svg>${svg}</svg>`;
    //     }
    //     div.innerHTML = svg;
    //     return div.querySelector('svg');
    // };

    // parseSVGStringAlt = function(res, test) {
    //     var f = document.createDocumentFragment(),
    //         full = true,
    //         div = document.createElement("div");

    //     let svg = String(res);
    //     if(!svg.match(/^\s*<\s*svg(?:\s|>)/)) {
    //         svg = "<svg>" + svg + "</svg>";
    //         full = false;
    //     }
    //     div.innerHTML = svg;
    //     svg = div.getElementsByTagName("svg")[0];
    //     if(svg) {
    //         if(full) {
    //             f = svg;
    //         } else {
    //             while(svg.firstChild) {
    //                 f.appendChild(svg.firstChild);
    //             }
    //         }
    //     }
    //     return f;
    // };


    /**
     * 
     * @param {String} url 
     */
    async getIcon(url) {
        const tUrl = url ? url : this.url;
        return await this.loadSVG(tUrl).then(d => {
            return d.result().then(res => {
                return this.stringToSVG(res);
            });
        });
    }

    /**
     * 
     * @param {*} inIcons  String, Array, Object {@link SVGIcon}
     */
    loadIcons(inIcons, targetProperty = "icons") {
        const autoFixLayers = false;
        const iconsToLoad = typeof inIcons === 'string' ? [inIcons] : inIcons;
        const autoFix = (lyr) => {
            const lyrWithId = lyr.querySelectorAll('[id]');
            Array.from(lyrWithId).forEach(l => {
                this._fixLayer(l, 'id');
            });
        };

        if(Array.isArray(iconsToLoad)) { // allow ['./svgimages/AUX.svg', './svgimages/Browser.svg',...];
            const allPromises = iconsToLoad.map(path => this.getIcon(path));
            return Promise.all(allPromises).then(icns => {
                iconsToLoad.forEach((name, i) => {
                    const baseName = name.split("/").pop().split('.')[0];
                    if(autoFixLayers) {
                        autoFix(icns[i]);
                    }
                    this.id = baseName;
                    this[targetProperty][baseName] = icns[i];
                    // this.dbg('*** adding icon (1)', targetProperty, baseName, icns[i]);
                    // this.dbg('*** adding icon (1)', targetProperty, baseName);
                });
            });
        } else if(typeof iconsToLoad === 'object') {  // allow { "Aux": "./svgimages/AUX.svg", "Browser": "./svgimages/Browser.svg", ...}
            const objs = Object.entries(iconsToLoad);
            const allPromises = objs.map(obj => this.getIcon(obj[1]));
            return Promise.all(allPromises).then(icns => {
                objs.forEach((icn, i) => {
                    if(autoFixLayers) {
                        autoFix(icns[i]);
                    }
                    this.id = icn[0];
                    // this.dbg('*** adding icon (2)', targetProperty, icn[0]);
                    // this.dbg('*** adding icon (2)', targetProperty, icn[0], icns[i]);
                    this[targetProperty][icn[0]] = icns[i];
                });
            });
        }

    }
    /** DEBUGGING */
    setDbgWithColor(inTagClr, inId) {
        const tagClr = (inTagClr.includes('rgb') || inTagClr.charAt(0) == '#') ? inTagClr : `#${inTagClr}`;
        this.dbg = this.debug ? console.log.bind(window.console, `%c[${inId || 'SVGIcon'}]`, `color:${tagClr};`) : () => {};
    }

    createIcon = (inSVGString = '') => {
        var div = document.createElement('div');
        // div.innerHTML = testw;
        // div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
        //     <rect id="background" width="144" height="144" x="0" y="0" fill="#ff0000" fill-rule="nonzero" opacity="0" />
        //     <rect id="icon" width="72" height="72" x="36" y="36" fill="#150076" stroke="none" fill-rule="nonzero"/>
        // </svg>`;
        div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">${inSVGString}</svg>`;

        return div.firstChild;
    };
}

let testw = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <defs>
    <linearGradient id="artboard-a" x1="50%" x2="50%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="red"/>
    </linearGradient>
  </defs>
  <g id="Artboard" fill="none" fill-rule="evenodd" stroke="none" stroke-width="1">
    <rect id="background" width="144" height="144" x="0" y="0" fill="url(#artboard-a)" fill-rule="nonzero"/>
    <rect id="icon" width="72" height="72" x="36" y="36" fill="#150076" fill-rule="nonzero"/>
  </g>
</svg>
`;

const getFontSize = (options = {}) => { //thx gifshot! :)

    var fontSize = parseInt(options.fontSize, 10) || 13;
    var minFontSize = parseInt(options.minFontSize, 10) || 6;
    var div = document.createElement('div');
    var span = document.createElement('span');

    div.setAttribute('width', options.width);
    div.appendChild(span);

    span.innerHTML = options.title || options.text || '';
    span.style.fontSize = fontSize + 'px';
    span.style.textIndent = '-9999px';
    span.style.visibility = 'hidden';

    document.body.appendChild(span);

    while((span.offsetWidth > options.width) && (fontSize >= minFontSize)) {
        span.style.fontSize = --fontSize + 'px';
    }

    document.body.removeChild(span);

    return fontSize; //+ 'px';
};


const ytest = (options = {hallo: 'welt'}) => {
    //console.log("OPTIONS", options);

};

// Static Width (Plain Regex)
const wrap = (s, w) => s.replace(
    /(?![^\n]{1,32}$)([^\n]{1,32})\s/g, '$1\n'
);

// Dynamic Width (Build Regex)
const wrapDynamic = (s, w) => s.replace(
    new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, 'g'), '$1\n'
);
