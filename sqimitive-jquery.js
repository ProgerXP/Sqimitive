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
  // A Sqimitive with a DOM representation via the jQuery interface (`@jq:`@).
  //
  // ` `@Sqimitive\jQuery`@ is the base class used in a typical web
  // application. It turns `#el into a jQuery node, keeps it attached to
  // `#_parent's `#el, maintains `#el's event listeners in DOM, etc.
  //
  // This class can also work with libraries imitating jQuery API like Zepto
  // since this is a thin interface to jQuery and very few of its features are
  // actually used.
  //
  // See the included sample To-Do application for a "real-world" example.
  //
  //#jqex
  //? `[
  //     var Task = Sqimitive.jQuery.extend({
  //       el: {tag: 'li'},
  //
  //       _opt: {
  //         // Keep el appended to the parent's el.
  //         attachPath: '.',
  //         // Define the default attributes of Task:
  //         caption: '',
  //         done: false,
  //       },
  //
  //       events: {
  //         // Update the visual presentation whenever any _opt changes:
  //         change: 'render',
  //
  //         render: function () {
  //           this.el.text(this.get('caption'))
  //             .toggleClass('done', this.get('done'))
  //         },
  //       },
  //
  //       elEvents: {
  //         // Listen for double clicks on this.el to change the done state:
  //         dblclick: function () {
  //           this.set('done', !this.get('done'))
  //         },
  //       },
  //     })
  //
  //     // Create a parent container for our to-do items (Task's) which
  //     // is placed into the DOM at $('#tasks'):
  //     var list = new Sqimitive.jQuery({el: '#tasks'})
  //
  //     // Create a new item, add it to list's _children:
  //     list.nest( new Task({caption: 'Ready steady go!'}) )
  //     // ...append to list's el and render for the first time:
  //       .attach().render()
  //
  //     // Double click on Task's element in the window to change its
  //     // className.
  //  `]
  return Sqimitive.Base.extend('Sqimitive.jQuery', {
    // New standard options (`@Base._opt`@):
    //
    //> attachPath: string selector, object DOM or jQuery
    //  `- Default root to where this `#el is appended, resolved via
    //  `#_parent's `[$()`] or, if there's no parent, via global `[$()`]. Used
    //  when `#attach() is called without arguments (happens when `#_parent's
    //  `#attach() or `#render() is called).
    //
    //  Usually the value is a string selector like `[form > .filters`] or a
    //  period `[.`] (special case when have a `#_parent, gets its `#el).
    //
    //> el: string`, object `- There is no such option but if `'el is given to
    //  `'new as part of `'options then it replaces the declaration-time value
    //  of the `#el property - see `#el for details.
    _opt: {},

    //! +prop=el +ig=3
    //
    //#-setOnDecl
    //
    // Holds a DOM node assigned to this object or `'null.
    //
    //? `[
    //     // Set this.el by selector; becomes $(document.body):
    //     new Sqimitive.jQuery({el: 'body'})
    //     // Set this.el to a jQuery node:
    //     new Sqimitive.jQuery({el: $('body')})
    //     // Set this.el by a DOM node; becomes wrapped into $() by init():
    //     new Sqimitive.jQuery({el: document.body})
    //     // Create new element via string specification for $():
    //     new Sqimitive.jQuery({el: '<p class=text>'})
    //     // Create new element <p class="text"> by object:
    //     new Sqimitive.jQuery({el: {tag: 'p', className: 'text'}})
    //     // Cancel node creation, el becomes null:
    //     new Sqimitive.jQuery({el: false})
    //
    //     // WRONG: when changing after construction el must always be a
    //     // jQuery node, only and ever:
    //     sqim.el = '<p class=text>'
    //     // WRONG: result is a DOM node, not a jQuery node:
    //     sqim.el = document.createElement('p')
    //     // CORRECT: result is a jQuery node:
    //     sqim.el = $('<p class=text>')
    //  `]
    //
    // ` `#el's value is special during construction: first, `'init() takes the
    // value of either the `'el key from `'new's `'options or, if missing, of
    // this property, then sets `#el's property value according to it:
    //> false `- assumes `'null `#el; no DOM node is created or assigned -
    //  useful for pure data structures aka "models" (but then you might not
    //  need `@Sqimitive\jQuery`@ at all, use the lighter `#Base)
    //> string `- a `[se #lec > .tor`] (errors if no node matched) or a `[<new
    //  node=spec>`] as handled by the global `'$()
    //> object that passes `'is$() `- assumes this ready-made DOM or jQuery
    //  node
    //> object other `- Creates a new DOM node with these HTML attributes and
    //  calls `[el.data('sqimitive', this)`]. Special keys: `'tag (defaults to
    //  `'div) and `'className  (overrides `'class unless falsy to work around
    //  the reserved word).
    //
    //  `'data() allows you to reverse-lookup a Sqimitive instance from its DOM
    //  node. However, not only this is a generally deplorable practice but
    //  also not supported by some builds of Zepto.
    //
    // In any case, `#el after `'init() is either `'null or a jQuery node with
    // a non-zero `'length.
    //
    // ` `#el is not automatically attached anywhere after construction, nor
    // are its `#elEvents bound - call `#attach() for this. `@Base.render()`@
    // also calls `#attach() but it does nothing if the `'attachPath `#_opt'ion
    // is not set.
    //
    // This property is not advised to change directly after `'init() but if
    // you do then only set it to an `[is$()`] object.
    //
    // See Views overview (`#vw) for the high-level idea.
    el: {tag: 'div', className: ''},

    //elEvents: {},
    //! +prop=elEvents
    //
    //#-baseElEvents
    //
    // See also the `'attachPath `#_opt.
    //
    //?`[
    //   var MyView = Sqimitive.jQuery.extend({
    //     el: {tag: 'form'},
    //
    //     elEvents: {
    //       // Attach listener to this object's el:
    //       submit: function (e) {
    //         return false
    //           // as with regular jQuery event handlers, returning false
    //           // implies e.stopPropagation() and e.preventDefault()
    //       },
    //
    //       // React on change originating from an element with specific name
    //       // attribute:
    //       'change [name="login"]': function () {
    //         this.$('[name="password"]').val('')
    //       },
    //
    //       // Call render() whenever value of an element with the name
    //       // attribute changes:
    //       'change [name]': 'render',
    //
    //       // Masked callback - only gives first argument to _linkClicked():
    //       'click a': '_linkClicked.',
    //
    //       // Similar but the '.zyx' namespace creates a second handler,
    //       // avoiding key collision with 'click a':
    //       'click.zyx a': 'track',
    //     },
    //   })
    //
    //   var MyView2 = MyView.extend({
    //     elEvents: {
    //       // Overrides the '_linkClicked.' handler but keeps 'track'.
    //       'click a': ...,
    //     },
    //   })
    // `]

    events: {
      '-init': function (opt) {
        opt && opt.el && (this.el = opt.el)

        if (this.el && !this.constructor.is$(this.el)) {
          if (_.isElement(this.el) || typeof this.el == 'string') {
            this.el = $(this.el)
          } else {
            var attrs = _.omit(this.el, 'tag', 'className')
            this.el.className && (attrs['class'] = this.el.className)
            this.el = $( document.createElement(this.el.tag || 'div') )
              .attr(attrs).data('sqimitive', this)
          }
        }

        if (this.el && !this.el.length) {
          throw new TypeError('init: Empty el')
        }
      },

      //!`,+fna=function ( [parent] )
      //
      // Appends `#el to a DOM node and binds `#elEvents if changed parents.
      //
      //> parent string selector`, object DOM or jQuery node`,
      //  no argument use the `'attachPath `#_opt
      //
      // ` `#attach() adds `#el using `@jq:appendTo`@() to `'parent resolved
      // with `#_parent's `[$()`] or global `[$()`] (if no `#_parent), calls
      // `#attach() on all children of self (to let them rebind their DOM
      // listeners - but doesn't `#render() them) and, unless `#el is `'null,
      // clears all existing `#el event listeners and binds those defined in
      // `#elEvents under the `[.sqim-CID`] jQuery namespace (ignoring `'.ns
      // possibly present in `#elEvents keys - that one is for key collision
      // avoidance during inheritance, not for jQuery).
      //
      //?`[
      //   sqim.attach('#nav')   //= sqim.el.appendTo('#nav')
      //   sqim.attach('<div>')  //= appends to a new <div> node
      //   sqim.attach('#nothinghereever!')      // does nothing
      //   sqim.attach(null)                     // does nothing
      //   sqim.attach()         // uses sqim._opt.attachPath, if set
      //   sqim.attach(sqim.get('attachPath'))   // the same
      // `]
      //
      // Note: if `#_parent is set then its `[$()`] is used meaning that even
      // if `'parent is a globally-reachable selector (like `[html,head,body`])
      // it will never match if `'_parent's `#el is unset or if it's not a
      // parent of that node (to match `[head`] `#el must be `[$('html')`]).
      // Work around this by setting `'attachPath to a DOM node:
      //[
      //   el: document.rootElement,    // for <html>
      //   el: document.head,           // for <head>
      //   el: document.body,           // for <body>
      //     // warning: body is not available if script is executing from
      //     // <head>
      //]
      //
      // ` `#attach() does nothing if no `'parent was found (`#el is not
      // un-attached) or if `[this.el`] was already a direct child of that node
      // (i.e. found the same parent) so performance penalty of subsequent
      // `#attach() calls is small.
      //
      //#-baseAttach
      attach: function (parent) {
        arguments.length || (parent = this.get('attachPath'))

        if (parent) {
          parent = this._parent ? this._parent.$(parent) : $(parent)
        }

        if ((parent || {}).length && parent[0] !== this.el[0].parentNode) {
          parent.append(this.el)
          // Notifying children of the "mount" node change to rebind their DOM
          // listeners.
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

      //! +fn=remove
      //
      // Removes own `#el from DOM and `#unnest()s `'this from `#_parent.
      //
      // ` `#remove() calls `@jq:remove`@() on `#el (if set) to drop it from
      // DOM, then the inherited `@Base.remove()`@ calls `#unnest() to remove
      // this sqimitive from its `#_parent (if any).
      //
      // ` `#remove() doesn't recursively `#remove() all nested `#_children as
      // it might be undesired and slow (in DOM removing the parent node
      // automatically unbinds events of all children). If children do need to
      // do some clean-up actions when their parent is removed - do
      // `[this.sink('remove')`] (`#sink() is recursive) or let them subscribe
      // to `#_parent's `'remove when `#owned.
      //
      //#-baseRemove
      '-remove': function () {
        this.el && this.el.remove()
      },
    },

    // Finds node(s) within own `#el.
    //
    //= object `- a `@jq:jQuery`@ node
    //
    // Possible `'path's:
    //> object that is `[is$()`] to return the `'path itself`,
    //  a DOM node to wrap and return `[$(path)`]
    //  `- returned collection may be empty or its members may be outside of
    //  `[this.el`]
    //> string empty or just `[.`] to return own `#el`,
    //  selector to return `[this.el.find(path)`] - see `@jq:find`@()
    //  `- if `'this.`#el is unset then always returns a jQuery node with zero
    //  `'length
    //
    //?`[
    //   this.$()                //=> $(this.el) - but better use this.el
    //   this.$('')              //=> $(this.el)
    //   this.$('.')             //=> $(this.el)
    //   this.$('a[href]')       //=> $([A, A, ...])
    //   this.$(document.body)   //=> $('body')
    //   this.$($('body'))       // same
    //   this.$('body')          // empty collection unless this.el is <html>
    //
    //   this.el = null
    //   this.$('')              //=> $()
    //   this.$('body')          //=> $()
    //   this.$(document.body)   //=> $('body')
    // `]
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
    //! +clst

    // Holds reference to the global `[$`] object.
    //
    //[
    //   var body = Sqimitive.jQuery.$('body')
    //   var p = Sqimitive.jQuery.$('<p class=text>')
    //]
    //
    // A similar global property `[Sqimitive._`]  holds reference to the
    // utility library in use.
    $: $,

    // Determines if `'obj is a `'$ node (`@jq:jQuery`@ or Zepto).
    //
    //[
    //   Sqimitive.jQuery.is$(document.rootElement)   //=> false
    //   Sqimitive.jQuery.is$($('html'))    //=> true
    //   Sqimitive.jQuery.is$($('<p>'))     //=> true
    //   Sqimitive.jQuery.is$($())          //=> true
    //   Sqimitive.jQuery.is$(null)         //=> false
    //]
    is$: function (obj) {
      return obj instanceof $ || ($.zepto && $.zepto.isZ(obj))
    },
  })
});
