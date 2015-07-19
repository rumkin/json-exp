var should = require('should');
var jsonx = require('../src/json-expression.js');

describe('Library', function () {
    it('Should have proper interface.', function () {
        should(jsonx).have.type('function');
        should(jsonx).ownProperty('join').have.type('function');
        should(jsonx).ownProperty('defaults').have.type('function');
    });

    describe('Expressions', function () {
        var result;

        before(function () {
            result = jsonx({
                a: 1,
                b: 2,
                c: {$: 'a + b'},
                d: [
                    {$: 'a + a'},
                    {$: 'b + b'},
                    {$: 'c + c'}
                ],
                e: {$require: 'require.json'}
            }, {
                root: __dirname
            });
        });

        it('JsonEx function should return object', function(){
            should(result).have.type('object');
        });

        it('result.a should to be number 1', function () {
            should(result).ownProperty('a').have.type('number').and.equal(1);
        });

        it('result.b should to be number 2', function () {
            should(result).ownProperty('b').have.type('number').and.equal(2);
        });

        it('result.c should to be a number 3', function(){
            should(result.c).have.type('number').and.equal(3);
        });

        it('result.d[0] should to be a number 2', function(){
            should(result.d[0]).have.type('number').and.equal(2);
        });

        it('result.d[1] should to be a number 4', function(){
            should(result.d[1]).have.type('number').and.equal(4);
        });

        it('result.d[2] should to be a number 2', function(){
            should(result.d[2]).have.type('number').and.equal(6);
        });
    });

    describe('$require rule.', function(){
        var result;

        before(function () {
            result = jsonx({
                required: {$require: 'require.json'}
            }, {
                root: __dirname
            });
        });



        it('result.required should to be an Object {"foo":"bar"}', function () {
            should(result.required).be.an.Object().and.ownProperty('foo').equal('bar');
        });
    });

    describe('$extend rule.', function(){
        var result;

        before(function () {
            result = jsonx({
                foo: {
                   bar: true
                },
                baz: {
                    $extend: {
                        bak: false
                    },
                    $with: {$:'foo'}
                }
            }, {
                root: __dirname
            });
        });



        it('result.baz should to be an Object {"bar": true, "bak": false}', function () {
            should(result.baz).be.an.Object().and.ownProperty('bar').equal(true);
            should(result.baz).be.an.Object().and.ownProperty('bak').equal(false);
        });
    });
});