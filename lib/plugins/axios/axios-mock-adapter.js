(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("axios"));
	else if(typeof define === 'function' && define.amd)
		define(["axios"], factory);
    else if (window.define.cmd) {
        // CMD模式
        window.define(function (require, exports, module) {
            return factory(require('axios'));
        });
    }
	else if(typeof exports === 'object')
		exports["AxiosMockAdapter"] = factory(require("axios"));
	else
		root["AxiosMockAdapter"] = factory(root["axios"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_3__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var handleRequest = __webpack_require__(1);

	var VERBS = ['get', 'post', 'head', 'delete', 'patch', 'put'];

	function adapter() {
	  return function(config) {
	    var mockAdapter = this;
	    // axios >= 0.13.0 only passes the config and expects a promise to be
	    // returned. axios < 0.13.0 passes (config, resolve, reject).
	    if (arguments.length === 3) {
	      handleRequest(mockAdapter, arguments[0], arguments[1], arguments[2]);
	    } else {
	      return new Promise(function(resolve, reject) {
	        handleRequest(mockAdapter, resolve, reject, config);
	      });
	    }
	  }.bind(this);
	}

	function reset() {
	  this.handlers = VERBS.reduce(function(accumulator, verb) {
	    accumulator[verb] = [];
	    return accumulator;
	  }, {});
	  this.replyOnceHandlers = [];
	}

	function MockAdapter(axiosInstance, options) {
	  reset.call(this);

	  if (axiosInstance) {
	    this.axiosInstance = axiosInstance;
	    this.originalAdapter = axiosInstance.defaults.adapter;
	    this.delayResponse = options && options.delayResponse > 0
	      ? options.delayResponse
	      : null;
	    axiosInstance.defaults.adapter = adapter.call(this);
	  }
	}

	MockAdapter.prototype.adapter = adapter;

	MockAdapter.prototype.restore = function restore() {
	  if (this.axiosInstance) {
	    this.axiosInstance.defaults.adapter = this.originalAdapter;
	  }
	};

	MockAdapter.prototype.reset = reset;

	VERBS.concat('any').forEach(function(method) {
	  var methodName = 'on' + method.charAt(0).toUpperCase() + method.slice(1);
	  MockAdapter.prototype[methodName] = function(matcher, body) {
	    var _this = this;
	    var matcher = matcher === undefined ?  /.*/ : matcher;
	    return {
	      reply: function reply(code, response, headers) {
	        var handler = [matcher, body, code, response, headers];
	        addHandler(method, _this.handlers, handler);
	        return _this;
	      },

	      replyOnce: function replyOnce(code, response, headers) {
	        var handler = [matcher, body, code, response, headers];
	        addHandler(method, _this.handlers, handler);
	        _this.replyOnceHandlers.push(handler);
	        return _this;
	      },

	      passThrough: function passThrough() {
	        var handler = [matcher, body];
	        addHandler(method, _this.handlers, handler);
	        return _this;
	      }
	    };
	  };
	});

	function addHandler(method, handlers, handler) {
	  if (method === 'any') {
	    VERBS.forEach(function(verb) {
	      handlers[verb].push(handler);
	    });
	  } else {
	    handlers[method].push(handler);
	  }
	}

	module.exports = MockAdapter;


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var utils = __webpack_require__(2);

	function makeResponse(result, config) {
	  return {
	    status: result[0],
	    data: result[1],
	    headers: result[2],
	    config: config
	  };
	}

	function handleRequest(mockAdapter, resolve, reject, config) {
	  if (config.baseURL && config.url.substr(0, config.baseURL.length) === config.baseURL) {
	    config.url = config.url.slice(config.baseURL ? config.baseURL.length : 0);
	  }
	  config.adapter = null;

	  var handler = utils.findHandler(mockAdapter.handlers, config.method, config.url, config.data);

	  if (handler) {
	    utils.purgeIfReplyOnce(mockAdapter, handler);

	    if (handler.length === 2) { // passThrough handler
	      mockAdapter
	        .axiosInstance
	        .request(config)
	        .then(resolve, reject);
	    } else if (!(handler[2] instanceof Function)) {
	      utils.settle(resolve, reject, makeResponse(handler.slice(2), config), mockAdapter.delayResponse);
	    } else {
	      var result = handler[2](config);
	      // TODO throw a sane exception when return value is incorrect
	      if (!(result.then instanceof Function)) {
	        utils.settle(resolve, reject, makeResponse(result, config), mockAdapter.delayResponse);
	      } else {
	        result.then(
	          function(result) {
	            utils.settle(resolve, reject, makeResponse(result, config), mockAdapter.delayResponse);
	          },
	          function(error) {
	            if (mockAdapter.delayResponse > 0) {
	              setTimeout(function() {
	                reject(error);
	              }, mockAdapter.delayResponse);
	            } else {
	              reject(error);
	            }
	          }
	        );
	      }
	    }
	  } else { // handler not found
	    utils.settle(resolve, reject, {
	      status: 404,
	      config: config
	    }, mockAdapter.delayResponse);
	  }
	}

	module.exports = handleRequest;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var axios = __webpack_require__(3);
	var deepEqual = __webpack_require__(4);

	function isEqual(a, b) {
	  return deepEqual(a, b, { strict: true });
	}

	// < 0.13.0 will not have default headers set on a custom instance
	var rejectWithError = !!axios.create().defaults.headers;

	function find(array, predicate) {
	  var length = array.length;
	  for (var i = 0; i < length; i++) {
	    var value = array[i];
	    if (predicate(value)) return value;
	  }
	}

	function findHandler(handlers, method, url, body) {
	  return find(handlers[method.toLowerCase()], function(handler) {
	    if (typeof handler[0] === 'string') {
	      return url === handler[0] && isBodyMatching(body, handler[1]);
	    } else if (handler[0] instanceof RegExp) {
	      return handler[0].test(url) && isBodyMatching(body, handler[1]);
	    }
	  });
	}

	function isBodyMatching(body, requiredBody) {
	  if (requiredBody === undefined) {
	    return true;
	  }
	  var parsedBody;
	  try {
	    parsedBody = JSON.parse(body);
	  } catch (e) { }
	  return parsedBody ? isEqual(parsedBody, requiredBody) : isEqual(body, requiredBody);
	}

	function purgeIfReplyOnce(mock, handler) {
	  var index = mock.replyOnceHandlers.indexOf(handler);
	  if (index > -1) {
	    mock.replyOnceHandlers.splice(index, 1);

	    Object.keys(mock.handlers).forEach(function(key) {
	      index = mock.handlers[key].indexOf(handler);
	      if (index > -1) {
	        mock.handlers[key].splice(index, 1);
	      }
	    });
	  }
	}

	function settle(resolve, reject, response, delay) {
	  if (delay > 0) {
	    setTimeout(function() {
	      settle(resolve, reject, response);
	    }, delay);
	    return;
	  }

	  if (response.config && response.config.validateStatus) {
	    response.config.validateStatus(response.status)
	      ? resolve(response)
	      : reject(createErrorResponse(
	        'Request failed with status code ' + response.status,
	        response.config,
	        response
	      ));
	    return;
	  }

	  // Support for axios < 0.11
	  if (response.status >= 200 && response.status < 300) {
	    resolve(response);
	  } else {
	    reject(response);
	  }
	}

	function createErrorResponse(message, config, response) {
	  // Support for axios < 0.13.0
	  if (!rejectWithError) return response;

	  var error = new Error(message);
	  error.config = config;
	  error.response = response;
	  return error;
	}

	module.exports = {
	  find: find,
	  findHandler: findHandler,
	  purgeIfReplyOnce: purgeIfReplyOnce,
	  settle: settle
	};


/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_3__;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var pSlice = Array.prototype.slice;
	var objectKeys = __webpack_require__(5);
	var isArguments = __webpack_require__(6);

	var deepEqual = module.exports = function (actual, expected, opts) {
	  if (!opts) opts = {};
	  // 7.1. All identical values are equivalent, as determined by ===.
	  if (actual === expected) {
	    return true;

	  } else if (actual instanceof Date && expected instanceof Date) {
	    return actual.getTime() === expected.getTime();

	  // 7.3. Other pairs that do not both pass typeof value == 'object',
	  // equivalence is determined by ==.
	  } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
	    return opts.strict ? actual === expected : actual == expected;

	  // 7.4. For all other Object pairs, including Array objects, equivalence is
	  // determined by having the same number of owned properties (as verified
	  // with Object.prototype.hasOwnProperty.call), the same set of keys
	  // (although not necessarily the same order), equivalent values for every
	  // corresponding key, and an identical 'prototype' property. Note: this
	  // accounts for both named and indexed properties on Arrays.
	  } else {
	    return objEquiv(actual, expected, opts);
	  }
	}

	function isUndefinedOrNull(value) {
	  return value === null || value === undefined;
	}

	function isBuffer (x) {
	  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
	  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
	    return false;
	  }
	  if (x.length > 0 && typeof x[0] !== 'number') return false;
	  return true;
	}

	function objEquiv(a, b, opts) {
	  var i, key;
	  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
	    return false;
	  // an identical 'prototype' property.
	  if (a.prototype !== b.prototype) return false;
	  //~~~I've managed to break Object.keys through screwy arguments passing.
	  //   Converting to array solves the problem.
	  if (isArguments(a)) {
	    if (!isArguments(b)) {
	      return false;
	    }
	    a = pSlice.call(a);
	    b = pSlice.call(b);
	    return deepEqual(a, b, opts);
	  }
	  if (isBuffer(a)) {
	    if (!isBuffer(b)) {
	      return false;
	    }
	    if (a.length !== b.length) return false;
	    for (i = 0; i < a.length; i++) {
	      if (a[i] !== b[i]) return false;
	    }
	    return true;
	  }
	  try {
	    var ka = objectKeys(a),
	        kb = objectKeys(b);
	  } catch (e) {//happens when one is a string literal and the other isn't
	    return false;
	  }
	  // having the same number of owned properties (keys incorporates
	  // hasOwnProperty)
	  if (ka.length != kb.length)
	    return false;
	  //the same set of keys (although not necessarily the same order),
	  ka.sort();
	  kb.sort();
	  //~~~cheap key test
	  for (i = ka.length - 1; i >= 0; i--) {
	    if (ka[i] != kb[i])
	      return false;
	  }
	  //equivalent values for every corresponding key, and
	  //~~~possibly expensive deep test
	  for (i = ka.length - 1; i >= 0; i--) {
	    key = ka[i];
	    if (!deepEqual(a[key], b[key], opts)) return false;
	  }
	  return typeof a === typeof b;
	}


/***/ },
/* 5 */
/***/ function(module, exports) {

	exports = module.exports = typeof Object.keys === 'function'
	  ? Object.keys : shim;

	exports.shim = shim;
	function shim (obj) {
	  var keys = [];
	  for (var key in obj) keys.push(key);
	  return keys;
	}


/***/ },
/* 6 */
/***/ function(module, exports) {

	var supportsArgumentsClass = (function(){
	  return Object.prototype.toString.call(arguments)
	})() == '[object Arguments]';

	exports = module.exports = supportsArgumentsClass ? supported : unsupported;

	exports.supported = supported;
	function supported(object) {
	  return Object.prototype.toString.call(object) == '[object Arguments]';
	};

	exports.unsupported = unsupported;
	function unsupported(object){
	  return object &&
	    typeof object == 'object' &&
	    typeof object.length == 'number' &&
	    Object.prototype.hasOwnProperty.call(object, 'callee') &&
	    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
	    false;
	};


/***/ }
/******/ ])
});
;