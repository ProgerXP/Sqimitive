;(function (factory) {
  var deps = {sqimitive: 'Sqimitive'}
  var me = 'Sqimitive.Async'
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
}).call(this, function (Sqimitive) {
  "use strict";

  var _ = Sqimitive._
  var unique = {}

  //! +cl=Sqimitive.Async:Sqimitive.Base
  //
  // Asynchronous operation manager - a "promise" on steroids.
  //
  // ` `#Async is "native" Sqimitive's re-implementation of JavaScript's
  // `'Promise. It provides a unified wrapper around asynchronous operations
  // such as remote requests. Unlike `'Promise, `#Async may contain `#nest'ed
  // operations (the parent only completes when all children complete,
  // recursively), allows the usual (`#evt) event listeners and can be
  // `#abort()ed.
  //
  // ` `#Async's state is stored in the `'status `#_opt'ion (`'true when
  // succeeded, `'false if failed, `'null if still incomplete). On change,
  // `#Async fires `#success or `#error and, always, `#complete:
  //* Listeners may be prioritized relative to others (see `#MAX_PRIORITY).
  //* `#exception's during an event handler do not mark `#Async as failed
  //  (unlike with `'Promise).
  //* If `'status changes during `#error or `#success then remaining handlers
  //  are skipped and handlers of the new `'status (`#success or `#error) are
  //  called. `#complete is always triggered in the end, once `'status stops
  //  changing.
  //
  //  `[
  //    var async = new Sqimitive.Async
  //
  //    async.whenSuccess(function () {
  //      if (Math.random() > 0.5) { async.set('status', false) }
  //    }, this, -1)
  //
  //    // This one will run after the previous handler where we've given a
  //    // smaller priority (-1):
  //    async.whenSuccess(function () {
  //      alert('You win!')
  //    })
  //
  //    async.whenError(function () {
  //      alert('No luck :<')
  //    })
  //
  //    async.set('status', true)
  //      // will show either of the alert messages
  //  `]
  //
  // Other notes:
  //* Nested `#Async's may be `#nest'ed at any time and their `'status may be
  //  any (loading, failed or succeeded) - the parent's `'status will be
  //  updated accordingly.
  //* The operation may start at any time: usually from `@Base.init()`@ if
  //  you're subclassing `#Async, or by a method like `'start() called from the
  //  outside, or for "ad-hoc" `#Async's - some time after `'new.
  //
  //? A subclass that wraps around JavaScript's `'Image (representing the
  //  `[<img>`] tag) for preloading graphical resources.
  //  `[
  //   var AsyncImage = Sqimitive.Async.extend({
  //     _opt: {
  //       src: null,   // relative to current location
  //       img: null,   // JavaScript's Image
  //     },
  //
  //     events: {
  //       init: function () {
  //         var img = new Image
  //         img.onload  = () => this.set('status', true)
  //         img.onerror = () => this.set('status', false)
  //         this.set('img', img)
  //         img.src = this.get('src')
  //       },
  //
  //       // Stops image loading (if supported by the browser).
  //       abort: function () {
  //         this.img() && (this.img().src = 'javascript:void 0')
  //       },
  //     },
  //
  //     img: function () {
  //       return this.get('img')
  //     },
  //
  //     width: function () {
  //       return this.img() && this.img().width
  //     },
  //
  //     height: function () {
  //       return this.img() && this.img().height
  //     },
  //   })
  //  `]
  //  Using `'AsyncImage to load a single image:
  //  `[
  //    ;(new AsyncImage({src: 'pic.jpg'})
  //      .whenSuccess(async => alert(async.width()))
  //
  //    // Similar to:
  //    var img = new Image
  //    img.src = 'pic.jpg'
  //    img.onload = () => alert(img.width)
  //  `]
  //  Loading multiple `'AsyncImage's:
  //  `[
  //    var container = new Sqimitive.Async
  //    container.nest(new AsyncImage({src: 'foo.png'}))
  //    container.nest(new AsyncImage({src: 'bar.bmp'}))
  //    container.whenSuccess(function () {
  //      alert('Loaded ' + container.invoke('get', 'src').join())
  //    })
  //    container.whenError(function () {
  //      // Since Async is the usual Sqimitive.Base, we have all the utility
  //      // methods:
  //      var failed = this.reject(a => a.isSuccessful())
  //      alert('Failed to load: ' + failed.map(a => a.get('src')).join())
  //    })
  //  `]
  //  The above `'container in turn could be part of another `#Async:
  //  `[
  //    var resourcePreloader = new Sqimitive.Async
  //    resourcePreloader.nest(imagePreloader)
  //    resourcePreloader.nest(dataPreloader)
  //    resourcePreloader.whenSuccess(() => game.start())
  //  `]
  //  ...With `'dataPreloader defined "ad-hoc" (without a specialized class):
  //  `[
  //    var dataPreloader = new Sqimitive.Async
  //
  //    $.loadJSON('map.json', function (data) {
  //      dataPreloader.set('data', data)
  //      dataPreloader.set('status', true)
  //    })
  //
  //    dataPreloader.whenSuccess(function () {
  //      var data = dataPreloader.get('data')
  //      // ...
  //    })
  //  `]
  return Sqimitive.Base.extend('Sqimitive.Async', {
    // The maximum number (absolute, i.e. positive) accepted by
    // `#whenComplete() and others; out of range priority is clamped to the
    // nearest value.
    //
    //? Use `'-Infinity and `'Infinity to specify minimum and maximum priority.
    //  `[
    //   // This function is called before listeners to 'success' with a larger
    //   // priority (which is 0 by default).
    //   async.whenSuccess(function (async) { ... }, this, -Infinity)
    //  `]
    MAX_PRIORITY: 2,

    _childClass: '',
    _childEvents: ['complete', '=exception'],

    // New standard options (`@Base._opt`@):
    //> status operation null not started or not finished`,
    //  true operation succeeded`, false operation failed
    //  `- reflects both this instance's own status and status of its children
    //
    //  When an operation wrapped by this `#Async finishes and assuming it has
    //  no `#_children, `#set() `'status to either `'true (`#isSuccessful) or
    //  `'false. This instance will stop being `#isLoading(); this should be a
    //  permanent condition - don't change `'status once it's becomes
    //  non-`'null until `#clear().
    //
    //> ignoreError bool `- if set, this instance will be considered succeeded
    //  by `#isSuccessful() even if `'status is `'false
    //
    //  Don't change this value when this instance is no longer `#isLoading()
    //  because the expected handlers won't be called:
    //  `[
    //    async.set('status', false)
    //    async.whenSuccess(...)
    //    async.set('ignoreError', true)
    //      // whenSuccess' func is not executed despire isSuccessful()
    //      // returning true
    //
    //    // Best practice is to give ignoreError to the constructor:
    //    var async = new Sqimitive.Async({ignoreError: true})
    //    // ...or to extend():
    //    var MyAsync = Sqimitive.Async.extend({
    //      _opt: {ignoreError: true},
    //    })
    //  `]
    _opt: {
      status: null,
      ignoreError: false,
    },

    events: {
      '.complete': '_childComplete',

      '.=exception': function (/* child, sup, ...args */) {
        this.exception.apply(this, _.rest(arguments, 2))
      },

      '=nestEx': function (sup, options) {
        // Can't check _parent since this Async can be non-_owning. Other means
        // are faster but not reliable - e.g. a child could be assigned another
        // key, which trips both changed and previous checks, or a child could
        // be replaced by a new object yet leaving length the same before and
        // after nest().
        var isNew = !this.contains(options.child)
        var res = sup(this, arguments)
        // This request (sqim) could have already been complete between
        // creation and nesting as in second.nest(new first(...)), and so
        // complete event will never occur, and _childComplete - never called.
        // We call it on nest, but only for truly new objects - otherwise if
        // sqim is already complete, and its complete event is pending, we'd
        // call _childComplete twice.
        isNew && this._childComplete(res.child)
        return res
      },

      change_status: function () {
        if (!this.isLoading()) {
          var ex1 = this._callPriorities(this.isSuccessful() ? 'success' : 'error', [this])
          // Don't call complete if status has changed during success/error
          // since after change_status returns, change_status will be triggered
          // again and complete will run then.
          var ex2 = ex1 === true || this._callPriorities('complete', [this])
          if (typeof ex1 == 'object') {
            this.exception(ex1)
          } else if (typeof ex2 == 'object') {
            this.exception(ex2)
          }
        }
      },

      //! +fn=toString
      // Returns a debugger-friendly summary of this object:
      //[
      //   The.Class.Name [length] ~¹ STATUS²
      //]
      //   `&sup1 `[~`] is output if the `'ignoreError `#_opt is set.
      //
      //   `&sup2 `[STATUS`] is either "LOADING", "DONE" or "ERROR"
      //
      // For example:
      //[
      //   AsyncImage [2]  DONE
      //]
      '=toString': function () {
        return [
          this.constructor.name,
          '[' + this.length + ']',
          this.get('ignoreError') ? '~' : '',
          this.get('status') == null ? 'LOADING'
            : (this.get('status') ? 'DONE' : 'ERROR')
        ].join(' ')
      },
    },

    //! +ig
    // Separate events for separate priorities are used instead of a single
    // event because Sqimitive doesn't support ordered handlers and because
    // such set-up doesn't require sorting (or inserting handlers in specific
    // positions).
    //= object Error if catched`, true if quit due to status change`, false
    _callPriorities: function (event, args) {
      var max = this.MAX_PRIORITY
      var ex
      for (var priority = -max; priority <= max; priority++) {
        try {
          var res = this.fire(event + (priority || ''), args)
          if (res === unique) { break }
        } catch (e) {
          // Preserve first error since it's more likely to trigger others.
          ex = ex || e
        }
      }
      return ex || res === unique
    },

    fuse: function (event, func, cx) {
      var eobj = Sqimitive.Base.prototype.fuse.apply(this, arguments)
      if (event.match(/^(success|error|complete)(-?\d+)?$/)) {
        eobj.post = function (eobj, res) {
          // Call handlers only once.
          eobj.func = Sqimitive.Core.stub
          eobj.post = undefined
          // Skip calling next handlers if the condition no more holds (e.g. if
          // current handler has nested a new Sqimitive.Async).
          eobj.stop = event[0] == 'c'
            ? this.isLoading()
            : (this.isSuccessful() !== (event[0] == 's'))
          return eobj.stop ? unique : res
        }.bind(this)
      }
      return eobj
    },

    _childComplete: function () {
      // Once failed, can't become successful or loading.
      if (this.isSuccessful() !== false) {
        var counts = this.countBy(function (sqim) {
          return '' + sqim.isSuccessful()
        })
        this.set('status', counts['' + null] ? null : !counts['' + false])
      }
    },

    _when: function (func, cx, priority, met, event) {
      if (typeof cx == 'number') {
        throw new TypeError('Sqimitive.Async: mistaken cx for priority?')
      }

      if (met) {
        try {
          func.call(cx, this)
        } catch (e) {
          this.exception(e)
        }
      } else {
        priority = Math.max( -this.MAX_PRIORITY, Math.min(this.MAX_PRIORITY, priority) )
        this.on(event + (+priority || ''), func, cx)
      }

      return this
    },

    // Fire `'func whenever this instance stops being `#isLoading() - see
    // `#complete.
    //
    //?`[
    //   $('#spinner').show()
    //   var async = new MyAsync({...})
    //   async.whenComplete(function (async) {
    //     $('#spinner').hide()
    //   })
    //
    //   // As if:
    //   $('#spinner').show()
    //   try {
    //     do_async()
    //   } finally {
    //     $('#spinner').hide()
    //   }
    // `]
    //
    //#completeDesc
    // Unlike with a simple `[on('event')`] (`#on()) `'func gets called
    // immediately if the condition is already met (then `'priority is
    // ignored). Otherwise, `'func is executed before all handlers registered
    // with a larger `'priority, among (in any order) those with the same and
    // after those with a lower. The value is clamped to the `#MAX_PRIORITY
    // range. In any case, `'func is given `'this (the `#Async instance).
    //
    // Warning: the following is incorrect use because `'func may be called
    // immediately, before the result is assigned to `'req:
    //[
    //   var req = (new Sqimitive.Async).whenComplete(function () {
    //     // WRONG: req may be undefined:
    //     req.foo()
    //   })
    //
    //   // CORRECT: assign to the variable first:
    //   var req = new Sqimitive.Async
    //   req.whenComplete(function () { ... })
    //
    //   // CORRECT: or use the passed "this":
    //   ;(new Sqimitive.Async)
    //     .whenComplete(function (req) { ... })
    //]
    whenComplete: function (func, cx, priority) {
      return this._when(func, cx, priority, !this.isLoading(), 'complete')
    },

    // Fire `'func whenever this instance's operation has failed - see `#error.
    //
    //?`[
    //   async.whenError(function (async) {
    //     alert("Met an error :'(")
    //   })
    // `]
    //
    //#-completeDesc
    whenError: function (func, cx, priority) {
      return this._when(func, cx, priority, this.isSuccessful() == false, 'error')
    },

    // Fire `'func whenever this instance's operation has succeeded - see
    // `#success.
    //
    //?`[
    //   async.whenSuccess(app.start)
    // `]
    //
    //#-completeDesc
    whenSuccess: function (func, cx, priority) {
      return this._when(func, cx, priority, this.isSuccessful() == true, 'success')
    },

    // Sets the `'status `#_opt to `'true if have no `#_children and is still
    // `#isLoading().
    //
    //= undefined if not empty or is not loading`, true
    //
    //?`[
    //   _.each(filesToLoad, function (url) {
    //     async.nest(new MyAsync({src: url}))
    //   })
    //
    //   async.whenComplete(allLoaded)
    //
    //   async.doneIfEmpty()
    //     //=> true
    //     // if there were no filesToLoad then mark async as complete right
    //     // away
    //
    //   async.doneIfEmpty()
    //     //=> undefined - already complete, call ignored
    // `]
    doneIfEmpty: function () {
      if (!this.length && this.isLoading()) {
        this.set('status', true)
        return true
      }
    },

    // Prepares this instance for new use.
    //
    // It's recommended to create a new `#Async instance for every new batch of
    // tasks. However, `#clear() may improve performance when thousands of
    // objects need to be created but some could be reused.
    //
    // Removes event listeners for `#success/`#error/`#complete (but not for
    // `#exception), calls `#abort() on self and on `#_children
    // (non-recursively), calls `@Base.remove()`@ on children and sets `'status
    // (`#_opt) to `'null (`#isLoading()).
    clear: function () {
      _.each(['success', 'error', 'complete'], function (e) { this.off(e) }, this)
      this.abort()
      this.invoke('abort')
      this.invoke('remove')
      this.set('status', null)
      return this
    },

    //= null when still `#isLoading()`,
    //  true if `'status `#_opt is `'true or `'ignoreError `#_opt is set`,
    //  false
    //
    // `'ignoreError affects all methods using `#isSuccessful(), in particular
    // `#whenSuccess() and `#whenError():
    //[
    //   async.set('status', false)   // fail it
    //   async.isSuccessful()         //=> false
    //   async.set('ignoreError', true)
    //   async.isSuccessful()         //=> true
    //   async.whenSuccess(() => alert('fired!'))
    //     // alerts
    //]
    //
    // However, changing `'ignoreError on run-time is not recommended - see
    // `#_opt.
    isSuccessful: function () {
      var s = this.get('status')
      return s == null ? null : !!(this.get('ignoreError') || s)
    },

    //= true when still loading (`'status `#_opt is `'null)`,
    //  false when failed or succeeded (`#isSuccessful)
    isLoading: function () {
      return this.get('status') == null
    },

    //! +fn=success:this +ig
    //
    // Called when this instance and children have succeeded.
    //
    //#sec
    // ` `#success, `#error and `#complete are called when this and nested
    // operations have finished (resources loaded, etc.). Consider this analogy
    // with exception handling:
    //[
    //   try {
    //     ...                    // Async.success()
    //   } catch (exception) {
    //     ...                    // Async.error()
    //   } finally {
    //     ...                    // Async.complete()
    //   }
    //]
    //
    // But note that "real" exceptions thrown by listeners are handled by
    // `#exception() outside of the normal pipeline (`#error's are expected
    // conditions, exceptions are not).
    //
    // Each handler is called at most once as if it was bound with `#once(). If
    // a handler changes the `'status `#_opt, others are skipped and events are
    // re-fired.
    //
    //? In most cases you need to use `#whenSuccess(), `#whenError() and
    //  `#whenComplete() rather than subscribing via `#on() because if the
    //  instance's status changes between its construction and your
    //  subscription - your handler will not be called:
    //  `[
    //   var async = new MyAsync({...})
    //   // If async is already complete before we call on() - our handler will
    //   // not be triggered:
    //   async.on('success', function (async) { ... })
    //   // So you want to do this:
    //   async.whenSuccess(function (async) { ... })
    //  `]
    //
    // The call order of handlers is deterministic (`#Async's `#nest() acts as
    // `#on() because of `#_childEvents/`#_forward()) but it's usually more
    // convenient to use specific priority levels to not depend on the order of
    // `#nest()/`#on() calls: `[on('success')`] is guaranteed to be called
    // after `[success-3`] but before `[success2`].
    success: Sqimitive.Core.stub,

    //! +fn=error:this +ig
    //
    // Called when this instance or one of its children has failed.
    //
    // By default, `#Async doesn't store any error information because it is
    // operation-agnostic; you may use `#_opt for this.
    //
    //#-sec
    error: Sqimitive.Core.stub,

    //! +fn=complete:this +ig
    //
    // Called when this instance stops being `#isLoading().
    //
    //#-sec
    complete: Sqimitive.Core.stub,

    // Called when an exception was thrown during `#success, `#error or
    // `#complete.
    //
    //?`[
    //  async.on('exception', e => console.error(e.message))
    // `]
    //
    // In contrast with JavaScript's `'Promise an error in handling the
    // "promise" (`#Async) doesn't mark that promise failed if its underlying
    // action (e.g. an AJAX call) has succeeded.
    //
    // If an exception is thrown during an `#error or `#success handlers then
    // remaining handlers are skipped, `#complete is triggered and the
    // exception is re-thrown. An exception during `#complete also skips
    // remaining handlers of `#complete and is re-thrown unless there was an
    // exception during `#error or `#success.
    //
    // Other notes:
    //* `#exception's event listeners are not affected by `#clear().
    //* `#Async replaces the `#exception() handler of its children so that
    //  the exception is thrown on the top-level `#Async (whose `#_parent is
    //  not another `#Async).
    //* The above also means that it's enough to override just the top-level
    //  `#exception() to affect the entire tree.
    //* The usual events have "whenXXX()" (`#whenComplete(), etc.) but there's
    //  no "whenException()" because no info about already occurred errors is
    //  stored (like `'status is stored in `#_opt). Only future exceptions can
    //  be listened to, with the usual `#on().
    //* Unlike `#success/`#error/`#complete, `#exception doesn't receive `'this
    //  as an argument.
    //* `#exception isn't called on request failure unless you throw an
    //  exception from `#error (because `#Async doesn't know about your
    //  operation's details).
    //* The default implementation throws the argument.
    exception: function (e) {
      throw e
    },

    //! +fn=abort +ig
    // Aborts the operation of this instance.
    //
    //? `#abort() doesn't affect own `#_children - call `#sink() to abort
    //  everything recursively:
    //  `[
    //     async.sink('abort')
    //  `]
    //
    // The default implementation does nothing (is a `#stub).
    abort: Sqimitive.Core.stub,
  })
});
