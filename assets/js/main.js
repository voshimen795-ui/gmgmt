/* =============================================================================
   G Management — behaviour
   No framework, no build step. Everything here degrades to a working page.
   ========================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- current year ------------------------------------------------------ */

  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* --- hero counters -----------------------------------------------------
     Part of the single page-load sequence. Reduced motion keeps the final
     values already present in the markup and never touches them.           */

  function formatNumber(value, decimals) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function runCounter(el, delay) {
    var target = parseFloat(el.getAttribute('data-to'));
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 900;
    var final = prefix + formatNumber(target, 0) + suffix;
    var start = null;

    function frame() {
      if (start === null) start = performance.now();
      var t = Math.min((performance.now() - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = t < 1
        ? prefix + formatNumber(Math.round(target * eased), 0) + suffix
        : final;
      if (t < 1) requestAnimationFrame(frame);
    }

    window.setTimeout(function () {
      el.textContent = prefix + '0' + suffix;
      requestAnimationFrame(frame);
      // If frames never run (hidden tab, throttling), the figure still lands.
      window.setTimeout(function () { el.textContent = final; }, duration + 600);
    }, delay);
  }

  // A figure that never counts is fine; a figure stuck at zero is not, so the
  // sequence only runs when the page is actually visible.
  if (!reduceMotion && !document.hidden) {
    var counters = document.querySelectorAll('[data-count]');
    Array.prototype.forEach.call(counters, function (el, i) {
      runCounter(el, 420 + i * 70);
    });
  }

  /* --- navigation state --------------------------------------------------- */

  var navLinks = document.querySelectorAll('[data-nav-link]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var sections = [];
    Array.prototype.forEach.call(navLinks, function (link) {
      var target = document.querySelector(link.getAttribute('href'));
      if (target) sections.push({ link: link, el: target });
    });

    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var match = sections.filter(function (s) { return s.el === entry.target; })[0];
        if (!match) return;
        if (entry.isIntersecting) {
          sections.forEach(function (s) { s.link.classList.remove('is-active'); });
          match.link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { navObserver.observe(s.el); });
  }

  /* --- Pivot Point chart -------------------------------------------------
     The line drawing itself carries the information, so it is the one piece
     of scroll-triggered motion on the page.                                */

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

  /* --- Houdini September / November scrub ---------------------------------
     Dragging interpolates each figure between the two months. Without JS the
     markup already shows the November figures, and the table below carries
     both columns either way.                                               */

  var scrub = document.querySelector('[data-scrub]');
  if (scrub) {
    var range = scrub.querySelector('.scrub__range');
    var values = scrub.querySelectorAll('.scrub__value');
    var endBefore = scrub.querySelector('.scrub__end');
    var endAfter = scrub.querySelector('.scrub__end--after');

    function paint(t) {
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
    }

    range.addEventListener('input', function () {
      paint(parseFloat(range.value) / 100);
    });

    paint(parseFloat(range.value) / 100);
  }

  /* --- video players -----------------------------------------------------
     Facades keep two third-party embeds off the critical path; the player
     only loads when someone asks for it. The caption link is always there
     as a fallback if the platform refuses to embed.                        */

  var players = document.querySelectorAll('[data-player]');
  Array.prototype.forEach.call(players, function (player) {
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

  /* --- booking widget ----------------------------------------------------
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

  /* --- contact form ------------------------------------------------------
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
