var path = require('path');
var util = require('util');
var format = util.format;
var expressions = require('angular-expressions');

module.exports = jsonEx;
jsonEx.join = join;
jsonEx.defaults = defaults;

/**
 * Target Object, Array or jsonExpression.
 * @param {object, *[], {$:string}} expression Value to evaluate.
 * @param {{}} options jsonExpressions options
 * @returns {*}
 */
function jsonEx(expression, options) {
    options = defaults(options || {}, {
        filename: null,
        helpers: ['require', 'extend'],
        scope: null,
        path: [],
        cache: {},
        root: process.cwd(),
        dir: '/'
    });

    if (! isObject(expression)) throw new Error('Argument #1 should be an Object.');

    return compile(expression, options, []);
}

/**
 * Compile rules
 * @param {object|*[]|{$:string}} target Object, Array or JsonExpression value.
 * @param {{}} options Compilation options.
 * @param {String[]} path Path
 * @returns {object|*[]}
 */
function compile(target, options, path) {

    var result;
    if (Array.isArray(target)) {
        result = [];
        target.forEach(function (item, i) {
            if (isObject(item)) {
                if (item.hasOwnProperty('$')) {
                    Object.defineProperty(result, i, {
                        configurable: true,
                        get: function () {
                            return expressions.compile(item.$)(options.scope);
                        }
                    });
                } else {
                    if (isUndefined(item = matchRules(item, jsonEx.helpers, options, path.concat([i])))) {
                        item = result[i];
                    }
                    result[i] = compile(item, options, path.concat([i]));
                }
            } else {
                result[i] = item;
            }
        });
    } else if (target.hasOwnProperty('$')) {
        result = expressions.compile(target.$)(options.scope);
    } else {
        result = matchRules(target, jsonEx.helpers, options);
        if (isUndefined(result)) {
            result = target;
        }

        if (options.scope === null) {
            options.scope = result;
        }

        Object.keys(result).forEach(function(key) {
            var value = result[key];

            if (isObject(value)) {
                if (value.hasOwnProperty('$')) {
                    Object.defineProperty(result, key, {
                        configurable: true,
                        get: function() {
                            return expressions.compile(value.$)(options.scope);
                        }
                    });
                } else {
                    value = matchRules(value, jsonEx.helpers, options, path.concat([key]));
                    if (isUndefined(value)) {
                        value = result[key];
                    }
                    result[key] = compile(value, options, path.concat([key]));
                }
            } else {
                result[key] = value;
            }
        });
    }

    return result;
}

/**
 * Helpers dictionary. <string, function(object, options, path)>.
 * @type {{}}
 */
jsonEx.helpers = {
    /**
     * Require rule helper. Use `$require` object property to specify value.
     * @param {object} target Target object to search rule match.
     * @param {object} options Compilation options.
     * @returns {undefined|object}
     */
    require: function(target, options) {
        if (! target.hasOwnProperty('$require')) return void 0;

        var filename = path.resolve(options.dir, target.$require);

        if (options.cache.hasOwnProperty(filename)) return options.cache[filename];

        var data = require(path.join(options.root, filename));
        if (! isObject(data)) {
            throw new Error(format('Value of file "%s" is not an Object', filename));
        }
        var newOptions = util._extend({}, options);
        newOptions.filename = filename;
        newOptions.dir = path.dirname(filename);

        return options.cache[filename] = jsonEx(data, newOptions);
    },
    /**
     * Extend rule helper. Use `$extend` object property to specify extension target.
     * @param {object} object Target object.
     * @param {object} options JsonEx options.
     * @param {string} path
     * @returns {undefined|Object}
     */
    extend: function(object, options, path) {
        if (! object.hasOwnProperty('$extend')) return void 0;

        var target = compile(object.$extend, options, path.concat(['$extend']));
        var source = compile(object.$with, options, path.concat(['$with']));

        return join(target, source);
    }
};

/**
 * Check if object is a JsonExpression rule.
 * @param {object} document Target value.
 * @param {string[]} helpers Helper names array. Defines helpers order
 * @param {object} options JsonEx options.
 * @param {string[]} path Current target path.
 * @returns {undefined|object}
 */
function matchRules(document, helpers, options, path) {
    var i = -1;
    var l = options.helpers.length;
    var helper, result;

    while (++i < l) {
        helper = options.helpers[i];
        if (typeof helpers[helper] !== 'function') {
            throw new Error('Rule "' + helper + '" not found');
        }

        result = helpers[helper](document, options, path);
        if (! isUndefined(result)) return result;
    }

    return void 0;
}

/**
 * Check if value is an object.
 * @param {*} target
 * @returns {*|boolean}
 */
function isObject(target) {
    return target && typeof target === 'object';
}

/**
 * Check if value is an undefined.
 * @param target
 * @returns {boolean}
 */
function isUndefined(target) {
    return typeof target === 'undefined';
}

/**
 * Add missed properties from source to target
 * @param {object} target Target object
 * @param {object} source Default values source
 * @returns {*}
 */
function defaults(target, source) {
    if (! isObject(target)) target = {};

    Object.getOwnPropertyNames(source).forEach(function(name){
        if (! target.hasOwnProperty(name)) {
            target[name] = source[name];
        }
    });
    return target;
}

/**
 * Copy properties from source to target using `Object.defineProperty` and `Object.getOwnPropertyDescriptor`
 * @param {object} target Target object
 * @param {object} source Source object
 * @returns {object}
 */
function join(target, source) {
    if (Array.isArray(source)) {
        target = source.map(function(item){
            if (! isObject(item)) return item;
            return join({}, item);
        });
    } else {
        Object.getOwnPropertyNames(source).forEach(function(name){
            var descriptor = Object.getOwnPropertyDescriptor(source, name);
            descriptor.jsonExurable = true;
            descriptor.writeable = true;

            if (isObject(descriptor.value)) {
                descriptor.value = join({}, descriptor.value);
            }

            Object.defineProperty(target, name, descriptor);
        });
    }

    return target;
}
