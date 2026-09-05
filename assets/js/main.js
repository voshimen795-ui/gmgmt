/* =============================================================================
   G Management — behaviour
   No framework, no build step. Everything here degrades to a working page.

   1. Counters
   2. Headline cascade
   3. Reveal on view (rows, meters, chart)
   4. Header — progress, stuck state, sliding nav marker
   5. Hero background video
   6. Reels — thumbnail until pressed
   8. Booking — inline scheduler or built-in calendar
   9. Contact actions and phone bar
  10. Lead form
  11. Motes behind the before and after cards
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

  /* The old code formatted through toLocaleString, which builds a fresh
     Intl.NumberFormat every call, once per counter per frame for the length of
     the count. It was the most expensive thing on the main thread during load,
     and merely warming ICU for the first call cost more than everything else
     this file does.

     The page sets en-US figures with a fixed number of decimals — thousands
     separated by commas, nothing else — so it groups them itself. Checked
     against Intl over 12,000 values across 0, 1 and 2 decimals: identical
     every time. Anything needing real locale rules should go back to Intl. */
  function formatNumber(value, decimals) {
    var text = value.toFixed(decimals);
    var dot = text.indexOf('.');
    var whole = dot < 0 ? text : text.slice(0, dot);
    var rest = dot < 0 ? '' : text.slice(dot);
    var out = '';
    for (var i = 0; i < whole.length; i += 1) {
      if (i > 0 && (whole.length - i) % 3 === 0) out += ',';
      out += whole.charAt(i);
    }
    return out + rest;
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

    /* Only the glyphs currently mid-scramble are written. A settled one is
       marked and skipped, and the window advances from the front, so the loop
       touches the dozen or so letters actually churning rather than rewriting
       the whole headline on every frame for a second and a quarter. */
    var head = 0;

    (function scramble(now) {
      var t = (now || performance.now()) - scrambleStart;

      while (head < chars.length && t >= 250 + head * 16 + 240) {
        chars[head].el.textContent = chars[head].glyph;
        head += 1;
      }

      for (var i = head; i < chars.length; i += 1) {
        if (t < 250 + i * 16) break;
        chars[i].el.textContent = GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      }

      if (t < LAST) requestAnimationFrame(scramble);
      else chars.forEach(function (c) { c.el.textContent = c.glyph; });
    }());

    window.setTimeout(function () {
      chars.forEach(function (c) {
        c.el.textContent = c.glyph;
        c.el.style.willChange = 'auto';
      });
      headline.classList.add('is-done');
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

  /* 4b. Idle decoration ----------------------------------------------------
     The client roll is a 28s linear transform that never stops. Composited or
     not, it keeps the compositor producing frames for the whole visit, most
     of it while the row is nowhere near the screen. It is paused whenever it
     is out of view — the only thing on the page that loops forever. */

  if (hasIO) {
    var marquee = document.querySelector('[data-marquee]');
    if (marquee) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle('is-idle', !entry.isIntersecting);
        });
      }, { rootMargin: '10% 0px' }).observe(marquee);
    }
  }

  /* 5. Hero background video ----------------------------------------------- */

  function makeVideo(className, src) {
    var video = document.createElement('video');
    video.className = className;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    /* Under reduced motion the film is mounted for its picture and must not
       start, and the browser will start an element carrying `autoplay` on its
       own however carefully the script avoids calling play(). */
    video.autoplay = !reduceMotion;
    video.playsInline = true;
    /* This only ever runs after the load event, on an idle callback, so it is
       not competing with anything. `metadata` left a phone holding a described
       file it had not fetched a frame of, and the hero is only shown once the
       first frame exists — so ask for enough to have one. */
    video.preload = 'auto';
    video.tabIndex = -1;
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    if (!reduceMotion) video.setAttribute('autoplay', '');
    video.setAttribute('aria-hidden', 'true');
    video.src = src;
    return video;
  }

  /* A video element keeps its decoder running even when it is nowhere near
     the viewport, which on a phone means two or three decoders working for
     the life of the visit. Every clip mounted here is watched, and paused
     the moment it leaves.

     Silent decoration (the hero film) is resumed when it comes back. A reel
     the visitor pressed is not: it carries sound, and a clip that starts
     talking again on its own because the page scrolled past it is the kind
     of thing people close a tab over. Pass `resume` to opt in.           */
  var watchPlayback = (function () {
    if (!hasIO) return function () {};

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting) {
          if (video.dataset.resume !== 'yes' || !video.paused) return;
          var playing = video.play();
          if (playing && playing.catch) playing.catch(function () {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { rootMargin: '25% 0px' });

    return function (video, resume) {
      if (resume) video.dataset.resume = 'yes';
      observer.observe(video);
    };
  }());

  /* Mounts the first source in a comma separated list that actually plays.
     Each source gets one try: a file that 404s or will not decode hands
     over to the next, and onFail runs once the list is spent.          */
  function mountVideo(host, list, className, onPlay, onFail, startAt) {
    var sources = String(list || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);

    /* Data Saver is a choice the visitor made, so it is the one hard stop.
       Reduced motion is not a reason to show nothing: the film still mounts,
       it simply never starts, so the hero keeps its picture and holds still. */
    if (!sources.length || (navigator.connection || {}).saveData) {
      if (onFail) onFail();
      return;
    }

    var attempts = {};

    (function next() {
      if (!sources.length) {
        if (onFail) onFail();
        return;
      }

      var src = sources.shift();

      /* A start offset skips the head of the file. The media fragment gets
         the browser to paint that frame first rather than frame zero, the
         seek covers browsers that ignore the fragment, and looping is done
         by hand so it returns to the offset instead of to the start.    */
      if (startAt > 0 && src.indexOf('#') === -1) src += '#t=' + startAt;

      var el = makeVideo(className, src);

      if (startAt > 0) {
        el.loop = false;
        el.removeAttribute('loop');

        el.addEventListener('loadedmetadata', function () {
          try { if (el.currentTime < startAt) el.currentTime = startAt; } catch (e) {}
        });

        el.addEventListener('ended', function () {
          try { el.currentTime = startAt; } catch (e) {}
          var again = el.play();
          if (again && again.catch) again.catch(function () {});
        });
      }

      var done = false;

      /* A source that is simply too heavy for the device never errors — it
         just never arrives, and the section stays empty for the whole visit
         while the phone keeps pulling at it. So while there is something else
         to fall back to, a source gets a fixed window to produce its first
         frame and is dropped if it misses. The last source has nowhere to go,
         so it is left alone to take as long as it needs. */
      var giveUp = sources.length
        ? window.setTimeout(function () {
            if (done) return;
            done = true;
            if (el.parentNode) el.parentNode.removeChild(el);
            el.removeAttribute('src');
            el.load();
            next();
          }, 6000)
        : null;

      /* loadeddata is the first frame. The hero is shown from here whether or
         not playback is allowed to start, so a browser that refuses autoplay
         leaves a still frame rather than an empty section. */
      el.addEventListener('loadeddata', function () {
        if (done) return;
        done = true;
        window.clearTimeout(giveUp);
        if (onPlay) onPlay(el);
        if (reduceMotion) { el.pause(); return; }
        var playing = el.play();
        if (playing && playing.catch) playing.catch(function () {});
        watchPlayback(el, true);
      });

      el.addEventListener('error', function () {
        if (done) return;
        done = true;
        window.clearTimeout(giveUp);
        if (el.parentNode) el.parentNode.removeChild(el);
        /* One transient failure on a phone should not cost the hero its film
           for the rest of the visit, so each source gets a second attempt
           before the list moves on. The count lives outside next(), or the
           retry would reset it and loop for ever. */
        if (!attempts[src]) {
          attempts[src] = 1;
          sources.unshift(src);
          window.setTimeout(next, 1200);
          return;
        }
        if (onFail) onFail();
        next();
      }, true);

      host.insertBefore(el, host.firstChild);
    }());
  }

  var media = document.querySelector('[data-hero-media]');

  if (media) {
    var startHeroFilm = function () {
      mountVideo(
        media,
        media.getAttribute('data-video'),
        'hero__video',
        function () { media.classList.add('has-video'); },
        function () { media.classList.remove('has-video'); }
      );
    };

    /* The film runs on phones too — it is the first thing the page says, and a
       hero that only exists on a desktop is a hero half the visitors never
       see. It is fetched once the page is idle, so it never competes with the
       text and the type for the opening second.

       It used to be skipped when navigator.connection reported effectiveType
       "2g" or "3g". That reading is not the radio: it is the browser's own
       estimate from measured round-trip time and throughput, and Chrome on
       Android returns "3g" for an ordinary LTE connection often enough that
       the film simply never appeared on a real phone. A guess that wrong is
       worse than no guess, so the only thing left that stops the film is
       saveData — which is the visitor actually asking. That is checked inside
       mountVideo, along with reduced motion, which now holds the film on its
       first frame instead of dropping it. */

    var whenIdle = function () {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(startHeroFilm, { timeout: 2500 });
      } else {
        window.setTimeout(startHeroFilm, 400);
      }
    };

    if (document.readyState === 'complete') whenIdle();
    else window.addEventListener('load', whenIdle);
  }

  /* 6. Reels ---------------------------------------------------------------
     Every tile is a thumbnail until it is pressed. Nothing is decoded, no
     third party is contacted and no bytes are spent on a visitor who never
     presses play. Pressing mounts the real thing: the file in a player with
     its own controls, or the platform's embed where the video lives there. */

  Array.prototype.forEach.call(document.querySelectorAll('[data-reel]'), function (reel) {
    var frame = reel.querySelector('[data-reel-btn]');
    if (!frame) return;

    var file = reel.getAttribute('data-video');
    var embed = reel.getAttribute('data-embed');
    var startAt = parseFloat(reel.getAttribute('data-start')) || 0;
    var mounted = false;

    /* the thumbnail the tile is painted with, handed to the player so the
       picture never changes at the moment of pressing */
    function posterUrl() {
      return reel.getAttribute('data-poster') || '';
    }

    function mount() {
      if (mounted) return;
      mounted = true;
      reel.classList.add('is-playing');

      if (file) {
        var src = startAt > 0 ? file + '#t=' + startAt : file;
        var video = document.createElement('video');
        video.className = 'reel__player';
        video.poster = posterUrl();
        video.src = src;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.setAttribute('playsinline', '');

        /* Pressing play is a user gesture, so the clip is allowed its sound
           and gets it. If a browser refuses the unmuted start anyway, it is
           retried muted rather than left as a still frame — a silent clip
           beats a dead tile, and the controls are right there. */
        video.muted = false;
        video.volume = 1;

        if (startAt > 0) {
          video.addEventListener('loadedmetadata', function () {
            try { if (video.currentTime < startAt) video.currentTime = startAt; } catch (e) {}
          });
        }

        video.addEventListener('loadeddata', function () {
          reel.classList.add('is-loaded');
          watchPlayback(video);
        });

        video.addEventListener('error', function () {
          reel.classList.remove('is-playing');
          mounted = false;
          if (video.parentNode) video.parentNode.removeChild(video);
        }, true);

        reel.insertBefore(video, frame);
        var playing = video.play();
        if (playing && playing.catch) {
          playing.catch(function () {
            video.muted = true;
            var muted = video.play();
            if (muted && muted.catch) muted.catch(function () {});
          });
        }
        return;
      }

      if (!embed) return;

      var player = document.createElement('iframe');
      player.className = 'reel__player';
      player.src = embed;
      player.title = reel.getAttribute('data-embed-title') || 'Video player';
      player.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      player.setAttribute('allowfullscreen', '');
      player.setAttribute('frameborder', '0');
      player.addEventListener('load', function () {
        reel.classList.add('is-loaded');
      });
      reel.insertBefore(player, frame);
    }

    frame.addEventListener('click', mount);
  });

  /* 8. Booking -------------------------------------------------------------
     With a scheduler URL the real embed takes over. Without one the page
     runs its own picker: pick a weekday, pick a 15-minute slot, then either
     send the request or drop the appointment straight into your calendar. */

  var bookingSlot = document.querySelector('[data-booking]');
  var calendar = document.querySelector('[data-calendar]');
  var bookingUrl = bookingSlot ? bookingSlot.getAttribute('data-booking-url') : '';

  /* A scheduler URL is dressed to match the page before it is framed, so
     Cal.com, Calendly and Google appointment pages all come in dark rather
     than as a white rectangle. Those schedulers are also what puts a real
     Google Meet link on the booking, so the Meet line only shows with one. */
  function dressSchedulerUrl(url) {
    var join = url.indexOf('?') === -1 ? '?' : '&';

    if (/calendly\.com/i.test(url)) {
      return url + join + 'hide_gdpr_banner=1&background_color=070A12' +
             '&text_color=F2F1EC&primary_color=C9A227';
    }
    if (/cal\.com/i.test(url)) {
      return url + join + 'embed=true&theme=dark&layout=month_view';
    }
    if (/calendar\.google\.com/i.test(url) && url.indexOf('gv=') === -1) {
      return url + join + 'gv=true';
    }
    return url;
  }

  if (bookingSlot && bookingUrl) {
    var scheduler = document.createElement('iframe');
    scheduler.src = dressSchedulerUrl(bookingUrl);
    scheduler.title = 'Book a call with Manny Garcia';
    scheduler.loading = 'lazy';
    scheduler.setAttribute('frameborder', '0');
    scheduler.setAttribute('allow', 'camera; microphone; fullscreen; payment');
    bookingSlot.appendChild(scheduler);
    if (calendar) calendar.hidden = true;

    var meetNote = document.querySelector('[data-meet-note]');
    if (meetNote) meetNote.hidden = false;
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
    var gcalBtn = root.querySelector('[data-cal-gcal]');

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
      if (gcalBtn) gcalBtn.disabled = !ready;

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

    /* Google's own event composer. Opened from a Google account with
       conferencing on, saving the event attaches the Meet link itself. */
    if (gcalBtn) {
      gcalBtn.addEventListener('click', function () {
        if (!picked || !pickedSlot) return;
        var endMinutes = pickedSlot.m + 15;
        var endHour = pickedSlot.h + (endMinutes >= 60 ? 1 : 0);
        var endMin = endMinutes % 60;

        var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
          + '&text=' + encodeURIComponent('Intro call — G Management')
          + '&dates=' + stamp(picked, pickedSlot.h, pickedSlot.m) + '/' + stamp(picked, endHour, endMin)
          + '&ctz=America/New_York'
          + '&add=' + encodeURIComponent('manny@gmgmt.co')
          + '&details=' + encodeURIComponent('Fifteen minutes with Manny Garcia. manny@gmgmt.co')
          + '&location=' + encodeURIComponent('Google Meet');

        window.open(url, '_blank', 'noopener');
      });
    }

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
        'LOCATION:Google Meet',
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


  /* 10. Lead form ----------------------------------------------------------
     With an endpoint in data-endpoint the form posts straight to it, so the
     message lands in Manny's inbox without the visitor opening a mail app.
     Without one it composes the same message as an email, and either way
     the WhatsApp button hands the whole thing to his phone.               */

  var leadForm = document.querySelector('[data-lead]');

  if (leadForm) {
    var leadStatus = leadForm.querySelector('[data-lead-status]');
    var leadSend = leadForm.querySelector('[data-lead-send]');
    var leadWhats = leadForm.querySelector('[data-lead-whatsapp]');
    var endpoint = (leadForm.getAttribute('data-endpoint') || '').trim();

    function leadValues() {
      return {
        name: (leadForm.elements.name.value || '').trim(),
        email: (leadForm.elements.email.value || '').trim(),
        brand: (leadForm.elements.brand.value || '').trim(),
        message: (leadForm.elements.message.value || '').trim(),
        trap: (leadForm.elements.botcheck.value || '').trim()
      };
    }

    function leadText(v) {
      return 'New enquiry from gmgmt.co\n\n'
        + 'Name: ' + v.name + '\n'
        + 'Email: ' + v.email + '\n'
        + 'Brand or handle: ' + (v.brand || '—') + '\n\n'
        + v.message;
    }

    function say(text, tone) {
      if (!leadStatus) return;
      leadStatus.textContent = text;
      leadStatus.className = 'lead__status' + (tone ? ' is-' + tone : '');
    }

    function missing(v) {
      if (!v.name || !v.email || !v.message) {
        say('Name, email and a line about what you need, then it goes.', 'warn');
        return true;
      }
      return false;
    }

    leadForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var v = leadValues();
      if (v.trap) return;
      if (missing(v)) return;

      if (!endpoint) {
        say('Opening your mail app with the message ready.', 'ok');
        window.location.href = 'mailto:manny@gmgmt.co'
          + '?subject=' + encodeURIComponent('New enquiry from gmgmt.co')
          + '&body=' + encodeURIComponent(leadText(v));
        return;
      }

      leadSend.disabled = true;
      say('Sending…');

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: v.name,
          email: v.email,
          brand: v.brand,
          message: v.message,
          subject: 'New enquiry from gmgmt.co',
          from_name: 'gmgmt.co'
        })
      }).then(function (response) {
        if (!response.ok) throw new Error(String(response.status));
        leadForm.reset();
        say('Sent. Manny answers the same day, usually sooner.', 'ok');
      }).catch(function () {
        say('That did not send. Use WhatsApp, or write to manny@gmgmt.co.', 'warn');
      }).then(function () {
        leadSend.disabled = false;
      });
    });

    if (leadWhats) {
      leadWhats.addEventListener('click', function () {
        var v = leadValues();
        if (missing(v)) return;
        window.open('https://wa.me/17869295735?text=' + encodeURIComponent(leadText(v)),
                    '_blank', 'noopener');
        say('WhatsApp is open with the message ready to send.', 'ok');
      });
    }
  }


  /* 11. Motes --------------------------------------------------------------
     A drift of gold specks behind the before and after cards. It runs only
     while the section is on screen and the tab is visible, stops dead under
     reduced motion, and keeps its count down on small screens.           */

  var motes = document.querySelector('[data-motes]');

  if (motes && !reduceMotion && motes.getContext) {
    var ctx = motes.getContext('2d');
    var host = motes.parentNode;
    var specks = [];
    var frame = null;
    /* motes are soft specks, so they gain nothing from a retina buffer and
       a phone gains a lot from not clearing four times the pixels */
    var dpr = window.innerWidth < 900 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    var w = 0;
    var h = 0;

    function seed() {
      var box = host.getBoundingClientRect();
      w = Math.max(1, Math.round(box.width));
      h = Math.max(1, Math.round(box.height));

      motes.width = Math.round(w * dpr);
      motes.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.round(Math.min(46, Math.max(16, w / 34)));
      specks = [];

      for (var i = 0; i < count; i += 1) {
        specks.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.6 + Math.random() * 1.6,
          rise: 0.10 + Math.random() * 0.28,
          sway: 0.4 + Math.random() * 1.1,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.06 + Math.random() * 0.20
        });
      }
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < specks.length; i += 1) {
        var s = specks[i];
        s.y -= s.rise;
        if (s.y < -8) {
          s.y = h + 8;
          s.x = Math.random() * w;
        }

        var x = s.x + Math.sin(now / 2600 + s.phase) * s.sway * 6;

        ctx.beginPath();
        ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(201, 162, 39, ' + s.alpha.toFixed(3) + ')';
        ctx.fill();
      }

      frame = requestAnimationFrame(draw);
    }

    var seeded = false;

    function start() {
      if (frame !== null || document.hidden) return;
      /* the section is skipped until it is near the viewport, so measuring it
         at load would size the canvas from an estimate rather than the box */
      if (!seeded) { seed(); seeded = true; }
      if (!specks.length) return;
      frame = requestAnimationFrame(draw);
      motes.classList.add('is-on');
    }

    function stop() {
      if (frame === null) return;
      cancelAnimationFrame(frame);
      frame = null;
    }

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start(); else stop();
        });
      }, { rootMargin: '10% 0px' }).observe(host);
    } else {
      start();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    var resizeWait = null;
    window.addEventListener('resize', function () {
      if (!seeded) return;
      window.clearTimeout(resizeWait);
      resizeWait = window.setTimeout(seed, 200);
    }, { passive: true });
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
