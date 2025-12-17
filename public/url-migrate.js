// If 404.html redirected here with ?p=<encoded>, restore the original path before the app mounts.
(function () {
  try {
    var u = new URL(window.location.href);
    var p = u.searchParams.get('p');
    if (p) {
      var target = decodeURIComponent(p);
      window.history.replaceState({}, '', target);
    }

    // Migrate old hash-based URLs (#/about-us) to clean paths (/about-us)
    if (window.location.hash && window.location.hash.indexOf('#/') === 0) {
      var clean = window.location.hash.slice(1); // remove '#'
      var cleanUrl = clean;
      if (!cleanUrl.startsWith('/')) cleanUrl = '/' + cleanUrl;
      window.history.replaceState({}, '', cleanUrl);
    }
  } catch (e) {
    // ignore
  }
})();
