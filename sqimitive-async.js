;(function (factory) {
  var deps = 'sqimitive/main:Sqimitive'
  var me = 'Sqimitive.Async'
  // --- Universal Module (squizzle.me) - CommonJS - AMD - window --- IE9+ ---

  if (typeof exports != 'undefined' && !exports.nodeType) {
    // CommonJS/Node.js.
    deps = (deps.replace(/\?[^:]*/g, '').match(/\S+(?=:)/g) || []).map(require)
    if (typeof module != 'undefined' && module.exports) {
      module.exports = factory.apply(this, deps)
    } else {
      exports = factory.apply(this, deps)
    }
  } else if (typeof define == 'function' && define.amd) {
    // AMD/Require.js.
    define(deps.replace(/\?/g, '/').match(/\S+(?=:)/g) || [], factory)
  } else {
    // In-browser. self = window or web worker scope.
    var root = typeof self == 'object' ? self
             : typeof global == 'object' ? global
             : (this || {})
    var by = function (obj, path) {
      path = path.split('.')
      while (obj && path.length) { obj = obj[path.shift()] }
      return obj
    }
    // No lookbehind in IE.
    deps = (deps.match(/:\S+/g) || []).map(function (dep) {
      var res = by(root, dep = dep.substr(1))
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

  //! +ig +cl=Sqimitive.Async:Sqimitive.Base
  // Asynchronous operation manager - a "promise" on steroids, with intuitive
  // grouped handling of a large number of asynchronous processes.
  //
  // ` `#Async is "native" Sqimitive's re-implementation of JavaScript's
  // `'Promise. It provides a unified wrapper around asynchronous operations
  // such as remote requests. Unlike `'Promise, `#Async may contain `#nest'ed
  // operations (the parent only completes when all children complete,
  // recursively), allows the usual (`#evt) event listeners and can be
  // `#abort()'ed.
  //
  // ` `#Async's state is stored in the `'status `#_opt'ion (`'true when
  // succeeded, `'false if failed, `'null if still incomplete). On change,
  // `#Async fires `#success or `#error and, always, `#complete:
  //* Listeners can be prioritized relative to others (see `#MAX_PRIORITY).
  //* `#exception-s during an event handler do not mark `#Async as failed
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
  // Attention: `@Base.nest()`@ returns new child, not the parent. The following
  // creates an `'Async containing an `'Async which in turn has another `'Async
  // inside, to which `#whenSuccess() is attached:
  //[
  //   ;(new Sqimitive.Async)
  //     .nest(new Sqimitive.Async)
  //     .nest(new Sqimitive.Async)
  //     .whenSuccess(...)
  //]
  // This most likely indicates an error and should be rewritten like so:
  //[
  //   var container = new Sqimitive.Async)
  //   container.nest(new Sqimitive.Async)
  //   container.nest(new Sqimitive.Async)
  //   container.whenSuccess(...)
  //]
  // Nesting like that can be shortened if `[Sqimitive.Async`] is the default
  // class (`@Base._childClass`@) for `'container (as it is by default):
  //[
  //   container.nest({})
  //]
  //
  // Other notes:
  //* Child `#Async-s may be `#nest'ed at any time and their `'status may be
  //  any (loading, failed or succeeded) - the parent's `'status will be
  //  updated accordingly and `#success/`#error/`#complete may arise on it.
  //* These three events are first fired on the `#Async itself (distance 0),
  //  then on its immediate parent (1), then on that parent's parent (2) and so
  //  on. In case of multiple parents of the same distance (one
  //  `@Base._owning`@, others not), events first occur on the one that had the
  //  child nested first, then second and so on.
  //* The operation may start at any time: usually from `@Base.init()`@ if
  //  you're subclassing `#Async, or by a method like `'start() called from the
  //  outside, or for "ad-hoc" `#Async-s - some time after `'new.
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
  //  Loading multiple `'AsyncImage-s:
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
  //
  //# Event order and nesting
  // Often you want to call `[when...()`] on a child being `'nest()'ed, such as when wrapping
  // an `#Async. In this example API calls are delayed but the caller receives
  // an `#Async immediately. It might be tempting to write something like this:
  //[
  //    var queue = []
  //    var timer
  //
  //    function callAPI(args) {
  //      var result = new Sqimitive.Async
  //      queue.push([args, result])
  //
  //      timer = timer || setTimeout(function () {
  //        timer = null
  //
  //        for (var task; task = queue.shift(); ) {
  //          task[1].nest(_callAPI(task[0]))
  //            .whenSuccess(function () { task[1].result = this.result })
  //        }
  //      }, 100)
  //
  //      return result
  //    }
  //
  //    function _callAPI(args) {
  //      var internal = new Sqimitive.Async
  //      _.ajax({
  //        url: '/api',
  //        data: _.toArray(args),
  //        success: function (xhr) {
  //          internal.result = xhr.response
  //          internal.set('status', true)
  //        },
  //      })
  //      return internal
  //    }
  //]
  // The `#Async returned to the caller is nested an internal `#Async object
  // returned by `'_callAPI(); when the latter succeeds or fails, the caller's
  // `#Async automatically finishes and `'callAPI() copies response data
  // (`'result) to the wrapper - but running into the same pitfall described in
  // `#_opt.`'ignoreError, namely that `'whenSuccess() is called after nesting, allowing the
  // caller's hooks to execute first.
  //[
  //    // wrapper is the result Async in callAPI().
  //    var wrapper = callAPI('foo')
  //    wrapper.whenSuccess(function () { console.log(this.result) })
  //      // logs undefined because wrapper succeeds (internal Async is nested)
  //      // before callAPI()'s whenSuccess() runs
  //]
  var Async = Sqimitive.Base.extend('Sqimitive.Async', {
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
    _childEvents: ['change_status', '=exception'],

    // New standard options (`@Base._opt`@):
    //> status operation null not started or not finished`,
    //  true operation succeeded`, false operation failed
    //  `- reflects both this instance's own status and status of its children
    //
    //  When an operation wrapped by this `#Async finishes and assuming it has
    //  no `#_children, `#set() `'status to either `'true (`#isSuccessful) or
    //  `'false. This instance will stop being `#isLoading(); this should be a
    //  permanent condition - don't change `'status once it's becomes
    //  non-`'null, until you call `#clear().
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
    //
    //  Remember that nesting an already failed `#Async fails the parent
    //  immediately if there are no other `#isLoading children or if
    //  `'immediateError is set. Change `'ignoreError before nesting:
    //  `[
    //    var parent = new Sqimitive.Async
    //    parent.nest( new Sqimitive.Async({status: false}) )
    //      .set('ignoreError', true)
    //    // parent is !isSuccessful().
    //    parent.nest( (new Sqimitive.Async({status: false}))
    //      .set('ignoreError', true) )
    //    // parent is isSuccessful(); observe the braces.
    //  `]
    //
    //> immediateError bool `- if set, this instance will be considered failed
    //  as soon as any child fails, even if there is an `#isLoading() child
    //
    //  This value affects the next child status check so it's best changed
    //  when there are no children.
    //
    //  The default (disabled) is safe because it ensures completion of all
    //  children before completing the parent, avoiding any orphan processes.
    //  But it is often wasteful to wait when you already know the process in
    //  general has failed. Enabling `'immediateError helps but it becomes your
    //  job to `#abort() or `#clear() all sub-tasks, and to ignore or otherwise
    //  handle events fired on sub-tasks after completion of the parent with
    //  `'immediateError.
    //
    //  `[
    //    var parent = new Sqimitive.Async
    //    parent.whenError(func)
    //    var loading = parent.nest(new Sqimitive.Async)
    //      // parent.isLoading() == true
    //    loading.whenComplete(func2)
    //    parent.nest(new Sqimitive.Async({status: false}))
    //      // parent.isLoading() == true
    //    loading.set('status', true)
    //      // func2, then func called; loading.isLoading() == false
    //
    //    var parent = new Sqimitive.Async({immediateError: true})
    //    parent.whenError(func)
    //    var loading = parent.nest(new Sqimitive.Async)
    //      // parent.isLoading() == true
    //    loading.whenComplete(func2)
    //    loading.on('abort', () => loading.set('status', false))
    //    parent.nest(new Sqimitive.Async({status: false}))
    //      // func called; loading.isLoading() == true
    //    parent.clear()
    //      // func2 called; loading.isLoading() == false
    //  `]
    _opt: {
      status: null,
      ignoreError: false,
      immediateError: false,
    },

    events: {
      '.change_status': '_childComplete',

      '.=exception': function (/* child, sup, ...args */) {
        this.exception.apply(this, _.rest(arguments, 2))
      },

      '=nestEx': function (sup, options) {
        // Can't check _parent since this Async can be non-_owning. Other means
        // are faster but not reliable - e.g. a child could be assigned another
        // key, which trips both changed and previous checks, or a child could
        // be replaced by a new object yet leaving length the same before and
        // after nest().
        var isNew = !this.includes(options.child)
        var res = sup(this, arguments)
        // This request (sqim) could have already been complete between
        // creation and nesting as in second.nest(new first(...)), and so
        // complete event will never occur, and _childComplete - be never
        // called. We call it on nest, but only for truly new objects -
        // otherwise if sqim is already complete, and its complete event is
        // pending, we'd call _childComplete twice.
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
      //   `&sup1 `'~ is output if the `'ignoreError `#_opt is set.
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
          this.get('immediateError') ? '@' : '',
          this.get('status') == null ? 'LOADING'
            : (this.get('status') ? 'DONE' : 'ERROR'),
        ].join(' ')
      },
    },

    //! +ig
    // Separate events for separate priorities are used instead of a single
    // event because Sqimitive doesn't support ordered handlers and because
    // such set-up doesn't require sorting (or inserting handlers in specific
    // positions).
    //= object Error if caught`, true if quit due to status change`, false
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
          // the current handler has nested a new Sqimitive.Async).
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
        this.set('status', this.get('immediateError')
          // Any failed child fails the parent. Any loading child delays
          // 'status' change of the parent. None failed or loading makes success
          // of the parent (_childComplete is only called when it's not empty).
          ? counts.false ? false : counts.null ? null : true
          // Any loading child delays deciding the parent's status. In absence
          // of that, any failed child fails the parent.
          : counts.null ? null : !counts.false)
      }
    },

    _when: function (func, cx, priority, met, event) {
      if (typeof cx == 'number') {
        throw new TypeError('Sqimitive.Async: mistaken cx for priority?')
      }

      if (met) {
        try {
          func.call(cx || this, this)
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
    //= this
    //
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
    // tasks to avoid induced effects. However, `#clear() may improve
    // performance when thousands of objects need to be created but some could
    // be reused. `#clear() can be also seen as "hard" `#abort().
    //
    // Removes event listeners for `#success/`#error/`#complete (but not for
    // `#exception), calls `#abort() on self and on `#_children
    // (recursively), calls `@Base.remove()`@ on children if `#_owning or `#unlist() if not, and sets `'status
    // (`#_opt) to `'null (`#isLoading()).
    clear: function () {
      _.forEach(['success', 'error', 'complete'], function (e) { this.off(e) }, this)
      this.sink('abort', [], true)
      this.forEach(this.unlist)
      this.set('status', null)
      return this
    },

    // Nests a new child and returns a function that sets the child's `'status to `'true.
    //
    // The returned function has an `'error method that sets the child's `'status to
    // `'false.
    //
    //? Use `#nestDoner() to interface with callback-style functions:
    //  `[
    //  $('div').fadeOut(async.nestDoner())
    //
    //  var done = async.nestDoner()
    //  fs.appendFile('foo.txt', 'Hello World!', function (err) {
    //    err ? done.error() : done()
    //  })
    //
    //  async.whenSuccess(function () {
    //    var $ = require('jquery')
    //    // ...
    //  })
    //  var done = async.nestDoner()
    //  require(['jquery'], done, done.error)
    //  `]
    //
    // `'status is not changed after `#abort() was called on the child (this
    // usually happens because of `'sink() or `#clear() on the parent since
    // `#nestDoner() doesn't return the child it creates).
    nestDoner: function () {
      var child = this.nest({})
      child.on('abort', function () { child = null })
      function nestDoner_(error) {
        child && child.set('status', error !== unique)
      }
      nestDoner_.error = function () { nestDoner_(unique) }
      return nestDoner_
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
    // `#exception() outside of the normal pipeline (`#error-s are expected
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
    //? `#abort() doesn't affect own `#_children - call `#sink() or `#clear() to abort
    //  everything recursively:
    //  `[
    //     async.sink('abort')
    //  `]
    //
    // The default implementation does nothing (is a `#stub).
    abort: Sqimitive.Core.stub,
  })

  //! +ig +cl=Sqimitive.Async.Fetch:Sqimitive.Async
  // Wrapper around a compatible `#_opt.`'function performing a single
  // asynchronous request to a remote resource.
  //
  //?`[
  //   var async = new Sqimitive.Async.Fetch({
  //     function: fetch,
  //     url: '//api.moe/v1/',
  //     method: 'POST',
  //     body: new URLSearchParams({moe: 'please!'}),
  //   })
  //
  //   async.whenSuccess(function () {
  //     this.response.json().then(console.dir)
  //   })
  // `]
  //
  // Other notes:
  //* Fetching starts as soon as `#Fetch is created (in `'init()).
  //* A single instance (`'this) can be used to issue only one request.
  Async.Fetch = Async.extend('Sqimitive.Async.Fetch', {
    //#-readOnly
    // Available after `'init(). Result of `#_fetch(): native or wrapped `'XMLHttpRequest (as returned by `'ajax()) or `'Promise (`'fetch()).
    request: null,

    //#-readOnly
    // Available once not `#isSuccessful(). For `'ajax() this is whatever was given to the `'error callback (may be even unset/falsy). For (`'fetch()) this is either `'Response (request completed successfully but with HTTP status outside of 200-299; `[!requestError.ok`]) or `'Error (request didn't complete).
    //
    // Not to be confused with the `@Async.error`@ event/method.
    requestError: null,

    //#-readOnly
    // Available once `#isSuccessful(). Value of `'request's `[response...`] property (`'ajax()) or `'Response (`'fetch()).
    response: null,

    //! +ig
    //= AbortController used by abort() for `'fetch()
    _abortController: null,

    //> function function`, null = `#defaultFunction `- the backend doing actual
    //  fetching (e.g. `@jq:ajax`@() or browser's `'fetch())
    //> * `- options given to `'function
    //
    //  Usually you want to set at least `'url (required by both `'ajax() and `'fetch()).
    //
    //  `'method/`'body (`'fetch()-style) default to values of `'type/`'data (`'ajax()-style).
    //
    //  Don't set `'context (always `'this), `'success/`'error (use
    //  `#whenSuccess(), etc.), `'signal (use `#abort()).
    _opt: {
      function: null,
      // + ajax()/fetch() options
    },

    events: {
      init: function () {
        this._start(this.get())
      },

      //! +fn=abort:[reason]
      // Aborts the request and fails this `#Async or does nothing if not
      // `#isLoading().
      //> reason mixed`, omitted `- used by `'fetch(), defaults to `'AbortError
      //= this
      '=abort': function (sup, reason) {
        if (this.isLoading()) {
          //! +ig
          // XMLHttpRequest and fetch() will fire error.
          var o = this.request.abort ? this.request : this._abortController
          o ? o.abort.apply(o, _.rest(arguments)) : this.set('status', false)
        }
        return this
      },

      '=toString': function (sup) {
        return [
          sup(this),
          this.request && this.request.constructor.name || '???',
          this.readyStateText(),
          this.request && this.request.statusText || '',
          this.get('url'),  // required _opt by both ajax() and fetch()
        ].join(' ')
      },
    },

    // Returns a symbolic value for `#request.`'readyState if using `'ajax().
    //= string like `'LOADING`, empty `'fetch() provides no such info
    readyStateText: function () {
      var states = ['UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE']
      return this.request && states[this.request.readyState] || ''
    },

    //! +ig
    // Upon return, sets `#request and possibly `'_abortController.
    // Expects `'options' `'success/`'error to be called upon completion of
    // `#_fetch() that it calls.
    _start: function (options) {
      if (this.request) {
        // Reusing it would produce unexpected events.
        throw new Error('Sqimitive.Async.Fetch has already started.')
      }

      function callback(success, value) {
        if (this.isLoading()) {
          this.batch(null, function () {
            success ? this._assign(value) : (this.requestError = value)
            this.set('status', success)
          })
        }
      }

      options = _.assign(
        {
          method: options.type,
          body: options.data,
        },
        options,
        {
          context: this,
          success: function (xhr) {
            callback.call(this, true, xhr)
          },
          error: function (xhr, e) {
            callback.call(this, false, e)
          },
          signal: typeof AbortController == 'function'
            ? (this._abortController = new AbortController).signal : null,
        }
      )

      var res = this._fetch(options)
      //! +ig
      this.request = this.request /*set by _fetch()*/ || res
    },

    // Fires off the request using `'options. Must either set `#response or return its new value.
    //
    // Base implementation calls `#_opt.`'function or `#defaultFunction, giving it `'options. If result has `'then function (`'Promise), hooks it in order to call `'options' `'success/`'error. `'error is also called if `'Promise fulfills with `[Response.ok`] of `'false.
    //
    //? If using `'fetch(), `#request is `'Promise by default. You can replace it with a more useful `'Request by changing `#_opt.`'function or `#defaultFunction like so:
    //  `[
    //    Async.Fetch.defaultFunction = function (options) {
    //      return fetch(options.context.request = new Request(options))
    //    }
    //  `]
    _fetch: function (options) {
      var func = this.get('function') || this.constructor.defaultFunction
      var res = func(options)
      if (typeof res.then == 'function') {
        res.then(function (resp) {
          (resp.ok ? options.success : options.error)(resp, resp)
        }, options.error.bind(null, null))
      }
      return res
    },

    // Sets `#response value based on properties of `'obj when `'this is about to become `#isSuccessful().
    //
    // Base implementation is suitable for supported `#defaultFunction-s.
    //
    // If overriding `#_assign(),
    // avoid reading response data of the same (`'XMLHttpRequest) request multiple times because
    // browsers parse it on every access. For example, 100 reads on
    // `[xhr.response`] are 100 times slower than reading `[xhr.response`] once
    // and using that copy for subsequent access. This is especially noticeable
    // on huge JSONs where each read may take seconds.
    _assign: function (obj) {
      if ('responseJSON' in obj) {
        var resp = obj.responseJSON   // non-standard jQuery field
      } else {
        switch (obj.responseType) {
          case '':
          case 'document':
            // Always a Document on a valid response.
            if (obj.responseXML) {
              resp = obj.responseXML
              break
            }
          case 'text':
            // Reading responseXML or responseText with mismatching responseType
            // produces an exception.
            resp = obj.responseText
            break
          default:
            //! +ig
            // Can be null for a valid JSON response if the fetched file's
            // contents is "null".
            resp = ('response' in obj) ? obj.response : obj /*fetch()'s Response*/
        }
      }
      this.response = resp
    },
  })

  //! +clst

  //! +prop=defaultFunction
  // The function used by `#_fetch() when `#_opt.`'function is unset.
  //
  // Defaults to `'ajax() of the global jQuery, Zepto or `[_`] (`[nodash/extra`] provides `@no@Extra.ajax`@()) or the native `'fetch(), whichever is available (in this order). This makes `#Fetch suitable for use in a web browser with zero configuration. In other environments client must either set `#defaultFunction (provided nobody else does so and the value fits all other clients) or supply `#_opt.`'function to every instance of `#Fetch.
  //
  // Changes to `#defaultFunction take effect on next request (new `#Fetch).
  Async.Fetch.defaultFunction = typeof self == 'object' &&
    ((self.jQuery || self.Zepto || self._ || {}).ajax ||
     (self.fetch && function (opt) { return self.fetch(opt.url, opt) }))

  return Async
});
