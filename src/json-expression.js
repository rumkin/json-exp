var path = require('path');
var util = require('util');
var format = util.format;
var expressions = require('angular-expressions');

module.exports = JsonEx;
JsonEx.join = join;
JsonEx.defaults = defaults;

function JsonEx(document, options) {
    options = defaults(options || {}, {
        filename: null,
        helpers: ['require', 'extend'],
        scope: null,
        path: [],
        cache: {},
        root: process.cwd(),
        dir: '/'
    });

    if (! isObject(document)) throw new Error('Argument #1 should be an Object.');

    return compile(document, options, []);
}

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
                    if (isUndefined(item = matchRules(item, JsonEx.helpers, options, path.concat([i])))) {
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
        result = matchRules(target, JsonEx.helpers, options);
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
                    value = matchRules(value, JsonEx.helpers, options, path.concat([key]));
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

JsonEx.helpers = {
    require: function(object, options) {
        if (! object.hasOwnProperty('$require')) return void 0;

        var filename = path.resolve(options.dir, object.$require);

        if (options.cache.hasOwnProperty(filename)) return options.cache[filename];

        var data = require(path.join(options.root, filename));
        if (! isObject(data)) {
            throw new Error(format('Value of file "%s" is not an Object', filename, path));
        }
        var newOptions = util._extend({}, options);
        newOptions.filename = filename;
        newOptions.dir = path.dirname(filename);

        return options.cache[filename] = JsonEx(data, newOptions);
    },
    extend: function(object, options, path) {
        if (! object.hasOwnProperty('$extend')) return void 0;

        var target = compile(object.$extend, options, path.concat(['$extend']));
        var source = compile(object.$with, options, path.concat(['$with']));

        return join(target, source);
    }
};

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

function isObject(target) {
    return target && typeof target === 'object';
}

function isUndefined(target) {
    return typeof target === 'undefined';
}

function defaults(target, options) {
    Object.getOwnPropertyNames(options).forEach(function(name){
        if (! target.hasOwnProperty(name)) {
            target[name] = options[name];
        }
    });
    return target;
}

function join(target, source) {
    if (Array.isArray(source)) {
        target = source.map(function(item){
            if (! isObject(item)) return item;
            return join({}, item);
        });
    } else {
        Object.getOwnPropertyNames(source).forEach(function(name){
            var descriptor = Object.getOwnPropertyDescriptor(source, name);
            descriptor.JsonExurable = true;
            descriptor.writeable = true;

            if (isObject(descriptor.value)) {
                descriptor.value = join({}, descriptor.value);
            }

            Object.defineProperty(target, name, descriptor);
        });
    }

    return target;
}
