![Travis](https://img.shields.io/travis/rumkin/json-exp/master.svg)

# JSON Expressions

Extensible expressions for json objects based on angular expressions parser.

## Install

Install using npm:
```
npm install json-exp
```

## Usage

Property evaluation:

```javascript
var json = {
    a: 1,
    b: 2,
    c: {$: 'a + b'}
};

var result = jsonExp(json);
result.c // => Number:3

result.a = 3;
result.c // => Number:5
```

Scopes:

```javascript
var scope = {
    user: 'World'
};

var result = jsonExp({
    hello: {$: '"Hello " + user'}
}, {
    scope: scope
});

result.hello; // => String: 'Hello World'
```
