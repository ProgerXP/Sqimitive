/*!
  Sqimitive.js - a JavaScript primitive
  http://squizzle.me/js/sqimitive | Public domain/Unlicense
*/

/***
  Needs Underscore.js and, optionally, jQuery/Zepto for $().

  Fields with names starting with underscores are protected and intended
  for use only inside that class definition and its subclasses.
 ***

  var Task = Sqimitive.Sqimitive.extend({
    el:       {tag: 'li'},
    _opt:     {caption: '', done: false, editing: false, attachPath: '.'},
    events:   {change: 'render'},
    elEvents: {dblclick: function () { this.set('editing', true) }},
  })

  (new Sqimitive.Sqimitive({el: '#tasks'}))
    .nest( new Task({caption: 'Foo'}) )

 ***/

;(function (factory) {
  var deps = {underscore: '_', jquery: '$'}
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
}).call(this, function (_, $) {
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
    version: '1.1',
    // Store reference to the utility library in use (particularly when using
    // modular frameworks so that it's possible to access _() by requiring
    // Sqimitive alone).
    _: _,
  }

  /***
    Sqimitive.Core - Basic Event/Inheritance
   ***/

  var Core = Sqimitive.Core = function () {
    // Guaranteed to be a valid identifier of only Latin symbols, i.e. begin with a letter followed by 0 or more letters, digits and underscores.
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

  // Static fields of Sqimitive.Core.
  _.extend(Core, {
    // For unique(). Format: {prefix: number (last taken)}
    _unique: {},

    // ** Can be set upon declaration.
    //
    // List of names of {object} properties which keys are merged with parent
    // class when redefined in child class. Like _.extend(parentProp, childProp).
    // No need to include parent's _mergeProps there (they are always merged).
    _mergeProps: [],

    // ** Can be set upon declaration.
    //
    // List of names of {object} properties which are not cloned upon construction.
    _shareProps: [],

    // An internal field - list of prototype (instance) properties being
    // copied in the constructor. Running for..in each time is extremely
    // expensives (10X). Maintained automatically by extend()/mixIn().
    // Null causes constructor to collect the props.
    _copyProps: null,

    // function extend( [name,] [protoProps [, staticProps]] )
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
    extend: function (name, protoProps, staticProps) {
      // this = base class.
      // Only works in strict mode which disconnects parameter vars from
      // members of arguments.
      name = typeof arguments[0] == 'string' && Array.prototype.shift.call(arguments)

      var child = extend(name || 'Sqimitive', this, arguments[0])
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
    //   var Base1 = Sqimitive.Sqimitive.extend({})
    //
    //   var Base2 = Sqimitive.Sqimitive.extend({
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
    stub: function Sqimitive_stub() { },

    // Generates and returns a number starting from 1 that is guaranteed to be
    // unique among all calls to unique() with the same prefix during this
    // page load.
    //
    //? unique()      //=> 155
    //? unique('my')  //=> 3
    //? unique('my')  //=> 4
    unique: function (prefix) {
      return this._unique[prefix] = 1 + (this._unique[prefix] || 0)
    },

    // Returns a function that expects one argument (an object) that, when called,
    // checks if given object has prop property and if it does - returns its
    // value (if it's a method then it's called with args (array) and the result
    // returned), otherwise returns undefined (for non-objects or objects with
    // no prop).
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

    // Expands a function reference func of object obj (this if not given) into a
    // real Function. Used in on(), events and others to short-reference instance's
    // own methods.
    //
    // If func is a string and contains a dot or a dash (. -) - returns masked
    // version of this method (mask starts with the first such character). If it's
    // a string without them - returns a function calling method named func on obj
    // (or this if omitted). In other cases returns func as is if obj is omitted
    // or _.bind(func, obj) otherwise.
    //
    //?  var func = Sqimitive.Base.expandFunc('meth')
    //    // returned function will call this.meth(arguments, ...).
    //
    //  var obj = {meth: function (s) { alert(s) }}
    //  func.call(obj, 123)
    //    // alerts 123.
    //
    //? var func = Sqimitive.Base.expandFunc('meth-.', obj)
    //    // this function works in obj context, calling meth with just one
    //    // argument (2nd it was given) - see masker().
    //
    //  _.each({k1: 1, k2: 2}, func)
    //    // each() calls func(1, 'k1') and func(2, 'k2').
    //    // func calls obj.meth('k1') and obj.meth('k2').
    //    // alerts twice: 'k1' and 'k2'.
    //
    //  _.each({k1: 1, k2: 2}, _.bind(func, obj))
    //    // if we didn't give obj to expandFunc() previous example would
    //    // fail - func() would be called on window which has no 'meth' method.
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

    // Returns a version of func with re-routed arguments according to mask.
    // If mask is a number - skips that number of leading arguments as in
    // _.rest(), if omitted - assumed to be number 1 (skip first argument),
    // otherwise it's a mask string - see below.
    //
    // func is either a string (method name as in expandFunc()) or a function
    // - both called on cx or this if omitted or null. args is array of extra
    // left-side arguments.
    //
    // In string mask each symbol maps arguments given to masked func (result
    // of masker()) to original func. It consists of:
    //
    // * Dots - each is replaced by its index in the string ('-..-.' equals to
    //   '-23-5').
    // * Dashes - represent arguments that are to be ignored; trailing dashes
    //   are ignored (arguments past the end of mask are never given unless
    //   mask is a number)
    // * Numbers 1-9 - read arguments by index: 1 reads 1st masked argument,
    //   etc.
    //
    // For example, mask of '-.1' equals to '-21' and gives two arguments: (arg2,
    // arg1). Empty mask passes zero arguments (so do '-', '--', etc.)
    //
    // Note: mask of '3' is different from 3 (number) - the first passes 3rd
    // argument as the first while the second skips first 3 arguments and
    // passes all others.
    //
    // Masking is a way to work around the "Danger of args__" described here
    // and avoid writing simple callback functions which reorder arguments.
    // It is common to alias a shorted reference like var m =
    // Sqimitive.Base.masker and use it in your code since its main
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
    // obj or returned value (obj copy) won't affect its counterpart.
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

    // Extracts portions of the given event identifier as recognized by on().
    // Errors if the string doesn't look like a proper event reference.
    //
    //? parseEvent('-foo.bar___')     //=> ['-', 'foo.bar', '___']
    //? parseEvent('foo.bar')         //=> ['', 'foo.bar', '']
    parseEvent: function (str) {
      var match = str.match(/^([+\-=]?)([\w\d.:+\-=]+?)(_*)$/)
      if (!match) { throw new SyntaxError('Bad event name: ' + str) }
      return {prefix: match[1], name: match[2], args: match[3]}
    },

    // Processes an event call chain. funcs is an array of event registration
    // objects. Calls each handler in turn according to its type (expecting a
    // fixed number of arguments, accepting current result value, affecting
    // return value, etc. according to prefix in on()) while giving it args
    // (array). If a handler returns something but undefined and it's eligible
    // for changing return value (as it's the case for +event and =event), then
    // current result is replaced by that handler's return value. Returns the
    // ultimate return value after calling each handler. There is no way to skip
    // remaining handlers (but if you really need - try all event for this).
    //
    // funcs can be "falsy", in this case undefined is returned.
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

    // Determines if obj is a $ collection (like jQuery or Zepto).
    //
    //? is$(document.rootElement)   //=> false
    //? is$($('html'))    //=> true
    //? is$($('<p>'))     //=> true
    //? is$(null)         //=> false
    is$: function (obj) {
      return obj instanceof $ || ($.zepto && $.zepto.isZ(obj))
    },
  })

  // Instance fields of Sqimitive.Core.
  _.extend(Core.prototype, {
    // An identifier of this object instance unique to all sqimitive's ever
    // instantinated during this page load. Unique to all Sqimitive.Core
    // instances regardless of subclass. Can be used to namespace DOM events as
    // in this.el.on('click.' + this._cid). Begins with "p" for "primitive"
    // followed by a 1-based number.
    _cid: '',

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
    _events: {},

    // Indexes event handlers by ID. Doesn't contain hardwired (fuse()'d)
    // handlers. Values are references to those in _event, not copies.
    // Format:    {id: eventObj}
    _eventsByID: {},

    // Indexes event handlers by their context. Similar to _eventsByID.
    // Format:    [ [cx, eventObj, eventObj, ...] ]
    _eventsByCx: [],

    // Used to track all sqimitives this instance has event listeners for.
    // See autoOff() for more details.
    _autoOff: [],

    // If set this instance logs all event calls by hooking 'all' event.
    // If set this is that event handler's ID.
    _logEventID: null,

    // Run-time mix-in.
    mixIn: function (newClass, options) {
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
          // Could use deepClone but it's more intense - we don't clone eobj's
          // which theoretically could be changed before instanatiation but we
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

    // Triggers an event giving args as parameters to all registered listeners.
    // First fires a special 'all' event and if its return value was anything but
    // undefined - returns it bypassing handlers of event entirely. all gets event
    // put in front of other args (e.g. ['eventName', 'arg1', 2, ...]). It's
    // safe to add/remove new listeners during the event - they will be in effect
    // starting with the next fire() call (even if it's nested).
    //
    // Note that 'all' event is only triggered for actual events so if,
    // for example, render() isn't overriden it will be called as a regular
    // member function without triggering an event.
    fire: function (event, args) {
      if (this._events.all && event != 'all') {
        var allArgs = arguments.length < 2 ? [] : Core.toArray(args).concat()
        allArgs.unshift(event)
        var res = this.constructor.fire.call(this, this._events.all, allArgs)
        if (res !== undefined) { return res }
      }

      return this.constructor.fire.call(this, this._events[event], args)
    },

    // Returns a function that, once called, will call fire(event, args) in context
    // of self (if not given context is unchanged). args can be used to push
    // some parameters in front of that function's args.
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

    // A debug method that enables logging of all triggering events to the
    // console. Pass false to disable. Will do nothing if browser doesn't provide
    // console.log(). Acts as a handler for special all event (see fire()). Note
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
    logEvents: function (enable) {
      if (typeof enable == 'string') {
        // function (event, eventArg1, arg2, ...)
        var info = this._cid

        if (this.el) {
          info += '\t\t' + this.el[0].tagName
          var className = this.el[0].className.trim()

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

    // Adds a one-shot event listener that removes itself after being called
    // exactly once. In all other aspects once() is identical to on(event, func,
    // cx) (obviously, can only be used for dynamic handlers). Returns event ID
    // suitable for off() so you can unregister it before it's called (or after,
    // nothing will happen). Doesn't accept multiple events.
    //
    // func can be a string - method name of the object to which the handler is
    // bound (resolved when handler gets called)
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

    // If any arguments are given, adds sqim (object) to this object's list of
    // tracked objects (_autoOff). This list is not used by Sqimitive but your
    // application can use it to unbind all listeners created by this object in
    // the domain of other objects in one go. For example, you can do this.autoOff()
    // when this is about to be destroyed so that events on other objects to which
    // it had any connections won't trigger its old stale handlers. Returns sqim.
    //
    // events, if given, is an object - event map where keys are event references
    // (comma notation supported) and values are their handlers. cx is the context
    // in which handlers will be called (defaults to this, the object on which
    // autoOff() was called). cx can be explicitly set to null to keep sqim's
    // context. Similar to manually calling on({events}, cx).
    //
    // If events is not given only tracks the object without binding any events.
    // One object can be added to the list several times without problems.
    //
    // If no arguments are given, uses off(this) to remove listeners of this from
    // all previously listed objects and clears the list. Returns this.
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

    // Adds a permanent event listener that cannot be removed with off(). event
    // is single event reference (+some:eveent__, no comma notation), func is a
    // function or a string (method name). cx is context in which func is to be
    // called (defaults to this). See on() for details. Returns internal event
    // registration object that you should discard without tampering.
    //
    // event = '( [+|-|=]evtname|all ) [_...]' or {event: 'map'}
    // func = 'method' or Function, return non-undefined to override res
    //    - function (args...)
    //    + function (mixed r, args...)
    //    = function (Function sup, args...)
    //      function (args...)
    // cx = object || this
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
      return eobj
    },

    // Replaces field on this instance with name matching event by a function
    // that when called triggers event handlers of that event. Does nothing
    // if the field is already a firer or if it's not a function.
    _wrapHandler: function (event) {
      if (this[event] === Core.stub) {
        // Continue - overwrite.
      } else if (typeof this[event] == 'function' && !this[event]._wrapHandler) {
        // Register original method (function) as the first event handler.
        this._events[event].unshift( {func: this[event], ret: true} )
      } else if (event in this) {
        return
      }

      this[event] = this.firer(event)
      this[event]._wrapHandler = event
    },

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

    // Undoes the effect of on() - removes event listener(s) unless they were
    // fuse'd (permanent). Returns this. Does nothing if no matching  events,
    // contexts or handlers were found. off() is safe to be called multiple
    // times - it will do nothing if there are no registered handlers for given
    // value. When unregistering a wrapping handler (=event) its underlying
    // handlers are restored - put in place of the wrapper in the event chain.
    //
    // $key can be given event name (string), a handler ID (string), context
    // (object) or an array of any of these values.
    //
    // key = 'evtname' | 'id/123' | {cx} | [key, key, ...]
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
  Sqimitive.Base = Core.extend({
    // ** Can be set upon declaration and runtime.
    //
    // List of options or attributes (as in Backbone.Model) of this instance.
    // Methods/events get()/set() are meant to be used to access this data.
    //
    // Format:    {name: value}
    //
    // Standard options:
    // * attachPath: '.' (this.el) | '.sel [ector]'
    // * el: {tag: 'p', ...} (only when given to the constructor)
    _opt: {},

    // Not meant for tampering with. Used internally to reverse set()-produced
    // events. See _fireSet() for explanation.
    _firingSet: null,

    // References a sqimitive that owns this object. If there's none is set to
    // null. You can read this property but writing is discouraged because it
    // may very well break integrity - use nest(), unnest() and others.
    //
    // Non-owning sqimitives (see _owning) never change their children' _parent.
    _parent: null,

    // When this object is owned by another sqimitive this property is set to
    // the key under which it's listed in its parent's _children and which can
    // be given to nested() and others. For non-owned sqimitives this is null
    // along with _parent.
    _parentKey: null,

    // An object with keys being nested children' _parentKey's and values being
    // the children themselves. Note that this is a purely formal nesting and
    // doesn't dictate any DOM structure (children can have their el's outside
    // of the parent's node).
    //
    // It's recommended to access children using nested() and other methods
    // instead of manipulating _children directly. _owning and non-_owning
    // sqimitives list their children here.
    //
    // Format:    {key: Sqimitive}
    _children: {},

    // ** Can be set upon declaration.
    //
    // Specifies if sqimitive manages its children or not (by default it does).
    // Managed (owning) parent means that all of its children know who owns them,
    // under which key (see _parentKey) and makes sure they only have one parent -
    // itself. Unmanaged parent simply acts as a collection of children still
    // providing filtering and other Sqimitive features but not imposing any
    // structure onto its children, which do not even know that they are listed
    // here. More details are found in the children overview.
    //
    // Many properties and methods including _childEvents can be used in both modes.
    _owning: true,

    // ** Can be set upon declaration or runtime (affects only new children).
    //
    // Ensures _children contains instances of the specified class as long as
    // nest() is used and this property isn't changed on runtime. Is meant to
    // be a sub/class of Sqimitive (this is not checked though). Set to
    // Object to essentially disable the check.
    //
    // If an array or string, init() replaces by the class on this path:
    // [BaseObj, 'Path.To.Class'] or just 'Path.To.Class' (inside this' static
    // properties). Empty string stops searching (so _childClass of '' maps to
    // this). Errors if none found. Useful for "forward type declaration" where
    // the children class is defined after the collection.
    _childClass: null,

    // ** Can be set upon declaration and runtime (affects only new children).
    //
    // Can be overriden in subclasses to automatically forward events occurring
    // in any of _children to this instance, with event name prefixed with
    // a dot (e.g. 'render' -> '.render'). Identical to manually calling on()
    // and off() so can even specify methods that will be turned into events.
    // Event handlers receive the child instance as first argument.
    //
    // Don't list 'unnest' here - _parent will off() itself before that and
    // never receive the notification. Use 'unnested' instead or '-unnest'
    // (but in this case if an exception occurs during unnesting your handler
    // won't know this and will be called before the view is removed).
    //
    //? ['-event_', 'set', ...]
    _childEvents: [],

    // ** Can be set upon declaration and runtime.
    //
    // Specifies the way external input object (e.g. API response) is transformed
    // into options when assignResp() is called. set() is used to assign new values
    // so normalization and change events take place as usual.
    // Format: {respKey: optValue}.
    //
    // optValue:
    // - false - skip this item
    // - true - assign as respKey (same key in this._opt)
    // - string - rename and assign respKey under this option name
    // - function (respValue, key, resp, options) called in this instance's
    //   contaxt; returns ['optToSet', value]; if optToSet is false then item is
    //   skipped, otherwise value can be anything. options is whatever was given
    //   to assignResp() (always an object).
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

    // ** Can be set upon declaration and runtime (only to a valid $() object).
    //
    // Holds a DOM node assigned to this object or null. If set to false - no
    // element is created (this.el will be null) - useful for data structures
    // aka Models, otherwise is an object of HTML attributes plus the following
    // special keys:
    // * tag - string, tag name like 'li'
    // * className - the same as class (CSS class) to work around the reserved word
    //
    // After inherited constructor has ran el is always DOM node wrapped in $()
    // or null. Not advised to set it directly, treat as read-only.
    el: {tag: 'div', className: ''},

    // ** Can be set upon declaration and runtime.
    //
    // Lists automatically bound DOM event listeners for el. Format is inherited
    // from Backbone and is an object with keys of click[ .sel .ector] form and
    // values being functions (closures) or strings (method names, resolved when
    // event occurs so they can be defined later).
    //
    // Listeners are automatically rebound by attach(). See also attachPath.
    // elEvents is listed in _mergeProps so subclasses defining it add to their
    // parents' events instead of overwriting them entirely.
    //
    // Format:    {'click[ .sel .ector]': Function|'methodName'}
    elEvents: {},

    // An integer specifying how many nested _children this object contains.
    length: 0,

    // Calls init method/event. Each opt member is given to this.set() to
    // populate this._opt after construction. opt can contain el to override
    // default value of this.el property (see _opt).
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

    // Creates this.el, if necessary. Sets this._opt from object passed to
    // the constructor, if any. DOM event listeners (elEvents) are bound
    // on render() by attach(), if attachPath option is set.
    init: function (opt) {
      opt && opt.el && (this.el = opt.el)

      if (this.el && !Core.is$(this.el)) {
        if (_.isElement(this.el) || typeof this.el == 'string') {
          this.el = $(this.el)
        } else {
          var attrs = _.omit(this.el, 'tag', 'className')
          attrs['class'] = this.el.className || ''
          this.el = $( document.createElement(this.el.tag || 'div') )
            .attr(attrs).data('sqimitive', this)
        }
      }

      if (this.el && !this.el.length) {
        throw new TypeError('init: Empty el')
      }

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

    // An event called after init() has done its job. Useful to add bindings
    // to nodes and objects that have been created during init(). Is called
    // once in each object's life.
    postInit: Core.stub,

    // Placeholder for populating this.el with the actual contents of this
    // instance (View). Default implementation re-inserts all nested Sqimitive
    // under their corresponding attachPath's under this.el with attach().
    // It doesn't render them.
    render: function () {
      this.invoke('attach')
      return this
    },

    // Appends el to parent (DOM selector or node). If no argument is given
    // uses attachPath option (if present) to determine the parent. If parent was
    // changed recursively calls attach() on all children of self to rebind their
    // DOM listeners (doesn't happen if no parent was found or this.el is already
    // direct child of the found parent node so performance penalty of subsequent
    // attach() calls is small). Ultimately, binds event listeners defined in
    // elEvents.
    attach: function (parent) {
      parent = arguments.length ? $(parent) : []

      if (!parent[0]) {
        var path = this.get('attachPath')
        path && (parent = this._parent ? this._parent.$(path) : $(path))
      }

      if (parent[0] && parent[0] !== this.el[0].parentNode) {
        parent.append(this.el)
        // Notifying children of the mount node change to rebind their DOM listeners.
        this.invoke('attach')
      }

      if (this.el) {
        var namespace = '.sqim-' + this._cid
        this.el.off(namespace)

        _.each(this.elEvents, function (func, key) {
          func = Core.expandFunc(func, this)
          key = key.match(/^\s*(\S+)( .*)?$/)
          key[1] += namespace
          key[2] ? this.el.on(key[1], key[2], func) : this.el.on(key[1], func)
        }, this)
      }

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

    // Reads one option named opt or, if there are no arguments - shallow-copies
    // and returns all options (_opt) - it's safe to change the object itself (
    // add/remove properties) but changing its values will indirectly change
    // these options inside the sqimitive.
    //
    // Don't access hits._opt directly because you will lose ability to change
    // the "getter" behaviour - e.g. you can read non-existing options or
    // transform them.
    //
    //? get()       //=> {opt: 'value', key: 123, ...} (shallow copy)
    //? get('key')  //=> 123
    get: function (opt) {
      return arguments.length ? this._opt[opt] : _.extend({}, this._opt)
    },

    // Same as ifSet() but returns 'this' instead of true/false indicating if
    // the new value was different from the old one or if options.forceFire was
    // set (and so change events were fired).
    //
    // Note: if you are overriding a "setter" you should override ifSet instead of
    // set() which calls the former.
    //
    //? set('key', 'foo')
    //? set('key', 'foo', true)   // fires 'change_key', then 'change'.
    set: function (opt, value, options) {
      this.ifSet(opt, value, options)
      return this
    },

    // When setting any _opt, new value first gets normalized by calling
    // function/event named this way, if it is defined. It's a good place to
    // throw an error on wrong format too. options is an object with contents
    // originally given to set() or ifSet(). There is no global normalization
    // function but you can override ifSet() for this purpose.
    //
    // Remember: when defined in events, return value is ignored unless '=' or
    // '+' prefixes are used: '+normalize_my'.
    //
    //normalize_OPT: function (value, options) { return _.trim(value) },

    // When new normalized option value is different from current one (given
    // as old), an event named this way gets called after writing the value
    // to _opt. options is an object with contents originally given to set()
    // or ifSet(). See also change() that gets called after any change and
    // after corresponding change_OPT.
    //
    //change_OPT: function (value, old, options) { ... },

    // Gets called after each change_OPT with the same parameters as it and
    // the changed option name put in front.
    //
    //change: function (opt, value, old, options) { ... },

    // Writes one option (this._opt). First calls normalize_OPT on value, then
    // fires change and change_OPT events if the normalized value was different
    // (as reported by _.isEqual()) or if options.forceFire was set. Returns true if events
    // were fired (value differs or options.forceFire given).
    //
    // options can be used to propagate custom data to event listeners on
    // normalize_OPT(), change_OPT() and change().
    //
    // It is safe to write more options from within ifSet(), normalize or
    // change handlers - they are written immediately but subsequent normalize and
    // change events are deferred in FIFO fashion (first set - first fired).
    //
    //? ifSet('key', 123)         //=> false
    //? ifSet('key', 123, true)   //=> true
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

    // Adds new contained Sqimitive instance to self. Unless this._owning is
    // false, one Sqimitive can only have one parent or none thus forming a
    // bi-directional tree. If key is omitted _defaultKey() is called to determine
    // it, which by default returns sqim._cid (unique instance identifier).
    // Updates sqim._parent and _parentKey. options are currently unused but can
    // be used to propagate custom data to event listeners (it's also passed
    // through by assignChildren()).
    //
    // Errors if trying to nest object of wrong class (not _childClass).
    // Unnests sqim from its former parent, if any. Forwards its events
    // according to _childEvents. Finally, calls sqim.owned() to notify new
    // child of the parent change.
    //
    // Returns sqim. Does nothing if it's already contained in this instance
    // under the same key (re-nests otherwise).
    nest: function (key, sqim, options) {
      if (arguments.length == 1) {
        sqim = key
        key = this._defaultKey(sqim)
      }

      if (key == null || typeof key == 'object') {
        throw new TypeError('nest: bad key given')
      }

      options || (options = {})

      // Object keys are always strings; _parentKey mismatching actual key will
      // break indexOf() if it's used on an array like _.keys(this._children()).
      key += ''
      var prev = this._children[key]

      if (!(sqim instanceof this._childClass)) {
        throw new TypeError('nest: Nesting Sqimitive of wrong class')
      } else if (prev !== sqim) {
        if (this._owning) {
          prev && prev.unnest()
          sqim.unnest()
          this._children[key] = sqim
          sqim._parent = this
          sqim._parentKey = key
        } else {
          this._children[key] = sqim
        }

        ++this.length
        this._forward('.', this._childEvents, sqim)
        this._owning && sqim.owned()
      }

      return sqim
    },

    // Is called when nest() wasn't given an explicit key to determine one.
    // sqim is the sqimitive that is about to be nested into this instance.
    //
    // If you're trying to index children by some "ID" attribute (like Backbone's
    //  Collection) note that _parentKey will not be auto updated if that
    // attribute changes.
    _defaultKey: function (sqim) {
      return sqim._cid
    },

    // Is called after this instance has been nested into an _owning sqimitive
    // (changed parents/got a first parent). this._parent and _parentKey are
    // already set. Takes no arguments, can return anything.
    // Not to be called directly.
    //
    // Defining this as a stub lets Sqimitive remove this function instead
    // of calling it as a handler when new handler is registered for this event.
    owned: Core.stub,

    // Forwards each of events to sqim instance by firing prefix + event_name
    // (complete) on this instance with sqim pushed in front of original event
    // arguments. This is used to forward _childEvents, with prefix = '.'.
    //
    // E.g. origin._forward('dlg-', ['change', '-render'], destination) will
    // fire 'dlg-change' and 'dlg--render' events on destination (a Sqimitive)
    // whenever 'change' and 'render' are fired on origin.
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
    // there's no reverse child > parent relationship in non-owning mode.
    //
    //? collection.unlist('foo')    //=> Sqimitive or undefined
    //? collection.unlist(collection.nested('foo'))   // identical to above
    //? collection.unlist(child)    //=> Sqimitive (child) or undefined
    unlist: function (key) {
      var sqim

      if (typeof key == 'object') {
        for (var k in this._children) {
          if (this._children[k] === key) {
            sqim = key
            key = k
            break
          }
        }
      } else {
        sqim = this._children[key + '']
      }

      if (sqim) {
        if (this._owning) {
          sqim.remove()
        } else {
          delete this._children[key + '']
          --this.length
          this.unnested(sqim)
        }
      }

      return sqim
    },

    // Removes this instance from its parent object, if any. This effectively
    // creates new detached tree (if this has nested objects) or leaf (if not) -
    // see more about the Children concept. It may be called even if this._parent
    // was already null. Calls unnested(this) on former parent.
    // Note that it doesn't remove this.el from parent node - use remove() for this.
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

    // Is called right after a child sqim was detached from its parent (this).
    // Default implementation unregisters all event handlers that might
    // have been previously attached to sqim by this object (provided they
    // were not hardwired with fuse() and used cx === this).
    //
    // If this._owning is false this is called when unnesting a child via
    // unlist().
    //
    // Can return anything. Not to be called directly.
    unnested: function (sqim) {
      sqim.off(this)

      if (this.length < 0 && console && console.error) {
        console.error('Broken nesting: sqimitive.length below zero')
      }
    },

    // Returns all nested sqimitives if key is not given, or a child by its key
    // (_parentKey, case-sensitive) or its object instance. Returns undefined if
    // given key/object key isn't nested in this instance or key is null or undefined.
    //
    //? sqim.nested()   //=> {childKey1: Sqimitive, ...}
    //? sqim.nested('childKey1')    //=> Sqimitive
    //? sqim.nested('foobarbaz!')   //=> undefined
    //
    //? var child = sqim.nested('childKey1')
    //  sqim.nested(child)          //=> child
    //? sqim.nested(new Sqimitive)  //=> undefined - not listed in sqim._children
    nested: function (key) {
      if (!arguments.length) {
        return _.extend({}, this._children)
      } else if (key == null) {
        // Return undefined - neither keys nor children can be null.
      } else if (!(key instanceof Object)) {
        return this._children[key + '']
      } else {
        for (var k in this._children) {
          if (this._children[k] === key) { return key }
        }
      }
    },

    // Regular Array.slice(), treats this instance's children as an ordered
    // array instead of {key: Sqimitive} object.
    //
    //? slice(1, 1)   // get 2nd child as an array
    //? slice(0, -1)  // get last child as an array; last() is more convenient
    //? slice(5, 3)   // get 6th, 7th and 8th children as an array
    //? slice(0, 0)   //=> [] - empty array
    slice: function (start, length) {
      length > 0 && (arguments[1] += start)
      return Array.prototype.slice.apply(_.values(this._children), arguments)
    },

    // Similar to slice() but returns individual children, not an array.
    //
    //? at(0)         //=> Sqimitive
    //? at(999)       //=> undefined
    //? at(-1)        //=> Sqimitive - identical to last()
    at: function (index) {
      return this.slice(index, 1)[0]
    },

    // Shorthand to _(sqim.slice()).
    _: function () {
      return _(this.slice())
    },

    // Similar to unnest() but before unnesting removes this.el from its
    // parent DOM node. Note that this doesn't recursively remove all nested
    // _children as it might not be desired and slow; if they need to do some
    // on-removal actions like removing event handlers - you can do
    // this.sink('remove').
    remove: function () {
      this.el && this.el.remove()
      return this.unnest()
    },

    // Merges external "response" object/array resp into _children by
    // updating existing nested sqimitives, adding new and removing unlisted
    // ones. New sqimitives are created as _childClass.
    //
    // If resp is an object with data key - uses its value (Python's Flask
    // wraps array response into an object to prevent a JS attack). If resp
    // (or resp.data) were not arrays uses _.values() to turn it into one
    // (ignoring keys).
    //
    // If options.eqFunc is null or omitted removes all children thus
    // resetting the list. options.eqFunc can be a string (option name) given
    // to get(), or a function (existingSqim, {opt}) returning true if
    // existingSqim is the "same" as given opt object (a resp item) so the
    // former should be retained and updated with assignResp(). Children that
    // have never matched options.eqFunc considered not listed in given resp
    // and removed unless options.keepMissing is set (if so they are just
    // left unchanged).
    //
    // If options.keepMissing is set while options.eqFunc is not - existing
    // children are preserved and for each item in resp a new child is
    // nested. Be aware that on duplicate keys (see options.keyFunc) only the
    // last child will be kept, all others will be removed.
    //
    // options.keyFunc is a function (sqim) that should return a _parentKey
    // for given sqimitive that is about to be nest()'ed. If not present
    // defaults to _defaultKey (returns _cid by default).
    //
    // options as a whole is passed through to assignResp() and nest() so you
    // can use it to set specific options and to pass custom data along to
    // your event listeners (assignResp are eventually passed through to
    // set(), change_OPT() and others).
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
      var toRemove = eqFunc ? _.extend({}, this._children) : {}

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
          var child = (new this._childClass).assignResp(resp[i], options)
          this.nest(keyFunc.call(this, child), child, options)
        }
      }

      options.keepMissing || _.each(toRemove, this.unlist, this)
      return this
    },

    // Filters and/or transforms external input (e.g. API response) into
    // this._opt using defined rules (see _respToOpt). Calls set() to assign
    // resulting values one by one, normalizing them and firing corresponding
    // change events.
    //
    // If options.onlyDefined is set then keys in resp that are missing from
    // _respToOpt are ignored, if it's unset they are passed through as if
    // they were all true.
    //
    // options as a whole is passed through to set() so you can use it to
    // pass custom data along to your event listeners on normalize_OPT(),
    // change_OPT() and change().
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
    assignResp: function (resp, options) {
      options || (options = {})

      for (var key in resp) {
        var value = resp[key]
        var opt = this._respToOpt[key]
        opt === undefined && (opt = !options.onlyDefined)
        opt === true && (opt = key)

        if (typeof opt == 'function') {
          opt = opt.call(this, value, key, resp, options)
          value = opt[1]
          opt = opt[0]
        }

        opt == false || this.set(opt, value, options)
      }

      return this
    },

    // Sends an event with arguments upstream - triggers it on this._parent,
    // then on that parent's parent and so on. If fireSelf is true fires
    // this event on this instance beforehand (by default it doesn't).
    // Since it calls methods, not necessary events, you can "recursively"
    // call methods as well.
    // This is very much like DOM's event bubbling except that it happens
    // on sqimitives, not their el's.
    //
    // While should not be abused because it makes the execution flow less
    // obvious, it's indispensible for propagating generic signals like errors
    // to whoever is on top.
    //
    //? bubble('render', [], true)
    //    // causes self and all parent sqimitives to be rendered.
    bubble: function (event, args, fireSelf) {
      fireSelf && this[event] && this[event].apply(this, args)
      this._parent && this._parent.bubble(event, args, true)
      return this
    },

    // Propagates an event with arguments to all nested sqimitives, to
    // all nested sqimitives of those sqimitives, to their children and so
    // on. If fireSelf is true also fires this event on this instance
    // beforehand. Note that it might get quite intense with heavy nesting.
    // Since it calls methods, not necessary events, you can "recursively"
    // call methods as well.
    //
    //? sink('render', []. true)
    //    // recursively causes all nested views and self to be rendered.
    //
    //? sink('saveTo', serialized = {})
    //    // when this returns and if saveTo() is implemented serialized
    //    // will be like {id: value} for all nested views (but not self).
    sink: function (event, args, fireSelf) {
      fireSelf && this[event] && this[event].apply(this, args)
      this.invoke('sink', event, args, true)
      return this
    },

    // Similar to this.el.find(path) but returns el if path is empty or is a
    // dot (.). Special value 'body' always returns document.body.
    // If this.el is null always returns an empty jQuery collection.
    // If path is a jQuery object or a DOM node - returns $(path) (note that
    // it may be outside of this.el or have length == 0).
    //
    //? this.$()                //=> $(this.el)
    //? this.$('.')             //=> $(this.el)
    //? this.$('a[href]')       //=> $([A, A, ...])
    //? this.$(document.body)   //=> $('body')
    //? this.$('body')          //=> $('body')
    $: function (path) {
      if (Core.is$(path) || _.isElement(path)) {
        return $(path)
      } else if (path == 'body') {
        return $(document.body)
      } else if (this.el) {
        return (path == '' || path == '.') ? this.el : this.el.find(path)
      } else {
        return $()
      }
    },
  })

  // Reference to self in the instance property.
  Sqimitive.Base.prototype._childClass = Sqimitive.Base
  // Static fields of Sqimitive.Base.
  Sqimitive.Base._mergeProps.push('_opt', 'elEvents')
  Sqimitive.Base._shareProps.push('_childClass')

  /***
    Adding Underscore.js functions to Sqimitive.Sqimitive instance methods
   ***/

  var underscoreMethods = [
    'each', 'map', 'reduce', 'reduceRight', 'find', 'filter',
    'reject', 'every', 'some', 'contains', 'invoke', 'pluck', 'where',
    'findWhere', 'max', 'min', 'sortBy', 'groupBy', 'indexBy', 'countBy',
    'keys', 'pairs', 'pick', 'omit', 'toArray', 'chain',
    // Array functions follow:
    'first', 'initial', 'rest', 'last', 'without', 'partition', 'difference',
    'indexOf', 'shuffle', 'sample', 'lastIndexOf', 'sortedIndex'
  ]
  var underscoreArray = underscoreMethods.indexOf('first')

  _.each(underscoreMethods, function (name) {
    if (underscoreMethods.indexOf(name) < underscoreArray) {
      Sqimitive.Base.prototype[name] = function () {
        var args = Array.prototype.slice.call(arguments)
        args.unshift(this._children)
        return _[name].apply(_, args)
      }
    } else {
      Sqimitive.Base.prototype[name] = function () {
        var args = Array.prototype.slice.call(arguments)
        args.unshift(_.values(this._children))
        return _[name].apply(_, args)
      }
    }
  })

  Sqimitive.Sqimitive = Sqimitive.Base
  return Sqimitive
});
