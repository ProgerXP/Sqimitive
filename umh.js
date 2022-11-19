;(function (factory) {
  // Avoid referencing another module by its package (in Node.js environment) to
  // make it loadable by Require.js: define(['sqimitive'], ...) will fail
  // (unless a map or paths entry is configured) because Require.js doesn't
  // parse package.json and will try to fetch sqimitive.js, not
  // sqimitive/main.js.
  //
  // The '?part' is optional and is given only to Require.js, with '?' replaced
  // with '/'. It exists for conditional dependency on another universal module:
  // suppose your script depends on a utility library like NoDash but may also
  // work with Underscore. You set deps to 'nodash?main:_' and it works with
  // both Node.js and Require.js out of the box. However, overriding in Node.js
  // happens on the per-package basis meaning 'nodash' is substituted for
  // 'underscore' - but the latter may have another main script and requiring
  // 'nodash/main' would fail; by giving the package's name alone we include the
  // 'main' from package.json of 'underscore'. At the same time, 'nodash:_'
  // won't work in Require.js without configuration (as explained above) even if
  // no override takes place.
  //
  // If you have no dependencies but still want to use UMH, set this to ''.
  var deps = 'moduleID?main:Property.in.window ano/ther:dep'
  var me = 'ExportProperty.in.window'
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

  //var exported = {}
  //exported.foo = ...

  return exported
});
