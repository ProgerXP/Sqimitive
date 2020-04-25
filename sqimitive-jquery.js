/*
  Optional dependency, one of:
  `* jquery.com
  `* zeptojs.com
*/

;(function (factory) {
  // jquery can be replaced by another supported library.
  //[
  //   requirejs.config({map: {'sqimitive-jquery': {jquery: 'zepto'}}});
  //]
  var deps = {sqimitive: 'Sqimitive', jquery: '$'}
  var me = 'Sqimitive.jQuery'
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
}).call(this, function (Sqimitive, $) {
  "use strict";

  var _ = Sqimitive._

  //! +cl=Sqimitive.jQuery:Sqimitive.Base
  // Makes Sqimitive's `'el (`@Base.el`@) a jQuery (`@jq:`@) node, maintains DOM
  // event listeners, etc.
  //
  // New standard options (`@Base._opt`@):
  //> attachPath: '.' (parent's `'el) | `['.sel [ector]'`] - resolved with
  //  parent's `[$()`]
  //> el: `[{tag: 'p', ...}`] or `['.sel'`] (resolved with global `[$()`])
  //  `- only processed when given to the constructor, not to `#set() or
  //     `[sqim.el = ...`]
  //
  //# Quick-start example
  //[
  //   var Task = Sqimitive.jQuery.extend({
  //     el:       {tag: 'li'},
  //     _opt:     {caption: '', done: false, editing: false, attachPath: '.'},
  //     events:   {change: 'render'},
  //     elEvents: {dblclick: function () { this.set('editing', true) }},
  //   })
  //
  //   ;(new Sqimitive.jQuery({el: '#tasks'}))
  //     .nest( new Task({caption: 'Foo'}) )
  //]
  return Sqimitive.Base.extend('Sqimitive.jQuery', {
    // Holds a DOM node assigned to this object or `'null. If set to `'false - no
    // element is created (`[this.el`] will be null) - useful for data structures
    // aka "models", otherwise is an object of HTML attributes plus the following
    // special keys:
    //> tag: string `- tag name like `'li
    //> className `- the same as `'class key (a CSS `'class) to work around the
    //  reserved word
    //
    // After inherited constructor has ran `'el is always DOM node wrapped in
    // `[$()`] or `'null. Not advised to set it directly, treat as read-only.
    //
    // If changing on runtime, only set to an `[is$()`] object.
    el: {tag: 'div', className: ''},

    events: {
      '-init': function (opt) {
        opt && opt.el && (this.el = opt.el)

        if (this.el && !this.constructor.is$(this.el)) {
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
      },

      // Appends `#el to parent (DOM selector or node). If no argument is given
      // uses `'attachPath `#_opt (if present) to determine the parent. If parent was
      // changed, calls `#attach() on all children of self to rebind their
      // DOM listeners (doesn't happen if no parent was found or `[this.el`] is already
      // direct child of the found parent node so performance penalty of subsequent
      // `#attach() calls is small). Ultimately, binds event listeners defined in
      // `#elEvents.
      attach: function (parent) {
        arguments.length || (parent = this.get('attachPath'))

        if (parent) {
          parent = this._parent ? this._parent.$(parent) : $(parent)
        }

        if ((parent || {}).length && parent[0] !== this.el[0].parentNode) {
          parent.append(this.el)
          // Notifying children of the mount node change to rebind their DOM listeners.
          this.invoke('attach')
        }

        if (this.el) {
          var namespace = '.sqim-' + this._cid
          this.el.off(namespace)

          _.each(this.elEvents, function (func, key) {
            func = Sqimitive.Core.expandFunc(func, this)
            key = key.match(/^\s*([^\s.]+)(\.\S*)?(\s+(.*))?$/)
            key[1] += namespace
            key[4] ? this.el.on(key[1], key[4], func) : this.el.on(key[1], func)
          }, this)
        }
      },

      '-remove': function () {
        this.el && this.el.remove()
      },
    },

    // Similar to `[this.el.find(path)`] but returns `#el if `'path is empty or is a
    // dot (`[.`]). Special value `'body always returns `[document.body`].
    // If `#el is `'null always returns an empty jQuery collection (`@jq:`@).
    // If `'path is a jQuery object or a DOM node - returns `[$(path)`],
    // `@jq:jQuery`@ (note that it may be outside of `[this.el`] or have
    // `'length == 0).
    //
    // Note: `#attach() calls `[$()`] on `#_parent (if it's set); even if
    // child's `'attachPath `#_opt is a globally-reachable selector
    // (`[html,head,body`]) - if `'_parent's `#el is `'false, it will never
    // match. Work around this by setting `'attachPath to `[document.rootElement`]
    // (`'html), `[document.head`] or `[document.body`].
    //
    //[
    //   this.$()                //=> $(this.el)
    //   this.$('.')             //=> $(this.el)
    //   this.$('a[href]')       //=> $([A, A, ...])
    //   this.$(document.body)   //=> $('body')
    //   this.$('body')          //=> $('body')
    //]
    $: function (path) {
      if (this.constructor.is$(path) || _.isElement(path)) {
        return $(path)
      } else if (this.el) {
        return (path == '' || path == '.') ? this.el : this.el.find(path)
      } else {
        return $()
      }
    },
  }, {
    $: $,

    // Determines if `'obj is a `[$`] collection (like jQuery `@jq:`@ or Zepto).
    //
    //[
    //   is$(document.rootElement)   //=> false
    //   is$($('html'))    //=> true
    //   is$($('<p>'))     //=> true
    //   is$(null)         //=> false
    //]
    is$: function (obj) {
      return obj instanceof $ || ($.zepto && $.zepto.isZ(obj))
    },
  })
});
