/* =============================================================================
   G Management — behaviour
   No framework, no build step. Everything here degrades to a working page.

   1. Counting figures (hero sequence + on view)
   2. Reveal on view
   3. Header — progress, stuck state, sliding nav marker
   4. Hero background video
   5. Case rail — one case study at a time
   6. Pivot Point chart
   7. Houdini scrub
   8. Video players
   9. Booking widget
   10. Contact form, copy, vCard, action bar
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
    var settled = false;

    function settle() {
      settled = true;
      el.textContent = final;
    }

    function frame() {
      if (settled) return;
      if (start === null) start = performance.now();
      var t = Math.min((performance.now() - start) / duration, 1);
      if (t >= 1) { settle(); return; }
      el.textContent = prefix + formatNumber(target * (1 - Math.pow(1 - t, 4)), decimals) + suffix;
      requestAnimationFrame(frame);
    }

    window.setTimeout(function () {
      el.textContent = prefix + formatNumber(0, decimals) + suffix;
      requestAnimationFrame(frame);
      // if frames stall the figure still lands, and the loop stops writing
      window.setTimeout(settle, duration + 600);
    }, delay);
  }

  var canAnimate = !reduceMotion && !document.hidden;

  // hero board — part of the load sequence, rows land as they slide in
  if (canAnimate) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (el, i) {
      countUp(el, 900 + i * 80, 850);
    });
  }

  // everywhere else — figures count as their case study comes into view
  if (canAnimate && 'IntersectionObserver' in window) {
    var figureObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countUp(entry.target, 0, 750);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.6, rootMargin: '0px 0px -8% 0px' });

    Array.prototype.forEach.call(document.querySelectorAll('[data-count-view]'), function (el) {
      figureObserver.observe(el);
    });
  }

  /* 1b. Headline cascade ---------------------------------------------------
     The headline splits into words and characters, each glyph arriving on
     its own beat behind a short scramble. Every character's width is locked
     first so the scramble cannot shift the line. The full sentence stays on
     the h1 as an aria-label, and nothing is split under reduced motion.  */

  var headline = document.querySelector('[data-scramble]');
  if (headline && canAnimate) {
    var chars = [];
    var sentence = headline.textContent.replace(/\s+/g, ' ').trim();

    Array.prototype.forEach.call(headline.querySelectorAll('.line > span'), function (line) {
      var words = line.textContent.trim().split(' ');
      line.textContent = '';

      words.forEach(function (word, wordIndex) {
        var wrap = document.createElement('span');
        wrap.className = 'word';

        word.split('').forEach(function (glyph) {
          var span = document.createElement('span');
          span.className = 'ch';
          span.textContent = glyph;
          span.style.setProperty('--n', chars.length);
          chars.push({ el: span, glyph: glyph });
          wrap.appendChild(span);
        });

        line.appendChild(wrap);
        if (wordIndex < words.length - 1) line.appendChild(document.createTextNode(' '));
      });
    });

    headline.setAttribute('aria-label', sentence);

    var widths = chars.map(function (c) { return c.el.getBoundingClientRect().width; });
    chars.forEach(function (c, i) { c.el.style.width = widths[i].toFixed(2) + 'px'; });

    headline.classList.add('is-split');
    requestAnimationFrame(function () { headline.classList.add('is-cascading'); });

    var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var scrambleStart = performance.now();
    var LAST = 250 + chars.length * 16 + 240;

    (function scramble(now) {
      var t = (now || performance.now()) - scrambleStart;

      chars.forEach(function (c, i) {
        var from = 250 + i * 16;
        if (t < from) return;
        c.el.textContent = t < from + 240
          ? GLYPHS.charAt((Math.random() * GLYPHS.length) | 0)
          : c.glyph;
      });

      if (t < LAST) requestAnimationFrame(scramble);
      else chars.forEach(function (c) { c.el.textContent = c.glyph; });
    }());

    // if frames stall, the headline still ends up as written
    window.setTimeout(function () {
      chars.forEach(function (c) { c.el.textContent = c.glyph; });
    }, LAST + 600);
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

  /* 4. Hero background video ----------------------------------------------
     data-video takes one or more file paths. Nothing is requested under
     reduced motion or on a metered connection, and if no source plays the
     element is dropped and the light field carries the hero on its own.  */

  var media = document.querySelector('[data-hero-media]');
  if (media) {
    var files = (media.getAttribute('data-video') || '')
      .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var connection = navigator.connection || {};

    if (files.length && !reduceMotion && !connection.saveData) {
      var video = document.createElement('video');
      video.className = 'hero__video';
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.tabIndex = -1;
      video.setAttribute('playsinline', '');
      video.setAttribute('aria-hidden', 'true');

      files.forEach(function (file) {
        var source = document.createElement('source');
        source.src = file;
        source.type = /\.webm$/i.test(file) ? 'video/webm' : 'video/mp4';
        video.appendChild(source);
      });

      video.addEventListener('loadeddata', function () {
        media.classList.add('has-video');
        var playing = video.play();
        if (playing && playing.catch) playing.catch(function () {});
      });

      // a source that 404s does not bubble, so listen in the capture phase
      video.addEventListener('error', function () {
        media.classList.remove('has-video');
        if (video.parentNode) video.parentNode.removeChild(video);
      }, true);

      media.insertBefore(video, media.firstChild);
    }
  }

  /* 5. Case rail ----------------------------------------------------------
     Five case studies collapse to one panel at a time. Without JavaScript
     the rail is a set of jump links and every case stays on the page.    */

  var proof = document.querySelector('.proof');
  var rail = document.querySelector('[data-case-rail]');

  if (proof && rail) {
    var tabs = Array.prototype.slice.call(rail.querySelectorAll('[data-case-tab]'));
    var panels = tabs.map(function (tab) {
      return proof.querySelector('[data-case="' + tab.getAttribute('data-case-tab') + '"]');
    });

    if (panels.every(Boolean)) {
      proof.classList.add('is-tabbed');
      rail.setAttribute('role', 'tablist');

      var current = 0;

      var refresh = function (panel) {
        var revealed = panel.querySelectorAll('[data-reveal], .quote, .audience');
        Array.prototype.forEach.call(revealed, function (el) { el.classList.remove('is-in'); });

        var chart = panel.querySelector('[data-chart]');
        if (chart) chart.classList.remove('is-drawn');

        requestAnimationFrame(function () {
          Array.prototype.forEach.call(revealed, function (el) { el.classList.add('is-in'); });
          if (chart) chart.classList.add('is-drawn');
        });

        if (!canAnimate) return;
        Array.prototype.forEach.call(panel.querySelectorAll('[data-count-view]'), function (el, i) {
          el.dataset.counted = '';
          countUp(el, 100 + i * 45, 750);
        });
      };

      var select = function (index, moveFocus) {
        current = index;

        tabs.forEach(function (tab, i) {
          var on = i === index;
          tab.classList.toggle('is-current', on);
          tab.setAttribute('aria-selected', on ? 'true' : 'false');
          tab.tabIndex = on ? 0 : -1;
          panels[i].classList.toggle('is-current', on);
          panels[i].hidden = false;
        });

        refresh(panels[index]);
        if (moveFocus) tabs[index].focus();
      };

      tabs.forEach(function (tab, i) {
        var panel = panels[i];
        tab.setAttribute('role', 'tab');
        tab.id = 'tab-' + tab.getAttribute('data-case-tab');
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        panel.tabIndex = 0;

        tab.addEventListener('click', function (event) {
          event.preventDefault();
          select(i, false);
        });

        tab.addEventListener('keydown', function (event) {
          var next = null;
          if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
          if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = tabs.length - 1;
          if (next === null) return;
          event.preventDefault();
          select(next, true);
        });
      });

      select(0, false);
    }
  }

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

  /* 7. Houdini September / November scrub ---------------------------------
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

  /* 8. Vertical video grid -----------------------------------------------
     Each frame previews its own clip on hover or focus and pulls the rest
     of the row back. Pressing one loads the real post from the platform;
     nothing third-party is requested until then.                        */

  function makeClip(className, src) {
    var clip = document.createElement('video');
    clip.className = className;
    clip.muted = true;
    clip.defaultMuted = true;
    clip.loop = true;
    clip.autoplay = true;
    clip.playsInline = true;
    clip.preload = 'metadata';
    clip.tabIndex = -1;
    clip.setAttribute('playsinline', '');
    clip.setAttribute('muted', '');
    clip.setAttribute('loop', '');
    clip.setAttribute('autoplay', '');
    clip.setAttribute('aria-hidden', 'true');
    clip.src = src;
    return clip;
  }

  var reelGrid = document.querySelector('[data-reels]');

  Array.prototype.forEach.call(document.querySelectorAll('[data-reel]'), function (reel) {
    var frame = reel.querySelector('[data-reel-btn]');
    var source = reel.getAttribute('data-clip');
    var clip = null;

    function ensureClip() {
      if (clip || !source || reduceMotion) return;
      clip = makeClip('reel__clip', source);
      clip.addEventListener('loadeddata', function () { reel.classList.add('is-live'); });
      clip.addEventListener('error', function () {
        reel.classList.remove('is-live');
        if (clip && clip.parentNode) clip.parentNode.removeChild(clip);
        clip = null;
        source = '';
      }, true);
      frame.insertBefore(clip, frame.firstChild);
    }

    function activate() {
      reel.classList.add('is-active');
      if (reelGrid) reelGrid.classList.add('is-focused');
      ensureClip();
      if (clip) {
        var playing = clip.play();
        if (playing && playing.catch) playing.catch(function () {});
      }
    }

    function deactivate() {
      reel.classList.remove('is-active');
      if (reelGrid) reelGrid.classList.remove('is-focused');
      if (clip) clip.pause();
    }

    reel.addEventListener('mouseenter', activate);
    reel.addEventListener('mouseleave', deactivate);

    if (!frame) return;
    frame.addEventListener('focus', activate);
    frame.addEventListener('blur', deactivate);

    frame.addEventListener('click', function () {
      var embed = reel.getAttribute('data-embed');
      if (!embed) return;

      var player = document.createElement('iframe');
      player.className = 'reel__player';
      player.src = embed;
      player.title = reel.getAttribute('data-embed-title') || 'Video player';
      player.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share');
      player.setAttribute('allowfullscreen', '');
      player.setAttribute('scrolling', 'no');
      player.setAttribute('frameborder', '0');
      frame.replaceWith(player);
      player.focus();
    });
  });

  /* 8b. Showreel frame in the hero ----------------------------------------- */

  var heroFrame = document.querySelector('[data-hero-frame]');
  if (heroFrame && !reduceMotion) {
    var showreel = heroFrame.getAttribute('data-clip');
    if (showreel) {
      var reelClip = makeClip('hero__clip', showreel);
      reelClip.addEventListener('loadeddata', function () {
        heroFrame.classList.add('has-clip');
        var playing = reelClip.play();
        if (playing && playing.catch) playing.catch(function () {});
      });
      reelClip.addEventListener('error', function () {
        heroFrame.classList.remove('has-clip');
        if (reelClip.parentNode) reelClip.parentNode.removeChild(reelClip);
      }, true);
      heroFrame.appendChild(reelClip);
    }
  }

  /* 8c. Pointer follower ---------------------------------------------------
     Fine pointers only, and never under reduced motion.                   */

  var cursor = document.querySelector('[data-cursor]');
  if (cursor && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    var targetX = -100, targetY = -100, curX = -100, curY = -100, shown = false;

    window.addEventListener('pointermove', function (event) {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!shown) { shown = true; cursor.classList.add('is-on'); }
    }, { passive: true });

    document.addEventListener('pointerleave', function () {
      shown = false;
      cursor.classList.remove('is-on');
    });

    (function follow() {
      curX += (targetX - curX) * 0.18;
      curY += (targetY - curY) * 0.18;
      cursor.style.setProperty('--cx', curX.toFixed(1) + 'px');
      cursor.style.setProperty('--cy', curY.toFixed(1) + 'px');
      requestAnimationFrame(follow);
    }());

    Array.prototype.forEach.call(document.querySelectorAll('[data-cursor-view]'), function (el) {
      el.addEventListener('mouseenter', function () { cursor.classList.add('is-view'); });
      el.addEventListener('mouseleave', function () { cursor.classList.remove('is-view'); });
    });
  }

  /* 9. Booking widget -----------------------------------------------------
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

  /* 10. Contact form -------------------------------------------------------
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
        'Needs: ' + (data.get('goal') || ''),
        'Account or website: ' + (data.get('handle') || ''),
        '',
        data.get('message') || ''
      ].join('\n');

      window.location.href = 'mailto:manny@gmgmt.co'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);
    });
  }

  /* 11. Copy, save contact, phone action bar -------------------------------
     Small conveniences for an audience that arrives on a phone.          */

  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (button) {
    var label = button.textContent;

    function confirmCopy() {
      button.textContent = 'Copied';
      button.classList.add('is-done');
      window.setTimeout(function () {
        button.textContent = label;
        button.classList.remove('is-done');
      }, 1800);
    }

    function fallbackCopy(text) {
      var field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      try { document.execCommand('copy'); confirmCopy(); } catch (e) { /* nothing to do */ }
      document.body.removeChild(field);
    }

    button.addEventListener('click', function () {
      var text = button.getAttribute('data-copy');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(confirmCopy, function () { fallbackCopy(text); });
      } else {
        fallbackCopy(text);
      }
    });
  });

  var vcardButton = document.querySelector('[data-vcard]');
  if (vcardButton) {
    vcardButton.addEventListener('click', function () {
      var card = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:Garcia;Manny;;;',
        'FN:Manny Garcia',
        'ORG:G Management',
        'TITLE:Social media management and influencer marketing',
        'EMAIL;TYPE=INTERNET,WORK:manny@gmgmt.co',
        'TEL;TYPE=CELL,VOICE:+17869295735',
        'ADR;TYPE=WORK:;;;Miami;FL;;United States',
        'URL:https://gmgmt.co/',
        'END:VCARD'
      ].join('\r\n');

      var url = URL.createObjectURL(new Blob([card], { type: 'text/vcard' }));
      var link = document.createElement('a');
      link.href = url;
      link.download = 'manny-garcia.vcf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  var actionBar = document.querySelector('[data-action-bar]');
  if (actionBar && window.matchMedia('(max-width: 767px)').matches) {
    actionBar.hidden = false;
    document.body.classList.add('has-action-bar');

    var bookSection = document.querySelector('#book');
    var atBooking = false;

    if (bookSection && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        atBooking = entries[0].isIntersecting;
        actionBar.classList.toggle('is-in', !atBooking && window.scrollY > window.innerHeight * 0.6);
      }, { threshold: 0.15 }).observe(bookSection);
    }

    window.addEventListener('scroll', function () {
      actionBar.classList.toggle('is-in', !atBooking && window.scrollY > window.innerHeight * 0.6);
    }, { passive: true });
  }
}());
