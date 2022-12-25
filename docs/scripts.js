;(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var frame = document.querySelector('iframe.ip-frame')

    if (frame) {
      initIndexFrame(frame)
      if (navigator.userAgent.match(/Firefox/i)) {
        // Create 3 files: 1.html, 2.html, 3.html; 1.html = <iframe src=2.html>;
        // 2.html = <a href=3.html>; 3.html = <a href=2.html>. Open 1.html in
        // Firefox, click on the link to go to 3.html - history will have 2
        // entries (#1 = 2.html, #2 = 3.html). Now reload (F5) and click Back -
        // you will stay on #2 while Chrome would go to #1 (as expected).
        document.querySelector('.ua-bugs__ff-nav').className += ' ua-bugs__bug_vis'
      }
    } else if (window.top == window && !location.href.match(/[?&#]noframe\b/)) {
      // Don't force the frameset if there's either an anchor #noframe or a
      // query string parameter ?noframe or &noframe. The former is useful as a
      // "non-sticky" mode (opening a new tab from such a frame will clear the
      // anchor and so force the frameset in that new tab) while others are
      // "sticky" (query string is preserved and so no frameset is forced in
      // new tabs).
      location.href = document.documentElement.getAttribute('data-root') +
                      'index.html#' + encodeURIComponent(relPath() + location.hash)
      return
    }

    var el = document.querySelector('.qnbar')
    el && initQuickNavBar(el)

    document.querySelectorAll('.def-snip__toggler').forEach(function (el) {
      el.addEventListener('click', function (e) {
        el.parentNode.classList.toggle('def-snip__hdr_vis')
        e.preventDefault()
      })
    })
  })

  addEventListener('message', function (e) {
    switch (e.data.chem) {
      case 'locate': return locateCurrent()
    }
  })

  var allEntities
  var allParents

  window.entitiesLoaded = function (data) {
    allEntities = data.entities
    allParents = data.parents
    indexFrameMarks()   // parents are now available.

    var el = document.querySelector('.sch')
    el && initSearchFormWithData(el, data)
  }

  function initQuickNavBar(el) {
    var links = []
    var headers = []

    var locate = el.querySelector('.qnbar__locate')
    locate.style.display = 'inline'
    locate.onclick = function () {
      window.top.postMessage({chem: 'locate'}, '*')
      return false
    }

    el.querySelectorAll('a').forEach(function (a) {
      // Only match anchors relative to this page (no file name).
      // a.href is normalized absolute path; we need it as supplied in HTML.
      var id = a.getAttribute('href').match(/^#(.+)/)
      var h = id && document.getElementById(id[1])
      if (h) {
        links.push(a)
        headers.push(h)
      }
    })

    var updateClasses = function () {
      // Not using innerWidth because some browsers can fake it (...Tor).
      for (var i = 0, y = scrollY + el.offsetTop;
           i < headers.length && headers[i].offsetTop < y;
           i++) ;

      i--

      links.forEach(function (a, index) {
        if (index != i) {
          a.classList.remove('qnbar_cur')
        }
      })

      i >= 0 && links[i].classList.add('qnbar_cur')
    }

    window.addEventListener('scroll', updateClasses)
    updateClasses()
  }

  function initSearchFormWithData(parent, entities) {
    var input = create('input', parent, {className: 'sch__input'})

    var onresize = function () {
      var el = parent.parentNode.querySelector('.ip-help')
      if (el) { parent.style.width = el.clientWidth + 'px' }
    }

    window.addEventListener('resize', onresize)
    onresize()

    var list = create('ul', parent, {className: 'sch-list'})

    var help = parent.querySelector('.sch__help')
    // Move after the list.
    help && parent.appendChild(help)

    if (location.protocol == 'file:' && navigator.userAgent.match(/webkit/i)) {
      document.querySelector('.ua-bugs__chrome').className += ' ua-bugs__bug_vis'
    }

    var targetFrame = window[ parent.getAttribute('data-sch-target') ]
    // Array of objects; keys: class, url, text.
    var lastPages = []
    var updateTimer
    var lastSearch
    var listIndex

    var append = function (pages) {
      // page - object with: class, url, text, type, parentText/URL/ID (optional).
      pages.forEach(function (page) {
        var cls = []
        listIndex == list.childNodes.length && cls.push('sch-list_cur')
        var li = create('li', list, {className: cls.join(' ')})

        if (page.parentID) {
          li.setAttribute('data-if-entity', page.parentID + ' sch-list_cur-file')
        }

        var a = create('a', li, {
          href: page.url,
          target: targetFrame ? targetFrame.name : '',
          onclick: function () {
            li.className += ' sch-list_in-last'
            lastPages.unshift(page)
            for (var i = lastPages.length - 1; i > 0; i--) {
              lastPages[i].url == page.url && lastPages.splice(i, 1)
            }
          },
        })

        if (lastPages.some(function (p) { return p.url == page.url })) {
          li.className += ' sch-list_in-last'
        }

        var textEl = create('span', a, {
          className: page['class'],
          innerText: page.text,
        })

        if (lastSearch.length) {
          var re = new RegExp(escapeRE(lastSearch), 'gi')
          textEl.innerHTML = textEl.innerHTML.replace(re, '<mark>$&</mark>')
        }

        page.type && create('span', a, {
          className: 'sch-list__type',
          innerText: page.type,
        })

        if (page.parentText) {
          create(page.parentURL ? 'a' : 'span', li, {
            className: 'sch-list__parent',
            href: page.parentURL,
            innerText: page.parentText,
            target: targetFrame ? targetFrame.name : '',
          })
        }
      })

      indexFrameMarks(list)
    }

    var cmp = function (a, b) {
      return a > b ? +1 : (a < b ? -1 : 0)
    }

    var sorter = function (a, b) {
      return cmp(a.text, b.text) || cmp(a.type, b.type) || cmp(a.url, b.url)
    }

    var showList = function () {
      parent.classList.add('sch_vis')
      updateList()
    }

    var hideList = function () {
      clearTimeout(updateTimer)
      parent.classList.remove('sch_vis')
    }

    var queueUpdateList = function (delay) {
      clearTimeout(updateTimer)
      updateTimer = setTimeout(showList, +delay || 50)
    }

    var updateList = function () {
      // In case the input was changed via context menu (Paste, etc.).
      queueUpdateList(1000)

      var charCase = input.value.match(/[A-Z]/)
      var str = input.value.trim()
      charCase || (str = str.toLowerCase())

      if (lastSearch == str) { return }
      lastSearch = str
      listIndex = 0
      list.innerHTML = ''

      if (!str.length) {
        append(lastPages)
      } else {
        var exact = []
        var start = []
        var inside = []

        for (var id in entities.entities) {
          var ent = entities.entities[id]
          var name = charCase ? ent.name : ent.name.toLowerCase()
          var pos = name.indexOf(str)

          // Anchors are usually internal and get in the way of searching.
          if (pos != -1 && ent.type != 'anchor' &&
              // "_pages" are internal and hidden from TOC.
              (ent.type != 'page' || ent.name[0] != '_')) {
            var parent = entities.entities[entities.parents[ent.id]]
            ;(name == str ? exact : (pos ? inside : start)).push({
              class: entityClass(ent),
              url: urlOf(ent),
              text: ent.name,
              type: ent.type,
              parentText: parent && 'in ' + parent.type + ' ' + parent.name,
              parentURL: parent && urlOf(parent),
              parentID: parent && parent.id,
            })
          }
        }

        exact.sort(sorter)
        start.sort(sorter)
        inside.sort(sorter)
        append(exact.concat(start, inside))
      }
    }

    var handleKey = function (e) {
      if (e.keyCode == 27) {
        targetFrame && targetFrame.focus()
        return input.blur()
      }
      if (e.type == 'keydown') {
        switch (e.keyCode) {
          case 38:
          case 40:
            var delta = e.keyCode == 40 ? +1 : -1
            listIndex += delta
            if (listIndex < 0) { listIndex = list.childNodes.length - 1 }
            if (listIndex >= list.childNodes.length) { listIndex = 0 }
            list.childNodes.forEach(function (node, index) {
              var cur = index == listIndex
              node.classList[cur ? 'add' : 'remove']('sch-list_cur')
              if (cur) {
                if (node.offsetParent != list) {
                  throw new Error(".sch-list must have position: relative.");
                }
                // Scroll only if (top edge) is not already visible.
                if (node.offsetTop < list.scrollTop ||
                    node.offsetTop + node.offsetHeight > list.scrollTop + list.clientHeight) {
                  // If navigating up (delta < 0) - make sure current item is
                  // on the bottom (to give view of the forthcoming items, else
                  // - on top), but unless current item is first or last - allow
                  // 1 item visible (i.e. scroll to the item-after-current).
                  //  ________
                  // | item 1 ' -  scroll-to this (index + -delta)
                  // | item 2 ' -- current (on top if scrolling down)
                  // | item 3 '
                  // | item 4 '
                  (list.childNodes[index + -delta] || node).scrollIntoView(delta > 0)
                }
              }
            })
            return
          case 13:
            var node = list.childNodes[listIndex]
            node && node.querySelector('a').click()
            return
        }
      }
      queueUpdateList()
    }

    var handleGlobalHotKey = function (e) {
      if (e.altKey && e.keyCode == 87) {   // 'W'.
        input.select()
        input.focus()
        // It's currently position: fixed but just in case it's static.
        input.scrollIntoView()
      } else if (e.altKey && e.keyCode == 69) {   // 'E'.
        input.blur()
        locateCurrent()
      } else {
        return
      }
      e.preventDefault()
    }

    var delayBlur
    var blurTimer

    list.addEventListener('mousedown', function () {
      delayBlur = true
    })

    input.addEventListener('blur', function () {
      clearTimeout(blurTimer)
      blurTimer = setTimeout(hideList, delayBlur ? 200 : 0)
      delayBlur = false
    })

    input.addEventListener('focus', function () {
      clearTimeout(blurTimer)
      showList()
      delayBlur = false
    })

    input.addEventListener('keypress', handleKey)
    input.addEventListener('keydown', handleKey)
    input.addEventListener('keyup', handleKey)
    document.body.addEventListener('keydown', handleGlobalHotKey)

    ipFrameNav.push(function () {
      this.addEventListener('keydown', handleGlobalHotKey)
    })

    parent.className += ' sch_ready'
    input.focus()
  }

  var ipFrameNav = []
  // May be null if not available on the page.
  var ipFrameEntity = JSON.parse(document.documentElement.getAttribute('data-entity') || 'null')

  function initIndexFrameNav(frame) {
    var timer
    var oldDoc

    var queueUpdate = function (first) {
      clearTimeout(timer)
      timer = setTimeout(function () { update(first) }, 50)
    }

    var update = function (first) {
      // contentDocument doesn't become immediately available after onunload.
      // contentWindow object stays the same between reloads but contentDocument
      // doesn't so we listen when the latter changes (DOMContentLoaded is
      // unreliable).
      if (oldDoc == frame.contentDocument ||
          frame.contentDocument.readyState == 'loading') {
        queueUpdate(first)
      } else {
        hook()
        init(first)
      }
    }

    var init = function (first) {
      var doc = oldDoc = frame.contentDocument

      var anchEnt = doc.getElementById(doc.location.hash.replace('#', ''))
      anchEnt && (anchEnt = anchEnt.getAttribute('data-entity'))
      ipFrameEntity = JSON.parse(anchEnt || doc.documentElement.getAttribute('data-entity') || 'null')

      document.title = (anchEnt ? ipFrameEntity.name + ' • ' : '') + doc.title
      indexFrameMarks()

      ipFrameNav.forEach(function (func) {
        func.call(frame.contentWindow, ipFrameEntity, first === true)
      })
    }

    var hook = function () {
      frame.contentWindow.addEventListener('hashchange', init)
      // onunload fired in Firefox but not in Chrome, onbeforeunload - in
      // Chrome but not in Firefox.
      frame.contentWindow.addEventListener('unload', queueUpdate)
      frame.contentWindow.addEventListener('beforeunload', queueUpdate)
    }

    hook()
    // contentDocument may be still 'loading'.
    queueUpdate(true)
  }

  function initIndexFrame(frame) {
    initIndexFrameNav(frame)

    ipFrameNav.push(function (entity, first) {
      if (!first) {
        var url = '#' + encodeURIComponent(relPath(this) + this.location.hash)
        history.replaceState({}, document.title, url)
      }
    })

    var nav = function () {
      var prev = location.hash.replace(/#/, '')
      if (prev) { frame.src = decodeURIComponent(prev) }
    }

    window.addEventListener('hashchange', nav)
    nav()
  }

  function indexFrameMarks(doc) {
    doc = doc || document
    doc.querySelectorAll('[data-if-entity]').forEach(function (el) {
      var data = el.getAttribute('data-if-entity').match(/^(\S+) (.+)$/)

      for (var ent = ipFrameEntity; ent && !mark; ) {
        var mark = ent.id == data[1]
        ent = allParents ? allEntities[allParents[ent.id]] : null
      }

      el.classList.toggle(data[2], !!mark)
    })
  }

  function locateCurrent() {
    var nodes = document.querySelectorAll('.ip-nav__item_cur')
    var node = nodes[nodes.length - 1]
    if (node) {
      var top = node.offsetTop - innerHeight * 0.15
      node.offsetParent.scrollTop = Math.max(0, top)
    }
  }

  // From entity.php.
  // ent - from entities.json, entities array member object.
  // parent - same as ent or null.
  function urlOf(ent) {
    if (ent.type == 'class' || ent.type == 'page') {
      var parts = ent.name.split(/\W+/g)
      parts.push(ent.type[0] + '_' + parts.pop() + '.html')
      return parts.join('/')
    } else {
      var parent = allEntities[allParents[ent.id]]
      var inst = ent.modifiers.indexOf('static') < 0 ? 'i' : 's'
      return urlOf(parent) + '#' +
              parent.name.replace(/\W+/g, '-') + '--' +
              inst + ent.type[0] + ent.name.replace(/\W+/g, '-')
    }
  }

  // From entity.php.
  function entityClass(ent, type) {
    type = type || 'fg'
    var mmod = function (s) { return 'mmods-' + type + '_' + s }
    return 'member-' + type + ' member-' + type + '_' + ent.type +
            ' mmods-' + type + ' ' + ent.modifiers.map(mmod).join(' ')
  }

  function create(tagName, parent, attrs) {
    var el = document.createElement(tagName)
    for (var name in attrs) { el[name] = attrs[name] }
    parent && parent.appendChild(el)
    return el
  }

  function escapeRE(str) {
    var escapeRE = /[-^$.*+?{}()[\]|\\]/g
    return str.replace(escapeRE, '\\$&')
  }

  function relPath(win) {
    win = win || window
    var n = win.document.documentElement.getAttribute('data-root').match(/$|\//g).length
    var re = '(([^/]+(/|$)){' + n + '})$'
    return win.location.pathname.match(new RegExp(re, 'g'))[0]
  }

})();