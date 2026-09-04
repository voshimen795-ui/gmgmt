/* =============================================================================
   G Management — behaviour
   No framework, no build step. Everything here degrades to a working page.

   1. Counting figures (hero sequence + on view)
   2. Reveal on view
   3. Header — progress, stuck state, sliding nav marker
   4. Pivot Point chart
   5. Houdini scrub
   6. Video players
   7. Booking widget
   8. Contact form
   ========================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* 1. Counting figures ---------------------------------------------------
     Every figure is already in the markup as text. Counting is decoration on
     top of it, so it is skipped entirely under reduced motion or on a hidden
     tab, and a safety timer guarantees the final value either way.         */

  function formatNumber(value, decimals) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function countUp(el, delay, duration) {
    if (el.dataset.counted === 'true') return;
    el.dataset.counted = 'true';

    var target = parseFloat(el.getAttribute('data-to'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var final = prefix + formatNumber(target, decimals) + suffix;
    var start = null;

    function frame() {
      if (start === null) start = performance.now();
      var t = Math.min((performance.now() - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 4);
      el.textContent = t < 1
        ? prefix + formatNumber(target * eased, decimals) + suffix
        : final;
      if (t < 1) requestAnimationFrame(frame);
    }

    window.setTimeout(function () {
      el.textContent = prefix + formatNumber(0, decimals) + suffix;
      requestAnimationFrame(frame);
      window.setTimeout(function () { el.textContent = final; }, duration + 600);
    }, delay);
  }

  var canAnimate = !reduceMotion && !document.hidden;

  // hero board — part of the load sequence, rows land as they slide in
  if (canAnimate) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (el, i) {
      countUp(el, 900 + i * 90, 1100);
    });
  }

  // everywhere else — figures count as their case study comes into view
  if (canAnimate && 'IntersectionObserver' in window) {
    var figureObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countUp(entry.target, 0, 1000);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.6, rootMargin: '0px 0px -8% 0px' });

    Array.prototype.forEach.call(document.querySelectorAll('[data-count-view]'), function (el) {
      figureObserver.observe(el);
    });
  }

  /* 2. Reveal on view -----------------------------------------------------
     Headings, rules, testimonial rules and audience bars only. Body copy is
     deliberately left alone — a page where every paragraph slides up reads
     as a template.                                                         */

  var revealables = document.querySelectorAll('[data-reveal], .quote, .audience');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    Array.prototype.forEach.call(revealables, function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

    Array.prototype.forEach.call(revealables, function (el) { revealObserver.observe(el); });
  }

  /* 3. Header -------------------------------------------------------------- */

  var header = document.querySelector('[data-header]');
  var progress = document.querySelector('[data-progress]');
  var nav = document.querySelector('[data-nav]');
  var marker = document.querySelector('[data-nav-marker]');
  var navLinks = document.querySelectorAll('[data-nav-link]');

  var ticking = false;

  function onScroll() {
    if (header) header.classList.toggle('is-stuck', window.scrollY > 24);

    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      progress.style.setProperty('--p', ratio.toFixed(4));
    }

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScroll);
  }, { passive: true });
  onScroll();

  // the marker follows the hovered link, and returns to the active one
  function moveMarker(link) {
    if (!marker || !nav || !link) return;
    marker.style.setProperty('--x', (link.offsetLeft) + 'px');
    marker.style.setProperty('--w', link.offsetWidth + 'px');
    marker.style.setProperty('--o', '1');
  }

  function activeLink() {
    return document.querySelector('[data-nav-link].is-active');
  }

  if (nav && marker) {
    Array.prototype.forEach.call(navLinks, function (link) {
      link.addEventListener('mouseenter', function () { moveMarker(link); });
      link.addEventListener('focus', function () { moveMarker(link); });
    });

    nav.addEventListener('mouseleave', function () {
      var current = activeLink();
      if (current) moveMarker(current);
      else marker.style.setProperty('--o', '0');
    });
  }

  if (navLinks.length && 'IntersectionObserver' in window) {
    var sections = [];
    Array.prototype.forEach.call(navLinks, function (link) {
      var target = document.querySelector(link.getAttribute('href'));
      if (target) sections.push({ link: link, el: target });
    });

    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var match = sections.filter(function (s) { return s.el === entry.target; })[0];
        if (!match || !entry.isIntersecting) return;
        sections.forEach(function (s) { s.link.classList.remove('is-active'); });
        match.link.classList.add('is-active');
        if (!nav.matches(':hover')) moveMarker(match.link);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { navObserver.observe(s.el); });
  }

  window.addEventListener('resize', function () {
    var current = activeLink();
    if (current) moveMarker(current);
  });

  /* 4. Pivot Point chart --------------------------------------------------
     The line drawing itself carries the information, so it earns its motion. */

  var chart = document.querySelector('[data-chart]');
  if (chart) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      chart.classList.add('is-drawn');
    } else {
      var chartObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-drawn');
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.35 });
      chartObserver.observe(chart);
    }
  }

  /* 5. Houdini September / November scrub ---------------------------------
     Dragging interpolates each figure between the two months. Without JS the
     markup already shows the November figures, and the table below carries
     both columns either way.                                               */

  var scrub = document.querySelector('[data-scrub]');
  if (scrub) {
    var range = scrub.querySelector('.scrub__range');
    var values = scrub.querySelectorAll('.scrub__value');
    var endBefore = scrub.querySelector('.scrub__end');
    var endAfter = scrub.querySelector('.scrub__end--after');

    var paint = function (t) {
      scrub.style.setProperty('--t', String(t));

      Array.prototype.forEach.call(values, function (el) {
        var from = parseFloat(el.getAttribute('data-from'));
        var to = parseFloat(el.getAttribute('data-to'));
        var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
        var suffix = el.getAttribute('data-suffix') || '';
        el.textContent = formatNumber(from + (to - from) * t, decimals) + suffix;
      });

      var month = t > 0.5 ? 'November 2024' : 'September 2024';
      range.setAttribute('aria-valuetext', month + ', ' + Math.round(t * 100) + ' percent to November');
      endBefore.style.color = t < 0.5 ? 'var(--paper)' : '';
      endAfter.style.color = t > 0.5 ? 'var(--gold)' : '';
    };

    range.addEventListener('input', function () {
      paint(parseFloat(range.value) / 100);
    });

    paint(parseFloat(range.value) / 100);
  }

  /* 6. Video players ------------------------------------------------------
     Facades keep two third-party embeds off the critical path; the player
     only loads when someone asks for it. The caption link is always there
     as a fallback if the platform refuses to embed.                        */

  Array.prototype.forEach.call(document.querySelectorAll('[data-player]'), function (player) {
    var button = player.querySelector('[data-player-btn]');
    if (!button) return;

    button.addEventListener('click', function () {
      var frame = document.createElement('iframe');
      frame.className = 'player__frame';
      frame.src = player.getAttribute('data-embed');
      frame.title = player.getAttribute('data-embed-title') || 'Video player';
      frame.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share');
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('scrolling', 'no');
      frame.setAttribute('frameborder', '0');
      button.replaceWith(frame);
      frame.focus();
    });
  });

  /* 7. Booking widget -----------------------------------------------------
     Set data-booking-url on the container to a Calendly (or similar) link
     and the inline widget replaces the placeholder. Left empty, the form
     below is the whole booking path.                                       */

  var booking = document.querySelector('[data-booking]');
  if (booking) {
    var bookingUrl = booking.getAttribute('data-booking-url');
    if (bookingUrl) {
      var scheduler = document.createElement('iframe');
      scheduler.src = bookingUrl;
      scheduler.title = 'Book a call with Manny Garcia';
      scheduler.width = '100%';
      scheduler.height = '640';
      scheduler.setAttribute('frameborder', '0');
      scheduler.loading = 'lazy';
      booking.appendChild(scheduler);
    }
  }

  /* 8. Contact form -------------------------------------------------------
     No backend on this site, so the form composes the email the visitor
     would have written. Native validation still gates it.                  */

  var form = document.querySelector('[data-form]');
  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;

      var data = new FormData(form);
      var subject = 'G Management inquiry — ' + (data.get('name') || 'new inquiry');
      var body = [
        'Name: ' + (data.get('name') || ''),
        'Email: ' + (data.get('email') || ''),
        'You are: ' + (data.get('who') || ''),
        'Account or website: ' + (data.get('handle') || ''),
        '',
        data.get('message') || ''
      ].join('\n');

      window.location.href = 'mailto:manny@gmgmt.co'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);
    });
  }
}());
