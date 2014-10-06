// Let's construct the main App object. App-specific classes will get into it
// like App.Model, App.View, App.View.PostList (or App.PostListView if you prefer).
// This is just for convenience; Sqimitive doesn't care.
var App = window.App = {}

// Base Sqimitive class with our app-specific fields that you will get during
// development - it's a promise. This simple app have none though.
App.Base = window.Sqimitive.Sqimitive.extend()

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
      this.el.attr('id', this._cid)
    },

    render: function () {
      // get() without arguments returns all _opt (options) so the template
      // can use them. Somewhat like Backbone's toJSON() but a shallow copy.
      this.el.html( this._template(this.get()) )
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
      this.set(e.target.name, e.target.value)
    },

    // Calls this['remove'] when matching event is triggered.
    'click .delete': 'remove',

    // Calls this.copy() but ignores all arguments because of the trailing
    // hash - read about masker() to know better. If we included the
    // argument then copy(parent) will become copy(event) - and will break.
    'click .copy': 'copy-',

    'click .edit, .unedit': function (e) {
      this.set('editing', e.target.className.indexOf('unedit') == -1)
    },

    dblclick: function () {
      this.set('editing', true)
    },
  },

  // Equivalent to function (value) { return $.trim(value) } - ignores extra
  // arguments normalize_OPT() are passed.
  normalize_caption: App.Base.masker($.trim, '.'),
  normalize_desc: App.Base.masker($.trim, '.'),

  copy: function (parent) {
    parent = parent || this._parent

    if (parent) {
      return parent.nest( new this.constructor(this.get()) )
    } else {
      throw 'Cannot copy a Task to no parent.'
    }
  },
})

/***
  Tasks - container of individual Task objects
 ***/

App.Tasks = App.Base.extend({
  // Makes sure we don't occasionally nest a wrong class.
  _childClass: App.Task,

  // This forwards all 'change' events of nested children (Task's) onto
  // this object as '.change' so you can (new App.Tasks).on('.change', func)
  // and Sqimitive will manage adding/removing listeners from individual tasks
  // as they appear and go away.
  _childEvents: ['change'],

  events: {
    '+nest': function (sqim) {
      // attach() without arguments reads sqim.get('attachPath'), if set.
      sqim.attach().render()
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

      var task = new App.Task(attrs)

      if (task.get('caption') != '') {
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
      this.autoOff(this.get('tasks'), {'nest, unnested, .change': 'render'})

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
      this.get('tasks').chain().filter(App.Base.picker('get', 'done')).invoke('remove')
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

  var app = new App.Document({
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
    // Ignore JSON parse errors.
  }
})();