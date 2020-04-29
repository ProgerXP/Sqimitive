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
    // Version of the library in use.
    version: '1.1',

    // Store reference to the utility library in use (particularly when using
    // modular frameworks so that it's possible to access _ by requiring
    // Sqimitive alone).
    _: _,
  }

  /***
    Sqimitive.Core - Basic Event/Inheritance
   ***/

  //! +cl=Sqimitive.Core
  //
  // ` `#evt Events play fundamental role in Sqimitive – so fundamental that half
  // of its code implements just that. For this reason Sqimitive per se is split
  // into two classes: `'Core and `#Base (both reside under common `@\Sqimitive\`@
  // namespace).
  //
  // `'Core implements inheritance and event binding, tracking and unbinding. It
  // lacks any serious functionality and can be easily mixed into any other
  // classes of your choice. The class is accessible globally as
  // `@Sqimitive\Core`@ but you most likely won't need to access it directly,
  // using `@Sqimitive\Base`@ instead.
  //
  //# Basic conventions
  //
  //* `*Protected class fields begin with underscore (`'_)`* – such fields (data
  //  properties and methods) are only meant to be read or written by the class
  //  they are defined in, or by any of its subclasses. It’s bad practice to try
  //  to access them from an ancestor or, mind you, from a disconnected class –
  //  this is only justified, if ever, by really severe optimizations (such as
  //  tons of `@Base._opt`@ calls).
  //
  //* `*Underscores separating camelCase`* – when an identifier (`'oneId) needs
  //  to be mixed into another (`'TwoId) it simply becomes `'oneId_twoId instead
  //  of `'oneIdTwoId, `'one_id_two_id or something else dictated by "pretty
  //  printing" rules. For example, event identifier for a `'change event of an
  //  `'attrName option is simply `'change_attrName.
  //
  //* `*Semicolon-free zone`* – you don't have to follow this hype but the
  //  author believes that such a code is cleaner and faster to type with a few
  //  insignificant drawbacks. No need to pay more where you don't have to, right?

  //! +fn=constructor
  // Assigns new unique `#_cid (`'p + unique number) and clones all instance
  // properties of self that are not listed in `#_shareProps. This puts a stop
  // to accidental static sharing of properties among all instances of a class
  // where those properties are defined; see `#_shareProps for details.
  var Core = Sqimitive.Core = function () {
    //! +ig
    this._cid = 'p' + Core.unique('p')

    // Typically it's like: var MySqim = Sqimitive.extend({...});
    // MySqim._shareProps.push(...); - i.e. _shareProps is updated later.
    // We'd either have to explicitly call some kind of refreshCopyProps()
    // after complete declaration or do that in the constructor, which is
    // more convenient and not much slower (it's done only once per class).
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
    // For unique(). Format: {prefix: number (last taken)}
    _unique: {},

    // ** Can be set upon declaration.
    //
    // List of names of {object} properties which keys are merged with parent
    // class when redefined in child class. Like _.extend(parentProp, childProp).
    // No need to include parent's _mergeProps there (they are always merged).
    //
    // `'_mergeProps lists properties (only instance) that you want to merge
    // rather than overwrite when subclassing a Sqimitive – exactly as
    // `[_.extend(parentProp, subclassProp)`]. In human language, this means
    // that if subclass defines a merging property and inside it has a key that
    // also exists in the base class' property then subclass overwrites that,
    // but only that, value. All other keys are retained and there is no way to
    // delete a base class' key other than replacing it with `'null or
    // `'undefined (in contrast with `'delete such properties are still
    // iterable with `[for..in`]). You can `'delete them after the instance was
    // constructed.
    //
    // By default, `#Base class adds `@Base._opt`@ and `#elEvents.
    //
    // When passing `'_mergeProps inside `'staticProps (second argument of
    // `#extend()) all inherited items will be removed; correct way to add your
    // properties while keeping those in base classes is this:
    //[
    //   var MySqimitive = Sqimitive.Base.extend({
    //     // Define instance fields...
    //   }, {
    //     // Define static fields - if you need. If not don't pass this parameter.
    //   })
    //
    //   // extend() has copied the inherited _mergeProps list which we can now
    //   // append to or modify using regular Array functions.
    //   MySqimitive._mergeProps.push('prop1', 'prop2', ...)
    //]
    //
    // These are `*wrong`* ways to append to this property:
    //[
    //   var MySqimitive = Sqimitive.Base.extend({
    //     // _mergeProps is static so it won't be read from here.
    //     _mergeProps: ['prop'],
    //   }, {
    //     // This is fine but it will entirely replace base class' list, if any.
    //     _mergeProps: ['prop'],
    //   })
    //
    //   // This will work but once again will replace all the inherited items.
    //   MySqimitive._mergeProps = ['prop']
    //
    //   // What you want to do is most often this:
    //   MySqimitive._mergeProps.push('prop')
    //]
    //
    // ` `*In Backbone`*, when you extend a parent class with a property that
    // it already has you end up with a completely new property. This makes
    // sense but not always – for example, if a class has its own
    // `@bb:View-events`@ then what you really need is merge its own (base)
    // events with the events of new subclass. Same thing with
    // `@bb:Model-attributes`@ and `@bb:Model-defaults`@, `@bb:Router-routes`@
    // and others.
    //
    // Consider this example (`@http://jsfiddle.net/Proger/u2n3e6ex/`@):
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
    //       'keypress .me': function () { alert('Oh noes, we broke a button :(') },
    //     },
    //   })
    //]
    _mergeProps: [],

    // ** Can be set upon declaration.
    //
    // List of names of {object} properties which are not cloned upon construction.
    //
    // ` `*In Backbone`*, every subclass gets values of its inherited properties
    // shared among all instances of the base class where they are defined.
    // Just like in Python, if you have `[extend({array: []})`] then doing
    // `[this.array.push(123)`] will affect all instances where `'array wasn't
    // overwritten with a new object.
    //
    // Consider this short snippet (`@http://jsfiddle.net/Proger/vwqk67h8/`@):
    //[
    //   var MyView = Backbone.View.extend({foo: {}})
    //   var x = new MyView
    //   var y = new MyView
    //   x.foo.bar = 123
    //   alert(y.foo.bar)
    //]
    //
    // Can you guess the alert message? It’s `'123. What a surprise!
    //
    // In Sqimitive, every non-scalar property gets cloned upon object
    // instantination. If you don't want this overhead (usually it’s miniscule)
    // – simply assign all complex values in the constructor, `#init() or
    // `#postInit() or list such properties (only instance) in `'_shareProps.
    // Be safe by default.
    //
    // One particular case to be aware of is when you are assigning classes to
    // properties, like `[extend({_model: MyApp.MyModel})`] – it will be
    // recursively copied resulting in a broken prototype. Do this instead:
    //[
    //   var MyView = Sqimitive.Base.extend({
    //     _model: MyApp.MyModel,
    //   })
    //
    //   // _shareProps is a static property.
    //   MyView._shareProps.push('_model')
    //]
    //
    // Or you can assign the class after instantination, which is less elegant:
    //[
    //   var MyView = Sqimitive.Base.extend({
    //     _model: null,   // MyApp.MyModel
    //
    //     events: {
    //       init: function () {
    //         this._model = MyApp.MyModel
    //       },
    //     },
    //   })
    //]
    //
    // By default, `#Base class sets it to `#_childClass. When passing
    // `'_shareProps inside `'staticProps (second argument of `#extend()) all
    // inherited items will be removed; correct way to add your properties
    // while keeping those in base classes is this:
    //[
    //   var MySqimitive = Sqimitive.Base.extend(...)
    //   MySqimitive._shareProps.push('prop1', 'prop2', ...)
    //]
    //
    // ` `#_shareProps inheritance works exactly the same way as `#_mergeProps' –
    // see its description for more examples.
    _shareProps: [],

    //! +ig
    // An internal field - list of prototype (instance) properties being
    // copied in the constructor. Running for..in each time is extremely
    // expensives (10X). Maintained automatically by extend()/mixIn().
    // Null causes constructor to collect the props.
    _copyProps: null,

    //! `, +fna=function ( [name,] [protoProps [, staticProps]] )
    //
    // Hardwires events into class definition. Merges redefined object properties
    // with those in parent prototype.
    //
    // protoProps may contain special keys (see `'mixIn()). `'staticProps
    // argument is applied before `'protoProps' `'staticProps (typically you'd
    // give only one of them).
    //
    // name is an optional convenience string displayed in debuggers (as
    // function/constructor - "class" names). Defaults to "Sqimitive".
    //
    // Any argument can be null.
    //
    // Lets you create a new subclass of the given class. `'protoProps are new
    // instance fields (properties or methods; can include `#events
    // pseudo-property) while `'staticProps are new static fields – i.e. the
    // ones called as `[MyClass.staticSomething()`] as opposed to `[(new
    // MyClass).instanceSomething()`]. Most of the time you will use just
    // `'protoProps.
    //
    // In case of duplicated names subclass' values take precedence to
    // overwrite values in its parent class (except when such names are listed
    // in `#_mergeProps).
    //[
    //   // First we extend base Sqimitive class with our own properties.
    //   var MyBase = Sqimitive.Base.extend({
    //     _somethingBase: 123,
    //     _somethingNew: 'foo',
    //
    //     el: {tag: 'nav', id: 'nav'},
    //
    //     _opt: {
    //       baseOption: 'boo',
    //       baseMore: 'moo',
    //     },
    //   })
    //
    //   // Now if we extend MyBase...
    //   var MySubclass = MyBase.extend({
    //     _somethingSub: 'bar',
    //     _somethingBase: 987,
    //
    //     el: {tag: 'footer'},
    //
    //     _opt: {
    //       subOption: 'sub',
    //       baseMore: 'bus',
    //     },
    //   })
    //
    //   /*
    //     ...we get the following class, after merging with its parent:
    //
    //       MySubclass = {
    //         // Got new value - overriden in MySubclass.
    //         _somethingBase: 987,
    //         // Retained old value from MyBase.
    //         _somethingNew: 'foo',
    //         // New property - introduced in MySubclass.
    //         _somethingSub: 'bar',
    //
    //         // Got new value in MySubclass.
    //         el: {tag: 'footer'},
    //
    //         // Unlike el, _opt is listed in _mergeProps by default so its
    //         // properties are merged and not entirely replaced.
    //         _opt: {
    //           // Retained.
    //           baseOption: 'boo',
    //           // Introduced.
    //           subOption: 'sub',
    //           // Overriden.
    //           baseMore: 'bus',
    //         },
    //       }
    //   */
    //]
    extend: function (name, protoProps, staticProps) {
      // this = base class.
      // Only works in strict mode which disconnects parameter vars from
      // members of arguments.
      name = typeof arguments[0] == 'string' && Array.prototype.shift.call(arguments)

      var child = extend(name || 'Sqimitive', this, arguments[0])
      //! +ig
      // Since base class has its own __super__, make sure child's (set up
      // by extend() above) isn't overwritten.
      _.extend(child, this, arguments[1], {__super__: child.__super__})

      child._mergeProps || (child._mergeProps = this._mergeProps)
      child._shareProps || (child._shareProps = this._shareProps)

      // Function.prototype.length confuses "isArrayLike" functions.
      // Just `[delete Core.length`] doesn't work.
      Object.defineProperty(child, 'length', {value: 'NotAnArray'})

      name && Object.defineProperty(child, 'name', {value: name})

      arguments[0] && child.mixIn(arguments[0])

      // String class path is relative to the base class; instead of searching
      // all prototypes to find where this property was introduced (without this
      // all children will reference to them as the base class), we "fixate"
      // it when declaring the class.
      // Done here, not in mixIn(), to avoid questions like "is the string,
      // if given by a mix-in, relative to the mix-in or the target class?".
      if (typeof child.prototype._childClass == 'string') {
        child.prototype._childClass = [child, child.prototype._childClass]
      }

      return child
    },

    // this = class which receives new "mixed-in" fields ("child").
    // options allow creating parametrized mix-ins (basically, generics).
    //
    // newClass - the mix-in object. It's similar to `'extend(); an object with keys:
    //> staticProps object - static fields made available as newClass.something
    //> events object - event listeners
    //  `* keys are isolated, meaning if both `'this and `'newClass have
    //     `'foo key, both hooks are set up
    //> finishMixIn function `- called before returning, `'this = `'newClass,
    //  arguments = child prototype (of the updated class) and options
    //> mixIns array `- member is a mixed-in class or [class, options]
    //> * - everything else is an instance field, `'protoProps of `'extend()
    //  `* `'_mergeProps is respected, but of `'this (not `'newClass)
    //  `* a string form of `'_childClass is only allowed in `'extend(), not
    //     here; other forms (array, object) are allowed in both places
    //
    // `'this is modified in-place; no new class is created. If you want a base
    // class without the mix-in, and a sub-class with the mix-in, first
    // `'extend() the base class and then mix into the new sub-class.
    //
    // On name collision, properties from `'newClass overwrite ones in `'this.
    // To avoid this, set such properties in `'init or in `'finishMixIn.
    //
    // elEvents are merged but unlike events keys may get overridden - use '.ns' suffix.
    //
    //[
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
    //     // Not overriden by MixIn.
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
    // mixIns is applied before other properties allowing "mix-in inheritance". This is different from calling mixIn() in finishMixIn().
    //
    //[
    //   var ParentMixIn = {
    //     someEvent: function () { /* parent */ },
    //   ]
    //   var ChildMixIn = {
    //     mixIns: [ParentMixIn],
    //     events: {
    //       someEvent: function () { /* child */ },
    //     },
    //   }
    //
    //   // MyClass has now someEvent firer, with two handlers: of parent and of child.
    //   MyClass.mixIn(ChildMixIn)
    //]
    //
    // If ChildMixIn was defined as follows then MyClass would have someEvent as a non-firer, with parent's function, because it overrode ChildMixIn's.
    //
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
    // This will also overwrite the handler in the class declaration:
    //
    //[
    //   var MixIn = {
    //     some: function () { },
    //   }
    //   var Class = Sqimitive.extend({
    //     events: {
    //       some: function () { },
    //     }
    //   })
    //   Class.mixIn(MixIn)
    //]
    // But this will work:
    //[
    //   var MixIn = {
    //     some: function () { },
    //   }
    //   var Class = Sqimitive.extend({
    //     mixIns: [MixIn],
    //     events: {
    //       some: function () { },
    //     }
    //   })
    //]
    mixIn: function (newClass, options) {
      return this.prototype.mixIn(newClass, options)
    },

    // Empty function. Used in multiple places to determine if a method
    // or event handler is actually implemented or it can be safely discarded
    // (overridden).
    //
    // An empty function that returns `'undefined. Used in places where you
    // don't want to supply any implementation – this lets Sqimitive optimize
    // things when it knows that a function can simply be discarded.
    // Technically if you are not a performance purist you can just use
    // `[function () {}`] or `[new Function`] to achieve the same effect.
    //[
    //   var MySqim = Sqimitive.Base.extend({
    //     events: {
    //       success: Sqimitive.Base.stub,
    //       // or success: function () { },
    //       error: Sqimitive.Base.stub,
    //     },
    //   })
    //
    //   var my = new MySqim
    //   // Replaces empty handler entirely.
    //   my.on('success', function () { alert('Good!') })
    //]
    stub: function Sqimitive_stub() { },

    // Generates and returns a number starting from `'1 that is guaranteed to
    // be unique among all calls to `'unique() with the same `'prefix during
    // this page load. Used to assign `#_cid (unique sqimitive instance
    // identifier).
    //
    //? unique('my')    //=> 3
    //? unique()        //=> 87
    //? unique('my')    //=> 4
    //? unique('some')  //=> 21
    //? unique('my')    //=> 5
    unique: function (prefix) {
      return this._unique[prefix] = 1 + (this._unique[prefix] || 0)
    },

    //! `, +fna=function ( prop [, args] )
    //
    // Returns a function that expects one argument (an object) that, when
    // called, checks if given object has `'prop property and if it does –
    // returns its value (if it’s a method then it’s called with `'args (array)
    // and the result returned), otherwise returns `'undefined (for non-objects
    // or objects with no `'prop).
    //
    // Usually it’s given to some `#util filtering function (see `#chld
    // `'getIncomplete() example).
    //
    //[
    //   var obj = {
    //     one: 1,
    //     two: function () { return 2 },
    //     some: function (a, b) { return a + '--' + b },
    //   }
    //
    //   var picker = Sqimitive.Base.picker;
    //   alert( picker('one') )    // alerts "1".
    //   alert( picker('two') )    // alerts "2".
    //   alert( picker('some', ['A', 'B']) )   // alerts "A--B".
    //]
    //
    //? _.map([{methodName: ...}, null, ...], picker('methodName'))
    //    //=> ['res', undefined, ...]
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
    // given) into a real `'Function. Used in `#on(), `#events and others to
    // short-reference instance's own methods.
    //
    // If `'func is a string and contains a dot or a dash (`[. -`]) - returns
    // masked (`#masker()) version of this method (`'mask starts with the first
    // such character). If it's a string without them - returns a function
    // calling method named `'func on `'obj (or `'this if omitted). In other
    // cases returns `'func as is if `'obj is omitted or `[_.bind(func, obj)`]
    // otherwise.
    //
    //[
    //   var func = Sqimitive.Base.expandFunc('meth')
    //     // returned function will call this.meth(arguments, ...).
    //
    //   var obj = {meth: function (s) { alert(s) }}
    //   func.call(obj, 123)
    //     // alerts 123.
    //
    //   var func = Sqimitive.Base.expandFunc('meth-.', obj)
    //     // this function works in obj context, calling meth with just one
    //     // argument (2nd it was given) - see masker().
    //
    //   _.each({k1: 1, k2: 2}, func)
    //     // each() calls func(1, 'k1') and func(2, 'k2').
    //     // func calls obj.meth('k1') and obj.meth('k2').
    //     // alerts twice: 'k1' and 'k2'.
    //
    //   _.each({k1: 1, k2: 2}, _.bind(func, obj))
    //     // if we didn't give obj to expandFunc() previous example would
    //     // fail - func() would be called on window which has no 'meth' method.
    //]
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
    // Returns a version of `'func with re-routed arguments according to `'mask.
    // If `'mask is a number - skips that number of leading arguments as in
    // `@un:rest`@(), if omitted - assumed to be number `'1 (skip first argument),
    // otherwise it's a mask string - see below.
    //
    // `'func is either a string (method name as in `#expandFunc()) or a function
    // - both called on `'cx or `'this if omitted or `'null. `'args is array of
    // extra left-side arguments.
    //
    // In string `'mask each symbol maps arguments given to masked `'func (result
    // of `'masker()) to original `'func. It consists of:
    //
    // `* Dots - each is replaced by its index in the string (`[-..-.`] equals to
    //    `[-23-5`]).
    // `* Dashes - represent arguments that are to be ignored; trailing dashes
    //    are ignored (arguments past the end of `'mask are never given unless
    //    `'mask is a number)
    // `* Numbers 1-9 - read arguments by index: `'1 reads 1st masked argument,
    //    etc.
    //
    // For example, `'mask of `[-.1`] equals to `[-21`] and gives two arguments:
    // `[(arg2, arg1)`]. `*Empty mask`* passes zero arguments (as do `[-`],
    // `[--`], etc.)
    //
    // ` `*Note:`* `'mask of `['3'`] is different from `'3 (number) - the first
    // passes 3rd argument as the first while the second skips first 3 arguments
    // and passes all others.
    //
    // Masking is a way to work around the "Danger of args__" described in `#on()
    // and avoid writing simple callback functions which reorder arguments.
    // It is common to alias a shorted reference like `[var m =
    // Sqimitive.Base.masker`] and use it in your code since its main
    // point is to be easy to call.
    //
    //? $.ajax({
    //    url: 'api/route',
    //    dataType: 'json',
    //    context: sqim,
    //
    //    //  This is wrong: success' second argument is textStatus which gets pushed
    //    //  to assignResp(data, options) breaking the latter (options must be an
    //    //  object).
    //    success: sqim.assignResp,
    //
    //    //  This is correct: we indicate that we are only interested in the first
    //    //  argument which is passed through to assignResp().
    //    success: Sqimitive.Base.masker('assignResp', '.'),
    //  })
    //
    //? var m = Sqimitive.Base.masker
    //
    //  var MyModel = Sqimitive.Base.extend({
    //    _opt: {
    //      caption: '',
    //    },
    //
    //    //  Unmasked, _.trim() takes two arguments (str, chars) but normalize_OPT()
    //    //  are passed (value, options); the latter interfere with each other.
    //    normelize_caption: m(_.trim, '.'),
    //  })
    //
    //? _.each(arrayOfSqims, m('nest', '21', col))
    //    //  here we call col.nest() on each item in arrayOfSqim with swapped arguments,
    //    //  effectively nesting each member into the col object. _.each() calls the
    //    //  iterator as (value, key) while nest() takes (key, sqim).
    //
    //? m('nest', 1)
    //    //  returns function that preserves all but the first argument:
    //    //  function () { return this.nest.apply(this, _.rest(arguments)) }
    //
    //? m('nest')
    //    //  the same - omitted mask defaults to number 1.
    //
    //? m('nest', 0, cx)
    //    //  doesn't change arguments (_.rest(a, 0) == a) but binds function to cx.
    //
    //? m('nest', 0, null, ['left', 'left2'])
    //    //  doesn't bind result but pushes 'left' and 'left2' arguments before
    //    //  all given arguments.
    //
    //? m(function (a1, a2) { alert(a1 + ' ' + a2) }, '')
    //    //   so func
    //    //  will always alert 'undefined undefined'.
    masker: function (func, mask, cx, args) {
      var isMethod = typeof func == 'string'
      var isSkipFirst = typeof mask == 'number' || mask == null
      mask == null && (mask = 1)
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

    // Returns a recursive copy of the argument so that any modification to either
    // `'obj or returned value (`'obj copy) won't affect its counterpart.
    //
    // Think of this as of recursively calling `@un:clone`@() or `@jq:extend`@().
    deepClone: function (obj) {
      // This method has big impact on performance because it's called in each Sqimitive constructor so we avoid using _'s methods and access built-in methods directly (saving 10% of time on each access).
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
    // Returns an object with keys `'prefix, `'name and `'args.
    // Errors if `'str doesn't look like a proper event reference.
    //
    //? parseEvent('-foo.bar___')     //=> ['-', 'foo.bar', '___']
    //? parseEvent('foo.bar')         //=> ['', 'foo.bar', '']
    parseEvent: function (str) {
      var match = str.match(/^([+\-=]?)([\w\d.:+\-=]+?)(_*)$/)
      if (!match) { throw new SyntaxError('Bad event name: ' + str) }
      return {prefix: match[1], name: match[2], args: match[3]}
    },

    //! `, +fna=function ( funcs [, args] )
    //
    // Processes an event call chain. `'funcs is an array of event registration
    // objects. Calls each handler in turn according to its type (expecting a
    // fixed number of arguments, accepting current result value, affecting
    // return value, etc. according to `'prefix in `#on()) while giving it `'args
    // (array). If a handler returns something but `'undefined and it's eligible
    // for changing return value (as it's the case for `'+event and `'=event), then
    // current result is replaced by that handler's return value. Returns the
    // ultimate return value after calling each handler. There is no way to skip
    // remaining handlers (but if you really need - try `'all event for this,
    // see `#fire()).
    //
    // `'funcs can be "falsy", in this case `'undefined is returned.
    // See also instance method `#fire().
    //
    //? fire([{func: function () { ... }, cx: window, res: true}, ...], [5, 'foo'])
    fire: function (funcs, args) {
      var res

      // No funcs (not even an array) can be e.g. when calling change_XXX.
      if (funcs) {
        if (!args) { args = [] }

        // Cloning function list because it might change from the outside
        // (e.g. when a handler is removed from the same event as it's being
        // fired; may happen when once() is used).
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
            res = eobj.post(eobj, res, args)
            // eobj could be modified by post, including unsetting post.
            if (eobj.stop) { return true }
          }
        }, this)
      }

      return res
    },

    // Converts arguments object to array, array as is and any other kind of
    // value as [value].
    //
    // Attempts to cast `'value into a native `'Array object. In particular,
    // function `'arguments become an array, arrays are returned as is while
    // anything else is wrapped into an array to become its sole member and
    // returned. This means that even `'null and `'undefined result in
    // `[[value]`] – not `[[]`].
    //
    // Does `*not`* clone result.
    //
    //? toArray(arguments)    //=> [5, 'foo']
    //? toArray([5, 'foo'])   //=> [5, 'foo']
    //? toArray(5)            //=> [5]
    toArray: function (value) {
      if (Object.prototype.toString.call(value) == '[object Arguments]') {
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
    // An identifier of this object instance unique to all sqimitive’s ever
    // instantinated during this page load. Unique to all `[Sqimitive.Core`]
    // instances regardless of subclass. Can be used to namespace DOM events as
    // in `[this.el.on('click.' + this._cid)`]. Begins with "p" for "primitive"
    // followed by a 1-based number.
    //
    // Guaranteed to be a valid identifier of only Latin symbols, i.e. begin with a letter followed by 0 or more letters, digits and underscores.
    //
    // Historically expands to "`[C`]lient `[Id`]entifier" – a term originating
    // from Backbone `@bb:`@ but probably not holding much meaning at this
    // point.
    _cid: '',

    //events: {},
    //
    //! +prop=events
    // There is no such property per se but it can be passed to `#extend() to
    // add new event handlers (it only exists inside `'extend() and does not
    // become `[this.events`]). Since in Sqimitive `#evt everything is an event
    // this is the way you do inheritance, override methods, etc. Such events
    // are "fused" into the new class declaration so there is no overhead of
    // applying them on each class instantination.
    //
    // Formally this is similar to calling `[this.on({events})`] so see `#on()
    // with an object argument for details. Also see `#evt Events overview for
    // a good example.

    //! +ig
    // Registered event handlers of this instance. Also contains hardwired
    // handlers defined upon subclass extension. Members are passed to Core.fire().
    //
    // Format:    {event: [eventObj, eventObj, ...]
    // eventObj = {
    //    event: 'evtname', func: Function, [cx: obj|null]
    //    args: int|null,
    //    [ id: 'evtname/123' ]
    //    [ supList: Array, sup: Function|undefined - but not null ]
    //    [ res: true, ] [ ret: true ]
    //    [ post: Function ]
    // }
    //
    // An internal object holding all current event bindings. Note that it
    // includes both "fused" and dynamic events (fused are produced by
    // `#extend'ing a class so that subclass' event handlers cannot be removed
    // on runtime). It’s not advised to deal with this object directly – use
    // `#on(), `#once(), `#off() and `#fire() instead.
    //
    // `'_events keys are event names without any prefixes or suffixes
    // (`'render, `'remove and so on), values – arrays of event registration
    // objects of internal structure (study code comments for details). These
    // value arrays are given to `#fire() when an event occurs.
    _events: {},

    //! +ig
    // Indexes event handlers by ID. Doesn't contain hardwired (fuse()'d)
    // handlers. Values are references to those in _event, not copies.
    // Format:    {id: eventObj}
    _eventsByID: {},

    //! +ig
    // Indexes event handlers by their context. Similar to _eventsByID.
    // Format:    [ [cx, eventObj, eventObj, ...] ]
    _eventsByCx: [],

    //! +ig
    // Used to track all sqimitives this instance has event listeners for.
    // See autoOff() for more details.
    //
    // When `[autoOff(sqim)`] is called to keep track of `'sqim object to which
    // `'this object has attached an event listener, such `'sqim object is put
    // into `'_autoOff array. You can then do `[this.autoOff()`] in `#unnest()
    // or another place to sever all connections between an object that is
    // about to go away and those still in the world of living.
    _autoOff: [],

    //! +ig
    // If set this instance logs all event calls by hooking 'all' event.
    // If set this is that event handler's ID.
    _logEventID: null,

    // Run-time mix-in.
    mixIn: function (newClass, options) {
      //! +ig=4
      // Don't expose internal inheritance fields on the final classes.
      var merged = {mixIns: undefined, finishMixIn: undefined, staticProps: undefined, events: undefined}

      _.each(newClass.mixIns || [], function (mixIn) {
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
        // Core has no __super__ but it doesn't use mix-ins either so no check for null.
        // This condition will evaluate to true except when a class has mix-ins (via mixIns property or mixIn() method) - we could clone it in the second case too but this would be a waste.
        //
        // Warning: this operates under assumption that the base class is finalized (all mix-ins applied) before any of its sub-classes is created.
        //
        //   var Base = Sqimitive.extend()
        //   Base.mixIn(...)    // fine
        //   var Child = Base.extend()
        //   Base.mixIn(...)    // wrong
        //
        // Adding mix-ins after Child was declared may have unexpected side effects - if the mix-in adds an event and if Child had its own events block, then Child won't receive new mix-in's events. This is an implementation detail - "officially", adding mix-ins after declaring a subclass leads to undefined behaviour and should never be used.
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
    // Triggers an event giving `'args as parameters to all registered listeners.
    // First fires a special `'all event and if its return value was anything but
    // `'undefined - returns it bypassing handlers of `'event entirely. `'all gets `'event
    // put in front of other `'args (e.g. `[['eventName', 'arg1', 2, ...]`]). It's
    // safe to add/remove new listeners during the event - they will be in effect
    // starting with the next `#fire() call (even if it's nested).
    //
    // Note that `'all event is only triggered for actual events so if,
    // for example, `#render() isn't overriden it will be called as a regular
    // member function without triggering an event.
    //
    // See also static method `#fire().
    //
    // To override `'fire(), don't use the usual `[on('fire')`] as it will lead
    // to recursion (even `'=fire form). Use the old-school prototype
    // overriding:
    //[
    //   fire: function (event, args) {
    //     // Do your stuff...
    //     return MyClass.__super__.fire.apply(this, arguments)
    //   },
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

    //! `, +fna=function ( event [, prependArgs [, self]] )
    //
    // Returns a function that, once called, will call `[fire(event, args)`],
    // `#fire() in context of `'self (if not given context is unchanged).
    // `'args can be used to push some parameters in front of that function’s
    // `'args. Just a short way of writing:
    //[
    //   _.bind(function () { return this.fire(event, prependArgs.concat(arguments)) }, self)
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
    // A debug method that enables logging of all triggering events to the
    // console. Pass `'false to disable. Will do nothing if browser doesn't provide
    // `[console.log()`]. Acts as a handler for special `'all event (see `#fire()). Note
    // that only real event calls are tracked, if a method wasn't overriden it's
    // called as a regular method, not an event.
    //
    // Also acts as the logging handler itself if first argument is a string -
    // this lets you override default behaviour as a regular event handler.
    // If you do - make sure you don't return any value because a non-undefined
    // result will override original event chain (before which 'all' is called).
    // See fire().
    //
    //? logEvents(true)
    //? logEvents()       // the same as above
    //? logEvents(false)
    //
    //? events: {
    //    logEvents: function (event) {
    //      // Output node class name after log entry about the occurred event:
    //      typeof event == 'string' && console.log(this.el[0].className)
    //    },
    //  },
    //
    // Note that methods calls that are not events won't be logged. If this
    // sounds trivial remember that in Sqimitive `#evt methods only become
    // events on demand:
    //[
    //   var MyBase = Sqimitive.Base.extend({
    //     // render() is essentially a function.
    //     render: function () {
    //       this.el.text('Hello!')
    //     },
    //   })
    //
    //   // What we're doing is calling a function. It's not an event and won't be
    //   // caught by logEvents().
    //   (new MyBase).render()
    //
    //   var MyChild = MyBase.extend({
    //     events: {
    //       render: function () {
    //         this.el.append('...I extend...')
    //       },
    //     },
    //   })
    //
    //   // Now we are in fact firing 'render' - it's an event with two listeners:
    //   // one from MyBase (called first) and another from MyChild.
    //   // This way logEvents() logs the call because 'all' event gets fired because
    //   // 'render' is, in MyChild and descendants, an event that gets fired in the
    //   // first place.
    //   (new MyChild).render()
    //
    //   var MyChile = MyChild.extend({
    //     render: function () {
    //       alert('Boom!')
    //     },
    //   })
    //
    //   // Now we're back to event-less render() - a mere function. Note that two
    //   // former render() handlers are still present so if we attach a new listener
    //   // to render() current render() ("Boom") will be put as a 3rd handler and
    //   // MyChile.render() itself will be replaced by firer('render'). It's a bad
    //   // practice to supersede an "evented" function like this and usually indicates
    //   // an error (forgetting about method of the same name existing among the parents).
    //   // Regardless of the morale, logEvents() here won't track anything.
    //   (new MyChile).render()
    //]
    //
    // If you want to log some extra info or replace `'logEvent’s logging with
    // your own – use regular Sqimitive inheritance:
    //[
    //   var MyLoggee = Sqimitive.Base.extend({
    //    events: {
    //       logEvents: function (event) {
    //         // logEvents() calls itself when an event occurs and the first argument is
    //         // event name - a string. In other cases it's not the logger being called.
    //         if (typeof event == 'string') {
    //           console.log('el.' + this.el[0].className)
    //         }
    //         // Make sure you don't return any value because a non-undefined result
    //         // will override original event chain (before which 'all' is called).
    //       },
    //     },
    //   })
    //
    //   // Logs both standard logEvents() info and our class name line.
    //   (new MyLogger).logEvents().fire('something')
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

    //! `, +fna=function ( event [, func [, cx]] )
    //
    // Registers new event handler and returns its ID that can be used to
    // unregister it with off() unless an object is given. cx is context in which
    // func is to be called (defaults to this). func can be either method name
    // (resolved to a function when event is fired) or a closure.
    //
    // If given multiple handlers as an object they are hardwired (fuse()'d)
    // and cannot be unregistered (this is also a bit more performance-wise).
    // With an object, keys can contain multiple events separated with ', '
    // (note that it needs the space after the comma unlike jQuery selectors).
    //
    // See online docs for complete details of the event anatomy.
    //
    // On extension you can either add methods within events property or as
    // regular properties. But don't think that '=eventName' will be equivalent
    // to defining eventName() - it will override the firer() of eventName but
    // as soon as a new handler is added with on/once/fuse() the defined
    // eventName() will be moved to the beginning of eventName's handler list
    // while retaining all previously defined handlers on that event. In other
    // words, eventName() will be called, and then all other handlers will be
    // called too as a contrary to defining '=eventName' that would wrap around
    // and remove existing handlers.
    //
    // function ( {event: map} [, cx] )
    //    //=> this (handlers cannot be unbound)
    // function ( event, func[, cx] )
    //    //=> handler ID
    //
    //? on({'set___, nest': 'render'})
    //? on('change', this.render, this)
    //
    // The heart of Sqimitive’s `#evt event system. Lets you add new event
    // listeners, both dynamic and "fused" (that cannot be unbound at a later
    // time). It has several call forms. See also `#once() that lets you attach
    // one-shot listeners. Throws an exception if `'event can't be parsed.
    //
    //# on( {events} [, cx] )
    //
    // Fuses `*multiple event handlers`* into current object state meaning that
    // they cannot be unbound with `#off(). Returns `'this. Similar to `#fuse()
    // with added event comma notation.
    //
    // `'events is an object with one or more event references as keys (e.g.
    // `[=over.ride__`] – see below) and event handlers as values. Multiple
    // references are separated with `[, `] (comma and a `*space`*; this is
    // identical to registering them one-by-one). Handlers are either functions
    // (closures) or strings (method names of the object to which listeners are
    // added; resolved on call time so don't have to exist when binding the
    // handler).
    //
    // `'cx is optional context in which the handlers are called (defaults to
    // `'this, the object on which `#on() is called).
    //
    // This is the form used when `#extend'ing an object with `'events. It does
    // `'not apply to `#elEvents.
    //
    //[
    //   sqimitive.on({
    //     // Calls render() after 'name' option change and before 'birthday' change.
    //     'change:name, -change:birthday': 'render',
    //
    //     // Calls the function when close() gets fired.
    //     close: function () {
    //       this.el.fadeOut(_.bind(this.remove, this))
    //     },
    //   })
    //]
    //
    //# on( 'event', func [, cx] )
    //
    // Adds `*single event handler`* that can be dynamically removed with
    // `#off(). Returns new event listener identifier that `#off() accepts (but
    // the latter accepts other things too).
    //
    // `'event is a single event reference (comma notation not accepted),
    // `'func is the function or string method name (resolved when it gets
    // called, optionally masked like `[func-..1`] - see `#expandFunc()) being
    // called when that event is fired, `'cx is the context in which it is
    // called (defaults to `'this, the object on which `#on() is called).
    //
    // Because of their dynamic nature, such event handlers are slightly less
    // efficient than fused so usually if your handler is meant to stay with
    // the object for its lifetime – consider using `[on({event: func}, cx)`]
    // or `#fuse().
    //
    //#evtref
    // ` `*Event reference`* is a string with 3 parts: `[[prefix]event[argcount]`].
    //
    //> prefix `- optional; changes the way event handler is bound and called
    //  as explained in the following table
    //> event `- event name (alphanumeric symbols, dots and colons) – exactly
    //  what is given to `#fire() when triggering an event.
    //> args `- Zero or more underscores (`'_) – if present, the handler gets
    //  called only if event was given that number of arguments (it’s not
    //  possible to match zero arguments). For example, `'eve__ registers a
    //  handler that is called for `[fire('eve', [1, 2])`] but is not for
    //  `[fire('eve', [1])`] or `[fire('eve', [1, 2, 3])`]. In case of `'=event
    //  (overriding handler), if argument count differs then all handlers
    //  superseded by this one get called while the superseding handler itself –
    //  does not (equivalent to doing `[return sup(this, arguments)`]).
    //
    //  Generally, usage of `'args is frowned upon because of its unintuitive
    //  nature – see the note below for details.
    //
    //# Event prefixes
    //> none: evArgs... `- No prefix adds new handler `*after`* existing ones
    //  and neither gives event result to it nor changes it based on the
    //  handler’s return value (which is ignored). Used most often to do some
    //  extra computations after original code has executed, retaining original
    //  result.
    //> -   evArgs... `- Adds new handler `*before`* existing handlers,
    //  otherwise identical to "no prefix".
    //> +   `*res`*, evArgs... `- Adds it `*after`* existing handlers but is
    //  passed current `*event return value`* `'res, and if this handler returns
    //  anything but `'undefined – replaces event result with that value.
    //> =   `*sup`*, evArgs... `- `*Wraps around`* existing handlers by
    //  removing them and passing a single callable `'sup of form `[function
    //  (this, args)`] – first argument corresponds to the object which
    //  initiated the event, second is `'array of arguments that were passed
    //  with the event (can be modified to give underlying handlers different
    //  set of data). `'args can also be `'arguments that the handler received –
    //  in this case first parameter (`'sup) is removed and the rest is given to
    //  underlying handlers.
    //  `[
    //     '=someEvent': function (sup, a1, a2) {
    //       // Passes original context and arguments unchanged.
    //       return sup(this, arguments)
    //       // Identical to above but longer - sup() removes itself from the first argument.
    //       return sup(this, _.rest(arguments))
    //       // Not identical to above - if event was given 3+ arguments they will
    //       // be omitted here but passed through by above.
    //       return sup(this, [a1, a2])
    //       // Changes first argument and omits 3rd and other arguments (if given).
    //       return sup(this, [1, a2])
    //       // Gives no arguments to underlying handlers.
    //       return sup(this)
    //     },
    //  `]
    //
    //# The danger of args__
    //
    // In JavaScript, functions accept extra arguments with ease; often you
    // would use some iterator and only care for one of its arguments. However,
    // with `'args__ you have to pass `*exact`* number of arguments to the
    // function even if its declaration doesn't use the rest. Consider this
    // example:
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
    //   // This handler should always occur when a property is being set... right?
    //   sqim.on('accessor__', function (prop, value) {
    //     alert('Now ' + prop + ' is ' + value)
    //   })
    //
    //   sqim.accessor('name', 'val')  // alerts "Now name is val".
    //
    //   var propsToSet = {prop: 'foo', bar: 123}
    //   // Somewhat contrived example for the brevity sake. Properties are set correctly (map()
    //   // calls accessor() for each item in propsToStr); however, no alerts appear.
    //   // This is because map() passes 3 arguments to iterator: value, key and list itself.
    //   // Therefore even if accessor() processes just 2 of them actual event fired is
    //   // accessor___ (3 underscores).
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
    // Adds a one-shot event listener that removes itself after being called
    // exactly once. In all other aspects `#once() is identical to `[on(event, func,
    // cx)`] (obviously, can only be used for dynamic handlers). Returns event ID
    // suitable for `#off() so you can unregister it before it's called (or after,
    // nothing will happen). Doesn't accept multiple events.
    //
    // `'func can be a string - method name of the object to which the handler is
    // bound (resolved when handler gets called). It can be masked like
    // `[func-..1`] (see `#expandFunc()).
    //
    //? once('-render', function () { ... }, this)
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

    //! `, +fna=function ( [sqim[, events[, cx]]] )
    //
    // If any arguments are given, adds `'sqim (object) to this object's list of
    // tracked objects (`'_autoOff). This list is not used by Sqimitive but your
    // application can use it to unbind all listeners created by this object in
    // the domain of other objects in one go. For example, you can do `[this.autoOff()`]
    // when `'this is about to be destroyed so that events on other objects to which
    // it had any connections won't trigger its old stale handlers. Returns `'sqim.
    //
    // `'events, if given, is an object - event map where keys are event references
    // (comma notation supported) and values are their handlers. `'cx is the context
    // in which handlers will be called (defaults to `'this, the object on which
    // `'autoOff() was called). `'cx can be explicitly set to `'null to keep `'sqim's
    // context. Similar to manually calling `[on({events}, cx)`], see `#on() documentation for details.
    //
    // If `'events is not given only tracks the object without binding any events.
    // One object can be added to the list several times without problems.
    //
    // If `*no arguments`* are given, uses `[off(this)`] to remove listeners of `'this from
    // all previously listed objects and clears the list. Similar to doing `[_.invoke(this._autoOff, 'off', this)`]. Returns `'this.
    //
    //[
    //   var MyNotifyBar = Sqimitive.Base.extend({
    //     events: {
    //       owned: function () {
    //         this.autoOff(new View.LoginForm, {
    //           loggedIn: function () { alert('Hi there!') },
    //           '-multiple, events': ...,
    //         })
    //       },
    //
    //       // This would be an unsafe way - if unnest() was called with any arguments
    //       // (for whatever the reason) autoOff()'s behaviour would change. See the
    //       // note on args__ danger in on().
    //       //'-unnest': 'autoOff',
    //
    //       '-unnest': function () {
    //         this.autoOff()
    //       },
    //     },
    //   })
    //]
    //
    //? autoOff(new Sqimitive, {remove: this.remove}, this)
    //? autoOff(new Sqimitive, {'change:foo, change:bar': 'render'})
    //
    //? this.autoOff()
    //    // unbinds this instance's events from all sqimitives previously
    //    // enlisted by calling autoOff() and clears the list1.
    autoOff: function (sqim, events, cx) {
      if (arguments.length < 1) {
        var list = this._autoOff
        this._autoOff = []
        _.invoke(list, 'off', this)
        return this
      } else {
        this._autoOff.push(sqim)
        arguments.length > 2 || (cx = this)

        // on({event: map}) would fuse the handlers.
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
    // Adds a permanent event listener that cannot be removed with `#off(). `'event
    // is single event reference (`[+some:eveent__`], no comma notation), `'func is a
    // function or a string (method name), optionally masked like `[func-..1`] (see `#expandFunc()). `'cx is context in which func is to be
    // called (defaults to `'this). See `#on() for details. Returns internal event
    // registration object that you should discard without tampering.
    //
    // event = '( [+|-|=]evtname|all ) [_...]' or {event: 'map'}
    // func = 'method' or Function, return non-undefined to override res
    //    - function (args...)
    //    + function (mixed r, args...)
    //    = function (Function sup, args...)
    //      function (args...)
    // cx = object || this
    //
    //[
    //   sqimitive.on({
    //     something: function () { ... },
    //     someone: function () { ... },
    //   })
    //
    //   // Identical to the above.
    //   sqimitive.fuse('something', function () { ... })
    //   sqimitive.fuse('someone', function () { ... })
    //
    //   // Masked callback - receives (a1, a2, a3), passes (a3, a1, a1, a1) to
    //   // sqim.meth().
    //   sqimitive.fuse('somewhere', 'meth-3111', sqim)
    //]
    fuse: function (event, func, cx) {
      func = Core.expandFunc(func)
      event = Core.parseEvent(event)
      // Don't just _events[name] or name in _events because if name is toString
      // or other Object.prototype member, this will fail (array won't be
      // created since 'toString' in _events).
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
          if (Object.prototype.toString.call(args) == '[object Arguments]' &&
              args[0] === sup) {
            args = Array.prototype.slice.call(args, 1)
          }

          return self.constructor.fire.call(self, eobj.supList, args)
        }
      }

      event.prefix == '-' ? list.unshift(eobj) : list.push(eobj)

      // A benchmark with optimized event handlers was done on Chrome:
      // it was discovered that in a certain application 60% of fire() calls
      // were on events with 1 handler so I made it bypass fire() if there were
      // no handlers (replaced the wrapped method, firer() with stub) or 1
      // handler (replaced with direct call to it); this was also maintained
      // on event handler changes (on()/off()).
      //
      // However, performance savings from this optimization were ~5% (on
      // 30k fire() calls) while the added complexity was significant (due to
      // different eobj properties like cx and post which implementation needed
      // to be duplicated in both fire() and the fire()-less wrapper) so it was
      // discarded.

      return eobj
    },

    //! +ig
    // Replaces field on this instance with name matching event by a function
    // that when called triggers event handlers of that event. Does nothing
    // if the field is already a firer or if it's not a function.
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
    // unregistered later with off(). Generates unique handler ID and returns it.
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
    // (the value of cx given to on() or fuse()) and calls func as
    // function (eobjList, indexIn_eventsByCx).
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

    // Undoes the effect of `#on() - removes event listener(s) unless they were
    // `#fuse'd (permanent). Returns `'this. Does nothing if no matching  events,
    // contexts or handlers were found. `#off() is safe to be called multiple
    // times - it will do nothing if there are no registered handlers for given
    // value. When unregistering a wrapping handler (`'=event) its underlying
    // handlers are restored - put in place of the wrapper in the event chain.
    //
    // `'key can be given event name (string like `'render or other – all listeners are removed), a handler ID (string as returned by `#on() - removes that particular handler from that particular event), context
    // (object, that `'cx to which handlers are bound - all with the identical context are removed) or an array of any of these values including more arrays.
    //
    // key = 'evtname' | 'id/123' | {cx} | [key, key, ...]
    //
    // ` `#evt Event overview has a nice example on this subject. See also
    // `#once() that lets you attach one-shot listeners.
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
    // Removes event handler from this instance, if registered. Cleans up
    // all indexes.
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

  // While `#Core implements the fundamental `#evt event framework, this class
  // implements what makes Sqimitive `*the`* Sqimitive – `#opt options, `#el and
  // `#elEvents, `#chld children and `#util filtering and a bit extra.
  //
  // `'Sqimitive has no static fields. The class is accessible globally as
  // `@Sqimitive\Base`@ but since it’s usually the only class you need (and
  // you probably want a shorter name too) – start your project with something
  // like this:
  //[
  //   var MyApp = {...}
  //   // ...
  //   MyApp.Sqimitive = Sqimitive.Base.extend()
  //   // Now refer to MyApp.Sqimitive everywhere throughout your code.
  //]
  Sqimitive.Base = Core.extend({
    // ** Can be set upon declaration and runtime.
    //
    // List of options or attributes (as in Backbone.Model) of this instance.
    // Methods/events get()/set() are meant to be used to access this data.
    //
    // Format:    {name: value}
    //
    // Defines initial object `#opt options – similar to
    // `@bb:Model-attributes`@ in `[Backbone.Model`]. When any option value is
    // changed `'change:OPTION and `'change events occur but before that occurs
    // `'normalize_OPTION. This object can be initially set with `#extend() but
    // it’s not advised to access it directly – use `#get() and `#set() instead
    // or you will bypass normalization and event triggering.
    //
    // `'_opt is an object where keys are option names and values are anything,
    // of arbitrary type. `'_opt is listed in `#_mergeProps so subclasses
    // defining it will add to their parents' options instead of overwriting
    // them entirely.
    _opt: {},

    //! +ig
    // Not meant for tampering with. Used internally to reverse set()-produced
    // events. See _fireSet() for explanation.
    _firingSet: null,

    // References a sqimitive that owns this object. If there's none is set to
    // `'null. You can read this property but writing is discouraged because it
    // may very well break integrity - use `#nest(), `#unnest() and others.
    //
    // Non-owning sqimitives (see `#_owning) never change their children' `'_parent.
    _parent: null,

    // When this object is owned `#_owning by another sqimitive this property is set to
    // the key under which it's listed in its parent's `#_children and which can
    // be given to `#nested() and others. This is always a string or, for non-owned sqimitives – `'null
    // along with their `#_parent.
    _parentKey: null,

    // An object with keys being nested children' `#_parentKey's (always strings) and values being
    // the children themselves. Note that this is a purely formal nesting and
    // doesn't dictate any DOM structure (children can have their `#el's outside
    // of the parent's node).
    //
    // It's recommended to access children using `#nested() and other methods
    // instead of manipulating `#_children directly. Both `#_owning
    // sqimitives and not list their children here.
    //
    // See the `#chld children overview for examples.
    //
    // Format:    {key: Sqimitive}
    _children: {},

    // ** Can be set upon declaration.
    //
    // Specifies if sqimitive manages its children or not (by default it does).
    // Managed (owning) parent means that all of its children know who owns them,
    // under which key (see `#_parentKey) and makes sure they only have one parent -
    // itself. Unmanaged (`'false) parent simply acts as a collection of children still
    // providing filtering `#util and other Sqimitive features but not imposing any
    // structure onto its children, which do not even know that they are listed
    // here. More details are found in the `#chld children overview.
    //
    // Many properties and methods including `#_childEvents can be used in both modes.
    _owning: true,

    // ** Can be set upon declaration or runtime (affects only new children).
    //
    // Ensures `#_children contains instances of the specified class as long as
    // children are only added via `#nest() is used and this property isn't changed on runtime. Is meant to
    // be a sub/class of `'Sqimitive (this is not checked though). Set to
    // Object to essentially disable the check. Defaults to `'Sqimitive.
    //
    // If an array or string, init() replaces by the class on this path:
    // [BaseObj, 'Path.To.Class'] or just 'Path.To.Class' (inside this' static
    // properties). Empty string stops searching (so _childClass of '' maps to
    // this). Errors if none found. Useful for "forward type declaration" where
    // the child class is defined after the collection.
    //
    //[
    //   var MyToDoItem = Sqimitive.Base.extend()
    //
    //   var MyToDoList = Sqimitive.Base.extend({
    //     _childClass: MyToDoItem,
    //   })
    //
    //   (MyToDoList).nest({})   // throws an exception.
    //]
    _childClass: null,

    // ** Can be set upon declaration and runtime (affects only new children).
    //
    // Can be overriden in subclasses to automatically `#_forward events occurring
    // in any of `#_children to this instance, with event name prefixed with
    // a dot (e.g. `'render -> `'.render). Identical to manually calling `#on()
    // and `#off() so can even specify methods that will be `#evt turned into events.
    // Event handlers receive the child instance as first argument.
    //
    // Don't list `#unnest here - `#_parent will `#off() itself before that and
    // never receive the notification. Use `#unnested instead or `'-unnest
    // (but in this case if an exception occurs during unnesting your handler
    // won't know this and will be called before the view is removed).
    //
    //? ['-event_', 'set', ...]
    //
    // See `#chld Children overview for a comprehensive example.
    //[
    //   var MyList = Sqimitive.Base.extend()
    //     _childEvents: ['-change'],
    //
    //     events: {
    //       '.-change': function (sqim, name) {
    //         alert('Option ' + name + ' is about to change on ' + sqim._cid)
    //       },
    //     },
    //   })
    //]
    //
    // With multi-level nesting you can forward already forwarded `'_childEvents
    // just like that:
    //[
    //   var MyListGroup = Sqimitive.Base.extend({
    //     // Indicate this object nests MyList instances.
    //     _childClass: MyList,
    //
    //     // MyList forwards '-change' on its children as '.-change' on itself so
    //     // we can foward that event too on this grouping instance. There's no
    //     // limit - '....-change' is perfectly fine and works on 4th nesting level.
    //     // Each forward gets originating object pushed in front so '..-change' gets
    //     // MyList as first argument. '...-change' would get (MyListGroup, MyList).
    //     _childEvents: ['.-change'],
    //   })
    //
    //   // Listening to '-change' that occurred on a MyList child, with MyList being
    //   // nested into MyListGroup.
    //   (new MyListGroup).on('..-change', function (listGroup) { ... })
    //]
    _childEvents: [],

    // ** Can be set upon declaration and runtime.
    //
    // Specifies the way external input object (e.g. API response) is transformed
    // into options when `#assignResp() is called. `#set() is used to assign new values
    // so normalization and change events take place as usual. Part of `#_mergeProps.
    //
    // Format: {respKey: optValue}.
    //
    // `'_respToOpt is an object where keys are input keys and values are one of the following (optValue):
    //> false `- Input item is skipped regardless of options.onlyDefined.
    //> true `- Assign as `'respKey (same key in `[this._opt`]). Input item becomes value for the option by the same name.
    //> string `- Rename and assign respKey under this option name. Same as `'true but changes the option’s name.
    //> function (respValue, key, resp, options) `- Flexible transformation – is called in this object’s context and must return `[['optToSet', value]`]. `'_respToOpt’s key only determines `'respValue given to this function; the latter can access entire `'resp for other data (`'key argument holds the original `'_respToOpt’s key), `'options is the object given to `#assignResp(). If `'optToSet is returned as `'false – the input item is skipped, otherwise it’s option name to set `'value to. `'value can be anything.
    //
    // Missing keys may or may not be passed through to `[this._opt`] unchanged
    // – this depends on the `[options.onlyDefined`] flag of `#assignResp().
    //
    //? _respToOpt = {setAsIs: true, setAsFoo: 'Foo'}
    //    // assignResp({setAsIs: 123, setAsFoo: 'xyz'}) - adds
    //    // {setAsIs: 123, foo: 'xyz'} to this._opt via set().
    //
    //? _respToOpt = {ignore: function () { return [false] },
    //                rename: function (value) { return ['foo', value] },
    //                date: function (value) { return ['date', new Date(value)] },
    //                merge: function (v, k, resp) {
    //                  return ['foo', resp.a.concat(resp.b)
    //                },
    //                setUndefined: function () { return ['foo', undefined] }}
    //    // in function calls respKey only affects which value is passed as
    //    // the first argument; option key is retrieved from the returned array.
    _respToOpt: {},

    // ** Can be set upon declaration and runtime.
    el: false,

    // ** Can be set upon declaration and runtime.
    //
    // Lists automatically bound DOM event listeners for `#el. Format is inherited
    // from Backbone and is an object with keys of `[click[.ns][ .sel #ector]`] form and
    // values being functions (closures) or strings (method names, resolved when
    // event occurs so they can be defined later, optionally masked like `[func-..1`] - see `#expandFunc()). In the latter case be aware of the "Danger of args__" described in `#on() – it’s called as `[function (eventObject)`]. The `'.ns part is ignored
    // but can be used to create unique keys; by convention, the class'
    // handlers don't have ns while mix-ins do.
    //
    // `'elEvents is listed in `#_mergeProps so subclasses defining it add to their
    // parents' events instead of overwriting them entirely (but identical keys are still overwritten).
    //
    // If using `@Sqimitive\jQuery`@, listeners are automatically rebound by `#attach().
    // See also Sqimitive.jQuery's `'attachPath `@jQuery._opt`@.
    //
    // Format:    {'click[ .sel .ector]': Function|'methodName'}
    //
    // ` `*Attention:`* do not use ES6 arrow functions as values because their
    // `'this would be fixed to the context of the caller of `#extend().
    //[
    //   var MyView = Sqimitive.Base.extend()
    //     el: {tag: 'form'},
    //
    //     elEvents: {
    //       // Attach listener to this object's el.
    //       submit: function (e) {
    //         e.preventDefault()
    //         // ...
    //       },
    //
    //       // React on change originating from an element with specific name attribute.
    //       'change [name=login]': function () {
    //         this.$('[name=password]').val('')
    //       },
    //
    //       // Call render() whenever value of an element with name attribute changes.
    //       'change [name]': 'render',
    //
    //       // Masked callback - only gives first argument to _linkClicked().
    //       'click a': '_linkClicked.',
    //     },
    //   })
    //]
    elEvents: {},

    // An integer specifying how many nested `#_children this object contains.
    // Just like `[$(...).length`] or `[(new Backbone.Collection).length`].
    length: 0,

    // Triggers `#Core’s constructor which assigns `#_cid, clones all but `#_shareProps, `#fire()s `#init which creates `[this.el`], assigns jQuery `[el.data('sqimitive', this)`] (so you can reverse-lookup a Sqimitive instance from its DOM node – a deplorable practice) and calls `#set() on each member of `'opt (object, if given) to replace default values of `#_opt. Finally fires `#postInit which you should override instead of `'constructor to put your object initialization logic into. Both events receive the same arguments as the constructor was given, which in turn gets them from the `'new operator.
    //
    // `'opt can contain `'el to override
    // default value of `[this.el`] property (see `#_opt; for `@jQuery`@ can be a DOM node or a selector but not an object of attributes). Note that `'el is not automatically attached anywhere after it’s created, nor are its `#elEvents bound – call `#attach() for this.
    //
    // Giving this function a name so that it's visible in the debugger.
    constructor: function Sqimitive_Base(opt) {
      // Ensuring the argument is always an object removes the need for (opt && opt.foo) and allows init/postInit hooks to propagate changes in user-given opt to other handlers.
      // Mere arguments[0] = {} won't work because if arguments.length == 0,
      // this won't update length and so apply() will assume arguments is still empty (0) even though index 0 has been set.
      opt || Array.prototype.splice.call(arguments, 0, 1, {})
      Sqimitive.Base.__super__.constructor.apply(this, arguments)
      this.init.apply(this, arguments)
      this.postInit.apply(this, arguments)
    },

    //! `, +fna=function ( [opt] )
    //
    // Creates `#el, if necessary. Sets `#_opt from object passed to
    // the constructor, if any. See `#constructor description for details.
    //
    // `@Sqimitive\jQuery`@-specific: DOM event listeners (`#elEvents) are bound
    // on `#render() by `#attach(), if `'attachPath option is set.
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
        // By convention, el is given as options to replace the default value of
        // this class, but el isn't a real option.
        name == 'el' || this.set(name, opt[name])
      }
    },

    //! +fn=postInit:opt +ig
    //
    // An event called after `#init() has done its job. Useful to add bindings
    // to nodes and objects that have been created during `#init(). Is called
    // once in each object's life.
    //
    //[
    //   var MySqimitive = Sqimitive.Base.extend({
    //     _button: null,
    //
    //     events: {
    //       postInit: function () {
    //         this._button = this.nest(new Button)
    //       },
    //     },
    //   })
    //]
    postInit: Core.stub,

    // Placeholder for populating this.`#el with the actual contents of this
    // instance (aka `#vw "view"). Default implementation of `@Sqimitive\jQuery`@ re-inserts
    // all nested Sqimitive under their corresponding `'attachPath's under `[this.el`]
    // with `#attach(). It doesn't render them. Returns `'this.
    render: function () {
      this.invoke('attach')
      return this
    },

    attach: function (parent) {
      return this
    },

    // function ( toGet [, toSet [, toReturn]] [, func[, cx]] )
    //
    //> toGet array`, string
    //> toSet null`, array`, string `- if not given, is set to `'toGet
    //> toReturn null`, array`, string `- if not given, is set to `'toSet
    //> func `- given G arguments (G = toGet.length), returns an array (if toSet is an array; result length must be <= toSet.length, missing toSet's members are not set) or a single value
    //    `* if func is missing sets each toSet[N] to toGet[N]; toSet.length must be <= toGet
    //> cx
    //
    //= array of values if `'toReturn is an array`, mixed single value
    //
    // Calling without arguments (without toGet) is an error.
    //
    //?`[
    //   var newMoney = getSet(['money', 'income'], 'money', function (money, income) {
    //     return money + income
    //   })
    //]`?
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
    // Reads one option named `'opt or, if there are no arguments - shallow-copies
    // and returns all options (`#_opt) - it's safe to change the object itself (
    // add/remove properties) but changing its values will indirectly change
    // these options inside the sqimitive.
    //
    // Don't access this.`#_opt directly because you will lose ability to change
    // the "getter" behaviour - e.g. you can read non-existing options or
    // transform them like this:
    //[
    //   var MySetter = Sqimitive.Base.extend({
    //     _opt: {
    //       foo: 'Foo!',
    //     },
    //
    //     events: {
    //       // Now any option can be read as option:up to turn its value into upper case.
    //       '+get': function (res, opt) {
    //         if (opt = opt.match(/^([^:]+):up$/)) {
    //           return this.get(opt[1]).toUpperCase()
    //         }
    //       },
    //     },
    //   })
    //
    //   // Popup: FOO!
    //   alert((new MySetter).get('foo:up'))
    //]
    //
    // Attention: JavaScript objects are unordered. See the note in `#_children.
    //
    //? get()       //=> {opt: 'value', key: 123, ...} (shallow copy)
    //? get('key')  //=> 123
    get: function (opt) {
      return arguments.length ? this._opt[opt] : _.extend({}, this._opt)
    },

    //! `, +fna=function ( opt, value[, options] )
    //
    // Same as `#ifSet() but returns `'this instead of `'true/`'false indicating if
    // the new value was different from the old one or if `[options.forceFire`] was
    // set (and so `#change events were fired).
    //
    // Note: if you are overriding a "setter" you should override `#ifSet instead of
    // `#set() which calls the former.
    //
    //? set('key', 'foo')
    //? set('key', 'foo', true)   // fires 'change_key', then 'change'.
    //
    // See `#ifSet() for details.
    //
    // There’s no standard `'set() version that writes multiple options at
    // once. You might be looking for `#assignResp (useful when assigning a
    // backend response) or `[$.each(opts, _.bind(model.set, model))`].
    set: function (opt, value, options) {
      this.ifSet(opt, value, options)
      return this
    },

    //normalize_OPT: function (value, options) { return _.trim(value) },
    //
    //! +fn=normalize_OPT:value:options
    // When setting any `#_opt, new value first gets normalized by calling
    // function/event named this way, if it is defined. It's a good place to
    // throw an error on wrong format too. `'options is an object with contents
    // originally given to `#set() or `#ifSet(). There is no global normalization
    // function but you can override `#ifSet() for this purpose.
    //
    //[
    //   var MyNorm = Sqimitive.Base.extend({
    //     _opt: {
    //       stringie: '',
    //     },
    //
    //     // Now stringie is guaranteed to have no surrounding whitespace and be
    //     // lower case - as long as it's not written directly as this._opt.stringie.
    //     normalize_stringie: function (value) {
    //       return _.trim(value).toLowerCase()
    //     },
    //   })
    //
    //   // Popup: foo
    //   alert( (new MyNorm).set('stringie', '  Foo\n').get('stringie') )
    //]
    //
    // Remember: when defined in events, return value is ignored unless '=' or
    // '+' prefixes are used: '+normalize_my'.

    //change_OPT: function (value, old, options) { ... },
    //
    //! +fn=change_OPT:value:old:options
    // When new normalized (`#normalize_OPT) option value is different from current one (given
    // as `'old), an event named this way gets called after writing the value
    // to `#_opt. `'options is an object with contents originally given to `#set()
    // or `#ifSet(). See also `#change() that gets called after any change
    // (after corresponding `'change_OPT).
    //
    // If you refer to the handler by its string name as in the example below –
    // be aware of the "Danger of args__" described in `#on().
    //[
    //   var MyNorm = Sqimitive.Base.extend({
    //     _opt: {
    //       caption: '',
    //     },
    //
    //     events: {
    //       // When caption is changed - calls render() to update the interface.
    //       change_caption: 'render',
    //     },
    //   })
    //]
    //
    // Here is how you can propagate custom `'options:
    //[
    //   sqim.on('change_foo', function (value, old, options) {
    //     if (!options || !options.noSync) {
    //       $.ajax({
    //         url: 'update',
    //         type: 'POST',
    //         data: this.get(),
    //       })
    //     }
    //   })
    //
    //   // The handler above performs an AJAX request:
    //   sqim.set('foo', 123)
    //
    //   // But not now:
    //   sqim.set('foo', 123, {noSync: true})
    //
    //   // assignResp() passes options given to it through to set() so the handler
    //   // doesn't perform the request:
    //   sqim.assignResp({foo: 123}, {noSync: true})
    //]

    //change: function (opt, value, old, options) { ... },
    //
    //! +fn=change:opt:value:old:options
    // Gets called after each change_OPT with the same parameters as it and
    // the changed option name put in front. See its description for details.

    //! `, +fna=function ( opt, value[, options] )
    //
    // Writes one option (this.`#_opt). First calls `#normalize_OPT on `'value, then
    // fires `#change and `#change_OPT events if the normalized value was different
    // (as reported by `@un:isEqual`@()) or if `[options.forceFire`] was set. Returns `'true if events
    // were fired (value differs or `[options.forceFire`] given).
    //
    // `'options can be used to propagate custom data to event listeners on
    // `#normalize_OPT(), `#change_OPT() and `#change().
    //
    // It is safe to set more options from within `'ifSet(), `#normalize_OPT or
    // `#change handlers - they are written immediately but subsequent `'normalize and
    // `'change events are deferred in FIFO fashion (first set - first fired).
    //
    //? ifSet('key', 123)         //=> false
    //? ifSet('key', 123, true)   //=> true
    //
    // See also `#set() and `#opt Options overview.
    //
    //[
    //   var MySetter = Sqimitive.Base.extend({
    //     _opt: {
    //       readOnly: 'foo',
    //     },
    //
    //     events: {
    //       // Our handler will be called before inherited ifSet() which will prevent
    //       // modification of this._opt.readOnly when they are done via set/ifSet -
    //       // the recommended way.
    //       //
    //       // Make sure not to use '-set' though because set() calls ifSet() and it
    //       // would be still possible to change readOnly with ifSet('readOnly', 'bar').
    //       '-ifSet': function (opt) {
    //         if (opt == 'readOnly') {
    //           throw 'You shouldn\'t really change what is called readOnly, you know?'
    //         }
    //       },
    //     },
    //   })
    //]
    //
    // You can take advantage of `#ifSet()’s return value to perform
    // interlocking operations (not necessary concurrently-safe but at least
    // saving a call to `#get()):
    //[
    //   if (sqim.ifSet('eventsBound', true)) {
    //     // eventsBound was previous false (not === true) and it was now changed to
    //     // true so we can do what we need, once.
    //   }
    //]
    // ...as a short form of:
    //[
    //   if (!sqim.get('eventsBound')) {
    //     sqim.set('eventsBound', true)
    //     // ...
    //   }
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
    // nested calls until previous change event batch has returned thus
    // calling them in order of changes so last change triggers events last.
    //
    // Consider calling set('original', 'new') on this object:
    //
    //    Sqimitive.extend({
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
    //
    // Logically you would expect these events: 'change_original', 'change' of
    // original, 'change_linked', 'change' of linked. However, without deferred
    // handling 'change_original' will trigger 'change_linked', 'change' of
    // linked and only then - 'change' of original.
    //
    // This would be also a problem if changing the same option from within
    // its own event handler as 'change' with the new value would be fired first
    // (since set() was called last), then when original set() returns it would
    // also fire 'change' but with the original, now old, value.
    _fireSet: function (item) {
      // Without reversing the stack if a handler set the same option .
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

    // function ( [key,] sqim [, options] )
    //
    // Convenient wrapper for nestEx(), which returns `'sqim and has several
    // (shorter) call forms. key is a string or number, `'sqim and options - objects.
    //
    // Do not hook this method - it may be bypassed; hook nestEx().
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

    // options must have at least child (a Sqimitive) and key (its key in _children).
    //
    // Adds new contained Sqimitive instance `'sqim to self. Unless `'this.`#_owning is
    // `'false, one Sqimitive can only have one parent or none thus forming a
    // bi-directional tree (see `#chld). If `'key is omitted `#_defaultKey() is called to determine
    // it, which by default returns `'sqim.`#_cid (unique instance identifier).
    // Updates `'sqim.`#_parent and `#_parentKey. `'options are currently unused but can
    // be used to propagate custom data to event listeners (it's also passed
    // through by `#assignChildren()). For example, an ordered sqimitive can receive insertion order via options.
    //
    // Errors if trying to nest object of wrong class (not `#_childClass).
    // Unnests `'sqim from its former parent, if any. Calls
    // `'this.`#unnested() if the key was previously occupied. `#_forward's
    // events of `'sqim according to `#_childEvents. Finally, calls `'sqim.`#owned()
    // to notify new child of the parent change.
    //
    // Does nothing if `'sqim is already contained in this instance
    // under the same `'key (`'changed is false, `'previous == `'child); if `'key differs removes and nests `'sqim again. Else changed is true, and if
    // this._owning is set sqim is removed from its current parent (which
    // may be this) beforehand; if non-_owning, sqim is always added and may
    // even duplicate in _children - to avoid this hook '=nestEx' and call
    // sup only if !this.contains(sqim).
    //
    // When hooking nestEx() to listen for changes (newly added sqimitives),
    // check changed to avoid triggering your update logic if
    // sqim was already nested.
    //
    // Mutates and returns `'options: adds string `'key, `'previous
    // (Sqimitive) and `'changed (bool) are added. Old length is `[previous ?
    // this.length : this.length - 1`].
    //
    // Errors if `'key is `'undefined, `'null or `'object (as given or returned
    // by `#_defaultKey()). Converts key to string.
    //
    // There’s no standard `#nest() version that adds multiple child objects at
    // once. You might be looking for `#assignChildren() (useful when assigning
    // a backend response).
    //
    //[
    //   sqim.nest(new Sqimitive)          // _parentKey = 'p123'
    //   sqim.nest('key', new Sqimitive)   // _parentKey = 'key'
    //   sqim.unlist('key')
    //     // If sqim._owning is false - removes and returns the child under 'key', if any.
    //     // For _owning sqim this will call sqim.remove().
    //]
    //
    // ` `*When listening to nest as an event`* and if you need to retrieve the
    // nested object – use `'+nest or `'=nest event forms (`#on()). This will
    // pass result returned by `'nest() – the child – as the callback’s first
    // argument. With `'nest or `'-nest first argument will be whatever was
    // given to `#nest() – which might be `'sqim but might also be `'key.
    //
    //[
    //   sqim.on('+nest', function (nested) {
    //     alert(nested._cid)
    //   })
    //
    //   sqim.on('=nest', function (sup, nested) {
    //     var nested = sup(this, arguments)
    //     alert(nested._cid)
    //     return nested
    //   })
    //
    //   // In contrast...
    //   sqim.on('nest', function (nested) {
    //     console.dir(nested)
    //   })
    //
    //   // Everything's okay.
    //   sqim.nest(new MySqimitive)
    //   // But not now - 'nested' above is string "key".
    //   sqim.nest('key', new MySqimitive)
    //]
    nestEx: function (options) {
      var sqim = options.child

      if (!(sqim instanceof this._childClass)) {
        throw new TypeError('nestEx: Nesting Sqimitive of wrong class')
      } else if (typeof options.key == 'object') {    // object or null.
        throw new TypeError('nestEx: Bad key given')
      }

      // Object keys are always strings; _parentKey mismatching actual key will
      // break indexOf() if it's used on an array like _.keys(this._children).
      var key = options.key += ''
      var prev = options.previous = this._children[key]

      if (options.changed = prev !== sqim) {
        if (this._owning) {
          prev && prev.unnest()
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

    // Is called when `#nest() wasn't given an explicit key to determine one.
    // `'sqim is the sqimitive that is about to be nested into this instance.
    // Similar to Backbone’s `@bb:Model-idAttribute`@.
    //
    // If you're trying to index children by some "ID" attribute (like Backbone's
    // Collection) note that `#_parentKey `*will not`* be auto updated if that
    // attribute changes. You should react to the change yourself, for example:
    //[
    //   var MyCollection = Sqimitive.Base.extend({
    //     _childEvents: ['.change_id'],
    //
    //     events: {
    //       // '.change_id' will only occur for models which _parent is this.
    //       // They will be re-nested with nest() expanding to
    //       // nest(this._defaultKey(sqim), sqim) which is like nest(newID, sqim).
    //       // This will cause sqim to be unnest()'ed and then nested with the new key.
    //       '.change_id': function (sqim) { this.nest(sqim) },
    //     },
    //
    //     _defaultKey: function (sqim) {
    //       return sqim.get('id')
    //     },
    //   })
    //]
    _defaultKey: function (sqim) {
      return sqim._cid
    },

    //! +fn=owned +ig
    //
    // Is called after `'this instance has been `#nest'ed into an `#_owning sqimitive
    // (changed parents/got a first `#_parent). `'this.`#_parent and `#_parentKey are
    // already set. Takes no arguments, can return anything.
    // Not to be called directly.
    //
    // Defining this as a `#stub lets Sqimitive remove this function instead
    // of calling it as a handler when new handler is registered for this event.
    //
    // See also `#unnest() that gets called before `#_parent is changed/removed.
    //
    //[
    //   var MyChild = Sqimitive.Base.extend({
    //     events: {
    //       // Will append this.el to parent's .some-point node as soon as this
    //       // instance gets a new parent.
    //       owned: function () {
    //         this.attach(this._parent.$('.some-point'))
    //       },
    //     },
    //   })
    //]
    owned: Core.stub,

    // Forwards each of events to `'sqim instance by firing `'prefix + `'event_name
    // (complete with symbols) on this instance (the one `'_forward is called on) with `'sqim pushed in front of original event
    // arguments. This is used to forward `#_childEvents, with `'prefix = `[.`].
    //
    // For example, `[origin._forward('dlg-', ['change', '-render'], destination)`] will
    // fire `[dlg-change`] and `[dlg--render`] events on `'destination (a Sqimitive)
    // whenever `'change and `'render are fired on `'origin.
    //
    //? p.on('.render', function (o) { ... })
    //  o._forward('.', ['render'], p)
    //    // now p's .render will get called, with o as the first argument.
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

    // If this._owning is unset, unnests a child by its key or instance (does
    // nothing if this key/child is not contained). If _owning is set (it is by
    // default) checks if key is nested and if it is calls remove().
    //
    // Returns the unnested sqimitive or undefined.
    //
    // In contrast to unnest() this method is called on the parent object because
    // there's no reverse child -> parent relationship in non-owning mode.
    //
    //? collection.unlist('foo')    //=> Sqimitive or undefined
    //? collection.unlist(collection.nested('foo'))   // identical to above
    //? collection.unlist(child)    //=> Sqimitive (child) or undefined
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

    // Removes this instance from its parent object, if any. This effectively
    // creates new detached tree (if this has nested objects) or leaf (if not) -
    // see more about the `#chld Children concept. It may be called even if `'this.`#_parent
    // was already `'null. Calls `[unnested(this)`] on former parent.
    // Note that it doesn't remove `'this.`#el from its parent node - use `#remove() for this.
    //
    //[
    //   var MyChild = Sqimitive.Base.extend({
    //     events: {
    //       '-unnest': function () {
    //         // this._parent and _parentKey are still set if this instance was
    //         // attached to any parent, otherwise they are null.
    //         this._parent && alert("I am about to be... unnested! :'(")
    //       },
    //
    //       unnest: function () {
    //         // At this point _parent and _parentKey are certainly null but there's
    //         // no telling if they were so - or if this instance had any parent before
    //         // unnest() was called.
    //         alert('I am now as free as the wind!')
    //       },
    //
    //       // In contrast to the above, here we can reliably determine if this
    //       // sqimitive was previously nested and if it was - do something after
    //       // it was unnested by calling standard handler.
    //       '=unnest': function (sup) {
    //         var hadParent = this._parent
    //         sup(this, arguments)
    //         hadParent && alert('I was abducted but you saved me!')
    //         return res
    //       },
    //     },
    //   })
    //]
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

    // Is called right after a child `'sqim was detached from its parent (`'this).
    // Default implementation unregisters (`#off()) all event handlers that might
    // have been previously attached to `'sqim by this object (provided they
    // were not hardwired with `#fuse() and used `[cx === this`]). At this point `'sqim.`#_parent and `'sqim.`#_parentKey are already `'null.
    //
    // If `'this.`#_owning is `'false this is called when unnesting a child via
    // `#unlist().
    //
    // Can return anything. Not to be called directly.
    //
    //[
    //   var MyParent = Sqimitive.Base.extend({
    //     events: {
    //       unnested: function (sqim) {
    //         alert('Where thou go, my ' + sqim._cid + '...')
    //       },
    //     },
    //   })
    //]
    unnested: function (sqim) {
      sqim.off(this)

      if (this.length < 0 && console && console.error) {
        console.error('Broken nesting: sqimitive.length below zero')
      }
    },

    //! `, +fna=function ( [key] )
    //
    // Returns all nested sqimitives (in arbitrary order) if `'key is not given, or a child by its key
    // (`#_parentKey, case-sensitive) or its object instance. Returns `'undefined if
    // given key/object `'key isn't nested in this instance or `'key is `'null or `'undefined.
    //
    // Attention: JavaScript objects are unordered. See the note in _children.
    //
    //? sqim.nested()   //=> {childKey1: Sqimitive, ...}
    //? sqim.nested('childKey1')    //=> Sqimitive
    //? sqim.nested('foobarbaz!')   //=> undefined
    //
    //? var child = sqim.nested('childKey1')
    //  sqim.nested(child)          //=> child
    //  sqim.nested(new Sqimitive)  //=> undefined - argument not listed in sqim._children
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

    //! `, +fna=function ( start [, length] )
    //
    // Similar to `'Array's `'slice(); treats this instance's `#_children as an
    // ordered array instead of `[{key: Sqimitive}`] object as returned by `#nested().
    //
    // Attention: end index is not included into result. If start == end, an
    // empty array is always returned.
    //
    //? slice(1, 2)   // get 2nd child as an array
    //? slice(-1)     // get last child as an array; last() is more convenient
    //? slice(5, 8)   // get 6th and 7th children as an array; no 8th!
    //? slice(0, 0)   // start == end - always empty array
    //? slice(1, -1)  // get all except first and last children
    //
    // Attention: JavaScript objects are unordered so this may return
    // entries in arbitrary order. See the note in _children. Use either
    // Ordered mix-in or override this method with one that sorts result
    // based on some criteria (may be slower than Ordered that maintains sort
    // order as children come and go). slice() is used by all other functions
    // converting accessing _children as an array, so each(), etc. are
    // affected.
    //
    //? '=slice': function (sup, start, end) {
    //    var sorter = function (a, b) { return a.get('pos') - b.get('pos') }
    //    return _.values(this._children).sort(sorter).slice(start, end)
    //  }
    slice: function (start, end) {
      // _.values(), _.toArray(), Object.keys(), etc. return values in
      // arbitrary order. The default Sqimitive is unordered.
      return _.values(this._children).slice(start, end)
    },

    // function (sqim)
    // function (func[, cx])
    //
    // func = function (sqim, key). Compatible with Underscore, etc.
    findKey: function (func, cx) {
      var eq = func instanceof Object
      for (var key in this._children) {
        if (eq
              ? (this._children[key] == func)
              : func.call(cx, this._children[key], key, this._children)) {
          return key
        }
      }
    },

    // Shorthand to _(sqim.slice()), instead of _.chain(). Only works if
    // supported by your utility library (Underscore/LoDash but not NoDash).
    _: function () {
      return _(this.slice())
    },

    // Similar to `#unnest() but before unnesting removes `'this.`#el from its
    // parent (DOM) node. Note that this doesn't recursively remove all nested
    // `#_children as it might not be desired and slow; if they need to do some
    // on-removal actions like removing event handlers - you can do
    // `[this.sink('remove')`] (recursive).
    //
    //[
    //   var child = new Sqimitive.Base({el: '<p>Some text.</p>'})
    //   var parent = new Sqimitive.Base({el: '<article>'})
    //   parent.nest(child).attach(parent.el)
    //   // Now we have <article><p>Some text.</p></article>.
    //
    //   child.unnest()
    //   // Now we still have <article><p>Some text.</p></article> even though
    //   // child is no more listed under parent._children.
    //   // But should we have done this...
    //
    //   child.remove()
    //   /// ...as we would have <article></article> with child removed both
    //   // from parent's children list and its el.
    //]
    remove: function () {
      return this.unnest()
    },

    //! `, +fna=function ( resp [, options] )
    //
    // Merges external "response" object/array `'resp into `#_children by
    // updating existing nested sqimitives, adding new and removing unlisted
    // ones. New sqimitives are created as `[options.childClass`] (an object,
    // a function - called with the response data, or `'null - `'this.`#_childClass).
    //
    // If `'resp is an object with `'data key - uses its value (Python's Flask
    // wraps array response into an object to prevent a JS attack). If `'resp
    // (or `[resp.data`]) were not arrays uses `@un:values`@() to turn it into one
    // (ignoring keys) - remember that JavaScript objects are unordered, so
    // if order of assignment is important - pass the array.
    //
    // If `[options.eqFunc`] is `'null or omitted removes all children thus
    // resetting the list. `[options.eqFunc`] can be a string (option name) given
    // to `#get(), or a `[function (existingSqim, {opt})`] returning `'true if
    // `'existingSqim is the "same" as given `'opt object (a `'resp item) so the
    // former should be retained and updated with `'assignResp(). Children that
    // have never matched `[options.eqFunc`] considered not listed in given resp
    // and removed unless `[options.keepMissing`] is set (if so they are just
    // left unchanged).
    //
    // If `[options.keepMissing`] is set while `[options.eqFunc`] is not - existing
    // children are preserved and for each item in `'resp a new child is
    // nested. Be aware that on duplicate keys (see `[options.keyFunc`]) only the
    // last child will be kept, all others will be removed.
    //
    // `[options.keyFunc`] is a `[function (sqim)`] that should return a `#_parentKey
    // for given sqimitive that is about to be `#nest()'ed. If not present
    // defaults to `#_defaultKey (returns `#_cid by default).
    //
    // `'options as a whole is passed through to `#assignResp() and `#nest() so you
    // can use it to set their specific options and to pass custom data along to
    // your event listeners as they are eventually passed through to
    // `#set(), `#change_OPT() and others.
    //
    // There’s no standard `'assignChildren() version that takes ready-made
    // objects (like Backbone’s `@bb:Collection-set`@()) because many questions
    // arise: do you need to keep old duplicate children or replace them with
    // supplied objects and what to do with event listeners on the old children
    // if you do, or with listeners on the new if you don't, what to consider
    // "duplicate" (some ID attribute? exact same object?), do you want to keep
    // old attributes, etc. Instead of making Sqimitive figure them you should
    // just do exactly what you need.
    //
    //? assignChildren({data: [ {key: 'foo'}, {key: 'bar'} ]}, {eqFunc: 'key'})
    //   // inputs 2 children with _opt = {key: foo} and {key: bar};
    //   // "same" sqimitives are those having the same 'key' option.
    //
    //? assignChildren({data: [ {key: 'foo'}, {key: 'bar'} ]},
    //                {eqFunc: function (sqim, opt) { return sqim._opt.key == opt.key }})
    //   // identical to the above.
    //
    //? assignChildren([ {key: 'foo'}, {key: 'bar'} ], {eqFunc: 'key'})
    //   // identical to the above (resp not wrapped in 'data').
    //
    //? assignChildren({ foosh: {key: 'foo'}, barrsh: {key: 'bar'} }, {eqFunc: 'key'})
    //   // identical to the above (resp turned to array, keys ignored).
    //
    //? assignChildren({ foosh: {key: 'foo'}, barrsh: {key: 'bar'} },
    //                 {eqFunc: 'key', keepMissing: true})
    //   // identical to the above but keeps old children.
    //
    //? assignChildren([ {key: 'foo'}, {key: 'bar'} ])
    //   // similar but removes all nested sqimitives and adds 2 new ones.
    //
    //? assignChildren(..., {onlyDefined: true, forceFire: true})
    //   // passes onlyDefined to assignResp() and forceFire - to set()
    //
    // A complete example:
    //
    //[
    //   var MyList = Sqimitive.Base.extend({)
    //
    //   var MyItem = Sqimitive.Base.extend({
    //     _opt: {
    //       foo: '',
    //     },
    //   })
    //
    //   var list = new MyList
    //   var item1 = new MyItem({foo: 'first'})
    //   list.nest(item1)
    //   var resp = [{foo: 'incoming#1'}, {foo: 'first'}]
    //
    //   list.assignChildren(resp)
    //     // item1 was removed from list, which in turn got two new items:
    //     // 'incoming#1' and 'first' (the latter having identical _opt with the
    //     // removed item but being a newly created and nested object still).
    //
    //   // Let's restore the list.
    //   list.invoke('remove').nest(item1)
    //
    //   list.assignChildren(resp, {eqFunc: function (sqim, opt) { return sqim.get('foo') == opt.foo }})
    //     // Now item1 wasn't removed because the function we passed compared its foo
    //     // option with resp's foo value and got a match. In addition to item1, list
    //     // got one new item - 'incoming#1'.
    //
    //   // But we could have used this short form too if we're simply matching some
    //   // option with the same member in resp:
    //   list.assignChildren(resp, {eqFunc: 'foo'})
    //
    //   list.assignChildren([])
    //     // The list was cleared as there were no items in resp.
    //]
    //
    // This method is named "assign" to emphasize that data may undergo
    // transformations before being assigned by the sqimitive.
    assignChildren: function (resp, options) {
      options || (options = {})
      options.assignChildren = true
      var eqFunc = options.eqFunc
      var keyFunc = options.keyFunc || this._defaultKey

      if (eqFunc == null) {
        options.keepMissing || this.each(this.unlist, this)
      } else if (typeof eqFunc != 'function') {
        var field = eqFunc
        eqFunc = function (sqim, opt) { return opt && sqim.get(field) == opt[field] }
      }

      resp.data && (resp = resp.data)
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
      return [nested, toRemove]
    },

    //! `, +fna=function ( resp [, options] )
    //
    // Filters and/or transforms external input (e.g. API response) into
    // `'this.`#_opt using defined rules (see `#_respToOpt). Calls `#set() to assign
    // resulting values one by one, normalizing them (`#normalize_OPT) and firing corresponding
    // `#change events. The order of set() calls is undefined because JavaScript
    // objects are unordered.
    //
    // If `[options.onlyDefined`] is set then keys in `'resp that are missing from
    // `#_respToOpt are ignored, if it's unset they are passed through as if
    // they were all `'true.
    //
    // `'options as a whole is passed through to `#set() so you can use it to
    // pass custom data along to your event listeners on `#normalize_OPT(),
    // `#change_OPT() and `#change().
    //
    //? assignResp({date: '2000-01-01', id_key: '123'})
    //
    //? events: {
    //    // With this override any call to assignResp() will omit resp keys
    //    // that are not present in this._respToOpt.
    //    '=assignResp': function (sup, resp, options) {
    //      return sup(this, resp, _.extend({}, options, {onlyDefined: true}))
    //    },
    // },
    //
    // Subclass can override this method to force certain value of
    // `[options.onlyDefined`] like this:
    //[
    //   var MySqimitive = Sqimitive.Base.extend({
    //      events: {
    //        // With this override any call to assignResp() will omit resp keys
    //        // that are not present in this._respToOpt.
    //        '=assignResp': function (sup, resp, options) {
    //           return sup(this, resp, _.extend({}, options, {onlyDefined: true}))
    //         },
    //     },
    //   })
    //]
    //
    // Here is how this method in conjunction with `#_respToOpt can be used to
    // blend some JSON backend response into the sqimitive:
    //[
    //   var MyModel = Sqimitive.Base.extend({
    //     _opt: {
    //       date: new Date(0),
    //       id_key: 0,
    //     },
    //
    //     _respToOpt: {
    //       // This will transform incoming value into a Date object.
    //       date: function (value, key) {
    //         return [key, new Date(value)]
    //       },
    //
    //       // Pass through the value as it is.
    //       id_key: true,
    //     },
    //
    //     events: {
    //       change_id_key: function () { ... },
    //
    //       normalize_id_key: function (value) {
    //         value = parseInt(value)
    //         if (isNaN(value)) { throw 'What kind of ID is that?' }
    //         return value
    //       },
    //     },
    //   })
    //
    //
    //   var sqim = new MyModel
    //
    //   // Since regular set() is used to assign new values both normalize_id_key
    //   // and then change_id_key are called. As a result we get clean _opt.
    //   sqim.assignResp({date: '2000-01-01', id_key: '123', bazzz: 'Ouch!'})
    //
    //   sqim.get() == {date: Date('2000-01-01'), id_key: '123'}
    //   // date was turned to Date with the transformation function in _respToOpt.
    //   // id_key was turned to number thanks to normalize function we defined.
    //   // bazzz was ignored because onlyDefined wasn't set.
    //]
    //
    // This method is named "assign" to emphasize that data may undergo
    // transformations before being assigned by the sqimitive.
    assignResp: function (resp, options) {
      options || (options = {})
      options.assignResp = true

      for (var key in resp) {
        var value = resp[key]
        var opt = this._respToOpt[key]
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

    // Sends `'event with arguments `'args upstream - triggers it on `'this.`#_parent,
    // then on that parent's parent and so on. If `'fireSelf is true fires
    // `'event on `'this instance beforehand (by default it doesn't).
    // Since it calls methods, not necessary events, you can "recursively"
    // call methods as well.
    // This is very much like DOM's event bubbling except that it happens
    // on sqimitives, not their `#el's. Returns `'this. See also `#sink() that works in the opposite direction.
    //
    // While should not be abused because it makes the execution flow less
    // obvious, it's indispensible for propagating generic signals like errors
    // to whoever is on top.
    //
    //[
    //   // Causes self and all parent sqimitives to be rendered:
    //   sqim.bubble('render', [], true)
    //
    //   // Recursively call invoke('render') on all parents.
    //   sqim.bubble('invoke', ['render'])
    //
    //   // We can use it to obtain data from owning sqimities too:
    //   var out = {}
    //   sqim.bubble('giveMeData', [out])
    //   alert(out.data)
    //   // The above will work if any parent has a handler like this:
    //   parent.on('giveMeData', function (out) { out.data = 'here goes' })
    //]
    bubble: function (event, args, fireSelf) {
      fireSelf && this[event] && this[event].apply(this, args)
      this._parent && this._parent.bubble(event, args, true)
      return this
    },

    // Propagates `'event with arguments `'args to all nested sqimitives, to
    // all nested sqimitives of those sqimitives, to their children and so
    // on. If `'fireSelf is true also fires `'event on `'this instance
    // beforehand. Note that it might get quite intense with heavy nesting.
    // Returns `'this.
    // Since it calls methods, not necessary events, you can "recursively"
    // call methods as well.
    // See also `#bubble() that works in the opposite direction.
    //
    //[
    //   // Recursively causes all nested views and self to be rendered.
    //   sqim.sink('render', []. true)
    //
    //   // Recursively call remove() on self, all children and their children, removing
    //   // every single sqimitive from its parent (not necessary practical, just an
    //   // illustration).
    //   sqim.sink('invoke', ['remove'], true)
    //
    //   var serialized = [];
    //   sqim.sink('saveTo', serialized)
    //   // Now if children implement something like this serialized will contain
    //   // a portable representation of the current hierarchy (without self):
    //   child.saveTo = function (ser) { ser.push(this.get()) }
    //   localStorage.setItem('saved', JSON.stringify(serialized))
    //]
    sink: function (event, args, fireSelf) {
      fireSelf && this[event] && this[event].apply(this, args)
      this.invoke('sink', event, args, true)
      return this
    },
  })

  // Reference to self in the instance property. Can't be set when extending
  // because the target member doesn't exist yet.
  Sqimitive.Base.prototype._childClass = Sqimitive.Base

  // Static fields of Sqimitive.Base.
  Sqimitive.Base._mergeProps.push('_opt', 'elEvents', '_respToOpt')
  Sqimitive.Base._shareProps.push('_childClass')

  //! +cl=Sqimitive.Ordered
  //
  // A mix-in. MySqim.mixIn(Sqimitive.Ordered).
  //
  // JavaScript objects are unordered, even if it appears to work the way
  // you expect. Example: Object.keys({9: 0, 1: 0}) is [1, 9].
  //
  // Sqimitives are unordered by default; this affects nested(), toArray()
  // and many other functions. Ordered sqimitives are slower.
  //
  // Can be made non-_owning.
  //
  // If _owning, duplicates are never allowed, else they are allowed by
  // default - to disallow wrap '=nestEx' in a contains() check (see a
  // note in nestEx()).
  Sqimitive.Ordered = {
    // Same as _children but in specific order as determined by _sorter().
    // Is kept in sync with _children.
    //
    // Is an array of entries, each entry being an object with these keys:
    // - child - a Sqimitive in _children
    // - key - child's key in _children
    // - pos - option value from nest()'s options.pos
    _ordered: [],

    events: {
      // options may have pos key to specify the position relative to other
      // children. This key may be used by _sorter().
      //
      // Returned options have index key - actual position of the new child
      // in _ordered, and oldIndex key - only if !changed, to see if child
      // was moved to another _ordered position without changing its key.
      //
      // If re-nesting the same child on the same key, _ordered position is
      // updated if old and new pos are different (!_.isEqual()); changed
      // remains false (detect this case by comparing index and oldIndex).
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
          // pick() removes other keys which may reference objects
          // preventing their GC and clones options to avoid indirect changes
          // by the caller (nestEx() returns the object as is).
          this._ordered.splice(res.index, 0, _.pick(res, 'child', 'key', 'pos'))
          this._repos(res.child, res.index)
        }
      },

      unnested: function (sqim) {
        // Owning Ordered sqimitives can never have duplicates so no matter
        // from where unnesting is called, we don't need any more info than
        // the sqim itself to locate its correct entry in _ordered.
        //
        // For a non-_owning duplicating sqimitive we do need sqim's former
        // key. Unnesting can happen either in nestEx() (when replacing old
        // sqim with another sqimitive) or in unlist() (when removing a
        // particular sqim). In both cases we have the needed info but it's
        // there in those methods so removal from _ordered is handled there.
        if (this._owning) {
          // _parentKey is not available at this point.
          var entry = _.find(this._ordered, function (entry) {
            return entry.child == sqim
          })
          this._removeFromOrdered(entry.key, sqim)
        }
      },

      // Non-_owning duplicating Ordered's unlist() removes all occurrences
      // of a child if given an object or a particular one if given a string
      // (key).
      '+unlist': function (sqim, key) {
        if (!this._owning) {
          if (sqim == key) {    // object given.
            this._ordered = this._ordered.filter(function (entry) {
              return entry.child != sqim
            })
          } else {      // string given.
            this._removeFromOrdered(key, sqim)
          }
        }
      },

      // Returned array has guaranteed order. Object keys are lost (if this is non-_owning).
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

    // If sqim is missing, it's read from _children (in this case _indexOf()
    // should not be called after sqim was already unnested).
    _indexOf: function (key, sqim) {
      key += ''
      sqim = sqim || this._children[key]
      return _.findIndex(this._ordered, function (entry) {
        // Technically only comparing keys would suffice (since
        // _children can't have 2 members with the same key) but
        // comparing objects first is faster.
        return entry.child == sqim && entry.key == key
      })
    },

    // entry - object with child/key/pos keys.
    // Gets called assuming entry.child is not yet nested in this.
    // pos is coming from nest()'s options.
    _indexFor: function (entry) {
      return this.constructor.indexFor(this._ordered, entry, this._sorter, this)
    },

    // See indexFor() for invokation format. Default implementation compares
    // pos (given to nest()) or keys (given _defaultKey(), these are _cid's).
    //
    // a and b are _ordered entries (objects). During nestEx() one of them
    // may be missing from _ordered but present in _children; during resort()
    // both are present in _ordered. b is null on the first iteration.
    //
    // If using pos, make sure to supply correct types: 10 is > 2 (or '10'
    // or '2') but '10' is < '2'.
    _sorter: function (a, b, posB) {
      a = a.pos == null ? a.key : a.pos
      return arguments.length == 1 ? a
        // Not simply a - posB to work with non-numeric key/pos.
        : (a > posB ? +1 : (a < posB ? -1 : 0))
    },

    // Re-sorts the entire _ordered. Useful if sorting was temporary disabled or if some option was changed that affects sort order.
    // Disabling is useful during mass assignment:
    //
    // var hook = this.on('=_indexFor', Sqimitive.stub)
    // try {
    //   this.assignChildren(data)
    // } finally {
    //   this.off(hook)
    //   this.resort()
    // }
    //
    // _opt: {
    //   invert: false,
    // },
    // events: {
    //   '=_sorter': function (sup) {
    //     var res = sup(this, arguments)
    //     return -res || res
    //   },
    //   change_invert: 'resort',
    // },
    resort: function () {
      this._ordered.sort(function (a, b) {
        // function (a, b, posB) - obtain that posB (simulating first
        // iteration of indexFor()).
        return this._sorter(a, b, this._sorter(b))
      }.bind(this))
      this.each(this._repos, this)
      return this
    },

    //! +fn=_repos:child:index +ig
    //
    // Called for newly nested and changed children. Not called for removed
    // children. resort() calls it for all children even if some didn't change
    // positions (this is hard to determine) - note Array's forEach() implications
    // (in ascending order from child #0 to last; if _repos() mutates children
    // then some of them are skipped).
    //
    //* sqim object - the child that has changed position
    //* index int - sqim's index (see `#at())
    _repos: Core.stub,

    //= object entry in _ordered
    //
    // Returns detailed info about a child by its index in _ordered (this
    // index is given to utility functions like each()). Do not change the
    // returned object.
    //
    // This object's format conveniently matches that accepted by nestEx().
    //
    //? at(0)         //=> {child: Sqimitive, key: 'foo', pos: 3}
    //? at(999)       //=> undefined (if length <= 999)
    //? at(-1)        //=> always undefined
    //? this.groupBy(function (sqim, i) { return this.at(i).pos })
    //? clone.nestEx(orig.at(i))
    at: function (index) {
      return this._ordered[index]
    },

    staticProps: {
      // Adapted from Underscore's sortedIndex().
      // Supports two sort function styles: relative (a, b) and weight-based (a).
      //
      // func is called first with 1 argument to return value's weight (which is
      // stored for later calls), then called repeatedly to compare it against
      // other members (returning < 0 if b must go before a, > 0 if after, == 0
      // if their sort order is the same and either can go in front of another).
      //
      // Relative func ignores the first call, otherwise is the same as with
      // standard sort():
      //   indexFor(a, v, function (a, b) {
      //     return a > b ? +1 : (a < b ? -1 : 0)
      //     // This would fail without a check because b may be null:
      //     return b && (a.prop - b.prop)
      //   })
      //
      // Weight-based func uses all 3 arguments:
      //   indexFor(a, v, function (a, b, posB) {
      //     var posA = a.someWeightProp    // assuming it's a number.
      //     return arguments.length == 1 ? posA : (posA - posB)
      //   })
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
  // Their availability and behaviour depends on the library in use (NoDash,
  // etc.).
  //
  // For portability avoid shortcut iterator syntaxes - it's only
  // supported in Underscore (iteratee() - not in NoDash, LoDash or built-in
  // Array/Object methods). The only exception are pick()/omit() where it
  // may be list of property names (in LoDash it must be that).
  //
  // Attention: JavaScript objects are unordered so each(), etc. can iterate in any order, find(), etc. can return any of the matching children, etc.
  // In particular, reduceRight() may not strictly iterate from the end, first(), etc. - return that particular child, indexOf(), etc. - have stable result.
  //
  // Sqimitive.Ordered adds iteration order guarantee.

  // iterator = function (Sqimitive child, string parentKey)
  var objectUtils =
    'pick omit keys'

  // iterator = function (Sqimitive child, int index); for non-Ordered,
  // index is an arbitrary sequential number in this particular utility
  // call; for Ordered, it's stable and can be given to at()
  // toArray() is part of this, not objectUtils so that it uses Sqimitive's
  // slice() to preserve the order.
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
