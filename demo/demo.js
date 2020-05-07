;new (Sqimitive.jQuery.extend({
  el: {tag: 'a'},
  _contents: null,
  _source: null,

  _opt: {
    switched: false,
    prismLoaded: false,
    codeLoaded: false,
  },

  events:{
    init: 'attach-',

    change_switched: function (value) {
      $(document.body).toggleClass('view-source', value)
      value && this._load()
      this._contents.toggle(!value)
      this._source.toggle(value)
    },
  },

  elEvents: {
    click: function () {
      this.set('switched', !this.get('switched'))
      return false
    },
  },

  create: function () {
    if (!this._contents) {
      this._contents = $('<div>').appendTo('body')

      // Zepto lacks nextAll().
      var header = this.el.parents('header')
      while (true) {
        var next = header.next()
        if (this._contents[0] === next[0]) { break }
        next.appendTo(this._contents)
      }

      this._source = $('<div id="viewSource">' +
                       '<div><pre class="language-markup"></pre></div>' +
                       '<div><pre class="language-javascript"></pre></div>')
        .appendTo('body')
    }

    return this
  },

  _load: function () {
    this.create()
    this._loadPrism()
    var pre = this._source.find('pre')

    if (this.ifSet('codeLoaded', true)) {
      this._fetch('.html', pre.eq(0))
      this._fetch(null, pre.eq(1))
    }
  },

  _loadPrism: function () {
    if (this.ifSet('prismLoaded', true) && !window.Prism) {
      $('<link>')
        .attr({rel: 'stylesheet', href: '../docs/prism.css'})
        .appendTo('head')

      $.ajax({
        url: '../docs/prism.js',
        dataType: 'text',
        context: this,
        success: function (code) {
          eval(code)
          this._source.find('pre').each(this.constructor.expandFunc('_hili-.', this))
        },
      })
    }
  },

  _fetch: function (ext, el) {
    var url = this.url(ext)
    $.ajax({
      url: url,
      dataType: 'text',
      context: this,
      success: function (code) {
        $('<code>').text(code).appendTo(el.empty())
        var title = $('<a>').attr('href', url).text(url).insertBefore(el)
        while (title.prev().length) { title.prev().remove() }
        this._hili(el)
      },
    })
  },

  _hili: function (el) {
    if (window.Prism && !(el = $(el)).attr('data-prism') && el.text() != '') {
      Prism.highlightElement(el.attr('data-prism', 1)[0])
    }
  },

  url: function (ext) {
    var url = this.el.attr('href')
    return ext ? url.replace(/\.\w+$/, ext) : url
  },
}))({
  el: $('#source'),
});

$('<style>')
  .html(function () {/*
    body.view-source #source {
      color: maroon;
    }

    #viewSource {
      clear: both;
      margin: 3em 0 0;
    }

    #viewSource div {
      float: left;
      width: 49%;
      margin: 0 0.5%;
    }

    #viewSource pre {
      padding: 0.5em;
      background: #eaeaea;
      white-space: pre-wrap;
      font-family: monospace;
    }

    #viewSource a {
      font-size: 1.3em;
      text-align: center;
      display: block;
    }
  */}.toString().match(/\/\*([\s\S]*)\*\//)[1])
  .appendTo('head');