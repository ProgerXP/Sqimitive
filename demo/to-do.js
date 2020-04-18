// Let's construct the main App object. App-specific classes will get into it
// like App.Model, App.View, App.View.PostList (or App.PostListView if you prefer).
// This is just for convenience; Sqimitive doesn't care.
var App = window.App = {}

// Base Sqimitive class with our app-specific fields that you will get during
// development - it's a promise. This simple app have none though.
App.Base = window.Sqimitive.jQuery.extend()

App.ValidationError = function (msg) {
  this.message = msg
}

App.ValidationError.prototype = new Error

/***
  Single Task - objects to be nested in App.Tasks
 ***/

App.Task = App.Base.extend({
  el: {tag: 'li', className: 'task'},
  _template: Handlebars.compile( $('#item').html() ),

  _opt: {
    caption: '',
    description: '',
    done: false,
    editing: false,
    // attachPath tells the parent of this sqimitive (if any) to automatically
    // this.el.appendTo(parent.$(attachPath)) when the former is rendered.
    // Dot stands for parent's el itself but can be any selector too.
    attachPath: '.',
  },

  // Defines Sqimitive native events. Since methods are events this is also
  // used to override them (as in OOP) - like we do with init() and render().
  events: {
    // Calls this['render'] when change event occurs.
    change: 'render',

    init: function () {
      // Allow linking to a particular task as #anchor.
      this.el.attr('id', this._cid)
    },

    render: function () {
      // get() without arguments returns all _opt (options) so the template
      // can use them. Somewhat like Backbone's toJSON() but a shallow copy.
      var vars = _.extend(this.get(), {id: this._cid})
      this.el.html(this._template(vars))
    },

    change_done: function (value) {
      this.el.toggleClass('done', value)
    },

    change_editing: function (value) {
      this.el.toggleClass('editing', value)

      // When any task goes into edit mode - close editing of all other tasks.
      if (value && this._parent) {
        _.invoke(this._parent.without(this), 'set', 'editing', false)
      }

      // Put cursor in the first input field when in edit mode.
      _.defer(function (self) {
        self.$('[autofocus]').focus()
      }, this)
    },
  },

  // Defines DOM events. They are automatically (re)bound to this.el.
  elEvents: {
    'click [type="checkbox"]': function (e) {
      this.set('done', e.target.checked)
    },

    'blur [name]': function (e) {
      try {
        this.set(e.target.name, e.target.value)
      } catch (ex) {
        // Can't save - bad value (empty caption). Let the user re-enter it.
        alert(ex.message)
        e.target.value = this.get(e.target.name)
        _.defer(function () {
          e.target.select()
          e.target.focus()
        })
      }
    },

    // Calls this['remove'] when a matching event is triggered.
    'click .delete': 'remove',

    // Calls this.copy() but ignores all arguments because of the trailing
    // dash - read about masker() to know better. If we included the
    // argument then copy(parent) will become copy(event) - and will break.
    'click .copy': 'copy-',

    'click .edit, .unedit': function (e) {
      this.set('editing', e.target.className.indexOf('unedit') == -1)
    },

    'keydown [name="caption"]': function (e) {
      if (e.keyCode == 27) {  // Escape quits editing without saving caption.
        this.set('editing', false)
      } else if (e.keyCode == 13) {   // Enter tries to save caption, then quits.
        try {
          this.set(e.target.name, e.target.value)
          // Only quit editing on no exception in set().
          this.set('editing', false)
        } catch (ex) {
          // Ignore validation errors, keep the input focused.
        }
      }
    },

    dblclick: function () {
      this.set('editing', true)
    },
  },

  // Equivalent to function (value) { return $.trim(value) } - ignores extra
  // arguments that normalize_OPT() functions are passed.
  // Shorter with ES6: (s) => $.trim(s).
  normalize_description: App.Base.masker($.trim, '.'),

  // normalize_OPT() doubles as a validation routine.
  normalize_caption: function (now) {
    now = $.trim(now)
    if (now == '') {
      throw new App.ValidationError('Cannot assign empty caption to a Task.')
    } else {
      return now
    }
  },

  copy: function (parent) {
    parent = parent || this._parent

    if (parent) {
      return parent.nest( new this.constructor(this.get()) )
    } else {
      // Throwing objects rather than strings is better as they have stack
      // trace and other useful properties.
      throw new TypeError('Cannot copy a Task to no parent.')
    }
  },
})

/***
  Tasks - container of individual Task objects
 ***/

App.Tasks = App.Base.extend({
  // Sqimitive's internal _children property is an object and JavaScript's
  // objects are unordered. This mix-in transparently maintains proper order.
  mixIns: [window.Sqimitive.Ordered],

  // Makes sure we don't occasionally nest a wrong class.
  _childClass: App.Task,

  // This forwards all 'change' events of nested children (Task's) onto
  // this object as '.change' so you can (new App.Tasks).on('.change', func)
  // and Sqimitive will manage adding/removing listeners from individual tasks
  // as they appear and go away.
  _childEvents: ['change'],

  _opt: {
    // If null, the list is sorted by _cid (essentially later added appear last),
    // else is a string - property name of Task to sort by.
    order: 'caption',
  },

  events: {
    // The caller may override sort order for a particular Task by setting
    // options.pos given to nestEx(). If pos is null then 'order' is used.
    '=_sorter': function (sup, a, b, posB) {
      var posA = a.pos == null ? a.child.get(this.get('order')) : a.pos
      return arguments.length == 2 ? posA
        : (posA > posB ? +1 : (posA < posB ? -1
            // If properties match - sort stably by unique and constant _cid's.
            : (a.child._cid - b.child._cid)))
    },

    // When the property we're sorting by is changed, update that child's pos.
    '.change': function (sqim, option, now, old) {
      // Re-nesting an already nested child simply changes its pos.
      option == this.get('order') && this.nest(sqim, {pos: now})
    },

    // When changing the sort order, re-sort the entire list.
    change_order: 'resort',

    // Is called when child has changed pos. The order inside this sqimitive
    // is updated automatically but not el positions in the DOM.
    _repos: function (child, index) {
      index >= this.length - 1
        ? child.el.appendTo(this.el)
        : child.el.insertBefore(this.el.children()[index])
    },

    // When adding a new child
    '+nestEx': function (res) {
      // attach() without arguments reads sqim.get('attachPath'), if set.
      res.changed && res.child.attach().render()
    },
  },
})

/***
  New Task Form
 ***/

App.NewTaskForm = App.Base.extend({
  _opt: {
    tasks: null,    // required; App.Tasks.
  },

  events: {
    // Trailing '-' makes masker() chop off all arguments of init()
    // before calling attach(). Without it attach(path) will become
    // attach(opt) - and will break.
    init: 'attach-',
  },

  elEvents: {
    submit: function (e) {
      e.preventDefault()

      var attrs = {
        // No need to trim() or otherwise normalize the values here
        // as they are given to set() by init() which cleans them for us.
        caption:      this.$('[name="caption"]').val(),
        description:  this.$('[name="description"]').val(),
      }

      try {
        var task = new App.Task(attrs)
      } catch (e) {
        if (!(e instanceof App.ValidationError)) {
          throw e
        }
      }

      if (task) {   // validation succeeded.
        this.get('tasks').nest(task)
        this.$('[name]').val('')

        _.defer(function () {
          // With many tasks, point the user to the just appended one.
          var el = $('#' + task._cid)[0]
          el && el.scrollIntoView()
        })
      }

      this.$('[name="caption"]').focus()
    },
  },
})

/***
  Application Singleton
 ***/

App.Document = App.Base.extend({
  _opt: {
    tasks: null,    // required; App.Tasks.
  },

  events: {
    init: function () {
      // autoOff() keeps track of all hooked objects so that we can unhook
      // them all in one go by calling autoOff() without arguments.
      // Here we simply invoke render() whenever a task is added, removed
      // or its attribute changes (e.g. it's renamed).
      this.autoOff(this.get('tasks'), {'nestEx, unnested, .change': 'render'})

      this.attach().render()
    },

    render: function () {
      var tasks = this.get('tasks')

      // Update with the number of "done" To-Do items in this app.
      this.$('#done').text(tasks.filter(App.Base.picker('get', 'done')).length)

      // Make "(un)set all done" checkbox checked when all tasks are "done".
      this.$('#toggle')[0].checked = tasks.every(App.Base.picker('get', 'done'))
    },
  },

  elEvents: {
    'click #toggle': function (e) {
      this.get('tasks').invoke('set', 'done', e.target.checked)
      // Just like this but shorter:
      // this.get('tasks').each(function (t) { t.set('done', e.target.checked) })
    },

    'click #purge': function () {
      // Removes all tasks marked as "done" - matching filter(sqim.get('done')).
      var doneTasks = this.get('tasks').filter(App.Base.picker('get', 'done'))
      _.invoke(doneTasks, 'remove')
    },

    'change #order': function (e) {
      this.get('tasks').set('order', e.target.value || null)
    },
  },
})

/***
  Bootstrap the application
 ***/

;(function () {
  var tasks = new App.Tasks({
    // Pre-attaches the object to existing DOM node.
    el: $('#list'),
  })

  var form = new App.NewTaskForm({
    el: $('#new'),
    // Tells the form which Tasks container should receive created tasks.
    tasks: tasks,
  })

  var app = window.app = new App.Document({
    el: document.body,
    tasks: tasks,
  })

  // Save current tasks when user navigates away.
  $(window).on('click beforeunload', function () {
    var data = tasks.invoke('get')
    document.cookie = 'sqimtodo=' + encodeURIComponent(JSON.stringify(data))
                      '; expires=Sat, 22-Sep-2024 00:00:00 GMT'
  })

  // Load previously saved tasks, if any.
  var data = document.cookie.match(/(^|;) *sqimtodo=(%5B.+?%5D) *($|;)/)
  try {
    // assignChildren() is Backbone's sync() without a remote request.
    // It adds, updates and removes children according to given data
    // (array of options that are turned into new Sqimitive's).
    tasks.assignChildren( $.parseJSON(decodeURIComponent(data[2])) )
  } catch (e) {
    // Ignore JSON parse errors or different serialization format.
  }
})();