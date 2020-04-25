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
  return Sqimitive.Base.extend('Sqimitive.Async', {
    // Max absolute number (+/-) accepted by `#whenComplete() and others,
    // clamped to the nearest value.
    //
    // Use `'-Infinity and `'Infinity to specify min/max priority.
    MAX_PRIORITY: 2,

    _childClass: '',
    _childEvents: ['complete', '=exception'],
    _ordered: {complete: Infinity, error: Infinity, success: Infinity},

    //> status null not started or not finished`, true/false succeeded/failed
    //  `- reflects both this own instance's status and of its children
    //> ignoreError bool `- if set, this instance will be considered a success
    //  even if status is false
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
        // Can't check _parent since this Async can be non-_owning.
        // Other means
        // are faster but not reliable - e.g. a child could be assigned another key,
        // which trips both changed and previous checks, or a child could be replaced by a
        // new object yet leaving length the same before and after nest().
        var isNew = !this.contains(options.child)
        var res = sup(this, arguments)
        // This request (sqim) could have already been complete between creation and
        // nesting as in second.nest(new first(...)), and so complete event will
        // never occur, and _childComplete - never called. We call it on nest,
        // but only for truly new objects - otherwise if sqim is already complete,
        // and its complete event is pending, we'd call _childComplete twice.
        isNew && this._childComplete(res.child)
        return res
      },

      change_status: function () {
        if (!this.isLoading()) {
          var ex1 = this._callPriorities(this.isSuccessful() ? 'success' : 'error', [])
          var ex2 = this._callPriorities('complete', [])
          if (ex1 || ex2) { this.exception(ex2 || ex1) }
        }
      },

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
    // event because Sqimitive doesn't support ordered handlers and because such
    // set-up doesn't require sorting (or inserting handlers in correct positions).
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
      return ex
    },

    fuse: function (event, func, cx) {
      var eobj = Sqimitive.Base.prototype.fuse.apply(this, arguments)
      if (this._ordered[event] === Infinity) {
        eobj.post = function (eobj, res) {
          // Call handlers only once.
          eobj.func = Sqimitive.Core.stub
          eobj.post = undefined
          // Skip calling next handlers if the condition no more holds (e.g. if
          // current handler has nested a new async).
          eobj.stop = event === 'complete'
            ? this.isLoading()
            : (this.isSuccessful() !== (event === 'success'))
          return res
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
          func.call(cx)
        } catch (e) {
          this.exception(e)
        }
      } else {
        priority = Math.max( -this.MAX_PRIORITY, Math.min(this.MAX_PRIORITY, priority) )
        this.on(event + (+priority || ''), func, cx)
      }

      return this
    },

    // Unlike with `[on('event')`] (`#on()) `'func gets called immediately if
    // the condition is already met (in this case `'priority is ignored).
    // See also `#MAX_PRIORITY.
    //
    // Warning: the following won't work because `'func may be called immediately,
    // before the result is assigned to `'req:
    //[
    //   var req = reqs.whenComplete(function ...)
    //]
    whenComplete: function (func, cx, priority) {
      return this._when(func, cx, priority, !this.isLoading(), 'complete')
    },

    // See `#whenComplete().
    whenError: function (func, cx, priority) {
      return this._when(func, cx, priority, this.isSuccessful() == false, 'error')
    },

    // See `#whenComplete().
    whenSuccess: function (func, cx, priority) {
      return this._when(func, cx, priority, this.isSuccessful() == true, 'success')
    },

    // Sets `'status (`#_opt) to `'true if have no children and not `#isLoading().
    //= null if not empty or is loading`, boolean result of `@Base.set()`@
    doneIfEmpty: function () {
      if (!this.length && this.isLoading()) {
        return this.set('status', true)
      }
    },

    // Removes event listeners for `#success()/`#error()/`#complete(),
    // Calls `#abort() and `#remove() on `#_children and sets `'status (`#_opt)
    // to `'null.
    clear: function () {
      _.each(['success', 'error', 'complete'], function (e) { this.off(e) }, this)
      this.invoke('abort')
      this.invoke('remove')
      this.set('status', null)
      return this
    },

    //= null when still loading (`'status unknown)`, boolean
    isSuccessful: function () {
      var s = this.get('status')
      return s == null ? null : !!(this.get('ignoreError') || s)
    },

    //= true still loading (`'status unknown)
    isLoading: function () {
      return this.get('status') == null
    },

    //! +fn=success +ig
    //
    // These get fired when all requests have finished loading. Each handler is
    // called at most once. If a handler changes status, others are skipped
    // until status changes again.
    //
    // Even though call order is deterministic (`'Async's `#nest()`] acts as `#on()
    // because of `#_childEvents/`#_forward()) it's usually more convenient to use
    // specific priority levels which don't depend on the order of `'nest()/`'on()
    // calls: `[on('success')`] is called after `[success-3`] but before
    // `[success2`].
    success: Sqimitive.Core.stub,

    //! +fn=error +ig
    // See `#success().
    error: Sqimitive.Core.stub,

    //! +fn=complete +ig
    // See `#success().
    complete: Sqimitive.Core.stub,

    // Gets called on an exception in `#success(), `#error() or `#complete().
    // This is in contrast with conventional "promises" - here, an error in
    // handing the "promise" can't mark that promise failed if its underlying
    // action (e.g. an AJAX call) has succeeded.
    //
    // Note: this isn't called on request failure unless error has thrown an
    // exception.
    //
    // There's no "whenException()" because already occurred errors are not
    // stored. Only future exceptions can be listened to, via the usual `#on().
    // It's not affected by `#clear() either.
    exception: function (e) {
      throw e
    },

    //! +fn=abort +ig
    // Do `[sink('abort')`] (`#sink()) to abort everything recursively.
    abort: Sqimitive.Core.stub,
  })
});
