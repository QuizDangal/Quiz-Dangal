// Lightweight modulepreload polyfill for older browsers.
(function () {
  var d = document;
  var l = d.createElement('link');
  if (l.relList && l.relList.supports && l.relList.supports('modulepreload')) return;
  for (var s of d.querySelectorAll('link[rel="modulepreload"]')) o(s);
  new MutationObserver(function (entries) {
    for (var t of entries)
      if (t.type === 'childList')
        for (var n of t.addedNodes)
          if (n.tagName === 'LINK' && n.rel === 'modulepreload') o(n);
  }).observe(d, { childList: true, subtree: true });
  function o(e) {
    if (e.ep) return;
    e.ep = true;
    var s = {};
    if (e.integrity) s.integrity = e.integrity;
    if (e.referrerPolicy) s.referrerPolicy = e.referrerPolicy;
    s.credentials =
      e.crossOrigin === 'use-credentials'
        ? 'include'
        : e.crossOrigin === 'anonymous'
          ? 'omit'
          : 'same-origin';
    fetch(e.href, s);
  }
})();
