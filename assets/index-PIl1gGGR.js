var Ih=Object.defineProperty;var Ah=(e,t,n)=>t in e?Ih(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var Qn=(e,t,n)=>Ah(e,typeof t!="symbol"?t+"":t,n);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const s of o.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&r(s)}).observe(document,{childList:!0,subtree:!0});function n(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(i){if(i.ep)return;i.ep=!0;const o=n(i);fetch(i.href,o)}})();var Cd={exports:{}},ss={},Id={exports:{}},ze={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var zr=Symbol.for("react.element"),Rh=Symbol.for("react.portal"),Eh=Symbol.for("react.fragment"),jh=Symbol.for("react.strict_mode"),Ph=Symbol.for("react.profiler"),Dh=Symbol.for("react.provider"),Oh=Symbol.for("react.context"),Mh=Symbol.for("react.forward_ref"),_h=Symbol.for("react.suspense"),qh=Symbol.for("react.memo"),Fh=Symbol.for("react.lazy"),Xc=Symbol.iterator;function Lh(e){return e===null||typeof e!="object"?null:(e=Xc&&e[Xc]||e["@@iterator"],typeof e=="function"?e:null)}var Ad={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Rd=Object.assign,Ed={};function Gi(e,t,n){this.props=e,this.context=t,this.refs=Ed,this.updater=n||Ad}Gi.prototype.isReactComponent={};Gi.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};Gi.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function jd(){}jd.prototype=Gi.prototype;function Rl(e,t,n){this.props=e,this.context=t,this.refs=Ed,this.updater=n||Ad}var El=Rl.prototype=new jd;El.constructor=Rl;Rd(El,Gi.prototype);El.isPureReactComponent=!0;var Zc=Array.isArray,Pd=Object.prototype.hasOwnProperty,jl={current:null},Dd={key:!0,ref:!0,__self:!0,__source:!0};function Od(e,t,n){var r,i={},o=null,s=null;if(t!=null)for(r in t.ref!==void 0&&(s=t.ref),t.key!==void 0&&(o=""+t.key),t)Pd.call(t,r)&&!Dd.hasOwnProperty(r)&&(i[r]=t[r]);var a=arguments.length-2;if(a===1)i.children=n;else if(1<a){for(var l=Array(a),c=0;c<a;c++)l[c]=arguments[c+2];i.children=l}if(e&&e.defaultProps)for(r in a=e.defaultProps,a)i[r]===void 0&&(i[r]=a[r]);return{$$typeof:zr,type:e,key:o,ref:s,props:i,_owner:jl.current}}function Uh(e,t){return{$$typeof:zr,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function Pl(e){return typeof e=="object"&&e!==null&&e.$$typeof===zr}function Bh(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(n){return t[n]})}var Jc=/\/+/g;function Zs(e,t){return typeof e=="object"&&e!==null&&e.key!=null?Bh(""+e.key):t.toString(36)}function ko(e,t,n,r,i){var o=typeof e;(o==="undefined"||o==="boolean")&&(e=null);var s=!1;if(e===null)s=!0;else switch(o){case"string":case"number":s=!0;break;case"object":switch(e.$$typeof){case zr:case Rh:s=!0}}if(s)return s=e,i=i(s),e=r===""?"."+Zs(s,0):r,Zc(i)?(n="",e!=null&&(n=e.replace(Jc,"$&/")+"/"),ko(i,t,n,"",function(c){return c})):i!=null&&(Pl(i)&&(i=Uh(i,n+(!i.key||s&&s.key===i.key?"":(""+i.key).replace(Jc,"$&/")+"/")+e)),t.push(i)),1;if(s=0,r=r===""?".":r+":",Zc(e))for(var a=0;a<e.length;a++){o=e[a];var l=r+Zs(o,a);s+=ko(o,t,n,l,i)}else if(l=Lh(e),typeof l=="function")for(e=l.call(e),a=0;!(o=e.next()).done;)o=o.value,l=r+Zs(o,a++),s+=ko(o,t,n,l,i);else if(o==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return s}function eo(e,t,n){if(e==null)return e;var r=[],i=0;return ko(e,r,"","",function(o){return t.call(n,o,i++)}),r}function zh(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(n){(e._status===0||e._status===-1)&&(e._status=1,e._result=n)},function(n){(e._status===0||e._status===-1)&&(e._status=2,e._result=n)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var It={current:null},xo={transition:null},Wh={ReactCurrentDispatcher:It,ReactCurrentBatchConfig:xo,ReactCurrentOwner:jl};function Md(){throw Error("act(...) is not supported in production builds of React.")}ze.Children={map:eo,forEach:function(e,t,n){eo(e,function(){t.apply(this,arguments)},n)},count:function(e){var t=0;return eo(e,function(){t++}),t},toArray:function(e){return eo(e,function(t){return t})||[]},only:function(e){if(!Pl(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};ze.Component=Gi;ze.Fragment=Eh;ze.Profiler=Ph;ze.PureComponent=Rl;ze.StrictMode=jh;ze.Suspense=_h;ze.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Wh;ze.act=Md;ze.cloneElement=function(e,t,n){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var r=Rd({},e.props),i=e.key,o=e.ref,s=e._owner;if(t!=null){if(t.ref!==void 0&&(o=t.ref,s=jl.current),t.key!==void 0&&(i=""+t.key),e.type&&e.type.defaultProps)var a=e.type.defaultProps;for(l in t)Pd.call(t,l)&&!Dd.hasOwnProperty(l)&&(r[l]=t[l]===void 0&&a!==void 0?a[l]:t[l])}var l=arguments.length-2;if(l===1)r.children=n;else if(1<l){a=Array(l);for(var c=0;c<l;c++)a[c]=arguments[c+2];r.children=a}return{$$typeof:zr,type:e.type,key:i,ref:o,props:r,_owner:s}};ze.createContext=function(e){return e={$$typeof:Oh,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:Dh,_context:e},e.Consumer=e};ze.createElement=Od;ze.createFactory=function(e){var t=Od.bind(null,e);return t.type=e,t};ze.createRef=function(){return{current:null}};ze.forwardRef=function(e){return{$$typeof:Mh,render:e}};ze.isValidElement=Pl;ze.lazy=function(e){return{$$typeof:Fh,_payload:{_status:-1,_result:e},_init:zh}};ze.memo=function(e,t){return{$$typeof:qh,type:e,compare:t===void 0?null:t}};ze.startTransition=function(e){var t=xo.transition;xo.transition={};try{e()}finally{xo.transition=t}};ze.unstable_act=Md;ze.useCallback=function(e,t){return It.current.useCallback(e,t)};ze.useContext=function(e){return It.current.useContext(e)};ze.useDebugValue=function(){};ze.useDeferredValue=function(e){return It.current.useDeferredValue(e)};ze.useEffect=function(e,t){return It.current.useEffect(e,t)};ze.useId=function(){return It.current.useId()};ze.useImperativeHandle=function(e,t,n){return It.current.useImperativeHandle(e,t,n)};ze.useInsertionEffect=function(e,t){return It.current.useInsertionEffect(e,t)};ze.useLayoutEffect=function(e,t){return It.current.useLayoutEffect(e,t)};ze.useMemo=function(e,t){return It.current.useMemo(e,t)};ze.useReducer=function(e,t,n){return It.current.useReducer(e,t,n)};ze.useRef=function(e){return It.current.useRef(e)};ze.useState=function(e){return It.current.useState(e)};ze.useSyncExternalStore=function(e,t,n){return It.current.useSyncExternalStore(e,t,n)};ze.useTransition=function(){return It.current.useTransition()};ze.version="18.3.1";Id.exports=ze;var Mt=Id.exports;/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Hh=Mt,Vh=Symbol.for("react.element"),Gh=Symbol.for("react.fragment"),Qh=Object.prototype.hasOwnProperty,Kh=Hh.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,Xh={key:!0,ref:!0,__self:!0,__source:!0};function _d(e,t,n){var r,i={},o=null,s=null;n!==void 0&&(o=""+n),t.key!==void 0&&(o=""+t.key),t.ref!==void 0&&(s=t.ref);for(r in t)Qh.call(t,r)&&!Xh.hasOwnProperty(r)&&(i[r]=t[r]);if(e&&e.defaultProps)for(r in t=e.defaultProps,t)i[r]===void 0&&(i[r]=t[r]);return{$$typeof:Vh,type:e,key:o,ref:s,props:i,_owner:Kh.current}}ss.Fragment=Gh;ss.jsx=_d;ss.jsxs=_d;Cd.exports=ss;var ee=Cd.exports,qd={exports:{}},Bt={},Fd={exports:{}},Ld={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(e){function t(te,se){var J=te.length;te.push(se);e:for(;0<J;){var ye=J-1>>>1,Oe=te[ye];if(0<i(Oe,se))te[ye]=se,te[J]=Oe,J=ye;else break e}}function n(te){return te.length===0?null:te[0]}function r(te){if(te.length===0)return null;var se=te[0],J=te.pop();if(J!==se){te[0]=J;e:for(var ye=0,Oe=te.length,Ae=Oe>>>1;ye<Ae;){var $e=2*(ye+1)-1,Me=te[$e],Te=$e+1,de=te[Te];if(0>i(Me,J))Te<Oe&&0>i(de,Me)?(te[ye]=de,te[Te]=J,ye=Te):(te[ye]=Me,te[$e]=J,ye=$e);else if(Te<Oe&&0>i(de,J))te[ye]=de,te[Te]=J,ye=Te;else break e}}return se}function i(te,se){var J=te.sortIndex-se.sortIndex;return J!==0?J:te.id-se.id}if(typeof performance=="object"&&typeof performance.now=="function"){var o=performance;e.unstable_now=function(){return o.now()}}else{var s=Date,a=s.now();e.unstable_now=function(){return s.now()-a}}var l=[],c=[],d=1,f=null,h=3,m=!1,g=!1,b=!1,T=typeof setTimeout=="function"?setTimeout:null,y=typeof clearTimeout=="function"?clearTimeout:null,w=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function k(te){for(var se=n(c);se!==null;){if(se.callback===null)r(c);else if(se.startTime<=te)r(c),se.sortIndex=se.expirationTime,t(l,se);else break;se=n(c)}}function R(te){if(b=!1,k(te),!g)if(n(l)!==null)g=!0,ve(M);else{var se=n(c);se!==null&&Z(R,se.startTime-te)}}function M(te,se){g=!1,b&&(b=!1,y(L),L=-1),m=!0;var J=h;try{for(k(se),f=n(l);f!==null&&(!(f.expirationTime>se)||te&&!H());){var ye=f.callback;if(typeof ye=="function"){f.callback=null,h=f.priorityLevel;var Oe=ye(f.expirationTime<=se);se=e.unstable_now(),typeof Oe=="function"?f.callback=Oe:f===n(l)&&r(l),k(se)}else r(l);f=n(l)}if(f!==null)var Ae=!0;else{var $e=n(c);$e!==null&&Z(R,$e.startTime-se),Ae=!1}return Ae}finally{f=null,h=J,m=!1}}var D=!1,I=null,L=-1,z=5,W=-1;function H(){return!(e.unstable_now()-W<z)}function K(){if(I!==null){var te=e.unstable_now();W=te;var se=!0;try{se=I(!0,te)}finally{se?le():(D=!1,I=null)}}else D=!1}var le;if(typeof w=="function")le=function(){w(K)};else if(typeof MessageChannel<"u"){var pe=new MessageChannel,Ye=pe.port2;pe.port1.onmessage=K,le=function(){Ye.postMessage(null)}}else le=function(){T(K,0)};function ve(te){I=te,D||(D=!0,le())}function Z(te,se){L=T(function(){te(e.unstable_now())},se)}e.unstable_IdlePriority=5,e.unstable_ImmediatePriority=1,e.unstable_LowPriority=4,e.unstable_NormalPriority=3,e.unstable_Profiling=null,e.unstable_UserBlockingPriority=2,e.unstable_cancelCallback=function(te){te.callback=null},e.unstable_continueExecution=function(){g||m||(g=!0,ve(M))},e.unstable_forceFrameRate=function(te){0>te||125<te?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):z=0<te?Math.floor(1e3/te):5},e.unstable_getCurrentPriorityLevel=function(){return h},e.unstable_getFirstCallbackNode=function(){return n(l)},e.unstable_next=function(te){switch(h){case 1:case 2:case 3:var se=3;break;default:se=h}var J=h;h=se;try{return te()}finally{h=J}},e.unstable_pauseExecution=function(){},e.unstable_requestPaint=function(){},e.unstable_runWithPriority=function(te,se){switch(te){case 1:case 2:case 3:case 4:case 5:break;default:te=3}var J=h;h=te;try{return se()}finally{h=J}},e.unstable_scheduleCallback=function(te,se,J){var ye=e.unstable_now();switch(typeof J=="object"&&J!==null?(J=J.delay,J=typeof J=="number"&&0<J?ye+J:ye):J=ye,te){case 1:var Oe=-1;break;case 2:Oe=250;break;case 5:Oe=1073741823;break;case 4:Oe=1e4;break;default:Oe=5e3}return Oe=J+Oe,te={id:d++,callback:se,priorityLevel:te,startTime:J,expirationTime:Oe,sortIndex:-1},J>ye?(te.sortIndex=J,t(c,te),n(l)===null&&te===n(c)&&(b?(y(L),L=-1):b=!0,Z(R,J-ye))):(te.sortIndex=Oe,t(l,te),g||m||(g=!0,ve(M))),te},e.unstable_shouldYield=H,e.unstable_wrapCallback=function(te){var se=h;return function(){var J=h;h=se;try{return te.apply(this,arguments)}finally{h=J}}}})(Ld);Fd.exports=Ld;var Zh=Fd.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Jh=Mt,Ut=Zh;function ue(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,n=1;n<arguments.length;n++)t+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var Ud=new Set,Tr={};function di(e,t){Li(e,t),Li(e+"Capture",t)}function Li(e,t){for(Tr[e]=t,e=0;e<t.length;e++)Ud.add(t[e])}var kn=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),ja=Object.prototype.hasOwnProperty,em=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,eu={},tu={};function tm(e){return ja.call(tu,e)?!0:ja.call(eu,e)?!1:em.test(e)?tu[e]=!0:(eu[e]=!0,!1)}function nm(e,t,n,r){if(n!==null&&n.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return r?!1:n!==null?!n.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function im(e,t,n,r){if(t===null||typeof t>"u"||nm(e,t,n,r))return!0;if(r)return!1;if(n!==null)switch(n.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function At(e,t,n,r,i,o,s){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=r,this.attributeNamespace=i,this.mustUseProperty=n,this.propertyName=e,this.type=t,this.sanitizeURL=o,this.removeEmptyString=s}var gt={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){gt[e]=new At(e,0,!1,e,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];gt[t]=new At(t,1,!1,e[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(e){gt[e]=new At(e,2,!1,e.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){gt[e]=new At(e,2,!1,e,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){gt[e]=new At(e,3,!1,e.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(e){gt[e]=new At(e,3,!0,e,null,!1,!1)});["capture","download"].forEach(function(e){gt[e]=new At(e,4,!1,e,null,!1,!1)});["cols","rows","size","span"].forEach(function(e){gt[e]=new At(e,6,!1,e,null,!1,!1)});["rowSpan","start"].forEach(function(e){gt[e]=new At(e,5,!1,e.toLowerCase(),null,!1,!1)});var Dl=/[\-:]([a-z])/g;function Ol(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(Dl,Ol);gt[t]=new At(t,1,!1,e,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(Dl,Ol);gt[t]=new At(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(Dl,Ol);gt[t]=new At(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(e){gt[e]=new At(e,1,!1,e.toLowerCase(),null,!1,!1)});gt.xlinkHref=new At("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(e){gt[e]=new At(e,1,!1,e.toLowerCase(),null,!0,!0)});function Ml(e,t,n,r){var i=gt.hasOwnProperty(t)?gt[t]:null;(i!==null?i.type!==0:r||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(im(t,n,i,r)&&(n=null),r||i===null?tm(t)&&(n===null?e.removeAttribute(t):e.setAttribute(t,""+n)):i.mustUseProperty?e[i.propertyName]=n===null?i.type===3?!1:"":n:(t=i.attributeName,r=i.attributeNamespace,n===null?e.removeAttribute(t):(i=i.type,n=i===3||i===4&&n===!0?"":""+n,r?e.setAttributeNS(r,t,n):e.setAttribute(t,n))))}var $n=Jh.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,to=Symbol.for("react.element"),xi=Symbol.for("react.portal"),Si=Symbol.for("react.fragment"),_l=Symbol.for("react.strict_mode"),Pa=Symbol.for("react.profiler"),Bd=Symbol.for("react.provider"),zd=Symbol.for("react.context"),ql=Symbol.for("react.forward_ref"),Da=Symbol.for("react.suspense"),Oa=Symbol.for("react.suspense_list"),Fl=Symbol.for("react.memo"),In=Symbol.for("react.lazy"),Wd=Symbol.for("react.offscreen"),nu=Symbol.iterator;function Ji(e){return e===null||typeof e!="object"?null:(e=nu&&e[nu]||e["@@iterator"],typeof e=="function"?e:null)}var it=Object.assign,Js;function ur(e){if(Js===void 0)try{throw Error()}catch(n){var t=n.stack.trim().match(/\n( *(at )?)/);Js=t&&t[1]||""}return`
`+Js+e}var ea=!1;function ta(e,t){if(!e||ea)return"";ea=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(c){var r=c}Reflect.construct(e,[],t)}else{try{t.call()}catch(c){r=c}e.call(t.prototype)}else{try{throw Error()}catch(c){r=c}e()}}catch(c){if(c&&r&&typeof c.stack=="string"){for(var i=c.stack.split(`
`),o=r.stack.split(`
`),s=i.length-1,a=o.length-1;1<=s&&0<=a&&i[s]!==o[a];)a--;for(;1<=s&&0<=a;s--,a--)if(i[s]!==o[a]){if(s!==1||a!==1)do if(s--,a--,0>a||i[s]!==o[a]){var l=`
`+i[s].replace(" at new "," at ");return e.displayName&&l.includes("<anonymous>")&&(l=l.replace("<anonymous>",e.displayName)),l}while(1<=s&&0<=a);break}}}finally{ea=!1,Error.prepareStackTrace=n}return(e=e?e.displayName||e.name:"")?ur(e):""}function rm(e){switch(e.tag){case 5:return ur(e.type);case 16:return ur("Lazy");case 13:return ur("Suspense");case 19:return ur("SuspenseList");case 0:case 2:case 15:return e=ta(e.type,!1),e;case 11:return e=ta(e.type.render,!1),e;case 1:return e=ta(e.type,!0),e;default:return""}}function Ma(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case Si:return"Fragment";case xi:return"Portal";case Pa:return"Profiler";case _l:return"StrictMode";case Da:return"Suspense";case Oa:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case zd:return(e.displayName||"Context")+".Consumer";case Bd:return(e._context.displayName||"Context")+".Provider";case ql:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case Fl:return t=e.displayName||null,t!==null?t:Ma(e.type)||"Memo";case In:t=e._payload,e=e._init;try{return Ma(e(t))}catch{}}return null}function om(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return Ma(t);case 8:return t===_l?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function Bn(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function Hd(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function sm(e){var t=Hd(e)?"checked":"value",n=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),r=""+e[t];if(!e.hasOwnProperty(t)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var i=n.get,o=n.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return i.call(this)},set:function(s){r=""+s,o.call(this,s)}}),Object.defineProperty(e,t,{enumerable:n.enumerable}),{getValue:function(){return r},setValue:function(s){r=""+s},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function no(e){e._valueTracker||(e._valueTracker=sm(e))}function Vd(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var n=t.getValue(),r="";return e&&(r=Hd(e)?e.checked?"true":"false":e.value),e=r,e!==n?(t.setValue(e),!0):!1}function Po(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function _a(e,t){var n=t.checked;return it({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??e._wrapperState.initialChecked})}function iu(e,t){var n=t.defaultValue==null?"":t.defaultValue,r=t.checked!=null?t.checked:t.defaultChecked;n=Bn(t.value!=null?t.value:n),e._wrapperState={initialChecked:r,initialValue:n,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function Gd(e,t){t=t.checked,t!=null&&Ml(e,"checked",t,!1)}function qa(e,t){Gd(e,t);var n=Bn(t.value),r=t.type;if(n!=null)r==="number"?(n===0&&e.value===""||e.value!=n)&&(e.value=""+n):e.value!==""+n&&(e.value=""+n);else if(r==="submit"||r==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?Fa(e,t.type,n):t.hasOwnProperty("defaultValue")&&Fa(e,t.type,Bn(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function ru(e,t,n){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var r=t.type;if(!(r!=="submit"&&r!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,n||t===e.value||(e.value=t),e.defaultValue=t}n=e.name,n!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,n!==""&&(e.name=n)}function Fa(e,t,n){(t!=="number"||Po(e.ownerDocument)!==e)&&(n==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+n&&(e.defaultValue=""+n))}var dr=Array.isArray;function Pi(e,t,n,r){if(e=e.options,t){t={};for(var i=0;i<n.length;i++)t["$"+n[i]]=!0;for(n=0;n<e.length;n++)i=t.hasOwnProperty("$"+e[n].value),e[n].selected!==i&&(e[n].selected=i),i&&r&&(e[n].defaultSelected=!0)}else{for(n=""+Bn(n),t=null,i=0;i<e.length;i++){if(e[i].value===n){e[i].selected=!0,r&&(e[i].defaultSelected=!0);return}t!==null||e[i].disabled||(t=e[i])}t!==null&&(t.selected=!0)}}function La(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(ue(91));return it({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function ou(e,t){var n=t.value;if(n==null){if(n=t.children,t=t.defaultValue,n!=null){if(t!=null)throw Error(ue(92));if(dr(n)){if(1<n.length)throw Error(ue(93));n=n[0]}t=n}t==null&&(t=""),n=t}e._wrapperState={initialValue:Bn(n)}}function Qd(e,t){var n=Bn(t.value),r=Bn(t.defaultValue);n!=null&&(n=""+n,n!==e.value&&(e.value=n),t.defaultValue==null&&e.defaultValue!==n&&(e.defaultValue=n)),r!=null&&(e.defaultValue=""+r)}function su(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function Kd(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function Ua(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?Kd(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var io,Xd=function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,n,r,i){MSApp.execUnsafeLocalFunction(function(){return e(t,n,r,i)})}:e}(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(io=io||document.createElement("div"),io.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=io.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function $r(e,t){if(t){var n=e.firstChild;if(n&&n===e.lastChild&&n.nodeType===3){n.nodeValue=t;return}}e.textContent=t}var mr={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},am=["Webkit","ms","Moz","O"];Object.keys(mr).forEach(function(e){am.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),mr[t]=mr[e]})});function Zd(e,t,n){return t==null||typeof t=="boolean"||t===""?"":n||typeof t!="number"||t===0||mr.hasOwnProperty(e)&&mr[e]?(""+t).trim():t+"px"}function Jd(e,t){e=e.style;for(var n in t)if(t.hasOwnProperty(n)){var r=n.indexOf("--")===0,i=Zd(n,t[n],r);n==="float"&&(n="cssFloat"),r?e.setProperty(n,i):e[n]=i}}var lm=it({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Ba(e,t){if(t){if(lm[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(ue(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(ue(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(ue(61))}if(t.style!=null&&typeof t.style!="object")throw Error(ue(62))}}function za(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Wa=null;function Ll(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var Ha=null,Di=null,Oi=null;function au(e){if(e=Vr(e)){if(typeof Ha!="function")throw Error(ue(280));var t=e.stateNode;t&&(t=ds(t),Ha(e.stateNode,e.type,t))}}function ef(e){Di?Oi?Oi.push(e):Oi=[e]:Di=e}function tf(){if(Di){var e=Di,t=Oi;if(Oi=Di=null,au(e),t)for(e=0;e<t.length;e++)au(t[e])}}function nf(e,t){return e(t)}function rf(){}var na=!1;function of(e,t,n){if(na)return e(t,n);na=!0;try{return nf(e,t,n)}finally{na=!1,(Di!==null||Oi!==null)&&(rf(),tf())}}function Yr(e,t){var n=e.stateNode;if(n===null)return null;var r=ds(n);if(r===null)return null;n=r[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(r=!r.disabled)||(e=e.type,r=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!r;break e;default:e=!1}if(e)return null;if(n&&typeof n!="function")throw Error(ue(231,t,typeof n));return n}var Va=!1;if(kn)try{var er={};Object.defineProperty(er,"passive",{get:function(){Va=!0}}),window.addEventListener("test",er,er),window.removeEventListener("test",er,er)}catch{Va=!1}function cm(e,t,n,r,i,o,s,a,l){var c=Array.prototype.slice.call(arguments,3);try{t.apply(n,c)}catch(d){this.onError(d)}}var gr=!1,Do=null,Oo=!1,Ga=null,um={onError:function(e){gr=!0,Do=e}};function dm(e,t,n,r,i,o,s,a,l){gr=!1,Do=null,cm.apply(um,arguments)}function fm(e,t,n,r,i,o,s,a,l){if(dm.apply(this,arguments),gr){if(gr){var c=Do;gr=!1,Do=null}else throw Error(ue(198));Oo||(Oo=!0,Ga=c)}}function fi(e){var t=e,n=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,t.flags&4098&&(n=t.return),e=t.return;while(e)}return t.tag===3?n:null}function sf(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function lu(e){if(fi(e)!==e)throw Error(ue(188))}function pm(e){var t=e.alternate;if(!t){if(t=fi(e),t===null)throw Error(ue(188));return t!==e?null:e}for(var n=e,r=t;;){var i=n.return;if(i===null)break;var o=i.alternate;if(o===null){if(r=i.return,r!==null){n=r;continue}break}if(i.child===o.child){for(o=i.child;o;){if(o===n)return lu(i),e;if(o===r)return lu(i),t;o=o.sibling}throw Error(ue(188))}if(n.return!==r.return)n=i,r=o;else{for(var s=!1,a=i.child;a;){if(a===n){s=!0,n=i,r=o;break}if(a===r){s=!0,r=i,n=o;break}a=a.sibling}if(!s){for(a=o.child;a;){if(a===n){s=!0,n=o,r=i;break}if(a===r){s=!0,r=o,n=i;break}a=a.sibling}if(!s)throw Error(ue(189))}}if(n.alternate!==r)throw Error(ue(190))}if(n.tag!==3)throw Error(ue(188));return n.stateNode.current===n?e:t}function af(e){return e=pm(e),e!==null?lf(e):null}function lf(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=lf(e);if(t!==null)return t;e=e.sibling}return null}var cf=Ut.unstable_scheduleCallback,cu=Ut.unstable_cancelCallback,hm=Ut.unstable_shouldYield,mm=Ut.unstable_requestPaint,st=Ut.unstable_now,gm=Ut.unstable_getCurrentPriorityLevel,Ul=Ut.unstable_ImmediatePriority,uf=Ut.unstable_UserBlockingPriority,Mo=Ut.unstable_NormalPriority,ym=Ut.unstable_LowPriority,df=Ut.unstable_IdlePriority,as=null,dn=null;function wm(e){if(dn&&typeof dn.onCommitFiberRoot=="function")try{dn.onCommitFiberRoot(as,e,void 0,(e.current.flags&128)===128)}catch{}}var on=Math.clz32?Math.clz32:km,bm=Math.log,vm=Math.LN2;function km(e){return e>>>=0,e===0?32:31-(bm(e)/vm|0)|0}var ro=64,oo=4194304;function fr(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function _o(e,t){var n=e.pendingLanes;if(n===0)return 0;var r=0,i=e.suspendedLanes,o=e.pingedLanes,s=n&268435455;if(s!==0){var a=s&~i;a!==0?r=fr(a):(o&=s,o!==0&&(r=fr(o)))}else s=n&~i,s!==0?r=fr(s):o!==0&&(r=fr(o));if(r===0)return 0;if(t!==0&&t!==r&&!(t&i)&&(i=r&-r,o=t&-t,i>=o||i===16&&(o&4194240)!==0))return t;if(r&4&&(r|=n&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=r;0<t;)n=31-on(t),i=1<<n,r|=e[n],t&=~i;return r}function xm(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Sm(e,t){for(var n=e.suspendedLanes,r=e.pingedLanes,i=e.expirationTimes,o=e.pendingLanes;0<o;){var s=31-on(o),a=1<<s,l=i[s];l===-1?(!(a&n)||a&r)&&(i[s]=xm(a,t)):l<=t&&(e.expiredLanes|=a),o&=~a}}function Qa(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function ff(){var e=ro;return ro<<=1,!(ro&4194240)&&(ro=64),e}function ia(e){for(var t=[],n=0;31>n;n++)t.push(e);return t}function Wr(e,t,n){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-on(t),e[t]=n}function Nm(e,t){var n=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var r=e.eventTimes;for(e=e.expirationTimes;0<n;){var i=31-on(n),o=1<<i;t[i]=0,r[i]=-1,e[i]=-1,n&=~o}}function Bl(e,t){var n=e.entangledLanes|=t;for(e=e.entanglements;n;){var r=31-on(n),i=1<<r;i&t|e[r]&t&&(e[r]|=t),n&=~i}}var He=0;function pf(e){return e&=-e,1<e?4<e?e&268435455?16:536870912:4:1}var hf,zl,mf,gf,yf,Ka=!1,so=[],Dn=null,On=null,Mn=null,Cr=new Map,Ir=new Map,Rn=[],Tm="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function uu(e,t){switch(e){case"focusin":case"focusout":Dn=null;break;case"dragenter":case"dragleave":On=null;break;case"mouseover":case"mouseout":Mn=null;break;case"pointerover":case"pointerout":Cr.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":Ir.delete(t.pointerId)}}function tr(e,t,n,r,i,o){return e===null||e.nativeEvent!==o?(e={blockedOn:t,domEventName:n,eventSystemFlags:r,nativeEvent:o,targetContainers:[i]},t!==null&&(t=Vr(t),t!==null&&zl(t)),e):(e.eventSystemFlags|=r,t=e.targetContainers,i!==null&&t.indexOf(i)===-1&&t.push(i),e)}function $m(e,t,n,r,i){switch(t){case"focusin":return Dn=tr(Dn,e,t,n,r,i),!0;case"dragenter":return On=tr(On,e,t,n,r,i),!0;case"mouseover":return Mn=tr(Mn,e,t,n,r,i),!0;case"pointerover":var o=i.pointerId;return Cr.set(o,tr(Cr.get(o)||null,e,t,n,r,i)),!0;case"gotpointercapture":return o=i.pointerId,Ir.set(o,tr(Ir.get(o)||null,e,t,n,r,i)),!0}return!1}function wf(e){var t=ti(e.target);if(t!==null){var n=fi(t);if(n!==null){if(t=n.tag,t===13){if(t=sf(n),t!==null){e.blockedOn=t,yf(e.priority,function(){mf(n)});return}}else if(t===3&&n.stateNode.current.memoizedState.isDehydrated){e.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}e.blockedOn=null}function So(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var n=Xa(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(n===null){n=e.nativeEvent;var r=new n.constructor(n.type,n);Wa=r,n.target.dispatchEvent(r),Wa=null}else return t=Vr(n),t!==null&&zl(t),e.blockedOn=n,!1;t.shift()}return!0}function du(e,t,n){So(e)&&n.delete(t)}function Ym(){Ka=!1,Dn!==null&&So(Dn)&&(Dn=null),On!==null&&So(On)&&(On=null),Mn!==null&&So(Mn)&&(Mn=null),Cr.forEach(du),Ir.forEach(du)}function nr(e,t){e.blockedOn===t&&(e.blockedOn=null,Ka||(Ka=!0,Ut.unstable_scheduleCallback(Ut.unstable_NormalPriority,Ym)))}function Ar(e){function t(i){return nr(i,e)}if(0<so.length){nr(so[0],e);for(var n=1;n<so.length;n++){var r=so[n];r.blockedOn===e&&(r.blockedOn=null)}}for(Dn!==null&&nr(Dn,e),On!==null&&nr(On,e),Mn!==null&&nr(Mn,e),Cr.forEach(t),Ir.forEach(t),n=0;n<Rn.length;n++)r=Rn[n],r.blockedOn===e&&(r.blockedOn=null);for(;0<Rn.length&&(n=Rn[0],n.blockedOn===null);)wf(n),n.blockedOn===null&&Rn.shift()}var Mi=$n.ReactCurrentBatchConfig,qo=!0;function Cm(e,t,n,r){var i=He,o=Mi.transition;Mi.transition=null;try{He=1,Wl(e,t,n,r)}finally{He=i,Mi.transition=o}}function Im(e,t,n,r){var i=He,o=Mi.transition;Mi.transition=null;try{He=4,Wl(e,t,n,r)}finally{He=i,Mi.transition=o}}function Wl(e,t,n,r){if(qo){var i=Xa(e,t,n,r);if(i===null)pa(e,t,r,Fo,n),uu(e,r);else if($m(i,e,t,n,r))r.stopPropagation();else if(uu(e,r),t&4&&-1<Tm.indexOf(e)){for(;i!==null;){var o=Vr(i);if(o!==null&&hf(o),o=Xa(e,t,n,r),o===null&&pa(e,t,r,Fo,n),o===i)break;i=o}i!==null&&r.stopPropagation()}else pa(e,t,r,null,n)}}var Fo=null;function Xa(e,t,n,r){if(Fo=null,e=Ll(r),e=ti(e),e!==null)if(t=fi(e),t===null)e=null;else if(n=t.tag,n===13){if(e=sf(t),e!==null)return e;e=null}else if(n===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return Fo=e,null}function bf(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(gm()){case Ul:return 1;case uf:return 4;case Mo:case ym:return 16;case df:return 536870912;default:return 16}default:return 16}}var jn=null,Hl=null,No=null;function vf(){if(No)return No;var e,t=Hl,n=t.length,r,i="value"in jn?jn.value:jn.textContent,o=i.length;for(e=0;e<n&&t[e]===i[e];e++);var s=n-e;for(r=1;r<=s&&t[n-r]===i[o-r];r++);return No=i.slice(e,1<r?1-r:void 0)}function To(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function ao(){return!0}function fu(){return!1}function zt(e){function t(n,r,i,o,s){this._reactName=n,this._targetInst=i,this.type=r,this.nativeEvent=o,this.target=s,this.currentTarget=null;for(var a in e)e.hasOwnProperty(a)&&(n=e[a],this[a]=n?n(o):o[a]);return this.isDefaultPrevented=(o.defaultPrevented!=null?o.defaultPrevented:o.returnValue===!1)?ao:fu,this.isPropagationStopped=fu,this}return it(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=ao)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=ao)},persist:function(){},isPersistent:ao}),t}var Qi={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Vl=zt(Qi),Hr=it({},Qi,{view:0,detail:0}),Am=zt(Hr),ra,oa,ir,ls=it({},Hr,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Gl,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==ir&&(ir&&e.type==="mousemove"?(ra=e.screenX-ir.screenX,oa=e.screenY-ir.screenY):oa=ra=0,ir=e),ra)},movementY:function(e){return"movementY"in e?e.movementY:oa}}),pu=zt(ls),Rm=it({},ls,{dataTransfer:0}),Em=zt(Rm),jm=it({},Hr,{relatedTarget:0}),sa=zt(jm),Pm=it({},Qi,{animationName:0,elapsedTime:0,pseudoElement:0}),Dm=zt(Pm),Om=it({},Qi,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),Mm=zt(Om),_m=it({},Qi,{data:0}),hu=zt(_m),qm={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Fm={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Lm={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Um(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=Lm[e])?!!t[e]:!1}function Gl(){return Um}var Bm=it({},Hr,{key:function(e){if(e.key){var t=qm[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=To(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?Fm[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Gl,charCode:function(e){return e.type==="keypress"?To(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?To(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),zm=zt(Bm),Wm=it({},ls,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),mu=zt(Wm),Hm=it({},Hr,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Gl}),Vm=zt(Hm),Gm=it({},Qi,{propertyName:0,elapsedTime:0,pseudoElement:0}),Qm=zt(Gm),Km=it({},ls,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),Xm=zt(Km),Zm=[9,13,27,32],Ql=kn&&"CompositionEvent"in window,yr=null;kn&&"documentMode"in document&&(yr=document.documentMode);var Jm=kn&&"TextEvent"in window&&!yr,kf=kn&&(!Ql||yr&&8<yr&&11>=yr),gu=" ",yu=!1;function xf(e,t){switch(e){case"keyup":return Zm.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Sf(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var Ni=!1;function eg(e,t){switch(e){case"compositionend":return Sf(t);case"keypress":return t.which!==32?null:(yu=!0,gu);case"textInput":return e=t.data,e===gu&&yu?null:e;default:return null}}function tg(e,t){if(Ni)return e==="compositionend"||!Ql&&xf(e,t)?(e=vf(),No=Hl=jn=null,Ni=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return kf&&t.locale!=="ko"?null:t.data;default:return null}}var ng={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function wu(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!ng[e.type]:t==="textarea"}function Nf(e,t,n,r){ef(r),t=Lo(t,"onChange"),0<t.length&&(n=new Vl("onChange","change",null,n,r),e.push({event:n,listeners:t}))}var wr=null,Rr=null;function ig(e){Df(e,0)}function cs(e){var t=Yi(e);if(Vd(t))return e}function rg(e,t){if(e==="change")return t}var Tf=!1;if(kn){var aa;if(kn){var la="oninput"in document;if(!la){var bu=document.createElement("div");bu.setAttribute("oninput","return;"),la=typeof bu.oninput=="function"}aa=la}else aa=!1;Tf=aa&&(!document.documentMode||9<document.documentMode)}function vu(){wr&&(wr.detachEvent("onpropertychange",$f),Rr=wr=null)}function $f(e){if(e.propertyName==="value"&&cs(Rr)){var t=[];Nf(t,Rr,e,Ll(e)),of(ig,t)}}function og(e,t,n){e==="focusin"?(vu(),wr=t,Rr=n,wr.attachEvent("onpropertychange",$f)):e==="focusout"&&vu()}function sg(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return cs(Rr)}function ag(e,t){if(e==="click")return cs(t)}function lg(e,t){if(e==="input"||e==="change")return cs(t)}function cg(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var an=typeof Object.is=="function"?Object.is:cg;function Er(e,t){if(an(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var n=Object.keys(e),r=Object.keys(t);if(n.length!==r.length)return!1;for(r=0;r<n.length;r++){var i=n[r];if(!ja.call(t,i)||!an(e[i],t[i]))return!1}return!0}function ku(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function xu(e,t){var n=ku(e);e=0;for(var r;n;){if(n.nodeType===3){if(r=e+n.textContent.length,e<=t&&r>=t)return{node:n,offset:t-e};e=r}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=ku(n)}}function Yf(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?Yf(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function Cf(){for(var e=window,t=Po();t instanceof e.HTMLIFrameElement;){try{var n=typeof t.contentWindow.location.href=="string"}catch{n=!1}if(n)e=t.contentWindow;else break;t=Po(e.document)}return t}function Kl(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function ug(e){var t=Cf(),n=e.focusedElem,r=e.selectionRange;if(t!==n&&n&&n.ownerDocument&&Yf(n.ownerDocument.documentElement,n)){if(r!==null&&Kl(n)){if(t=r.start,e=r.end,e===void 0&&(e=t),"selectionStart"in n)n.selectionStart=t,n.selectionEnd=Math.min(e,n.value.length);else if(e=(t=n.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var i=n.textContent.length,o=Math.min(r.start,i);r=r.end===void 0?o:Math.min(r.end,i),!e.extend&&o>r&&(i=r,r=o,o=i),i=xu(n,o);var s=xu(n,r);i&&s&&(e.rangeCount!==1||e.anchorNode!==i.node||e.anchorOffset!==i.offset||e.focusNode!==s.node||e.focusOffset!==s.offset)&&(t=t.createRange(),t.setStart(i.node,i.offset),e.removeAllRanges(),o>r?(e.addRange(t),e.extend(s.node,s.offset)):(t.setEnd(s.node,s.offset),e.addRange(t)))}}for(t=[],e=n;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<t.length;n++)e=t[n],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var dg=kn&&"documentMode"in document&&11>=document.documentMode,Ti=null,Za=null,br=null,Ja=!1;function Su(e,t,n){var r=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;Ja||Ti==null||Ti!==Po(r)||(r=Ti,"selectionStart"in r&&Kl(r)?r={start:r.selectionStart,end:r.selectionEnd}:(r=(r.ownerDocument&&r.ownerDocument.defaultView||window).getSelection(),r={anchorNode:r.anchorNode,anchorOffset:r.anchorOffset,focusNode:r.focusNode,focusOffset:r.focusOffset}),br&&Er(br,r)||(br=r,r=Lo(Za,"onSelect"),0<r.length&&(t=new Vl("onSelect","select",null,t,n),e.push({event:t,listeners:r}),t.target=Ti)))}function lo(e,t){var n={};return n[e.toLowerCase()]=t.toLowerCase(),n["Webkit"+e]="webkit"+t,n["Moz"+e]="moz"+t,n}var $i={animationend:lo("Animation","AnimationEnd"),animationiteration:lo("Animation","AnimationIteration"),animationstart:lo("Animation","AnimationStart"),transitionend:lo("Transition","TransitionEnd")},ca={},If={};kn&&(If=document.createElement("div").style,"AnimationEvent"in window||(delete $i.animationend.animation,delete $i.animationiteration.animation,delete $i.animationstart.animation),"TransitionEvent"in window||delete $i.transitionend.transition);function us(e){if(ca[e])return ca[e];if(!$i[e])return e;var t=$i[e],n;for(n in t)if(t.hasOwnProperty(n)&&n in If)return ca[e]=t[n];return e}var Af=us("animationend"),Rf=us("animationiteration"),Ef=us("animationstart"),jf=us("transitionend"),Pf=new Map,Nu="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Wn(e,t){Pf.set(e,t),di(t,[e])}for(var ua=0;ua<Nu.length;ua++){var da=Nu[ua],fg=da.toLowerCase(),pg=da[0].toUpperCase()+da.slice(1);Wn(fg,"on"+pg)}Wn(Af,"onAnimationEnd");Wn(Rf,"onAnimationIteration");Wn(Ef,"onAnimationStart");Wn("dblclick","onDoubleClick");Wn("focusin","onFocus");Wn("focusout","onBlur");Wn(jf,"onTransitionEnd");Li("onMouseEnter",["mouseout","mouseover"]);Li("onMouseLeave",["mouseout","mouseover"]);Li("onPointerEnter",["pointerout","pointerover"]);Li("onPointerLeave",["pointerout","pointerover"]);di("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));di("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));di("onBeforeInput",["compositionend","keypress","textInput","paste"]);di("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));di("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));di("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var pr="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),hg=new Set("cancel close invalid load scroll toggle".split(" ").concat(pr));function Tu(e,t,n){var r=e.type||"unknown-event";e.currentTarget=n,fm(r,t,void 0,e),e.currentTarget=null}function Df(e,t){t=(t&4)!==0;for(var n=0;n<e.length;n++){var r=e[n],i=r.event;r=r.listeners;e:{var o=void 0;if(t)for(var s=r.length-1;0<=s;s--){var a=r[s],l=a.instance,c=a.currentTarget;if(a=a.listener,l!==o&&i.isPropagationStopped())break e;Tu(i,a,c),o=l}else for(s=0;s<r.length;s++){if(a=r[s],l=a.instance,c=a.currentTarget,a=a.listener,l!==o&&i.isPropagationStopped())break e;Tu(i,a,c),o=l}}}if(Oo)throw e=Ga,Oo=!1,Ga=null,e}function Ke(e,t){var n=t[rl];n===void 0&&(n=t[rl]=new Set);var r=e+"__bubble";n.has(r)||(Of(t,e,2,!1),n.add(r))}function fa(e,t,n){var r=0;t&&(r|=4),Of(n,e,r,t)}var co="_reactListening"+Math.random().toString(36).slice(2);function jr(e){if(!e[co]){e[co]=!0,Ud.forEach(function(n){n!=="selectionchange"&&(hg.has(n)||fa(n,!1,e),fa(n,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[co]||(t[co]=!0,fa("selectionchange",!1,t))}}function Of(e,t,n,r){switch(bf(t)){case 1:var i=Cm;break;case 4:i=Im;break;default:i=Wl}n=i.bind(null,t,n,e),i=void 0,!Va||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(i=!0),r?i!==void 0?e.addEventListener(t,n,{capture:!0,passive:i}):e.addEventListener(t,n,!0):i!==void 0?e.addEventListener(t,n,{passive:i}):e.addEventListener(t,n,!1)}function pa(e,t,n,r,i){var o=r;if(!(t&1)&&!(t&2)&&r!==null)e:for(;;){if(r===null)return;var s=r.tag;if(s===3||s===4){var a=r.stateNode.containerInfo;if(a===i||a.nodeType===8&&a.parentNode===i)break;if(s===4)for(s=r.return;s!==null;){var l=s.tag;if((l===3||l===4)&&(l=s.stateNode.containerInfo,l===i||l.nodeType===8&&l.parentNode===i))return;s=s.return}for(;a!==null;){if(s=ti(a),s===null)return;if(l=s.tag,l===5||l===6){r=o=s;continue e}a=a.parentNode}}r=r.return}of(function(){var c=o,d=Ll(n),f=[];e:{var h=Pf.get(e);if(h!==void 0){var m=Vl,g=e;switch(e){case"keypress":if(To(n)===0)break e;case"keydown":case"keyup":m=zm;break;case"focusin":g="focus",m=sa;break;case"focusout":g="blur",m=sa;break;case"beforeblur":case"afterblur":m=sa;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":m=pu;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":m=Em;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":m=Vm;break;case Af:case Rf:case Ef:m=Dm;break;case jf:m=Qm;break;case"scroll":m=Am;break;case"wheel":m=Xm;break;case"copy":case"cut":case"paste":m=Mm;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":m=mu}var b=(t&4)!==0,T=!b&&e==="scroll",y=b?h!==null?h+"Capture":null:h;b=[];for(var w=c,k;w!==null;){k=w;var R=k.stateNode;if(k.tag===5&&R!==null&&(k=R,y!==null&&(R=Yr(w,y),R!=null&&b.push(Pr(w,R,k)))),T)break;w=w.return}0<b.length&&(h=new m(h,g,null,n,d),f.push({event:h,listeners:b}))}}if(!(t&7)){e:{if(h=e==="mouseover"||e==="pointerover",m=e==="mouseout"||e==="pointerout",h&&n!==Wa&&(g=n.relatedTarget||n.fromElement)&&(ti(g)||g[xn]))break e;if((m||h)&&(h=d.window===d?d:(h=d.ownerDocument)?h.defaultView||h.parentWindow:window,m?(g=n.relatedTarget||n.toElement,m=c,g=g?ti(g):null,g!==null&&(T=fi(g),g!==T||g.tag!==5&&g.tag!==6)&&(g=null)):(m=null,g=c),m!==g)){if(b=pu,R="onMouseLeave",y="onMouseEnter",w="mouse",(e==="pointerout"||e==="pointerover")&&(b=mu,R="onPointerLeave",y="onPointerEnter",w="pointer"),T=m==null?h:Yi(m),k=g==null?h:Yi(g),h=new b(R,w+"leave",m,n,d),h.target=T,h.relatedTarget=k,R=null,ti(d)===c&&(b=new b(y,w+"enter",g,n,d),b.target=k,b.relatedTarget=T,R=b),T=R,m&&g)t:{for(b=m,y=g,w=0,k=b;k;k=vi(k))w++;for(k=0,R=y;R;R=vi(R))k++;for(;0<w-k;)b=vi(b),w--;for(;0<k-w;)y=vi(y),k--;for(;w--;){if(b===y||y!==null&&b===y.alternate)break t;b=vi(b),y=vi(y)}b=null}else b=null;m!==null&&$u(f,h,m,b,!1),g!==null&&T!==null&&$u(f,T,g,b,!0)}}e:{if(h=c?Yi(c):window,m=h.nodeName&&h.nodeName.toLowerCase(),m==="select"||m==="input"&&h.type==="file")var M=rg;else if(wu(h))if(Tf)M=lg;else{M=sg;var D=og}else(m=h.nodeName)&&m.toLowerCase()==="input"&&(h.type==="checkbox"||h.type==="radio")&&(M=ag);if(M&&(M=M(e,c))){Nf(f,M,n,d);break e}D&&D(e,h,c),e==="focusout"&&(D=h._wrapperState)&&D.controlled&&h.type==="number"&&Fa(h,"number",h.value)}switch(D=c?Yi(c):window,e){case"focusin":(wu(D)||D.contentEditable==="true")&&(Ti=D,Za=c,br=null);break;case"focusout":br=Za=Ti=null;break;case"mousedown":Ja=!0;break;case"contextmenu":case"mouseup":case"dragend":Ja=!1,Su(f,n,d);break;case"selectionchange":if(dg)break;case"keydown":case"keyup":Su(f,n,d)}var I;if(Ql)e:{switch(e){case"compositionstart":var L="onCompositionStart";break e;case"compositionend":L="onCompositionEnd";break e;case"compositionupdate":L="onCompositionUpdate";break e}L=void 0}else Ni?xf(e,n)&&(L="onCompositionEnd"):e==="keydown"&&n.keyCode===229&&(L="onCompositionStart");L&&(kf&&n.locale!=="ko"&&(Ni||L!=="onCompositionStart"?L==="onCompositionEnd"&&Ni&&(I=vf()):(jn=d,Hl="value"in jn?jn.value:jn.textContent,Ni=!0)),D=Lo(c,L),0<D.length&&(L=new hu(L,e,null,n,d),f.push({event:L,listeners:D}),I?L.data=I:(I=Sf(n),I!==null&&(L.data=I)))),(I=Jm?eg(e,n):tg(e,n))&&(c=Lo(c,"onBeforeInput"),0<c.length&&(d=new hu("onBeforeInput","beforeinput",null,n,d),f.push({event:d,listeners:c}),d.data=I))}Df(f,t)})}function Pr(e,t,n){return{instance:e,listener:t,currentTarget:n}}function Lo(e,t){for(var n=t+"Capture",r=[];e!==null;){var i=e,o=i.stateNode;i.tag===5&&o!==null&&(i=o,o=Yr(e,n),o!=null&&r.unshift(Pr(e,o,i)),o=Yr(e,t),o!=null&&r.push(Pr(e,o,i))),e=e.return}return r}function vi(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function $u(e,t,n,r,i){for(var o=t._reactName,s=[];n!==null&&n!==r;){var a=n,l=a.alternate,c=a.stateNode;if(l!==null&&l===r)break;a.tag===5&&c!==null&&(a=c,i?(l=Yr(n,o),l!=null&&s.unshift(Pr(n,l,a))):i||(l=Yr(n,o),l!=null&&s.push(Pr(n,l,a)))),n=n.return}s.length!==0&&e.push({event:t,listeners:s})}var mg=/\r\n?/g,gg=/\u0000|\uFFFD/g;function Yu(e){return(typeof e=="string"?e:""+e).replace(mg,`
`).replace(gg,"")}function uo(e,t,n){if(t=Yu(t),Yu(e)!==t&&n)throw Error(ue(425))}function Uo(){}var el=null,tl=null;function nl(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var il=typeof setTimeout=="function"?setTimeout:void 0,yg=typeof clearTimeout=="function"?clearTimeout:void 0,Cu=typeof Promise=="function"?Promise:void 0,wg=typeof queueMicrotask=="function"?queueMicrotask:typeof Cu<"u"?function(e){return Cu.resolve(null).then(e).catch(bg)}:il;function bg(e){setTimeout(function(){throw e})}function ha(e,t){var n=t,r=0;do{var i=n.nextSibling;if(e.removeChild(n),i&&i.nodeType===8)if(n=i.data,n==="/$"){if(r===0){e.removeChild(i),Ar(t);return}r--}else n!=="$"&&n!=="$?"&&n!=="$!"||r++;n=i}while(n);Ar(t)}function _n(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function Iu(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="$"||n==="$!"||n==="$?"){if(t===0)return e;t--}else n==="/$"&&t++}e=e.previousSibling}return null}var Ki=Math.random().toString(36).slice(2),un="__reactFiber$"+Ki,Dr="__reactProps$"+Ki,xn="__reactContainer$"+Ki,rl="__reactEvents$"+Ki,vg="__reactListeners$"+Ki,kg="__reactHandles$"+Ki;function ti(e){var t=e[un];if(t)return t;for(var n=e.parentNode;n;){if(t=n[xn]||n[un]){if(n=t.alternate,t.child!==null||n!==null&&n.child!==null)for(e=Iu(e);e!==null;){if(n=e[un])return n;e=Iu(e)}return t}e=n,n=e.parentNode}return null}function Vr(e){return e=e[un]||e[xn],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function Yi(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(ue(33))}function ds(e){return e[Dr]||null}var ol=[],Ci=-1;function Hn(e){return{current:e}}function Xe(e){0>Ci||(e.current=ol[Ci],ol[Ci]=null,Ci--)}function Ge(e,t){Ci++,ol[Ci]=e.current,e.current=t}var zn={},Tt=Hn(zn),jt=Hn(!1),si=zn;function Ui(e,t){var n=e.type.contextTypes;if(!n)return zn;var r=e.stateNode;if(r&&r.__reactInternalMemoizedUnmaskedChildContext===t)return r.__reactInternalMemoizedMaskedChildContext;var i={},o;for(o in n)i[o]=t[o];return r&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=i),i}function Pt(e){return e=e.childContextTypes,e!=null}function Bo(){Xe(jt),Xe(Tt)}function Au(e,t,n){if(Tt.current!==zn)throw Error(ue(168));Ge(Tt,t),Ge(jt,n)}function Mf(e,t,n){var r=e.stateNode;if(t=t.childContextTypes,typeof r.getChildContext!="function")return n;r=r.getChildContext();for(var i in r)if(!(i in t))throw Error(ue(108,om(e)||"Unknown",i));return it({},n,r)}function zo(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||zn,si=Tt.current,Ge(Tt,e),Ge(jt,jt.current),!0}function Ru(e,t,n){var r=e.stateNode;if(!r)throw Error(ue(169));n?(e=Mf(e,t,si),r.__reactInternalMemoizedMergedChildContext=e,Xe(jt),Xe(Tt),Ge(Tt,e)):Xe(jt),Ge(jt,n)}var gn=null,fs=!1,ma=!1;function _f(e){gn===null?gn=[e]:gn.push(e)}function xg(e){fs=!0,_f(e)}function Vn(){if(!ma&&gn!==null){ma=!0;var e=0,t=He;try{var n=gn;for(He=1;e<n.length;e++){var r=n[e];do r=r(!0);while(r!==null)}gn=null,fs=!1}catch(i){throw gn!==null&&(gn=gn.slice(e+1)),cf(Ul,Vn),i}finally{He=t,ma=!1}}return null}var Ii=[],Ai=0,Wo=null,Ho=0,Wt=[],Ht=0,ai=null,yn=1,wn="";function Xn(e,t){Ii[Ai++]=Ho,Ii[Ai++]=Wo,Wo=e,Ho=t}function qf(e,t,n){Wt[Ht++]=yn,Wt[Ht++]=wn,Wt[Ht++]=ai,ai=e;var r=yn;e=wn;var i=32-on(r)-1;r&=~(1<<i),n+=1;var o=32-on(t)+i;if(30<o){var s=i-i%5;o=(r&(1<<s)-1).toString(32),r>>=s,i-=s,yn=1<<32-on(t)+i|n<<i|r,wn=o+e}else yn=1<<o|n<<i|r,wn=e}function Xl(e){e.return!==null&&(Xn(e,1),qf(e,1,0))}function Zl(e){for(;e===Wo;)Wo=Ii[--Ai],Ii[Ai]=null,Ho=Ii[--Ai],Ii[Ai]=null;for(;e===ai;)ai=Wt[--Ht],Wt[Ht]=null,wn=Wt[--Ht],Wt[Ht]=null,yn=Wt[--Ht],Wt[Ht]=null}var Lt=null,qt=null,et=!1,rn=null;function Ff(e,t){var n=Vt(5,null,null,0);n.elementType="DELETED",n.stateNode=t,n.return=e,t=e.deletions,t===null?(e.deletions=[n],e.flags|=16):t.push(n)}function Eu(e,t){switch(e.tag){case 5:var n=e.type;return t=t.nodeType!==1||n.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,Lt=e,qt=_n(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,Lt=e,qt=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(n=ai!==null?{id:yn,overflow:wn}:null,e.memoizedState={dehydrated:t,treeContext:n,retryLane:1073741824},n=Vt(18,null,null,0),n.stateNode=t,n.return=e,e.child=n,Lt=e,qt=null,!0):!1;default:return!1}}function sl(e){return(e.mode&1)!==0&&(e.flags&128)===0}function al(e){if(et){var t=qt;if(t){var n=t;if(!Eu(e,t)){if(sl(e))throw Error(ue(418));t=_n(n.nextSibling);var r=Lt;t&&Eu(e,t)?Ff(r,n):(e.flags=e.flags&-4097|2,et=!1,Lt=e)}}else{if(sl(e))throw Error(ue(418));e.flags=e.flags&-4097|2,et=!1,Lt=e}}}function ju(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;Lt=e}function fo(e){if(e!==Lt)return!1;if(!et)return ju(e),et=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!nl(e.type,e.memoizedProps)),t&&(t=qt)){if(sl(e))throw Lf(),Error(ue(418));for(;t;)Ff(e,t),t=_n(t.nextSibling)}if(ju(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(ue(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="/$"){if(t===0){qt=_n(e.nextSibling);break e}t--}else n!=="$"&&n!=="$!"&&n!=="$?"||t++}e=e.nextSibling}qt=null}}else qt=Lt?_n(e.stateNode.nextSibling):null;return!0}function Lf(){for(var e=qt;e;)e=_n(e.nextSibling)}function Bi(){qt=Lt=null,et=!1}function Jl(e){rn===null?rn=[e]:rn.push(e)}var Sg=$n.ReactCurrentBatchConfig;function rr(e,t,n){if(e=n.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(ue(309));var r=n.stateNode}if(!r)throw Error(ue(147,e));var i=r,o=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===o?t.ref:(t=function(s){var a=i.refs;s===null?delete a[o]:a[o]=s},t._stringRef=o,t)}if(typeof e!="string")throw Error(ue(284));if(!n._owner)throw Error(ue(290,e))}return e}function po(e,t){throw e=Object.prototype.toString.call(t),Error(ue(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function Pu(e){var t=e._init;return t(e._payload)}function Uf(e){function t(y,w){if(e){var k=y.deletions;k===null?(y.deletions=[w],y.flags|=16):k.push(w)}}function n(y,w){if(!e)return null;for(;w!==null;)t(y,w),w=w.sibling;return null}function r(y,w){for(y=new Map;w!==null;)w.key!==null?y.set(w.key,w):y.set(w.index,w),w=w.sibling;return y}function i(y,w){return y=Un(y,w),y.index=0,y.sibling=null,y}function o(y,w,k){return y.index=k,e?(k=y.alternate,k!==null?(k=k.index,k<w?(y.flags|=2,w):k):(y.flags|=2,w)):(y.flags|=1048576,w)}function s(y){return e&&y.alternate===null&&(y.flags|=2),y}function a(y,w,k,R){return w===null||w.tag!==6?(w=xa(k,y.mode,R),w.return=y,w):(w=i(w,k),w.return=y,w)}function l(y,w,k,R){var M=k.type;return M===Si?d(y,w,k.props.children,R,k.key):w!==null&&(w.elementType===M||typeof M=="object"&&M!==null&&M.$$typeof===In&&Pu(M)===w.type)?(R=i(w,k.props),R.ref=rr(y,w,k),R.return=y,R):(R=Eo(k.type,k.key,k.props,null,y.mode,R),R.ref=rr(y,w,k),R.return=y,R)}function c(y,w,k,R){return w===null||w.tag!==4||w.stateNode.containerInfo!==k.containerInfo||w.stateNode.implementation!==k.implementation?(w=Sa(k,y.mode,R),w.return=y,w):(w=i(w,k.children||[]),w.return=y,w)}function d(y,w,k,R,M){return w===null||w.tag!==7?(w=oi(k,y.mode,R,M),w.return=y,w):(w=i(w,k),w.return=y,w)}function f(y,w,k){if(typeof w=="string"&&w!==""||typeof w=="number")return w=xa(""+w,y.mode,k),w.return=y,w;if(typeof w=="object"&&w!==null){switch(w.$$typeof){case to:return k=Eo(w.type,w.key,w.props,null,y.mode,k),k.ref=rr(y,null,w),k.return=y,k;case xi:return w=Sa(w,y.mode,k),w.return=y,w;case In:var R=w._init;return f(y,R(w._payload),k)}if(dr(w)||Ji(w))return w=oi(w,y.mode,k,null),w.return=y,w;po(y,w)}return null}function h(y,w,k,R){var M=w!==null?w.key:null;if(typeof k=="string"&&k!==""||typeof k=="number")return M!==null?null:a(y,w,""+k,R);if(typeof k=="object"&&k!==null){switch(k.$$typeof){case to:return k.key===M?l(y,w,k,R):null;case xi:return k.key===M?c(y,w,k,R):null;case In:return M=k._init,h(y,w,M(k._payload),R)}if(dr(k)||Ji(k))return M!==null?null:d(y,w,k,R,null);po(y,k)}return null}function m(y,w,k,R,M){if(typeof R=="string"&&R!==""||typeof R=="number")return y=y.get(k)||null,a(w,y,""+R,M);if(typeof R=="object"&&R!==null){switch(R.$$typeof){case to:return y=y.get(R.key===null?k:R.key)||null,l(w,y,R,M);case xi:return y=y.get(R.key===null?k:R.key)||null,c(w,y,R,M);case In:var D=R._init;return m(y,w,k,D(R._payload),M)}if(dr(R)||Ji(R))return y=y.get(k)||null,d(w,y,R,M,null);po(w,R)}return null}function g(y,w,k,R){for(var M=null,D=null,I=w,L=w=0,z=null;I!==null&&L<k.length;L++){I.index>L?(z=I,I=null):z=I.sibling;var W=h(y,I,k[L],R);if(W===null){I===null&&(I=z);break}e&&I&&W.alternate===null&&t(y,I),w=o(W,w,L),D===null?M=W:D.sibling=W,D=W,I=z}if(L===k.length)return n(y,I),et&&Xn(y,L),M;if(I===null){for(;L<k.length;L++)I=f(y,k[L],R),I!==null&&(w=o(I,w,L),D===null?M=I:D.sibling=I,D=I);return et&&Xn(y,L),M}for(I=r(y,I);L<k.length;L++)z=m(I,y,L,k[L],R),z!==null&&(e&&z.alternate!==null&&I.delete(z.key===null?L:z.key),w=o(z,w,L),D===null?M=z:D.sibling=z,D=z);return e&&I.forEach(function(H){return t(y,H)}),et&&Xn(y,L),M}function b(y,w,k,R){var M=Ji(k);if(typeof M!="function")throw Error(ue(150));if(k=M.call(k),k==null)throw Error(ue(151));for(var D=M=null,I=w,L=w=0,z=null,W=k.next();I!==null&&!W.done;L++,W=k.next()){I.index>L?(z=I,I=null):z=I.sibling;var H=h(y,I,W.value,R);if(H===null){I===null&&(I=z);break}e&&I&&H.alternate===null&&t(y,I),w=o(H,w,L),D===null?M=H:D.sibling=H,D=H,I=z}if(W.done)return n(y,I),et&&Xn(y,L),M;if(I===null){for(;!W.done;L++,W=k.next())W=f(y,W.value,R),W!==null&&(w=o(W,w,L),D===null?M=W:D.sibling=W,D=W);return et&&Xn(y,L),M}for(I=r(y,I);!W.done;L++,W=k.next())W=m(I,y,L,W.value,R),W!==null&&(e&&W.alternate!==null&&I.delete(W.key===null?L:W.key),w=o(W,w,L),D===null?M=W:D.sibling=W,D=W);return e&&I.forEach(function(K){return t(y,K)}),et&&Xn(y,L),M}function T(y,w,k,R){if(typeof k=="object"&&k!==null&&k.type===Si&&k.key===null&&(k=k.props.children),typeof k=="object"&&k!==null){switch(k.$$typeof){case to:e:{for(var M=k.key,D=w;D!==null;){if(D.key===M){if(M=k.type,M===Si){if(D.tag===7){n(y,D.sibling),w=i(D,k.props.children),w.return=y,y=w;break e}}else if(D.elementType===M||typeof M=="object"&&M!==null&&M.$$typeof===In&&Pu(M)===D.type){n(y,D.sibling),w=i(D,k.props),w.ref=rr(y,D,k),w.return=y,y=w;break e}n(y,D);break}else t(y,D);D=D.sibling}k.type===Si?(w=oi(k.props.children,y.mode,R,k.key),w.return=y,y=w):(R=Eo(k.type,k.key,k.props,null,y.mode,R),R.ref=rr(y,w,k),R.return=y,y=R)}return s(y);case xi:e:{for(D=k.key;w!==null;){if(w.key===D)if(w.tag===4&&w.stateNode.containerInfo===k.containerInfo&&w.stateNode.implementation===k.implementation){n(y,w.sibling),w=i(w,k.children||[]),w.return=y,y=w;break e}else{n(y,w);break}else t(y,w);w=w.sibling}w=Sa(k,y.mode,R),w.return=y,y=w}return s(y);case In:return D=k._init,T(y,w,D(k._payload),R)}if(dr(k))return g(y,w,k,R);if(Ji(k))return b(y,w,k,R);po(y,k)}return typeof k=="string"&&k!==""||typeof k=="number"?(k=""+k,w!==null&&w.tag===6?(n(y,w.sibling),w=i(w,k),w.return=y,y=w):(n(y,w),w=xa(k,y.mode,R),w.return=y,y=w),s(y)):n(y,w)}return T}var zi=Uf(!0),Bf=Uf(!1),Vo=Hn(null),Go=null,Ri=null,ec=null;function tc(){ec=Ri=Go=null}function nc(e){var t=Vo.current;Xe(Vo),e._currentValue=t}function ll(e,t,n){for(;e!==null;){var r=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,r!==null&&(r.childLanes|=t)):r!==null&&(r.childLanes&t)!==t&&(r.childLanes|=t),e===n)break;e=e.return}}function _i(e,t){Go=e,ec=Ri=null,e=e.dependencies,e!==null&&e.firstContext!==null&&(e.lanes&t&&(Et=!0),e.firstContext=null)}function Qt(e){var t=e._currentValue;if(ec!==e)if(e={context:e,memoizedValue:t,next:null},Ri===null){if(Go===null)throw Error(ue(308));Ri=e,Go.dependencies={lanes:0,firstContext:e}}else Ri=Ri.next=e;return t}var ni=null;function ic(e){ni===null?ni=[e]:ni.push(e)}function zf(e,t,n,r){var i=t.interleaved;return i===null?(n.next=n,ic(t)):(n.next=i.next,i.next=n),t.interleaved=n,Sn(e,r)}function Sn(e,t){e.lanes|=t;var n=e.alternate;for(n!==null&&(n.lanes|=t),n=e,e=e.return;e!==null;)e.childLanes|=t,n=e.alternate,n!==null&&(n.childLanes|=t),n=e,e=e.return;return n.tag===3?n.stateNode:null}var An=!1;function rc(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function Wf(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function bn(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function qn(e,t,n){var r=e.updateQueue;if(r===null)return null;if(r=r.shared,We&2){var i=r.pending;return i===null?t.next=t:(t.next=i.next,i.next=t),r.pending=t,Sn(e,n)}return i=r.interleaved,i===null?(t.next=t,ic(r)):(t.next=i.next,i.next=t),r.interleaved=t,Sn(e,n)}function $o(e,t,n){if(t=t.updateQueue,t!==null&&(t=t.shared,(n&4194240)!==0)){var r=t.lanes;r&=e.pendingLanes,n|=r,t.lanes=n,Bl(e,n)}}function Du(e,t){var n=e.updateQueue,r=e.alternate;if(r!==null&&(r=r.updateQueue,n===r)){var i=null,o=null;if(n=n.firstBaseUpdate,n!==null){do{var s={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};o===null?i=o=s:o=o.next=s,n=n.next}while(n!==null);o===null?i=o=t:o=o.next=t}else i=o=t;n={baseState:r.baseState,firstBaseUpdate:i,lastBaseUpdate:o,shared:r.shared,effects:r.effects},e.updateQueue=n;return}e=n.lastBaseUpdate,e===null?n.firstBaseUpdate=t:e.next=t,n.lastBaseUpdate=t}function Qo(e,t,n,r){var i=e.updateQueue;An=!1;var o=i.firstBaseUpdate,s=i.lastBaseUpdate,a=i.shared.pending;if(a!==null){i.shared.pending=null;var l=a,c=l.next;l.next=null,s===null?o=c:s.next=c,s=l;var d=e.alternate;d!==null&&(d=d.updateQueue,a=d.lastBaseUpdate,a!==s&&(a===null?d.firstBaseUpdate=c:a.next=c,d.lastBaseUpdate=l))}if(o!==null){var f=i.baseState;s=0,d=c=l=null,a=o;do{var h=a.lane,m=a.eventTime;if((r&h)===h){d!==null&&(d=d.next={eventTime:m,lane:0,tag:a.tag,payload:a.payload,callback:a.callback,next:null});e:{var g=e,b=a;switch(h=t,m=n,b.tag){case 1:if(g=b.payload,typeof g=="function"){f=g.call(m,f,h);break e}f=g;break e;case 3:g.flags=g.flags&-65537|128;case 0:if(g=b.payload,h=typeof g=="function"?g.call(m,f,h):g,h==null)break e;f=it({},f,h);break e;case 2:An=!0}}a.callback!==null&&a.lane!==0&&(e.flags|=64,h=i.effects,h===null?i.effects=[a]:h.push(a))}else m={eventTime:m,lane:h,tag:a.tag,payload:a.payload,callback:a.callback,next:null},d===null?(c=d=m,l=f):d=d.next=m,s|=h;if(a=a.next,a===null){if(a=i.shared.pending,a===null)break;h=a,a=h.next,h.next=null,i.lastBaseUpdate=h,i.shared.pending=null}}while(!0);if(d===null&&(l=f),i.baseState=l,i.firstBaseUpdate=c,i.lastBaseUpdate=d,t=i.shared.interleaved,t!==null){i=t;do s|=i.lane,i=i.next;while(i!==t)}else o===null&&(i.shared.lanes=0);ci|=s,e.lanes=s,e.memoizedState=f}}function Ou(e,t,n){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var r=e[t],i=r.callback;if(i!==null){if(r.callback=null,r=n,typeof i!="function")throw Error(ue(191,i));i.call(r)}}}var Gr={},fn=Hn(Gr),Or=Hn(Gr),Mr=Hn(Gr);function ii(e){if(e===Gr)throw Error(ue(174));return e}function oc(e,t){switch(Ge(Mr,t),Ge(Or,e),Ge(fn,Gr),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:Ua(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=Ua(t,e)}Xe(fn),Ge(fn,t)}function Wi(){Xe(fn),Xe(Or),Xe(Mr)}function Hf(e){ii(Mr.current);var t=ii(fn.current),n=Ua(t,e.type);t!==n&&(Ge(Or,e),Ge(fn,n))}function sc(e){Or.current===e&&(Xe(fn),Xe(Or))}var tt=Hn(0);function Ko(e){for(var t=e;t!==null;){if(t.tag===13){var n=t.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if(t.flags&128)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var ga=[];function ac(){for(var e=0;e<ga.length;e++)ga[e]._workInProgressVersionPrimary=null;ga.length=0}var Yo=$n.ReactCurrentDispatcher,ya=$n.ReactCurrentBatchConfig,li=0,nt=null,lt=null,ut=null,Xo=!1,vr=!1,_r=0,Ng=0;function wt(){throw Error(ue(321))}function lc(e,t){if(t===null)return!1;for(var n=0;n<t.length&&n<e.length;n++)if(!an(e[n],t[n]))return!1;return!0}function cc(e,t,n,r,i,o){if(li=o,nt=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,Yo.current=e===null||e.memoizedState===null?Cg:Ig,e=n(r,i),vr){o=0;do{if(vr=!1,_r=0,25<=o)throw Error(ue(301));o+=1,ut=lt=null,t.updateQueue=null,Yo.current=Ag,e=n(r,i)}while(vr)}if(Yo.current=Zo,t=lt!==null&&lt.next!==null,li=0,ut=lt=nt=null,Xo=!1,t)throw Error(ue(300));return e}function uc(){var e=_r!==0;return _r=0,e}function cn(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return ut===null?nt.memoizedState=ut=e:ut=ut.next=e,ut}function Kt(){if(lt===null){var e=nt.alternate;e=e!==null?e.memoizedState:null}else e=lt.next;var t=ut===null?nt.memoizedState:ut.next;if(t!==null)ut=t,lt=e;else{if(e===null)throw Error(ue(310));lt=e,e={memoizedState:lt.memoizedState,baseState:lt.baseState,baseQueue:lt.baseQueue,queue:lt.queue,next:null},ut===null?nt.memoizedState=ut=e:ut=ut.next=e}return ut}function qr(e,t){return typeof t=="function"?t(e):t}function wa(e){var t=Kt(),n=t.queue;if(n===null)throw Error(ue(311));n.lastRenderedReducer=e;var r=lt,i=r.baseQueue,o=n.pending;if(o!==null){if(i!==null){var s=i.next;i.next=o.next,o.next=s}r.baseQueue=i=o,n.pending=null}if(i!==null){o=i.next,r=r.baseState;var a=s=null,l=null,c=o;do{var d=c.lane;if((li&d)===d)l!==null&&(l=l.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),r=c.hasEagerState?c.eagerState:e(r,c.action);else{var f={lane:d,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};l===null?(a=l=f,s=r):l=l.next=f,nt.lanes|=d,ci|=d}c=c.next}while(c!==null&&c!==o);l===null?s=r:l.next=a,an(r,t.memoizedState)||(Et=!0),t.memoizedState=r,t.baseState=s,t.baseQueue=l,n.lastRenderedState=r}if(e=n.interleaved,e!==null){i=e;do o=i.lane,nt.lanes|=o,ci|=o,i=i.next;while(i!==e)}else i===null&&(n.lanes=0);return[t.memoizedState,n.dispatch]}function ba(e){var t=Kt(),n=t.queue;if(n===null)throw Error(ue(311));n.lastRenderedReducer=e;var r=n.dispatch,i=n.pending,o=t.memoizedState;if(i!==null){n.pending=null;var s=i=i.next;do o=e(o,s.action),s=s.next;while(s!==i);an(o,t.memoizedState)||(Et=!0),t.memoizedState=o,t.baseQueue===null&&(t.baseState=o),n.lastRenderedState=o}return[o,r]}function Vf(){}function Gf(e,t){var n=nt,r=Kt(),i=t(),o=!an(r.memoizedState,i);if(o&&(r.memoizedState=i,Et=!0),r=r.queue,dc(Xf.bind(null,n,r,e),[e]),r.getSnapshot!==t||o||ut!==null&&ut.memoizedState.tag&1){if(n.flags|=2048,Fr(9,Kf.bind(null,n,r,i,t),void 0,null),dt===null)throw Error(ue(349));li&30||Qf(n,t,i)}return i}function Qf(e,t,n){e.flags|=16384,e={getSnapshot:t,value:n},t=nt.updateQueue,t===null?(t={lastEffect:null,stores:null},nt.updateQueue=t,t.stores=[e]):(n=t.stores,n===null?t.stores=[e]:n.push(e))}function Kf(e,t,n,r){t.value=n,t.getSnapshot=r,Zf(t)&&Jf(e)}function Xf(e,t,n){return n(function(){Zf(t)&&Jf(e)})}function Zf(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!an(e,n)}catch{return!0}}function Jf(e){var t=Sn(e,1);t!==null&&sn(t,e,1,-1)}function Mu(e){var t=cn();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:qr,lastRenderedState:e},t.queue=e,e=e.dispatch=Yg.bind(null,nt,e),[t.memoizedState,e]}function Fr(e,t,n,r){return e={tag:e,create:t,destroy:n,deps:r,next:null},t=nt.updateQueue,t===null?(t={lastEffect:null,stores:null},nt.updateQueue=t,t.lastEffect=e.next=e):(n=t.lastEffect,n===null?t.lastEffect=e.next=e:(r=n.next,n.next=e,e.next=r,t.lastEffect=e)),e}function ep(){return Kt().memoizedState}function Co(e,t,n,r){var i=cn();nt.flags|=e,i.memoizedState=Fr(1|t,n,void 0,r===void 0?null:r)}function ps(e,t,n,r){var i=Kt();r=r===void 0?null:r;var o=void 0;if(lt!==null){var s=lt.memoizedState;if(o=s.destroy,r!==null&&lc(r,s.deps)){i.memoizedState=Fr(t,n,o,r);return}}nt.flags|=e,i.memoizedState=Fr(1|t,n,o,r)}function _u(e,t){return Co(8390656,8,e,t)}function dc(e,t){return ps(2048,8,e,t)}function tp(e,t){return ps(4,2,e,t)}function np(e,t){return ps(4,4,e,t)}function ip(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function rp(e,t,n){return n=n!=null?n.concat([e]):null,ps(4,4,ip.bind(null,t,e),n)}function fc(){}function op(e,t){var n=Kt();t=t===void 0?null:t;var r=n.memoizedState;return r!==null&&t!==null&&lc(t,r[1])?r[0]:(n.memoizedState=[e,t],e)}function sp(e,t){var n=Kt();t=t===void 0?null:t;var r=n.memoizedState;return r!==null&&t!==null&&lc(t,r[1])?r[0]:(e=e(),n.memoizedState=[e,t],e)}function ap(e,t,n){return li&21?(an(n,t)||(n=ff(),nt.lanes|=n,ci|=n,e.baseState=!0),t):(e.baseState&&(e.baseState=!1,Et=!0),e.memoizedState=n)}function Tg(e,t){var n=He;He=n!==0&&4>n?n:4,e(!0);var r=ya.transition;ya.transition={};try{e(!1),t()}finally{He=n,ya.transition=r}}function lp(){return Kt().memoizedState}function $g(e,t,n){var r=Ln(e);if(n={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null},cp(e))up(t,n);else if(n=zf(e,t,n,r),n!==null){var i=Ct();sn(n,e,r,i),dp(n,t,r)}}function Yg(e,t,n){var r=Ln(e),i={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null};if(cp(e))up(t,i);else{var o=e.alternate;if(e.lanes===0&&(o===null||o.lanes===0)&&(o=t.lastRenderedReducer,o!==null))try{var s=t.lastRenderedState,a=o(s,n);if(i.hasEagerState=!0,i.eagerState=a,an(a,s)){var l=t.interleaved;l===null?(i.next=i,ic(t)):(i.next=l.next,l.next=i),t.interleaved=i;return}}catch{}finally{}n=zf(e,t,i,r),n!==null&&(i=Ct(),sn(n,e,r,i),dp(n,t,r))}}function cp(e){var t=e.alternate;return e===nt||t!==null&&t===nt}function up(e,t){vr=Xo=!0;var n=e.pending;n===null?t.next=t:(t.next=n.next,n.next=t),e.pending=t}function dp(e,t,n){if(n&4194240){var r=t.lanes;r&=e.pendingLanes,n|=r,t.lanes=n,Bl(e,n)}}var Zo={readContext:Qt,useCallback:wt,useContext:wt,useEffect:wt,useImperativeHandle:wt,useInsertionEffect:wt,useLayoutEffect:wt,useMemo:wt,useReducer:wt,useRef:wt,useState:wt,useDebugValue:wt,useDeferredValue:wt,useTransition:wt,useMutableSource:wt,useSyncExternalStore:wt,useId:wt,unstable_isNewReconciler:!1},Cg={readContext:Qt,useCallback:function(e,t){return cn().memoizedState=[e,t===void 0?null:t],e},useContext:Qt,useEffect:_u,useImperativeHandle:function(e,t,n){return n=n!=null?n.concat([e]):null,Co(4194308,4,ip.bind(null,t,e),n)},useLayoutEffect:function(e,t){return Co(4194308,4,e,t)},useInsertionEffect:function(e,t){return Co(4,2,e,t)},useMemo:function(e,t){var n=cn();return t=t===void 0?null:t,e=e(),n.memoizedState=[e,t],e},useReducer:function(e,t,n){var r=cn();return t=n!==void 0?n(t):t,r.memoizedState=r.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},r.queue=e,e=e.dispatch=$g.bind(null,nt,e),[r.memoizedState,e]},useRef:function(e){var t=cn();return e={current:e},t.memoizedState=e},useState:Mu,useDebugValue:fc,useDeferredValue:function(e){return cn().memoizedState=e},useTransition:function(){var e=Mu(!1),t=e[0];return e=Tg.bind(null,e[1]),cn().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,n){var r=nt,i=cn();if(et){if(n===void 0)throw Error(ue(407));n=n()}else{if(n=t(),dt===null)throw Error(ue(349));li&30||Qf(r,t,n)}i.memoizedState=n;var o={value:n,getSnapshot:t};return i.queue=o,_u(Xf.bind(null,r,o,e),[e]),r.flags|=2048,Fr(9,Kf.bind(null,r,o,n,t),void 0,null),n},useId:function(){var e=cn(),t=dt.identifierPrefix;if(et){var n=wn,r=yn;n=(r&~(1<<32-on(r)-1)).toString(32)+n,t=":"+t+"R"+n,n=_r++,0<n&&(t+="H"+n.toString(32)),t+=":"}else n=Ng++,t=":"+t+"r"+n.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},Ig={readContext:Qt,useCallback:op,useContext:Qt,useEffect:dc,useImperativeHandle:rp,useInsertionEffect:tp,useLayoutEffect:np,useMemo:sp,useReducer:wa,useRef:ep,useState:function(){return wa(qr)},useDebugValue:fc,useDeferredValue:function(e){var t=Kt();return ap(t,lt.memoizedState,e)},useTransition:function(){var e=wa(qr)[0],t=Kt().memoizedState;return[e,t]},useMutableSource:Vf,useSyncExternalStore:Gf,useId:lp,unstable_isNewReconciler:!1},Ag={readContext:Qt,useCallback:op,useContext:Qt,useEffect:dc,useImperativeHandle:rp,useInsertionEffect:tp,useLayoutEffect:np,useMemo:sp,useReducer:ba,useRef:ep,useState:function(){return ba(qr)},useDebugValue:fc,useDeferredValue:function(e){var t=Kt();return lt===null?t.memoizedState=e:ap(t,lt.memoizedState,e)},useTransition:function(){var e=ba(qr)[0],t=Kt().memoizedState;return[e,t]},useMutableSource:Vf,useSyncExternalStore:Gf,useId:lp,unstable_isNewReconciler:!1};function en(e,t){if(e&&e.defaultProps){t=it({},t),e=e.defaultProps;for(var n in e)t[n]===void 0&&(t[n]=e[n]);return t}return t}function cl(e,t,n,r){t=e.memoizedState,n=n(r,t),n=n==null?t:it({},t,n),e.memoizedState=n,e.lanes===0&&(e.updateQueue.baseState=n)}var hs={isMounted:function(e){return(e=e._reactInternals)?fi(e)===e:!1},enqueueSetState:function(e,t,n){e=e._reactInternals;var r=Ct(),i=Ln(e),o=bn(r,i);o.payload=t,n!=null&&(o.callback=n),t=qn(e,o,i),t!==null&&(sn(t,e,i,r),$o(t,e,i))},enqueueReplaceState:function(e,t,n){e=e._reactInternals;var r=Ct(),i=Ln(e),o=bn(r,i);o.tag=1,o.payload=t,n!=null&&(o.callback=n),t=qn(e,o,i),t!==null&&(sn(t,e,i,r),$o(t,e,i))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var n=Ct(),r=Ln(e),i=bn(n,r);i.tag=2,t!=null&&(i.callback=t),t=qn(e,i,r),t!==null&&(sn(t,e,r,n),$o(t,e,r))}};function qu(e,t,n,r,i,o,s){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(r,o,s):t.prototype&&t.prototype.isPureReactComponent?!Er(n,r)||!Er(i,o):!0}function fp(e,t,n){var r=!1,i=zn,o=t.contextType;return typeof o=="object"&&o!==null?o=Qt(o):(i=Pt(t)?si:Tt.current,r=t.contextTypes,o=(r=r!=null)?Ui(e,i):zn),t=new t(n,o),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=hs,e.stateNode=t,t._reactInternals=e,r&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=i,e.__reactInternalMemoizedMaskedChildContext=o),t}function Fu(e,t,n,r){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(n,r),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(n,r),t.state!==e&&hs.enqueueReplaceState(t,t.state,null)}function ul(e,t,n,r){var i=e.stateNode;i.props=n,i.state=e.memoizedState,i.refs={},rc(e);var o=t.contextType;typeof o=="object"&&o!==null?i.context=Qt(o):(o=Pt(t)?si:Tt.current,i.context=Ui(e,o)),i.state=e.memoizedState,o=t.getDerivedStateFromProps,typeof o=="function"&&(cl(e,t,o,n),i.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof i.getSnapshotBeforeUpdate=="function"||typeof i.UNSAFE_componentWillMount!="function"&&typeof i.componentWillMount!="function"||(t=i.state,typeof i.componentWillMount=="function"&&i.componentWillMount(),typeof i.UNSAFE_componentWillMount=="function"&&i.UNSAFE_componentWillMount(),t!==i.state&&hs.enqueueReplaceState(i,i.state,null),Qo(e,n,i,r),i.state=e.memoizedState),typeof i.componentDidMount=="function"&&(e.flags|=4194308)}function Hi(e,t){try{var n="",r=t;do n+=rm(r),r=r.return;while(r);var i=n}catch(o){i=`
Error generating stack: `+o.message+`
`+o.stack}return{value:e,source:t,stack:i,digest:null}}function va(e,t,n){return{value:e,source:null,stack:n??null,digest:t??null}}function dl(e,t){try{console.error(t.value)}catch(n){setTimeout(function(){throw n})}}var Rg=typeof WeakMap=="function"?WeakMap:Map;function pp(e,t,n){n=bn(-1,n),n.tag=3,n.payload={element:null};var r=t.value;return n.callback=function(){es||(es=!0,kl=r),dl(e,t)},n}function hp(e,t,n){n=bn(-1,n),n.tag=3;var r=e.type.getDerivedStateFromError;if(typeof r=="function"){var i=t.value;n.payload=function(){return r(i)},n.callback=function(){dl(e,t)}}var o=e.stateNode;return o!==null&&typeof o.componentDidCatch=="function"&&(n.callback=function(){dl(e,t),typeof r!="function"&&(Fn===null?Fn=new Set([this]):Fn.add(this));var s=t.stack;this.componentDidCatch(t.value,{componentStack:s!==null?s:""})}),n}function Lu(e,t,n){var r=e.pingCache;if(r===null){r=e.pingCache=new Rg;var i=new Set;r.set(t,i)}else i=r.get(t),i===void 0&&(i=new Set,r.set(t,i));i.has(n)||(i.add(n),e=Wg.bind(null,e,t,n),t.then(e,e))}function Uu(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function Bu(e,t,n,r,i){return e.mode&1?(e.flags|=65536,e.lanes=i,e):(e===t?e.flags|=65536:(e.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(t=bn(-1,1),t.tag=2,qn(n,t,1))),n.lanes|=1),e)}var Eg=$n.ReactCurrentOwner,Et=!1;function Yt(e,t,n,r){t.child=e===null?Bf(t,null,n,r):zi(t,e.child,n,r)}function zu(e,t,n,r,i){n=n.render;var o=t.ref;return _i(t,i),r=cc(e,t,n,r,o,i),n=uc(),e!==null&&!Et?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~i,Nn(e,t,i)):(et&&n&&Xl(t),t.flags|=1,Yt(e,t,r,i),t.child)}function Wu(e,t,n,r,i){if(e===null){var o=n.type;return typeof o=="function"&&!vc(o)&&o.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(t.tag=15,t.type=o,mp(e,t,o,r,i)):(e=Eo(n.type,null,r,t,t.mode,i),e.ref=t.ref,e.return=t,t.child=e)}if(o=e.child,!(e.lanes&i)){var s=o.memoizedProps;if(n=n.compare,n=n!==null?n:Er,n(s,r)&&e.ref===t.ref)return Nn(e,t,i)}return t.flags|=1,e=Un(o,r),e.ref=t.ref,e.return=t,t.child=e}function mp(e,t,n,r,i){if(e!==null){var o=e.memoizedProps;if(Er(o,r)&&e.ref===t.ref)if(Et=!1,t.pendingProps=r=o,(e.lanes&i)!==0)e.flags&131072&&(Et=!0);else return t.lanes=e.lanes,Nn(e,t,i)}return fl(e,t,n,r,i)}function gp(e,t,n){var r=t.pendingProps,i=r.children,o=e!==null?e.memoizedState:null;if(r.mode==="hidden")if(!(t.mode&1))t.memoizedState={baseLanes:0,cachePool:null,transitions:null},Ge(ji,_t),_t|=n;else{if(!(n&1073741824))return e=o!==null?o.baseLanes|n:n,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,Ge(ji,_t),_t|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},r=o!==null?o.baseLanes:n,Ge(ji,_t),_t|=r}else o!==null?(r=o.baseLanes|n,t.memoizedState=null):r=n,Ge(ji,_t),_t|=r;return Yt(e,t,i,n),t.child}function yp(e,t){var n=t.ref;(e===null&&n!==null||e!==null&&e.ref!==n)&&(t.flags|=512,t.flags|=2097152)}function fl(e,t,n,r,i){var o=Pt(n)?si:Tt.current;return o=Ui(t,o),_i(t,i),n=cc(e,t,n,r,o,i),r=uc(),e!==null&&!Et?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~i,Nn(e,t,i)):(et&&r&&Xl(t),t.flags|=1,Yt(e,t,n,i),t.child)}function Hu(e,t,n,r,i){if(Pt(n)){var o=!0;zo(t)}else o=!1;if(_i(t,i),t.stateNode===null)Io(e,t),fp(t,n,r),ul(t,n,r,i),r=!0;else if(e===null){var s=t.stateNode,a=t.memoizedProps;s.props=a;var l=s.context,c=n.contextType;typeof c=="object"&&c!==null?c=Qt(c):(c=Pt(n)?si:Tt.current,c=Ui(t,c));var d=n.getDerivedStateFromProps,f=typeof d=="function"||typeof s.getSnapshotBeforeUpdate=="function";f||typeof s.UNSAFE_componentWillReceiveProps!="function"&&typeof s.componentWillReceiveProps!="function"||(a!==r||l!==c)&&Fu(t,s,r,c),An=!1;var h=t.memoizedState;s.state=h,Qo(t,r,s,i),l=t.memoizedState,a!==r||h!==l||jt.current||An?(typeof d=="function"&&(cl(t,n,d,r),l=t.memoizedState),(a=An||qu(t,n,a,r,h,l,c))?(f||typeof s.UNSAFE_componentWillMount!="function"&&typeof s.componentWillMount!="function"||(typeof s.componentWillMount=="function"&&s.componentWillMount(),typeof s.UNSAFE_componentWillMount=="function"&&s.UNSAFE_componentWillMount()),typeof s.componentDidMount=="function"&&(t.flags|=4194308)):(typeof s.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=r,t.memoizedState=l),s.props=r,s.state=l,s.context=c,r=a):(typeof s.componentDidMount=="function"&&(t.flags|=4194308),r=!1)}else{s=t.stateNode,Wf(e,t),a=t.memoizedProps,c=t.type===t.elementType?a:en(t.type,a),s.props=c,f=t.pendingProps,h=s.context,l=n.contextType,typeof l=="object"&&l!==null?l=Qt(l):(l=Pt(n)?si:Tt.current,l=Ui(t,l));var m=n.getDerivedStateFromProps;(d=typeof m=="function"||typeof s.getSnapshotBeforeUpdate=="function")||typeof s.UNSAFE_componentWillReceiveProps!="function"&&typeof s.componentWillReceiveProps!="function"||(a!==f||h!==l)&&Fu(t,s,r,l),An=!1,h=t.memoizedState,s.state=h,Qo(t,r,s,i);var g=t.memoizedState;a!==f||h!==g||jt.current||An?(typeof m=="function"&&(cl(t,n,m,r),g=t.memoizedState),(c=An||qu(t,n,c,r,h,g,l)||!1)?(d||typeof s.UNSAFE_componentWillUpdate!="function"&&typeof s.componentWillUpdate!="function"||(typeof s.componentWillUpdate=="function"&&s.componentWillUpdate(r,g,l),typeof s.UNSAFE_componentWillUpdate=="function"&&s.UNSAFE_componentWillUpdate(r,g,l)),typeof s.componentDidUpdate=="function"&&(t.flags|=4),typeof s.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof s.componentDidUpdate!="function"||a===e.memoizedProps&&h===e.memoizedState||(t.flags|=4),typeof s.getSnapshotBeforeUpdate!="function"||a===e.memoizedProps&&h===e.memoizedState||(t.flags|=1024),t.memoizedProps=r,t.memoizedState=g),s.props=r,s.state=g,s.context=l,r=c):(typeof s.componentDidUpdate!="function"||a===e.memoizedProps&&h===e.memoizedState||(t.flags|=4),typeof s.getSnapshotBeforeUpdate!="function"||a===e.memoizedProps&&h===e.memoizedState||(t.flags|=1024),r=!1)}return pl(e,t,n,r,o,i)}function pl(e,t,n,r,i,o){yp(e,t);var s=(t.flags&128)!==0;if(!r&&!s)return i&&Ru(t,n,!1),Nn(e,t,o);r=t.stateNode,Eg.current=t;var a=s&&typeof n.getDerivedStateFromError!="function"?null:r.render();return t.flags|=1,e!==null&&s?(t.child=zi(t,e.child,null,o),t.child=zi(t,null,a,o)):Yt(e,t,a,o),t.memoizedState=r.state,i&&Ru(t,n,!0),t.child}function wp(e){var t=e.stateNode;t.pendingContext?Au(e,t.pendingContext,t.pendingContext!==t.context):t.context&&Au(e,t.context,!1),oc(e,t.containerInfo)}function Vu(e,t,n,r,i){return Bi(),Jl(i),t.flags|=256,Yt(e,t,n,r),t.child}var hl={dehydrated:null,treeContext:null,retryLane:0};function ml(e){return{baseLanes:e,cachePool:null,transitions:null}}function bp(e,t,n){var r=t.pendingProps,i=tt.current,o=!1,s=(t.flags&128)!==0,a;if((a=s)||(a=e!==null&&e.memoizedState===null?!1:(i&2)!==0),a?(o=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(i|=1),Ge(tt,i&1),e===null)return al(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?(t.mode&1?e.data==="$!"?t.lanes=8:t.lanes=1073741824:t.lanes=1,null):(s=r.children,e=r.fallback,o?(r=t.mode,o=t.child,s={mode:"hidden",children:s},!(r&1)&&o!==null?(o.childLanes=0,o.pendingProps=s):o=ys(s,r,0,null),e=oi(e,r,n,null),o.return=t,e.return=t,o.sibling=e,t.child=o,t.child.memoizedState=ml(n),t.memoizedState=hl,e):pc(t,s));if(i=e.memoizedState,i!==null&&(a=i.dehydrated,a!==null))return jg(e,t,s,r,a,i,n);if(o){o=r.fallback,s=t.mode,i=e.child,a=i.sibling;var l={mode:"hidden",children:r.children};return!(s&1)&&t.child!==i?(r=t.child,r.childLanes=0,r.pendingProps=l,t.deletions=null):(r=Un(i,l),r.subtreeFlags=i.subtreeFlags&14680064),a!==null?o=Un(a,o):(o=oi(o,s,n,null),o.flags|=2),o.return=t,r.return=t,r.sibling=o,t.child=r,r=o,o=t.child,s=e.child.memoizedState,s=s===null?ml(n):{baseLanes:s.baseLanes|n,cachePool:null,transitions:s.transitions},o.memoizedState=s,o.childLanes=e.childLanes&~n,t.memoizedState=hl,r}return o=e.child,e=o.sibling,r=Un(o,{mode:"visible",children:r.children}),!(t.mode&1)&&(r.lanes=n),r.return=t,r.sibling=null,e!==null&&(n=t.deletions,n===null?(t.deletions=[e],t.flags|=16):n.push(e)),t.child=r,t.memoizedState=null,r}function pc(e,t){return t=ys({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function ho(e,t,n,r){return r!==null&&Jl(r),zi(t,e.child,null,n),e=pc(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function jg(e,t,n,r,i,o,s){if(n)return t.flags&256?(t.flags&=-257,r=va(Error(ue(422))),ho(e,t,s,r)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(o=r.fallback,i=t.mode,r=ys({mode:"visible",children:r.children},i,0,null),o=oi(o,i,s,null),o.flags|=2,r.return=t,o.return=t,r.sibling=o,t.child=r,t.mode&1&&zi(t,e.child,null,s),t.child.memoizedState=ml(s),t.memoizedState=hl,o);if(!(t.mode&1))return ho(e,t,s,null);if(i.data==="$!"){if(r=i.nextSibling&&i.nextSibling.dataset,r)var a=r.dgst;return r=a,o=Error(ue(419)),r=va(o,r,void 0),ho(e,t,s,r)}if(a=(s&e.childLanes)!==0,Et||a){if(r=dt,r!==null){switch(s&-s){case 4:i=2;break;case 16:i=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:i=32;break;case 536870912:i=268435456;break;default:i=0}i=i&(r.suspendedLanes|s)?0:i,i!==0&&i!==o.retryLane&&(o.retryLane=i,Sn(e,i),sn(r,e,i,-1))}return bc(),r=va(Error(ue(421))),ho(e,t,s,r)}return i.data==="$?"?(t.flags|=128,t.child=e.child,t=Hg.bind(null,e),i._reactRetry=t,null):(e=o.treeContext,qt=_n(i.nextSibling),Lt=t,et=!0,rn=null,e!==null&&(Wt[Ht++]=yn,Wt[Ht++]=wn,Wt[Ht++]=ai,yn=e.id,wn=e.overflow,ai=t),t=pc(t,r.children),t.flags|=4096,t)}function Gu(e,t,n){e.lanes|=t;var r=e.alternate;r!==null&&(r.lanes|=t),ll(e.return,t,n)}function ka(e,t,n,r,i){var o=e.memoizedState;o===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:r,tail:n,tailMode:i}:(o.isBackwards=t,o.rendering=null,o.renderingStartTime=0,o.last=r,o.tail=n,o.tailMode=i)}function vp(e,t,n){var r=t.pendingProps,i=r.revealOrder,o=r.tail;if(Yt(e,t,r.children,n),r=tt.current,r&2)r=r&1|2,t.flags|=128;else{if(e!==null&&e.flags&128)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&Gu(e,n,t);else if(e.tag===19)Gu(e,n,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}r&=1}if(Ge(tt,r),!(t.mode&1))t.memoizedState=null;else switch(i){case"forwards":for(n=t.child,i=null;n!==null;)e=n.alternate,e!==null&&Ko(e)===null&&(i=n),n=n.sibling;n=i,n===null?(i=t.child,t.child=null):(i=n.sibling,n.sibling=null),ka(t,!1,i,n,o);break;case"backwards":for(n=null,i=t.child,t.child=null;i!==null;){if(e=i.alternate,e!==null&&Ko(e)===null){t.child=i;break}e=i.sibling,i.sibling=n,n=i,i=e}ka(t,!0,n,null,o);break;case"together":ka(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function Io(e,t){!(t.mode&1)&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function Nn(e,t,n){if(e!==null&&(t.dependencies=e.dependencies),ci|=t.lanes,!(n&t.childLanes))return null;if(e!==null&&t.child!==e.child)throw Error(ue(153));if(t.child!==null){for(e=t.child,n=Un(e,e.pendingProps),t.child=n,n.return=t;e.sibling!==null;)e=e.sibling,n=n.sibling=Un(e,e.pendingProps),n.return=t;n.sibling=null}return t.child}function Pg(e,t,n){switch(t.tag){case 3:wp(t),Bi();break;case 5:Hf(t);break;case 1:Pt(t.type)&&zo(t);break;case 4:oc(t,t.stateNode.containerInfo);break;case 10:var r=t.type._context,i=t.memoizedProps.value;Ge(Vo,r._currentValue),r._currentValue=i;break;case 13:if(r=t.memoizedState,r!==null)return r.dehydrated!==null?(Ge(tt,tt.current&1),t.flags|=128,null):n&t.child.childLanes?bp(e,t,n):(Ge(tt,tt.current&1),e=Nn(e,t,n),e!==null?e.sibling:null);Ge(tt,tt.current&1);break;case 19:if(r=(n&t.childLanes)!==0,e.flags&128){if(r)return vp(e,t,n);t.flags|=128}if(i=t.memoizedState,i!==null&&(i.rendering=null,i.tail=null,i.lastEffect=null),Ge(tt,tt.current),r)break;return null;case 22:case 23:return t.lanes=0,gp(e,t,n)}return Nn(e,t,n)}var kp,gl,xp,Sp;kp=function(e,t){for(var n=t.child;n!==null;){if(n.tag===5||n.tag===6)e.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===t)break;for(;n.sibling===null;){if(n.return===null||n.return===t)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};gl=function(){};xp=function(e,t,n,r){var i=e.memoizedProps;if(i!==r){e=t.stateNode,ii(fn.current);var o=null;switch(n){case"input":i=_a(e,i),r=_a(e,r),o=[];break;case"select":i=it({},i,{value:void 0}),r=it({},r,{value:void 0}),o=[];break;case"textarea":i=La(e,i),r=La(e,r),o=[];break;default:typeof i.onClick!="function"&&typeof r.onClick=="function"&&(e.onclick=Uo)}Ba(n,r);var s;n=null;for(c in i)if(!r.hasOwnProperty(c)&&i.hasOwnProperty(c)&&i[c]!=null)if(c==="style"){var a=i[c];for(s in a)a.hasOwnProperty(s)&&(n||(n={}),n[s]="")}else c!=="dangerouslySetInnerHTML"&&c!=="children"&&c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&c!=="autoFocus"&&(Tr.hasOwnProperty(c)?o||(o=[]):(o=o||[]).push(c,null));for(c in r){var l=r[c];if(a=i!=null?i[c]:void 0,r.hasOwnProperty(c)&&l!==a&&(l!=null||a!=null))if(c==="style")if(a){for(s in a)!a.hasOwnProperty(s)||l&&l.hasOwnProperty(s)||(n||(n={}),n[s]="");for(s in l)l.hasOwnProperty(s)&&a[s]!==l[s]&&(n||(n={}),n[s]=l[s])}else n||(o||(o=[]),o.push(c,n)),n=l;else c==="dangerouslySetInnerHTML"?(l=l?l.__html:void 0,a=a?a.__html:void 0,l!=null&&a!==l&&(o=o||[]).push(c,l)):c==="children"?typeof l!="string"&&typeof l!="number"||(o=o||[]).push(c,""+l):c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&(Tr.hasOwnProperty(c)?(l!=null&&c==="onScroll"&&Ke("scroll",e),o||a===l||(o=[])):(o=o||[]).push(c,l))}n&&(o=o||[]).push("style",n);var c=o;(t.updateQueue=c)&&(t.flags|=4)}};Sp=function(e,t,n,r){n!==r&&(t.flags|=4)};function or(e,t){if(!et)switch(e.tailMode){case"hidden":t=e.tail;for(var n=null;t!==null;)t.alternate!==null&&(n=t),t=t.sibling;n===null?e.tail=null:n.sibling=null;break;case"collapsed":n=e.tail;for(var r=null;n!==null;)n.alternate!==null&&(r=n),n=n.sibling;r===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:r.sibling=null}}function bt(e){var t=e.alternate!==null&&e.alternate.child===e.child,n=0,r=0;if(t)for(var i=e.child;i!==null;)n|=i.lanes|i.childLanes,r|=i.subtreeFlags&14680064,r|=i.flags&14680064,i.return=e,i=i.sibling;else for(i=e.child;i!==null;)n|=i.lanes|i.childLanes,r|=i.subtreeFlags,r|=i.flags,i.return=e,i=i.sibling;return e.subtreeFlags|=r,e.childLanes=n,t}function Dg(e,t,n){var r=t.pendingProps;switch(Zl(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return bt(t),null;case 1:return Pt(t.type)&&Bo(),bt(t),null;case 3:return r=t.stateNode,Wi(),Xe(jt),Xe(Tt),ac(),r.pendingContext&&(r.context=r.pendingContext,r.pendingContext=null),(e===null||e.child===null)&&(fo(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&!(t.flags&256)||(t.flags|=1024,rn!==null&&(Nl(rn),rn=null))),gl(e,t),bt(t),null;case 5:sc(t);var i=ii(Mr.current);if(n=t.type,e!==null&&t.stateNode!=null)xp(e,t,n,r,i),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!r){if(t.stateNode===null)throw Error(ue(166));return bt(t),null}if(e=ii(fn.current),fo(t)){r=t.stateNode,n=t.type;var o=t.memoizedProps;switch(r[un]=t,r[Dr]=o,e=(t.mode&1)!==0,n){case"dialog":Ke("cancel",r),Ke("close",r);break;case"iframe":case"object":case"embed":Ke("load",r);break;case"video":case"audio":for(i=0;i<pr.length;i++)Ke(pr[i],r);break;case"source":Ke("error",r);break;case"img":case"image":case"link":Ke("error",r),Ke("load",r);break;case"details":Ke("toggle",r);break;case"input":iu(r,o),Ke("invalid",r);break;case"select":r._wrapperState={wasMultiple:!!o.multiple},Ke("invalid",r);break;case"textarea":ou(r,o),Ke("invalid",r)}Ba(n,o),i=null;for(var s in o)if(o.hasOwnProperty(s)){var a=o[s];s==="children"?typeof a=="string"?r.textContent!==a&&(o.suppressHydrationWarning!==!0&&uo(r.textContent,a,e),i=["children",a]):typeof a=="number"&&r.textContent!==""+a&&(o.suppressHydrationWarning!==!0&&uo(r.textContent,a,e),i=["children",""+a]):Tr.hasOwnProperty(s)&&a!=null&&s==="onScroll"&&Ke("scroll",r)}switch(n){case"input":no(r),ru(r,o,!0);break;case"textarea":no(r),su(r);break;case"select":case"option":break;default:typeof o.onClick=="function"&&(r.onclick=Uo)}r=i,t.updateQueue=r,r!==null&&(t.flags|=4)}else{s=i.nodeType===9?i:i.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=Kd(n)),e==="http://www.w3.org/1999/xhtml"?n==="script"?(e=s.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):typeof r.is=="string"?e=s.createElement(n,{is:r.is}):(e=s.createElement(n),n==="select"&&(s=e,r.multiple?s.multiple=!0:r.size&&(s.size=r.size))):e=s.createElementNS(e,n),e[un]=t,e[Dr]=r,kp(e,t,!1,!1),t.stateNode=e;e:{switch(s=za(n,r),n){case"dialog":Ke("cancel",e),Ke("close",e),i=r;break;case"iframe":case"object":case"embed":Ke("load",e),i=r;break;case"video":case"audio":for(i=0;i<pr.length;i++)Ke(pr[i],e);i=r;break;case"source":Ke("error",e),i=r;break;case"img":case"image":case"link":Ke("error",e),Ke("load",e),i=r;break;case"details":Ke("toggle",e),i=r;break;case"input":iu(e,r),i=_a(e,r),Ke("invalid",e);break;case"option":i=r;break;case"select":e._wrapperState={wasMultiple:!!r.multiple},i=it({},r,{value:void 0}),Ke("invalid",e);break;case"textarea":ou(e,r),i=La(e,r),Ke("invalid",e);break;default:i=r}Ba(n,i),a=i;for(o in a)if(a.hasOwnProperty(o)){var l=a[o];o==="style"?Jd(e,l):o==="dangerouslySetInnerHTML"?(l=l?l.__html:void 0,l!=null&&Xd(e,l)):o==="children"?typeof l=="string"?(n!=="textarea"||l!=="")&&$r(e,l):typeof l=="number"&&$r(e,""+l):o!=="suppressContentEditableWarning"&&o!=="suppressHydrationWarning"&&o!=="autoFocus"&&(Tr.hasOwnProperty(o)?l!=null&&o==="onScroll"&&Ke("scroll",e):l!=null&&Ml(e,o,l,s))}switch(n){case"input":no(e),ru(e,r,!1);break;case"textarea":no(e),su(e);break;case"option":r.value!=null&&e.setAttribute("value",""+Bn(r.value));break;case"select":e.multiple=!!r.multiple,o=r.value,o!=null?Pi(e,!!r.multiple,o,!1):r.defaultValue!=null&&Pi(e,!!r.multiple,r.defaultValue,!0);break;default:typeof i.onClick=="function"&&(e.onclick=Uo)}switch(n){case"button":case"input":case"select":case"textarea":r=!!r.autoFocus;break e;case"img":r=!0;break e;default:r=!1}}r&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return bt(t),null;case 6:if(e&&t.stateNode!=null)Sp(e,t,e.memoizedProps,r);else{if(typeof r!="string"&&t.stateNode===null)throw Error(ue(166));if(n=ii(Mr.current),ii(fn.current),fo(t)){if(r=t.stateNode,n=t.memoizedProps,r[un]=t,(o=r.nodeValue!==n)&&(e=Lt,e!==null))switch(e.tag){case 3:uo(r.nodeValue,n,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&uo(r.nodeValue,n,(e.mode&1)!==0)}o&&(t.flags|=4)}else r=(n.nodeType===9?n:n.ownerDocument).createTextNode(r),r[un]=t,t.stateNode=r}return bt(t),null;case 13:if(Xe(tt),r=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(et&&qt!==null&&t.mode&1&&!(t.flags&128))Lf(),Bi(),t.flags|=98560,o=!1;else if(o=fo(t),r!==null&&r.dehydrated!==null){if(e===null){if(!o)throw Error(ue(318));if(o=t.memoizedState,o=o!==null?o.dehydrated:null,!o)throw Error(ue(317));o[un]=t}else Bi(),!(t.flags&128)&&(t.memoizedState=null),t.flags|=4;bt(t),o=!1}else rn!==null&&(Nl(rn),rn=null),o=!0;if(!o)return t.flags&65536?t:null}return t.flags&128?(t.lanes=n,t):(r=r!==null,r!==(e!==null&&e.memoizedState!==null)&&r&&(t.child.flags|=8192,t.mode&1&&(e===null||tt.current&1?ct===0&&(ct=3):bc())),t.updateQueue!==null&&(t.flags|=4),bt(t),null);case 4:return Wi(),gl(e,t),e===null&&jr(t.stateNode.containerInfo),bt(t),null;case 10:return nc(t.type._context),bt(t),null;case 17:return Pt(t.type)&&Bo(),bt(t),null;case 19:if(Xe(tt),o=t.memoizedState,o===null)return bt(t),null;if(r=(t.flags&128)!==0,s=o.rendering,s===null)if(r)or(o,!1);else{if(ct!==0||e!==null&&e.flags&128)for(e=t.child;e!==null;){if(s=Ko(e),s!==null){for(t.flags|=128,or(o,!1),r=s.updateQueue,r!==null&&(t.updateQueue=r,t.flags|=4),t.subtreeFlags=0,r=n,n=t.child;n!==null;)o=n,e=r,o.flags&=14680066,s=o.alternate,s===null?(o.childLanes=0,o.lanes=e,o.child=null,o.subtreeFlags=0,o.memoizedProps=null,o.memoizedState=null,o.updateQueue=null,o.dependencies=null,o.stateNode=null):(o.childLanes=s.childLanes,o.lanes=s.lanes,o.child=s.child,o.subtreeFlags=0,o.deletions=null,o.memoizedProps=s.memoizedProps,o.memoizedState=s.memoizedState,o.updateQueue=s.updateQueue,o.type=s.type,e=s.dependencies,o.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),n=n.sibling;return Ge(tt,tt.current&1|2),t.child}e=e.sibling}o.tail!==null&&st()>Vi&&(t.flags|=128,r=!0,or(o,!1),t.lanes=4194304)}else{if(!r)if(e=Ko(s),e!==null){if(t.flags|=128,r=!0,n=e.updateQueue,n!==null&&(t.updateQueue=n,t.flags|=4),or(o,!0),o.tail===null&&o.tailMode==="hidden"&&!s.alternate&&!et)return bt(t),null}else 2*st()-o.renderingStartTime>Vi&&n!==1073741824&&(t.flags|=128,r=!0,or(o,!1),t.lanes=4194304);o.isBackwards?(s.sibling=t.child,t.child=s):(n=o.last,n!==null?n.sibling=s:t.child=s,o.last=s)}return o.tail!==null?(t=o.tail,o.rendering=t,o.tail=t.sibling,o.renderingStartTime=st(),t.sibling=null,n=tt.current,Ge(tt,r?n&1|2:n&1),t):(bt(t),null);case 22:case 23:return wc(),r=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==r&&(t.flags|=8192),r&&t.mode&1?_t&1073741824&&(bt(t),t.subtreeFlags&6&&(t.flags|=8192)):bt(t),null;case 24:return null;case 25:return null}throw Error(ue(156,t.tag))}function Og(e,t){switch(Zl(t),t.tag){case 1:return Pt(t.type)&&Bo(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return Wi(),Xe(jt),Xe(Tt),ac(),e=t.flags,e&65536&&!(e&128)?(t.flags=e&-65537|128,t):null;case 5:return sc(t),null;case 13:if(Xe(tt),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(ue(340));Bi()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return Xe(tt),null;case 4:return Wi(),null;case 10:return nc(t.type._context),null;case 22:case 23:return wc(),null;case 24:return null;default:return null}}var mo=!1,St=!1,Mg=typeof WeakSet=="function"?WeakSet:Set,xe=null;function Ei(e,t){var n=e.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(r){ot(e,t,r)}else n.current=null}function yl(e,t,n){try{n()}catch(r){ot(e,t,r)}}var Qu=!1;function _g(e,t){if(el=qo,e=Cf(),Kl(e)){if("selectionStart"in e)var n={start:e.selectionStart,end:e.selectionEnd};else e:{n=(n=e.ownerDocument)&&n.defaultView||window;var r=n.getSelection&&n.getSelection();if(r&&r.rangeCount!==0){n=r.anchorNode;var i=r.anchorOffset,o=r.focusNode;r=r.focusOffset;try{n.nodeType,o.nodeType}catch{n=null;break e}var s=0,a=-1,l=-1,c=0,d=0,f=e,h=null;t:for(;;){for(var m;f!==n||i!==0&&f.nodeType!==3||(a=s+i),f!==o||r!==0&&f.nodeType!==3||(l=s+r),f.nodeType===3&&(s+=f.nodeValue.length),(m=f.firstChild)!==null;)h=f,f=m;for(;;){if(f===e)break t;if(h===n&&++c===i&&(a=s),h===o&&++d===r&&(l=s),(m=f.nextSibling)!==null)break;f=h,h=f.parentNode}f=m}n=a===-1||l===-1?null:{start:a,end:l}}else n=null}n=n||{start:0,end:0}}else n=null;for(tl={focusedElem:e,selectionRange:n},qo=!1,xe=t;xe!==null;)if(t=xe,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,xe=e;else for(;xe!==null;){t=xe;try{var g=t.alternate;if(t.flags&1024)switch(t.tag){case 0:case 11:case 15:break;case 1:if(g!==null){var b=g.memoizedProps,T=g.memoizedState,y=t.stateNode,w=y.getSnapshotBeforeUpdate(t.elementType===t.type?b:en(t.type,b),T);y.__reactInternalSnapshotBeforeUpdate=w}break;case 3:var k=t.stateNode.containerInfo;k.nodeType===1?k.textContent="":k.nodeType===9&&k.documentElement&&k.removeChild(k.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(ue(163))}}catch(R){ot(t,t.return,R)}if(e=t.sibling,e!==null){e.return=t.return,xe=e;break}xe=t.return}return g=Qu,Qu=!1,g}function kr(e,t,n){var r=t.updateQueue;if(r=r!==null?r.lastEffect:null,r!==null){var i=r=r.next;do{if((i.tag&e)===e){var o=i.destroy;i.destroy=void 0,o!==void 0&&yl(t,n,o)}i=i.next}while(i!==r)}}function ms(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var n=t=t.next;do{if((n.tag&e)===e){var r=n.create;n.destroy=r()}n=n.next}while(n!==t)}}function wl(e){var t=e.ref;if(t!==null){var n=e.stateNode;switch(e.tag){case 5:e=n;break;default:e=n}typeof t=="function"?t(e):t.current=e}}function Np(e){var t=e.alternate;t!==null&&(e.alternate=null,Np(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[un],delete t[Dr],delete t[rl],delete t[vg],delete t[kg])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function Tp(e){return e.tag===5||e.tag===3||e.tag===4}function Ku(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||Tp(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function bl(e,t,n){var r=e.tag;if(r===5||r===6)e=e.stateNode,t?n.nodeType===8?n.parentNode.insertBefore(e,t):n.insertBefore(e,t):(n.nodeType===8?(t=n.parentNode,t.insertBefore(e,n)):(t=n,t.appendChild(e)),n=n._reactRootContainer,n!=null||t.onclick!==null||(t.onclick=Uo));else if(r!==4&&(e=e.child,e!==null))for(bl(e,t,n),e=e.sibling;e!==null;)bl(e,t,n),e=e.sibling}function vl(e,t,n){var r=e.tag;if(r===5||r===6)e=e.stateNode,t?n.insertBefore(e,t):n.appendChild(e);else if(r!==4&&(e=e.child,e!==null))for(vl(e,t,n),e=e.sibling;e!==null;)vl(e,t,n),e=e.sibling}var ht=null,tn=!1;function Yn(e,t,n){for(n=n.child;n!==null;)$p(e,t,n),n=n.sibling}function $p(e,t,n){if(dn&&typeof dn.onCommitFiberUnmount=="function")try{dn.onCommitFiberUnmount(as,n)}catch{}switch(n.tag){case 5:St||Ei(n,t);case 6:var r=ht,i=tn;ht=null,Yn(e,t,n),ht=r,tn=i,ht!==null&&(tn?(e=ht,n=n.stateNode,e.nodeType===8?e.parentNode.removeChild(n):e.removeChild(n)):ht.removeChild(n.stateNode));break;case 18:ht!==null&&(tn?(e=ht,n=n.stateNode,e.nodeType===8?ha(e.parentNode,n):e.nodeType===1&&ha(e,n),Ar(e)):ha(ht,n.stateNode));break;case 4:r=ht,i=tn,ht=n.stateNode.containerInfo,tn=!0,Yn(e,t,n),ht=r,tn=i;break;case 0:case 11:case 14:case 15:if(!St&&(r=n.updateQueue,r!==null&&(r=r.lastEffect,r!==null))){i=r=r.next;do{var o=i,s=o.destroy;o=o.tag,s!==void 0&&(o&2||o&4)&&yl(n,t,s),i=i.next}while(i!==r)}Yn(e,t,n);break;case 1:if(!St&&(Ei(n,t),r=n.stateNode,typeof r.componentWillUnmount=="function"))try{r.props=n.memoizedProps,r.state=n.memoizedState,r.componentWillUnmount()}catch(a){ot(n,t,a)}Yn(e,t,n);break;case 21:Yn(e,t,n);break;case 22:n.mode&1?(St=(r=St)||n.memoizedState!==null,Yn(e,t,n),St=r):Yn(e,t,n);break;default:Yn(e,t,n)}}function Xu(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var n=e.stateNode;n===null&&(n=e.stateNode=new Mg),t.forEach(function(r){var i=Vg.bind(null,e,r);n.has(r)||(n.add(r),r.then(i,i))})}}function Zt(e,t){var n=t.deletions;if(n!==null)for(var r=0;r<n.length;r++){var i=n[r];try{var o=e,s=t,a=s;e:for(;a!==null;){switch(a.tag){case 5:ht=a.stateNode,tn=!1;break e;case 3:ht=a.stateNode.containerInfo,tn=!0;break e;case 4:ht=a.stateNode.containerInfo,tn=!0;break e}a=a.return}if(ht===null)throw Error(ue(160));$p(o,s,i),ht=null,tn=!1;var l=i.alternate;l!==null&&(l.return=null),i.return=null}catch(c){ot(i,t,c)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)Yp(t,e),t=t.sibling}function Yp(e,t){var n=e.alternate,r=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(Zt(t,e),ln(e),r&4){try{kr(3,e,e.return),ms(3,e)}catch(b){ot(e,e.return,b)}try{kr(5,e,e.return)}catch(b){ot(e,e.return,b)}}break;case 1:Zt(t,e),ln(e),r&512&&n!==null&&Ei(n,n.return);break;case 5:if(Zt(t,e),ln(e),r&512&&n!==null&&Ei(n,n.return),e.flags&32){var i=e.stateNode;try{$r(i,"")}catch(b){ot(e,e.return,b)}}if(r&4&&(i=e.stateNode,i!=null)){var o=e.memoizedProps,s=n!==null?n.memoizedProps:o,a=e.type,l=e.updateQueue;if(e.updateQueue=null,l!==null)try{a==="input"&&o.type==="radio"&&o.name!=null&&Gd(i,o),za(a,s);var c=za(a,o);for(s=0;s<l.length;s+=2){var d=l[s],f=l[s+1];d==="style"?Jd(i,f):d==="dangerouslySetInnerHTML"?Xd(i,f):d==="children"?$r(i,f):Ml(i,d,f,c)}switch(a){case"input":qa(i,o);break;case"textarea":Qd(i,o);break;case"select":var h=i._wrapperState.wasMultiple;i._wrapperState.wasMultiple=!!o.multiple;var m=o.value;m!=null?Pi(i,!!o.multiple,m,!1):h!==!!o.multiple&&(o.defaultValue!=null?Pi(i,!!o.multiple,o.defaultValue,!0):Pi(i,!!o.multiple,o.multiple?[]:"",!1))}i[Dr]=o}catch(b){ot(e,e.return,b)}}break;case 6:if(Zt(t,e),ln(e),r&4){if(e.stateNode===null)throw Error(ue(162));i=e.stateNode,o=e.memoizedProps;try{i.nodeValue=o}catch(b){ot(e,e.return,b)}}break;case 3:if(Zt(t,e),ln(e),r&4&&n!==null&&n.memoizedState.isDehydrated)try{Ar(t.containerInfo)}catch(b){ot(e,e.return,b)}break;case 4:Zt(t,e),ln(e);break;case 13:Zt(t,e),ln(e),i=e.child,i.flags&8192&&(o=i.memoizedState!==null,i.stateNode.isHidden=o,!o||i.alternate!==null&&i.alternate.memoizedState!==null||(gc=st())),r&4&&Xu(e);break;case 22:if(d=n!==null&&n.memoizedState!==null,e.mode&1?(St=(c=St)||d,Zt(t,e),St=c):Zt(t,e),ln(e),r&8192){if(c=e.memoizedState!==null,(e.stateNode.isHidden=c)&&!d&&e.mode&1)for(xe=e,d=e.child;d!==null;){for(f=xe=d;xe!==null;){switch(h=xe,m=h.child,h.tag){case 0:case 11:case 14:case 15:kr(4,h,h.return);break;case 1:Ei(h,h.return);var g=h.stateNode;if(typeof g.componentWillUnmount=="function"){r=h,n=h.return;try{t=r,g.props=t.memoizedProps,g.state=t.memoizedState,g.componentWillUnmount()}catch(b){ot(r,n,b)}}break;case 5:Ei(h,h.return);break;case 22:if(h.memoizedState!==null){Ju(f);continue}}m!==null?(m.return=h,xe=m):Ju(f)}d=d.sibling}e:for(d=null,f=e;;){if(f.tag===5){if(d===null){d=f;try{i=f.stateNode,c?(o=i.style,typeof o.setProperty=="function"?o.setProperty("display","none","important"):o.display="none"):(a=f.stateNode,l=f.memoizedProps.style,s=l!=null&&l.hasOwnProperty("display")?l.display:null,a.style.display=Zd("display",s))}catch(b){ot(e,e.return,b)}}}else if(f.tag===6){if(d===null)try{f.stateNode.nodeValue=c?"":f.memoizedProps}catch(b){ot(e,e.return,b)}}else if((f.tag!==22&&f.tag!==23||f.memoizedState===null||f===e)&&f.child!==null){f.child.return=f,f=f.child;continue}if(f===e)break e;for(;f.sibling===null;){if(f.return===null||f.return===e)break e;d===f&&(d=null),f=f.return}d===f&&(d=null),f.sibling.return=f.return,f=f.sibling}}break;case 19:Zt(t,e),ln(e),r&4&&Xu(e);break;case 21:break;default:Zt(t,e),ln(e)}}function ln(e){var t=e.flags;if(t&2){try{e:{for(var n=e.return;n!==null;){if(Tp(n)){var r=n;break e}n=n.return}throw Error(ue(160))}switch(r.tag){case 5:var i=r.stateNode;r.flags&32&&($r(i,""),r.flags&=-33);var o=Ku(e);vl(e,o,i);break;case 3:case 4:var s=r.stateNode.containerInfo,a=Ku(e);bl(e,a,s);break;default:throw Error(ue(161))}}catch(l){ot(e,e.return,l)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function qg(e,t,n){xe=e,Cp(e)}function Cp(e,t,n){for(var r=(e.mode&1)!==0;xe!==null;){var i=xe,o=i.child;if(i.tag===22&&r){var s=i.memoizedState!==null||mo;if(!s){var a=i.alternate,l=a!==null&&a.memoizedState!==null||St;a=mo;var c=St;if(mo=s,(St=l)&&!c)for(xe=i;xe!==null;)s=xe,l=s.child,s.tag===22&&s.memoizedState!==null?ed(i):l!==null?(l.return=s,xe=l):ed(i);for(;o!==null;)xe=o,Cp(o),o=o.sibling;xe=i,mo=a,St=c}Zu(e)}else i.subtreeFlags&8772&&o!==null?(o.return=i,xe=o):Zu(e)}}function Zu(e){for(;xe!==null;){var t=xe;if(t.flags&8772){var n=t.alternate;try{if(t.flags&8772)switch(t.tag){case 0:case 11:case 15:St||ms(5,t);break;case 1:var r=t.stateNode;if(t.flags&4&&!St)if(n===null)r.componentDidMount();else{var i=t.elementType===t.type?n.memoizedProps:en(t.type,n.memoizedProps);r.componentDidUpdate(i,n.memoizedState,r.__reactInternalSnapshotBeforeUpdate)}var o=t.updateQueue;o!==null&&Ou(t,o,r);break;case 3:var s=t.updateQueue;if(s!==null){if(n=null,t.child!==null)switch(t.child.tag){case 5:n=t.child.stateNode;break;case 1:n=t.child.stateNode}Ou(t,s,n)}break;case 5:var a=t.stateNode;if(n===null&&t.flags&4){n=a;var l=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":l.autoFocus&&n.focus();break;case"img":l.src&&(n.src=l.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var c=t.alternate;if(c!==null){var d=c.memoizedState;if(d!==null){var f=d.dehydrated;f!==null&&Ar(f)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(ue(163))}St||t.flags&512&&wl(t)}catch(h){ot(t,t.return,h)}}if(t===e){xe=null;break}if(n=t.sibling,n!==null){n.return=t.return,xe=n;break}xe=t.return}}function Ju(e){for(;xe!==null;){var t=xe;if(t===e){xe=null;break}var n=t.sibling;if(n!==null){n.return=t.return,xe=n;break}xe=t.return}}function ed(e){for(;xe!==null;){var t=xe;try{switch(t.tag){case 0:case 11:case 15:var n=t.return;try{ms(4,t)}catch(l){ot(t,n,l)}break;case 1:var r=t.stateNode;if(typeof r.componentDidMount=="function"){var i=t.return;try{r.componentDidMount()}catch(l){ot(t,i,l)}}var o=t.return;try{wl(t)}catch(l){ot(t,o,l)}break;case 5:var s=t.return;try{wl(t)}catch(l){ot(t,s,l)}}}catch(l){ot(t,t.return,l)}if(t===e){xe=null;break}var a=t.sibling;if(a!==null){a.return=t.return,xe=a;break}xe=t.return}}var Fg=Math.ceil,Jo=$n.ReactCurrentDispatcher,hc=$n.ReactCurrentOwner,Gt=$n.ReactCurrentBatchConfig,We=0,dt=null,at=null,mt=0,_t=0,ji=Hn(0),ct=0,Lr=null,ci=0,gs=0,mc=0,xr=null,Rt=null,gc=0,Vi=1/0,mn=null,es=!1,kl=null,Fn=null,go=!1,Pn=null,ts=0,Sr=0,xl=null,Ao=-1,Ro=0;function Ct(){return We&6?st():Ao!==-1?Ao:Ao=st()}function Ln(e){return e.mode&1?We&2&&mt!==0?mt&-mt:Sg.transition!==null?(Ro===0&&(Ro=ff()),Ro):(e=He,e!==0||(e=window.event,e=e===void 0?16:bf(e.type)),e):1}function sn(e,t,n,r){if(50<Sr)throw Sr=0,xl=null,Error(ue(185));Wr(e,n,r),(!(We&2)||e!==dt)&&(e===dt&&(!(We&2)&&(gs|=n),ct===4&&En(e,mt)),Dt(e,r),n===1&&We===0&&!(t.mode&1)&&(Vi=st()+500,fs&&Vn()))}function Dt(e,t){var n=e.callbackNode;Sm(e,t);var r=_o(e,e===dt?mt:0);if(r===0)n!==null&&cu(n),e.callbackNode=null,e.callbackPriority=0;else if(t=r&-r,e.callbackPriority!==t){if(n!=null&&cu(n),t===1)e.tag===0?xg(td.bind(null,e)):_f(td.bind(null,e)),wg(function(){!(We&6)&&Vn()}),n=null;else{switch(pf(r)){case 1:n=Ul;break;case 4:n=uf;break;case 16:n=Mo;break;case 536870912:n=df;break;default:n=Mo}n=Op(n,Ip.bind(null,e))}e.callbackPriority=t,e.callbackNode=n}}function Ip(e,t){if(Ao=-1,Ro=0,We&6)throw Error(ue(327));var n=e.callbackNode;if(qi()&&e.callbackNode!==n)return null;var r=_o(e,e===dt?mt:0);if(r===0)return null;if(r&30||r&e.expiredLanes||t)t=ns(e,r);else{t=r;var i=We;We|=2;var o=Rp();(dt!==e||mt!==t)&&(mn=null,Vi=st()+500,ri(e,t));do try{Bg();break}catch(a){Ap(e,a)}while(!0);tc(),Jo.current=o,We=i,at!==null?t=0:(dt=null,mt=0,t=ct)}if(t!==0){if(t===2&&(i=Qa(e),i!==0&&(r=i,t=Sl(e,i))),t===1)throw n=Lr,ri(e,0),En(e,r),Dt(e,st()),n;if(t===6)En(e,r);else{if(i=e.current.alternate,!(r&30)&&!Lg(i)&&(t=ns(e,r),t===2&&(o=Qa(e),o!==0&&(r=o,t=Sl(e,o))),t===1))throw n=Lr,ri(e,0),En(e,r),Dt(e,st()),n;switch(e.finishedWork=i,e.finishedLanes=r,t){case 0:case 1:throw Error(ue(345));case 2:Zn(e,Rt,mn);break;case 3:if(En(e,r),(r&130023424)===r&&(t=gc+500-st(),10<t)){if(_o(e,0)!==0)break;if(i=e.suspendedLanes,(i&r)!==r){Ct(),e.pingedLanes|=e.suspendedLanes&i;break}e.timeoutHandle=il(Zn.bind(null,e,Rt,mn),t);break}Zn(e,Rt,mn);break;case 4:if(En(e,r),(r&4194240)===r)break;for(t=e.eventTimes,i=-1;0<r;){var s=31-on(r);o=1<<s,s=t[s],s>i&&(i=s),r&=~o}if(r=i,r=st()-r,r=(120>r?120:480>r?480:1080>r?1080:1920>r?1920:3e3>r?3e3:4320>r?4320:1960*Fg(r/1960))-r,10<r){e.timeoutHandle=il(Zn.bind(null,e,Rt,mn),r);break}Zn(e,Rt,mn);break;case 5:Zn(e,Rt,mn);break;default:throw Error(ue(329))}}}return Dt(e,st()),e.callbackNode===n?Ip.bind(null,e):null}function Sl(e,t){var n=xr;return e.current.memoizedState.isDehydrated&&(ri(e,t).flags|=256),e=ns(e,t),e!==2&&(t=Rt,Rt=n,t!==null&&Nl(t)),e}function Nl(e){Rt===null?Rt=e:Rt.push.apply(Rt,e)}function Lg(e){for(var t=e;;){if(t.flags&16384){var n=t.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var r=0;r<n.length;r++){var i=n[r],o=i.getSnapshot;i=i.value;try{if(!an(o(),i))return!1}catch{return!1}}}if(n=t.child,t.subtreeFlags&16384&&n!==null)n.return=t,t=n;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function En(e,t){for(t&=~mc,t&=~gs,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var n=31-on(t),r=1<<n;e[n]=-1,t&=~r}}function td(e){if(We&6)throw Error(ue(327));qi();var t=_o(e,0);if(!(t&1))return Dt(e,st()),null;var n=ns(e,t);if(e.tag!==0&&n===2){var r=Qa(e);r!==0&&(t=r,n=Sl(e,r))}if(n===1)throw n=Lr,ri(e,0),En(e,t),Dt(e,st()),n;if(n===6)throw Error(ue(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,Zn(e,Rt,mn),Dt(e,st()),null}function yc(e,t){var n=We;We|=1;try{return e(t)}finally{We=n,We===0&&(Vi=st()+500,fs&&Vn())}}function ui(e){Pn!==null&&Pn.tag===0&&!(We&6)&&qi();var t=We;We|=1;var n=Gt.transition,r=He;try{if(Gt.transition=null,He=1,e)return e()}finally{He=r,Gt.transition=n,We=t,!(We&6)&&Vn()}}function wc(){_t=ji.current,Xe(ji)}function ri(e,t){e.finishedWork=null,e.finishedLanes=0;var n=e.timeoutHandle;if(n!==-1&&(e.timeoutHandle=-1,yg(n)),at!==null)for(n=at.return;n!==null;){var r=n;switch(Zl(r),r.tag){case 1:r=r.type.childContextTypes,r!=null&&Bo();break;case 3:Wi(),Xe(jt),Xe(Tt),ac();break;case 5:sc(r);break;case 4:Wi();break;case 13:Xe(tt);break;case 19:Xe(tt);break;case 10:nc(r.type._context);break;case 22:case 23:wc()}n=n.return}if(dt=e,at=e=Un(e.current,null),mt=_t=t,ct=0,Lr=null,mc=gs=ci=0,Rt=xr=null,ni!==null){for(t=0;t<ni.length;t++)if(n=ni[t],r=n.interleaved,r!==null){n.interleaved=null;var i=r.next,o=n.pending;if(o!==null){var s=o.next;o.next=i,r.next=s}n.pending=r}ni=null}return e}function Ap(e,t){do{var n=at;try{if(tc(),Yo.current=Zo,Xo){for(var r=nt.memoizedState;r!==null;){var i=r.queue;i!==null&&(i.pending=null),r=r.next}Xo=!1}if(li=0,ut=lt=nt=null,vr=!1,_r=0,hc.current=null,n===null||n.return===null){ct=1,Lr=t,at=null;break}e:{var o=e,s=n.return,a=n,l=t;if(t=mt,a.flags|=32768,l!==null&&typeof l=="object"&&typeof l.then=="function"){var c=l,d=a,f=d.tag;if(!(d.mode&1)&&(f===0||f===11||f===15)){var h=d.alternate;h?(d.updateQueue=h.updateQueue,d.memoizedState=h.memoizedState,d.lanes=h.lanes):(d.updateQueue=null,d.memoizedState=null)}var m=Uu(s);if(m!==null){m.flags&=-257,Bu(m,s,a,o,t),m.mode&1&&Lu(o,c,t),t=m,l=c;var g=t.updateQueue;if(g===null){var b=new Set;b.add(l),t.updateQueue=b}else g.add(l);break e}else{if(!(t&1)){Lu(o,c,t),bc();break e}l=Error(ue(426))}}else if(et&&a.mode&1){var T=Uu(s);if(T!==null){!(T.flags&65536)&&(T.flags|=256),Bu(T,s,a,o,t),Jl(Hi(l,a));break e}}o=l=Hi(l,a),ct!==4&&(ct=2),xr===null?xr=[o]:xr.push(o),o=s;do{switch(o.tag){case 3:o.flags|=65536,t&=-t,o.lanes|=t;var y=pp(o,l,t);Du(o,y);break e;case 1:a=l;var w=o.type,k=o.stateNode;if(!(o.flags&128)&&(typeof w.getDerivedStateFromError=="function"||k!==null&&typeof k.componentDidCatch=="function"&&(Fn===null||!Fn.has(k)))){o.flags|=65536,t&=-t,o.lanes|=t;var R=hp(o,a,t);Du(o,R);break e}}o=o.return}while(o!==null)}jp(n)}catch(M){t=M,at===n&&n!==null&&(at=n=n.return);continue}break}while(!0)}function Rp(){var e=Jo.current;return Jo.current=Zo,e===null?Zo:e}function bc(){(ct===0||ct===3||ct===2)&&(ct=4),dt===null||!(ci&268435455)&&!(gs&268435455)||En(dt,mt)}function ns(e,t){var n=We;We|=2;var r=Rp();(dt!==e||mt!==t)&&(mn=null,ri(e,t));do try{Ug();break}catch(i){Ap(e,i)}while(!0);if(tc(),We=n,Jo.current=r,at!==null)throw Error(ue(261));return dt=null,mt=0,ct}function Ug(){for(;at!==null;)Ep(at)}function Bg(){for(;at!==null&&!hm();)Ep(at)}function Ep(e){var t=Dp(e.alternate,e,_t);e.memoizedProps=e.pendingProps,t===null?jp(e):at=t,hc.current=null}function jp(e){var t=e;do{var n=t.alternate;if(e=t.return,t.flags&32768){if(n=Og(n,t),n!==null){n.flags&=32767,at=n;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{ct=6,at=null;return}}else if(n=Dg(n,t,_t),n!==null){at=n;return}if(t=t.sibling,t!==null){at=t;return}at=t=e}while(t!==null);ct===0&&(ct=5)}function Zn(e,t,n){var r=He,i=Gt.transition;try{Gt.transition=null,He=1,zg(e,t,n,r)}finally{Gt.transition=i,He=r}return null}function zg(e,t,n,r){do qi();while(Pn!==null);if(We&6)throw Error(ue(327));n=e.finishedWork;var i=e.finishedLanes;if(n===null)return null;if(e.finishedWork=null,e.finishedLanes=0,n===e.current)throw Error(ue(177));e.callbackNode=null,e.callbackPriority=0;var o=n.lanes|n.childLanes;if(Nm(e,o),e===dt&&(at=dt=null,mt=0),!(n.subtreeFlags&2064)&&!(n.flags&2064)||go||(go=!0,Op(Mo,function(){return qi(),null})),o=(n.flags&15990)!==0,n.subtreeFlags&15990||o){o=Gt.transition,Gt.transition=null;var s=He;He=1;var a=We;We|=4,hc.current=null,_g(e,n),Yp(n,e),ug(tl),qo=!!el,tl=el=null,e.current=n,qg(n),mm(),We=a,He=s,Gt.transition=o}else e.current=n;if(go&&(go=!1,Pn=e,ts=i),o=e.pendingLanes,o===0&&(Fn=null),wm(n.stateNode),Dt(e,st()),t!==null)for(r=e.onRecoverableError,n=0;n<t.length;n++)i=t[n],r(i.value,{componentStack:i.stack,digest:i.digest});if(es)throw es=!1,e=kl,kl=null,e;return ts&1&&e.tag!==0&&qi(),o=e.pendingLanes,o&1?e===xl?Sr++:(Sr=0,xl=e):Sr=0,Vn(),null}function qi(){if(Pn!==null){var e=pf(ts),t=Gt.transition,n=He;try{if(Gt.transition=null,He=16>e?16:e,Pn===null)var r=!1;else{if(e=Pn,Pn=null,ts=0,We&6)throw Error(ue(331));var i=We;for(We|=4,xe=e.current;xe!==null;){var o=xe,s=o.child;if(xe.flags&16){var a=o.deletions;if(a!==null){for(var l=0;l<a.length;l++){var c=a[l];for(xe=c;xe!==null;){var d=xe;switch(d.tag){case 0:case 11:case 15:kr(8,d,o)}var f=d.child;if(f!==null)f.return=d,xe=f;else for(;xe!==null;){d=xe;var h=d.sibling,m=d.return;if(Np(d),d===c){xe=null;break}if(h!==null){h.return=m,xe=h;break}xe=m}}}var g=o.alternate;if(g!==null){var b=g.child;if(b!==null){g.child=null;do{var T=b.sibling;b.sibling=null,b=T}while(b!==null)}}xe=o}}if(o.subtreeFlags&2064&&s!==null)s.return=o,xe=s;else e:for(;xe!==null;){if(o=xe,o.flags&2048)switch(o.tag){case 0:case 11:case 15:kr(9,o,o.return)}var y=o.sibling;if(y!==null){y.return=o.return,xe=y;break e}xe=o.return}}var w=e.current;for(xe=w;xe!==null;){s=xe;var k=s.child;if(s.subtreeFlags&2064&&k!==null)k.return=s,xe=k;else e:for(s=w;xe!==null;){if(a=xe,a.flags&2048)try{switch(a.tag){case 0:case 11:case 15:ms(9,a)}}catch(M){ot(a,a.return,M)}if(a===s){xe=null;break e}var R=a.sibling;if(R!==null){R.return=a.return,xe=R;break e}xe=a.return}}if(We=i,Vn(),dn&&typeof dn.onPostCommitFiberRoot=="function")try{dn.onPostCommitFiberRoot(as,e)}catch{}r=!0}return r}finally{He=n,Gt.transition=t}}return!1}function nd(e,t,n){t=Hi(n,t),t=pp(e,t,1),e=qn(e,t,1),t=Ct(),e!==null&&(Wr(e,1,t),Dt(e,t))}function ot(e,t,n){if(e.tag===3)nd(e,e,n);else for(;t!==null;){if(t.tag===3){nd(t,e,n);break}else if(t.tag===1){var r=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof r.componentDidCatch=="function"&&(Fn===null||!Fn.has(r))){e=Hi(n,e),e=hp(t,e,1),t=qn(t,e,1),e=Ct(),t!==null&&(Wr(t,1,e),Dt(t,e));break}}t=t.return}}function Wg(e,t,n){var r=e.pingCache;r!==null&&r.delete(t),t=Ct(),e.pingedLanes|=e.suspendedLanes&n,dt===e&&(mt&n)===n&&(ct===4||ct===3&&(mt&130023424)===mt&&500>st()-gc?ri(e,0):mc|=n),Dt(e,t)}function Pp(e,t){t===0&&(e.mode&1?(t=oo,oo<<=1,!(oo&130023424)&&(oo=4194304)):t=1);var n=Ct();e=Sn(e,t),e!==null&&(Wr(e,t,n),Dt(e,n))}function Hg(e){var t=e.memoizedState,n=0;t!==null&&(n=t.retryLane),Pp(e,n)}function Vg(e,t){var n=0;switch(e.tag){case 13:var r=e.stateNode,i=e.memoizedState;i!==null&&(n=i.retryLane);break;case 19:r=e.stateNode;break;default:throw Error(ue(314))}r!==null&&r.delete(t),Pp(e,n)}var Dp;Dp=function(e,t,n){if(e!==null)if(e.memoizedProps!==t.pendingProps||jt.current)Et=!0;else{if(!(e.lanes&n)&&!(t.flags&128))return Et=!1,Pg(e,t,n);Et=!!(e.flags&131072)}else Et=!1,et&&t.flags&1048576&&qf(t,Ho,t.index);switch(t.lanes=0,t.tag){case 2:var r=t.type;Io(e,t),e=t.pendingProps;var i=Ui(t,Tt.current);_i(t,n),i=cc(null,t,r,e,i,n);var o=uc();return t.flags|=1,typeof i=="object"&&i!==null&&typeof i.render=="function"&&i.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,Pt(r)?(o=!0,zo(t)):o=!1,t.memoizedState=i.state!==null&&i.state!==void 0?i.state:null,rc(t),i.updater=hs,t.stateNode=i,i._reactInternals=t,ul(t,r,e,n),t=pl(null,t,r,!0,o,n)):(t.tag=0,et&&o&&Xl(t),Yt(null,t,i,n),t=t.child),t;case 16:r=t.elementType;e:{switch(Io(e,t),e=t.pendingProps,i=r._init,r=i(r._payload),t.type=r,i=t.tag=Qg(r),e=en(r,e),i){case 0:t=fl(null,t,r,e,n);break e;case 1:t=Hu(null,t,r,e,n);break e;case 11:t=zu(null,t,r,e,n);break e;case 14:t=Wu(null,t,r,en(r.type,e),n);break e}throw Error(ue(306,r,""))}return t;case 0:return r=t.type,i=t.pendingProps,i=t.elementType===r?i:en(r,i),fl(e,t,r,i,n);case 1:return r=t.type,i=t.pendingProps,i=t.elementType===r?i:en(r,i),Hu(e,t,r,i,n);case 3:e:{if(wp(t),e===null)throw Error(ue(387));r=t.pendingProps,o=t.memoizedState,i=o.element,Wf(e,t),Qo(t,r,null,n);var s=t.memoizedState;if(r=s.element,o.isDehydrated)if(o={element:r,isDehydrated:!1,cache:s.cache,pendingSuspenseBoundaries:s.pendingSuspenseBoundaries,transitions:s.transitions},t.updateQueue.baseState=o,t.memoizedState=o,t.flags&256){i=Hi(Error(ue(423)),t),t=Vu(e,t,r,n,i);break e}else if(r!==i){i=Hi(Error(ue(424)),t),t=Vu(e,t,r,n,i);break e}else for(qt=_n(t.stateNode.containerInfo.firstChild),Lt=t,et=!0,rn=null,n=Bf(t,null,r,n),t.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(Bi(),r===i){t=Nn(e,t,n);break e}Yt(e,t,r,n)}t=t.child}return t;case 5:return Hf(t),e===null&&al(t),r=t.type,i=t.pendingProps,o=e!==null?e.memoizedProps:null,s=i.children,nl(r,i)?s=null:o!==null&&nl(r,o)&&(t.flags|=32),yp(e,t),Yt(e,t,s,n),t.child;case 6:return e===null&&al(t),null;case 13:return bp(e,t,n);case 4:return oc(t,t.stateNode.containerInfo),r=t.pendingProps,e===null?t.child=zi(t,null,r,n):Yt(e,t,r,n),t.child;case 11:return r=t.type,i=t.pendingProps,i=t.elementType===r?i:en(r,i),zu(e,t,r,i,n);case 7:return Yt(e,t,t.pendingProps,n),t.child;case 8:return Yt(e,t,t.pendingProps.children,n),t.child;case 12:return Yt(e,t,t.pendingProps.children,n),t.child;case 10:e:{if(r=t.type._context,i=t.pendingProps,o=t.memoizedProps,s=i.value,Ge(Vo,r._currentValue),r._currentValue=s,o!==null)if(an(o.value,s)){if(o.children===i.children&&!jt.current){t=Nn(e,t,n);break e}}else for(o=t.child,o!==null&&(o.return=t);o!==null;){var a=o.dependencies;if(a!==null){s=o.child;for(var l=a.firstContext;l!==null;){if(l.context===r){if(o.tag===1){l=bn(-1,n&-n),l.tag=2;var c=o.updateQueue;if(c!==null){c=c.shared;var d=c.pending;d===null?l.next=l:(l.next=d.next,d.next=l),c.pending=l}}o.lanes|=n,l=o.alternate,l!==null&&(l.lanes|=n),ll(o.return,n,t),a.lanes|=n;break}l=l.next}}else if(o.tag===10)s=o.type===t.type?null:o.child;else if(o.tag===18){if(s=o.return,s===null)throw Error(ue(341));s.lanes|=n,a=s.alternate,a!==null&&(a.lanes|=n),ll(s,n,t),s=o.sibling}else s=o.child;if(s!==null)s.return=o;else for(s=o;s!==null;){if(s===t){s=null;break}if(o=s.sibling,o!==null){o.return=s.return,s=o;break}s=s.return}o=s}Yt(e,t,i.children,n),t=t.child}return t;case 9:return i=t.type,r=t.pendingProps.children,_i(t,n),i=Qt(i),r=r(i),t.flags|=1,Yt(e,t,r,n),t.child;case 14:return r=t.type,i=en(r,t.pendingProps),i=en(r.type,i),Wu(e,t,r,i,n);case 15:return mp(e,t,t.type,t.pendingProps,n);case 17:return r=t.type,i=t.pendingProps,i=t.elementType===r?i:en(r,i),Io(e,t),t.tag=1,Pt(r)?(e=!0,zo(t)):e=!1,_i(t,n),fp(t,r,i),ul(t,r,i,n),pl(null,t,r,!0,e,n);case 19:return vp(e,t,n);case 22:return gp(e,t,n)}throw Error(ue(156,t.tag))};function Op(e,t){return cf(e,t)}function Gg(e,t,n,r){this.tag=e,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=r,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Vt(e,t,n,r){return new Gg(e,t,n,r)}function vc(e){return e=e.prototype,!(!e||!e.isReactComponent)}function Qg(e){if(typeof e=="function")return vc(e)?1:0;if(e!=null){if(e=e.$$typeof,e===ql)return 11;if(e===Fl)return 14}return 2}function Un(e,t){var n=e.alternate;return n===null?(n=Vt(e.tag,t,e.key,e.mode),n.elementType=e.elementType,n.type=e.type,n.stateNode=e.stateNode,n.alternate=e,e.alternate=n):(n.pendingProps=t,n.type=e.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=e.flags&14680064,n.childLanes=e.childLanes,n.lanes=e.lanes,n.child=e.child,n.memoizedProps=e.memoizedProps,n.memoizedState=e.memoizedState,n.updateQueue=e.updateQueue,t=e.dependencies,n.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},n.sibling=e.sibling,n.index=e.index,n.ref=e.ref,n}function Eo(e,t,n,r,i,o){var s=2;if(r=e,typeof e=="function")vc(e)&&(s=1);else if(typeof e=="string")s=5;else e:switch(e){case Si:return oi(n.children,i,o,t);case _l:s=8,i|=8;break;case Pa:return e=Vt(12,n,t,i|2),e.elementType=Pa,e.lanes=o,e;case Da:return e=Vt(13,n,t,i),e.elementType=Da,e.lanes=o,e;case Oa:return e=Vt(19,n,t,i),e.elementType=Oa,e.lanes=o,e;case Wd:return ys(n,i,o,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case Bd:s=10;break e;case zd:s=9;break e;case ql:s=11;break e;case Fl:s=14;break e;case In:s=16,r=null;break e}throw Error(ue(130,e==null?e:typeof e,""))}return t=Vt(s,n,t,i),t.elementType=e,t.type=r,t.lanes=o,t}function oi(e,t,n,r){return e=Vt(7,e,r,t),e.lanes=n,e}function ys(e,t,n,r){return e=Vt(22,e,r,t),e.elementType=Wd,e.lanes=n,e.stateNode={isHidden:!1},e}function xa(e,t,n){return e=Vt(6,e,null,t),e.lanes=n,e}function Sa(e,t,n){return t=Vt(4,e.children!==null?e.children:[],e.key,t),t.lanes=n,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function Kg(e,t,n,r,i){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=ia(0),this.expirationTimes=ia(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=ia(0),this.identifierPrefix=r,this.onRecoverableError=i,this.mutableSourceEagerHydrationData=null}function kc(e,t,n,r,i,o,s,a,l){return e=new Kg(e,t,n,a,l),t===1?(t=1,o===!0&&(t|=8)):t=0,o=Vt(3,null,null,t),e.current=o,o.stateNode=e,o.memoizedState={element:r,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},rc(o),e}function Xg(e,t,n){var r=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:xi,key:r==null?null:""+r,children:e,containerInfo:t,implementation:n}}function Mp(e){if(!e)return zn;e=e._reactInternals;e:{if(fi(e)!==e||e.tag!==1)throw Error(ue(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(Pt(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(ue(171))}if(e.tag===1){var n=e.type;if(Pt(n))return Mf(e,n,t)}return t}function _p(e,t,n,r,i,o,s,a,l){return e=kc(n,r,!0,e,i,o,s,a,l),e.context=Mp(null),n=e.current,r=Ct(),i=Ln(n),o=bn(r,i),o.callback=t??null,qn(n,o,i),e.current.lanes=i,Wr(e,i,r),Dt(e,r),e}function ws(e,t,n,r){var i=t.current,o=Ct(),s=Ln(i);return n=Mp(n),t.context===null?t.context=n:t.pendingContext=n,t=bn(o,s),t.payload={element:e},r=r===void 0?null:r,r!==null&&(t.callback=r),e=qn(i,t,s),e!==null&&(sn(e,i,s,o),$o(e,i,s)),s}function is(e){if(e=e.current,!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function id(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var n=e.retryLane;e.retryLane=n!==0&&n<t?n:t}}function xc(e,t){id(e,t),(e=e.alternate)&&id(e,t)}function Zg(){return null}var qp=typeof reportError=="function"?reportError:function(e){console.error(e)};function Sc(e){this._internalRoot=e}bs.prototype.render=Sc.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(ue(409));ws(e,t,null,null)};bs.prototype.unmount=Sc.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;ui(function(){ws(null,e,null,null)}),t[xn]=null}};function bs(e){this._internalRoot=e}bs.prototype.unstable_scheduleHydration=function(e){if(e){var t=gf();e={blockedOn:null,target:e,priority:t};for(var n=0;n<Rn.length&&t!==0&&t<Rn[n].priority;n++);Rn.splice(n,0,e),n===0&&wf(e)}};function Nc(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function vs(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function rd(){}function Jg(e,t,n,r,i){if(i){if(typeof r=="function"){var o=r;r=function(){var c=is(s);o.call(c)}}var s=_p(t,r,e,0,null,!1,!1,"",rd);return e._reactRootContainer=s,e[xn]=s.current,jr(e.nodeType===8?e.parentNode:e),ui(),s}for(;i=e.lastChild;)e.removeChild(i);if(typeof r=="function"){var a=r;r=function(){var c=is(l);a.call(c)}}var l=kc(e,0,!1,null,null,!1,!1,"",rd);return e._reactRootContainer=l,e[xn]=l.current,jr(e.nodeType===8?e.parentNode:e),ui(function(){ws(t,l,n,r)}),l}function ks(e,t,n,r,i){var o=n._reactRootContainer;if(o){var s=o;if(typeof i=="function"){var a=i;i=function(){var l=is(s);a.call(l)}}ws(t,s,e,i)}else s=Jg(n,t,e,i,r);return is(s)}hf=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var n=fr(t.pendingLanes);n!==0&&(Bl(t,n|1),Dt(t,st()),!(We&6)&&(Vi=st()+500,Vn()))}break;case 13:ui(function(){var r=Sn(e,1);if(r!==null){var i=Ct();sn(r,e,1,i)}}),xc(e,1)}};zl=function(e){if(e.tag===13){var t=Sn(e,134217728);if(t!==null){var n=Ct();sn(t,e,134217728,n)}xc(e,134217728)}};mf=function(e){if(e.tag===13){var t=Ln(e),n=Sn(e,t);if(n!==null){var r=Ct();sn(n,e,t,r)}xc(e,t)}};gf=function(){return He};yf=function(e,t){var n=He;try{return He=e,t()}finally{He=n}};Ha=function(e,t,n){switch(t){case"input":if(qa(e,n),t=n.name,n.type==="radio"&&t!=null){for(n=e;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+t)+'][type="radio"]'),t=0;t<n.length;t++){var r=n[t];if(r!==e&&r.form===e.form){var i=ds(r);if(!i)throw Error(ue(90));Vd(r),qa(r,i)}}}break;case"textarea":Qd(e,n);break;case"select":t=n.value,t!=null&&Pi(e,!!n.multiple,t,!1)}};nf=yc;rf=ui;var ey={usingClientEntryPoint:!1,Events:[Vr,Yi,ds,ef,tf,yc]},sr={findFiberByHostInstance:ti,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},ty={bundleType:sr.bundleType,version:sr.version,rendererPackageName:sr.rendererPackageName,rendererConfig:sr.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:$n.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=af(e),e===null?null:e.stateNode},findFiberByHostInstance:sr.findFiberByHostInstance||Zg,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var yo=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!yo.isDisabled&&yo.supportsFiber)try{as=yo.inject(ty),dn=yo}catch{}}Bt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=ey;Bt.createPortal=function(e,t){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Nc(t))throw Error(ue(200));return Xg(e,t,null,n)};Bt.createRoot=function(e,t){if(!Nc(e))throw Error(ue(299));var n=!1,r="",i=qp;return t!=null&&(t.unstable_strictMode===!0&&(n=!0),t.identifierPrefix!==void 0&&(r=t.identifierPrefix),t.onRecoverableError!==void 0&&(i=t.onRecoverableError)),t=kc(e,1,!1,null,null,n,!1,r,i),e[xn]=t.current,jr(e.nodeType===8?e.parentNode:e),new Sc(t)};Bt.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(ue(188)):(e=Object.keys(e).join(","),Error(ue(268,e)));return e=af(t),e=e===null?null:e.stateNode,e};Bt.flushSync=function(e){return ui(e)};Bt.hydrate=function(e,t,n){if(!vs(t))throw Error(ue(200));return ks(null,e,t,!0,n)};Bt.hydrateRoot=function(e,t,n){if(!Nc(e))throw Error(ue(405));var r=n!=null&&n.hydratedSources||null,i=!1,o="",s=qp;if(n!=null&&(n.unstable_strictMode===!0&&(i=!0),n.identifierPrefix!==void 0&&(o=n.identifierPrefix),n.onRecoverableError!==void 0&&(s=n.onRecoverableError)),t=_p(t,null,e,1,n??null,i,!1,o,s),e[xn]=t.current,jr(e),r)for(e=0;e<r.length;e++)n=r[e],i=n._getVersion,i=i(n._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[n,i]:t.mutableSourceEagerHydrationData.push(n,i);return new bs(t)};Bt.render=function(e,t,n){if(!vs(t))throw Error(ue(200));return ks(null,e,t,!1,n)};Bt.unmountComponentAtNode=function(e){if(!vs(e))throw Error(ue(40));return e._reactRootContainer?(ui(function(){ks(null,null,e,!1,function(){e._reactRootContainer=null,e[xn]=null})}),!0):!1};Bt.unstable_batchedUpdates=yc;Bt.unstable_renderSubtreeIntoContainer=function(e,t,n,r){if(!vs(n))throw Error(ue(200));if(e==null||e._reactInternals===void 0)throw Error(ue(38));return ks(e,t,n,!1,r)};Bt.version="18.3.1-next-f1338f8080-20240426";function Fp(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Fp)}catch(e){console.error(e)}}Fp(),qd.exports=Bt;var ny=qd.exports,Lp,od=ny;Lp=od.createRoot,od.hydrateRoot;const sd=[],iy=(e,t)=>{sd.push(Object.freeze([...e]));let n=!1;const r=()=>{n||(n=!0,sd.pop())};try{const i=t();return i!==null&&typeof i=="object"&&typeof i.then=="function"?i.then(o=>(r(),o),o=>{throw r(),o}):(r(),i)}catch(i){throw r(),i}};class Qe extends Error{constructor(n){super(oy(n));Qn(this,"diagnostics");this.name="BotscriptError",this.diagnostics=n}}function ry(e){const t=e.file?`${e.file}:${e.line}:${e.column}`:`line ${e.line}:${e.column}`,r=[`botscript[${e.code}]: ${e.message} (${t})`];return e.rule&&r.push(`  Rule:    ${e.rule}`),e.idiom&&r.push(`  Idiom:   ${e.idiom}`),e.rewrite&&r.push(`  Rewrite: ${e.rewrite}`),r.join(`
`)}function oy(e){return e.map(ry).join(`

`)}const sy={ALI001:{code:"ALI001",title:"stdlib namespace aliased via a non-trivial expression — alias not tracked",rule:"a module-level `const <name> = <stdlib>` binding is only statically tracked when the RHS is a direct namespace reference; operator expressions, member accesses, calls, and other non-trivial forms are left on the canonical-name tripwire — capability checks (CAP001/CAP002), body-level intent checks (INT002/INT004), and UNS005 will not see the alias",idiom:"use a direct binding (`const t = time`) to alias a stdlib namespace; reference the canonical name directly in all other cases",rewrite:`// option A — use a direct binding:
const <name> = <stdlib>

// option B — remove the alias and use the canonical name directly:
// (reference '<stdlib>' wherever you used '<name>')`,example:`// before — non-trivial RHS; alias not tracked; ALI001 fires
const t = time.now

// after — direct binding; alias is tracked
const t = time
`},ALI002:{code:"ALI002",title:"alias-of-alias chain — const x = t (where t is a stdlib alias) is not tracked",rule:"chain aliases are not transitively tracked: `const t = time` adds `t` to the alias map, but `const x = t` does NOT add `x` — capability checks (CAP001/CAP002), body-level intent checks (INT002/INT004), and UNS005 will not see `x` as a `time` reference",idiom:"use a direct binding (`const x = time`) to alias a stdlib namespace; avoid aliasing existing aliases",rewrite:`// option A — bind directly to the stdlib namespace:
const x = time

// option B — remove x and use the canonical name (or the tracked alias) directly`,example:`// before — chain alias; x is not tracked; ALI002 fires
const t = time
const x = t

// after — direct binding; x is tracked
const x = time
`},ALI003:{code:"ALI003",title:"stdlib namespace destructuring — extracted member references are not tracked",rule:"object-destructuring a stdlib namespace (`const { now } = time`) produces bare ident references that no static check follows — capability checks (CAP001/CAP002), body-level intent checks (INT002/INT004), and UNS005 will not see the extracted member as a `time` reference; use a direct namespace binding or the canonical name directly; warning at ?bs 0.8, error (blocking) at ?bs 0.9+ — no defensible use case exists",idiom:"use a direct binding (`const t = time`) and call `t.now()` rather than destructuring `time`",rewrite:`// option A — direct namespace binding:
const t = time
// ... then call t.now() instead of now()

// option B — use the canonical namespace directly:
// call time.now() instead of destructuring`,example:`// before — destructuring; now() is not tracked; ALI003 fires
const { now } = time

// after — direct binding; t.now() is tracked
const t = time
`},CAP001:{code:"CAP001",title:"function calls a stdlib namespace whose capability is not declared",rule:"every fn must declare in its `uses { ... }` clause every capability it (or its callees) consume",idiom:"declare every capability the function consumes; pure helpers stay pure",rewrite:"fn name(...) uses { …existing, missing } -> ...",example:`// before
fn now() -> number = pure { time.now() }

// after
fn now() uses { time } -> number = pure { time.now() }`},CAP002:{code:"CAP002",title:"function over-declares a capability it never reaches",rule:"a function may not declare a capability it does not transitively consume — declarations must match reality",idiom:"declarations are the upper bound the compiler infers; remove caps that nothing in the body uses",rewrite:"fn name(...) uses { …only the caps actually used } -> ...",example:`// before
fn slug(s: string) uses { net } -> string = pure { s.toLowerCase() }

// after
fn slug(s: string) -> string = pure { s.toLowerCase() }`},CAP003:{code:"CAP003",title:"capability declared inside unsafe fn — asserted, not proven",rule:"a `uses {}` declaration on an `unsafe fn` is programmer-asserted, not compiler-proven: the capability inference pass still runs on the visible body, but an unsafe fn can contain `as` casts that alias stdlib namespaces, bypassing name-based detection",idiom:"treat a CAP003-tagged capability claim as advisory rather than verified — callers and audit tooling should note the asserted provenance; if the function is the canonical safe adapter for a capability, document it in the unsafe reason",rewrite:"// no rewrite needed — this is a warning; suppress by removing uses {} if the body has no visible stdlib calls",example:`// CAP003 fires: unsafe fn with a uses {} claim
?bs 0.9
unsafe "wraps external http client" fn callApi(url: string) uses { net } -> string {
  http.get(url)  // warning: claim is asserted, not proven
}

// No CAP003: regular fn with the same claim is compiler-verified
?bs 0.9
fn callApi(url: string) uses { net } -> Result<string, string> {
  match http.get(url) {
    ok { value } -> ok(value)
    err { error } -> err(\`fetch failed: \${error}\`)
  }
}`},UNS001:{code:"UNS001",title:"unsafe block missing justification string",rule:"an `unsafe` block must carry a non-empty string literal explaining why the escape hatch is acceptable here",idiom:"every cast/escape hatch in a diff carries a one-line reason — the next reviewer sees the why, not just the what",rewrite:'unsafe "<short reason>" { <body> }',example:`// before
unsafe { return value as User }

// after
unsafe "third-party lib types \`Response\` as any" { return value as User }`},UNS002:{code:"UNS002",title:"unsafe block or fn declaration with an empty justification",rule:"the justification on an `unsafe` block or `unsafe fn` declaration must be a non-empty string — the empty string is not a reason",idiom:"if you cannot articulate the reason in one sentence, the cast or declaration probably should not be made",rewrite:'unsafe "<short reason>" { <body> }  or  unsafe "<short reason>" fn <name>(...) -> T { ... }',example:`// before
unsafe "" { return value as User }

// after
unsafe "Response.json() returns any" { return value as User }`},UNS003:{code:"UNS003",title:"unsafe block has no body",rule:'an `unsafe` block must be followed by `{ ... }` — the form is `unsafe "<reason>" { <body> }`',idiom:"the body of an unsafe block scopes the escape hatch as narrowly as possible",rewrite:'unsafe "<short reason>" { <body> }',example:`// before
unsafe "fix me later"

// after
unsafe "Response.json() returns any" { return value as User }`},UNS004:{code:"UNS004",title:"bare `as` cast outside unsafe block or unsafe fn body",rule:'every `as` is a claim the compiler cannot verify; from `?bs 0.5` it must be justified by a written reason inside an `unsafe "<reason>" { ... }` block or an `unsafe "<reason>" fn` declaration body',idiom:'wrap the cast in `unsafe "<reason>" { ... }` or declare the containing function as `unsafe "<reason>" fn`; the reason becomes the review record on the cast',rewrite:'unsafe "<short reason>" { <expr> as <type> }  or  unsafe "<short reason>" fn <name>(...) -> T { ... }',example:`// before
?bs 0.5
const u = data as User;

// after
?bs 0.5
const u = unsafe "Response.json() returns any" { data as User };`},UNS005:{code:"UNS005",title:"external call without declared result contract",rule:'a stdlib capability call (http.x, fs.x, time.x, etc.) must have a declared result contract at the call site — wrap in `match` to make success and failure paths explicit, use `unsafe "<reason>" { ... }` to accept the uncertainty with a written explanation, or declare the containing fn as `unsafe "<reason>" fn` when the entire body is the escape hatch',idiom:"prefer match over bare stdlib calls — `match ns.method(...)` makes both success and failure paths explicit; use `unsafe` only when you are certain about the shape and want to document why",rewrite:`match ns.method(...) {
  ok { value } -> { /* use value */ }
  err { error } -> { /* handle error */ }
}`,example:`// before — UNS005: no contract on what http.get returns
?bs 0.9
fn fetchUser(id: string) uses { net } -> string {
  const data = http.get(\`/users/\${id}\`);
  data
}

// after — result contract via match
?bs 0.9
fn fetchUser(id: string) uses { net } -> Result<string, string> {
  match http.get(\`/users/\${id}\`) {
    ok { value } -> ok(value)
    err { error } -> err(\`fetch failed: \${error}\`)
  }
}`},UNS006:{code:"UNS006",title:"@ts-ignore / @ts-expect-error bypasses TypeScript type checking",rule:"TypeScript suppression comments (`@ts-ignore`, `@ts-expect-error`) silence type errors on the next line without requiring a written reason or explicit escape-hatch annotation. A model that cannot satisfy the type system will reach for them rather than fixing the underlying problem, defeating botscript's safety net silently",idiom:'fix the underlying type error so no suppression is needed; if the type mismatch is unavoidable (e.g. third-party SDK returns `any`), wrap the offending statement in `unsafe "<reason>" { ... }` to make the escape hatch explicit and auditable',rewrite:`// before — silent suppression
// @ts-ignore
const user = data;

// after — explicit escape hatch with written justification
const user = unsafe "third-party SDK returns any; type verified at runtime" { data as User };`,example:`// before — UNS006: @ts-ignore silences the type error silently
?bs 0.9
fn getUser(data: unknown) -> User {
  // @ts-ignore
  return data;
}

// after — explicit unsafe wrapper with justification
?bs 0.9
fn getUser(data: unknown) -> User {
  unsafe "vendor response shape is User; validated at the ingress boundary" { data as User }
}`},UNS007:{code:"UNS007",title:"unsafe block body is a pure literal — escape hatch wraps nothing",rule:'an `unsafe "<reason>" { body }` expression block whose body contains only literal tokens (numbers, strings, booleans, null, undefined) and no identifier tokens at all has never justified anything: there is no `as` type cast and no stdlib capability call for the reason string to cover. Remove the wrapper',idiom:'a pure-literal body in an unsafe block is always a bug — either the author added the wrapper by mistake or the body was refactored into a literal and the wrapper was not removed. UNS007 catches this "born-stale" population; UNS008 catches the "decay-stale" population where idents remain but no bypass pattern does',rewrite:`// remove the unsafe wrapper entirely
// before
unsafe "reason" { 42 }
// after
42`,example:`// before — UNS007: pure literal body; unsafe block justifies nothing
?bs 0.9
const x = unsafe "magic number" { 42 };

// after — remove the unnecessary wrapper
?bs 0.9
const x = 42;`},UNS008:{code:"UNS008",title:"decay-stale unsafe block — body has no cast, capability call, or bypass pattern",rule:'an `unsafe "<reason>" { ... }` block must be necessary: its body must contain a pattern that the botscript checker suite would flag — an `as` type cast (UNS004), a stdlib capability call (UNS005), a `throw` statement (SYN002), a `console.*` call (SYN003), or any other bypass that requires the escape hatch. A block whose body has identifiers but none of the flagged patterns is decay-stale: it accumulates justification for a problem that no longer exists in the code',idiom:"an unsafe block decays when the code around it improves — the stdlib call gets wrapped in `match`, the cast moves upstream, the throw becomes a Result return. The body keeps its variable references but loses the actual bypass; UNS008 catches this population that UNS007 (pure literals) misses",rewrite:`// remove the unsafe wrapper; the body no longer triggers any botscript diagnostic
// before
unsafe "reason" { variable }
// after
variable`,example:`// before — UNS008: body has idents but no cast or capability call
?bs 0.9
const value = unsafe "data is string" { payload };

// after — remove the now-unnecessary unsafe wrapper
?bs 0.9
const value = payload;`},UNS009:{code:"UNS009",title:"unsafe reason string is too weak to justify the escape hatch",rule:'the `unsafe "<reason>"` justification string must be informative: it must describe why the escape hatch is needed, what it bypasses, and ideally who owns the risk. Empty strings, whitespace-only strings, and known-weak single-word deferrals ("TODO", "legacy", "temp", "temporary", "workaround", "fixme", "hack", "ignore", "wip") do not meet this bar — they record that someone pressed through the gate, not why',idiom:'write a reason that names the bypass and its owner: "third-party SDK returns `any`; upstream issue #42" > "TODO". The reason string is the audit trail — a reviewer who reads it six months later should be able to decide whether the bypass is still warranted',rewrite:`// replace the weak reason with a specific justification
// before
unsafe "TODO" { http.get(url) }
// after
unsafe "http.get returns untyped Response; match below handles ok/err" { http.get(url) }`,example:`// before — UNS009: reason string is too weak
?bs 0.9
const resp = unsafe "TODO" { http.get(url) };

// after — specific justification
?bs 0.9
const resp = unsafe "http.get returns untyped Response; caller match-handles" { http.get(url) };`},FMT001:{code:"FMT001",title:"source is not in canonical form",rule:"every botscript program has exactly one canonical surface form (RFC #13); from `?bs 0.4` on, the compiler rejects non-canonical input rather than silently accepting whitespace variants",idiom:"run `botscript fmt <file> --write` once; from then on the source is canonical and compiles cleanly",rewrite:"botscript fmt <file> --write",example:`// before — multi-space directive, alignment padding, trailing whitespace
?bs   0.4
fn add(a: number, b: number) -> number   =   a + b   

// after — canonical
?bs 0.4
fn add(a: number, b: number) -> number = a + b`},INT001:{code:"INT001",title:"intent declares 'pure' but function has capability, resource, or throws declarations",rule:"a function whose intent contains 'pure' must have no capability declarations (uses {}) — from ?bs 0.8, it must also have no read/write resource dependencies (reads {} / writes {}) — from ?bs 0.9, it must also have no non-empty throws {} declaration — pure functions are deterministic, side-effect-free, and should use Result<T, E> for errors",idiom:"remove the conflicting header clauses (uses {}, reads {} / writes {} at ?bs 0.8+, throws {} at ?bs 0.9+) from a pure function, or change the intent to reflect the actual behaviour",rewrite:`// option A — remove conflicting annotations:
fn name(args) intent: "pure" -> type = ...

// option B — remove the intent claim:
fn name(args) uses { caps } reads { ... } writes { ... } throws { ... } -> type = ...

// option C — replace throws with Result (preferred for pure fns):
fn name(args) intent: "pure" -> Result<type, ErrorType> = ...`,example:`// before — intent says pure, but function can throw
?bs 0.9
fn parseId(raw: string) intent: "pure" throws { ParseError } -> string {
  if (!raw.match(/^[a-z]+$/)) throw new ParseError("invalid")
  return raw
}

// after — use Result instead of throws
?bs 0.9
fn parseId(raw: string) intent: "pure" -> Result<string, ParseError> {
  if (!raw.match(/^[a-z]+$/)) { const e = new ParseError("invalid"); return err(e) }
  return ok(raw)
}`},INT002:{code:"INT002",title:"intent declares 'pure' but function body uses a capability",rule:'a function declaring intent: "pure" must not directly reference any stdlib capability in its body — the pure claim means deterministic and side-effect-free',idiom:"move the capability usage out of the pure fn, or change the intent to reflect the actual behaviour",rewrite:`// option A — remove the capability call from the body:
fn name(args) intent: "pure" -> type = pure { ... }

// option B — remove the pure intent claim:
fn name(args) uses { cap } -> type = ...`,example:`// before — fn says pure but body calls http.get
?bs 0.7
fn fetchUser(id: string) intent: "pure" -> string {
  return http.get("/users/" + id);
}

// after — remove pure claim and declare the capability
?bs 0.7
fn fetchUser(id: string) uses { net } -> string {
  return http.get("/users/" + id);
}`},INT003:{code:"INT003",title:"intent declares 'idempotent' but function uses a non-idempotent capability",rule:"a function whose intent contains 'idempotent' must not declare `random` or `time` in its `uses {}` — random and time capabilities produce different values on each call, making the function non-idempotent; only `random` and `time` are flagged as inherently non-idempotent — other capabilities are not structurally flagged by this check",idiom:"idempotent = safe to retry; `random` and `time` are inherently non-idempotent — remove them from `uses {}` or change the intent",rewrite:`// option A — remove the non-idempotent capability (keep any other caps):
fn name(args) uses { …other-caps } intent: "idempotent" -> type = ...

// option B — remove the idempotent intent claim (preserve all caps, including
// the non-idempotent one alongside any others):
fn name(args) uses { …other-caps, time } -> type = ...   // or \`uses { …other-caps, random }\``,example:`// before — fn claims idempotent but uses time (non-idempotent); INT003 fires
?bs 0.7
fn expireAt(ttl: number) uses { time } intent: "idempotent" -> number = time.now() + ttl

// after — remove the idempotent claim (fn has time-dependent output)
?bs 0.7
fn expireAt(ttl: number) uses { time } -> number = time.now() + ttl`},INT004:{code:"INT004",title:"intent declares 'idempotent' but function body directly calls a non-idempotent capability",rule:'a function declaring intent: "idempotent" must not directly reference `random` or `time` in its body — these stdlib namespaces produce different values on each invocation, making any function that uses them non-idempotent',idiom:"move the non-idempotent call out of the idempotent fn, or change the intent to reflect the actual behaviour",rewrite:`// option A — remove the non-idempotent call from the body:
fn name(args) intent: "idempotent" -> type = ...

// option B — declare the capability and remove the idempotent intent claim
// (preserve any other existing capabilities alongside the non-idempotent one):
fn name(args) uses { …other-caps, random } -> type = ...   // or \`uses { …other-caps, time }\``,example:`// before — fn claims idempotent but body calls random.next; INT004 fires
?bs 0.7
fn generateId(prefix: string) intent: "idempotent" -> string = prefix + random.next()

// after — remove the idempotent claim and declare the capability
?bs 0.7
fn generateId(prefix: string) uses { random } -> string = prefix + random.next()`},INT005:{code:"INT005",title:"intent declares 'idempotent' but function declares writes {}",rule:'a function declaring intent: "idempotent" must not declare `writes { ... }` — a fn that mutates a resource produces different observable side effects on each call, making it structurally non-idempotent regardless of input',idiom:"remove the writes declaration if the fn does not actually mutate the resource, or change the intent to reflect the actual behaviour",rewrite:`// option A — remove the writes declaration if the fn does not mutate:
fn name(args) intent: "idempotent" -> type = ...

// option B — remove the idempotent intent claim (keep writes):
fn name(args) writes { label } -> type = ...`,example:`// before — fn claims idempotent but declares writes { auditLog }; INT005 fires
?bs 0.9
fn recordAttempt(id: string) intent: "idempotent" writes { auditLog } -> void { }

// after — remove the idempotent claim (the fn mutates state, so it is not idempotent)
?bs 0.9
fn recordAttempt(id: string) writes { auditLog } -> void { }`},INT006:{code:"INT006",title:"intent declares 'total' but function declares throws {}",rule:'a function declaring intent: "total" must not declare `throws { ... }` — a total function handles all inputs and never propagates exceptions to callers; declaring throws {} contradicts that guarantee',idiom:"use Result<T, E> for fallible total functions — the error is part of the return type, not an exception channel; callers can then exhaustively match without worrying about uncaught throws",rewrite:`// option A — remove throws {} and convert to Result (preferred for total fns):
fn name(args) intent: "total" -> Result<T, ErrorType> { ... }

// option B — remove the total intent claim (keep throws {}):
fn name(args) throws { ErrorType } -> T { ... }`,example:`// before — fn claims total but declares throws { ParseError }; INT006 fires
?bs 0.9
fn parseHex(s: string) intent: "total" throws { ParseError } -> number {
  // ...
}

// after — remove throws, return Result so callers can exhaustively match
?bs 0.9
fn parseHex(s: string) intent: "total" -> Result<number, ParseError> {
  // ...
}`},INT007:{code:"INT007",title:"intent declares 'total' but function body calls a same-file callee that throws",rule:'a function declaring intent: "total" must not call same-file functions that declare `throws { ... }` without catching those exceptions — a total function handles all error paths and never propagates exceptions to callers; calling a throwing callee without a try/catch re-opens the exception channel the total claim is supposed to close',idiom:"wrap the call in a try/catch and convert the caught exception to a Result variant, or replace the call with a non-throwing alternative that returns Result<T, E>; the total claim means every error path is encoded in the return type, not the exception channel",rewrite:`// option A — catch the exception and convert to Result (preferred for total fns):
fn name(args) intent: "total" -> Result<T, CalledError> {
  try {
    const v = callee()
    return ok(v)
  } catch (e) {
    return err(new CalledError(e))
  }
}

// option B — use a non-throwing variant of the callee:
fn name(args) intent: "total" -> Result<T, E> {
  return calleeResult()  // returns Result<T, CalledError> instead of throwing
}

// option C — remove the total intent claim:
fn name(args) throws { CalledError } -> T {
  return callee()
}`,example:`// before — fn claims total but calls validate() which throws { ValidationError }; INT007 fires
?bs 0.9
fn validateAndParse(s: string) intent: "total" -> Result<number, ParseError> {
  validate(s)  // throws { ValidationError } — INT007
  return parseNum(s)
}

// after — catch the exception, encode in Result
?bs 0.9
fn validateAndParse(s: string) intent: "total" -> Result<number, ParseError | ValidationError> {
  try {
    validate(s)
    return parseNum(s)
  } catch (e) {
    return err(new ValidationError(String(e)))
  }
}`},INT008:{code:"INT008",title:"intent declares 'infallible' but return type exposes a failure path",rule:'a function declaring intent: "infallible" must not return Result<T, E> or Option<T> — those types carry a failure arm (err / none) that callers must handle, contradicting the infallible guarantee; an infallible fn always produces a plain success value',idiom:'use a plain return type (e.g. string, number, T) instead of Result<> or Option<>; if the fn can genuinely fail, use intent: "total" with a Result<T, E> return instead — total handles all inputs and returns success-or-failure in the type, which is weaker than infallible',rewrite:`// option A — unwrap to a plain type (fn truly never fails):
fn name(args) intent: "infallible" -> T { ... }

// option B — downgrade to total (fn may fail but always returns):
fn name(args) intent: "total" -> Result<T, E> { ... }`,example:`// before — fn claims infallible but return type is Result<string, ParseError>; INT008 fires
?bs 0.9
fn defaultName(raw: string) intent: "infallible" -> Result<string, ParseError> {
  return ok(raw.trim() || "unnamed")  // INT008
}

// after option A — plain return type matches the infallible claim
?bs 0.9
fn defaultName(raw: string) intent: "infallible" -> string {
  return raw.trim() || "unnamed"
}

// after option B — downgrade to total if failure path is real
?bs 0.9
fn defaultName(raw: string) intent: "total" -> Result<string, ParseError> {
  return ok(raw.trim() || "unnamed")
}`},INT009:{code:"INT009",title:"intent declares 'infallible' but function declares throws {}",rule:'a function declaring intent: "infallible" must not declare `throws { ... }` — throwing an exception is a failure that escapes the fn\'s boundary, contradicting the infallible guarantee; an infallible fn never propagates an exception to its caller',idiom:'remove the throws {} clause and encode failure in the return type using Result<T, E>, then downgrade the intent claim to "total" (always returns, may return err); if the fn truly never fails, remove throws {} and keep intent: "infallible"',rewrite:`// option A — remove throws {} and return Result (downgrade to total):
fn name(args) intent: "total" -> Result<type, ErrType> { ... }

// option B — remove throws {} if the fn truly never propagates exceptions:
fn name(args) intent: "infallible" -> type { ... }`,example:`// before — fn claims infallible but declares throws { ParseError }; INT009 fires
?bs 0.9
fn parse(s: string) intent: "infallible" throws { ParseError } -> number {
  return Number(s)  // INT009
}

// after option A — downgrade to total + Result
?bs 0.9
fn parse(s: string) intent: "total" -> Result<number, ParseError> {
  const n = Number(s)
  return isNaN(n) ? err(new ParseError(s)) : ok(n)
}

// after option B — remove throws {} if the fn won't throw
?bs 0.9
fn parse(s: string) intent: "infallible" -> number {
  return Number(s) || 0
}`},INT010:{code:"INT010",title:"intent declares 'infallible' but function body calls a same-file callee that throws",rule:'a function declaring intent: "infallible" must not call same-file functions that declare `throws { ... }` without catching those exceptions — a throwing callee can propagate an exception through the infallible fn\'s body, reopening a failure channel that the infallible claim is supposed to close',idiom:'wrap the throwing call in a try/catch and either suppress the exception (returning a default value) or encode it in a Result and downgrade the intent claim to "total"; alternatively, replace the call with a non-throwing variant',rewrite:`// option A — suppress the exception with a safe default (keeps infallible):
fn name(args) intent: "infallible" -> T {
  try {
    return callee()
  } catch {
    return defaultValue
  }
}

// option B — encode in Result and downgrade to total:
fn name(args) intent: "total" -> Result<T, CalledError> {
  try {
    return ok(callee())
  } catch (e) {
    return err(new CalledError(e))
  }
}

// option C — use a non-throwing variant of the callee:
fn name(args) intent: "infallible" -> T {
  return calleeSafe()  // returns T instead of throwing
}`,example:`// before — fn claims infallible but calls validate() which throws { ValidationError }; INT010 fires
?bs 0.9
fn validate(s: string) throws { ValidationError } -> string = s
fn process(s: string) intent: "infallible" -> string {
  return validate(s)  // INT010 — validate may throw
}

// after option A — catch and suppress, keep infallible guarantee
?bs 0.9
fn validate(s: string) throws { ValidationError } -> string = s
fn process(s: string) intent: "infallible" -> string {
  try {
    return validate(s)
  } catch {
    return ""
  }
}`},INT011:{code:"INT011",title:"intent declares 'pure' but function is async",rule:'a function declaring intent: "pure" must not be async — an async function always returns a Promise (two calls with identical arguments return distinct, non-equal objects) and suspends execution by yielding to the event loop, producing timing side effects; both properties contradict the pure guarantee of determinism and referential transparency',idiom:"remove the `async` keyword and any `await` expressions from the body, or downgrade the intent claim; if the function wraps a synchronous computation in a Promise purely as a calling convention, use `Promise.resolve(value)` from a sync body instead of `async`",rewrite:`// option A — make the function synchronous (preferred for pure fns):
fn name(args) intent: "pure" -> T {
  return compute(args)  // sync, no await
}

// option B — remove the pure claim and keep async:
async fn name(args) -> Promise<T> {
  return await compute(args)
}

// option C — if you must return a Promise from a sync computation:
fn name(args) intent: "pure" -> Promise<T> {
  return Promise.resolve(compute(args))  // sync body, no timing side effects
}`,example:`// before — fn claims pure but is declared async; INT011 fires
?bs 0.9
async fn slugify(s: string) intent: "pure" -> Promise<string> {
  return s.toLowerCase().replace(/ /g, "-")
}

// after option A — synchronous, genuinely pure
?bs 0.9
fn slugify(s: string) intent: "pure" -> string {
  return s.toLowerCase().replace(/ /g, "-")
}`},INT012:{code:"INT012",title:"intent declares 'pure' but body calls a same-file fn that declares uses {}",rule:'a function declaring intent: "pure" must not call other functions that carry capability declarations (`uses { ... }`) — those callees consume external resources, so the caller inherits their side effects even without declaring them directly; the pure claim requires that the entire transitive call closure is free of external resource use',idiom:"either remove the call to the capability-bearing callee and replace it with a pure computation, pass the callee's return value in as a parameter (dependency injection), or remove the pure intent claim from this function",rewrite:`// option A — inject the computed value as a parameter (preferred):
fn name(args, precomputedValue: T) intent: "pure" -> R {
  return compute(args, precomputedValue)  // no longer calls callee with uses {}
}

// option B — remove the pure intent claim:
fn name(args) uses { cap } -> R {
  const v = callee(args)  // callee declares uses { cap }
  return compute(v)
}

// option C — remove the call and compute inline without capabilities:
fn name(args) intent: "pure" -> R {
  return compute(args)  // pure body, no callee with uses {}
}`,example:`// before — fn claims pure but calls getTimestamp() which uses { time }; INT012 fires
?bs 0.9
fn getTimestamp() uses { time } -> number = time.now()

fn buildKey(id: string) intent: "pure" -> string {
  const ts = getTimestamp()  // INT012: callee declares uses { time }
  return id + ":" + ts
}

// after option A — inject the timestamp as a parameter
?bs 0.9
fn buildKey(id: string, ts: number) intent: "pure" -> string {
  return id + ":" + ts  // pure: no callee with uses {}
}`},INT013:{code:"INT013",title:"intent declares 'idempotent' but body calls a same-file fn that declares uses { random } or uses { time }",rule:'a function declaring intent: "idempotent" must not call other functions that carry `random` or `time` capability declarations — those callees produce different values on each call, so the outer fn inherits non-idempotent behaviour by transitivity even when it declares no non-idempotent capabilities itself',idiom:"call the non-idempotent callee before the idempotent fn and pass its return value in as a parameter (dependency injection), or remove the idempotent intent claim",rewrite:`// option A — inject the computed value as a parameter (preferred):
fn name(args, precomputed: T) intent: "idempotent" -> R {
  return compute(args, precomputed)  // no longer calls non-idempotent callee
}

// option B — remove the idempotent intent claim:
fn name(args) uses { random } -> R {
  const v = callee(args)  // callee declares uses { random }
  return compute(v)
}`,example:`// before — fn claims idempotent but calls timestamp() which uses { time }; INT013 fires
?bs 0.9
fn timestamp() uses { time } -> number = time.now()

fn tag(id: string) intent: "idempotent" -> string {
  return id + "-" + timestamp()  // INT013: callee declares uses { time }
}

// after option A — inject the timestamp as a parameter
?bs 0.9
fn tag(id: string, ts: number) intent: "idempotent" -> string {
  return id + "-" + ts  // idempotent: same inputs → same output
}`},INT015:{code:"INT015",title:"intent declares 'idempotent' but body calls a same-file fn that declares writes { }",rule:'a function declaring intent: "idempotent" must not call other functions that carry `writes { ... }` declarations — a callee that mutates a resource makes the caller non-idempotent by transitivity (repeated calls produce different side effects) even when the caller itself declares no writes {} and INT005 does not fire',idiom:"refactor so the write happens outside the idempotent boundary, or remove the idempotent intent claim and declare writes {} on the outer fn to surface the effect to callers",rewrite:`// option A — move the write outside the idempotent fn boundary:
fn persist(data: Data) writes { db } -> void = db.save(data)

fn computeAndStore(input: Input) writes { db } -> void {
  const result = transform(input)  // idempotent: no writes, no callee writes
  persist(result)                  // write happens outside the idempotent scope
}

// option B — remove the idempotent intent claim and declare writes on outer fn:
fn name(args) writes { db } -> R {
  return callee(args)  // callee declares writes { db }
}`,example:`// before — fn claims idempotent but calls persist() which writes { db }; INT015 fires
?bs 0.9
fn persist(data: string) writes { db } -> void = db.save(data)

fn process(raw: string) intent: "idempotent" -> void {
  persist(raw)  // INT015: callee declares writes { db }
}

// after option A — move write out of idempotent boundary
?bs 0.9
fn transform(raw: string) intent: "idempotent" -> string = raw.trim()

fn process(raw: string) writes { db } -> void {
  persist(transform(raw))  // transform is idempotent; persist is outside
}`},INT016:{code:"INT016",title:"intent declares 'pure' but body calls a same-file fn that declares reads { } or writes { }",rule:'a function declaring intent: "pure" must not call other functions that carry `reads { ... }` or `writes { ... }` declarations — a callee that reads external state makes the caller\'s output depend on that state (non-deterministic); a callee that writes external state introduces a side effect; both contradict the pure guarantee of referential transparency and determinism, even when the caller itself declares no reads {} or writes {} and INT001 does not fire',idiom:"inject the external value as a parameter so the pure fn receives it as a pure input, or remove the pure intent claim and declare the appropriate reads {} / writes {} on the outer fn to surface the effect to callers",rewrite:`// option A — inject the external value as a parameter (preferred):
fn load(id: string) reads { db } -> Record = db.find(id)

fn process(record: Record) intent: "pure" -> Summary {
  return summarize(record)  // pure: record is a parameter, not a live read
}

// call site: process(load(id))  — load() is separate, effect is explicit

// option B — remove the pure claim and surface the reads:
fn process(id: string) reads { db } -> Summary {
  const record = load(id)  // callee declares reads { db }
  return summarize(record)
}`,example:`// before — fn claims pure but calls load() which reads { db }; INT016 fires
?bs 0.9
fn load(id: string) reads { db } -> Record = db.find(id)

fn process(id: string) intent: "pure" -> Summary {
  const record = load(id)  // INT016: callee declares reads { db }
  return summarize(record)
}

// after option A — inject value as parameter, keep pure intent
?bs 0.9
fn load(id: string) reads { db } -> Record = db.find(id)

fn process(record: Record) intent: "pure" -> Summary = summarize(record)

// call site:
const summary = process(load(id))  // load at boundary; process remains pure`},INT017:{code:"INT017",title:"intent declares 'pure' but body calls a same-file fn declared async",rule:'a function declaring intent: "pure" must not call other functions that are declared `async` — an async callee yields to the event loop on every invocation (a timing side effect) and always returns a distinct Promise object, so two calls with identical arguments produce non-equal return values; both properties contradict the pure guarantee of determinism and referential transparency, even when the caller itself is synchronous and INT011 does not fire',idiom:"make the callee synchronous so the caller can remain pure, or extract the async call to the call site and inject the resolved value as a parameter, or remove the pure intent claim from the outer fn",rewrite:`// option A — make the callee synchronous (preferred when possible):
fn helper(...) -> T = compute(...)  // no async, no Promise

fn outer(...) intent: "pure" -> T = helper(...)

// option B — inject the resolved value as a parameter:
async fn fetchHelper(...) -> Promise<T> = await fetch(...)

fn outer(precomputed: T) intent: "pure" -> R {
  // use precomputed instead of calling fetchHelper
}

// call site: outer(await fetchHelper(...))

// option C — remove the pure claim and keep the async callee:
fn outer(...) -> R {
  const v = fetchHelper(...)
  return compute(v)
}`,example:`// before — fn claims pure but calls async helper(); INT017 fires
?bs 0.9
async fn helper(x: number) -> Promise<number> = x * 2

fn double(x: number) intent: "pure" -> Promise<number> {
  return helper(x)  // INT017: callee is async
}

// after option A — make helper synchronous, keep pure intent
?bs 0.9
fn helper(x: number) -> number = x * 2

fn double(x: number) intent: "pure" -> number = helper(x)`},INT014:{code:"INT014",title:"intent string contains a redundant claim that is already implied by a stronger claim",rule:"the botscript intent system has a subsumption hierarchy: 'pure' implies 'idempotent' (pure bans all uses, which is strictly stronger than idempotent's ban on random and time), and 'infallible' implies 'total' (infallible is total plus a no-Result-return constraint). declaring both a stronger and a weaker claim in the same intent string is redundant — the weaker claim adds no enforcement beyond what the stronger one already provides",idiom:"remove the weaker claim from the intent string and keep only the strongest claim",rewrite:`// before — redundant: 'pure' already implies 'idempotent'
fn name(...) intent: "pure idempotent" -> T = ...

// after — keep only the stronger claim
fn name(...) intent: "pure" -> T = ...

// before — redundant: 'infallible' already implies 'total'
fn parse(...) intent: "infallible total" -> T = ...

// after — keep only the stronger claim
fn parse(...) intent: "infallible" -> T = ...`,example:`// before — both 'pure' and 'idempotent' declared; INT014 fires on 'idempotent'
?bs 0.9
fn add(a: number, b: number) intent: "pure idempotent" -> number = a + b

// after — 'pure' alone is sufficient (subsumes idempotent)
?bs 0.9
fn add(a: number, b: number) intent: "pure" -> number = a + b`},INT018:{code:"INT018",title:"intent declares 'pure' but body calls a same-file fn that declares throws {}",rule:'a function declaring intent: "pure" must not call other functions that propagate exceptions — throwing an exception is a side effect (it alters control flow outside the fn boundary), and a pure fn may never produce side effects; even when the outer fn itself does not declare throws {}, calling a same-file callee that does reopens the exception channel by transitivity, violating the pure guarantee; this check fires only when INT001 and INT002 do not (no direct header or body conflict)',idiom:"wrap the throwing callee in a try/catch that converts the exception to a Result<T, E> return value, then return the Result from the pure fn; or use a non-throwing variant of the callee; or remove the pure intent claim if the fn's purpose requires exception propagation",rewrite:`// option A — catch the exception and return Result (preferred for pure fns):
fn outer(...) intent: "pure" -> Result<T, EType> {
  try {
    return ok(callee(...))
  } catch (e) {
    return err(new EType(e))
  }
}

// option B — use a non-throwing variant (if one exists):
fn outer(...) intent: "pure" -> Result<T, EType> = calleeSafe(...)

// option C — remove the pure claim if exception propagation is intentional:
fn outer(...) throws { EType } -> T = callee(...)`,example:`// before — fn claims pure but calls validate() which declares throws { ValidationError }; INT018 fires
?bs 0.9
fn validate(s: string) throws { ValidationError } -> void { ... }

fn process(s: string) intent: "pure" -> string {
  validate(s)  // INT018: callee declares throws { ValidationError }
  return s.trim()
}

// after option A — catch and return Result
?bs 0.9
fn validate(s: string) throws { ValidationError } -> void { ... }

fn process(s: string) intent: "pure" -> Result<string, ValidationError> {
  try {
    validate(s)
    return ok(s.trim())
  } catch (e) {
    return err(new ValidationError(e))
  }
}`},INT019:{code:"INT019",title:"intent declares 'idempotent' but body calls a same-file fn that is declared async",rule:'a function declaring intent: "idempotent" must not call other functions that are declared async — an async callee schedules microtasks on every invocation (a timing side effect) and always returns a distinct Promise object, so two calls with the same arguments produce different Promise instances and different event-loop schedules; repeating the outer call cannot guarantee the same observable outcome as a single call, violating the idempotent contract; this check fires only when INT003, INT004, INT005, INT013, and INT015 do not',idiom:"make the async callee synchronous if possible, or inject its resolved value as a parameter; if the async call is essential, remove the idempotent intent claim and explicitly model the retry/dedup logic at the call site instead of relying on the intent annotation",rewrite:`// option A — make the callee synchronous (preferred):
fn callee(...) -> T = compute(...)

fn outer(...) intent: "idempotent" -> R = callee(...)

// option B — inject the resolved value as a parameter:
fn outer(precomputed: T) intent: "idempotent" -> R {
  // use precomputed instead of calling the async callee
}

// call site: outer(await asyncCallee(...))

// option C — remove the idempotent claim:
fn outer(...) -> R {
  const v = asyncCallee(...)
  return compute(v)
}`,example:`// before — fn claims idempotent but calls fetchConfig() which is async; INT019 fires
?bs 0.9
async fn fetchConfig(key: string) uses { net } -> Promise<string> { ... }

fn getConfigValue(key: string) intent: "idempotent" -> Promise<string> {
  return fetchConfig(key)  // INT019: async callee introduces timing side effects
}

// after option A — make callee synchronous (use a sync cache lookup instead)
?bs 0.9
fn readCache(key: string) reads { config } -> string { ... }

fn getConfigValue(key: string) intent: "idempotent" reads { config } -> string {
  return readCache(key)
}`},INT020:{code:"INT020",title:"intent declares 'total' but body calls a same-file fn that is declared async",rule:'a synchronous function declaring intent: "total" must not call other functions that are declared async — an async callee always returns a Promise that can reject; if the sync total fn forwards that Promise to its caller without catching, any rejection becomes an unhandled Promise rejection that escapes the fn boundary, directly contradicting the total guarantee that no exception propagates to callers; this check fires only when the total fn itself is synchronous and INT006/INT007 do not',idiom:"a total fn's exception boundary is only as strong as its callees' exception surfaces; an async callee carries a hidden rejection path that a sync caller cannot observe or catch at the JS level; prefer synchronous callees, or wrap the async call with a Promise catch and convert to Result",rewrite:`// option A — use a synchronous callee (preferred):
fn callee(...) -> T = compute(...)

fn outer(...) intent: "total" -> T = callee(...)

// option B — remove the total intent claim and propagate the async boundary:
async fn outer(...) -> Promise<T> = asyncCallee(...)`,example:`// before — fn claims total but calls processAsync() which is async; INT020 fires
?bs 0.9
async fn processAsync(s: string) uses { net } -> Promise<string> { ... }

fn handle(s: string) intent: "total" -> Promise<string> {
  return processAsync(s)  // INT020: async callee can reject, escaping the total guarantee
}

// after option A — use a synchronous callee
?bs 0.9
fn process(s: string) -> string { ... }

fn handle(s: string) intent: "total" -> string = process(s)`},INT021:{code:"INT021",title:"intent declares 'infallible' but body calls a same-file fn that is declared async",rule:'a synchronous function declaring intent: "infallible" must not call other functions that are declared async — an async callee always returns a Promise that can reject; if the sync infallible fn forwards that Promise to its caller without catching, any rejection becomes an unhandled Promise rejection that escapes the fn boundary, directly contradicting the infallible guarantee that the fn never fails; this check fires only when the infallible fn itself is synchronous and INT008/INT009/INT010 do not',idiom:"an infallible fn's no-failure guarantee is only as strong as its callees' exception surfaces; an async callee carries a hidden rejection path that a sync caller cannot observe or catch at the JS level; prefer synchronous callees for infallible fns",rewrite:`// option A — use a synchronous callee (preferred):
fn callee(...) -> T = compute(...)

fn outer(...) intent: "infallible" -> T = callee(...)

// option B — downgrade intent claim:
fn outer(...) intent: "total" -> Promise<T> = asyncCallee(...)`,example:`// before — fn claims infallible but calls computeAsync() which is async; INT021 fires
?bs 0.9
async fn computeAsync(n: number) -> Promise<number> = Promise.resolve(n * 2)

fn double(n: number) intent: "infallible" -> Promise<number> {
  return computeAsync(n)  // INT021: async callee can reject, violating the infallible guarantee
}

// after option A — use a synchronous callee
?bs 0.9
fn computeSync(n: number) -> number = n * 2

fn double(n: number) intent: "infallible" -> number = computeSync(n)`},INT022:{code:"INT022",title:"intent declares 'idempotent' but the function declares throws {}",rule:'a function declaring intent: "idempotent" must not declare throws {} — an idempotent fn is safe to retry: multiple calls with the same arguments must produce the same observable outcome; declaring throws {} means the function can propagate exceptions, and whether it throws or returns depends on external state that may vary across calls; if the Nth retry throws while the first call succeeded, the observable outcome differs — the idempotent contract is broken; encode failure in the return type as Result<T, E> (the fn always returns a value, making retry outcomes structurally identical), or remove the idempotent intent claim',idiom:"idempotent fns must have a deterministic, exception-free return path; encode all failure cases in Result<T, E> so that every call — including retries — returns the same shape of value; the retry-safe boundary is the fn itself: it must always return, never throw",rewrite:`// option A — encode failure as Result (preferred for idempotent fns):
fn name(...) intent: "idempotent" -> Result<T, EType> {
  try {
    return ok(compute(...))
  } catch (e) {
    return err(new EType(e))
  }
}

// option B — remove the idempotent claim (keep throws {}):
fn name(...) throws { EType } -> T { ... }`,example:`// before — fn claims idempotent but declares throws { NetworkError }; INT022 fires
?bs 0.9
fn fetchUser(id: string) intent: "idempotent" throws { NetworkError } -> User {
  return http.get(\`/users/\${id}\`)  // INT022: throws {} contradicts idempotent guarantee
}

// after option A — encode failure as Result
?bs 0.9
fn fetchUser(id: string) intent: "idempotent" -> Result<User, NetworkError> {
  try {
    return ok(http.get(\`/users/\${id}\`))
  } catch (e) {
    return err(new NetworkError(e))
  }
}`},INT023:{code:"INT023",title:"intent declares 'idempotent' but body calls a same-file fn that declares throws {}",rule:`a function declaring intent: "idempotent" must not call other functions that can propagate exceptions — an idempotent fn is safe to retry: multiple calls with the same arguments must produce the same observable outcome; a callee that declares throws {} can fail on some calls and succeed on others depending on external state (network availability, resource contention, transient errors); if the callee throws on the Nth retry, the outer fn's observable outcome differs from the first call, violating the idempotent contract by transitivity; this check fires only when INT022 does not (no throws {} on the outer fn's own header)`,idiom:"wrap the throwing callee in a try/catch that converts the exception to a Result<T, E> return value; this makes the outer fn's return type structurally identical across retries — err() on failure, ok() on success — preserving the idempotent contract; or use a non-throwing variant of the callee",rewrite:`// option A — catch the exception and return Result (preferred for idempotent fns):
fn outer(...) intent: "idempotent" -> Result<T, EType> {
  try {
    return ok(callee(...))
  } catch (e) {
    return err(new EType(e))
  }
}

// option B — use a non-throwing variant (if one exists):
fn outer(...) intent: "idempotent" -> Result<T, EType> = calleeSafe(...)

// option C — remove the idempotent claim if exception propagation is intentional:
fn outer(...) throws { EType } -> T = callee(...)`,example:`// before — fn claims idempotent but calls validate() which declares throws { ValidationError }; INT023 fires
?bs 0.9
fn validate(s: string) throws { ValidationError } -> void { ... }

fn process(s: string) intent: "idempotent" -> string {
  validate(s)  // INT023: callee declares throws { ValidationError }
  return s.trim()
}

// after option A — catch and return Result
?bs 0.9
fn validate(s: string) throws { ValidationError } -> void { ... }

fn process(s: string) intent: "idempotent" -> Result<string, ValidationError> {
  try {
    validate(s)
    return ok(s.trim())
  } catch (e) {
    return err(new ValidationError(e))
  }
}`},INT024:{code:"INT024",title:"intent declares 'pure' but body calls an imported fn that declares throws {}",rule:'a function declaring intent: "pure" must not call imported functions that can propagate exceptions — throwing an exception is a side effect that escapes the fn boundary; a pure fn may never produce side effects, so calling an imported callee that declares throws {} makes the outer fn non-pure by transitivity even when the outer fn itself does not declare throws {} and INT001/INT018 do not fire; this check extends INT018 to cross-file callees visible via moduleEffects; this check fires only when INT001 and INT002 do not',idiom:"wrap the throwing import in a try/catch that converts the exception to a Result<T, E> return value; Result encodes failure in the return type instead of the exception channel, preserving the pure contract; or use a non-throwing variant of the imported callee",rewrite:`// option A — catch the exception and return Result (preferred):
fn name(...) intent: "pure" -> Result<T, EType> {
  try {
    return ok(importedFn(...))
  } catch (e) {
    return err(new EType(e))
  }
}

// option B — remove the pure claim:
fn name(...) throws { EType } -> T {
  return importedFn(...)
}`,example:`// before — fn claims pure but calls imported parse() which declares throws { ParseError }; INT024 fires
?bs 0.9
import { parse } from "./parser"  // parse declares throws { ParseError }

fn normalize(s: string) intent: "pure" -> string {
  return parse(s).value  // INT024: imported callee declares throws { ParseError }
}

// after option A — catch and return Result
?bs 0.9
fn normalize(s: string) intent: "pure" -> Result<string, ParseError> {
  try {
    return ok(parse(s).value)
  } catch (e) {
    return err(new ParseError(e))
  }
}`},INT025:{code:"INT025",title:"intent declares 'total' but body calls an imported fn that declares throws {}",rule:'a function declaring intent: "total" must not call imported functions that can propagate exceptions — a total function handles all inputs and never propagates exceptions to callers; calling an imported callee that declares throws {} re-opens the exception channel by transitivity, even when the outer fn itself does not declare throws {} and INT006/INT007 do not fire; this check extends INT007 to cross-file callees visible via moduleEffects',idiom:"wrap the throwing import in a try/catch and return Result<T, E>; this makes the outer fn total — it always returns a value; or use a non-throwing variant of the imported callee",rewrite:`// option A — catch the exception and return Result (preferred):
fn name(...) intent: "total" -> Result<T, EType> {
  try {
    return ok(importedFn(...))
  } catch (e) {
    return err(new EType(e))
  }
}

// option B — remove the total claim:
fn name(...) throws { EType } -> T {
  return importedFn(...)
}`,example:`// before — fn claims total but calls imported validate() which declares throws { ValidationError }; INT025 fires
?bs 0.9
import { validate } from "./validation"  // validate declares throws { ValidationError }

fn safeCheck(s: string) intent: "total" -> boolean {
  return validate(s)  // INT025: imported callee declares throws { ValidationError }
}

// after option A — catch and return Result
?bs 0.9
fn safeCheck(s: string) intent: "total" -> Result<boolean, ValidationError> {
  try {
    return ok(validate(s))
  } catch (e) {
    return err(new ValidationError(e))
  }
}`},INT026:{code:"INT026",title:"intent declares 'infallible' but body calls an imported fn that declares throws {}",rule:'a function declaring intent: "infallible" must not call imported functions that can propagate exceptions — an infallible fn always succeeds: it never throws and never returns an error value; calling an imported callee that declares throws {} violates the no-failure guarantee by transitivity, even when the outer fn itself does not declare throws {} and INT009/INT010 do not fire; this check extends INT010 to cross-file callees visible via moduleEffects; infallible ⊂ total — this check applies in addition to INT025',idiom:'wrap the throwing import in a try/catch and return Result<T, E> — then downgrade to intent: "total" since the fn now encodes failure; or provide a non-throwing variant of the imported callee that guarantees success so the infallible claim can be preserved',rewrite:`// option A — catch exception and return Result, downgrade to total:
fn name(...) intent: "total" -> Result<T, EType> {
  try {
    return ok(importedFn(...))
  } catch (e) {
    return err(new EType(e))
  }
}

// option B — use a non-throwing variant (preserve infallible):
fn name(...) intent: "infallible" -> T = importedFnSafe(...)

// option C — remove the infallible claim:
fn name(...) throws { EType } -> T = importedFn(...)`,example:`// before — fn claims infallible but calls imported load() which declares throws { IOError }; INT026 fires
?bs 0.9
import { load } from "./store"  // load declares throws { IOError }

fn getConfig() intent: "infallible" -> Config {
  return load("config")  // INT026: imported callee declares throws { IOError }
}

// after option A — catch and downgrade to total
?bs 0.9
fn getConfig() intent: "total" -> Result<Config, IOError> {
  try {
    return ok(load("config"))
  } catch (e) {
    return err(new IOError(e))
  }
}`},INT027:{code:"INT027",title:"intent declares 'idempotent' but body calls an imported fn that declares throws {}",rule:`a function declaring intent: "idempotent" must not call imported functions that can propagate exceptions — an idempotent fn is safe to retry: multiple calls with the same arguments must produce the same observable outcome; an imported callee that declares throws {} can fail on some calls and succeed on others depending on external state (network availability, resource contention, transient errors); if the imported callee throws on the Nth retry, the outer fn's observable outcome differs from the first call, violating the idempotent contract by transitivity; this check extends INT023 to cross-file callees visible via moduleEffects; this check fires only when INT022 does not (no throws {} on the outer fn's own header)`,idiom:"wrap the throwing import in a try/catch that converts the exception to a Result<T, E> return value; Result makes every call return the same shape — err() on failure, ok() on success — preserving the idempotent contract across retries; or use a non-throwing variant of the imported callee",rewrite:`// option A — catch the exception and return Result (preferred for idempotent fns):
fn outer(...) intent: "idempotent" -> Result<T, EType> {
  try {
    return ok(importedFn(...))
  } catch (e) {
    return err(new EType(e))
  }
}

// option B — use a non-throwing variant (if one exists):
fn outer(...) intent: "idempotent" -> Result<T, EType> = importedFnSafe(...)

// option C — remove the idempotent claim if exception propagation is intentional:
fn outer(...) throws { EType } -> T = importedFn(...)`,example:`// before — fn claims idempotent but calls imported fetch() which declares throws { NetworkError }; INT027 fires
?bs 0.9
import { fetchUser } from "./api"  // fetchUser declares throws { NetworkError }

fn loadUser(id: string) intent: "idempotent" -> User {
  return fetchUser(id)  // INT027: imported callee declares throws { NetworkError }
}

// after option A — catch and return Result
?bs 0.9
fn loadUser(id: string) intent: "idempotent" -> Result<User, NetworkError> {
  try {
    return ok(fetchUser(id))
  } catch (e) {
    return err(new NetworkError(e))
  }
}`},INT028:{code:"INT028",title:"intent declares 'pure' but body calls an imported fn that declares uses {}",rule:'a function declaring intent: "pure" must not call imported functions that declare capability requirements — capabilities (network I/O, filesystem, time, random, …) are side effects; a callee that declares uses { cap } exercises that capability on every call, making the caller non-pure by transitivity even when the caller declares no capability itself; this check extends INT012 to cross-file callees visible via moduleEffects; this check fires only when INT001 and INT002 do not',idiom:"inject the callee's return value as a parameter to break the capability dependency, or lift the capability declaration to the outer fn and remove the pure intent claim",rewrite:`// option A — inject the computed value as a parameter (preferred):
fn outer(precomputed: T) intent: "pure" -> R {
  // use precomputed instead of calling the imported fn
}

// option B — remove the pure intent claim and declare the capability:
fn outer(...) uses { cap } -> R {
  const v = importedFn(...)
  return compute(v)
}`,example:`// before — fn claims pure but calls imported fetchEnv() which declares uses { env }; INT028 fires
?bs 0.9
import { fetchEnv } from "./env"  // fetchEnv declares uses { env }

fn buildUrl(path: string) intent: "pure" -> string {
  return fetchEnv("BASE_URL") + path  // INT028: imported callee declares uses { env }
}

// after option A — inject the base URL as a parameter
?bs 0.9
fn buildUrl(baseUrl: string, path: string) intent: "pure" -> string {
  return baseUrl + path
}`},INT029:{code:"INT029",title:"intent declares 'pure' but body calls an imported fn that declares reads {} or writes {}",rule:`a function declaring intent: "pure" must not call imported functions that declare reads {} or writes {} — a callee that reads external state makes the caller's output depend on ambient state (non-deterministic); a callee that writes external state introduces a side effect; both contradict the pure guarantee of determinism and referential transparency by transitivity; this check extends INT016 to cross-file callees visible via moduleEffects; this check fires only when INT001 and INT002 do not`,idiom:"inject the externally-read value as a parameter so the fn is pure over its inputs, or remove the pure intent claim and surface the reads/writes on the outer fn",rewrite:`// option A — inject the external value as a parameter (preferred):
fn outer(preloaded: T) intent: "pure" -> R {
  // use preloaded instead of calling the imported fn
}

// option B — remove the pure intent claim and surface the effect:
fn outer(...) reads { resource } -> R {
  const v = importedFn(...)
  return compute(v)
}`,example:`// before — fn claims pure but calls imported readConfig() which declares reads { config }; INT029 fires
?bs 0.9
import { readConfig } from "./config"  // readConfig declares reads { config }

fn getTimeout(key: string) intent: "pure" -> number {
  return readConfig(key).timeout  // INT029: imported callee declares reads { config }
}

// after option A — inject the config value as a parameter
?bs 0.9
fn getTimeout(timeoutMs: number) intent: "pure" -> number {
  return timeoutMs
}`},INT030:{code:"INT030",title:"intent declares 'idempotent' but body calls an imported fn that declares writes {}",rule:'a function declaring intent: "idempotent" must not call imported functions that declare writes {} — an idempotent fn is safe to retry: multiple calls with the same arguments must produce the same observable outcome; a callee that declares writes {} mutates a resource on every call, making each retry produce additional mutations — the Nth call produces N writes, not the same outcome as the first call; this violates the idempotent contract by transitivity; this check extends INT015 to cross-file callees visible via moduleEffects',idiom:"move the write outside the idempotent boundary (the caller should write, the idempotent fn should compute), or check-then-write with a guard so repeated calls skip already-applied writes",rewrite:`// option A — split compute and write, keep compute idempotent:
fn compute(...) intent: "idempotent" -> T {
  return ...  // no writes inside
}
// caller: const v = compute(...); importedWriteFn(v)

// option B — remove the idempotent claim and declare writes on the outer fn:
fn outer(...) writes { resource } -> R {
  return importedFn(...)
}`,example:`// before — fn claims idempotent but calls imported persist() which declares writes { db }; INT030 fires
?bs 0.9
import { persist } from "./store"  // persist declares writes { db }

fn saveResult(id: string, value: number) intent: "idempotent" -> void {
  persist(id, value)  // INT030: imported callee declares writes { db }
}

// after option B — remove idempotent and declare writes
?bs 0.9
fn saveResult(id: string, value: number) writes { db } -> void {
  persist(id, value)
}`},INT031:{code:"INT031",title:"intent declares 'idempotent' but body calls an imported fn that declares uses { random } or uses { time }",rule:'a function declaring intent: "idempotent" must not call imported functions that declare uses { random } or uses { time } — an idempotent fn is safe to retry: same inputs → same observable result; random and time produce a different value on every call, so a callee that declares either makes the caller non-idempotent by transitivity — the second retry of a supposedly idempotent fn would observe a different random seed or timestamp; this check extends INT013 to cross-file callees visible via moduleEffects; this check fires only when INT003 and INT004 do not (no direct header or body conflict)',idiom:"inject the non-idempotent callee's return value as a parameter so the outer fn receives it as a stable input; the caller that passes the value is responsible for the non-idempotency, not the idempotent fn",rewrite:`// option A — inject the pre-computed value as a parameter (preferred):
fn outer(..., precomputed: T) intent: "idempotent" -> R {
  // use precomputed instead of calling the imported fn
}

// option B — remove the idempotent claim and declare the capability:
fn outer(...) uses { random } -> R {
  const v = importedFn(...)
  return compute(v)
}`,example:`// before — fn claims idempotent but calls imported timestamp() which declares uses { time }; INT031 fires
?bs 0.9
import { timestamp } from "./clock"  // timestamp declares uses { time }

fn buildKey(prefix: string) intent: "idempotent" -> string {
  return prefix + "-" + timestamp()  // INT031: imported callee declares uses { time }
}

// after option A — inject the timestamp as a parameter
?bs 0.9
fn buildKey(prefix: string, ts: number) intent: "idempotent" -> string {
  return prefix + "-" + ts
}`},INT032:{code:"INT032",title:"intent declares 'pure' but body calls an imported async fn",rule:'a function declaring intent: "pure" must not call imported functions that are declared async — an async callee yields to the event loop (a timing side effect) and returns a distinct Promise on every call; a pure fn calling an imported async fn is non-pure by transitivity even when the caller itself is synchronous; this check extends INT017 to cross-file callees visible via moduleEffects',idiom:"inject the async callee's resolved value as a parameter so the outer fn receives it as a stable sync input; the call site that awaits the async fn is responsible for the timing effect, not the pure fn",rewrite:`// option A — inject the resolved value as a parameter (preferred):
fn outer(precomputed: T) intent: "pure" -> R {
  // use precomputed instead of calling the imported async fn
}
// call site: outer(await importedAsync(...))

// option B — remove the pure claim:
fn outer(...) -> Promise<R> {
  const v = importedAsync(...)
  return compute(v)
}`,example:`// before — fn claims pure but calls imported async fetch(); INT032 fires
?bs 0.9
import { fetchConfig } from "./config"  // fetchConfig is declared async

fn buildUrl(base: string) intent: "pure" -> string {
  return base + "/" + fetchConfig()  // INT032: imported async callee violates pure
}

// after option A — inject the resolved value as a parameter
?bs 0.9
fn buildUrl(base: string, config: string) intent: "pure" -> string {
  return base + "/" + config
}`},INT033:{code:"INT033",title:"intent declares 'idempotent' but body calls an imported async fn",rule:'a function declaring intent: "idempotent" must not call imported functions that are declared async — an async callee returns a different Promise object on every call; a synchronous idempotent fn cannot await that Promise, so it forwards an unresolved Promise to its caller; on retry the caller gets a fresh Promise rather than the same value, violating the idempotent contract; this check extends INT019 to cross-file callees visible via moduleEffects',idiom:"inject the async callee's resolved value as a parameter so the outer fn can remain idempotent; alternatively, make the outer fn async and await the callee, then verify idempotency holds end-to-end",rewrite:`// option A — inject the resolved value as a parameter (preferred):
fn outer(..., resolvedValue: T) intent: "idempotent" -> R {
  // use resolvedValue instead of calling the imported async fn
}

// option B — remove the idempotent claim:
fn outer(...) -> Promise<R> {
  const v = importedAsync(...)
  return compute(v)
}`,example:`// before — fn claims idempotent but calls imported async loadCache(); INT033 fires
?bs 0.9
import { loadCache } from "./cache"  // loadCache is declared async

fn buildKey(prefix: string) intent: "idempotent" -> string {
  return prefix + "-" + loadCache()  // INT033: imported async callee violates idempotent
}

// after option A — inject the resolved cache value
?bs 0.9
fn buildKey(prefix: string, cacheValue: string) intent: "idempotent" -> string {
  return prefix + "-" + cacheValue
}`},INT034:{code:"INT034",title:"intent declares 'total' but body calls an imported async fn",rule:'a function declaring intent: "total" must not call imported functions that are declared async — an async callee returns a Promise that can reject; a synchronous total fn forwarding that Promise cannot catch the rejection, so the rejection escapes the fn boundary as an uncaught exception, contradicting the total guarantee; this check extends INT020 to cross-file callees visible via moduleEffects',idiom:"use a synchronous variant of the imported fn so the total guarantee can be verified by the compiler; if none exists, inject the resolved value as a parameter and let the call site handle the async lifecycle",rewrite:`// option A — use a synchronous callee (preferred):
fn outer(...) intent: "total" -> T = importedSync(...)

// option B — inject the resolved value as a parameter:
fn outer(..., precomputed: T) intent: "total" -> R {
  // use precomputed instead of calling the imported async fn
}

// option C — remove the total intent claim:
fn outer(...) -> Promise<T> = importedAsync(...)`,example:`// before — fn claims total but calls imported async validate(); INT034 fires
?bs 0.9
import { validate } from "./validator"  // validate is declared async

fn checkInput(input: string) intent: "total" -> boolean {
  return validate(input)  // INT034: imported async callee violates total
}

// after option A — use a synchronous validator instead
?bs 0.9
fn checkInput(input: string) intent: "total" -> boolean = validateSync(input)`},INT035:{code:"INT035",title:"intent declares 'infallible' but body calls an imported async fn",rule:'a function declaring intent: "infallible" must not call imported functions that are declared async — an async callee returns a Promise that can reject; a synchronous infallible fn forwarding that Promise cannot catch the rejection, so the rejection escapes as an uncaught exception, violating the infallible guarantee that the fn never fails; this check extends INT021 to cross-file callees visible via moduleEffects',idiom:'use a synchronous variant of the imported fn so the infallible guarantee can hold; if the callee must be async, downgrade to intent: "total" and make the outer fn async as well',rewrite:`// option A — use a synchronous callee (preferred):
fn outer(...) intent: "infallible" -> T = importedSync(...)

// option B — downgrade intent claim:
fn outer(...) intent: "total" -> Promise<T> = importedAsync(...)

// option C — inject the resolved value as a parameter:
fn outer(..., precomputed: T) intent: "infallible" -> R {
  // use precomputed instead of calling the imported async fn
}`,example:`// before — fn claims infallible but calls imported async getDefault(); INT035 fires
?bs 0.9
import { getDefault } from "./defaults"  // getDefault is declared async

fn format(value: string) intent: "infallible" -> string {
  return value + getDefault()  // INT035: imported async callee violates infallible
}

// after option A — use a synchronous default instead
?bs 0.9
fn format(value: string) intent: "infallible" -> string = value + DEFAULT_SUFFIX`},EFF002:{code:"EFF002",title:"outer fn declares narrower effects than a callback parameter",rule:"if a function-typed parameter declares `uses { caps }`, the containing fn must declare at least those capabilities — accepting an effectful callback without declaring its effects hides the blast radius from callers",idiom:"a fn's effect surface is the union of its direct effects and the effects its callback parameters may exercise",rewrite:"fn name(action: () uses { cap } -> T) uses { …existing, cap } -> ...",example:`// before — accepts effectful callback but outer fn declares no capabilities
?bs 0.7
fn withRetry(action: () uses { net } -> string) -> string = action()

// after — outer fn declares the capability its callback may exercise
?bs 0.7
fn withRetry(action: () uses { net } -> string) uses { net } -> string = action()`},EFF003:{code:"EFF003",title:"outer fn declares narrower reads than a callback parameter",rule:"if a function-typed parameter declares `reads { labels }`, the containing fn must declare at least those read labels — accepting a resource-reading callback without propagating its reads hides the dependency surface from callers",idiom:"a fn's read-dependency surface is the union of its own reads and the reads its callback parameters may exercise",rewrite:"fn name(cb: () reads { label } -> T) reads { …existing, label } -> ...",example:`// before — accepts reads-annotated callback but outer fn declares no reads
?bs 0.9
fn withCache(loader: () reads { cache } -> string) -> string = loader()

// after — outer fn propagates the reads surface of its callback
?bs 0.9
fn withCache(loader: () reads { cache } -> string) reads { cache } -> string = loader()`},EFF004:{code:"EFF004",title:"outer fn declares narrower writes than a callback parameter",rule:"if a function-typed parameter declares `writes { labels }`, the containing fn must declare at least those write labels — accepting a resource-writing callback without propagating its writes hides the dependency surface from callers",idiom:"a fn's write-dependency surface is the union of its own writes and the writes its callback parameters may exercise",rewrite:"fn name(cb: () writes { label } -> T) writes { …existing, label } -> ...",example:`// before — accepts writes-annotated callback but outer fn declares no writes
?bs 0.9
fn withMetrics(recorder: () writes { metrics } -> void) -> void { recorder() }

// after — outer fn propagates the writes surface of its callback
?bs 0.9
fn withMetrics(recorder: () writes { metrics } -> void) writes { metrics } -> void { recorder() }`},RES001:{code:"RES001",title:"Result.try block has no body",rule:"the form is `Result.try { <body> }` (or `Result.tryAsync { <body> }`) — the braces are required",idiom:"use Result.try to lift a throwing JS-boundary call into a Result without writing a try/catch by hand",rewrite:"Result.try { <body that may throw> }",example:`// before
let parsed = JSON.parse(input)

// after
let parsed = Result.try { JSON.parse(input) }?`},RES002:{code:"RES002",title:"Result- or Option-returning fn called but return value discarded",rule:"a same-file fn whose return type contains Result<> or Option<> must not be called as a bare statement — the return value must be propagated (?), matched, or assigned; discarding it permanently seals the error/absence path from callers",idiom:"use '?' to propagate errors to the caller, 'match' to handle each case, or 'let x = f()' to assign and inspect later; if the discard is intentional (best-effort logging, optional cache write), wrap the call in `unsafe \"intentional discard\" { f() }` to document it explicitly",rewrite:"let result = f(...)  // or f(...)?  // or match f(...) { ok { v } -> ... err { e } -> ... }",example:`// before — error path silently swallowed
?bs 0.9
fn saveUser(user: User) writes { userDb } -> Result<void, DbError> { ... }
fn processUser(user: User) writes { userDb } -> void {
  saveUser(user)   // RES002
}

// after
fn processUser(user: User) writes { userDb } -> Result<void, DbError> {
  saveUser(user)?  // propagate
}`},RES003:{code:"RES003",title:"imported Result- or Option-returning fn called but return value discarded",rule:"an imported fn whose declared return type contains Result<> or Option<> must not be called as a bare statement — the return value must be propagated (?), matched, or assigned; discarding it permanently seals the error/absence path from callers",idiom:"use '?' to propagate errors to the caller, 'match' to handle each case, or 'let x = f()' to assign and inspect later; if the discard is intentional (best-effort logging, optional cache write), wrap the call in `unsafe \"intentional discard\" { f() }` to document it explicitly",rewrite:"let result = f(...)  // or f(...)?  // or match f(...) { ok { v } -> ... err { e } -> ... }",example:`// db.bs (other file)
?bs 0.9
export fn saveUser(user: User) writes { userDb } -> Result<void, DbError> { ... }

// app.bs (this file)
?bs 0.9
import { saveUser } from "./db.bs"
fn processUser(user: User) writes { userDb } -> void {
  saveUser(user)   // RES003: imported callee returns Result — discard hides the error path
}

// after
fn processUser(user: User) writes { userDb } -> Result<void, DbError> {
  saveUser(user)?  // propagate
}`},SYN001:{code:"SYN001",title:"duplicate or invalid fn header clause",rule:"each fn header clause (reads {}, writes {}, throws {}, intent:) may appear at most once; labels inside reads/writes/throws must be plain identifiers, not quoted strings",idiom:"declare each resource dependency, throws declaration, or intent claim exactly once; merge duplicate lists rather than repeating the clause",rewrite:"fn name(...) reads { cache, db } writes { metrics } -> ...",example:`// duplicate reads — SYN001
fn load(id: string) reads { cache } reads { db } -> string = id

// fix: merge into one clause
fn load(id: string) reads { cache, db } -> string = id`},SYN002:{code:"SYN002",title:"native throw statement bypasses Result contract",rule:"native `throw` statements in fn bodies bypass botscript's Result-based error contract — callers using `?` unwrap, `match`, or `throws {}` propagation will not observe exceptions raised via `throw`",idiom:"replace `throw new ErrorType(...)` with `return err(new ErrorType(...))` and update the return type to `Result<T, ErrorType>`",rewrite:`// before — native throw bypasses Result contract
fn parse(s: string) -> string {
  if (!s) throw new ParseError("empty")
  return s
}

// after — explicit Result contract
fn parse(s: string) -> Result<string, ParseError> {
  if (!s) { const e = new ParseError("empty"); return err(e) }
  return ok(s)
}`,example:`// SYN002: native throw bypasses botscript error contract
fn parse(s: string) -> string {
  if (!s) throw new ParseError("empty")
  return s
}

// fix: use Result for error signaling
fn parse(s: string) -> Result<string, ParseError> {
  if (!s) { const e = new ParseError("empty"); return err(e) }
  return ok(s)
}`},SYN003:{code:"SYN003",title:"console.* call bypasses stdout/stderr capability model",rule:"direct `console.*` calls (console.log, console.error, etc.) in fn bodies bypass botscript's capability model — the compiler cannot see or enforce `stdout`/`stderr` declarations for output routed through `console`; callers cannot know the fn writes to stdout or stderr",idiom:"replace console.log with stdout.write(...) and declare `uses { stdout }` on the fn; replace console.error with stderr.write(...) and declare `uses { stderr }`",rewrite:`// before — console bypasses capability tracking
fn log(msg: string) -> void {
  console.log(msg)  // SYN003
}

// after — explicit stdout capability
fn log(msg: string) uses { stdout } -> void {
  unsafe "stdout.write returns void" { stdout.write(msg) }
}`,example:`// SYN003: console.log bypasses capability model
fn greet(name: string) -> void {
  console.log(\`Hello, \${name}\`)
}

// fix: declare the output capability
fn greet(name: string) uses { stdout } -> void {
  unsafe "stdout.write returns void" { stdout.write(\`Hello, \${name}\`) }
}`},SYN004:{code:"SYN004",title:"eval() or Function() / new Function() calls bypass all static capability and syntax checks",rule:"`eval(...)`, `Function(...)`, and `new Function(...)` execute strings as code at runtime — no static analysis can see what they do; every capability check (CAP001/CAP002), resource declaration (reads/writes), and safety check (SYN002/SYN003) can be bypassed by routing the unsafe pattern through eval or the Function constructor",idiom:'refactor eval-based patterns to use explicit code paths or config parameters; if eval is unavoidable (e.g. a sandboxed interpreter or intentional scripting surface), wrap in `unsafe "<reason>" { eval(...) }` to make the escape hatch visible in the diff',rewrite:`// before — eval hides config key access from static analysis
fn getConfig(key: string) -> string {
  return eval('process.env.' + key)  // SYN004
}

// after — explicit parameter, no eval
fn getConfig(value: string) -> string {
  return value
}`,example:`// SYN004: eval bypasses all static checks
fn run(code: string) -> string {
  return eval(code)
}

// fix: suppress with unsafe if eval is genuinely needed
fn run(code: string) -> string {
  return unsafe "evaluates user-provided script in sandbox" { eval(code) }
}`},SYN005:{code:"SYN005",title:"process.env access is an undeclared deployment environment dependency",rule:"`process.env` access in a fn body is invisible to callers — no capability or resource declaration covers the deployment environment; the fn silently depends on env-var values that callers cannot see, audit, or mock in tests",idiom:'pass config and secrets as explicit fn parameters so the dependency is visible in the call signature; for module-level config loading, wrap in `unsafe "reads deployment env" { process.env.KEY }` and narrow the scope to the load site',rewrite:`// before — implicit env dep
fn connect() uses { net } -> Result<Response, string> {
  const url = process.env.DATABASE_URL  // SYN005
  return http.get(url)
}

// after — explicit parameter
fn connect(url: string) uses { net } -> Result<Response, string> {
  return http.get(url)
}`,example:`// SYN005: process.env access hides a deployment dependency
fn getSecret() -> string {
  return process.env.API_KEY
}

// fix: pass the value explicitly
fn getSecret(apiKey: string) -> string {
  return apiKey
}`},SYN006:{code:"SYN006",title:"process.exit() terminates the host process and bypasses all recovery logic",rule:"`process.exit()`, `process?.exit()`, and `process.exit?.()` all terminate the entire host process — not just the fn, not just the bot. They produce no return value, never run caller code after the call, and completely bypass botscript's Result-based error contract: callers relying on `?`, `match`, or `throws {}` propagation will never see this termination. There is no capability declaration, no `throws {}`, nothing in the fn header to signal the kill.",idiom:"return `err(...)` (e.g. `err('reason')`) and propagate with `?` so the caller can decide whether to exit; if process.exit is genuinely required at a bootstrap entry point, wrap in `unsafe \"exits on invalid config\" { process.exit(1) }`",rewrite:`// before — silent process kill; callers have no recovery path
fn loadConfig(configPath: string) -> Config {
  if (!configPath) process.exit(1)  // SYN006
  return readConfig(configPath)
}

// after — explicit error propagation
fn loadConfig(configPath: string) -> Result<Config, string> {
  if (!configPath) return err('configPath not set')
  return ok(readConfig(configPath))
}`,example:`// SYN006: process.exit kills the host process; callers cannot recover
fn validate(cfg: Config) -> void {
  if (!cfg.valid) process.exit(1)
}

// fix: return an error and let the caller decide
fn validate(cfg: Config) -> Result<void, string> {
  if (!cfg.valid) return err('invalid config')
  return ok(undefined)
}`},SYN007:{code:"SYN007",title:"fetch() call bypasses the net capability model",rule:"`fetch(url)` and `fetch?.(url)` make HTTP requests at runtime but are invisible to botscript's capability model: CAP001 checks for `http.*` member calls, not the `fetch` global. A fn that calls `fetch` has an undeclared network dependency — CAP001 cannot infer or require `uses { net }` from `fetch` calls, so callers and audit tooling cannot rely on CAP001 to detect a missing declaration.",idiom:'replace `fetch(url)` with `http.get(url)` (or `http.post(url, { body })`) and add `uses { net }` to the fn header; if the native fetch API is required, wrap in `unsafe "calls fetch directly" { fetch(url) }`',rewrite:`// before — fetch is invisible to the capability model
fn getUser(id: string) -> Promise<User> {
  return fetch(\`/api/users/\${id}\`).then(r => r.json())  // SYN007
}

// after — declared network dependency
fn getUser(id: string) uses { net } -> Promise<User> {
  return http.get(\`/api/users/\${id}\`)
}`,example:`// SYN007: fetch bypasses the net capability model
fn getUser(id: string) -> Promise<User> {
  return fetch(\`/api/users/\${id}\`).then(r => r.json())  // SYN007
}

// fix: declare the dependency
fn getUser(id: string) uses { net } -> Promise<User> {
  return http.get(\`/api/users/\${id}\`)
}`},SYN008:{code:"SYN008",title:"new WebSocket() / WebSocket() call bypasses the net capability model",rule:"`new WebSocket(url)`, `WebSocket(url)`, and TypeScript instantiation forms like `new WebSocket<T>(url)` open persistent bidirectional connections at runtime but are invisible to botscript's capability model: CAP001 checks for `http.*` member calls, not the `WebSocket` global. A fn that constructs a WebSocket has an undeclared network dependency — no `uses {}` declaration covers it, and no audit tool can observe it from the fn header.",idiom:'wrap the `WebSocket` constructor in `unsafe "<reason>" { new WebSocket(url) }` to make the escape hatch visible in the diff',rewrite:`// before — WebSocket is invisible to the capability model
fn openFeed(url: string) -> WebSocket {
  return new WebSocket(url)  // SYN008
}

// after — escape hatch justified in the diff
fn openFeed(url: string) -> WebSocket {
  return unsafe "wraps WebSocket for streaming feed" { new WebSocket(url) }
}`,example:`// SYN008: WebSocket bypasses the net capability model
fn subscribe(url: string) -> void {
  const ws = new WebSocket(url)  // SYN008
  ws.onmessage = (e) => handle(e.data)
}

// fix: wrap in unsafe with a justification
fn subscribe(url: string) -> void {
  const ws = unsafe "wraps WebSocket for live updates" { new WebSocket(url) }
  ws.onmessage = (e) => handle(e.data)
}`},SYN009:{code:"SYN009",title:"XMLHttpRequest construction bypasses the net capability model — use http.get() / http.post() instead",rule:"`new XMLHttpRequest()`, `XMLHttpRequest()`, `new XMLHttpRequest` (no-parens), and TypeScript instantiation forms like `new XMLHttpRequest<T>()` open HTTP connections at runtime but are invisible to botscript's capability model: CAP001 checks for `http.*` member calls, not the `XMLHttpRequest` global. A fn that constructs an XHR has an undeclared network dependency — no `uses { net }` will reflect it in the fn header, no audit tool can see it, and callers cannot reason about the blast radius.",idiom:'replace `new XMLHttpRequest()` with `http.get(url)` or `http.post(url, { body })` and add `uses { net }` to the fn header; if the raw XHR API is genuinely required (e.g. a thin adapter), wrap in `unsafe "wraps XHR directly" { new XMLHttpRequest() }`',rewrite:`// before — XHR is invisible to the capability model
async fn loadData(url: string) -> Promise<Result<string, string>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()  // SYN009
    xhr.open('GET', url)
    xhr.onload = () => resolve(ok(xhr.responseText))
    xhr.onerror = () => resolve(err('request failed'))
    xhr.send()
  })
}

// after — http.get declares the net dependency
async fn loadData(url: string) uses { net } -> Promise<Result<string, string>> {
  match await http.get(url) {
    ok { res } -> ok(await res.text())
    err { e } -> err(e.message)
  }
}`,example:`// SYN009: XMLHttpRequest bypasses the net capability model
fn getData(url: string) -> void {
  const xhr = new XMLHttpRequest()  // SYN009
  xhr.open('GET', url)
  xhr.send()
}

// fix: use http.get and declare the capability
async fn getData(url: string) uses { net } -> Promise<Result<string, string>> {
  match await http.get(url) {
    ok { res } -> ok(await res.text())
    err { e } -> err(e.message)
  }
}`},SYN010:{code:"SYN010",title:"setTimeout / setInterval / queueMicrotask defers side effects outside the fn's capability surface",rule:"`setTimeout(fn, ms)`, `setInterval(fn, ms)`, and `queueMicrotask(fn)` schedule callbacks that run after the current fn returns — any effects inside those callbacks are invisible to the caller: no capability declaration, no `writes {}` label, no `throws {}` entry can reflect them. Callers see a fn that returns normally; the real work happens later, in a different call frame, with no signal in the fn header.",idiom:'pass the delay and callback to the caller as a return value so the timing is visible (e.g. return a Promise the caller awaits); if a timer is genuinely required here, wrap in `unsafe "schedules deferred effect" { setTimeout(...) }`',rewrite:`// before — deferred effect invisible to callers
fn scheduleRetry(fn: () -> void, ms: number) -> void {
  setTimeout(fn, ms)  // SYN010
}

// after — caller controls the timing
async fn scheduleRetry(fn: () -> void, ms: number) -> Promise<void> {
  await new Promise(resolve => unsafe "schedules deferred effect" { setTimeout(resolve, ms) })
  fn()
}`,example:`// SYN010: deferred callback hides a network effect from callers
fn pollStatus(url: string) uses { net } -> void {
  setInterval(() => http.get(url), 5000)  // SYN010
}

// fix: return a teardown fn so the polling is visible at the call site
fn pollStatus(url: string) uses { net } -> () -> void {
  const id = setInterval(() => http.get(url), 5000)
  return () => clearInterval(id)
}`},SYN011:{code:"SYN011",title:"dynamic import() call bypasses the module capability model",rule:"`import(specifier)` at runtime loads a module whose capabilities are not statically declared: CAP001 checks for stdlib namespace calls, not dynamic module loads. A fn that calls `import()` has an unbounded, undeclared capability surface proportional to everything the dynamically loaded module might do — the capability manifest hash proves the fn body unchanged; it says nothing about what the loaded module does at runtime.",idiom:'if the module is known at compile time, use a static `import { ... } from` declaration at the top level instead; if dynamic loading is genuinely required (e.g. a plugin system), wrap in `unsafe "loads plugin dynamically" { import(specifier) }`',rewrite:`// before — unbounded capability surface from dynamic load
async fn loadPlugin(name: string) -> Plugin {
  const mod = await import(\`./plugins/\${name}\`)  // SYN011
  return mod.default
}

// after — explicit escape hatch
async fn loadPlugin(name: string) -> Plugin {
  const mod = await unsafe "loads plugin by name from trusted plugin dir" { import(\`./plugins/\${name}\`) }
  return mod.default
}`,example:`// SYN011: dynamic import hides an unbounded capability surface
async fn getAdapter(type: string) -> any {
  const m = await import(\`./adapters/\${type}\`)  // SYN011
  return m.default
}

// fix: wrap in unsafe with a reason, or use a static import at the top level
async fn getAdapter(type: string) -> any {
  const m = await unsafe "adapter type validated by registry" { import(\`./adapters/\${type}\`) }
  return m.default
}`},SYN012:{code:"SYN012",title:"new EventSource() / EventSource() call bypasses the net capability model",rule:"`new EventSource(url)`, `EventSource(url)`, `EventSource?.(url)`, and TypeScript instantiation forms like `new EventSource<T>(url)` open persistent server-sent-events connections at runtime but are invisible to botscript's capability model: CAP001 checks for `http.*` member calls, not the `EventSource` global. A fn that constructs an EventSource has an undeclared network dependency — no `uses {}` declaration covers it, and no audit tool can observe it from the fn header.",idiom:'wrap the `EventSource` constructor in `unsafe "wraps EventSource directly" { new EventSource(url) }` to make the escape hatch visible in the diff',rewrite:`// before — EventSource is invisible to the capability model
fn openFeed(url: string) -> EventSource {
  return new EventSource(url)  // SYN012
}

// after — escape hatch justified in the diff
fn openFeed(url: string) -> EventSource {
  return unsafe "wraps EventSource for streaming feed" { new EventSource(url) }
}`,example:`// SYN012: EventSource bypasses the net capability model
fn openFeed(url: string) -> any {
  return new EventSource(url)  // SYN012
}

// fix: wrap in unsafe with a justification
fn openFeed(url: string) -> any {
  return unsafe "wraps EventSource for streaming feed" { new EventSource(url) }
}`},SYN013:{code:"SYN013",title:"Worker() / SharedWorker() construction (with or without new) spawns an unbounded execution context",rule:"`new Worker(scriptURL)`, bare `Worker(scriptURL)`, `Worker?.(scriptURL)`, `new SharedWorker(scriptURL)`, bare `SharedWorker(scriptURL)`, `SharedWorker?.(scriptURL)`, and TypeScript instantiation forms like `new Worker<T>(scriptURL)` spawn a new JS execution context that is invisible to botscript's capability model: the worker script runs with its own global scope, can make network requests, access storage, and perform any operation — none of which is visible in the spawning fn's `uses {}`, `reads {}`, or `writes {}` declarations. CAP001 cannot infer any capability from worker construction; the capability surface of the spawned context is unbounded.",idiom:'wrap the constructor in `unsafe "<reason>" { new Worker(scriptURL) }` to make the escape hatch visible in the diff; document what capabilities the worker script is expected to use in the reason string',rewrite:`// before — Worker is invisible to the capability model
fn startWorker(url: string) -> Worker {
  return new Worker(url)  // SYN013
}

// after — escape hatch justified in the diff
fn startWorker(url: string) -> Worker {
  return unsafe "spawns computation worker with no external I/O" { new Worker(url) }
}`,example:`// SYN013: Worker spawns unbounded execution context
fn compute(url: string) -> Worker {
  return new Worker(url)  // SYN013
}

// fix: wrap in unsafe with a justification
fn compute(url: string) -> Worker {
  return unsafe "spawns computation worker with no net access" { new Worker(url) }
}`},SYN014:{code:"SYN014",title:"new BroadcastChannel() / BroadcastChannel() call bypasses the messaging capability model",rule:"`new BroadcastChannel(name)` and `BroadcastChannel(name)` open a cross-context message channel at runtime — any tab, window, or worker on the same origin can post to or receive from this channel. This is invisible to botscript's capability model: CAP001 checks for stdlib namespace calls, not the `BroadcastChannel` global. A fn that constructs a BroadcastChannel has an undeclared cross-context messaging dependency — no `uses {}` declaration covers it, and no audit tool can observe it from the fn header.",idiom:'wrap the `BroadcastChannel` constructor in `unsafe "<reason>" { new BroadcastChannel(name) }` to make the escape hatch visible in the diff',rewrite:`// before — BroadcastChannel is invisible to the capability model
fn openChannel(name: string) -> BroadcastChannel {
  return new BroadcastChannel(name)  // SYN014
}

// after — escape hatch justified in the diff
fn openChannel(name: string) -> BroadcastChannel {
  return unsafe "wraps BroadcastChannel for tab coordination" { new BroadcastChannel(name) }
}`,example:`// SYN014: BroadcastChannel bypasses the messaging capability model
fn subscribe(channel: string) -> BroadcastChannel {
  const bc = new BroadcastChannel(channel)  // SYN014
  bc.onmessage = (e) => handle(e.data)
  return bc
}

// fix: wrap in unsafe with a justification
fn subscribe(channel: string) -> BroadcastChannel {
  const bc = unsafe "wraps BroadcastChannel for live updates" { new BroadcastChannel(channel) }
  bc.onmessage = (e) => handle(e.data)
  return bc
}`},SYN015:{code:"SYN015",title:"localStorage / sessionStorage access bypasses the storage capability model",rule:"`localStorage.*` and `sessionStorage.*` accesses are synchronous Web Storage API operations invisible to botscript's capability model: `reads {}` / `writes {}` labels cover declared resource identifiers, not the Web Storage API globals. A fn that accesses `localStorage` or `sessionStorage` has undeclared persistent state dependencies — no `reads {}` / `writes {}` declaration in the fn header covers the access, and callers cannot observe or audit the dependency from the fn's declared surface. `localStorage` persists across browser sessions; `sessionStorage` scopes to the current tab — both are synchronous and invisible to CAP001.",idiom:'pass a storage abstraction or explicit key-value callbacks as fn parameters so callers control what storage is accessed, the dependency is visible in the signature, and tests can inject a mock (e.g. `new Map()` or an in-memory object); if direct access is genuinely required, wrap in `unsafe "reads/writes localStorage for <reason>" { localStorage.getItem(key) }`',rewrite:`// before — localStorage access invisible to the capability model
fn getTheme() -> string {
  return localStorage.getItem('theme') ?? 'light'  // SYN015
}

// after — storage abstraction passed as parameter; dependency visible in signature
fn getTheme(store: { getItem: (key: string) => string | null }) -> string {
  return store.getItem('theme') ?? 'light'
}`,example:`// SYN015: localStorage access invisible to capability model
fn savePrefs(prefs: Prefs) -> void {
  localStorage.setItem('prefs', JSON.stringify(prefs))  // SYN015
}

// fix: wrap in unsafe with a reason, or pass a storage abstraction
fn savePrefs(prefs: Prefs) -> void {
  unsafe "persists user prefs to localStorage" { localStorage.setItem('prefs', JSON.stringify(prefs)) }
}`},SYN016:{code:"SYN016",title:"indexedDB access bypasses the storage capability model",rule:"`indexedDB.*` accesses are same-origin persistent database operations invisible to botscript's capability model: `reads {}` / `writes {}` labels cover declared resource identifiers, not the Web Storage API globals. A fn that accesses `indexedDB` has undeclared persistent state dependencies — no `reads {}` / `writes {}` declaration in the fn header covers the access, and callers cannot observe or audit the dependency from the fn's declared surface. Unlike `localStorage`, `indexedDB` is asynchronous and has no practical size limit, making invisible access higher-impact.",idiom:'pass an `IDBDatabase` or an explicit storage abstraction as a fn parameter so callers control what database is accessed, the dependency is visible in the fn signature, and tests can inject a mock; if direct access is genuinely required, wrap in `unsafe "reads/writes indexedDB for <reason>" { indexedDB.open(name) }`',rewrite:`// before — indexedDB access invisible to the capability model
async fn getUser(id: string) -> User | null {
  const req = indexedDB.open('users-db', 1)  // SYN016
  const db = await new Promise<IDBDatabase>((res) => { req.onsuccess = (e) => res(e.target.result) })
  return db.transaction('users').objectStore('users').get(id)
}

// after — database handle passed as parameter; dependency visible in the signature
async fn getUser(db: IDBDatabase, id: string) -> User | null {
  return db.transaction('users').objectStore('users').get(id)
}`,example:`// SYN016: indexedDB access invisible to capability model
async fn loadSettings() -> Settings {
  const req = indexedDB.open('app-db', 1)  // SYN016
  return new Promise((resolve) => { req.onsuccess = (e) => resolve(e.target.result) })
}

// fix: pass db as a parameter or wrap in unsafe with a reason
async fn loadSettings() -> Settings {
  const req = unsafe "opens app-db for settings read" { indexedDB.open('app-db', 1) }
  return new Promise((resolve) => { req.onsuccess = (e) => resolve(e.target.result) })
}`},SYN017:{code:"SYN017",title:"new Notification() / Notification() call bypasses the capability model",rule:"`new Notification(title)`, bare `Notification(title)`, optional-call `Notification?.(title)`, and TypeScript generic form `new Notification<T>(title)` calls create user-visible browser notifications at runtime — a side effect entirely invisible to botscript's capability model. No `uses {}`, `reads {}`, or `writes {}` declaration covers notification dispatch: callers cannot observe, audit, or suppress the UI effect from the fn's declared surface.",idiom:'accept a notification-dispatch callback as an explicit fn parameter so callers control whether a notification is shown and tests can capture or suppress it; if direct `Notification` access is required, wrap in `unsafe "sends browser notification for <reason>" { new Notification(title, options) }`',rewrite:`// before — notification dispatch invisible to the capability model
fn alertUser(msg: string) -> void {
  new Notification(msg)  // SYN017
}

// after — dispatch function passed as parameter; callers control UI side effect
fn alertUser(notify: (msg: string) => void, msg: string) -> void {
  notify(msg)
}`,example:`// SYN017: Notification dispatch bypasses the capability model
fn warnUser(title: string, body: string) -> void {
  new Notification(title, { body })  // SYN017
}

// fix: wrap in unsafe with a reason
fn warnUser(title: string, body: string) -> void {
  unsafe "shows alert notification for user-triggered warning" { new Notification(title, { body }) }
}`},SYN018:{code:"SYN018",title:"Math.random() call bypasses the random capability model",rule:"`Math.random()` generates a random float at runtime but is invisible to botscript's capability model: `uses { random }` declarations cover `random.*` stdlib namespace calls, not the `Math.random` global. A fn that calls `Math.random()` has an undeclared randomness dependency — no `uses {}` declaration covers it, callers cannot see it, and tests cannot deterministically mock or suppress it the way they can the `random` stdlib.",idiom:'replace `Math.random()` with `random.next()` and add `uses { random }` to the fn header; if the raw `Math.random` API is required, wrap in `unsafe "uses Math.random for <reason>" { Math.random() }`',rewrite:`// before — Math.random() invisible to the capability model
fn jitter(base: number) uses { } -> number {
  return base + Math.random() * 10  // SYN018
}

// after — random capability declared; tests can control the output
fn jitter(base: number) uses { random } -> number {
  return base + random.next() * 10
}`,example:`// SYN018: Math.random() bypasses the random capability model
fn roll(sides: number) -> number {
  return Math.floor(Math.random() * sides) + 1  // SYN018
}

// fix: use random.next() and declare uses { random }
fn roll(sides: number) uses { random } -> number {
  return Math.floor(random.next() * sides) + 1
}`},SYN019:{code:"SYN019",title:"crypto.getRandomValues() / crypto.randomUUID() call bypasses the random capability model",rule:"`crypto.getRandomValues()` and `crypto.randomUUID()` generate cryptographic randomness at runtime but are invisible to botscript's capability model: `uses { random }` covers `random.*` stdlib calls, not the `crypto` global. A fn that calls these methods has an undeclared randomness dependency — tests cannot control the output and callers cannot observe the dependency from the fn header.",idiom:'use `random.next()` (float [0,1)) or `random.int(min, max)` from the `random` stdlib with `uses { random }` so the randomness dependency is visible in the fn header and tests can inject a mock; if cryptographic randomness or UUIDs are genuinely required, wrap in `unsafe "uses crypto for <reason>" { crypto.getRandomValues(buf) }`',rewrite:`// before — crypto call invisible to the capability model
fn rollToken() -> number {
  const buf = new Uint8Array(4)
  crypto.getRandomValues(buf)  // SYN019
  return buf[0]
}

// after — randomness declared in uses {}; tests can control output
fn rollToken() uses { random } -> number {
  return random.int(0, 256)  // [0, 256) == [0, 255] inclusive
}`,example:`// SYN019: crypto call bypasses the random capability model
fn rollDice() -> number {
  const buf = new Uint8Array(1)
  crypto.getRandomValues(buf)  // SYN019
  return (buf[0] % 6) + 1
}

// fix: use random stdlib
fn rollDice() uses { random } -> number {
  return random.int(1, 7)
}`},SYN020:{code:"SYN020",title:"Date.now() / new Date() / new Date (no parens) / Date() / Date?.() construction bypasses the time capability model",rule:"`Date.now()`, `new Date()`, and `Date()` inject the current time at runtime but are invisible to botscript's capability model: `uses { time }` declarations cover `time.*` stdlib namespace calls, not the `Date` global. A fn that calls these forms has an undeclared time dependency — no `uses {}` declaration covers it, callers cannot see it, and tests cannot control the time value the fn observes.",idiom:'pass the current time as an explicit parameter so callers and tests can control it; or use `time.now()` from the `time` stdlib namespace with `uses { time }` so the time dependency is declared in the fn header (note: `time.now()` returns epoch ms, not a Date object); if the raw `Date` API is genuinely required, wrap in `unsafe "uses current time for <reason>" { Date.now() }`',rewrite:`// before — time dependency invisible to the capability model
fn isExpired(expiresAtMs: number) -> boolean {
  return Date.now() > expiresAtMs  // SYN020
}

// after — time passed as a parameter; tests can control it
fn isExpired(expiresAtMs: number, nowMs: number) -> boolean {
  return nowMs > expiresAtMs
}`,example:`// SYN020: Date.now() bypasses the time capability model
fn isExpired(expiresAt: number) -> boolean {
  return Date.now() > expiresAt  // SYN020
}

// fix: pass nowMs as a parameter
fn isExpired(expiresAt: number, nowMs: number) -> boolean {
  return nowMs > expiresAt
}`},SYN021:{code:"SYN021",title:"performance.now() / performance.timeOrigin access bypasses the time capability model",rule:"`performance.now()` and `performance.timeOrigin` inject ambient timing information at runtime but are invisible to botscript's capability model: `uses { time }` declarations cover `time.*` stdlib namespace calls, not the `performance` global. A fn that reads these values has an undeclared time dependency — no `uses {}` declaration covers it, callers cannot see it, and tests cannot control the clock value the fn observes.",idiom:'pass the current time as an explicit parameter so callers and tests can control it (preferred); if only epoch time (not monotonic time) is needed, use `time.now()` from the `time` stdlib with `uses { time }` so the dependency is declared in the fn header — note: `time.now()` is wall-clock epoch time, not a monotonic clock; if direct `performance` access is required, wrap in `unsafe "uses performance.now for <reason>" { performance.now() }`',rewrite:`// before — time dependency invisible to the capability model
fn elapsed(startMs: number) -> number {
  return performance.now() - startMs  // SYN021
}

// after — time passed as a parameter; tests can control it
fn elapsed(startMs: number, nowMs: number) -> number {
  return nowMs - startMs
}`,example:`// SYN021: performance.now() bypasses the time capability model
fn elapsed(startMs: number) -> number {
  return performance.now() - startMs  // SYN021
}

// fix: pass nowMs as a parameter
fn elapsed(startMs: number, nowMs: number) -> number {
  return nowMs - startMs
}`},SYN022:{code:"SYN022",title:"process.* ambient state access bypasses the capability model",rule:"`process.argv`, `process.cwd`, `process.platform`, `process.arch`, `process.pid`, `process.ppid`, `process.version`, `process.versions`, `process.hrtime`, `process.uptime`, `process.memoryUsage`, `process.cpuUsage`, and `process.resourceUsage` read ambient Node.js runtime or deployment state at runtime but are invisible to botscript's capability model: no `uses {}`, `reads {}`, or `writes {}` declaration covers them. A fn that reads these values has an undeclared dependency — callers cannot see it, and tests cannot control the observed value. Note: `process.env` is covered by SYN005; `process.exit` is covered by SYN006.",idiom:'pass the value as an explicit parameter so callers and tests can control it (preferred); if the ambient access is intentional, wrap in `unsafe "accesses process.<member> for <reason>" { process.<member> }`',rewrite:`// before — ambient process state invisible to the capability model
fn buildPath() -> string {
  return process.cwd() + '/output'  // SYN022
}

// after — working directory passed as a parameter; tests can control it
fn buildPath(cwd: string) -> string {
  return cwd + '/output'
}`,example:`// SYN022: process.argv bypasses the capability model
fn getFlag() -> string {
  return process.argv[2]  // SYN022
}

// fix: accept argv as a parameter
fn getFlag(argv: string[]) -> string {
  return argv[2]
}`},SYN023:{code:"SYN023",title:"navigator.* ambient browser capability access bypasses the capability model",rule:"`navigator.geolocation`, `navigator.clipboard`, `navigator.mediaDevices`, `navigator.serviceWorker`, `navigator.permissions`, `navigator.onLine`, `navigator.userAgent`, `navigator.language`, `navigator.languages`, `navigator.platform`, `navigator.hardwareConcurrency`, `navigator.deviceMemory`, `navigator.connection`, `navigator.wakeLock`, and `navigator.sendBeacon` read or exercise ambient browser capabilities at runtime but are invisible to botscript's capability model: no `uses {}`, `reads {}`, or `writes {}` declaration covers them. A fn that accesses these has an undeclared browser-environment dependency — callers cannot see it in the header, and tests cannot inject a controlled value. `sendBeacon` is especially high-impact: it makes a fire-and-forget network request with no declared `uses { net }` surface.",idiom:'pass the required value as an explicit parameter so callers and tests can control it (preferred); if the ambient access is intentional, wrap in `unsafe "accesses navigator.<member> for <reason>" { navigator.<member> }`',rewrite:`// before — ambient navigator state invisible to the capability model
fn isConnected() -> boolean {
  return navigator.onLine  // SYN023
}

// after — online status passed as a parameter; tests can control it
fn isConnected(onLine: boolean) -> boolean {
  return onLine
}`,example:`// SYN023: navigator.userAgent bypasses the capability model
fn getBrowser() -> string {
  return navigator.userAgent  // SYN023
}

// fix: accept userAgent as a parameter
fn getBrowser(userAgent: string) -> string {
  return userAgent
}`},SYN024:{code:"SYN024",title:"document.cookie access bypasses the storage capability model",rule:"`document.cookie` is a persistent read/write storage mechanism invisible to botscript's capability model: `reads {}` / `writes {}` labels cover declared resource identifiers, not the `document` global. Unlike `localStorage` (SYN015), cookies are also transmitted with every matching HTTP request — so `document.cookie` access has implicit network-side effects as well. A fn that reads or writes `document.cookie` has undeclared storage and indirect network dependencies that callers cannot see and tests cannot intercept without global mocking.",idiom:'pass cookies as an explicit parameter so callers and tests can control the value; or accept a cookie-jar abstraction so the dependency is visible at the call site; if direct `document.cookie` access is genuinely required (e.g. a thin cookie adapter), wrap in `unsafe "accesses document.cookie for <reason>" { document.cookie }`',rewrite:`// before — cookie access invisible to the capability model
fn getSession() -> string {
  return document.cookie  // SYN024
}

// after — cookie value passed as a parameter; tests can control it
fn getSession(cookieHeader: string) -> string {
  return cookieHeader
}`,example:`// SYN024: document.cookie bypasses the storage capability model
fn isLoggedIn() -> boolean {
  return document.cookie.includes('session=')  // SYN024
}

// fix: pass the cookie header as a parameter
fn isLoggedIn(cookieHeader: string) -> boolean {
  return cookieHeader.includes('session=')
}`},SYN025:{code:"SYN025",title:"requestAnimationFrame schedules a callback outside the fn's capability surface",rule:"`requestAnimationFrame(cb)` schedules `cb` to run before the next browser repaint — after the current fn has returned. Any effects inside `cb` are invisible to callers: no capability declaration, no `writes {}` label, no `throws {}` entry reflects them. The fn appears to return nothing; the real work happens asynchronously in a future animation frame.",idiom:'pass the work as a return value the caller can schedule, or wrap in `unsafe "schedules animation frame callback" { requestAnimationFrame(cb) }` when direct use is required',rewrite:`// before — animation frame callback hides side effects from callers
fn scheduleRender(frame: number) uses { net } -> void {
  requestAnimationFrame(() => http.get("/render/" + frame))  // SYN025
}

// after — extract the side-effectful work; let the caller schedule it
fn render(frame: number) uses { net } -> void {
  http.get("/render/" + frame)
}`,example:`// SYN025: animation frame callback hides a network effect from callers
fn scheduleRender(frame: number) uses { net } -> void {
  requestAnimationFrame(() => http.get("/render/" + frame))  // SYN025
}

// fix: extract the work into a separate fn
fn render(frame: number) uses { net } -> void {
  http.get("/render/" + frame)
}`},SYN026:{code:"SYN026",title:"requestIdleCallback schedules a callback outside the fn's capability surface",rule:"`requestIdleCallback(cb)` schedules `cb` to run during a browser idle period — after the current fn has returned. Any effects inside `cb` are invisible to callers: no capability declaration, no `writes {}` label, no `throws {}` entry reflects them. The fn appears to return nothing; the real work happens asynchronously when the browser is idle.",idiom:'extract the deferred work into a separately declared fn the caller passes to `requestIdleCallback`, or wrap in `unsafe "schedules idle callback" { requestIdleCallback(cb) }` when direct use is required',rewrite:`// before — idle callback hides side effects from callers
fn deferCleanup() uses { fs } -> void {
  requestIdleCallback(() => fs.delete("/tmp/cache"))  // SYN026
}

// after — return the work; caller decides when to schedule it
fn cleanup() uses { fs } -> void {
  fs.delete("/tmp/cache")
}`,example:`// SYN026: idle callback hides a filesystem effect from callers
fn deferCleanup() uses { fs } -> void {
  requestIdleCallback(() => fs.delete("/tmp/cache"))  // SYN026
}

// fix: extract the work into a separate fn
fn cleanup() uses { fs } -> void {
  fs.delete("/tmp/cache")
}`},SYN027:{code:"SYN027",title:"Observer constructor (MutationObserver / IntersectionObserver / ResizeObserver / PerformanceObserver) schedules a callback outside the fn's capability surface",rule:"`new MutationObserver(cb)`, `new IntersectionObserver(cb)`, `new ResizeObserver(cb)`, and `new PerformanceObserver(cb)` register `cb` to fire when the browser observes a condition — after the current fn has returned, at an indeterminate future time. Any effects inside `cb` are invisible to callers: no capability declaration, no `writes {}` label, no `throws {}` entry reflects them. The fn appears to return an observer handle; all the real work executes later in the callback, with an undeclared capability surface that callers cannot audit from the fn header.",idiom:'extract the callback body into a separately declared fn and pass it as a parameter so callers see the capability surface; if the observer construction is genuinely required at this level, wrap in `unsafe "observes <target> for <reason>" { new MutationObserver(cb) }`',rewrite:`// before — observer callback hides effects from callers
fn watchNode(node: Element) uses { net } -> MutationObserver {
  const obs = new MutationObserver(() => http.get('/log'))  // SYN027
  obs.observe(node, { childList: true })
  return obs
}

// after — callback passed in; callers control the effect surface
fn watchNode(node: Element, onChange: () -> void) -> MutationObserver {
  const obs = unsafe "observes node mutations for caller-provided callback" { new MutationObserver(onChange) }
  obs.observe(node, { childList: true })
  return obs
}`,example:`// SYN027: observer callback hides a network effect from callers
fn trackViewport(el: Element) uses { net } -> IntersectionObserver {
  return new IntersectionObserver(() => http.get('/viewed'))  // SYN027
}

// fix: wrap in unsafe with a reason
fn trackViewport(el: Element) uses { net } -> IntersectionObserver {
  return unsafe "observes intersection for analytics" { new IntersectionObserver(() => http.get('/viewed')) }
}`},SYN028:{code:"SYN028",title:"new Proxy() wraps an object and launders its capability surface from static analysis",rule:"`new Proxy(target, handler)` creates a virtualized object that intercepts all property access, method calls, and mutations on `target` via `handler` traps. If `target` is a capability-bearing object (e.g. an `http` or `fs` namespace), the Proxy becomes an opaque wrapper: callers see an innocent object, but every operation routes through the underlying capability without a matching `uses {}` declaration. If `handler` closes over capabilities, the trap body can perform arbitrary effects with no declaration visible in the fn header. In both cases the compiler cannot see through the Proxy — the capability surface appears narrower than it actually is.",idiom:'avoid using Proxy to wrap capability-bearing objects; if Proxy is genuinely needed (e.g. mock injection, transparent logging), wrap in `unsafe "proxies <target> for <reason>" { new Proxy(target, handler) }` so the escape hatch is visible in the diff and auditable by reviewers',rewrite:`// before — Proxy wraps http capability, hiding it from callers
fn makeClient(http: HttpCap) -> object {
  return new Proxy({}, {
    get: (_, key) => http.get(\`/api/\${key}\`)  // SYN028
  })
}

// after — wrap in unsafe with a reason; callers can audit the escape
fn makeClient(http: HttpCap) uses { net } -> object {
  return unsafe "proxies http capability for transparent API client" {
    new Proxy({}, { get: (_, key) => http.get(\`/api/\${key}\`) })
  }
}`,example:`// SYN028: Proxy hides capability surface from callers
fn wrapFs(fs: FsCap) -> object {
  return new Proxy(fs, {})  // SYN028 — fs capability laundered through Proxy
}

// fix: declare intent with unsafe
fn wrapFs(fs: FsCap) -> object {
  return unsafe "proxies fs capability for transparent delegation" { new Proxy(fs, {}) }
}`},SYN029:{code:"SYN029",title:"document.write() / document.writeln() injects raw HTML and bypasses the DOM capability model",rule:"`document.write(html)` and `document.writeln(html)` inject a raw HTML string directly into the document parse stream. After the initial page load, calling either method clears the entire document before writing. Both are invisible to botscript's capability model: no `uses {}`, `reads {}`, or `writes {}` declaration covers document mutation via these globals. The injected string may contain `<script>` tags, inline event handlers, or other executable content that the static analysis cannot see. Callers cannot observe, audit, or suppress the DOM side effect from the fn's declared surface.",idiom:'replace `document.write(html)` with explicit DOM construction (`document.createElement`, `innerHTML` on a scoped element, or a templating system) so the DOM mutation is visible and auditable; if `document.write` is genuinely required (e.g. polyfill injection, legacy embed), wrap in `unsafe "writes to document for <reason>" { document.write(html) }`',rewrite:`// before — document.write injects HTML invisibly
fn renderBanner(html: string) -> void {
  document.write(\`<div class='banner'>\${html}</div>\`)  // SYN029
}

// after — explicit DOM construction; effect is visible and scoped
fn renderBanner(html: string) -> void {
  const div = document.createElement('div')
  div.className = 'banner'
  div.innerHTML = html
  document.body.appendChild(div)
}`,example:`// SYN029: document.write injects raw HTML bypassing capability model
fn injectScript(src: string) -> void {
  document.write(\`<script src='\${src}'><\\/script>\`)  // SYN029
}

// fix: wrap in unsafe with a reason
fn injectScript(src: string) -> void {
  unsafe "injects legacy script tag for polyfill" { document.write(\`<script src='\${src}'><\\/script>\`) }
}`},SYN030:{code:"SYN030",title:"FinalizationRegistry registers a GC-triggered callback with hidden effects",rule:"`new FinalizationRegistry(callback)` registers a cleanup callback that fires when the registered target is garbage-collected. GC timing is non-deterministic and implementation-specific — the callback can fire at any point after the target becomes unreachable, in any micro-task checkpoint, with no guaranteed ordering relative to other code. Any capability use inside the callback (network calls, storage writes, stdout output) is invisible to botscript's static analysis: it cannot appear in the fn's `uses {}`, `reads {}`, or `writes {}` clause. Unlike timers, there is no cancel path — once registered, the callback fires whenever the GC decides. This is the most unpredictable scheduler in the platform and belongs behind an explicit unsafe acknowledgment.",idiom:'wrap `new FinalizationRegistry(cb)` in `unsafe "registers GC callback for <reason>" { ... }` to make the GC-callback registration visible and acknowledged in the fn\'s source; move any capability-bearing code out of the callback into an explicitly scheduled path (e.g. `queueMicrotask`, `setTimeout`) that callers can reason about',rewrite:`// before — GC callback hides capability use from fn header
fn withCleanup(target: object, key: string) -> void {
  const registry = new FinalizationRegistry((k) => {  // SYN030
    http.delete(\`/cache/\${k}\`)
  })
  registry.register(target, key)
}

// after — GC callback explicitly acknowledged
fn withCleanup(target: object, key: string) -> void {
  const registry = unsafe "registers GC callback for cache eviction" {
    new FinalizationRegistry((k) => { http.delete(\`/cache/\${k}\`) })
  }
  registry.register(target, key)
}`,example:`// SYN030: FinalizationRegistry fires a GC callback with invisible effects
fn trackObject(obj: object, id: string) -> void {
  const registry = new FinalizationRegistry((heldId) => {
    storage.delete(heldId)  // invisible to fn header — GC timing is undefined
  })
  registry.register(obj, id)
}

// fix: wrap in unsafe
fn trackObject(obj: object, id: string) -> void {
  const registry = unsafe "registers GC callback for object lifecycle tracking" {
    new FinalizationRegistry((heldId) => { storage.delete(heldId) })
  }
  registry.register(obj, id)
}`},SYN031:{code:"SYN031",title:"MessageChannel creates a paired async message channel with hidden delivery effects",rule:"`new MessageChannel()` creates two paired `MessagePort` objects (`port1`, `port2`). Messages sent via `port.postMessage(data)` are delivered asynchronously to the other port's `.onmessage` handler — after the current fn has returned, in a separate task. Any effects inside the `.onmessage` handler (network calls, storage writes, stdout) are invisible to botscript's static analysis: they cannot appear in the fn's `uses {}`, `reads {}`, or `writes {}` clause. Unlike `BroadcastChannel` (same-origin broadcast), a `MessageChannel` enables direct point-to-point async communication between any two contexts (windows, workers, iframes) — the capability surface of the receiving end is entirely invisible to the fn that creates the channel.",idiom:'wrap `new MessageChannel()` in `unsafe "creates message channel for <reason>" { ... }` to make the async channel creation visible and acknowledged in the fn\'s source; prefer explicit capability-declared interfaces over async message passing when callers need to reason about effects at compile time',rewrite:`// before — MessageChannel hides async delivery effects from fn header
fn bridge(worker: Worker) -> void {
  const { port1, port2 } = new MessageChannel()  // SYN031
  port1.onmessage = (e) => { http.post('/log', e.data) }  // invisible to fn header
  worker.postMessage('init', [port2])
}

// after — channel creation explicitly acknowledged
fn bridge(worker: Worker) -> void {
  const { port1, port2 } = unsafe "creates message channel for worker bridge" {
    new MessageChannel()
  }
  port1.onmessage = (e) => { http.post('/log', e.data) }
  worker.postMessage('init', [port2])
}`,example:`// SYN031: MessageChannel creates a channel whose async message delivery is invisible
fn setupChannel() -> MessagePort {
  const channel = new MessageChannel()
  channel.port1.onmessage = (e) => { storage.set('last', e.data) }  // invisible
  return channel.port2
}

// fix: wrap in unsafe
fn setupChannel() -> MessagePort {
  const channel = unsafe "creates message channel for port2 consumer" {
    new MessageChannel()
  }
  channel.port1.onmessage = (e) => { storage.set('last', e.data) }
  return channel.port2
}`},SYN032:{code:"SYN032",title:"new RTCPeerConnection() opens a peer-to-peer network channel invisible to the capability model",rule:"`new RTCPeerConnection(config)` initiates a WebRTC peer-to-peer session. Once the ICE handshake completes, the connection can exchange arbitrary data via `RTCDataChannel` or stream media — directly over UDP, bypassing all HTTP-layer visibility. CAP001 checks for `http.*` member calls; `RTCPeerConnection` is invisible to it. A fn that constructs an `RTCPeerConnection` has an undeclared network dependency capable of exfiltrating data via peer-to-peer UDP with no HTTP trace, making monitoring and auditing ineffective. ICE candidates are gathered asynchronously and connection events fire after the fn returns — all handler effects are invisible to the fn's `uses {}`, `reads {}`, or `writes {}` clause.",idiom:'wrap `new RTCPeerConnection(config)` in `unsafe "opens WebRTC peer connection for <reason>" { ... }` to make the peer-to-peer channel construction visible and acknowledged in the fn\'s source; prefer capability-declared http.* calls when only client-server communication is needed — RTCPeerConnection is appropriate only for genuine peer-to-peer media or data transfer',rewrite:`// before — RTCPeerConnection opens a network channel invisible to CAP001
fn initPeer(config: RTCConfiguration) -> void {
  const pc = new RTCPeerConnection(config)  // SYN032
  const dc = pc.createDataChannel('data')
  dc.onmessage = (e) => { storage.set('last', e.data) }  // invisible to fn header
}

// after — peer connection explicitly acknowledged
fn initPeer(config: RTCConfiguration) -> void {
  const pc = unsafe "opens WebRTC peer connection for p2p data channel" {
    new RTCPeerConnection(config)
  }
  const dc = pc.createDataChannel('data')
  dc.onmessage = (e) => { storage.set('last', e.data) }
}`,example:`// SYN032: RTCPeerConnection bypasses the capability model with peer-to-peer UDP
fn connectPeer(config: RTCConfiguration) -> RTCPeerConnection {
  const pc = new RTCPeerConnection(config)
  pc.onicecandidate = (e) => { http.post('/signal', e.candidate) }  // invisible
  return pc
}

// fix: wrap in unsafe
fn connectPeer(config: RTCConfiguration) -> RTCPeerConnection {
  const pc = unsafe "opens WebRTC peer connection for media relay" {
    new RTCPeerConnection(config)
  }
  pc.onicecandidate = (e) => { http.post('/signal', e.candidate) }
  return pc
}`},SYN033:{code:"SYN033",title:"import.meta.env access hides a deployment dependency",rule:"`import.meta.env.*` reads build-time environment variables injected by Vite, Vitest, esbuild, and similar bundlers. Unlike `process.env` (SYN005), which fires in Node.js contexts, `import.meta.env` is the standard pattern for environment access in modern browser-targeted and isomorphic bots. Both have the same problem: the fn silently depends on a deployment value that callers cannot see, audit, or override in tests. Any test that calls the fn must also have the right build-time environment, making the dependency invisible and the fn harder to isolate.",idiom:'pass config values as explicit fn parameters so callers control what is injected; read `import.meta.env.X` at the module\'s entry point, bind to a constant, and pass it down — or wrap in `unsafe "reads build-time env" { import.meta.env.API_KEY }` if direct access at the call site is required',rewrite:`// before — import.meta.env hides a deployment dependency
fn getApiUrl() -> string {
  return import.meta.env.VITE_API_URL  // SYN033
}

// after — caller controls the value; tests can inject
fn getApiUrl(baseUrl: string) -> string {
  return baseUrl
}`,example:`// SYN033: import.meta.env hides a deployment dependency
fn buildHeaders(token: string) -> Record<string, string> {
  const env = import.meta.env.MODE  // SYN033
  return { Authorization: token, 'X-Env': env }
}

// fix: accept env as an explicit parameter
fn buildHeaders(token: string, env: string) -> Record<string, string> {
  return { Authorization: token, 'X-Env': env }
}`},SYN034:{code:"SYN034",title:"location.* access reads ambient URL or triggers navigation — both invisible to callers",rule:"the global `location` object exposes two classes of hidden effect. Property reads (`location.href`, `.pathname`, `.search`, `.hash`, `.hostname`, `.host`, `.port`, `.protocol`, `.origin`) create an ambient URL dependency: the same fn returns different values depending on which deployment origin it runs in, making it impossible to unit-test without browser environment mocking. Navigation methods (`location.assign(url)`, `.replace(url)`, `.reload()`) are navigation side effects: they redirect or reload the page — a visible, persistent effect that outlives the fn call and cannot be declared in any fn header. Neither category is captured by CAP001 (which tracks stdlib namespaces) or any `uses {} / reads {} / writes {}` declaration.",idiom:'for URL reads: accept the required value as a parameter so callers can control it and tests can inject a fixed string; for navigation calls: accept a `navigate: (url: string) => void` callback as a parameter so callers decide what happens — or wrap in `unsafe "reads location.pathname for routing" { location.pathname }` if direct access is required',rewrite:`// before — location read hides a URL dependency
fn getSection() -> string {
  return location.pathname.split('/')[1]  // SYN034
}

// after — caller passes the pathname; fn is testable without a browser
fn getSection(pathname: string) -> string {
  return pathname.split('/')[1]
}`,example:`// SYN034: location.pathname hides a URL dependency
fn isAdminRoute() -> boolean {
  return location.pathname.startsWith('/admin')  // SYN034
}

// fix: accept pathname as a parameter
fn isAdminRoute(pathname: string) -> boolean {
  return pathname.startsWith('/admin')
}`},SYN035:{code:"SYN035",title:"history.* access mutates browser history or reads ambient navigation state — both invisible to callers",rule:"the global `history` object exposes two classes of hidden effect. Mutation methods (`history.pushState(state, title, url)`, `.replaceState(state, title, url)`, `.back()`, `.forward()`, `.go(delta)`) alter the browser history stack and/or the address bar — visible, persistent side effects that outlive the fn call and cannot be declared in any fn header. Ambient reads (`history.length`, `.state`, `.scrollRestoration`) return values that differ depending on how the user navigated to the current page; the same fn returns different results in different sessions without any visible declaration. Neither category is captured by CAP001 (which tracks stdlib namespaces) or any `uses {} / reads {} / writes {}` declaration.",idiom:"for history mutations: accept a `push: (url: string, state?: unknown) => void` callback as a parameter so callers control navigation, or wrap in `unsafe \"pushes route for <reason>\" { history.pushState(state, '', url) }` if direct access is required; for ambient reads: accept the required value as a parameter so callers can inject a fixed value in tests",rewrite:`// before — history mutation hides a navigation side effect
fn navigate(url: string) -> void {
  history.pushState(null, '', url)  // SYN035
}

// after — caller controls navigation; fn is testable without a browser
fn navigate(url: string, push: (url: string) => void) -> void {
  push(url)
}`,example:`// SYN035: history.pushState hides a navigation side effect
fn goTo(path: string) -> void {
  history.pushState(null, '', path)  // SYN035
}

// fix: accept a push callback; caller decides what navigation means
fn goTo(path: string, push: (p: string) => void) -> void {
  push(path)
}`},SYN036:{code:"SYN036",title:"WebAssembly.instantiate/compile executes opaque binary code invisible to the capability model",rule:"`WebAssembly.instantiate(bytes)`, `.instantiateStreaming(response)`, `.compile(bytes)`, `.compileStreaming(response)`, `new WebAssembly.Instance(module)`, and `new WebAssembly.Module(bytes)` execute or compile a binary WASM module at runtime. A WASM module's capability surface is entirely opaque to botscript's static analysis: the module can make network requests, write to memory, call any imported JS function, and produce any side effect — none of it visible in the caller's `uses {}`, `reads {}`, or `writes {}` declarations. This is the WASM analogue of `eval()` (SYN004): arbitrary execution from a binary blob that the compiler cannot inspect.",idiom:'accept the WASM module as a pre-compiled `WebAssembly.Module` parameter passed in by the caller, so capability decisions are made at the call site; or wrap in `unsafe "executes <module> WASM for <reason>" { WebAssembly.instantiate(bytes) }` with a comment explaining what capabilities the module uses and why direct instantiation is required',rewrite:`// before — WebAssembly.instantiate hides an opaque capability surface
fn runWasm(bytes: ArrayBuffer) -> Promise<WebAssembly.Exports> {
  const { instance } = await WebAssembly.instantiate(bytes, {})  // SYN036
  return instance.exports
}

// after — caller decides when/whether to instantiate; fn receives a ready module
fn runWasm(mod: WebAssembly.Instance) -> WebAssembly.Exports {
  return mod.exports
}`,example:`// SYN036: WebAssembly.instantiate executes opaque binary code
?bs 0.7
fn loadModule(bytes: ArrayBuffer) -> void {
  WebAssembly.instantiate(bytes, {})  // SYN036
}

// fix: accept a pre-instantiated module; let callers control WASM execution
fn loadModule(instance: WebAssembly.Instance) -> WebAssembly.Exports {
  return instance.exports
}`},SYN037:{code:"SYN037",title:"SYN-guarded global called via .call() / .apply() / .bind() bypasses name-token detection",rule:"`fetch.call(...)`, `fetch.apply(...)`, `WebSocket.call(...)`, and similar `.call()` / `.apply()` / `.bind()` invocations on SYN-guarded globals bypass SYN007–SYN036 name-token detection: the call-site token is `call`, `apply`, or `bind` — not `fetch` or `WebSocket` — so the guarded global can be invoked without triggering the corresponding SYN warning. A fn that calls `fetch.call(null, url)` has the same undeclared network dependency as one that calls `fetch(url)` directly.",idiom:'call the global directly (`fetch(url)`) so SYN007–SYN036 fire on the canonical name, then add the required capability declaration; if the indirect call is intentional, wrap in `unsafe "calls <global>.call for <reason>" { <global>.call(...) }`',rewrite:`// before — fetch.call bypasses SYN007 name-token detection
fn load(url: string) uses { net } -> string {
  return fetch.call(null, url)  // SYN037
}

// after — direct call; SYN007 fires if uses { net } is missing
fn load(url: string) uses { net } -> string {
  return fetch(url)
}`,example:`// SYN037: fetch.apply bypasses the capability model
fn request(url: string) uses { net } -> string {
  return fetch.apply(null, [url])  // SYN037
}

// fix: call fetch directly
fn request(url: string) uses { net } -> string {
  return fetch(url)
}`},SYN038:{code:"SYN038",title:"writing to globalThis / window / self property mutates global scope invisible to the capability model",rule:"writing to `globalThis.<member>`, `window.<member>`, or `self.<member>` adds or modifies a property on the global object — a side effect invisible to botscript's capability model: no `uses {}`, `reads {}`, or `writes {}` declaration covers global scope mutations. Any code in the runtime can observe the written value; callers cannot see the dependency from the fn header, and tests cannot isolate it without patching the global namespace.",idiom:'pass state through explicit parameters and return values so callers and tests can observe and control all data flow; if the global write is intentional (e.g. a polyfill or initializer), wrap in `unsafe "writes globalThis.<member> for <reason>" { globalThis.<member> = ... }`',rewrite:`// before — silent global write invisible to callers
fn register(handler: Handler) {
  globalThis.myHandler = handler  // SYN038
}

// after — state returned explicitly; caller owns the binding
fn register(handler: Handler) -> { myHandler: Handler } {
  return { myHandler: handler }
}`,example:`// SYN038: globalThis.config write bypasses the capability model
fn initConfig(cfg: Config) {
  globalThis.config = cfg  // SYN038
}

// fix: accept and return config explicitly
fn initConfig(cfg: Config) -> Config {
  return cfg
}`},SYN039:{code:"SYN039",title:"Object.defineProperty() / Object.defineProperties() mutates property descriptors invisibly",rule:"`Object.defineProperty(target, key, descriptor)` and `Object.defineProperties(target, descriptors)` redefine property attributes (value, writable, enumerable, configurable, get, set) at runtime. When called on a global receiver (`globalThis`, `window`, `self`) or any shared object, they install side effects — hidden getters/setters, non-writable locks, non-configurable seals — that are invisible to botscript's capability model: no `uses {}`, `reads {}`, or `writes {}` declaration covers property-descriptor mutations. Callers cannot audit or reverse the change from the fn's declared surface, and tests cannot isolate the effect without patching the global.",idiom:'avoid redefining properties on shared or global objects; if descriptor mutation is intentional (polyfill, sealed config object), wrap in `unsafe "redefines <target>.<key> for <reason>" { Object.defineProperty(...) }`',rewrite:`// before — installs a hidden getter on globalThis, invisible to callers
fn exposeConfig(cfg: Config) -> void {
  Object.defineProperty(globalThis, 'config', { get: () => cfg })  // SYN039
}

// after — pass config explicitly; no global mutation
fn getConfig(cfg: Config) -> Config {
  return cfg
}`,example:`// SYN039: Object.defineProperty installs a hidden getter
fn exposeConfig(cfg: Config) -> void {
  Object.defineProperty(globalThis, 'config', { get: () => cfg })  // SYN039
}

// SYN039: Object.defineProperties mutates multiple descriptors at once
fn sealApi(api: Api) -> void {
  Object.defineProperties(api, { fetch: { value: myFetch, writable: false } })  // SYN039
}`},SYN040:{code:"SYN040",title:"Object.setPrototypeOf() / __proto__ assignment mutates the prototype chain at runtime, bypassing the capability model",rule:"`Object.setPrototypeOf(target, proto)` and `target.__proto__ = proto` replace the prototype of `target` at runtime — silently redirecting all property lookups (including capability-gated globals such as `fetch`, `WebSocket`, `setTimeout`) through a new prototype chain that is invisible to the static capability model. SYN007–SYN039 checks fire on the source-level token of the guarded global; if a prototype mutation happens first, those checks are defeated at runtime even though the source appeared safe. A fn that mutates a prototype has a hidden side effect with no `uses {}`, `reads {}`, or `writes {}` counterpart in its header.",idiom:'avoid prototype mutation inside fn bodies; if the shape change is truly intentional, model it as an explicit data structure transformation or wrap in `unsafe "mutates prototype of <target> for <reason>" { Object.setPrototypeOf(...) }`',rewrite:`// before — prototype mutation is a hidden, undeclared side effect
fn patchGlobal(proto: object) -> void {
  Object.setPrototypeOf(globalThis, proto)  // SYN040
}

// after — model the shape change as an explicit data structure
fn withProto<T extends object>(target: T, proto: object) -> T {
  return Object.create(proto, Object.getOwnPropertyDescriptors(target)) as T
}`,example:`// SYN040: Object.setPrototypeOf() bypasses the capability model
fn shimFetch(proto: object) -> void {
  Object.setPrototypeOf(globalThis, proto)  // SYN040
}

// SYN040: __proto__ assignment equivalent
fn shimProto(obj: object, proto: object) -> void {
  obj.__proto__ = proto  // SYN040
}`},SYN041:{code:"SYN041",title:"globalThis / window / self receiver routes a dangerous global past SYN capability checks",rule:"Accessing a known-dangerous global via `globalThis.X`, `window.X`, or `self.X` bypasses the bare-identifier detection of SYN004–SYN040: the compiler's existing checks fire on `fetch(...)`, `eval(...)`, `WebSocket(...)`, etc. as bare calls, but those same checks exclude member-access forms — so `globalThis.fetch(...)` reaches the network without any capability warning. The global receiver form is equivalent at runtime; the capability bypass is identical.",idiom:'use botscript stdlib equivalents with explicit `uses {}` declarations (e.g. `http.get` instead of `globalThis.fetch`); if the global access is intentional, wrap in `unsafe "uses <global> directly for <reason>" { globalThis.<name>(...) }`',rewrite:`// before — globalThis.fetch bypasses SYN007 and the capability model
fn getData(url: string) -> any {
  return globalThis.fetch(url)  // SYN041
}

// after — explicit capability declaration visible to callers
fn getData(url: string) uses { network } -> any {
  return http.get(url)
}`,example:`// SYN041: globalThis receiver bypasses the fetch capability check
fn fetchData(url: string) -> any {
  return globalThis.fetch(url)  // SYN041 — same as bare fetch(), same bypass
}

// fix: use the stdlib capability
fn fetchData(url: string) uses { network } -> any {
  return http.get(url)
}`},SYN043:{code:"SYN043",title:"computed string property access on global receiver bypasses SYN041 name-based detection",rule:"`globalThis['fetch'](url)`, `window['eval'](code)`, and similar computed-string bracket accesses on global receivers bypass the bare-identifier detection of SYN004–SYN042 and the dot-notation detection of SYN041: the dangerous global name appears inside a string literal, not as a source-level identifier, so token-level checks on the callee ident cannot fire; at runtime the capability bypass is identical to `globalThis.fetch(url)` or `fetch(url)` directly; detection applies to `globalThis`, `window`, and `self` receivers followed by `[<string-literal>]` where the literal value is one of the SYN041-monitored dangerous members; suppressed inside `unsafe {}` blocks and `unsafe \"reason\" fn` bodies",idiom:"use botscript stdlib equivalents with explicit `uses {}` declarations instead of reaching for dangerous globals via computed property access; if a specific runtime indirection is unavoidable, wrap in `unsafe \"reason\" { globalThis['name'](...) }` to make the bypass visible in diff review",rewrite:`// before — globalThis['fetch'] bypasses SYN007 and SYN041
fn load(url: string) -> any {
  return globalThis['fetch'](url)  // SYN043
}

// after — explicit capability declaration visible to callers
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN043: globalThis['fetch'] bypasses the capability check
?bs 0.7
fn request(url: string) -> any {
  return globalThis['fetch'](url)  // SYN043
}

// SYN043: window['eval'] bypasses SYN004
?bs 0.7
fn run(code: string) -> void {
  window['eval'](code)  // SYN043
}

// fix: use stdlib equivalents with declared capabilities
fn request(url: string) uses { net } -> any {
  return http.get(url)
}`},SYN044:{code:"SYN044",title:"SYN-guarded global assigned to a local binding and called through the alias bypasses name-token detection",rule:'Assigning a SYN-guarded global to a local binding (`const f = fetch`, `const e = eval`) and then calling through that alias (`f(url)`, `e(code)`) bypasses SYN004–SYN043: all name-token checks fire on the guarded identifier itself, but the call site token is `f` or `e` — not `fetch` or `eval` — so the capability model is invisible to the alias. At runtime, `f(url)` and `fetch(url)` are identical; the alias is purely an evasion of the static check. Detection covers direct single-name RHS assignments (`const f = fetch`); computed, destructured, or member-access RHS forms are not covered and fall back to ALI001/ALI003. Suppressed inside `unsafe {}` blocks and `unsafe "reason" fn` bodies.',idiom:'call the guarded global directly so SYN004–SYN043 fire on the canonical name; if the alias is genuinely needed (e.g. dependency injection), wrap the aliased call in `unsafe "calls <global> via alias for <reason>" { f(...) }`',rewrite:`// before — const f = fetch aliases the guarded global; f(url) bypasses SYN007
const f = fetch
fn load(url: string) -> any {
  return f(url)  // SYN044
}

// after — call fetch directly; SYN007 fires if uses { net } is missing
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN044: eval aliased and called through the binding
?bs 0.7
const run = eval
fn execute(code: string) -> any {
  return run(code)  // SYN044 — same as eval(code), bypasses SYN004
}

// fix: call eval directly (then SYN004 fires) or use a botscript-approved alternative
fn execute(code: string) -> any {
  eval(code)  // SYN004 fires here — add unsafe "reason" { } to acknowledge
}`},SYN045:{code:"SYN045",title:"Module-scope alias of a global receiver object used as member-access receiver in fn body bypasses SYN041–SYN043",rule:'Assigning a global receiver object (`globalThis`, `window`, `self`) to a module-scope binding (`const g = globalThis`) and then using that alias as a member-access receiver inside a fn body (`g.fetch(url)`, `g.eval(code)`) bypasses SYN041–SYN043: those checks fire on the literal receiver tokens `globalThis`/`window`/`self` — the alias name `g` is not in any receiver watch-list, so `g.fetch(url)` reaches the network with no capability warning. At runtime the access is identical. Detection: a `const`/`let`/`var` binding at module scope whose RHS is exactly one of the three global-receiver idents (no call, no member access on the RHS); when that alias appears as a member-access receiver for a SYN041-dangerous member inside any fn body, SYN045 fires. Fn-body-level aliases are not tracked to avoid shadowing false positives. Suppressed inside `unsafe {}` blocks and `unsafe "reason" fn` bodies.',idiom:'access the guarded global directly so SYN041 fires on the canonical receiver name; if aliasing globalThis/window/self is genuinely required, wrap the aliased member access in `unsafe "uses <member> via aliased receiver for <reason>" { g.<member>(...) }`',rewrite:`// before — const g = globalThis aliases the receiver; g.fetch() bypasses SYN041
const g = globalThis
fn load(url: string) -> any {
  return g.fetch(url)  // SYN045
}

// after — access through canonical receiver; SYN041 fires if uses { net } is missing
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN045: globalThis aliased and used as member-access receiver
?bs 0.7
const g = globalThis
fn run(url: string) -> any {
  return g.fetch(url)  // SYN045 — same as globalThis.fetch(url), bypasses SYN041
}

// fix: access globalThis.fetch directly (then SYN041 fires) or use stdlib
fn run(url: string) uses { net } -> any {
  return http.get(url)  // explicit capability declaration
}`},SYN046:{code:"SYN046",title:"Module-scope destructuring rename of a guarded global called through the alias bypasses SYN name-token checks",rule:'Destructuring a dangerous global from `globalThis`, `window`, or `self` with a rename (`const { fetch: req } = globalThis`) and then calling through the alias (`req(url)`) bypasses all name-token checks SYN004–SYN045: those checks fire on the canonical name (`fetch`, `eval`, etc.) or the canonical receiver (`globalThis`/`window`/`self`) — the renamed alias `req` appears on no watch-list, so `req(url)` reaches the network with no capability warning. At runtime `req(url)` and `fetch(url)` are identical. Detection: a `const`/`let`/`var` destructuring at module scope whose RHS is a global-receiver ident and whose pattern contains a `dangerous: alias` rename where `dangerous` is in the SYN037-guarded set; when that alias is called in any fn body (not a method access, not a declaration), SYN046 fires. Fn-body-level destructuring is not tracked to avoid shadowing false positives. `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.',idiom:'call the guarded global directly so the relevant SYN check fires; if the destructuring rename is genuinely needed (e.g. dependency injection), wrap the call in `unsafe "calls <global> via destructuring rename for <reason>" { req(...) }`',rewrite:`// before — const { fetch: req } = globalThis; req() bypasses SYN007
const { fetch: req } = globalThis
fn load(url: string) -> any {
  return req(url)  // SYN046
}

// after — call fetch directly; SYN007 fires if uses { net } is missing
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN046: fetch renamed during destructuring; req() bypasses SYN007
?bs 0.7
const { fetch: req } = globalThis
fn load(url: string) -> any {
  return req(url)  // SYN046 — same as fetch(url), bypasses SYN007+SYN044
}

// SYN046: eval renamed; run() bypasses SYN004
?bs 0.7
const { eval: run } = globalThis
fn execute(code: string) -> any {
  return run(code)  // SYN046
}

// fix: call the guarded global directly
fn load(url: string) uses { net } -> any {
  return http.get(url)  // explicit capability declaration
}`},SYN047:{code:"SYN047",title:"Node.js global receiver bypasses SYN041–SYN046 capability checks",rule:"In Node.js, `global` is the native global object — equivalent to `globalThis` at runtime. Accessing a dangerous global via `global.fetch(url)`, `global['eval'](code)`, or writing `global.foo = val` bypasses all 46 prior SYN checks: SYN041–SYN043 only watch `globalThis`, `window`, and `self` receivers, so `global.*` routes the same capability bypass past every token-level check. Detection: `global.<member>` or `global[<string-literal>]` access inside a fn body where `<member>` or the literal is a SYN041-dangerous global or a property write to `global.*`; `unsafe {}` blocks and `unsafe \"reason\" fn` bodies are suppressed. Note: `global` used as a parameter name or local binding is not distinguished — prefer `globalThis` (cross-environment standard) over `global` in botscript code.",idiom:'use botscript stdlib equivalents with explicit `uses {}` declarations rather than reaching for `global.*`; if `global` access is genuinely required (e.g. Node built-in shimming), wrap in `unsafe "uses <member> via Node global for <reason>" { global.<member> }`',rewrite:`// before — global.fetch bypasses SYN007 and SYN041
fn load(url: string) -> any {
  return global.fetch(url)  // SYN047
}

// after — explicit capability declaration visible to callers
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN047: global.fetch bypasses the network capability check
?bs 0.7
fn load(url: string) -> any {
  return global.fetch(url)  // SYN047 — same bypass as globalThis.fetch (SYN041)
}

// SYN047: computed bracket form
?bs 0.7
fn run(code: string) -> any {
  return global['eval'](code)  // SYN047 — same bypass as globalThis['eval'] (SYN043)
}

// fix: explicit capability
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`},SYN048:{code:"SYN048",title:"fn-body-local alias of a SYN-guarded global bypasses SYN004–SYN047 name-token detection",rule:"Declaring a binding inside a fn body that aliases a SYN-guarded global (`const req = fetch`, `const run = eval`) and then calling through that alias (`req(url)`, `run(code)`) in the same fn body bypasses all 47 prior SYN checks: those checks fire on the canonical identifier token, but the call-site token is `req` or `run` — not `fetch` or `eval`. SYN044 only covers module-scope aliases (it explicitly skips fn-body-local bindings to avoid shadowing false positives at module scope). SYN048 fills the gap: per-fn-body pre-pass collects `const`/`let`/`var <alias> = <guarded-global>` declarations inside the fn body (skipping nested fn bodies to respect scope), then fires when the alias is called (next significant token is `(` or `?.`) in the same body. Member-access calls (`obj.req()`), declaration sites, and `unsafe {}` blocks are suppressed.",idiom:'call the guarded global directly so the relevant SYN check fires; if aliasing is genuinely needed for readability or dependency injection, wrap the call in `unsafe "calls <global> via local alias for <reason>" { req(...) }`',rewrite:`// before — const req = fetch inside fn body; req(url) bypasses SYN007
fn load(url: string) -> any {
  const req = fetch
  return req(url)  // SYN048
}

// after — call fetch directly; SYN007 fires if uses { net } is missing
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN048: fetch aliased inside fn body; req() bypasses SYN007
?bs 0.7
fn load(url: string) -> any {
  const req = fetch
  return req(url)  // SYN048 — same as fetch(url), bypasses SYN004–SYN047
}

// SYN048: eval aliased inside fn body; run() bypasses SYN004
?bs 0.7
fn execute(code: string) -> any {
  const run = eval
  return run(code)  // SYN048
}

// fix: call the guarded global directly (then SYN007/SYN004 fires)
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`},SYN049:{code:"SYN049",title:"fn-body-local alias of a global receiver used as member-access receiver bypasses SYN041–SYN048",rule:"`const g = globalThis` (or `window`, `self`) declared inside a fn body followed by `g.fetch(url)` or `g['eval'](code)` in the same fn body bypasses SYN041–SYN048: SYN041 fires on `globalThis.X`, `window.X`, and `self.X` tokens directly, but when the receiver is a local alias the canonical receiver token does not appear at the call site. SYN045 covers module-scope receiver aliases; SYN049 closes the fn-body gap: per-fn-body pre-pass collects `const`/`let`/`var <alias> = <receiver-global>` declarations (skipping nested fn bodies), then fires when the alias is followed by `.` or `?.` and a dangerous member name from the SYN041 watch-list in the same fn body. Suppressed inside `unsafe {}` blocks and `unsafe \"reason\" fn` bodies.",idiom:"access dangerous globals via their canonical receiver token (`globalThis.X`, `window.X`) so SYN041 fires; better still, use the botscript stdlib capability equivalent with an explicit `uses {}` declaration",rewrite:`// before — const g = globalThis inside fn body; g.fetch() bypasses SYN007+SYN041
fn load(url: string) -> any {
  const g = globalThis
  return g.fetch(url)  // SYN049
}

// after — use stdlib; SYN007 fires if uses { net } is missing
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN049: globalThis aliased inside fn body; g.fetch() bypasses SYN041
?bs 0.7
fn load(url: string) -> any {
  const g = globalThis
  return g.fetch(url)  // SYN049 — same as globalThis.fetch(url), bypasses SYN041–SYN048
}

// SYN049: window aliased inside fn body; w.eval() bypasses SYN004
?bs 0.7
fn execute(code: string) -> any {
  const w = window
  return w.eval(code)  // SYN049
}

// fix: use the botscript stdlib or access via canonical receiver
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`},SYN050:{code:"SYN050",title:"fn-body-local destructuring rename of a guarded global bypasses SYN004–SYN049 name-token detection",rule:"`const { fetch: req } = globalThis` (or `window`, `self`) declared inside a fn body followed by `req(url)` in the same fn body bypasses all 49 prior SYN checks: those checks fire on the canonical identifier token, but the call-site token is `req` — not `fetch`. SYN046 covers module-scope destructuring renames; SYN050 closes the fn-body gap: per-fn-body pre-pass collects `const`/`let`/`var { <guarded>: <alias> } = <receiver>` declarations inside each fn body (skipping nested fn bodies), then fires when the alias is called (next significant token is `(` or `?.`) in the same fn body. Member-access calls (`obj.req()`), declaration sites, and `unsafe {}` blocks are suppressed.",idiom:'call the guarded global directly so the relevant SYN check fires; if destructuring aliasing is genuinely needed, wrap the call in `unsafe "calls <global> via destructured alias for <reason>" { req(...) }`',rewrite:`// before — const { fetch: req } = globalThis inside fn body; req(url) bypasses SYN007
fn load(url: string) -> any {
  const { fetch: req } = globalThis
  return req(url)  // SYN050
}

// after — call fetch directly; SYN007 fires if uses { net } is missing
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN050: fetch destructured-renamed inside fn body; req() bypasses SYN007
?bs 0.7
fn load(url: string) -> any {
  const { fetch: req } = globalThis
  return req(url)  // SYN050 — same as fetch(url), bypasses SYN004–SYN049
}

// SYN050: eval destructured-renamed inside fn body; run() bypasses SYN004
?bs 0.7
fn execute(code: string) -> any {
  const { eval: run } = globalThis
  return run(code)  // SYN050
}

// fix: call the guarded global directly (then SYN007/SYN004 fires)
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`},SYN042:{code:"SYN042",title:"Reflect.* call bypasses static name-based SYN capability and property checks",rule:"Six `Reflect` methods defeat botscript's token-level static checks: `Reflect.apply(target, thisArg, args)` and `Reflect.construct(target, args)` call a function or constructor dynamically — SYN004–SYN041 fire on source-level idents (eval, fetch, WebSocket…) and cannot see through dynamic dispatch, so `Reflect.apply(fetch, null, [url])` reaches the network with no capability warning; `Reflect.set(obj, key, value)`, `Reflect.defineProperty(obj, key, attrs)`, and `Reflect.deleteProperty(obj, key)` mutate object properties at runtime — invisible to the capability model and equivalent to the mutations caught by SYN039; `Reflect.setPrototypeOf(obj, proto)` replaces the prototype chain, defeating runtime-level property-lookup guards in the same way as `Object.setPrototypeOf` (SYN040)",idiom:'avoid Reflect methods on shared or capability-gated objects; pass functions as explicit parameters instead of dispatching them dynamically; if Reflect use is required for a legitimate reason, wrap in `unsafe "reason for Reflect.method" { Reflect.method(...) }`',rewrite:`// before — Reflect.apply bypasses SYN007 and reaches the network
fn fetchData(url: string) -> any {
  return Reflect.apply(fetch, null, [url])  // SYN042
}

// after — explicit capability declaration visible to callers
fn fetchData(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN042: Reflect.apply bypasses the fetch capability check
fn fetchData(url: string) -> any {
  return Reflect.apply(fetch, null, [url])  // SYN042
}

// SYN042: Reflect.set mutates object property invisibly
fn mutate(obj: Record<string, unknown>) -> void {
  Reflect.set(obj, 'key', 'value')  // SYN042
}

// fix: pass values explicitly rather than using reflective mutation
fn mutate(obj: Record<string, unknown>, key: string, value: unknown) -> void {
  obj[key] = value
}`},DEP001:{code:"DEP001",title:"fn transitively reads a resource category not declared in its header",rule:"if fn A calls fn B (directly or transitively) and B declares `reads { x }`, then A must also declare `reads { x }` — the reads surface must be complete at every call layer",idiom:"a fn's reads declaration is the union of its own declared reads plus the reads of everything it calls; add the missing label to the caller's `reads { }` clause",rewrite:"fn name(...) reads { …existing, missing } -> ...",example:`// before — loadUser calls getFromCache which reads { cache }, but loadUser doesn't declare it
?bs 0.9
fn getFromCache(id: string) reads { cache } -> string = id
fn loadUser(id: string) -> string = getFromCache(id)  // DEP001

// after
?bs 0.9
fn getFromCache(id: string) reads { cache } -> string = id
fn loadUser(id: string) reads { cache } -> string = getFromCache(id)`},DEP002:{code:"DEP002",title:"fn transitively writes a resource category not declared in its header",rule:"if fn A calls fn B (directly or transitively) and B declares `writes { x }`, then A must also declare `writes { x }` — the writes surface must be complete at every call layer",idiom:"a fn's writes declaration is the union of its own declared writes plus the writes of everything it calls; add the missing label to the caller's `writes { }` clause",rewrite:"fn name(...) writes { …existing, missing } -> ...",example:`// before — recordEvent calls updateMetrics which writes { metrics }, but recordEvent doesn't declare it
?bs 0.9
fn updateMetrics(id: string) writes { metrics } -> void { }
fn recordEvent(id: string) -> void { updateMetrics(id); }  // DEP002

// after
?bs 0.9
fn updateMetrics(id: string) writes { metrics } -> void { }
fn recordEvent(id: string) writes { metrics } -> void { updateMetrics(id); }`},THR004:{code:"THR004",title:"fn declares throws {} label not justified by any callee or direct construction",rule:"a declared throws {} label should reflect an error type the fn or its callees can actually throw; if no same-file callee (transitively) throws X and the fn body does not construct err(X...), the label may be stale",idiom:"remove the stale label from the throws {} clause; leaf fns and fns that directly construct err(X) can safely declare X even if no callee propagates it",rewrite:"fn name(...) throws { …remaining } -> ...  // remove label not propagated by any callee or body",example:`// before — load calls helper() but neither throws NetworkError
?bs 0.9
fn helper(id: string) -> string = "ok"
fn load(id: string) throws { NetworkError } -> string = helper(id)  // THR004

// after
?bs 0.9
fn helper(id: string) -> string = "ok"
fn load(id: string) -> string = helper(id)`},DEP003:{code:"DEP003",title:"fn declares reads {} label not justified by any tracked callee (warning)",rule:"a declared reads {} label must be justified by at least one tracked callee declaring the same label; DEP003 fires when the pass can resolve all same-file callees and none of them (nor any moduleEffects entry) transitively declares reads { x }; the pass does not scan fn bodies for direct resource access — it is a call-graph heuristic, not a body scanner; suppressed when the fn has any opaque/untracked external call",idiom:"remove the stale label from the reads {} clause when no tracked callee propagates it; if the label is live through a cross-module call, the opaque-call suppression prevents a false positive; leaf fns and fns with opaque external calls are excluded — the warning only fires when the pass can fully resolve the call graph",rewrite:"fn name(...) reads { …remaining } -> ...  // remove label not propagated by any callee",example:`// before — getUser calls helper() but helper() does not read userDb
?bs 0.9
fn helper(id: string) -> string = "Alice"
fn getUser(id: string) reads { userDb } -> string { helper(id) }  // DEP003

// after — remove stale label
?bs 0.9
fn helper(id: string) -> string = "Alice"
fn getUser(id: string) -> string { helper(id) }`},DEP004:{code:"DEP004",title:"fn declares writes {} label not justified by any tracked callee (warning)",rule:"a declared writes {} label must be justified by at least one tracked callee declaring the same label; DEP004 fires when the pass can resolve all same-file callees and none of them (nor any moduleEffects entry) transitively declares writes { x }; the pass does not scan fn bodies for direct resource access — it is a call-graph heuristic, not a body scanner; suppressed when the fn has any opaque/untracked external call",idiom:"remove the stale label from the writes {} clause when no tracked callee propagates it; if the label is live through a cross-module call, the opaque-call suppression prevents a false positive; leaf fns and fns with opaque external calls are excluded — the warning only fires when the pass can fully resolve the call graph",rewrite:"fn name(...) writes { …remaining } -> ...  // remove label not propagated by any callee",example:`// before — logEvent calls save() but save() does not write auditLog
?bs 0.9
fn save(msg: string) -> void { }
fn logEvent(msg: string) writes { auditLog } -> void { save(msg) }  // DEP004

// after — remove stale label
?bs 0.9
fn save(msg: string) -> void { }
fn logEvent(msg: string) -> void { save(msg) }`},THR003:{code:"THR003",title:"outer fn declares narrower throws than a callback parameter",rule:"if a function-typed parameter declares `throws { X }`, the containing fn must declare at least those exception types — calling the callback can surface X, so the outer fn's throws surface must cover it",idiom:"a fn's throws surface is the union of its own declared throws and the throws its callback parameters may exercise",rewrite:"fn name(handler: () throws { X } -> T) throws { …existing, X } -> ...",example:`// before — accepts a throwing callback but outer fn declares no throws
?bs 0.9
fn process(
  items: string[],
  handler: fn(string) throws { NetworkError } -> void
) -> void {   // THR003: missing throws { NetworkError }
  handler(items[0])
}

// after — outer fn declares the throws its callback may exercise
?bs 0.9
fn process(
  items: string[],
  handler: fn(string) throws { NetworkError } -> void
) throws { NetworkError } -> void {
  handler(items[0])
}`},MAT001:{code:"MAT001",title:"non-exhaustive match on Result — missing ok or err arm",rule:"a match expression that explicitly handles the `ok` or `err` tag must also handle the other; add the missing arm or a wildcard `_` to make the match exhaustive",idiom:"prefer explicit `ok` and `err` arms over a wildcard when the error type carries useful context — a wildcard silently discards the payload",rewrite:"add the missing 'ok { v } -> ...' or 'err { e } -> ...' arm, or a '_ -> ...' wildcard",example:`// before — match on Result is missing the err arm
?bs 0.9
fn fetchUser(id: string) uses { net } -> string {
  match http.get(\`/users/\${id}\`) {
    ok { value } -> value.body  // MAT001: missing err arm
  }
}

// after
?bs 0.9
fn fetchUser(id: string) uses { net } -> Result<string, string> {
  match http.get(\`/users/\${id}\`) {
    ok { value } -> ok(value.body)
    err { e } -> err(e.message)
  }
}`},MAT002:{code:"MAT002",title:"non-exhaustive match on Option — missing some or none arm",rule:"a match expression that explicitly handles the `some` or `none` tag must also handle the other; add the missing arm or a wildcard `_` to make the match exhaustive",idiom:"prefer explicit `some { v }` and `none` arms over a wildcard — a wildcard silently discards the payload and hides the fact that the absent case was considered",rewrite:"add the missing 'some { v } -> ...' or 'none -> ...' arm, or a '_ -> ...' wildcard",example:`// before — match on Option is missing the none arm
?bs 0.9
fn greet(name: Option<string>) -> string {
  match name {
    some { v } -> \`Hello, \${v}\`  // MAT002: missing none arm
  }
}

// after
?bs 0.9
fn greet(name: Option<string>) -> string {
  match name {
    some { v } -> \`Hello, \${v}\`
    none -> "Hello, stranger"
  }
}`},MAT003:{code:"MAT003",title:"non-exhaustive match on user-defined tagged union — missing variant arm",rule:"a match expression whose arm tags (all CapCase, no wildcard) unambiguously identify a single known user-defined tagged union must cover all of that union's variants; add the missing arm(s) or a wildcard `_` to make the match exhaustive",idiom:"prefer explicit arms for every variant over a wildcard — explicit arms ensure future variants added to the union are caught at compile time rather than silently falling through",rewrite:"add the missing variant arm(s) or a '_ -> ...' wildcard",example:`// before — match on Status is missing the Failed arm
?bs 0.9
type Status = Loading | Done { value: string } | Failed { code: number }

fn describe(s: Status) -> string {
  match s {
    Loading   -> "loading..."
    Done { value } -> value  // MAT003: Failed arm missing
  }
}

// after
?bs 0.9
type Status = Loading | Done { value: string } | Failed { code: number }

fn describe(s: Status) -> string {
  match s {
    Loading        -> "loading..."
    Done { value } -> value
    Failed { code } -> \`error \${code}\`
  }
}`},MAT004:{code:"MAT004",title:"unreachable wildcard arm — match already covers all variants of the tagged union",rule:"a match expression that explicitly covers all variants of a known user-defined tagged union and also has a wildcard `_ -> ...` arm is over-specified; the wildcard is dead code and silently absorbs any new variants added to the union instead of letting MAT003 catch them",idiom:"remove the wildcard arm from exhaustive tagged-union matches so that adding a new union variant immediately triggers a MAT003 error rather than silently falling through the wildcard",rewrite:"remove the '_ -> ...' wildcard arm",example:`// before — Color match is exhaustive but has a redundant trailing wildcard
?bs 0.9
type Color = Red { hex: string } | Green | Blue

fn colorName(c: Color) -> string {
  match c {
    Red { hex } -> hex
    Green       -> "green"
    Blue        -> "blue"
    _ -> "unreachable"  // MAT004: wildcard is dead code
  }
}

// after — remove the wildcard; MAT003 will catch new variants
?bs 0.9
type Color = Red { hex: string } | Green | Blue

fn colorName(c: Color) -> string {
  match c {
    Red { hex } -> hex
    Green       -> "green"
    Blue        -> "blue"
  }
}`},MAT005:{code:"MAT005",title:"match arm on halt-annotated variant must call halt() or throw",rule:'a match arm covering a variant declared with the `halt` modifier must terminate by calling `halt()` or using a `throw` expression — returning a continuable value is not allowed; use `unsafe "<reason>" { ... }` to explicitly override the constraint when a recovery path is truly safe',idiom:"halt-annotated variants represent states that cannot be safely continued from (epistemic debt, unresolvable errors, etc.); the compiler enforces that these arms cannot silently produce a value that lets execution continue as if nothing happened",rewrite:"change the arm body to call `halt(<message>)` or `throw new Error(<message>)` instead of returning a continuable value",example:`// before — Unresolvable halt arm returns a string (MAT005)
?bs 0.9
type QueryResult = Confirmed { value: string } | Unresolvable halt { reason: string }

fn handleQuery(r: QueryResult) -> string {
  match r {
    Confirmed { value } -> value
    Unresolvable { reason } -> "best effort"  // MAT005
  }
}

// after — arm terminates with halt()
?bs 0.9
type QueryResult = Confirmed { value: string } | Unresolvable halt { reason: string }

fn handleQuery(r: QueryResult) -> string {
  match r {
    Confirmed { value } -> value
    Unresolvable { reason } -> halt(\`unresolvable: \${reason}\`)
  }
}`},MAT006:{code:"MAT006",title:"distinct-annotated variant handled identically to a sibling arm",rule:"a variant declared with the `distinct` modifier requires its match arm body to differ from all other non-wildcard arms in the same match expression — identical arm bodies indicate the epistemic distinction between variants is being silently collapsed",idiom:"`distinct` marks a variant whose error class is fundamentally different from its siblings (e.g. operational failure vs. epistemic debt); the compiler enforces that these arms have observably different handling so that the type-level separation is not a no-op at runtime",rewrite:"give the arm for the `distinct` variant a body that differs from its sibling arms — at minimum, call a different function or emit a different diagnostic to preserve the distinction",example:`// before — Unresolvable distinct arm uses same body as Recoverable arm (MAT006)
?bs 0.9
type QueryResult =
  | Confirmed { value: string }
  | Recoverable { reason: string }
  | Unresolvable distinct { reason: string }

fn handleQuery(r: QueryResult) -> string {
  match r {
    Confirmed { value } -> value
    Recoverable { reason } -> continueWithDefault(reason)
    Unresolvable { reason } -> continueWithDefault(reason)  // MAT006
  }
}

// after — distinct arm has observably different handling
?bs 0.9
type QueryResult =
  | Confirmed { value: string }
  | Recoverable { reason: string }
  | Unresolvable distinct { reason: string }

fn handleQuery(r: QueryResult) -> string {
  match r {
    Confirmed { value } -> value
    Recoverable { reason } -> continueWithDefault(reason)
    Unresolvable { reason } -> halt(\`unresolvable query: \${reason}\`)
  }
}`},THR001:{code:"THR001",title:"fn transitively throws an exception type not declared in its header",rule:"if fn A calls fn B (directly or transitively) and B declares `throws { X }`, then A must also declare `throws { X }` — the throws surface must be complete at every call layer",idiom:"a fn's throws declaration is the union of its own declared throws plus the throws of everything it calls; add the missing exception type to the caller's `throws { }` clause",rewrite:"fn name(...) throws { …existing, MissingError } -> ...",example:`// before — loadUser calls fetchRemote which throws { HttpError }, but loadUser doesn't declare it
?bs 0.9
fn fetchRemote(id: string) throws { HttpError } -> string = id
fn loadUser(id: string) -> string = fetchRemote(id)  // THR001

// after
?bs 0.9
fn fetchRemote(id: string) throws { HttpError } -> string = id
fn loadUser(id: string) throws { HttpError } -> string = fetchRemote(id)`},THR002:{code:"THR002",title:"fn body constructs an error type not present in its throws declaration",rule:"if a fn body contains `err(TypeName(...))`, `err(new TypeName(...))`, or bare `err(TypeName)` where TypeName (CapCase ident) is not in the fn's own `throws { }` set, the fn is producing an error callers cannot match — they will never see a TypeName arm",idiom:"add the constructed error type to the fn's `throws { }` clause so callers can exhaustively match it; indirect patterns like `err(e)` (where e's type is inferred) are out of scope — only direct constructor calls and bare CapCase references are checked",rewrite:"fn name(...) throws { …existing, UndeclaredError } -> ...",example:`// before — parseConfig constructs NetworkError but declares throws { ParseError }
?bs 0.9
fn parseConfig(s: string) throws { ParseError } -> Result<string, string> {
  if (bad) err(NetworkError("timed out"))  // THR002: NetworkError not declared
  else ok(s)
}

// after
?bs 0.9
fn parseConfig(s: string) throws { ParseError, NetworkError } -> Result<string, string> {
  if (bad) err(NetworkError("timed out"))
  else ok(s)
}`},VER001:{code:"VER001",title:"reads {} / writes {} declared below the ?bs 0.9 enforcement floor — annotation is unenforced",rule:"DEP001/DEP002 (reads/writes transitivity) are enforced from `?bs 0.9`; a non-empty `reads {}` or `writes {}` clause on a file pinned below 0.9 is accepted but not verified — it is documentation only",idiom:"annotate now if you intend to enforce later, but know that reviewers reading the header cannot assume the compiler has checked it; upgrade the pin to `?bs 0.9` to activate enforcement",rewrite:"upgrade pin to `?bs 0.9` to activate DEP001/DEP002 enforcement",example:`// before — reads {} at ?bs 0.8 is documentation only (VER001 warning)
?bs 0.8
fn loadUser(id: string) reads { userDb } -> string = id

// after — enforcement active
?bs 0.9
fn loadUser(id: string) reads { userDb } -> string = id`},VER002:{code:"VER002",title:"throws {} declared below the ?bs 0.9 enforcement floor — annotation is unenforced",rule:"THR001 (throws transitivity) is enforced from `?bs 0.9`; a non-empty `throws {}` clause on a file pinned below 0.9 is accepted but not verified — it is documentation only",idiom:"annotate now if you intend to enforce later, but know that reviewers reading the header cannot assume the compiler has checked it; upgrade the pin to `?bs 0.9` to activate enforcement",rewrite:"upgrade pin to `?bs 0.9` to activate THR001 enforcement",example:`// before — throws {} at ?bs 0.8 is documentation only (VER002 warning)
?bs 0.8
fn loadUser(id: string) throws { NetworkError } -> string = id

// after — enforcement active
?bs 0.9
fn loadUser(id: string) throws { NetworkError } -> string = id`},VER003:{code:"VER003",title:"intent: annotation declared below the ?bs 0.7 enforcement floor — annotation is unenforced",rule:'INT001–INT005 (intent consistency checks) are enforced from `?bs 0.7`; a non-empty `intent: "..."` clause on a file pinned below 0.7 is accepted but not verified — it is documentation only',idiom:"annotate now if you intend to enforce later, but know that reviewers reading the header cannot assume the compiler has checked it; upgrade the pin to `?bs 0.7` to activate enforcement",rewrite:"upgrade pin to `?bs 0.7` to activate INT001–INT005 enforcement",example:`// before — intent: at ?bs 0.6 is documentation only (VER003 warning)
?bs 0.6
fn now() intent: "pure" -> number = pure { time.now() }

// after — enforcement active
?bs 0.7
fn now() intent: "pure" -> number = pure { time.now() }  // INT002 would fire here`},SYN051:{code:"SYN051",title:"module-scope assignment-expression alias of a guarded global called in a fn body bypasses SYN004–SYN050",rule:"`let f; f = fetch` at module scope followed by `f(url)` inside a fn body bypasses SYN004–SYN050: all prior checks fire on the guarded identifier token at the call site, but `f` is not in any watch-list. SYN044 catches the `const/let/var f = fetch` declaration form; SYN051 closes the bare assignment gap: a pre-pass scans module-scope assignment expressions (`<ident> = <guarded>`, not preceded by `const`/`let`/`var`) and fires when the alias is called (next significant token is `(` or `?.`) in any fn body. Member-access calls (`obj.f()`), declaration sites, and `unsafe {}` blocks are suppressed.",idiom:'call the guarded global directly so the relevant SYN check fires; if the alias is genuinely needed, wrap the call in `unsafe "calls <global> via assignment alias for <reason>" { f(...) }`',rewrite:`// before — let f at module scope; f = fetch then f(url) in fn body bypasses SYN007
?bs 0.7
let f: typeof fetch
f = fetch
fn load(url: string) -> any {
  return f(url)  // SYN051
}

// after — call fetch directly; SYN007 fires if uses { net } is missing
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN051: let f at module scope; f = fetch (assignment, not declaration); f() bypasses SYN007
?bs 0.7
let f: typeof fetch
f = fetch
fn load(url: string) -> any {
  return f(url)  // SYN051 — f is a module-scope assignment alias of fetch
}

// SYN051: f = eval; f() bypasses SYN004
?bs 0.7
let f: typeof eval
f = eval
fn execute(code: string) -> any {
  return f(code)  // SYN051
}

// fix: call the guarded global directly (then SYN007/SYN004 fires)
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`},SYN052:{code:"SYN052",title:"module-scope assignment-expression alias of a global receiver used as member-access receiver bypasses SYN041–SYN050",rule:"`let g; g = globalThis` (or `window`, `self`) at module scope followed by `g.fetch(url)` inside a fn body bypasses SYN041–SYN050: those checks fire on the literal receiver tokens (`globalThis`, `window`, `self`) and prior alias checks fire on `const/let/var`-declared aliases, but `g` assigned via a bare expression is not in any receiver watch-list. SYN045 catches the `const/let/var g = globalThis` declaration form; SYN052 closes the bare assignment gap: a pre-pass scans module-scope assignment expressions (`<ident> = <receiver-global>`, not preceded by `const`/`let`/`var`) and fires when the alias appears as a member-access receiver (`g.member` or `g?.member`) for a dangerous member in the SYN041 watch-list inside any fn body. `unsafe {}` blocks are suppressed.",idiom:"access dangerous globals via their canonical receiver token (`globalThis.X`, `window.X`) so SYN041 fires; better still, use the botscript stdlib capability equivalent with an explicit `uses {}` declaration",rewrite:`// before — let g at module scope; g = globalThis then g.fetch() in fn body bypasses SYN041
?bs 0.7
let g: typeof globalThis
g = globalThis
fn load(url: string) -> any {
  return g.fetch(url)  // SYN052
}

// after — use stdlib; SYN007 fires if uses { net } is missing
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN052: let g at module scope; g = globalThis (assignment); g.fetch() bypasses SYN041
?bs 0.7
let g: typeof globalThis
g = globalThis
fn load(url: string) -> any {
  return g.fetch(url)  // SYN052 — g is an assignment alias of globalThis
}

// SYN052: g = window; g.eval() bypasses SYN004
?bs 0.7
let g: typeof window
g = window
fn execute(code: string) -> any {
  return g.eval(code)  // SYN052
}

// fix: use the botscript stdlib or access via canonical receiver
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`},SYN053:{code:"SYN053",title:"fn-body assignment-expression alias of a guarded global called in the same fn body bypasses SYN004–SYN052",rule:"`let f; f = fetch` inside a fn body followed by `f(url)` in the same fn body bypasses SYN004–SYN052: all prior checks fire on the guarded identifier token at the call site, but `f` is not in any watch-list. SYN048 catches the `const/let/var f = fetch` declaration form inside fn bodies; SYN051 catches the bare assignment form at module scope. SYN053 closes the remaining gap: a per-fn-body pre-pass scans assignment expressions (`<ident> = <guarded>`, not preceded by `const`/`let`/`var`) inside each fn body and fires when the alias is called (next significant token is `(` or `?.`) in the same fn body. Member-access calls (`obj.f()`), declaration sites, and `unsafe {}` blocks are suppressed.",idiom:'call the guarded global directly so the relevant SYN check fires; if the alias is genuinely needed, wrap the call in `unsafe "calls <global> via assignment alias for <reason>" { f(...) }`',rewrite:`// before — let f inside fn body; f = fetch then f(url) bypasses SYN007
?bs 0.7
fn load(url: string) -> any {
  let f: typeof fetch
  f = fetch
  return f(url)  // SYN053
}

// after — call fetch directly; SYN007 fires if uses { net } is missing
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN053: let f inside fn body; f = fetch (assignment, not declaration); f() bypasses SYN007
?bs 0.7
fn load(url: string) -> any {
  let f: typeof fetch
  f = fetch
  return f(url)  // SYN053 — f is a fn-body assignment alias of fetch
}

// SYN053: f = eval; f() bypasses SYN004
?bs 0.7
fn execute(code: string) -> any {
  let f: typeof eval
  f = eval
  return f(code)  // SYN053
}

// fix: call the guarded global directly (then SYN007/SYN004 fires)
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`},SYN054:{code:"SYN054",title:"fn-body assignment-expression alias of a global receiver used as member-access receiver in the same fn body bypasses SYN041–SYN052",rule:"`let g; g = globalThis` (or `window`, `self`) inside a fn body followed by `g.fetch(url)` in the same fn body bypasses SYN041–SYN052: those checks fire on the literal receiver tokens (`globalThis`, `window`, `self`) and prior alias checks fire on `const/let/var`-declared aliases or module-scope assignment aliases, but `g` assigned via a bare expression inside a fn body is not in any receiver watch-list. SYN049 catches the `const/let/var g = globalThis` declaration form inside fn bodies; SYN052 catches the bare assignment form at module scope. SYN054 closes the remaining gap: a per-fn-body pre-pass scans assignment expressions (`<ident> = <receiver-global>`, not preceded by `const`/`let`/`var`) inside each fn body and fires when the alias appears as a member-access receiver (`g.member` or `g?.member`) for a dangerous member in the SYN041 watch-list in the same fn body. `unsafe {}` blocks are suppressed.",idiom:"access dangerous globals via their canonical receiver token (`globalThis.X`, `window.X`) so SYN041 fires; better still, use the botscript stdlib capability equivalent with an explicit `uses {}` declaration",rewrite:`// before — let g inside fn body; g = globalThis then g.fetch() bypasses SYN041
?bs 0.7
fn load(url: string) -> any {
  let g: typeof globalThis
  g = globalThis
  return g.fetch(url)  // SYN054
}

// after — use stdlib; SYN007 fires if uses { net } is missing
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN054: let g inside fn body; g = globalThis (assignment); g.fetch() bypasses SYN041
?bs 0.7
fn load(url: string) -> any {
  let g: typeof globalThis
  g = globalThis
  return g.fetch(url)  // SYN054 — g is a fn-body assignment alias of globalThis
}

// SYN054: g = window; g.eval() bypasses SYN004
?bs 0.7
fn execute(code: string) -> any {
  let g: typeof window
  g = window
  return g.eval(code)  // SYN054
}

// fix: use the botscript stdlib or access via canonical receiver
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`},SYN055:{code:"SYN055",title:"default-parameter alias of a guarded global called in the fn body bypasses SYN004–SYN054",rule:"`fn run(f = fetch)` gives the fn body a parameter `f` bound to `fetch` by default. All prior alias checks (SYN044, SYN048, SYN051, SYN053) start scanning from the opening `{` of the fn body, so a default-parameter binding in the parameter list is never tracked. When `f` is called in the body, SYN007 does not fire because the call site token is `f`, not `fetch`. SYN055 closes this gap: a per-fn pre-pass scans the parameter list (tokens before the body `{`) for `<ident> = <guarded-global>` default-value patterns and fires when the alias is called (next significant token is `(` or `?.`) in the fn body. `unsafe {}` blocks are suppressed.",idiom:'pass the callable as an explicit parameter without a default (or with a botscript-stdlib equivalent), so the call site token is the guarded global and the relevant SYN check fires; if the default is intentional, wrap the call in `unsafe "calls <global> via default-param alias for <reason>" { f(...) }`',rewrite:`// before — default parameter f = fetch; f(url) bypasses SYN007
?bs 0.7
fn load(url: string, f = fetch) -> any {
  return f(url)  // SYN055
}

// after — call fetch directly; SYN007 fires if uses { net } is missing
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN055: default param f = fetch; f(url) bypasses SYN007
?bs 0.7
fn load(url: string, f = fetch) -> any {
  return f(url)  // SYN055 — f is a default-parameter alias of fetch
}

// SYN055: default param run = eval; run(code) bypasses SYN004
?bs 0.7
fn execute(code: string, run = eval) -> any {
  return run(code)  // SYN055
}

// fix: call the guarded global directly (then SYN007/SYN004 fires)
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`},SYN056:{code:"SYN056",title:"default-parameter alias of a global receiver object used as member-access receiver in the fn body bypasses SYN041–SYN054",rule:"`fn run(g = globalThis)` gives the fn body a parameter `g` bound to `globalThis` by default. All prior receiver-alias checks (SYN045, SYN049, SYN052, SYN054) start scanning from the opening `{` of the fn body, so a default-parameter binding in the parameter list is never tracked. When `g.fetch(url)` is used in the body, SYN041 does not fire because the receiver token is `g`, not `globalThis`/`window`/`self`. SYN056 closes this gap: a per-fn pre-pass scans the parameter list for `<ident> = <receiver-global>` default-value patterns and fires when the alias appears as a member-access receiver (`alias.member` or `alias?.member`) for a SYN041-dangerous member in the fn body. `unsafe {}` blocks are suppressed.",idiom:"access dangerous globals via their canonical receiver token (`globalThis.X`, `window.X`) so SYN041 fires; better still, use the botscript stdlib capability equivalent with an explicit `uses {}` declaration",rewrite:`// before — default param g = globalThis; g.fetch() bypasses SYN041
?bs 0.7
fn load(url: string, g = globalThis) -> any {
  return g.fetch(url)  // SYN056
}

// after — use stdlib; SYN007 fires if uses { net } is missing
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`,example:`// SYN056: default param g = globalThis; g.fetch() bypasses SYN041
?bs 0.7
fn load(url: string, g = globalThis) -> any {
  return g.fetch(url)  // SYN056 — g is a default-parameter alias of globalThis
}

// SYN056: default param g = window; g.eval() bypasses SYN004
?bs 0.7
fn execute(code: string, g = window) -> any {
  return g.eval(code)  // SYN056
}

// fix: use the botscript stdlib or access via canonical receiver
fn load(url: string) uses { net } -> any {
  return http.get(url)
}`},SYN057:{code:"SYN057",title:"eval or Function used as a tagged-template tag bypasses SYN004 call-syntax detection",rule:"`eval\\`code\\`` and `Function\\`body\\`` are valid JavaScript: when a function appears immediately before a template literal without `()`, the function is called as a tagged-template handler with the template parts as its argument. SYN004 requires `eval` or `Function` to be followed by `(`, `?.(`, or `<T>(` — a bare backtick is not `(`, so the tagged-template form slips past detection. The template string is still executed as code at runtime, carrying all the same capability-bypass risks as `eval(src)` or `new Function(body)`. SYN057 closes this gap: when `eval` or `Function` is the tag of a template literal in a fn body, the warning fires. `unsafe {}` blocks are suppressed.",idiom:'use explicit code instead of runtime string evaluation; if the tagged-template form is genuinely required, wrap in `unsafe "reason" { eval\\`...\\` }`',rewrite:`// before — eval as tagged template bypasses SYN004
?bs 0.7
fn run(code: string) -> any {
  return eval\`\${code}\`  // SYN057
}

// after — avoid dynamic evaluation entirely
?bs 0.7
fn run(code: string) -> any {
  // replace with explicit logic
}`,example:`// SYN057: eval as tagged template
?bs 0.7
fn run(code: string) -> any {
  return eval\`\${code}\`  // SYN057 — tagged template bypasses SYN004
}

// SYN057: Function as tagged template
?bs 0.7
fn build(body: string) -> any {
  return Function\`return 42\`()  // SYN057 — Function\\\`...\\\` constructs a fn from template
}

// fix: remove dynamic evaluation; use explicit code
// or: unsafe "reason" { eval\`\${code}\` }`},SYN058:{code:"SYN058",title:"eval.constructor(...) or Function.constructor(...) bypasses SYN004 call-syntax detection",rule:"Every JavaScript function's `.constructor` property is `Function` — so `eval.constructor` and `Function.constructor` both return the `Function` constructor without spelling out `Function` or `eval` in a call position. SYN004 requires `eval` or `Function` to be followed by `(`, `?.(`, `` ` ``, or `<T>(` — a trailing `.constructor` is none of these, so the constructor-access form slips past detection. The constructed function is still executed as code at runtime, carrying all the same capability-bypass risks as `eval(src)` or `new Function(body)`. SYN058 closes this gap: when `eval` or `Function` (bare, not a member access) is followed by `.constructor(` or `?.constructor(` in a fn body, the warning fires. `unsafe {}` blocks are suppressed.",idiom:'use explicit code instead of runtime string evaluation; if the constructor form is genuinely required, wrap in `unsafe "reason" { eval.constructor(...) }`',rewrite:`// before — eval.constructor bypasses SYN004
?bs 0.7
fn run(code: string) -> any {
  return eval.constructor(code)()  // SYN058
}

// after — avoid dynamic evaluation entirely
?bs 0.7
fn run(code: string) -> any {
  // replace with explicit logic
}`,example:`// SYN058: eval.constructor bypasses SYN004
?bs 0.7
fn run(code: string) -> any {
  return eval.constructor(code)()  // SYN058 — eval.constructor is Function
}

// SYN058: Function.constructor also bypasses SYN004
?bs 0.7
fn build(body: string) -> any {
  return Function.constructor(body)()  // SYN058
}

// fix: remove dynamic evaluation; use explicit code
// or: unsafe "reason" { eval.constructor(code)() }`},SYN059:{code:"SYN059",title:"eval.prototype.constructor(...) or Function.prototype.constructor(...) bypasses SYN058",rule:"`Function.prototype.constructor` evaluates to `Function` — so `Function.prototype.constructor(body)()` creates and executes arbitrary code just like `new Function(body)()`. SYN058 catches `eval.constructor(` and `Function.constructor(` but not the two-hop form where `.prototype.` is inserted between the guarded ident and `.constructor(`: SYN058 looks for `.constructor(` as the immediate next member after the ident, so `.prototype.constructor(` is invisible to it. The runtime behavior is identical — code execution from a string — and all the same capability-bypass risks apply. SYN059 closes this gap: when `eval` or `Function` (bare, not preceded by `.`/`?.`) is followed by `.prototype.constructor(` (each dot may be `?.`) in a fn body, the warning fires. `unsafe {}` blocks are suppressed.",idiom:'use explicit code instead of runtime string evaluation; if the prototype.constructor form is genuinely required, wrap in `unsafe "reason" { Function.prototype.constructor(...) }`',rewrite:`// before — Function.prototype.constructor bypasses SYN058
?bs 0.7
fn run(code: string) -> any {
  return Function.prototype.constructor(code)()  // SYN059
}

// after — avoid dynamic evaluation entirely
?bs 0.7
fn run(code: string) -> any {
  // replace with explicit logic
}`,example:`// SYN059: Function.prototype.constructor bypasses SYN058
?bs 0.7
fn run(code: string) -> any {
  return Function.prototype.constructor(code)()  // SYN059
}

// SYN059: eval.prototype.constructor also bypasses SYN058
?bs 0.7
fn build(body: string) -> any {
  return eval.prototype.constructor(body)()  // SYN059
}

// fix: remove dynamic evaluation; use explicit code
// or: unsafe "reason" { Function.prototype.constructor(code)() }`},SYN060:{code:"SYN060",title:"(fn-expr).constructor(...) — function-expression .constructor bypasses SYN004–SYN059",rule:"Every JavaScript function's `.constructor` property is the `Function` constructor — so `(()=>{}).constructor(code)()` and `(function(){}).constructor(code)()` both create and execute arbitrary code at runtime, exactly like `new Function(code)()`. SYN004–SYN059 guard the named idents `eval` and `Function`, but when the receiver is an anonymous function expression literal, none of those idents appear in the source: the guarded-name checks are invisible to this form. SYN060 closes this gap: when `)` closes a paren group whose content is a function expression (arrow `=>` or `function` keyword at the top level of the group) and is immediately followed by `.constructor(` or `?.constructor(` in a fn body, the warning fires. `unsafe {}` blocks are suppressed.",idiom:'use explicit code instead of runtime string evaluation; if the function-expression constructor form is genuinely required, wrap in `unsafe "reason" { (()=>{}).constructor(...) }`',rewrite:`// before — function-expression .constructor bypasses SYN004–SYN059
?bs 0.7
fn run(code: string) -> any {
  return (()=>{}).constructor(code)()  // SYN060
}

// after — avoid dynamic evaluation entirely
?bs 0.7
fn run(code: string) -> any {
  // replace with explicit logic
}`,example:`// SYN060: arrow-function .constructor bypasses SYN004–SYN059
?bs 0.7
fn run(code: string) -> any {
  return (()=>{}).constructor(code)()  // SYN060
}

// SYN060: function-expression .constructor also fires
?bs 0.7
fn build(body: string) -> any {
  return (function(){}).constructor(body)()  // SYN060
}

// fix: remove dynamic evaluation; use explicit code
// or: unsafe "reason" { (()=>{}).constructor(code)() }`},SYN061:{code:"SYN061",title:"expr.constructor.constructor(...) — two-hop constructor chain reaches Function (?bs 0.7+)",rule:"Every JavaScript value's `.constructor` property is a constructor function (`String`, `Number`, `Boolean`, `Array`, `Object`, `Function`, or a user class), and every constructor function's `.constructor` is the `Function` constructor — so any `.constructor.constructor(code)()` chain executes arbitrary code at runtime, exactly like `new Function(code)()`. This applies to any receiver: `[].constructor.constructor(code)()`, `({}).constructor.constructor(code)()`, `(function(){}).constructor.constructor(code)()`, and `x.constructor.constructor(code)()` are all equivalent. SYN004–SYN060 guard `eval`/`Function` by name and fn expressions by one-hop `.constructor(`; a two-hop chain through any expression spells none of those guarded forms. SYN061 closes the gap: any expression immediately followed by `.constructor.constructor(` (each dot may be `?.`) in a fn body triggers the warning. `unsafe {}` blocks are suppressed.",idiom:'use explicit code instead of runtime string evaluation; if the two-hop constructor form is genuinely required, wrap in `unsafe "reason" { expr.constructor.constructor(...) }`',rewrite:`// before — .constructor.constructor bypasses SYN004–SYN060
?bs 0.7
fn run(code: string) -> any {
  return [].constructor.constructor(code)()  // SYN061
}

// after — avoid dynamic evaluation entirely
?bs 0.7
fn run(code: string) -> any {
  // replace with explicit logic
}`,example:`// SYN061: array-literal constructor chain reaches Function
?bs 0.7
fn run(code: string) -> any {
  return [].constructor.constructor(code)()  // SYN061
}

// SYN061: object-literal constructor chain also fires
?bs 0.7
fn run(code: string) -> any {
  return ({}).constructor.constructor(code)()  // SYN061
}

// SYN061: function-expression constructor chain also fires
?bs 0.7
fn run(code: string) -> any {
  return (function(){}).constructor.constructor(code)()  // SYN061
}

// fix: remove dynamic evaluation; use explicit code
// or: unsafe "reason" { expr.constructor.constructor(code)() }`},SYN062:{code:"SYN062",title:"Object/Reflect.getPrototypeOf(expr).constructor(...) or __proto__.constructor(...) — prototype-navigation path reaches Function (?bs 0.7+)",rule:"`Object.getPrototypeOf(fn)` and `Reflect.getPrototypeOf(fn)` both return `Function.prototype`; calling `.constructor(...)` on `Function.prototype` invokes the `Function` constructor, which executes a string as code at runtime — exactly like `new Function(code)()`. Similarly, `expr.__proto__` walks the prototype chain, and `.constructor` on the result can reach `Function` the same way. SYN004–SYN061 guard `eval`/`Function` by name, fn-expression shape, and any `.constructor.constructor(` two-hop chain; prototype-navigation via `Object.getPrototypeOf`/`Reflect.getPrototypeOf`/`__proto__` spells none of those guarded forms. SYN062 closes this gap: when `Object.getPrototypeOf(...).constructor(` (or the Reflect or `__proto__` variants) appears in a fn body, the warning fires. `unsafe {}` blocks are suppressed.",idiom:'use explicit code instead of runtime string evaluation; if the prototype-navigation form is genuinely required, wrap in `unsafe "reason" { Object.getPrototypeOf(...).constructor(...) }`',rewrite:`// before — getPrototypeOf().constructor bypasses SYN004–SYN061
?bs 0.7
fn run(code: string) -> any {
  return Object.getPrototypeOf(function(){}).constructor(code)()  // SYN062
}

// after — avoid dynamic evaluation entirely
?bs 0.7
fn run(code: string) -> any {
  // replace with explicit logic
}`,example:`// SYN062: Object.getPrototypeOf path reaches Function
?bs 0.7
fn run(code: string) -> any {
  return Object.getPrototypeOf(function(){}).constructor(code)()  // SYN062
}

// SYN062: Reflect.getPrototypeOf also fires
?bs 0.7
fn run(code: string) -> any {
  return Reflect.getPrototypeOf(function(){}).constructor(code)()  // SYN062
}

// SYN062: __proto__ read + .constructor also fires
?bs 0.7
fn run(x: any, code: string) -> any {
  return x.__proto__.constructor(code)()  // SYN062
}

// fix: remove dynamic evaluation; use explicit code
// or: unsafe "reason" { Object.getPrototypeOf(fn).constructor(code)() }`},SYN063:{code:"SYN063",title:"process['member'] computed bracket access — string literal hides dangerous member name from SYN005/SYN006/SYN022 (?bs 0.7+)",rule:"SYN005 catches `process.env`, SYN006 catches `process.exit()`, and SYN022 catches other `process.*` member accesses — but all three fire on the dot-notation token pattern. The bracket form `process['exit']()` or `process['env']` puts the member name inside a string literal where the token-level ident checks cannot see it; the capability bypass at runtime is identical. SYN063 closes the gap: `process[<string-literal>]` where the string names a member covered by SYN005/SYN006/SYN022 fires this warning. `unsafe {}` suppresses.",idiom:"use the dot-notation form (`process.env`, `process.exit()`, etc.) so the SYN005/SYN006/SYN022 checks fire and the suppression path is visible; if bracket notation is genuinely required, wrap in `unsafe \"reason\" { process['member'] }`",rewrite:`// before — bracket notation bypasses SYN005/SYN006/SYN022
?bs 0.7
fn bail(code: number) -> void {
  process['exit'](code)  // SYN063: hides 'exit' from SYN006
}

// after — dot notation so SYN006 fires and suppression is explicit
?bs 0.7
fn bail(code: number) -> void {
  return err("non-zero exit")  // idiomatic: propagate, don't terminate
  // or: unsafe "exits on invalid config" { process.exit(code) }
}`,example:`// SYN063: process['exit'] bracket bypass
?bs 0.7
fn bail(code: number) -> void {
  process['exit'](code)  // SYN063
}

// SYN063: process['env'] bracket bypass
?bs 0.7
fn getKey() -> string {
  return process['env']['API_KEY']  // SYN063
}

// SYN063: process['argv'] bracket bypass
?bs 0.7
fn args() -> string[] {
  return process['argv']  // SYN063
}

// fix: use dot notation (SYN006 fires) then wrap in unsafe if genuinely needed
// or: pass exit code as explicit fn parameter with a Result return`},SYN065:{code:"SYN065",title:"bracket access on an alias of a dangerous global receiver bypasses SYN043/SYN064 (?bs 0.7+)",rule:"SYN043 guards `globalThis['fetch']` (string-literal bracket) and SYN064 guards `globalThis[key]` (dynamic bracket) when the receiver is one of the six dangerous globals by name. SYN045/SYN049/SYN052/SYN054/SYN056 catch dot-member access via aliases (`g.fetch()`). When an alias of a dangerous receiver is accessed via bracket notation — `g = globalThis; g['fetch']()` or `g[key]()` — neither the receiver-name checks (SYN041–SYN043/SYN047/SYN063/SYN064) nor the alias dot-checks (SYN045–SYN064) fire. SYN065 closes this gap: it fires when an alias of `globalThis`, `window`, `self`, or `global` is accessed via bracket notation with either a string-literal key that names a dangerous member or a non-literal key (where the member name cannot be resolved at compile time). All five alias binding forms trigger SYN065: module-scope const/let/var, module-scope assignment, fn-body const/let/var, fn-body assignment, and default-parameter bindings.",idiom:'use dot-notation on the direct receiver so the relevant SYN041 check fires; if bracket notation on an alias is genuinely needed, wrap in `unsafe "reason" { alias[key] }` so the access is auditable',rewrite:`// before — alias hides the receiver name from SYN041; bracket hides the member from SYN043
?bs 0.7
const g = globalThis;
fn load(url: string) -> any {
  return g['fetch'](url)  // SYN065: alias + string-literal bracket
}

// after — dot notation on the direct receiver so SYN041 fires
?bs 0.7
fn load(url: string) -> any {
  return globalThis.fetch(url)  // SYN041: visible to checker
}`,example:`// SYN065: module-scope const alias + string-literal bracket
?bs 0.7
const g = globalThis;
fn run(url: string) -> any {
  return g['fetch'](url)  // SYN065
}

// SYN065: fn-body const alias + dynamic bracket key
?bs 0.7
fn run(key: string) -> any {
  const w = window;
  return w[key]()  // SYN065
}

// SYN065: module-scope assignment alias + dynamic bracket
?bs 0.7
let g: any;
g = globalThis;
fn run(key: string) -> any {
  return g[key]()  // SYN065
}

// fix: dot notation on the direct receiver, or wrap in unsafe
// unsafe "g[key] key is validated against a fixed allowlist" { g[key] }`},SYN064:{code:"SYN064",title:"dynamic (non-literal) computed bracket access on a dangerous receiver — member name unresolvable at compile time (?bs 0.7+)",rule:"SYN041–SYN043 guard `globalThis`/`window`/`self` bracket accesses when the key is a string literal (member name visible at compile time). SYN047 and SYN063 extend this to `global` and `process` string-literal bracket forms. When the bracket key is a variable, expression, or template literal, none of those checks can resolve the member name — any member could be one of the SYN-guarded globals (`fetch`, `eval`, `WebSocket`, …) or dangerous process members (`env`, `exit`, `argv`, …). SYN064 fires on `receiver[<non-literal>]` where `receiver` is `globalThis`, `window`, `self`, `global`, or `process`. `unsafe {}` suppresses.",idiom:'use static dot-notation access so the relevant SYN check fires (SYN041–SYN047/SYN005/SYN006/SYN022); if a dynamic key is genuinely required, wrap in `unsafe "reason" { receiver[key] }` so the access is auditable',rewrite:`// before — dynamic key; member name unresolvable; SYN064 fires
?bs 0.7
fn lookup(key: string) -> any {
  return globalThis[key]  // SYN064: key unknown at compile time
}

// after — dot notation so the member-level SYN check fires
?bs 0.7
fn lookup(key: string) -> any {
  // use an explicit switch/if on the known members, each with the dot form:
  // or wrap the dynamic form in unsafe "reason" { globalThis[key] }
  return unsafe "key is a fixed enum validated above" { globalThis[key] }
}`,example:`// SYN064: dynamic key on globalThis
?bs 0.7
fn run(key: string) -> any {
  return globalThis[key]()  // SYN064
}

// SYN064: template literal key on process
?bs 0.7
fn bail(member: string) -> void {
  process[\`\${member}\`](1)  // SYN064
}

// SYN064: variable key on window
?bs 0.7
fn call(name: string) -> any {
  return window[name]()  // SYN064
}

// fix: use dot notation or wrap in unsafe with a narrow reason
// unsafe "globalThis[key] is validated against a fixed allowlist" { globalThis[key] }`},SYN066:{code:"SYN066",title:"object-literal property value is a SYN-guarded global, immediately called via property access — inline alias bypass (?bs 0.7+)",rule:"A SYN-guarded global (`eval`, `fetch`, `Function`, `WebSocket`, etc.) appears as the value of a named property inside an inline object literal, and that property is immediately accessed and called on the same object — `{ exec: eval }.exec(code)` or `({ run: fetch }).run(url)`. All per-ident SYN checks (SYN004, SYN007, SYN008, …) look for the guarded ident in a call position (followed by `(` or `?.(`). All alias-binding checks (SYN044–SYN065) look for binding declarations (`const alias = eval`, destructuring patterns, default params). The inline object-property form combines aliasing and calling in one expression: the guarded global is stored as a property value then retrieved and called in the same expression. No existing check covers this shape. SYN066 closes the gap: when a guarded global appears after `:` in an object literal property and the same property key is dot-called on the immediately following expression, the warning fires. Limitation: cross-statement bindings (`const obj = { run: eval }; obj.run(code)`) require taint analysis and are not yet detected.",idiom:'call the guarded global directly — `eval(code)` or `fetch(url)` — so the relevant SYN check fires; if indirect invocation is genuinely needed, wrap in `unsafe "reason" { { exec: eval }.exec(code) }` to make the bypass auditable',rewrite:`// before — object property hides guarded global from call-site SYN checks
?bs 0.7
fn run(code: string) -> any {
  return { exec: eval }.exec(code)  // SYN066: eval stored as property, called via .exec()
}

// after — call directly so SYN004 fires
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004: direct call, visible to checker
}`,example:`// SYN066: eval aliased as object property, immediately called
?bs 0.7
fn run(code: string) -> any {
  return { exec: eval }.exec(code)  // SYN066
}

// SYN066: fetch aliased, paren-wrapped form
?bs 0.7
fn load(url: string) -> any {
  return ({ run: fetch }).run(url)  // SYN066
}

// SYN066: Function aliased as property
?bs 0.7
fn execute(body: string) -> any {
  return { make: Function }.make(body)()  // SYN066
}

// fix: call the guarded global directly
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004 — visible to checker
}`},SYN067:{code:"SYN067",title:"module-scope array-destructuring alias of a SYN-guarded global called in a fn body — array-destructure alias bypass (?bs 0.7+)",rule:"A SYN-guarded global (`eval`, `fetch`, `Function`, `WebSocket`, etc.) appears as an element in an array literal on the RHS of a module-scope array-destructuring declaration (`const [e] = [eval]`, `const [a, r] = [x, fetch]`), and the corresponding LHS binding is called inside a fn body. All per-ident SYN checks (SYN004, SYN007, SYN008, …) fire on the guarded ident token in call position. All alias-binding checks (SYN044–SYN066) look for the guarded ident in declaration-RHS position (`const alias = eval`, object-property form, default-param form). Array destructuring stores the guarded global positionally — the guarded ident appears as an array element, not as a call target, so per-ident checks do not fire. The LHS binding name is not on any watchlist, so alias checks do not fire either. SYN067 closes the gap: a module-scope pre-pass correlates each guarded global found in a RHS array literal with the LHS ident at the same positional index, and fires when that ident is later called in a fn body.",idiom:'call the guarded global directly — `eval(code)` or `fetch(url)` — so the relevant SYN check fires; if array destructuring is genuinely needed, wrap the call in `unsafe "reason" { e(code) }` to make the bypass auditable',rewrite:`// before — array destructuring hides guarded global from call-site SYN checks
?bs 0.7
const [e] = [eval]  // module scope

fn run(code: string) -> any {
  return e(code)  // SYN067: e is an array-destructuring alias of eval
}

// after — call directly so SYN004 fires
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004: direct call, visible to checker
}`,example:`// SYN067: eval aliased via array destructuring
?bs 0.7
const [e] = [eval]  // module scope

fn run(code: string) -> any {
  return e(code)  // SYN067
}

// SYN067: fetch at index 1
?bs 0.7
const [a, r] = [something, fetch]  // module scope

fn load(url: string) -> any {
  return r(url)  // SYN067
}

// SYN067: Function aliased via array destructuring
?bs 0.7
const [make] = [Function]  // module scope

fn execute(body: string) -> any {
  return make(body)()  // SYN067
}

// fix: call the guarded global directly
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004 — visible to checker
}`},SYN068:{code:"SYN068",title:"fn-body-local array-destructuring alias of a SYN-guarded global called in the same fn body — local array-destructure alias bypass (?bs 0.7+)",rule:"A SYN-guarded global (`eval`, `fetch`, `Function`, `WebSocket`, etc.) appears as an element in an array literal on the RHS of a fn-body-local array-destructuring declaration (`const [e] = [eval]` inside a fn body), and the corresponding LHS binding is called within the same fn body. All per-ident SYN checks (SYN004, SYN007, SYN008, …) fire on the guarded ident token in call position. All alias-binding checks (SYN044–SYN067) look for the guarded ident in declaration-RHS position. SYN067 covers module-scope array-destructuring; fn-body local declarations are not tracked there. The LHS binding name is not on any watchlist, so alias checks do not fire either. SYN068 closes the gap: a per-fn pre-pass correlates each guarded global found in a fn-body RHS array literal with the LHS ident at the same positional index, and fires when that ident is later called in the same fn body.",idiom:'call the guarded global directly — `eval(code)` or `fetch(url)` — so the relevant SYN check fires; if array destructuring is genuinely needed, wrap the call in `unsafe "reason" { e(code) }` to make the bypass auditable',rewrite:`// before — fn-body array destructuring hides guarded global from call-site SYN checks
?bs 0.7
fn run(code: string) -> any {
  const [e] = [eval]  // fn-body local
  return e(code)  // SYN068: e is a fn-body array-destructuring alias of eval
}

// after — call directly so SYN004 fires
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004: direct call, visible to checker
}`,example:`// SYN068: eval aliased via fn-body array destructuring
?bs 0.7
fn run(code: string) -> any {
  const [e] = [eval]
  return e(code)  // SYN068
}

// SYN068: fetch at index 1
?bs 0.7
fn load(url: string) -> any {
  const [a, r] = [something, fetch]
  return r(url)  // SYN068
}

// SYN068: Function aliased via fn-body array destructuring
?bs 0.7
fn execute(body: string) -> any {
  const [make] = [Function]
  return make(body)()  // SYN068
}

// fix: call the guarded global directly
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004 — visible to checker
}`},SYN069:{code:"SYN069",title:"inline array-element bracket-access of a SYN-guarded global — inline array alias bypass (?bs 0.7+)",rule:"A SYN-guarded global (`eval`, `fetch`, `Function`, `WebSocket`, etc.) appears as an element at index N in an inline array literal, and that array is immediately bracket-accessed with the numeric literal N, then called — `[eval][0](code)`, `[x, fetch][1](url)`. All per-ident SYN checks (SYN004, SYN007, SYN008, …) fire on the guarded ident token in call position (followed by `(` or `?.(`). Inside `[eval]`, `eval` is followed by `]` — no call-position match. All alias-binding checks (SYN044–SYN068) look for binding declarations (`const alias = eval`, destructuring patterns, default params, etc.); no binding declaration is involved here. This single-expression form combines array storage and indexed retrieval in one expression, giving the guarded global a call site that no existing check covers. SYN069 closes the gap: when a guarded global appears at index N in an inline array literal that is immediately bracket-accessed with numeric literal N and called, the warning fires. Limitation: cross-statement forms (`const arr = [eval]; arr[0](code)`) require taint analysis and are not yet detected.",idiom:'call the guarded global directly — `eval(code)` or `fetch(url)` — so the relevant SYN check fires; if the array form is genuinely needed, wrap in `unsafe "reason" { [eval][0](code) }` to make the bypass auditable',rewrite:`// before — inline array hides guarded global from call-site SYN checks
?bs 0.7
fn run(code: string) -> any {
  return [eval][0](code)  // SYN069: eval at index 0, retrieved and called via [0]
}

// after — call directly so SYN004 fires
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004: direct call, visible to checker
}`,example:`// SYN069: eval at index 0, retrieved and called
?bs 0.7
fn run(code: string) -> any {
  return [eval][0](code)  // SYN069
}

// SYN069: fetch at index 1, other element at index 0
?bs 0.7
fn load(url: string) -> any {
  return [something, fetch][1](url)  // SYN069
}

// SYN069: Function at index 0, called and invoked
?bs 0.7
fn execute(body: string) -> any {
  return [Function][0](body)()  // SYN069
}

// fix: call the guarded global directly
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004 — visible to checker
}`},SYN070:{code:"SYN070",title:"inline array-element .at(N) retrieval of a SYN-guarded global — Array.prototype.at bypass (?bs 0.7+)",rule:"A SYN-guarded global (`eval`, `fetch`, `Function`, `WebSocket`, etc.) appears as an element at index N in an inline array literal, and that array is immediately accessed via `.at(N)` and called — `[eval].at(0)(code)`, `[x, fetch].at(1)(url)`. SYN069 closes the bracket-notation gap (`[eval][0](code)`), but `Array.prototype.at()` is the modern equivalent and bypasses SYN069: the token pattern after `]` is `.at(N)(` rather than `[N](`. All per-ident SYN checks still miss the guarded global inside the array literal (not in call position). All alias-binding checks miss it (no binding declaration). SYN070 closes the gap: when a guarded global appears at index N in an inline array literal that is immediately accessed via `.at(literal-N)` and called, the warning fires. Limitation: cross-statement forms (`const arr = [eval]; arr.at(0)(code)`) require taint analysis and are not yet detected.",idiom:'call the guarded global directly — `eval(code)` or `fetch(url)` — so the relevant SYN check fires; if the `.at()` form is genuinely needed, wrap in `unsafe "reason" { [eval].at(0)(code) }` to make the bypass auditable',rewrite:`// before — .at() hides guarded global from call-site SYN checks
?bs 0.7
fn run(code: string) -> any {
  return [eval].at(0)(code)  // SYN070: eval at index 0, retrieved via .at(0)
}

// after — call directly so SYN004 fires
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004: direct call, visible to checker
}`,example:`// SYN070: eval at index 0, retrieved via .at(0)
?bs 0.7
fn run(code: string) -> any {
  return [eval].at(0)(code)  // SYN070
}

// SYN070: fetch at index 1, accessed via .at(1)
?bs 0.7
fn load(url: string) -> any {
  return [something, fetch].at(1)(url)  // SYN070
}

// fix: call the guarded global directly
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004 — visible to checker
}`},SYN072:{code:"SYN072",title:"Reflect.get(<global-receiver>, '<dangerous-member>') — Reflect property-read bypass of SYN041/SYN043 (?bs 0.7+)",rule:"`Reflect.get(globalThis, 'eval')` is semantically identical to `globalThis.eval` at runtime: both return the global `eval` function. SYN041 guards the dot-access form (`globalThis.eval`) and SYN043 guards the bracket-literal form (`globalThis['eval']`), but `Reflect.get` encodes the property key as a string argument — the dangerous global name is hidden from both token-level checks. SYN042 guards other `Reflect.*` methods (apply, construct, set, defineProperty, deleteProperty, setPrototypeOf) but does not include `get`. SYN072 closes the gap: when `Reflect.get` is called with a global-receiver token (`globalThis`, `window`, `self`, `global`) as the first argument and a string literal in SYN041_DANGEROUS_MEMBERS as the second argument, the warning fires.",idiom:"access the dangerous global directly — `globalThis.eval` or just `eval` — so the relevant SYN check (SYN041 or SYN004) fires and the capability use is visible; if `Reflect.get` is genuinely needed, wrap in `unsafe \"uses <member> via Reflect.get for <reason>\" { Reflect.get(globalThis, '<member>') }` to make the bypass auditable",rewrite:`// before — Reflect.get hides 'eval' from token-level SYN041/SYN043 detection
?bs 0.7
fn run(code: string) -> any {
  return Reflect.get(globalThis, 'eval')(code)  // SYN072
}

// after — call directly so SYN004 fires
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004: direct call, visible to checker
}`,example:`// SYN072: eval extracted via Reflect.get on globalThis
?bs 0.7
fn run(code: string) -> any {
  return Reflect.get(globalThis, 'eval')(code)  // SYN072
}

// SYN072: fetch extracted via Reflect.get on window
?bs 0.7
fn load(url: string) -> any {
  return Reflect.get(window, 'fetch')(url)  // SYN072
}

// SYN072: Function constructor accessed via Reflect.get
?bs 0.7
fn run(code: string) -> any {
  const F = Reflect.get(globalThis, 'Function')  // SYN072
  return F(code)()
}

// fix: access directly so SYN041 or SYN004 fires
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004 — visible to checker
}`},SYN071:{code:"SYN071",title:"inline array pop()/shift() retrieval of a SYN-guarded global — Array mutation-method bypass (?bs 0.7+)",rule:"A SYN-guarded global (`eval`, `fetch`, `Function`, `WebSocket`, etc.) appears as an element in an inline array literal, and that array is immediately mutated via `.pop()` (last element) or `.shift()` (first element), and the result is called — `[eval].pop()(code)`, `[eval].shift()(code)`, `[x, fetch].pop()(url)`. SYN069 closes the bracket-notation gap (`[eval][N](code)`) and SYN070 closes the `.at(N)` gap; `.pop()` and `.shift()` are zero-argument mutation methods that return the last or first element respectively and bypass both: the token sequence after `]` is `.pop()(` or `.shift()(` rather than `[N](` or `.at(N)(`. All per-ident SYN checks still miss the guarded global inside the array literal (not in call position); all alias-binding checks miss it (no binding declaration). SYN071 closes the gap: when a guarded global appears as the last element (for `.pop()`) or first element (for `.shift()`) of an inline array literal that is immediately mutated and the result called, the warning fires. Limitation: cross-statement forms (`const arr = [eval]; arr.pop()(code)`) require taint analysis and are not yet detected.",idiom:'call the guarded global directly — `eval(code)` or `fetch(url)` — so the relevant SYN check fires; if the `.pop()`/`.shift()` form is genuinely needed, wrap in `unsafe "reason" { [eval].pop()(code) }` to make the bypass auditable',rewrite:`// before — .pop() hides guarded global from call-site SYN checks
?bs 0.7
fn run(code: string) -> any {
  return [eval].pop()(code)  // SYN071: eval is last element, retrieved via .pop()
}

// after — call directly so SYN004 fires
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004: direct call, visible to checker
}`,example:`// SYN071: eval is last element, retrieved via .pop()
?bs 0.7
fn run(code: string) -> any {
  return [eval].pop()(code)  // SYN071
}

// SYN071: fetch is first element, retrieved via .shift()
?bs 0.7
fn load(url: string) -> any {
  return [fetch].shift()(url)  // SYN071
}

// SYN071: eval at last position in multi-element array, .pop() retrieves it
?bs 0.7
fn run(code: string) -> any {
  return [something, eval].pop()(code)  // SYN071
}

// fix: call the guarded global directly
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004 — visible to checker
}`},SYN073:{code:"SYN073",title:"inline array find()/findLast() retrieval of a SYN-guarded global — Array higher-order bypass (?bs 0.7+)",rule:"A SYN-guarded global (`eval`, `fetch`, `Function`, `WebSocket`, etc.) appears as an element in an inline array literal, and that array is immediately searched via `.find(callback)` or `.findLast(callback)`, and the result is called — `[eval].find(Boolean)(code)`, `[fetch].find(x => x)(url)`, `[eval].findLast(Boolean)(code)`. SYN069 closes direct bracket access (`[eval][N](code)`), SYN070 closes `.at(N)`, and SYN071 closes `.pop()`/`.shift()`; `.find()` and `.findLast()` are higher-order methods that accept a callback predicate and return the first/last element satisfying it — a truthiness predicate (`Boolean`, `x => x`, `x => !!x`) trivially returns the dangerous global stored in the array. All per-ident SYN checks miss the guarded global inside the array literal (not in call position); alias-binding checks miss it (no binding declaration). SYN073 closes the gap: when a guarded global appears as any element of an inline array literal that is immediately searched via `.find(...)` or `.findLast(...)` and the result called, the warning fires regardless of the callback form. Limitation: cross-statement forms (`const arr = [eval]; arr.find(Boolean)(code)`) require taint analysis and are not yet detected.",idiom:'call the guarded global directly — `eval(code)` or `fetch(url)` — so the relevant SYN check fires; if the `.find()`/`.findLast()` form is genuinely needed, wrap in `unsafe "reason" { [eval].find(Boolean)(code) }` to make the bypass auditable',rewrite:`// before — .find() hides guarded global from call-site SYN checks
?bs 0.7
fn run(code: string) -> any {
  return [eval].find(Boolean)(code)  // SYN073: eval returned via truthiness predicate
}

// after — call directly so SYN004 fires
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004: direct call, visible to checker
}`,example:`// SYN073: eval retrieved via .find(Boolean)
?bs 0.7
fn run(code: string) -> any {
  return [eval].find(Boolean)(code)  // SYN073
}

// SYN073: fetch retrieved via .find(x => x)
?bs 0.7
fn load(url: string) -> any {
  return [fetch].find(x => x)(url)  // SYN073
}

// SYN073: eval retrieved via .findLast(Boolean)
?bs 0.7
fn run(code: string) -> any {
  return [eval].findLast(Boolean)(code)  // SYN073
}

// fix: call the guarded global directly
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004 — visible to checker
}`},SYN074:{code:"SYN074",title:"inline array reduce()/reduceRight() retrieval of a SYN-guarded global — Array accumulator bypass (?bs 0.7+)",rule:"A SYN-guarded global (`eval`, `fetch`, `Function`, `WebSocket`, etc.) appears as an element in an inline array literal, and that array is immediately reduced via `.reduce(callback)` or `.reduceRight(callback)`, and the result is called — `[eval].reduce(fn => fn)(code)`, `[fetch].reduceRight(fn => fn)(url)`, `[x, eval].reduce((a, fn) => fn)(code)`. SYN069 closes direct bracket access (`[eval][N](code)`), SYN070 closes `.at(N)`, SYN071 closes `.pop()`/`.shift()`, and SYN073 closes `.find()`/`.findLast()`. `.reduce()` and `.reduceRight()` provide two additional extraction paths: a single-element array with no initial value returns the element without calling the callback at all; a callback of the form `(acc, fn) => fn` or `(_, fn) => fn` returns the last visited element. All per-ident SYN checks miss the guarded global inside the array literal (not in call position); alias-binding checks miss it (no binding declaration). SYN074 closes the gap: when a guarded global appears as any element of an inline array literal that is immediately reduced via `.reduce(...)` or `.reduceRight(...)` and the result called, the warning fires. Limitation: cross-statement forms (`const arr = [eval]; arr.reduce(fn)(code)`) require taint analysis and are not yet detected.",idiom:'call the guarded global directly — `eval(code)` or `fetch(url)` — so the relevant SYN check fires; if the `.reduce()`/`.reduceRight()` form is genuinely needed, wrap in `unsafe "reason" { [eval].reduce(fn => fn)(code) }` to make the bypass auditable',rewrite:`// before — .reduce() hides guarded global from call-site SYN checks
?bs 0.7
fn run(code: string) -> any {
  return [eval].reduce(fn => fn)(code)  // SYN074: eval returned by accumulator pass-through
}

// after — call directly so SYN004 fires
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004: direct call, visible to checker
}`,example:`// SYN074: eval retrieved via .reduce() with no initial value
?bs 0.7
fn run(code: string) -> any {
  return [eval].reduce(fn => fn)(code)  // SYN074
}

// SYN074: fetch retrieved via .reduceRight()
?bs 0.7
fn load(url: string) -> any {
  return [fetch].reduceRight(fn => fn)(url)  // SYN074
}

// SYN074: eval at any element position
?bs 0.7
fn run(code: string) -> any {
  return [something, eval].reduce((a, fn) => fn)(code)  // SYN074
}

// fix: call the guarded global directly
?bs 0.7
fn run(code: string) -> any {
  return eval(code)  // SYN004 — visible to checker
}`}};function Q(e){return sy[e]}const ay=new Set(["fn","uses","pure","io","match","test","assert","async","unsafe"]),ly={"{":"}","(":")","[":"]"},cy=new Set(["}",")","]"]),Up=e=>e>="a"&&e<="z"||e>="A"&&e<="Z"||e==="_"||e==="$",uy=e=>Up(e)||e>="0"&&e<="9",ad=e=>e>="0"&&e<="9";function Ze(e){const t=[],n=[];let r=0;const i=()=>{for(let o=t.length-1;o>=0;o--){const s=t[o];if(!(s.kind==="whitespace"||s.kind==="newline"||s.kind==="lineComment"||s.kind==="blockComment"))return s.kind==="ident"||s.kind==="number"||s.kind==="string"||s.kind==="template"||s.kind==="close"||s.kind==="question"}return!1};for(;r<e.length;){const o=r,s=e[r];if(s===" "||s==="	"){for(;r<e.length&&(e[r]===" "||e[r]==="	");)r++;t.push({kind:"whitespace",text:e.slice(o,r),start:o,end:r});continue}if(s===`
`||s==="\r"){for(;r<e.length&&(e[r]===`
`||e[r]==="\r");)r++;t.push({kind:"newline",text:e.slice(o,r),start:o,end:r});continue}if(s==="/"&&e[r+1]==="/"){for(;r<e.length&&e[r]!==`
`&&e[r]!=="\r";)r++;t.push({kind:"lineComment",text:e.slice(o,r),start:o,end:r});continue}if(s==="/"&&e[r+1]==="*"){for(r+=2;r<e.length-1&&!(e[r]==="*"&&e[r+1]==="/");)r++;r=Math.min(e.length,r+2),t.push({kind:"blockComment",text:e.slice(o,r),start:o,end:r});continue}if(s==="/"&&!i()){let c=r+1,d=!1;for(;c<e.length;){const f=e[c];if(f==="\\"){c+=2;continue}if(f==="["){d=!0,c++;continue}if(f==="]"){d=!1,c++;continue}if(f==="/"&&!d){c++;break}if(f===`
`)break;c++}for(;c<e.length&&/[A-Za-z]/.test(e[c]??"");)c++;if(c>r+1&&e[c-1-(e[c-1].match(/[A-Za-z]/),0)]!==void 0){t.push({kind:"regex",text:e.slice(o,c),start:o,end:c}),r=c;continue}}if(s==='"'||s==="'"){const c=s;for(r++;r<e.length&&e[r]!==c;){if(e[r]==="\\"){r+=2;continue}if(e[r]===`
`)break;r++}r<e.length&&r++,t.push({kind:"string",text:e.slice(o,r),start:o,end:r});continue}if(s==="`"){for(r++;r<e.length&&e[r]!=="`";){if(e[r]==="\\"){r+=2;continue}if(e[r]==="$"&&e[r+1]==="{"){let c=1;for(r+=2;r<e.length&&c>0;){const d=e[r];if(d==="\\"){r+=2;continue}if(d==='"'||d==="'"){const f=d;for(r++;r<e.length&&e[r]!==f;)e[r]==="\\"?r+=2:r++;r<e.length&&r++;continue}if(d==="`"){r=fy(e,r);continue}d==="{"?c++:d==="}"&&c--,r++}continue}r++}r<e.length&&r++,t.push({kind:"template",text:e.slice(o,r),start:o,end:r});continue}if(ad(s)){for(;r<e.length&&(ad(e[r])||e[r]===".");)r++;t.push({kind:"number",text:e.slice(o,r),start:o,end:r});continue}if(s==="?"&&dy(e,r)){if(e.startsWith("?primer",r)){r+=7,t.push({kind:"directive",text:e.slice(o,r),start:o,end:r,directive:"primer"});continue}if(e.startsWith("?bs",r)&&/\s/.test(e[r+3]??"")){let c=r+3;for(;c<e.length&&(e[c]===" "||e[c]==="	");)c++;const d=c;for(;c<e.length&&/[\d.]/.test(e[c]??"");)c++;const f=e.slice(d,c);t.push({kind:"directive",text:e.slice(o,c),start:o,end:c,directive:"bs",directiveValue:f}),r=c;continue}}if(Up(s)){let c=r+1;for(;c<e.length&&uy(e[c]??"");)c++;const d=e.slice(r,c);ay.has(d)?t.push({kind:"keyword",text:d,start:r,end:c,keyword:d}):t.push({kind:"ident",text:d,start:r,end:c}),r=c;continue}if(s==="{"||s==="("||s==="["){const c=t.length;t.push({kind:"open",text:s,start:o,end:r+1}),n.push(c),r++;continue}if(cy.has(s)){const c=t.length;t.push({kind:"close",text:s,start:o,end:r+1});const d=n.pop();if(d!==void 0){const f=t[d];(ly[f.text]??"")===s&&(f.matchedAt=c,t[c].matchedAt=d)}r++;continue}if(s==="-"&&e[r+1]===">"){t.push({kind:"arrow",text:"->",start:o,end:r+2}),r+=2;continue}if(s==="="&&e[r+1]===">"){t.push({kind:"fatArrow",text:"=>",start:o,end:r+2}),r+=2;continue}if(s==="?"&&e[r+1]==="."){t.push({kind:"questionDot",text:"?.",start:o,end:r+2}),r+=2;continue}if(s==="?"&&e[r+1]==="?"){t.push({kind:"questionQuestion",text:"??",start:o,end:r+2}),r+=2;continue}if(s==="?"){t.push({kind:"question",text:"?",start:o,end:r+1}),r++;continue}if(s==="="&&e[r+1]!=="="){t.push({kind:"eq",text:"=",start:o,end:r+1}),r++;continue}if(",;:.".includes(s)){t.push({kind:"punct",text:s,start:o,end:r+1}),r++;continue}const a=e.slice(r,r+2),l=e.slice(r,r+3);if(["===","!==","**=","...",">>>"].includes(l)){t.push({kind:"operator",text:l,start:o,end:r+3}),r+=3;continue}if(["==","!=","<=",">=","&&","||","<<",">>","++","--","+=","-=","*=","/=","%=","**","&=","|=","^="].includes(a)){t.push({kind:"operator",text:a,start:o,end:r+2}),r+=2;continue}if("+-*/%<>!&|^~".includes(s)){t.push({kind:"operator",text:s,start:o,end:r+1}),r++;continue}t.push({kind:"operator",text:s,start:o,end:r+1}),r++}return t.push({kind:"eof",text:"",start:e.length,end:e.length}),t}function dy(e,t){let n=t-1;for(;n>=0;){const r=e[n];if(r===`
`)return!0;if(r===" "||r==="	"||r==="\r"){n--;continue}return!1}return!0}function fy(e,t){let n=t+1;for(;n<e.length&&e[n]!=="`";){if(e[n]==="\\"){n+=2;continue}if(e[n]==="$"&&e[n+1]==="{"){let r=1;for(n+=2;n<e.length&&r>0;){const i=e[n];i==="{"?r++:i==="}"&&r--,n++}continue}n++}return Math.min(e.length,n+1)}function xs(e,t,n={}){var J,ye,Oe,Ae,$e,Me,Te;let r=!1,i=t,o,s;const a=ar(e,t);if(a!==-1&&e[a].kind==="keyword"&&e[a].keyword==="async"){r=!0,i=a;const de=ar(e,a);if(de!==-1&&e[de].kind==="string"){const we=ar(e,de);we!==-1&&e[we].kind==="keyword"&&e[we].keyword==="unsafe"&&(o=e[de].text.slice(1,-1),s=e[de].start,i=we)}}else if(a!==-1&&e[a].kind==="string"){const de=ar(e,a);if(de!==-1&&e[de].kind==="keyword"&&e[de].keyword==="unsafe"){o=e[a].text.slice(1,-1),s=e[a].start,i=de;const we=ar(e,de);we!==-1&&e[we].kind==="keyword"&&e[we].keyword==="async"&&(r=!0,i=we)}}let l=t+1;l=$t(e,l);const c=e[l];if(!c||c.kind!=="ident")return null;const d=c.text,f=c.start;l++,l=$t(e,l);let h=null;if(n.allowGenerics){const de=py(e,l);de&&(h=de.text,l=de.end,l=$t(e,l))}const m=e[l];if(!m||m.kind!=="open"||m.text!=="("||m.matchedAt===void 0)return null;const g=m.matchedAt,b=Jn(e,l,g+1),{text:T,paramCaps:y,paramReads:w,paramWrites:k,paramThrows:R}=my(e,l,g+1,n.src);l=g+1,l=$t(e,l);let M=[];if(((J=e[l])==null?void 0:J.kind)==="keyword"&&((ye=e[l])==null?void 0:ye.keyword)==="uses"){l++,l=$t(e,l);const de=e[l];if(!de||de.kind!=="open"||de.text!=="{"||de.matchedAt===void 0)return null;const we=de.matchedAt;M=Bp(e,l+1,we),l=we+1,l=$t(e,l)}let D,I,L,z,W;for(;;){const de=e[l];if((de==null?void 0:de.kind)==="ident"&&(de.text==="reads"||de.text==="writes"||de.text==="throws")){const we=de.text,re=we==="reads"&&D!==void 0||we==="writes"&&I!==void 0||we==="throws"&&L!==void 0,qe=l;l++,l=$t(e,l);const be=e[l];if(!be||be.kind!=="open"||be.text!=="{"||be.matchedAt===void 0){l=qe;break}const Je=be.matchedAt;if(re)Tl(n.src,de,`duplicate \`${we} {}\` clause — each header clause may appear at most once`);else{const rt=zp(e,l+1,Je,n.src);we==="reads"?D=rt:we==="writes"?I=rt:L=rt}l=Je+1,l=$t(e,l)}else if((de==null?void 0:de.kind)==="ident"&&de.text==="intent"){const we=z!==void 0,re=l;if(l++,l=$t(e,l),((Oe=e[l])==null?void 0:Oe.kind)==="punct"&&((Ae=e[l])==null?void 0:Ae.text)===":"){l++,l=$t(e,l);const qe=e[l];if((qe==null?void 0:qe.kind)==="string"){if(we)Tl(n.src,qe,"duplicate `intent:` clause — each header clause may appear at most once");else{W=qe.start;const be=qe.text;z=be.startsWith('"')||be.startsWith("'")?be.slice(1,-1):be}l++,l=$t(e,l)}else{l=re;break}}else{l=re;break}}else break}if((($e=e[l])==null?void 0:$e.kind)!=="arrow")return null;l++;const H=l;let K=-1,le=0;for(;l<e.length;){const de=e[l];if(de.kind==="eof")break;if(de.kind==="operator"){if(de.text==="<"){le++,l++;continue}if(le>0&&(de.text===">"||de.text===">>"||de.text===">>>")){le=Math.max(0,le-de.text.length),l++;continue}}if(de.kind==="open"&&de.matchedAt!==void 0){if(le>0||de.text!=="{"){l=de.matchedAt+1;continue}const we=$t(e,de.matchedAt+1),re=e[we];if(!((re==null?void 0:re.kind)==="open"&&re.text==="{"||(re==null?void 0:re.kind)==="eq"||(re==null?void 0:re.kind)==="operator"&&(re.text==="|"||re.text==="&"))){K=l;break}l=de.matchedAt+1;continue}if(de.kind==="eq"&&le===0){K=l;break}l++}if(K===-1)return null;const pe=Jn(e,H,K).trim();let Ye,ve;const Z=e[K];if(Z.kind==="open"&&Z.text==="{"){if(Z.matchedAt===void 0)return null;Ye={kind:"block",text:Jn(e,K+1,Z.matchedAt),start:Z.start,end:e[Z.matchedAt].end},ve=Z.matchedAt+1}else if(Z.kind==="eq"){const de=Z.start;let we=K+1;we=$t(e,we);const re=e[we];if((re==null?void 0:re.kind)==="keyword"&&(re.keyword==="pure"||re.keyword==="io")){const qe=re.keyword;we++,we=$t(e,we);const be=e[we];if(!be||be.kind!=="open"||be.text!=="{"||be.matchedAt===void 0)return null;Ye={kind:"expr",text:Jn(e,we+1,be.matchedAt),wrappedAs:qe,start:de,end:e[be.matchedAt].end},ve=be.matchedAt+1}else{const qe=we;for(;we<e.length;){const rt=e[we];if(rt.kind==="eof")break;if(rt.kind==="open"&&rt.matchedAt!==void 0){we=rt.matchedAt+1;continue}if(rt.kind==="close")return null;if(rt.kind==="punct"&&rt.text===";"||rt.kind==="newline")break;we++}const be=Jn(e,qe,we).trim();if(be==="")return null;ve=we,((Me=e[ve])==null?void 0:Me.kind)==="punct"&&((Te=e[ve])==null?void 0:Te.text)===";"&&ve++;const Je=e[ve-1]??Z;Ye={kind:"expr",text:be,wrappedAs:"expr",start:de,end:Je.end}}}else return null;const te=e[i],se=e[ve-1]??e[i];return{tokenStart:i,tokenEnd:ve,start:te.start,end:se.end,fnKeywordStart:e[t].start,nameStart:f,isAsync:r,name:d,typeParams:h,args:b,argsTs:T,paramCaps:y,paramReads:w,paramWrites:k,paramThrows:R,capabilities:M,reads:D,writes:I,throws:L,intent:z,intentStart:W,unsafeReason:o,unsafeReasonStart:s,returnType:pe,bodyTokenStart:K,body:Ye}}function py(e,t){const n=e[t];if(!n||n.kind!=="operator"||n.text!=="<")return null;let r=1,i=t+1;for(;i<e.length;){const o=e[i];if(o.kind==="eof")return null;if(o.kind==="open"&&o.matchedAt!==void 0){i=o.matchedAt+1;continue}if(o.kind==="operator"){if(o.text==="<"){r++,i++;continue}if(o.text===">"){if(r--,i++,r===0)return{text:Jn(e,t,i),end:i};continue}if(o.text===">>"||o.text===">>>"){if(r-=o.text.length,i++,r===0)return{text:Jn(e,t,i),end:i};if(r<0)return null;continue}if(o.text===">=")return null}i++}return null}function Bp(e,t,n){const r=[];let i=t;for(;i<n;){const o=e[i];o.kind==="ident"&&r.push(o.text),i++}return r}function zp(e,t,n,r){const i=[];for(let o=t;o<n;o++){const s=e[o];if(!(s.kind==="whitespace"||s.kind==="newline"||s.kind==="lineComment"||s.kind==="blockComment")&&!(s.kind==="punct"&&s.text===",")){if(s.kind==="ident"){i.push(s.text);continue}Tl(r,s,`invalid label in reads/writes/throws list — labels must be plain identifiers (e.g. \`cache\`, \`HttpError\`), not ${JSON.stringify(s.text)}`)}}return i}function Tl(e,t,n){if(!e)return;const{line:r,column:i}=hy(e,t.start),o=Q("SYN001"),s={code:"SYN001",severity:"error",file:null,line:r,column:i,start:t.start,end:t.end,message:n,rule:(o==null?void 0:o.rule)??"duplicate or invalid fn header clause",idiom:(o==null?void 0:o.idiom)??"declare each clause once",rewrite:(o==null?void 0:o.rewrite)??"fn name(...) reads { cache, db } -> ..."};throw new Qe([s])}function hy(e,t){let n=1,r=0;for(let i=0;i<t&&i<e.length;i++)e[i]===`
`&&(n++,r=i+1);return{line:n,column:t-r+1}}function ar(e,t){for(let n=t-1;n>=0;n--){const r=e[n];if(!(r.kind==="whitespace"||r.kind==="newline"||r.kind==="lineComment"||r.kind==="blockComment"))return n}return-1}function $t(e,t){for(;t<e.length;){const n=e[t];if(n.kind==="whitespace"||n.kind==="newline"||n.kind==="lineComment"||n.kind==="blockComment"){t++;continue}return t}return t}function my(e,t,n,r){var d;let i="";const o=[],s=[],a=[],l=[];let c=t;for(;c<n;){const f=e[c];if(f.kind==="arrow"){i+="=>",c++;continue}const h=f.kind==="keyword"&&f.keyword==="uses",m=f.kind==="ident"&&f.text==="reads",g=f.kind==="ident"&&f.text==="writes",b=f.kind==="ident"&&f.text==="throws";if(h||m||g||b){const T=$t(e,c+1),y=e[T];if(y&&y.kind==="open"&&y.text==="{"&&y.matchedAt!==void 0){if(h){const w=Bp(e,T+1,y.matchedAt);for(const k of w)o.push(k)}else{const w=zp(e,T+1,y.matchedAt,r);if(m)for(const k of w)s.push(k);else if(g)for(const k of w)a.push(k);else for(const k of w)l.push(k)}for(c=y.matchedAt+1;c<n&&((d=e[c])==null?void 0:d.kind)==="whitespace";)c++;continue}}i+=f.text,c++}return{text:i,paramCaps:o,paramReads:s,paramWrites:a,paramThrows:l}}function Jn(e,t,n){let r="";for(let i=t;i<n;i++){const o=e[i];if(!o)break;r+=o.text}return r}function Wp(e){const t=Kp(e)??e,n=Xp(t)??t,r=Qp(n)??n;let i="";return Hp(r,o=>(i+=o,!0)),Cy(i)}function gy(e){const t=e.indexOf("import")>=0,n=e.indexOf("type")>=0&&e.indexOf("|")>=0,r=e.indexOf("fn")>=0&&e.indexOf("return")>=0;if(t||n||r){const s=Ze(e);if(Kp(e,s)!==null||Xp(e,s)!==null||Qp(e,s)!==null)return!1}let i=0,o=!0;return Hp(e,s=>{if(i+s.length>e.length)return o=!1,!1;for(let a=0;a<s.length;a++)if(e.charCodeAt(i+a)!==s.charCodeAt(a))return o=!1,!1;return i+=s.length,!0}),!o||i!==e.length?!1:e===""?!0:!(e[0]===`
`||!e.endsWith(`
`)||e.endsWith(`

`))}function Hp(e,t){var h;const n=Ze(e);let r=null,i=null,o=!0,s=!1;const a=[];let l=!1,c=0,d=!1;const f=()=>a[a.length-1];for(let m=0;m<n.length;m++){const g=n[m];if(g.kind==="eof")break;if(g.kind==="whitespace"){const k=xy(g,n,m);if(k.length>0&&(o=!0),!t(k))return;continue}if(g.kind==="newline"){let k=0,R=m;for(;R<n.length;){const D=n[R];if(D.kind==="newline"){k+=Gp(D.text),R++;continue}if(D.kind==="whitespace"&&((h=n[R+1])==null?void 0:h.kind)==="newline"){R++;continue}break}const M=Math.min(k,2);if(!t(`
`.repeat(M)))return;o=!0,m=R-1;continue}const b=l&&c===0;if(l)g.kind==="open"&&g.text==="{"?c++:g.kind==="close"&&g.text==="}"&&c>0?c--:g.kind==="operator"&&g.text===">"&&c===0&&(l=!1,d||a.push("jsxText"));else if(f()==="childExpr")if(g.kind==="open"&&g.text==="{")a.push("childExpr");else if(g.kind==="close"&&g.text==="}")a.pop();else if(g.kind==="operator"&&g.text==="<"&&Yl(r)){const k=Na(n,m+1),R=(k==null?void 0:k.kind)==="operator"&&k.text===">";(k==null?void 0:k.kind)==="ident"?(l=!0,c=0):R&&a.push("jsxText")}else g.kind==="regex"&&$l.test(g.text)&&a.length>0&&ky(a);else if(f()==="jsxText")if(g.kind==="operator"&&g.text==="<"){const k=Na(n,m+1),R=(k==null?void 0:k.kind)==="operator"&&k.text===">";(k==null?void 0:k.kind)==="ident"?(l=!0,c=0):R&&a.push("jsxText")}else g.kind==="regex"&&$l.test(g.text)?a.pop():g.kind==="open"&&g.text==="{"&&a.push("childExpr");else if(g.kind==="operator"&&g.text==="<"&&Yl(r)){const k=Na(n,m+1),R=(k==null?void 0:k.kind)==="operator"&&k.text===">";(k==null?void 0:k.kind)==="ident"?(l=!0,c=0):R&&a.push("jsxText")}d=l&&g.kind==="operator"&&g.text==="/";const T=l&&c===0||f()==="jsxText"&&!l;if(r!==null&&!o&&yy(r,g,b,s,T,i)&&!t(" "))return;const y=!T&&g.kind==="operator"&&Vp(g,i);let w;if(g.kind==="lineComment"?w=g.text.replace(/[ \t\r]+$/,""):g.kind==="directive"?g.directive==="primer"?w="?primer":g.directive==="bs"?w=g.directiveValue?`?bs ${g.directiveValue}`:"?bs":w=g.text:w=g.text,!t(w))return;r=g,o=!1,s=y,g.kind!=="lineComment"&&g.kind!=="blockComment"&&(i=g)}}function yy(e,t,n,r,i,o){return e.kind==="arrow"||t.kind==="arrow"||e.kind==="fatArrow"||t.kind==="fatArrow"||e.kind==="questionQuestion"||t.kind==="questionQuestion"||!n&&(e.kind==="eq"||t.kind==="eq")?!0:e.kind==="punct"&&e.text===","?t.kind!=="close":!!(e.kind==="punct"&&e.text===":"||!i&&(t.kind==="operator"&&Vp(t,o)||e.kind==="operator"&&r))}const wy=new Set(["==","===","!=","!==","<=",">=","&&","||","&","|","^","<<","**","+=","-=","*=","/=","%=","**=","&=","|=","^="]),by=new Set(["+","-","*","/","%"]);function Vp(e,t){return e.kind!=="operator"?!1:wy.has(e.text)?!0:by.has(e.text)?!t||e.text==="*"&&t.kind==="ident"&&t.text==="function"?!1:!Yl(t):!1}const $l=/^\/(?:[A-Za-z_$][\w.$-]*)?\s*>\}*$/,vy=new Set(["return","throw","yield","await","typeof","void","delete","new","in","of","do","case"]);function Na(e,t){let n=t;for(;n<e.length&&(e[n].kind==="whitespace"||e[n].kind==="newline");)n++;return e[n]}function ky(e){for(;e.length>0;)if(e.pop()==="jsxText")return}function Yl(e){if(!e)return!0;switch(e.kind){case"eq":case"arrow":case"fatArrow":case"questionQuestion":case"questionDot":case"question":case"open":return!0;case"regex":return $l.test(e.text);case"keyword":return!0;case"ident":return vy.has(e.text);case"punct":return e.text!==".";case"operator":return!(e.text==="++"||e.text==="--");default:return!1}}function Gp(e){let t=0;for(let n=0;n<e.length;n++){const r=e[n];r==="\r"?(t++,e[n+1]===`
`&&n++):r===`
`&&t++}return t}function xy(e,t,n){const r=n>0?t[n-1]:void 0,i=n+1<t.length?t[n+1]:void 0,o=!r||r.kind==="newline";if(!i||i.kind==="newline"||i.kind==="eof")return"";if(o){let a="";for(const l of e.text)l==="	"?a+="  ":l===" "&&(a+=" ");return a}return" "}function Qp(e,t){if(t===void 0&&(e.indexOf("fn")<0||e.indexOf("return")<0))return null;const n=t??Ze(e);let r=null;for(let o=0;o<n.length;o++){const s=n[o];if(s.kind!=="keyword"||s.keyword!=="fn")continue;const a=xs(n,o,{allowGenerics:!0});if(a&&a.body.kind==="block"){const l=Sy(a.body.text);l!==null&&(r===null&&(r=[]),r.push({start:a.body.start,end:a.body.end,replacement:`= ${l}`}))}}if(r===null)return null;r.sort((o,s)=>s.start-o.start);let i=e;for(const o of r)i=i.slice(0,o.start)+o.replacement+i.slice(o.end);return i}function Sy(e){const t=Ze(e);let n=0;for(;n<t.length;){const d=t[n];if(d.kind==="whitespace"||d.kind==="newline"){n++;continue}if(d.kind==="lineComment"||d.kind==="blockComment")return null;break}if(n>=t.length)return null;const r=t[n];if(r.kind!=="ident"||r.text!=="return")return null;for(n++;n<t.length&&t[n].kind==="whitespace";)n++;if(n>=t.length)return null;const i=t[n];if(i.kind==="newline"||i.kind==="lineComment"||i.kind==="punct"&&i.text===";"||i.kind==="eof")return null;const o=n;let s=n;for(;n<t.length;){const d=t[n];if(d.kind==="eof"){s=n;break}if(d.kind==="newline"||d.kind==="blockComment"&&(d.text.indexOf(`
`)>=0||d.text.indexOf("\r")>=0))return null;if(d.kind==="punct"&&d.text===";"){s=n;break}if(d.kind==="open"&&d.matchedAt!==void 0){n=d.matchedAt+1,s=n;continue}n++,s=n}const a=[];for(let d=o;d<s;d++)a.push(t[d].text);const l=a.join("").trim();if(l==="")return null;let c=s;c<t.length&&t[c].kind==="punct"&&t[c].text===";"&&c++;for(let d=c;d<t.length;d++){const f=t[d];if(f.kind==="eof")break;if(!(f.kind==="whitespace"||f.kind==="newline"))return null}return l}function Kp(e,t){if(t===void 0&&e.indexOf("import")<0)return null;const n=t??Ze(e),r=[];let i=null,o=[],s=0;const a=()=>{o.length!==0&&(i.runs.push(o),o=[])},l=()=>{i!==null&&(a(),r.push(i),i=null)};let c=0;for(;c<n.length;){const m=n[c];if(m.kind==="eof")break;if(m.kind==="open"&&m.matchedAt!==void 0){l(),c=m.matchedAt+1,s=c;continue}if(m.kind==="ident"&&m.text==="import"){if(i!==null){const b=o.length>0?o[o.length-1].tokenEnd:i.runs[i.runs.length-1].at(-1).tokenEnd;let T=0;for(let y=b;y<c;y++){const w=n[y];if(w.kind!=="whitespace"){if(w.kind==="newline"){T+=Gp(w.text);continue}if(w.kind==="lineComment"||w.kind==="blockComment"){i.hasComment=!0;continue}l();break}}i!==null&&T>=2&&a()}const g=Ny(n,c);if(!g){l(),s=c+1,c++;continue}if(i===null){let b=!1;for(let T=s;T<c;T++){const y=n[T];if(y.kind==="lineComment"||y.kind==="blockComment"){b=!0;break}}i={runs:[],hasComment:b}}o.push(g),c=g.tokenEnd;continue}if(m.kind==="lineComment"||m.kind==="blockComment"){i!==null&&(i.hasComment=!0),c++;continue}m.kind!=="whitespace"&&m.kind!=="newline"&&(l(),s=c+1),c++}if(l(),r.length===0)return null;const d=[];for(const m of r)if(!m.hasComment)for(const g of m.runs){if(g.length<2||g.some(T=>T.sideEffect))continue;let b=!0;for(let T=1;T<g.length;T++)if(g[T-1].path>g[T].path){b=!1;break}b||d.push(g)}if(d.length===0)return null;const f=[];for(const m of d){const g=[...m].sort((T,y)=>T.path<y.path?-1:T.path>y.path?1:0);let b="";for(let T=0;T<m.length;T++){const y=m[T];b+=e.slice(g[T].start,g[T].end),T<m.length-1&&(b+=e.slice(y.end,m[T+1].start))}f.push({start:m[0].start,end:m[m.length-1].end,replacement:b})}f.sort((m,g)=>g.start-m.start);let h=e;for(const m of f)h=h.slice(0,m.start)+m.replacement+h.slice(m.end);return h===e?null:h}function Ny(e,t){const n=e[t];if(!n||n.kind!=="ident"||n.text!=="import")return null;let r=t+1,i=null,o=-1,s=!1,a=t;for(;r<e.length;){const l=e[r];if(l.kind==="eof")break;if(l.kind==="punct"&&l.text===";")return i===null?null:{start:n.start,end:l.end,tokenStart:t,tokenEnd:r+1,path:i,sideEffect:!s};if(l.kind==="newline"){if(i!==null)return{start:n.start,end:e[a].end,tokenStart:t,tokenEnd:a+1,path:i,sideEffect:!s};r++;continue}if(l.kind==="whitespace"||l.kind==="lineComment"||l.kind==="blockComment"){r++;continue}if(l.kind==="open"&&l.matchedAt!==void 0){a=l.matchedAt,r=l.matchedAt+1;continue}if(l.kind==="ident"&&l.text==="from"){let c=r+1;for(;c<e.length&&(e[c].kind==="whitespace"||e[c].kind==="newline"||e[c].kind==="lineComment"||e[c].kind==="blockComment");)c++;const d=e[c];if(!d||d.kind!=="string")return null;i=ld(d.text),o=c,s=!0,a=c,r=c+1;continue}if(l.kind==="string"&&i===null){i=ld(l.text),o=r,a=r,r++;continue}a=r,r++}return i!==null&&o>=0?{start:n.start,end:e[a].end,tokenStart:t,tokenEnd:a+1,path:i,sideEffect:!s}:null}function ld(e){if(e.length>=2){const t=e[0],n=e[e.length-1];if((t==='"'||t==="'"||t==="`")&&t===n)return e.slice(1,-1)}return e}function Xp(e,t){if(t===void 0&&(e.indexOf("type")<0||e.indexOf("|")<0))return null;const n=t??Ze(e),r=[];for(let o=0;o<n.length;o++){const s=n[o];if(s.kind!=="ident"||s.text!=="type"||!Ty(n,o))continue;const a=$y(n,o);if(!a)continue;const l=Yy(n,a.rhsStart,a.rhsEnd);if(!l){o=a.rhsEnd;continue}const c=l.map(g=>g.tag),d=[...c].sort();let f=!0;for(let g=0;g<c.length;g++)if(c[g]!==d[g]){f=!1;break}if(f){o=a.rhsEnd;continue}const h=[...l].sort((g,b)=>g.tag<b.tag?-1:g.tag>b.tag?1:0);let m="";for(let g=0;g<l.length;g++){const b=l[g];m+=e.slice(h[g].start,h[g].end),g<l.length-1&&(m+=e.slice(b.end,l[g+1].start))}r.push({start:l[0].start,end:l[l.length-1].end,replacement:m}),o=a.rhsEnd}if(r.length===0)return null;r.sort((o,s)=>s.start-o.start);let i=e;for(const o of r)i=i.slice(0,o.start)+o.replacement+i.slice(o.end);return i===e?null:i}function Ty(e,t){for(let n=t-1;n>=0;n--){const r=e[n];if(r&&!(r.kind==="whitespace"||r.kind==="newline"||r.kind==="lineComment"||r.kind==="blockComment"))return r.kind==="directive"||r.kind==="punct"&&(r.text===";"||r.text===":")||r.kind==="open"&&(r.text==="{"||r.text==="(")||r.kind==="close"&&r.text==="}"||r.kind==="ident"&&r.text==="export"}return!0}function $y(e,t){let n=t+1;for(;n<e.length&&Ta(e[n]);)n++;const r=e[n];if(!r||r.kind!=="ident")return null;n++;let i=-1;for(;n<e.length;){const a=e[n];if(a.kind==="eof")break;if(a.kind==="open"&&a.matchedAt!==void 0){n=a.matchedAt+1;continue}if(a.kind==="eq"){i=n;break}n++}if(i===-1)return null;let o=i+1;for(;o<e.length&&Ta(e[o]);)o++;let s=o;for(;s<e.length;){const a=e[s];if(a.kind==="eof")break;if(a.kind==="open"&&a.matchedAt!==void 0){s=a.matchedAt+1;continue}if(a.kind==="punct"&&a.text===";")break;if(a.kind==="newline"){let l=s+1;for(;l<e.length&&Ta(e[l]);)l++;const c=e[l];if((c==null?void 0:c.kind)==="operator"&&c.text==="|"){s++;continue}break}s++}return{rhsStart:o,rhsEnd:s}}function Ta(e){return e.kind==="whitespace"||e.kind==="newline"||e.kind==="lineComment"||e.kind==="blockComment"}function Yy(e,t,n){var l,c;const r=[];let i=!1,o=t;const s=d=>{for(;d<n;){const f=e[d];if(f.kind==="whitespace"||f.kind==="newline"){d++;continue}if(f.kind==="lineComment"||f.kind==="blockComment")return{ok:!1,idx:d};break}return{ok:!0,idx:d}};let a=s(o);if(!a.ok)return null;if(o=a.idx,o<n&&((l=e[o])==null?void 0:l.kind)==="operator"&&((c=e[o])==null?void 0:c.text)==="|"){if(o++,a=s(o),!a.ok)return null;o=a.idx}for(;o<n;){const d=e[o];if(!d||d.kind!=="ident")return null;const f=d.text,h=d.start;let m=d.end;if(o++,a=s(o),!a.ok)return null;o=a.idx;const g=e[o];if((g==null?void 0:g.kind)==="open"&&g.text==="{"&&g.matchedAt!==void 0){const T=g.matchedAt;m=e[T].end,i=!0,o=T+1}if(r.push({tag:f,start:h,end:m}),a=s(o),!a.ok)return null;if(o=a.idx,o>=n)break;const b=e[o];if((b==null?void 0:b.kind)==="operator"&&b.text==="|"){if(o++,a=s(o),!a.ok)return null;o=a.idx;continue}return null}return r.length===0||!i?null:r}function Cy(e){let t=0;for(;t<e.length&&e[t]===`
`;)t++;let n=e.slice(t);return n===""?"":(n=n.replace(/\n+$/,""),n+`
`)}function Iy(e){var i,o,s;const t=Ze(e);let n="",r=0;for(let a=0;a<t.length;a++){const l=t[a];if(l.kind!=="keyword"||l.keyword!=="assert"||!Ay(t,a))continue;let c=a+1;c=Ry(t,c);const d=c;for(;c<t.length;){const m=t[c];if(m.kind==="eof")break;if(m.kind==="open"&&m.matchedAt!==void 0){c=m.matchedAt+1;continue}if(m.kind==="close"||m.kind==="punct"&&m.text===";"||m.kind==="newline")break;c++}const f=Ey(t,d,c).trim();if(!f)continue;n+=e.slice(r,l.start),n+=`$assert(${f})`;let h=c;((i=t[h])==null?void 0:i.kind)==="punct"&&((o=t[h])==null?void 0:o.text)===";"&&(n+=";",h++),r=((s=t[h])==null?void 0:s.start)??e.length,a=h-1}return n+=e.slice(r),n}function Ay(e,t){for(let n=t-1;n>=0;n--){const r=e[n];if(r.kind!=="whitespace"&&!(r.kind==="lineComment"||r.kind==="blockComment"))return r.kind==="newline"||r.kind==="punct"&&r.text===";"||r.kind==="open"&&r.text==="{"}return!0}function Ry(e,t){for(;t<e.length;){const n=e[t];if(n.kind==="whitespace"||n.kind==="newline"||n.kind==="lineComment"||n.kind==="blockComment"){t++;continue}return t}return t}function Ey(e,t,n){let r="";for(let i=t;i<n;i++){const o=e[i];if(!o)break;r+=o.text}return r}const jy=new Set(["let","const","var","return","if","else","for","while","do","switch","case","default","try","catch","finally","throw","function","class","type","interface","enum","import","export","break","continue","yield","async","debugger"]);function Ss(e){const t=e.trim();if(t==="")return"";const n=Ze(t),r=Oy(n,t);if(r.length===0)return"";const i=[];for(let o=0;o<r.length;o++){const s=r[o],a=o===r.length-1;i.push(Py(s,a))}return i.join(" ")}function Py(e,t){let n=e.trim();for(;n.endsWith(";");)n=n.slice(0,-1).trimEnd();return n===""?"":!t||Dy(n)?n+";":`return ${n};`}function Dy(e){const t=e.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\b/);return t?jy.has(t[1]):!1}function Oy(e,t){const n=[];let r=0,i=0;const o=s=>{if(s<=r||!e[r])return;let l=s-1;for(;l>=r&&Tc(e[l]);)l--;if(l<r)return;const c=t.slice(e[r].start,e[l].end);c.trim()!==""&&n.push(c)};for(let s=0;s<e.length;s++){const a=e[s];if(a.kind==="eof")break;if(a.kind==="open"){i++;continue}if(a.kind==="close"){i--;continue}if(i===0){if(a.kind==="punct"&&a.text===";"){o(s),r=s+1;continue}if(a.kind==="newline"){const l=My(e,r,s),c=_y(e,s+1);Ly(l,c)&&(o(s),r=s+1)}}}return o(e.length),n.map(s=>s.trim()).filter(s=>s!=="")}function Tc(e){return e.kind==="whitespace"||e.kind==="newline"||e.kind==="lineComment"||e.kind==="blockComment"}function My(e,t,n){for(let r=n-1;r>=t;r--){const i=e[r];if(!Tc(i))return i}return null}function _y(e,t){for(let n=t;n<e.length;n++){const r=e[n];if(r.kind==="eof")return null;if(!Tc(r))return r}return null}const qy=new Set(["+","-","*","/","%","&","|","^","~","!","<",">","==","!=","===","!==","<=",">=","&&","||","<<",">>","+=","-=","*=","/=","%=","&=","|=","^=","**=","**","=","=>","->","??",",",".",":","?","?."]),Fy=new Set(["+","-","*","/","%","&","|","^","<",">","==","!=","===","!==","<=",">=","&&","||","<<",">>","**","=","=>","??",",",".",":","?","?."]);function Ly(e,t){return!(!e||!t||Uy(e)||By(t))}function Uy(e){switch(e.kind){case"operator":case"arrow":case"fatArrow":case"eq":case"questionDot":case"questionQuestion":return qy.has(e.text);case"punct":return e.text==="."||e.text===","||e.text===":";case"question":return!1;default:return!1}}function By(e){switch(e.kind){case"operator":case"arrow":case"fatArrow":case"eq":case"questionDot":case"questionQuestion":return Fy.has(e.text);case"punct":return e.text==="."||e.text===","||e.text===":";case"question":return!0;case"close":return!0;default:return!1}}function zy(e){const t=Ze(e);let n="",r=0;for(let i=0;i<t.length;i++){const o=t[i];if(o.kind!=="keyword"||o.keyword!=="pure"&&o.keyword!=="io"||!Wy(t,i))continue;let s=i+1;s=Hy(t,s);const a=t[s];if(!a||a.kind!=="open"||a.text!=="{"||a.matchedAt===void 0)continue;const l=a.matchedAt,c=Vy(t,s+1,l).trim(),d=Gy(c),f=o.keyword==="pure"?`$enter([] as const, () => { ${d} })`:`(() => { ${d} })()`;n+=e.slice(r,o.start),n+=f,r=a.matchedAt!==void 0?t[l].end:r,i=l}return n+=e.slice(r),n}function Wy(e,t){for(let n=t-1;n>=0;n--){const r=e[n];if(!(r.kind==="whitespace"||r.kind==="newline"||r.kind==="lineComment"||r.kind==="blockComment"))return r.kind==="eq"||r.kind==="fatArrow"?!0:r.kind==="punct"&&(r.text===","||r.text===":"||r.text===";"||r.text===".")?r.text!==".":r.kind==="open"&&(r.text==="("||r.text==="["||r.text==="{")||r.kind==="question"||r.kind==="questionDot"||r.kind==="questionQuestion"||r.kind==="operator"&&(r.text==="&&"||r.text==="||"||r.text==="??")||r.kind==="ident"&&r.text==="return"||r.kind==="keyword"&&(r.keyword==="pure"||r.keyword==="io"||r.keyword==="match")}return!0}function Hy(e,t){for(;t<e.length;){const n=e[t];if(n.kind==="whitespace"||n.kind==="newline"||n.kind==="lineComment"||n.kind==="blockComment"){t++;continue}return t}return t}function Vy(e,t,n){let r="";for(let i=t;i<n;i++){const o=e[i];if(!o)break;r+=o.text}return r}function Gy(e){return Ss(e)}function Xt(e,t={}){const n=Ze(e),r=[],i=[],o={allowGenerics:t.allowGenerics,src:e},s=!!t.includeNestedFns;for(let a=0;a<n.length;a++){const l=n[a];if(l.kind!=="keyword"||l.keyword!=="fn")continue;const c=xs(n,a,o);if(!c)continue;const d={kind:"FnStmt",start:c.start,end:c.end,decl:c};r.push(d),i.push(d),s||(a=c.tokenEnd-1)}return{kind:"Program",src:e,tokens:n,statements:r,fns:i}}function V(e,t){let n=1,r=0;for(let i=0;i<t&&i<e.length;i++)e[i]===`
`&&(n++,r=i+1);return{line:n,column:t-r+1}}const cd=["0.1","0.2","0.3","0.4","0.5","0.6","0.7","0.8","0.9"],$a="0.1";function Qy(e){let t=0;for(;t<e.length;){const s=e[t];if(s===" "||s==="	"||s===`
`||s==="\r"){t++;continue}if(s==="/"&&e[t+1]==="/"){for(;t<e.length&&e[t]!==`
`;)t++;continue}if(s==="/"&&e[t+1]==="*"){const a=e.indexOf("*/",t+2);if(a===-1)break;t=a+2;continue}break}if(e.startsWith("?primer",t)){let s=t+7;for(;s<e.length&&e[s]!==`
`;)s++;for(;s<e.length;){const a=e[s];if(a===" "||a==="	"||a===`
`||a==="\r"){s++;continue}break}t=s}if(!e.startsWith("?bs",t))return{src:e,version:{declared:null,resolved:$a}};let n=t+3;for(;n<e.length&&(e[n]===" "||e[n]==="	");)n++;const r=n;for(;n<e.length&&e[n]!==`
`;)n++;const i=e.slice(r,n).trim();if(!/^\d+\.\d+(\.\d+)?$/.test(i)){const{line:s,column:a}=V(e,t);throw new Qe([{code:"BS001",severity:"error",file:null,line:s,column:a,message:`malformed \`?bs\` directive — expected a version like \`0.1\`, got "${i}"`,rule:"the `?bs` directive must be followed by a version like `<major>.<minor>`",idiom:"`?bs 0.1` at the top of a .bs file pins it to language version 0.1",rewrite:`?bs ${$a}`}])}if(!cd.includes(i)){const{line:s,column:a}=V(e,t);throw new Qe([{code:"BS002",severity:"error",file:null,line:s,column:a,message:`unsupported version "${i}". This compiler supports: ${cd.join(", ")}`,rule:"every `?bs <version>` must name a version this compiler ships",idiom:"pin a file to a known language version with `?bs <version>`",rewrite:`?bs ${$a}`}])}return{src:e.slice(0,t)+e.slice(n),version:{declared:i,resolved:i}}}function Ue(e,t){const n=e.split(".").map(Number),r=t.split(".").map(Number);for(let i=0;i<Math.max(n.length,r.length);i++){const o=n[i]??0,s=r[i]??0;if(o>s)return!0;if(o<s)return!1}return!0}const Ky=["$enter","$require","$test","$assert","$match","$tagMatch","$wildcard","$literalMatch","$withMocks","$resultTry","$resultTryAsync"],Zp=["err","isErr","isOk","mapErr","mapResult","ok","unwrap","isNone","isSome","mapOption","none","optionFromNullable","some","unwrapOption","unwrapOr","http","random","stderr","stdout","time"],Xy=new Set(["http","random","stderr","stdout","time"]),Zy=new Set(Zp.filter(e=>!Xy.has(e))),Jy=["Err","Ok","Result","None","Option","Some"];function ki(e,t){const n=e.charCodeAt(t);return n===10||n===13||n===8232||n===8233}function Ur(e){const t=[{kind:"code",braceDepth:0}],n=[];let r="",i="";const o=new Set(["return","typeof","void","delete","in","of","instanceof","new","throw","yield","await","case","do","else","if"]),s=()=>t[t.length-1],a=(c,d)=>c===""||/[A-Za-z_$]/.test(c)&&o.has(d)?!0:!/[A-Za-z0-9_$)\]}]/.test(c);let l=0;for(;l<e.length;){const c=e[l],d=e[l+1]??"",f=s();if(f.kind==="template"){if(c==="\\"){if(l+1>=e.length){n.push(" "),l+=1;continue}n.push(" "),n.push(ki(e,l+1)?e[l+1]:" "),l+=2;continue}if(c==="$"&&d==="{"){n.push("${"),t.push({kind:"code",braceDepth:1}),r="{",l+=2;continue}if(c==="`"){n.push("`"),t.pop(),r="x",i="",l++;continue}n.push(ki(e,l)?c:" "),l++;continue}if(c==="/"&&d==="/"){let h=l+2;for(;h<e.length;){const g=e.charCodeAt(h);if(g===10||g===13||g===8232||g===8233)break;h++}const m=h>=e.length?e.length-l:h-l;n.push(" ".repeat(m)),l+=m;continue}if(c==="/"&&d==="*"){const h=e.indexOf("*/",l+2),m=h===-1?e.length-l:h-l+2;n.push(e.slice(l,l+m).replace(/[\s\S]/g,g=>{const b=g.charCodeAt(0);return b===10||b===13||b===8232||b===8233?g:" "})),l+=m;continue}if(c==="/"&&a(r,i)){let h=l+1,m=!1;for(;h<e.length;){const g=e[h];if(g==="\\"){h=Math.min(e.length,h+2);continue}if(g==="[")m=!0;else if(g==="]")m=!1;else if(g==="/"&&!m){for(h++;h<e.length&&/[A-Za-z]/.test(e[h]);)h++;break}else if(ki(e,h))break;h++}n.push("/".padEnd(h-l," ")),l=h,r="x",i="";continue}if(c==='"'){let h=l+1;for(;h<e.length&&e[h]!=='"';)e[h]==="\\"&&h++,h++;const m=h<e.length?h:-1,g=m>=0?m+1:e.length;for(let b=l;b<g;b++)b===l||b===m?n.push(e[b]):n.push(ki(e,b)?e[b]:" ");l=g,r="x",i="";continue}if(c==="'"){let h=l+1;for(;h<e.length&&e[h]!=="'";)e[h]==="\\"&&h++,h++;const m=h<e.length?h:-1,g=m>=0?m+1:e.length;for(let b=l;b<g;b++)b===l||b===m?n.push(e[b]):n.push(ki(e,b)?e[b]:" ");l=g,r="x",i="";continue}if(c==="`"){n.push("`"),t.push({kind:"template"}),r="`",l++;continue}if(c==="{"&&f.braceDepth>0){f.braceDepth++,n.push(c),r=c,l++;continue}if(c==="}"&&f.braceDepth>0){f.braceDepth--,n.push(c),r=c,f.braceDepth===0&&t.pop(),l++;continue}n.push(c),/[A-Za-z0-9_$]/.test(c)?(i=/[A-Za-z0-9_$]/.test(r)?i+c:c,r=c):/\s/.test(c)||(i="",r=c),l++}return n.join("")}function Cl(e,t,n={commentAware:!1}){const r=t?String.raw`import\s+type\s+\{`:String.raw`import\s+\{`,i=new RegExp(`^\\s*${r}([^}]*)\\}\\s+from\\s+["']@mbfarias\\/botscript-runtime["'];?`,"gm"),o=n.commentAware?Ur(e):null;let s=null;for(;(s=i.exec(e))!==null&&!(o===null||o.slice(s.index,s.index+s[0].length).trimStart().startsWith("import")););if(!s||s.index===void 0)return null;const a=(s[1]??"").split(",").map(l=>l.trim()).filter(Boolean).map(l=>{let c=!1,d=l;/^type\s+/.test(d)&&(c=!0,d=d.replace(/^type\s+/,""));const f=d.search(/\s+as\s+/);if(f>=0){const h=d.slice(0,f).trim(),m=d.slice(f).replace(/^\s+as\s+/,"").trim();return{name:h,alias:m,typePrefix:c}}return{name:d,alias:null,typePrefix:c}});return{match:s[0],matchStart:s.index,isTypeOnly:t,specs:a}}function Ya(e){const t=e.typePrefix?`type ${e.name}`:e.name;return e.alias?`${t} as ${e.alias}`:t}function e0(e,t){var h;const n=new Set,r=new Set;for(const m of Ky)new RegExp(`(?<![A-Za-z0-9_$.])${Ca(m)}(?![A-Za-z0-9_$])`).test(e)&&n.add(m);if(Ue(t.resolved,"0.6")){const m=Ur(e),{values:g,types:b}=n0(m);for(const T of Zp){if(g.has(T))continue;new RegExp(`(?<![A-Za-z0-9_$.])${Ca(T)}(?![A-Za-z0-9_$])`).test(m)&&n.add(T)}for(const T of Jy){if(g.has(T)||b.has(T))continue;new RegExp(`(?<![A-Za-z0-9_$.])${Ca(T)}(?![A-Za-z0-9_$])`).test(m)&&r.add(T)}}if(n.size===0&&r.size===0)return e;const i=Ue(t.resolved,"0.6"),o=Ue(t.resolved,"0.6"),s=Cl(e,!1,{commentAware:i}),a=o?Cl(e,!0,{commentAware:i}):null,l=new Set,c=new Set,d=new Set;for(const m of(s==null?void 0:s.specs)??[]){const g=o?m.alias??m.name:m.name;d.add(g),c.add(g),m.typePrefix||l.add(g)}for(const m of(a==null?void 0:a.specs)??[]){const g=o?m.alias??m.name:m.name;d.add(g),c.add(g)}if(o){const m=Ur(e),g=/^import(\s+type)?\s+([^;]*?)\s+from\s+["']([^"']+)["']/gm,b=(T,y)=>{d.add(T),c.add(T),y||l.add(T)};for(let T;(T=g.exec(e))!==null;){if(!m.slice(T.index,T.index+T[0].length).trimStart().startsWith("import"))continue;const w=T[1]!==void 0;let R=T[2].trim();const M=R.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*,\s*(.*)$/s);M&&(M[2].startsWith("{")||M[2].startsWith("*"))&&(b(M[1],w),R=M[2].trim());const D=R.match(/^\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/);if(D){b(D[1],w);continue}const I=R.match(/^\{([^}]*)\}$/);if(I){for(const z of I[1].split(",")){let W=z.trim();if(!W)continue;let H=w;/^type\s+/.test(W)&&(H=!0,W=W.replace(/^type\s+/,""));const K=W.search(/\s+as\s+/),pe=(h=(K>=0?W.slice(K).replace(/^\s+as\s+/,"").trim():W).match(/^([A-Za-z_$][A-Za-z0-9_$]*)/))==null?void 0:h[1];pe&&b(pe,H)}continue}const L=R.match(/^([A-Za-z_$][A-Za-z0-9_$]*)$/);L&&b(L[1],w)}}if(o){for(const m of l)n.delete(m);for(const m of c)r.delete(m)}else for(const m of d)n.delete(m),r.delete(m);if(n.size===0&&r.size===0)return e;let f=e;return r.size>0&&(f=ud(f,!0,r,{commentAware:i,aliasAware:o})),n.size>0&&(f=ud(f,!1,n,{commentAware:i,aliasAware:o})),o&&(f=t0(f)),f}function t0(e){const t=e.split(`
`),n=Ur(e).split(`
`),r=/^import\s+\{[^}]*\}\s+from\s+["']@mbfarias\/botscript-runtime["'];?/,i=/^import\s+type\s+\{[^}]*\}\s+from\s+["']@mbfarias\/botscript-runtime["'];?/,o=(l,c)=>c.trimStart().startsWith("import")?i.test(l)?"type":r.test(l)?"value":null:null;let s=!1,a=0;for(;a<t.length;){if(o(t[a],n[a])===null){a++;continue}let c=a;for(;c<t.length&&o(t[c],n[c])!==null;)c++;const d=t.slice(a,c),f=n.slice(a,c);let h=!1,m=!1;for(let g=0;g<d.length;g++){const b=o(d[g],f[g]);if(b==="type")m=!0;else if(b==="value"&&m){h=!0;break}}if(h){const g=d.filter((T,y)=>o(T,f[y])==="value"),b=d.filter((T,y)=>o(T,f[y])==="type");t.splice(a,d.length,...g,...b),s=!0}a=c}return s?t.join(`
`):e}function ud(e,t,n,r={commentAware:!1,aliasAware:!1}){const i=Cl(e,t,r);if(i){const d=new Set(i.specs.map(T=>r.aliasAware?T.alias??T.name:T.name)),f=[...n].filter(T=>!d.has(T));if(f.length===0)return e;const m=[...r.aliasAware?i.specs:i.specs.map(T=>({name:T.name,alias:null,typePrefix:T.typePrefix})),...f.map(T=>({name:T,alias:null,typePrefix:!1}))].sort((T,y)=>{const w=r.aliasAware?T.alias??T.name:Ya(T),k=r.aliasAware?y.alias??y.name:Ya(y);return w<k?-1:w>k?1:0}).map(Ya).join(", "),b=`${t?"import type":"import"} { ${m} } from "@mbfarias/botscript-runtime";`;return r.aliasAware?e.slice(0,i.matchStart)+b+e.slice(i.matchStart+i.match.length):e.replace(i.match,b)}const s=`${t?"import type":"import"} { ${[...n].sort().join(", ")} } from "@mbfarias/botscript-runtime";`;if(!r.aliasAware)return`${s}
${e}`;const a=/^import(?:\s+type)?\s+\{[^}]*\}\s+from\s+["']@mbfarias\/botscript-runtime["'];?/gm,l=r.commentAware?Ur(e):null;let c=-1;for(let d;(d=a.exec(e))!==null;){if(l&&!l.slice(d.index,d.index+d[0].length).trimStart().startsWith("import"))continue;let f=d.index+d[0].length;for(;f<e.length&&!ki(e,f);)f++;c=f}return c>=0?e.slice(0,c)+`
`+s+e.slice(c):`${s}
${e}`}function n0(e){var s;const t=new Set,n=new Set,r=/^(?:export\s+)?(?:declare\s+)?(?:default\s+)?(?:async\s+)?(function\*?|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;let i;for(;(i=r.exec(e))!==null;){const a=i[1],l=i[2];a==="interface"||a==="type"?n.add(l):a==="class"||a==="enum"?(t.add(l),n.add(l)):t.add(l)}const o=/^(?:export\s+)?(?:const|let|var)\s*\{([^}]*)\}/gm;for(;(i=o.exec(e))!==null;)for(const a of i[1].split(",")){const l=a.trim();if(!l)continue;const c=l.indexOf(":"),h=(s=(c>=0?l.slice(c+1):l).split("=")[0].trim().match(/^([A-Za-z_$][A-Za-z0-9_$]*)/))==null?void 0:s[1];h&&t.add(h)}return{values:t,types:n}}function Ca(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}const pi={http:"net",time:"time",random:"random",fs:"fs",stdout:"stdout",stderr:"stderr"};function Qr(e){const t=new Map;for(const i of e)t.set(i,[]);const n=[...e].sort((i,o)=>i.tokenStart-o.tokenStart),r=[];for(const i of n){for(;r.length>0&&r[r.length-1].tokenEnd<=i.tokenStart;)r.pop();for(const o of r)t.get(o).push(i);r.push(i)}return t}function Nt(e,t,n,r){const i=new Set,o=[];let s=0;for(let a=t.bodyTokenStart??t.tokenStart;a<t.tokenEnd;a++){for(;o.length>0&&o[o.length-1].tokenEnd<=a;)o.pop();for(;s<n.length&&n[s].tokenStart<=a;)o.push(n[s]),s++;if(o.length>0)continue;const l=e[a];if(!l||l.kind!=="ident"||!r.has(l.text)||l.text===t.name)continue;const c=ie(e,a-1),d=e[c];d&&(d.kind==="punct"&&d.text==="."||d.kind==="questionDot")||Jp(e,a)&&i.add(l.text)}return i}function Tn(e,t,n,r){const i=t.bodyTokenStart??t.tokenStart,o=[];{const c=[];let d=0;for(let f=i;f<t.tokenEnd;f++){for(;c.length>0&&c[c.length-1].tokenEnd<=f;)c.pop();for(;d<n.length&&n[d].tokenStart<=f;)c.push(n[d]),d++;if(c.length>0)continue;const h=e[f];if(!h||h.kind!=="ident"||h.text!=="try")continue;const m=v(e,f+1),g=e[m];!g||g.kind!=="open"||g.text!=="{"||g.matchedAt!==void 0&&o.push([m+1,g.matchedAt])}}const s=new Set,a=[];let l=0;for(let c=i;c<t.tokenEnd;c++){for(;a.length>0&&a[a.length-1].tokenEnd<=c;)a.pop();for(;l<n.length&&n[l].tokenStart<=c;)a.push(n[l]),l++;if(a.length>0)continue;let d=!1;for(const[g,b]of o)if(c>=g&&c<b){d=!0;break}if(d)continue;const f=e[c];if(!f||f.kind!=="ident"||!r.has(f.text)||f.text===t.name)continue;const h=ie(e,c-1),m=e[h];m&&(m.kind==="punct"&&m.text==="."||m.kind==="questionDot")||Jp(e,c)&&s.add(f.text)}return s}function Jp(e,t){const n=v(e,t+1),r=e[n];if(r&&r.kind==="open"&&r.text==="(")return!0;if(r&&r.kind==="questionDot"){const i=v(e,n+1),o=e[i];if(o&&o.kind==="open"&&o.text==="(")return!0}return!1}const i0=new Set(Object.keys(pi)),r0=new Set(["if","else","while","for","do","switch","case","default","return","break","continue","throw","try","catch","finally","typeof","void","delete","new","in","of","instanceof"]);function o0(e){const t=[];let n=0,r=0;for(;n<e.length;){const i=e[n];if(i==="{"||i==="["||i==="("){r++,n++;continue}if(i==="}"||i==="]"||i===")"){r--,n++;continue}if(r<1){n++;continue}const o=/^([a-zA-Z_$][a-zA-Z0-9_$]*)/.exec(e.slice(n));if(o){const s=o[1],a=e.slice(n+o[0].length).trimStart();if(!a.startsWith(":")&&(t.push(s),a.startsWith("="))){for(n+=o[0].length;n<e.length&&(e[n]===" "||e[n]==="	");)n++;n++;const l=r;for(;n<e.length;){const c=e[n];if(c==="{"||c==="["||c==="("){r++,n++;continue}if(c==="}"||c==="]"||c===")"){if(r===l)break;r--,n++;continue}if(c===","&&r===l)break;n++}continue}n+=o[0].length;continue}n++}return t}function eh(e){const t=new Set;let n=0,r=0,i=0,o=!1;for(;i<e.length;){const s=e[i];if(s==="("){n++,i++;continue}if(s===")"){n--,i++;continue}if(n!==1){i++;continue}if(s===","){r===0&&(o=!1),i++;continue}if(o){if(s==="<"){r++,i++;continue}if(s===">"){r>0&&r--,i++;continue}if(r>0){i++;continue}if(s==="{"||s==="["){const c=s==="{"?"}":"]";let d=1;for(i++;i<e.length&&d>0;)e[i]===s?d++:e[i]===c&&d--,i++;continue}i++;continue}if((s==="{"||s==="[")&&!o){const c=s,d=s==="{"?"}":"]";let f=0,h=i;for(;h<e.length;){if(e[h]===c)f++;else if(e[h]===d&&(f--,f===0)){h++;break}h++}const m=e.slice(i,h);for(const g of o0(m))t.add(g);o=!0,i=h;continue}const a=/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\??\s*:/.exec(e.slice(i));if(a){t.add(a[1]),o=!0,i+=a[0].length;continue}const l=/^([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*[,)=])/.exec(e.slice(i));if(l){t.add(l[1]),o=!0,i+=l[0].length;continue}i++}return t}function th(e,t,n){const r=e[t];if(!r||r.matchedAt===void 0)return;const i=r.matchedAt;for(let o=t+1;o<i;o++){const s=e[o];if(!s)continue;if(s.kind==="open"&&(s.text==="{"||s.text==="[")){th(e,o,n),s.matchedAt!==void 0&&(o=s.matchedAt);continue}if(s.kind!=="ident")continue;const a=v(e,o+1),l=e[a];if(!(l&&l.kind==="punct"&&l.text===":")&&(n.add(s.text),l&&l.kind==="eq")){o=a+1;let d=0;for(;o<i;){const f=e[o];if(!f){o++;continue}if(f.kind==="open"){d++,o++;continue}if(f.kind==="close"){d--,o++;continue}if(d===0&&f.kind==="punct"&&f.text===",")break;o++}o--}}}function $c(e,t,n){const r=new Set,i=[];let o=0;const s=t.bodyTokenStart??t.tokenStart;for(let a=s;a<t.tokenEnd;a++){for(;i.length>0&&i[i.length-1].tokenEnd<=a;)i.pop();for(;o<n.length&&n[o].tokenStart<=a;)i.push(n[o]),o++;if(i.length>0)continue;const l=e[a];if(!l||l.kind!=="ident"||l.text!=="const"&&l.text!=="let"&&l.text!=="var")continue;const c=v(e,a+1),d=e[c];d&&(d.kind==="ident"?r.add(d.text):d.kind==="open"&&(d.text==="{"||d.text==="[")&&th(e,c,r))}return r}function nh(e,t,n,r,i){const o=i??(()=>{const l=eh(t.args);for(const c of $c(e,t,n))l.add(c);return l})(),s=[];let a=0;for(let l=t.bodyTokenStart??t.tokenStart;l<t.tokenEnd;l++){for(;s.length>0&&s[s.length-1].tokenEnd<=l;)s.pop();for(;a<n.length&&n[a].tokenStart<=l;)s.push(n[a]),a++;if(s.length>0)continue;const c=e[l];if(!c||c.kind!=="ident"||c.text===t.name||r.has(c.text)||r0.has(c.text)||Zy.has(c.text))continue;const d=ie(e,l-1),f=e[d];if(f&&(f.kind==="punct"&&f.text==="."||f.kind==="questionDot"))continue;const h=v(e,l+1),m=e[h];if(m&&(m.kind==="punct"&&m.text==="."||m.kind==="questionDot")){const g=v(e,h+1),b=e[g];if(b&&b.kind==="ident"){if(i0.has(c.text)||o.has(c.text))continue;let T=g,y=!1;for(;;){const w=v(e,T+1),k=e[w];if(!k)break;if(k.kind==="open"&&k.text==="("){y=!0;break}if(k.kind==="punct"&&k.text==="."||k.kind==="questionDot"){const R=v(e,w+1),M=e[R];if((M==null?void 0:M.kind)==="open"&&M.text==="("){y=!0;break}if(M&&M.kind==="ident"){T=R;continue}break}break}if(y)return!0;continue}if(b&&b.kind==="open"&&b.text==="("){if(o.has(c.text))continue;return!0}continue}if(!(!m||m.kind!=="open"||m.text!=="(")){if(/^[A-Z]/.test(c.text)){if(f&&f.kind==="open"&&f.text==="("){const g=ie(e,d-1),b=e[g];if(b&&b.kind==="ident"&&b.text==="err")continue}if(f&&f.kind==="ident"&&f.text==="new"){const b=ie(e,d-1),T=e[b];if(T&&T.kind==="open"&&T.text==="("){const y=ie(e,b-1),w=e[y];if(w&&w.kind==="ident"&&w.text==="err")continue}}}return!0}}return!1}function v(e,t){let n=t;for(;n<e.length;){const r=e[n];if(!r)return n;if(r.kind==="whitespace"||r.kind==="newline"||r.kind==="lineComment"||r.kind==="blockComment"){n++;continue}return n}return n}function ie(e,t){let n=t;for(;n>=0;){const r=e[n];if(!r)return n;if(r.kind==="whitespace"||r.kind==="newline"||r.kind==="lineComment"||r.kind==="blockComment"){n--;continue}return n}return n}const Ft=new Set(Object.keys(pi));function Xi(e){var i,o,s,a,l,c;const t=new Map,n=new Set;{let d=0;for(let f=0;f<e.length;f++){const h=e[f];if(!h)continue;if(h.kind==="open"&&h.text==="{"){d++;continue}if(h.kind==="close"&&h.text==="}"){d>0&&d--;continue}if(d!==0||h.kind!=="ident"||h.text!=="const")continue;const m=v(e,f+1),g=e[m];if(!g||g.kind!=="ident"||!Ft.has(g.text))continue;let b=-1;for(let k=m+1;k<e.length;k++){const R=e[k];if(!R||R.kind==="newline"||R.kind==="eof")break;if(R.kind==="eq"){b=k;break}}if(b===-1)continue;const T=v(e,b+1),y=e[T];let w=!1;if(y&&y.kind==="ident"&&y.text===g.text){let k=T+1;for(;k<e.length&&(((i=e[k])==null?void 0:i.kind)==="whitespace"||((o=e[k])==null?void 0:o.kind)==="blockComment");)k++;const R=e[k];(!R||R.kind==="newline"||R.kind==="lineComment"||R.kind==="eof"||R.kind==="punct"&&R.text===";")&&(w=!0)}else if(y&&y.kind==="open"&&y.text==="("){const k=Br(e,T);if(k&&k.tok.text===g.text){let R=k.tokenEnd;for(;R<e.length&&(((s=e[R])==null?void 0:s.kind)==="whitespace"||((a=e[R])==null?void 0:a.kind)==="blockComment");)R++;const M=e[R];(!M||M.kind==="newline"||M.kind==="lineComment"||M.kind==="eof"||M.kind==="punct"&&M.text===";")&&(w=!0)}}w||n.add(g.text)}}let r=0;for(let d=0;d<e.length;d++){const f=e[d];if(!f)continue;if(f.kind==="open"&&f.text==="{"){r++;continue}if(f.kind==="close"&&f.text==="}"){r>0&&r--;continue}if(f.kind!=="ident"||f.text!=="const"||r!==0)continue;const h=v(e,d+1),m=e[h];if(!m||m.kind!=="ident")continue;const g=v(e,h+1),b=e[g];let T=-1;if(b&&b.kind==="punct"&&b.text===":"){let I=0;for(let L=g+1;L<e.length;L++){const z=e[L];if(!z||z.kind==="newline"||z.kind==="eof")break;if(z.kind==="open"&&z.text==="("||z.kind==="operator"&&z.text==="<")I++;else if(z.kind==="close"&&z.text===")"||z.kind==="operator"&&(z.text===">"||z.text===">>"||z.text===">>>")){const W=z.text.length;I=Math.max(0,I-W)}else if(z.kind==="eq"&&I===0){T=L;break}}}else b&&b.kind==="eq"&&(T=g);if(T===-1)continue;const y=v(e,T+1),w=e[y];if(!w)continue;let k,R;if(w.kind==="ident"&&Ft.has(w.text))k=w,R=y+1;else if(w.kind==="open"&&w.text==="("){const I=Br(e,y);if(!I||!Ft.has(I.tok.text))continue;k=I.tok,R=I.tokenEnd}else continue;let M=R;for(;M<e.length&&(((l=e[M])==null?void 0:l.kind)==="whitespace"||((c=e[M])==null?void 0:c.kind)==="blockComment");)M++;const D=e[M];D&&D.kind!=="newline"&&D.kind!=="lineComment"&&D.kind!=="eof"&&!(D.kind==="punct"&&D.text===";")||Ft.has(m.text)||n.has(k.text)||t.set(m.text,k.text)}return t}function s0(e,t){var i,o,s;const n=[];let r=0;for(let a=0;a<e.length;a++){const l=e[a];if(!l)continue;if(l.kind==="open"&&l.text==="{"){r++;continue}if(l.kind==="close"&&l.text==="}"){r>0&&r--;continue}if(r!==0||l.kind!=="ident"||l.text!=="const")continue;const c=l.start,d=v(e,a+1),f=e[d];if(!f||f.kind!=="ident")continue;const h=v(e,d+1),m=e[h];let g=-1;if(m&&m.kind==="punct"&&m.text===":"){let z=0;for(let W=h+1;W<e.length;W++){const H=e[W];if(!H||H.kind==="newline"||H.kind==="eof")break;if(H.kind==="open"&&H.text==="("||H.kind==="operator"&&H.text==="<")z++;else if(H.kind==="close"&&H.text===")"||H.kind==="operator"&&(H.text===">"||H.text===">>"||H.text===">>>")){const K=H.text.length;z=Math.max(0,z-K)}else if(H.kind==="eq"&&z===0){g=W;break}}}else m&&m.kind==="eq"&&(g=h);if(g===-1)continue;const b=v(e,g+1),T=e[b];if(!T)continue;let y,w;const k=T.kind==="ident"?Ft.has(T.text)?T.text:(t==null?void 0:t.get(T.text))??null:null;if(k!==null)y=k,w=b+1;else if(T.kind==="open"&&T.text==="("){const z=v(e,b+1),W=e[z];if((W==null?void 0:W.kind)==="open"&&W.text==="("){const H=ih(e,z),K=W.matchedAt,le=T.matchedAt;if(H!==null&&K!==void 0&&le!==void 0&&v(e,K+1)===le&&H)y=H,w=le+1;else{const Ye=H??rh(e,z)??((i=Ia(e,b+1))==null?void 0:i.stdlibName);if(Ye){const ve=T.matchedAt,Z=ve!==void 0?e[ve]:void 0;n.push({name:f.text,stdlibName:Ye,start:c,end:(Z==null?void 0:Z.end)??T.end})}continue}}else if(!W||W.kind!=="ident"||!Ft.has(W.text)&&!(t!=null&&t.has(W.text))){const H=Ia(e,b+1);H&&n.push({name:f.text,stdlibName:H.stdlibName,start:c,end:dd(e,b)});continue}else{const H=Ft.has(W.text)?W.text:t.get(W.text),K=v(e,z+1),le=e[K];if(!le||le.kind!=="close"||le.text!==")"){const pe=T.matchedAt!==void 0?e[T.matchedAt]:void 0,Ye=(pe==null?void 0:pe.end)??(le==null?void 0:le.end)??T.end;n.push({name:f.text,stdlibName:H,start:c,end:Ye});continue}y=H,w=K+1}}else{const z=Ia(e,b);z&&n.push({name:f.text,stdlibName:z.stdlibName,start:c,end:dd(e,b)});continue}let R=w;for(;R<e.length&&(((o=e[R])==null?void 0:o.kind)==="whitespace"||((s=e[R])==null?void 0:s.kind)==="blockComment");)R++;const M=e[R];if(!M||M.kind==="newline"||M.kind==="lineComment"||M.kind==="eof"||M.kind==="punct"&&M.text===";")continue;let I=M.end,L=R+1;for(;L<e.length;){const z=e[L];if(!z||z.kind==="newline"||z.kind==="eof"||z.kind==="lineComment"||z.kind==="punct"&&z.text===";")break;z.kind!=="whitespace"&&z.kind!=="blockComment"&&(I=z.end),L++}n.push({name:f.text,stdlibName:y,start:c,end:I})}return n}function a0(e,t){var i,o,s;const n=[];let r=0;for(let a=0;a<e.length;a++){const l=e[a];if(!l)continue;if(l.kind==="open"&&l.text==="{"){r++;continue}if(l.kind==="close"&&l.text==="}"){r>0&&r--;continue}if(r!==0||l.kind!=="ident"||l.text!=="const")continue;const c=l.start,d=v(e,a+1),f=e[d];if(!f||f.kind!=="open"||f.text!=="{")continue;const h=f.matchedAt;if(h===void 0||!e[h])continue;const g=v(e,h+1),b=e[g];let T=-1;if(b&&b.kind==="eq")T=g;else if(b&&b.kind==="punct"&&b.text===":"){let L=0;for(let z=g+1;z<e.length;z++){const W=e[z];if(!W||W.kind==="newline"||W.kind==="eof")break;if(W.kind==="open"&&W.text==="("||W.kind==="operator"&&W.text==="<")L++;else if(W.kind==="close"&&W.text===")"||W.kind==="operator"&&(W.text===">"||W.text===">>"||W.text===">>>"))L=Math.max(0,L-W.text.length);else if(W.kind==="eq"&&L===0){T=z;break}}}if(T===-1)continue;const y=v(e,T+1),w=e[y];if(!w)continue;let k,R;if(w.kind==="ident"&&Ft.has(w.text))k=w.text,R=y+1;else if(w.kind==="open"&&w.text==="("){const L=Br(e,y);if(!L)continue;if(Ft.has(L.tok.text))k=L.tok.text;else if(t){const z=t.get(L.tok.text);if(!z)continue;k=z}else continue;R=L.tokenEnd}else if(t&&w.kind==="ident"){const L=t.get(w.text);if(!L)continue;k=L,R=y+1}else continue;let M=R;for(;M<e.length&&(((i=e[M])==null?void 0:i.kind)==="whitespace"||((o=e[M])==null?void 0:o.kind)==="blockComment");)M++;const D=e[M];(!D||D.kind==="newline"||D.kind==="lineComment"||D.kind==="eof"||D.kind==="punct"&&D.text===";")&&n.push({stdlibName:k,start:c,end:((s=e[R-1])==null?void 0:s.end)??w.end})}return n}function l0(e,t){var i,o;const n=[];if(t.size===0)return n;let r=0;for(let s=0;s<e.length;s++){const a=e[s];if(!a)continue;if(a.kind==="open"&&a.text==="{"){r++;continue}if(a.kind==="close"&&a.text==="}"){r>0&&r--;continue}if(r!==0||a.kind!=="ident"||a.text!=="const")continue;const l=a.start,c=v(e,s+1),d=e[c];if(!d||d.kind!=="ident")continue;const f=v(e,c+1),h=e[f];let m=-1;if(h&&h.kind==="punct"&&h.text===":"){let I=0;for(let L=f+1;L<e.length;L++){const z=e[L];if(!z||z.kind==="newline"||z.kind==="eof")break;if(z.kind==="open"&&z.text==="("||z.kind==="operator"&&z.text==="<")I++;else if(z.kind==="close"&&z.text===")"||z.kind==="operator"&&(z.text===">"||z.text===">>"||z.text===">>>")){const W=z.text.length;I=Math.max(0,I-W)}else if(z.kind==="eq"&&I===0){m=L;break}}}else h&&h.kind==="eq"&&(m=f);if(m===-1)continue;const g=v(e,m+1),b=e[g];if(!b)continue;let T,y,w;if(b.kind==="ident")T=b,y=b.end,w=g+1;else if(b.kind==="open"&&b.text==="("){const I=Br(e,g);if(!I)continue;T=I.tok,y=I.charEnd,w=I.tokenEnd}else continue;const k=t.get(T.text);if(!k)continue;let R=w;for(;R<e.length&&(((i=e[R])==null?void 0:i.kind)==="whitespace"||((o=e[R])==null?void 0:o.kind)==="blockComment");)R++;const M=e[R];(!M||M.kind==="newline"||M.kind==="lineComment"||M.kind==="eof"||M.kind==="punct"&&M.text===";")&&(Ft.has(d.text)||n.push({name:d.text,aliasName:T.text,stdlibName:k,start:l,end:y}))}return n}function Br(e,t){const n=v(e,t+1),r=e[n];if(!r)return null;if(r.kind==="open"&&r.text==="("){const s=Br(e,n);if(!s)return null;const a=e[t].matchedAt;if(a===void 0||v(e,s.tokenEnd)!==a)return null;const l=e[a];return l?{tok:s.tok,charEnd:l.end,tokenEnd:a+1}:null}if(r.kind!=="ident")return null;const i=v(e,n+1),o=e[i];return!o||o.kind!=="close"||o.text!==")"?null:{tok:r,charEnd:o.end,tokenEnd:i+1}}function c0(e,t){const n=new Set,r=t.bodyTokenStart??t.tokenEnd;let i=0;for(let o=t.tokenStart;o<r;o++){const s=e[o];if(s&&!(s.kind==="whitespace"||s.kind==="newline"||s.kind==="lineComment"||s.kind==="blockComment")){if(i===0){s.kind==="open"&&s.text==="("&&(i=1);continue}if(s.kind==="open"&&(s.text==="("||s.text==="{"||s.text==="[")||s.kind==="operator"&&s.text==="<")i++;else if(s.kind==="close"&&s.text===")"){if(i--,i===0)break}else if(s.kind==="close"&&(s.text==="}"||s.text==="]")||s.kind==="operator"&&(s.text===">"||s.text===">>"||s.text===">>>")){const a=s.kind==="operator"?s.text.length:1;i=Math.max(0,i-a)}else if(i===1&&s.kind==="ident"){const a=u0(e,o+1,r);a&&a.kind==="punct"&&a.text===":"&&n.add(s.text)}}}return n}function u0(e,t,n){for(let r=t;r<n;r++){const i=e[r];if(!i)return;if(i.kind!=="whitespace"&&i.kind!=="newline"&&i.kind!=="lineComment"&&i.kind!=="blockComment")return i}}function dd(e,t){var r;let n=((r=e[t])==null?void 0:r.end)??0;for(let i=t+1;i<e.length;i++){const o=e[i];if(!o||o.kind==="newline"||o.kind==="eof"||o.kind==="lineComment"||o.kind==="punct"&&o.text===";")break;o.kind!=="whitespace"&&o.kind!=="blockComment"&&(n=o.end)}return n}function Ia(e,t){let n=0,r=0;for(let i=t;i<e.length;i++){const o=e[i];if(o){if(o.kind==="open"&&o.text==="{"){r++;continue}if(o.kind==="close"&&o.text==="}"){r>0&&r--;continue}if(o.kind==="open"){n++;continue}if(o.kind==="close"){n>0&&n--;continue}if(n===0&&r===0&&(o.kind==="newline"||o.kind==="eof"||o.kind==="lineComment"||o.kind==="punct"&&o.text===";"))break;if(o.kind==="ident"&&Ft.has(o.text)){if(r>0){const s=v(e,i+1),a=e[s];if(a&&a.kind==="punct"&&a.text===":"||a&&a.kind==="open"&&a.text==="(")continue}return{stdlibName:o.text,end:o.end}}}}return null}function d0(e,t,n=[]){const r=new Set,i=t.bodyTokenStart??t.tokenStart,o=t.tokenEnd,s=[...n].sort((d,f)=>d.tokenStart-f.tokenStart),a=[];let l=0,c=0;for(let d=i;d<o;d++){for(;a.length>0&&a[a.length-1].tokenEnd<=d;)a.pop();for(;l<s.length&&s[l].tokenStart<=d;)a.push(s[l]),l++;if(a.length>0)continue;const f=e[d];if(!f)continue;if(f.kind==="open"&&f.text==="{"){c++;continue}if(f.kind==="close"&&f.text==="}"){c--;continue}if(f.kind!=="ident"||f.text!=="const"&&f.text!=="let"&&f.text!=="var"||(f.text==="const"||f.text==="let")&&c>1)continue;const m=v(e,d+1),g=e[m];g&&(g.kind==="ident"?r.add(g.text):g.kind==="open"&&(g.text==="{"||g.text==="[")&&rs(e,m,o,r))}return r}function rs(e,t,n,r){const i=e[t];if(!i)return;const o=i.text==="{";let s=1,a=t+1;for(;a<n&&s>0;){const l=e[a];if(!l){a++;continue}if(l.kind==="open"&&(l.text==="{"||l.text==="[")){if(s===1){rs(e,a,n,r);const c=l.matchedAt;if(c!==void 0){a=c+1;continue}}s++,a++;continue}if(l.kind==="close"&&(l.text==="}"||l.text==="]")){s--,a++;continue}if(s>1){a++;continue}if(l.kind!=="ident"){a++;continue}if(o){const c=v(e,a+1),d=e[c];if((d==null?void 0:d.kind)==="punct"&&d.text===":"){const f=v(e,c+1),h=e[f];if((h==null?void 0:h.kind)==="ident"){r.add(h.text);const m=v(e,f+1),g=e[m];(g==null?void 0:g.kind)==="eq"?a=fd(e,m+1,n):a=f+1}else if(h&&h.kind==="open"&&(h.text==="{"||h.text==="[")){rs(e,f,n,r);let m=1,g=f+1;for(;g<n&&m>0;){const b=e[g];if(!b){g++;continue}b.kind==="open"&&(b.text==="{"||b.text==="[")&&m++,b.kind==="close"&&(b.text==="}"||b.text==="]")&&m--,g++}a=g}else a=f!==void 0?f+1:c+1}else if(r.add(l.text),(d==null?void 0:d.kind)==="eq"){let f=c+1,h=0;for(;f<n;){const m=e[f];if(!m){f++;continue}if(m.kind==="open"){h++,f++;continue}if(m.kind==="close"){if(h===0)break;h--,f++;continue}if(h===0&&m.kind==="punct"&&m.text===",")break;f++}a=f}else a++}else{r.add(l.text);const c=v(e,a+1),d=e[c];(d==null?void 0:d.kind)==="eq"?a=fd(e,c+1,n):a++}}}function fd(e,t,n){let r=t,i=0;for(;r<n;){const o=e[r];if(!o){r++;continue}if(o.kind==="open"){i++,r++;continue}if(o.kind==="close"){if(i===0)return r;i--,r++;continue}if(i===0&&o.kind==="punct"&&o.text===",")return r;r++}return r}function Ns(e,t,n,r){const i=n.filter(c=>c!==t&&c.tokenStart>=t.tokenStart&&c.tokenEnd<=t.tokenEnd),o=i.filter(c=>!i.some(d=>d!==c&&d.tokenStart<c.tokenStart&&d.tokenEnd>c.tokenEnd)).map(c=>c.name),s=c0(e,t),a=d0(e,t,i),l=new Set([...s,...a,...o]);return l.size===0?r:new Map([...r].filter(([c])=>!l.has(c)))}function Ts(e,t,n,r){if(r.size===0)return[];const i=[],s=[...n.filter(m=>m!==t&&m.tokenStart>=t.tokenStart&&m.tokenEnd<=t.tokenEnd)].sort((m,g)=>m.tokenStart-g.tokenStart),a=[];let l=0;const c=t.bodyTokenStart??t.tokenStart,d=t.tokenEnd,f=[];let h=0;for(let m=c;m<d;m++){for(;a.length>0&&a[a.length-1].tokenEnd<=m;)a.pop();for(;l<s.length&&s[l].tokenStart<=m;)a.push(s[l]),l++;if(a.length>0)continue;const g=e[m];if(!g)continue;if(g.kind==="open"&&g.text==="{"){h++;const w=g.matchedAt;w!==void 0&&f.push({openIdx:m,closeIdx:w});continue}if(g.kind==="close"&&g.text==="}"){h--,f.length>0&&f[f.length-1].closeIdx===m&&f.pop();continue}if(h<=1||g.kind!=="ident"||g.text!=="const"&&g.text!=="let")continue;const b=v(e,m+1),T=e[b];if(!T)continue;const y=f.at(-1);if(y)if(T.kind==="open"&&(T.text==="{"||T.text==="[")){const w=new Set;rs(e,b,d,w);for(const k of w)r.has(k)&&i.push({name:k,startIdx:y.openIdx,endIdx:y.closeIdx})}else T.kind==="ident"&&r.has(T.text)&&i.push({name:T.text,startIdx:y.openIdx,endIdx:y.closeIdx})}return i}function Yc(e,t,n){return n.some(r=>r.name===e&&r.startIdx<=t&&t<=r.endIdx)}function ih(e,t){const n=v(e,t+1),r=e[n];if(!r)return null;if(r.kind==="open"&&r.text==="("){const s=ih(e,n);if(s===null)return null;const a=r.matchedAt,l=e[t].matchedAt;return a===void 0||l===void 0||v(e,a+1)!==l?null:s}if(r.kind!=="ident"||!Ft.has(r.text))return null;const i=v(e,n+1),o=e[i];return(o==null?void 0:o.kind)==="close"&&o.text===")"?r.text:null}function rh(e,t){const n=v(e,t+1),r=e[n];return r?r.kind==="open"&&r.text==="("?rh(e,n):r.kind==="ident"&&Ft.has(r.text)?r.text:null:null}function Kr(e){const t=new Map;let n=0;function r(i){for(;i<e.length;){const o=e[i].kind;if(o==="whitespace"||o==="newline"||o==="lineComment"||o==="blockComment")i++;else break}return i}for(let i=0;i<e.length;i++){const o=e[i];if(o.kind==="open"){n++;continue}if(o.kind==="close"){n>0&&n--;continue}if(n!==0||o.kind!=="ident"||o.text!=="import")continue;const s=r(i+1);if(s>=e.length)continue;const a=e[s];if(a.kind==="ident"&&a.text==="type")continue;let l;if(a.kind==="open"&&a.text==="{")l=s;else{const m=r(s+1);if(m>=e.length||e[m].kind!=="punct"||e[m].text!==",")continue;const g=r(m+1);if(g>=e.length||e[g].kind!=="open"||e[g].text!=="{")continue;l=g}const d=e[l].matchedAt;if(d===void 0)continue;const f=r(d+1);if(f>=e.length||e[f].kind!=="ident"||e[f].text!=="from")continue;let h=l+1;for(;h<d&&(h=r(h),!(h>=d));){const m=e[h];if(m.kind!=="ident"){h++;continue}if(m.text==="type"){const T=r(h+1);if(T<d&&e[T].kind==="ident"){let y=T+1;const w=r(y);if(w<d&&e[w].kind==="ident"&&e[w].text==="as"){const k=r(w+1);k<d&&e[k].kind==="ident"&&(y=k+1)}h=y;continue}}const g=m.text,b=r(h+1);if(b<d&&e[b].kind==="ident"&&e[b].text==="as"){const T=r(b+1);if(T<d&&e[T].kind==="ident"){t.set(e[T].text,g),h=T+1;continue}}h++}}return t}const os=pi;class oh extends Qe{constructor(n,r,i,o){super([n]);Qn(this,"fnName");Qn(this,"capability");Qn(this,"namespace");Qn(this,"line");Qn(this,"column");this.name="CapabilityCheckError",this.fnName=r,this.capability=i,this.namespace=o,this.line=n.line,this.column=n.column}}function sh(e,t,n){const r=Ue(t.resolved,"0.4"),i=Ue(t.resolved,"0.8");return Ue(t.resolved,"0.3")?h0(e,r,n,i):f0(e,r)}function f0(e,t){const n=Xt(e,{allowGenerics:t,includeNestedFns:!0}),r=n.tokens,i=n.fns.map(o=>o.decl);for(const o of i){const s=i.filter(a=>a!==o&&a.tokenStart>=o.tokenStart&&a.tokenEnd<=o.tokenEnd);p0(e,r,o,s)}return e}function p0(e,t,n,r){const i=new Set(n.capabilities);for(let o=n.bodyTokenStart??n.tokenStart;o<n.tokenEnd;o++){if(ah(o,r))continue;const s=t[o];if(!s||s.kind!=="ident"||!Object.prototype.hasOwnProperty.call(os,s.text))continue;const a=os[s.text];if(!a)continue;const l=v(t,o+1),c=t[l];if((c==null?void 0:c.kind)!=="punct"||c.text!=="."||i.has(a))continue;const{line:d,column:f}=V(e,s.start),h=n.capabilities.length===0?"(none — pure scope)":n.capabilities.join(", "),m=[...n.capabilities,a].join(", "),g=lh(t,l)??"…",b={code:"CAP001",severity:"error",file:null,line:d,column:f,start:s.start,end:s.end,message:`fn '${n.name}' calls '${s.text}.${g}' which requires capability '${a}', but uses clause is { ${h} }`,rule:`a function declared 'uses { ${h} }' may not call '${s.text}.…' which requires capability '${a}'`,idiom:"declare every capability the function consumes; pure helpers stay pure",rewrite:`fn ${n.name}(...) uses { ${m} } -> ...`};throw new oh(b,n.name,a,s.text)}}function h0(e,t,n,r=!1){var g;const i=Xt(e,{allowGenerics:t,includeNestedFns:!0}),o=i.tokens,s=i.fns.map(b=>b.decl),a=n?Kr(o):new Map,l=new Map;if(n)for(const[b,T]of Object.entries(n))(g=T.capabilities)!=null&&g.length&&l.set(b,T.capabilities);const c=new Set;for(const b of l.keys())c.add(b);for(const b of a.keys())c.add(b);const d=r?Xi(o):new Map,f=new Map,h=new Map;for(const b of s){const T=s.filter(D=>D!==b&&D.tokenStart>=b.tokenStart&&D.tokenEnd<=b.tokenEnd),y=Ns(o,b,s,d),w=r?Ts(o,b,s,new Set(d.keys())):[],{direct:k,callNames:R}=m0(e,o,b,T,s,c,y,r,w);f.set(b,{decl:b,declared:new Set(b.capabilities),direct:k,callees:R,consumed:new Map});const M=h.get(b.name)??[];M.push(b),h.set(b.name,M)}for(const b of f.values())for(const T of b.direct.values())b.consumed.set(T.capability,{kind:"direct",fnName:b.decl.name,use:T});if(l.size>0)for(const b of f.values())for(const T of b.callees){if(h.has(T))continue;const y=a.get(T)??T,w=l.get(y);if(w)for(const k of w)b.consumed.has(k)||b.consumed.set(k,{kind:"external",fnName:b.decl.name,callee:T,capability:k})}let m=!0;for(;m;){m=!1;for(const b of f.values())for(const T of b.callees){const y=h.get(T);if(y)for(const w of y){if(w===b.decl)continue;const k=f.get(w);if(k)for(const[R,M]of k.consumed)b.consumed.has(R)||(b.consumed.set(R,{kind:"via",fnName:b.decl.name,callee:T,next:M}),m=!0)}}}for(const b of f.values()){const T=[...b.consumed.keys()].filter(y=>!b.declared.has(y));if(T.length>0)throw y0(e,b,T)}for(const b of f.values()){const T=new Set(b.decl.paramCaps),y=[...b.declared].filter(w=>!b.consumed.has(w)&&!T.has(w));if(y.length>0)throw w0(e,b,y)}return e}function m0(e,t,n,r,i,o=new Set,s=new Map,a=!1,l=[]){const c=new Map,d=new Set,f=o.size>0?new Set([...i.map(h=>h.name),...o]):new Set(i.map(h=>h.name));for(let h=n.bodyTokenStart??n.tokenStart;h<n.tokenEnd;h++){if(ah(h,r))continue;const m=t[h];if(!m||m.kind!=="ident")continue;const g=v(t,h+1),b=t[g],y=(Yc(m.text,h,l)?void 0:s.get(m.text))??m.text,w=Object.prototype.hasOwnProperty.call(os,y)?os[y]:void 0,k=(b==null?void 0:b.kind)==="punct"&&b.text===".",R=a&&(b==null?void 0:b.kind)==="questionDot";if(w&&(k||R)){if(!c.has(w)){const M=lh(t,g)??"…",{line:D,column:I}=V(e,m.start),L={capability:w,namespace:m.text,member:M,accessOp:k?".":"?.",line:D,column:I,start:m.start,end:m.end};y!==m.text&&(L.aliasFor=y),c.set(w,L)}continue}m.text!==n.name&&f.has(m.text)&&(b==null?void 0:b.kind)==="open"&&b.text==="("&&!g0(t,h)&&d.add(m.text)}return{direct:c,callNames:d}}function g0(e,t){for(let n=t-1;n>=0;n--){const r=e[n];if(!r)return!1;if(!(r.kind==="whitespace"||r.kind==="newline"||r.kind==="lineComment"||r.kind==="blockComment"))return r.kind==="punct"&&r.text==="."||r.kind==="questionDot"}return!1}function y0(e,t,n){const i=n.find(D=>t.direct.has(D))??n[0],o=t.consumed.get(i),s=k0(o),a=t.decl.capabilities,l=a.length===0?"(none — pure scope)":a.join(", "),c=[...a,...n].join(", "),d=Q("CAP001"),f=o.kind==="via"||o.kind==="external",h=b0(o),m=V(e,t.decl.fnKeywordStart),g=f?m.line:s.line,b=f?m.column:s.column,T=f?t.decl.fnKeywordStart:s.start,y=f?t.decl.nameStart+t.decl.name.length:s.end,w=n.length>1?` (also missing: ${n.filter(D=>D!==i).join(", ")})`:"",k=!f&&s.aliasFor?` ('${s.namespace}' is an alias for '${s.aliasFor}')`:"",R=f?`fn '${t.decl.name}' transitively consumes capability '${i}' via ${h}, but uses clause is { ${l} }${w}`:`fn '${t.decl.name}' calls '${s.namespace}${s.accessOp}${s.member}'${k} which requires capability '${i}', but uses clause is { ${l} }${w}`,M={code:"CAP001",severity:"error",file:null,line:g,column:b,start:T,end:y,message:R,rule:`a function declared 'uses { ${l} }' may not consume capability '${i}'${f?` (reached via ${h})`:` (via '${s.namespace}${s.accessOp}…')`}`,idiom:d.idiom,rewrite:`fn ${t.decl.name}(...) uses { ${c} } -> ...`};return new oh(M,t.decl.name,i,s.namespace)}function w0(e,t,n){const r=V(e,t.decl.fnKeywordStart),i=t.decl.capabilities.filter(c=>!n.includes(c)),o=i.length===0?"":` uses { ${i.join(", ")} }`,s=Q("CAP002"),a=n.length===1?`fn '${t.decl.name}' declares capability '${n[0]}' but its body never reaches it (no direct stdlib use, no callee consumes it)`:`fn '${t.decl.name}' declares capabilities { ${n.join(", ")} } but its body never reaches them`,l={code:"CAP002",severity:"error",file:null,line:r.line,column:r.column,start:t.decl.fnKeywordStart,end:t.decl.nameStart+t.decl.name.length,message:a,rule:s.rule,idiom:s.idiom,rewrite:`fn ${t.decl.name}(...)${o} -> ...`};return new Qe([l])}function b0(e){const t=[];let n=e;for(;n.kind==="via";)t.push(n.fnName),n=n.next;if(n.kind==="external")return t.push(n.fnName),t.push(`${n.callee} (imported)`),t.join(" -> ");t.push(n.fnName);const r=n.use.aliasFor?`${n.use.namespace}${n.use.accessOp}${n.use.member} ('${n.use.namespace}' is an alias for '${n.use.aliasFor}')`:`${n.use.namespace}${n.use.accessOp}${n.use.member}`;return t.push(r),t.join(" -> ")}const v0={capability:"",namespace:"(imported)",member:"",accessOp:".",line:0,column:0,start:0,end:0};function k0(e){let t=e;for(;t.kind==="via";)t=t.next;return t.kind==="external"?v0:t.use}function ah(e,t){for(const n of t)if(e>=n.tokenStart&&e<n.tokenEnd)return!0;return!1}function lh(e,t){const n=v(e,t+1),r=e[n];return r&&r.kind==="ident"?r.text:null}function x0(e,t){var a;const n=Ze(e),r=t?Ue(t.resolved,"0.4"):!1,i=t?Ue(t.resolved,"0.5"):!1;let o="",s=0;for(let l=0;l<n.length;l++){const c=n[l];if(c.kind!=="keyword"||c.keyword!=="fn")continue;const d=xs(n,l,{allowGenerics:r,src:e});if(d){if(i&&d.unsafeReason!==void 0&&d.unsafeReason.trim()===""){const f=d.unsafeReasonStart??n[d.tokenStart].start,h=Q("UNS002"),{line:m,column:g}=V(e,f),b={code:"UNS002",severity:"error",file:null,line:m,column:g,message:"declaration-level unsafe fn has an empty justification string",rule:h.rule,idiom:h.idiom,rewrite:'unsafe "<short reason>" fn <name>(...) -> T { ... }'};throw new Qe([b])}o+=e.slice(s,n[d.tokenStart].start),o+=S0(d),s=n[d.tokenEnd-1]?n[d.tokenEnd-1].end:((a=n[d.tokenEnd])==null?void 0:a.start)??s,l=d.tokenEnd-1}}return o+=e.slice(s),o}function S0(e){const t=`[${e.capabilities.map(a=>JSON.stringify(a)).join(", ")}]`,n=e.isAsync?"async () => ":"() => ",r=N0(e),i=e.isAsync?"async ":"",o=e.typeParams??"";return`${e.unsafeReason!==void 0?`/* unsafe: "${e.unsafeReason.replace(/\*\//g,"*\\/")}" */
`:""}${i}function ${e.name}${o}${e.argsTs}: ${e.returnType} {
  return $enter(${t} as const, ${n}{
${T0(r,4)}
  });
}`}function N0(e){if(e.body.kind==="block")return e.body.text;const t=e.body.text.trim();return t===""?"":Ss(t)}function T0(e,t){const n=" ".repeat(t);return e.split(`
`).map(r=>r.length===0?r:n+r).join(`
`)}function $0(e,t){if(!Ue(t.resolved,"0.9"))return{code:e,warnings:[]};const n=Xt(e,{allowGenerics:!0,includeNestedFns:!1}),r=[],i=Q("CAP003");for(const{decl:o}of n.fns){if(!o.unsafeReason||o.capabilities.length===0)continue;const{line:s,column:a}=V(e,o.fnKeywordStart);r.push({code:"CAP003",severity:"warning",file:null,line:s,column:a,start:o.fnKeywordStart,end:o.nameStart+o.name.length,message:`fn '${o.name}' declares capability { ${o.capabilities.join(", ")} } inside an unsafe fn — claim is programmer-asserted, not compiler-proven`,rule:i.rule,idiom:i.idiom,rewrite:i.rewrite})}return{code:e,warnings:r}}function Y0(e,t){var d,f,h;const n=Ue(t.resolved,"0.7");if(Ue(t.resolved,"0.9"))return{code:e,warnings:[]};const i=Ue(t.resolved,"0.4"),o=Xt(e,{allowGenerics:i,includeNestedFns:!0}),s=[],a=Q("VER001"),l=Q("VER002"),c=Q("VER003");for(const{decl:m}of o.fns){const g=(((d=m.reads)==null?void 0:d.length)??0)>0,b=(((f=m.writes)==null?void 0:f.length)??0)>0,T=(((h=m.throws)==null?void 0:h.length)??0)>0;if(g||b){const{line:y,column:w}=V(e,m.fnKeywordStart),k=[];g&&k.push(`reads { ${m.reads.join(", ")} }`),b&&k.push(`writes { ${m.writes.join(", ")} }`);const R=k.join(" / ");s.push({code:"VER001",severity:"warning",file:null,line:y,column:w,start:m.fnKeywordStart,end:m.nameStart+m.name.length,message:`fn '${m.name}' declares ${R} at ?bs ${t.resolved} — DEP001/DEP002 enforcement requires ?bs 0.9; this annotation is unenforced`,rule:a.rule,idiom:a.idiom,rewrite:a.rewrite})}if(T){const{line:y,column:w}=V(e,m.fnKeywordStart),k=`throws { ${m.throws.join(", ")} }`;s.push({code:"VER002",severity:"warning",file:null,line:y,column:w,start:m.fnKeywordStart,end:m.nameStart+m.name.length,message:`fn '${m.name}' declares ${k} at ?bs ${t.resolved} — THR001 enforcement requires ?bs 0.9; this annotation is unenforced`,rule:l.rule,idiom:l.idiom,rewrite:l.rewrite})}if(!n&&m.intent){const{line:y,column:w}=V(e,m.fnKeywordStart);s.push({code:"VER003",severity:"warning",file:null,line:y,column:w,start:m.fnKeywordStart,end:m.nameStart+m.name.length,message:`fn '${m.name}' declares intent: "${m.intent}" at ?bs ${t.resolved} — INT001–INT005 enforcement requires ?bs 0.7; this annotation is unenforced`,rule:c.rule,idiom:c.idiom,rewrite:c.rewrite})}}return{code:e,warnings:s}}function ch(e){const t=[];for(let n=0;n<e.length;n++){const r=e[n];if(!r||r.kind!=="keyword"||r.keyword!=="unsafe")continue;const i=v(e,n+1),o=e[i];if(!o)continue;let s=-1;if(o.kind==="open"&&o.text==="{")s=i;else if(o.kind==="string"){const c=v(e,i+1),d=e[c];d&&d.kind==="open"&&d.text==="{"&&(s=c)}if(s===-1)continue;const a=e[s];if(a.matchedAt===void 0)continue;const l=e[a.matchedAt];l&&(t.push({start:a.start,end:l.end}),n=a.matchedAt)}return t}function me(e,t){for(const n of t)if(e>=n.start&&e<n.end)return!0;return!1}function Ve(e,t){const n=e[t];if(!n||n.kind!=="operator"||n.text!=="*")return!1;const r=ie(e,t-1),i=e[r];return!!(i&&i.kind==="ident"&&i.text==="function")}function vt(e,t){var r,i,o,s;let n=v(e,t+1);if(!e[n]||e[n].kind!=="close"||e[n].text!==")")return null;for(;((r=e[n])==null?void 0:r.kind)==="close"&&((i=e[n])==null?void 0:i.text)===")";)n=v(e,n+1);return((o=e[n])==null?void 0:o.kind)==="open"&&((s=e[n])==null?void 0:s.text)==="("?n:null}function kt(e,t){var i,o;let n=v(e,t+1);if(!e[n]||e[n].kind!=="close"||e[n].text!==")")return null;for(;((i=e[n])==null?void 0:i.kind)==="close"&&((o=e[n])==null?void 0:o.text)===")";)n=v(e,n+1);const r=e[n];return r&&r.kind==="punct"&&r.text==="."||r&&r.kind==="questionDot"?n:null}function C0(e,t,n){const r=v(e,t+1),i=e[r];if(!i||r>=n)return!1;if(i.kind==="ident"&&i.text==="function")return!0;if(i.kind==="keyword"&&i.text==="async"){const s=v(e,r+1),a=e[s];if(a&&a.kind==="ident"&&a.text==="function")return!0}let o=0;for(let s=t+1;s<n;s++){const a=e[s];if(a){if(a.kind==="open"){o++;continue}if(a.kind==="close"){if(o--,o<0)break;continue}if(o===0&&a.kind==="fatArrow")return!0}}return!1}const I0=new Set(["log","error","warn","info","debug","dir","dirxml","table","trace","group","groupCollapsed","groupEnd"]),A0=new Set(["setTimeout","setInterval","queueMicrotask"]),pd=new Set(["argv","cwd","platform","arch","pid","ppid","version","versions","hrtime","uptime","memoryUsage","cpuUsage","resourceUsage"]),R0=new Set(["geolocation","clipboard","mediaDevices","serviceWorker","permissions","onLine","userAgent","language","languages","platform","hardwareConcurrency","deviceMemory","connection","wakeLock","sendBeacon"]),E0=new Set(["href","pathname","search","hash","hostname","host","port","protocol","origin","assign","replace","reload"]),j0=new Set(["assign","replace","reload"]),P0=new Set(["pushState","replaceState","back","forward","go","length","state","scrollRestoration"]),D0=new Set(["pushState","replaceState","back","forward","go"]),O0=new Set(["instantiate","instantiateStreaming","compile","compileStreaming","Instance","Module"]),M0=new Set(["apply","construct","set","defineProperty","deleteProperty","setPrototypeOf"]),_0=new Set(["globalThis","window","self","global"]),Jt=new Set(["fetch","WebSocket","EventSource","Worker","SharedWorker","eval","Function","setTimeout","setInterval","queueMicrotask","BroadcastChannel","localStorage","sessionStorage","indexedDB","Notification","Math","crypto","navigator","Proxy","Reflect","Object","process","caches","RTCPeerConnection","WebAssembly","MessageChannel","requestAnimationFrame","requestIdleCallback"]),q0=new Set(["globalThis","window","self"]),Kn=q0,hd=new Set(["+=","-=","*=","/=","%=","**=","&=","|=","^=","<<=",">>=",">>>=","&&=","||=","??="]),xt=new Set(["fetch","WebSocket","EventSource","Worker","SharedWorker","BroadcastChannel","Notification","XMLHttpRequest","RTCPeerConnection","requestAnimationFrame","requestIdleCallback","WebAssembly","MessageChannel","Proxy","Reflect","eval","Function","postMessage","addEventListener","setTimeout","setInterval","queueMicrotask"]);function F0(e,t){var Pc,Dc,Oc,Mc,_c,qc,Fc,Lc,Uc,Bc,zc,Wc,Hc,Vc,Gc;if(!Ue(t.resolved,"0.7"))return{code:e,warnings:[]};const n=Ue(t.resolved,"0.4"),r=Xt(e,{allowGenerics:n,includeNestedFns:!0}),i=r.tokens,o=[],s=Q("SYN002"),a=Q("SYN003"),l=Q("SYN004"),c=Q("SYN005"),d=Q("SYN006"),f=Q("SYN007"),h=Q("SYN008"),m=Q("SYN009"),g=Q("SYN010"),b=Q("SYN011"),T=Q("SYN012"),y=Q("SYN013"),w=Q("SYN014"),k=Q("SYN015"),R=Q("SYN016"),M=Q("SYN017"),D=Q("SYN018"),I=Q("SYN019"),L=Q("SYN020"),z=Q("SYN021"),W=Q("SYN022"),H=Q("SYN023"),K=Q("SYN024"),le=Q("SYN025"),pe=Q("SYN026"),Ye=Q("SYN027"),ve=Q("SYN028"),Z=Q("SYN029"),te=Q("SYN030"),se=Q("SYN031"),J=Q("SYN032"),ye=Q("SYN033"),Oe=Q("SYN034"),Ae=Q("SYN035"),$e=Q("SYN036"),Me=Q("SYN037"),Te=Q("SYN038"),de=Q("SYN039"),we=Q("SYN040"),re=Q("SYN041"),qe=Q("SYN042"),be=Q("SYN043"),Je=Q("SYN044"),rt=Q("SYN045"),Gn=Q("SYN046"),pn=Q("SYN047"),$s=Q("SYN048"),Ys=Q("SYN049"),Cs=Q("SYN050"),Is=Q("SYN051"),As=Q("SYN052"),Rs=Q("SYN053"),Es=Q("SYN054"),js=Q("SYN055"),Ps=Q("SYN056"),hi=Q("SYN057"),mi=Q("SYN058"),gi=Q("SYN059"),Ds=Q("SYN060"),Os=Q("SYN061"),yi=Q("SYN062"),Ms=Q("SYN063"),hn=Q("SYN064"),wi=Q("SYN065"),_s=Q("SYN066"),qs=Q("SYN067"),Fs=Q("SYN068"),Ls=Q("SYN069"),Us=Q("SYN070"),Bs=Q("SYN071"),zs=Q("SYN072"),Ws=Q("SYN073"),Hs=Q("SYN074"),he=ch(i);for(const{decl:_}of r.fns)_.unsafeReason!==void 0&&he.push({start:_.body.start,end:_.body.end});const Xr=r.fns.map(_=>({start:_.decl.body.start,end:_.decl.body.end})),Yh=r.fns.map(_=>({start:_.decl.start,end:_.decl.body.start})),Zr=new Map,Zi=new Map,Vs=new Map,Gs=new Map,Cc=new Map;for(let _=0;_<i.length;_++){const De=i[_];if(!De||De.kind!=="ident"||De.text!=="const"&&De.text!=="let"&&De.text!=="var"||Xr.some(ke=>De.start>=ke.start&&De.start<ke.end))continue;const Be=v(i,_+1),_e=i[Be];if(!_e||_e.kind!=="ident")continue;const ge=v(i,Be+1),ce=i[ge];if(!ce||ce.kind!=="eq")continue;const Pe=v(i,ge+1),Fe=i[Pe];if(!Fe||Fe.kind!=="ident")continue;const Re=v(i,Pe+1),Ie=i[Re];Ie&&Ie.kind==="punct"&&Ie.text==="."||Ie&&Ie.kind==="questionDot"||Ie&&Ie.kind==="open"&&Ie.text==="("||(xt.has(Fe.text)&&Zr.set(_e.text,Fe.text),Kn.has(Fe.text)&&Zi.set(_e.text,Fe.text))}const Qs=new Map,Jr=new Map;for(let _=0;_<i.length;_++){const De=i[_];if(!De||De.kind!=="ident"||Xr.some(ke=>De.start>=ke.start&&De.start<ke.end)||Yh.some(ke=>De.start>=ke.start&&De.start<ke.end))continue;const Be=v(i,_+1),_e=i[Be];if(!_e||_e.kind!=="eq")continue;const ge=ie(i,_-1),ce=i[ge];if(ce&&ce.kind==="ident"&&(ce.text==="const"||ce.text==="let"||ce.text==="var")||ce&&(ce.kind==="punct"&&ce.text==="."||ce.kind==="questionDot")||ce&&ce.kind==="close"&&ce.text==="]")continue;const Pe=v(i,Be+1),Fe=i[Pe];if(!Fe||Fe.kind!=="ident")continue;const Re=v(i,Pe+1),Ie=i[Re];Ie&&Ie.kind==="punct"&&Ie.text==="."||Ie&&Ie.kind==="questionDot"||Ie&&Ie.kind==="open"&&Ie.text==="("||(xt.has(Fe.text)&&!Zr.has(De.text)&&Qs.set(De.text,Fe.text),Kn.has(Fe.text)&&!Zi.has(De.text)&&Jr.set(De.text,Fe.text))}for(let _=0;_<i.length;_++){const De=i[_];if(!De||De.kind!=="ident"||De.text!=="const"&&De.text!=="let"&&De.text!=="var"||Xr.some(Ie=>De.start>=Ie.start&&De.start<Ie.end))continue;const Be=v(i,_+1),_e=i[Be];if(!_e||!(_e.kind==="open"&&_e.text==="{"))continue;const ge=_e.matchedAt;if(ge===void 0)continue;const ce=v(i,ge+1),Pe=i[ce];if(!Pe||Pe.kind!=="eq")continue;const Fe=v(i,ce+1),Re=i[Fe];if(!(!Re||Re.kind!=="ident")&&Kn.has(Re.text))for(let Ie=Be+1;Ie<ge;Ie++){const ke=i[Ie];if(!ke||ke.kind!=="ident"||!xt.has(ke.text))continue;const Le=v(i,Ie+1),Se=i[Le];if(!Se||!(Se.kind==="punct"&&Se.text===":"))continue;const E=v(i,Le+1),p=i[E];!p||p.kind!=="ident"||(Vs.set(p.text,{original:ke.text,receiver:Re.text}),Ie=E)}}const Ks=new Map;for(const{decl:_}of r.fns){if(_.unsafeReason!==void 0)continue;const De=_.bodyTokenStart??_.tokenStart,Be=r.fns.filter(ge=>ge.decl!==_&&ge.decl.body.start>=_.body.start&&ge.decl.body.end<=_.body.end).map(ge=>({start:ge.decl.body.start,end:ge.decl.body.end})),_e=new Map;for(let ge=De;ge<_.tokenEnd;ge++){const ce=i[ge];if(!ce||Be.some(p=>ce.start>=p.start&&ce.start<p.end)||ce.kind!=="ident"||ce.text!=="const"&&ce.text!=="let"&&ce.text!=="var")continue;const Pe=v(i,ge+1),Fe=i[Pe];if(!Fe||Fe.kind!=="ident")continue;const Re=v(i,Pe+1),Ie=i[Re];if(!Ie||Ie.kind!=="eq")continue;const ke=v(i,Re+1),Le=i[ke];if(!Le||Le.kind!=="ident"||!xt.has(Le.text))continue;const Se=v(i,ke+1),E=i[Se];E&&E.kind==="punct"&&E.text==="."||E&&E.kind==="questionDot"||E&&E.kind==="open"&&E.text==="("||_e.set(Fe.text,Le.text)}_e.size>0&&Ks.set(_,_e)}const Xs=new Map;for(const{decl:_}of r.fns){if(_.unsafeReason!==void 0)continue;const De=_.bodyTokenStart??_.tokenStart,Be=r.fns.filter(ge=>ge.decl!==_&&ge.decl.body.start>=_.body.start&&ge.decl.body.end<=_.body.end).map(ge=>({start:ge.decl.body.start,end:ge.decl.body.end})),_e=new Map;for(let ge=De;ge<_.tokenEnd;ge++){const ce=i[ge];if(!ce||Be.some(p=>ce.start>=p.start&&ce.start<p.end)||ce.kind!=="ident"||ce.text!=="const"&&ce.text!=="let"&&ce.text!=="var")continue;const Pe=v(i,ge+1),Fe=i[Pe];if(!Fe||Fe.kind!=="ident")continue;const Re=v(i,Pe+1),Ie=i[Re];if(!Ie||Ie.kind!=="eq")continue;const ke=v(i,Re+1),Le=i[ke];if(!Le||Le.kind!=="ident"||!Kn.has(Le.text))continue;const Se=v(i,ke+1),E=i[Se];E&&E.kind==="punct"&&E.text==="."||E&&E.kind==="questionDot"||_e.set(Fe.text,Le.text)}_e.size>0&&Xs.set(_,_e)}const Ic=new Map;for(const{decl:_}of r.fns){if(_.unsafeReason!==void 0)continue;const De=_.bodyTokenStart??_.tokenStart,Be=_.tokenEnd,_e=r.fns.filter(ce=>ce.decl!==_&&ce.decl.body.start>=_.body.start&&ce.decl.body.end<=_.body.end).map(ce=>({start:ce.decl.body.start,end:ce.decl.body.end})),ge=new Map;for(let ce=De;ce<Be;ce++){const Pe=i[ce];if(!Pe||_e.some(p=>Pe.start>=p.start&&Pe.start<p.end)||Pe.kind!=="ident"||Pe.text!=="const"&&Pe.text!=="let"&&Pe.text!=="var")continue;const Fe=v(i,ce+1),Re=i[Fe];if(!Re||!(Re.kind==="open"&&Re.text==="{"))continue;const Ie=Re.matchedAt;if(Ie===void 0)continue;const ke=v(i,Ie+1),Le=i[ke];if(!Le||Le.kind!=="eq")continue;const Se=v(i,ke+1),E=i[Se];if(!(!E||E.kind!=="ident")&&Kn.has(E.text))for(let p=Fe+1;p<Ie;p++){const F=i[p];if(!F||F.kind!=="ident"||!xt.has(F.text))continue;const u=v(i,p+1),A=i[u];if(!A||!(A.kind==="punct"&&A.text===":"))continue;const x=v(i,u+1),S=i[x];!S||S.kind!=="ident"||(ge.set(S.text,{original:F.text,receiver:E.text}),p=x)}}ge.size>0&&Ic.set(_,ge)}const Ac=new Map;for(const{decl:_}of r.fns){if(_.unsafeReason!==void 0)continue;const De=_.bodyTokenStart??_.tokenStart,Be=_.tokenEnd,_e=r.fns.filter(ce=>ce.decl!==_&&ce.decl.body.start>=_.body.start&&ce.decl.body.end<=_.body.end).map(ce=>({start:ce.decl.body.start,end:ce.decl.body.end})),ge=new Map;for(let ce=De;ce<Be;ce++){const Pe=i[ce];if(!Pe||Pe.kind!=="ident"||_e.some(u=>Pe.start>=u.start&&Pe.start<u.end))continue;const Fe=v(i,ce+1),Re=i[Fe];if(!Re||Re.kind!=="eq")continue;const Ie=ie(i,ce-1),ke=i[Ie];if(ke&&ke.kind==="ident"&&(ke.text==="const"||ke.text==="let"||ke.text==="var")||ke&&(ke.kind==="punct"&&ke.text==="."||ke.kind==="questionDot")||ke&&ke.kind==="close"&&ke.text==="]")continue;const Le=v(i,Fe+1),Se=i[Le];if(!Se||Se.kind!=="ident"||!xt.has(Se.text))continue;const E=v(i,Le+1),p=i[E];if(p&&p.kind==="punct"&&p.text==="."||p&&p.kind==="questionDot"||p&&p.kind==="open"&&p.text==="(")continue;const F=Ks.get(_);(!F||!F.has(Pe.text))&&ge.set(Pe.text,Se.text)}ge.size>0&&Ac.set(_,ge)}const Rc=new Map;for(const{decl:_}of r.fns){if(_.unsafeReason!==void 0)continue;const De=_.bodyTokenStart??_.tokenStart,Be=_.tokenEnd,_e=r.fns.filter(ce=>ce.decl!==_&&ce.decl.body.start>=_.body.start&&ce.decl.body.end<=_.body.end).map(ce=>({start:ce.decl.body.start,end:ce.decl.body.end})),ge=new Map;for(let ce=De;ce<Be;ce++){const Pe=i[ce];if(!Pe||Pe.kind!=="ident"||_e.some(u=>Pe.start>=u.start&&Pe.start<u.end))continue;const Fe=v(i,ce+1),Re=i[Fe];if(!Re||Re.kind!=="eq")continue;const Ie=ie(i,ce-1),ke=i[Ie];if(ke&&ke.kind==="ident"&&(ke.text==="const"||ke.text==="let"||ke.text==="var")||ke&&(ke.kind==="punct"&&ke.text==="."||ke.kind==="questionDot")||ke&&ke.kind==="close"&&ke.text==="]")continue;const Le=v(i,Fe+1),Se=i[Le];if(!Se||Se.kind!=="ident"||!Kn.has(Se.text))continue;const E=v(i,Le+1),p=i[E];if(p&&p.kind==="punct"&&p.text==="."||p&&p.kind==="questionDot")continue;const F=Xs.get(_);(!F||!F.has(Pe.text))&&ge.set(Pe.text,Se.text)}ge.size>0&&Rc.set(_,ge)}const Ec=new Map;for(const{decl:_}of r.fns){if(_.unsafeReason!==void 0)continue;const De=_.bodyTokenStart??_.tokenStart,Be=new Map;for(let _e=_.tokenStart;_e<De;_e++){const ge=i[_e];if(!ge||ge.kind!=="ident")continue;const ce=v(i,_e+1),Pe=i[ce];if(!Pe||Pe.kind!=="eq")continue;const Fe=ie(i,_e-1),Re=i[Fe];if(Re&&Re.kind==="ident"&&(Re.text==="const"||Re.text==="let"||Re.text==="var")||Re&&(Re.kind==="punct"&&Re.text==="."||Re.kind==="questionDot"))continue;const Ie=v(i,ce+1),ke=i[Ie];if(!ke||ke.kind!=="ident"||!xt.has(ke.text))continue;const Le=v(i,Ie+1),Se=i[Le];Se&&Se.kind==="punct"&&Se.text==="."||Se&&Se.kind==="questionDot"||Se&&Se.kind==="open"&&Se.text==="("||Be.set(ge.text,ke.text)}Be.size>0&&Ec.set(_,Be)}const jc=new Map;for(const{decl:_}of r.fns){if(_.unsafeReason!==void 0)continue;const De=_.bodyTokenStart??_.tokenStart,Be=new Map;for(let _e=_.tokenStart;_e<De;_e++){const ge=i[_e];if(!ge||ge.kind!=="ident")continue;const ce=v(i,_e+1),Pe=i[ce];if(!Pe||Pe.kind!=="eq")continue;const Fe=ie(i,_e-1),Re=i[Fe];if(Re&&Re.kind==="ident"&&(Re.text==="const"||Re.text==="let"||Re.text==="var")||Re&&(Re.kind==="punct"&&Re.text==="."||Re.kind==="questionDot"))continue;const Ie=v(i,ce+1),ke=i[Ie];if(!ke||ke.kind!=="ident"||!Kn.has(ke.text))continue;const Le=v(i,Ie+1),Se=i[Le];Se&&Se.kind==="punct"&&Se.text==="."||Se&&Se.kind==="questionDot"||Se&&Se.kind==="open"&&Se.text==="("||Be.set(ge.text,ke.text)}Be.size>0&&jc.set(_,Be)}for(let _=0;_<i.length;_++){const De=i[_];if(!De||De.kind!=="ident"||De.text!=="const"&&De.text!=="let"&&De.text!=="var"||Xr.some(Le=>De.start>=Le.start&&De.start<Le.end))continue;const Be=v(i,_+1),_e=i[Be];if(!_e||!(_e.kind==="open"&&_e.text==="["))continue;const ge=_e.matchedAt;if(ge===void 0)continue;const ce=v(i,ge+1),Pe=i[ce];if(!Pe||Pe.kind!=="eq")continue;const Fe=v(i,ce+1),Re=i[Fe];if(!Re||!(Re.kind==="open"&&Re.text==="["))continue;const Ie=Re.matchedAt;if(Ie===void 0)continue;const ke=new Map;{let Le=0,Se=Be+1;for(;Se<ge;){const E=i[Se];if(!E){Se++;continue}if(E.kind==="punct"&&E.text===","){Le++,Se++;continue}if(E.kind==="operator"&&E.text==="..."){Se++;continue}if(E.kind==="open"&&(E.text==="["||E.text==="{")){E.matchedAt!==void 0?Se=E.matchedAt+1:Se++;continue}E.kind==="ident"&&!ke.has(Le)&&ke.set(Le,E.text),Se++}}if(ke.size!==0){let Le=0,Se=Fe+1;for(;Se<Ie;){const E=i[Se];if(!E){Se++;continue}if(E.kind==="punct"&&E.text===","){Le++,Se++;continue}if(E.kind==="open"){E.matchedAt!==void 0?Se=E.matchedAt+1:Se++;continue}if(E.kind==="ident"&&xt.has(E.text)){const p=i[ie(i,Se-1)];if(!(p&&(p.kind==="punct"&&p.text==="."||p.kind==="questionDot"))){const u=ke.get(Le);u!==void 0&&Gs.set(u,E.text)}}Se++}}}for(const{decl:_}of r.fns){if(_.unsafeReason!==void 0)continue;const De=_.bodyTokenStart??_.tokenStart,Be=r.fns.filter(ge=>ge.decl!==_&&ge.decl.body.start>=_.body.start&&ge.decl.body.end<=_.body.end).map(ge=>({start:ge.decl.body.start,end:ge.decl.body.end})),_e=new Map;for(let ge=De;ge<_.tokenEnd;ge++){const ce=i[ge];if(!ce||Be.some(F=>ce.start>=F.start&&ce.start<F.end)||ce.kind!=="ident"||ce.text!=="const"&&ce.text!=="let"&&ce.text!=="var")continue;const Pe=v(i,ge+1),Fe=i[Pe];if(!Fe||!(Fe.kind==="open"&&Fe.text==="["))continue;const Re=Fe.matchedAt;if(Re===void 0)continue;const Ie=v(i,Re+1),ke=i[Ie];if(!ke||ke.kind!=="eq")continue;const Le=v(i,Ie+1),Se=i[Le];if(!Se||!(Se.kind==="open"&&Se.text==="["))continue;const E=Se.matchedAt;if(E===void 0)continue;const p=new Map;{let F=0,u=Pe+1;for(;u<Re;){const A=i[u];if(!A){u++;continue}if(A.kind==="punct"&&A.text===","){F++,u++;continue}if(A.kind==="operator"&&A.text==="..."){u++;continue}if(A.kind==="open"&&(A.text==="["||A.text==="{")){A.matchedAt!==void 0?u=A.matchedAt+1:u++;continue}A.kind==="ident"&&!p.has(F)&&p.set(F,A.text),u++}}if(p.size!==0){let F=0,u=Le+1;for(;u<E;){const A=i[u];if(!A){u++;continue}if(A.kind==="punct"&&A.text===","){F++,u++;continue}if(A.kind==="open"){A.matchedAt!==void 0?u=A.matchedAt+1:u++;continue}if(A.kind==="ident"&&xt.has(A.text)){const x=i[ie(i,u-1)];if(!(x&&(x.kind==="punct"&&x.text==="."||x.kind==="questionDot"))){const q=p.get(F);q!==void 0&&_e.set(q,A.text)}}u++}}}_e.size>0&&Cc.set(_,_e)}const Ch=Qr(r.fns.map(_=>_.decl));for(const{decl:_}of r.fns){if(_.unsafeReason!==void 0)continue;const De=Ch.get(_)??[],Be=[];let _e=0;const ge=_.bodyTokenStart??_.tokenStart,ce=Ks.get(_),Pe=Xs.get(_),Fe=Ic.get(_),Re=Ac.get(_),Ie=Rc.get(_),ke=Ec.get(_),Le=jc.get(_),Se=Cc.get(_);for(let E=ge;E<_.tokenEnd;E++){const p=i[E];if(!p||p.kind!=="ident"||!xt.has(p.text))continue;const F=ie(i,E-1),u=i[F];if(!u||u.kind!=="punct"||u.text!==":")continue;const A=ie(i,F-1),x=i[A];if(!x||x.kind!=="ident")continue;const S=x.text;let q=-1,P=0;for(let ae=E-1;ae>=ge;ae--){const oe=i[ae];if(oe){if(oe.kind==="close"){P++;continue}if(oe.kind==="open"){if(P===0&&oe.text==="{"){q=ae;break}P--}}}if(q<0)continue;const j=i[q].matchedAt;if(j===void 0)continue;let N=v(i,j+1);for(;((Pc=i[N])==null?void 0:Pc.kind)==="close"&&((Dc=i[N])==null?void 0:Dc.text)===")";)N=v(i,N+1);const C=i[N],$=C&&C.kind==="punct"&&C.text===".",Y=C&&C.kind==="questionDot";if(!$&&!Y)continue;const O=v(i,N+1),U=i[O];if(!U||U.kind!=="ident"||U.text!==S)continue;const B=v(i,O+1),G=i[B];if(!G||G.kind!=="open"||G.text!=="("||me(p.start,he))continue;const ne=Y?"?.":".",X=V(e,p.start);o.push({code:"SYN066",severity:"warning",file:null,line:X.line,column:X.column,start:p.start,end:G.start+1,message:`fn '${_.name}' stores ${p.text} as property '${S}' of an inline object then calls it via { ${S}: ${p.text} }${ne}${S}(...) — SYN004/SYN007/… only fire when ${p.text} is in call position (followed by '('); alias-binding checks (SYN044–SYN065) only track binding declarations, not inline object properties; the runtime effect is identical to calling ${p.text}(...) directly; refactor to call ${p.text} directly or wrap in unsafe "reason" { { ${S}: ${p.text} }${ne}${S}(...) }`,rule:_s.rule,idiom:_s.idiom,rewrite:_s.rewrite})}for(let E=ge;E<_.tokenEnd;E++){const p=i[E];if(!p||p.kind!=="ident"||!xt.has(p.text))continue;const F=ie(i,E-1),u=i[F];if(!(u&&u.kind==="open"&&u.text==="["||u&&u.kind==="punct"&&u.text===","))continue;let x=-1;{let X=0;for(let ae=E-1;ae>=ge;ae--){const oe=i[ae];if(oe){if(oe.kind==="close"){X++;continue}if(oe.kind==="open"){if(X===0&&oe.text==="["){x=ae;break}X--}}}}if(x<0)continue;let S=0;{let X=0;for(let ae=x+1;ae<E;ae++){const oe=i[ae];if(oe){if(oe.kind==="open"){X++;continue}if(oe.kind==="close"){X--;continue}X===0&&oe.kind==="punct"&&oe.text===","&&S++}}}const q=i[x].matchedAt;if(q===void 0)continue;let P=v(i,q+1);for(;((Oc=i[P])==null?void 0:Oc.kind)==="close"&&((Mc=i[P])==null?void 0:Mc.text)===")";)P=v(i,P+1);const j=i[P];if(!j||!(j.kind==="open"&&j.text==="["))continue;const N=v(i,P+1),C=i[N];if(!C||C.kind!=="number")continue;const $=parseInt(C.text,10);if(isNaN($)||$!==S)continue;const Y=v(i,N+1),O=i[Y];if(!O||!(O.kind==="close"&&O.text==="]"))continue;const U=v(i,Y+1),B=i[U];if(!(B&&(B.kind==="open"&&B.text==="("||B.kind==="questionDot"))||me(p.start,he))continue;const ne=V(e,p.start);o.push({code:"SYN069",severity:"warning",file:null,line:ne.line,column:ne.column,start:p.start,end:O.end,message:`fn '${_.name}' stores ${p.text} at index ${S} of an inline array then calls it via [${p.text}][${S}](...) — SYN004/SYN007/… only fire when ${p.text} is in call position (followed by '('); alias-binding checks (SYN044–SYN068) only track binding declarations, not inline array elements; the runtime effect is identical to calling ${p.text}(...) directly; refactor to call ${p.text} directly or wrap in unsafe "reason" { [${p.text}][${S}](...) }`,rule:Ls.rule,idiom:Ls.idiom,rewrite:Ls.rewrite})}for(let E=ge;E<_.tokenEnd;E++){const p=i[E];if(!p||p.kind!=="ident"||!xt.has(p.text))continue;const F=ie(i,E-1),u=i[F];if(!(u&&u.kind==="open"&&u.text==="["||u&&u.kind==="punct"&&u.text===","))continue;let x=-1;{let fe=0;for(let Ce=E-1;Ce>=ge;Ce--){const je=i[Ce];if(je){if(je.kind==="close"){fe++;continue}if(je.kind==="open"){if(fe===0&&je.text==="["){x=Ce;break}fe--}}}}if(x<0)continue;let S=0;{let fe=0;for(let Ce=x+1;Ce<E;Ce++){const je=i[Ce];if(je){if(je.kind==="open"){fe++;continue}if(je.kind==="close"){fe--;continue}fe===0&&je.kind==="punct"&&je.text===","&&S++}}}const q=i[x].matchedAt;if(q===void 0)continue;let P=v(i,q+1);for(;((_c=i[P])==null?void 0:_c.kind)==="close"&&((qc=i[P])==null?void 0:qc.text)===")";)P=v(i,P+1);const j=i[P];if(!j||j.kind!=="punct"||j.text!==".")continue;const N=v(i,P+1),C=i[N];if(!C||C.kind!=="ident"||C.text!=="at")continue;const $=v(i,N+1),Y=i[$];if(!Y||!(Y.kind==="open"&&Y.text==="("))continue;const O=v(i,$+1),U=i[O];if(!U||U.kind!=="number")continue;const B=parseInt(U.text,10);if(isNaN(B)||B<0||B!==S)continue;const G=v(i,O+1),ne=i[G];if(!ne||!(ne.kind==="close"&&ne.text===")"))continue;const X=v(i,G+1),ae=i[X];if(!(ae&&(ae.kind==="open"&&ae.text==="("||ae.kind==="questionDot"))||me(p.start,he))continue;const Ne=V(e,p.start);o.push({code:"SYN070",severity:"warning",file:null,line:Ne.line,column:Ne.column,start:p.start,end:ne.end,message:`fn '${_.name}' stores ${p.text} at index ${S} of an inline array then calls it via [${p.text}].at(${S})(...) — SYN004/SYN007/… only fire when ${p.text} is in call position (followed by '('); SYN069 closes the [N] bracket form but .at(N) is the modern equivalent and bypasses it; alias-binding checks (SYN044–SYN068) only track binding declarations, not inline array elements; the runtime effect is identical to calling ${p.text}(...) directly; refactor to call ${p.text} directly or wrap in unsafe "reason" { [${p.text}].at(${S})(...) }`,rule:Us.rule,idiom:Us.idiom,rewrite:Us.rewrite})}for(let E=ge;E<_.tokenEnd;E++){const p=i[E];if(!p||p.kind!=="ident"||!xt.has(p.text))continue;const F=ie(i,E-1),u=i[F],A=!!(u&&u.kind==="open"&&u.text==="["),x=!!(u&&u.kind==="punct"&&u.text===",");if(!A&&!x)continue;let S=-1;{let Ne=0;for(let fe=E-1;fe>=ge;fe--){const Ce=i[fe];if(Ce){if(Ce.kind==="close"){Ne++;continue}if(Ce.kind==="open"){if(Ne===0&&Ce.text==="["){S=fe;break}Ne--}}}}if(S<0)continue;const q=i[S].matchedAt;if(q===void 0)continue;let P=v(i,q+1);for(;((Fc=i[P])==null?void 0:Fc.kind)==="close"&&((Lc=i[P])==null?void 0:Lc.text)===")";)P=v(i,P+1);const j=i[P];if(!j||j.kind!=="punct"||j.text!==".")continue;const N=v(i,P+1),C=i[N];if(!C||C.kind!=="ident"||C.text!=="pop"&&C.text!=="shift")continue;const $=C.text;if($==="pop"){let Ne=!0,fe=0;for(let Ce=E+1;Ce<q;Ce++){const je=i[Ce];if(je){if(je.kind==="open"){fe++;continue}if(je.kind==="close"){fe--;continue}if(fe===0&&je.kind==="punct"&&je.text===","){Ne=!1;break}}}if(!Ne)continue}else if(!A)continue;const Y=v(i,N+1),O=i[Y];if(!O||!(O.kind==="open"&&O.text==="("))continue;const U=O.matchedAt;if(U===void 0||v(i,Y+1)!==U)continue;const G=v(i,U+1),ne=i[G];if(!(ne&&(ne.kind==="open"&&ne.text==="("||ne.kind==="questionDot"))||me(p.start,he))continue;const ae=V(e,p.start),oe=$==="pop"?"last":"first";o.push({code:"SYN071",severity:"warning",file:null,line:ae.line,column:ae.column,start:p.start,end:i[U].end,message:`fn '${_.name}' stores ${p.text} as the ${oe} element of an inline array then calls it via [${p.text}].${$}()(...) — SYN004/SYN007/… only fire when ${p.text} is in call position (followed by '('); SYN069 closes [N] bracket form and SYN070 closes .at(N), but .${$}() is a zero-argument mutation method that returns the ${oe} element and bypasses both; alias-binding checks (SYN044–SYN068) only track binding declarations, not inline array elements; the runtime effect is identical to calling ${p.text}(...) directly; refactor to call ${p.text} directly or wrap in unsafe "reason" { [${p.text}].${$}()(...) }`,rule:Bs.rule,idiom:Bs.idiom,rewrite:Bs.rewrite})}for(let E=ge;E<_.tokenEnd;E++){const p=i[E];if(!p||p.kind!=="ident"||!xt.has(p.text))continue;const F=ie(i,E-1),u=i[F];if(!(!!(u&&u.kind==="open"&&u.text==="[")||!!(u&&u.kind==="punct"&&u.text===",")))continue;let x=-1;{let ae=0;for(let oe=E-1;oe>=ge;oe--){const Ne=i[oe];if(Ne){if(Ne.kind==="close"){ae++;continue}if(Ne.kind==="open"){if(ae===0&&Ne.text==="["){x=oe;break}ae--}}}}if(x<0)continue;const S=i[x].matchedAt;if(S===void 0)continue;let q=v(i,S+1);for(;((Uc=i[q])==null?void 0:Uc.kind)==="close"&&((Bc=i[q])==null?void 0:Bc.text)===")";)q=v(i,q+1);const P=i[q];if(!P||P.kind!=="punct"||P.text!==".")continue;const j=v(i,q+1),N=i[j];if(!N||N.kind!=="ident"||N.text!=="find"&&N.text!=="findLast")continue;const C=N.text,$=v(i,j+1),Y=i[$];if(!Y||!(Y.kind==="open"&&Y.text==="("))continue;const O=Y.matchedAt;if(O===void 0||v(i,$+1)===O)continue;const B=v(i,O+1),G=i[B];if(!(G&&(G.kind==="open"&&G.text==="("||G.kind==="questionDot"))||me(p.start,he))continue;const X=V(e,p.start);o.push({code:"SYN073",severity:"warning",file:null,line:X.line,column:X.column,start:p.start,end:i[O].end,message:`fn '${_.name}' stores ${p.text} in an inline array then calls it via [${p.text}].${C}(callback)(...) — SYN004/SYN007/… only fire when ${p.text} is in call position (followed by '('); SYN069 closes [N] bracket form, SYN070 closes .at(N), and SYN071 closes .pop()/.shift(), but .${C}() is a higher-order method whose callback predicate can trivially return the dangerous global (e.g. Boolean, x => x) — bypassing all positional checks; alias-binding checks (SYN044–SYN068) only track binding declarations, not inline array elements; the runtime effect is identical to calling ${p.text}(...) directly; refactor to call ${p.text} directly or wrap in unsafe "reason" { [${p.text}].${C}(callback)(...) }`,rule:Ws.rule,idiom:Ws.idiom,rewrite:Ws.rewrite})}for(let E=ge;E<_.tokenEnd;E++){const p=i[E];if(!p||p.kind!=="ident"||!xt.has(p.text))continue;const F=ie(i,E-1),u=i[F];if(!(!!(u&&u.kind==="open"&&u.text==="[")||!!(u&&u.kind==="punct"&&u.text===",")))continue;let x=-1;{let ae=0;for(let oe=E-1;oe>=ge;oe--){const Ne=i[oe];if(Ne){if(Ne.kind==="close"){ae++;continue}if(Ne.kind==="open"){if(ae===0&&Ne.text==="["){x=oe;break}ae--}}}}if(x<0)continue;const S=i[x].matchedAt;if(S===void 0)continue;let q=v(i,S+1);for(;((zc=i[q])==null?void 0:zc.kind)==="close"&&((Wc=i[q])==null?void 0:Wc.text)===")";)q=v(i,q+1);const P=i[q];if(!P||P.kind!=="punct"||P.text!==".")continue;const j=v(i,q+1),N=i[j];if(!N||N.kind!=="ident"||N.text!=="reduce"&&N.text!=="reduceRight")continue;const C=N.text,$=v(i,j+1),Y=i[$];if(!Y||!(Y.kind==="open"&&Y.text==="("))continue;const O=Y.matchedAt;if(O===void 0||v(i,$+1)===O)continue;const B=v(i,O+1),G=i[B];if(!(G&&(G.kind==="open"&&G.text==="("||G.kind==="questionDot"))||me(p.start,he))continue;const X=V(e,p.start);o.push({code:"SYN074",severity:"warning",file:null,line:X.line,column:X.column,start:p.start,end:i[O].end,message:`fn '${_.name}' stores ${p.text} in an inline array then calls it via [${p.text}].${C}(callback)(...) — SYN004/SYN007/… only fire when ${p.text} is in call position (followed by '('); SYN069–SYN073 close prior inline-array bypass forms, but .${C}() is an accumulator method that can return the dangerous global: a single-element array with no initial value returns it without calling the callback, and a pass-through callback ((acc, fn) => fn) extracts it regardless of position; alias-binding checks (SYN044–SYN068) only track binding declarations, not inline array elements; the runtime effect is identical to calling ${p.text}(...) directly; refactor to call ${p.text} directly or wrap in unsafe "reason" { [${p.text}].${C}(callback)(...) }`,rule:Hs.rule,idiom:Hs.idiom,rewrite:Hs.rewrite})}for(let E=ge;E<_.tokenEnd;E++){for(;Be.length>0&&Be[Be.length-1].tokenEnd<=E;)Be.pop();for(;_e<De.length&&De[_e].tokenStart<=E;)Be.push(De[_e]),_e++;if(Be.length>0)continue;const p=i[E];if(!(!p||p.kind!=="ident")){if(Zr.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F];if(u&&(u.kind==="open"&&u.text==="("||u.kind==="questionDot"||u.kind==="template")){const x=ie(i,E-1),S=i[x],q=S&&(S.kind==="punct"&&S.text==="."||S.kind==="questionDot"),P=S&&(S.kind==="keyword"&&S.text==="fn"||S.kind==="ident"&&(S.text==="function"||S.text==="const"||S.text==="let"||S.text==="var"));if(!q&&!P){const j=Zr.get(p.text),N=V(e,p.start),C=u.kind==="template"?`${p.text}\`...\``:`${p.text}()`;o.push({code:"SYN044",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:p.end,message:`fn '${_.name}' calls '${C}' — '${p.text}' is a module-scope alias of the guarded global '${j}'; calling through the alias bypasses SYN004–SYN043 name-token checks; call '${j}' directly so the relevant SYN check fires, or wrap in unsafe "calls ${j} via alias for <reason>" { ${p.text}(...) }`,rule:Je.rule,idiom:Je.idiom,rewrite:Je.rewrite})}}}if(Vs.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F];if(u&&(u.kind==="open"&&u.text==="("||u.kind==="questionDot"||u.kind==="template")){const x=ie(i,E-1),S=i[x],q=S&&(S.kind==="punct"&&S.text==="."||S.kind==="questionDot"),P=S&&(S.kind==="keyword"&&S.text==="fn"||S.kind==="ident"&&(S.text==="function"||S.text==="const"||S.text==="let"||S.text==="var"));if(!q&&!P){const j=Vs.get(p.text),N=V(e,p.start),C=u.kind==="template"?`${p.text}\`...\``:`${p.text}()`;o.push({code:"SYN046",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:p.end,message:`fn '${_.name}' calls '${C}' — '${p.text}' is a module-scope destructuring rename of the guarded global '${j.original}' (via '${j.receiver}'); calling through the renamed alias bypasses SYN004–SYN045 name-token checks; call '${j.original}' or '${j.receiver}.${j.original}' directly so the relevant SYN check fires, or wrap in unsafe "calls ${j.original} via destructuring rename for <reason>" { ${p.text}(...) }`,rule:Gn.rule,idiom:Gn.idiom,rewrite:Gn.rewrite})}}}if(Gs.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F];if(u&&(u.kind==="open"&&u.text==="("||u.kind==="questionDot"||u.kind==="template")){const x=ie(i,E-1),S=i[x],q=S&&(S.kind==="punct"&&S.text==="."||S.kind==="questionDot"),P=S&&(S.kind==="keyword"&&S.text==="fn"||S.kind==="ident"&&(S.text==="function"||S.text==="const"||S.text==="let"||S.text==="var"));if(!q&&!P){const j=Gs.get(p.text),N=V(e,p.start),C=u.kind==="template"?`${p.text}\`...\``:`${p.text}()`;o.push({code:"SYN067",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:p.end,message:`fn '${_.name}' calls '${C}' — '${p.text}' is a module-scope array-destructuring alias of the guarded global '${j}'; calling through the alias bypasses SYN004–SYN066 name-token checks; call '${j}' directly so the relevant SYN check fires, or wrap in unsafe "calls ${j} via array-destructure alias for <reason>" { ${p.text}(...) }`,rule:qs.rule,idiom:qs.idiom,rewrite:qs.rewrite})}}}if(Se!=null&&Se.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F];if(u&&(u.kind==="open"&&u.text==="("||u.kind==="questionDot"||u.kind==="template")){const x=ie(i,E-1),S=i[x],q=S&&(S.kind==="punct"&&S.text==="."||S.kind==="questionDot"),P=S&&(S.kind==="keyword"&&S.text==="fn"||S.kind==="ident"&&(S.text==="function"||S.text==="const"||S.text==="let"||S.text==="var"));if(!q&&!P){const j=Se.get(p.text),N=V(e,p.start),C=u.kind==="template"?`${p.text}\`...\``:`${p.text}()`;o.push({code:"SYN068",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:p.end,message:`fn '${_.name}' calls '${C}' — '${p.text}' is a fn-body-local array-destructuring alias of the guarded global '${j}'; calling through the alias bypasses SYN004–SYN067 name-token checks; call '${j}' directly so the relevant SYN check fires, or wrap in unsafe "calls ${j} via local array-destructure alias for <reason>" { ${p.text}(...) }`,rule:Fs.rule,idiom:Fs.idiom,rewrite:Fs.rewrite})}}}if(Qs.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F];if(u&&(u.kind==="open"&&u.text==="("||u.kind==="questionDot"||u.kind==="template")){const x=ie(i,E-1),S=i[x],q=S&&(S.kind==="punct"&&S.text==="."||S.kind==="questionDot"),P=S&&(S.kind==="keyword"&&S.text==="fn"||S.kind==="ident"&&(S.text==="function"||S.text==="const"||S.text==="let"||S.text==="var"));if(!q&&!P){const j=Qs.get(p.text),N=V(e,p.start),C=u.kind==="template"?`${p.text}\`...\``:`${p.text}()`;o.push({code:"SYN051",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:p.end,message:`fn '${_.name}' calls '${C}' — '${p.text}' is a module-scope assignment alias of the guarded global '${j}' (set via assignment expression, not a declaration); calling through the alias bypasses SYN004–SYN050 name-token checks; call '${j}' directly so the relevant SYN check fires, or wrap in unsafe "calls ${j} via assignment alias for <reason>" { ${p.text}(...) }`,rule:Is.rule,idiom:Is.idiom,rewrite:Is.rewrite})}}}if(ce&&ce.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F];if(u&&(u.kind==="open"&&u.text==="("||u.kind==="questionDot"||u.kind==="template")){const x=ie(i,E-1),S=i[x],q=S&&(S.kind==="punct"&&S.text==="."||S.kind==="questionDot"),P=S&&(S.kind==="keyword"&&S.text==="fn"||S.kind==="ident"&&(S.text==="function"||S.text==="const"||S.text==="let"||S.text==="var"));if(!q&&!P){const j=ce.get(p.text),N=V(e,p.start),C=u.kind==="template"?`${p.text}\`...\``:`${p.text}()`;o.push({code:"SYN048",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:p.end,message:`fn '${_.name}' calls '${C}' — '${p.text}' is a local alias of the guarded global '${j}' defined in this fn body; calling through the alias bypasses SYN004–SYN047 name-token checks; call '${j}' directly so the relevant SYN check fires, or wrap in unsafe "calls ${j} via local alias for <reason>" { ${p.text}(...) }`,rule:$s.rule,idiom:$s.idiom,rewrite:$s.rewrite})}}}if(Pe&&Pe.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F],A=u&&u.kind==="punct"&&u.text===".",x=u&&u.kind==="questionDot";if(A||x){const S=ie(i,E-1),q=i[S];if(!(q&&(q.kind==="punct"&&q.text==="."||q.kind==="questionDot"))){const j=v(i,F+1),N=i[j];if(N&&N.kind==="ident"&&Jt.has(N.text)){const C=Pe.get(p.text),$=x?"?.":".",Y=V(e,p.start);o.push({code:"SYN049",severity:"warning",file:null,line:Y.line,column:Y.column,start:p.start,end:N.end,message:`fn '${_.name}' accesses ${p.text}${$}${N.text} — '${p.text}' is a fn-body-local alias of the global receiver '${C}' defined in this fn body; the alias is not in the SYN041 receiver watch-list, so '${p.text}${$}${N.text}' bypasses SYN041–SYN048; access '${C}${$}${N.text}' directly so SYN041 fires, or wrap in unsafe "uses ${N.text} via aliased ${C} for <reason>" { ${p.text}${$}${N.text} }`,rule:Ys.rule,idiom:Ys.idiom,rewrite:Ys.rewrite})}}}}if(Fe&&Fe.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F];if(u&&(u.kind==="open"&&u.text==="("||u.kind==="questionDot"||u.kind==="template")){const x=ie(i,E-1),S=i[x],q=S&&(S.kind==="punct"&&S.text==="."||S.kind==="questionDot"),P=S&&(S.kind==="keyword"&&S.text==="fn"||S.kind==="ident"&&(S.text==="function"||S.text==="const"||S.text==="let"||S.text==="var"));if(!q&&!P){const j=Fe.get(p.text),N=V(e,p.start),C=u.kind==="template"?`${p.text}\`...\``:`${p.text}()`;o.push({code:"SYN050",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:p.end,message:`fn '${_.name}' calls '${C}' — '${p.text}' is a fn-body-local destructuring rename of '${j.original}' from '${j.receiver}' defined in this fn body; calling through the alias bypasses SYN004–SYN049 name-token checks; call '${j.original}' directly so the relevant SYN check fires, or wrap in unsafe "calls ${j.original} via destructured alias for <reason>" { ${p.text}(...) }`,rule:Cs.rule,idiom:Cs.idiom,rewrite:Cs.rewrite})}}}if(Re&&Re.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F];if(u&&(u.kind==="open"&&u.text==="("||u.kind==="questionDot"||u.kind==="template")){const x=ie(i,E-1),S=i[x],q=S&&(S.kind==="punct"&&S.text==="."||S.kind==="questionDot"),P=S&&(S.kind==="keyword"&&S.text==="fn"||S.kind==="ident"&&(S.text==="function"||S.text==="const"||S.text==="let"||S.text==="var"));if(!q&&!P){const j=Re.get(p.text),N=V(e,p.start),C=u.kind==="template"?`${p.text}\`...\``:`${p.text}()`;o.push({code:"SYN053",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:p.end,message:`fn '${_.name}' calls '${C}' — '${p.text}' is a fn-body assignment alias of the guarded global '${j}' (set via assignment expression inside this fn body, not a declaration); calling through the alias bypasses SYN004–SYN052 name-token checks; call '${j}' directly so the relevant SYN check fires, or wrap in unsafe "calls ${j} via assignment alias for <reason>" { ${p.text}(...) }`,rule:Rs.rule,idiom:Rs.idiom,rewrite:Rs.rewrite})}}}if(Ie&&Ie.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F],A=u&&u.kind==="punct"&&u.text===".",x=u&&u.kind==="questionDot";if(A||x){const S=ie(i,E-1),q=i[S];if(!(q&&(q.kind==="punct"&&q.text==="."||q.kind==="questionDot"))){const j=v(i,F+1),N=i[j];if(N&&N.kind==="ident"&&Jt.has(N.text)){const C=Ie.get(p.text),$=x?"?.":".",Y=V(e,p.start);o.push({code:"SYN054",severity:"warning",file:null,line:Y.line,column:Y.column,start:p.start,end:N.end,message:`fn '${_.name}' accesses ${p.text}${$}${N.text} — '${p.text}' is a fn-body assignment alias of the global receiver '${C}' (set via assignment expression inside this fn body); the alias is not in the SYN041 receiver watch-list, so '${p.text}${$}${N.text}' bypasses SYN041–SYN053; access '${C}${$}${N.text}' directly so SYN041 fires, or wrap in unsafe "uses ${N.text} via aliased ${C} for <reason>" { ${p.text}${$}${N.text} }`,rule:Es.rule,idiom:Es.idiom,rewrite:Es.rewrite})}}}}if(ke&&ke.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F];if(u&&(u.kind==="open"&&u.text==="("||u.kind==="questionDot"||u.kind==="template")){const x=ie(i,E-1),S=i[x],q=S&&(S.kind==="punct"&&S.text==="."||S.kind==="questionDot"),P=S&&(S.kind==="keyword"&&S.text==="fn"||S.kind==="ident"&&(S.text==="function"||S.text==="const"||S.text==="let"||S.text==="var"));if(!q&&!P){const j=ke.get(p.text),N=V(e,p.start),C=u.kind==="template"?`${p.text}\`...\``:`${p.text}()`;o.push({code:"SYN055",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:p.end,message:`fn '${_.name}' calls '${C}' — '${p.text}' is a default-parameter alias of the guarded global '${j}' (bound in the parameter list as \`${p.text} = ${j}\`); calling through the alias bypasses SYN004–SYN054 name-token checks; call '${j}' directly so the relevant SYN check fires, or wrap in unsafe "calls ${j} via default-param alias for <reason>" { ${p.text}(...) }`,rule:js.rule,idiom:js.idiom,rewrite:js.rewrite})}}}if(Le&&Le.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F],A=u&&u.kind==="punct"&&u.text===".",x=u&&u.kind==="questionDot";if(A||x){const S=ie(i,E-1),q=i[S];if(!(q&&(q.kind==="punct"&&q.text==="."||q.kind==="questionDot"))){const j=v(i,F+1),N=i[j];if(N&&N.kind==="ident"&&Jt.has(N.text)){const C=Le.get(p.text),$=x?"?.":".",Y=V(e,p.start);o.push({code:"SYN056",severity:"warning",file:null,line:Y.line,column:Y.column,start:p.start,end:N.end,message:`fn '${_.name}' accesses ${p.text}${$}${N.text} — '${p.text}' is a default-parameter alias of the global receiver '${C}' (bound in the parameter list as \`${p.text} = ${C}\`); the alias is not in the SYN041 receiver watch-list, so '${p.text}${$}${N.text}' bypasses SYN041–SYN055; access '${C}${$}${N.text}' directly so SYN041 fires, or wrap in unsafe "uses ${N.text} via aliased ${C} for <reason>" { ${p.text}${$}${N.text} }`,rule:Ps.rule,idiom:Ps.idiom,rewrite:Ps.rewrite})}}}}if(Zi.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F],A=u&&u.kind==="punct"&&u.text===".",x=u&&u.kind==="questionDot";if(A||x){const S=ie(i,E-1),q=i[S];if(!(q&&(q.kind==="punct"&&q.text==="."||q.kind==="questionDot"))){const j=v(i,F+1),N=i[j];if(N&&N.kind==="ident"&&Jt.has(N.text)){const C=Zi.get(p.text),$=x?"?.":".",Y=V(e,p.start);o.push({code:"SYN045",severity:"warning",file:null,line:Y.line,column:Y.column,start:p.start,end:N.end,message:`fn '${_.name}' accesses ${p.text}${$}${N.text} — '${p.text}' is a module-scope alias of the global receiver '${C}'; the alias name is not in the SYN041 receiver watch-list, so '${p.text}${$}${N.text}' bypasses SYN041–SYN043; access '${C}${$}${N.text}' directly so SYN041 fires, or wrap in unsafe "uses ${N.text} via aliased ${C} for <reason>" { ${p.text}${$}${N.text} }`,rule:rt.rule,idiom:rt.idiom,rewrite:rt.rewrite})}}}}if(Jr.has(p.text)&&!me(p.start,he)){const F=v(i,E+1),u=i[F],A=u&&u.kind==="punct"&&u.text===".",x=u&&u.kind==="questionDot";if(A||x){const S=ie(i,E-1),q=i[S];if(!(q&&(q.kind==="punct"&&q.text==="."||q.kind==="questionDot"))){const j=v(i,F+1),N=i[j];if(N&&N.kind==="ident"&&Jt.has(N.text)){const C=Jr.get(p.text),$=x?"?.":".",Y=V(e,p.start);o.push({code:"SYN052",severity:"warning",file:null,line:Y.line,column:Y.column,start:p.start,end:N.end,message:`fn '${_.name}' accesses ${p.text}${$}${N.text} — '${p.text}' is a module-scope assignment alias of the global receiver '${C}' (set via assignment expression, not a declaration); '${p.text}${$}${N.text}' bypasses SYN041–SYN051; access '${C}${$}${N.text}' directly so SYN041 fires, or wrap in unsafe "uses ${N.text} via aliased ${C} for <reason>" { ${p.text}${$}${N.text} }`,rule:As.rule,idiom:As.idiom,rewrite:As.rewrite})}}}}{const F=Zi.get(p.text)??Jr.get(p.text)??(Pe==null?void 0:Pe.get(p.text))??(Ie==null?void 0:Ie.get(p.text))??(Le==null?void 0:Le.get(p.text));if(F!==void 0&&!me(p.start,he)){const u=ie(i,E-1),A=i[u];if(!(A&&(A.kind==="punct"&&A.text==="."||A.kind==="questionDot"))){const S=v(i,E+1),q=i[S];if(q&&q.kind==="open"&&q.text==="["){const P=v(i,S+1),j=i[P];if(j&&j.kind==="string"){const N=j.text.slice(1,-1);if(Jt.has(N)){const C=V(e,p.start);o.push({code:"SYN065",severity:"warning",file:null,line:C.line,column:C.column,start:p.start,end:j.end,message:`fn '${_.name}' accesses ${p.text}['${N}'] — '${p.text}' is an alias of the global receiver '${F}'; the alias name bypasses SYN041's receiver watch-list and the string literal bypasses SYN043's string-bracket check on direct receivers; use ${F}.${N} directly so SYN041 fires, or wrap in unsafe "uses ${N} via aliased ${F} for <reason>" { ${p.text}['${N}'] }`,rule:wi.rule,idiom:wi.idiom,rewrite:wi.rewrite})}}else if(j&&j.kind!=="number"){const N=V(e,p.start);o.push({code:"SYN065",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:j.end,message:`fn '${_.name}' accesses ${p.text}[<dynamic key>] — '${p.text}' is an alias of the global receiver '${F}'; the alias bypasses SYN041's receiver watch-list and the dynamic key bypasses SYN064's non-literal bracket check on direct receivers; any member could be a SYN-guarded global (fetch, eval, WebSocket, …); use dot-notation on the direct receiver so SYN041 fires, or wrap in unsafe "reason" { ${p.text}[key] }`,rule:wi.rule,idiom:wi.idiom,rewrite:wi.rewrite})}}}}}switch(p.text){case"throw":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&(u.text==="get"||u.text==="set"))continue;const A=v(i,E+1),x=i[A];if(x&&x.kind==="punct"&&x.text===":"||x&&x.kind==="eq")continue;if(x&&x.kind==="operator"&&x.text==="!"){const j=v(i,A+1),N=i[j];if(N&&(N.kind==="punct"&&N.text===":"||N.kind==="eq"))continue}if(x&&x.kind==="question")continue;let S=A,q=x;if(x&&x.kind==="operator"&&x.text==="<"){let j=1,N=A+1;for(;N<i.length&&j>0;){const Y=i[N];if(!Y)break;Y.kind==="operator"&&Y.text==="<"?j++:Y.kind==="operator"&&(Y.text===">"||Y.text===">>"||Y.text===">>>")&&(j-=Y.text.length),N++}const C=v(i,N),$=i[C];$&&$.kind==="open"&&$.text==="("&&(S=C,q=$)}if(q&&q.kind==="open"&&q.text==="("){const j=q.matchedAt;if(j!==void 0){if(v(i,S+1)===j)continue;const C=v(i,j+1),$=i[C];if($&&($.kind==="open"&&$.text==="{"||$.kind==="fatArrow"||$.kind==="punct"&&$.text===":"))continue}}if(me(p.start,he))continue;const P=V(e,p.start);o.push({code:"SYN002",severity:"warning",file:null,line:P.line,column:P.column,start:p.start,end:p.end,message:`fn '${_.name}' contains a native throw statement — callers using ? unwrap or match on Result will not observe this error; use return err(new ErrorType(...)) instead`,rule:s.rule,idiom:s.idiom,rewrite:s.rewrite});break}case"console":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot"))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P)continue;const j=v(i,A+1),N=i[j];if(!N||N.kind!=="ident"||!I0.has(N.text))continue;let C=v(i,j+1),$=i[C],Y=!1;if($&&$.kind==="questionDot"&&(Y=!0,C=v(i,C+1),$=i[C]),!$||!($.kind==="open"&&$.text==="(")||me(p.start,he))continue;const O=P?"?.":".",U=Y?"?.":"",B=V(e,p.start);o.push({code:"SYN003",severity:"warning",file:null,line:B.line,column:B.column,start:p.start,end:N.end,message:`fn '${_.name}' calls console${O}${N.text}${U}() — direct console output bypasses the stdout/stderr capability model; use stdout.write(...) or stderr.write(...) and declare uses { stdout } or uses { stderr }`,rule:a.rule,idiom:a.idiom,rewrite:a.rewrite});break}case"eval":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot"))continue;{const C=v(i,E+1),$=i[C],Y=$&&$.kind==="punct"&&$.text===".",O=$&&$.kind==="questionDot";if(Y||O){const U=v(i,C+1),B=i[U];if(B&&B.kind==="ident"&&B.text==="constructor"){const G=v(i,U+1),ne=i[G];if(ne&&ne.kind==="open"&&ne.text==="("&&!me(p.start,he)){const X=O?"?.":".",ae=V(e,p.start);o.push({code:"SYN058",severity:"warning",file:null,line:ae.line,column:ae.column,start:p.start,end:ne.start+1,message:`fn '${_.name}' calls eval${X}constructor(...) — eval.constructor is the Function constructor; this creates a new function from a string and bypasses SYN004 call-detection; refactor to explicit code or wrap in unsafe "reason" { eval.constructor(...) }`,rule:mi.rule,idiom:mi.idiom,rewrite:mi.rewrite});break}}}}{const C=i[v(i,E+1)],$=C&&C.kind==="punct"&&C.text===".",Y=C&&C.kind==="questionDot";if($||Y){const O=v(i,v(i,E+1)+1),U=i[O];if(U&&U.kind==="ident"&&U.text==="prototype"){const B=v(i,O+1),G=i[B],ne=G&&G.kind==="punct"&&G.text===".",X=G&&G.kind==="questionDot";if(ne||X){const ae=v(i,B+1),oe=i[ae];if(oe&&oe.kind==="ident"&&oe.text==="constructor"){const Ne=v(i,ae+1),fe=i[Ne];if(fe&&fe.kind==="open"&&fe.text==="("&&!me(p.start,he)){const Ce=Y?"?.":".",je=X?"?.":".",Ee=V(e,p.start);o.push({code:"SYN059",severity:"warning",file:null,line:Ee.line,column:Ee.column,start:p.start,end:fe.start+1,message:`fn '${_.name}' calls eval${Ce}prototype${je}constructor(...) — Function.prototype.constructor is the Function constructor; the .prototype hop bypasses SYN058's direct .constructor check; refactor to explicit code or wrap in unsafe "reason" { eval.prototype.constructor(...) }`,rule:gi.rule,idiom:gi.idiom,rewrite:gi.rewrite});break}}}}}}{const C=i[v(i,E+1)];if(C&&C.kind==="template"&&!me(p.start,he)){const $=V(e,p.start);o.push({code:"SYN057",severity:"warning",file:null,line:$.line,column:$.column,start:p.start,end:C.end,message:`fn '${_.name}' uses eval as a tagged-template tag — eval\`code\` executes the template string as code, bypassing SYN004's call-syntax detection; refactor to explicit code or wrap in unsafe "reason" { eval(\`...\`) }`,rule:hi.rule,idiom:hi.idiom,rewrite:hi.rewrite});break}}const A=v(i,E+1),x=i[A];let S=!1,q=A;if(x&&x.kind==="questionDot")S=!0,q=v(i,A+1);else if(x&&x.kind==="operator"&&x.text==="<"){let C=1,$=A+1;for(;$<i.length&&C>0;){const U=i[$];if(!U)break;U.kind==="operator"&&U.text==="<"?C++:U.kind==="operator"&&(U.text===">"||U.text===">>"||U.text===">>>")&&(C-=U.text.length),$++}const Y=v(i,$),O=i[Y];O&&O.kind==="open"&&O.text==="("&&(q=Y)}let P=i[q];if(!P||!(P.kind==="open"&&P.text==="(")){const C=vt(i,E);if(C===null)continue;q=C,P=i[q]}if(P.matchedAt!==void 0){const C=v(i,P.matchedAt+1),$=i[C],Y=u&&u.kind==="question";if($&&($.kind==="open"&&$.text==="{"||$.kind==="fatArrow"||!Y&&$.kind==="punct"&&$.text===":"))continue}if(me(p.start,he))continue;const j=S?"?.":"",N=V(e,p.start);o.push({code:"SYN004",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:P.start+1,message:`fn '${_.name}' calls eval${j}() — eval executes a string as code and bypasses all static capability, resource, and safety checks; refactor to explicit code or wrap in unsafe "reason" { eval(src) }`,rule:l.rule,idiom:l.idiom,rewrite:l.rewrite});break}case"Function":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot"))continue;{const Y=v(i,E+1),O=i[Y],U=O&&O.kind==="punct"&&O.text===".",B=O&&O.kind==="questionDot";if(U||B){const G=v(i,Y+1),ne=i[G];if(ne&&ne.kind==="ident"&&ne.text==="constructor"){const X=v(i,G+1),ae=i[X];if(ae&&ae.kind==="open"&&ae.text==="("&&!me(p.start,he)){const oe=B?"?.":".",Ne=V(e,p.start);o.push({code:"SYN058",severity:"warning",file:null,line:Ne.line,column:Ne.column,start:p.start,end:ae.start+1,message:`fn '${_.name}' calls Function${oe}constructor(...) — Function.constructor is the Function constructor; this creates a new function from a string and bypasses SYN004 call-detection; refactor to explicit code or wrap in unsafe "reason" { Function.constructor(...) }`,rule:mi.rule,idiom:mi.idiom,rewrite:mi.rewrite});break}}}}{const Y=i[v(i,E+1)],O=Y&&Y.kind==="punct"&&Y.text===".",U=Y&&Y.kind==="questionDot";if(O||U){const B=v(i,v(i,E+1)+1),G=i[B];if(G&&G.kind==="ident"&&G.text==="prototype"){const ne=v(i,B+1),X=i[ne],ae=X&&X.kind==="punct"&&X.text===".",oe=X&&X.kind==="questionDot";if(ae||oe){const Ne=v(i,ne+1),fe=i[Ne];if(fe&&fe.kind==="ident"&&fe.text==="constructor"){const Ce=v(i,Ne+1),je=i[Ce];if(je&&je.kind==="open"&&je.text==="("&&!me(p.start,he)){const Ee=U?"?.":".",ft=oe?"?.":".",yt=V(e,p.start);o.push({code:"SYN059",severity:"warning",file:null,line:yt.line,column:yt.column,start:p.start,end:je.start+1,message:`fn '${_.name}' calls Function${Ee}prototype${ft}constructor(...) — Function.prototype.constructor is the Function constructor; the .prototype hop bypasses SYN058's direct .constructor check; refactor to explicit code or wrap in unsafe "reason" { Function.prototype.constructor(...) }`,rule:gi.rule,idiom:gi.idiom,rewrite:gi.rewrite});break}}}}}}{const Y=i[v(i,E+1)];if(Y&&Y.kind==="template"&&!me(p.start,he)){const O=V(e,p.start);o.push({code:"SYN057",severity:"warning",file:null,line:O.line,column:O.column,start:p.start,end:Y.end,message:`fn '${_.name}' uses Function as a tagged-template tag — Function\`body\` constructs and returns a new function from the template string, bypassing SYN004's call-syntax detection; refactor to explicit code or wrap in unsafe "reason" { Function(\`...\`) }`,rule:hi.rule,idiom:hi.idiom,rewrite:hi.rewrite});break}}const A=v(i,E+1),x=i[A];let S=!1,q=A;if(x&&x.kind==="questionDot")S=!0,q=v(i,A+1);else if(x&&x.kind==="operator"&&x.text==="<"){let Y=1,O=A+1;for(;O<i.length&&Y>0;){const G=i[O];if(!G)break;G.kind==="operator"&&G.text==="<"?Y++:G.kind==="operator"&&(G.text===">"||G.text===">>"||G.text===">>>")&&(Y-=G.text.length),O++}const U=v(i,O),B=i[U];B&&B.kind==="open"&&B.text==="("&&(q=U)}let P=i[q];if(!P||!(P.kind==="open"&&P.text==="(")){const Y=vt(i,E);if(Y===null)continue;q=Y,P=i[q]}if(P.matchedAt!==void 0){const Y=v(i,P.matchedAt+1),O=i[Y],U=u&&u.kind==="ident"&&u.text==="new"?i[ie(i,F-1)]:void 0,B=u&&u.kind==="question"||U!=null&&U.kind==="question";if(O&&(O.kind==="open"&&O.text==="{"||O.kind==="fatArrow"||!B&&O.kind==="punct"&&O.text===":"))continue}if(me(p.start,he))continue;const j=u&&u.kind==="ident"&&u.text==="new",N=S?"?.":"",C=j?u.start:p.start,$=V(e,C);o.push({code:"SYN004",severity:"warning",file:null,line:$.line,column:$.column,start:C,end:P.start+1,message:`fn '${_.name}' constructs ${j?"new ":""}Function${N}() — the Function constructor executes a string as code and bypasses all static checks; refactor to explicit code or wrap in unsafe "reason" { ${j?"new Function(body)":"Function(body)"} }`,rule:l.rule,idiom:l.idiom,rewrite:l.rewrite});break}case"process":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot"))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P&&x&&x.kind==="open"&&x.text==="["){const Y=v(i,A+1),O=i[Y];if(O&&O.kind==="string"){const B=O.text.slice(1,-1);if((B==="env"||B==="exit"||pd.has(B))&&!me(p.start,he)){const ne=V(e,p.start);o.push({code:"SYN063",severity:"warning",file:null,line:ne.line,column:ne.column,start:p.start,end:O.end,message:`fn '${_.name}' accesses process['${B}'] via computed bracket notation — the string literal hides the dangerous member name from SYN005/SYN006/SYN022 token-level detection; the capability bypass is identical to process.${B} at runtime; use the dot-notation form so the check fires, pass config as explicit parameters, or wrap in unsafe "reason" { process['${B}'] }`,rule:Ms.rule,idiom:Ms.idiom,rewrite:Ms.rewrite})}}else if(O&&O.kind!=="number"&&!me(p.start,he)){const U=V(e,p.start);o.push({code:"SYN064",severity:"warning",file:null,line:U.line,column:U.column,start:p.start,end:O.end,message:`fn '${_.name}' accesses process[<dynamic key>] — the bracket key is not a string literal, so the member name cannot be resolved at compile time; any member could be dangerous (env, exit, argv, …); use dot-notation so the relevant SYN005/SYN006/SYN022 check fires, or wrap in unsafe "reason" { process[key] }`,rule:hn.rule,idiom:hn.idiom,rewrite:hn.rewrite})}continue}if(!q&&!P)continue;const N=v(i,A+1),C=i[N];if(!C||C.kind!=="ident")continue;const $=P?"?.":".";if(C.text==="env"){if(me(C.start,he))continue;const Y=V(e,p.start);o.push({code:"SYN005",severity:"warning",file:null,line:Y.line,column:Y.column,start:p.start,end:C.end,message:`fn '${_.name}' accesses process${$}env — env-var access is invisible to callers; pass config and secrets as explicit parameters, or wrap in unsafe "reads deployment env" { process.env.KEY }`,rule:c.rule,idiom:c.idiom,rewrite:c.rewrite})}else if(C.text==="exit"){let Y=v(i,N+1),O=i[Y],U=!1;if(O&&O.kind==="questionDot"&&(U=!0,Y=v(i,Y+1),O=i[Y]),!O||!(O.kind==="open"&&O.text==="(")||me(C.start,he))continue;const B=U?"?.":"",G=V(e,p.start);o.push({code:"SYN006",severity:"warning",file:null,line:G.line,column:G.column,start:p.start,end:C.end,message:`fn '${_.name}' calls process${$}exit${B}() — process.exit terminates the entire host process; callers cannot catch it, no Result propagation runs; return err(...) instead or wrap in unsafe "exits on invalid config" { process.exit(1) }`,rule:d.rule,idiom:d.idiom,rewrite:d.rewrite})}else if(pd.has(C.text)){if(me(C.start,he))continue;const Y=V(e,p.start),O=v(i,N+1),U=i[O];let B=!1,G=!1;if(U&&U.kind==="open"&&U.text==="(")B=!0;else if(U&&U.kind==="questionDot"){const ae=i[v(i,O+1)];ae&&ae.kind==="open"&&ae.text==="("&&(B=!0,G=!0)}const ne=B?G?"?.()":"()":"",X=`process${$}${C.text}${ne}`;o.push({code:"SYN022",severity:"warning",file:null,line:Y.line,column:Y.column,start:p.start,end:C.end,message:`fn '${_.name}' accesses ${X} — ambient Node.js process state invisible to the capability model; pass the value as an explicit parameter (preferred) or wrap in unsafe "accesses process.${C.text} for <reason>" { ${X} }`,rule:W.rule,idiom:W.idiom,rewrite:W.rewrite})}break}case"fetch":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;const A=v(i,E+1),x=i[A];let S=A,q=!1;x&&x.kind==="questionDot"&&(q=!0,S=v(i,A+1));let P=i[S];if(!P||!(P.kind==="open"&&P.text==="(")){const Y=vt(i,E);if(Y===null)continue;S=Y,P=i[S]}const j=u&&u.kind==="ident"&&u.text==="await"?i[ie(i,F-1)]:void 0,N=u!=null&&u.kind==="question"||j!=null&&j.kind==="question";if(P.matchedAt!==void 0){const Y=v(i,P.matchedAt+1),O=i[Y];if(O&&(O.kind==="open"&&O.text==="{"||O.kind==="fatArrow"||!N&&O.kind==="punct"&&O.text===":"))continue}if(me(p.start,he))continue;const C=q?"?.":"",$=V(e,p.start);o.push({code:"SYN007",severity:"warning",file:null,line:$.line,column:$.column,start:p.start,end:P.start+1,message:`fn '${_.name}' calls fetch${C}() — fetch makes an HTTP request invisible to the capability model; replace with http.get(url)/http.post(url, { body }) and add uses { net }, or wrap in unsafe "calls fetch directly" { fetch(url) }`,rule:f.rule,idiom:f.idiom,rewrite:f.rewrite});break}case"WebSocket":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;const A=u&&u.kind==="ident"&&u.text==="new",x=A?i[ie(i,F-1)]:void 0,S=u!=null&&u.kind==="question"||x!=null&&x.kind==="question",q=v(i,E+1),P=i[q];let j=!1,N=q;if(P&&P.kind==="questionDot")j=!0,N=v(i,q+1);else if(A&&P&&P.kind==="operator"&&P.text==="<"){let U=1,B=q+1;for(;B<i.length&&U>0;){const G=i[B];if(!G)break;G.kind==="operator"&&G.text==="<"?U++:G.kind==="operator"&&(G.text===">"||G.text===">>"||G.text===">>>")&&(U=Math.max(0,U-G.text.length)),B++}N=v(i,B)}let C=i[N];if(!C||!(C.kind==="open"&&C.text==="(")){const U=vt(i,E);if(U===null)continue;N=U,C=i[N]}if(C.matchedAt!==void 0){const U=v(i,C.matchedAt+1),B=i[U];if(B&&(B.kind==="open"&&B.text==="{"||B.kind==="fatArrow"||!S&&B.kind==="punct"&&B.text===":"))continue}if(me(p.start,he))continue;const $=j?"?.":"",Y=A?u.start:p.start,O=V(e,Y);o.push({code:"SYN008",severity:"warning",file:null,line:O.line,column:O.column,start:Y,end:C.start+1,message:`fn '${_.name}' ${A?"constructs new ":"calls "}WebSocket${$}() — WebSocket opens a network connection invisible to the capability model; wrap in unsafe "wraps WebSocket for <reason>" { ${A?"new ":""}WebSocket${j?"?.":""}(url) }`,rule:h.rule,idiom:h.idiom,rewrite:h.rewrite});break}case"XMLHttpRequest":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;const A=u&&u.kind==="ident"&&u.text==="new",x=A?i[ie(i,F-1)]:void 0,S=u!=null&&u.kind==="question"||x!=null&&x.kind==="question",q=v(i,E+1),P=i[q];if(P&&P.kind==="operator"&&P.text==="<"){let N=1,C=q+1;for(;C<_.tokenEnd&&N>0;){const O=i[C];if(!O){C++;continue}O.kind==="operator"&&O.text==="<"?N++:O.kind==="operator"&&(O.text===">"||O.text===">>"||O.text===">>>")&&(N=Math.max(0,N-O.text.length)),C++}const $=v(i,C),Y=i[$];if(Y&&Y.kind==="open"&&Y.text==="("){if(Y.matchedAt!==void 0){const O=v(i,Y.matchedAt+1),U=i[O];if(U&&(U.kind==="open"&&U.text==="{"||U.kind==="fatArrow"||!S&&U.kind==="punct"&&U.text===":"))continue}}else if(!A)continue}else if(P&&P.kind==="questionDot"){const N=v(i,q+1),C=i[N];if(!C||!(C.kind==="open"&&C.text==="("))continue}else if(P&&P.kind==="open"&&P.text==="("){if(P.matchedAt!==void 0){const N=v(i,P.matchedAt+1),C=i[N];if(C&&(C.kind==="open"&&C.text==="{"||C.kind==="fatArrow"||!S&&C.kind==="punct"&&C.text===":"))continue}}else if(P&&P.kind==="punct"&&P.text==="."||!A&&vt(i,E)===null)continue;if(me(p.start,he))continue;const j=V(e,p.start);o.push({code:"SYN009",severity:"warning",file:null,line:j.line,column:j.column,start:p.start,end:p.end,message:`fn '${_.name}' constructs an XMLHttpRequest — bypasses the net capability model; switch to http.get(url)/http.post(url, { body }) and declare uses { net } on the fn header, or wrap in unsafe "wraps XHR directly" { new XMLHttpRequest() }`,rule:m.rule,idiom:m.idiom,rewrite:m.rewrite});break}case"import":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn")continue;const A=v(i,E+1),x=i[A];if(x&&x.kind==="punct"&&x.text==="."){const $=v(i,A+1),Y=i[$];if(Y&&Y.kind==="ident"&&Y.text==="meta"){const O=v(i,$+1),U=i[O],B=U&&U.kind==="punct"&&U.text===".",G=U&&U.kind==="questionDot";if(B||G){const ne=v(i,O+1),X=i[ne];if(X&&X.kind==="ident"&&X.text==="env"&&!me(p.start,he)){const ae=G?"?.":".",oe=V(e,p.start);o.push({code:"SYN033",severity:"warning",file:null,line:oe.line,column:oe.column,start:p.start,end:X.end,message:`fn '${_.name}' accesses import.meta${ae}env — import.meta.env reads build-time environment variables invisible to callers; pass config values as explicit fn parameters, or wrap in unsafe "reads build-time env" { import.meta.env.KEY }`,rule:ye.rule,idiom:ye.idiom,rewrite:ye.rewrite})}}}continue}let S=!1,q=A;x&&x.kind==="questionDot"&&(S=!0,q=v(i,A+1));const P=i[q];if(!P||!(P.kind==="open"&&P.text==="("))continue;const j=u&&u.kind==="question";if(P.matchedAt!==void 0){const $=v(i,P.matchedAt+1),Y=i[$];if(Y&&(Y.kind==="open"&&Y.text==="{"||Y.kind==="fatArrow"||!j&&Y.kind==="punct"&&Y.text===":"))continue}if(me(p.start,he))continue;const N=S?"?.":"",C=V(e,p.start);o.push({code:"SYN011",severity:"warning",file:null,line:C.line,column:C.column,start:p.start,end:P.start+1,message:`fn '${_.name}' calls import${N}() — dynamic imports load a module at runtime whose capability surface is unbounded; wrap in unsafe "loads <module> for <reason>" { import(specifier) }`,rule:b.rule,idiom:b.idiom,rewrite:b.rewrite});break}case"EventSource":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn")continue;if(u&&u.kind==="operator"&&u.text==="*"){const U=ie(i,F-1),B=i[U];if(B&&B.kind==="ident"&&B.text==="function")continue}const A=u&&u.kind==="ident"&&u.text==="new",x=A?i[ie(i,F-1)]:void 0,S=u!=null&&u.kind==="question"||x!=null&&x.kind==="question",q=v(i,E+1),P=i[q];let j=!1,N=q;if(P&&P.kind==="questionDot")j=!0,N=v(i,q+1);else if(A&&P&&P.kind==="operator"&&P.text==="<"){let U=1,B=q+1;for(;B<i.length&&U>0;){const G=i[B];if(!G)break;G.kind==="operator"&&G.text==="<"?U++:G.kind==="operator"&&(G.text===">"||G.text===">>"||G.text===">>>")&&(U=Math.max(0,U-G.text.length)),B++}N=v(i,B)}let C=i[N];if(!C||!(C.kind==="open"&&C.text==="(")){const U=vt(i,E);if(U===null)continue;N=U,C=i[N]}if(C.matchedAt!==void 0){const U=v(i,C.matchedAt+1),B=i[U];if(B&&(B.kind==="open"&&B.text==="{"||B.kind==="fatArrow"||!S&&B.kind==="punct"&&B.text===":"))continue;let G=!1,ne=0,X=0;for(let ae=N+1;ae<C.matchedAt;ae++){const oe=i[ae];if(oe){if(oe.kind==="open"){ne++;continue}if(oe.kind==="close"){ne--;continue}if(ne===0){if(oe.kind==="question"){const Ne=v(i,ae+1),fe=i[Ne];if(fe&&fe.kind==="punct"&&fe.text===":"){G=!0;break}X++;continue}if(oe.kind==="punct"&&oe.text===":"){if(X>0){X--;continue}G=!0;break}}}}if(G)continue}if(me(p.start,he))continue;const $=j?"?.":"",Y=A?u.start:p.start,O=V(e,Y);o.push({code:"SYN012",severity:"warning",file:null,line:O.line,column:O.column,start:Y,end:C.start+1,message:`fn '${_.name}' ${A?"constructs new ":"calls "}EventSource${$}() — EventSource opens a server-sent-events connection invisible to the capability model; wrap in unsafe "wraps EventSource for <reason>" { ${A?"new ":""}EventSource${j?"?.":""}(url) }`,rule:T.rule,idiom:T.idiom,rewrite:T.rewrite});break}case"Worker":case"SharedWorker":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn")continue;if(u&&u.kind==="operator"&&u.text==="*"){const U=ie(i,F-1),B=i[U];if(B&&B.kind==="ident"&&B.text==="function")continue}const A=u&&u.kind==="ident"&&u.text==="new",x=A?i[ie(i,F-1)]:void 0,S=u!=null&&u.kind==="question"||x!=null&&x.kind==="question",q=v(i,E+1),P=i[q];let j=!1,N=q;if(P&&P.kind==="questionDot")j=!0,N=v(i,q+1);else if(A&&P&&P.kind==="operator"&&P.text==="<"){let U=1,B=q+1;for(;B<i.length&&U>0;){const G=i[B];if(!G)break;G.kind==="operator"&&G.text==="<"?U++:G.kind==="operator"&&(G.text===">"||G.text===">>"||G.text===">>>")&&(U=Math.max(0,U-G.text.length)),B++}N=v(i,B)}let C=i[N];if(!C||!(C.kind==="open"&&C.text==="(")){const U=vt(i,E);if(U===null)continue;N=U,C=i[N]}if(C.matchedAt!==void 0){const U=v(i,C.matchedAt+1),B=i[U];if(B&&(B.kind==="open"&&B.text==="{"||B.kind==="fatArrow"||!S&&B.kind==="punct"&&B.text===":"))continue;let G=!1,ne=0,X=0;for(let ae=N+1;ae<C.matchedAt;ae++){const oe=i[ae];if(oe){if(oe.kind==="open"){ne++;continue}if(oe.kind==="close"){ne--;continue}if(ne===0){if(oe.kind==="question"){const Ne=v(i,ae+1),fe=i[Ne];if(fe&&fe.kind==="punct"&&fe.text===":"){G=!0;break}X++;continue}if(oe.kind==="punct"&&oe.text===":"){if(X>0){X--;continue}G=!0;break}}}}if(G)continue}if(me(p.start,he))continue;const $=p.text,Y=A?u.start:p.start,O=V(e,Y);o.push({code:"SYN013",severity:"warning",file:null,line:O.line,column:O.column,start:Y,end:C.start+1,message:`fn '${_.name}' ${A?"constructs new ":"calls "}${$}${j?"?.":""}() — ${$} spawns a new execution context with an unbounded capability surface invisible to the capability model; wrap in unsafe "<reason>" { ${A?"new ":""}${$}${j?"?.":""}(scriptURL) }`,rule:y.rule,idiom:y.idiom,rewrite:y.rewrite});break}case"BroadcastChannel":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;const A=v(i,E+1),x=i[A];let S=A,q=!1;x&&x.kind==="questionDot"&&(q=!0,S=v(i,A+1));let P=S;if(!q&&x&&x.kind==="operator"&&x.text==="<"&&u&&u.kind==="ident"&&u.text==="new"){let G=1,ne=A+1;for(;ne<_.tokenEnd&&G>0;){const X=i[ne];if(!X){ne++;continue}X.kind==="operator"&&X.text==="<"?G++:X.kind==="operator"&&(X.text===">"||X.text===">>"||X.text===">>>")&&(G=Math.max(0,G-X.text.length)),ne++}P=v(i,ne),S=P}let j=i[S];if(!j||!(j.kind==="open"&&j.text==="(")){const B=vt(i,E);if(B===null)continue;S=B,j=i[S]}const N=u&&u.kind==="ident"&&u.text==="new"?i[ie(i,F-1)]:void 0,C=u&&u.kind==="question"||N!=null&&N.kind==="question";if(j.matchedAt!==void 0){const B=v(i,j.matchedAt+1),G=i[B];if(G&&(G.kind==="open"&&G.text==="{"||G.kind==="fatArrow"||!C&&G.kind==="punct"&&G.text===":"))continue;let ne=!1,X=0,ae=0;for(let oe=S+1;oe<j.matchedAt;oe++){const Ne=i[oe];if(Ne){if(Ne.kind==="open"){X++;continue}if(Ne.kind==="close"){X--;continue}if(X===0){if(Ne.kind==="question"){const fe=v(i,oe+1),Ce=i[fe];if(Ce&&Ce.kind==="punct"&&Ce.text===":"){ne=!0;break}ae++;continue}if(Ne.kind==="punct"&&Ne.text===":"){if(ae>0){ae--;continue}ne=!0;break}}}}if(ne)continue}if(me(p.start,he))continue;const $=u&&u.kind==="ident"&&u.text==="new",Y=q?"?.":"",O=$?u.start:p.start,U=V(e,O);o.push({code:"SYN014",severity:"warning",file:null,line:U.line,column:U.column,start:O,end:j.start+1,message:`fn '${_.name}' ${$?"constructs new ":"calls "}BroadcastChannel${Y}() — BroadcastChannel opens a cross-context message channel any same-origin tab or worker can post to, invisible to the capability model; wrap in unsafe "<reason>" { ${$?"new ":""}BroadcastChannel${Y}(name) }`,rule:w.rule,idiom:w.idiom,rewrite:w.rewrite});break}case"localStorage":case"sessionStorage":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn"||u&&u.kind==="ident"&&u.text==="function"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P||me(p.start,he))continue;const j=P?"?.":".",N=V(e,p.start);o.push({code:"SYN015",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:x.end,message:`fn '${_.name}' accesses ${p.text}${j} — ${p.text} is a Web Storage API global invisible to the capability model; no reads {} / writes {} label covers it; pass a storage abstraction as a parameter or wrap in unsafe "accesses ${p.text} for <reason>" { ${p.text}.setItem(key, val) }`,rule:k.rule,idiom:k.idiom,rewrite:k.rewrite});break}case"indexedDB":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn"||u&&u.kind==="ident"&&u.text==="function"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P||me(p.start,he))continue;const j=P?"?.":".",N=V(e,p.start);o.push({code:"SYN016",severity:"warning",file:null,line:N.line,column:N.column,start:p.start,end:x.end,message:`fn '${_.name}' accesses indexedDB${j} — indexedDB is persistent same-origin database storage invisible to the capability model; no reads {} / writes {} label covers it; pass a database handle as a parameter or wrap in unsafe "accesses indexedDB for <reason>" { indexedDB.open(name) }`,rule:R.rule,idiom:R.idiom,rewrite:R.rewrite});break}case"Notification":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;const A=u&&u.kind==="ident"&&u.text==="new",x=A?i[ie(i,F-1)]:void 0,S=!A&&u&&u.kind==="ident"&&u.text==="await"?F:x&&x.kind==="ident"&&x.text==="await"?ie(i,F-1):-1,q=S>=0?i[ie(i,S-1)]:void 0,P=u!=null&&u.kind==="question"||x!=null&&x.kind==="question"||q!=null&&q.kind==="question",j=v(i,E+1),N=i[j];let C=!1,$=j;if(N&&N.kind==="questionDot")C=!0,$=v(i,j+1);else if(A&&N&&N.kind==="operator"&&N.text==="<"){let G=1,ne=j+1;for(;ne<_.tokenEnd&&G>0;){const X=i[ne];if(!X)break;X.kind==="operator"&&X.text==="<"?G++:X.kind==="operator"&&(X.text===">"||X.text===">>"||X.text===">>>")&&(G=Math.max(0,G-X.text.length)),ne++}$=v(i,ne)}let Y=i[$];if(!Y||!(Y.kind==="open"&&Y.text==="(")){const G=vt(i,E);if(G===null)continue;$=G,Y=i[$]}if(Y.matchedAt!==void 0){const G=v(i,Y.matchedAt+1),ne=i[G];if(ne&&(ne.kind==="open"&&ne.text==="{"||ne.kind==="fatArrow"||!P&&ne.kind==="punct"&&ne.text===":"))continue;let X=!1,ae=0,oe=0;for(let Ne=$+1;Ne<Y.matchedAt;Ne++){const fe=i[Ne];if(fe){if(fe.kind==="open"){ae++;continue}if(fe.kind==="close"){ae--;continue}if(ae===0){if(fe.kind==="question"){const Ce=v(i,Ne+1),je=i[Ce];if(je&&je.kind==="punct"&&je.text===":"){X=!0;break}oe++;continue}if(fe.kind==="punct"&&fe.text===":"){if(oe>0){oe--;continue}X=!0;break}}}}if(X)continue;if(v(i,$+1)>=Y.matchedAt){let fe=ne;if(fe&&fe.kind==="punct"&&(fe.text===";"||fe.text===",")){const Ce=v(i,G+1);fe=i[Ce]}if(fe&&fe.kind==="close"&&fe.text==="}"&&fe.matchedAt!==void 0){const Ce=fe.matchedAt,je=ie(i,Ce-1),Ee=i[je];if((v(i,Ce+1)===E||u&&u.kind==="punct"&&(u.text===";"||u.text===","))&&Ee&&(Ee.kind==="eq"||Ee.kind==="punct"&&Ee.text===":"||Ee.kind==="operator"&&(Ee.text==="&"||Ee.text==="|"||Ee.text==="<")||Ee.kind==="punct"&&Ee.text===","||Ee.kind==="ident"&&(Ee.text==="as"||Ee.text==="extends"||Ee.text==="satisfies")))continue}}}if(me(p.start,he))continue;const O=C?"?.":"",U=A?u.start:p.start,B=V(e,U);o.push({code:"SYN017",severity:"warning",file:null,line:B.line,column:B.column,start:U,end:Y.start+1,message:`fn '${_.name}' ${A?"constructs new ":"calls "}Notification${O}() — Notification fires a user-visible browser notification invisible to the capability model; wrap in unsafe "sends browser notification for <reason>" { ${A?"new ":""}Notification${O}(...) }`,rule:M.rule,idiom:M.idiom,rewrite:M.rewrite});break}case"Math":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot"))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P)continue;const j=v(i,A+1),N=i[j];if(!N||N.kind!=="ident"||N.text!=="random")continue;let C=v(i,j+1),$=i[C],Y=!1;if($&&$.kind==="questionDot"&&(Y=!0,C=v(i,C+1),$=i[C]),!$||!($.kind==="open"&&$.text==="(")||me(N.start,he))continue;const O=P?"?.":".",U=Y?"?.":"",B=V(e,p.start);o.push({code:"SYN018",severity:"warning",file:null,line:B.line,column:B.column,start:p.start,end:N.end,message:`fn '${_.name}' calls Math${O}random${U}() — Math.random is invisible to the capability model; use random.next() with uses { random } so tests can control the output, or wrap in unsafe "uses Math.random for <reason>" { Math.random() }`,rule:D.rule,idiom:D.idiom,rewrite:D.rewrite});break}case"crypto":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn"||u&&u.kind==="ident"&&u.text==="function"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P)continue;const j=v(i,A+1),N=i[j];if(!N||N.kind!=="ident"||N.text!=="getRandomValues"&&N.text!=="randomUUID")continue;let C=v(i,j+1),$=i[C],Y=!1;if($&&$.kind==="questionDot"&&(Y=!0,C=v(i,C+1),$=i[C]),!$||!($.kind==="open"&&$.text==="(")||me(p.start,he))continue;const O=P?"?.":".",U=Y?"?.":"",B=N.text,ne=`crypto${O}${B}${U}${B==="getRandomValues"?"(buf)":"()"}`,X=V(e,p.start);o.push({code:"SYN019",severity:"warning",file:null,line:X.line,column:X.column,start:p.start,end:$.start+1,message:`fn '${_.name}' calls ${ne} — crypto.getRandomValues and crypto.randomUUID generate cryptographic randomness invisible to the capability model; uses { random } does not cover the crypto global; use random.next() or random.int() from the random stdlib with uses { random } so callers see the dependency and tests can control the output; for crypto-specific needs (cryptographic randomness, UUIDs) wrap in unsafe "uses crypto for <reason>" { ${ne} }`,rule:I.rule,idiom:I.idiom,rewrite:I.rewrite});break}case"Date":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn"||u&&u.kind==="ident"&&u.text==="function"||Ve(i,F))continue;const A=u&&u.kind==="ident"&&u.text==="new";let x=v(i,E+1),S=i[x];if(!A){const fe=kt(i,E);fe!==null&&(x=fe,S=i[x])}const q=S&&S.kind==="punct"&&S.text===".",P=S&&S.kind==="questionDot";if(q||P){const fe=v(i,x+1),Ce=i[fe];if(!Ce||Ce.kind!=="ident"||Ce.text!=="now"){if(q)continue}else{let je=v(i,fe+1),Ee=i[je],ft=!1;if(Ee&&Ee.kind==="questionDot"&&(ft=!0,je=v(i,je+1),Ee=i[je]),!Ee||!(Ee.kind==="open"&&Ee.text==="(")||me(p.start,he))continue;const yt=P?"?.":".",Ot=ft?"?.":"",pt=V(e,p.start);o.push({code:"SYN020",severity:"warning",file:null,line:pt.line,column:pt.column,start:p.start,end:Ee.start+1,message:`fn '${_.name}' calls Date${yt}now${Ot}() — Date.now() injects the current time invisible to the capability model; pass nowMs as a parameter or use time.now() with uses { time }, or wrap in unsafe "uses current time for <reason>" { Date.now() }`,rule:L.rule,idiom:L.idiom,rewrite:L.rewrite});break}}if(A&&(!S||S.kind!=="open"&&S.kind!=="questionDot"&&!(S.kind==="operator"&&S.text==="<")&&!(S.kind==="punct"&&S.text==="."))){if(me(p.start,he))break;const fe=V(e,u.start);o.push({code:"SYN020",severity:"warning",file:null,line:fe.line,column:fe.column,start:u.start,end:p.end,message:`fn '${_.name}' constructs new Date (no-paren form) — new Date without parentheses is equivalent to new Date() and injects the current time invisible to the capability model; pass nowMs as a parameter (time.now() with uses { time } gives epoch ms, not a Date object), or wrap in unsafe "uses current time for <reason>" { new Date }`,rule:L.rule,idiom:L.idiom,rewrite:L.rewrite});break}let j=x,N=!1;if(S&&S.kind==="questionDot")N=!0,j=v(i,x+1);else if(A&&S&&S.kind==="operator"&&S.text==="<"){let fe=1,Ce=x+1;for(;Ce<_.tokenEnd&&fe>0;){const je=i[Ce];if(!je)break;je.kind==="operator"&&je.text==="<"?fe++:je.kind==="operator"&&(je.text===">"||je.text===">>"||je.text===">>>")&&(fe=Math.max(0,fe-je.text.length)),Ce++}j=v(i,Ce)}const C=i[j];if(!C||!(C.kind==="open"&&C.text==="("))continue;const $=A?ie(i,F-1):-1,Y=$>=0?i[$]:void 0,O=u&&u.kind==="ident"&&u.text==="await"?i[ie(i,F-1)]:void 0,U=Y&&Y.kind==="ident"&&Y.text==="await"?i[ie(i,$-1)]:void 0,B=(u==null?void 0:u.kind)==="question"||(Y==null?void 0:Y.kind)==="question"||(O==null?void 0:O.kind)==="question"||(U==null?void 0:U.kind)==="question";if(C.matchedAt!==void 0){const fe=v(i,C.matchedAt+1),Ce=i[fe];if(Ce&&(Ce.kind==="open"&&Ce.text==="{"||Ce.kind==="fatArrow"||!B&&Ce.kind==="punct"&&Ce.text===":"))continue;let je=!1,Ee=0,ft=0;for(let yt=j+1;yt<C.matchedAt;yt++){const Ot=i[yt];if(Ot){if(Ot.kind==="open"){Ee++;continue}if(Ot.kind==="close"){Ee--;continue}if(Ee===0){if(Ot.kind==="question"){const pt=v(i,yt+1),bi=i[pt];if(bi&&bi.kind==="punct"&&bi.text===":"){je=!0;break}ft++;continue}if(Ot.kind==="punct"&&Ot.text===":"){if(ft>0){ft--;continue}je=!0;break}}}}if(je)continue}const G=v(i,j+1);if(A&&G!==C.matchedAt||me(p.start,he))continue;const ne=A?u.start:p.start,X=V(e,ne),ae=!A&&G!==C.matchedAt,oe=A?"new Date()":N?ae?"Date?.(...)":"Date?.()":ae?"Date(...)":"Date()",Ne=A?"constructs new Date()":N?ae?"calls Date?.(...)":"calls Date?.()":ae?"calls Date(...)":"calls Date()";o.push({code:"SYN020",severity:"warning",file:null,line:X.line,column:X.column,start:ne,end:C.start+1,message:`fn '${_.name}' ${Ne} — ${oe} injects the current time invisible to the capability model; pass nowMs as a parameter (time.now() with uses { time } gives epoch ms, not a Date object), or wrap in unsafe "uses current time for <reason>" { ${oe} }`,rule:L.rule,idiom:L.idiom,rewrite:L.rewrite});break}case"performance":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P)continue;const j=v(i,A+1),N=i[j];if(!N||N.kind!=="ident"||N.text!=="now"&&N.text!=="timeOrigin")continue;if(N.text==="now"){let C=v(i,j+1),$=i[C],Y=!1;if($&&$.kind==="questionDot"&&(Y=!0,C=v(i,C+1),$=i[C]),!$||!($.kind==="open"&&$.text==="(")||me(N.start,he))continue;const O=P?"?.":".",U=Y?"?.":"",B=V(e,p.start);o.push({code:"SYN021",severity:"warning",file:null,line:B.line,column:B.column,start:p.start,end:$.start+1,message:`fn '${_.name}' calls performance${O}now${U}() — performance.now() injects monotonic time (ms since process start) invisible to the capability model; pass nowMs as a parameter (preferred); note: time.now() is wall-clock epoch time and does NOT replace performance.now() for elapsed-time measurement; or wrap in unsafe "uses performance.now for <reason>" { performance.now() }`,rule:z.rule,idiom:z.idiom,rewrite:z.rewrite})}else{const C=v(i,j+1),$=i[C],Y=ie(i,F-1),O=i[Y];if(!(u&&u.kind==="question"||u&&u.kind==="ident"&&u.text==="await"&&(O==null?void 0:O.kind)==="question")&&$&&$.kind==="punct"&&$.text===":"||me(N.start,he))continue;const B=P?"?.":".",G=V(e,p.start);o.push({code:"SYN021",severity:"warning",file:null,line:G.line,column:G.column,start:p.start,end:N.end,message:`fn '${_.name}' reads performance${B}timeOrigin — performance.timeOrigin exposes the epoch of the monotonic clock, invisible to the capability model; pass the origin as a parameter (preferred), or wrap in unsafe "uses performance.timeOrigin for <reason>" { performance.timeOrigin }`,rule:z.rule,idiom:z.idiom,rewrite:z.rewrite})}break}case"navigator":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn"||u&&u.kind==="ident"&&u.text==="function"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P)continue;const j=v(i,A+1),N=i[j];if(!N||N.kind!=="ident"||!R0.has(N.text)||me(p.start,he))continue;const C=P?"?.":".",$=N.text,Y=V(e,p.start);o.push({code:"SYN023",severity:"warning",file:null,line:Y.line,column:Y.column,start:p.start,end:N.end,message:`fn '${_.name}' accesses navigator${C}${$} — navigator.${$} reads ambient browser capability state invisible to the capability model; no uses {} / reads {} / writes {} declaration covers navigator; pass the required value as a parameter so callers can see the dependency and tests can inject a mock, or wrap in unsafe "accesses navigator.${$} for <reason>" { navigator${C}${$} }`,rule:H.rule,idiom:H.idiom,rewrite:H.rewrite});break}case"document":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn"||u&&u.kind==="ident"&&u.text==="function"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P)continue;const j=v(i,A+1),N=i[j];if(!N||N.kind!=="ident")continue;const C=P?"?.":".";if(N.text==="cookie"){if(me(p.start,he))continue;const $=V(e,p.start);o.push({code:"SYN024",severity:"warning",file:null,line:$.line,column:$.column,start:p.start,end:N.end,message:`fn '${_.name}' accesses document${C}cookie — document.cookie is persistent storage that is also transmitted with every matching HTTP request, invisible to the capability model; no reads {} / writes {} label covers it; pass cookies as a parameter or wrap in unsafe "accesses document.cookie for <reason>" { document${C}cookie }`,rule:K.rule,idiom:K.idiom,rewrite:K.rewrite});break}if(N.text==="write"||N.text==="writeln"){let $=v(i,j+1),Y=i[$],O=!1;if(Y&&Y.kind==="questionDot"&&(O=!0,$=v(i,$+1),Y=i[$]),!Y||!(Y.kind==="open"&&Y.text==="("))continue;if(Y.matchedAt!==void 0){const G=v(i,Y.matchedAt+1),ne=i[G];if(ne&&ne.kind==="punct"&&ne.text===":")continue}if(me(p.start,he))continue;const U=`${C}${N.text}${O?"?.":""}`,B=V(e,p.start);o.push({code:"SYN029",severity:"warning",file:null,line:B.line,column:B.column,start:p.start,end:Y.start+1,message:`fn '${_.name}' calls document${U}() — document.write / document.writeln inject raw HTML into the document parse stream and are invisible to botscript's capability model; after page load they clear the entire document before writing; use explicit DOM construction instead, or wrap in unsafe "writes to document for <reason>" { document.${N.text}(html) }`,rule:Z.rule,idiom:Z.idiom,rewrite:Z.rewrite});break}continue}case"requestAnimationFrame":case"requestIdleCallback":{const F=p.text==="requestAnimationFrame",u=F?le:pe,A=ie(i,E-1),x=i[A];if(x&&(x.kind==="punct"&&x.text==="."||x.kind==="questionDot")||x&&x.kind==="ident"&&x.text==="function"||x&&x.kind==="keyword"&&x.text==="fn"||Ve(i,A))continue;let S=v(i,E+1),q=i[S];if(q&&q.kind==="questionDot"&&(S=v(i,S+1),q=i[S]),!q||!(q.kind==="open"&&q.text==="(")){const N=vt(i,E);if(N===null)continue;S=N,q=i[S]}const P=q.matchedAt;if(P!==void 0){const N=i[v(i,P+1)];if(N&&(N.kind==="open"&&N.text==="{"||N.kind==="punct"&&N.text===":"))continue}if(me(p.start,he))continue;const j=V(e,p.start);o.push({code:F?"SYN025":"SYN026",severity:"warning",file:null,line:j.line,column:j.column,start:p.start,end:p.end,message:`fn '${_.name}' calls ${p.text}() — ${p.text} schedules a callback that runs after the fn returns (${F?"before the next repaint":"during a browser idle period"}); any effects inside that callback are invisible to callers and cannot be declared in the fn header; wrap in unsafe "${F?"schedules animation frame callback":"schedules idle callback"}" { ${p.text}(cb) }`,rule:u.rule,idiom:u.idiom,rewrite:u.rewrite});break}case"MutationObserver":case"IntersectionObserver":case"ResizeObserver":case"PerformanceObserver":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;const A=u&&u.kind==="ident"&&u.text==="new",x=v(i,E+1),S=i[x];let q=!1,P=x;if(S&&S.kind==="questionDot")q=!0,P=v(i,x+1);else if(A&&S&&S.kind==="operator"&&S.text==="<"){let Y=1,O=x+1;for(;O<i.length&&Y>0;){const U=i[O];if(!U)break;U.kind==="operator"&&U.text==="<"?Y++:U.kind==="operator"&&(U.text===">"||U.text===">>"||U.text===">>>")&&(Y=Math.max(0,Y-U.text.length)),O++}P=v(i,O)}let j=i[P];if(!j||!(j.kind==="open"&&j.text==="(")){const Y=vt(i,E);if(Y===null)continue;P=Y,j=i[P]}if(j.matchedAt!==void 0){const Y=v(i,j.matchedAt+1),O=i[Y];if(O&&(O.kind==="open"&&O.text==="{"||O.kind==="fatArrow"||O.kind==="punct"&&O.text===":"))continue;let U=!1,B=0,G=0;for(let ne=P+1;ne<j.matchedAt;ne++){const X=i[ne];if(X){if(X.kind==="open"){B++;continue}if(X.kind==="close"){B--;continue}if(B===0){if(X.kind==="question"){const ae=v(i,ne+1),oe=i[ae];if(oe&&oe.kind==="punct"&&oe.text===":"){U=!0;break}G++;continue}if(X.kind==="punct"&&X.text===":"){if(G>0){G--;continue}U=!0;break}}}}if(U)continue}if(me(p.start,he))continue;const N=p.text,C=A?u.start:p.start,$=V(e,C);o.push({code:"SYN027",severity:"warning",file:null,line:$.line,column:$.column,start:C,end:j.start+1,message:`fn '${_.name}' ${A?"constructs new ":"calls "}${N}${q?"?.":""}() — ${N} registers a callback that fires after the fn returns when the browser observes a condition; any effects inside that callback are invisible to callers and cannot be declared in the fn header; wrap in unsafe "observes <target> for <reason>" { ${A?"new ":""}${N}${q?"?.":""}(cb) }`,rule:Ye.rule,idiom:Ye.idiom,rewrite:Ye.rewrite});break}case"Proxy":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;const A=u&&u.kind==="ident"&&u.text==="new",x=v(i,E+1),S=i[x];let q=!1,P=x;if(S&&S.kind==="questionDot")q=!0,P=v(i,x+1);else if(A&&S&&S.kind==="operator"&&S.text==="<"){let $=1,Y=x+1;for(;Y<i.length&&$>0;){const O=i[Y];if(!O)break;O.kind==="operator"&&O.text==="<"?$++:O.kind==="operator"&&(O.text===">"||O.text===">>"||O.text===">>>")&&($=Math.max(0,$-O.text.length)),Y++}P=v(i,Y)}let j=i[P];if(!j||!(j.kind==="open"&&j.text==="(")){const $=vt(i,E);if($===null)continue;P=$,j=i[P]}if(j.matchedAt!==void 0){const $=v(i,j.matchedAt+1),Y=i[$];if(Y&&(Y.kind==="open"&&Y.text==="{"||Y.kind==="fatArrow"||Y.kind==="punct"&&Y.text===":"))continue}if(me(p.start,he))continue;const N=A?u.start:p.start,C=V(e,N);o.push({code:"SYN028",severity:"warning",file:null,line:C.line,column:C.column,start:N,end:j.start+1,message:`fn '${_.name}' ${A?"constructs new ":"calls "}Proxy${q?"?.":""}() — Proxy wraps an object with handler traps that intercept all property access; if the target or handler closes over capability-bearing objects, those capabilities are laundered through the Proxy and become invisible to the fn's declared surface; wrap in unsafe "proxies <target> for <reason>" { ${A?"new ":""}Proxy${q?"?.":""}(target, handler) }`,rule:ve.rule,idiom:ve.idiom,rewrite:ve.rewrite});break}case"FinalizationRegistry":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;const A=u&&u.kind==="ident"&&u.text==="new",x=v(i,E+1),S=i[x];let q=!1,P=x;if(S&&S.kind==="questionDot")q=!0,P=v(i,x+1);else if(A&&S&&S.kind==="operator"&&S.text==="<"){let $=1,Y=x+1;for(;Y<i.length&&$>0;){const O=i[Y];if(!O)break;O.kind==="operator"&&O.text==="<"?$++:O.kind==="operator"&&(O.text===">"||O.text===">>"||O.text===">>>")&&($=Math.max(0,$-O.text.length)),Y++}P=v(i,Y)}let j=i[P];if(!j||!(j.kind==="open"&&j.text==="(")){const $=vt(i,E);if($===null)continue;P=$,j=i[P]}if(j.matchedAt!==void 0){const $=v(i,j.matchedAt+1),Y=i[$];if(Y&&(Y.kind==="open"&&Y.text==="{"||Y.kind==="fatArrow"||Y.kind==="punct"&&Y.text===":"))continue}if(me(p.start,he))continue;const N=A?u.start:p.start,C=V(e,N);o.push({code:"SYN030",severity:"warning",file:null,line:C.line,column:C.column,start:N,end:j.start+1,message:`fn '${_.name}' ${A?"constructs new ":"calls "}FinalizationRegistry${q?"?.":""}() — FinalizationRegistry registers a cleanup callback that fires when a target is garbage-collected; GC timing is non-deterministic and implementation-specific — any effects inside the callback are invisible to callers and cannot be declared in the fn header; wrap in unsafe "registers GC callback for <reason>" { ${A?"new ":""}FinalizationRegistry${q?"?.":""}(cb) }`,rule:te.rule,idiom:te.idiom,rewrite:te.rewrite});break}case"MessageChannel":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;const A=u&&u.kind==="ident"&&u.text==="new",x=v(i,E+1),S=i[x];let q=!1,P=x;if(S&&S.kind==="questionDot")q=!0,P=v(i,x+1);else if(A&&S&&S.kind==="operator"&&S.text==="<"){let $=1,Y=x+1;for(;Y<i.length&&$>0;){const O=i[Y];if(!O)break;O.kind==="operator"&&O.text==="<"?$++:O.kind==="operator"&&(O.text===">"||O.text===">>"||O.text===">>>")&&($=Math.max(0,$-O.text.length)),Y++}P=v(i,Y)}let j=i[P];if(!j||!(j.kind==="open"&&j.text==="(")){const $=vt(i,E);if($===null)continue;P=$,j=i[P]}if(j.matchedAt!==void 0){const $=v(i,j.matchedAt+1),Y=i[$];if(Y&&(Y.kind==="open"&&Y.text==="{"||Y.kind==="fatArrow"||Y.kind==="punct"&&Y.text===":"))continue}if(me(p.start,he))continue;const N=A?u.start:p.start,C=V(e,N);o.push({code:"SYN031",severity:"warning",file:null,line:C.line,column:C.column,start:N,end:j.start+1,message:`fn '${_.name}' ${A?"constructs new ":"calls "}MessageChannel${q?"?.":""}() — MessageChannel creates two paired MessagePort objects; messages sent via port.postMessage() are delivered asynchronously to the other port's .onmessage handler after the fn returns — any handler effects are invisible to callers and cannot be declared in the fn header; wrap in unsafe "creates message channel for <reason>" { ${A?"new ":""}MessageChannel${q?"?.":""}() }`,rule:se.rule,idiom:se.idiom,rewrite:se.rewrite});break}case"RTCPeerConnection":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;const A=u&&u.kind==="ident"&&u.text==="new",x=v(i,E+1),S=i[x];let q=!1,P=x;if(S&&S.kind==="questionDot")q=!0,P=v(i,x+1);else if(A&&S&&S.kind==="operator"&&S.text==="<"){let $=1,Y=x+1;for(;Y<i.length&&$>0;){const O=i[Y];if(!O)break;O.kind==="operator"&&O.text==="<"?$++:O.kind==="operator"&&(O.text===">"||O.text===">>"||O.text===">>>")&&($=Math.max(0,$-O.text.length)),Y++}P=v(i,Y)}let j=i[P];if(!j||!(j.kind==="open"&&j.text==="(")){const $=vt(i,E);if($===null)continue;P=$,j=i[P]}if(j.matchedAt!==void 0){const $=v(i,j.matchedAt+1),Y=i[$];if(Y&&(Y.kind==="open"&&Y.text==="{"||Y.kind==="fatArrow"||Y.kind==="punct"&&Y.text===":"))continue}if(me(p.start,he))continue;const N=A?u.start:p.start,C=V(e,N);o.push({code:"SYN032",severity:"warning",file:null,line:C.line,column:C.column,start:N,end:j.start+1,message:`fn '${_.name}' ${A?"constructs new ":"calls "}RTCPeerConnection${q?"?.":""}() — RTCPeerConnection opens a WebRTC peer-to-peer session; once ICE completes the connection can exchange data via RTCDataChannel or stream media over UDP — invisible to CAP001, which only checks http.* member calls; handler effects (onicecandidate, ondatachannel) fire asynchronously after the fn returns and cannot be declared in fn headers; wrap in unsafe "opens WebRTC peer connection for <reason>" { ${A?"new ":""}RTCPeerConnection${q?"?.":""}(config) }`,rule:J.rule,idiom:J.idiom,rewrite:J.rewrite});break}case"location":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn"||u&&u.kind==="ident"&&u.text==="function"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P)continue;const j=v(i,A+1),N=i[j];if(!N||N.kind!=="ident"||!E0.has(N.text)||me(p.start,he))continue;const C=P?"?.":".",$=N.text,Y=j0.has($),O=V(e,p.start);o.push({code:"SYN034",severity:"warning",file:null,line:O.line,column:O.column,start:p.start,end:N.end,message:`fn '${_.name}' accesses location${C}${$} — `+(Y?`location.${$}() is a navigation side effect that redirects or reloads the page; `:`location.${$} reads the ambient URL, which differs between deployment environments; `)+`no uses {} / reads {} / writes {} declaration covers the location global; pass the required value as a parameter so callers can see the dependency and tests can inject a mock, or wrap in unsafe "accesses location.${$} for <reason>" { location${C}${$} }`,rule:Oe.rule,idiom:Oe.idiom,rewrite:Oe.rewrite});break}case"history":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn"||u&&u.kind==="ident"&&u.text==="function"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P)continue;const j=v(i,A+1),N=i[j];if(!N||N.kind!=="ident"||!P0.has(N.text)||me(p.start,he))continue;const C=P?"?.":".",$=N.text,Y=D0.has($),O=V(e,p.start);o.push({code:"SYN035",severity:"warning",file:null,line:O.line,column:O.column,start:p.start,end:N.end,message:`fn '${_.name}' accesses history${C}${$} — `+(Y?`history.${$}() mutates the browser history stack or triggers navigation; the side effect outlives the fn call and cannot be declared in any fn header; accept a push/navigate callback as a parameter so callers control navigation, or wrap in unsafe "pushes history for <reason>" { history${C}${$}(...) }`:`history.${$} reads ambient navigation state that varies by session; no uses {} / reads {} / writes {} declaration covers the history global; pass the required value as a parameter so callers can inject a fixed value in tests, or wrap in unsafe "reads history.${$} for <reason>" { history${C}${$} }`),rule:Ae.rule,idiom:Ae.idiom,rewrite:Ae.rewrite});break}case"WebAssembly":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P)continue;const j=v(i,A+1),N=i[j];if(!N||N.kind!=="ident"||!O0.has(N.text))continue;let C=v(i,j+1),$=i[C],Y=!1;if($&&$.kind==="questionDot"&&(Y=!0,C=v(i,C+1),$=i[C]),!$||!($.kind==="open"&&$.text==="(")||me(p.start,he))continue;const O=u&&u.kind==="ident"&&u.text==="new",U=O?u.start:p.start,B=V(e,U),G=P?"?.":".",ne=Y?"?.":"",X=O?"new ":"";o.push({code:"SYN036",severity:"warning",file:null,line:B.line,column:B.column,start:U,end:N.end,message:`fn '${_.name}' calls ${X}WebAssembly${G}${N.text}${ne}() — WebAssembly execution is opaque to the capability model: the compiled module can make network requests, access memory, and produce any side effect without a uses {} or writes {} declaration; accept a pre-compiled WebAssembly.Instance parameter instead, or wrap in unsafe "executes <module> WASM for <reason>" { ${X}WebAssembly${G}${N.text}${ne}(...) }`,rule:$e.rule,idiom:$e.idiom,rewrite:$e.rewrite});break}case"call":case"apply":case"bind":{const F=ie(i,E-1),u=i[F];if(!u||!(u.kind==="punct"&&u.text==="."||u.kind==="questionDot"))continue;const A=ie(i,F-1);let x=i[A],S=A;if(x&&x.kind==="close"&&x.text===")"){let X=A;for(;((Hc=i[X])==null?void 0:Hc.kind)==="close"&&((Vc=i[X])==null?void 0:Vc.text)===")";)X=ie(i,X-1);((Gc=i[X])==null?void 0:Gc.kind)==="ident"&&(x=i[X],S=X)}if(!x||x.kind!=="ident"||!xt.has(x.text))continue;const q=ie(i,S-1),P=i[q];if(P&&(P.kind==="punct"&&P.text==="."||P.kind==="questionDot")||u.kind!=="questionDot"&&(P&&P.kind==="keyword"&&P.text==="fn"||P&&P.kind==="ident"&&P.text==="function"||Ve(i,q)))continue;const j=v(i,E+1),N=i[j];let C=j,$=!1;N&&N.kind==="questionDot"&&($=!0,C=v(i,j+1));const Y=i[C];if(!Y||!(Y.kind==="open"&&Y.text==="(")||me(p.start,he))continue;const O=p.text,U=x.text,B=u.kind==="questionDot"?"?.":".",G=$?"?.":"",ne=V(e,x.start);o.push({code:"SYN037",severity:"warning",file:null,line:ne.line,column:ne.column,start:x.start,end:Y.start+1,message:`fn '${_.name}' calls ${U}${B}${O}${G}() — ${U}.${O} invokes ${U} without using its name as the call token, bypassing SYN007–SYN036 name-token detection; call ${U}(...) directly or wrap in unsafe "${U}.${O} for <reason>" { ${U}.${O}(...) }`,rule:Me.rule,idiom:Me.idiom,rewrite:Me.rewrite});break}case"Object":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn"||u&&u.kind==="ident"&&u.text==="function"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P)continue;const j=v(i,A+1),N=i[j];if(!N||N.kind!=="ident")continue;const C=P?"?.":".";if(N.text==="defineProperty"||N.text==="defineProperties"){let $=v(i,j+1),Y=i[$],O=!1;if(Y&&Y.kind==="questionDot"&&(O=!0,$=v(i,$+1),Y=i[$]),!Y||!(Y.kind==="open"&&Y.text==="(")||me(p.start,he))continue;const U=O?"?.":"",B=V(e,p.start);o.push({code:"SYN039",severity:"warning",file:null,line:B.line,column:B.column,start:p.start,end:Y.start+1,message:`fn '${_.name}' calls Object${C}${N.text}${U}() — Object.${N.text} redefines property descriptors at runtime; effects (hidden getters/setters, non-writable locks) are invisible to the capability model and cannot be declared in the fn header; avoid mutating shared or global objects; wrap in unsafe "redefines <target>.<key> for <reason>" { Object.${N.text}(...) } if intentional`,rule:de.rule,idiom:de.idiom,rewrite:de.rewrite})}else if(N.text==="setPrototypeOf"){let $=v(i,j+1),Y=i[$];if(Y&&Y.kind==="questionDot"&&($=v(i,$+1),Y=i[$]),!Y||!(Y.kind==="open"&&Y.text==="(")||me(p.start,he))continue;const O=V(e,p.start);o.push({code:"SYN040",severity:"warning",file:null,line:O.line,column:O.column,start:p.start,end:N.end,message:`fn '${_.name}' calls Object${C}setPrototypeOf() — Object.setPrototypeOf() replaces the prototype chain of a target at runtime, silently redirecting property lookups (including capability-gated globals such as fetch, WebSocket, setTimeout) through a new chain invisible to the static capability model; SYN007–SYN039 source-level checks are defeated at runtime if a prototype mutation occurs first; model shape changes as explicit data structures, or wrap in unsafe "mutates prototype of <target> for <reason>" { Object${C}setPrototypeOf(...) }`,rule:we.rule,idiom:we.idiom,rewrite:we.rewrite})}break}case"__proto__":{const F=ie(i,E-1),u=i[F];if(!u||!(u.kind==="punct"&&u.text==="."||u.kind==="questionDot"))continue;const A=v(i,E+1),x=i[A];if(!x||x.kind!=="eq"||me(p.start,he))continue;const S=V(e,p.start);o.push({code:"SYN040",severity:"warning",file:null,line:S.line,column:S.column,start:p.start,end:p.end,message:`fn '${_.name}' assigns to .__proto__ — .__proto__ = proto replaces the prototype chain of the target at runtime, silently redirecting property lookups (including capability-gated globals) through a new chain invisible to the static capability model; use Object.create() to build objects with explicit prototypes instead, or wrap in unsafe "mutates prototype for <reason>" { target.__proto__ = proto }`,rule:we.rule,idiom:we.idiom,rewrite:we.rewrite});break}case"Reflect":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn"||u&&u.kind==="ident"&&u.text==="function"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P)continue;const j=v(i,A+1),N=i[j];if(!N||N.kind!=="ident")continue;if(N.text==="get"){const ne=v(i,j+1),X=i[ne];if(!X||!(X.kind==="open"&&X.text==="(")||me(p.start,he))continue;const ae=v(i,ne+1),oe=i[ae];if(!oe||oe.kind!=="ident"||!_0.has(oe.text))continue;const Ne=v(i,ae+1),fe=i[Ne];if(!fe||fe.kind!=="punct"||fe.text!==",")continue;const Ce=v(i,Ne+1),je=i[Ce];if(!je||je.kind!=="string")continue;const Ee=je.text.slice(1,-1);if(!Jt.has(Ee))continue;const ft=V(e,p.start);o.push({code:"SYN072",severity:"warning",file:null,line:ft.line,column:ft.column,start:p.start,end:je.end,message:`fn '${_.name}' reads ${oe.text}['${Ee}'] via Reflect.get() — semantically identical to ${oe.text}.${Ee} at runtime; SYN041 guards the dot-access form and SYN043 guards the bracket-literal form, but Reflect.get() encodes the key as a string argument, hiding the dangerous global name from both token-level checks; use botscript stdlib equivalents with explicit uses {} declarations, or wrap in unsafe "uses ${Ee} via Reflect.get for <reason>" { Reflect.get(${oe.text}, '${Ee}') }`,rule:zs.rule,idiom:zs.idiom,rewrite:zs.rewrite});break}if(!M0.has(N.text))continue;let C=v(i,j+1),$=i[C],Y=!1;if($&&$.kind==="questionDot"&&(Y=!0,C=v(i,C+1),$=i[C]),!$||!($.kind==="open"&&$.text==="(")||me(p.start,he))continue;const O=P?"?.":".",U=Y?"?.":"",B=V(e,p.start);let G;N.text==="apply"||N.text==="construct"?G=`Reflect.${N.text}() calls a function or constructor dynamically — SYN004–SYN041 name-based checks fire on source-level idents (eval, fetch, WebSocket…) and cannot see through dynamic dispatch; Reflect.${N.text}(dangerousFn, ...) executes it at runtime with no capability warning`:N.text==="setPrototypeOf"?G="Reflect.setPrototypeOf() replaces the prototype chain of target at runtime, silently redirecting property lookups (including capability-gated globals like fetch, WebSocket) through a new chain invisible to the static capability model; equivalent to Object.setPrototypeOf() (SYN040)":G=`Reflect.${N.text}() mutates object properties at runtime — invisible to the capability model and equivalent to the mutations caught by SYN039; use explicit property assignment or Object.assign() for traceable mutations`,o.push({code:"SYN042",severity:"warning",file:null,line:B.line,column:B.column,start:p.start,end:$.start+1,message:`fn '${_.name}' calls Reflect${O}${N.text}${U}() — `+G+`; wrap in unsafe "reason for Reflect.${N.text}" { Reflect.${N.text}(...) } if this is intentional`,rule:qe.rule,idiom:qe.idiom,rewrite:qe.rewrite});break}case"globalThis":case"window":case"self":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn"||u&&u.kind==="ident"&&u.text==="function"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];const S=kt(i,E);S!==null&&(A=S,x=i[A]);const q=x&&x.kind==="punct"&&x.text===".",P=x&&x.kind==="questionDot";if(!q&&!P&&x&&x.kind==="open"&&x.text==="["){const ae=v(i,A+1),oe=i[ae];if(oe&&oe.kind==="string"){const fe=oe.text.slice(1,-1);if(Jt.has(fe)&&!me(p.start,he)){const Ce=V(e,p.start);o.push({code:"SYN043",severity:"warning",file:null,line:Ce.line,column:Ce.column,start:p.start,end:oe.end,message:`fn '${_.name}' accesses ${p.text}['${fe}'] via computed bracket notation — the string literal hides the dangerous global name from SYN041 token-level detection; the capability bypass is identical to ${p.text}.${fe} at runtime; use botscript stdlib equivalents with explicit uses {} declarations, or wrap in unsafe "uses ${fe} via ${p.text}['${fe}'] for <reason>" { ${p.text}['${fe}'] }`,rule:be.rule,idiom:be.idiom,rewrite:be.rewrite})}}else if(oe&&oe.kind!=="number"&&!me(p.start,he)){const Ne=V(e,p.start);o.push({code:"SYN064",severity:"warning",file:null,line:Ne.line,column:Ne.column,start:p.start,end:oe.end,message:`fn '${_.name}' accesses ${p.text}[<dynamic key>] — the bracket key is not a string literal, so the member name cannot be resolved at compile time; any member could be a SYN-guarded global (fetch, eval, WebSocket, …); use dot-notation so the relevant SYN041 check fires, or wrap in unsafe "reason" { ${p.text}[key] }`,rule:hn.rule,idiom:hn.idiom,rewrite:hn.rewrite})}continue}if(!q&&!P)continue;const N=v(i,A+1),C=i[N];if(!C||C.kind!=="ident")continue;const $=p.text,Y=P?"?.":".",O=C.text,U=v(i,N+1),B=i[U],G=B&&B.kind==="eq",ne=B&&B.kind==="operator"&&hd.has(B.text);if(me(p.start,he))continue;const X=V(e,p.start);if(G||ne){const ae=B.text;o.push({code:"SYN038",severity:"warning",file:null,line:X.line,column:X.column,start:p.start,end:B.end,message:`fn '${_.name}' writes to ${$}${Y}${O} ${ae} — writing to the global object mutates ambient shared state invisible to the capability model; no uses {} / reads {} / writes {} declaration covers global scope writes; callers cannot see the dependency and tests cannot isolate it without mocking the global; pass state through explicit parameters and return values instead, or wrap in unsafe "writes ${$}.${O} for <reason>" { ${$}${Y}${O} ${ae} ... }`,rule:Te.rule,idiom:Te.idiom,rewrite:Te.rewrite})}Jt.has(O)&&o.push({code:"SYN041",severity:"warning",file:null,line:X.line,column:X.column,start:p.start,end:C.end,message:`fn '${_.name}' accesses ${$}${Y}${O} — the ${$} global receiver routes around the bare-identifier SYN check for ${O}; the capability bypass is identical at runtime; use botscript stdlib equivalents with explicit uses {} declarations, or wrap in unsafe "uses ${O} via ${$} for <reason>" { ${$}${Y}${O} }`,rule:re.rule,idiom:re.idiom,rewrite:re.rewrite});break}case"global":{const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="keyword"&&u.text==="fn"||u&&u.kind==="ident"&&u.text==="function"||Ve(i,F))break;const A=v(i,E+1),x=i[A],S=x&&x.kind==="punct"&&x.text===".",q=x&&x.kind==="questionDot",P=x&&x.kind==="open"&&x.text==="[";if(me(p.start,he))break;if(P){const ne=v(i,A+1),X=i[ne];if(X&&X.kind==="string"){const oe=X.text.slice(1,-1);if(Jt.has(oe)){const Ne=V(e,p.start);o.push({code:"SYN047",severity:"warning",file:null,line:Ne.line,column:Ne.column,start:p.start,end:X.end,message:`fn '${_.name}' accesses global['${oe}'] via computed bracket notation — the Node.js global receiver with a string literal hides the dangerous global name from SYN041–SYN046 token-level detection; the capability bypass is identical to globalThis['${oe}'] at runtime; use botscript stdlib equivalents with explicit uses {} declarations, or wrap in unsafe "uses ${oe} via global['${oe}'] for <reason>" { global['${oe}'] }`,rule:pn.rule,idiom:pn.idiom,rewrite:pn.rewrite})}}else if(X&&X.kind!=="number"&&!me(p.start,he)){const ae=V(e,p.start);o.push({code:"SYN064",severity:"warning",file:null,line:ae.line,column:ae.column,start:p.start,end:X.end,message:`fn '${_.name}' accesses global[<dynamic key>] — the bracket key is not a string literal, so the member name cannot be resolved at compile time; any member could be a SYN-guarded global (fetch, eval, WebSocket, …); use dot-notation so the relevant SYN041/SYN047 check fires, or wrap in unsafe "reason" { global[key] }`,rule:hn.rule,idiom:hn.idiom,rewrite:hn.rewrite})}break}if(!S&&!q)break;const j=v(i,A+1),N=i[j];if(!N||N.kind!=="ident")break;const C=q?"?.":".",$=N.text,Y=v(i,j+1),O=i[Y],U=O&&O.kind==="eq",B=O&&O.kind==="operator"&&hd.has(O.text),G=V(e,p.start);if(U||B){const ne=O.text;o.push({code:"SYN047",severity:"warning",file:null,line:G.line,column:G.column,start:p.start,end:N.end,message:`fn '${_.name}' writes global${C}${$} ${ne} ... — writing to the Node.js global object is an undeclared global side effect; no uses {} / reads {} / writes {} declaration covers global scope writes; callers cannot see the dependency; pass state through explicit parameters and return values, or wrap in unsafe "writes global.${$} for <reason>" { global${C}${$} ${ne} ... }`,rule:pn.rule,idiom:pn.idiom,rewrite:pn.rewrite})}Jt.has($)&&o.push({code:"SYN047",severity:"warning",file:null,line:G.line,column:G.column,start:p.start,end:N.end,message:`fn '${_.name}' accesses global${C}${$} — the Node.js global receiver routes around all SYN041–SYN046 checks (those only watch globalThis, window, and self); the capability bypass is identical at runtime; use botscript stdlib equivalents with explicit uses {} declarations, or wrap in unsafe "uses ${$} via Node global for <reason>" { global${C}${$} }`,rule:pn.rule,idiom:pn.idiom,rewrite:pn.rewrite});break}case"constructor":{e:{const Y=v(i,E+1),O=i[Y];if(!O||!(O.kind==="open"&&O.text==="("))break e;const U=ie(i,E-1),B=i[U],G=B&&B.kind==="punct"&&B.text===".",ne=B&&B.kind==="questionDot";if(!G&&!ne)break e;const X=ie(i,U-1),ae=i[X];if(!ae||ae.kind!=="ident"||ae.text!=="constructor")break e;const oe=ie(i,X-1),Ne=i[oe],fe=Ne&&Ne.kind==="punct"&&Ne.text===".",Ce=Ne&&Ne.kind==="questionDot";if(!fe&&!Ce)break e;const je=ie(i,oe-1),Ee=i[je];if(!Ee||me(p.start,he))break e;const ft=Ee.kind==="close"&&Ee.text==="]"?"[]":Ee.kind==="close"&&Ee.text===")"?"(...)":Ee.kind==="close"&&Ee.text==="}"?"{...}":Ee.kind==="string"||Ee.kind==="number"||Ee.kind==="template"||Ee.kind==="ident"?Ee.text:"expr",yt=Ce?"?.":".",Ot=ne?"?.":".",pt=V(e,Ee.start);o.push({code:"SYN061",severity:"warning",file:null,line:pt.line,column:pt.column,start:Ee.start,end:O.start+1,message:`fn '${_.name}' calls ${ft}${yt}constructor${Ot}constructor(...) — every JS value's .constructor is a constructor function, and every constructor's .constructor is the Function constructor; this two-hop chain always reaches Function and creates new functions from strings, bypassing SYN004–SYN060 (those guard 'eval'/'Function' by name or expressions by one-hop .constructor shape); refactor to explicit code or wrap in unsafe "reason" { ${ft}${yt}constructor${Ot}constructor(...) }`,rule:Os.rule,idiom:Os.idiom,rewrite:Os.rewrite});break}e:{const Y=v(i,E+1),O=i[Y];if(!O||!(O.kind==="open"&&O.text==="("))break e;const U=ie(i,E-1),B=i[U],G=B&&B.kind==="punct"&&B.text===".",ne=B&&B.kind==="questionDot";if(!G&&!ne)break e;const X=ie(i,U-1),ae=i[X];if(!ae)break e;const oe=ne?"?.":".";if(ae.kind==="ident"&&ae.text==="__proto__"){if(me(p.start,he))break e;const Kc=V(e,ae.start);o.push({code:"SYN062",severity:"warning",file:null,line:Kc.line,column:Kc.column,start:ae.start,end:O.start+1,message:`fn '${_.name}' reads __proto__${oe}constructor(...) — \`__proto__\` walks up the prototype chain; \`.constructor\` on \`Function.prototype\` is the \`Function\` constructor; this creates a new function from a string and bypasses SYN004–SYN061; refactor to explicit code or wrap in unsafe "reason" { target.__proto__${oe}constructor(...) }`,rule:yi.rule,idiom:yi.idiom,rewrite:yi.rewrite});break}if(!(ae.kind==="close"&&ae.text===")"))break e;const Ne=ae.matchedAt;if(Ne===void 0)break e;const fe=ie(i,Ne-1),Ce=i[fe];if(!Ce||Ce.kind!=="ident"||Ce.text!=="getPrototypeOf")break e;const je=ie(i,fe-1),Ee=i[je],ft=Ee&&Ee.kind==="punct"&&Ee.text===".",yt=Ee&&Ee.kind==="questionDot";if(!ft&&!yt)break e;const Ot=ie(i,je-1),pt=i[Ot];if(!pt||pt.kind!=="ident"||pt.text!=="Object"&&pt.text!=="Reflect"||me(p.start,he))break e;const bi=yt?"?.":".",Qc=V(e,pt.start);o.push({code:"SYN062",severity:"warning",file:null,line:Qc.line,column:Qc.column,start:pt.start,end:O.start+1,message:`fn '${_.name}' calls ${pt.text}${bi}getPrototypeOf(...)${oe}constructor(...) — \`${pt.text}.getPrototypeOf(fn)\` returns \`Function.prototype\`; \`.constructor\` on \`Function.prototype\` is the \`Function\` constructor; this creates a new function from a string and bypasses SYN004–SYN061; refactor to explicit code or wrap in unsafe "reason" { ${pt.text}${bi}getPrototypeOf(...)${oe}constructor(...) }`,rule:yi.rule,idiom:yi.idiom,rewrite:yi.rewrite});break}const F=v(i,E+1),u=i[F];if(!u||!(u.kind==="open"&&u.text==="("))continue;const A=ie(i,E-1),x=i[A],S=x&&x.kind==="punct"&&x.text===".",q=x&&x.kind==="questionDot";if(!S&&!q)continue;const P=ie(i,A-1),j=i[P];if(!j||j.kind!=="close"||j.text!==")")continue;const N=j.matchedAt;if(N===void 0||!C0(i,N,P)||me(p.start,he))continue;const C=q?"?.":".",$=V(e,i[N].start);o.push({code:"SYN060",severity:"warning",file:null,line:$.line,column:$.column,start:i[N].start,end:u.start+1,message:`fn '${_.name}' calls (fn-expr)${C}constructor(...) — every function's .constructor is the Function constructor; this creates a new function from a string and bypasses SYN004–SYN059 (those guard 'eval' and 'Function' by name; anonymous function expressions don't spell either); refactor to explicit code or wrap in unsafe "reason" { (fn-expr)${C}constructor(...) }`,rule:Ds.rule,idiom:Ds.idiom,rewrite:Ds.rewrite});break}default:{if(!A0.has(p.text))continue;const F=ie(i,E-1),u=i[F];if(u&&(u.kind==="punct"&&u.text==="."||u.kind==="questionDot")||u&&u.kind==="ident"&&u.text==="function"||u&&u.kind==="keyword"&&u.text==="fn"||Ve(i,F))continue;let A=v(i,E+1),x=i[A];if(x&&x.kind==="questionDot"&&(A=v(i,A+1),x=i[A]),!x||!(x.kind==="open"&&x.text==="(")){const P=vt(i,E);if(P===null)continue;A=P,x=i[A]}const S=x.matchedAt;if(S!==void 0){const P=v(i,S+1),j=i[P];if(j&&(j.kind==="open"&&j.text==="{"||j.kind==="punct"&&j.text===":"))continue}if(me(p.start,he))continue;const q=V(e,p.start);o.push({code:"SYN010",severity:"warning",file:null,line:q.line,column:q.column,start:p.start,end:p.end,message:`fn '${_.name}' calls ${p.text}() — ${p.text} schedules a callback that runs after the fn returns; any effects inside that callback are invisible to callers and cannot be declared in the fn header; wrap in unsafe "schedules deferred effect" { ${p.text}(...) }`,rule:g.rule,idiom:g.idiom,rewrite:g.rewrite});break}}}}}return{code:e,warnings:o}}function uh(e,t,n){var R,M;if(!Ue(t.resolved,"0.9"))return{code:e,warnings:[]};const r=Ue(t.resolved,"0.4"),i=Xt(e,{allowGenerics:r,includeNestedFns:!0}),o=i.tokens,s=i.fns.map(D=>D.decl);if(s.length===0)return{code:e,warnings:[]};const a=new Set(Xi(o).keys()),l=n?Kr(o):new Map,c=new Map,d=new Map,f=new Set;if(n)for(const[D,I]of Object.entries(n))f.add(D),(R=I.reads)!=null&&R.length&&c.set(D,new Set(I.reads)),(M=I.writes)!=null&&M.length&&d.set(D,new Set(I.writes));const h=new Map,m=new Map,g=new Set(s.map(D=>D.name)),b=new Set([...l.entries()].filter(([,D])=>f.has(D)).map(([D])=>D)),T=f.size>0||b.size>0?new Set([...g,...f,...b]):g,y=Qr(s);for(const D of s){const I=y.get(D)??[],L=Nt(o,D,I,T);h.set(D,{decl:D,declaredReads:new Set(D.reads??[]),declaredWrites:new Set(D.writes??[]),callees:L,transitiveReads:new Map,transitiveWrites:new Map});const z=m.get(D.name)??[];z.push(D),m.set(D.name,z)}for(const D of h.values()){for(const I of D.declaredReads)D.transitiveReads.set(I,{kind:"declared",fnName:D.decl.name,label:I});for(const I of D.declaredWrites)D.transitiveWrites.set(I,{kind:"declared",fnName:D.decl.name,label:I})}let w=!0;for(;w;){w=!1;for(const D of h.values())for(const I of D.callees){const L=m.get(I);if(L){for(const K of L){if(K===D.decl)continue;const le=h.get(K);if(le){for(const[pe,Ye]of le.transitiveReads)D.transitiveReads.has(pe)||(D.transitiveReads.set(pe,{kind:"via",fnName:D.decl.name,callee:I,next:Ye}),w=!0);for(const[pe,Ye]of le.transitiveWrites)D.transitiveWrites.has(pe)||(D.transitiveWrites.set(pe,{kind:"via",fnName:D.decl.name,callee:I,next:Ye}),w=!0)}}continue}const z=l.get(I)??I,W=c.get(z);if(W)for(const K of W)D.transitiveReads.has(K)||(D.transitiveReads.set(K,{kind:"via",fnName:D.decl.name,callee:I,next:{kind:"declared",fnName:I,label:K}}),w=!0);const H=d.get(z);if(H)for(const K of H)D.transitiveWrites.has(K)||(D.transitiveWrites.set(K,{kind:"via",fnName:D.decl.name,callee:I,next:{kind:"declared",fnName:I,label:K}}),w=!0)}}for(const D of h.values()){const I=[...D.transitiveReads.keys()].filter(z=>!D.declaredReads.has(z)).sort();if(I.length>0)throw gd(e,D,"reads",I,D.transitiveReads);const L=[...D.transitiveWrites.keys()].filter(z=>!D.declaredWrites.has(z)).sort();if(L.length>0)throw gd(e,D,"writes",L,D.transitiveWrites)}const k=[];for(const D of h.values()){if(D.callees.size===0)continue;const I=new Set(D.decl.paramReads),L=new Set(D.decl.paramWrites),z=new Set([D.decl]);let W=!1;const H=[...D.callees];for(;H.length>0;){const se=H.pop(),J=m.get(se);if(J){for(const $e of J){if(z.has($e))continue;z.add($e),W=!0;const Me=h.get($e);if(Me){for(const Te of Me.decl.reads??[])I.add(Te);for(const Te of Me.decl.writes??[])L.add(Te);for(const Te of Me.callees)H.push(Te)}}continue}const ye=l.get(se)??se;if(!f.has(ye))continue;W=!0;const Oe=c.get(ye);if(Oe)for(const $e of Oe)I.add($e);const Ae=d.get(ye);if(Ae)for(const $e of Ae)L.add($e)}if(!W)continue;const K=y.get(D.decl)??[],le=eh(D.decl.args),pe=$c(o,D.decl,K),Ye=new Set([...le,...pe,...a]),ve=new Set([...T,...le]);if(nh(o,D.decl,K,ve,Ye))continue;const Z=[...D.declaredReads].filter(se=>!I.has(se)).sort();Z.length>0&&k.push(yd(e,D,"reads",Z));const te=[...D.declaredWrites].filter(se=>!L.has(se)).sort();te.length>0&&k.push(yd(e,D,"writes",te))}return{code:e,warnings:k}}function md(e){const t=[];let n=e;for(;n.kind==="via";)t.push(n.fnName),n=n.next;return t.push(n.fnName),t.join(" -> ")}function gd(e,t,n,r,i){const o=n==="reads"?"DEP001":"DEP002",s=Q(o),{line:a,column:l}=V(e,t.decl.fnKeywordStart),c=r[0],d=i.get(c),f=md(d),h=f.split(" -> ").at(-1),m=d.kind==="via"&&d.next.kind==="declared",g=m?"":" transitively",b=!m&&d.kind==="via"?md(d.next):f,T=n==="reads"?t.declaredReads.size===0?"(none)":[...t.declaredReads].join(", "):t.declaredWrites.size===0?"(none)":[...t.declaredWrites].join(", "),y=n==="reads"?[...new Set([...t.declaredReads,...r])].sort().join(", "):[...new Set([...t.declaredWrites,...r])].sort().join(", "),w=r.slice(1),k=w.length>0?`; also missing: ${w.map(z=>`"${z}"`).join(", ")}`:"",R=m?`'${h}' which ${n} { ${c} }`:`${b} — '${h}' ${n} { ${c} }`,M=`fn '${t.decl.name}'${g} calls ${R}, but '${t.decl.name}' only declares ${n} { ${T} }${k}`,D=`call path: ${f}`,I=t.decl.nameStart+t.decl.name.length,L={code:o,severity:"error",file:null,line:a,column:l,start:t.decl.fnKeywordStart,end:I,message:M,rule:s.rule,idiom:s.idiom,rewrite:`fn ${t.decl.name}(...) ${n} { ${y} } -> ...  // ${D}`};return new Qe([L])}function yd(e,t,n,r){const i=n==="reads"?"DEP003":"DEP004",o=Q(i),{line:s,column:a}=V(e,t.decl.fnKeywordStart),l=t.decl.nameStart+t.decl.name.length,c=r.join(", "),d=r[0],f=r.length===1?`'${d}' is not declared by any tracked callee`:`[${c}] are not declared by any tracked callee`,h=`fn '${t.decl.name}' declares ${n} { ${c} } but ${f}; annotation may be stale`,m=n==="reads"?[...t.declaredReads].filter(g=>!r.includes(g)).sort():[...t.declaredWrites].filter(g=>!r.includes(g)).sort();return{code:i,severity:"warning",file:null,line:s,column:a,start:t.decl.fnKeywordStart,end:l,message:h,rule:o.rule,idiom:o.idiom,rewrite:m.length>0?`fn ${t.decl.name}(...) ${n} { ${m.join(", ")} } -> ...  // remove stale label: ${c}`:`fn ${t.decl.name}(...) -> ...  // remove stale ${n} {} clause: ${c}`}}function dh(e){return e.angle===0&&e.bracket===0&&e.paren===0&&e.brace===0}function Nr(e,t,n){const r=e[t];if(r==="<"){n.angle++;return}if(r===">"&&(t===0||e[t-1]!=="-"&&e[t-1]!=="=")){n.angle>0&&n.angle--;return}if(r==="["){n.bracket++;return}if(r==="]"){n.bracket>0&&n.bracket--;return}if(r==="("){n.paren++;return}if(r===")"){n.paren>0&&n.paren--;return}if(r==="{"){n.brace++;return}if(r==="}"){n.brace>0&&n.brace--;return}}function L0(e){const t=[],n={angle:0,bracket:0,paren:0,brace:0};let r=0;for(let i=0;i<e.length;i++)e[i]==="|"&&dh(n)?(t.push(e.slice(r,i).trim()),r=i+1):Nr(e,i,n);return t.push(e.slice(r).trim()),t}function wd(e){const t={angle:0,bracket:0,paren:0,brace:0};for(let n=0;n<e.length;n++){if(e[n]===","&&dh(t))return n;Nr(e,n,t)}return-1}function Il(e,t){if(t<0||t>=e.length||e[t]!=="<")return-1;const n={angle:0,bracket:0,paren:0,brace:0};for(let r=t;r<e.length;r++)if(e[r]==="<")Nr(e,r,n);else if(e[r]===">"&&(r===0||e[r-1]!=="-"&&e[r-1]!=="=")){if(n.angle===1)return r;Nr(e,r,n)}else Nr(e,r,n);return-1}function U0(e){const t=e.trim();if(!/^Result\s*</.test(t))return!1;const n=t.indexOf("<"),r=Il(t,n);return r!==-1&&r===t.length-1}function B0(e){let t=e.trim();if(/^Promise\s*</.test(t)){const l=t.indexOf("<"),c=Il(t,l);if(c===-1||c!==t.length-1)return null;t=t.slice(l+1,c).trim()}if(!U0(t))return null;const n=t.indexOf("<");if(n===-1)return null;const r=Il(t,n);if(r===-1)return null;const i=t.slice(n+1,r),o=wd(i);if(o===-1)return null;const s=i.slice(0,o).trim(),a=i.slice(o+1);return wd(a)!==-1?null:[s,a.trim()]}function z0(e){const t=e.trim();if(/\[\s*\]$/.test(t))return"";const n=t.match(/^([A-Za-z_$][A-Za-z0-9_$]*)/);return n?n[1]:""}function fh(e,t,n){var D;if(!Ue(t.resolved,"0.9"))return{code:e,warnings:[]};const r=Ue(t.resolved,"0.4"),i=Xt(e,{allowGenerics:r,includeNestedFns:!0}),o=i.tokens,s=i.fns.map(I=>I.decl);if(s.length===0)return{code:e,warnings:[]};const a=new Set(Xi(o).keys()),l=n?Kr(o):new Map,c=new Map;if(n)for(const[I,L]of Object.entries(n))(D=L.throws)!=null&&D.length&&c.set(I,new Set(L.throws));const d=new Map,f=new Map,h=new Set(s.map(I=>I.name)),m=new Set(n?Object.keys(n):[]),g=new Set(l.keys()),b=m.size>0||g.size>0?new Set([...h,...m,...g]):h,T=new Set([...l.entries()].filter(([,I])=>m.has(I)).map(([I])=>I)),y=m.size>0||T.size>0?new Set([...h,...m,...T]):h,w=Qr(s);for(const I of s){const L=w.get(I)??[],z=Tn(o,I,L,b);d.set(I,{decl:I,declaredThrows:new Set(I.throws??[]),callees:z,transitiveThrows:new Map});const W=f.get(I.name)??[];W.push(I),f.set(I.name,W)}for(const I of d.values())for(const L of I.declaredThrows)I.transitiveThrows.set(L,{kind:"declared",fnName:I.decl.name,label:L});let k=!0;for(;k;){k=!1;for(const I of d.values())for(const L of I.callees){const z=f.get(L);if(z){for(const K of z){if(K===I.decl)continue;const le=d.get(K);if(le)for(const[pe,Ye]of le.transitiveThrows)I.transitiveThrows.has(pe)||(I.transitiveThrows.set(pe,{kind:"via",fnName:I.decl.name,callee:L,next:Ye}),k=!0)}continue}const W=l.get(L)??L,H=c.get(W);if(H)for(const K of H)I.transitiveThrows.has(K)||(I.transitiveThrows.set(K,{kind:"via",fnName:I.decl.name,callee:L,next:{kind:"declared",fnName:L,label:K}}),k=!0)}}for(const I of d.values()){const L=[...I.transitiveThrows.keys()].filter(z=>!I.declaredThrows.has(z)).sort();if(L.length>0)throw W0(e,I,L)}const R=new Map;for(const I of d.values())R.set(I.decl,H0(o,I.decl,w.get(I.decl)??[]));for(const I of d.values()){const L=G0(I.decl,I.declaredThrows,e,R.get(I.decl));if(L)throw L}const M=[];for(const I of d.values()){if(I.callees.size===0)continue;const L=new Set(I.decl.paramThrows);for(const ve of R.get(I.decl).keys())ph(I.decl.returnType,ve)||L.add(ve);let z=!1;for(const ve of I.callees){const Z=f.get(ve);if(Z){for(const J of Z){if(J===I.decl)continue;z=!0;const ye=d.get(J);if(ye)for(const Oe of ye.transitiveThrows.keys())L.add(Oe)}continue}const te=l.get(ve)??ve;if(!m.has(te))continue;z=!0;const se=c.get(te);if(se)for(const J of se)L.add(J)}if(!z)continue;const W=w.get(I.decl)??[],H=V0(I.decl),K=H.size>0?new Set([...y,...H]):y,le=$c(o,I.decl,W),pe=new Set([...H,...le,...a]);if(nh(o,I.decl,W,K,pe))continue;const Ye=[...I.declaredThrows].filter(ve=>!L.has(ve)).sort();Ye.length>0&&M.push(Q0(e,I,Ye))}return{code:e,warnings:M}}function bd(e){const t=[];let n=e;for(;n.kind==="via";)t.push(n.fnName),n=n.next;return t.push(n.fnName),t.join(" -> ")}function W0(e,t,n){const r=Q("THR001"),{line:i,column:o}=V(e,t.decl.fnKeywordStart),s=n[0],a=t.transitiveThrows.get(s),l=bd(a),c=l.split(" -> ").at(-1),d=a.kind==="via"&&a.next.kind==="declared",f=d?"":" transitively",h=!d&&a.kind==="via"?bd(a.next):l,m=[...new Set([...t.declaredThrows,...n])].sort().join(", "),g=n.slice(1),b=g.length>0?`; also missing: ${g.map(D=>`"${D}"`).join(", ")}`:"",T=d?`'${c}' which throws { ${s} }`:`${h} — '${c}' throws { ${s} }`,y=t.declaredThrows.size===0?"has no throws clause":`has throws { ${[...t.declaredThrows].sort().join(", ")} } but not { ${n.join(", ")} }`,w=`fn '${t.decl.name}'${f} calls ${T}, but '${t.decl.name}' ${y}${b}`,k=`call path: ${l}`,R=t.decl.nameStart+t.decl.name.length,M={code:"THR001",severity:"error",file:null,line:i,column:o,start:t.decl.fnKeywordStart,end:R,message:w,rule:r.rule,idiom:r.idiom,rewrite:`fn ${t.decl.name}(...) throws { ${m} } -> ...  // ${k}`};return new Qe([M])}function H0(e,t,n){const r=new Map,i=[];let o=0;for(let s=t.bodyTokenStart??t.tokenStart;s<t.tokenEnd;s++){for(;i.length>0&&i[i.length-1].tokenEnd<=s;)i.pop();for(;o<n.length&&n[o].tokenStart<=s;)i.push(n[o]),o++;if(i.length>0)continue;const a=e[s];if(!a||a.kind!=="ident"||a.text!=="err")continue;const l=ie(e,s-1),c=e[l];if(c&&(c.kind==="punct"&&c.text==="."||c.kind==="questionDot"))continue;const d=v(e,s+1),f=e[d];if(!f||f.kind!=="open"||f.text!=="(")continue;let h=v(e,d+1),m=e[h];if(m&&m.kind==="ident"&&m.text==="new"&&(h=v(e,h+1),m=e[h]),!m||m.kind!=="ident")continue;const g=m.text;if(!/^[A-Z]/.test(g))continue;const b=v(e,h+1),T=e[b];if(!T)continue;const y=T.kind==="open"&&T.text==="(",w=T.kind==="close"&&T.text===")";!y&&!w||r.has(g)||r.set(g,{start:a.start,end:a.end})}return r}function V0(e){const t=new Set,n=e.args;let r=0,i=0,o=0;for(;o<n.length;){const s=n[o];if(s==="("){r++,o++;continue}if(s===")"){r--,o++;continue}if(s==="{"){i++,o++;continue}if(s==="}"){i--,o++;continue}if(r!==1||i!==0){o++;continue}const a=/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/.exec(n.slice(o));a?(t.add(a[1]),o+=a[0].length):o++}return t}function ph(e,t){const n=B0(e);if(!n)return!1;const[,r]=n;return L0(r).some(i=>z0(i)===t)}function G0(e,t,n,r){const i=Q("THR002");for(const[o,s]of r){if(t.has(o)||ph(e.returnType,o))continue;const{line:a,column:l}=V(n,s.start),c=[...new Set([...t,o])].sort().join(", ");return new Qe([{code:"THR002",severity:"error",file:null,line:a,column:l,start:s.start,end:s.end,message:t.size===0?`fn '${e.name}' constructs err(${o}...) but has no throws clause`:`fn '${e.name}' constructs err(${o}...) but '${o}' is not declared in throws { ${[...t].sort().join(", ")} }`,rule:i.rule,idiom:i.idiom,rewrite:`fn ${e.name}(...) throws { ${c} } -> ...`}])}return null}function Q0(e,t,n){const r=Q("THR004"),{line:i,column:o}=V(e,t.decl.fnKeywordStart),s=t.decl.nameStart+t.decl.name.length,a=[...t.declaredThrows].sort().join(", "),l=n.join(", "),c=n.length===1?`'${n[0]}' is not propagated by any callee or constructed directly`:`[${l}] are not propagated by any callee or constructed directly`,d=[...t.declaredThrows].filter(h=>!n.includes(h)).sort(),f=d.length>0?`throws { ${d.join(", ")} } `:"";return{code:"THR004",severity:"warning",file:null,line:i,column:o,start:t.decl.fnKeywordStart,end:s,message:`fn '${t.decl.name}' declares throws { ${a} } but ${c}; annotation may be stale`,rule:r.rule,idiom:r.idiom,rewrite:`fn ${t.decl.name}(...) ${f}-> ...  // remove stale label${n.length>1?"s":""}: ${l}`}}function K0(e,t){if(!Ue(t.resolved,"0.7"))return e;const n=Ue(t.resolved,"0.4"),r=Ue(t.resolved,"0.9"),i=Xt(e,{allowGenerics:n,includeNestedFns:!0}),o=[];for(const s of i.fns){const a=s.decl;if(a.paramCaps.length>0){const l=new Set(a.capabilities),c=[...new Set(a.paramCaps.filter(d=>!l.has(d)))];if(c.length>0){const d=Q("EFF002"),f=wo(e,a.fnKeywordStart),h=[...new Set(a.paramCaps)].join(", ");o.push({code:"EFF002",severity:"error",file:null,line:f.line,column:f.column,start:a.fnKeywordStart,end:a.fnKeywordStart+a.name.length+3,message:`fn '${a.name}' accepts callback parameter(s) that declare { ${h} } but only declares uses ${l.size>0?`{ ${[...l].join(", ")} }`:"{}"} — missing: { ${c.join(", ")} }`,rule:d.rule,idiom:d.idiom,rewrite:`fn ${a.name}(...) uses { ${[...l,...c].join(", ")} } -> ...`})}}if(r){if(a.paramReads.length>0){const l=new Set(a.reads??[]),c=[...new Set(a.paramReads.filter(d=>!l.has(d)))];if(c.length>0){const d=Q("EFF003"),f=wo(e,a.fnKeywordStart),h=[...new Set(a.paramReads)].join(", ");o.push({code:"EFF003",severity:"error",file:null,line:f.line,column:f.column,start:a.fnKeywordStart,end:a.fnKeywordStart+a.name.length+3,message:`fn '${a.name}' accepts callback parameter(s) that declare reads { ${h} } but only declares reads ${l.size>0?`{ ${[...l].join(", ")} }`:"{}"} — missing: { ${c.join(", ")} }`,rule:d.rule,idiom:d.idiom,rewrite:`fn ${a.name}(...) reads { ${[...l,...c].join(", ")} } -> ...`})}}if(a.paramWrites.length>0){const l=new Set(a.writes??[]),c=[...new Set(a.paramWrites.filter(d=>!l.has(d)))];if(c.length>0){const d=Q("EFF004"),f=wo(e,a.fnKeywordStart),h=[...new Set(a.paramWrites)].join(", ");o.push({code:"EFF004",severity:"error",file:null,line:f.line,column:f.column,start:a.fnKeywordStart,end:a.fnKeywordStart+a.name.length+3,message:`fn '${a.name}' accepts callback parameter(s) that declare writes { ${h} } but only declares writes ${l.size>0?`{ ${[...l].join(", ")} }`:"{}"} — missing: { ${c.join(", ")} }`,rule:d.rule,idiom:d.idiom,rewrite:`fn ${a.name}(...) writes { ${[...l,...c].join(", ")} } -> ...`})}}if(a.paramThrows.length>0){const l=new Set(a.throws??[]),c=[...new Set(a.paramThrows.filter(d=>!l.has(d)))];if(c.length>0){const d=Q("THR003"),f=wo(e,a.fnKeywordStart),h=[...new Set(a.paramThrows)].join(", ");o.push({code:"THR003",severity:"error",file:null,line:f.line,column:f.column,start:a.fnKeywordStart,end:a.fnKeywordStart+a.name.length+3,message:`fn '${a.name}' accepts callback parameter(s) that declare throws { ${h} } but only declares throws ${l.size>0?`{ ${[...l].join(", ")} }`:"{}"} — missing: { ${c.join(", ")} }`,rule:d.rule,idiom:d.idiom,rewrite:`fn ${a.name}(...) throws { ${[...l,...c].join(", ")} } -> ...`})}}}}if(o.length>0)throw new Qe(o);return e}function wo(e,t){let n=1,r=0;for(let i=0;i<t&&i<e.length;i++)e[i]===`
`&&(n++,r=i+1);return{line:n,column:t-r+1}}function hh(e,t,n){var L,z,W;if(!Ue(t.resolved,"0.7"))return e;const r=Ue(t.resolved,"0.4"),i=Ue(t.resolved,"0.8"),o=Ue(t.resolved,"0.9"),s=Ue(t.resolved,"0.9"),a=Ue(t.resolved,"0.8"),l=Xt(e,{allowGenerics:r,includeNestedFns:!0}),c=l.tokens,d=l.fns.map(H=>H.decl),f=a?Xi(c):new Map,h=[],m=o?Qr(d):new Map,g=new Set(d.map(H=>H.name)),b=new Map,T=new Map,y=new Map,w=new Map,k=new Map;if(o){for(const H of d){if((((L=H.throws)==null?void 0:L.length)??0)===0)continue;const K=b.get(H.name);if(K)for(const le of H.throws)K.includes(le)||K.push(le);else b.set(H.name,[...H.throws])}for(const H of d){if(H.capabilities.length===0)continue;const K=T.get(H.name);if(K)for(const le of H.capabilities)K.includes(le)||K.push(le);else T.set(H.name,[...H.capabilities])}for(const H of d){if((((z=H.writes)==null?void 0:z.length)??0)===0)continue;const K=y.get(H.name);if(K)for(const le of H.writes)K.includes(le)||K.push(le);else y.set(H.name,[...H.writes])}for(const H of d){if((((W=H.reads)==null?void 0:W.length)??0)===0)continue;const K=w.get(H.name);if(K)for(const le of H.reads)K.includes(le)||K.push(le);else w.set(H.name,[...H.reads])}for(const H of d)H.isAsync&&k.set(H.name,!0)}const R=n?Kr(c):new Map,M=new Set(n?Object.keys(n):[]),D=n?new Set([...R.entries()].filter(([,H])=>M.has(H)).map(([H])=>H)):new Set,I=n?new Set([...g,...M,...D]):g;for(const H of l.fns){const K=H.decl;K.intent!==void 0&&(yh(K.intent)&&X0(K,e,c,d,i,o,s,f,h,a,m,g,T,w,y,k,b,n,R,I),wh(K.intent)&&Z0(K,e,c,d,i,f,h,a,o,m,g,T,y,k,b,n,R,I),o&&bh(K.intent)&&tw(K,e,c,m,g,b,h,k,n,R,I),o&&vh(K.intent)&&nw(K,e,c,m,g,b,h,k,n,R,I),o&&iw(K,e,h))}if(h.length>0)throw new Qe(h);return e}function X0(e,t,n,r,i,o,s,a,l,c=!1,d=new Map,f=new Set,h=new Map,m=new Map,g=new Map,b=new Map,T=new Map,y,w=new Map,k=f){var H,K,le,pe,Ye,ve,Z,te,se,J,ye,Oe;const R=e.capabilities.length>0,M=i&&(((H=e.reads)==null?void 0:H.length)??0)>0,D=i&&(((K=e.writes)==null?void 0:K.length)??0)>0,I=o&&(((le=e.throws)==null?void 0:le.length)??0)>0;if(R||M||D||I){const Ae=Q("INT001"),$e=e.intentStart,Me=V(t,$e),Te=[];R&&Te.push(`uses { ${e.capabilities.join(", ")} }`),M&&Te.push(`reads { ${e.reads.join(", ")} }`),D&&Te.push(`writes { ${e.writes.join(", ")} }`),I&&Te.push(`throws { ${e.throws.join(", ")} }`);const de=Te.join(", "),we=Te.join(" "),re=I&&!R&&!M&&!D,qe=`fn '${e.name}' intent claims 'pure' but declares ${de}`,be=re?"pure functions may not declare throws — use Result<T, E> for error conditions instead":`pure functions may not have resource dependencies${I?" or declare throws":""}`;l.push({code:"INT001",severity:"error",file:null,line:Me.line,column:Me.column,start:$e,end:$e+e.intent.length+2,message:`${qe} — ${be}`,rule:Ae.rule,idiom:Ae.idiom,rewrite:re?`// option A — remove the throws {} declaration (keep intent: "pure"):
fn ${e.name}(...) intent: "pure" -> ...

// option B — remove the pure intent claim:
fn ${e.name}(...) ${we} -> ...

// option C — replace throws with Result (preferred for pure fns):
fn ${e.name}(...) intent: "pure" -> Result<type, ErrorType> { ... }`:`// option A — remove the conflicting header clauses (${Te.join(" / ")}):
fn ${e.name}(...) intent: "pure" -> ...

// option B — remove the pure intent claim:
fn ${e.name}(...) ${we} -> ...`+(I?`

// option C — if throws is the last remaining conflict after removing uses/reads/writes, replace it with Result:
fn ${e.name}(...) intent: "pure" -> Result<type, ErrorType> { ... }`:"")});return}const L=Ns(n,e,r,a),z=c?Ts(n,e,r,new Set(a.keys())):[],W=mh(n,e,r,L,void 0,c,z);if(W){const Ae=Q("INT002"),$e=e.intentStart,Me=V(t,$e);l.push({code:"INT002",severity:"error",file:null,line:Me.line,column:Me.column,start:$e,end:$e+e.intent.length+2,message:`fn '${e.name}' declares intent: "pure" but body directly calls '${W.namespace}${W.accessOp}${W.member}' which requires capability '${W.capability}' — pure functions may not consume external resources`,rule:Ae.rule,idiom:Ae.idiom,rewrite:`// option A — remove the capability call from the body:
fn ${e.name}(...) intent: "pure" -> ...

// option B — declare the capability and remove the pure claim:
fn ${e.name}(...) uses { ${W.capability} } -> ...`})}if(o&&!W&&e.bodyTokenStart!==void 0&&h.size>0){const Ae=d.get(e)??[],$e=Nt(n,e,Ae,f),Me=Q("INT012"),Te=e.intentStart,de=V(t,Te),we=new Set;for(const re of $e){if(we.has(re))continue;const qe=h.get(re);if(!qe||qe.length===0)continue;we.add(re);const be=qe.join(", ");l.push({code:"INT012",severity:"error",file:null,line:de.line,column:de.column,start:Te,end:Te+e.intent.length+2,message:`fn '${e.name}' intent claims 'pure' but calls '${re}' which declares uses { ${be} } — a callee with capability declarations makes the caller non-pure by transitivity; inject the callee's return value as a parameter, or remove the pure intent claim`,rule:Me.rule,idiom:Me.idiom,rewrite:`// option A — inject the computed value as a parameter (preferred):
fn ${e.name}(..., precomputed: T) intent: "pure" -> R {
  // use precomputed instead of calling '${re}'
}

// option B — remove the pure intent claim:
fn ${e.name}(...) uses { ${be} } -> R {
  const v = ${re}(...)
  return compute(v)
}`})}}if(o&&!W&&e.bodyTokenStart!==void 0&&(m.size>0||g.size>0)){const Ae=d.get(e)??[],$e=Nt(n,e,Ae,f),Me=Q("INT016"),Te=e.intentStart,de=V(t,Te),we=new Set;for(const re of $e){if(we.has(re))continue;const qe=m.get(re),be=g.get(re);if((!qe||qe.length===0)&&(!be||be.length===0))continue;we.add(re);const Je=[];qe&&qe.length>0&&Je.push(`reads { ${qe.join(", ")} }`),be&&be.length>0&&Je.push(`writes { ${be.join(", ")} }`);const rt=Je.join(", "),Gn=((qe==null?void 0:qe.length)??0)>0&&((be==null?void 0:be.length)??0)>0?"reads and writes external state":((qe==null?void 0:qe.length)??0)>0?"reads external state (non-deterministic)":"writes external state (side effect)";l.push({code:"INT016",severity:"error",file:null,line:de.line,column:de.column,start:Te,end:Te+e.intent.length+2,message:`fn '${e.name}' intent claims 'pure' but calls '${re}' which declares ${rt} — a callee that ${Gn} makes the caller non-pure by transitivity; inject the external value as a parameter, or remove the pure intent claim`,rule:Me.rule,idiom:Me.idiom,rewrite:`// option A — inject the external value as a parameter (preferred):
fn ${e.name}(..., preloaded: T) intent: "pure" -> R {
  // use preloaded instead of calling '${re}'
}

// option B — remove the pure intent claim and surface the effect:
fn ${e.name}(...) ${rt} -> R {
  const v = ${re}(...)
  return compute(v)
}`})}}if(s&&!e.isAsync&&!W&&e.bodyTokenStart!==void 0&&b.size>0){const Ae=d.get(e)??[],$e=Nt(n,e,Ae,f),Me=Q("INT017"),Te=e.intentStart,de=V(t,Te),we=new Set;for(const re of $e)we.has(re)||b.get(re)&&(we.add(re),l.push({code:"INT017",severity:"error",file:null,line:de.line,column:de.column,start:Te,end:Te+e.intent.length+2,message:`fn '${e.name}' intent claims 'pure' but calls '${re}' which is declared async — an async callee yields to the event loop (a timing side effect) and returns a distinct Promise on every call, making the caller non-pure by transitivity; make '${re}' synchronous, inject its resolved value as a parameter, or remove the pure intent claim`,rule:Me.rule,idiom:Me.idiom,rewrite:`// option A — make the callee synchronous (preferred):
fn ${re}(...) -> T = compute(...)

fn ${e.name}(...) intent: "pure" -> T = ${re}(...)

// option B — inject the resolved value as a parameter:
fn ${e.name}(precomputed: T) intent: "pure" -> R {
  // use precomputed instead of calling '${re}'
}

// call site: ${e.name}(await ${re}(...))

// option C — remove the pure claim:
fn ${e.name}(...) -> R {
  const v = ${re}(...)
  return compute(v)
}`}))}if(o&&!W&&e.bodyTokenStart!==void 0&&T.size>0){const Ae=d.get(e)??[],$e=Tn(n,e,Ae,f),Me=Q("INT018"),Te=e.intentStart,de=V(t,Te),we=new Set;for(const re of $e){if(we.has(re))continue;const qe=T.get(re);if(!qe||qe.length===0)continue;we.add(re);const be=qe.join(", ");l.push({code:"INT018",severity:"error",file:null,line:de.line,column:de.column,start:Te,end:Te+e.intent.length+2,message:`fn '${e.name}' intent claims 'pure' but calls '${re}' which declares throws { ${be} } — exceptions are side effects; a pure fn cannot propagate exceptions by transitivity; wrap '${re}' in try/catch returning Result<T, ${be}>, or remove the pure intent claim`,rule:Me.rule,idiom:Me.idiom,rewrite:`// option A — catch the exception and return Result (preferred):
fn ${e.name}(...) intent: "pure" -> Result<T, ${be}> {
  try {
    return ok(${re}(...))
  } catch (e) {
    return err(new ${qe[0]}(e))
  }
}

// option B — remove the pure claim:
fn ${e.name}(...) throws { ${be} } -> T {
  return ${re}(...)
}`})}}if(o&&!W&&y&&e.bodyTokenStart!==void 0){const Ae=d.get(e)??[],$e=Tn(n,e,Ae,k),Me=Q("INT024"),Te=e.intentStart,de=V(t,Te),we=new Set;for(const re of $e){if(we.has(re)||f.has(re))continue;const qe=w.get(re)??re,be=y[qe];if(!((pe=be==null?void 0:be.throws)!=null&&pe.length))continue;we.add(re);const Je=be.throws.join(", ");l.push({code:"INT024",severity:"error",file:null,line:de.line,column:de.column,start:Te,end:Te+e.intent.length+2,message:`fn '${e.name}' intent claims 'pure' but calls imported '${re}' which declares throws { ${Je} } — exceptions are side effects; a pure fn cannot propagate exceptions by transitivity; wrap '${re}' in try/catch returning Result<T, ${Je}>, or remove the pure intent claim`,rule:Me.rule,idiom:Me.idiom,rewrite:`// option A — catch the exception and return Result (preferred):
fn ${e.name}(...) intent: "pure" -> Result<T, ${Je}> {
  try {
    return ok(${re}(...))
  } catch (e) {
    return err(new ${be.throws[0]}(e))
  }
}

// option B — remove the pure claim:
fn ${e.name}(...) throws { ${Je} } -> T {
  return ${re}(...)
}`})}}if(o&&!W&&y&&e.bodyTokenStart!==void 0){const Ae=d.get(e)??[],$e=Nt(n,e,Ae,k),Me=Q("INT028"),Te=e.intentStart,de=V(t,Te),we=new Set;for(const re of $e){if(we.has(re)||f.has(re))continue;const qe=w.get(re)??re,be=y[qe];if(!((Ye=be==null?void 0:be.capabilities)!=null&&Ye.length))continue;we.add(re);const Je=be.capabilities.join(", ");l.push({code:"INT028",severity:"error",file:null,line:de.line,column:de.column,start:Te,end:Te+e.intent.length+2,message:`fn '${e.name}' intent claims 'pure' but calls imported '${re}' which declares uses { ${Je} } — a callee with capability declarations makes the caller non-pure by transitivity; inject the callee's return value as a parameter, or remove the pure intent claim`,rule:Me.rule,idiom:Me.idiom,rewrite:`// option A — inject the computed value as a parameter (preferred):
fn ${e.name}(..., precomputed: T) intent: "pure" -> R {
  // use precomputed instead of calling '${re}'
}

// option B — remove the pure intent claim and declare the capability:
fn ${e.name}(...) uses { ${Je} } -> R {
  const v = ${re}(...)
  return compute(v)
}`})}}if(o&&!W&&y&&e.bodyTokenStart!==void 0){const Ae=d.get(e)??[],$e=Nt(n,e,Ae,k),Me=Q("INT029"),Te=e.intentStart,de=V(t,Te),we=new Set;for(const re of $e){if(we.has(re)||f.has(re))continue;const qe=w.get(re)??re,be=y[qe];if(!((ve=be==null?void 0:be.reads)!=null&&ve.length)&&!((Z=be==null?void 0:be.writes)!=null&&Z.length))continue;we.add(re);const Je=[];(te=be.reads)!=null&&te.length&&Je.push(`reads { ${be.reads.join(", ")} }`),(se=be.writes)!=null&&se.length&&Je.push(`writes { ${be.writes.join(", ")} }`);const rt=Je.join(", "),Gn=(((J=be.reads)==null?void 0:J.length)??0)>0&&(((ye=be.writes)==null?void 0:ye.length)??0)>0?"reads and writes external state":(((Oe=be.reads)==null?void 0:Oe.length)??0)>0?"reads external state (non-deterministic)":"writes external state (side effect)";l.push({code:"INT029",severity:"error",file:null,line:de.line,column:de.column,start:Te,end:Te+e.intent.length+2,message:`fn '${e.name}' intent claims 'pure' but calls imported '${re}' which declares ${rt} — a callee that ${Gn} makes the caller non-pure by transitivity; inject the external value as a parameter, or remove the pure intent claim`,rule:Me.rule,idiom:Me.idiom,rewrite:`// option A — inject the external value as a parameter (preferred):
fn ${e.name}(..., preloaded: T) intent: "pure" -> R {
  // use preloaded instead of calling '${re}'
}

// option B — remove the pure intent claim and surface the effect:
fn ${e.name}(...) ${rt} -> R {
  const v = ${re}(...)
  return compute(v)
}`})}}if(s&&!e.isAsync&&!W&&y&&e.bodyTokenStart!==void 0){const Ae=d.get(e)??[],$e=Nt(n,e,Ae,k),Me=Q("INT032"),Te=e.intentStart,de=V(t,Te),we=new Set;for(const re of $e){if(we.has(re)||f.has(re))continue;const qe=w.get(re)??re,be=y[qe];be!=null&&be.isAsync&&(we.add(re),l.push({code:"INT032",severity:"error",file:null,line:de.line,column:de.column,start:Te,end:Te+e.intent.length+2,message:`fn '${e.name}' intent claims 'pure' but calls imported '${re}' which is declared async — an async callee yields to the event loop (a timing side effect) and returns a distinct Promise on every call; inject the resolved value as a parameter, or remove the pure intent claim`,rule:Me.rule,idiom:Me.idiom,rewrite:`// option A — inject the resolved value as a parameter (preferred):
fn ${e.name}(precomputed: T) intent: "pure" -> R {
  // use precomputed instead of calling '${re}'
}
// call site: ${e.name}(await ${re}(...))

// option B — remove the pure claim:
fn ${e.name}(...) -> Promise<R> {
  const v = ${re}(...)
  return compute(v)
}`}))}}if(s&&e.isAsync){const Ae=Q("INT011"),$e=e.intentStart,Me=V(t,$e);l.push({code:"INT011",severity:"error",file:null,line:Me.line,column:Me.column,start:$e,end:$e+e.intent.length+2,message:`fn '${e.name}' intent claims 'pure' but is declared async — an async function yields to the event loop (a timing side effect) and returns a distinct Promise on every call, contradicting the pure claim of determinism and referential transparency; make the body synchronous or remove the pure intent`,rule:Ae.rule,idiom:Ae.idiom,rewrite:`// option A — make the function synchronous (preferred):
fn ${e.name}(...) intent: "pure" -> T {
  return compute(...)  // sync body, no await
}

// option B — remove the pure claim and keep async:
async fn ${e.name}(...) -> Promise<T> {
  return await compute(...)
}

// option C — sync body returning a resolved Promise (if callers need Promise<T>):
fn ${e.name}(...) intent: "pure" -> Promise<T> {
  return Promise.resolve(compute(...))  // sync, no timing side effect
}`})}}const lr=new Set(["random","time"]);function Z0(e,t,n,r,i,o,s,a=!1,l=!1,c=new Map,d=new Set,f=new Map,h=new Map,m=new Map,g=new Map,b,T=new Map,y=d){var D,I,L,z,W;if(i&&(((D=e.writes)==null?void 0:D.length)??0)>0){const H=Q("INT005"),K=e.intentStart,le=V(t,K),pe=e.writes.join(", ");s.push({code:"INT005",severity:"error",file:null,line:le.line,column:le.column,start:K,end:K+e.intent.length+2,message:`fn '${e.name}' intent claims 'idempotent' but declares writes { ${pe} } — a function that writes to a resource produces different side effects on each call, making it non-idempotent`,rule:H.rule,idiom:H.idiom,rewrite:`// option A — remove the writes declaration if the fn does not actually mutate:
fn ${e.name}(...) intent: "idempotent" -> ...

// option B — remove the idempotent intent claim:
fn ${e.name}(...) writes { ${pe} } -> ...`});return}const w=e.capabilities.filter(H=>lr.has(H));if(w.length>0){const H=Q("INT003"),K=e.intentStart,le=V(t,K),pe=w.join(", "),Ye=e.capabilities.join(", "),ve=e.capabilities.filter(te=>!lr.has(te)),Z=ve.length>0?` uses { ${ve.join(", ")} }`:"";s.push({code:"INT003",severity:"error",file:null,line:le.line,column:le.column,start:K,end:K+e.intent.length+2,message:`fn '${e.name}' intent claims 'idempotent' but declares uses { ${Ye} } — ${pe} produce${w.length===1?"s":""} different values on each call, making the function non-idempotent`,rule:H.rule,idiom:H.idiom,rewrite:`// option A — remove the non-idempotent capability (preserve other caps):
fn ${e.name}(...)${Z} intent: "idempotent" -> ...

// option B — remove the idempotent intent claim:
fn ${e.name}(...) uses { ${Ye} } -> ...`});return}const k=Ns(n,e,r,o),R=a?Ts(n,e,r,new Set(o.keys())):[],M=mh(n,e,r,k,H=>lr.has(H),a,R);if(M){const H=Q("INT004"),K=e.intentStart,le=V(t,K),pe=[...e.capabilities,M.capability].join(", ");s.push({code:"INT004",severity:"error",file:null,line:le.line,column:le.column,start:K,end:K+e.intent.length+2,message:`fn '${e.name}' declares intent: "idempotent" but body directly calls '${M.namespace}${M.accessOp}${M.member}' which produces a different value on each call — idempotent functions must be safe to retry with the same result`,rule:H.rule,idiom:H.idiom,rewrite:`// option A — remove the non-idempotent call from the body:
fn ${e.name}(...) intent: "idempotent" -> ...

// option B — declare the capability and remove the idempotent claim:
fn ${e.name}(...) uses { ${pe} } -> ...`})}if(l&&!M&&e.bodyTokenStart!==void 0&&f.size>0){const H=c.get(e)??[],K=Nt(n,e,H,d),le=Q("INT013"),pe=e.intentStart,Ye=V(t,pe),ve=new Set;for(const Z of K){if(ve.has(Z))continue;const te=f.get(Z);if(!te)continue;const se=te.filter(ye=>lr.has(ye));if(se.length===0)continue;ve.add(Z);const J=se.join(", ");s.push({code:"INT013",severity:"error",file:null,line:Ye.line,column:Ye.column,start:pe,end:pe+e.intent.length+2,message:`fn '${e.name}' intent claims 'idempotent' but calls '${Z}' which declares uses { ${J} } — a callee with non-idempotent capability makes the caller non-idempotent by transitivity; inject the callee's return value as a parameter, or remove the idempotent intent claim`,rule:le.rule,idiom:le.idiom,rewrite:`// option A — inject the computed value as a parameter (preferred):
fn ${e.name}(..., precomputed: T) intent: "idempotent" -> R {
  // use precomputed instead of calling '${Z}'
}

// option B — remove the idempotent intent claim:
fn ${e.name}(...) uses { ${J} } -> R {
  const v = ${Z}(...)
  return compute(v)
}`})}}if(l&&!M&&e.bodyTokenStart!==void 0&&h.size>0){const H=c.get(e)??[],K=Nt(n,e,H,d),le=Q("INT015"),pe=e.intentStart,Ye=V(t,pe),ve=new Set;for(const Z of K){if(ve.has(Z))continue;const te=h.get(Z);if(!te||te.length===0)continue;ve.add(Z);const se=te.join(", ");s.push({code:"INT015",severity:"error",file:null,line:Ye.line,column:Ye.column,start:pe,end:pe+e.intent.length+2,message:`fn '${e.name}' intent claims 'idempotent' but calls '${Z}' which declares writes { ${se} } — a callee that mutates a resource makes the caller non-idempotent by transitivity; move the write outside the idempotent boundary, or remove the idempotent intent claim`,rule:le.rule,idiom:le.idiom,rewrite:`// option A — split into an idempotent compute fn and a separate write fn:
fn ${e.name}(...) intent: "idempotent" -> T {
  return compute(...)  // no writes inside
}
// call ${Z} outside, after the idempotent step

// option B — remove the idempotent intent claim and declare writes on outer fn:
fn ${e.name}(...) writes { ${se} } -> R {
  return ${Z}(...)
}`})}}if(l&&!M&&!e.isAsync&&e.bodyTokenStart!==void 0&&m.size>0){const H=c.get(e)??[],K=Nt(n,e,H,d),le=Q("INT019"),pe=e.intentStart,Ye=V(t,pe),ve=new Set;for(const Z of K)ve.has(Z)||m.get(Z)&&(ve.add(Z),s.push({code:"INT019",severity:"error",file:null,line:Ye.line,column:Ye.column,start:pe,end:pe+e.intent.length+2,message:`fn '${e.name}' intent claims 'idempotent' but calls '${Z}' which is declared async — an async callee schedules microtasks on every invocation (a timing side effect) and returns a distinct Promise on every call, violating the idempotent guarantee by transitivity; make '${Z}' synchronous, inject its resolved value as a parameter, or remove the idempotent intent claim`,rule:le.rule,idiom:le.idiom,rewrite:`// option A — make the callee synchronous (preferred):
fn ${Z}(...) -> T = compute(...)

fn ${e.name}(...) intent: "idempotent" -> T = ${Z}(...)

// option B — inject the resolved value as a parameter:
fn ${e.name}(precomputed: T) intent: "idempotent" -> R {
  // use precomputed instead of calling '${Z}'
}

// call site: ${e.name}(await ${Z}(...))

// option C — remove the idempotent claim:
fn ${e.name}(...) -> R {
  const v = ${Z}(...)
  return compute(v)
}`}))}if(l&&!M&&(((I=e.throws)==null?void 0:I.length)??0)>0){const H=Q("INT022"),K=e.intentStart,le=V(t,K),pe=e.throws.join(", ");s.push({code:"INT022",severity:"error",file:null,line:le.line,column:le.column,start:K,end:K+e.intent.length+2,message:`fn '${e.name}' intent claims 'idempotent' but declares throws { ${pe} } — an idempotent fn must produce the same observable outcome on every call; declaring throws {} means the fn can propagate exceptions that may occur only on some retries, breaking the idempotent contract; use Result<T, ${pe}> to encode failure in the return type`,rule:H.rule,idiom:H.idiom,rewrite:`// option A — encode failure as Result (preferred for idempotent fns):
fn ${e.name}(...) intent: "idempotent" -> Result<T, ${pe}> {
  try {
    return ok(compute(...))
  } catch (e) {
    return err(new ${pe.split(",")[0].trim()}(e))
  }
}

// option B — remove the idempotent claim (keep throws {}):
fn ${e.name}(...) throws { ${pe} } -> T { ... }`});return}if(l&&!M&&e.bodyTokenStart!==void 0&&g.size>0){const H=c.get(e)??[],K=Tn(n,e,H,d),le=Q("INT023"),pe=e.intentStart,Ye=V(t,pe),ve=new Set;for(const Z of K){if(ve.has(Z))continue;const te=g.get(Z);if(!te||te.length===0)continue;ve.add(Z);const se=te.join(", ");s.push({code:"INT023",severity:"error",file:null,line:Ye.line,column:Ye.column,start:pe,end:pe+e.intent.length+2,message:`fn '${e.name}' intent claims 'idempotent' but calls '${Z}' which declares throws { ${se} } — a throwing callee can fail on some retries and succeed on others; the outer fn's observable outcome differs across calls, violating the idempotent contract by transitivity; wrap the call in try/catch converting to Result<T, E>, or remove the idempotent intent claim`,rule:le.rule,idiom:le.idiom,rewrite:`// option A — catch '${Z}'s exception and return Result (preferred):
fn ${e.name}(...) intent: "idempotent" -> Result<T, ${se}> {
  try {
    return ok(${Z}(...))
  } catch (e) {
    return err(new ${te[0]}(e))
  }
}

// option B — use a non-throwing variant (if one exists):
fn ${e.name}(...) intent: "idempotent" -> Result<T, ${se}> = ${Z}Safe(...)

// option C — remove the idempotent claim if exception propagation is intentional:
fn ${e.name}(...) throws { ${se} } -> T = ${Z}(...)`})}}if(l&&!M&&b&&e.bodyTokenStart!==void 0){const H=c.get(e)??[],K=Tn(n,e,H,y),le=Q("INT027"),pe=e.intentStart,Ye=V(t,pe),ve=new Set;for(const Z of K){if(ve.has(Z)||d.has(Z))continue;const te=T.get(Z)??Z,se=b[te];if(!((L=se==null?void 0:se.throws)!=null&&L.length))continue;ve.add(Z);const J=se.throws.join(", ");s.push({code:"INT027",severity:"error",file:null,line:Ye.line,column:Ye.column,start:pe,end:pe+e.intent.length+2,message:`fn '${e.name}' intent claims 'idempotent' but calls imported '${Z}' which declares throws { ${J} } — a throwing callee can fail on some retries and succeed on others; the outer fn's observable outcome differs across calls, violating the idempotent contract by transitivity; wrap the import call in try/catch converting to Result<T, E>, or remove the idempotent intent claim`,rule:le.rule,idiom:le.idiom,rewrite:`// option A — catch '${Z}'s exception and return Result (preferred):
fn ${e.name}(...) intent: "idempotent" -> Result<T, ${J}> {
  try {
    return ok(${Z}(...))
  } catch (e) {
    return err(new ${se.throws[0]}(e))
  }
}

// option B — use a non-throwing variant (if one exists):
fn ${e.name}(...) intent: "idempotent" -> Result<T, ${J}> = ${Z}Safe(...)

// option C — remove the idempotent claim if exception propagation is intentional:
fn ${e.name}(...) throws { ${J} } -> T = ${Z}(...)`})}}if(i&&!M&&b&&e.bodyTokenStart!==void 0){const H=c.get(e)??[],K=Nt(n,e,H,y),le=Q("INT030"),pe=e.intentStart,Ye=V(t,pe),ve=new Set;for(const Z of K){if(ve.has(Z)||d.has(Z))continue;const te=T.get(Z)??Z,se=b[te];if(!((z=se==null?void 0:se.writes)!=null&&z.length))continue;ve.add(Z);const J=se.writes.join(", ");s.push({code:"INT030",severity:"error",file:null,line:Ye.line,column:Ye.column,start:pe,end:pe+e.intent.length+2,message:`fn '${e.name}' intent claims 'idempotent' but calls imported '${Z}' which declares writes { ${J} } — a callee that mutates a resource makes the caller non-idempotent by transitivity; move the write outside the idempotent boundary, or remove the idempotent intent claim`,rule:le.rule,idiom:le.idiom,rewrite:`// option A — split into an idempotent compute fn and a separate write fn:
fn ${e.name}(...) intent: "idempotent" -> T {
  return compute(...)  // no writes inside
}
// call '${Z}' outside, after the idempotent step

// option B — remove the idempotent intent claim and declare writes on outer fn:
fn ${e.name}(...) writes { ${J} } -> R {
  return ${Z}(...)
}`})}}if(l&&!M&&b&&e.bodyTokenStart!==void 0){const H=c.get(e)??[],K=Nt(n,e,H,y),le=Q("INT031"),pe=e.intentStart,Ye=V(t,pe),ve=new Set;for(const Z of K){if(ve.has(Z)||d.has(Z))continue;const te=T.get(Z)??Z,se=b[te];if(!((W=se==null?void 0:se.capabilities)!=null&&W.length))continue;const J=se.capabilities.filter(Oe=>lr.has(Oe));if(J.length===0)continue;ve.add(Z);const ye=J.join(", ");s.push({code:"INT031",severity:"error",file:null,line:Ye.line,column:Ye.column,start:pe,end:pe+e.intent.length+2,message:`fn '${e.name}' intent claims 'idempotent' but calls imported '${Z}' which declares uses { ${ye} } — a callee with non-idempotent capability makes the caller non-idempotent by transitivity; inject the callee's return value as a parameter, or remove the idempotent intent claim`,rule:le.rule,idiom:le.idiom,rewrite:`// option A — inject the computed value as a parameter (preferred):
fn ${e.name}(..., precomputed: T) intent: "idempotent" -> R {
  // use precomputed instead of calling '${Z}'
}

// option B — remove the idempotent intent claim:
fn ${e.name}(...) uses { ${ye} } -> R {
  const v = ${Z}(...)
  return compute(v)
}`})}}if(l&&!M&&!e.isAsync&&b&&e.bodyTokenStart!==void 0){const H=c.get(e)??[],K=Nt(n,e,H,y),le=Q("INT033"),pe=e.intentStart,Ye=V(t,pe),ve=new Set;for(const Z of K){if(ve.has(Z)||d.has(Z))continue;const te=T.get(Z)??Z,se=b[te];se!=null&&se.isAsync&&(ve.add(Z),s.push({code:"INT033",severity:"error",file:null,line:Ye.line,column:Ye.column,start:pe,end:pe+e.intent.length+2,message:`fn '${e.name}' intent claims 'idempotent' but calls imported '${Z}' which is declared async — a synchronous idempotent fn cannot await the Promise; on retry the caller gets a fresh Promise, violating the idempotent contract by transitivity; inject the resolved value as a parameter, or remove the idempotent intent claim`,rule:le.rule,idiom:le.idiom,rewrite:`// option A — inject the resolved value as a parameter (preferred):
fn ${e.name}(..., resolvedValue: T) intent: "idempotent" -> R {
  // use resolvedValue instead of calling '${Z}'
}

// option B — remove the idempotent intent claim:
fn ${e.name}(...) -> Promise<R> {
  const v = ${Z}(...)
  return compute(v)
}`}))}}}function mh(e,t,n,r=new Map,i,o=!1,s=[]){const a=n.filter(l=>l!==t&&l.tokenStart>=t.tokenStart&&l.tokenEnd<=t.tokenEnd);for(let l=t.bodyTokenStart??t.tokenStart;l<t.tokenEnd;l++){if(J0(l,a))continue;const c=e[l];if(!c||c.kind!=="ident")continue;const f=(Yc(c.text,l,s)?void 0:r.get(c.text))??c.text,h=pi[f];if(!h||i&&!i(f))continue;const m=gh(e,l+1),g=e[m],b=(g==null?void 0:g.kind)==="punct"&&g.text===".",T=o&&(g==null?void 0:g.kind)==="questionDot";if(!b&&!T)continue;const y=ew(e,m)??"…";return{capability:h,namespace:c.text,member:y,accessOp:b?".":"?."}}return null}function J0(e,t){for(const n of t)if(e>=n.tokenStart&&e<n.tokenEnd)return!0;return!1}function gh(e,t){let n=t;for(;n<e.length;){const r=e[n];if(!r)return n;if(r.kind==="whitespace"||r.kind==="newline"||r.kind==="lineComment"||r.kind==="blockComment"){n++;continue}return n}return n}function ew(e,t){const n=gh(e,t+1),r=e[n];return r&&r.kind==="ident"?r.text:null}function yh(e){return new RegExp("(?<![a-zA-Z0-9_-])pure(?![a-zA-Z0-9_-])","i").test(e)}function wh(e){return new RegExp("(?<![a-zA-Z0-9_-])idempotent(?![a-zA-Z0-9_-])","i").test(e)}function bh(e){return new RegExp("(?<![a-zA-Z0-9_-])total(?![a-zA-Z0-9_-])","i").test(e)}function vh(e){return new RegExp("(?<![a-zA-Z0-9_-])infallible(?![a-zA-Z0-9_-])","i").test(e)}function tw(e,t,n,r,i,o,s,a=new Map,l,c=new Map,d=i){var b,T;if((((b=e.throws)==null?void 0:b.length)??0)>0){const y=Q("INT006"),w=e.intentStart,k=V(t,w),R=e.throws.join(", ");s.push({code:"INT006",severity:"error",file:null,line:k.line,column:k.column,start:w,end:w+e.intent.length+2,message:`fn '${e.name}' intent claims 'total' but declares throws { ${R} } — a total function handles all inputs without exception propagation; declaring throws {} means callers must catch, contradicting the total guarantee; use Result<T, ${R}> to encode failure in the return type instead`,rule:y.rule,idiom:y.idiom,rewrite:`// option A — remove throws {} and return Result (preferred for total fns):
fn ${e.name}(...) intent: "total" -> Result<type, ${R}> { ... }

// option B — remove the total intent claim (keep throws {}):
fn ${e.name}(...) throws { ${R} } -> type { ... }`});return}if(e.bodyTokenStart===void 0)return;const f=e.intentStart,h=V(t,f),m=r.get(e)??[],g=Tn(n,e,m,i);if(o.size>0){const y=Q("INT007"),w=new Set;for(const k of g){if(w.has(k))continue;const R=o.get(k);if(!R||R.length===0)continue;w.add(k);const M=R.join(", ");s.push({code:"INT007",severity:"error",file:null,line:h.line,column:h.column,start:f,end:f+e.intent.length+2,message:`fn '${e.name}' intent claims 'total' but calls '${k}' which declares throws { ${M} } — a total function must handle all error paths; catch '${k}'s exception or use a non-throwing variant`,rule:y.rule,idiom:y.idiom,rewrite:`// option A — catch '${k}'s exception and convert to Result:
fn ${e.name}(...) intent: "total" -> Result<T, ${M}> {
  try {
    const v = ${k}(...)
    return ok(v)
  } catch (e) {
    return err(new ${R[0]}(e))
  }
}

// option B — remove the total intent claim:
fn ${e.name}(...) throws { ${M} } -> T {
  return ${k}(...)
}`})}}if(!e.isAsync&&a.size>0){const y=Q("INT020"),w=new Set;for(const k of g)w.has(k)||a.get(k)&&(w.add(k),s.push({code:"INT020",severity:"error",file:null,line:h.line,column:h.column,start:f,end:f+e.intent.length+2,message:`fn '${e.name}' intent claims 'total' but calls '${k}' which is declared async — an async callee returns a Promise that can reject; a sync total fn forwarding that Promise cannot catch the rejection, so it escapes the fn boundary as an uncaught exception, contradicting the total guarantee; use a synchronous callee or remove the total intent claim`,rule:y.rule,idiom:y.idiom,rewrite:`// option A — use a synchronous callee (preferred):
fn ${k}(...) -> T = compute(...)

fn ${e.name}(...) intent: "total" -> T = ${k}(...)

// option B — remove the total intent claim:
fn ${e.name}(...) -> Promise<T> = ${k}(...)`}))}if(l&&e.bodyTokenStart!==void 0){const y=r.get(e)??[],w=Tn(n,e,y,d),k=Q("INT025"),R=e.intentStart,M=V(t,R),D=new Set;for(const I of w){if(D.has(I)||i.has(I))continue;const L=c.get(I)??I,z=l[L];if(!((T=z==null?void 0:z.throws)!=null&&T.length))continue;D.add(I);const W=z.throws.join(", ");s.push({code:"INT025",severity:"error",file:null,line:M.line,column:M.column,start:R,end:R+e.intent.length+2,message:`fn '${e.name}' intent claims 'total' but calls imported '${I}' which declares throws { ${W} } — a total function may never propagate exceptions; calling an imported throwing callee reopens the exception channel; wrap the import call in try/catch returning Result<T, E>, or remove the total intent claim`,rule:k.rule,idiom:k.idiom,rewrite:`// option A — catch the exception and return Result (preferred):
fn ${e.name}(...) intent: "total" -> Result<T, ${W}> {
  try {
    return ok(${I}(...))
  } catch (e) {
    return err(new ${z.throws[0]}(e))
  }
}

// option B — remove the total claim:
fn ${e.name}(...) throws { ${W} } -> T {
  return ${I}(...)
}`})}}if(!e.isAsync&&l&&e.bodyTokenStart!==void 0){const y=r.get(e)??[],w=Nt(n,e,y,d),k=Q("INT034"),R=e.intentStart,M=V(t,R),D=new Set;for(const I of w){if(D.has(I)||i.has(I))continue;const L=c.get(I)??I,z=l[L];z!=null&&z.isAsync&&(D.add(I),s.push({code:"INT034",severity:"error",file:null,line:M.line,column:M.column,start:R,end:R+e.intent.length+2,message:`fn '${e.name}' intent claims 'total' but calls imported '${I}' which is declared async — an async callee returns a Promise that can reject; a sync total fn forwarding that Promise cannot catch the rejection, so it escapes the fn boundary as an uncaught exception, contradicting the total guarantee; use a synchronous callee or remove the total intent claim`,rule:k.rule,idiom:k.idiom,rewrite:`// option A — use a synchronous callee (preferred):
fn ${e.name}(...) intent: "total" -> T = ${I}Sync(...)

// option B — inject the resolved value as a parameter:
fn ${e.name}(..., precomputed: T) intent: "total" -> R {
  // use precomputed instead of calling '${I}'
}

// option C — remove the total intent claim:
fn ${e.name}(...) -> Promise<T> = ${I}(...)`}))}}}function nw(e,t,n,r,i,o,s,a=new Map,l,c=new Map,d=i){var w,k;const f=e.intentStart,h=V(t,f),m=f+e.intent.length+2,g=e.returnType;if(g.includes("Result<")||g.includes("Option<")){const R=Q("INT008"),M=g.includes("Result<")?"Result<>":"Option<>";s.push({code:"INT008",severity:"error",file:null,line:h.line,column:h.column,start:f,end:m,message:`fn '${e.name}' intent claims 'infallible' but return type is '${g.trim()}' — ${M} exposes a failure arm that callers must handle, contradicting the infallible guarantee; use a plain return type, or downgrade to intent: "total" which allows failure in the return type`,rule:R.rule,idiom:R.idiom,rewrite:`// option A — plain return type (fn truly never fails):
fn ${e.name}(...) intent: "infallible" -> T { ... }

// option B — downgrade to total (fn may fail but always returns):
fn ${e.name}(...) intent: "total" -> ${g.trim()} { ... }`})}if((((w=e.throws)==null?void 0:w.length)??0)>0){const R=Q("INT009"),M=e.throws.join(", ");s.push({code:"INT009",severity:"error",file:null,line:h.line,column:h.column,start:f,end:m,message:`fn '${e.name}' intent claims 'infallible' but declares throws { ${M} } — throwing propagates a failure outside the fn's boundary, contradicting the infallible guarantee; encode failure in Result<T, E> and downgrade to intent: "total", or remove throws {} if the fn won't throw`,rule:R.rule,idiom:R.idiom,rewrite:`// option A — remove throws {} and return Result (downgrade to total):
fn ${e.name}(...) intent: "total" -> Result<type, ${M}> { ... }

// option B — remove throws {} if the fn truly won't propagate exceptions:
fn ${e.name}(...) intent: "infallible" -> type { ... }`});return}if(e.bodyTokenStart===void 0)return;const b=r.get(e)??[],T=Nt(n,e,b,i),y=Tn(n,e,b,i);if(o.size>0){const R=Q("INT010"),M=new Set;for(const D of y){if(M.has(D))continue;const I=o.get(D);if(!I||I.length===0)continue;M.add(D);const L=I.join(", ");s.push({code:"INT010",severity:"error",file:null,line:h.line,column:h.column,start:f,end:m,message:`fn '${e.name}' intent claims 'infallible' but calls '${D}' which declares throws { ${L} } — a throwing callee can propagate an exception through the infallible fn, reopening the failure channel; catch '${D}'s exception (suppress or encode in Result) or use a non-throwing variant`,rule:R.rule,idiom:R.idiom,rewrite:`// option A — catch and suppress, keep infallible:
fn ${e.name}(...) intent: "infallible" -> T {
  try {
    return ${D}(...)
  } catch {
    return defaultValue
  }
}

// option B — encode in Result, downgrade to total:
fn ${e.name}(...) intent: "total" -> Result<T, ${L}> {
  try {
    return ok(${D}(...))
  } catch (e) {
    return err(new ${I[0]}(e))
  }
}`})}}if(!e.isAsync&&a.size>0){const R=Q("INT021"),M=new Set;for(const D of T)M.has(D)||a.get(D)&&(M.add(D),s.push({code:"INT021",severity:"error",file:null,line:h.line,column:h.column,start:f,end:m,message:`fn '${e.name}' intent claims 'infallible' but calls '${D}' which is declared async — an async callee returns a Promise that can reject; a sync infallible fn forwarding that Promise cannot catch the rejection, so it escapes the fn boundary as an uncaught exception, violating the infallible guarantee that the fn never fails; use a synchronous callee or downgrade to intent: "total"`,rule:R.rule,idiom:R.idiom,rewrite:`// option A — use a synchronous callee (preferred):
fn ${D}(...) -> T = compute(...)

fn ${e.name}(...) intent: "infallible" -> T = ${D}(...)

// option B — downgrade intent claim:
fn ${e.name}(...) intent: "total" -> Promise<T> = ${D}(...)`}))}if(l&&e.bodyTokenStart!==void 0){const R=r.get(e)??[],M=Tn(n,e,R,d),D=Q("INT026"),I=new Set;for(const L of M){if(I.has(L)||i.has(L))continue;const z=c.get(L)??L,W=l[z];if(!((k=W==null?void 0:W.throws)!=null&&k.length))continue;I.add(L);const H=W.throws.join(", ");s.push({code:"INT026",severity:"error",file:null,line:h.line,column:h.column,start:f,end:m,message:`fn '${e.name}' intent claims 'infallible' but calls imported '${L}' which declares throws { ${H} } — an infallible fn must never fail; calling an imported throwing callee violates the no-failure guarantee; wrap the import call in try/catch and downgrade to intent: "total", or use a non-throwing variant`,rule:D.rule,idiom:D.idiom,rewrite:`// option A — catch exception and downgrade to total (preferred):
fn ${e.name}(...) intent: "total" -> Result<T, ${H}> {
  try {
    return ok(${L}(...))
  } catch (e) {
    return err(new ${W.throws[0]}(e))
  }
}

// option B — use a non-throwing variant (preserve infallible):
fn ${e.name}(...) intent: "infallible" -> T = ${L}Safe(...)

// option C — remove the infallible claim:
fn ${e.name}(...) throws { ${H} } -> T = ${L}(...)`})}}if(!e.isAsync&&l&&e.bodyTokenStart!==void 0){const R=r.get(e)??[],M=Nt(n,e,R,d),D=Q("INT035"),I=e.intentStart,L=V(t,I),z=new Set;for(const W of M){if(z.has(W)||i.has(W))continue;const H=c.get(W)??W,K=l[H];K!=null&&K.isAsync&&(z.add(W),s.push({code:"INT035",severity:"error",file:null,line:L.line,column:L.column,start:I,end:I+e.intent.length+2,message:`fn '${e.name}' intent claims 'infallible' but calls imported '${W}' which is declared async — an async callee returns a Promise that can reject; a sync infallible fn forwarding that Promise cannot catch the rejection, so it escapes as an uncaught exception, violating the infallible guarantee that the fn never fails; use a synchronous callee or downgrade to intent: "total"`,rule:D.rule,idiom:D.idiom,rewrite:`// option A — use a synchronous callee (preferred):
fn ${e.name}(...) intent: "infallible" -> T = ${W}Sync(...)

// option B — downgrade intent claim:
fn ${e.name}(...) intent: "total" -> Promise<T> = ${W}(...)

// option C — inject the resolved value as a parameter:
fn ${e.name}(..., precomputed: T) intent: "infallible" -> R {
  // use precomputed instead of calling '${W}'
}`}))}}}function iw(e,t,n){const r=e.intent,i=e.intentStart,o=V(t,i),s=i+r.length+2,a=Q("INT014"),l=yh(r),c=wh(r),d=bh(r),f=vh(r);l&&c&&n.push({code:"INT014",severity:"error",file:null,line:o.line,column:o.column,start:i,end:s,message:`fn '${e.name}' intent: "${r}" — 'idempotent' claim is redundant: 'pure' already implies it (pure bans all uses, which is strictly stronger than idempotent's ban on random and time); remove 'idempotent' and keep 'pure'`,rule:a.rule,idiom:a.idiom,rewrite:`// remove the weaker 'idempotent' claim — 'pure' already guarantees it:
fn ${e.name}(...) intent: "pure" -> T = ...`}),f&&d&&n.push({code:"INT014",severity:"error",file:null,line:o.line,column:o.column,start:i,end:s,message:`fn '${e.name}' intent: "${r}" — 'total' claim is redundant: 'infallible' already implies it (infallible is total plus a no-Result-return constraint; the no-throws guarantee of total is a strict subset); remove 'total' and keep 'infallible'`,rule:a.rule,idiom:a.idiom,rewrite:`// remove the weaker 'total' claim — 'infallible' already guarantees it:
fn ${e.name}(...) intent: "infallible" -> T = ...`})}function rw(e,t){if(!Ue(t.resolved,"0.8"))return{code:e,warnings:[]};const n=Xt(e,{allowGenerics:!0}),{tokens:r}=n,i=[],o=Xi(r),s=s0(r,o);if(s.length>0){const d=Q("ALI001");for(const f of s){const h=V(e,f.start);i.push({code:"ALI001",severity:"warning",file:null,line:h.line,column:h.column,start:f.start,end:f.end,message:`stdlib namespace '${f.stdlibName}' assigned via a non-trivial expression — static alias tracking is not guaranteed; use a direct binding (\`const ${f.name} = ${f.stdlibName}\`) or reference '${f.stdlibName}' directly`,rule:d.rule,idiom:d.idiom,rewrite:d.rewrite})}}const a=l0(r,o);if(a.length>0){const d=Q("ALI002");for(const f of a){const h=V(e,f.start);i.push({code:"ALI002",severity:"warning",file:null,line:h.line,column:h.column,start:f.start,end:f.end,message:`'${f.name}' is an alias of tracked alias '${f.aliasName}' (→ '${f.stdlibName}') — chain aliases are not tracked; use a direct binding (\`const ${f.name} = ${f.stdlibName}\`) or the canonical namespace name directly`,rule:d.rule,idiom:d.idiom,rewrite:d.rewrite})}}const l=Ue(t.resolved,"0.9"),c=a0(r,o);if(c.length>0){const d=Q("ALI003"),f=[];for(const h of c){const m=V(e,h.start);f.push({code:"ALI003",severity:l?"error":"warning",file:null,line:m.line,column:m.column,start:h.start,end:h.end,message:`destructuring '${h.stdlibName}' extracts member references that static checks won't follow — use a direct binding (\`const t = ${h.stdlibName}\`) or the canonical namespace name directly`,rule:d.rule,idiom:d.idiom,rewrite:d.rewrite})}if(l)throw new Qe(f);i.push(...f)}return{code:e,warnings:i}}const ow=new Set(Object.keys(pi));function sw(e,t){if(!Ue(t.resolved,"0.9"))return e;const n=Ue(t.resolved,"0.4"),r=Xt(e,{allowGenerics:n,includeNestedFns:!0}),i=r.tokens,o=r.fns.map(d=>d.decl);if(o.length===0)return e;const s=ch(i);for(const d of o)d.unsafeReason!==void 0&&s.push({start:d.body.start,end:d.body.end});const a=Xi(i),l=Qr(o),c=[];for(const d of o){const f=l.get(d)??[],h=Ns(i,d,o,a),m=Ts(i,d,o,new Set(a.keys())),g=[];let b=0;for(let T=d.bodyTokenStart??d.tokenStart;T<d.tokenEnd;T++){for(;g.length>0&&g[g.length-1].tokenEnd<=T;)g.pop();for(;b<f.length&&f[b].tokenStart<=T;)g.push(f[b]),b++;if(g.length>0)continue;const y=i[T];if(!y||y.kind!=="ident")continue;const k=(Yc(y.text,T,m)?void 0:h.get(y.text))??y.text;if(!ow.has(k))continue;const R=v(i,T+1),M=i[R];if(!M||!(M.kind==="punct"&&M.text==="."||M.kind==="questionDot"))continue;const D=v(i,R+1),I=i[D];if(!I||I.kind!=="ident")continue;const L=v(i,D+1),z=i[L];if(!z||z.kind!=="open"||z.text!=="("||me(y.start,s)||lw(i,T,z.matchedAt)||aw(i,T))continue;const W=Q("UNS005"),H=V(e,y.start),K=y.text,le=I.text,Ye=M.kind==="questionDot"?"?.":".",ve=`${K}${Ye}${le}`,Z=z.matchedAt!==void 0?i[z.matchedAt]:void 0;c.push({code:"UNS005",severity:"error",file:null,line:H.line,column:H.column,start:y.start,end:(Z==null?void 0:Z.end)??I.end,message:`'${ve}(...)' is an external call with no declared result contract — the return value may be structurally typed but semantically incorrect`,rule:W.rule,idiom:W.idiom,rewrite:`// option A — match on the result (handles both ok and err):
match ${ve}(...) {
  ok { value } -> { /* use value */ }
  err { error } -> { /* handle error */ }
}

// option B — accept the uncertainty with a written reason:
unsafe "I know what ${ve} returns here" { ${ve}(...) }`})}}if(c.length>0)throw new Qe(c);return e}function vd(e){return e==="whitespace"||e==="newline"||e==="lineComment"||e==="blockComment"}function aw(e,t){var i;let n=t-1;for(;n>=0;){const o=e[n];if(vd(o.kind)){n--;continue}if(o.kind==="ident"){n--;continue}if(o.kind==="punct"&&o.text==="."){n--;continue}if(o.kind==="questionDot"){n--;continue}if(o.kind==="open"&&o.text==="("){n--;continue}if(o.kind==="close"&&o.text===")"){n--;continue}break}if(n<0||((i=e[n])==null?void 0:i.kind)!=="string")return!1;for(n--;n>=0&&vd(e[n].kind);)n--;const r=e[n];return!!(r&&r.kind==="keyword"&&r.keyword==="unsafe")}function lw(e,t,n){let r=t-1;for(;r>=0;){const o=e[r];if(!o){r--;continue}if(o.kind==="whitespace"||o.kind==="newline"||o.kind==="lineComment"||o.kind==="blockComment"){r--;continue}if(o.kind==="ident"&&o.text==="await"){r--;continue}if(o.kind==="open"&&o.text==="("){r--;continue}if(!(o.kind==="keyword"&&o.keyword==="match"))return!1;break}if(r<0)return!1;if(n===void 0)return!0;let i=n+1;for(;i<e.length;){const o=e[i];if(!o){i++;continue}if(o.kind==="whitespace"||o.kind==="newline"||o.kind==="lineComment"||o.kind==="blockComment"){i++;continue}if(o.kind==="close"&&o.text===")"){i++;continue}return o.kind==="open"&&o.text==="{"}return!1}const cw=new Set([...Object.keys(pi),"as","throw","console","eval","Function","process","fetch","WebSocket","Worker","SharedWorker","crypto","navigator"]);function uw(e,t){if(!Ue(t.resolved,"0.9"))return e;const n=Ze(e),r=[],i=Q("UNS008");for(let o=0;o<n.length;o++){const s=n[o];if(!s||s.kind!=="keyword"||s.keyword!=="unsafe")continue;const a=v(n,o+1),l=n[a];if(!l||l.kind!=="string")continue;const c=v(n,a+1),d=n[c];if(!d||d.kind==="keyword"&&d.keyword==="fn")continue;if(d.kind==="keyword"&&d.keyword==="async"){const b=v(n,c+1),T=n[b];if(T&&T.kind==="keyword"&&T.keyword==="fn")continue}if(!d||d.kind!=="open"||d.text!=="{"||d.matchedAt===void 0)continue;const f=d.matchedAt,h=c+1,m=dw(n,h,f);if(m==="no-ident")continue;if(m==="has-bypass"){o=f;continue}const g=V(e,s.start);r.push({code:"UNS008",severity:"error",file:null,line:g.line,column:g.column,start:s.start,end:n[f].end,message:"unsafe block body has no cast, capability call, or bypass pattern — the escape hatch is unnecessary; remove the `unsafe` wrapper",rule:i.rule,idiom:i.idiom,rewrite:i.rewrite}),o=f}if(r.length>0)throw new Qe(r);return e}function dw(e,t,n){let r=!1;for(let i=t;i<n;i++){const o=e[i];if(!o)continue;if(o.kind==="keyword"){r=!0;continue}if(o.kind!=="ident")continue;if(r=!0,cw.has(o.text))return"has-bypass";const s=v(e,i+1),a=e[s];if(a&&a.kind==="open"&&a.text==="(")return"has-bypass"}return r?"decay-stale":"no-ident"}const fw=new Set(["todo","legacy","temp","temporary","workaround","fixme","hack","ignore","wip","fix","xxx"]);function pw(e){if(e.length<2)return!0;const t=e.slice(1,-1).trim();return t.length===0?!0:fw.has(t.toLowerCase())}function hw(e,t){if(!Ue(t.resolved,"0.9"))return e;const n=Ze(e),r=[],i=Q("UNS009");for(let o=0;o<n.length;o++){const s=n[o];if(!s||s.kind!=="keyword"||s.text!=="unsafe")continue;const a=v(n,o+1),l=n[a];if(!l||l.kind!=="string"||!pw(l.text))continue;const c=V(e,s.start),d=l.text.slice(1,-1).trim(),f=d.length===0?"(empty)":JSON.stringify(d);r.push({code:"UNS009",severity:"error",file:null,line:c.line,column:c.column,start:s.start,end:l.end,message:`unsafe reason string ${f} is too weak — describe what the bypass does and why it is necessary`,rule:i.rule,idiom:i.idiom,rewrite:i.rewrite})}if(r.length>0)throw new Qe(r);return e}const mw=new Set(Object.keys(pi));function gw(e,t){if(!Ue(t.resolved,"0.9"))return e;const n=Ze(e),r=[],i=Q("UNS007");for(let o=0;o<n.length;o++){const s=n[o];if(!s||s.kind!=="keyword"||s.keyword!=="unsafe")continue;const a=v(n,o+1),l=n[a];if(!l||l.kind!=="string")continue;const c=v(n,a+1),d=n[c];if(!d||d.kind==="keyword"&&d.keyword==="fn")continue;if(d.kind==="keyword"&&d.keyword==="async"){const b=v(n,c+1),T=n[b];if(T&&T.kind==="keyword"&&T.keyword==="fn")continue}if(!d||d.kind!=="open"||d.text!=="{"||d.matchedAt===void 0)continue;const f=d.matchedAt,h=c+1;let m=!1,g=!1;for(let b=h;b<f;b++){const T=n[b];if(T){if(T.kind==="ident"){if(m=!0,T.text==="as"&&ww(n,b)){g=!0;break}if(mw.has(T.text)){const y=v(n,b+1),w=n[y];if(w&&(w.kind==="punct"&&w.text==="."||w.kind==="questionDot")){const k=v(n,y+1),R=n[k];if(R&&R.kind==="ident"){const M=v(n,k+1),D=n[M];if(D&&D.kind==="open"&&D.text==="("){g=!0;break}}}}}T.kind==="open"&&T.text==="{"&&T.matchedAt!==void 0&&(b=T.matchedAt)}}if(!g&&!m){const b=V(e,s.start);r.push({code:"UNS007",severity:"error",file:null,line:b.line,column:b.column,start:s.start,end:n[f].end,message:"unsafe block body contains no `as` cast or stdlib capability call — the escape hatch is no longer needed; remove the `unsafe` wrapper",rule:(i==null?void 0:i.rule)??"",idiom:(i==null?void 0:i.idiom)??"",rewrite:(i==null?void 0:i.rewrite)??""})}o=f}if(r.length>0)throw new Qe(r);return e}function yw(e){return e==="whitespace"||e==="newline"||e==="lineComment"||e==="blockComment"}function ww(e,t){let n=t-1;for(;n>=0&&yw(e[n].kind);)n--;if(n<0)return!1;const r=v(e,t+1);if(r<0||r>=e.length)return!1;const i=e[r];return i?i.kind==="ident"||i.kind==="open"&&(i.text==="{"||i.text==="["||i.text==="("):!1}const bw=["@ts-ignore","@ts-expect-error"];function vw(e){const t=Ze(e),n=[],r=Q("UNS006");for(const i of t)if(!(i.kind!=="lineComment"&&i.kind!=="blockComment"))for(const o of bw){if(!i.text.includes(o))continue;const s=V(e,i.start);n.push({code:"UNS006",severity:"error",file:null,line:s.line,column:s.column,start:i.start,end:i.end,message:`\`${o}\` suppression comment bypasses TypeScript type checking — fix the underlying type error, or wrap the statement in \`unsafe "<reason>" { ... }\` to make the escape hatch explicit`,rule:(r==null?void 0:r.rule)??"",idiom:(r==null?void 0:r.idiom)??"",rewrite:(r==null?void 0:r.rewrite)??""});break}if(n.length>0)throw new Qe(n);return e}function kh(e,t){let n=t+1;n=ei(e,n);let r,i;const o=e[n];if(!o)return null;if(o.kind==="open"&&o.text==="("&&o.matchedAt!==void 0){const s=o.matchedAt;r=Al(e,n+1,s).trim(),i=s+1}else{let s=n;for(;s<e.length;){const a=e[s];if(a.kind==="eof")return null;if(a.kind==="open"&&(a.text==="("||a.text==="[")){if(a.matchedAt===void 0)return null;s=a.matchedAt+1;continue}if(a.kind==="open"&&a.text==="{")return r=Al(e,n,s).trim(),i=s,kd(e,r,i,t);s++}return null}return kd(e,r,i,t)}function kd(e,t,n,r){var c,d,f;let i=ei(e,n);const o=e[i];if(!o||o.kind!=="open"||o.text!=="{"||o.matchedAt===void 0)return null;const s=o.matchedAt,a=[];let l=i+1;for(;l<s&&(l=ei(e,l),!(l>=s));){const h=kw(e,l);if(!h||(l=h.end,l=ei(e,l),((c=e[l])==null?void 0:c.kind)!=="arrow"))return null;l++,l=ei(e,l);const m=l;for(;l<s;){const b=e[l];if(b.kind==="open"&&b.matchedAt!==void 0){l=b.matchedAt+1;continue}if(b.kind==="punct"&&b.text===";"||b.kind==="newline")break;l++}const g=Al(e,m,l).trim();a.push({pattern:h.pattern,body:g,bodyStartToken:m}),((d=e[l])==null?void 0:d.kind)==="punct"&&((f=e[l])==null?void 0:f.text)===";"&&l++,l=ei(e,l)}return a.length===0?null:{start:r,end:s+1,scrutinee:t,arms:a}}function kw(e,t){var i,o;let n=t;const r=e[n];if(!r)return null;if(r.kind==="ident"&&r.text==="_")return{pattern:{kind:"wildcard"},end:n+1};if(r.kind==="string")return{pattern:{kind:"literal",value:r.text},end:n+1};if(r.kind==="number")return{pattern:{kind:"literal",value:r.text},end:n+1};if(r.kind==="ident"&&(r.text==="true"||r.text==="false"||r.text==="null"))return{pattern:{kind:"literal",value:r.text},end:n+1};if(r.kind==="ident"){const s=r.text;let a=n+1;a=ei(e,a);let l=[];if(((i=e[a])==null?void 0:i.kind)==="open"&&((o=e[a])==null?void 0:o.text)==="{"){const c=e[a];if(c.matchedAt===void 0)return null;const d=c.matchedAt;for(let f=a+1;f<d;f++){const h=e[f];h.kind==="ident"&&l.push(h.text)}a=d+1}return{pattern:{kind:"tag",tag:s,binds:l},end:a}}return null}function ei(e,t){for(;t<e.length;){const n=e[t];if(n.kind==="whitespace"||n.kind==="newline"||n.kind==="lineComment"||n.kind==="blockComment"){t++;continue}return t}return t}function Al(e,t,n){let r="";for(let i=t;i<n;i++){const o=e[i];if(!o)break;r+=o.text}return r}function xw(e){var i;const t=Ze(e);let n="",r=0;for(let o=0;o<t.length;o++){const s=t[o];if(s.kind!=="keyword"||s.keyword!=="match")continue;const a=kh(t,o);if(!a)continue;n+=e.slice(r,t[a.start].start),n+=Sw(a);const l=t[a.end-1];r=l?l.end:((i=t[a.end])==null?void 0:i.start)??r,o=a.end-1}return n+=e.slice(r),n}function Sw(e){const t=e.arms.map(n=>{const r=Nw(n.pattern),i=Tw(n.pattern,n.body);return`  [${r}, ${i}]`});return`$match(${e.scrutinee}, [
${t.join(`,
`)},
])`}function Nw(e){switch(e.kind){case"wildcard":return"$wildcard()";case"literal":return`$literalMatch(${e.value})`;case"tag":return`$tagMatch(${JSON.stringify(e.tag)}, [${e.binds.map(t=>JSON.stringify(t)).join(", ")}])`}}function Tw(e,t){const n=e.kind==="tag"&&e.binds.length>0?`({ ${e.binds.join(", ")} }: any)`:"()",r=$w(t);if(r!==null){const i=Ss(r);return`${n} => { ${i} }`}return`${n} => (${t})`}function $w(e){const t=e.trim();if(t.length<2||t[0]!=="{"||t[t.length-1]!=="}")return null;const n=Ze(t);let r=0;for(;r<n.length&&xd(n[r]);)r++;const i=n[r];if(!i||i.kind!=="open"||i.text!=="{")return null;let o=n.length-1;for(;o>=0&&(xd(n[o])||n[o].kind==="eof");)o--;const s=n[o];return!s||s.kind!=="close"||s.text!=="}"||i.matchedAt!==o?null:t.slice(i.end,s.start)}function xd(e){return e.kind==="whitespace"||e.kind==="newline"||e.kind==="lineComment"||e.kind==="blockComment"}function Yw(e){const t=Ze(e);let n="",r=0;for(let i=0;i<t.length;i++){const o=t[i];if(!o||o.kind!=="ident"||o.text!=="type"||!Cw(t,i))continue;const s=xh(t,i);if(!s)continue;const a=Sh(t,s.rhsStart,s.rhsEnd);!a||!Nh(a)||(n+=e.slice(r,t[s.rhsStart].start),n+=a.map(l=>{var d;const c=((d=l.body)==null?void 0:d.trim())??"";return`{ kind: "${l.tag}"${c?`; ${c}`:""} }`}).join(" | "),r=t[s.rhsEnd].start,i=s.rhsEnd-1)}return n+=e.slice(r),n}function Cw(e,t){for(let n=t-1;n>=0;n--){const r=e[n];if(r&&!(r.kind==="whitespace"||r.kind==="newline"||r.kind==="lineComment"||r.kind==="blockComment"))return r.kind==="punct"&&(r.text===";"||r.text===":")||r.kind==="open"&&(r.text==="{"||r.text==="(")||r.kind==="close"&&r.text==="}"||r.kind==="ident"&&r.text==="export"}return!0}function xh(e,t){let n=t+1;n=nn(e,n);const r=e[n];if(!r||r.kind!=="ident")return null;n++;let i=-1;for(;n<e.length;){const a=e[n];if(!a||a.kind==="eof")break;if(a.kind==="open"&&a.matchedAt!==void 0){n=a.matchedAt+1;continue}if(a.kind==="eq"){i=n;break}n++}if(i===-1)return null;const o=nn(e,i+1);let s=o;for(;s<e.length;){const a=e[s];if(!a||a.kind==="eof")break;if(a.kind==="open"&&a.matchedAt!==void 0){s=a.matchedAt+1;continue}if(a.kind==="punct"&&a.text===";")break;if(a.kind==="newline"){const l=nn(e,s+1),c=e[l];if((c==null?void 0:c.kind)==="operator"&&c.text==="|"){s++;continue}break}s++}return{start:t,end:s,eq:i,rhsStart:o,rhsEnd:s}}function Sh(e,t,n){var o,s;const r=[];let i=nn(e,t);for(i<n&&((o=e[i])==null?void 0:o.kind)==="operator"&&((s=e[i])==null?void 0:s.text)==="|"&&(i=nn(e,i+1));i<n;){const a=e[i];if(!a||a.kind!=="ident")return null;const l=a.text;i=nn(e,i+1);let c=null,d=!1,f=!1;const h=e[i];(h==null?void 0:h.kind)==="ident"&&h.text==="halt"?(d=!0,i=nn(e,i+1)):(h==null?void 0:h.kind)==="ident"&&h.text==="distinct"&&(f=!0,i=nn(e,i+1));const m=e[i];if((m==null?void 0:m.kind)==="open"&&m.text==="{"&&m.matchedAt!==void 0&&(c=Iw(e,i+1,m.matchedAt),i=m.matchedAt+1),r.push({tag:l,body:c,halt:d,distinct:f}),i=nn(e,i),i>=n)break;const g=e[i];if((g==null?void 0:g.kind)==="operator"&&g.text==="|"){i=nn(e,i+1);continue}return null}return r.length>0?r:null}function Nh(e){return e.length===0?!1:e.some(t=>t.body!==null||t.halt||t.distinct)}function nn(e,t){for(;t<e.length;){const n=e[t];if(!n)return t;if(n.kind==="whitespace"||n.kind==="newline"||n.kind==="lineComment"||n.kind==="blockComment"){t++;continue}return t}return t}function Iw(e,t,n){let r="";for(let i=t;i<n;i++){const o=e[i];if(!o)break;r+=o.text}return r}function Aw(e){const t=new Map;let n=0;for(let r=0;r<e.length;r++){const i=e[r];if(!i)continue;if(i.kind==="open"&&i.text==="{"){n++;continue}if(i.kind==="close"&&i.text==="}"){n>0&&n--;continue}if(n!==0||i.kind!=="ident"||i.text!=="type")continue;const o=xh(e,r);if(!o)continue;const s=Sh(e,o.rhsStart,o.rhsEnd);if(!s||!Nh(s))continue;const a=nn(e,r+1),l=e[a];!l||l.kind!=="ident"||(t.set(l.text,s),r=o.end)}return t}const Sd=new Set(["ok","err","some","none"]);function Rw(e,t){let n=0;for(let r=t.end-2;r>=t.start;r--){const i=e[r];if(!i)continue;if(i.kind==="close"&&i.text==="}"){n++;continue}if(i.kind==="open"&&i.text==="{"){n--;continue}if(n!==0||i.kind!=="ident"||i.text!=="_")continue;const o=v(e,r+1),s=e[o];if(s&&s.kind==="arrow")return r}return t.start}function Ew(e,t){if(!Ue(t.resolved,"0.9"))return e;const n=Ze(e),r=Q("MAT001"),i=Q("MAT002"),o=Q("MAT003"),s=Q("MAT004"),a=Q("MAT005"),l=Q("MAT006"),c=Aw(n),d=[];for(let f=0;f<n.length;f++){const h=n[f];if(h.kind!=="keyword"||h.keyword!=="match")continue;const m=kh(n,f);if(!m)continue;let g=!1,b=!1,T=!1,y=!1,w=!1,k=!1;const R=[],M=m.arms[m.arms.length-1],D=(M==null?void 0:M.pattern.kind)==="wildcard";for(const J of m.arms){if(J.pattern.kind==="wildcard"){w=!0;continue}if(J.pattern.kind==="tag"){const ye=J.pattern.tag;ye==="ok"&&(g=!0),ye==="err"&&(b=!0),ye==="some"&&(T=!0),ye==="none"&&(y=!0),R.push(ye),!/^[A-Z]/.test(ye)&&!Sd.has(ye)&&(k=!0)}else k=!0}const I=n[m.start].start;if((g||b)&&!(g&&b)){if(w)continue;const{line:J,column:ye}=V(e,I),Oe=g?"err":"ok",Ae=Oe==="err"?"'err { e } -> ...'":"'ok { v } -> ...'";throw new Qe([{code:"MAT001",severity:"error",file:null,line:J,column:ye,start:I,end:n[m.start].end,message:`non-exhaustive match with ok/err arms: missing '${Oe}' arm — add '${Oe} { ... } -> ...' or a wildcard '_ -> ...' arm`,rule:r.rule,idiom:r.idiom,rewrite:`add ${Ae} arm or a '_ -> ...' wildcard`}])}if((T||y)&&!(T&&y)){if(w)continue;const{line:J,column:ye}=V(e,I),Oe=T?"none":"some",Ae=Oe==="none"?"'none -> ...'":"'some { v } -> ...'";throw new Qe([{code:"MAT002",severity:"error",file:null,line:J,column:ye,start:I,end:n[m.start].end,message:`non-exhaustive match with some/none arms: missing '${Oe}' arm — add '${Oe}${Oe==="some"?" { ... }":""} -> ...' or a wildcard '_ -> ...' arm`,rule:i.rule,idiom:i.idiom,rewrite:`add ${Ae} arm or a '_ -> ...' wildcard`}])}const L=R.filter(J=>!Sd.has(J)&&/^[A-Z]/.test(J));if(L.length===0||k||g||b||T||y)continue;const z=new Set(L),W=[];for(const[J,ye]of c){const Oe=new Set(ye.map(Ae=>Ae.tag));L.every(Ae=>Oe.has(Ae))&&W.push({name:J,alts:ye})}if(W.length!==1)continue;const H=W[0],K=new Set(H.alts.filter(J=>J.halt).map(J=>J.tag));if(K.size>0)for(const J of m.arms){if(J.pattern.kind!=="tag"||!K.has(J.pattern.tag))continue;const ye=J.body;if(!(ye.includes("halt(")||/\bthrow\b/.test(ye)||ye.trimStart().startsWith("unsafe "))){const Ae=n[J.bodyStartToken],$e=Ae?Ae.start:I,{line:Me,column:Te}=V(e,$e);throw new Qe([{code:"MAT005",severity:"error",file:null,line:Me,column:Te,start:$e,end:Ae?Ae.end:I,message:`match arm for halt-variant '${J.pattern.tag}' must call halt() or throw — returning a continuable value silently discards the halt signal; use halt(<message>) or throw new Error(<message>), or wrap in unsafe "reason" { ... } to override`,rule:a.rule,idiom:a.idiom,rewrite:a.rewrite}])}}const le=new Set(H.alts.filter(J=>J.distinct).map(J=>J.tag));if(le.size>0){const J=m.arms.filter(ye=>ye.pattern.kind==="tag");for(const ye of J){if(!le.has(ye.pattern.tag))continue;const Oe=ye.pattern.tag,Ae=J.filter($e=>$e!==ye&&$e.body===ye.body);if(Ae.length>0){const $e=n[ye.bodyStartToken],Me=$e?$e.start:I,{line:Te,column:de}=V(e,Me);d.push({code:"MAT006",severity:"warning",file:null,line:Te,column:de,start:Me,end:$e?$e.end:I,message:`match arm for distinct-variant '${Oe}' has the same body as ${Ae.length===1?"another arm":`${Ae.length} other arms`} — '${Oe}' is declared \`distinct\` to signal its error class requires different handling; identical bodies collapse the distinction at runtime`,rule:l.rule,idiom:l.idiom,rewrite:l.rewrite})}}}const pe=H.alts.filter(J=>!z.has(J.tag));if(pe.length===0){if(D){const J=Rw(n,m),ye=n[J],Oe=ye?ye.start:I,{line:Ae,column:$e}=V(e,Oe);d.push({code:"MAT004",severity:"warning",file:null,line:Ae,column:$e,start:Oe,end:ye?ye.end:n[m.start].end,message:`match on '${H.name}' covers all ${H.alts.length} variant(s) — wildcard '_ -> ...' is unreachable dead code; remove it so future variants are caught by MAT003`,rule:s.rule,idiom:s.idiom,rewrite:s.rewrite})}continue}if(w)continue;const{line:Ye,column:ve}=V(e,I),Z=pe.map(J=>`'${J.tag}'`).join(", "),te=pe.length===1?"arm":"arms",se=pe.map(J=>J.body!==null?`'${J.tag} { ... } -> ...'`:`'${J.tag} -> ...'`).join(", ");throw new Qe([{code:"MAT003",severity:"error",file:null,line:Ye,column:ve,start:I,end:n[m.start].end,message:`non-exhaustive match on '${H.name}' — ${te} for ${Z} missing; add the missing arm(s) or a wildcard '_ -> ...' arm`,rule:o.rule,idiom:o.idiom,rewrite:`add ${se} or a '_ -> ...' wildcard`}])}return d.length>0?{code:e,warnings:d}:e}const jw=new Set(["&&","||","+","-","*","/","%","==","!=","===","!==","<",">","<=",">=","|","&","^","<<",">>",">>>","**"]);function Th(e,t,n){if(!Ue(t.resolved,"0.9"))return e;const r=Ue(t.resolved,"0.4"),i=Xt(e,{allowGenerics:r,includeNestedFns:!0}),o=i.tokens,s=i.fns.map(y=>y.decl),a=new Set,l=new Set,c=new Set,d=new Map;for(const y of s)if(y.returnType.includes("Result<")||y.returnType.includes("Option<")){a.add(y.name),y.returnType.includes("Option<")&&l.add(y.name);const w=d.get(y.name)??new Set;w.add(y.returnType.trim()),d.set(y.name,w)}else c.add(y.name);for(const y of c)a.delete(y);for(const[y,w]of d)w.size>1&&a.delete(y);const f=new Set,h=new Set;if(n){const y=Kr(o),w=new Set([...a,...c]);for(const[k,R]of Object.entries(n))if(!(!R.returnsResult&&!R.returnsOption)){w.has(k)||(f.add(k),R.returnsOption&&!R.returnsResult&&h.add(k));for(const[M,D]of y)D===k&&!w.has(M)&&(f.add(M),R.returnsOption&&!R.returnsResult&&h.add(M))}}if(a.size===0&&f.size===0)return e;const m=[];Mw(o,m);const g=Q("RES002"),b=Q("RES003"),T=[];for(let y=0;y<o.length;y++){const w=o[y];if(w.kind!=="ident")continue;const k=a.has(w.text),R=!k&&f.has(w.text);if(!k&&!R||_w(w.start,m))continue;let M=v(o,y+1),D=o[M];if((D==null?void 0:D.kind)==="questionDot"&&(M=v(o,M+1),D=o[M]),!D||D.kind!=="open"||D.text!=="(")continue;let I=Aa(o,y-1),L=o[I];for(;L&&(L.kind==="open"&&L.text==="("||L.kind==="ident"&&L.text==="await");)I=Aa(o,I-1),L=o[I];if(!(L===void 0||L.kind==="newline"&&!Dw(o,I)||L.kind==="open"&&L.text==="{"||L.kind==="close"&&L.text==="}"||L.kind==="punct"&&L.text===";"))continue;const W=D.matchedAt;if(W===void 0)continue;let H=W;for(;;){const te=Nd(o,H+1),se=o[te];if(!se||se.kind!=="close"||se.text!==")"||se.matchedAt===void 0)break;const J=Aa(o,se.matchedAt-1),ye=o[J];if(ye&&ye.kind==="ident")break;H=te}const K=Cn(o,H+1),le=o[K],pe=Nd(o,H+1),Ye=o[pe];if(Ow(le,Ye))continue;const{line:ve,column:Z}=V(e,w.start);if(k)T.push({code:"RES002",severity:"warning",file:null,line:ve,column:Z,start:w.start,end:w.end,message:`'${w.text}' returns ${Fw(s,w.text)} — discard hides the error/absence path; use '?', match on the result, or assign it`,rule:g.rule,idiom:g.idiom,rewrite:g.rewrite});else{const te=h.has(w.text)?"Option<…>":"Result<…>";T.push({code:"RES003",severity:"warning",file:null,line:ve,column:Z,start:w.start,end:w.end,message:`'${w.text}' is an imported fn that returns ${te} — discard hides the error/absence path; use '?', match on the result, or assign it`,rule:b.rule,idiom:b.idiom,rewrite:b.rewrite})}}return T.length===0?e:{code:e,warnings:T}}const Pw=new Set(["=","+=","-=","*=","/=","%=","&&=","||=","??=","&&","||","??","+","-","*","/","%","==","!=","===","!==","<",">","<=",">=","&","|","^","<<",">>",",",":","match"]);function Dw(e,t){let n=t-1;for(;n>=0;){const r=e[n];if(!r)return!1;if(r.kind==="whitespace"||r.kind==="blockComment"||r.kind==="lineComment"){n--;continue}return r.kind==="newline"?!1:Pw.has(r.text)}return!1}function Aa(e,t){let n=t;for(;n>=0;){const r=e[n];if(!r)return n;if(r.kind==="whitespace"||r.kind==="blockComment"||r.kind==="lineComment"){n--;continue}return n}return n}function Nd(e,t){let n=t;for(;n<e.length;){const r=e[n];if(!r)return n;if(r.kind==="whitespace"||r.kind==="blockComment"||r.kind==="lineComment"){n++;continue}return n}return n}function Ow(e,t){return e?!!(e.kind==="question"||e.kind==="punct"&&e.text==="."||e.kind==="questionDot"||e.kind==="close"&&e.text===")"||e.kind==="punct"&&e.text===","||(t==null?void 0:t.kind)==="open"&&t.text==="{"||e.kind==="close"&&e.text==="]"||e.kind==="questionQuestion"||e.kind==="operator"&&jw.has(e.text)):!1}function Mw(e,t){for(let n=0;n<e.length;n++){const r=e[n];if(r){if(r.kind==="keyword"&&r.keyword==="test"){const i=Cn(e,n+1),o=e[i];if(!o)continue;let s=-1;if(o.kind==="string"){const c=Cn(e,i+1),d=e[c];if(d&&d.kind==="open"&&d.text==="{")s=c;else if(d&&d.kind==="ident"&&d.text==="with"){const f=Cn(e,c+1),h=e[f];if(!h||h.kind!=="ident"||h.text!=="mocks")continue;const m=Cn(e,f+1),g=e[m];if(g&&g.kind==="open"&&g.text==="{"&&g.matchedAt!==void 0){const b=Cn(e,g.matchedAt+1),T=e[b];T&&T.kind==="open"&&T.text==="{"&&(s=b)}}}else o.kind==="open"&&o.text==="{"&&(s=i);if(s===-1)continue;const a=e[s],l=a.matchedAt!==void 0?e[a.matchedAt]:void 0;l&&t.push({start:a.start,end:l.end}),a.matchedAt!==void 0&&(n=a.matchedAt);continue}if(r.kind==="keyword"&&r.keyword==="unsafe"){const i=Cn(e,n+1),o=e[i];if(!o)continue;let s=-1;if(o.kind==="string"){const c=Cn(e,i+1),d=e[c];d&&d.kind==="open"&&d.text==="{"&&(s=c)}else o.kind==="open"&&o.text==="{"&&(s=i);if(s===-1)continue;const a=e[s],l=a.matchedAt!==void 0?e[a.matchedAt]:void 0;l&&t.push({start:a.start,end:l.end}),a.matchedAt!==void 0&&(n=a.matchedAt)}}}}function _w(e,t){for(const n of t)if(e>=n.start&&e<n.end)return!0;return!1}function Cn(e,t){let n=t;for(;n<e.length;){const r=e[n];if(!r)return n;if(r.kind==="whitespace"||r.kind==="newline"||r.kind==="lineComment"||r.kind==="blockComment"){n++;continue}return n}return n}function qw(e){const t=/(?:Result|Option)</.exec(e);if(!t)return e;let n=0;for(let r=t.index+t[0].length-1;r<e.length;r++)if(e[r]==="<")n++;else if(e[r]===">"&&(n--,n===0))return e.slice(t.index,r+1);return e.slice(t.index)}function Fw(e,t){const n=e.filter(o=>o.name===t);if(n.length===0)return"Result/Option";const r=n.map(o=>qw(o.returnType)),i=r[0];return r.every(o=>o===i)?i:"Result/Option"}const Lw=`botscript v0.1 — primer

A small TypeScript-superset language. All TypeScript syntax is legal. The
additions below are the entire language surface.

== FILE EXTENSION ==
  *.bs       Source file. Compiled to TypeScript by @mbfarias/botscript-compiler.

== DIRECTIVES ==
  ?primer    First line of a file. Emits this primer as a comment block.

== FUNCTIONS ==
  fn name(args) uses { caps } -> ReturnType { body }
                                              capabilities the function may use
  fn name(args) -> ReturnType = pure { expr }
                                              equivalent to uses { } + return expr
  fn name<T>(args) -> ReturnType { body }     (0.4+) type parameters between
                                              the name and the args. Constraints
                                              (T extends U) and defaults (T = D)
                                              are accepted and emitted verbatim.
  fn name(args) intent: "claim" -> ReturnType (0.7+) machine-checkable intent.
                                              The compiler checks declared
                                              intent against both the fn's
                                              header and (for pure) the body.
                                              Recognised claim: "pure" — no
                                              capability declarations (uses { })
                                              allowed (INT001, 0.7+); from 0.8,
                                              no read/write dependencies
                                              (reads { } / writes { }) either
                                              (INT001, 0.8+); body must not
                                              directly reference any stdlib
                                              capability (INT002, 0.7+). intent:
                                              may coexist with uses / reads /
                                              writes; the checks fire only when
                                              they conflict.
  fn name(args) reads { a, b } -> ReturnType  (0.8+) declare which resource
                                              categories the function reads
                                              from. Labels are user-defined
                                              identifiers (e.g. cache, db).
  fn name(args) writes { a, b } -> ReturnType (0.8+) declare which resource
                                              categories the function writes
                                              to. Labels are user-defined
                                              identifiers (e.g. metrics, db).
                                              Both are metadata-only in 0.8
                                              — stripped from TS output, not
                                              yet transitively enforced.
                                              reads {}, writes {}, and intent:
                                              may coexist with uses {} in any
                                              order after uses {} (if present)
                                              and before ->.
  Capabilities: net, fs, time, random, process, stdout, stderr.
  Under ?bs 0.2 the capability declaration is checked statically — a function
  declared uses { } that names http/time/random/fs/stdout/stderr.X is a parse
  error, not a runtime trap.
  Under ?bs 0.3 the check also infers transitively across same-file calls
  AND flags over-declaration:
    CAP001  uses clause is missing a capability the body (or a callee in the
            same file) actually consumes. The diagnostic names the call path:
            "f -> g -> http.get".
    CAP002  uses clause names a capability nothing in the body reaches. The
            declaration must match what the function actually uses.
  Under ?bs 0.7 the intent check adds:
    INT001  intent contains 'pure' but the function has capability declarations
            (uses {}). Pure functions may not consume external resources.
    INT002  intent contains 'pure' but the body directly references a stdlib
            capability (e.g. http.get, time.now). Fires when INT001 does not.
    INT003  intent contains 'idempotent' but uses {} declares 'random' or
            'time'. Both produce different values on each call — a fn that
            uses them cannot be safely retried. Only 'random' and 'time' are
            flagged; other capabilities are not structurally flagged by this
            check (INT003 is a narrow heuristic, not a proof of idempotence).
    INT004  intent contains 'idempotent' but the body directly references
            'random' or 'time' without declaring them. Under-declaration
            variant of INT003 — fires when INT003 does not.
  Under ?bs 0.8, INT001 also fires when 'pure' intent conflicts with
            read/write dependencies (reads {} / writes {}). Pure functions
            may have neither capabilities nor resource dependencies.
  Under ?bs 0.9, INT001 also fires when 'pure' intent conflicts with
            non-empty throws {} declarations. Throwing is a side effect;
            pure functions should use Result<T, E> for error conditions.
  cap-check diagnostics also carry start/end UTF-16 string offsets alongside
  line/column from 0.2 onward, so editor and LSP integrations can map the
  error to a precise span without re-walking the source. (The whole-file
  parseProgram surface that cap-check now consumes shipped at 0.4.)

== TAGGED UNIONS (0.2+) ==
  type Shape = Circle { r: number } | Square { side: number };
  type Status = Idle | Loading | Done { value: string };
                                              desugars to a TS discriminated
                                              union keyed on \`kind\`. Bare and
                                              field-bearing alternatives mix.

== BLOCKS ==
  pure { expr }    no capabilities allowed; throws CapabilityViolation if any escape
  io   { expr }    documents that this expression performs effects (informational)
  unsafe "reason" { expr }  (0.3+) escape hatch around \`as\` casts and similar.
                            The justification string is mandatory and shows up
                            in the compiled output as a comment so the diff
                            reviewer sees the *why* alongside the cast. From
                            ?bs 0.5, a bare \`as\` cast outside an
                            unsafe "<reason>" { ... } block is a parse error
                            (UNS004). Casts must be justified.

  unsafe "reason" fn name(…) -> T { … }
                            Declaration-level escape hatch. Marks the fn
                            itself as the trust boundary for type coercions.
                            Inside the body, bare \`as\` casts are allowed
                            without repeating the justification at every
                            call site. The reason is emitted as a leading
                            /* unsafe: "…" */ comment in the compiled output.
                            Use this for adapter/normalization fns that are
                            the one safe coercion point in a module — callers
                            treat the fn as a normal fn with no unsafe context
                            required. Works with async: unsafe "r" async fn …

== RESULT / OPTION ==
  Result<T, E>     ok(value) | err(error)
  Option<T>        some(value) | none
  expr?            on a Result: unwrap or short-circuit Err out of the enclosing fn
                   (only at end of let/const/return statement, never in expressions)
  Result.try { body }       (0.3+) lift a throwing call into Result<T, string>
  Result.tryAsync { body }  (0.3+) async variant; lifts rejections too

== MATCH ==
  match value {
    Tag             -> arm       (tag-only)
    Tag { a, b }    -> arm       (tag with field bindings)
    "literal"       -> arm       (literal string/number/bool/null)
    _               -> arm       (wildcard; required if not exhaustive)
  }

== TESTS ==
  test "name" { body }                                vitest-compatible
  test "name" with mocks { time, random } { body }    deterministic time
                                                      and random in body
                                                      (0.2+); time.now()
                                                      returns 0,1,2,…
  assert expr                                         throws on falsy

== STDLIB CALLS ==
  http.get(url) -> Promise<Result<Response, Error>>   requires uses { net }
  http.post(url) -> Promise<Result<Response, Error>>  requires uses { net }
  time.now() / time.iso()              requires uses { time }
  random.next() / random.int(a, b)     requires uses { random }
  // import { fs } from "@mbfarias/botscript-runtime/fs"; (Node only)
  fs.exists(path)                      requires uses { fs }
  fs.readText(path) -> Result          requires uses { fs }
  fs.writeText(path, body) -> Result   requires uses { fs }, atomic write
  fs.readJson(path) -> Result          requires uses { fs }
  fs.writeJson(path, value) -> Result  requires uses { fs }, atomic write
  stdout.println(s) / stderr.println(s)

  Under ?bs 0.6 the compiler auto-imports every stdlib symbol you reference
  from the main entry (ok, err, http, time, random, stdout, stderr, Result,
  Option, …) — no manual import preamble needed. The fs surface lives at
  @mbfarias/botscript-runtime/fs and is NOT auto-imported — keep an explicit
  import { fs } from "@mbfarias/botscript-runtime/fs" in any file that uses
  it. Pre-0.6 pins keep their old behaviour.

== IDIOMS (the canonical way to do common things) ==
  // fail fast on a fetch — await, unwrap the Result, then parse the body
  // ?bs 0.6  <- stdlib symbols (ok, http, Result, …) are auto-imported
  async fn loadUser(id: string) uses { net } -> Promise<Result<User, Error>> {
    let res = (await http.get(\`/users/\${id}\`))?
    let json = await res.json()
    return ok(unsafe "shape validated upstream" { json as User })
  }

  // pure helper
  fn slugify(s: string) -> string = pure { s.toLowerCase().replaceAll(" ", "-") }

  // exhaustive dispatch
  fn area(s: Shape) -> number = match s {
    Circle { r }    -> Math.PI * r * r
    Square { side } -> side * side
  }

== WHEN IN DOUBT ==
  - prefer pure { } over io { }
  - prefer Result over throw
  - prefer Option over null
  - prefer match over if/else chains on tagged unions
  - never use \`as\` outside an \`unsafe "reason" { }\` block
  - run \`botscript explain <CODE>\` to see the rule/idiom/rewrite for any
    diagnostic the compiler emits
`;function Uw(){return["/**",...Lw.split(`
`).map(t=>` * ${t}`.trimEnd())," */"].join(`
`)}function Bw(e){let t=0;for(;t<e.length;){const o=e[t];if(o===" "||o==="	"||o===`
`||o==="\r"){t++;continue}if(o==="/"&&e[t+1]==="/"){for(;t<e.length&&e[t]!==`
`;)t++;continue}if(o==="/"&&e[t+1]==="*"){const s=e.indexOf("*/",t+2);if(s===-1)return e;t=s+2;continue}break}if(!e.startsWith("?primer",t))return e;let n=t+7;for(;n<e.length&&e[n]!==`
`;)n++;const r=e.slice(0,t),i=e.slice(n);return`${Uw()}
${r}${i}`}function zw(e){const t=Ze(e);let n="",r=0;for(let i=0;i<t.length;i++){const o=t[i];if(!o||o.kind!=="ident"||o.text!=="Result")continue;const s=Ra(t,i+1),a=t[s];if(!a||a.kind!=="punct"||a.text!==".")continue;const l=Ra(t,s+1),c=t[l];if(!c||c.kind!=="ident"||c.text!=="try"&&c.text!=="tryAsync")continue;const d=Ra(t,l+1),f=t[d];if(!f||f.kind==="open"&&f.text==="(")continue;if(f.kind!=="open"||f.text!=="{"||f.matchedAt===void 0)throw Ww("RES001",o,e,`${c.text} block has no body — expected \`{ ... }\``);const h=f.matchedAt,m=Hw(t,d+1,h).trim(),g=Vw(m),b=c.text==="try"?"$resultTry":"$resultTryAsync",T=c.text==="try"?"() =>":"async () =>",y=`${b}(${T} { ${g} })`;n+=e.slice(r,o.start),n+=y,r=t[h].end,i=h}return n+=e.slice(r),n}function Ww(e,t,n,r){const i=Q(e),{line:o,column:s}=V(n,t.start),a={code:e,severity:"error",file:null,line:o,column:s,message:r,rule:i.rule,idiom:i.idiom,rewrite:i.rewrite};return new Qe([a])}function Ra(e,t){for(;t<e.length;){const n=e[t];if(n.kind==="whitespace"||n.kind==="newline"||n.kind==="lineComment"||n.kind==="blockComment"){t++;continue}return t}return t}function Hw(e,t,n){let r="";for(let i=t;i<n;i++){const o=e[i];if(!o)break;r+=o.text}return r}function Vw(e){return Ss(e)}function Gw(e){const t=Ze(e);let n="",r=0;for(let i=0;i<t.length;i++){const o=t[i];if(o.kind!=="keyword"||o.keyword!=="test")continue;let s=i+1;s=Td(t,s);const a=t[s];if(!a||a.kind!=="string")continue;const l=a.text;s++,s=Td(t,s);const c=t[s];if(!c||c.kind!=="open"||c.text!=="{"||c.matchedAt===void 0)continue;const d=c.matchedAt,f=Qw(t,s+1,d);n+=e.slice(r,o.start),n+=`$test(${l}, async () => {${f}});`,r=t[d].end,i=d}return n+=e.slice(r),n}function Td(e,t){for(;t<e.length;){const n=e[t];if(n.kind==="whitespace"||n.kind==="newline"||n.kind==="lineComment"||n.kind==="blockComment"){t++;continue}return t}return t}function Qw(e,t,n){let r="";for(let i=t;i<n;i++){const o=e[i];if(!o)break;r+=o.text}return r}function Kw(e){const t=Ze(e);let n="",r=0;for(let i=0;i<t.length;i++){const o=t[i];if(!o||o.kind!=="keyword"||o.keyword!=="test")continue;let s=i+1;s=cr(t,s);const a=t[s];if(!a||a.kind!=="string")continue;s++,s=cr(t,s);const l=t[s];if(!l||l.kind!=="ident"||l.text!=="with")continue;s++,s=cr(t,s);const c=t[s];if(!c||c.kind!=="ident"||c.text!=="mocks")continue;s++,s=cr(t,s);const d=t[s];if(!d||d.kind!=="open"||d.text!=="{"||d.matchedAt===void 0)continue;const f=Xw(t,s+1,d.matchedAt);s=d.matchedAt+1,s=cr(t,s);const h=t[s];if(!h||h.kind!=="open"||h.text!=="{"||h.matchedAt===void 0)continue;const m=h.matchedAt,g=Zw(t,s+1,m);n+=e.slice(r,l.start);const b=`[${f.map(T=>JSON.stringify(T)).join(", ")}]`;n+=`{ await $withMocks(${b} as const, async () => {${g}}); }`,r=t[m].end,i=m}return n+=e.slice(r),n}function Xw(e,t,n){const r=[];for(let i=t;i<n;i++){const o=e[i];o&&o.kind==="ident"&&r.push(o.text)}return r}function cr(e,t){for(;t<e.length;){const n=e[t];if(!n)return t;if(n.kind==="whitespace"||n.kind==="newline"||n.kind==="lineComment"||n.kind==="blockComment"){t++;continue}return t}return t}function Zw(e,t,n){let r="";for(let i=t;i<n;i++){const o=e[i];if(!o)break;r+=o.text}return r}function Jw(e){const t=Ze(e),n=[];eb(t,n),tb(t,n);const r=[];ab(t,r);for(let i=0;i<t.length;i++){const o=t[i];if(!(!o||o.kind!=="ident"||o.text!=="as")&&!lb(i,n)&&!cb(o.start,r)&&ob(t,i)&&sb(t,i))throw ub(o,e)}return e}function eb(e,t){for(let n=0;n<e.length;n++){const r=e[n];if(!r||r.kind!=="keyword"||r.keyword!=="unsafe")continue;const i=vn(e,n+1),o=e[i];if(!o)continue;let s=-1;if(o.kind==="open"&&o.text==="{")s=i;else if(o.kind==="string"){const l=vn(e,i+1),c=e[l];c&&c.kind==="open"&&c.text==="{"&&(s=l)}if(s===-1)continue;const a=e[s];a.matchedAt!==void 0&&(t.push({start:s,end:a.matchedAt+1}),n=a.matchedAt)}}function tb(e,t){for(let n=0;n<e.length;n++){const r=e[n];if(!r||r.kind!=="ident"||r.text!=="import"&&r.text!=="export"||!ib(e,n)||r.text==="export"&&!nb(e,n))continue;const i=rb(e,n);t.push({start:n,end:i}),n=i-1}}function nb(e,t){const n=vn(e,t+1),r=e[n];if(!r)return!1;if(r.kind==="operator"&&r.text==="*"||r.kind==="open"&&r.text==="{")return!0;if(r.kind==="ident"&&r.text==="default"){const i=vn(e,n+1),o=e[i];return!!(o&&o.kind==="operator"&&o.text==="*")}return!1}function ib(e,t){for(let n=t-1;n>=0;n--){const r=e[n];if(!r)return!0;if(!(r.kind==="whitespace"||r.kind==="lineComment"||r.kind==="blockComment"))return r.kind==="newline"||r.kind==="punct"&&r.text===";"||r.kind==="close"&&r.text==="}"||r.kind==="open"&&r.text==="{"}return!0}function rb(e,t){let n=t+1;for(;n<e.length;){const r=e[n];if(r.kind==="eof")return n;if(r.kind==="open"&&r.matchedAt!==void 0){n=r.matchedAt+1;continue}if(r.kind==="punct"&&r.text===";")return n+1;if(r.kind==="newline"){const i=vn(e,n+1),o=e[i];if(o&&o.kind==="ident"&&(o.text==="from"||o.text==="as")){n=i;continue}return n+1}n++}return e.length}function ob(e,t){for(let n=t-1;n>=0;n--){const r=e[n];if(!r)return!1;if(!(r.kind==="whitespace"||r.kind==="newline"||r.kind==="lineComment"||r.kind==="blockComment"))return r.kind==="ident"||r.kind==="number"||r.kind==="string"||r.kind==="template"||r.kind==="regex"||r.kind==="close"||r.kind==="question"}return!1}function sb(e,t){const n=vn(e,t+1),r=e[n];return r?r.kind==="ident"||r.kind==="keyword"||r.kind==="open"||r.kind==="string"||r.kind==="number"||r.kind==="operator"&&(r.text==="<"||r.text==="&"||r.text==="|"||r.text==="!"):!1}function vn(e,t){for(;t<e.length;){const n=e[t];if(!n)return t;if(n.kind==="whitespace"||n.kind==="newline"||n.kind==="lineComment"||n.kind==="blockComment"){t++;continue}return t}return t}function ab(e,t){for(let n=0;n<e.length;n++){const r=e[n];if(!r||r.kind!=="keyword"||r.keyword!=="unsafe")continue;const i=vn(e,n+1),o=e[i];if(!o||o.kind!=="string")continue;const s=vn(e,i+1),a=e[s];if(!a||a.kind!=="keyword")continue;let l;if(a.keyword==="fn")l=s;else if(a.keyword==="async"){const d=vn(e,s+1),f=e[d];if(!f||f.kind!=="keyword"||f.keyword!=="fn")continue;l=d}else continue;const c=xs(e,l,{allowGenerics:!0});c&&(t.push({start:c.body.start,end:c.body.end}),n=c.tokenEnd-1)}}function lb(e,t){for(const n of t)if(e>=n.start&&e<n.end)return!0;return!1}function cb(e,t){for(const n of t)if(e>=n.start&&e<n.end)return!0;return!1}function ub(e,t){const n=Q("UNS004"),{line:r,column:i}=V(t,e.start),o={code:"UNS004",severity:"error",file:null,line:r,column:i,start:e.start,end:e.end,message:'bare `as` cast outside an `unsafe "<reason>" { ... }` block or `unsafe "<reason>" fn` body',rule:n.rule,idiom:n.idiom,rewrite:n.rewrite};return new Qe([o])}function db(e){const t=Ze(e);let n="",r=0;for(let i=0;i<t.length;i++){const o=t[i];if(!o||o.kind!=="keyword"||o.keyword!=="unsafe"||!fb(t,i))continue;const s=Ea(t,i+1),a=t[s];if(!a||a.kind!=="string")throw(a==null?void 0:a.kind)==="open"&&a.text==="{"?bo("UNS001",o,e,"unsafe block has no justification string"):bo("UNS001",o,e,"unsafe block must be followed by a justification string");const l=Ea(t,s+1),c=t[l];if(c&&c.kind==="keyword"&&c.keyword==="fn")continue;if(c&&c.kind==="keyword"&&c.keyword==="async"){const T=Ea(t,l+1),y=t[T];if(y&&y.kind==="keyword"&&y.keyword==="fn")continue}if(a.text.slice(1,-1).trim()==="")throw bo("UNS002",a,e,"unsafe justification is empty");if(!c||c.kind!=="open"||c.text!=="{"||c.matchedAt===void 0)throw bo("UNS003",o,e,"unsafe block has no body — expected `{ ... }`");const f=c.matchedAt,h=pb(t,l+1,f).trim(),m=hb(h),b=`${`/* unsafe: ${a.text.replace(/\*\//g,"*\\/")} */`} (() => { ${m} })()`;n+=e.slice(r,o.start),n+=b,r=t[f].end,i=f}return n+=e.slice(r),n}function bo(e,t,n,r){const i=Q(e),{line:o,column:s}=V(n,t.start),a={code:e,severity:"error",file:null,line:o,column:s,message:r,rule:i.rule,idiom:i.idiom,rewrite:i.rewrite};return new Qe([a])}function fb(e,t){for(let n=t-1;n>=0;n--){const r=e[n];if(!(r.kind==="whitespace"||r.kind==="newline"||r.kind==="lineComment"||r.kind==="blockComment"))return r.kind==="eq"||r.kind==="fatArrow"||r.kind==="punct"&&(r.text===","||r.text===":"||r.text===";")?!0:r.kind==="punct"&&r.text==="."?!1:r.kind==="open"&&(r.text==="("||r.text==="["||r.text==="{")||r.kind==="question"||r.kind==="questionDot"||r.kind==="questionQuestion"||r.kind==="operator"||r.kind==="ident"&&r.text==="return"||r.kind==="keyword"}return!0}function Ea(e,t){for(;t<e.length;){const n=e[t];if(n.kind==="whitespace"||n.kind==="newline"||n.kind==="lineComment"||n.kind==="blockComment"){t++;continue}return t}return t}function pb(e,t,n){let r="";for(let i=t;i<n;i++){const o=e[i];if(!o)break;r+=o.text}return r}function hb(e){return e===""?"":mb(e)||/\breturn\b/.test(e)?e:`return ${e};`}function mb(e){let t=0;for(;t<e.length;){const n=e[t];if(n==='"'||n==="'"||n==="`"){const r=n;for(t++;t<e.length&&e[t]!==r;)e[t]==="\\"?t+=2:t++;t++;continue}if(n===";")return!0;t++}return!1}function gb(e){var s,a,l,c,d;const t=Ze(e),n=[];for(let f=0;f<t.length;f++){if(t[f].kind!=="question")continue;let m=f+1;for(;m<t.length;){const y=t[m];if(y.kind==="whitespace"){m++;continue}if(y.kind==="lineComment"){m++;continue}if(y.kind==="blockComment"&&!y.text.includes(`
`)){m++;continue}if(y.kind==="punct"&&y.text===";"||y.kind==="newline"||y.kind==="eof")break;m=-1;break}if(m===-1)continue;const g=bb(t,f-1);if(g===-1)continue;const b=wb(t,g,f);if(!b)continue;let T=f+1;((s=t[T])==null?void 0:s.kind)==="whitespace"&&T++,((a=t[T])==null?void 0:a.kind)==="punct"&&((l=t[T])==null?void 0:l.text)===";"&&T++,n.push({start:g,end:T,...b})}let r="",i=0,o=0;for(const f of n){o++;const h=t[f.start].start,m=f.end>=t.length?e.length:((c=t[f.end])==null?void 0:c.start)??e.length;r+=e.slice(i,h);const g=e.lastIndexOf(`
`,h-1)+1,b=((d=e.slice(g,h).match(/^[ \t]*/))==null?void 0:d[0])??"";r+=yb(f,o,b),i=m}return r+=e.slice(i),r}function yb(e,t,n){const r=`__r${t}`,i=`${n}const ${r} = ${e.expr.trim()};
`,o=`${n}if (${r}.kind === "err") return ${r};
`;if(e.form==="let-binding"){const s=e.binder==="var"?"let":e.binder??"const",a=e.typeAnnotation?`: ${e.typeAnnotation}`:"";return`${i}${o}${n}${s} ${e.name}${a} = ${r}.value;`}return e.form==="return"?`${i}${o}${n}return ${r}.value;`:`${i}${o.replace(/\n$/,"")}`}function wb(e,t,n){var s,a,l,c;let r=t;r=Fi(e,r);const i=e[r];if(!i||i.kind==="operator"&&!vb(i.text))return null;if(i.kind==="ident"&&(i.text==="let"||i.text==="const"||i.text==="var")){const d=i.text;let f=r+1;f=Fi(e,f);const h=e[f];if(!h||h.kind!=="ident")return null;const m=h.text;f++,f=Fi(e,f);let g;if(((s=e[f])==null?void 0:s.kind)==="punct"&&((a=e[f])==null?void 0:a.text)===":"){const T=f+1;let y=T;for(;y<n&&((l=e[y])==null?void 0:l.kind)!=="eq";)y++;g=vo(e,T,y).trim(),f=y}if(((c=e[f])==null?void 0:c.kind)!=="eq")return null;f++;const b=vo(e,f,n).trim();return b?{form:"let-binding",binder:d,name:m,typeAnnotation:g,expr:b}:null}if(i.kind==="ident"&&i.text==="return"){const d=vo(e,r+1,n).trim();return d?{form:"return",expr:d}:null}const o=vo(e,r,n).trim();return o?{form:"bare",expr:o}:null}function bb(e,t){let n=0;for(let r=t;r>=0;r--){const i=e[r];if(i.kind==="close")n++;else if(i.kind==="open"){if(n===0)return Fi(e,r+1);n--;continue}if(n===0){if(i.kind==="punct"&&i.text===";")return Fi(e,r+1);if(i.kind==="question"){let o=r+1;for(;o<e.length;){const a=e[o];if(a.kind==="whitespace"){o++;continue}if(a.kind==="lineComment"){o++;continue}if(a.kind==="blockComment"&&!a.text.includes(`
`)){o++;continue}break}const s=e[o];if(!s||s.kind==="newline"||s.kind==="eof"||s.kind==="punct"&&s.text===";")return Fi(e,r+1);continue}if(i.kind==="newline"){const o=kb(e,r+1);if(o===-1)continue;const s=e[o];if(s.kind==="ident"&&(s.text==="let"||s.text==="const"||s.text==="var"||s.text==="return"))return o;continue}}}return 0}function vb(e){return e==="+"||e==="-"||e==="!"||e==="~"||e==="++"||e==="--"}function kb(e,t){for(let n=t;n<e.length;n++){const r=e[n];if(!(r.kind==="whitespace"||r.kind==="newline"||r.kind==="lineComment"||r.kind==="blockComment"))return n}return-1}function Fi(e,t){for(;t<e.length;){const n=e[t];if(n.kind==="whitespace"||n.kind==="newline"||n.kind==="lineComment"||n.kind==="blockComment"){t++;continue}return t}return t}function vo(e,t,n){let r="";for(let i=t;i<n;i++){const o=e[i];if(!o)break;r+=o.text}return r}const $d=[{name:"primer",fn:Bw},{name:"intentCheck",fn:hh,minVersion:"0.7"},{name:"aliCheck",fn:rw,minVersion:"0.8"},{name:"verCheck",fn:Y0},{name:"synCheck",fn:F0,minVersion:"0.7"},{name:"effCheck",fn:K0,minVersion:"0.7"},{name:"depCheck",fn:uh,minVersion:"0.9"},{name:"thrCheck",fn:fh,minVersion:"0.9"},{name:"matCheck",fn:Ew,minVersion:"0.9"},{name:"resCheck",fn:Th,minVersion:"0.9"},{name:"capAssert",fn:$0,minVersion:"0.9"},{name:"unsCheck",fn:sw,minVersion:"0.9"},{name:"unsStale",fn:gw,minVersion:"0.9"},{name:"unsDecay",fn:uw,minVersion:"0.9"},{name:"unsReason",fn:hw,minVersion:"0.9"},{name:"tsSuppress",fn:vw,minVersion:"0.5"},{name:"capCheck",fn:sh,minVersion:"0.2"},{name:"bareAs",fn:Jw,minVersion:"0.5"},{name:"testMocks",fn:Kw,minVersion:"0.2"},{name:"test",fn:Gw},{name:"taggedUnion",fn:Yw,minVersion:"0.2"},{name:"unsafe",fn:db,minVersion:"0.3"},{name:"resultTry",fn:zw,minVersion:"0.3"},{name:"fn",fn:x0},{name:"blocks",fn:zy},{name:"match",fn:xw},{name:"unwrap",fn:gb},{name:"assert",fn:Iy},{name:"imports",fn:e0}];function xb(e,t={}){try{const{src:n,version:r}=Qy(e);Ue(r.resolved,"0.4")&&Nb(e);let i=n;const o=[],s=[],a=t.moduleEffects,l=a?$d.map(c=>c.name==="depCheck"?{...c,fn:(d,f)=>uh(d,f,a)}:c.name==="thrCheck"?{...c,fn:(d,f)=>fh(d,f,a)}:c.name==="capCheck"?{...c,fn:(d,f)=>sh(d,f,a)}:c.name==="intentCheck"?{...c,fn:(d,f)=>hh(d,f,a)}:c.name==="resCheck"?{...c,fn:(d,f)=>Th(d,f,a)}:c):$d;for(const c of l){if(c.minVersion&&!Ue(r.resolved,c.minVersion))continue;const d=c.fn(i,r);typeof d=="string"?(d!==i&&o.push(c.name),i=d):(d.code!==i&&o.push(c.name),i=d.code,s.push(...d.warnings))}return{code:i,forms:o,version:r,warnings:s}}catch(n){throw t.filename&&n instanceof Qe?Sb(n,t.filename):n}}function Sb(e,t){const n=e.diagnostics.map(r=>({...r,file:r.file??t}));return Object.assign(e,{diagnostics:Object.freeze(n)}),e.message=n.map(r=>{const i=`${r.file}:${r.line}:${r.column}`;return`botscript[${r.code}]: ${r.message} (${i})${r.rule?`
  Rule:    ${r.rule}`:""}${r.idiom?`
  Idiom:   ${r.idiom}`:""}${r.rewrite?`
  Rewrite: ${r.rewrite}`:""}`}).join(`

`),e}function Nb(e){if(gy(e))return;const t=Wp(e);let n=0;const r=Math.min(e.length,t.length);for(;n<r&&e[n]===t[n];)n++;let i=1,o=1;for(let a=0;a<n;a++){const l=e[a];l==="\r"?(i++,o=1,e[a+1]===`
`&&a++):l===`
`?(i++,o=1):o++}const s=Q("FMT001");throw new Qe([{code:s.code,severity:"error",file:null,line:i,column:o,message:s.title,rule:s.rule,idiom:s.idiom,rewrite:s.rewrite}])}function Tb({size:e=32}){return ee.jsxs("svg",{width:e,height:e,viewBox:"0 0 200 200","aria-label":"botscript",children:[ee.jsx("text",{x:"40",y:"135",textAnchor:"middle",fontSize:"140",fontWeight:500,fontFamily:"ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",fill:"#0D9488",children:"{"}),ee.jsx("text",{x:"160",y:"135",textAnchor:"middle",fontSize:"140",fontWeight:500,fontFamily:"ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",fill:"#0D9488",children:"}"}),ee.jsx("circle",{cx:"86",cy:"80",r:"8",fill:"#0D9488"}),ee.jsx("circle",{cx:"114",cy:"80",r:"8",fill:"#0D9488"}),ee.jsx("rect",{x:"86",y:"110",width:"28",height:"6",rx:"3",fill:"#0D9488"})]})}const $b=`// looks pure to a code reviewer; \`fetch\` hides three layers down
function formatHandle(user: { name: string }): string {
  trackImpression(user.name);
  return "@" + user.name.toLowerCase();
}

function trackImpression(name: string): void {
  fetch("/api/events?n=" + name);  // ← the hidden side effect
}

formatHandle({ name: "Ada" });
`,Yb=`?bs 0.4
import { http } from "@mbfarias/botscript-runtime";

// formatHandle declares no capabilities. The compiler walks the call graph,
// notices trackImpression hits http.get, and rejects the file at compile time
// — naming the path: formatHandle -> trackImpression -> http.get.
//
// Try fixing it: add \`uses { net }\` to BOTH fns and watch the output flip
// from a CAP001 to clean TypeScript.

fn formatHandle(user: { name: string }) -> string {
  trackImpression(user.name);
  return "@" + user.name.toLowerCase();
}

fn trackImpression(name: string) -> void {
  http.get(\`/api/events?n=\${name}\`);
}
`,Cb=`// the cast was load-bearing six months ago; nobody remembers why now
async function loadUser(id: string): Promise<User> {
  const res = await fetch(\`/users/\${id}\`);
  const json = await res.json();
  return json as User;          // ← no review trail, no reason in the diff
}

type User = { id: string; name: string };
`,Ib=`?bs 0.4

// In .bs, the only place an \`as\` cast can live is inside an \`unsafe\` block,
// and \`unsafe\` demands a non-empty justification string. UNS001 fires the
// moment you try to ship a bare cast — the *why* must show up in the diff
// alongside the *what*.
//
// Try fixing it: add a reason between \`unsafe\` and \`{\` —
//   unsafe "Response.json() is typed any" { ... }

type User = { id: string; name: string };

fn coerceUser(json: unknown) -> User = unsafe { json as User }
`,Ab=`// the docstring claims this hits the network — it doesn't anymore.
// reviewers trust the docstring; new callsites assume the wire is in scope
/** Network-bound: parses an external feed URL. */
function parseFeedUrl(url: string): string {
  return url.trim().toLowerCase();   // ← no network call here at all
}
`,Rb=`?bs 0.4

// .bs treats the \`uses { ... }\` clause as an UPPER bound the compiler
// infers against. If the body never reaches \`net\`, declaring \`net\` is a
// CAP002 parse error. Capability sets cannot drift from the body.
//
// Try fixing it: drop \`uses { net }\` from the signature, leaving the
// pure-helper form: \`fn parseFeedUrl(url: string) -> string = pure { ... }\`.

fn parseFeedUrl(url: string) uses { net } -> string = pure {
  url.trim().toLowerCase()
}
`,Eb=`// the type says \`Config\`. at runtime it can be \`undefined\`.
// every caller that destructures \`port\` will crash, far from this file
function loadConfig(raw: string): Config {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined as any;     // ← failure becomes a silent shape lie
  }
}

type Config = { port: number };
`,jb=`?bs 0.4
import { ok, err, type Result } from "@mbfarias/botscript-runtime";

// The .bs form makes failure visible in the type. \`Result.try { ... }\` lifts
// a throwing JS-boundary call into a Result, the \`?\` postfix short-circuits
// the err case out of the enclosing fn, and the caller's signature tells them
// "this can fail — handle it." There is no try/catch flowing-through pattern
// to mis-write.
//
// The compile output on the right is the clean desugared TypeScript. The TS
// bug pattern on the left simply has no shape in .bs.

type Config = { port: number };

fn loadConfig(raw: string) -> Result<Config, string> {
  let parsed = Result.try { JSON.parse(raw) }?
  let p = (parsed as { port?: number }).port;
  return typeof p === "number" ? ok({ port: p }) : err("missing port");
}
`,Pb=`// added \`Triangle\` to the union, forgot to update the switch.
// the \`default\` swallows it — area returns 0, no compile error, no warning
type Shape =
  | { kind: "Circle"; r: number }
  | { kind: "Square"; side: number }
  | { kind: "Triangle"; base: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "Circle": return Math.PI * s.r * s.r;
    case "Square": return s.side * s.side;
    default: return 0;            // ← Triangle silently lands here
  }
}
`,Db=`?bs 0.4

// \`match\` has no \`default\` and no fallthrough by design. The tagged-union
// sugar on the type and the destructuring patterns on the arms share the
// same discriminator — they cannot drift. Adding \`Triangle\` to the type and
// failing to handle it surfaces immediately at the matchsite.
//
// The compile output is the clean desugared TypeScript dispatch.

type Shape =
  | Circle { r: number }
  | Square { side: number }
  | Triangle { base: number; height: number };

fn area(s: Shape) -> number = match s {
  Circle { r } -> Math.PI * r * r
  Square { side } -> side * side
  Triangle { base, height } -> (base * height) / 2
}
`,hr=[{id:"hidden-effect",label:"hidden side effect",title:"A hidden network call ships unnoticed",blurb:'The bot sneaks fetch() into a helper that looks pure. Reviewers read the top-level fn and trust it; the side effect lives three layers down. TypeScript has no way to spell "no side effects" in a signature.',outcome:"rejects",outcomeLabel:"BotScript rejects this — CAP001",fixHint:"Add `uses { net }` to both fns, or remove the http.get call.",tsCode:$b,bsCode:Yb},{id:"naked-cast",label:"as any cast",title:"An `as` cast slips into the diff with no reason",blurb:"Under reviewer pressure, a bot makes the build green with `as User` or `as any`. The cast becomes load-bearing; six months later, no one remembers why. Casts in .bs only live inside `unsafe`, and `unsafe` demands a one-line reason.",outcome:"rejects",outcomeLabel:"BotScript rejects this — UNS001",fixHint:'Add a justification string: `unsafe "Response.json() is typed any" { ... }`.',tsCode:Cb,bsCode:Ib},{id:"over-declared",label:"stale capability",title:"Capability set drifts from what the body actually does",blurb:"A function once hit the network; the implementation changed and nothing flagged that the docstring (or the `uses` clause, in another language) was now a lie. .bs treats `uses { ... }` as the upper bound — the compiler refuses to keep declarations the body never reaches.",outcome:"rejects",outcomeLabel:"BotScript rejects this — CAP002",fixHint:"Drop `uses { net }` from the signature — the body is already pure.",tsCode:Ab,bsCode:Rb},{id:"swallowed-parse",label:"swallowed error",title:"JSON.parse failure becomes silent `undefined`",blurb:"The most common error pattern in TypeScript: wrap a throwing call in try/catch, return undefined on failure, lie about the type. Every caller that destructures the result crashes far from the source. .bs makes the failure path part of the return type.",outcome:"structural",outcomeLabel:"Bug pattern is unrepresentable",fixHint:"Failure is part of the return type. `?` is the only unwrap, and the desugared TS makes the err-path branch explicit.",tsCode:Eb,bsCode:jb},{id:"match-fallthrough",label:"switch fallthrough",title:"A new union case slips past the switch's default",blurb:"Adding a third shape to the union should be a one-line change. With `switch` + `default`, the new case lands silently in the default branch — area returns 0 and the test suite never notices. .bs's `match` has no default and no fallthrough.",outcome:"structural",outcomeLabel:"Bug pattern is unrepresentable",fixHint:"No `default`, no fallthrough. The union's discriminator and the match arms are the same shape — they cannot drift.",tsCode:Pb,bsCode:Db}],Ob=[{id:"vscode-299235",project:"microsoft/vscode",number:299235,url:"https://github.com/microsoft/vscode/pull/299235",title:"Freeform chat answer reloaded as [object Object]",bugClass:"tagged-union drift",summary:'A select-or-freeform answer was stored as { selectedValue: undefined, freeformValue: "…" }. JSON.stringify dropped the undefined key on persist, the formatter lost its discriminator, and the chat history showed [object Object] after reload.',bs:"type Answer = Selected { value } | Freeform { text } makes the tag a real field, not a key whose presence depends on undefined; match has no fallthrough to String(answer)."},{id:"next-93134",project:"vercel/next.js",number:93134,url:"https://github.com/vercel/next.js/pull/93134",title:"Falsy throws broke app-router error boundaries",bugClass:"tagged-union drift",summary:`The boundary's state was error: Error | null and checked truthiness. throw undefined, throw 0, throw "" all read as no-error — the boundary re-rendered children that threw the same value again. The fix retypes state to null | { thrownValue: unknown }.`,bs:"That fix is the exact shape match enforces by default. type CatchState = NoError | Errored { thrownValue } can't be confused with truthiness — the variant is the truth."},{id:"next-92806",project:"vercel/next.js",number:92806,url:"https://github.com/vercel/next.js/pull/92806",title:"Build crashed on notFound() pages",bugClass:"null / undefined drift",summary:"Two parallel route structures usually agreed, but notFound() pages produced keys absent from the seed data. The index lookup returned undefined; downstream code expected null. The fix in the PR is literally ?? null on two index reads.",bs:"There is only Option<T>. Index lookups return Option, every read unwraps via match or ? — there is no second flavor of missing to coerce against."},{id:"vscode-309950",project:"microsoft/vscode",number:309950,url:"https://github.com/microsoft/vscode/pull/309950",title:"Cast lied about a possibly-absent viewlet",bugClass:"load-bearing `as` cast",summary:"openSearch cast getViewPaneContainer() as a definite value, but the call returns undefined in the new Agents product. 36 of 56 callers were fire-and-forget — the crash surfaced as silent unhandled promise rejections.",bs:"as outside an unsafe { } block is a parse error. The real return type would be Option<ViewPaneContainer>, and the call site is forced to pattern-match before reaching .search()."},{id:"vscode-309570",project:"microsoft/vscode",number:309570,url:"https://github.com/microsoft/vscode/pull/309570",title:"ChatModel.dispose crashed the chat list",bugClass:"load-bearing `as any`",summary:"Dispose did (r as any)._session = undefined to break a GC back-reference, with a // eslint-disable-next-line local/code-no-any-casts comment to permit it. A live listener then crashed accessing _session.sessionResource during a model switch.",bs:"as any is a parse error. The PR's actual fix is to delete the cast — botscript would have made writing it in the first place illegal."}],Mb=`?bs 0.4
import { stdout } from "@mbfarias/botscript-runtime";

fn greet(name: string) uses { stdout } -> void {
  stdout.println(\`hi, \${name}\`);
}

greet("world");
`,_b=`?bs 0.4

// Pure helpers. The 'pure { ... }' shorthand is sugar for uses { } { return ... }
// with the compiler enforcing zero side effects.

fn slug(s: string) -> string = pure {
  s.trim().toLowerCase().replaceAll(" ", "-")
}

fn double(n: number) -> number = n * 2

const a = slug("  Hello World  "); // "hello-world"
const b = double(21); // 42
`,qb=`?bs 0.4

// Type parameters in fn signatures (0.4). Generic helpers compose with
// the rest of botscript — purity, capabilities, match — without giving
// anything up. The header is emitted verbatim into the TypeScript output.

fn identity<T>(x: T) -> T = pure { x }

fn pair<A, B>(a: A, b: B) -> [A, B] = pure { [a, b] }

// 'extends' constrains; the constraint is plain TypeScript.
fn firstId<T extends { id: string }>(xs: T[]) -> string | undefined = pure {
  xs[0]?.id
}

const a = identity("hello"); // string
const b = pair(1, "two"); // [number, string]
const c = firstId([{ id: "a" }]); // string | undefined
`,Fb=`?bs 0.4

// Tagged-union sugar (0.2+) — declare the kinds inline; the compiler
// desugars to a TypeScript discriminated union keyed on \`kind\`.

type Shape =
  | Circle { r: number }
  | Square { side: number }
  | Triangle { base: number; height: number };

fn area(s: Shape) -> number = match s {
  Circle { r } -> Math.PI * r * r
  Square { side } -> side * side
  Triangle { base, height } -> (base * height) / 2
}

const a = area({ kind: "Circle", r: 3 });
`,Lb=`?bs 0.4

import { ok, err, type Result } from "@mbfarias/botscript-runtime";

fn parsePort(s: string) -> Result<number, string> = pure {
  /^\\d+$/.test(s) && Number(s) > 0 && Number(s) < 65536
    ? ok(Number(s))
    : err(\`bad port: \${s}\`)
}

fn parseHostPort(input: string) -> Result<{ host: string; port: number }, string> {
  const [host, port] = input.split(":");
  if (!host || !port) return err("expected host:port");
  let p = parsePort(port)?
  return ok({ host, port: p });
}
`,Ub=`?bs 0.4

// Result.try (0.3+) lifts a JS-boundary call that throws into a
// Result<T, string>. No try/catch, no swallowed exceptions, and the ?
// operator short-circuits the err case out of the enclosing fn.

import { ok, err, type Result } from "@mbfarias/botscript-runtime";

fn parseConfig(raw: string) -> Result<{ port: number }, string> {
  let parsed = Result.try { JSON.parse(raw) }?
  let p = (parsed as { port?: number }).port;
  return typeof p === "number" ? ok({ port: p }) : err("missing port");
}
`,Bb=`?bs 0.4

// Capability inference (0.3): the compiler walks the call graph at compile
// time. Declare the ceiling, and every callee must fit under it. Try
// removing 'time' from \`now\` to see CAP001 fire with the call path.

import { time } from "@mbfarias/botscript-runtime";

fn now() uses { time } -> number = time.now()

// loadStamp transitively reaches \`time\` via now(), so it must declare it.
fn loadStamp() uses { time } -> { value: number } = { value: now() }
`,zb=`?bs 0.4

// Run anywhere with a Node runtime. Capability-checked, Result-typed.
import { fs } from "@mbfarias/botscript-runtime/fs";

fn loadConfig(path: string) uses { fs } -> Result<{ name: string }, string> {
  let cfg = fs.readJson<{ name: string }>(path)?
  return ok(cfg);
}
`,Wb=`?bs   0.4


// FMT001: this file isn't canonical. Click "format" to fix it.



type Shape =
  | Circle   { r: number }
  | Square   { side: number };

fn area(s: Shape) -> number = match s {
	Circle  { r }    -> Math.PI * r * r
	Square  { side } -> side * side
}

const a   =   area({ kind: "Circle", r: 3 });
`,Hb=`?bs 0.4

// 'with mocks { time, random }' (0.2+) hands the test a deterministic clock
// and PRNG. The runner is the only thing that can pass real ones.

fn add(a: number, b: number) -> number = pure { a + b }

test "add commutes" {
  assert add(2, 3) === add(3, 2);
}

test "deterministic now()" with mocks { time } {
  // time.now() returns 0, 1, 2, ... per call inside this test.
  assert time.now() === 0;
  assert time.now() === 1;
}
`,jo=[{id:"hello",label:"hello",source:Mb},{id:"pure",label:"pure",source:_b},{id:"generics",label:"generics",source:qb},{id:"match",label:"match",source:Fb},{id:"result",label:"result",source:Lb},{id:"try",label:"try",source:Ub},{id:"caps",label:"caps",source:Bb},{id:"fs",label:"fs",source:zb},{id:"test",label:"test",source:Hb},{id:"fmt",label:"fmt",source:Wb}];function Yd(e){return iy([],()=>{try{return{code:xb(e).code,error:null}}catch(t){return{code:"",error:t instanceof Error?t.message:String(t)}}})}function Vb(){const[e,t]=Mt.useState("problems"),[n,r]=Mt.useState(hr[0].id),i=Mt.useMemo(()=>hr.find(m=>m.id===n)??hr[0],[n]),[o,s]=Mt.useState(hr[0].bsCode);Mt.useEffect(()=>{s(i.bsCode)},[i.id]);const a=Mt.useMemo(()=>Yd(o),[o]),[l,c]=Mt.useState(jo[0].id),[d,f]=Mt.useState(jo[0].source);Mt.useEffect(()=>{const m=jo.find(g=>g.id===l);m&&f(m.source)},[l]);const h=Mt.useMemo(()=>Yd(d),[d]);return ee.jsxs("div",{className:"app",children:[ee.jsxs("header",{className:"header",children:[ee.jsxs("div",{className:"brand",children:[ee.jsx(Tb,{size:36}),ee.jsxs("div",{className:"brand-text",children:[ee.jsx("h1",{children:"botscript"}),ee.jsx("p",{children:e==="problems"?"real TypeScript bug patterns the compiler refuses to ship":"type .bs on the left — see the desugared TypeScript on the right"})]})]}),ee.jsxs("div",{className:"header-right",children:[ee.jsxs("div",{className:"modes",role:"tablist","aria-label":"view mode",children:[ee.jsx("button",{role:"tab","aria-selected":e==="problems",className:e==="problems"?"mode mode-active":"mode",onClick:()=>t("problems"),children:"problems it solves"}),ee.jsx("button",{role:"tab","aria-selected":e==="features",className:e==="features"?"mode mode-active":"mode",onClick:()=>t("features"),children:"features"})]}),ee.jsx("a",{className:"ghlink",href:"https://github.com/marcelofarias/botscript",target:"_blank",rel:"noreferrer",children:"github"})]})]}),ee.jsxs("section",{className:"intro","aria-label":"about botscript",children:[ee.jsxs("p",{className:"intro-lead",children:["A small TypeScript-superset language for a world where most code is written by machines. The patterns that confuse LLMs into shipping broken code aren’t expressible in ",ee.jsx("code",{children:".bs"})," — try editing a tab below and watch the compiler refuse it."]}),ee.jsxs("p",{className:"intro-links",children:[ee.jsx("a",{href:"https://github.com/marcelofarias/botscript/blob/main/MANIFESTO.md",target:"_blank",rel:"noreferrer",children:"read the manifesto"}),ee.jsx("span",{className:"dot",children:"·"}),ee.jsx("a",{href:"https://github.com/marcelofarias/botscript/blob/main/MANIFESTO.md#but-isnt-this-just-stricter-typescript",target:"_blank",rel:"noreferrer",children:"vs. strict TypeScript + lint"}),ee.jsx("span",{className:"dot",children:"·"}),ee.jsx("a",{href:"https://www.npmjs.com/package/@mbfarias/botscript-compiler",target:"_blank",rel:"noreferrer",children:ee.jsx("code",{children:"npm i @mbfarias/botscript-compiler"})}),ee.jsx("span",{className:"dot",children:"·"}),ee.jsx("a",{href:"https://github.com/marcelofarias/botscript#readme",target:"_blank",rel:"noreferrer",children:"docs"})]})]}),e==="problems"?ee.jsx(Qb,{problem:i,problemId:n,setProblemId:r,bsSource:o,setBsSource:s,bsCompiled:a}):ee.jsx(Kb,{snippetId:l,setSnippetId:c,snippetSource:d,setSnippetSource:f,snippetCompiled:h}),ee.jsx(Gb,{}),ee.jsxs("footer",{className:"footer",children:[ee.jsx("span",{children:"v0.4.0"}),ee.jsx("span",{className:"dot",children:"·"}),ee.jsx("a",{href:"https://www.npmjs.com/package/@mbfarias/botscript-compiler",target:"_blank",rel:"noreferrer",children:"@mbfarias/botscript-compiler"}),ee.jsx("span",{className:"dot",children:"·"}),ee.jsx("span",{children:"compiled in your browser"})]})]})}function Gb(){return ee.jsxs("section",{className:"receipts","aria-label":"real PRs that wouldn't have shipped in .bs",children:[ee.jsxs("header",{className:"receipts-head",children:[ee.jsx("span",{className:"receipts-eyebrow",children:"receipts"}),ee.jsxs("h2",{className:"receipts-title",children:["Real merged PRs that wouldn’t have shipped in ",ee.jsx("code",{children:".bs"})]}),ee.jsxs("p",{className:"receipts-sub",children:["Five fixes from Next.js and VS Code, all merged in 2026, where the bug class is ",ee.jsx("em",{children:"parse-time impossible"})," in botscript. Every entry was verified against the actual diff — click through to read the fix and convince yourself."]})]}),ee.jsx("ol",{className:"receipts-list",children:Ob.map(e=>ee.jsxs("li",{className:"receipt-card",children:[ee.jsxs("div",{className:"receipt-meta",children:[ee.jsx("span",{className:"receipt-project",children:e.project}),ee.jsxs("a",{className:"receipt-pr",href:e.url,target:"_blank",rel:"noreferrer",children:["#",e.number,ee.jsx("span",{className:"receipt-pr-arrow","aria-hidden":!0,children:"↗"})]}),ee.jsx("span",{className:"receipt-class",children:e.bugClass})]}),ee.jsx("h3",{className:"receipt-title",children:e.title}),ee.jsx("p",{className:"receipt-summary",children:e.summary}),ee.jsxs("p",{className:"receipt-bs",children:[ee.jsx("span",{className:"receipt-bs-mark","aria-hidden":!0,children:"↦"}),ee.jsx("span",{className:"receipt-bs-text",children:e.bs})]})]},e.id))})]})}function Qb(e){const{problem:t,problemId:n,setProblemId:r,bsSource:i,setBsSource:o,bsCompiled:s}=e,a=t.outcome==="structural",l=s.error!==null,c=a?"outcome outcome-structural":"outcome outcome-rejects";return ee.jsxs(ee.Fragment,{children:[ee.jsx("nav",{className:"tabs","aria-label":"problem",children:hr.map(d=>ee.jsx("button",{className:d.id===n?"tab tab-active":"tab",onClick:()=>r(d.id),children:d.label},d.id))}),ee.jsxs("section",{className:"problem-head",children:[ee.jsx("div",{className:"problem-meta",children:ee.jsx("span",{className:c,children:t.outcomeLabel})}),ee.jsx("h2",{className:"problem-title",children:t.title}),ee.jsx("p",{className:"problem-blurb",children:t.blurb}),ee.jsxs("p",{className:"problem-hint",children:["→ ",t.fixHint]}),a?ee.jsxs("p",{className:"problem-lint-note",children:["A strict ESLint config catches this too. The difference is that in ",ee.jsx("code",{children:".bs"})," the bug pattern has no shape to write — no config to remember, nothing for a model to slip past."]}):null]}),ee.jsxs("main",{className:a?"problem-panes problem-panes-structural":"problem-panes",children:[ee.jsxs("section",{className:"pane pane-ts",children:[ee.jsxs("div",{className:"pane-label",children:[ee.jsx("span",{children:"typescript — what bots write"}),ee.jsx("span",{className:"status-tag status-ts",children:"compiles fine"})]}),ee.jsx("pre",{className:"output",children:ee.jsx("code",{children:t.tsCode})})]}),ee.jsxs("section",{className:"pane pane-bs",children:[ee.jsxs("div",{className:"pane-label",children:[ee.jsx("span",{children:a?"↦ the only shape in .bs":"botscript — try editing"}),a?ee.jsx("span",{className:"status-tag status-by-design",children:"by design"}):l?ee.jsx("span",{className:"status-tag status-err",children:"rejected"}):ee.jsx("span",{className:"status-tag status-ok",children:"accepted"})]}),a?ee.jsx("pre",{className:"output",children:ee.jsx("code",{children:t.bsCode})}):ee.jsx("textarea",{className:"editor",value:i,spellCheck:!1,onChange:d=>o(d.target.value)})]}),ee.jsxs("section",{className:"pane pane-output",children:[ee.jsxs("div",{className:"pane-label",children:[ee.jsx("span",{children:a?"desugared typescript":"compiler output"}),a?null:l?ee.jsx("span",{className:"status-tag status-err",children:"error"}):ee.jsx("span",{className:"status-tag status-ok",children:"clean tsx"})]}),ee.jsx("pre",{className:l&&!a?"output output-err":"output",children:ee.jsx("code",{children:a?s.code:s.error??s.code})})]})]})]})}function Kb(e){const{snippetId:t,setSnippetId:n,snippetSource:r,setSnippetSource:i,snippetCompiled:o}=e;return ee.jsxs(ee.Fragment,{children:[ee.jsx("nav",{className:"tabs","aria-label":"snippet",children:jo.map(s=>ee.jsx("button",{className:s.id===t?"tab tab-active":"tab",onClick:()=>n(s.id),children:s.label},s.id))}),ee.jsxs("main",{className:"panes",children:[ee.jsxs("section",{className:"pane pane-input",children:[ee.jsxs("div",{className:"pane-label",children:[ee.jsx("span",{children:".bs source"}),ee.jsx("button",{type:"button",className:"fmt-button",onClick:()=>i(Wp(r)),title:"rewrite the buffer in canonical form",children:"format"})]}),ee.jsx("textarea",{className:"editor",value:r,spellCheck:!1,onChange:s=>i(s.target.value)})]}),ee.jsxs("section",{className:"pane pane-output",children:[ee.jsxs("div",{className:"pane-label",children:["compiled TypeScript",o.error&&ee.jsx("span",{className:"err-tag",children:"error"})]}),ee.jsx("pre",{className:o.error?"output output-err":"output",children:ee.jsx("code",{children:o.error??o.code})})]})]})]})}const $h=document.getElementById("root");if(!$h)throw new Error("missing #root");Lp($h).render(ee.jsx(Mt.StrictMode,{children:ee.jsx(Vb,{})}));
