// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * Verify |value| is truthy.
 * @param value A value to check for truthiness. Note that this
 *     may be used to test whether |value| is defined or not, and we don't want
 *     to force a cast to boolean.
 */
function assert(value, message) {
    if (value) {
        return;
    }
    throw new Error('Assertion failed' + (message ? `: ${message}` : ''));
}

// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview This file defines a singleton which provides access to all data
 * that is available as soon as the page's resources are loaded (before DOM
 * content has finished loading). This data includes both localized strings and
 * any data that is important to have ready from a very early stage (e.g. things
 * that must be displayed right away).
 *
 * Note that loadTimeData is not guaranteed to be consistent between page
 * refreshes (https://crbug.com/740629) and should not contain values that might
 * change if the page is re-opened later.
 */
class LoadTimeData {
    data_ = null;
    /**
     * Sets the backing object.
     *
     * Note that there is no getter for |data_| to discourage abuse of the form:
     *
     *     var value = loadTimeData.data()['key'];
     */
    set data(value) {
        assert(!this.data_, 'Re-setting data.');
        this.data_ = value;
    }
    /**
     * @param id An ID of a value that might exist.
     * @return True if |id| is a key in the dictionary.
     */
    valueExists(id) {
        // TODO(42630414): Re-add assert check.
        // Commenting assert statement to mitigate Bug 42601651.
        // assert(this.data_, 'No data. Did you remember to include strings.js?');
        return this.data_ ? id in this.data_ : false;
    }
    /**
     * Fetches a value, expecting that it exists.
     * @param id The key that identifies the desired value.
     * @return The corresponding value.
     */
    getValue(id) {
        assert(this.data_, 'No data. Did you remember to include strings.js?');
        const value = this.data_[id];
        assert(typeof value !== 'undefined', 'Could not find value for ' + id);
        return value;
    }
    /**
     * As above, but also makes sure that the value is a string.
     * @param id The key that identifies the desired string.
     * @return The corresponding string value.
     */
    getString(id) {
        const value = this.getValue(id);
        assert(typeof value === 'string', `[${value}] (${id}) is not a string`);
        return value;
    }
    /**
     * Returns a formatted localized string where $1 to $9 are replaced by the
     * second to the tenth argument.
     * @param id The ID of the string we want.
     * @param args The extra values to include in the formatted output.
     * @return The formatted string.
     */
    getStringF(id, ...args) {
        const value = this.getString(id);
        if (!value) {
            return '';
        }
        return this.substituteString(value, ...args);
    }
    /**
     * Returns a formatted localized string where $1 to $9 are replaced by the
     * second to the tenth argument. Any standalone $ signs must be escaped as
     * $$.
     * @param label The label to substitute through. This is not an resource ID.
     * @param args The extra values to include in the formatted output.
     * @return The formatted string.
     */
    substituteString(label, ...args) {
        return label.replace(/\$(.|$|\n)/g, function (m) {
            assert(m.match(/\$[$1-9]/), 'Unescaped $ found in localized string.');
            if (m === '$$') {
                return '$';
            }
            const substitute = args[Number(m[1]) - 1];
            if (substitute === undefined || substitute === null) {
                // Not all callers actually provide values for all substitutes. Return
                // an empty value for this case.
                return '';
            }
            return substitute.toString();
        });
    }
    /**
     * Returns a formatted string where $1 to $9 are replaced by the second to
     * tenth argument, split apart into a list of pieces describing how the
     * substitution was performed. Any standalone $ signs must be escaped as $$.
     * @param label A localized string to substitute through.
     *     This is not an resource ID.
     * @param args The extra values to include in the formatted output.
     * @return The formatted string pieces.
     */
    getSubstitutedStringPieces(label, ...args) {
        // Split the string by separately matching all occurrences of $1-9 and of
        // non $1-9 pieces.
        const pieces = (label.match(/(\$[1-9])|(([^$]|\$([^1-9]|$))+)/g) ||
            []).map(function (p) {
            // Pieces that are not $1-9 should be returned after replacing $$
            // with $.
            if (!p.match(/^\$[1-9]$/)) {
                assert((p.match(/\$/g) || []).length % 2 === 0, 'Unescaped $ found in localized string.');
                return { value: p.replace(/\$\$/g, '$'), arg: null };
            }
            // Otherwise, return the substitution value.
            const substitute = args[Number(p[1]) - 1];
            if (substitute === undefined || substitute === null) {
                // Not all callers actually provide values for all substitutes. Return
                // an empty value for this case.
                return { value: '', arg: p };
            }
            return { value: substitute.toString(), arg: p };
        });
        return pieces;
    }
    /**
     * As above, but also makes sure that the value is a boolean.
     * @param id The key that identifies the desired boolean.
     * @return The corresponding boolean value.
     */
    getBoolean(id) {
        const value = this.getValue(id);
        assert(typeof value === 'boolean', `[${value}] (${id}) is not a boolean`);
        return value;
    }
    /**
     * As above, but also makes sure that the value is an integer.
     * @param id The key that identifies the desired number.
     * @return The corresponding number value.
     */
    getInteger(id) {
        const value = this.getValue(id);
        assert(typeof value === 'number', `[${value}] (${id}) is not a number`);
        assert(value === Math.floor(value), 'Number isn\'t integer: ' + value);
        return value;
    }
    /**
     * Override values in loadTimeData with the values found in |replacements|.
     * @param replacements The dictionary object of keys to replace.
     */
    overrideValues(replacements) {
        assert(typeof replacements === 'object', 'Replacements must be a dictionary object.');
        assert(this.data_, 'Data must exist before being overridden');
        for (const key in replacements) {
            this.data_[key] = replacements[key];
        }
    }
    /**
     * Reset loadTimeData's data. Should only be used in tests.
     * @param newData The data to restore to, when null restores to unset state.
     */
    resetForTesting(newData = null) {
        this.data_ = newData;
    }
    /**
     * @return Whether loadTimeData.data has been set.
     */
    isInitialized() {
        return this.data_ !== null;
    }
}
const loadTimeData = new LoadTimeData();
// Edge only
// Guard against overriding existing loadTimeData. This could happen if either:
// a) the page is already including loadTimeData from a script tag (perhaps it
//    is still using the deprecated version) but then also ends up including
//    this file as part of some other dependency, or
// b) the page is using multiple webpack entry points (not a good idea anyway)
//    that both include this file.
// In either case, we should warn the developer that something is wrong and not
// silently overwrite the existing instance which might already be initialized
// with data.
console.assert(!window.hasOwnProperty('loadTimeData'), 'window.loadTimeData is already set.');
Object.assign(window, { loadTimeData: loadTimeData });

// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * Alias for document.getElementById. Found elements must be HTMLElements.
 */
function getRequiredElement(id) {
    const el = document.querySelector(`#${id}`);
    assert(el);
    assert(el instanceof HTMLElement);
    return el;
}

/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$3=globalThis,e$3=t$3.ShadowRoot&&(void 0===t$3.ShadyCSS||t$3.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s$3=Symbol(),o$4=new WeakMap;let n$3=class n{constructor(t,e,o){if(this._$cssResult$=!0,o!==s$3)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e;}get styleSheet(){let t=this.o;const s=this.t;if(e$3&&void 0===t){const e=void 0!==s&&1===s.length;e&&(t=o$4.get(s)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&o$4.set(s,t));}return t}toString(){return this.cssText}};const r$3=t=>new n$3("string"==typeof t?t:t+"",void 0,s$3),S$1=(s,o)=>{if(e$3)s.adoptedStyleSheets=o.map((t=>t instanceof CSSStyleSheet?t:t.styleSheet));else for(const e of o){const o=document.createElement("style"),n=t$3.litNonce;void 0!==n&&o.setAttribute("nonce",n),o.textContent=e.cssText,s.appendChild(o);}},c$3=e$3?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return r$3(e)})(t):t
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */;const{is:i$3,defineProperty:e$2,getOwnPropertyDescriptor:h$2,getOwnPropertyNames:r$2,getOwnPropertySymbols:o$3,getPrototypeOf:n$2}=Object,a$1=globalThis,c$2=a$1.trustedTypes,l$1=c$2?c$2.emptyScript:"",p$1=a$1.reactiveElementPolyfillSupport,d$1=(t,s)=>t,u$1={toAttribute(t,s){switch(s){case Boolean:t=t?l$1:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t);}return t},fromAttribute(t,s){let i=t;switch(s){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t);}catch(t){i=null;}}return i}},f$3=(t,s)=>!i$3(t,s),b={attribute:!0,type:String,converter:u$1,reflect:!1,useDefault:!1,hasChanged:f$3};Symbol.metadata??=Symbol("metadata"),a$1.litPropertyMetadata??=new WeakMap;let y$1=class y extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t);}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,s=b){if(s.state&&(s.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((s=Object.create(s)).wrapped=!0),this.elementProperties.set(t,s),!s.noAccessor){const i=Symbol(),h=this.getPropertyDescriptor(t,i,s);void 0!==h&&e$2(this.prototype,t,h);}}static getPropertyDescriptor(t,s,i){const{get:e,set:r}=h$2(this.prototype,t)??{get(){return this[s]},set(t){this[s]=t;}};return {get:e,set(s){const h=e?.call(this);r?.call(this,s),this.requestUpdate(t,h,i);},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??b}static _$Ei(){if(this.hasOwnProperty(d$1("elementProperties")))return;const t=n$2(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties);}static finalize(){if(this.hasOwnProperty(d$1("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(d$1("properties"))){const t=this.properties,s=[...r$2(t),...o$3(t)];for(const i of s)this.createProperty(i,t[i]);}const t=this[Symbol.metadata];if(null!==t){const s=litPropertyMetadata.get(t);if(void 0!==s)for(const[t,i]of s)this.elementProperties.set(t,i);}this._$Eh=new Map;for(const[t,s]of this.elementProperties){const i=this._$Eu(t,s);void 0!==i&&this._$Eh.set(i,t);}this.elementStyles=this.finalizeStyles(this.styles);}static finalizeStyles(s){const i=[];if(Array.isArray(s)){const e=new Set(s.flat(1/0).reverse());for(const s of e)i.unshift(c$3(s));}else void 0!==s&&i.push(c$3(s));return i}static _$Eu(t,s){const i=s.attribute;return !1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev();}_$Ev(){this._$ES=new Promise((t=>this.enableUpdating=t)),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach((t=>t(this)));}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.();}removeController(t){this._$EO?.delete(t);}_$E_(){const t=new Map,s=this.constructor.elementProperties;for(const i of s.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t);}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return S$1(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach((t=>t.hostConnected?.()));}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach((t=>t.hostDisconnected?.()));}attributeChangedCallback(t,s,i){this._$AK(t,i);}_$ET(t,s){const i=this.constructor.elementProperties.get(t),e=this.constructor._$Eu(t,i);if(void 0!==e&&!0===i.reflect){const h=(void 0!==i.converter?.toAttribute?i.converter:u$1).toAttribute(s,i.type);this._$Em=t,null==h?this.removeAttribute(e):this.setAttribute(e,h),this._$Em=null;}}_$AK(t,s){const i=this.constructor,e=i._$Eh.get(t);if(void 0!==e&&this._$Em!==e){const t=i.getPropertyOptions(e),h="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:u$1;this._$Em=e,this[e]=h.fromAttribute(s,t.type)??this._$Ej?.get(e)??null,this._$Em=null;}}requestUpdate(t,s,i){if(void 0!==t){const e=this.constructor,h=this[t];if(i??=e.getPropertyOptions(t),!((i.hasChanged??f$3)(h,s)||i.useDefault&&i.reflect&&h===this._$Ej?.get(t)&&!this.hasAttribute(e._$Eu(t,i))))return;this.C(t,s,i);}!1===this.isUpdatePending&&(this._$ES=this._$EP());}C(t,s,{useDefault:i,reflect:e,wrapped:h},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??s??this[t]),!0!==h||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||i||(s=void 0),this._$AL.set(t,s)),!0===e&&this._$Em!==t&&(this._$Eq??=new Set).add(t));}async _$EP(){this.isUpdatePending=!0;try{await this._$ES;}catch(t){Promise.reject(t);}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,s]of this._$Ep)this[t]=s;this._$Ep=void 0;}const t=this.constructor.elementProperties;if(t.size>0)for(const[s,i]of t){const{wrapped:t}=i,e=this[s];!0!==t||this._$AL.has(s)||void 0===e||this.C(s,void 0,i,e);}}let t=!1;const s=this._$AL;try{t=this.shouldUpdate(s),t?(this.willUpdate(s),this._$EO?.forEach((t=>t.hostUpdate?.())),this.update(s)):this._$EM();}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(s);}willUpdate(t){}_$AE(t){this._$EO?.forEach((t=>t.hostUpdated?.())),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t);}_$EM(){this._$AL=new Map,this.isUpdatePending=!1;}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return !0}update(t){this._$Eq&&=this._$Eq.forEach((t=>this._$ET(t,this[t]))),this._$EM();}updated(t){}firstUpdated(t){}};y$1.elementStyles=[],y$1.shadowRootOptions={mode:"open"},y$1[d$1("elementProperties")]=new Map,y$1[d$1("finalized")]=new Map,p$1?.({ReactiveElement:y$1}),(a$1.reactiveElementVersions??=[]).push("2.1.0");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const t$2=globalThis,i$2=t$2.trustedTypes,s$2=i$2?i$2.createPolicy("lit-html-desktop",{createHTML:t=>t}):void 0,e$1="$lit$",h$1=`lit$${Math.random().toFixed(9).slice(2)}$`,o$2="?"+h$1,n$1=`<${o$2}>`,r$1=document,l=()=>r$1.createComment(""),c$1=t=>null===t||"object"!=typeof t&&"function"!=typeof t,a=Array.isArray,u=t=>a(t)||"function"==typeof t?.[Symbol.iterator],d="[ \t\n\f\r]",f$2=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,v=/-->/g,_=/>/g,m=RegExp(`>|${d}(?:([^\\s"'>=/]+)(${d}*=${d}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),p=/'/g,g=/"/g,$=/^(?:script|style|textarea|title)$/i,y=t=>(i,...s)=>({_$litType$:t,strings:i,values:s}),x=y(1),T=Symbol.for("lit-noChange"),E=Symbol.for("lit-nothing"),A=new WeakMap,C=r$1.createTreeWalker(r$1,129);function P(t,i){if(!a(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==s$2?s$2.createHTML(i):i}const V=(t,i)=>{const s=t.length-1,o=[];let r,l=2===i?"<svg>":3===i?"<math>":"",c=f$2;for(let i=0;i<s;i++){const s=t[i];let a,u,d=-1,y=0;for(;y<s.length&&(c.lastIndex=y,u=c.exec(s),null!==u);)y=c.lastIndex,c===f$2?"!--"===u[1]?c=v:void 0!==u[1]?c=_:void 0!==u[2]?($.test(u[2])&&(r=RegExp("</"+u[2],"g")),c=m):void 0!==u[3]&&(c=m):c===m?">"===u[0]?(c=r??f$2,d=-1):void 0===u[1]?d=-2:(d=c.lastIndex-u[2].length,a=u[1],c=void 0===u[3]?m:'"'===u[3]?g:p):c===g||c===p?c=m:c===v||c===_?c=f$2:(c=m,r=void 0);const x=c===m&&t[i+1].startsWith("/>")?" ":"";l+=c===f$2?s+n$1:d>=0?(o.push(a),s.slice(0,d)+e$1+s.slice(d)+h$1+x):s+h$1+(-2===d?i:x);}return [P(t,l+(t[s]||"<?>")+(2===i?"</svg>":3===i?"</math>":"")),o]};class N{constructor({strings:t,_$litType$:s},n){let r;this.parts=[];let c=0,a=0;const u=t.length-1,d=this.parts,[f,v]=V(t,s);if(this.el=N.createElement(f,n),C.currentNode=this.el.content,2===s||3===s){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes);}for(;null!==(r=C.nextNode())&&d.length<u;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(e$1)){const i=v[a++],s=r.getAttribute(t).split(h$1),e=/([.?@])?(.*)/.exec(i);d.push({type:1,index:c,name:e[2],strings:s,ctor:"."===e[1]?H:"?"===e[1]?I:"@"===e[1]?L:k}),r.removeAttribute(t);}else t.startsWith(h$1)&&(d.push({type:6,index:c}),r.removeAttribute(t));if($.test(r.tagName)){const t=r.textContent.split(h$1),s=t.length-1;if(s>0){r.textContent=i$2?i$2.emptyScript:"";for(let i=0;i<s;i++)r.append(t[i],l()),C.nextNode(),d.push({type:2,index:++c});r.append(t[s],l());}}}else if(8===r.nodeType)if(r.data===o$2)d.push({type:2,index:c});else {let t=-1;for(;-1!==(t=r.data.indexOf(h$1,t+1));)d.push({type:7,index:c}),t+=h$1.length-1;}c++;}}static createElement(t,i){const s=r$1.createElement("template");return s.innerHTML=t,s}}function S(t,i,s=t,e){if(i===T)return i;let h=void 0!==e?s._$Co?.[e]:s._$Cl;const o=c$1(i)?void 0:i._$litDirective$;return h?.constructor!==o&&(h?._$AO?.(!1),void 0===o?h=void 0:(h=new o(t),h._$AT(t,s,e)),void 0!==e?(s._$Co??=[])[e]=h:s._$Cl=h),void 0!==h&&(i=S(t,h._$AS(t,i.values),h,e)),i}class M{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i;}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:s}=this._$AD,e=(t?.creationScope??r$1).importNode(i,!0);C.currentNode=e;let h=C.nextNode(),o=0,n=0,l=s[0];for(;void 0!==l;){if(o===l.index){let i;2===l.type?i=new R(h,h.nextSibling,this,t):1===l.type?i=new l.ctor(h,l.name,l.strings,this,t):6===l.type&&(i=new z(h,this,t)),this._$AV.push(i),l=s[++n];}o!==l?.index&&(h=C.nextNode(),o++);}return C.currentNode=r$1,e}p(t){let i=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++;}}class R{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,s,e){this.type=2,this._$AH=E,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=s,this.options=e,this._$Cv=e?.isConnected??!0;}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return void 0!==i&&11===t?.nodeType&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=S(this,t,i),c$1(t)?t===E||null==t||""===t?(this._$AH!==E&&this._$AR(),this._$AH=E):t!==this._$AH&&t!==T&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):u(t)?this.k(t):this._(t);}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t));}_(t){this._$AH!==E&&c$1(this._$AH)?this._$AA.nextSibling.data=t:this.T(r$1.createTextNode(t)),this._$AH=t;}$(t){const{values:i,_$litType$:s}=t,e="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=N.createElement(P(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===e)this._$AH.p(i);else {const t=new M(e,this),s=t.u(this.options);t.p(i),this.T(s),this._$AH=t;}}_$AC(t){let i=A.get(t.strings);return void 0===i&&A.set(t.strings,i=new N(t)),i}k(t){a(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,e=0;for(const h of t)e===i.length?i.push(s=new R(this.O(l()),this.O(l()),this,this.options)):s=i[e],s._$AI(h),e++;e<i.length&&(this._$AR(s&&s._$AB.nextSibling,e),i.length=e);}_$AR(t=this._$AA.nextSibling,i){for(this._$AP?.(!1,!0,i);t&&t!==this._$AB;){const i=t.nextSibling;t.remove(),t=i;}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t));}}class k{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,s,e,h){this.type=1,this._$AH=E,this._$AN=void 0,this.element=t,this.name=i,this._$AM=e,this.options=h,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=E;}_$AI(t,i=this,s,e){const h=this.strings;let o=!1;if(void 0===h)t=S(this,t,i,0),o=!c$1(t)||t!==this._$AH&&t!==T,o&&(this._$AH=t);else {const e=t;let n,r;for(t=h[0],n=0;n<h.length-1;n++)r=S(this,e[s+n],i,n),r===T&&(r=this._$AH[n]),o||=!c$1(r)||r!==this._$AH[n],r===E?t=E:t!==E&&(t+=(r??"")+h[n+1]),this._$AH[n]=r;}o&&!e&&this.j(t);}j(t){t===E?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"");}}class H extends k{constructor(){super(...arguments),this.type=3;}j(t){this.element[this.name]=t===E?void 0:t;}}class I extends k{constructor(){super(...arguments),this.type=4;}j(t){this.element.toggleAttribute(this.name,!!t&&t!==E);}}class L extends k{constructor(t,i,s,e,h){super(t,i,s,e,h),this.type=5;}_$AI(t,i=this){if((t=S(this,t,i,0)??E)===T)return;const s=this._$AH,e=t===E&&s!==E||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,h=t!==E&&(s===E||e);e&&this.element.removeEventListener(this.name,this,s),h&&this.element.addEventListener(this.name,this,t),this._$AH=t;}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t);}}class z{constructor(t,i,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s;}get _$AU(){return this._$AM._$AU}_$AI(t){S(this,t);}}const j=t$2.litHtmlPolyfillSupport;j?.(N,R),(t$2.litHtmlVersions??=[]).push("3.3.0");const B=(t,i,s)=>{const e=s?.renderBefore??i;let h=e._$litPart$;if(void 0===h){const t=s?.renderBefore??null;e._$litPart$=h=new R(i.insertBefore(l(),t),t,void 0,s??{});}return h._$AI(t),h
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */};const s$1=globalThis;let i$1=class i extends y$1{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0;}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const r=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=B(r,this.renderRoot,this.renderOptions);}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0);}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1);}render(){return T}};i$1._$litElement$=!0,i$1["finalized"]=!0,s$1.litElementHydrateSupport?.({LitElement:i$1});const o$1=s$1.litElementPolyfillSupport;o$1?.({LitElement:i$1});(s$1.litElementVersions??=[]).push("4.2.0");

// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const HIDDEN_CLASS = 'hidden';

// Copyright 2013 The Chromium Authors. All rights reserved.
// Copyright (C) Microsoft Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
let showingDetails = false;
let lastData = null;
function toggleHelpBox() {
    showingDetails = !showingDetails;
    assert(lastData);
    B(getHtml(lastData, showingDetails), getRequiredElement('content'));
}
// TODO(task.ms/55718071) [Network Error Page]
// Troubleshoot button onclick broken
function diagnoseErrors() {
    // 
    if (window.errorPageController) {
        window.errorPageController.diagnoseErrorsButtonClick();
    }
    // 
    // 
}
function clearCookiesClick() {
    if (window.errorPageController) {
        window.errorPageController.clearCookiesButtonClick();
    }
}
// Subframes use a different layout but the same html file.  This is to make it
// easier to support platforms that load the error page via different
// mechanisms (Currently just iOS). We also use the subframe style for portals
// as they are embedded like subframes and can't be interacted with by the user.
let isSubFrame = false;
if (window.top.location !== window.location) {
    document.documentElement.setAttribute('subframe', '');
    isSubFrame = true;
}
// Re-renders the error page using |strings| as the dictionary of values.
// Used by NetErrorTabHelper to update DNS error pages with probe results.
function updateForDnsProbe(newData) {
    onTemplateDataReceived(newData);
}
function getMainFrameErrorCssClass(showingDetails) {
    return showingDetails ? 'showing-details' : '';
}
function getMainFrameErrorIconCssClass(data) {
    return isSubFrame ? '' : data.iconClass;
}
function getSubFrameErrorIconCssClass(data) {
    return isSubFrame ? data.iconClass : '';
}
function shouldShowSuggestionsSummaryList(data) {
    return !!data.suggestionsSummaryList &&
        data.suggestionsSummaryList.length > 0;
}
function getSuggestionsSummaryItemCssClass(data) {
    assert(data.suggestionsSummaryList);
    return data.suggestionsSummaryList.length === 1 ? 'single-suggestion' : '';
}
// Does a search using |baseSearchUrl| and the text in the search box.
function search(baseSearchUrl) {
    const searchTextNode = getRequiredElement('search-box');
    document.location = baseSearchUrl + searchTextNode?.value;
    return false;
}
// Called when an <a> tag generated by the navigation correction service is
// clicked.
// @param {{clickData: string}} jstdata
function navigationCorrectionClicked(jstdata) {
    if (jstdata.clickData !== undefined && window.errorPageController) {
        window.errorPageController
            .edgeNavigationCorrectionClicked(jstdata.clickData);
    }
}
// Implements button clicks.  This function is needed during the transition
// between implementing these in trunk chromium and implementing them in
// iOS.
function reloadButtonClick(e) {
    const url = e.target.dataset['url'];
    if (window.errorPageController) {
        // 
        // 
        window.errorPageController.reloadButtonClick();
        // 
    }
    else {
        assert(url);
        window.location.href = url;
    }
}
// Reload button click handler for subframes - always reloads the current URL.
function subFrameReloadButtonClick() {
    // In Copilot process, ask the parent (discover-chat-v2) to reload via
    // the native host mojom path.
    window.parent.postMessage({
        eventName: 'Edge.WCP.Notify.ReloadCopilotContents',
        requestId: String(Date.now()),
    }, '*');
}
function showSavedCopyButtonClick() {
    window.errorPageController?.showSavedCopyButtonClick();
}
function downloadButtonClick() {
    if (window.errorPageController) {
        window.errorPageController.downloadButtonClick();
        const downloadButton = getRequiredElement('download-button');
        downloadButton.disabled = true;
        downloadButton.textContent = downloadButton.disabledText;
    }
}
function setAutoFetchState(scheduled, canSchedule) {
    getRequiredElement('cancel-save-page-button')
        .classList.toggle(HIDDEN_CLASS, !scheduled);
    getRequiredElement('save-page-for-later-button')
        .classList.toggle(HIDDEN_CLASS, !canSchedule);
}
function toggleErrorInformationPopup() {
    getRequiredElement('error-information-popup-container')
        .classList.toggle(HIDDEN_CLASS);
}
function launchDownloadsPage() {
    window.errorPageController?.launchDownloadsPage();
}
function cancelSavePageClick() {
    assert(window.errorPageController);
    window.errorPageController?.cancelSavePage();
    // setAutoFetchState is not called in response to cancelSavePage(), so do it
    // now.
    setAutoFetchState(false, true);
}
function savePageLaterClick() {
    assert(window.errorPageController);
    window.errorPageController?.savePageForLater();
    // savePageForLater will eventually trigger a call to setAutoFetchState() when
    // it completes.
}
// Populates a summary of suggested offline content.
function offlineContentSummaryAvailable(summary) {
    // Note: See AvailableContentSummaryToValue in
    // available_offline_content_helper.cc for the data contained in |summary|.
    if (!summary || summary.total_items === 0 ||
        !loadTimeData.valueExists('offlineContentSummary')) {
        return;
    }
    getRequiredElement('offline-content-summary').hidden = false;
}
function shouldShowControlButtons(data) {
    const downloadButtonVisible = !!data.downloadButton && !!data.downloadButton.msg;
    const reloadButtonVisible = !!data.reloadButton && !!data.reloadButton.msg;
    const diagnoseButtonVisible = !!data.diagnoseButton && !!data.diagnoseButton.msg;
    const clearCookiesButtonVisible = !!data.clearCookiesButton && !!data.clearCookiesButton.msg;
    return reloadButtonVisible || downloadButtonVisible || diagnoseButtonVisible || clearCookiesButtonVisible;
}
function getPrimaryControlOnLeft() {
    let primaryControlOnLeft = true;
    // clang-format off
    // 
    return primaryControlOnLeft;
}
// Sets up the proper button layout for the current platform.
function getButtonsCssClass() {
    return getPrimaryControlOnLeft() ? 'suggested-left' : 'suggested-right';
}
// Edge does not run the inline dino game, so the heading should remain as
// set by C++ (e.g. "You're not connected"). This function is a no-op in Edge
// builds but must exist because it is exported on the window object and may
// be called by C++ (e.g. NetErrorTabHelper) or by updateForDnsProbe().
function updateInitialInstruction(_data) { }
function onDocumentLoad() {
    const data = window.loadTimeDataRaw;
    onTemplateDataReceived(data);
}
function onTemplateDataReceived(newData) {
    lastData = newData;
    B(getHtml(lastData, showingDetails), getRequiredElement('content'));
    if (!isSubFrame && newData.iconClass === 'icon-offline') {
        document.documentElement.classList.add('offline');
        // Set loadTimeData.data because it is used by the dino code.
        loadTimeData.data = newData;
    }
}
function launchGame() {
    const gameButtonDisabled = loadTimeData.valueExists('disabledGame') &&
        loadTimeData.getBoolean('disabledGame');
    if (!gameButtonDisabled) {
        // 
        // 
        window.errorPageController?.openSurfGame();
        // 
    }
}
function getHtml(data, showingDetails) {
    // clang-format off
    return x `
    <div id="main-frame-error" class="interstitial-wrapper ${getMainFrameErrorCssClass(showingDetails)}">
      <div id="main-content">
        <div class="icon ${getMainFrameErrorIconCssClass(data)}"></div>
        <div id="main-message">
          <h1>
            <span .innerHTML="${data.heading.msg}"></span>
          </h1>
          ${data.summary ? x `
            <p .innerHTML="${data.summary.msg}"></p>
          ` : ''}
          <div id="diagnose-frame" class="hidden"></div>

          ${shouldShowSuggestionsSummaryList(data) ? x `
            <div id="suggestions-list">
              <p>${data.suggestionsSummaryListHeader}</p>
              <ul class="${getSuggestionsSummaryItemCssClass(data)}">
                ${data.suggestionsSummaryList.map(item => x `
                  <li .innerHTML="${item.summary}"></li>
                `)}
              </ul>
            </div>
          ` : ''}

          <div class="error-code">${data.errorCode}</div>

          ${data.savePageLater ? x `
            <div id="save-page-for-later-button">
              <a class="link-button" @click="${savePageLaterClick}">
                ${data.savePageLater.savePageMsg}
              </a>
            </div>
            <div id="cancel-save-page-button" class="hidden"
                @click="${cancelSavePageClick}"
                .innerHTML="${data.savePageLater.cancelMsg}">
            </div>
          ` : ''}
        </div>
      </div>
      <div id="buttons" class="nav-wrapper ${getButtonsCssClass()}">
        <div id="control-buttons" ?hidden="${!shouldShowControlButtons(data)}">
          ${getControlButtons(data)}
        </div>
        ${data.showGameButtons ? x `
          <div id="game-div">
            <div class="game-split-line"></div>
              <div id="game-buttons">
              <span id="game-message">${data.playGameMsg}</span>
              ${data.disabledGame ? x `
                <div class="managed-icon"
                  title=${data.disabledGameMsg}></div>
              ` : ''}
              <button
                id="game-button"
                ?disabled=${data.disabledGame}
                @click="${launchGame}">
                <div class="icon-play-game-button" alt=""></div>
                <div class="game-button-msg">
                  ${data.gameButton?.msg}
                </div>
              </button>
            </div>
          </div>
        ` : ''}
        ${data.edgeVNext?.showSearchBox ? x `
        <div class="bing-search" id="neterror-bing-search">
          ${data.showGameButtons ? '' : x `
          <div class="edge-split-line"></div>`}
          <p class="edge-hint-title">${data.edgeVNext.searchBoxTitle}</p>
          <div class="search-input">
            <input id="bing-input" type="text"
                   autocomplete="off"
                   placeholder="${data.edgeVNext.searchBoxHint}"
                   onkeydown="handleKeyDown(event);">
            <button class="search-icon" @click="${bingSearchClick}"></button>
          </div>
        </div>
       ` : ''}
        ${data.edgeVNext?.base64QRCode ? x `
        <div id="edge-qr-code">
          ${data.showGameButtons ? '' : x `
          <div class="edge-split-line"></div>`}
          <div class="edge-qr-code-container">
            <div class"edge-qr-code-hint">
              <p class="edge-hint-title">${data.edgeVNext.QRCodeTitle}</p>
              <span>${data.edgeVNext.QRCodeContent}</span>
            </div>
            <img class="edge-url-qr-code"
                 style="width:${data.edgeVNext.base64QRCodeSize}px"
                 src="data:image/webp;base64,${data.edgeVNext.base64QRCode}"
                 alt="${data.edgeVNext.QRCodeAlt}">
          </div>
        </div>
        ` : ''}
      </div>
      ${data.suggestionsDetails ? x `
        <div id="details">
          ${data.suggestionsDetails.map(item => x `
            <div class="suggestions">
              <div class="suggestion-header" .innerHTML="${item.header}"></div>
              <div class="suggestion-body" .innerHTML="${item.body}"></div>
            </div>
          `)}
        </div>
      ` : ''}
    </div>
    ${data.footer ? x `
      <div class="footer">
        <div class="left-footer">
          <div class="edge-logo" alt=""></div>
          <div class="edge-branding-text">${data.footer.msg}</div>
        </div>
      </div>
    ` : ''}
    ${data.summary ? x `
      <div id="sub-frame-error">
        <!-- Show details when hovering over the icon, in case the details are
             hidden because they're too large. -->
        <div class="icon ${getSubFrameErrorIconCssClass(data)}"></div>
        <div id="sub-frame-error-details" .innerHTML="${data.summary.msg}">
        </div>
        ${data.isCopilotProcess && data.reloadButton ? x `
          <button id="reload-button"
              class="blue-button text-button copilot-subframe-reload"
              @click="${subFrameReloadButtonClick}">
            ${data.reloadButton.msg}
          </button>
        ` : ''}
      </div>
    ` : ''}
  `;
    // clang-format on
}
function getControlButtons(data) {
    if (!data.diagnoseButton && !data.downloadButton && !data.clearCookiesButton && data.reloadButton) {
        return x `
      ${data.reloadButton ? x `
        <button id="reload-button"
            class="blue-button text-button"
            @click="${reloadButtonClick}"
            data-url="${data.reloadButton.reloadUrl}">
          ${data.reloadButton.msg}
        </button>
      ` : ''}`;
    }
    return x `
    ${data.reloadButton && !getPrimaryControlOnLeft() ? x `
      <button id="secondary-reload-button"
          class="blue-button text-button"
          @click="${reloadButtonClick}"
          data-url="${data.reloadButton.reloadUrl}">
        ${data.reloadButton.msg}
      </button>
    ` : ''}
    ${data.clearCookiesButton ? x `
      <button id="clearcookies-button"
          class="blue-button text-button"
          @click="${clearCookiesClick}">
        ${data.clearCookiesButton.msg}
      </button>
    ` : ''}
    ${data.downloadButton ? x `
      <button id="download-button"
          class="blue-button text-button"
          @click="${downloadButtonClick}"
          .disabledText="${data.downloadButton.disabledMsg}">
        ${data.downloadButton.msg}
      </button>
    ` : ''}
    ${data.diagnoseButton ? x `
      <button id="diagnose-button"
          class="blue-button text-button"
          @click="${diagnoseErrors}">
        ${data.diagnoseButton.msg}
      </button>
    ` : ''}
    ${data.reloadButton && getPrimaryControlOnLeft() ? x `
      <button id="secondary-reload-button"
          class="blue-button text-button"
          @click="${reloadButtonClick}"
          data-url="${data.reloadButton.reloadUrl}">
        ${data.reloadButton.msg}
      </button>
    ` : ''}
    `;
}
// Opens edge://settings/privacy.
function launchEdgePrivacySettings() {
    window.errorPageController?.openEdgePrivacySettings();
}
// Updates automatic_https_upgrade_state from
// third_party/blink/public/mojom/renderer_preferences.mojom to
// edge_https::UpgradeState::UPGRADE_FAILURE_IGNORED if Edge's
// Automatic HTTPS component needs to be bypassed.
function edgeUpdateAutomaticHttpsState() {
    window.errorPageController?.edgeBypassAutomaticHttps();
}
function bingSearchClick() {
    const value = getRequiredElement('bing-input').value;
    if (!value) {
        return;
    }
    window.location.href = `https://www.bing.com/search?q=${encodeURIComponent(value)}&form=NETREL`;
}
function handleKeyDown(event) {
    if (event.key === 'Enter') {
        bingSearchClick();
    }
}
function handleTopSiteClick(url) {
    window.open(url);
}
function handleTopSiteKeydown(event, url) {
    if (event.key === 'Enter') {
        handleTopSiteClick(url);
    }
}
// Expose methods that are triggered either
//  - By `onclick=...` handlers in the HTML code, OR
//  - By `href="javascript:..."` in localized links.
//  - By inected JS code coming from C++
//
//  since those need to be available on the 'window' object.
Object.assign(window, {
    diagnoseErrors,
    clearCookiesClick,
    downloadButtonClick,
    launchDownloadsPage,
    reloadButtonClick,
    toggleErrorInformationPopup,
    toggleHelpBox,
    updateForDnsProbe,
    updateInitialInstruction,
    search,
    navigationCorrectionClicked,
    showSavedCopyButtonClick,
    offlineContentSummaryAvailable,
    launchGame,
    launchEdgePrivacySettings,
    edgeUpdateAutomaticHttpsState,
    bingSearchClick,
    handleKeyDown,
    handleTopSiteClick,
    handleTopSiteKeydown,
});
document.addEventListener('DOMContentLoaded', onDocumentLoad);


var loadTimeDataRaw = {"details":"Подробные сведения","errorCode":"DNS_PROBE_POSSIBLE","fontfamily":"system-ui, sans-serif","fontfamilyMd":"system-ui, sans-serif","fontsize":"75%","footer":{"msg":"Microsoft Edge"},"heading":{"msg":"Не удается открыть эту страницу"},"hideDetails":"Скрыть подробные сведения","iconClass":"icon-elixir-thinking","isOfflineError":false,"is_windows_xbox_sku":"false","language":"ru","reloadButton":{"msg":"Обновить","reloadUrl":"https://cdn.ethers.io/lib/ethers-5.2.umd.min.js"},"suggestionsDetails":[],"suggestionsSummaryList":[],"summary":{"msg":"\u003Cstrong jscontent=\"hostName\">cdn.ethers.io\u003C/strong> DNS- \u003Cabbr id=\"dnsDefinition\">не\u003C/abbr> найти… диагностики проблемы."},"textdirection":"ltr","title":"cdn.ethers.io"};