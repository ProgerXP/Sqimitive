/*!
  Sqimitive.js - a JavaScript primitive
  http://squizzle.me/js/sqimitive | Public domain/Unlicense
*/

/*
  Mandatory dependency, one of:
  - NoDash (http://squizzle.me/js/nodash)
  - underscorejs.org (>=1.9.0)
  - lodash.com

  Fields with names starting with '_' are protected and intended
  for use only inside that class' definition and its subclasses.
*/

;(function (factory) {
  // nodash can be replaced by other supported library.
  // requirejs.config({map: {sqimitive: {nodash: 'lodash'}}});
  var deps = {nodash: '_'}
  var me = 'Sqimitive'
  // --- Universal Module (squizzle.me) - CommonJS - AMD - window --- IE9+ ---

  if (typeof exports != 'undefined' && !exports.nodeType) {
    // CommonJS/Node.js.
    deps = Object.keys(deps).map(function (dep) { return require(dep) })
    if (typeof module != 'undefined' && module.exports) {
      module.exports = factory.apply(this, deps)
    } else {
      exports = factory.apply(this, deps)
    }
  } else if (typeof define == 'function' && define.amd) {
    // AMD/Require.js.
    define(Object.keys(deps), factory)
  } else {
    // In-browser. self = window or web worker scope.
    var root = typeof self == 'object' ? self
             : typeof global == 'object' ? global
             : (this || {})
    var by = function (obj, path) {
      path = path.split(/\./g)
      while (obj && path.length) { obj = obj[path.shift()] }
      return obj
    }
    // No Object.values() in IE.
    deps = Object.keys(deps).map(function (dep) {
      var res = by(root, deps[dep])
      if (!res) { throw me + ': missing dependency: ' + dep }
      return res
    })
    me = me.split(/\.([^.]+)$/)
    if (me.length > 1) { root = by(root, me.shift()) }
    root[me[0]] = factory.apply(this, deps)
  }
}).call(this, function (_) {
  "use strict";

  var hasOwn = Object.prototype.hasOwnProperty
  var objectAssign = Object.assign || _.extend    // not in IE.

  // Subclass extension method, taken from Backbone.
  //
  // protoProps - only 'constructor' (if present) is used. Assign
  // instance/static fields manually later (note that static fields are not
  // inherited with prototype, so you need to copy them from parent
  // explicitly).
  function extend(name, parent, protoProps) {
    var child

    if (protoProps && hasOwn.call(protoProps, 'constructor')) {
      child = protoProps.constructor
    } else {
      // It seems at least Chrome always shows the original function's value
      // even with defineProperty() on `'name. It'd be possible to create a
      // function without eval() or Function() but only in ES6:
      //   child = {[name]: function ...}[name]
      //child = Function(name.replace(/\W+/g, '_'), 'return parent.apply(this, arguments)')
      child = function Sqimitive() { return parent.apply(this, arguments) }
    }

    var Surrogate = function () { this.constructor = child }
    Surrogate.prototype = parent.prototype
    child.prototype = new Surrogate

    child.__super__ = parent.prototype
    return child
  }

  var Sqimitive = {
    // Version of the core Sqimitive library in use.
    version: '1.2',

    // Reference to the utility library in use.
    //
    // Particularly useful when using modular frameworks so that it's possible
    // to access _ by requiring Sqimitive alone).
    //
    //= NoDash`, Underscore`, LoDash
    _: _,
  }

  /***
    Sqimitive.Core - Basic Event/Inheritance
   ***/

  //! +cl=Sqimitive.Core
  //
  // Implements inheritance and event system without any other Sqimitive
  // (`#Base) functionality.
  //
  // In a typical scenario you don't need to use `#Core directly - use
  // `[Sqimitive.Base`] instead.
  //
  // In special cases, since `'Core lacks any specialized functionality it can
  // be used as a base class for your classes that need better inheritance
  // and/or events (like a more elaborate alternative to
  // `@https://github.com/primus/eventemitter3`@)...
  //[
  //   var MyEventAwareClass = Sqimitive.Core.extend({
  //     doFoo: function () {
  //       this.fire('beforeFoo', ['arg', 'arg'])
  //       // ...
  //       this.fire('afterFoo', ['...'])
  //     }
  //   })
  //
  //   // Now clients can subscribe to its events:
  //   myEventAwareObject.on('beforeFoo', function () {
  //     alert('Boo!')
  //   })
  //
  //   // ...
  //
  //   myEventAwareObject.doFoo()    //=> Boo!
  //]
  //
  // ...Or as an instance object held in an internal property if you want to
  // avoid exposing any Sqimitive functionality at all:
  //[
  //   var MyEventAwareClass = function () {
  //     var _events = new Sqimitive.Core
  //
  //     this.on   = function() { _events.on.apply(_events, arguments) }
  //     this.off  = function() { _events.off.apply(_events, arguments) }
  //     this.fire = function() { _events.fire.apply(_events, arguments) }
  //
  //     // Just like in the above example:
  //     this.doFoo = function () { ... }
  //   }
  //
  //   myEventAwareObject.on('beforeFoo', ...)
  //   myEventAwareObject.doFoo()
  //]

  //! +fn=constructor
  // Assigns new unique `#_cid (a string: `'p + unique number) and clones all
  // instance properties of self that are not listed in `#_shareProps. Cloning
  // puts a stop to accidental static sharing of properties among all instances
  // of a class where those properties are defined.
  var Core = Sqimitive.Core = function () {
    //! +ig
    this._cid = 'p' + Core.unique('p')

    // Typically it's like: var MySqim = Sqimitive.extend({...});
    // MySqim._shareProps.push(...); - i.e. _shareProps is updated later. We'd
    // either have to explicitly call some kind of refreshCopyProps() after
    // complete declaration or do that in the constructor, which is more
    // convenient and not much slower (it's done only once per class).
    var copy = this.constructor._copyProps

    if (!copy) {
      copy = this.constructor._copyProps = []
      for (var prop in this) {
        if (typeof this[prop] == 'object' && this[prop] != null &&
            this.constructor._shareProps.indexOf(prop) == -1) {
          copy.push(prop)
        }
      }
    }

    for (var i = 0; i < copy.length; i++) {
      this[copy[i]] = Core.deepClone(this[copy[i]])
    }
  }

  //! +clst
  // Static fields of Sqimitive.Core.
  _.extend(Core, {
    //! +ig
    // For `#unique().
    //= object {str prefix: int last taken}
    _unique: {},

    //#+tag_Extension
    //* `@Core::_mergeProps`@
    //
    //#-setOnDeclViaPush
    //
    // Specifies which instance properties are to be merged rather than
    // overwritten when redefined in a subclass.
    //
    //= array of string `- property names
    //
    // Properties must be of these types:
    //> array `- Merged using `[Array.concat(baseClass[prop],
    //  childClass[prop])`]. Subclass' values are added after parents' values:
    //  `[['a', 'b'] + ['c'] = ['a', 'b', 'c']`].
    //> object `- Merged using `[_.extend(baseClass[prop], childClass[prop])`].
    //  Keys defined in parents are kept unless also defined in a subclass:
    //  `[{a: 1, b: 2} + {a: 3, c: 4} = {a: 3, b: 2, c: 4}`].
    //
    //? `[
    //   var MyParent = Sqimitive.Base.extend({
    //     _objectProperty: {key1: 'value1', key2: 'value2'},
    //     _arrayProperty: ['item1', 'item2'],
    //   })
    //
    //   MyParent._mergeProps.push('_objectProperty', '_arrayProperty')
    //
    //   var MyChild = MyParent.extend({
    //     _objectProperty: {key2: 'CHILD1', key3: 'CHILD2'},
    //     _arrayProperty: ['item3', 'item4'],
    //   })
    //
    //   // MyChild._objectProperty is now
    //   // {key1: 'value1', key2: 'CHILD1', key3: 'CHILD2'}
    //
    //   // MyChild._arrayProperty is now ['item1', 'item2', 'item3', 'item4']
    //]
    //
    //#mergePropsExtend
    // ` `*Warning:`* when passing `#_mergeProps or `#_shareProps inside
    // `'staticProps (second argument of `#extend()) all inherited items will
    // be removed. The correct way to add your properties while keeping those
    // in the base classes is this:
    //[
    //   var MySqimitive = Sqimitive.Base.extend({
    //     // Define instance fields...
    //   }, {
    //     // Define static fields if you need, else don't pass this parameter.
    //   })
    //
    //   // extend() has copied the inherited _mergeProps list which we can now
    //   // append to or modify using regular Array functions.
    //   MySqimitive._mergeProps.push('prop1', 'prop2', ...)
    //   // Same with _shareProps.
    //   MySqimitive._shareProps.push('prop1', 'prop2', ...)
    //]
    //
    // These are `*wrong`* ways to append to these properties:
    //[
    //   var MySqimitive = Sqimitive.Base.extend({
    //     // WRONG: _mergeProps is static so it won't be read from here.
    //     _mergeProps: ['prop'],
    //   }, {
    //     // WRONG: technically fine but will entirely replace base class'
    //     // merge list.
    //     _mergeProps: ['prop'],
    //   })
    //
    //   // WRONG: works but once again will replace all the inherited items.
    //   MySqimitive._mergeProps = ['prop']
    //
    //   // CORRECT:
    //   MySqimitive._mergeProps.push('prop')
    //]
    //
    //#
    //
    // Other notes:
    //* `#extend() always clones `#_mergeProps and `#_shareProps.
    //* By default, `#Base class adds `@Base._opt`@, `@Base.elEvents`@ and
    //  `#_respToOpt to this list.
    //* See instance `#.mixIn() for the implementation.
    //* Removing a parent-of-parent's property from `'_mergeProps doesn't
    //  "un-merge" it since merging happens in `#extend() (`#mixIn()) so after
    //  `#extend() the new class already has merged properties of all of its
    //  ancestors. However, removal does affect new subclasses: `[
    //    var ClassA = Sqimitive.Base.extend({array: ['in A']})
    //    ClassA._mergeProps.push('array')
    //      // (new ClassA).array is ['in A']
    //
    //    var ClassB = ClassA.extend({array: ['in B']})
    //      // (new ClassB).array is ['in A', 'in B']
    //
    //    var ClassC = ClassB.extend({array: ['in C']})
    //    ClassC._mergeProps = []
    //      // (new ClassC).array is ['in A', 'in B', 'in C']
    //
    //    var ClassD = ClassC.extend({array: ['in D']})
    //      // (new ClassD).array is ['in D'] - not merged!
    //  `]
    //
    //# Complex inherited value modification
    // `'_mergeProps doesn't allow deleting members or otherwise changing the
    // value. However, in some contexts `'null or `'undefined does the job for
    // objects (in contrast with `'delete such properties still appear when
    // using `[for..in`], etc.):
    //[
    //   var MyParent = Sqimitive.Base.extend({
    //     _objectProperty: {key1: 'value1', key2: 'value2'},
    //   })
    //
    //   MyParent._mergeProps.push('_objectProperty')
    //
    //   var MyChild = MyParent.extend({
    //     _objectProperty: {key1: null},
    //   })
    //
    //   // MyChild._objectProperty is now {key1: null, key2: 'value2'}
    //
    //   for (var key in new MyChild) { alert(key) }
    //     //=> key1
    //     //=> key2
    //]
    //
    // Use `@Base.init()`@ or `#postInit() to modify inherited values in other
    // ways:
    //[
    //   var MyParent = Sqimitive.Base.extend({
    //     _objectProperty: {key1: 'value1', key2: 'value2'},
    //   })
    //
    //   var MyChild = MyParent.extend({
    //     events: {
    //       init: function () {
    //         // MyParent's _objectProperty is unaffected, see _shareProps.
    //         delete this._objectProperty.key1
    //         this._objectProperty.key2 += 'foo'
    //       },
    //     },
    //   })
    //
    //   // MyChild._objectProperty is now {key2: 'value2foo'}
    //
    //   for (var key in new MyChild) { alert(key) }
    //     //=> key2
    //]
    //
    //#-inBB
    // In Backbone, when you extend a parent class with a property that it
    // already has you end up with a completely new property. This doesn't
    // always make sense - for example, if a class has its own
    // `@bb:View-events`@ then what you really need is merge its own (base)
    // events with the events of new subclass. Same thing with
    // `@bb:Model-attributes`@ and `@bb:Model-defaults`@, `@bb:Router-routes`@
    // and others. Example (`@http://jsfiddle.net/Proger/u2n3e6ex/`@):
    //[
    //   var MyView = Backbone.View.extend({
    //     events: {
    //       'click .me': function () { alert('You clicked it!') },
    //     },
    //   })
    //
    //   var MyOtherView = MyView.extend({
    //     // This object entirely replaces MyView's event map.
    //     events: {
    //       'keypress .me': function () {
    //         alert('Oh noes, we broke the button :(')
    //       },
    //     },
    //   })
    //]
    _mergeProps: [],

    //#+tag_Extension
    //* `@Core::_shareProps`@
    //
    //#-setOnDeclViaPush
    //
    // Specifies which instance properties are not to be cloned upon
    // construction. They will be shared by all instances of a class (where the
    // property was defined, i.e. where given to `#extend()).
    //
    //= array of string `- property names
    //
    // Unlisted instance properties are cloned (using `#deepClone()) upon new
    // object instantiation (in `#constructor). If you don't want this overhead
    // for some property (even though it's usually tiny) then list it in
    // `#_shareProps or assign its value in `@Base.init()`@ or `#postInit().
    //
    //? One particular case when the default cloning causes problem is when you
    //  are assigning "classes" to properties - recursive copying of such a
    //  value not just breaks it (`[MyClass === myObj._model`] no longer works)
    //  but is also very heavy.
    //
    //  Either use `#_shareProps...
    //  `[
    //    var MyView = Sqimitive.Base.extend({
    //      _model: MyApp.MyModel,
    //    })
    //
    //    // _shareProps is a static property.
    //    MyView._shareProps.push('_model')
    //  `]
    //
    //  ...Or assign the value after instantiation, which is less declarative:
    //  `[
    //    var MyView = Sqimitive.Base.extend({
    //      _model: null,   // MyApp.MyModel¹
    //
    //      events: {
    //        init: function () {
    //          this._model = MyApp.MyModel
    //        },
    //      },
    //    })
    //  `]
    //    `&sup1 It's customary in Sqimitive to leave a comment with the type's
    //    name next to such property.
    //
    //#-mergePropsExtend
    //
    // Other notes:
    //* By default, `#Base class adds `#_childClass to this list.
    //* See instance `#.mixIn() for the implementation.
    //
    //#-inBB
    // In Backbone, values of all properties inherited by a subclass are shared
    // among all instances of the base class where they are defined. Just like
    // in Python, if you have `[...extend( {array: []} )`] then doing
    // `[this.array.push(123)`] will affect all instances where `'array wasn't
    // overwritten with a new object. This poses a typical problem in
    // day-to-day development.
    //
    // Example (`@http://jsfiddle.net/Proger/vwqk67h8/`@):
    //[
    //   var MyView = Backbone.View.extend({foo: {}})
    //   var x = new MyView
    //   var y = new MyView
    //   x.foo.bar = 123
    //   alert(y.foo.bar)
    //]
    //
    // Can you guess the alert message? It's `[123`]!
    _shareProps: [],

    //! +ig
    // An internal field - list of prototype (instance) properties being copied
    // in the constructor. Running `[for..in`] each time is extremely
    // expensives (10X). Maintained automatically by `#extend()/`#mixIn().
    // `'null value causes constructor to collect the props.
    _copyProps: null,

    //! `, +fna=function ( [name,] [protoProps [, staticProps]] )
    //
    //#+tag_Extension
    //* `@Core::extend()`@
    //#
    //
    // Creates a subclass of the class on which `#extend() is called.
    //
    //> name string `- Optional convenience string displayed in debuggers (as
    //  the function/constructor - "class" names). Defaults to "Sqimitive".
    //  `[
    //    var MyClass = Sqimitive.Base.extend('My.Class')
    //    MyClass.name                      //=> 'My.Class'
    //    ;(new MyClass).constructor.name   //=> 'My.Class'
    //  `]
    //> protoProps object `- New instance fields (properties or methods).
    //  May contain special non-field keys (see `#mixIn()).
    //> staticProps object `- New static fields.
    //
    // `'protoProps fields become accessible as `[(new MyClass).instanceSomething()`]
    // while `'staticProps - as `[MyClass.staticSomething()`].
    //
    // Any argument may be `'null or omitted. If all are such then you get a
    // copy of the base class (and yet `[BaseClass !== SubClass`]).
    //
    // Other notes:
    //* In Sqimitive, subclassing is a special case of mix-ins (multi-parent
    //  inheritance in OOP). `#extend() simply creates a new "blank" class and
    //  mixes the base class into it. Therefore most of the job is performed by
    //  `#mixIn() (which also allows changing particular object's prototype
    //  after class construction on run-time).
    //* `#extend() creates a new prototype, sets its parent, assigns
    //  `'__super__ (a static property pointing to the base class), calls
    //  `#::mixIn() and resolves `#_childClass if it's a string (since it can't
    //  be done before the prototype is created).
    //#-mixInDoes
    //* The `'staticProps argument is applied by `#extend() before `#mixIn()
    //  applies the `'staticProps key of `'protoProps so the latter win on key
    //  conflict. If giving both (which you'd rarely do) results may be
    //  unexpected: `[
    //    var Class = Sqimitive.Base.extend({
    //      staticProps: {prop: 'foo'},
    //    }, {
    //      prop: 'bar',
    //    })
    //      // Class.prop is 'foo'
    //  `]
    //
    //? In case of duplicated field names, subclass' fields take precedence and
    //  overwrite fields in the parent class except for fields listed in
    //  `#_mergeProps: `[
    //    // First we extend a base Sqimitive class with our own properties.
    //    var MyBase = Sqimitive.jQuery.extend({
    //      _somethingBase: 123,
    //      _somethingNew: 'foo',
    //
    //      el: {tag: 'nav', id: 'nav'},
    //
    //      _opt: {
    //        baseOption: 'boo',
    //        baseMore: 'moo',
    //      },
    //    })
    //
    //    // Now if we extend MyBase...
    //    var MySubclass = MyBase.extend({
    //      _somethingSub: 'bar',
    //      _somethingBase: 987,
    //
    //      el: {tag: 'footer'},
    //
    //      _opt: {
    //        subOption: 'sub',
    //        baseMore: 'bus',
    //      },
    //    })
    //
    //    /*
    //      ...we get the following class, after merging with its parent:
    //
    //        MySubclass = {
    //          // Got new value - overridden in MySubclass.
    //          _somethingBase: 987,
    //          // Retained old value from MyBase.
    //          _somethingNew: 'foo',
    //          // New property - introduced in MySubclass.
    //          _somethingSub: 'bar',
    //
    //          // Got new value in MySubclass.
    //          el: {tag: 'footer'},
    //
    //          // Unlike el, _opt is listed in _mergeProps by default so its
    //          // keys are merged and not entirely replaced.
    //          _opt: {
    //            // Retained.
    //            baseOption: 'boo',
    //            // Introduced.
    //            subOption: 'sub',
    //            // Overridden.
    //            baseMore: 'bus',
    //          },
    //        }
    //    */
    //  `]
    extend: function (name, protoProps, staticProps) {
      // this = base class.
      // Only works in strict mode which disconnects parameter vars from
      // members of arguments.
      name = typeof arguments[0] == 'string' && Array.prototype.shift.call(arguments)

      var child = extend(name || 'Sqimitive', this, arguments[0])
      //! +ig
      // Since base class has its own __super__, make sure child's (set up by
      // extend() above) isn't overwritten.
      _.extend(child, this, arguments[1], {__super__: child.__super__})

      // Ensure changing these in a subclass doesn't affect the parent:
      //   var Sub = Sqimitive.Base.extend()
      //   Sqimitive.Base._mergeProps.length  //=> 3
      //   Sub._mergeProps.push('new')
      //   Sqimitive.Base._mergeProps.length  //=> 4
      child._mergeProps = (child._mergeProps || this._mergeProps).concat()
      child._shareProps = (child._shareProps || this._shareProps).concat()

      //! +ig
      // Function.prototype.length confuses "isArrayLike" functions.
      // Just `[delete Core.length`] doesn't work.
      Object.defineProperty(child, 'length', {value: 'NotAnArray'})

      name && Object.defineProperty(child, 'name', {value: name})

      arguments[0] && child.mixIn(arguments[0])

      // String class path is relative to the base class; instead of searching
      // all prototypes to find where this property was introduced (without
      // this all children will reference to them as the base class), we
      // "fixate" it when declaring the class. Done here, not in mixIn(), to
      // avoid questions like "is the string, if given by a mix-in, relative to
      // the mix-in or the target class?".
      if (typeof child.prototype._childClass == 'string') {
        child.prototype._childClass = [child, child.prototype._childClass]
      }

      return child
    },

    //#+tag_Extension
    //* `@Core::mixIn()`@
    //#
    //
    // Extends this class with a behaviour of another "class" (a "mix-in").
    //
    // The instance `#.mixIn() works the same way but allows extending a
    // particular object instance on run-time. Its description follows.
    //
    //#-mixInDesc
    mixIn: function (newClass, options) {
      return this.prototype.mixIn(newClass, options)
    },

    // Simply an empty function that returns `'undefined.
    //
    // ` `#stub() is similar to `@un:noop`@() in Underscore and LoDash.
    //
    //? Use `#stub() in places where you don't want to supply any
    //  implementation - this lets Sqimitive optimize things when it knows that
    //  a function (acting as a method or an event handler) can be simply
    //  discarded or overridden.
    //  `[
    //     var MySqim = Sqimitive.Base.extend({
    //       success: Sqimitive.Base.stub,
    //       error: Sqimitive.Base.stub,
    //     })
    //
    //     var my = new MySqim
    //     // Replaces the empty handler entirely.
    //     my.on('success', function () { alert('Good!') })
    //       //=> my._events.success.length is 1
    //  `]
    //
    // Otherwise, if you are not a performance purist you can just use
    // `[function () {}`] or `[new Function`]:
    //[
    //   var MySqim = Sqimitive.Base.extend({
    //     success: function () { },
    //   })
    //
    //   var my = new MySqim
    //   my.on('success', function () { alert('Good!') })
    //     //=> my._events.success.length is 2
    //]
    //
    // Exact optimizations are implementation details and may change in the
    // future, but at this time if you were to put `'success into `'events it
    // would be kept because `#on() doesn't check existing handlers for `#stub:
    //[
    //   var MySqim = Sqimitive.Base.extend({
    //     events: {
    //       success: Sqimitive.Base.stub,
    //     },
    //   })
    //
    //   var my = new MySqim
    //   my.on('success', function () { alert('Good!') })
    //     //=> my._events.success.length is 2 (existing stub handler kept)
    //   my.on('success', Sqimitive.Base.stub)
    //     //=> my._events.success.length is 3 (new stub handler added)
    //]
    stub: function Sqimitive_stub() { },

    //! `, +fna=function ( [prefix] )
    //
    //#+tag_Utilities
    //* `@Core::unique()`@
    //#
    //
    // Returns a sequential number starting from `[1`] that is guaranteed to be
    // unique among all calls to `#unique() with the same `'prefix during this
    // session (page load, etc.).
    //
    // ` `#_cid receives one such value in `#constructor.
    //
    // ` `#unique() is similar to `@un:uniqueId`@() in Underscore and LoDash.
    //
    //?`[
    //    unique('my')    //=> 3
    //    unique()        //=> 87
    //    unique('my')    //=> 4
    //    unique('some')  //=> 21
    //    unique('my')    //=> 5
    // `]
    unique: function (prefix) {
      return this._unique[prefix] = 1 + (this._unique[prefix] || 0)
    },

    //! `, +fna=function ( prop [, args] )
    //
    //#+tag_Utilities
    //* `@Core::picker()`@
    //#
    //
    // Returns a function that fetches `'prop property of the object it's
    // given, possibly calling it with `'args.
    //
    // The function expects one argument (an object) that, when called, returns
    // the value of the given object's `'prop property (if it's not a function)
    // or the result of calling that function (if it is one, giving it `'args).
    // In other cases (not an object or no `'prop) the function returns
    // `'undefined.
    //
    // ` `#picker() is similar to `@un:result`@() in Underscore and LoDash.
    //
    //> prop string `- property name
    //> args array `- optional arguments if `'prop resolves to a function
    //
    //? `[
    //      var obj = {
    //        one: 1,
    //        two: function () { return 2 },
    //        some: function (a, b) { return a + '--' + b },
    //      }
    //
    //      var picker = Sqimitive.Base.picker
    //      picker('one')(obj)                //=> 1
    //      picker('two')(obj)                //=> 2
    //      picker('some', ['A', 'B'])(obj)   //=> A--B
    //
    //      var values = ['foo', null, ['bar'], obj]
    //      _.map(values, picker('one'))
    //        //=> [undefined, undefined, undefined, 1]
    //  `]
    //
    //? Usually `#picker()'s result is given to some filtering function
    //  (`#util). Example from `#chld: `[
    //    getIncomplete: function () {
    //      return this.reject(MyToDoList.picker('get', 'isCompleted'))
    //    },
    //  `]
    picker: function (prop, args) {
      args = Core.toArray(args)
      return function (obj) {
        if (obj instanceof Object && prop in obj) {
          return typeof obj[prop] == 'function'
            ? obj[prop].apply(obj, args)
            : obj[prop]
        }
      }
    },

    //! `, +fna=function ( func [, obj] )
    //
    // Expands a function reference `'func of object `'obj (`'this if not
    // given) into a real `'Function.
    //
    // ` `#expandFunc() is used in `#on(), `#events and others to
    // short-reference the instance's own methods.
    //
    // If `'func is a string and contains a dot or a dash (`[.-`]) - returns
    // masked (`#masker()) version of this method (`'mask starts with the first
    // such character). If it's a string without them - returns a function that
    // calls the method named `'func on `'obj (or `'this if omitted). In other
    // cases returns `'func as is (if `'obj is omitted) or `[_.bind(func,
    // obj)`] (if `'obj is given).
    //
    //?`[
    //    var func = Sqimitive.Base.expandFunc('meth')
    //      // returned function will call this.meth(arguments, ...).
    //
    //    var obj = {meth: function (s) { alert(s) }}
    //    func.call(obj, 123)
    //      // alerts 123.
    //
    //    var func = Sqimitive.Base.expandFunc('meth-.', obj)
    //      // this function works in obj context, calling meth with just one
    //      // argument (2nd it was given) - see masker().
    //
    //    _.each({k1: 1, k2: 2}, func)
    //      // each() calls func(1, 'k1') and func(2, 'k2').
    //      // func calls obj.meth('k1') and obj.meth('k2').
    //      // alerts twice: 'k1' and 'k2'.
    //
    //    _.each({k1: 1, k2: 2}, _.bind(func, obj))
    //      // if we didn't give obj to expandFunc() previous example would
    //      // fail - func() would be called on window which has no 'meth'
    //      // method.
    // `]
    expandFunc: function (func, obj) {
      if (typeof func == 'string') {
        var parts = func.split(/([.-].*)/)
        if (parts.length > 1) {
          return Core.masker(parts[0], parts[1], obj)
        } else {
          return function () {
            var callCx = obj || this
            return callCx[func].apply(callCx, arguments)
          }
        }
      } else {
        return obj ? _.bind(func, obj) : func
      }
    },

    //! `, +fna=function ( func[, mask[, cx[, args]]] )
    //
    //#+tag_Utilities
    //* `@Core::masker()`@
    //#
    //
    // Returns a version of `'func with arguments reordered according to
    // `'mask.
    //
    //> mask number to skip that many leading arguments alike to
    //  `@un:rest`@()`, null/omitted to assume the number `[1`] (skip first
    //  argument)`, string pattern `#maskerPattern
    //> func string method name`, function `- called on `'cx
    //> cx object`, null/omitted use `'this `- the context for `'func
    //> args array `- extra left-side arguments to `'func
    //
    // ` `#masker() is similar to LoDash's `'rearg().
    //
    // Masking is a way to work around `#argDanger and avoid writing callback
    // function wrappers that only ignore or reorder arguments. It's
    // implicitly used in string `#events values since they are passed to
    // `#expandFunc().
    //
    //#es6this
    //? ES6 arrow functions could be useful for this but they are ill-suited
    //  for use as handlers when `#extend()ing because of their permanent
    //  `'this.
    //
    //  `[
    //    var MyClass = Sqimitive.Base.extend({
    //      events: {
    //        // WRONG: will pass res as s, value as chars and break clean():
    //        '+normalize_caption': 'clean',
    //        // WRONG: this is window/self, not an instance of MyClass:
    //        '+normalize_caption': (res, value) => this.clean(value),
    //        // CORRECT:
    //        '+normalize_caption': function (res, value) { return this.clean(value) },
    //        // CORRECT: skip first argument, give second:
    //        '+normalize_caption': 'clean-.',
    //      },
    //
    //      clean: function (s, chars) {
    //        chars = chars || ' \t\r\n'
    //        while (s.length && chars.indexOf(s[0]) != -1) {
    //          s = s.substr(1)
    //        }
    //        while (s.length && chars.indexOf(s[s.length - 1]) != -1) {
    //          s = s.replace(/.$/, '')
    //        }
    //        return s
    //      },
    //    })
    //  `]
    //
    //?`[
    //   $.ajax({
    //     url: 'api/route',
    //     dataType: 'json',
    //     context: sqim,
    //
    //     // WRONG: success' second argument is textStatus which gets assigned
    //     // as assignResp(data, options) breaking the latter (textStatus is
    //     // not options):
    //     success: sqim.assignResp,
    //
    //     // CORRECT: we indicate that we are only interested in the first
    //     // argument which is passed through to assignResp():
    //     success: Sqimitive.Base.masker('assignResp', '.'),
    //   })
    // `]
    //
    //? It is customary to alias `#masker() with a shorter name and use the
    //  alias in the code:
    //  `[
    //    var m = Sqimitive.Base.masker
    //
    //    var MyModel = Sqimitive.Base.extend({
    //      // Note that it's different from the first example: normalize_OPT
    //      // is a method, not an event handler, so no need for '+...' - but
    //      // no automatic masking too (string value can be used only in
    //      // events, in properties it must be a function).
    //      //
    //      // Unmasked, _.trim() takes two arguments: (str, chars).
    //      // normalize_OPT() is passed: (value, options).
    //      // As we see, options is given as chars which is incorrect.
    //      normalize_caption: m(_.trim, '.'),
    //    })
    //  `]
    //
    //? `[
    //    // Giving an explicit cx, the context object (col):
    //    _.each(arrayOfSqims, m('nest', '21', col))
    //      // here we call col.nest() on each item in arrayOfSqim with swapped
    //      // arguments, effectively nesting each member into the col object.
    //      // _.each() calls the iterator as (value, key) while nest() takes
    //      // (key, sqim)
    //
    //    m('nest', 1)
    //      // returns a function that preserves all but the first argument:
    //      // function () { return this.nest.apply(this, _.rest(arguments)) }
    //
    //    m('nest')
    //      // the same - omitted mask defaults to number 1
    //
    //    m('nest', 0, cx)
    //      // doesn't change arguments at all (_.rest(a, 0) == a) but binds
    //      // function to cx
    //
    //    m('nest', 0, null, ['left', 'left2'])
    //      // doesn't bind result but pushes 'left' and 'left2' arguments
    //      // before all given arguments: nest('left', 'left2', other args...)
    //
    //    m(function (a1, a2) { alert(a1 + ' ' + a2) }, '')
    //      //=> always 'undefined undefined'
    //  `]
    //
    //#maskerPattern Mask pattern
    // In a string `'mask, each symbol maps arguments given to the masked
    // function (returned by `#masker) to arguments for the original `'func
    // (the argument to `#masker). Each symbol represents a particular argument
    // and can be one of these:
    //
    //> dot: `[.`] `- gets argument at index of this dot in the `'mask string
    //  (`[-..-.`] equals to `[-23-5`])
    //> dash: `[-`] `- ignores argument (doesn't give to `'func); trailing
    //  dashes are meaningless (arguments past the end of `'mask are never
    //  given unless `'mask is a number)
    //> number: `[1-9`] `- gets argument by index: `[1`] gets the first masked
    //  argument, etc.
    //
    // For example, if the wrapped function received arguments `[arg1, arg2,
    // arg3`] then the `'mask of `[-.1`] (same as `[-21`]) gives the original
    // `'func arguments `[arg2, arg1`].
    //
    // Empty `'mask passes zero arguments (as do `[-`], `[--`], etc.).
    //
    // Note: the `'mask of `['3'`] (string) is different from `[3`] (number) -
    // `['3'`] passes 3rd wrapper's argument as the first `'func's argument
    // while `[3`] skips first 3 arguments and passes all others.
    masker: function (func, mask, cx, args) {
      mask == null && (mask = 1)
      var isMethod = typeof func == 'string'
      var isSkipFirst = typeof mask == 'number'
      args || (args = [])

      if (!isSkipFirst) {
        mask = mask
          .replace(/\./g, function (ch, i) { return i > 8 ? '-' : i + 1 })
          .replace(/[^1-9.\-]+/g, '-')
          .replace(/-+$/, '')
      }

      return function () {
        var callCx = cx || this
        var callArgs = isSkipFirst ? args.concat(_.rest(arguments, mask)) : args.concat()

        for (var i = 0; i < mask.length; i++) {
          mask[i] != '-' && callArgs.push(arguments[mask[i] - 1])
        }

        return (isMethod ? callCx[func] : func).apply(callCx, callArgs)
      }
    },

    //#+tag_Utilities
    //* `@Core::deepClone()`@
    //#
    //
    // Returns a version of the argument with recursively-copied arrays and
    // objects so that any modification to either `'obj or the returned value
    // (`'obj's copy) won't affect its counterpart.
    //
    // ` `#deepClone() is used in `@Core.constructor`@ to copy non-shared
    // properties (`#_shareProps). Think of it as of recursively calling
    // `@un:clone`@() or `@jq:extend`@() or using LoDash's `'cloneDeep(). It's
    // deliberately dumb to remain simple and will attempt to copy everything,
    // even built-in classes like `'Date.
    //
    //?`[
    //    var obj = {array: [{sub: 'prop'}]}
    //    var obj2 = obj
    //    var obj3 = Sqimitive.Base.deepClone(obj)
    //
    //    obj2.array.push('new')
    //      // obj.array is now [{sub: 'prop'}, 'new']
    //      // obj3.array is still [{sub: 'prop'}]
    //
    //    delete obj3.array[0].sub
    //      // obj3.array is now [{}]
    //      // obj.array is still [{sub: 'prop'}, 'new']
    // `]
    deepClone: function (obj) {
      // This method has a big impact on performance because it's called in
      // each Sqimitive constructor so we avoid using _'s methods and access
      // standard methods directly (saving 10% of time on each access).
      if (typeof obj == 'object' && obj != null) {
        if (Array.isArray(obj)) {
          obj = obj.map(Core.deepClone)
        } else {
          obj = objectAssign({}, obj)
          for (var prop in obj) {
            obj[prop] = Core.deepClone(obj[prop])
          }
        }
      }

      return obj
    },

    // Extracts portions of the given event identifier as recognized by `#on().
    //
    // Returns an object with keys: `'prefix (like `[+`], see `#evtpf), `'args
    // (trailing `[_`]) and `'name (everything else).
    //
    // Errors if `'str doesn't look like a proper event reference.
    //
    //?`[
    //    Sqimitive.Core.parseEvent('foo.bar')
    //      //=> {prefix: '', name: 'foo.bar', args: ''}
    //
    //    Sqimitive.Core.parseEvent('-foo.bar___')
    //      //=> {prefix: '-', name: 'foo.bar', args: '___'}
    // `]
    parseEvent: function (str) {
      // Colons were reserved for use instead of '_' in 'change_OPT' but turned
      // out to be troublesome to declare since you'd have to quote them.
      // They're no longer used but perhaps will find another use in the
      // future.
      //
      // Dots are used in _forward'ed event names, and we need prefix symbols
      // (+-=) in the middle of event name for the same reason: '.-change'.
      var match = str.match(/^([+\-=]?)([\w\d.:+\-=]+?)(_*)$/)
      if (!match) { throw new SyntaxError('Bad event name: ' + str) }
      return {prefix: match[1], name: match[2], args: match[3]}
    },

    //! `, +fna=function ( funcs [, args] )
    //
    // Invokes event handlers in response to firing an event (see instance
    // `#.fire()).
    //
    // `'funcs is an array of event registration objects of an internal format.
    // `#::fire() calls each handler in turn according to its type (such as
    // expecting a fixed number of arguments, accepting current result value,
    // affecting return value, etc. according to `'prefix in `#on(), see
    // `#evtref) while giving it `'args (array).
    //
    // If a handler returns something other than `'undefined and it's eligible
    // for changing return value (as it's the case for `'+event and `'=event,
    // see `#evtpf), then current result is replaced by that handler's return
    // value. Returns the ultimate return value after calling every handler,
    // unless stopped by any `[eobj.post`] callback setting `[eobj.stop`] to
    // `'false (see the example in `#fuse()).
    //
    // Other notes:
    //* This is an internal method and there is no reason to call it directly.
    //* `'funcs can be "falsy", in this case `'undefined is returned.
    //* `'funcs is cloned so it may be changed while `#::fire() is running
    //  (e.g. a handler may be removed thanks to `#once()) without affecting
    //  its outcome.
    //
    //?`[
    //   var funcs = [
    //     // The event object (eobj) stored within sqim._events:
    //     {func: function () { ... }, cx: window, res: true}
    //   ]
    //   var res = Sqimitive.Core.fire(funcs, [5, 'foo'])
    //     // same as: var res = func.call(window, 5, 'foo')
    // `]
    fire: function (funcs, args) {
      var res

      // No funcs (not even an array) can be e.g. when calling change_XXX.
      if (funcs) {
        if (!args) { args = [] }

        // Cloning function list because it might change from the outside (e.g.
        // when a handler is removed from the same event as it's being fired;
        // may happen when once() is used).
        _.find(funcs.concat(), function (eobj) {
          if (eobj.args != null && eobj.args != args.length) {
            var thisRes = eobj.sup ? eobj.sup(eobj.cx || this, args) : undefined
          } else {
            if (!eobj.sup && !eobj.res) {
              var thisArgs = args
            } else {
              var thisArgs = Array.prototype.slice.call(args)
              eobj.sup && thisArgs.unshift(eobj.sup)
              eobj.res && thisArgs.unshift(res)
            }

            // A benchmark avoiding Function's apply() was done on Chrome,
            // instead using a direct call construct from EventEmitter3:
            // switch (args.len) {  case 0: f();  case 1: f(args[0]);  ... }
            // It made no differences at all in performance.
            var thisRes = eobj.func.apply(eobj.cx || this, thisArgs)
          }

          if (eobj.ret && thisRes !== undefined) {
            res = thisRes
          }

          if (eobj.post) {
            eobj.stop = false
            // Attention: args may be an array-like object (often an
            // Arguments), not a real array.
            res = eobj.post.call(eobj.cx || this, eobj, res, args)
            // eobj could be modified by post, including unsetting post.
            if (eobj.stop) { return true }
          }
        }, this)
      }

      return res
    },

    //#+tag_Utilities
    //* `@Core::toArray()`@
    //#
    //
    // Attempts to cast `'value into a native `'Array object.
    //
    // The `'Arguments object becomes an array, `'Array (`[Array.isArray()`])
    // is returned as is while anything else is wrapped into an array to become
    // its sole member. This means that `'false, `'null and `'undefined all
    // result in `[[value]`], not in `[[]`].
    //
    //?`[
    //   ;(function () {
    //     Sqimitive.Core.toArray(arguments)   //=> [5, 'foo']
    //   })(5, 'foo')
    //
    //   Sqimitive.Core.toArray([5, 'foo'])    //=> [5, 'foo']
    //   Sqimitive.Core.toArray(5)             //=> [5]
    //   Sqimitive.Core.toArray()              //=> [undefined]
    // `]
    //
    // Note: `#toArray() does not clone the result:
    //[
    //   var a = [5]
    //   Sqimitive.Core.toArray(a).push('foo')
    //     // a is now [5, 'foo']
    //]
    toArray: function (value) {
      if (_.isArguments(value)) {
        return Array.prototype.slice.call(value)
      } else if (!Array.isArray(value)) {
        return [value]
      } else {
        return value
      }
    },
  })

  //! +clst=0
  // Instance fields of Sqimitive.Core.
  _.extend(Core.prototype, {
    //#-readOnly
    //
    // An identifier of this object. Unique among all instances of
    // `[Sqimitive.Core`] or its subclasses created during this session (page
    // load).
    //
    // Currently begins with "p" for "primitive" followed by a positive number
    // as generated by `#unique(). This is unlikely to change but in any case
    // it's guaranteed to remain a valid identifier of only Latin symbols, i.e.
    // begin with a letter followed by zero or more letters, digits and
    // underscores.
    //
    // Can be used to namespace DOM events as in `[this.el.on('click.' +
    // this._cid)`] (`@jQuery.attach()`@ does this).
    //
    // Historically "cid" stands for "`[c`]lient `[id`]entifier" - a term
    // originating from Backbone (`@bb:Model-cid`@) but probably not holding
    // much meaning at this point.
    //
    //?`[
    //   ;(new Sqimitive.Core)._cid      //=> 'p1'
    //   ;(new Sqimitive.Base)._cid      //=> 'p2'
    //   ;(new Sqimitive.Core)._cid      //=> 'p3'
    //   ;(new Sqimitive.jQuery)._cid    //=> 'p4'
    // `]
    _cid: '',

    //events: {},
    //
    //! +prop=events
    //
    //#+tag_Events
    //* `@Core.events`@
    //#
    //
    // There is no such property per se but this key can be passed to
    // `#extend() and `#mixIn() to set up new event handlers of a "subclass".
    //
    // Giving `'events is the same as calling `[this.on({events})`] after
    // `#extend()/`#mixIn() so see `#on() (with an object argument) for
    // details.
    //
    // Since in Sqimitive everything is an event (`#evt) this is the way you do
    // inheritance, override methods, etc. Such events are "fused" into the new
    // class declaration so there is no overhead of applying them on each class
    // instantiation.
    //
    // See the Events overview (`#evt) for examples.
    //
    //#-es6thiswarn
    //
    // P.S: again, `'events is private to `#extend()/`#mixIn() and does not
    // become `[this.events`].

    //! +ig
    // Holds registered event handlers of this instance.
    //
    //= object {event: [eobj, eobj, ...]}
    //
    // `'eobj format (used by `#::fire() and others):
    //[
    //   eventObj = {
    //      event: 'evtname', func: Function, [cx: obj|null]
    //      args: int|null,
    //      [ id: 'evtname/123' ]
    //      [ supList: Array, sup: Function|undefined - but not null ]
    //      [ res: true, ] [ ret: true ]
    //      [ post: Function ]
    //   }
    //]
    //
    // Note that `'_events includes both `#fuse()d and dynamic events (fused
    // are produced when `#extend()ing a class so that subclass' event handlers
    // cannot be removed on run-time). It's not advised to deal with this
    // object directly - instead use `#on(), `#once(), `#off(), `#fire(),
    // `#fuse(), `#_forward(), etc.
    //
    // Keys of `'_events are event names without any prefixes or suffixes
    // ("render", "remove" and so on - the `'event in `#evtref), values -
    // arrays of event registration objects of an internal structure (study
    // comments in the source code for details). These value arrays are given
    // to `#::fire() when an event occurs.
    _events: {},

    //! +ig
    // Holds event handlers indexed by ID for quick access. Doesn't contain
    // hardwired (`#fuse()d) handlers. Values are references to those in
    // `#_event, not copies.
    //= object {id: eobj}
    _eventsByID: {},

    //! +ig
    // Holds event handlers indexed by their context (`'cx) for quick access.
    // Similar to `#_eventsByID.
    //= array [ [cx, eobj, eobj, ...] ]
    _eventsByCx: [],

    //! +ig
    // Used to track all sqimitives that this instance has event listeners for.
    // See `#autoOff() for details.
    //
    // When `[autoOff(sqim)`] is called to keep track of `'sqim object to which
    // `'this object has attached an event listener, such `'sqim object is put
    // into the `#_autoOff array. You can then call `[this.autoOff()`] in
    // `#unnest() or in another place to sever all connections between an
    // object that is about to go away and those still in the world of living.
    _autoOff: [],

    //! +ig
    // If non-`'null then this instance is logging all event calls by hooking
    // the `'all event and this value is that `'all's event handler's ID
    // suitable for `#off().
    _logEventID: null,

    //#+tag_Extension
    //* `@Core.mixIn()`@
    //#
    //
    // Extends this object instance with a behaviour of another "class" (a
    // "mix-in").
    //
    // The static `#::mixIn() exists which affects all objects of a class.
    //
    //#mixInDesc
    //
    //> this `- The object receiving new "mixed-in" fields (for static
    //  `#::mixIn() `'this is the "child" class).
    //> options `- An arbitrary value (usually an object) given to
    //  `'newClass.`'finishMixIn(), allowing creation of parametrized mix-ins
    //  (basically, generics).
    //> newClass object `- The mix-in, the object "mixed into" `'this.
    //
    // Possible `'newClass keys:
    //
    //> staticProps object `- static fields made available as
    //  `[newClass.something`]
    //> events object `- event listeners (see `#events)
    //
    //  Because this is not a real field, keys in `[newClass.events`] do not
    //  override keys in `[this.events`]. If both `'this and `'newClass have
    //  the `'foo event key (i.e. if both listen to this event) then two
    //  listeners are set up, not one. Compare with `@Base.elEvents`@
    //  overriding (`#elEventsMixIn).
    //
    //> finishMixIn function `- called before returning
    //
    //  `'this = `'newClass. arguments = `[child, options`] where `'child is
    //  the prototype of the updated class
    //
    //> mixIns array `- each item is either a mixed-in class or an array:
    //  `[[class, options]`]
    //
    //> * `- other keys represent instance fields (the `'protoProps argument of
    //  `#extend())
    //
    //  ` `#_mergeProps is respected, but of `'this (not of `'newClass).
    //
    //  A string form of `#_childClass is only allowed in `#extend(), not
    //  here; other forms (array, object) are allowed in both places.
    //
    //?`[
    //   var MixIn = {
    //     staticProps: {
    //       staticMethod: function () { ... },
    //     },
    //     events: {
    //       '-init': function () {
    //         // (1) Define a property only if it's not defined yet.
    //         this._someProp = this._someProp || 'buzz'
    //       },
    //     },
    //     finishMixIn: function (targetProto) {
    //       alert("I'm now mixed into " + targetProto.toString())
    //
    //       // (2) Or could do it here, more performance-efficient since ran
    //       // only once for each mixed-in class, not once for each such class
    //       // instantiation:
    //       //targetProto._someProp = targetProto._someProp || 'buzz'
    //       //targetProto.constructor.someStatic = 123
    //     },
    //     _opt: {
    //       correctly: 'merged',
    //     },
    //     instanceMethod: function () { ... },
    //   }
    //
    //   var Base1 = Sqimitive.Base.extend({})
    //
    //   var Base2 = Sqimitive.Base.extend({
    //     _opt: {
    //      a: 'base',
    //    },
    //     // Not overridden by MixIn.
    //     _someProp: 123,
    //   })
    //
    //   Base1.mixIn(MixIn)   // alerts
    //     //=> _someProp = 'buzz'
    //     //=> opt = {correctly: 'merged'}
    //
    //   Base2.mixIn(MixIn)   // alerts again
    //     //=> _someProp = 123
    //     //=> opt = {a: 'base', correctly: 'merged'}
    //]
    //
    // ` `*Warning:`* `'this is modified in-place; no new class is created
    // (`'mixIn() returns no value). If you want a base class without a given
    // mix-in and a subclass with that mix-in - first `#extend() the base class
    // and then mix into the new sub-class:
    //[
    //   // CORRECT:
    //   var Base = Sqimitive.Base.extend()
    //   var Sub = Base.extend({mixIns: [SomeMixIn]})
    //
    //   // WRONG: will modify Base, not return a new subclass:
    //   var Base = Sqimitive.Base.extend()
    //   var Sub = Base.mixIn(SomeMixIn)
    //]
    //
    // Other notes:
    //
    //* `#mixIn() is doing most of `#extend()'s job, which is just creating a
    //  special form of a mix-in.
    //##mixInDoes
    //* `#mixIn() applies "sub mix-ins" (calls `'mixIn() if `'newClass contains
    //  the `'mixIns key; this is recursive), overwrites fields of `'this with
    //  ones from `'newClass (or merges according to `#_mergeProps), adds
    //  `'staticProps, hardwires events into class definition (`#fuse()) and
    //  calls `'finishMixIn().
    //##
    //* Not to be confused with Underscore's `@un:mixin()`@. However, LoDash's
    //  `'mixin() is of a similar purpose.
    //
    //##elEventsMixIn Merging of `'elEvents
    //
    // ` `#Base lists `@Base.elEvents`@ in `#_mergeProps so the former are
    // merged but unlike with `[newClass.events`] keys (which can never have a
    // conflict and be dropped), keys in `'elEvents get overridden on name
    // collisions. This is sometimes desirable (to override the parent's
    // handler), sometimes not (then use a unique `[.ns`] suffix):
    //[
    //   var Base = Sqimitive.Base.extend({
    //     elEvents: {
    //       click: function () { alert("Click-click-click!') },
    //     },
    //   })
    //
    //   var ChildA = Base.extend({
    //     elEvents: {
    //       click: function () { alert("Overridden!') },
    //     },
    //   })
    //
    //   var ChildB = Base.extend({
    //     elEvents: {
    //       'click.new-in-child-B': function () { alert("Combined!') },
    //     },
    //   })
    //
    //   // in ChildA, 'click' has 1 listener (Base's dropped)
    //   // in ChildB, 'click' has 2 listeners (Base's and ChildB's)
    //]
    //
    //## Mix-in inheritance
    //
    // `'mixIns is applied before setting other properties which allows
    // extending mix-ins themselves (later mix-ins override preceding just like
    // with normal inheritance on classes). For example:
    //[
    //   var ParentMixIn = {
    //     someEvent: function () { /* parent */ },
    //   ]
    //
    //   var ChildMixIn = {
    //     mixIns: [ParentMixIn],
    //     events: {
    //       someEvent: function () { /* child */ },
    //     },
    //   }
    //
    //   var myClass = Sqimitive.Base.extend({
    //     mixIns: [ChildMixIn],
    //   })
    //
    //   // myClass had ParentMixIn added, then ChildMixIn, and now has
    //   // 2 listeners on someEvent
    //]
    // `'ParentMixIn could also have the `'mixIns property to specify its own
    // parent.
    //
    // In the above example, the mix-in specified its parent, which is usually
    // intuitive. Still, it could be specified in the final class' `'mixIns
    // alone:
    //[
    //   var ParentMixIn = {
    //     someEvent: function () { /* parent */ },
    //   ]
    //
    //   var ChildMixIn = {
    //     // mixIns property is missing.
    //     events: {
    //       someEvent: function () { /* child */ },
    //     },
    //   }
    //
    //   var myClass = Sqimitive.Base.extend({
    //     // Added ParentMixIn in front of ChildMixIn.
    //     mixIns: [ParentMixIn, ChildMixIn],
    //   })
    //
    //   // or (equivalent, no mixIns property, mixIn() calls instead):
    //   var myClass = Sqimitive.Base.extend()
    //   myClass.mixIn(ParentMixIn)
    //   myClass.mixIn(ChildMixIn)
    //
    //   // or (equivalent for a particular object instance):
    //   var myClass = Sqimitive.Base.extend()
    //   var obj = new myClass
    //   obj.mixIn(ParentMixIn)
    //   obj.mixIn(ChildMixIn)
    //
    //   // in any case, MyClass (or obj) has 'someEvent' firer() with
    //   // 2 listeners: of ParentMixIn and of ChildMixIn
    //]
    //
    // ` `*Warning:`* calling `'mixIn() in `'finishMixIn() would have a
    // different effect. If `'ChildMixIn were defined as follows then `'MyClass
    // or `'obj would have `'someEvent not as a `#firer() but as the
    // `'ParentMixIn's function (because it was mixed-in after `'ChildMixIn and
    // overrode its `'events handler):
    //[
    //   var ChildMixIn = {
    //     finishMixIn: function (newClass) {
    //       newClass.mixIn(ParentMixIn)
    //     },
    //     events: {
    //       someEvent: function () { /* child */ },
    //     },
    //   }
    //]
    //
    // This will override the handler introduced in the declaration of `'Class
    // for the same reason - `'MixIn is added to `'Class after `'Class' own
    // fields:
    //[
    //   var MixIn = {
    //     some: function () { ... },
    //   }
    //
    //   var Class = Sqimitive.Base.extend({
    //     events: {
    //       some: function () { ... },
    //     }
    //   })
    //
    //   Class.mixIn(MixIn)
    //]
    // This is the correct way (using `'mixIns property when `#extend()ing
    // `'Class):
    //[
    //   var MixIn = {
    //     some: function () { ... },
    //   }
    //
    //   var Class = Sqimitive.Base.extend({
    //     mixIns: [MixIn],
    //     events: {
    //       some: function () { ... },
    //     }
    //   })
    //]
    //
    //## Edge cases
    // See the source code for details.
    //* Given a base class `'B and subclass `'C, adding mix-ins to `'B after `'C
    //  has been `#extend()ed from `'B when `'C declares `#events will lead to
    //  `'C not having `#events of the newly mixed-in objects of `'B.
    //* Declaration-time `#events of `'B are `#fuse()d and their `'eobj's are
    //  shared among all subclasses of `'B and should not be changed (list of
    //  events may change, just not properties of inherited handlers): `[
    //    var ClassB = Sqimitive.Core.extend({
    //      events: {change: 'render'},
    //    })
    //
    //    ClassB.prototype._events.change[0].post    //=> undefined
    //
    //    var ClassC = ClassB.extend()
    //    ClassC.prototype._events.change[0].post = function () { ... }
    //    ClassB.prototype._events.change[0].post    //=> Function
    //
    //    // In this version instances' _events are deepClone()'d so changing it
    //    // (not the prototype) doesn't affect other classes/objects:
    //    var obj = new ClassC
    //    obj._events.change[0].post = 'foo'
    //    ClassB.prototype._events.change[0].post    //=> still Function
    //  `]
    mixIn: function (newClass, options) {
      //! +ig=4
      // Don't expose internal inheritance fields on the final classes.
      var merged = {mixIns: undefined, finishMixIn: undefined, staticProps: undefined, events: undefined}

      _.each(newClass.mixIns || [], function (mixIn) {
        // mixIns items are either objects or arrays. concat() ensures mixIn()
        // is called either with (class, options) or (class) alone.
        this.mixIn.apply(this, [].concat(mixIn))
      }, this)

      _.each(this.constructor._mergeProps, function (prop) {
        if ((prop in this) && (prop in newClass)) {
          if (_.isArray(newClass[prop])) {
            merged[prop] = this[prop].concat(newClass[prop])
          } else {
            merged[prop] = _.extend({}, this[prop], newClass[prop])
          }
        }
      }, this)

      _.extend(this, newClass, merged)
      _.extend(this.constructor, newClass.staticProps || {})

      if (newClass.events) {
        // Core has no __super__ but it doesn't use mix-ins either so no check
        // for null. This condition will evaluate to true except when a class
        // has mix-ins (via mixIns property or mixIn() method) - we could clone
        // it in the second case too but this would be a waste.
        //
        // Warning: this operates under assumption that the base class is
        // finalized (all mix-ins applied) before any of its sub-classes is
        // created.
        //
        //   var Base = Sqimitive.extend()
        //   Base.mixIn(...)    // fine
        //   var Child = Base.extend()
        //   Base.mixIn(...)    // wrong
        //
        // Adding mix-ins after Child was declared may have unexpected side
        // effects - if the mix-in adds an event and if Child had its own
        // events block, then Child won't receive new mix-in's events. This is
        // an implementation detail - "officially", adding mix-ins after
        // declaring a subclass leads to undefined behaviour and should never
        // be used.
        if (this._events == this.constructor.__super__._events) {
          //! +ig
          // Could use deepClone but it's more intense - we don't clone eobj's
          // which theoretically could be changed before instantiation but we
          // ignore this possibility.
          this._events = _.extend({}, this._events)

          for (var ev in this._events) {
            this._events[ev] = this._events[ev].concat()
          }
        }

        this.on(newClass.events)
      }

      newClass.finishMixIn && newClass.finishMixIn(this, options)
    },

    //! `, +fna=function ( event [, args] )
    //
    //#+tag_Events
    //* `@Core.fire()`@
    //#
    //
    // Triggers an event giving `'args as parameters to all registered
    // listeners. Returns result of the last called listener that was eligible
    // for changing it.
    //
    // The actual event processing is performed by static `#::fire().
    //
    // It's safe to add/remove new listeners while `#fire() is executing - they
    // will be in effect starting with the next `#fire() call (even if it's
    // nested).
    //
    //#fireOverride
    // ` `*Warning:`* to override `#fire, `#fuse and `#on, don't use the usual
    // `[on('fire')`] as it will lead to recursion (even the `'=fire form,
    // `#evtpf). Use the old-school prototype overriding (`'__super__ is
    // set up by `#extend()) - see `#Async's source code for an example:
    //[
    //   fire: function (event, args) {
    //     // Do your stuff...
    //     return MyClass.__super__.fire.apply(this, arguments)
    //   },
    //]
    //
    //#fireAll The `'all event
    // ` `#fire() first triggers the special `'all event. If `'all's return
    // value is anything but `'undefined - `#fire() returns it bypassing the
    // actual handlers of `'event.
    //
    // `'all's handlers get `'event put in front of other `'args (e.g.
    // `[['eventName', 'arg1', 2, ...]`]).
    //
    // Note that the `'all event is only triggered for actual events so if, for
    // example, `#render() isn't overridden then it will be called as a regular
    // member function without triggering `'all or any other event:
    //[
    //   var ClassA = Sqimitive.Base.extend({
    //     events: {
    //       render: function () { return this },
    //     },
    //   })
    //
    //   ;(new ClassA)
    //     .on({all: () => alert('booh!')})
    //     .render()
    //       // alert() happens, render is a firer
    //
    //   var ClassB = Sqimitive.Base.extend({
    //     render: function () { return this },
    //   })
    //
    //   ;(new ClassB)
    //     .on({all: () => alert('booh!')})
    //     .render()
    //       // no alert(), render of extend() is not an event handler but a
    //       // method
    //
    //   ;(new ClassB)
    //     .on({all: () => alert('booh!')})
    //     .on({render: function () { return this }})
    //     .render()
    //       // alert() happens because of on('render') which converted
    //       // the render function from ClassB's declaration to a
    //       // firer('render') which when called triggers fire('render') which
    //       // in turn triggers 'all'
    //]
    fire: function (event, args) {
      if (this._events.all && event != 'all') {
        var allArgs = arguments.length < 2 ? [] : Core.toArray(args).concat()
        allArgs.unshift(event)
        var res = this.constructor.fire.call(this, this._events.all, allArgs)
        if (res !== undefined) { return res }
      }

      return this.constructor.fire.call(this, this._events[event], args)
    },

    //! `, +fna=function ( event [, args [, self]] )
    //
    // Returns a function that `#fire()s an `'event with arguments of its call.
    //
    // The returned function calls `[fire(event, ...firerArgs, ...givenArgs)`]
    // in context of `'self.
    //
    //> event string `- like `[change_caption`]
    //> args array `- push some parameters in front of the function's arguments
    //  (`'firerArgs)
    //> self object `- if not given then context is unchanged
    //
    //? `#firer() is used by `'on() to "convert" method calls into events
    //  making it unnecessary to directly call `#fire() in most cases (see
    //  `#evt): `[
    //    var MyClass = Sqimitive.Base.extend({
    //      upper: function (s) { return s.toUpperCase() },
    //    })
    //
    //    var obj = new MyClass
    //      // obj.upper is the function given to extend(), not an event
    //    var res = obj.upper('booh!')
    //      //=> 'BOOH!'
    //
    //    obj.on('+upper', () => 'baah!')
    //      // now obj.upper is the result of firer() and yet it's called as if
    //      // it was a regular method
    //    var res = obj.upper('booh!')
    //      //=> 'baah!'
    //    // Same as writing:
    //    var res = obj.fire('upper', ['booh!'])
    //      //=> 'baah!'
    //  `]
    //
    // Essentially, using `#firer() is just a short way of writing:
    //[
    //   (function () { return this.fire(event, args.concat(arguments)) }).bind(self)
    //]
    firer: function (event, args, self) {
      if (arguments.length > 1) {
        args = Core.toArray(args)
        return function () {
          return (self || this).fire(event, args.concat( Array.prototype.slice.call(arguments) ))
        }
      } else {
        return function () {
          return (self || this).fire(event, arguments)
        }
      }
    },

    //! `, +fna=function ( [enable] )
    //
    //#+tag_Events
    //* `@Core.logEvents()`@
    //#
    //
    // A debug method for logging all triggered events to the console.
    //
    // ` `#logEvents() allows enabling event logging as well as acts as an
    // event handler for `'all. The handler can be used on its own, without
    // enabling logging with `[logEvents(true)`].
    //
    //> true `- enable logging; do nothing if browser doesn't provide
    //  `[console.log()`]
    //> - no arguments `- same as `'true (enable logging)
    //> false `- disable logging, if enabled
    //> string event name `- log this event; other arguments are the event's
    //  arguments
    //
    //= this if `'enable is bool`, undefined if string
    //
    //?`[
    //   sqim.logEvents(true)   // enable logging
    //   sqim.logEvents()       // same as above
    //   sqim.logEvents(false)  // disable
    // `]
    //
    // Note: `#logEvents logs only events passing through the instance
    // `#.fire(). This means that only real event calls are tracked, not calls
    // of non-overridden methods (i.e. of regular functions, not `#firer). See
    // `#fireAll.
    //
    //# Extending default logger
    // You can override or extend the default logging behaviour by testing the
    // argument for string:
    //[
    //   var MyLoggee = Sqimitive.Base.extend({
    //     events: {
    //       logEvents: function (event) {
    //         // logEvents() calls itself when an event occurs and the first
    //         // argument is the event name - a string. In other cases it's
    //         // not the logger being called.
    //         if (typeof event == 'string') {
    //           console.log('el.' + this.el[0].className)
    //         }
    //       },
    //     },
    //   })
    //
    //   // Logs both standard logEvents() info and our class name line.
    //   ;(new MyLogger).logEvents().fire('something')
    //]
    //
    // Note: returning non-`'undefined from the `'all handler prevents calling
    // real event handlers (see `#.fire()). In the above example it never
    // happens since `'logEvents event is hooked with no prefix (`#evtpf)
    // meaning the handler's return value is ignored (even if it does return
    // anything). However, not in this example:
    //[
    //   events: {
    //     '=logEvents': function (sup, event) {
    //       if (typeof event == 'string') {
    //         console.log(this.el[0].className)
    //       } else {
    //         sup(this, arguments)
    //       }
    //       return 'break!'
    //         // returning non-undefined from an 'all' handler bypasses
    //         // real event handlers
    //     },
    //   },
    //]
    logEvents: function (enable) {
      if (typeof enable == 'string') {
        // function (event, eventArg1, arg2, ...)
        var info = this._cid

        if (this.el) {
          //! +ig
          var el = this.el.nodeType ? this.el : this.el[0] // jQuery.
          info += '\t\t' + el.tagName
          var className = el.className.trim()

          if (className != '') {
            info += (' ' + className).replace(/\s+/g, '.')
          }
        }

        console.log(enable + ' (' + (arguments.length - 1) + ') on ' + info)
        return undefined
      } else if (!enable && arguments.length) {
        this.off(this._logEventID)
        this._logEventID = null
      } else if (console && console.log && !this._logEventID) {
        this._logEventID = this.on('all', Core.logEvents)
      }

      return this
    },

    //! `, +fna=function ( event(s) [, func] [, cx] )
    //
    //#+tag_Events
    //* `@Core.on()`@
    //#
    //
    // Registers a single event handler and returns its ID or permanently
    // hardwires multiple events and/or handlers.
    //
    //> event string to register one handler and return ID that can be used to
    //  unregister it with `#off()`, object to `#fuse() one or multiple
    //  handlers and return `'this `- Object keys are event references
    //  (`#evtref), values are handlers.
    //
    //  Keys can contain multiple event references separated with `[, `] -
    //  this is identical to multiple `#on() calls but shorter. Note: a space
    //  after the comma is mandatory (unlike with jQuery selector)s
    //
    //#onOnce
    //> cx object`, null/omitted use `'this `- Context in which the handler(s)
    //  are called. `'this is the object on which `#on() was called so
    //  `[on('e', 'h')`] will call `'h() on the object where the event occurs
    //  (and in that object's context).
    //
    // The handler (`'func or `'event object value) can be either a (masked)
    // method reference (see `#expandFunc()) or function. Strings are resolved
    // when the event is fired so their handlers are always up-to-date and
    // don't even have to exist by the time `#on() is called.
    //
    // Errors if an event reference can't be parsed.
    //
    //#
    //
    //? Object form - `[on( {events} [, cx] )`]:
    //  `[
    //     sqim.on({'-get_, nest': 'render'})
    //       //=> this (handlers cannot be unbound)
    //       // call render() on sqim when get() and nest() happen
    //
    //     // WRONG: no space, seen as a single event name "get_,nest":
    //     sqim.on({'-get_,nest': 'render'})
    //  `]
    //
    //   String form - `[on( 'event', func [, cx] )`]:
    //   `[
    //     var id = sqim.on('change', this.render, this)
    //       //=> 'change/2'
    //       // handler called in a different context (this, not sqim)
    //     sqim.off(id)
    //
    //     // WRONG: comma notation only accepted by on({events}):
    //     sqim.on('change, nest', this.render, this)
    //   `]
    //
    //? Object-`'event form is used behind the scenes when `#extend()ing or
    //  `#mixIn() a class and supplying the `'events key in `'protoProps,
    //  therefore `#events format is exactly the `'events argument of `#on().
    //
    //  Warning: when giving `#extend() or `#mixIn() a method (as a property,
    //  not as an `'events member) which name is already used for an event it
    //  will conceal existing handlers and generally misbehave - see `#evtconc.
    //
    //  Warning: this semantics does not apply to `@Base.elEvents`@!
    //
    //  `[
    //     var MyClass = Sqimitive.Base.extend({
    //       events: {
    //         // Calls render() after 'name' option change and before
    //         // 'birthday' change.
    //         'change_name, -change_birthday': 'render',
    //
    //         // Calls fadeOut() when 'close' gets fired.
    //         close: function () {
    //           this.el.fadeOut(_.bind(this.remove, this))
    //         },
    //       },
    //     })
    //
    //     obj.set('name', 'miku')   // render() called
    //     obj.close()               // fadeOut() called
    //  `]
    //
    //#-fireOverride
    //
    // Other notes:
    //* To register one-time handlers use `#once() instead of `#on() + `#off().
    //* `#on() with an object `'event is like `#fuse() but with added comma
    //  notation in `'event keys.
    //* Fusing is a bit more efficient since no tracking information about
    //  handlers is stored. If your handler is meant to stay with the object
    //  for its lifetime - use `[on({event: func}, cx)`] or `#fuse() (this also
    //  clearly conveys your intention).
    //
    //#evtref Event reference format
    // An event reference is a string with 3 parts: `[[prefix]event[args]`].
    //
    //> prefix `- Optional; changes the way event handler is bound and called
    //  as explained in `#evtpf
    //> event `- Event name (alphanumeric symbols, dots and colons) - exactly
    //  what is given to `#fire() when triggering an event.
    //> args `- Zero or more underscores (`'_); if present, the handler gets
    //  called only if `'event was given that exact number of arguments (it's
    //  not possible to match zero arguments).
    //
    //  For example, `'eve__ registers a handler that is called for
    //  `[fire('eve', [1, 2])`] but is not called for `[fire('eve', [1])`] or
    //  `[fire('eve', [1, 2, 3])`].
    //
    //  In case of `'=event (overriding handler), if argument count differs
    //  then all handlers superseded by this one get called while the
    //  superseding handler itself is not called (as if the superseding handler
    //  was just `[return sup(this, arguments)`]).
    //
    //  Generally, usage of `'args is frowned upon because of its unintuitive
    //  nature - see `#argDanger.
    //
    //##evtpf Event prefixes
    //
    //> none  evArgs... `- Add new handler `*after`* existing handlers.
    //  It neither receives the current event result nor it can change it (the
    //  handler's return value is ignored). This form is used most often and
    //  it's perfect for "attaching" extra behaviour to the end of the original
    //  code, retaining the original result.
    //> -     evArgs... `- Add new handler `*before`* existing handlers,
    //  otherwise identical to "no prefix".
    //> +     `*res`*, evArgs... `- Add new handler after existing handlers.
    //  It receives the current `*event return value`* (`'res) and can change
    //  it if the handler returns anything but `'undefined.
    //> =     `*sup`*, evArgs... `- `*Wrap around`* existing handlers - they
    //  are removed. It receives a callable `'sup of form `[function (this,
    //  args)`] which it may call or not (alike to calling `'super in Java).
    //
    //  First argument of `'sup is the context (normally the object that
    //  initiated the event, i.e. the handler's own `'this). Second argument is
    //  an array of arguments the overridden handlers receive. The handler may
    //  change these arguments to trick the underlying (wrapped) handlers into
    //  believing the event received a different set of data or it can pass the
    //  `'arguments object that the handler itself has received - in this case
    //  `[args[0]`] (which is `'sup) is removed and the rest is given to the
    //  underlying handlers.
    //
    //  `? `[
    //       '=someEvent': function (sup, a1, a2) {
    //         // Passes original context and arguments unchanged.
    //         return sup(this, arguments)
    //         // Identical to above but longer - sup() removes itself from the
    //         // first argument.
    //         return sup(this, _.rest(arguments))
    //         // Not identical to above - if event was given >2 arguments they
    //         // will be omitted here but passed as is by above.
    //         return sup(this, [a1, a2])
    //         // Changes first argument and omits 3rd and other arguments (if
    //         // given).
    //         return sup(this, [1, a2])
    //         // Gives no arguments at all to the underlying handlers.
    //         return sup(this)
    //       },
    //     `]
    //
    //  Note: old handlers are not technically "removed" - they are kept around
    //  and restored if the `'=wrapping handler is removed so treat this prefix
    //  like any other. It can be even used with `#once():
    //  `[
    //    sqim.once('=update', function () { alert('Holding tight!') })
    //    sqim.update()   // alerts
    //
    //    // Old 'update' handlers are now restored.
    //
    //    sqim.update()   // no more alerts
    //  `]
    //
    //   This works even if more handlers were added to the event after
    //   wrapping:
    //   `[
    //    sqim.on('-update', ...)
    //      // 1 handler
    //    var id = sqim.on('=update', ...)
    //      // 1 handler - '-update' superseded
    //    sqim.on('update', ...)
    //      // 2 handler2: ['=update', 'update']
    //    sqim.off(id)
    //      // 2 handler2: ['-update', 'update'] - '=update' removed
    //   `]
    //
    //#argDanger The danger of ev__
    //
    // In JavaScript, functions accept extra arguments with ease; often you
    // would provide an iterator and only care for some of its arguments.
    // However, if using the `'ev__ form (underscores are the `'args part of
    // `#evtref) then the event must have been given that `*exact`* number of
    // arguments even if none of its handlers uses the rest:
    //[
    //   var MySqimitive = Sqimitive.Base.extend({
    //     accessor: function (prop, value) {
    //       if (arguments.length == 1) {
    //         return this._foo[prop]
    //       } else {
    //         this._foo[prop] = value
    //         return value
    //       }
    //     },
    //   })
    //
    //   var sqim = new MySqimitive
    //   // This handler should always be called when a property is being
    //   // set... right?
    //   sqim.on('accessor__', function (prop, value) {
    //     alert('Now ' + prop + ' is ' + value)
    //   })
    //
    //   // Alerts "Now name is val". So far so good.
    //   sqim.accessor('name', 'val')
    //
    //   var propsToSet = {prop: 'foo', bar: 123}
    //   // map() calls sqim.accessor() for every key in propsToSet and
    //   // properties are indeed properly set - but no alerts appear! This is
    //   // because map() passes 3 arguments to the iterator: value, key and
    //   // the list itself (object in our case). Therefore even if accessor()
    //   // uses just 2 of these arguments (like it does above) the actual
    //   // event fired is "accessor___" (3 underscores), not "accessor__" (the
    //   // one we've hooked).
    //   _.map(_.invert(propsToSet), sqim.accessor, sqim)
    //]
    on: function (event, func, cx) {
      if (event instanceof Object) {
        for (var name in event) {
          var names = name.split(', ')
          for (var i = 0, l = names.length; i < l; ++i) {
            this.fuse(names[i], event[name], func)
          }
        }
        return this
      } else if (arguments.length >= 2) {
        return this._regHandler( this.fuse(event, func, cx) )
      } else {
        throw new TypeError('on: Bad arguments')
      }
    },

    //! `, +fna=function ( event, func[, cx] )
    //
    //#+tag_Events
    //* `@Core.once()`@
    //#
    //
    // Regsiters a single one-shot event handler that removes itself after
    // being called exactly once.
    //
    // In all other aspects `#once() is identical to `#on() with the string
    // argument, i.e. `[on(event, func, cx)`]. Returns new event ID suitable
    // for `#off() so you can unregister it before it's called (or after,
    // nothing will happen). Doesn't allow registering multiple
    // events/handlers.
    //
    //?`[
    //   sqim.once('change', function () { ... }, this)
    //   sqim.once('=render', function () { /* skip one next render() call */ })
    // `]
    //
    //#-onOnce
    once: function (event, func, cx) {
      if (arguments.length >= 2) {
        var id = this.on(event, function () {
          if (id) {
            this.off(id)
            id = null
            return Core.expandFunc(func, this).apply(cx || this, arguments)
          }
        })

        return id
      } else {
        throw new TypeError('once: Bad arguments')
      }
    },

    //! `, +fna=function ( [sqim [, events [, cx]]] )
    //
    //#+tag_Events
    //* `@Core.autoOff()`@
    //#
    //
    // A utility method for tracking object connections.
    //
    // If any arguments are given, adds `'sqim (object) to this object's list
    // of tracked objects (`'_autoOff). This list is not used by Sqimitive but
    // your application can use it to unbind all listeners added by this object
    // to other objects in one go. For example, you can do `[this.autoOff()`]
    // when `'this is about to be destroyed so that events on other objects to
    // which `'this had any connections won't trigger its handlers. Returns
    // `'sqim.
    //
    // `'events, if given, is an object in `#on() format (keys are
    // comma-separated event references and values are their handlers -
    // `#expandFunc()). With `'events, `'cx sets the context in which handlers
    // will be called. If `'cx is `'null then `'sqim is used, if no `'cx
    // argument is given then `'this is used (i.e. the object on which
    // `'autoOff() was called).
    //
    // Giving `'sqim without `'events only tracks the object without hooking
    // any events.
    //
    // If `*no arguments`* are given, calls `[off(this)`] on all tracked
    // objects to remove listeners of `'this and clears the list. Similar to
    // doing `[_.invoke(this._autoOff, 'off', this)`]. Returns `'this.
    //
    // Other notes:
    //* One object can be tracked several times without causing problems.
    //#-chevaoff
    //
    //?`[
    //   this.autoOff(sqim)
    //
    //   // Track sqim and hook sqim.remove (calls this.remove):
    //   this.autoOff(sqim, {remove: this.remove})
    //
    //   // Track and hook 2 events (both call sqim.render - not this.render!):
    //   this.autoOff(sqim, {'change_foo, change_bar': 'render'}, null)
    //
    //   // Unbind this instance's events from all sqimitives previously
    //   // enlisted by this.autoOff(sqim) and clear the track list:
    //   this.autoOff()
    // `]
    //
    //? Canonical usage:
    //  `[
    //   var MyNotifyBar = Sqimitive.Base.extend({
    //     events: {
    //       owned: function () {
    //         this.autoOff(new View.LoginForm, {
    //           loggedIn: function () { alert('Hi there!') },
    //           '-multiple, events': ...,
    //         })
    //       },
    //
    //       // WRONG: if unnest() is called with any arguments
    //       // (for whatever the reason) then autoOff()'s behaviour would
    //       // change and it will not untrack objects. See the note on ev__
    //       // danger in on().
    //       //'-unnest': 'autoOff',
    //
    //       // WRONG: ES6 'this' is bound to whatever context is calling
    //       // extend(), see #es6this:
    //       '-unnest': () => this.autoOff(),
    //
    //       // CORRECT:
    //       '-unnest': function () {
    //         this.autoOff()
    //       },
    //
    //       // CORRECT: masked version:
    //       '-unnest': 'autoOff-',
    //     },
    //   })
    //  `]
    //
    // As a general rule, `#autoOff() is not used for permanently connected
    // objects, i.e. ones that are destroyed at the same time as `'this. Such
    // objects are typically set to "_protected" properties and `#init'ialized
    // during construction:
    //[
    //   var MyGame = Sqimitive.Base.extend({
    //    // Created together with MyGame and only referenced by MyGame:
    //     _timer: null,
    //
    //     events: {
    //       init: function () {
    //         this._timer = new MyTimer({interval: 1000})
    //         this._timer.on({expired:  () => alert("Time's up!")})
    //           // on() instead of autoOff({expired: ...})
    //       },
    //     },
    //   })
    //]
    autoOff: function (sqim, events, cx) {
      if (arguments.length < 1) {
        var list = this._autoOff
        this._autoOff = []
        _.invoke(list, 'off', this)
        return this
      } else {
        this._autoOff.push(sqim)
        arguments.length > 2 || (cx = this)

        // on({event: map}) would fuse the handlers. autoOff() only mimicks
        // {event} format since it's meant for binding "unbindable" hooks.
        for (var name in events) {
          var names = name.split(', ')
          for (var i = 0, l = names.length; i < l; ++i) {
            sqim.on(names[i], events[name], cx)
          }
        }

        return sqim
      }
    },

    //! `, +fna=function ( event, func[, cx] )
    //
    //#+tag_Events
    //* `@Core.fuse()`@
    //#
    //
    // Registers a single permanent event handler.
    //
    // Unlike with `#on() and `#once(), this handler cannot be removed with
    // `#off().
    //
    //> event string `- a single event reference (no comma notation)
    //> func function`, string `- masked method name (`#expandFunc())
    //> cx object`, null/omitted use `'this `- context in which `'func is
    //  called
    //
    //= object `- an internal event registration object (`'eobj) that should be
    //  discarded
    //
    // ` `#fuse() is a low-level method. You are advised to call `#on({event})
    // instead.
    //
    //?`[
    //   sqim.on({
    //     something: function () { ... },
    //     someone: function () { ... },
    //   })
    //
    //   // Identical to the above:
    //   sqim.fuse('something', function () { ... })
    //   sqim.fuse('someone', function () { ... })
    //
    //   // A masked callback - receives (a1, a2, a3), passes (a3, a1, a1, a1)
    //   // to sqim.meth().
    //   sqim.fuse('somewhere', 'meth-3111', sqim)
    // `]
    //
    // One case when you may use `'eobj is to assign the `'post key (this is
    // considered advanced usage). If set to a function, `#::fire() calls
    // `[post(eobj, res, args)`] after executing the handler within the
    // handler's `'cx; `'post must return the new result (replaces `'res in any
    // case, regardless of `#evtpf). `'args is the event's arguments, an
    // array-like object (possibly `'Arguments). If `'post sets `[eobj.stop`]
    // to `'true then remaining handlers are skipped.
    //
    //?  See the source code of `@Sqimitive\Async`@ for a practical example.
    //
    //  `[
    //    var sqim = new Sqimitive.Base
    //
    //    sqim.on('+event', function () {
    //      console.log(1)
    //      return 'test'
    //    })
    //
    //    var eobj = sqim.fuse('event', function () {
    //      console.log(2)
    //    }, this)
    //
    //    eobj.post = function (eobj, res, args) {
    //      console.log(3)
    //      eobj.stop = true
    //      return res.toUpperCase()    // res is 'test', args is []
    //    }
    //
    //    sqim.on('event', function () {
    //      console.log(4)
    //    })
    //
    //    sqim.fire('event')      //=> 'TEST'
    //      // console logs: 1, 2, 3 but not 4
    //  `]
    //
    //#-fireOverride
    fuse: function (event, func, cx) {
      func = Core.expandFunc(func)
      event = Core.parseEvent(event)
      // Don't just _events[name] or name in _events because if name is
      // toString or other Object.prototype member, this will fail (array won't
      // be created since 'toString' in _events).
      var list = hasOwn.call(this._events, event.name)
        ? this._events[event.name] : (this._events[event.name] = [])
      this._wrapHandler(event.name)
      var eobj = {func: func, cx: cx, event: event.name}
      eobj.args = event.args.length || null

      if (event.prefix == '+') {
        eobj.res = eobj.ret = true
      } else if (event.prefix == '=') {
        eobj.ret = true
        eobj.supList = list.splice(0, list.length)

        // function (this, arguments)
        //    sup() itself is removed if present as arguments[0].
        var sup = eobj.sup = function (self, args) {
          if (_.isArguments(args) && args[0] === sup) {
            args = Array.prototype.slice.call(args, 1)
          }

          return self.constructor.fire.call(self, eobj.supList, args)
        }
      }

      event.prefix == '-' ? list.unshift(eobj) : list.push(eobj)

      // A benchmark with optimized event handlers was done on Chrome: it was
      // discovered that in a certain application 60% of fire() calls were on
      // events with 1 handler so I made it bypass fire() if there were no
      // handlers (replaced the wrapped method, firer() with stub) or 1 handler
      // (replaced with direct call to it); this was also maintained on event
      // handler changes (on()/off()).
      //
      // However, performance savings from this optimization were ~5% (on 30k
      // fire() calls) while the added complexity was significant (due to
      // different eobj properties like cx and post which implementation needed
      // to be duplicated in both fire() and the fire()-less wrapper) so it was
      // discarded.

      return eobj
    },

    //! +ig
    // Replaces field on this instance with name matching event by a function
    // that when called triggers event handlers of that event. Does nothing if
    // the field is already a firer or if it's not a function.
    _wrapHandler: function (event) {
      if (this[event] === Core.stub) {
        // Continue - overwrite.
      } else if (typeof this[event] == 'function' && !this[event]._wrapHandler) {
        //! +ig=2
        // Register original method (function) as the first event handler.
        this._events[event].unshift( {func: this[event], ret: true} )
      } else if (event in this) {
        return
      }

      this[event] = this.firer(event)
      this[event]._wrapHandler = event
    },

    //! +ig
    // Registers event object in index objects so that this handler can be
    // unregistered later with off(). Generates unique handler ID and returns
    // it.
    _regHandler: function (eobj) {
      var id = eobj.id = eobj.event + '/' + Core.unique('e')
      this._eventsByID[id] = eobj

      if (eobj.cx) {
        this._cxHandlers(eobj.cx, function (list) { list.push(eobj) })
          || this._eventsByCx.push([eobj.cx, eobj])
      }

      return id
    },

    //! +ig
    // Finds a list of event handlers corresponding to given context object
    // (the value of cx given to on() or fuse()) and calls func as function
    // (eobjList, indexIn_eventsByCx).
    //
    // Returns a truthy value if found any handlers of cx or falsy otherwise.
    _cxHandlers: function (cx, func) {
      if (cx) {
        for (var i = 0, l = this._eventsByCx.length; i < l; ++i) {
          if (this._eventsByCx[i][0] === cx) {
            return func.call(this, this._eventsByCx[i], i) || true
          }
        }
      }
    },

    //#+tag_Events
    //* `@Core.off()`@
    //#
    //
    // Removes non-`#fuse()d event listener(s).
    //
    //= this
    //
    // `'key can be one of:
    //> string event name `- like "render"; removes all listeners to that event
    //> string listener ID `- as returned by `#on(); removes that particular
    //  listener from that particular event
    //> object context `- the `'cx to which listeners were registered; removes
    //  all listeners to all events with that context
    //> array `- containing any of the above values including more sub-arrays;
    //  identical to multiple `#off() calls
    //
    // Does nothing if no matching  events, contexts or listeners were found
    // (thus safe to call multiple times).
    //
    // When unregistering a wrapping handler (`'=event, see `#evtpf) its
    // underlying handlers are put in place of the wrapper in the list of
    // handlers ("undoing" method override).
    //
    // See `#evt for a nice example on this subject and `#once() for attaching
    // one-shot listeners.
    //
    //?`[
    //   // key = 'evtname' | 'id/123' | {cx} | [key, key, ...]
    //
    //   var id = sqim.on('=superseded', function () { ... }, this)
    //   sqim.off(id)
    //   sqim.off('superseded')
    //   sqim.off(this)
    //
    //   // Just like the above 3 calls:
    //   sqim.off([id, 'superseded', this])
    // `]
    off: function (key) {
      if (arguments.length < 1) { throw new TypeError('off: Bad arguments') }

      if (_.isArray(key)) {
        // List of identifiers of some kind.
        _.each(key, this.off, this)
      } else if (key instanceof Object) {
        // By context.
        this._cxHandlers(key, function (list, i) {
          _.each(this._eventsByCx.splice(i, 1)[0].slice(1), this._unregHandler, this)
        })
      } else if (key.indexOf('/') == -1) {
        // By event name.
        _.each(this._events[key] || [], this._unregHandler, this)
      } else {
        // By handler ID.
        this._unregHandler( this._eventsByID[key] )
      }

      return this
    },

    //! +ig
    // Removes event handler from this instance, if registered. Cleans up all
    // indexes.
    _unregHandler: function (eobj) {
      if (eobj && eobj.id) {
        delete this._eventsByID[eobj.id]
        eobj.func = Core.stub   // in case it's used in some sup list.

        this._cxHandlers(eobj.cx, function (list, i) {
          list.splice(list.indexOf(eobj), 1)
          list.length || this._eventsByCx.splice(i, 1)
        })

        var handlers = this._events[eobj.event] || []
        var index = handlers.indexOf(eobj)
        if (index >= 0) {
          var args = [index, 1]
            .concat(_.filter(eobj.supList || [], function (eobj) {
              return eobj.func !== Core.stub
            }))

          handlers.splice.apply(handlers, args)
        }
      }
    },
  })

  /***
    Sqimitive.Base - The Actual Building Block
   ***/

  // Instance fields of Sqimitive.Base.

  // Implements what makes Sqimitive `*the`* Sqimitive - options (`#opt),
  // children (`#chld) and filtering (`#util) on top of `#Core, which provides
  // the fundamental event framework (`#evt).
  //
  // If you work with DOM then look for `@Sqimitive\jQuery`@, which adds `#el
  // and `#elEvents. If you want ordered children - use the
  // `@Sqimitive\Ordered`@ `#mixIn.
  //
  //?
  //  It's good practice to extend this class just once in your application and
  //  use the new base class everywhere else:
  //  `* If Sqimitive's class hierarchy or your needs change, you'd have to
  //     change just one reference to `#Base.
  //  `* You're likely to implement some application-specific application-wise
  //     logic sooner or later (such as logging) and it's easily done if you
  //     have just one base class (of course, you should not ever change
  //     Sqimitive's own prototypes).
  //  `[
  //     var MyApp = {
  //       VERSION: '0.1',
  //     }
  //
  //     MyApp.Sqimitive = Sqimitive.Base.extend()
  //     // or, if your application is DOM-based:
  //     MyApp.Sqimitive = Sqimitive.jQuery.extend()
  //
  //     // Now use MyApp.Sqimitive as a base class throughout your code:
  //     MyApp.ClassOne = MyApp.Sqimitive.extend(...)
  //     MyApp.ClassTwo = MyApp.Sqimitive.extend(...)
  //  `]
  //
  // Traditional OOP-style inheritance is not the only form of functionality
  // extension supported by Sqimitive. For multi-parent inheritance, aka
  // mix-ins, aka traits and for generics (parametrized mix-ins) see `#mixIn().
  Sqimitive.Base = Core.extend({

    //#+tag_Options
    //* `@Base._opt`@
    //#
    //
    // ` `*May be set upon declaration via `@Core::extend()`@ or `#mixIn, read
    // on run-time with `#get() and written with `#set().`*
    //
    // List of "`#opt'ions" (public properties) of this instance.
    //
    //= object {name: value} `- keys are option names and values are anything,
    //  of arbitrary type
    //
    // On run-time, use `#get()/`#set() to access this data (both from within
    // this class' methods and from the outside - it's a public interface).
    //
    // When any option's value is changed, `#ifSet:
    //* Fires the `#normalize_OPT event to allow for value normalization and
    //  validation.
    //* If no error occurred, changes the value in `[this._opt`] and fires
    //  `#change_OPT and `#change to notify the interested parties.
    //
    //?`[
    //   var Parent = Sqimitive.Base.extend({
    //     _opt: {caption: 'unnamed'},
    //
    //     events: {
    //       '+normalize_caption': function (res, s) {
    //         return s.trim()
    //       },
    //
    //       change: function (optName, newValue) {
    //         alert(optName + '=' + newValue)
    //       },
    //     },
    //   })
    //
    //   var Child = Parent.extend({
    //     _opt: {body: 'unbodied'},
    //
    //     events: {
    //       change_caption: function (newValue) {
    //         alert('New caption = ' + newValue)
    //       },
    //     },
    //   })
    //
    //   var child = new Child
    //     // child._opt = {caption: 'unnamed', body: 'unbodied'}
    //
    //   child.set('caption', 'Foo')
    //     // alerts: New caption = foo   - Child's change_caption handler
    //     // alerts: caption=foo         - Parent's change handler
    //
    //   child.set('body', 'Bar')
    //     // alerts: body=foo            - Parent's change handler
    //
    //   child.set('caption', ' S P A C E ')
    //     // _opt.caption  = 'S P A C E'
    //   child.set('body',    ' S P A C E ')
    //     // _opt.body     = ' S P A C E '
    // `]
    //
    // When given to `#extend(), the `'_opt key specifies initial options
    // (their defaults) for new instances.
    //
    //#-inMergeProps
    //
    // It's highly advised to access `#_opt's values only via `#get()/`#set() -
    // performance benefits of direct access are questionable (especially when
    // those methods are not events/`#firer's, i.e. almost always) while lack
    // of `#normalize_OPT and others often cause bugs.
    //
    //#-inBB
    // In Backbone terms "options" are called `@bb:Model-attributes`@.
    _opt: {},

    //! +ig
    // Not meant for tampering with. Used internally to reverse the order of
    // `#ifSet()-produced events. See `#_fireSet() for explanation.
    _firingSet: null,

    //#+tag_Nesting
    //* `@Base._parent`@
    //
    //#-readOnly
    //
    // Holds the reference to the Sqimitive that owns object, or `'null.
    //
    // You can read this property from inside methods of the same class.
    // Changing it (from any context) is highly discouraged because it's easy
    // to break object integrity - use `#nest(), `#unnest() and others.
    //
    //##parentAndKey
    // Non-`#_owning sqimitives never change `#_parent and `#_parentKey of
    // their `#_children.
    //
    //?`[
    //   Sqimitive.Base.extends({
    //     events: {
    //       owned: function () {
    //         // CORRECT: reading _parent from within this class' context:
    //         alert('New parent is ' + this._parent._cid)
    //         alert('My key under my parent is ' + this._parentKey)
    //         // WRONG: do not change _parent:
    //         this._parent = null
    //       },
    //     },
    //   })
    //
    //   // WRONG: do not access _parent from the outside:
    //   alert(sqim._parent._cid)
    // `]
    _parent: null,

    //#+tag_Nesting
    //* `@Base._parentKey`@
    //
    //#-readOnly
    //
    // Holds the key under which this instance is listed in its `#_parent's
    // list of `#_children, or `'null.
    //
    //= string if owned`, null if not `- if `'null then `#_parent is also
    //  `'null
    //
    //#-parentAndKey
    //
    //? This key can be given to `#nested() and others:
    //  `[
    //     Sqimitive.Base.extends({
    //       pull: function () {
    //         this._parent.unlist(this._parentKey)
    //           // this is a contrived example since this.remove() does
    //           // exactly the same
    //       },
    //     })
    //  `]
    _parentKey: null,

    //#+tag_Nesting
    //* `@Base._children`@
    //#
    //
    // Holds references to objects contained within this instance
    // ("collection").
    //
    //= object {key: Sqimitive} `- keys are arbitrary strings as given to
    //  `#nest (`#_parentKey's if `'this is `#_owning) and values are the
    //  children themselves (objects)
    //
    // You're advised against accessing `#_children at all. Instead, use
    // `#nested() and other methods.
    //
    // Other notes:
    //* Both `#_owning
    //  sqimitives and not list their children here. For non-`#_owning,
    //  `#_children keys naturally differ from `#_parentKey of their children.
    //* This parent-child relationship is purely formal and
    //  doesn't dictate any DOM or other structure (children can have their
    //  `#el's outside
    //  of the parent's node). Moreover, if `#_owning is unset then it doesn't
    //  imply the reverse relationship (from children to their parent).
    //* See the children overview (`#chld) for examples.
    _children: {},

    //#+tag_Nesting
    //* `@Base._owning`@
    //
    //#-setOnDecl
    //
    // Specifies if this object manages its children or not (by default it does).
    //
    //= true the default `- "Managing" (owning) parent. All of its children
    //  know who owns them (`#_parent) and under which key (`#_parentKey). It
    //  makes sure the children only ever have one parent - itself, and that
    //  they cannot duplicate in its `#_children. Essentially makes a
    //  bi-directional tree.
    //= false `- Unmanaged (non-owning) parent. Acts as a simple collection.
    //  Imposes no hierarchy onto its children, who do not even know that they
    //  are listed here and may duplicate in `'this own `#_children (same child
    //  under different keys).
    //
    // ` `#_owning only affects a subset of features (`#nest(), etc.). Most
    // features - filtering (`#util), `#_forward'ing `#_childEvents, etc. can
    // be used in both modes.
    //
    // See `#chld children overview for more details.
    //
    //?`[
    //   var Owning = Sqimitive.Base.extend()
    //
    //   var NonOwning = Sqimitive.Base.extend({
    //     _owning: false,
    //   })
    //
    //   var child = new Sqimitive.Base
    //   var owning = new Owning
    //   var nonOwning = new NonOwning
    //   owning.nest('key', child)
    //   nonOwning.nest('key2', child)
    //   alert(child._parent == owning)             //=> true
    //   alert(child._parentKey)                    //=> 'key'
    //   alert(owning.nested('key') == child)       //=> true
    //   alert(nonOwning.nested('key'))             //=> undefined
    //   alert(nonOwning.nested('key2') == child)   //=> true
    //
    //   var owning2 = new Owning
    //   owning2.nest('key3', child)
    //     // child._parent == owning2, _parentKey == 'key3'
    //   alert(owning.nested('key'))                //=> undefined
    // `]
    _owning: true,

    //#+tag_Nesting
    //* `@Base._childClass`@
    //
    //#-settable
    //
    // Ensures `#_children contains instances of a certain class only.
    //
    //= Object to disable type checking`, Sqimitive.Base the default`,
    //  array`, string `- array and string are indirect declaration-time
    //  references (`#classref)
    //
    //?`[
    //   var MyToDoItem = Sqimitive.Base.extend()
    //   var SpecialMyToDoItem = MyToDoItem.extend()
    //
    //   var MyToDoList = Sqimitive.Base.extend({
    //     _childClass: MyToDoItem,
    //   })
    //
    //   ;(MyToDoList).nest(new MyToDoItem)         // works (the _childClass)
    //   ;(MyToDoList).nest({})                     // throws an exception
    //   ;(MyToDoList).nest(new Sqimitive.Base)     // throws an exception
    //   ;(MyToDoList).nest(new SpecialMyToDoItem)  // works (subclass of _childClass)
    // `]
    //
    //? Disabling the check with `'Object: `[
    //   var MyToDoList = Sqimitive.Base.extend({
    //     _childClass: Object,
    //   })
    //
    //   ;(MyToDoList).nest(new MyToDoItem)         // works
    //   ;(MyToDoList).nest({})                     // works
    //   ;(MyToDoList).nest(new Sqimitive.Base)     // works
    //   ;(MyToDoList).nest(new SpecialMyToDoItem)  // works
    // `]
    //
    // Other notes:
    //* Typically, the value of `#_childClass is a subclass of
    //  `[Sqimitive.Core`] (`#Core) since non-Sqimitives are unlikely to work
    //  properly as children. This is not checked though.
    //* This constraint is enforced as long as children are added via `#nest(),
    //  etc. without direct manipulation of `#_children (which is highly
    //  discouraged anyway).
    //* Changing `#_childClass on run-time affects only new nesting attempts
    //  (existing children are not validated).
    //* `#_childClass is listed in `#_shareProps by default.
    //
    //#classref Indirect references
    // It's often convenient to give as an array or string to `#extend() or
    // `#mixIn(). In this case `#init() resolves the value of `#_childClass to
    // the actual class (this makes it a tad slower than giving a real class):
    //> array like `[[BaseObject, 'Sub.Class.Path']`] `- same as evaluating
    //  `[BaseClass.Sub.Class.Path`]
    //> string like `['Sub.Class.Path'`] `- relative to static properties of
    //  `'this
    //> string empty `- the class of `'this
    //
    // Errors if no class was found.
    //
    //? Indirect references are useful for "forward type declaration" where
    //  the child class is defined after the collection's class or appears
    //  later on run-time:
    //  `[
    //     var MyToDo = {}
    //
    //     MyToDo.List = Sqimitive.Base.extend({
    //       _childClass: [MyToDo, 'Item'],
    //     })
    //
    //     MyToDo.Item = Sqimitive.Base.extend()
    //  `]
    //  Or for the conventional Sqimitive hierarchy of
    //  `[<Collection>.<Child>`]:
    //  `[
    //     MyToDo.List = Sqimitive.Base.extend({
    //       // All declarations below are equivalent:
    //       _childClass: [MyToDo, 'List.Item'],
    //       _childClass: [MyToDo.List, 'Item'],
    //       _childClass: 'Item',
    //     })
    //
    //     MyToDo.List.Item = Sqimitive.Base.extend()
    //
    //     alert(MyToDo.List.prototype._childClass)                   //=> 'Item'
    //     alert((new MyToDo.List)._childClass == MyToDo.List.Item)   //=> true
    //  `]
    _childClass: null,

    //#+tag_Nesting
    //* `@Base._childEvents`@
    //
    //#-settable
    //
    // Lists event names for automatic `#_forward'ing from children to the
    // collection object.
    //
    //= array `- `[['-nest_', 'change', ...]`]
    //
    // Whenever a new child is `#nest()ed, listens to these events on it,
    // firing events on `'this with the same name but prefixed with a dot `[.`]
    // (e.g. `'render -> `'.render) and with the child's object pushed in front
    // of the event's arguments. Think of this as of the usual `[../../path`]
    // notation in file systems where each dot means "one [parent] above".
    //
    // Nothing special is done to stop listening when a child is removed since
    // the default `#unnested() implementation calls `[child.off(this)`] (see
    // `#off).
    //
    //
    //?`[
    //   var MyList = Sqimitive.Base.extend({
    //     _childEvents: ['-change'],
    //
    //     events: {
    //       '.-change': function (sqim, name) {
    //         alert('Option ' + name + ' is about to change on ' + sqim._cid)
    //       },
    //     },
    //   })
    // `]
    //
    // Warning: don't list `#unnest here - `#_parent will `#off() itself before
    // that and never receive the notification. Use `#unnested instead. Using
    // `'-unnest is also possible but in this case if an exception occurs
    // during unnesting your handler won't know this and will be called anyway,
    // while the child is possibly left nested.
    //
    // Other notes:
    //
    //##chevaoff
    //* Use `#_childEvents to track events of `#_children; use `#autoOff() to
    //  track events of the outside objects.
    //##
    //* If `#_childEvents is changed on run-time, only new children are
    //  affected.
    //* For the impementation see `#_forward().
    //* See Children overview (`#chld) for a comprehensive example.
    //
    //? Using `#_childEvents is identical to manually calling `#on() but more
    //  convenient. However, since it's `#on() in disguise, you can use any
    //  event prefixes (`#evtpf), specify methods that will be automatically
    //  turned into events (`#evt), etc.
    //  `[
    //    var Collection = Sqimitive.Base.extend({
    //      _childEvents: ['=click'],
    //
    //      _opt: {
    //        enabled: true,
    //      },
    //
    //      events: {
    //        '.=click': function (child, sup) {
    //          if (this.get('enabled')) {
    //            return sup(this, arguments)
    //          } else {
    //            console.error('Clicking is disabled! Stop playing, ' + child._cid)
    //          }
    //        },
    //
    //        '-unnested': function (child) {
    //          child.off(this)
    //        },
    //      },
    //    })
    //
    //    var Item = Sqimitive.Base.extend({
    //      click: function () { alert('Oh... feels good!') },
    //    })
    //
    //    var col = new Collection
    //    var item = new Item
    //    item.click()    // alerts; click is a method
    //    col.nest(item)
    //      // item.click is no longer the original method but the wrapping handler
    //    item.click()    // alerts
    //    col.set('enabled', false)
    //    item.click()    // no more alerts
    //    col.unlist(item)
    //    item.click()    // alerts again; click is again the original method
    //  `]
    //
    //? You can forward already forwarded events with multi-level nesting
    //  (children of children of your collection) the same way. The number of
    //  dots indicates the number of child instances prepended to event's
    //  arguments: `[
    //   var MyListGroup = Sqimitive.Base.extend({
    //     // Indicate this object nests MyList instances from the first
    //     // example.
    //     _childClass: MyList,
    //
    //     // MyList forwards '-change' on its children as '.-change' on itself
    //     // so we can foward that event too on this grouping instance.
    //     // There's no limit - '....-change' is perfectly fine and works on
    //     // 4th nesting level. Each forward gets originating object pushed in
    //     // front so '..-change' gets MyList as first argument. '...-change'
    //     // would get (MyListGroup, MyList).
    //     _childEvents: ['.-change'],
    //   })
    //
    //   // Listening to '-change' that occurred on a MyList child, with MyList
    //   // being nested into MyListGroup.
    //   ;(new MyListGroup).on('..-change', function (myListGroup, myList) { ... })
    //  `]
    //
    //  And of course you can use the usual event prefixes (`#evtpf) on these
    //  already-forwarded events:
    //  `[
    //     // Trigger event on this before other handlers of '.-change'.
    //     _childEvents: ['-.+normalize'],
    //
    //     // ...
    //
    //     ;(new MyListGroup)
    //       .on('.-.+normalize_caption', function (myListGroup, myList,
    //                                              currentResult, newValue) {
    //         return newValue.trim()
    //       })
    //  `]
    _childEvents: [],

    //#+tag_Options
    //* `@Base._respToOpt`@
    //
    //#-settable
    //
    // Specifies rules for transforming an external input object (e.g. an API
    // response) into `#_opt'ions for `#assignResp().
    //
    //= object {respKey: optValue}.
    //
    // ` `#_respToOpt's keys are input object's keys (except the special
    // `[''`]) and values are one of the following (`'optValue):
    //> false `- Skip input item regardless of `[options.onlyDefined`] as given
    //  to `#assignResp().
    //> true `- Assign input item's value to the option named `'respKey (i.e.
    //  keys of the option and the input object are the same).
    //> string `- Assign input item's value to the option by this name.
    //> function (respValue, key, resp, options)
    //  `- Input item transformation. This function is called in `'this context
    //  and must return `[['optToSet', value]`].
    //
    //  `'respKey only determines the `'respValue given to this function; the
    //  latter can access the entire input object (`'resp). The (new) option's
    //  name is retrieved from the returned array (`'optToSet), not from
    //  `'respKey.
    //
    //  The `'key argument equals `'respKey (i.e. is the key's name under which
    //  the function is listed in `'_respToOpt), `'options is the object given
    //  to `#assignResp().
    //
    //  If `'optToSet is `'false then the input item is skipped and `'value is
    //  unused, otherwise it's the option name to set `'value to (`'value can
    //  be of any type). It's similar to calling `#set() but more declarative
    //  and future-proof.
    //
    // The special key `[''`] (empty string) must be a function `[(resp,
    // options)`] returning object `[{optToSet: value}`] or `'null (equivalent
    // to `[{}`]). It's called in the beginning of `#assignResp() and, as other
    // keys, if `'resp has an empty string key - check `[arguments.length`] if
    // you expect it. This key is useful for unserializing fields that match
    // multiple options or vice-versa:
    //[
    //   Sqimitive.Base.extend({
    //     _respToOpt: {
    //       '': function (resp) {
    //         return {personsName: resp.firstName + ' ' + resp.secondName}
    //           // same as set('personsName', '<firstName> <secondName>')
    //       }
    //
    //       // The opposite of the above - if there are two options in one
    //       // input key.
    //       '': function (resp) {
    //         var name = resp.personsName.split(' ')
    //         return {firstName: name[0], secondName: name[1]}
    //       }
    //     },
    //   })
    //]
    //
    //?`[
    //   Sqimitive.Base.extend({
    //     _respToOpt: {setAsIs: true, setAsFoo: 'Foo'},
    //   })
    //
    //   // ...
    //
    //   sqim.assignResp({setAsIs: 123, setAsFoo: 'xyz'})
    //     // sqim._opt is {setAsIs: 123, Foo: 'xyz'}
    //
    //   // Equivalent to:
    //   sqim.set('setAsIs', 123)
    //   sqim.set('Foo', 'xyz')
    // `]
    //
    //? Using transformation functions:
    //  `[
    //   Sqimitive.Base.extend({
    //     _respToOpt: {
    //       ignore: function () { return [false] },
    //       rename: function (value) { return ['foo', value] },
    //       date: function (value) { return ['date', new Date(value)] },
    //       merge: function (v, k, resp, options) {
    //         // v = 5, k = 'merge', resp = {unlisted: ...}, options = {}
    //         return ['bar', resp.a.concat(resp.b)
    //       },
    //       setUndefined: function () { return ['baz', undefined] },
    //     }
    //   })
    //
    //   // ...
    //
    //   sqim.assignResp({unlisted: 1, ignore: 2, rename: 3, date: 4,
    //                    merge: 5, a: 6, b: 7, setUndefined: 8})
    //     // sqim._opt is {foo: 2, date: Date, bar: [6, 7], baz: undefined}
    //  `]
    //
    //#-inMergeProps
    //
    // Other notes:
    //* Options are assigned with `#set() so normalization and `#change events
    //  take place as usual.
    //* Missing keys may or may not become options by the same name - this
    //  depends on the `[options.onlyDefined`] flag of `#assignResp().
    _respToOpt: {},

    //#+tag_Lifecycle
    //* `@Base.el`@
    //
    //#-settable
    //
    // "Element" - an external "form" of this Sqimitive (such as a DOM node).
    //
    // Even though this is technically a public read/write property, it's
    // usually best not to change it on run-time (after initialization) or at
    // least not from the outside context.
    //
    //#elstub
    // `@Sqimitive\Base`@ doesn't define any element-related functionality but
    // only provides stubs for several common fields (`#el, `#render(),
    // `#remove(), etc.) for standardized extension. See
    // `@Sqimitive\jQuery.el`@ for one such subclass.
    el: false,

    //#+tag_Lifecycle
    //* `@Base.elEvents`@
    //
    //#baseElEvents
    //##-setOnDecl
    //
    // Declares event listeners for `#el, bound automatically by `#attach().
    //
    //= object {event: func}
    //
    // ` `#elEvents' format is consistent among `#Base's subclasses and follows
    // Backbone's `@bb:Model-events`@: keys are event references of form
    // `[event[.ns][ .sel #ector]`] and values are strings (`#expandFunc()) or
    // functions, called as `[function (nativeEventObject)`] (see `#argDanger).
    //
    //##-inMergeProps
    //
    // The `'.ns part is ignored but can be used to create unique keys for the
    // purpose of inheritance. By convention, the class' own handlers don't
    // have `'ns while `#mixIn's do.
    //
    //##-es6thiswarn
    //
    // This property is not advised to change on run-time since it's usually
    // unpredictable when it will take effect. For example,
    // `@Sqimitive\jQuery.attach()`@ only binds events when nesting `#el into a
    // new parent node:
    //[
    //   sqim.attach()
    //   sqim.elEvents['click'] = function () { alert('foo') }
    //   sqim.attach()    // will do nothing and 'click' will not be bound
    //   sqim.el.remove()
    //   sqim.attach()    // now events are bound
    //]
    //
    //#-elstub
    elEvents: {},

    //#-readOnly
    //
    // The number of `#_children `#nest()ed into this object.
    //
    // Just like `[$('p').length`] or `@bb:Collection-length`@.
    //
    // See also `#slice().
    length: 0,

    //! `, +fna=function ( [opt] )
    //
    // Calls `@Core.constructor()`@ and `#fire()s `#init and `#postInit,
    // passing `'opt to all.
    //
    // `'opt is the first argument optionally given to `'new: `[new
    // Sqimitive.Base({opt...})`].
    //
    //? Ensures `'opt is always an object before passing it on so that there is
    //  no need for checks like `[(opt && opt.foo)`]. Additionally,
    //  `#init/`#postInit handlers may propagate changes in user-given `'opt to
    //  other handlers or even to the caller of `'new (`#optpropag).
    //  `[
    //    var MyClass = Sqimitive.Base.extend({
    //      events: {
    //        init: function (opt) { opt.changed = 123 },
    //      },
    //    })
    //
    //    var opt = {}
    //    ;(new MyClass(opt))
    //      // opt.changed == 123
    //  `]
    //
    // Constructors are reminiscents of the traditional JavaScript OOP (if it
    // can be called so). They are hard to work with in Sqimitive (you can't
    // override them using events) so you want to leave them alone, instead
    // working with `#init() and `#postInit() which are "regular" Sqimitive
    // methods.
    constructor: function Sqimitive_Base(opt) {
      // ^^ Giving this function a name so that it's visible in the debugger.

      // Ensuring the argument is always an object.
      // Mere arguments[0] = {} won't work because if arguments.length == 0,
      // this won't update length and so apply() will assume arguments is still
      // empty (0) even though index 0 has been set.
      opt || Array.prototype.splice.call(arguments, 0, 1, {})
      Sqimitive.Base.__super__.constructor.apply(this, arguments)
      this.init.apply(this, arguments)
      this.postInit.apply(this, arguments)
    },

    //! `, +fna=function ( [opt] )
    //
    //#+tag_Lifecycle
    //* `@Base.init()`@
    //#
    //
    // Resolves `#_childClass and sets `#_opt'ions from `'opt.
    //
    // Arguments of `#init() and `#postInit() match those given to the
    // constructor, which in turn gets them from `'new. Usually only the first
    // one (`'opt) is used but you can use others:
    //[
    //   var MyClass = Sqimitive.Base.extend({
    //     events: {
    //       init: function (opt, extra, fooArray) { ... },
    //     }
    //   })
    //
    //   new MyClass({opt...}, 'extra', ['foo'])
    //]
    //
    // Options are set by calling `#set() for every member of `'opt (if given).
    // Other `#_opt remain with the declaration-time default values. `[opt.el`]
    // is ignored, if present (see `@jQuery.el`@ for the reason).
    //
    //#initonce
    //* Both `#init() and `#postInit() are only called once in a given object's
    //  lifetime.
    //#-plainstub
    //
    //#
    //
    // ` `#init() is followed by `#postInit().
    //
    //?`[
    //   var MyClass = Sqimitive.Base.extend({
    //     _opt: {a: 1, b: 2},
    //   })
    //
    //   new MyClass({b: 3, c: 4})
    //     // _opt is {a: 1, b: 3, c: 4}
    // `]
    init: function (opt) {
      if (_.isArray(this._childClass)) {
        var path = this._childClass[1].split(/\./g)
        this._childClass = this._childClass[0]
        while (path[0]) {
          this._childClass = this._childClass[path.shift()]
        }
        if (!this._childClass) {
          throw new ReferenceError('init: _childClass by path not found')
        }
      }

      for (var name in opt) {
        // By convention, el is given as options to replace the default value
        // of this class, but el isn't a real option.
        name == 'el' || this.set(name, opt[name])
      }
    },

    //! +fn=postInit:opt +ig
    //
    //#+tag_Lifecycle
    //* `@Base.postInit()`@
    //#
    //
    // Called after `#init() to bootstrap the new instance after construction.
    //
    // Logically, `#init is part of the object construction while `#postInit is
    // part of its lifecycle; while `#init is inseparable from `'new,
    // `#postInit could be called at a later time (in theory) so it should not
    // make the object inconsistent. Thinking about it that way helps to decide
    // which of the two events to hook.
    //
    // Usually `#init() creates and configures related objects (DOM nodes,
    // collections, etc.) while `#postInit() starts timers, resource
    // preloading, etc. This way you don't depend on the order of `#init()
    // handlers (it may so happen that the `'init handler of a subclass is
    // executed before the inherited `'init of its base class, when internal
    // objects are not yet initialized).
    //
    //#-initonce
    //
    // ` `#Base does nothing in `#postInit().
    //
    //?`[
    //   var MySqimitive = Sqimitive.Base.extend({
    //     _button: null,
    //
    //     events: {
    //       init: function () {
    //         this._button = this.nest(new MyButton)
    //       },
    //
    //       postInit: function () {
    //         this._button.startAnimation()
    //       },
    //     },
    //   })
    // `]
    postInit: Core.stub,

    //#+tag_Lifecycle
    //* `@Base.render()`@
    //#
    //
    // Populate from scratch or update the object's "view" - `#el.
    //
    //#renderAttach
    //
    //##baseAttach
    //
    //= object `- `'this
    //
    // Here's a typical Sqimitive object lifecycle:
    //* construct with `'new: `[new Class({opt...})`]
    //* `#attach() (to DOM, etc.), for members - when nested to a collection
    //* `#render() when required for user to see it first time
    //* `#render() again when something changes that affects the visual
    //  presentation (usually in response to a `#change of some `#_opt'ion)
    //* finally, `#remove()
    //
    // Complete re-rendering on change is simple and adequate for many simple
    // sqimitives but if it's heavy, it's customary to perform a partial update
    // using method(s) named `'update(). There are no such methods by default
    // but see `#vw for an example.
    //
    //?`[
    //    var Label = Sqimitive.jQuery.extend({
    //      _opt: {caption: 'untitled'},
    //
    //      events: {
    //        render: function () {
    //          this.el.text(this.get('caption'))
    //        },
    //
    //        change_caption: 'render',
    //      },
    //    })
    //                                        // Lifecycle:
    //    ;(new Label)                        // 1) construct
    //      .attach('body')                   // 2) attach
    //      .render()                         // 3) render
    //      .set('caption', 'render again!')  // 4) update
    // `]
    //
    //##-elstub
    //
    //#
    //
    // ` `#Base's `#render() calls `#attach() on all children of self (but not
    // on self).
    render: function () {
      this.invoke('attach')
      return this
    },

    //#+tag_Lifecycle
    //* `@Base.attach()`@
    //#
    //
    // Attach the object to its parent and bind "external" event handlers
    // (`#elEvents).
    //
    //#-renderAttach
    //
    // ` `#Base's `#attach() does nothing. You may be looking for
    // `@Sqimitive\jQuery.attach()`@.
    attach: function (parent) {
      return this
    },

    //! `, +fna=function ( toGet [, toSet [, toReturn]] [, func[, cx]] )
    //
    //#+tag_Options
    //* `@Base.getSet()`@
    //#
    //
    // Performs batched `#get() and/or `#set() on multiple options.
    //
    //> toGet     string `#_opt name`, array of names
    //> toSet     string `#_opt name`, array of names`, null/omitted assume
    //  `'toGet
    //> toReturn  string `#_opt name`, array of names`, null/omitted assume
    //  `'toSet
    //> func `- Given `'G arguments (`'G = length of `'toGet), returns an array
    //  or a single value (converted to `[[array]`]) - option value(s) to set.
    //  Returned array's length must be <= length of `'toSet. Missing members
    //  of `'toSet are not set.
    //
    //  If `'func is missing sets every `[toSet[N]`] to `[toGet[N]`]. The
    //  length of `'toSet must be <= length of `'toGet.
    //
    //> cx object `- the context for `'func
    //
    //= array of values if `'toReturn is an array`, mixed single value if not
    //
    // Errors if called without arguments (without `'toGet).
    //
    //?`[
    //   // Multi-get():
    //   sqim.getSet(['opt1', 'opt2', 'opt3'])
    //     //=> [value of opt1, value of opt2, value of opt3]
    //     // even though the above not only get()s but also set()s them,
    //     // unless a normalize_OPT returns a different value then no change
    //     // events are fired since old values are the same
    //
    //   sqim.getSet('opt1', 'opt2')
    //   // Equivalent to:
    //   sqim.set('opt2', sqim.get('opt1'))
    //   // Similar but result of getSet() is value of opt3, not opt1
    //   sqim.getSet('opt1', 'opt2', 'opt3')
    //
    //   sqim.getSet(['left', 'right'], ['right', 'left'])
    //   // Equivalent to:
    //   var temp = sqim.get('left')
    //   sqim.set('left', sqim.get('right'))
    //   sqim.set('right', temp)
    // `]
    //
    //? Updating an option based on another option:
    //  `[
    //    Sqimitive.Base.extend({
    //      _opt: {money: 0, income: 10},
    //    })
    //
    //    var newMoney = sqim.getSet(['money', 'income'], 'money',
    //                               (money, income) => money + income)
    //    alert(newMoney)    //=> 10
    //
    //    // Equivalent to:
    //    var newMoney = sqim.get('money') + sqim.get('income')
    //    sqim.set('money', newMoney)
    //    alert(newMoney)
    //  `]
    getSet: function (toGet, toSet, toReturn, func, cx) {
      var args = Core.toArray(arguments)
      for (var i = 0; i <= 2; i++) {
        if (typeof args[i] == 'function') {
          args.splice(i, 0, args[i - 1])
        } else if (args[i] == null) {
          args[i] = args[i - 1]
        }
        args['a' + i] = _.isArray(args[i]) ? args[i] : [args[i]]
      }
      var got = _.map(args.a0, this.get, this)
      if (args[3]) {
        got = args[3].apply(args[4], got)
        if (!_.isArray(args[1])) { got = [got] }
      }
      _.each(got, function (value, index) {
        this.set(args.a1[index], got[index])
      }, this)
      return _.isArray(args[2])
        ? _.map(args[2], this.get, this)
        : this.get(args[2])
    },

    //! `, +fna=function ( [opt] )
    //
    //#+tag_Options
    //* `@Base.get()`@
    //#
    //
    // Returns the value of one `#_opt or values of all of them (if no
    // argument).
    //
    //?`[
    //   sqim.get('opt1')   //=> 'value'
    //   sqim.get()         //=> {opt1: 'value', opt2: 123, ...}
    // `]
    //
    // All options' values are returned in an object shallow-copied from `#_opt
    // meaning it's safe to change the object itself (add/remove properties)
    // but changing non-scalar values will indirectly change options inside the
    // object:
    //[
    //   var MyClass = Sqimitive.Base.extend({
    //     _opt: {array: [1, 2]},
    //   })
    //
    //   var obj = new MyClass
    //   var opts = obj.get()   //=> {array: [1, 2]}
    //   opts.new = 3
    //   obj.get()              //=> {array: [1, 2]} - same
    //   opts.array.push(4)
    //   obj.get()              //=> {array: [1, 2, 4]} - changed
    //]
    //
    // Override this method to read non-existing options or transform them like
    // this:
    //[
    //   var MySetter = Sqimitive.Base.extend({
    //     _opt: {
    //       foo: 'foo!',
    //     },
    //
    //     events: {
    //       // Now any option can be read as option:up to turn its value into
    //       // upper case.
    //       '+get': function (res, name) {
    //         if (name = name.match(/^([^:]+):up$/)) {
    //           return this.get(name[1]).toUpperCase()
    //         }
    //       },
    //     },
    //   })
    //
    //   alert((new MySetter).get('foo'))       //=> foo!
    //   alert((new MySetter).get('foo:up'))    //=> FOO!
    //]
    //
    //#-unordered
    // There are no guarantees in which order options would be iterated over.
    get: function (opt) {
      return arguments.length ? this._opt[opt] : _.extend({}, this._opt)
    },

    //! `, +fna=function ( opt, value[, options] )
    //
    //#+tag_Options
    //* `@Base.set()`@
    //#
    //
    // Changes the value of one `#_opt'ion and returns `'this.
    //
    // ` `#set() is identical to `#ifSet() except the latter returns
    // `'true/`'false indicating if the new value was different from the old
    // one or `[options.forceFire`] was set.
    //
    // If you are overriding the "setter" behaviour you should override `#ifSet
    // instead of `#set which calls the former.
    //
    //?`[
    //   sqim.set('key', 'foo')     //=> this
    //
    //   // Fires normalize/change_key/change despite the fact that old key's
    //   // value is the same:
    //   sqim.set('key', 'foo', {forceFire: true})
    // `]
    //
    // The description of `#ifSet() follows.
    //
    //#-ifSetSet
    set: function (opt, value, options) {
      this.ifSet(opt, value, options)
      return this
    },

    //normalize_OPT: function (value, options) { return _.trim(value) },
    //
    //! +fn=normalize_OPT:value:options
    //
    //#+tag_Options
    //* `@Base.normalize_OPT()`@
    //#
    //
    // Called to normalize and/or validate new `#_opt'ion value before it's
    // set.
    //
    // ` `#ifSet() fires an event named "normalize_" + the option's name before
    // the value is actually set to `#_opt. Here you should clean it up (e.g.
    // trim whitespace) or throw an error if it has a wrong format (e.g. not
    // `[YYYY-MM-DD`] for dates).
    //
    //##normopt
    // `'options is the object originally given to `#set() or `#ifSet().
    //
    //##
    //
    //? Removing spaces and converting to lower case: `[
    //   var MyNorm = Sqimitive.Base.extend({
    //     _opt: {
    //       stringie: '',
    //     },
    //
    //     // Now 'stringie' is guaranteed to have no surrounding whitespace
    //     // and be lower case - as long as it's not written directly as
    //     // this._opt.stringie, which is a bad idea in general.
    //     normalize_stringie: function (value) {
    //       return _.trim(value).toLowerCase()
    //     },
    //   })
    //
    //   var str = (new MyNorm)
    //     .set('stringie', '  Foo\n')
    //     .get('stringie')
    //       //=> 'Foo'
    // `]
    //
    //? Validating new value (see the sample To-Do application for a complete
    //  primer): `[
    //   var MyValid = Sqimitive.Base.extend({
    //     _opt: {
    //       date: null,    //= Date or 'YYYY-MM-DD'¹
    //     },
    //
    //     normalize_date: function (value) {
    //       if (!(value instanceof Date) &&
    //           (value = value.trim().match(/^(\d{4})-(\d\d)-(\d\d)$/))) {
    //         value = new Date(value[1], value[2] - 1, value[3])
    //       }
    //       if (!(value instanceof Date)) {
    //         throw new TypeError('Bad date format')
    //       }
    //       return value
    //     },
    //   })
    //
    //   ;(new MyValid).set('date', new Date)       // works
    //   ;(new MyValid).set('date', '2020-02-20')   // works
    //   ;(new MyValid).set('date', 'whatchadoin')  // TypeError
    // `]
    //     `&sup1 It's customary in Sqimitive to leave a comment explaining
    //     non-trivial options' types or formats.
    //
    // Unlike with `#change/`#change_OPT, there is no global normalization
    // function (since every option usually needs a unique approach) but you
    // can override `#ifSet() if you need this.
    //
    // Remember: when defined in `#events, function's return value is ignored
    // unless `[=`] or `[+`] prefixes are used (`#evtpf). Also, see `#evtconc
    // and `#es6this.
    //[
    //    Sqimitive.Base.extend({
    //      events: {
    //        // WRONG: return value is ignored:
    //        normalize_stringie:    function (value) { return _.trim(value) },
    //        // CORRECT: adding handler after others:
    //        '+normalize_stringie': function (res, value) { return _.trim(value) },
    //        // CORRECT: adding handler instead of others:
    //        '=normalize_stringie': function (sup, value) { return _.trim(value) },
    //      },
    //
    //      // CORRECT, but only if no normalize_string is defined in any base
    //      // class (see #evtconc):
    //      normalize_stringie: function (value) { return _.trim(value) },
    //    })
    //]
    //
    //#-setoptpropag

    //change_OPT: function (value, old, options) { ... },
    //
    //! +fn=change_OPT:value:old:options
    //
    //#+tag_Options
    //* `@Base.change_OPT()`@
    //#
    //
    // Called to notify that the value of `#_opt'ion named `'OPT has changed.
    //
    //#changeAndOpt
    // ` `#ifSet normalizes (`#normalize_OPT) new option's value (`'value) and,
    // if it's different from the current one (`'old) fires an event named
    // "change_" + the option's name (`#change_OPT), then fires `#change.
    //
    // New value is already written to `[this._opt.OPT`] by the time change
    // events occur.
    //
    //##-normopt
    //
    //?`[
    //   var MyClass = Sqimitive.Base.extend({
    //     _opt: {
    //       caption: '',
    //     },
    //
    //     events: {
    //       // When _opt.caption is changed - call render() to update the
    //       // looks.
    //       change_caption: 'render', //¹
    //     },
    //   })
    // `]
    //    `&sup1 Be aware of `#argDanger as your handler might care for extra
    //    arguments. If it does then use a masked reference (see `#masker()):
    //    `[
    //      events: {
    //        // Pass no arguments thanks to '-':
    //        change_caption: 'updateCaption-',
    //      },
    //    `]
    //
    //?`[
    //   var MyClass = Sqimitive.jQuery.extend({
    //     el: {tag: 'form'},
    //
    //     _opt: {
    //       caption: '',
    //       body: '',
    //     },
    //
    //     events: {
    //       // When any option is changed - update the corresponding <input>.
    //       change: function (name, value) {
    //         // change_OPT doesn't receive option's name as the first
    //         // argument.
    //         //
    //         // value is used as is - if clean-up is required then
    //         //  normalize_OPT events must be handled.
    //         this.$('[name="' + name + '"]').val(value)
    //       },
    //     },
    //   })
    // `]
    //
    //##setoptpropag
    //? Propagation of `'options (`#optpropag):
    //  `[
    //   sqim.on('change_foo', function (value, old, options) {
    //     if (!options.noSync) {
    //       $.ajax({
    //         url: 'update',
    //         type: 'POST',
    //         data: this.get(),
    //       })
    //     }
    //   })
    //
    //   // The handler above performs an AJAX request:
    //   sqim.ifSet('foo', 123)
    //
    //   // But not now (set() passes options through to ifSet()):
    //   sqim.set('foo', 123, {noSync: true})
    //
    //   // assignResp() passes options to set() so no request is performed too:
    //   sqim.assignResp({foo: 123}, {noSync: true})
    //  `]

    //change: function (opt, value, old, options) { ... },
    //
    //! +fn=change:opt:value:old:options
    //
    //#+tag_Options
    //* `@Base.change()`@
    //#
    //
    // Called to notify that the value of some `#_opt'ion has changed.
    //
    //#-changeAndOpt

    //! `, +fna=function ( opt, value[, options] )
    //
    //#+tag_Options
    //* `@Base.ifSet()`@
    //#
    //
    // Changes the value of one `#_opt'ion and returns `'true if it was
    // different from current.
    //
    //= true if events were fired (value different or `[options.forceFire`]
    //  set)`, false otherwise
    //
    //?`[
    //   sqim.ifSet('key', 'foo')   //=> true (changed)
    //   sqim.ifSet('key', 'foo')   //=> false (unchanged)
    //   sqim.ifSet('key', 'foo', {forceFire: true})    //=> true (forced change)
    // `]
    //
    //#ifSetSet
    // Calls `#normalize_OPT giving it `'value; if the result is different from
    // `[this._opt.opt`] (as reported by `@un:isEqual`@()) or if
    // `[options.forceFire`] was set - fires `#change_OPT event, then `#change.
    //
    //? You can take advantage of `#ifSet()'s return value to perform
    //  interlocking operations saving a call to `#get() (although of course it's
    //  not truly atomic):
    //  `[
    //   if (sqim.ifSet('eventsBound', true)) {
    //     // eventsBound was previously !_.isEqual(true) and it was now
    //     // changed to true so we can do what we need, once until it changes
    //     // to non-true again.
    //   }
    //  `]
    //  ...As a short form of writing:
    //  `[
    //   if (!sqim.get('eventsBound')) {
    //     sqim.set('eventsBound', true)
    //     // ...
    //   }
    //  `]
    //
    // Other notes:
    //* Use `#set() which returns `'this if you don't care for the return value
    //  but want method chaining.
    //* Use `#getSet() if you want to update options based on other options
    //  (e.g. increment a value).
    //* There's no `'set() version that writes multiple options at once as you
    //  would do in some kind of "sync" operation. You might be looking for
    //  `#assignResp() (useful when assigning an API response) or just do plain
    //  simple `[$.each(opts, model.set.bind(model))`].
    //* It is safe to change `#_opt from within `#normalize_OPT or `#change
    //  handlers - they are written to `[this._opt`] immediately but subsequent
    //  `#change_OPT and `#change events are deferred in FIFO fashion (first
    //  set - first fired). This preserves "incremental" updates order.
    //* See also Options overview (`#opt).
    //
    //? Overriding `#ifSet() is possible but most of the time `#normalize_OPT
    //  is what you need:
    //  `[
    //   var MySetter = Sqimitive.Base.extend({
    //     _opt: {
    //       readOnly: 'foo',
    //     },
    //
    //     events: {
    //       // Our handler will be called before the inherited ifSet() and
    //       // will prevent modification of this._opt.readOnly when they are
    //       // done via set/ifSet (i.e. the recommended way).
    //       //
    //       // Make sure not to hook '-set' because set() calls ifSet() and it
    //       // would be still possible to change 'readOnly' with
    //       // ifSet('readOnly', 'bar').
    //       '-ifSet': function (opt) {
    //         if (opt == 'readOnly') {
    //           throw new Error('You shouldn\'t really change what is called readOnly, you know?')
    //         }
    //       },
    //
    //       // normalize_OPT would be better though:
    //       normalize_readOnly: function () {
    //         throw new Error('You shouldn\'t really change what is called readOnly, you know?')
    //       },
    //     },
    //   })
    //  `]
    //
    //#optpropag
    // `'options can be used to propagate custom data to the handlers of
    // `#normalize_OPT(), `#change_OPT() and `#change(), and even back from
    // them (`'options is always an object, possibly empty):
    //[
    //   Sqimitive.Base.extend({
    //     change_foo: function (value, options) {
    //       options.foo = 123
    //     },
    //   })
    //
    //   var options = {}
    //   sqim.set('foo', options)
    //   alert(options.foo)       //=> 123
    //]
    ifSet: function (opt, value, options) {
      options || (options = {})
      var old = this._opt[opt]
      var func = 'normalize_' + opt
      this[func] && (value = this[func](value, options))
      this._opt[opt] = value

      if (options.forceFire || !_.isEqual(value, old)) {
        this._fireSet([opt, [value, old, options]])
        return true
      }
    },

    //! +ig
    // Fires events after changing a value. Handles recursion by deferring
    // nested calls until previous batch of change events has returned thus
    // calling them in order of changes so last change triggers events last.
    // For example:
    //[
    //    Sqimitive.Base.extend({
    //      _opt: {
    //        original: '123',
    //        linked: null,
    //      },
    //
    //      events: {
    //        change_original: function (value) { this.set('linked', value) },
    //        change: function (opt) { console.log('change of ' + opt) },
    //      },
    //    })
    //]
    //
    // If calling `[set('original', 'new')`] on such an object, logically you
    // would expect these events: `'change_original, `'change of `'original,
    // `'change_linked, `'change of `'linked. However, without deferred
    // handling `'change_original would trigger `'change_linked, then `'change
    // of `'linked and only then - `'change of `'original.
    //
    // This would be also a problem if changing the same option from within its
    // own event handler as `'change with the new value would be fired first
    // (since `#set() was called last), then when the original `#set() returns
    // it would also fire `'change but this time with the original (now old!)
    // value.
    _fireSet: function (item) {
      // Without reversing the stack if a handler set the same option.
      if (this._firingSet == null) {
        var list = this._firingSet = [item]
        try {
          while (item = list.shift()) {
            this.fire('change_' + item[0], item[1])
            this.fire('change', [item[0]].concat(item[1]))
          }
          this._firingSet = null
        } catch (e) {
          this._firingSet = null
          throw e
        }
      } else {
        this._firingSet.push(item)
      }
    },

    //! `, +fna=function ( [key,] sqim [, options] )
    //
    //#+tag_Nesting
    //* `@Base.nest()`@
    //#
    //
    // Adds a new child using a shorter syntax than `#nestEx().
    //
    //= `'sqim `- the added child
    //
    //> key string`, number`, omitted `- if omitted, `#_defaultKey() is used
    //  which by default returns `'sqim's `#_cid (unique instance identifier)
    //> sqim object `- new child to nest
    //> options object`, null/omitted `- keys `'key and `'child are set by
    //  `#nest()
    //
    // If you are overriding the "nesting" behaviour you should override
    // `#nestEx instead of `#nest which calls the former.
    //
    //#-nestExDesc
    nest: function (key, sqim, options) {
      if (key instanceof Object) {   // function ( sqim [, options] )
        Array.prototype.splice.call(arguments, 0, 0, this._defaultKey(key))
      }
      options = _.extend({}, arguments[2] || {}, {
        key:    arguments[0],
        child:  arguments[1],
      })
      return this.nestEx(options).child
    },

    //#+tag_Nesting
    //* `@Base.nestEx()`@
    //#
    //
    // Adds a new child to self (`#_children), `#unnest'ing the old one at the
    // same key (if any).
    //
    //= object `- `'options with added details about the operation
    //
    // The caller must set these keys in `'options:
    //> child object `- a sqimitive to nest
    //> key string`, number `- new `[options.child`]'s key in `#_children
    //
    // ` `#nestEx() mutates and returns `'options with updated keys:
    //> key string always
    //> previous object`, undefined
    //> changed bool `- whether any changes were done to the collection
    //
    // Subclasses and `#mixIn's can use other `'options keys - for example,
    // `@Sqimitive\Ordered`@ receives insertion order in `[options.pos`] and
    // sets `[options.index`] on return.
    //
    // After the call, old `#length of self could be determined as follows:
    //[
    //   this.length - (options.previous && options.changed)
    //]
    //
    // In most cases `#nest() is more convenient to use as it allows omitting
    // `[options.key`] and avoiding object notation for `'options.
    //
    //#nestExDesc
    //?`[
    //   sqim.nest(new Sqimitive.Base)          // _parentKey = 'p123' (the _cid)
    //   sqim.nest('key', new Sqimitive.Base)   // _parentKey = 'key'
    //   // Same:
    //   sqim.nestEx({key: 'key', child: new Sqimitive.Base})
    //
    //   sqim.unlist('key')
    //     // if sqim._owning is false - removes the child under 'key' if any,
    //     // else calls sqim.remove(); returns the found child or undefined
    // `]
    //
    //? When hooking `#nestEx() to listen for changes (newly added sqimitives),
    //  check `[options.changed`] to avoid triggering your update logic if
    //  `'child was already nested:
    //  `[
    //    Sqimitive.Base.extend({
    //      events: {
    //        // WRONG: will re-render even if the child was already there:
    //        nestEx: 'render',
    //
    //        // CORRECT:
    //        '+nestEx': function (options) {
    //          if (options.changed) { this.render() }
    //        },
    //
    //        // CORRECT since nestEx() returns the same options object as
    //        // given as its first argument:
    //        nestEx: function (options) {
    //          if (options.changed) { this.render() }
    //        },
    //      },
    //    })
    //
    //    var child = new Sqimitive.Base
    //    col.nest(child)   // calls render()
    //    col.nest(child)   // doesn't call
    //      // child is already under the same key (_defaultKey() returns
    //      // _cid which is constant for the lifetime of an object)
    //  `]
    //
    // Other notes:
    //* There's no `'nest() version that adds multiple children at once as you
    //  would do in some kind of "sync" operation. You might be looking for
    //  `#assignChildren() (useful when assigning an API response).
    //* As with other `'options-accepting methods (e.g. `#ifSet()), the
    //  `'options object may be used to propagate custom data to event listeners
    //  (`#optpropag); `'options are also passed through by `#assignChildren().
    //
    //## Internal operation
    // ` `#nestEx() checks and errors if `[options.key`] is an object of any
    // type (including `'null or `'undefined), or if `[options.child`] is of a
    // wrong class (not `#_childClass). Then it converts and sets
    // `[options.key`] to string, sets `[options.previous`] to the child
    // currently occupying `'key (possibly `'undefined) and sets
    // `[options.changed`] to `'false if `'previous is exactly `'child.
    //
    // If `[options.changed`] is `'false then exits, otherwise:
    //* If `#_owning is `'true (as it is by default), every child of `'this can
    //  have exactly one `#_parent thus forming a bi-directional tree (see
    //  `#chld). `#nestEx() calls `#unnest() on the old and new children (which
    //  call `#unnested() in turn) and updates `#_parent and `#_parentKey of
    //  the new child.
    //* If `#_owning is `'false, children don't know they are part of `'this.
    //  `#nestEx() simply calls `#unnested() on self if there was any previous
    //  child at `'key.
    //
    // Finally, if the child was nested (`[options.changed`] set), `#nestEx()
    // `#_forward's its `#_childEvents and, if `#_owning, calls new `'child's
    // `#owned() to notify it of the parent change.
    //
    // Observe that `#nestEx():
    //* Does nothing if `'child is already contained in this instance under the
    //  same `'key, i.e. when `[options.previous == child`] (`'changed is
    //  `'false).
    //* `#unnest's and nests `'child again if `'key differs.
    //#nestdup
    //* Always adds `'child if `'this is non-`#_owning so it may duplicate in
    //  `#_children. To avoid this hook `'=nestEx and call `'sup (`#evtpf) only
    //  if `[!this.contains(options.child)`] (`#util).
    nestEx: function (options) {
      var sqim = options.child

      if (!(sqim instanceof this._childClass)) {
        throw new TypeError('nestEx: Nesting Sqimitive of wrong class')
      } else if (typeof options.key == 'object' ||    // object or null.
                 options.key === undefined) {
        throw new TypeError('nestEx: Bad key given')
      }

      // Object keys are always strings; _parentKey mismatching actual key will
      // break indexOf() if it's used on an array like _.keys(this._children).
      var key = options.key += ''
      var prev = options.previous = this._children[key]

      if (options.changed = prev !== sqim) {
        if (this._owning) {
          prev && prev.unnest()   // --this.length
          sqim.unnest()
          this._children[key] = sqim
          sqim._parent = this
          sqim._parentKey = key
          ++this.length
        } else {
          this._children[key] = sqim
          prev ? this.unnested(prev) : ++this.length
        }

        this._forward('.', this._childEvents, sqim)
        this._owning && sqim.owned()
      }

      return options
    },

    //#+tag_Nesting
    //* `@Base._defaultKey()`@
    //#
    //
    // Return an automatic (implied) key for the given to-be child.
    //
    //= string`, number
    //
    // ` `#_defaultKey() is called by `#nest() and `#assignChildren() to
    // generate a key for the new child (`'sqim) that is about to be nested
    // into this instance.
    //
    // Default `#Base's implementation returns `'sqim's `#_cid.
    //
    // Make sure the returned value is constant for a given child so that if
    // nesting the same child with no explicit key several times it isn't
    // constantly re-nested due to a different key (see `#nestEx()).
    //
    // Warning: if you want to index children by some "ID" attribute (like
    // Backbone's `@bb:Collection`@ does) note that `#_parentKey `*will not`*
    // be automatically updated if that ID attribute changes. You should track
    // it and update the collection. For example (see `#_childEvents):
    //[
    //   var MyCollection = Sqimitive.Base.extend({
    //     _childEvents: ['.change_id'],
    //
    //     events: {
    //       // '.change_id' will only occur for "models" which _parent is this.
    //       // They will be re-nested with the key expanding to
    //       // this._defaultKey(sqim), basically doing nest(newID, sqim) - and
    //       // since this is an _owning collection, nest() will cause sqim to
    //       // be unnest()'ed and then nested with the new key.
    //       '.change_id': function (sqim) { this.nest(sqim) },
    //
    //       // Same but shorter using a masked function reference:
    //       '.change_id': 'nest.',
    //     },
    //
    //     _defaultKey: function (sqim) {
    //       return sqim.get('id')
    //     },
    //   })
    //]
    //
    //#-unordered
    // If you want to not just keep some attribute synced with `#_parentKey but
    // also maintain a specific order based on it - use the
    // `@Sqimitive\Ordered`@ `#mixIn.
    //
    //#-inBB
    // In Backbone, `@bb:Model-idAttribute`@ names the property used for a
    // similar purpose but in Sqimitive it's a function allowing flexible
    // automatic naming.
    _defaultKey: function (sqim) {
      return sqim._cid
    },

    //! +fn=owned +ig
    //
    //#+tag_Nesting
    //* `@Base.owned()`@
    //#
    //
    // Called after `'this instance has been `#nest'ed into an `#_owning
    // sqimitive (changed parents or got a first `#_parent).
    //
    // By the time `#owned is called `#_parent and `#_parentKey of self are
    // already set to new values.
    //
    // See also `#unnest() that gets called before `#_parent is
    // changed/removed.
    //
    //?`[
    //   var MyChild = Sqimitive.Base.extend({
    //     events: {
    //       // Will append this.el to parent's .some-point node as soon as
    //       // this instance gets a new parent. If you want to do this in
    //       // production though, look for the attachPath _opt'ion of
    //       // Sqimitive\jQuery.
    //       owned: function () {
    //         this.attach(this._parent.$('.some-point'))
    //       },
    //     },
    //   })
    // `]
    //
    // Other notes:
    //
    //#plainstub
    //* This method returns nothing.
    //* It should not be called directly.
    //#
    //* It's defined as `#stub in `#Base which lets Sqimitive remove this
    //  function instead of calling it as a handler doing nothing when a new
    //  handler is registered for this event (e.g. in a subclass via `#events
    //  as in the example above).
    owned: Core.stub,

    //#+tag_Events
    //* `@Base._forward()`@
    //#
    //
    // Forwards `'events occurring on `'sqim to `'this.
    //
    // Forwarding is done by firing "prefix + event_name" on `'this (the object
    // on which `#_forward() is called) with `'sqim pushed in front of original
    // event's arguments. `'event_name is a complete reference string as given
    // to `#parseEvent(), e.g. `[=foo_`].
    //
    // `#_forward() is used to set up `#_childEvents, with the `'prefix of
    // `[.`].
    //
    //?`[
    //   d._forward('.', ['render'], o)
    //   d.on('.render', function (o) { alert(o._cid) })
    //    // now whenever 'render' is fired on o, '.render' is fired on d where
    //    // it shows the _cid of the object where the original 'render'
    //    // occurred
    // `]
    //
    //?`[
    //   destination._forward('dlg-', ['change', '-render'], origin)
    // `]
    //  This example fires `[dlg-change`] and `[dlg--render`] events on
    //  `'destination (a Sqimitive) whenever `'change and `'render are fired on
    //  `'origin. `'-render simply means the forwarded events occur on
    //  `'destination before other handlers of `'origin are executed, as per
    //  `#evtpf.
    _forward: function (prefix, events, sqim) {
      _.each(events.concat(), function (event) {
        var name = prefix + event
        sqim.on(event, function () {
          Array.prototype.unshift.call(arguments, sqim)
          return this.fire(name, arguments)
        }, this)
      }, this)

      return sqim
    },

    //#+tag_Nesting
    //* `@Base.unlist()`@
    //#
    //
    // Removes a child by its key or instance from own `#_children.
    //
    //= object removed sqimitive`, undefined nothing found
    //
    //> key string or number key which to clear`,
    //  object instance to remove as per `#findKey()
    //
    //?`[
    //    collection.unlist('foo')    //=> Sqimitive or undefined
    //    collection.unlist(collection.nested('foo'))   // identical to above
    //    collection.unlist(child)    //=> Sqimitive (child) or undefined
    // `]
    //
    // If `#_owning is set (as it is by default) calls `#remove(), else deletes
    // the key in `#_children and calls `#unnested() on self.
    //
    // Does nothing if this `'key/child is not contained (returns `'undefined).
    //
    // See also `#unnest() which is called on the child (not on the parent
    // object). However, it's only usable in `#_owning collections since
    // there's no reverse child -> parent relationship in non-`#_owning mode.
    unlist: function (key) {
      if (key instanceof Object) {
        key = this.findKey(key)
      }

      var sqim = this._children[key += '']

      if (sqim) {
        if (this._owning) {
          sqim.remove()
        } else {
          delete this._children[key]
          --this.length
          this.unnested(sqim)
        }
      }

      return sqim
    },

    //#+tag_Nesting
    //* `@Base.unnest()`@
    //#
    //
    // Removes this instance from its `#_parent object, if any.
    //
    //= `'this
    //
    // ` `#unnest() does nothing if `#_parent of `'this is already `'null (i.e.
    // not owned).
    //
    // Note: it doesn't remove own `#el from its parent node - use `#remove()
    // for this.
    //
    //#-rmvsunn
    //
    //? A child reacting to its unnesting:
    //  `[
    //   var MyChild = Sqimitive.Base.extend({
    //     events: {
    //       '-unnest': function () {
    //         // this._parent and _parentKey are still set if this instance
    //         // was attached to any parent, otherwise they are null.
    //         this._parent && alert("I am about to be... unnested! :'(")
    //       },
    //
    //       unnest: function () {
    //         // At this point _parent and _parentKey are certainly null but
    //         // there's no telling if they will remain so - or if this
    //         // instance had any parent before unnest() was called.
    //         alert('I am now as free as the wind!')
    //       },
    //
    //       // In contrast to the above, here we can reliably determine if
    //       // this sqimitive was previously nested and if it was - do
    //       // something after it was unnested by calling the inherited
    //       // implementation via sup.
    //       '=unnest': function (sup) {
    //         var hadParent = this._parent != null
    //         sup(this, arguments)
    //         hadParent && alert('I was abducted but you saved me!')
    //         return res
    //       },
    //     },
    //   })
    //  `]
    //
    // Other notes:
    //* `#unnest() clears `#_parent and `#_parentKey and calls
    //  `[unnested(this)`] on the former parent.
    //* This effectively creates a new detached tree (if `'this has nested
    //  `#_children) or a leaf (if not) - more in Children concept (`#chld).
    unnest: function () {
      var parent = this._parent
      if (parent) {
        delete parent._children[this._parentKey]
        this._parent = this._parentKey = null
        --parent.length
        parent.unnested(this)
      }
      return this
    },

    //#+tag_Nesting
    //* `@Base.unnested()`@
    //#
    //
    // Called right after a child of self (`'sqim) was detached from its parent
    // (`'this).
    //
    // ` `#Base's implementation calls `'sqim.`#off(`'this) to unregister all
    // event handlers that might have been previously attached to the removed
    // child by this instance (provided they were not hardwired with `#fuse()
    // and used `[cx === this`]).
    //
    // By the time `#unnested is called `'sqim's `#_parent and `#_parentKey are
    // already `'null.
    //
    //?`[
    //   var MyParent = Sqimitive.Base.extend({
    //     events: {
    //       unnested: function (sqim) {
    //         alert('Whence thou goeth, my ' + sqim._cid + '...')
    //       },
    //     },
    //   })
    // `]
    //
    // Other notes:
    //* `#unnested() works for both `#_owning collections and not: for
    //  `#_owning it's called by `'sqim.`#unnest() while for non-`#_owning - by
    //  `'this.`#unlist().
    //#-plainstub
    unnested: function (sqim) {
      sqim.off(this)

      if (this.length < 0 && console && console.error) {
        console.error('Broken nesting: sqimitive.length below zero')
      }
    },

    //! `, +fna=function ( [key] )
    //
    //#+tag_Nesting
    //* `@Base.nested()`@
    //#
    //
    // Returns a single child by key or instance or all `#_children (if no
    // argument).
    //
    //= object all children if `'key not given`, object the found child`,
    //  undefined if given `'key/child isn't nested in `'this
    //
    //> key omitted return a shallow copy of `#_children`, string or number
    //  return the object at that key (case-sensitive) or `'null`, object
    //  return the argument itself if this object is nested as per `#findKey()
    //
    //?`[
    //   sqim.nested()   //=> {childKey1: Sqimitive, ...}
    //   sqim.nested('childKey1')    //=> Sqimitive by its key
    //   sqim.nested('foobarbaz!')   //=> undefined - key not found in sqim._children
    //
    //   var child = sqim.nested('childKey1')
    //   sqim.nested(child)          //=> child by its object
    //   sqim.nested(new Sqimitive)  //=> undefined - object not listed in sqim._children
    // `]
    //
    //? The object `'key form allows using `#nested() as `@un:includes`@()
    //  (`#util) to check if a child is part of the collection:
    //  `[
    //    if (col.nested(sqim)) {
    //      // ...
    //    }
    //  `]
    //
    //#parentkeyowning
    // Note: key only matches the child's `#_parentKey if `'this is `#_owning,
    // else it may differ.
    //
    //#-unordered
    // Order of keys in the returned `#_children's copy may be unpredictable.
    //
    //#nestedslice
    // ` `#nested() without arguments returns an object - children with keys.
    // `#slice() returns an array - children only, dropping their keys.
    nested: function (key) {
      if (!arguments.length) {
        return _.extend({}, this._children)
      } else if (key == null) {
        // Return undefined - neither keys nor children can be null.
      } else if (!(key instanceof Object)) {
        return this._children[key + '']
      } else if (this.findKey(key) != null) {
        return key
      }
    },

    //! `, +fna=function ( [start [, end]] )
    //
    //#+tag_Utilities
    //* `@Base.slice()`@
    //#
    //
    // Treats this instance's `#_children as an ordered array and returns a
    // portion of it.
    //
    // `'start defaults to 0, `'end - to `#length + 1.
    //
    // Attention: the `'end index is not included into result. If `[start ==
    // end`] then an empty array is always returned.
    //
    //?`[
    //  slice()       // get all children; toArray() does the same
    //  slice(1, 2)   // get 2nd child as an array
    //  slice(-1)     // get last child as an array; last() is more convenient
    //  slice(5, 8)   // get 6th and 7th children as an array; no 8th!
    //  slice(0, 0)   // start == end - always an empty array
    //  slice(1, -1)  // get all children except the first and last
    // `]
    //
    // Along with `#length, `#slice() makes Sqimitives look like an array and
    // so `#slice()'s interface is the same as `'Array's `'slice():
    // `@https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice`@
    //
    //#-nestedslice
    //
    //# Unordered objects warning
    //#-unordered
    // ` `#slice() may return entries in arbitrary order.
    //
    // It should not be used unless special measures were taken to make this
    // instance properly ordered or if the caller doesn't care for child order
    // (but then it should never use a positive `'start as there are no
    // guarantees which child will be at that index).
    //
    // Use either the `#Ordered `#mixIn (and see `#at()) or override `#slice()
    // to sort `#_children based on some criteria before taking a portion of it
    // (this may be slower than `#Ordered that maintains sort order as children
    // come and go without resorting on every call to `#slice()):
    //[
    //  events: {
    //    '=slice': function (sup, start, end) {
    //      var sorter = function (a, b) { return a.get('pos') - b.get('pos') }
    //      return sup(this).sort(sorter).slice(start, end)
    //      // WRONG: do not use any #util functions to avoid recursion:
    //      return this.toArray()...
    //    }
    //  }
    //]
    //
    // Making `#slice() "ordered" is enough to make the Sqimitive ordered
    // because `#slice is used by all other functions that treat `#_children as
    // an array (`'each(), `'find() and others, see `#util).
    slice: function (start, end) {
      // _.values(), _.toArray(), Object.keys(), etc. return values in
      // arbitrary order. The Base Sqimitive is unordered.
      //
      // Warning: do not replace _.values() with this.toArray() since the
      // latter calls this.slice().
      return _.values(this._children).slice(start, end)
    },

    //! `, +fna=function ( sqim | func [, cx] )
    //
    //#+tag_Nesting tag_Utilities
    //* `@Base.findKey()`@
    //#
    //
    // Returns the string key of the given child (in `#_children of self) or of
    // the first child matched by the callback, or `'undefined.
    //
    // ` `#findKey() has two call forms:
    //
    //* `[function (sqim)`] - If `'sqim is part of `#_children, returns its key.
    //
    //* `[function (func [, cx])`] - Call `'func in the `'cx context (`'this if
    //  `'null or omitted) giving it the usual iterator's set of arguments:
    //  `[childObject, childKey, childrenObject`] (as in Underscore, etc.).
    //  Returns `'childKey as soon as `'func returns a truthy value.
    //
    //  Warning: do not modify `'childrenObject as it's the `#_children itself.
    //
    // In any case, `#findKey() returns `'undefined if no match was found.
    //
    //?`[
    //   col.findKey(col.first())   // get key of the first child
    //   col.findKey(ch => ch.get('enabled'))   // get key of the first "enabled" child
    // `]
    //
    // Other notes:
    //* `#findKey() is similar to `'findIndex() `#util.
    //* It returns an arbitrary key if `'this has duplicate children
    //  (non-`#_owning), even if `#Ordered.
    //
    //#-parentkeyowning
    //
    //#-unordered
    // Either `'func() should match exactly 0 or 1 children or the caller
    // should not care which of the matched ones `#findKey() returns (since it
    // may return a different matching child every time).
    findKey: function (func, cx) {
      var eq = func instanceof Object
      for (var key in this._children) {
        if (eq
              ? (this._children[key] == func)
              : func.call(cx || this, this._children[key], key, this._children)) {
          return key
        }
      }
    },

    //#+tag_Utilities
    //* `@Base._()`@
    //#
    //
    // Returns wrapped `#_children array for chaining with your utility library.
    //
    // Chaining is useful for transforming the value (array of children)
    // several times. Call `'value() to obtain the final value. If you're only
    // doing a single transformation - just call it directly on `'this since
    // most of them are exposed as methods (see `#util).
    //
    // Note: Underscore (see `@un:chain`@()) and LoDash support chaining but
    // NoDash doesn't and `#_() will error.
    //
    // The reference to the utility library itself (the global `[_`] object) is
    // accessible via `[Sqimitive._`].
    //
    //?`[
    //   col._().filter(...).sort(...).value()    //=> array of children
    //
    //   // Same as:
    //   var _ = Sqimitive._
    //   _.chain(col.toArray()).filter(...).sort(...).value()
    //
    //   // Same as:
    //   _.sort(col.filter(...), ...)
    // `]
    _: function () {
      return _.chain(this.slice())
    },

    //#+tag_Nesting tag_Lifecycle
    //* `@Base.remove()`@
    //#
    //
    // Removes `#el and calls `#unnest().
    //
    //#baseRemove
    //= object `- `'this
    //
    //##rmvsunn
    // Use `#unnest() when an object is temporary elided from the hierarchy
    // (e.g. because it's changing parents). Use `#remove() when it's
    // completely destroyed and its "view" (DOM node, etc.) is no longer
    // needed. By convention, `#remove() is also used on `#el-less objects
    // (where it's identical to `#unnest() in effect) to convey the intention
    // of destroying them.
    //
    //?`[
    //   var child = new Sqimitive.Base({el: '<p>Some text.</p>'})
    //   var parent = new Sqimitive.Base({el: '<article>'})
    //   parent.nest(child).attach(parent.el)
    //     // now we have <article><p>Some text.</p></article>
    //
    //   child.unnest()
    //     // we still have <article><p>Some text.</p></article> even though
    //     // child is no more listed under parent._children
    //
    //   // But if we would have done this:
    //   child.remove()
    //     // we would have <article></article> with the child removed from
    //     // both the parent's _children list and from its the parent's el
    // `]
    //
    //##
    //
    //#-elstub
    //
    // ` `#Base's `#remove() simply calls `#unnest().
    remove: function () {
      return this.unnest()
    },

    //! `, +fna=function ( resp [, options] )
    //
    //#+tag_Nesting
    //* `@Base.assignChildren()`@
    //#
    //
    // Unserializes children: updates own `#_children based on data of
    // arbitrary format.
    //
    // Merges external "response" `'resp into `#_children by updating existing
    // nested sqimitives and adding new and/or removing unlisted ones. `'resp
    // is a list of data objects, one object per every child:
    //[
    //   resp = [ {caption: 'foo', body: 'bar'}, {caption: 'bazz'}, ... ]
    //            ^^^ the first child's data ^^  ^ the second child
    //]
    //
    // `'options keys used by this method:
    //> classFunc function returning constructor (class) for new children;
    //  receives response data object`,
    //  `'null/omitted use `#_childClass of `'this
    //> eqFunc `'null/omitted if `'keepMissing then do nothing, else remove all
    //  children prior to assignment`,
    //  string option name for `#get()`,
    //  function `[(child, opt)`] returning `'true when the given child is the
    //  "same" as one of `'resp data objects and should be kept and have its
    //  `#_opt updated without creating a new child for that `'opt
    //> keepMissing true to keep children "not present" in `'resp (as reported
    //  by `'eqFunc) unchanged,
    //  false to ensure all `#_children left after `#assignChildren() were
    //  present in `'resp and that others were `#unlist()ed from self
    //> keyFunc `'null/omitted use `#_defaultKey() of `'this (returns `#_cid by
    //  default)`,
    //  function returning key (string or number); receives a constructed Sqimitive
    //  before it's `#nest'ed
    //
    //= array `[[nested, unlisted]`] `- `'nested is an array of `#nestEx()
    //  return values, `'unlisted is an object of child Sqimitives (by their
    //  keys in `'this) that were not found in `'resp.
    //
    //  If `[options.eqFunc`] was unset then `'unlisted is either always `[{}`]
    //  (`[options.keepMissing`] set) or the copy of `#_children before
    //  `#assignChildren().
    //
    //#assignchre
    // ` `#assignChildren() "unserializes" own `#_children objects while
    // `#assignResp() "unserializes" own `#_opt'ions ("attributes").
    //
    //#
    //
    //?`[
    //   var MyList = Sqimitive.Base.extend()
    //
    //   var MyItem = Sqimitive.Base.extend({
    //     _opt: {foo: ''},
    //   })
    //
    //   var list = new MyList
    //   var item1 = new MyItem({foo: 'existing'})
    //
    //   list.nest(item1)
    //   var resp = [{foo: 'incoming#1'}, {foo: 'existing'}]
    //   list.assignChildren(resp)
    //     //=> [ [item with 'foo' of 'incoming#1', item with 'foo' of 'existing'], {item1} ]
    //     // item1 was removed from list and the latter got two new children
    //     // with 'foo' of 'incoming#1' and 'existing' (the latter has
    //     // identical _opt with the removed item but a new object was
    //     // nevertheless created and nested)
    //
    //   // Let's restore the list.
    //   list.invoke('remove')
    //   list.nest(item1)
    //
    //   list.assignChildren(resp, {eqFunc: function (sqim, opt) {
    //     return sqim.get('foo') == opt.foo
    //   }})
    //     //=> [ [item with 'foo' of 'incoming#1'], {} ]
    //     // Now item1 wasn't removed because the function we've passed
    //     // compared its foo option with resp's foo value and returned true
    //     // to indicate that existing child represents the same entity as the
    //     // incoming data object. In addition to item1, list got one new item
    //     // with foo of 'incoming#1'.
    //
    //   // We can use this short form of eqFunc if we're simply matching some
    //   // option with a field by the same name in resp's objects:
    //   list.assignChildren(resp, {eqFunc: 'foo'})
    // `]
    //
    //?`[
    //   list.assignChildren([], {keepMissing: true})
    //     //=> [ [], {} ]
    //     // nothing done as there were no items in resp
    //
    //   list.assignChildren([])
    //     //=> [ [], {old list._children} ]
    //     // the list was cleared as keepMissing defaults to false
    // `]
    //
    //?`[
    //  assignChildren([ {key: 'foo'}, {key: 'bar'} ], {eqFunc: 'key'})
    //    // adds/updates 2 children with _opt = {key: 'foo'} and {key: 'bar'};
    //    // "same" sqimitives are those having the same value for the 'key'
    //    // option and data object's 'key' field
    //
    //  assignChildren([ {key: 'foo'}, {key: 'bar'} ],
    //                 {eqFunc: function (sqim, opt) { return sqim.get('key') == opt.key }})
    //    // identical to the above
    //
    //  assignChildren({ foosh: {key: 'foo'}, barrsh: {key: 'bar'} }, {eqFunc: 'key'})
    //    // identical to the above (resp is an object, keys ignored)
    //
    //  assignChildren({ foosh: {key: 'foo'}, barrsh: {key: 'bar'} },
    //                 {eqFunc: 'key', keepMissing: true})
    //    // identical to the above but keeps old children
    //
    //  assignChildren([ {key: 'foo'}, {key: 'bar'} ])
    //    // similar but always removes all nested sqimitives and adds 2 new
    //    // ones
    //
    //  assignChildren(..., {onlyDefined: true, forceFire: true})
    //    // passes onlyDefined to assignResp() and forceFire to set()
    // `]
    //
    //# The operation
    // First, `#assignChildren() determines which `'resp objects are new and
    // which are "serialized" forms of one of the existing `#_children by
    // calling `[options.eqFunc`] with combinations of `[(child, obj)`] for
    // every child and data object. `'eqFunc should return `'true exactly for
    // none or one such combination. If `[options.eqFunc`] is a string then
    // it's assumed that children are identified by an `#_opt'ion by this name
    // (like "id"), mapping to data objects with the same value of this
    // property:
    //[
    //   var resp = [ {id: 1, caption: 'foo'}, {id: 2, caption: 'bar'} ]
    //   var child = new Sqimitive.Base({id: 1, caption: 'quux'})
    //   col.nest(child)
    //   col.assignChildren(resp)
    //     // col now has 2 children: id=1 'foo', id=2 'bar'
    //     // but the first is a new object, not our child object even though
    //     // it's the same entity (given the same ID) - we should preserve it
    //     // since it may have event listeners set up by other objects
    //
    //   // But if we'd have done this:
    //   col.assignChildren(resp, {eqFunc: 'id'})
    //     // col would have 2 children with the same _opt values
    //     // but the first would be the same child as nested in the beginning
    //     // so its event listeners would be preserved, just 'caption' updated
    //
    //   // String eqFunc is the same as:
    //   col.assignChildren(resp, {eqFunc: function (child, obj) {
    //     return child.get('id') == obj.id
    //   }})
    //]
    //
    // To recap: children keys (`#_parentKey) are not used when linking
    // `#_children and `'resp objects unless you code this in your
    // `[options.eqFunc`].
    //
    // If `[options.eqFunc`] is unset then all existing children are
    // `#unlist()ed unless `[options.keepMissing`] is set - in this case they
    // are preserved and for each item in `'resp a new child is nested.
    // However, on duplicate keys (`[options.keyFunc`]) only the last child is
    // kept and others are removed as per the usual behaviour of `#nest()
    // (`#assignChildren() doesn't handle this specially and such
    // "removed-by-nesting" children are not reflected in the returned array).
    //
    // Then, for data objects mapped to an existing child `#assignChildren()
    // calls `#assignResp() on that child giving it the mapped data object to
    // essentially update it. For unmapped, it creates a new Sqimitive as
    // `[options.classFunc`], calls `#assignResp() and `#nest's it under the
    // key of `[options.keyFunc`].
    //
    // Finally, if `[options.keepMissing`] is unset `#assignChildren() removes
    // all children which were neither updated not created during this call. If
    // it's set then they are just left unchanged as `#_children of `'this.
    //
    //# Propagation of `'options
    //##assignoprop
    // ` `#assignChildren() and `#assignResp() call/fire several methods/events
    // (`#evt), all of which receive the same `'options object. This allows
    // changing those methods' options as well as propagating data back from
    // them to the original caller (see `#optpropag).
    //
    //##
    //
    // In particular, `#assignChildren() calls `#assignResp(),
    // `#set()/`#ifSet(), `#nestEx() firing `#normalize_OPT, `#change_OPT and
    // `#change, as well as `#nestEx-produced events (however, for `#nestEx()
    // a shallow-copy of `'options is given).
    //
    //[
    //   sqim.assignChildren({a: 1, b: 2}, {schema: api3, forceFire: true})
    //     // passes schema to assignResp() instead of _respToOpt and
    //     // passes forceFire to set() to always fire change events
    //]
    //
    // Additionally, this method sets `[options.assignChildren`] to `'true so
    // you can determine when an option is being set as a result of this method
    // call:
    //[
    //   Sqimitive.Base.extend({
    //     events: {
    //       change_caption: function (value, options) {
    //         // Don't refresh the view when unserializing.
    //         if (!options.assignChildren) { this.render() }
    //       },
    //     },
    //   })
    //
    //   sqim.assignChildren([{caption: 'foo'}, ...])
    //   sqim.render()    // call it once after finishing the update.
    //]
    //
    //# Format of `'resp
    // `'resp is either an array of objects or an "object of objects" - then
    // it's converted using `@un:values`@() ignoring the keys.
    //
    //   Sqimitive prior to v1.2 allowed `'resp to be an object with the `'data
    //   key to integrate with Python's Flask framework but it's no longer
    //   supported - see
    //   `@https://flask.palletsprojects.com/en/1.1.x/security/#json-security`@.
    //
    //#-unordered
    // ` `#assignChildren() may process `'resp and `#nest/update children in
    // any order. If you need specific order then pass `'resp as an array
    // instead of object.
    //
    //# Other notes
    //* There's no `'assignChildren() version that takes ready-made objects
    //  (like Backbone's `@bb:Collection-set`@()) because many questions arise:
    //  do you need to keep old duplicate children or replace them with
    //  supplied objects and what to do with event listeners on the old
    //  children if you do replace them, or with listeners on the new if you
    //  don't; what to consider "duplicate" (some ID attribute? exact same
    //  object?), do you want to keep old options, etc. etc. Instead of making
    //  Sqimitive figure or enforce them on you it just lets you implement
    //  exactly what you need.
    //#assignname
    //* This method is named "assign" to emphasize the fact that data may
    //  undergo transformations before being assumed by the sqimitive.
    //
    //#
    assignChildren: function (resp, options) {
      options || (options = {})
      options.assignChildren = true
      var eqFunc = options.eqFunc
      var keyFunc = options.keyFunc || this._defaultKey

      if (eqFunc == null) {
        var retUnlisted = options.keepMissing ? {} : this.nested()
        options.keepMissing || this.each(this.unlist, this)
      } else if (typeof eqFunc != 'function') {
        var field = eqFunc
        eqFunc = function (sqim, opt) { return opt && sqim.get(field) == opt[field] }
      }

      _.isArray(resp) || (resp = _.values(resp))
      var toRemove = eqFunc ? this.nested() : {}
      var nested = []

      for (var i = 0; i < resp.length; i++) {
        var found = false

        for (var key in toRemove) {
          if (eqFunc.call(this, toRemove[key], resp[i])) {
            toRemove[key].assignResp(resp[i], options)
            delete toRemove[key]
            found = true
            break
          }
        }

        if (!found) {
          // It's hard/impossible to tell apart a regular function and a
          // constructor so if you want to specify a class, create a function
          // that just returns that class. In ES6 that's simply () => MyClass.
          var cls = options.classFunc
            ? options.classFunc.call(this, resp[i]) : this._childClass
          var child = (new cls).assignResp(resp[i], options)
          var res = this.nestEx(_.extend({}, options, {
            key:    keyFunc.call(this, child),
            child:  child,
          }))
          // Can't use _parentKey if not _owning.
          nested.push(res)
        }
      }

      options.keepMissing || _.each(toRemove, this.unlist, this)
      return [nested, retUnlisted /* when !eqFunc */ || toRemove]
    },

    //! `, +fna=function ( resp [, options] )
    //
    //#+tag_Options
    //* `@Base.assignResp()`@
    //#
    //
    // Unserializes options: updates own `#_opt based on a data object of
    // arbitrary format.
    //
    // ` `#assignResp() calls `[options.schema`]'s empty key and then `#set()s
    // own `#_opt based on transformation rules (`[options.schema`]) for the
    // external input `'resp (e.g. an API response). `'resp is an object where
    // one member usually represents one option (but this is not a
    // requirement).
    //
    // `'options keys used by this method:
    //> schema null/omitted to use `#_respToOpt`, object in `#_respToOpt format
    //> onlyDefined null/omitted to call `#set(key) for every key in `'resp not
    //  listed in `'schema`, true to ignore such keys
    //
    //= `'this
    //
    //#-assignchre
    //
    //? In the simplest case when `#_respToOpt is not overridden (i.e. is
    //  `[{}`]) and `'onlyDefined is unset `#assignResp() acts as a
    //  "multi-`#set()":
    //  `[
    //  sqim.assignResp({date: '2000-01-01', id_key: '123'})
    //    // without _respToOpt, schema and onlyDefined is equivalent to:
    //    // sqim.set('date', '2000-01-01').set('id_key', '123')
    //
    //  // Works the same regardless of sqim's _respToOpt.
    //  sqim.assignResp({date: '2000-01-01', id_key: '123'}, {schema: {}})
    //  `]
    //
    //#assignrespvs
    //? Using `#assignResp() in conjunction with `#_respToOpt to "blend" into
    //  this object a typical JSON response from a backend:
    //  `[
    //   var MyModel = Sqimitive.Base.extend({
    //     _opt: {
    //       date: new Date(0),
    //       id_key: 0,
    //     },
    //
    //     _respToOpt: {
    //       // Create a Date object from the incoming value:
    //       date: function (value, key) {
    //         return [key, new Date(value)]
    //       },
    //
    //       // Pass the value through to _opt as is.
    //       id_key: true,
    //     },
    //
    //     events: {
    //       change_id_key: 'render',
    //
    //       '=normalize_id_key': function (sup, value) {
    //         value = parseInt(value)
    //         if (isNaN(value)) { throw new Error('What kind of ID is that?') }
    //         return value
    //       },
    //     },
    //   })
    //
    //   var sqim = new MyModel
    //
    //   // Since it's using regular set() to assign new values all the usual
    //   // normalize/change events are fired. In particular, MyModel's
    //   // normalize_id_key and then change_id_key are called. As a result
    //   // _opt setting happens exactly the same as if it was done with the
    //   // usual set() from the outside.
    //   sqim.assignResp({date: '2000-01-01', id_key: '123', bazzz: 'Ouch!'})
    //
    //   // Now sqim.get() is {date: new Date('2000-01-01'), id_key: 123, bazzz: 'Ouch!'}.
    //   // date was turned into a Date object thanks to the transformation
    //   // function in _respToOpt.
    //   // id_key was turned into a number thanks to normalize_id_key.
    //   // bazzz was assigned too because we didn't pass {onlyDefined: true}.
    //  `]
    //
    //? If you have several API routes with different formats but logically the
    //  same data (so they unserialize to the same object), pass
    //  `[options.schema`] without changing `#_respToOpt on run-time:
    //  `[
    //    sqim.assignResp(apiResp1, {schema: {id: 'id_key'}})
    //      // set('id_key', apiResp1.id) and set other keys as is
    //
    //    var schema = _.extend({extra: s => ['info', JSON.parse(s)]}, sqim._respToOpt)
    //    sqim.assignResp(apiResp2, {schema})
    //      // set('extra', JSON.parse(apiResp2.info)) and
    //      // handle other keys according to sqim._respToOpt
    //  `]
    //
    //  `'schema is not meant for changing `'resp's shape, e.g. from array
    //  `[[['opt', 'name'], ...]`] to object `[{opt: 'name', ...}`] - declare a
    //  specialized public method instead of making your consumers pass
    //  `'schema or know how to treat the data:
    //  `[
    //    assignBillingResponse: function (resp) {
    //      this.assignResp(_.object(resp), {
    //        schema: this._billingRespToOpt,
    //        onlyDefined: true,
    //      })
    //    }
    //  `]
    //
    // Having `[options.onlyDefined`] unset is similar to having all keys in
    // `'resp missing from `#_respToOpt listed there with the value of `'true:
    //[
    //   Sqimitive.Base.extend({
    //     _respToOpt: {a: false, b: true},
    //   })
    //
    //   sqim.assignResp({a: 1, b: 2, c: 3}, {onlyDefined: true})
    //     // _opt is {b: 2}
    //
    //   sqim.assignResp({a: 1, b: 2, c: 3})
    //     // _opt is {b: 2, c: 3}
    //     // as if _respToOpt had also {c: true}
    //]
    //
    //? Override `#assignResp() to force skipping `'resp keys not defined in
    //  `#_respToOpt - handy if this method is used directly by API consumers,
    //  i.e. there's no specialized "unserialize()":
    //  `[
    //    var MySqimitive = Sqimitive.Base.extend({
    //      events: {
    //        '=assignResp': function (sup, resp, options) {
    //          return sup(this, [resp, _.extend(options || {}, {onlyDefined: true})])
    //        },
    //      },
    //    })
    //  `]
    //
    //# Propagation of `'options
    //#-assignoprop
    //
    // In particular, `#assignResp() calls `#set()/`#ifSet() firing
    // `#normalize_OPT, `#change_OPT and `#change.
    //[
    //   sqim.assignResp({a: 1, b: 2}, {forceFire: true})
    //     // passes forceFire to set() causing change events of a and/or b
    //     // to fire even if they had the same values before assignResp()
    //]
    //
    // Additionally, this method sets `[options.assignResp`] to `'true so you
    // can determine when an option is being set as a result of this method
    // call (see `#assignoprop for an example). If called by
    // `#assignChildren(), `'options has both `'assignChildren and `'assignResp
    // set.
    //
    //# `'normalize/`'change vs `#_respToOpt
    // You may notice that `'=normalize_id_key and `'_respToOpt's `'date in
    // example `#assignrespvs fulfill a similar purpose. That example could
    // have been written like this:
    // `[
    //  var MyModel = Sqimitive.Base.extend({
    //    _respToOpt: {
    //      date: function (value, key) {
    //        return [key, new Date(value)]
    //      },
    //
    //      id_key: function (value, key) {
    //        value = parseInt(value)
    //        if (isNaN(value)) { throw new Error('What kind of ID is that?') }
    //        return [key, value]
    //      },
    //    },
    //
    //    events: {
    //      change_id_key: 'render',
    //      // No '=normalize_id_key', moved to _respToOpt.
    //    },
    //  })
    // `]
    // Or like this:
    // `[
    //  var MyModel = Sqimitive.Base.extend({
    //    _respToOpt: {
    //      // No date, became normalize_date.
    //    },
    //
    //    events: {
    //      change_id_key: 'render',
    //
    //      '=normalize_date': function (sup, value) {
    //        return new Date(value)
    //      },
    //
    //      '=normalize_id_key': function (sup, value) {
    //        value = parseInt(value)
    //        if (isNaN(value)) { throw new Error('What kind of ID is that?') }
    //        return value
    //      },
    //    },
    //  })
    // `]
    //
    // Indeed, `#normalize_OPT and others are fired by `#ifSet() and they occur
    // during `#assignResp() because the latter is calling `#set() internally.
    // However, `#_respToOpt is only used by `#assignResp() so both of the
    // above examples have issues:
    //* If there is no `'=normalize_id_key then `#assignResp() works as
    //  expected while `[set('id_key', 'zabzab')`] doesn't trigger an error.
    //* If there are no `'_respToOpt rules then `#assignResp() again works as
    //  expected but `[set('date', new Date)`] results in `[_opt.date`]
    //  becoming `[new Date(new Date)`].
    //
    // Additionally, `#assignResp() allows different "unserialization profiles"
    // by passing rules in `[options.schema`] rather than defining them in
    // `#_respToOpt.
    //
    //#-unordered
    // ` `#assignResp() may process `'resp and call `#set() in any order.
    //
    //# Other notes
    //#-assignname
    assignResp: function (resp, options) {
      options || (options = {})
      options.assignResp = true

      var schema = options.schema || this._respToOpt
      var set = schema[''] && schema[''].call(this, resp, options)
      _.each(set || {}, function (v, k) { this.set(k, v, options) }, this)

      for (var key in resp) {
        var value = resp[key]
        var opt = schema[key]
        opt === undefined && (opt = !options.onlyDefined)
        opt === true && (opt = key)

        if (typeof opt == 'function') {
          opt = opt.call(this, value, key, resp, options) || []
          value = opt[1]
          opt = opt[0]
        }

        opt == false || this.set(opt, value, options)
      }

      return this
    },

    //#+tag_Events
    //* `@Base.bubble()`@
    //#
    //
    // Triggers an event on every parent, recursively.
    //
    // Sends `'event with arguments `'args upstream - to `'this.`#_parent, to
    // that parent's parent and so on. Does nothing if `#_parent is unset.
    //
    //#bubsin
    //= this
    //
    // If `'fireSelf is `'true then first fires `'event on self (by default it
    // doesn't).
    //
    // ` `#bubble() sends the event upstream while `#sink() sends it
    // downstream. However, the first walks `#_owning sqimitives (since it's
    // using `#_parent) while the second works for any mode (since it's using
    // `#_children).
    //
    // Since both call methods, not necessary events, you can "recursively"
    // call methods as well (which may or may not be events, see `#evt).
    //
    //#
    //
    // ` `#bubble() is very much like DOM's event bubbling except that it
    // happens on sqimitives, not on their `#el's.
    //
    // While it should not be abused because it makes the execution flow less
    // obvious (much like `'goto or `'longjmp()), it's indispensible for
    // propagating generic signals like errors and logs to whoever is on top.
    //
    //?`[
    //   // Causes self and all parent sqimitives to be rendered:
    //   sqim.bubble('render', [], true)
    //
    //   // Recursively calls invoke('render') on all parents which results
    //   // in them calling attach() on children (given the default behaviour
    //   // of attach()):
    //   sqim.bubble('invoke', ['attach'])
    //
    //   // We can use it to obtain data from "some" (unspecified) _owning
    //   // object:
    //   var out = {}
    //   sqim.bubble('giveMeData', [out])
    //   alert(out.data)
    //   // The above will work if any parent has a handler like this:
    //   parent.on('giveMeData', function (out) { out.data = 'here goes' })
    // `]
    bubble: function (event, args, fireSelf) {
      fireSelf && this[event] && this[event].apply(this, args)
      this._parent && this._parent.bubble(event, args, true)
      return this
    },

    //#+tag_Events
    //* `@Base.sink()`@
    //#
    //
    // Triggers an event on every child, recursively.
    //
    // Sends `'event with arguments `'args to all nested `#_children, to nested
    // children of those children and so on.
    //
    //#-bubsin
    //
    // Note that it might get quite intense with heavy nesting.
    //
    //?`[
    //   // Recursively causes all nested views and self to be rendered:
    //   sqim.sink('render', []. true)
    //
    //   // Recursively calls remove() on self, all children and their
    //   // children, removing every single sqimitive from its parent (useful
    //   // when removing a parent el doesn't automatically free resources of
    //   // its children like it does in DOM):
    //   sqim.sink('invoke', ['remove'], true)
    //
    //   // We can use it to serialize the entire tree:
    //   var serialized = []
    //   sqim.sink('saveTo', [serialized])
    //   localStorage.setItem('saved', JSON.stringify(serialized))
    //   // Now if children implement something like this then serialized will
    //   // contain a portable representation of the current hierarchy (without
    //   // self):
    //   child.on('saveTo', function (ser) { ser.push(this.get()) })
    // `]
    sink: function (event, args, fireSelf) {
      fireSelf && this[event] && this[event].apply(this, args)
      this.invoke('sink', event, args, true)
      return this
    },
  })

  // Setting reference to self in the instance property. Can't be set when
  // extending because the target class doesn't exist yet.
  Sqimitive.Base.prototype._childClass = Sqimitive.Base

  // Static fields of Sqimitive.Base.
  Sqimitive.Base._mergeProps.push('_opt', 'elEvents', '_respToOpt')
  Sqimitive.Base._shareProps.push('_childClass')

  //! +cl=Sqimitive.Ordered
  //
  // A `#mixIn that transparently makes Sqimitive reliably ordered.
  //
  //* Provide explicit child positions via new `#nestEx() `'pos option.
  //* Listen for `#_repos() to react to children changing positions.
  //* Override `#_sorter() to maintain a custom sort order.
  //
  //?`[
  //  obj.mixIn(Sqimitive.Ordered)    // add to an instance (must be empty!)
  //  Class.mixIn(Sqimitive.Ordered)  // or add to a class
  //
  //  // Or add to a class when declaring it:
  //  var Class = Sqimitive.Base.extend({
  //    mixIn: [Sqimitive.Ordered],
  //    // ...
  //  })
  // `]
  //
  // JavaScript objects are unordered, even if it appears to work the way you
  // expect (it's very browser-specific). For example: `[Object.keys({9: 0, 1:
  // 0})`] returns `[[1, 9]`]. Since `@Sqimitive\Base`@ stores children in an
  // object (`#_children), sqimitives are unordered by default; this affects
  // `#nested(), `'toArray() (`#util) and many other functions.
  //
  // ` `#Ordered maintains order of children without disrupting the standard
  // API but makes nesting and unnesting on such sqimitives slower (access time
  // is unaffected).
  //
  // ` `#Ordered supports any `#_owning mode (but `#_owning works faster). Like
  // with `#Base, duplicate children may appear if `#_owning is unset - to
  // disallow this wrap `'=nestEx in a check with `'contains() (see `#nestdup).
  Sqimitive.Ordered = {
    // Holds positional information about objects contained within this instance.
    //
    //= array of object `- keys:
    //  `> child object `- a Sqimitive in `#_children
    //  `> key string `- `'child's key in `#_children
    //  `> pos any `- the value from `#nestEx's `[options.pos`]
    //
    // ` `#_ordered is a properly sorted array of `#_children, in order
    // determined by `#_sorter(). It's kept in sync with `#_children
    // automatically.
    //
    // The format of `#_ordered objects conveniently matches that accepted by
    // `#nestEx():
    //[
    //   // Assuming both collections are Ordered and _owning, removes
    //   // the first child from col1 and inserts it in col2, preserving
    //   // the same position and key:
    //   col2.nestEx(col1.at(0))
    //]
    //
    // You're advised against accessing `#_ordered at all. Instead, use `#at().
    _ordered: [],

    events: {
      //! +fn=nestEx:options
      // `#Ordered extends the inherited `'nestEx (typically `@Base.nestEx()`@)
      // and handles new `'options keys:
      //> pos any, optional `- the caller may explicitly specify new child's
      //  position relative to other children; `'pos may be used by `#_sorter()
      //  (in the default implementation it is)
      //> index number `- set on return to the actual position of the new child
      //  in `#_ordered; `'index can be given to `#at()
      //> oldIndex number `- only set on return if `[options.changed`] is unset
      //
      // If re-nesting the same child on the same key, `#Base's `#nestEx() does
      // nothing but `#Ordered's `#nestEx updates the child's position in
      // `#_ordered if old and new `[options.pos`] are different (i.e.
      // `[!_.isEqual()`]) and calls `#_repos(). `[options.changed`] remains
      // `'false. Detect this situation by comparing `'index and `'oldIndex:
      //[
      //   col.nestEx({child: sqim, pos: -123})   // new child, explicit pos
      //     //=> {..., changed: true, previous: null, index: 0}
      //   col.nestEx({child: sqim, pos: 9000})   // existing child, changed pos
      //     //=> {..., changed: false, previous: sqim, index: 3, oldIndex: 0}
      //]
      '+nestEx': function (res) {
        var changed = res.changed
        if (changed && res.previous && !this._owning) {
          this._removeFromOrdered(res.key, res.previous)
        }
        if (!changed) {
          res.oldIndex = this._indexOf(res.key, res.child)
          changed = !_.isEqual(res.pos, this._ordered[res.oldIndex].pos)
          changed && this._ordered.splice(res.oldIndex, 1)
        }
        if (changed) {
          res.index = this._indexFor(res)
          // pick() removes keys that Ordered doesn't need (and which may
          // reference some objects preventing their GC'ion) and clones
          // `'options to avoid indirect changes by the caller (nestEx()
          // returns this object as is).
          this._ordered.splice(res.index, 0, _.pick(res, 'child', 'key', 'pos'))
          this._repos(res.child, res.index)
        }
      },

      unnested: function (sqim) {
        // Owning Ordered sqimitives can never have duplicates so no matter
        // from where unnesting is called, we don't need any more info than the
        // sqim itself to locate its correct entry in _ordered.
        //
        // For a non-_owning duplicating sqimitive we do need sqim's former
        // key. Unnesting can happen either in nestEx() (when replacing old
        // sqim with another sqimitive) or in unlist() (when removing a
        // particular sqim). In both cases we have the needed info but it's not
        // here but there, in those methods so removal from _ordered is handled
        // there.
        if (this._owning) {
          // _parentKey is not available at this point.
          var entry = _.find(this._ordered, function (entry) {
            return entry.child == sqim
          })
          this._removeFromOrdered(entry.key, sqim)
        }
      },

      // Non-_owning duplicating Ordered's unlist() removes all occurrences of
      // a child if given an object or a particular one if given a string
      // (key).
      '+unlist': function (sqim, key) {
        // If !sqim then unlist() didn't find the child so no need to update
        // _ordered.
        if (!this._owning && sqim) {
          if (sqim == key) {    // object given.
            this._ordered = this._ordered.filter(function (entry) {
              return entry.child != sqim
            })
          } else {      // string given.
            this._removeFromOrdered(key, sqim)
          }
        }
      },

      // Returned array members have a guaranteed order. Object keys are lost
      // (if this is non-_owning).
      '=slice': function (sup, start, end) {
        return _.pluck(this._ordered.slice(start, end), 'child')
      },
    },

    //! +ig
    _removeFromOrdered: function (key, sqim) {
      var index = this._indexOf(key, sqim)
      if (index < 0) {
        throw new TypeError('Broken nesting: sqimitive missing from _ordered')
      }
      this._ordered.splice(index, 1)
    },

    //! +ig
    // If `'sqim is missing, it's read from `#_children (in this case
    // `#_indexOf() should not be called after `'sqim was already unnested).
    _indexOf: function (key, sqim) {
      key += ''
      sqim = sqim || this._children[key]
      return _.findIndex(this._ordered, function (entry) {
        // Technically only comparing keys would suffice (since _children can't
        // have 2 members with the same key) but comparing objects first is
        // faster.
        return entry.child == sqim && entry.key == key
      })
    },

    //! +ig
    //> entry `- object with `'child/`'key/`'pos keys (as in `#_ordered)
    // Gets called assuming `[entry.child`] is not yet nested in `#this. `'pos
    // is coming from `#nestEx()'s `'options.
    _indexFor: function (entry) {
      return this.constructor.indexFor(this._ordered, entry, this._sorter, this)
    },

    // The comparison function for determining desired child order.
    //
    //= < 0 if `'a must go before `'b`, > 0 if it must go after`,
    //  0 if they can go in any order; it's generally recommended to avoid 0 to
    //  ensure that re-sorting the same array doesn't result in a different
    //  order of members
    //
    // You want to override `#_sorter() if you are not happy with the default
    // implementation. If you do, see `#indexFor() for the invocation format.
    // Default implementation compares using `'pos (if given to `#nestEx() for
    // an object) or `'key (if nesting using `#_defaultKey() then keys are
    // `#_cid's).
    //
    //? Adapted code snippet from the sample To-Do application that is using
    //  the value of the `'order option of a given child if no explicit `'pos
    //  was provided for it when nesting:
    //  `[
    //     '=_sorter': function (sup, a, b, posB) {
    //       var posA = a.pos == null ? a.child.get('order') : a.pos
    //       return arguments.length == 2 ? posA
    //         : (posA > posB ? +1 : (posA < posB ? -1
    //             // If properties match - sort stably by unique and constant _cid's.
    //             : (a.child._cid - b.child._cid)))
    //     },
    //  `]
    //
    // `'a and `'b are objects in the `#_ordered format. During `#nestEx() one
    // of them may be missing from `#_ordered but present in `#_children;
    // during `#resort() both are present in `#_ordered. `'b is `'null on the
    // first iteration (see `#indexFor()).
    //
    // Note: if consumers of this object are using `'pos, make sure either they
    // supply correct types or you normalize them in `#_sorter: number `[10`]
    // is > `[2`] but string `['10'`] is < `['2'`].
    _sorter: function (a, b, posB) {
      a = a.pos == null ? a.key : a.pos
      return arguments.length == 1 ? a
        // Not simply a - posB to work with non-numeric key/pos.
        : (a > posB ? +1 : (a < posB ? -1 : 0))
    },

    // Re-sorts the entire collection from scratch.
    //
    //= this
    //
    // Call `#resort() if an option that affects the sort order (`#_sorter) was
    // changed or if sorting was temporary disabled.
    //
    // Calls `#_repos() on every member after sorting `#_ordered.
    //
    //?`[
    //   Sqimitive.Base.extend({
    //     mixIns: [Sqimitive.Ordered],
    //     _opt: {invert: false},
    //
    //     events: {
    //       '=_sorter': function (sup) {
    //         var res = sup(this, arguments)
    //         // Invert sort order based on the option's value:
    //         return this.get('invert') ? -res : res
    //       },
    //
    //       change_invert: 'resort-',
    //     },
    //   })
    // `]
    //
    //? Temporary disabling automatic sorting is useful during mass-assignment
    //  (`#assignChildren()):
    //  `[
    //     var hook = this.on('=_indexFor', Sqimitive.Core.stub)
    //     try {
    //       this.assignChildren(data)
    //     } finally {
    //       this.off(hook)
    //       this.resort()
    //     }
    //  `]
    resort: function () {
      this._ordered.sort(function (a, b) {
        // function _sorter(a, b, posB) - obtain that posB (simulating first
        // iteration of indexFor()).
        return this._sorter(a, b, this._sorter(b))
      }.bind(this))
      this.each(this._repos, this)
      return this
    },

    //! +fn=_repos:child:index +ig
    // Called when a child's position has changed or was assumed for the first
    // time.
    //
    //> sqim object `- the child that has changed position
    //> index int `- `'sqim's current (new) index in `'this; can be given to
    //  `#at()
    //
    // Typically, you'd listen to/override this method to keep positions of
    // children on screen (in their parent's `@Base.el`@) in sync with their
    // "logical" order (in `'this).
    //
    //? Adapted code snippet from the sample To-Do application:
    //  `[
    //     _repos: function (child, index) {
    //       index >= this.length - 1
    //         ? child.el.appendTo(this.el)
    //         : child.el.insertBefore(this.el.children()[index])
    //     },
    //  `]
    //
    // ` `#_repos() is called for newly `#nest'ed `#_children and those that
    // have changed `'pos. It's not called for removed children. The default
    // implementation in `#Ordered does nothing.
    //
    // ` `#resort() calls `#_repos() for all children (even if some didn't
    // change positions - this is hard to determine). Here, note `'Array's
    // `'forEach() implications: going in ascending order from child #0 to
    // last, and if `#_repos() mutates children then `#_repos() is not called
    // for some of them (so don't mutate).
    //
    //#-plainstub
    _repos: Core.stub,

    // Returns detailed info about a child by its index in this collection.
    //
    //= object `- entry in the format of `#_ordered
    //
    // With `#at() you can obtain a child's key or `'pos. Use it from `#util
    // functions like `'each() which provide you with an index in `#_ordered
    // (or in the result of `#slice()).
    //
    // Warning: `#at() returns the object from `#_ordered verbatim - do not
    // change it, or shallow-copy before you do.
    //
    // Unlike `#slice(), `#at() does not accept negative `'index.
    //
    //?`[
    //   sqim.at(0)        //=> {child: Sqimitive, key: 'foo', pos: 3}
    //   sqim.at(999)      //=> undefined (if length <= 999)
    //   sqim.at(-1)       //=> always undefined
    //
    //   this.groupBy(function (sqim, i) { return this.at(i).pos })
    //     //=> {pos1value: [child, ...], value2: [child, ...]}
    //
    //   // If clone is a non-_owning Ordered collection, populate it from orig:
    //   orig.each(function (child, i) {
    //     clone.nestEx(orig.at(i))
    //   })
    //
    //   // Using nest() is possible but will discard pos and keys of children:
    //   orig.each(function (child) {
    //     clone.nest(child)
    //   })
    // `]
    at: function (index) {
      return this._ordered[index]
    },

    //! +clst

    staticProps: {
      //#+tag_Utilities
      //* `@Ordered::indexFor()`@
      //#
      //
      // Determines insertion position for a new member `'value in `'array
      // using a binary search.
      //
      // ` `#indexFor() is an adaptation of Underscore's `@un:sortedIndex`@().
      // It supports two sort callback styles: relative (`[(a, b)`], as for
      // `'Array's `'sort()) and weight-based (`[(a)`], as for
      // `@un:sortBy`@()).
      //
      // First time `'func is called it's given only 1 argument (`'value) and
      // expected to return `'value's weight (which is stored for later calls),
      // then it's called repeatedly to compare `'value against other members
      // (returning < 0 if `'b must go before `'a, > 0 if after, == 0 if their
      // sort order is the same and either can go in front of another).
      //
      // In `#Ordered, `#indexFor() is used to maintain the order of children
      // (in `#_ordered) using `#_sorter() for `'func. Usually there's no need
      // to call `#indexFor() directly.
      //
      // `'cx is `'func's context (required).
      //
      //? Relative `'func ignores the first call, otherwise is the same as with
      //  standard `'sort():
      //  `[
      //   Sqimitive.Ordered.indexFor(a, v, function (a, b) {
      //     return a > b ? +1 : (a < b ? -1 : 0)
      //     // This would fail without a check because b may be null:
      //     return b && (a.prop - b.prop)
      //   })
      //  `]
      //
      //  Weight-based `'func uses all 3 arguments:
      //  `[
      //   Sqimitive.Ordered.indexFor(a, v, function (a, b, posB) {
      //     var posA = a.someWeightProp    // assuming it's a number.
      //     return arguments.length == 1 ? posA : (posA - posB)
      //   })
      //  `]
      indexFor: function (array, value, func, cx) {
        var pos = array.length && func.call(cx, value)
        for (var low = 0, high = array.length, rel = 1; low < high; rel) {
          var mid = Math.floor((low + high) / 2)
          rel = -func.call(cx, array[mid], value, pos)
          // Exiting immediately if rel == 0 (found a member with the same sort
          // order) - low remains next to current index so order of ? : is
          // important.
          rel < 0 ? (high = mid) : (low = mid + 1)
        }
        return low
      },
    },
  }

  // Adding utility functions as instance methods on Sqimitive.Base.

  // iterator = function (Sqimitive child, string parentKey)
  var objectUtils =
    'pick omit keys'

  // For non-Ordered.
  // iterator = function (Sqimitive child, int index)
  //
  // toArray() is part of arrayUtils, not objectUtils so that it uses
  // Sqimitive's slice() to preserve the order (result of toArray(_children)
  // would be unordered, of toArray(slice()) - ordered if slice() is ordered).
  var arrayUtils =
    'each map find filter reject reduce every some contains invoke pluck' +
    ' max min sortBy groupBy indexBy countBy chunk shuffle sample' +
    ' partition toArray without union intersection difference'

  // iterator = function (Sqimitive child, int index)
  var orderedUtils =
    'reduceRight first initial last rest indexOf lastIndexOf' +
    ' findIndex findLastIndex'

  _.each(objectUtils.split(' '), function (name) {
    Sqimitive.Base.prototype[name] = function () {
      Array.prototype.unshift.call(arguments, this._children)
      return _[name].apply(_, arguments)
    }
  })

  _.each(arrayUtils.split(' '), function (name) {
    Sqimitive.Base.prototype[name] = function () {
      Array.prototype.unshift.call(arguments, this.slice())
      return _[name].apply(_, arguments)
    }
  })

  _.each(orderedUtils.split(' '), function (name) {
    Sqimitive.Ordered[name] = function () {
      Array.prototype.unshift.call(arguments, this.slice())
      return _[name].apply(_, arguments)
    }
  })

  return Sqimitive
});
