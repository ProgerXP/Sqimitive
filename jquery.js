;(function (factory) {
  var deps = 'sqimitive/main:Sqimitive jquery:$'
  var me = 'Sqimitive.jQuery'
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
}).call(this, function (Sqimitive, $) {
  "use strict";

  var _ = Sqimitive._

  //! +cl=Sqimitive.jQuery.MixIn
  // A `#mixIn to map Sqimitive onto a DOM representation via the jQuery interface.
  //
  // See `#jQuery for details.
  //
  // Use `@Sqimitive\jQuery`@ if you just want a standard `#Base with jQuery features.
  //
  //?`[
  //    var jQueryInMyClass = MyClass.extend({
  //      mixIns: [Sqimitive.jQuery.MixIn]
  //    })
  //
  //    new jQueryInMyClass({el: $('#log')})
  // `]

  //! +cl=Sqimitive.jQuery:Sqimitive.Base:Sqimitive.jQuery.MixIn
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
  // ` `@Sqimitive\jQuery\MixIn`@ can be used to add this functionality into a sqimitive whose superclass is different from `#Base, possibly even on run-time.
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
  var MixIn = {
    staticProps: {
      //! +clst

      // Holds reference to the global `'$ object.
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

      // Determines if `'obj should be wrapped in `'$ for storing as `#el.
      //
      // Returns `'true if `'obj is a native DOM `'Element, `'Document or
      // `'Window. Returns `'false if other, including `[is$()`].
      //
      //[
      //   Sqimitive.jQuery.canWrap(document.head)  //=> true
      //   Sqimitive.jQuery.canWrap(null)           //=> false
      //   Sqimitive.jQuery.is$($('<p>'))           //=> true
      //   Sqimitive.jQuery.canWrap($('<p>'))       //=> false
      //   _.isElement(window)                      //=> false
      //   Sqimitive.jQuery.canWrap(window)         //=> true
      //   Sqimitive.jQuery.canWrap(document)       //=> true
      //]
      canWrap: function (obj) {
        return obj && (_.isElement(obj) || obj.nodeType === 9 || obj.window === obj)
      },
    },

    //! +clst=0

    // New standard options (`@Base._opt`@):
    //
    //> attachPath: string selector, object DOM or jQuery
    //  `- Default root to where this `#el is appended, resolved via
    //  `#_parent's `'$() or, if there's no parent, via global `[$()`]. Used
    //  when `#attach() is called without arguments (happens when `#_parent's
    //  `#attach() or `#render() is called).
    //
    //  Usually the value is a string selector like `[form > .filters`] or a
    //  period `'. (special case when have a `#_parent, gets its `#el).
    //
    //> el: false`, string`, object `- There is no such option but if `'el is
    //  given to `'new as part of `'options then it replaces the
    //  declaration-time value of the `#el property - see `#el for details.
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
    //> object that passes `[is$()`] or `#canWrap() `- assumes this ready-made DOM
    //  or jQuery node
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

    //#-settable
    //
    // Specifies if `#attach() should call `'attach() on `#_children when it
    // changed the parent of `#el.
    //
    // According to default Sqimitive's lifecycle (see `#render), `#jQuery's
    // `#attach() propagates recursively while `#render() happens only when
    // explicitly called. This is because `#attach() is fairly fast and often
    // nearly no-op while `#render() may repopulate the entire `#el.
    //
    // If your application's lifecycle is different, use `#_invokeAttach to
    // disable the inherited `#attach() propagation without overriding `'=attach
    // entirely.
    _invokeAttach: true,

    //#-settable
    //
    // Specifies if `#el should be `@jq:remove`@()'d from DOM when this
    // sqimitive is `#remove()'d.
    //
    // If disabled, `#remove() only unbinds `#elEvents and other listeners from
    // `#el but doesn't notify `#_children so their nodes and listeners remain
    // unchanged, nor does it `'empty() `#el's contents produced by `#render()
    // or children.
    //
    // Use `#_removeEl when you need special behaviour in `#remove()
    // but don't want to override it entirely (`'=remove) in order to keep `#jQuery's behaviour.
    _removeEl: true,

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
        opt && ('el' in opt) && (this.el = opt.el)

        if (this.el && !this.constructor.is$(this.el)) {
          if (this.constructor.canWrap(this.el) || typeof this.el == 'string') {
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
      //  no argument use the `'attachPath `#_opt`, null only bind events
      //
      // First, unless `'parent is `'null, `#attach() resolves `'parent with
      // `#_parent's `'$() or global `'$() (if no `#_parent) and, if the
      // found parent is a node and `#el's current direct parent is different,
      // calls `@jq:appendTo`@() on own `#el and `#attach() on all children of
      // self to let them rebind their DOM listeners (but see `#_invokeAttach).
      // Doesn't un-attach `#el if no parent was found. Doesn't call `#render().
      //
      // Second, `#attach() clears all existing `#el event listeners and binds
      // those defined in `#elEvents under the `[.sqim-`] + `#_cid jQuery
      // namespace (ignoring `'.ns possibly present in `#elEvents keys - that
      // one is to avoid key collisions during inheritance, not for jQuery).
      // This happens even if parent didn't change (above).
      //
      // If `#el is `'null then `#attach() does nothing.
      //
      //?`[
      //   sqim.attach('#nav')   //= sqim.el.appendTo('#nav')
      //   sqim.attach('<div>')  //= appends to a new <div> node
      //   sqim.attach(null)     // re-binds elEvents only
      //   sqim.attach('#unk')   // the same
      //   sqim.attach()         // uses sqim._opt.attachPath, if set
      //   sqim.attach(sqim.get('attachPath'))   // the same
      // `]
      //
      // Note: if `#_parent is set then `#attach() uses its `[$()`]. Hence even
      // if `'parent is a globally-reachable selector (like `[html,head,body`])
      // it will never match if `#_parent's `#el is unset or if it's not a
      // parent of that node. For example, `#el must be `[$('html')`] in order
      // to match `'head:
      //[
      //  var parent = new Sqimitive.jQuery({el: 'p'})
      //  var child = parent.nest(new Sqimitive.jQuery).attach('body')
      //    //=> child.el.parent() is []
      //]
      // Work around this by setting `'attachPath or `#el to a DOM or
      // `'$ node or by giving one to `'el after construction:
      //[
      //   var MyView = Sqimitive.jQuery.extend({
      //     el: window,
      //     el: document.rootElement,    // for <html>
      //     el: document.head,           // for <head>
      //     el: document.body,           // for <body>
      //  })
      //
      //  // Or, on run-time by class' user:
      //  new Sqimitive.jQuery({attachPath: document.rootElement})
      //  new Sqimitive.jQuery({el: window})  // binds elEvents only
      //  sqim.attach(document)               // binds elEvents only
      //]
      // Warning: `[document.body`] is not available if the current script is
      // executing from `[<head>`].
      //
      //#-baseAttach
      attach: function (parent) {
        arguments.length || (parent = this.get('attachPath'))

        if (this.el) {
          parent = parent && (this._parent ? this._parent.$(parent) : $(parent)) || []

          if (_.isElement(parent[0]) && parent[0] !== this.el[0].parentNode) {
            this.el.appendTo(parent)
            // Notifying children of the "mount" node change.
            this._invokeAttach && this.invoke('attach')
          }

          var namespace = '.sqim-' + this._cid
          this.el.off(namespace)

          _.forEach(this.elEvents, function (func, key) {
            func = Sqimitive.Core.expandFunc(func, this)
            key = key.match(/^\s*([^\s.]+)(\.\S*)?(\s+(.*))?$/)
            key[1] += namespace
            key[4] ? this.el.on(key[1], key[4], func) : this.el.on(key[1], func)
          }, this)
        }
      },

      //! +fn=remove
      //
      // Removes own `#el from DOM and `#unnest()-s `'this from `#_parent.
      //
      // If `#el is set, `#remove() calls either `@jq:remove`@() to drop it from
      // DOM (if `#_removeEl is set) or `@jq:off`@() to unbind all own events.
      // Then the inherited `@Base.remove()`@ calls `#unnest() to remove this
      // sqimitive from its `#_parent (if any).
      //
      // ` `#remove() doesn't recursively `#remove() all nested `#_children as
      // it might be undesired and slow (in DOM removing the parent node
      // automatically unbinds events of all children). If children do need to
      // perform some clean-up actions when their parent is removed - call
      // `[this.sink('remove')`] (`#sink() is recursive) or let them subscribe
      // to `#_parent's `'remove when `#owned.
      //
      //#-baseRemove
      '-remove': function () {
        if (this.el) {
          this._removeEl ? this.el.remove() : this.el.off('.sqim-' + this._cid)
        }
      },
    },

    // Finds node(s) within own `#el.
    //
    //= object `- a `@jq:jQuery`@ node
    //
    // Possible `'path's:
    //> object that is `[is$()`] to return the `'path itself`,
    //  a DOM node (`#canWrap()) to wrap and return `[$(path)`]
    //  `- returned collection may be empty or its members may be outside of
    //  `[this.el`]
    //> string empty or just `'. to return own `#el`,
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
      if (this.constructor.is$(path) || this.constructor.canWrap(path)) {
        return $(path)
      } else if (this.el) {
        return (path == '' || path == '.') ? this.el : this.el.find(path)
      } else {
        return $()
      }
    },
  }

  return Sqimitive.Base.extend('Sqimitive.jQuery', {mixIns: [MixIn]}, {MixIn: MixIn})
});
