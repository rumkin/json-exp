var should = require('should');
var jsonExp = require('../src/json-expression.js');

describe('Library', function () {
    it('Should have proper interface.', function () {
        should(jsonExp).have.type('function');
        should(jsonExp).ownProperty('copy').have.type('function');
        should(jsonExp).ownProperty('defaults').have.type('function');
    });

    describe('Expressions', function () {
        var result;

        before(function () {
            result = jsonExp({
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

        describe('Multiple instances', function () {
            var one, two;
            before(function () {
                var json = {
                    a: 1,
                    b: 2,
                    c: {$: 'a + b'}
                };

                one = jsonExp(json);
                two = jsonExp(json);
            });

            it('Should have different scopes', function () {
                one.a = 3;

                should(one.c).have.type('number').and.equal(5);
                should(two.c).have.type('number').and.equal(3);
            });
        });
    });

    describe('Interpolation', function () {
        it('Should put value into string', function () {
            var result = jsonExp({
                test: "Hello ${name}"
            }, {
                scope: {
                    name: 'world'
                }
            });

            should(result.test).have.type('string').and.equal('Hello world');
        });

        it('Should interpolate with getter', function () {
            var scope = {
                name: 'world'
            };

            var result = jsonExp({
                test: "Hello ${name}"
            }, {
                scope: scope
            });

            should(result.test).have.type('string').and.equal('Hello world');

            scope.name = 'user';

            should(result.test).have.type('string').and.equal('Hello user');
        });
    });

    describe('Depth and this', function(){
        it('Should interpret _ as this with expression', function(){
            var result = jsonExp({
                user: {
                    name: 'John',
                    surname: 'Smith',
                    fullName: {$:'_.name + " " + _.surname'}
                }
            });

            should(result).have.type('object')
                .and.have.property('user')
                .which.have.property('fullName')
                .which.equal('John Smith');
        });

        it('Should interpret _ as this with evaluation', function(){
            var result = jsonExp({
                user: {
                    name: 'John',
                    surname: 'Smith',
                    fullName: '${_.name} ${_.surname}'
                }
            });

            should(result).have.type('object')
                .and.have.property('user')
                .which.have.property('fullName')
                .which.equal('John Smith');
        });
    });


    describe('$require rule.', function(){
        var result;

        before(function () {
            result = jsonExp({
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
            result = jsonExp({
                foo: {
                   bar: true
                },
                baz: {
                    $extend: {
                        bak: false
                    },
                    $with: {$: 'foo'}
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

    describe('JsonExp copy method', function () {
        it('Should copy objects', function () {
            var source = {};
            Object.defineProperty(source, 'foo', {
                get: function(){
                    return "bar";
                }
            });
            var target = jsonExp.copy({}, source);

            should(target).hasOwnProperty('foo').which.equal('bar');
        });

        it('Should copy arrays', function(){
            var source = {
                array: [1,2,3]
            };

            var target = jsonExp.copy({}, source);

            source.array.push(4);
            should(target).hasOwnProperty('array').which.is.an.Array().with.length(3);
        });
    });
});