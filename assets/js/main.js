/* =============================================================================
   G Management — behaviour
   No framework, no build step. Everything here degrades to a working page.

   1. Counters
   2. Headline cascade
   3. Reveal on view (rows, meters, chart)
   4. Header — progress, stuck state, sliding nav marker
   5. Hero background video
   6. Vertical video grid
   7. Pointer follower
   8. Booking — inline scheduler or built-in calendar
   9. Contact actions and phone bar
   ========================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canAnimate = !reduceMotion && !document.hidden;
  var hasIO = 'IntersectionObserver' in window;

  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* 1. Counters -----------------------------------------------------------
     Figures are written into the markup, so they are correct with scripting
     off. Counting is decoration on top, and a safety timer settles the
     final value if frames ever stall.                                     */

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

    function settle() { settled = true; el.textContent = final; }

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
      window.setTimeout(settle, duration + 600);
    }, delay);
  }

  if (canAnimate) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (el, i) {
      countUp(el, 1000 + i * 70, 800);
    });
  }

  if (canAnimate && hasIO) {
    var figureObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countUp(entry.target, 0, 750);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.5, rootMargin: '0px 0px -6% 0px' });

    Array.prototype.forEach.call(document.querySelectorAll('[data-count-view]'), function (el) {
      figureObserver.observe(el);
    });
  }

  /* 2. Headline cascade ---------------------------------------------------
     The headline splits into words and characters, each glyph arriving on
     its own beat behind a short scramble. Widths are locked first so the
     scramble cannot shift the line, and the sentence stays on the h1 as an
     aria-label. Nothing is split under reduced motion.                    */

  var headline = document.querySelector('[data-scramble]');

  function splitHeadline() {
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

    window.setTimeout(function () {
      chars.forEach(function (c) { c.el.textContent = c.glyph; });
    }, LAST + 600);
  }

  /* Each glyph is pinned to the width it measures at, so the scramble cannot
     shift the line. Measuring before the display font arrives pins fallback
     widths and the real letters then overlap, so wait for the font first. */
  if (headline && canAnimate) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(splitHeadline).catch(splitHeadline);
    } else {
      splitHeadline();
    }
  }

  /* 3. Reveal on view ------------------------------------------------------ */

  var revealables = document.querySelectorAll('[data-reveal], [data-meter], [data-chart]');

  function revealNow(el) {
    el.classList.add('is-in');
    if (el.hasAttribute('data-chart')) el.classList.add('is-drawn');
  }

  if (!hasIO || reduceMotion) {
    Array.prototype.forEach.call(revealables, revealNow);
  } else {
    var pending = Array.prototype.slice.call(revealables);

    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealNow(entry.target);
        obs.unobserve(entry.target);
        var at = pending.indexOf(entry.target);
        if (at > -1) pending.splice(at, 1);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

    pending.forEach(function (el) { revealObserver.observe(el); });

    /* A hard flick can carry a section past the viewport between two frames,
       and the observer never reports it. Sweep on scroll so nothing is left
       sitting at zero opacity, then stop once everything has arrived.     */
    var sweeping = false;

    function sweep() {
      sweeping = false;
      for (var i = pending.length - 1; i >= 0; i -= 1) {
        var box = pending[i].getBoundingClientRect();
        if (box.top > window.innerHeight * 0.9) continue;
        revealNow(pending[i]);
        revealObserver.unobserve(pending[i]);
        pending.splice(i, 1);
      }
      if (!pending.length) window.removeEventListener('scroll', onScroll);
    }

    function onScroll() {
      if (sweeping) return;
      sweeping = true;
      requestAnimationFrame(sweep);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* 4. Header -------------------------------------------------------------- */

  var header = document.querySelector('[data-header]');
  var progress = document.querySelector('[data-progress]');
  var nav = document.querySelector('[data-nav]');
  var marker = document.querySelector('[data-nav-marker]');
  var navLinks = document.querySelectorAll('[data-nav-link]');
  var actionBar = document.querySelector('[data-action-bar]');
  var barVisible = false;
  var ticking = false;

  function onScroll() {
    if (header) header.classList.toggle('is-stuck', window.scrollY > 24);

    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty('--p', (max > 0 ? Math.min(window.scrollY / max, 1) : 0).toFixed(4));
    }

    if (actionBar && barVisible) {
      actionBar.classList.toggle('is-in', window.scrollY > window.innerHeight * 0.7);
    }

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScroll);
  }, { passive: true });

  function moveMarker(link) {
    if (!marker || !link) return;
    marker.style.setProperty('--x', link.offsetLeft + 'px');
    marker.style.setProperty('--w', link.offsetWidth + 'px');
    marker.style.setProperty('--o', '1');
  }

  function activeLink() { return document.querySelector('[data-nav-link].is-active'); }

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

  if (navLinks.length && hasIO) {
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
        if (nav && !nav.matches(':hover')) moveMarker(match.link);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { navObserver.observe(s.el); });
  }

  window.addEventListener('resize', function () {
    var current = activeLink();
    if (current) moveMarker(current);
  });

  /* 5. Hero background video ----------------------------------------------- */

  function makeVideo(className, src) {
    var video = document.createElement('video');
    video.className = className;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.tabIndex = -1;
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('aria-hidden', 'true');
    video.src = src;
    return video;
  }

  /* Mounts the first source in a comma separated list that actually plays.
     Each source gets one try: a file that 404s or will not decode hands
     over to the next, and onFail runs once the list is spent.          */
  function mountVideo(host, list, className, onPlay, onFail) {
    var sources = String(list || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);

    if (!sources.length || reduceMotion || (navigator.connection || {}).saveData) {
      if (onFail) onFail();
      return;
    }

    (function next() {
      if (!sources.length) {
        if (onFail) onFail();
        return;
      }

      var el = makeVideo(className, sources.shift());

      el.addEventListener('loadeddata', function () {
        var playing = el.play();
        if (playing && playing.catch) playing.catch(function () {});
        if (onPlay) onPlay(el);
      });

      el.addEventListener('error', function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        if (onFail) onFail();
        next();
      }, true);

      host.insertBefore(el, host.firstChild);
    }());
  }

  var media = document.querySelector('[data-hero-media]');
  if (media) {
    mountVideo(
      media,
      media.getAttribute('data-video'),
      'hero__video',
      function () { media.classList.add('has-video'); },
      function () { media.classList.remove('has-video'); }
    );
  }

  /* 6. Vertical video grid -------------------------------------------------
     A tile previews its own clip on hover, and loads the real post from the
     platform when pressed. Tiles marked data-autoload bring the embed in as
     soon as they scroll into view, so the client's video is simply playing
     on the page.                                                          */

  var reelGrid = document.querySelector('[data-reels]');

  function loadEmbed(reel, frame) {
    if (reel.classList.contains('is-playing')) return;
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
    player.loading = 'lazy';

    /* the poster frame stays up until the player has actually loaded, so a
       slow platform never leaves a blank rectangle on the page */
    player.addEventListener('load', function () {
      frame.hidden = true;
      reel.classList.add('is-loaded');
    });

    reel.insertBefore(player, frame);
    reel.classList.add('is-playing');
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-reel]'), function (reel) {
    var frame = reel.querySelector('[data-reel-btn]');
    var source = reel.getAttribute('data-clip');
    var clip = null;

    function ensureClip() {
      if (clip || !source || reduceMotion) return;
      clip = makeVideo('reel__clip', source);
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
      if (reel.classList.contains('is-playing')) return;
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

    /* A tile with data-video carries the footage itself: the file plays in
       the frame, muted and looping, and pressing still opens the post on
       the platform. Without a file the poster frame stands as it did.  */
    if (reel.getAttribute('data-video') && hasIO) {
      var inlineObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          obs.disconnect();
          mountVideo(frame, reel.getAttribute('data-video'), 'reel__clip', function () {
            reel.classList.add('is-live');
          }, function () {
            reel.classList.remove('is-live');
          });
        });
      }, { threshold: 0.25 });
      inlineObserver.observe(reel);
    }

    frame.addEventListener('focus', activate);
    frame.addEventListener('blur', deactivate);
    frame.addEventListener('click', function () { loadEmbed(reel, frame); });

    /* Autoloading tiles wait for the page to finish loading, so the embed
       never competes with the hero's own paint, and they stay click-to-play
       on a connection the browser has flagged as metered.                 */
    if (reel.hasAttribute('data-autoload') && hasIO && !(navigator.connection || {}).saveData) {
      var autoObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          obs.disconnect();
          if (document.readyState === 'complete') loadEmbed(reel, frame);
          else window.addEventListener('load', function () { loadEmbed(reel, frame); });
        });
      }, { threshold: 0.4 });
      autoObserver.observe(reel);
    }
  });

  /* 7. Pointer follower ----------------------------------------------------- */

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

  /* 8. Booking -------------------------------------------------------------
     With a scheduler URL the real embed takes over. Without one the page
     runs its own picker: pick a weekday, pick a 15-minute slot, then either
     send the request or drop the appointment straight into your calendar. */

  var bookingSlot = document.querySelector('[data-booking]');
  var calendar = document.querySelector('[data-calendar]');
  var bookingUrl = bookingSlot ? bookingSlot.getAttribute('data-booking-url') : '';

  if (bookingSlot && bookingUrl) {
    var scheduler = document.createElement('iframe');
    scheduler.src = bookingUrl;
    scheduler.title = 'Book a call with Manny Garcia';
    scheduler.loading = 'lazy';
    scheduler.setAttribute('frameborder', '0');
    bookingSlot.appendChild(scheduler);
    if (calendar) calendar.hidden = true;
  } else if (calendar) {
    buildCalendar(calendar);
  }

  function buildCalendar(root) {
    var monthLabel = root.querySelector('[data-cal-month]');
    var grid = root.querySelector('[data-cal-grid]');
    var slotList = root.querySelector('[data-cal-slots]');
    var slotsTitle = root.querySelector('[data-cal-slots-title]');
    var summary = root.querySelector('[data-cal-summary]');
    var prev = root.querySelector('[data-cal-prev]');
    var next = root.querySelector('[data-cal-next]');
    var bookBtn = root.querySelector('[data-cal-book]');
    var icsBtn = root.querySelector('[data-cal-ics]');

    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
    var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);
    var lastMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    var picked = null;
    var pickedSlot = null;

    // 09:00 to 16:30, every half hour
    var SLOTS = [];
    for (var h = 9; h <= 16; h++) {
      SLOTS.push({ h: h, m: 0 });
      SLOTS.push({ h: h, m: 30 });
    }

    function clock(h, m) {
      var suffix = h < 12 ? 'am' : 'pm';
      var hour = h % 12 === 0 ? 12 : h % 12;
      return hour + ':' + (m < 10 ? '0' + m : m) + ' ' + suffix;
    }

    function bookable(date) {
      var day = date.getDay();
      return date >= today && day !== 0 && day !== 6;
    }

    function renderSlots() {
      slotList.innerHTML = '';
      if (!picked) {
        slotsTitle.textContent = 'Pick a day to see times';
        return;
      }
      slotsTitle.textContent = 'Times on ' + DAYS[picked.getDay()] + ', ' +
        MONTHS[picked.getMonth()] + ' ' + picked.getDate();

      SLOTS.forEach(function (slot) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'calendar__slot';
        button.textContent = clock(slot.h, slot.m);
        button.setAttribute('aria-pressed', 'false');

        button.addEventListener('click', function () {
          pickedSlot = slot;
          Array.prototype.forEach.call(slotList.children, function (el) {
            el.classList.remove('is-picked');
            el.setAttribute('aria-pressed', 'false');
          });
          button.classList.add('is-picked');
          button.setAttribute('aria-pressed', 'true');
          renderSummary();
        });

        slotList.appendChild(button);
      });
    }

    function renderSummary() {
      var ready = Boolean(picked && pickedSlot);
      bookBtn.disabled = !ready;
      icsBtn.disabled = !ready;

      summary.textContent = ready
        ? DAYS[picked.getDay()] + ', ' + MONTHS[picked.getMonth()] + ' ' + picked.getDate() +
          ' at ' + clock(pickedSlot.h, pickedSlot.m) + ' ET'
        : 'No slot selected yet.';
    }

    function render() {
      monthLabel.textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
      prev.disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
      next.disabled = view >= lastMonth;

      grid.innerHTML = '';
      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var offset = (first.getDay() + 6) % 7;  // Monday-first
      var total = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

      for (var i = 0; i < offset; i++) {
        var blank = document.createElement('span');
        blank.className = 'calendar__day is-empty';
        grid.appendChild(blank);
      }

      for (var d = 1; d <= total; d++) {
        (function (day) {
          var date = new Date(view.getFullYear(), view.getMonth(), day);
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'calendar__day';
          button.textContent = String(day);
          button.setAttribute('aria-pressed', 'false');
          button.setAttribute('aria-label',
            DAYS[date.getDay()] + ', ' + MONTHS[date.getMonth()] + ' ' + day);

          if (date.getTime() === today.getTime()) button.classList.add('is-today');

          if (!bookable(date)) {
            button.disabled = true;
          } else {
            if (picked && picked.getTime() === date.getTime()) {
              button.classList.add('is-picked');
              button.setAttribute('aria-pressed', 'true');
            }
            button.addEventListener('click', function () {
              picked = date;
              pickedSlot = null;
              render();
              renderSlots();
              renderSummary();
            });
          }

          grid.appendChild(button);
        }(d));
      }
    }

    prev.addEventListener('click', function () {
      view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
      render();
    });
    next.addEventListener('click', function () {
      view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
      render();
    });

    function stamp(date, h, m) {
      function pad(n) { return n < 10 ? '0' + n : String(n); }
      return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()) +
             'T' + pad(h) + pad(m) + '00';
    }

    bookBtn.addEventListener('click', function () {
      if (!picked || !pickedSlot) return;
      var when = DAYS[picked.getDay()] + ', ' + MONTHS[picked.getMonth()] + ' ' +
                 picked.getDate() + ' at ' + clock(pickedSlot.h, pickedSlot.m) + ' ET';

      window.location.href = 'mailto:manny@gmgmt.co'
        + '?subject=' + encodeURIComponent('Call request — ' + when)
        + '&body=' + encodeURIComponent(
            'Hi Manny,\n\nI would like the ' + when + ' slot for a 15-minute call.\n\n' +
            'Name:\nBrand or handle:\nWhat I need:\n');
    });

    icsBtn.addEventListener('click', function () {
      if (!picked || !pickedSlot) return;
      var endMinutes = pickedSlot.m + 15;
      var endHour = pickedSlot.h + (endMinutes >= 60 ? 1 : 0);
      var endMin = endMinutes % 60;

      var ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//G Management//Booking//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        'UID:' + Date.now() + '@gmgmt.co',
        'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
        'DTSTART;TZID=America/New_York:' + stamp(picked, pickedSlot.h, pickedSlot.m),
        'DTEND;TZID=America/New_York:' + stamp(picked, endHour, endMin),
        'SUMMARY:Intro call — G Management',
        'DESCRIPTION:Fifteen minutes with Manny Garcia. manny@gmgmt.co.',
        'LOCATION:Phone call',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      var link = document.createElement('a');
      link.href = url;
      link.download = 'g-management-call.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });

    render();
    renderSlots();
    renderSummary();
  }

  /* 9. Contact actions and phone bar ---------------------------------------- */

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

  if (actionBar && window.matchMedia('(max-width: 767px)').matches) {
    actionBar.hidden = false;
    barVisible = true;
    document.body.classList.add('has-action-bar');

    var bookSection = document.querySelector('#book');
    if (bookSection && hasIO) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) actionBar.classList.remove('is-in');
      }, { threshold: 0.15 }).observe(bookSection);
    }
  }

  onScroll();
}());
