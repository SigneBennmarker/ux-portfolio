(function () {
  var STORAGE_KEY = "portfolioCaseHeroTransition";
  var DURATION_MS = 560;
  var EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function normalizePath(path) {
    var p = path || "";
    if (p.endsWith("/index.html")) p = p.slice(0, -"/index.html".length);
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  }

  /** Outgoing: store card image rect and navigate */
  function initOutgoing() {
    var links = document.querySelectorAll("a[data-case-hero-transition]");
    if (!links.length) return;

    links.forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (prefersReducedMotion()) return;
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.button !== 0) return;

        var card = link.closest(".case-card");
        if (!card) return;
        var img = card.querySelector(".case-image");
        if (!img || !img.getBoundingClientRect) return;

        var rect = img.getBoundingClientRect();
        var cs = window.getComputedStyle(img);
        var destUrl;
        try {
          destUrl = new URL(link.getAttribute("href") || "", window.location.href);
        } catch (e) {
          return;
        }

        var payload = {
          v: 1,
          targetPath: normalizePath(destUrl.pathname),
          src: img.currentSrc || img.src,
          start: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
          borderRadius: cs.borderRadius || "8px",
        };

        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
          return;
        }

        event.preventDefault();
        window.location.assign(link.href);
      });
    });
  }

  /** Incoming: overlay animates from stored rect to hero image */
  function runIncoming() {
    if (prefersReducedMotion()) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      return;
    }

    var raw;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return;
    }
    if (!raw) return;

    var data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (err) {}
      return;
    }
    if (!data || !data.start || !data.src) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      return;
    }

    var here = normalizePath(window.location.pathname);
    var there = normalizePath(data.targetPath || "");
    if (there && here !== there) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      return;
    }

    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}

    var heroImg = document.querySelector(".case-detail__media .case-detail__hero-image");
    if (!heroImg) return;

    heroImg.classList.add("case-detail__hero-image--pending");

    var overlay = document.createElement("div");
    overlay.className = "case-hero-transition-overlay";
    overlay.setAttribute("aria-hidden", "true");

    var inner = document.createElement("img");
    inner.src = data.src;
    inner.alt = "";
    inner.decoding = "async";
    inner.style.width = "100%";
    inner.style.height = "100%";
    inner.style.objectFit = "cover";
    inner.style.display = "block";
    inner.style.pointerEvents = "none";

    overlay.appendChild(inner);

    var s = data.start;
    overlay.style.position = "fixed";
    overlay.style.top = s.top + "px";
    overlay.style.left = s.left + "px";
    overlay.style.width = s.width + "px";
    overlay.style.height = s.height + "px";
    overlay.style.zIndex = "10000";
    overlay.style.borderRadius = data.borderRadius || "8px";
    overlay.style.overflow = "hidden";
    overlay.style.boxSizing = "border-box";
    overlay.style.pointerEvents = "none";
    overlay.style.willChange = "top, left, width, height, border-radius";

    document.body.appendChild(overlay);

    var done = false;
    var fallbackTimer;

    function finish() {
      if (done) return;
      done = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      overlay.remove();
      heroImg.classList.remove("case-detail__hero-image--pending");
    }

    fallbackTimer = window.setTimeout(finish, DURATION_MS + 120);

    var measureAttempts = 0;

    function animateToHero() {
      measureAttempts += 1;
      var end = heroImg.getBoundingClientRect();
      if ((end.width < 4 || end.height < 4) && measureAttempts < 120) {
        requestAnimationFrame(animateToHero);
        return;
      }
      overlay.style.transition =
        "top " +
        DURATION_MS +
        "ms " +
        EASING +
        ", left " +
        DURATION_MS +
        "ms " +
        EASING +
        ", width " +
        DURATION_MS +
        "ms " +
        EASING +
        ", height " +
        DURATION_MS +
        "ms " +
        EASING +
        ", border-radius " +
        DURATION_MS +
        "ms " +
        EASING;
      overlay.style.top = end.top + "px";
      overlay.style.left = end.left + "px";
      overlay.style.width = end.width + "px";
      overlay.style.height = end.height + "px";
      overlay.style.borderRadius = "8px";
    }

    overlay.addEventListener("transitionend", function (e) {
      if (e.target !== overlay) return;
      finish();
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (!overlay.parentNode) return;
        animateToHero();
      });
    });

  }

  function boot() {
    initOutgoing();
    runIncoming();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
