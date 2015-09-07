var path = require('path');
var util = require('util');
var format = util.format;
var expressions = require('angular-expressions');

module.exports = jsonExp;
jsonExp.copy = copy;
jsonExp.defaults = defaults;

/**
 * Target Object, Array or Json Expression.
 * @param {object, *[], {$:string}} expression Value to evaluate.
 * @param {{}} options JsonExpressions options
 * @returns {*}
 */
function jsonExp(expression, options) {
    options = defaults(options || {}, {
        id: '',
        helpers: jsonExp.helpers,
        scope: null,
        interpolation: /\$\{([a-z0-9A-Z_]+(\.[a-z0-9A-Z]+)*)}/g,
        cache: {}
    });

    if (! isObject(expression)) throw new Error('Argument #1 should be an Object.');

    var helpers = options.helpers;

    Object.getOwnPropertyNames(helpers).forEach(function(helper){
        if (typeof helpers[helper].init === 'function') {
            helpers[helper].init(expression, options);
        }
    });

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
                    bindExpression(result, i, item.$, options);
                } else {
                    if (isUndefined(item = matchHelpers(item, options, path.concat([i])))) {
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
        result = matchHelpers(target, options, path);
        if (! isUndefined(result)) {
            target = result;
        }

        result = {};

        if (options.scope === null) {
            options.scope = result;
        }

        Object.getOwnPropertyNames(target).forEach(function(key) {
            var value = target[key];

            if (isObject(value)) {
                if (value.hasOwnProperty('$')) {
                    bindExpression(result, key, value.$, options);
                } else {
                    value = matchHelpers(value, options, path.concat([key]));
                    if (isUndefined(value)) {
                        value = target[key];
                    }
                    result[key] = compile(value, options, path.concat([key]));
                }
            } else if (typeof value === 'string' && options.interpolation.test(value)) {
                Object.defineProperty(result, key, {
                    get: function() {
                        var scope = Object.create(options.scope);
                        scope._ = result;
                        return value.replace(options.interpolation, function(match, value){
                            var path = value.split('.');
                            var target = scope;

                            while(path.length) {
                                if (util.isObject(target) && path[0] in target) {
                                    target = target[path.shift()];
                                } else {
                                    return;
                                }
                            }

                            return target;
                        });
                    }
                });
            } else {
                result[key] = value;
            }
        });
    }

    Object.defineProperty(result, 'clone', {
        enumerable: false,
        configurable: true,
        value: function(){
            return copy({}, this);
        }
    });

    return result;
}

function bindExpression(target, key, expression, options) {
    Object.defineProperty(target, key, {
        configurable: true,
        get: function() {
            var scope = Object.create(options.scope);
            scope._ = target;
            return expressions.compile(expression)(scope);
        }
    });
}

/**
 * Helpers dictionary. <string, function(object, options, path)>.
 * @type {{}}
 */
jsonExp.helpers = {
    require: {
        init: function(target, options, path) {

        },
        /**
         * Require helper routine. Use `$require` object property to specify value.
         * @param {object} target Target object to search rule match.
         * @param {object} options Compilation options.
         * @returns {undefined|object}
         */
        routine: function(target, options) {
            if (! target.hasOwnProperty('$require')) return void 0;

            var id = path.resolve(options.dir, target.$require);

            if (options.cache.hasOwnProperty(id)) return options.cache[id];

            var data = require(path.join(options.root, id));
            if (! isObject(data)) {
                throw new Error(format('Value of file "%s" is not an Object', id));
            }
            var newOptions = util._extend({}, options);
            newOptions.id = id;
            newOptions.dir = path.dirname(id);

            return options.cache[id] = jsonExp(data, newOptions);
        }
    },
    extend: {
        init: function(target, options) {
            defaults(options, {
                root: process.cwd(),
                dir: '/'
            });
        },
        /**
         * Extend helper routine. Use `$extend` object property to specify extension target.
         * @param {object} object Target object.
         * @param {object} options JsonExp options.
         * @param {string} path
         * @returns {undefined|Object}
         */
        routine: function(object, options, path) {
            if (! object.hasOwnProperty('$extend')) return void 0;

            var target = compile(object.$extend, options, path.concat(['$extend']));
            var source = compile(object.$with, options, path.concat(['$with']));

            return copy(target, source, {append: ['$root']});
        }
    }
};

/**
 * Check if object is a JsonExpression rule.
 * @param {object} target Target value.
 * @param {object} options JsonExp options.
 * @param {string[]} path Current target path.
 * @returns {undefined|object}
 */
function matchHelpers(target, options, path) {
    helpers = options.helpers;
    var list = Object.getOwnPropertyNames(helpers);

    var i = -1;
    var l = list.length;
    var name, helper, result;

    while (++i < l) {
        name = list[i];
        helper = helpers[name];
        if (! isObject(helper) || typeof helper.routine !== 'function') {
            throw new Error(format('Helper "%s" routine is not a function', name));
        }

        result = helper.routine(target, options, path);
        if (! isUndefined(result)) return result;
    }

    return void 0;
}

/**
 * Check if value is an object.
 * @param {*} target
 * @returns {boolean}
 */
function isObject(target) {
    return !!target && typeof target === 'object';
}

/**
 * Check if object is a native object.
 * @param {*} target Value to check.
 * @returns {boolean}
 */
function isNativeObject(target) {
    return isObject(target) && target.constructor === Object;
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
 * Copy properties from source to target using `Object.defineProperty` and `Object.getOwnPropertyDescriptor`. Options
 * could have keys to prevent cloning properties by regex mask or to force clone non-native objects.
 *
 * @param {object} target Target object
 * @param {object} source Source object
 * @params {object} options Copy options has `exclude` and `include` options
 * @returns {object}
 */
function copy(target, source, options) {
    options = options || {};
    if (Array.isArray(source)) {
        target = source.map(function(item){
            if (! isObject(item)) return item;
            return copy({}, item, options);
        });
    } else {
        Object.getOwnPropertyNames(source).forEach(function(name){
            var descriptor = Object.getOwnPropertyDescriptor(source, name);
            descriptor.configurable = true;
            descriptor.writeable = true;

            if (options.exclude && options.exclude.test(name)) return;

            if (isObject(descriptor.value)) {
                if (descriptor.value === source) {
                    descriptor.value = target;
                } else if (options.force || isNativeObject(descriptor.value) || Array.isArray(descriptor.value)) {
                    descriptor.value = copy({}, descriptor.value, options);
                }
            }

            Object.defineProperty(target, name, descriptor);
        });
    }

    return target;
}
