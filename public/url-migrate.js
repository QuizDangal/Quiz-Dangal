// If 404.html redirected here with ?p=<encoded>, restore the original path before the app mounts.
(function () {
  try {
    var u = new URL(window.location.href);
    var p = u.searchParams.get('p');
    if (p) {
      var target = decodeURIComponent(p);
      // Only allow local paths – block protocol-relative and absolute URLs
      if (target && target.charAt(0) === '/' && target.charAt(1) !== '/' && target.indexOf('://') === -1) {
        window.history.replaceState({}, '', target);
      }
    }

    // Migrate old hash-based URLs (#/about-us) to clean paths (/about-us)
    if (window.location.hash && window.location.hash.indexOf('#/') === 0) {
      var clean = window.location.hash.slice(1); // remove '#'
      var cleanUrl = clean;
      if (!cleanUrl.startsWith('/')) cleanUrl = '/' + cleanUrl;
      // Block protocol-relative and absolute URLs from hash migration
      if (cleanUrl.charAt(1) !== '/' && cleanUrl.indexOf('://') === -1) {
        window.history.replaceState({}, '', cleanUrl);
      }
    }

  } catch (e) {
    // ignore
  }
})();
