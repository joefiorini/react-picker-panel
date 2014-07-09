/* Compiled : 2014-07-08 20:54 */
(function(root) {
    'use strict';

    /**
       % bilby.js

       ![](http://brianmckenna.org/files/bilby.png)

       # Build status

       Main
       [![Build Status](https://secure.travis-ci.org/puffnfresh/bilby.js.png)](http://travis-ci.org/puffnfresh/bilby.js)

       Dependency
       [![Dependencies](https://david-dm.org/SimonRichardson/bilby.js.png)](https://david-dm.org/SimonRichardson/bilby.js)

       # Description

       bilby.js is a serious functional programming library. Serious,
       meaning it applies category theory to enable highly abstract
       and generalised code. Functional, meaning that it enables
       referentially transparent programs.

       Some features include:

       * Immutable multimethods for ad-hoc polymorphism
       * Functional data structures
       * Automated specification testing (ScalaCheck, QuickCheck)
       * Fantasy Land compatible

       ![](https://raw.github.com/puffnfresh/fantasy-land/master/logo.png)

       # Usage

       node.js:

           var bilby = require('bilby');

       Browser:

           <script src="bilby-min.js"></script>

       # Development

       Download the code with git:

           git clone https://github.com/puffnfresh/bilby.js.git

       Install the development dependencies with npm:

           npm install

       Run the tests with grunt:

           npm test

       Build the concatenated scripts with grunt:

           $(npm bin)/grunt

       Generate the documentation with emu:

           $(npm bin)/emu < bilby.js
    **/

    /* bilby's environment means `this` is special */
    /*jshint validthis: true*/

    /* bilby uses the !(this instanceof c) trick to remove `new` */
    /*jshint newcap: false*/

    var bilby;

    /**
       # Environment
    
       Environments are very important in bilby. The library itself is
       implemented as a single environment.
    
       An environment holds methods and properties.
    
       Methods are implemented as multimethods, which allow a form of
       *ad-hoc polymorphism*. Duck typing is another example of ad-hoc
       polymorphism but only allows a single implementation at a time, via
       prototype mutation.
    
       A method instance is a product of a name, a predicate and an
       implementation:
    
           var env = bilby.environment()
               .method(
                   // Name
                   'negate',
                   // Predicate
                   function(n) {
                       return typeof n == 'number';
                   },
                   // Implementation
                   function(n) {
                       return -n;
                   }
               );
    
           env.negate(100) == -100;
    
       We can now override the environment with some more implementations:
    
           var env2 = env
               .method(
                   'negate',
                   function(b) {
                       return typeof b == 'boolean';
                   },
                   function(b) {
                       return !b;
                   }
               );
    
           env2.negate(100) == -100;
           env2.negate(true) == false;
    
       The environments are immutable; references to `env` won't see an
       implementation for boolean. The `env2` environment could have
       overwritten the implementation for number and code relying on `env`
       would still work.
    
       Properties can be accessed without dispatching on arguments. They
       can almost be thought of as methods with predicates that always
       return true:
    
           var env = bilby.environment()
               .property('name', 'Brian');
    
           env.name == 'Brian';
    
       This means that bilby's methods can be extended:
    
           function MyData(data) {
               this.data = data;
           }
    
           var _ = bilby.method(
               'equal',
               bilby.isInstanceOf(MyData),
               function(a, b) {
                   return this.equal(a.data, b.data);
               }
           );
    
           _.equal(
               new MyData(1),
               new MyData(1)
           ) == true;
    
           _.equal(
               new MyData(1),
               new MyData(2)
           ) == false;
    **/
    
    function findRegistered(registrations, args) {
        var i;
    
        for(i = 0; i < registrations.length; i++) {
            if(registrations[i].predicate.apply(this, args))
                return registrations[i].f;
        }
    
        throw new Error("Method not implemented for this input");
    }
    
    function makeMethod(registrations) {
        return function() {
            var args = [].slice.call(arguments);
            return findRegistered(registrations, args).apply(this, args);
        };
    }
    
    /**
       ## environment(methods = {}, properties = {})
    
       * method(name, predicate, f) - adds an multimethod implementation
       * property(name, value) - sets a property to value
       * envConcat(extraMethods, extraProperties) - adds methods + properties
       * envAppend(e) - combines two environemts, biased to `e`
    **/
    function environment(methods, properties) {
        // Need to check if this.method and this.property are set incase
        // we're calling bilby.environment()
        var self = this instanceof environment && !this.method && !this.property ? this : create(environment.prototype),
            i;
    
        methods = methods || {};
        properties = properties || {};
    
        self.method = curry(function(name, predicate, f) {
            var newMethods = extend(methods, singleton(name, (methods[name] || []).concat({
                predicate: predicate,
                f: f
            })));
            return environment(newMethods, properties);
        });
    
        self.property = curry(function(name, value) {
            var newProperties = extend(properties, singleton(name, value));
            return environment(methods, newProperties);
        });
    
        self.envConcat = function(extraMethods, extraProperties) {
            var newMethods = {},
                newProperties = {},
                i;
    
            for(i in methods) {
                newMethods[i] = methods[i].concat(extraMethods[i]);
            }
            for(i in extraMethods) {
                if(i in newMethods) continue;
                newMethods[i] = extraMethods[i];
            }
    
            return environment(
                newMethods,
                extend(properties, extraProperties)
            );
        };
    
        self.envAppend = function(e) {
            return e.envConcat(methods, properties);
        };
    
        for(i in methods) {
            if(self[i]) throw new Error("Method " + i + " already in environment.");
            self[i] = makeMethod(methods[i]);
        }
    
        for(i in properties) {
            if(self[i]) throw new Error("Property " + i + " already in environment.");
            self[i] = properties[i];
        }
    
        return self;
    }

    bilby = environment();
    bilby = bilby.property('environment', environment);

    /**
       # Helpers
    
       The helpers module is a collection of functions used often inside
       of bilby.js or are generally useful for programs.
    **/
    
    /**
        ## functionName(f)
    
        Returns the name of function `f`.
    **/
    function functionName(f) {
        return f._name || f.name;
    }
    
    /**
        ## functionLength(f)
    
        Returns the arity of function `f`.
    **/
    function functionLength(f) {
        return f._length || f.length;
    }
    
    /**
       ## bind(f)(o)
    
       Makes `this` inside of `f` equal to `o`:
    
           bilby.bind(function() { return this; })(a)() == a
    
       Also partially applies arguments:
    
           bilby.bind(bilby.add)(null, 10)(32) == 42
    **/
    function bind(f) {
        function curriedBind(o) {
            var args = [].slice.call(arguments, 1),
                g;
    
            if(f.bind) {
                g = f.bind.apply(f, [o].concat(args));
            } else {
                g = function() {
                    return f.apply(o, args.concat([].slice.call(arguments)));
                };
            }
    
            // Can't override length but can set _length for currying
            g._length = Math.max(functionLength(f) - args.length, 0);
    
            return g;
        }
        // Manual currying since `curry` relies in bind.
        if(arguments.length > 1) return curriedBind.apply(this, [].slice.call(arguments, 1));
        return curriedBind;
    }
    
    /**
       ## curry(f)
    
       Takes a normal function `f` and allows partial application of its
       named arguments:
    
           var add = bilby.curry(function(a, b) {
                   return a + b;
               }),
               add15 = add(15);
    
           add15(27) == 42;
    
       Retains ability of complete application by calling the function
       when enough arguments are filled:
    
           add(15, 27) == 42;
    **/
    function curry(f) {
        return function() {
            var g = bind(f).apply(f, [this].concat([].slice.call(arguments))),
                length = functionLength(g);
    
            if(!length)
                return g();
    
            return curry(g);
        };
    }
    
    /**
       ## flip(f)
    
       Flips the order of arguments to `f`:
    
           var concat = bilby.curry(function(a, b) {
                   return a + b;
               }),
               prepend = flip(concat);
    **/
    function flip(f) {
        return function(a) {
            return function(b) {
                return f(b, a);
            };
        };
    }
    
    /**
       ## identity(o)
    
       Identity function. Returns `o`:
    
           forall a. identity(a) == a
    **/
    function identity(o) {
        return o;
    }
    
    /**
       ## constant(c)
    
       Constant function. Creates a function that always returns `c`, no
       matter the argument:
    
           forall a b. constant(a)(b) == a
    **/
    function constant(c) {
        return function() {
            return c;
        };
    }
    
    /**
       ## compose(f, g)
    
       Creates a new function that applies `f` to the result of `g` of the
       input argument:
    
           forall f g x. compose(f, g)(x) == f(g(x))
    **/
    function compose(f, g) {
        return function() {
            return f(g.apply(this, [].slice.call(arguments)));
        };
    }
    
    /**
       ## create(proto)
    
       Partial polyfill for Object.create - creates a new instance of the
       given prototype.
    **/
    function create(proto) {
        function Ctor() {}
        Ctor.prototype = proto;
        return new Ctor();
    }
    
    /**
       ## getInstance(self, constructor)
    
       Always returns an instance of constructor.
    
       Returns self if it is an instanceof constructor, otherwise
       constructs an object with the correct prototype.
    **/
    function getInstance(self, constructor) {
        return self instanceof constructor ? self : create(constructor.prototype);
    }
    
    /**
       ## tagged(name, fields)
    
       Creates a simple constructor for a tagged object.
    
           var Tuple = tagged('Tuple', ['a', 'b']);
           var x = Tuple(1, 2);
           var y = new Tuple(3, 4);
           x instanceof Tuple && y instanceof Tuple;
    **/
    function tagged(name, fields) {
        function wrapped() {
            var self = getInstance(this, wrapped),
                i;
            if(arguments.length != fields.length) {
                throw new TypeError("Expected " + fields.length + " arguments, got " + arguments.length);
            }
            for(i = 0; i < fields.length; i++) {
                self[fields[i]] = arguments[i];
            }
            return self;
        }
        wrapped._name = name;
        wrapped._length = fields.length;
        return wrapped;
    }
    
    /**
        ## taggedSum(constructors)
    
        Creates a disjoint union of constructors, with a catamorphism.
    
            var List = taggedSum({
                Cons: ['car', 'cdr'],
                Nil: []
            });
            function listLength(l) {
                return l.cata({
                    Cons: function(car, cdr) {
                        return 1 + listLength(cdr);
                    },
                    Nil: function() {
                        return 0;
                    }
                });
            }
            listLength(List.Cons(1, new List.Cons(2, List.Nil()))) == 2;
    **/
    function taggedSum(constructors) {
        var key, proto;
    
        function definitions() {}
    
        function makeCata(key) {
            return function(dispatches) {
                var fields = constructors[key], args = [], i;
                if(!dispatches[key]) throw new TypeError("Constructors given to cata didn't include: " + key);
                for(i = 0; i < fields.length; i++) {
                    args.push(this[fields[i]]);
                }
                return dispatches[key].apply(this, args);
            };
        }
    
        function makeProto(key) {
            var proto = create(definitions.prototype);
            proto.cata = makeCata(key);
            return proto;
        }
    
        for(key in constructors) {
            if(!constructors[key].length) {
                definitions[key] = makeProto(key);
                continue;
            }
            definitions[key] = tagged(key, constructors[key]);
            definitions[key].prototype = makeProto(key);
        }
    
        return definitions;
    }
    
    /**
       ## error(s)
    
       Turns the `throw new Error(s)` statement into an expression.
    **/
    function error(s) {
        return function() {
            throw new Error(s);
        };
    }
    
    /**
       ## zip(a, b)
    
       Takes two lists and pairs their values together into a "tuple" (2
       length list):
    
           zip([1, 2, 3], [4, 5, 6]) == [[1, 4], [2, 5], [3, 6]]
    **/
    function zip(a, b) {
        var accum = [],
            i;
    
        for(i = 0; i < Math.min(a.length, b.length); i++) {
            accum.push([a[i], b[i]]);
        }
    
        return accum;
    }
    
    /**
       ## singleton(k, v)
    
       Creates a new single object using `k` as the key and `v` as the
       value. Useful for creating arbitrary keyed objects without
       mutation:
    
           singleton(['Hello', 'world'].join(' '), 42) == {'Hello world': 42}
    **/
    function singleton(k, v) {
        var o = {};
        o[k] = v;
        return o;
    }
    
    /**
       ## extend(a, b)
    
       Right-biased key-value concat of objects `a` and `b`:
    
           bilby.extend({a: 1, b: 2}, {b: true, c: false}) == {a: 1, b: true, c: false}
    **/
    // TODO: Make into an Object semigroup#concat
    function extend(a, b) {
        var o = {},
            i;
    
        for(i in a) {
            o[i] = a[i];
        }
        for(i in b) {
            o[i] = b[i];
        }
    
        return o;
    }
    
    /**
       ## isTypeOf(s)(o)
    
       Returns `true` iff `o` has `typeof s`.
    **/
    var isTypeOf = curry(function(s, o) {
        return typeof o == s;
    });
    /**
       ## isFunction(a)
    
       Returns `true` iff `a` is a `Function`.
    **/
    var isFunction = isTypeOf('function');
    /**
       ## isBoolean(a)
    
       Returns `true` iff `a` is a `Boolean`.
    **/
    var isBoolean = isTypeOf('boolean');
    /**
       ## isNumber(a)
    
       Returns `true` iff `a` is a `Number`.
    **/
    var isNumber = isTypeOf('number');
    /**
       ## isString(a)
    
       Returns `true` iff `a` is a `String`.
    **/
    var isString = isTypeOf('string');
    /**
       ## isArray(a)
    
       Returns `true` iff `a` is an `Array`.
    **/
    function isArray(a) {
        if(Array.isArray) return Array.isArray(a);
        return Object.prototype.toString.call(a) === "[object Array]";
    }
    /**
       ## isEven(a)
    
       Returns `true` iff `a` is even.
    **/
    function isEven(a) {
        return (a & 1) === 0;
    }
    /**
       ## isOdd(a)
    
       Returns `true` iff `a` is odd.
    **/
    function isOdd(a) {
        return !isEven(a);
    }
    /**
       ## isInstanceOf(c)(o)
    
       Returns `true` iff `o` is an instance of `c`.
    **/
    var isInstanceOf = curry(function(c, o) {
        return o instanceof c;
    });
    
    /**
       ## AnyVal
    
       Sentinal value for when any type of primitive value is needed.
    **/
    var AnyVal = {};
    /**
       ## Char
    
       Sentinal value for when a single character string is needed.
    **/
    var Char = {};
    /**
       ## arrayOf(type)
    
       Sentinel value for when an array of a particular type is needed:
    
           arrayOf(Number)
    **/
    function arrayOf(type) {
        var self = getInstance(this, arrayOf);
        self.type = type;
        return self;
    }
    /**
       ## isArrayOf(a)
    
       Returns `true` iff `a` is an instance of `arrayOf`.
    **/
    var isArrayOf = isInstanceOf(arrayOf);
    /**
       ## objectLike(props)
    
       Sentinal value for when an object with specified properties is
       needed:
    
           objectLike({
               age: Number,
               name: String
           })
    **/
    function objectLike(props) {
        var self = getInstance(this, objectLike);
        self.props = props;
        return self;
    }
    /**
       ## isObjectLike(a)
    
       Returns `true` iff `a` is an instance of `objectLike`.
    **/
    var isObjectLike = isInstanceOf(objectLike);
    
    /**
       ## or(a)(b)
    
       Curried function for `||`.
    **/
    var or = curry(function(a, b) {
        return a || b;
    });
    /**
       ## and(a)(b)
    
       Curried function for `&&`.
    **/
    var and = curry(function(a, b) {
        return a && b;
    });
    /**
       ## add(a)(b)
    
       Curried function for `+`.
    **/
    var add = curry(function(a, b) {
        return a + b;
    });
    /**
       ## strictEquals(a)(b)
    
       Curried function for `===`.
    **/
    var strictEquals = curry(function(a, b) {
        return a === b;
    });
    /**
        ## not(a)
    
        Returns `true` iff `a` is falsy.
    **/
    function not(a) {
        return !a;
    }
    /**
       ## fill(s)(t)
    
       Curried function for filling array.
    **/
    var fill = curry(function(s, t) {
        return this.map(range(0, s), t);
    });
    /**
       ## range(a, b)
    
       Create an array with a given range (length).
    **/
    function range(a, b) {
        var total = b - a;
        var rec = function(x, y) {
            if (y - a >= total) return x;
    
            x[y] = y++;
            return rec(x, y);
        };
        return rec([], a);
    }
    
    /**
       ## liftA2(f, a, b)
    
       Lifts a curried, binary function `f` into the applicative passes
       `a` and `b` as parameters.
    **/
    function liftA2(f, a, b) {
        return this.ap(this.map(a, f), b);
    }
    
    /**
       ## sequence(m, a)
    
       Sequences an array, `a`, of values belonging to the `m` monad:
    
            bilby.sequence(Array, [
                [1, 2],
                [3],
                [4, 5]
            ]) == [
                [1, 3, 4],
                [1, 3, 5],
                [2, 3, 4],
                [2, 3, 5]
            ]
    **/
    function sequence(m, a) {
        var env = this;
    
        if(!a.length)
            return env.pure(m, []);
    
        return env.flatMap(a[0], function(x) {
            return env.flatMap(env.sequence(m, a.slice(1)), function(y) {
                return env.pure(m, [x].concat(y));
            });
        });
    }
    
    bilby = bilby
        .property('functionName', functionName)
        .property('functionLength', functionLength)
        .property('bind', bind)
        .property('curry', curry)
        .property('flip', flip)
        .property('identity', identity)
        .property('constant', constant)
        .property('compose', compose)
        .property('create', create)
        .property('tagged', tagged)
        .property('taggedSum', taggedSum)
        .property('error', error)
        .property('extend', extend)
        .property('singleton', singleton)
        .property('isTypeOf',  isTypeOf)
        .property('isArray', isArray)
        .property('isBoolean', isBoolean)
        .property('isFunction', isFunction)
        .property('isNumber', isNumber)
        .property('isString', isString)
        .property('isEven', isEven)
        .property('isOdd', isOdd)
        .property('isInstanceOf', isInstanceOf)
        .property('AnyVal', AnyVal)
        .property('Char', Char)
        .property('arrayOf', arrayOf)
        .property('isArrayOf', isArrayOf)
        .property('objectLike', objectLike)
        .property('isObjectLike', isObjectLike)
        .property('or', or)
        .property('and', and)
        .property('add', add)
        .property('not', not)
        .property('fill', fill)
        .property('range', range)
        .property('strictEquals', strictEquals)
        .property('liftA2', liftA2)
        .property('sequence', sequence);

    /**
       # Do (operator overloading)
    
       Adds operator overloading for functional syntax:
    
         * `>=` - monad flatMap/bind:
    
               bilby.Do()(
                   bilby.some(1) >= function(x) {
                       return x < 0 ? bilby.none : bilby.some(x + 2);
                   }
               ).getOrElse(0) == 3;
    
         * `>>` - kleisli:
    
               bilby.Do()(
                   function(x) {
                       return x < 0 ? bilby.none : bilby.some(x + 1);
                   } >> function(x) {
                       return x % 2 != 0 ? bilby.none : bilby.some(x + 1);
                   }
               )(1).getOrElse(0) == 3;
    
         * `<` - functor map:
    
               bilby.Do()(
                   bilby.some(1) < add(2)
               ).getOrElse(0) == 3;
    
         * `*` - applicative ap(ply):
    
               bilby.Do()(
                   bilby.some(add) * bilby.some(1) * bilby.some(2)
               ).getOrElse(0) == 3;
    
         * `+` - semigroup concat:
    
               bilby.Do()(
                   bilby.some(1) + bilby.some(2)
               ).getOrElse(0) == 3;
    **/
    
    // Gross mutable global
    var doQueue;
    
    /**
       ## Do()(a)
    
       Creates a new syntax scope. The `a` expression is allowed multiple
       usages of a single operator per `Do` call:
    
       * `>=` - flatMap
       * `>>` - kleisli
       * `<` - map
       * `*` - ap
       * `+` - concat
    
       The associated name will be called on the bilby environment with
       the operands. For example:
    
           bilby.Do()(bilby.some(1) + bilby.some(2))
    
       Desugars into:
    
           bilby.concat(bilby.some(1), bilby.some(2))
    **/
    function Do() {
        if(arguments.length)
            throw new TypeError("Arguments given to Do. Proper usage: Do()(arguments)");
    
        var env = this,
            oldDoQueue = doQueue;
    
        doQueue = [];
        return function(n) {
            var op, x, i;
            if(!doQueue.length) {
                doQueue = oldDoQueue;
                return n;
            }
    
            if(n === true) op = 'flatMap'; // >=
            if(n === false) op = 'map'; // <
            if(n === 0) op = 'kleisli'; // >>
            if(n === 1) op = 'ap'; // *
            if(n === doQueue.length) op = 'concat'; // +
    
            if(!op) {
                doQueue = oldDoQueue;
                throw new Error("Couldn't determine Do operation. Could be ambiguous.");
            }
    
            x = doQueue[0];
            for(i = 1; i < doQueue.length; i++) {
                x = env[op](x, doQueue[i]);
            }
    
            doQueue = oldDoQueue;
            return x;
        };
    }
    
    /**
       ## Do.setValueOf(proto)
    
       Used to mutate the `valueOf` property on `proto`. Necessary to do
       the `Do` block's operator overloading. Uses the object's existing
       `valueOf` if not in a `Do` block.
    
       *Warning:* this mutates `proto`. May not be safe, even though it
       tries to default back to the normal behaviour when not in a `Do`
       block.
    **/
    Do.setValueOf = function(proto) {
        var oldValueOf = proto.valueOf;
        proto.valueOf = function() {
            if(doQueue === undefined)
                return oldValueOf.call(this);
    
            doQueue.push(this);
            return 1;
        };
    };
    
    bilby = bilby.property('Do', Do);

    /**
       # Trampoline
    
       Reifies continutations onto the heap, rather than the stack. Allows
       efficient tail calls.
    
       Example usage:
    
           function loop(n) {
               function inner(i) {
                   if(i == n) return bilby.done(n);
                   return bilby.cont(function() {
                       return inner(i + 1);
                   });
               }
    
               return bilby.trampoline(inner(0));
           }
    
       Where `loop` is the identity function for positive numbers. Without
       trampolining, this function would take `n` stack frames.
    **/
    
    /**
       ## done(result)
    
       Result constructor for a continuation.
    **/
    function done(result) {
        var self = getInstance(this, done);
        self.isDone = true;
        self.result = result;
        return self;
    }
    
    /**
       ## cont(thunk)
    
       Continuation constructor. `thunk` is a nullary closure, resulting
       in a `done` or a `cont`.
    **/
    function cont(thunk) {
        var self = getInstance(this, cont);
        self.isDone = false;
        self.thunk = thunk;
        return self;
    }
    
    
    /**
       ## trampoline(bounce)
    
       The beginning of the continuation to call. Will repeatedly evaluate
       `cont` thunks until it gets to a `done` value.
    **/
    function trampoline(bounce) {
        while(!bounce.isDone) {
            bounce = bounce.thunk();
        }
        return bounce.result;
    }
    
    bilby = bilby
        .property('done', done)
        .property('cont', cont)
        .property('trampoline', trampoline);

    bilby = bilby
        .method('map', isFunction, function(a, b) {
            return compose(b, a);
        })
        .method('ap', isFunction, function(a, b) {
            return function(x) {
                return a(x)(b(x));
            };
        });
    
    bilby = bilby
        .method('kleisli', isFunction, function(a, b) {
            var env = this;
            return function(x) {
                return env.flatMap(a(x), b);
            };
        })
    
        .method('equal', isBoolean, strictEquals)
        .method('equal', isNumber, strictEquals)
        .method('equal', isString, strictEquals)
        .method('equal', isArray, function(a, b) {
            var env = this;
            return env.fold(zip(a, b), true, function(a, t) {
                return a && env.equal(t[0], t[1]);
            });
        })
    
        .method('fold', isArray, function(a, b, c) {
            var i;
            for(i = 0; i < a.length; i++) {
                b = c(b, a[i]);
            }
            return b;
        })
    
        .method('flatMap', isArray, function(a, b) {
            var accum = [],
                i;
    
            for(i = 0; i < a.length; i++) {
                accum = accum.concat(b(a[i]));
            }
    
            return accum;
        })
        .method('map', isArray, function(a, b) {
            var accum = [],
                i;
    
            for(i = 0; i < a.length; i++) {
                accum[i] = b(a[i]);
            }
    
            return accum;
        })
        .method('ap', isArray, function(a, b) {
            var accum = [],
                i,
                j;
    
            for(i = 0; i < a.length; i++) {
                for(j = 0; j < b.length; j++) {
                    accum.push(a[i](b[j]));
                }
            }
    
            return accum;
        })
        .method('concat', isArray, function(a, b) {
            return a.concat(b);
        })
        .method('pure', strictEquals(Array), function(m, a) {
            return [a];
        })
    
        .method('concat', bilby.liftA2(or, isNumber, isString), function(a, b) {
            return a + b;
        })
        .method('concat', isFunction, function(a, b) {
            return a().concat(b());
        })
    
        .method('map', isBoolean, curry(function(a, b) {
            return b(a);
        }))
        .method('map', bilby.liftA2(or, isNumber, isString), curry(function(a, b) {
            return b(a);
        }))
    
        .property('oneOf', function(a) {
            return a[Math.floor(this.randomRange(0, a.length))];
        })
        .property('randomRange', function(a, b) {
            return Math.random() * (b - a) + a;
        })
    
        .method('arb', isArrayOf, function(a, s) {
            var accum = [],
                length = this.randomRange(0, s),
                i;
    
            for(i = 0; i < length; i++) {
                accum.push(this.arb(a.type, s - 1));
            }
    
            return accum;
        })
        .method('arb', isObjectLike, function(a, s) {
            var o = {},
                i;
    
            for(i in a.props) {
                o[i] = this.arb(a.props[i]);
            }
    
            return o;
        })
        .method('arb', strictEquals(AnyVal), function(a, s) {
            var types = [Boolean, Number, String];
            return this.arb(this.oneOf(types), s - 1);
        })
        .method('arb', strictEquals(Array), function(a, s) {
            return this.arb(arrayOf(AnyVal), s - 1);
        })
        .method('arb', strictEquals(Boolean), function(a, s) {
            return Math.random() < 0.5;
        })
        .method('arb', strictEquals(Char), function(a, s) {
            return String.fromCharCode(Math.floor(this.randomRange(32, 127)));
        })
        .method('arb', strictEquals(Number), function(a, s) {
            // Half the number of bits to represent Number.MAX_VALUE
            var bits = 511,
                variance = Math.pow(2, (s * bits) / this.goal);
            return this.randomRange(-variance, variance);
        })
        .method('arb', strictEquals(Object), function(a, s) {
            var o = {},
                length = this.randomRange(0, s),
                i;
    
            for(i = 0; i < length; i++) {
                o[this.arb(String, s - 1)] = this.arb(arrayOf(AnyVal), s - 1);
            }
    
            return o;
        })
        .method('arb', strictEquals(String), function(a, s) {
            return this.arb(arrayOf(Char), s - 1).join('');
        })
        .method('arb', strictEquals(Function), function(a, s) {
            return function(){};
        })
    
        .method('empty', strictEquals(Array), function(a, s) {
            return [];
        })
        .method('empty', strictEquals(Object), function(a, s) {
            return {};
        })
        .method('empty', strictEquals(Boolean), function(a, s) {
            return false;
        })
        .method('empty', strictEquals(Number), function(a, s) {
            return 0;
        })
        .method('empty', strictEquals(String), function(a, s) {
            return '';
        })
    
        .method('shrink', isBoolean, function() {
            return function(b) {
                return b ? [false] : [];
            };
        })
        .method('shrink', isNumber, function(n) {
            var accum = [0],
                x = n;
    
            if(n < 0)
                accum.push(-n);
    
            while(x) {
                x = x / 2;
                x = x < 0 ? Math.ceil(x) : Math.floor(x);
                if(x) {
                    accum.push(n - x);
                }
            }
    
            return accum;
        })
        .method('shrink', isString, function(s) {
            var accum = [''],
                x = s.length;
    
            while(x) {
                x = Math.floor(x / 2);
                if(x) {
                    accum.push(s.substring(0, s.length - x));
                }
            }
    
            return accum;
        })
        .method('shrink', isArray, function(a) {
            var accum = [[]],
            x = a.length;
    
            while(x) {
                x = Math.floor(x / 2);
                if(x) {
                    accum.push(a.slice(a.length - x));
                }
            }
    
            return accum;
        })
    
        .method('toArray', isArray, identity)
        .method('toArray', strictEquals(AnyVal), function(x) {
            return [x];
        })
        .method('zip', bilby.liftA2(or, isArray, isString), function(a, b) {
            return zip(a, b);
        });
    
    Do.setValueOf(Array.prototype);
    Do.setValueOf(Function.prototype);

    /**
      # Id
    
      * concat(b) - semigroup concat
      * map(f) - functor map
      * ap(b) - applicative ap(ply)
      * chain(f) - chain value
      * arb() - arbitrary value
    **/
    var Id = tagged('Id', ['value']);
    
    // Monad
    Id.of = function(a) {
        return new Id(a);
    };
    
    // Semigroup (value must also be a Semigroup)
    Id.prototype.concat = function(b) {
        return Id.of(this.value.concat(b.value));
    };
    
    // Functor
    Id.prototype.map = function(f) {
        return Id.of(f(this.value));
    };
    
    // Applicative
    Id.prototype.ap = function(b) {
        return Id.of(this.value(b.value));
    };
    
    // Chain
    Id.prototype.chain = function(f) {
        return f(this.value);
    };
    
    /**
       ## isId(a)
    
       Returns `true` if `a` is `Id`.
    **/
    var isId = isInstanceOf(Id);
    
    /**
       ## idOf(type)
    
       Sentinel value for when an Id of a particular type is needed:
    
           idOf(Number)
    **/
    function idOf(type) {
        var self = getInstance(this, idOf);
        self.type = type;
        return self;
    }
    
    /**
       ## isIdOf(a)
    
       Returns `true` iff `a` is an instance of `idOf`.
    **/
    var isIdOf = isInstanceOf(idOf);
    
    bilby = bilby
        .property('Id', Id)
        .property('idOf', idOf)
        .property('isIdOf', isIdOf)
        .method('concat', isId, function(a, b) {
            return a.concat(b, this.concat);
        })
        .method('empty', isIdOf, function(i) {
            return Id(this.empty(i.type));
        })
        .method('map', isId, function(a, b) {
            return a.map(b);
        })
        .method('ap', isId, function(a, b) {
            return a.ap(b);
        })
        .method('chain', isId, function(a, b) {
            return a.chain(b);
        })
        .method('equal', isId, function(a, b) {
            return this.equal(a.value, b.value);
        })
        .method('arb', strictEquals(Id), function() {
            var env = this;
            var t = env.fill(1)(function() {
                return AnyVal;
            });
            return Id.of.apply(this, env.map(t, function(arg) {
                return env.arb(arg, t.length);
            }));
        });

    /**
       # Option
    
           Option a = Some a + None
    
       The option type encodes the presence and absence of a value. The
       `some` constructor represents a value and `none` represents the
       absence.
    
       * fold(a, b) - applies `a` to value if `some` or defaults to `b`
       * getOrElse(a) - default value for `none`
       * isSome - `true` iff `this` is `some`
       * isNone - `true` iff `this` is `none`
       * toLeft(r) - `left(x)` if `some(x)`, `right(r)` if none
       * toRight(l) - `right(x)` if `some(x)`, `left(l)` if none
       * flatMap(f) - monadic flatMap/bind
       * map(f) - functor map
       * ap(s) - applicative ap(ply)
       * concat(s, plus) - semigroup concat
    **/
    
    var Option = taggedSum({
        some: ['x'],
        none: []
    });
    
    Option.prototype.fold = function(f, g) {
        return this.cata({
            some: f,
            none: g
        });
    };
    Option.prototype.getOrElse = function(x) {
        return this.fold(
            identity,
            function() {
                return x;
            }
        );
    };
    Option.prototype.toLeft = function(o) {
        return this.fold(
            function(x) {
                return Either.left(x);
            },
            function() {
                return Either.right(o);
            }
        );
    };
    Option.prototype.toRight = function(o) {
        return this.fold(
            function(x) {
                return Either.right(x);
            },
            function() {
                return Either.left(o);
            }
        );
    };
    Option.prototype.flatMap = function(f) {
        return this.fold(
            function(x) {
                return f(x);
            },
            function() {
                return this;
            }
        );
    };
    Option.prototype.map = function(f) {
        return this.fold(
            function(x) {
                return Option.some(f(x));
            },
            function() {
                return this;
            }
        );
    };
    Option.prototype.ap = function(s) {
        return this.fold(
            function(x) {
                return s.map(x);
            },
            function() {
                return this;
            }
        );
    };
    Option.prototype.concat = function(s, plus) {
        return this.fold(
            function(x) {
                return s.map(function(y) {
                    return plus(x, y);
                });
            },
            function() {
                return this;
            }
        );
    };
    
    /**
       ## of(x)
    
       Constructor `of` Monad creating `Option` with value of `x`.
    **/
    Option.of = function(x) {
        return Option.some(x);
    };
    
    /**
       ## some(x)
    
       Constructor to represent the existence of a value, `x`.
    **/
    Option.some.prototype.isSome = true;
    Option.some.prototype.isNone = false;
    
    /**
       ## none
    
       Represents the absence of a value.
    **/
    Option.none.isSome = false;
    Option.none.isNone = true;
    
    /**
       ## isOption(a)
    
       Returns `true` if `a` is a `some` or `none`.
    **/
    var isOption = isInstanceOf(Option);
    
    Do.setValueOf(Option.prototype);
    
    bilby = bilby
        .property('some', Option.some)
        .property('none', Option.none)
        .property('isOption', isOption)
        .method('fold', isOption, function(a, b, c) {
            return a.fold(b, c);
        })
        .method('flatMap', isOption, function(a, b) {
            return a.flatMap(b);
        })
        .method('map', isOption, function(a, b) {
            return a.map(b);
        })
        .method('ap', isOption, function(a, b) {
            return a.ap(b);
        })
        .method('concat', isOption, function(a, b) {
            return a.concat(b, this.concat);
        });

    /**
       # Either
    
           Either a b = Left a + Right b
    
       Represents a tagged disjunction between two sets of values; `a` or
       `b`. Methods are right-biased.
    
       * fold(a, b) - `a` applied to value if `left`, `b` if `right`
       * swap() - turns `left` into `right` and vice-versa
       * isLeft - `true` iff `this` is `left`
       * isRight - `true` iff `this` is `right`
       * toOption() - `none` if `left`, `some` value of `right`
       * toArray() - `[]` if `left`, singleton value if `right`
       * flatMap(f) - monadic flatMap/bind
       * map(f) - functor map
       * ap(s) - applicative ap(ply)
       * concat(s, plus) - semigroup concat
    **/
    
    var Either = taggedSum({
        left: ['x'],
        right: ['x']
    });
    
    Either.prototype.fold = function(a, b) {
        return this.cata({
            left: a,
            right: b
        });
    };
    Either.prototype.swap = function() {
        return this.fold(
            function(x) {
                return Either.right(x);
            },
            function(x) {
                return Either.left(x);
            }
        );
    };
    Either.prototype.toOption = function() {
        return this.fold(
            function() {
                return Option.none;
            },
            function(x) {
                return Option.some(x);
            }
        );
    };
    Either.prototype.toArray = function() {
        return this.fold(
            function() {
                return [];
            },
            function(x) {
                return [x];
            }
        );
    };
    Either.prototype.flatMap = function(f) {
        return this.fold(
            function() {
                return this;
            },
            function(x) {
                return f(x);
            }
        );
    };
    Either.prototype.map = function(f) {
        return this.fold(
            function() {
                return this;
            },
            function(x) {
                return Either.right(f(x));
            }
        );
    };
    Either.prototype.ap = function(e) {
        return this.fold(
            function() {
                return this;
            },
            function(x) {
                return e.map(x);
            }
        );
    };
    Either.prototype.concat = function(s, plus) {
        return this.fold(
            function() {
                var left = this;
                return s.fold(
                    constant(left),
                    constant(s)
                );
            },
            function(y) {
                return s.map(function(x) {
                    return plus(x, y);
                });
            }
        );
    };
    
    /**
       ## left(x)
    
       Constructor to represent the left case.
    **/
    Either.left.prototype.isLeft = true;
    Either.left.prototype.isRight = false;
    
    /**
       ## right(x)
    
       Constructor to represent the (biased) right case.
    **/
    Either.right.prototype.isLeft = false;
    Either.right.prototype.isRight = true;
    
    /**
       ## isEither(a)
    
       Returns `true` iff `a` is a `left` or a `right`.
    **/
    var isEither = isInstanceOf(Either);
    
    bilby = bilby
        .property('left', Either.left)
        .property('right', Either.right)
        .property('isEither', isEither)
        .method('flatMap', isEither, function(a, b) {
            return a.flatMap(b);
        })
        .method('map', isEither, function(a, b) {
            return a.map(b);
        })
        .method('ap', isEither, function(a, b) {
            return a.ap(b);
        })
        .method('concat', isEither, function(a, b) {
            return a.concat(b, this.concat);
        });

    /**
       # Validation
    
           Validation e v = Failure e + Success v
    
       The Validation data type represents a "success" value or a
       semigroup of "failure" values. Validation has an applicative
       functor which collects failures' errors or creates a new success
       value.
    
       Here's an example function which validates a String:
    
           function nonEmpty(field, string) {
               return string
                   ? λ.success(string)
                   : λ.failure([field + " must be non-empty"]);
           }
    
       We might want to give back a full-name from a first-name and
       last-name if both given were non-empty:
    
           function getWholeName(firstName) {
               return function(lastName) {
                   return firstName + " " + lastName;
               }
           }
           λ.ap(
               λ.map(nonEmpty("First-name", firstName), getWholeName),
               nonEmpty("Last-name", lastName)
           );
    
       When given a non-empty `firstName` ("Brian") and `lastName`
       ("McKenna"):
    
           λ.success("Brian McKenna");
    
       If given only an invalid `firstname`:
    
           λ.failure(['First-name must be non-empty']);
    
       If both values are invalid:
    
           λ.failure([
               'First-name must be non-empty',
               'Last-name must be non-empty'
           ]);
    
       * map(f) - functor map
       * ap(b, concat) - applicative ap(ply)
    
       ## success(value)
    
       Represents a successful `value`.
    
       ## failure(errors)
    
       Represents a failure.
    
       `errors` **must** be a semigroup (i.e. have an `concat`
       implementation in the environment).
    **/
    
    var Validation = taggedSum({
        success: ['value'],
        failure: ['errors']
    });
    
    Validation.success.prototype.map = function(f) {
        return Validation.success(f(this.value));
    };
    Validation.success.prototype.ap = function(v) {
        return v.map(this.value);
    };
    
    Validation.failure.prototype.map = function() {
        return this;
    };
    Validation.failure.prototype.ap = function(b, concat) {
        var a = this;
        return b.cata({
            success: function(value) {
                return a;
            },
            failure: function(errors) {
                return Validation.failure(concat(a.errors, errors));
            }
        });
    };
    
    /**
       ## success(x)
    
       Constructor to represent the existance of a value, `x`.
    **/
    Validation.success.prototype.isSuccess = true;
    Validation.success.prototype.isFailure = false;
    
    /**
       ## failure(x)
    
       Constructor to represent the existance of a value, `x`.
    **/
    Validation.failure.prototype.isSuccess = false;
    Validation.failure.prototype.isFailure = true;
    
    /**
       ## isValidation(a)
    
       Returns `true` iff `a` is a `success` or a `failure`.
    **/
    var isValidation = isInstanceOf(Validation);
    
    Do.setValueOf(Validation.prototype);
    
    bilby = bilby
        .property('success', Validation.success)
        .property('failure', Validation.failure)
        .property('isValidation', isValidation)
        .method('map', isValidation, function(v, f) {
            return v.map(f);
        })
        .method('ap', isValidation, function(vf, v) {
            return vf.ap(v, this.concat);
        });

    /**
       # Lenses
    
       Lenses allow immutable updating of nested data structures.
    **/
    
    /**
       ## store(setter, getter)
    
       A `store` is a combined getter and setter that can be composed with
       other stores.
    **/
    function store(setter, getter) {
        var self = getInstance(this, store);
        self.setter = setter;
        self.getter = getter;
        self.map = function(f) {
            return store(compose(f, setter), getter);
        };
        return self;
    }
    /**
       ## isStore(a)
    
       Returns `true` iff `a` is a `store`.
    **/
    var isStore = isInstanceOf(store);
    
    /**
       ## lens(f)
    
       A total `lens` takes a function, `f`, which itself takes a value
       and returns a `store`.
    
       * run(x) - gets the lens' `store` from `x`
       * compose(l) - lens composition
    **/
    function lens(f) {
        var self = getInstance(this, lens);
        self.run = function(x) {
            return f(x);
        };
        self.compose = function(l) {
            var t = this;
            return lens(function(x) {
                var ls = l.run(x),
                    ts = t.run(ls.getter);
    
                return store(
                    compose(ls.setter, ts.setter),
                    ts.getter
                );
            });
        };
        return self;
    }
    /**
       ## isLens(a)
    
       Returns `true` iff `a` is a `lens`.
    **/
    var isLens = isInstanceOf(lens);
    
    /**
       ## objectLens(k)
    
       Creates a total `lens` over an object for the `k` key.
    **/
    function objectLens(k) {
        return lens(function(o) {
            return store(function(v) {
                return extend(
                    o,
                    singleton(k, v)
                );
            }, o[k]);
        });
    }
    
    bilby = bilby
        .property('store', store)
        .property('isStore', isStore)
        .method('map', isStore, function(a, b) {
            return a.map(b);
        })
        .property('lens', lens)
        .property('isLens', isLens)
        .property('objectLens', objectLens);

    /**
       # Input/output
    
       Purely functional IO wrapper.
    **/
    
    /**
       ## io(f)
    
       Pure wrapper around a side-effecting `f` function.
    
       * perform() - action to be called a single time per program
       * flatMap(f) - monadic flatMap/bind
    **/
    function io(f) {
        var self = this instanceof io ? this : create(io.prototype);
    
        self.perform = function() {
            return f();
        };
    
        self.flatMap = function(g) {
            return io(function() {
                return g(f()).perform();
            });
        };
    
        return self;
    }
    
    /**
       ## isIO(a)
    
       Returns `true` iff `a` is an `io`.
    **/
    var isIO = isInstanceOf(io);
    
    Do.setValueOf(io.prototype);
    
    bilby = bilby
        .property('io', io)
        .property('isIO', isIO)
        .method('pure', strictEquals(io), function(m, a) {
            return io(function() {
                return a;
            });
        })
        .method('flatMap', isIO, function(a, b) {
            return a.flatMap(b);
        });

    /**
        # Tuples
    
        Tuples are another way of storing multiple values in a single value.
        They have a fixed number of elements (immutable), and so you can't
        cons to a tuple.
        Elements of a tuple do not need to be all of the same type
    
        Example usage:
    
             bilby.Tuple2(1, 2);
             bilby.Tuple3(1, 2, 3);
             bilby.Tuple4(1, 2, 3, 4);
             bilby.Tuple5(1, 2, 3, 4, 5);
    
        * arb() - arbitrary value
    
    **/
    var Tuple2 = tagged('Tuple2', ['_1', '_2']),
        Tuple3 = tagged('Tuple3', ['_1', '_2', '_3']),
        Tuple4 = tagged('Tuple4', ['_1', '_2', '_3', '_4']),
        Tuple5 = tagged('Tuple5', ['_1', '_2', '_3', '_4', '_5']);
    
    /**
        ## Tuple2
    
        * flip() - flip values
        * concat() - Semigroup (value must also be a Semigroup)
        * map() - functor map
    **/
    Tuple2.prototype.flip = function() {
        return Tuple2(this._2, this._1);
    };
    
    Tuple2.prototype.concat = function(b) {
        return Tuple2(
            bilby.concat(this._1, b._1),
            bilby.concat(this._2, b._2)
        );
    };
    
    Tuple2.prototype.map = function(f) {
        return Tuple2(f(this._1), f(this._2));
    };
    
    /**
        ## Tuple3
    
        * concat() - Semigroup (value must also be a Semigroup)
        * map() - functor map
    **/
    Tuple3.prototype.concat = function(b) {
        return Tuple3(
            bilby.concat(this._1, b._1),
            bilby.concat(this._2, b._2),
            bilby.concat(this._3, b._3)
        );
    };
    
    Tuple3.prototype.map = function(f) {
        return Tuple3(f(this._1), f(this._2), f(this._3));
    };
    
    
    /**
        ## Tuple4
    
        * concat() - Semigroup (value must also be a Semigroup)
        * map() - functor map
    **/
    Tuple4.prototype.concat = function(b) {
        return Tuple4(
            bilby.concat(this._1, b._1),
            bilby.concat(this._2, b._2),
            bilby.concat(this._3, b._3),
            bilby.concat(this._4, b._4)
        );
    };
    
    Tuple4.prototype.map = function(f) {
        return Tuple4(f(this._1), f(this._2), f(this._3), f(this._4));
    };
    
    
    /**
        ## Tuple5
    
        * concat() - Semigroup (value must also be a Semigroup)
        * map() - functor map
    **/
    Tuple5.prototype.concat = function(b) {
        return Tuple5(
            bilby.concat(this._1, b._1),
            bilby.concat(this._2, b._2),
            bilby.concat(this._3, b._3),
            bilby.concat(this._4, b._4),
            bilby.concat(this._5, b._5)
        );
    };
    
    Tuple5.prototype.map = function(f) {
        return Tuple5(f(this._1), f(this._2), f(this._3), f(this._4), f(this._5));
    };
    
    /**
       ## isTuple2(a)
    
       Returns `true` if `a` is `Tuple2`.
    **/
    var isTuple2 = isInstanceOf(Tuple2);
    
    /**
       ## isTuple4(a)
    
       Returns `true` if `a` is `Tuple3`.
    **/
    var isTuple3 = isInstanceOf(Tuple3);
    
    /**
       ## isTuple4(a)
    
       Returns `true` if `a` is `Tuple4`.
    **/
    var isTuple4 = isInstanceOf(Tuple4);
    
    /**
       ## isTuple5(a)
    
       Returns `true` if `a` is `Tuple5`.
    **/
    var isTuple5 = isInstanceOf(Tuple5);
    
    bilby = bilby
        .property('Tuple2', Tuple2)
        .property('Tuple3', Tuple3)
        .property('Tuple4', Tuple4)
        .property('Tuple5', Tuple5)
        .property('isTuple2', isTuple2)
        .property('isTuple3', isTuple3)
        .property('isTuple4', isTuple4)
        .property('isTuple5', isTuple5)
        .method('concat', isTuple2, function(a, b) {
            return a.concat(b, this.concat);
        })
        .method('concat', isTuple3, function(a, b) {
            return a.concat(b, this.concat);
        })
        .method('concat', isTuple4, function(a, b) {
            return a.concat(b, this.concat);
        })
        .method('concat', isTuple5, function(a, b) {
            return a.concat(b, this.concat);
        })
        .method('map', isTuple2, function(a, b) {
            return a.map(b);
        })
        .method('map', isTuple3, function(a, b) {
            return a.map(b);
        })
        .method('map', isTuple4, function(a, b) {
            return a.map(b);
        })
        .method('map', isTuple5, function(a, b) {
            return a.map(b);
        })
        .method('arb', strictEquals(Tuple2), function() {
            var env = this;
            var t = env.fill(2)(function() {
                return String;
            });
            return Tuple2.apply(this, env.map(t, function(arg) {
                return env.arb(arg, t.length);
            }));
        })
        .method('arb', strictEquals(Tuple3), function() {
            var env = this;
            var t = env.fill(3)(function() {
                return String;
            });
            return Tuple3.apply(this, env.map(t, function(arg) {
                return env.arb(arg, t.length);
            }));
        })
        .method('arb', strictEquals(Tuple4), function() {
            var env = this;
            var t = env.fill(4)(function() {
                return String;
            });
            return Tuple4.apply(this, env.map(t, function(arg) {
                return env.arb(arg, t.length);
            }));
        })
        .method('arb', strictEquals(Tuple5), function() {
            var env = this;
            var t = env.fill(5)(function() {
                return String;
            });
            return Tuple5.apply(this, env.map(t, function(arg) {
                return env.arb(arg, t.length);
            }));
        })
        .method('equal', isTuple2, function(a, b) {
            return  this.equal(a._1, b._1) &&
                    this.equal(a._2, b._2);
        })
        .method('equal', isTuple3, function(a, b) {
            return  this.equal(a._1, b._1) &&
                    this.equal(a._2, b._2) &&
                    this.equal(a._3, b._3);
        })
        .method('equal', isTuple4, function(a, b) {
            return  this.equal(a._1, b._1) &&
                    this.equal(a._2, b._2) &&
                    this.equal(a._3, b._3) &&
                    this.equal(a._4, b._4);
        })
        .method('equal', isTuple5, function(a, b) {
            return  this.equal(a._1, b._1) &&
                    this.equal(a._2, b._2) &&
                    this.equal(a._3, b._3) &&
                    this.equal(a._4, b._4) &&
                    this.equal(a._5, b._5);
        })
        .method('toArray', isTuple2, function(a) {
            return [a._1, a._2];
        })
        .method('toArray', isTuple3, function(a) {
            return [a._1, a._2, a._3];
        })
        .method('toArray', isTuple4, function(a) {
            return [a._1, a._2, a._3, a._4];
        })
        .method('toArray', isTuple5, function(a) {
            return [a._1, a._2, a._3, a._4, a._5];
        });

    /**
        # Promise(fork)
    
        Promise is a constructor which takes a `fork` function. The `fork`
        function takes one argument:
    
            fork(resolve)
    
        Where `resolve` is a side-effecting callback.
    
        ## fork(resolve)
    
        The `resolve` callback gets called when a value is resolved.
    **/
    var Promise = tagged('Promise', ['fork']);
    
    /**
        ## of(x)
    
        Creates a Promise that contains a successful value.
    **/
    Promise.of = function(x) {
        return new Promise(function(resolve) {
            resolve(x);
        });
    };
    
    /**
        ## chain(f)
    
        Returns a new promise that evaluates `f` when the current promise
        is successfully fulfilled. `f` must return a new promise.
    **/
    Promise.prototype.chain = function(f) {
        var promise = this;
        return new Promise(function(resolve) {
            promise.fork(function(a) {
                f(a).fork(resolve);
            });
        });
    };
    
    /**
        ## map(f)
    
        Returns a new promise that evaluates `f` on a value and passes it
        through to the resolve function.
    **/
    Promise.prototype.map = function(f) {
        var promise = this;
        return new Promise(function(resolve) {
            promise.fork(function(a) {
                resolve(f(a));
            });
        });
    };
    
    /**
       ## isPromise(a)
    
       Returns `true` if `a` is `Promise`.
    **/
    var isPromise = isInstanceOf(Promise);
    
    bilby = bilby
        .property('Promise', Promise)
        .property('isPromise', isPromise)
        .method('map', isPromise, function(a, b) {
            return a.map(b);
        });

    /**
        # State(run)
    
        * chain() - TODO
        * evalState() - evaluate state
        * execState() - execute on state
        * map() - functor map
        * ap() - applicative ap(ply)
    **/
    var State = tagged('State', ['run']);
    
    // Methods
    State.of = function(a) {
        return State(function(b) {
            return Tuple2(a, b);
        });
    };
    
    State.get = State(function(s) {
        return Tuple2(s, s);
    });
    
    State.modify = function(f) {
        return State(function(s) {
            return Tuple2(null, f(s));
        });
    };
    
    State.put = function(s) {
        return State.modify(function(a) {
            return s;
        });
    };
    
    State.prototype.chain = function(f) {
        var state = this;
        return State(function(s) {
            var result = state.run(s);
            return f(result._1).run(result._2);
        });
    };
    
    State.prototype.evalState = function(s) {
        return this.run(s)._1;
    };
    
    State.prototype.execState = function(s) {
        return this.run(s)._2;
    };
    
    // Derived
    State.prototype.map = function(f) {
        return this.chain(function(a) {
            return State.of(f(a));
        });
    };
    
    State.prototype.ap = function(a) {
        return this.chain(function(f) {
            return a.map(f);
        });
    };
    
    /**
       ## isState(a)
    
       Returns `true` if `a` is `State`.
    **/
    var isState = isInstanceOf(State);
    
    // Transformer
    State.StateT = function(M) {
        var StateT = tagged('StateT', ['run']);
    
        StateT.lift = function(m) {
            return StateT(function(b) {
                return m;
            });
        };
    
        StateT.of = function(a) {
            return StateT(function(b) {
                return M.of(Tuple2(a, b));
            });
        };
    
        StateT.get = StateT(function(s) {
            return M.of(Tuple2(s, s));
        });
    
        StateT.modify = function(f) {
            return StateT(function(s) {
                return M.of(Tuple2(null, f(s)));
            });
        };
    
        StateT.put = function(s) {
            return StateT.modify(function(a) {
                return s;
            });
        };
    
        StateT.prototype.chain = function(f) {
            var state = this;
            return StateT(function(s) {
                var result = state.run(s);
            });
        };
    
        StateT.prototype.evalState = function(s) {
            return this.run(s).chain(function(t) {
                return t._1;
            });
        };
    
        StateT.prototype.execState = function(s) {
            return this.run(s).chain(function(t) {
                return t._2;
            });
        };
    
        StateT.prototype.map = function(f) {
            return this.chain(function(a) {
                return StateT.of(f(a));
            });
        };
    
        StateT.prototype.ap = function(a) {
            return this.chain(function(f) {
                return a.map(f);
            });
        };
    
        return StateT;
    };
    
    bilby = bilby
        .property('State', State)
        .property('isState', isState)
        .property('StateT', State.StateT);

    /**
        # List
    
            List a = Cons a + Nil
    
        The list type data type constructs objects which points to values. The `cons`
        constructor represents a value, the left is the head (`car`, the first element)
        and the right represents the tail (`cdr`, the second element). The `nil`
        constructor is defined as an empty list.
    
        The following example creates a list of values 1 and 2, where the nil terminates
        the list:
    
            cons(1, cons(2, nil));
    
        The following can also represent tree like structures (Binary Trees):
    
            cons(cons(1, cons(2, nil)), cons(3, cons(4, nil)));
    
                 *
                / \
               *   *
              / \ / \
             1  2 3  4
    
        * concat(a) - semigroup concat
        * fold(a, b) - applies `a` to value if `cons` or defaults to `b`
        * map(f) - functor map
        * fold(f) - applies f to values
        * flatMap(f) - monadic flatMap
        * append(a) - append
        * appendAll(a) - append values
        * prepend(a) - prepend value
        * prependAll(a) - prepend values
        * reverse() - reverse
        * exists() - test by predicate
        * filter() - filter by predicate
        * partition() - partition by predicate
        * size() - size of the list
    **/
    var List = taggedSum({
        cons: ['car', 'cdr'],
        nil: []
    });
    
    List.range = curry(function(a, b) {
        var total = b - a;
        var rec = function(x, y) {
            if (y - a >= total) return done(x);
            return cont(function() {
                return rec(List.cons(y, x), ++y);
            });
        };
        return trampoline(rec(List.nil, a));
    });
    
    List.prototype.concat = function(s) {
        return this.appendAll(s);
    };
    
    List.prototype.fold = function(f) {
        if (this.isEmpty) return this;
    
        var rec = function(a, b) {
            if (a.isEmpty) return done(b);
    
            return cont(function() {
                return rec(a.cdr, f(a.car, b));
            });
        };
        return trampoline(rec(this.reverse(), List.nil));
    };
    
    List.prototype.map = function(f) {
        return this.fold(
            function(a, b) {
                return List.cons(f(a), b);
            }
        );
    };
    
    List.prototype.flatMap = function(f) {
        return this.fold(
          function(a, b) {
              return b.prependAll(f(a).reverse());
          }
        );
    };
    
    List.prototype.append = function(a) {
        return this.appendAll(List.cons(a, List.nil));
    };
    
    List.prototype.appendAll = function(a) {
        if (this.isEmpty) return this;
    
        var rec = function(a, b) {
            if (a.isEmpty) return done(b);
    
            return cont(function() {
                return rec(a.cdr, List.cons(a.car, b));
            });
        };
        return trampoline(rec(this.reverse(), a));
    };
    
    List.prototype.prepend = function(a) {
        return List.cons(a, this);
    };
    
    List.prototype.prependAll = function(a) {
        if (a.isEmpty) return this;
    
        var rec = function(a, b) {
            if (b.isEmpty) return done(a);
    
            return cont(function() {
                return rec(List.cons(b.car, a), b.cdr);
            });
        };
        return trampoline(rec(this, a));
    };
    
    List.prototype.reverse = function() {
        var rec = function(p, accum) {
            return p.cata({
                cons: function(a, b) {
                    return cont(function() {
                        return rec(p.cdr, List.cons(a, accum));
                    });
                },
                nil: function() {
                    return done(accum);
                }
            });
        };
        return trampoline(rec(this, List.nil));
    };
    
    List.prototype.exists = function(f) {
        if (this.isEmpty) return false;
    
        var rec = function(a) {
            if (a.isEmpty) return done(false);
            if (f(a.car)) return done(true);
    
            return cont(function() {
                return rec(a.cdr);
            });
        };
        return trampoline(rec(this));
    };
    
    List.prototype.filter = function(f) {
        if (this.isEmpty) return this;
    
        var rec = function(a, b) {
            if (a.isEmpty) return done(b);
    
            return cont(function() {
                var c = curry(rec)(a.cdr);
                if (f(a.car)) {
                    return c(List.cons(a.car, b));
                } else {
                    return c(b);
                }
            });
        };
        return trampoline(rec(this, List.nil)).reverse();
    };
    
    List.prototype.partition = function(f) {
        if (this.isEmpty) return Tuple2(this, this);
    
        var rec = function(a, l, r) {
            if (a.isEmpty) return done(Tuple2(l.reverse(), r.reverse()));
    
            return cont(function() {
                var h = a.car;
                var cur = curry(List.cons)(h);
                if (f(h)) {
                    return rec(a.cdr, cur(l), r);
                } else {
                    return rec(a.cdr, l, cur(r));
                }
            });
        };
        return trampoline(rec(this, List.nil, List.nil));
    };
    
    List.prototype.size = function() {
        if (this.isEmpty) return 0;
    
        var rec = function(a, b) {
            if (a.isEmpty) return done(b);
    
            return cont(function() {
                return rec(a.cdr, ++b);
            });
        };
        return trampoline(rec(this, 0));
    };
    
    List.prototype.toArray = function() {
        if (this.isEmpty) return [];
    
        var rec = function(a, b) {
            if (a.isEmpty) return done(b);
    
            b.push(a.car);
            return cont(function() {
                return rec(a.cdr, b);
            });
        };
        return trampoline(rec(this, []));
    };
    
    List.prototype.toString = function() {
        return 'List(' + this.toArray().join(', ') + ')';
    };
    
    /**
       ## cons(a, b)
    
       Constructor to represent the existence of a value in a list, `a`
       and a reference to another `b`.
    **/
    List.cons.prototype.isEmpty = false;
    List.cons.prototype.isNonEmpty = true;
    
    /**
       ## nil
    
       Represents an empty list (absence of a list).
    **/
    List.nil.isEmpty = true;
    List.nil.isNonEmpty = false;
    
    /**
       ## isList(a)
    
       Returns `true` if `a` is a `cons` or `nil`.
    **/
    var isList = isInstanceOf(List);
    
    bilby = bilby
        .property('cons', List.cons)
        .property('nil', List.nil)
        .property('isList', isList)
        .property('listRange', List.range)
        .method('concat', isList, function(a, b) {
            return a.concat(b);
        })
        .method('fold', isList, function(a, f, g) {
            return a.fold(f, g);
        })
        .method('map', isList, function(a, b) {
            return a.map(b);
        })
        .method('flatMap', isList, function(a, b) {
            return a.flatMap(b);
        })
        .method('equal', isList, function(a, b) {
            var env = this;
            return env.fold(env.zip(a, b), true, function(a, t) {
                return a && env.equal(t[0], t[1]);
            });
        })
        .method('zip', isList, function(a, b) {
            return zip(this.toArray(a), this.toArray(b));
        })
        .method('toArray', isList, function(a) {
            return a.toArray();
        });

    /**
      ## Stream(fork)
    
      The Stream type represents a flow of data ever evolving values over time.
    
      Here is an example of a number piped through to the console.
    
            Stream.of(1).map(
                function (a) {
                    return a + 1;
                }
            ).fork(console.log);
    
    
       * `ap(a, b)` - Applicative ap(ply)
       * `concat(a, b)` - Appends two stream objects.
       * `drop(a, n)` - Returns the stream without its n first elements. If this stream has less than n elements, the empty stream is returned.
       * `filter(a, f)` - Returns all the elements of this stream that satisfy the predicate p.
       * `chain(a, f)` - Applies the given function f to each element of this stream, then concatenates the results.
       * `fold(a, v, f)` - Combines the elements of this stream together using the binary function f, from Left to Right, and starting with the value v.
       * `map(a, f)` - Returns the stream resulting from applying the given function f to each element of this stream.
       * `scan(a, f)` - Combines the elements of this stream together using the binary operator op, from Left to Right
       * `take(n)` - Returns the n first elements of this stream.
       * `zip(a, b)` - Returns a stream formed from this stream and the specified stream that by associating each element of the former with the element at the same position in the latter.
       * `zipWithIndex(a)` -  Returns a stream form from this stream and a index of the value that is associated with each element index position.
    **/
    var Stream = tagged('Stream', ['fork']);
    
    /**
      ### of(x)
    
      Creates a stream that contains a successful value.
    **/
    Stream.of = function(a) {
        return Stream(
            function(next, done) {
                if (a) {
                    next(a);
                }
                return done();
            }
        );
    };
    
    /**
      ### empty()
    
      Creates a Empty stream that contains no value.
    **/
    Stream.empty = function() {
        return Stream.of();
    };
    
    /**
      ### ap(b)
    
      Apply a function in the environment of the success of this stream
      Applicative ap(ply)
    **/
    Stream.prototype.ap = function(a) {
        return this.chain(
            function(f) {
                return a.map(f);
            }
        );
    };
    
    /**
      ### chain(f)
    
      Returns a new stream that evaluates `f` when the current stream
      is successfully fulfilled. `f` must return a new stream.
    **/
    Stream.prototype.chain = function(f) {
        var env = this;
        return Stream(function(next, done) {
            return env.fork(
                function(a) {
                    return f(a).fork(next, function() {
                         //do nothing.
                    });
                },
                done
            );
        });
    };
    
    /**
      ### concat(s, f)
    
      Concatenate two streams associatively together.
      Semigroup concat
    **/
    Stream.prototype.concat = function(a) {
        var env = this;
        return Stream(function(next, done) {
            return env.fork(
                next,
                function() {
                    return a.fork(next, done);
                }
            );
        });
    };
    
    /**
      ### drop(f)
    
      Returns the stream without its n first elements.
    **/
    Stream.prototype.drop = function(n) {
        var dropped = 0;
        return this.chain(
            function(a) {
                if (dropped < n) {
                    dropped++;
                    return Stream.empty();
                } else {
                    return Stream.of(a);
                }
            }
        );
    };
    
    /**
      ### equal(a)
    
      Compare two stream values for equality
    **/
    Stream.prototype.equal = function(a) {
        return this.zip(a).fold(
            true,
            function(v, t) {
                return v && bilby.equal(t._1, t._2);
            }
        );
    };
    
    /**
      ### extract(a)
    
      Extract the value from the stream.
    **/
    Stream.prototype.extract = function() {
        return this.fork(
            identity,
            constant(null)
        );
    };
    
    /**
      ### filter(f)
    
      Returns all the elements of this stream that satisfy the predicate p.
    **/
    Stream.prototype.filter = function(f) {
        var env = this;
        return Stream(function(next, done) {
            return env.fork(
                function(a) {
                    if (f(a)) {
                        next(a);
                    }
                },
                done
            );
        });
    };
    
    /**
      ### fold(v, f)
    
      Combines the elements of this stream together using the binary function f
    **/
    Stream.prototype.fold = function(v, f) {
        var env = this;
        return Stream(
            function(next, done) {
                return env.fork(
                    function(a) {
                        v = f(v, a);
                        return v;
                    },
                    function() {
                        next(v);
                        return done();
                    }
                );
            }
        );
    };
    
    /**
      ### length()
    
      Returns the length of the stream
    **/
    Stream.prototype.length = function() {
        return this.map(
            constant(1)
        ).fold(
            0,
            curry(function(x, y) {
                return x + y;
            })
        );
    };
    
    /**
      ### map(f)
    
      Returns the stream resulting from applying the given function f to each
      element of this stream.
    **/
    Stream.prototype.map = function(f) {
        return this.chain(
            function(a) {
                return Stream.of(f(a));
            }
        );
    };
    
    /**
      ### merge(a)
    
      Merge the values of two streams in to one stream
    **/
    Stream.prototype.merge = function(a) {
        var resolver;
    
        this.map(function(a) {
            if (resolver) resolver(a);
        });
        a.map(function(a) {
            if (resolver) resolver(a);
        });
    
        return Stream(
            function(next, done) {
                resolver = next;
            }
        );
    };
    
    /**
      ### pipe(a)
    
      Pipe a stream to a state or writer monad.
    **/
    Stream.prototype.pipe = function(o) {
        var env = this;
        return Stream(
            function(next, done) {
                return env.fork(
                    function(v) {
                        return o.run(v);
                    },
                    done
                );
            }
        );
    };
    
    /**
      ### scan(a)
    
      Combines the elements of this stream together using the binary operator
      op, from Left to Right
    **/
    Stream.prototype.scan = function(a, f) {
        var env = this;
        return Stream(
            function(next, done) {
                return env.fork(
                    function(b) {
                        a = f(a, b);
                        return next(a);
                    },
                    done
                );
            });
    };
    
    /**
      ### take(v, f)
    
      Returns the n first elements of this stream.
    **/
    Stream.prototype.take = function(n) {
        var taken = 0;
        return this.chain(
            function(a) {
                return (++taken < n) ? Stream.of(a) : Stream.empty();
            }
        );
    };
    
    /**
      ### zip(b)
    
      Returns a stream formed from this stream and the specified stream that
      by associating each element of the former with the element at the same
      position in the latter.
    
    **/
    Stream.prototype.zip = function(a) {
        var env = this;
    
        return Stream(
            function(next, done) {
                var left = [],
                    right = [],
                    // Horrible state
                    called = false,
                    end = function() {
                        if (!called) {
                            done();
                            called = true;
                        }
                    };
    
                env.fork(
                    function(a) {
                        if (right.length > 0) {
                            next(Tuple2(a, right.shift()));
                        } else {
                            left.push(a);
                        }
                    },
                    end
                );
    
                a.fork(
                    function(a) {
                        if (left.length > 0) {
                            next(Tuple2(left.shift(), a));
                        } else {
                            right.push(a);
                        }
                    },
                    end
                );
            }
        );
    };
    
    /**
      ### zipWithIndex()
    
      Returns a stream form from this stream and a index of the value that
      is associated with each element index position.
    **/
    Stream.prototype.zipWithIndex = function() {
        var index = 0;
        return this.map(
            function(a) {
                return Tuple2(a, index++);
            }
        );
    };
    
    /**
      ## fromArray(a)
    
      Returns a new stream which iterates over each element of the array.
    **/
    Stream.fromArray = function(a) {
        return Stream(
            function(next, done) {
                bilby.map(a, next);
                return done();
            }
        );
    };
    
    /**
      ## isStream(a)
    
      Returns `true` if `a` is `Stream`.
    **/
    var isStream = isInstanceOf(Stream);
    
    /**
      ## streamOf(type)
    
      Sentinel value for when an stream of a particular type is needed:
    
           streamOf(Number)
    **/
    function streamOf(type) {
        var self = getInstance(this, streamOf);
        self.type = type;
        return self;
    }
    
    /**
      ## isStreamOf(a)
    
      Returns `true` if `a` is `streamOf`.
    **/
    var isStreamOf = isInstanceOf(streamOf);
    
    bilby = bilby
        .property('Stream', Stream)
        .property('streamOf', streamOf)
        .property('isStream', isStream)
        .property('isStreamOf', isStreamOf)
        .method('arb', isStreamOf, function(a, b) {
            var args = this.arb(a.type, b - 1);
            return Stream.fromArray(args);
        })
        .method('shrink', isStream, function(a, b) {
            return [];
        })
        .method('ap', isStream, function(a, b) {
            return a.ap(b);
        })
        .method('chain', isStream, function(a, b) {
            return a.chain(b);
        })
        .method('concat', isStream, function(a, b) {
            return a.chain(b);
        })
        .method('equal', isStream, function(a, b) {
            return a.equal(b);
        })
        .method('extract', isStream, function(a) {
            return a.extract();
        })
        .method('fold', isStream, function(a, b) {
            return a.chain(b);
        })
        .method('map', isStream, function(a, b) {
            return a.map(b);
        })
        .method('zip', isStream, function(b) {
            return a.zip(b);
        });

    /**
       # QuickCheck
    
       QuickCheck is a form of *automated specification testing*. Instead
       of manually writing tests cases like so:
    
           assert(0 + 1 == 1);
           assert(1 + 1 == 2);
           assert(3 + 3 == 6);
    
       We can just write the assertion algebraicly and tell QuickCheck to
       automaticaly generate lots of inputs:
    
           bilby.forAll(
               function(n) {
                   return n + n == 2 * n;
               },
               [Number]
           ).fold(
               function(fail) {
                   return "Failed after " + fail.tries + " tries: " + fail.inputs.toString();
               },
               "All tests passed!"
           )
    **/
    
    function generateInputs(env, args, size) {
        return env.map(args, function(arg) {
            return env.arb(arg, size);
        });
    }
    
    /**
       ### failureReporter
    
       * inputs - the arguments to the property that failed
       * tries - number of times inputs were tested before failure
    **/
    function failureReporter(inputs, tries) {
        var self = getInstance(this, failureReporter);
        self.inputs = inputs;
        self.tries = tries;
        return self;
    }
    
    function findSmallest(env, property, inputs) {
        var shrunken = env.map(inputs, env.shrink),
            smallest = [].concat(inputs),
            args,
            i,
            j;
    
        for(i = 0; i < shrunken.length; i++) {
            args = [].concat(smallest);
            for(j = 0; j < shrunken[i].length; j++) {
                args[i] = shrunken[i][j];
                if(property.apply(this, args))
                    break;
                smallest[i] = shrunken[i][j];
            }
        }
    
        return smallest;
    }
    
    /**
       ## forAll(property, args)
    
       Generates values for each type in `args` using `bilby.arb` and
       then passes them to `property`, a function returning a
       `Boolean`. Tries `goal` number of times or until failure.
    
       Returns an `Option` of a `failureReporter`:
    
           var reporter = bilby.forAll(
               function(s) {
                   return isPalindrome(s + s.split('').reverse().join(''));
               },
               [String]
           );
    **/
    function forAll(property, args) {
        var inputs,
            i;
    
        for(i = 0; i < this.goal; i++) {
            inputs = generateInputs(this, args, i);
            if(!property.apply(this, inputs))
                return Option.some(failureReporter(
                    findSmallest(this, property, inputs),
                    i + 1
                ));
        }
    
        return Option.none;
    }
    
    /**
       ## goal
    
       The number of successful inputs necessary to declare the whole
       property a success:
    
           var _ = bilby.property('goal', 1000);
    
       Default is `100`.
    **/
    var goal = 100;
    
    bilby = bilby
        .property('failureReporter', failureReporter)
        .property('forAll', forAll)
        .property('goal', goal);

    if(typeof exports != 'undefined') {
        /*jshint node: true*/
        exports = module.exports = bilby;
    } else {
        root.bilby = bilby;
    }
})(this);