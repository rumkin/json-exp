![Travis](https://img.shields.io/travis/rumkin/json-exp/master.svg)

# JSON Expressions

Extensible expressions for json objects based on angular expressions parser.

## Install

Install using npm:
```
npm install json-exp
```

## String interpolation

```javascript
var result = jsonExp({
    name: "World",
    hello: "Hello ${name}"
});

result.hello; // => String: 'Hello World'
```

## Expression evaluation

```javascript
var json = {
    a: 1,
    b: 2,
    c: {$: 'a + b'}
};

var result = jsonExp(json);
result.c // => Number: 3

result.a = 3;
result.c // => Number: 5
```

## Scope

```javascript
var scope = {
    name: 'World'
};

var result = jsonExp({
    hello: {$: '"Hello " + name'}
}, {
    scope: scope
});

result.hello; // => String: 'Hello World'
```

## Depth

```javascript
var result = JsonExp({
    user : {
        name: 'John'
    },
    userName: '$user.name'
});

result.userName; // => String: 'John'
```

```javascript
var result = JsonExp({
    user : {
        name: 'John',
        surname: 'Smith'
        fullName: '${_.name} ${_.surname}
    }
});

result.user.fullName; // => String: 'John Smith'
```