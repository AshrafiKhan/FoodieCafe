/* ==========================================================================
   FoodieCafe - interaction and animation layer
   Order: guards -> smooth scroll -> preloader -> hero -> scroll effects
          -> menu -> gallery -> visit -> misc.
   Everything below degrades: if GSAP is missing the page still works, it
   just stops moving.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var root    = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var animate = hasGSAP && !reduced;

  /* If the libraries never arrived, drop the start-states and run the plain page. */
  clearTimeout(window.__animFallback);
  if (!animate) root.classList.remove('js-anim');

  var gsap, ScrollTrigger, Flip;
  if (animate) {
    gsap = window.gsap;
    ScrollTrigger = window.ScrollTrigger;
    Flip = window.Flip;
    if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    if (Flip) gsap.registerPlugin(Flip);
  }

  /* ---------------------------------------------------------------- 1. Lenis */
  var lenis = null;
  if (animate && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 1 });
    if (ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    }
  }

  function scrollToTarget(target) {
    if (lenis) { lenis.scrollTo(target, { offset: -70 }); return; }
    var el = typeof target === 'string' ? $(target) : target;
    if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  /* Anchor links go through Lenis so the smooth scroll stays consistent. */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id === '#' || !$(id)) return;
      e.preventDefault();
      closeDrawer();
      scrollToTarget(id);
    });
  });

  /* ------------------------------------------------------- 2. Letter splitting */
  /* Hand-rolled so the page never depends on a plugin being present. */
  function splitToChars(text, host) {
    var chars = [];
    text.split('').forEach(function (c) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c === ' ' ? ' ' : c;
      host.appendChild(s);
      chars.push(s);
    });
    return chars;
  }

  var heroChars = [];
  $$('#heroTitle .line').forEach(function (line) {
    var text = line.getAttribute('data-line') || line.textContent;
    line.textContent = '';
    heroChars = heroChars.concat(splitToChars(text, line));
  });

  /* ------------------------------------------------------------ 3. Preloader */
  function buildHeroTimeline() {
    if (!animate) return null;
    var tl = gsap.timeline();

    /* fromTo, not to: GSAP resolves the CSS translateY(105%) into a pixel `y`,
       so tweening `yPercent` alone would leave the letters parked off-screen. */
    tl.fromTo(heroChars,
      { yPercent: 105, y: 0 },
      { yPercent: 0, y: 0, duration: 1, ease: 'expo.out', stagger: { each: 0.022 } },
      0);

    tl.from('.hero__copy .eyebrow', { y: 18, opacity: 0, duration: .6, ease: 'power2.out' }, .15);
    tl.from('.hero .lead', { y: 22, opacity: 0, duration: .7, ease: 'power2.out' }, .45);
    tl.from('.hero__actions > *', { y: 24, opacity: 0, duration: .6, ease: 'back.out(1.6)', stagger: .09 }, .58);
    tl.from('.hero__proof', { y: 20, opacity: 0, duration: .6, ease: 'power2.out' }, .72);

    tl.to('.collage__item', {
      opacity: 1, duration: .01, stagger: .1
    }, .3);
    tl.from('.collage__item', {
      scale: .82, rotate: function (i) { return [-8, 10, -6, 9][i % 4]; },
      y: 40, duration: 1, ease: 'expo.out', stagger: .1
    }, .3);
    tl.to('.collage__badge', { opacity: 1, duration: .01 }, .85);
    tl.from('.collage__badge', { scale: 0, rotate: -50, duration: .7, ease: 'back.out(2.2)' }, .85);

    return tl;
  }

  function startPage() {
    var hero = buildHeroTimeline();
    if (hero) hero.play();
  }

  var pre = $('#preloader');
  var started = false;

  function finishPreloader() {
    if (started) return;
    started = true;
    if (pre) { pre.classList.add('is-done'); pre.style.display = 'none'; }
    startPage();
  }

  /* A tab opened in the background gets no requestAnimationFrame, so the
     GSAP ticker never advances and the curtain would never lift. Skip
     straight to the page in that case, and keep a hard timeout as backup. */
  if (animate && pre && !document.hidden) {
    var word = $('#preWord');
    var letters = splitToChars('FoodieCafe', word);

    setTimeout(finishPreloader, 4000);

    var ptl = gsap.timeline();
    ptl.from(letters, { yPercent: 115, duration: .6, ease: 'expo.out', stagger: .035 });
    ptl.to('#preBar', { width: '100%', duration: .7, ease: 'power2.inOut' }, .25);
    ptl.to(letters, { yPercent: -115, duration: .45, ease: 'power3.in', stagger: .02 }, '+=0.12');
    ptl.to(pre, {
      yPercent: -100, duration: .75, ease: 'expo.inOut',
      onComplete: function () { pre.classList.add('is-done'); pre.style.display = 'none'; }
    }, '-=0.15');
    ptl.add(function () { started = true; startPage(); }, '-=0.45');
  } else {
    finishPreloader();
  }

  /* --------------------------------------------------- 4. Progress + header */
  var header = $('#header');
  var progress = $('#progress');
  var toTop = $('#toTop');
  var lastY = 0;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? y / max : 0;

    if (progress) progress.style.transform = 'scaleX(' + pct + ')';
    if (header) {
      header.classList.toggle('is-stuck', y > 40);
      header.classList.toggle('is-hidden', y > 420 && y > lastY && !drawerOpen);
    }
    if (toTop) toTop.classList.toggle('is-on', y > 700);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) toTop.addEventListener('click', function () { scrollToTarget(0); });

  /* Active nav link, driven by which section owns the viewport middle. */
  if (animate && ScrollTrigger) {
    $$('main section[id]').forEach(function (sec) {
      var link = $('.nav__link[href="#' + sec.id + '"]');
      if (!link) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: function (self) { link.classList.toggle('is-active', self.isActive); }
      });
    });
  }

  /* ------------------------------------------------------------- 5. Drawer */
  var burger = $('#burger');
  var drawer = $('#drawer');
  var drawerOpen = false;
  var lastFocus = null;

  function openDrawer() {
    if (!drawer) return;
    drawerOpen = true;
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('is-locked');
    if (lenis) lenis.stop();
    var first = $('a', drawer);
    if (first) first.focus();
  }

  function closeDrawer() {
    if (!drawer || !drawerOpen) return;
    drawerOpen = false;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('is-locked');
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus();
  }

  if (burger) burger.addEventListener('click', function () { drawerOpen ? closeDrawer() : openDrawer(); });

  /* Keep tab focus inside the drawer while it is open. */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDrawer(); closeLightbox(); }
    if (e.key !== 'Tab' || !drawerOpen) return;
    var items = $$('a, button', drawer).filter(function (el) { return el.offsetParent !== null; });
    items.push(burger);
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ------------------------------------------------------------- 6. Cursor */
  var cur = $('#cursor'), dot = $('#cursorDot');
  if (animate && cur && dot && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var xTo = gsap.quickTo(cur, 'x', { duration: .45, ease: 'power3' });
    var yTo = gsap.quickTo(cur, 'y', { duration: .45, ease: 'power3' });
    var xD  = gsap.quickTo(dot, 'x', { duration: .1, ease: 'power3' });
    var yD  = gsap.quickTo(dot, 'y', { duration: .1, ease: 'power3' });

    window.addEventListener('mousemove', function (e) {
      gsap.to([cur, dot], { opacity: 1, duration: .3, overwrite: 'auto' });
      xTo(e.clientX); yTo(e.clientY); xD(e.clientX); yD(e.clientY);
    });
    document.addEventListener('mouseleave', function () { gsap.to([cur, dot], { opacity: 0, duration: .2 }); });

    $$('a, button, .shot, .dish').forEach(function (el) {
      el.addEventListener('mouseenter', function () { gsap.to(cur, { scale: 1.9, duration: .3 }); });
      el.addEventListener('mouseleave', function () { gsap.to(cur, { scale: 1, duration: .3 }); });
    });
  }

  /* --------------------------------------------------------- 7. Magnetic CTA */
  if (animate && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('[data-magnetic]').forEach(function (el) {
      var mx = gsap.quickTo(el, 'x', { duration: .5, ease: 'elastic.out(1, .4)' });
      var my = gsap.quickTo(el, 'y', { duration: .5, ease: 'elastic.out(1, .4)' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.32);
        my((e.clientY - (r.top + r.height / 2)) * 0.42);
      });
      el.addEventListener('mouseleave', function () { mx(0); my(0); });
    });
  }

  /* ------------------------------------------------- 8. Scroll-driven motion */
  if (animate && ScrollTrigger) {

    /* generic reveals */
    $$('.reveal').forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: .9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });

    $$('.reveal-stag').forEach(function (group) {
      gsap.to(group.children, {
        opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .09,
        scrollTrigger: { trigger: group, start: 'top 85%', once: true }
      });
    });

    /* underline sweep on every headline that is not the hero's */
    $$('.underline-pop').forEach(function (el) {
      if (el.closest('.hero')) return;
      gsap.to(el, {
        '--sx': 1, duration: .7, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    /* hero collage parallax */
    $$('.collage__item[data-depth]').forEach(function (el) {
      gsap.to(el, {
        yPercent: parseFloat(el.dataset.depth) * 100,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    });

    /* slow drift on blobs and stickers */
    $$('[data-float]').forEach(function (el) {
      gsap.to(el, {
        y: parseFloat(el.dataset.float),
        duration: 3 + Math.random() * 2,
        ease: 'sine.inOut', repeat: -1, yoyo: true
      });
    });

    /* Stat counters. The real figure is in the markup so a no-JS or no-GSAP
       visitor reads the number, not a zero; we reset it only to count up. */
    $$('.stat b[data-count]').forEach(function (el) {
      var target = parseFloat(el.dataset.count);
      var suffix = el.dataset.suffix || '';
      el.textContent = '0' + suffix;
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; }
      });
    });

    /* marquee: constant drift, nudged by scroll velocity and direction */
    var tracks = $$('#marquee .marquee__track');
    if (tracks.length) {
      var loop = gsap.to(tracks, {
        xPercent: -100, ease: 'none', duration: 18, repeat: -1
      });
      ScrollTrigger.create({
        onUpdate: function (self) {
          var v = gsap.utils.clamp(-6, 6, self.getVelocity() / 260);
          loop.timeScale(self.direction === -1 ? -(1 + Math.abs(v)) : 1 + Math.abs(v));
          gsap.to(loop, { timeScale: self.direction === -1 ? -1 : 1, duration: .9, overwrite: true });
        }
      });
    }

    /* section headings drift up a touch as they pass */
    $$('.section .head').forEach(function (el) {
      gsap.to(el, {
        yPercent: -8, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 60%', end: 'bottom top', scrub: true }
      });
    });

  } else {
    /* No GSAP: run the marquee on the CSS keyframe instead. */
    var mq = $('#marquee');
    if (mq && !reduced) mq.classList.add('marquee--anim');
  }

  /* ------------------------------------------------------- 9. Happy hour clock */
  var cdH = $('#cdH'), cdM = $('#cdM'), cdS = $('#cdS'), cdLabel = $('#cdLabel');
  var HH_START = 16, HH_END = 19;   /* 4 PM to 7 PM, local time */

  function nextBoundary(now) {
    var h = now.getHours();
    var t = new Date(now);
    t.setMinutes(0, 0, 0);
    if (h < HH_START)      { t.setHours(HH_START); return { at: t, live: false }; }
    if (h < HH_END)        { t.setHours(HH_END);   return { at: t, live: true }; }
    t.setDate(t.getDate() + 1);
    t.setHours(HH_START);
    return { at: t, live: false };
  }

  function tickClock() {
    if (!cdH) return;
    var now = new Date();
    var b = nextBoundary(now);
    var diff = Math.max(0, b.at - now);
    var s = Math.floor(diff / 1000);
    var hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    var pad = function (n) { return String(n).padStart(2, '0'); };

    cdH.textContent = pad(hh);
    cdM.textContent = pad(mm);
    cdS.textContent = pad(ss);

    if (cdLabel && ss % 30 === 0) {
      cdLabel.textContent = b.live
        ? 'Happy hour ends in ' + hh + ' hours ' + mm + ' minutes.'
        : 'Happy hour starts in ' + hh + ' hours ' + mm + ' minutes.';
    }
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* -------------------------------------------------------- 10. Menu filter */
  var chips = $$('.chip');
  var dishes = $$('.dish');
  var groups = $$('.menu-group');
  var empty = $('#menuEmpty');

  function applyFilter(cat) {
    var state = (animate && Flip) ? Flip.getState(dishes) : null;
    var shown = 0;

    dishes.forEach(function (d) {
      var match = cat === 'all' || d.dataset.cat === cat;
      d.classList.toggle('is-hidden', !match);
      if (match) shown++;
    });

    /* Drop a whole veg/non-veg block when the filter empties it, and keep its
       count badge honest. */
    groups.forEach(function (g) {
      var n = $$('.dish', g).filter(function (d) { return !d.classList.contains('is-hidden'); }).length;
      g.classList.toggle('is-empty', n === 0);
      var badge = $('.menu-group__count', g);
      if (badge) badge.textContent = n + (n === 1 ? ' dish' : ' dishes');
    });

    if (empty) empty.classList.toggle('is-on', shown === 0);

    if (state) {
      Flip.from(state, {
        duration: .62,
        ease: 'power2.inOut',
        scale: true,
        absolute: true,
        stagger: .015,
        onEnter: function (els) {
          return gsap.fromTo(els, { opacity: 0, scale: .82 }, { opacity: 1, scale: 1, duration: .42, stagger: .03 });
        },
        onLeave: function (els) {
          return gsap.to(els, { opacity: 0, scale: .82, duration: .28 });
        }
      });
    }
    if (animate && ScrollTrigger) ScrollTrigger.refresh();
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function (e) {
      chips.forEach(function (c) { c.setAttribute('aria-selected', String(c === chip)); });
      applyFilter(chip.dataset.filter);

      if (!animate) return;
      /* ink ripple from the click point */
      var r = chip.getBoundingClientRect();
      var ink = document.createElement('span');
      ink.className = 'chip__ripple';
      ink.style.left = (e.clientX - r.left) + 'px';
      ink.style.top = (e.clientY - r.top) + 'px';
      ink.style.width = ink.style.height = (Math.max(r.width, r.height) * 2.4) + 'px';
      chip.appendChild(ink);
      gsap.to(ink, {
        scale: 1, opacity: 0, duration: .65, ease: 'power2.out',
        onComplete: function () { ink.remove(); }
      });
    });

    /* arrow-key navigation across the tablist */
    chip.addEventListener('keydown', function (e) {
      var i = chips.indexOf(chip);
      var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
      if (n < 0 || n >= chips.length) return;
      e.preventDefault();
      chips[n].focus();
      chips[n].click();
    });
  });

  /* card tilt */
  if (animate && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.dish, .offer').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        gsap.to(card, {
          rotateY: ((e.clientX - r.left) / r.width - .5) * 9,
          rotateX: ((e.clientY - r.top) / r.height - .5) * -9,
          transformPerspective: 900, duration: .5, ease: 'power2.out'
        });
      });
      card.addEventListener('mouseleave', function () {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: .7, ease: 'elastic.out(1, .5)' });
      });
    });
  }

  /* add-to-tray feedback */
  $$('.dish__add').forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.classList.add('is-added');
      btn.textContent = '✓';
      if (animate) gsap.fromTo(btn, { scale: .6 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
      setTimeout(function () { btn.classList.remove('is-added'); btn.textContent = '+'; }, 1400);
    });
  });

  /* ------------------------------------------------- 10b. Dish detail modal */
  /* Keyed by the slug in each dish's image filename, so assets/img/dish-<slug>.jpg
     plus -2 and -3 form the photo set with no extra markup. */
  var DISH_INFO = {
    'butter-chicken': { long: 'Thigh meat marinated overnight in yoghurt and garam masala, charred in the tandoor, then finished in a tomato and cashew gravy enriched with butter and cream. Mild heat, built for mopping up with naan.', ings: ['Chicken thigh', 'Tomato', 'Cashew', 'Cream', 'Kasuri methi', 'Butter'], allergens: 'Dairy, tree nuts.', kcal: 640, mins: 25, serves: '1-2' },
    'biryani': { long: 'Aged basmati layered over chicken marinated in yoghurt, fried onion and whole spice, then sealed and cooked on dum so none of the steam escapes. Comes with raita and a wedge of lemon.', ings: ['Basmati rice', 'Chicken', 'Saffron', 'Fried onion', 'Mint', 'Yoghurt'], allergens: 'Dairy.', kcal: 720, mins: 35, serves: '1-2' },
    'samosa': { long: 'Hand-folded pastry with a coarse potato and pea filling spiked with cumin and amchur, fried to order so the shell stays blistered. Two to a plate with tamarind and mint chutney.', ings: ['Potato', 'Green peas', 'Wheat pastry', 'Cumin', 'Amchur', 'Green chilli'], allergens: 'Gluten.', kcal: 310, mins: 12, serves: '1' },
    'veg-thali': { long: 'The full plate: two seasonal curries, dal tadka, steamed rice, four rotis, papad, salad and a sweet. Dal and rice refills are unlimited, so come hungry.', ings: ['Seasonal vegetables', 'Toor dal', 'Basmati rice', 'Atta', 'Ghee', 'Pickle'], allergens: 'Gluten, dairy.', kcal: 890, mins: 20, serves: '1' },
    'hakka-noodles': { long: 'Noodles boiled, shocked in cold water, then tossed over a roaring flame with julienned cabbage, carrot and capsicum. Soy, vinegar and white pepper, nothing else hiding in there.', ings: ['Wheat noodles', 'Cabbage', 'Carrot', 'Capsicum', 'Soy sauce', 'Spring onion'], allergens: 'Gluten, soy.', kcal: 480, mins: 14, serves: '1' },
    'prawn-noodles': { long: 'Tiger prawns seared hard, then folded through egg noodles with blistered cherry tomato, garlic and bird’s eye chilli. The hottest thing on the Chinese counter, and we do mean it.', ings: ['Tiger prawns', 'Egg noodles', 'Cherry tomato', 'Bird’s eye chilli', 'Garlic', 'Coriander'], allergens: 'Shellfish, gluten, egg, soy.', kcal: 610, mins: 16, serves: '1' },
    'ramen': { long: 'Chicken bones simmered twelve hours for the broth, seasoned with a soy tare and poured over alkaline noodles. Soft-set egg, bamboo shoot, spring onion and a sheet of nori.', ings: ['Chicken broth', 'Ramen noodles', 'Soy tare', 'Egg', 'Bamboo shoot', 'Nori'], allergens: 'Gluten, egg, soy.', kcal: 560, mins: 10, serves: '1' },
    'asian-salad': { long: 'Shredded red and white cabbage, carrot and herbs in a ginger-soy dressing, finished with crushed peanut and toasted sesame. Cold, loud and completely uncooked.', ings: ['Cabbage', 'Carrot', 'Peanut', 'Sesame', 'Ginger', 'Rice vinegar'], allergens: 'Peanuts, sesame, soy.', kcal: 260, mins: 8, serves: '1' },
    'margherita': { long: 'Dough cold-proved for 48 hours, San Marzano tomato, fior di latte and basil, baked until the crust leopards. The pizza we judge every other pizza against.', ings: ['00 flour', 'San Marzano tomato', 'Fior di latte', 'Basil', 'Olive oil'], allergens: 'Gluten, dairy.', kcal: 780, mins: 12, serves: '1-2' },
    'ricotta-pizza': { long: 'No tomato on this one. Whipped ricotta and mozzarella go in the oven, then a handful of rocket, lemon zest and cracked black pepper land on it cold.', ings: ['00 flour', 'Ricotta', 'Mozzarella', 'Rocket', 'Lemon zest'], allergens: 'Gluten, dairy.', kcal: 820, mins: 12, serves: '1-2' },
    'penne': { long: 'Tomato sauce cooked down slowly with garlic and dried chilli until it clings to the pasta rather than pooling under it. Parmesan and parsley to finish.', ings: ['Penne', 'Tomato', 'Garlic', 'Dried chilli', 'Parmesan', 'Parsley'], allergens: 'Gluten, dairy.', kcal: 590, mins: 15, serves: '1' },
    'pesto-farfalle': { long: 'Basil, pine nut, garlic and parmesan blitzed fresh every morning, never out of a jar. Folded through farfalle with blistered cherry tomatoes.', ings: ['Farfalle', 'Basil', 'Pine nut', 'Parmesan', 'Garlic', 'Cherry tomato'], allergens: 'Gluten, dairy, tree nuts.', kcal: 620, mins: 13, serves: '1' },
    'cheeseburger': { long: 'Chicken patty smashed on the flat-top so it builds a proper crust, aged cheddar melted over the top, house pickles and burger sauce in a toasted potato bun.', ings: ['Chicken patty', 'Aged cheddar', 'Potato bun', 'House pickles', 'Burger sauce'], allergens: 'Gluten, dairy, egg.', kcal: 680, mins: 11, serves: '1' },
    'double-patty': { long: 'Two patties, double cheddar, caramelised onion and mustard mayo in a brioche bun. Ordered almost entirely by people who skipped lunch.', ings: ['Chicken patty x2', 'Cheddar', 'Caramelised onion', 'Mustard mayo', 'Brioche bun'], allergens: 'Gluten, dairy, egg, mustard.', kcal: 950, mins: 14, serves: '1' },
    'club-sandwich': { long: 'Triple-decker on toasted sourdough with grilled chicken, cheese, fried egg, tomato and crisp lettuce. Cut into quarters, pinned, and sent out with fries.', ings: ['Sourdough', 'Grilled chicken', 'Cheese', 'Egg', 'Lettuce', 'Tomato'], allergens: 'Gluten, dairy, egg.', kcal: 700, mins: 12, serves: '1' },
    'cheese-fries': { long: 'Skin-on fries double-fried for crunch, then buried under cheddar sauce with pickled jalapeno and spring onion. Bring a fork, the fingers approach fails fast.', ings: ['Potato', 'Cheddar sauce', 'Pickled jalapeno', 'Spring onion', 'Paprika'], allergens: 'Dairy.', kcal: 540, mins: 10, serves: '1-2' },
    'brownie': { long: 'Seventy percent chocolate, baked so the edges set while the middle stays molten. Served warm with a scoop of vanilla that starts melting into it immediately.', ings: ['Dark chocolate', 'Butter', 'Egg', 'Flour', 'Vanilla ice cream'], allergens: 'Gluten, dairy, egg.', kcal: 520, mins: 8, serves: '1' },
    'raspberry-cake': { long: 'Three sponge layers with vanilla cream and fresh raspberries between each one. Cut to order so the cream never has a chance to weep into the plate.', ings: ['Vanilla sponge', 'Fresh cream', 'Raspberries', 'Sugar', 'Egg'], allergens: 'Gluten, dairy, egg.', kcal: 430, mins: 5, serves: '1' },
    'donuts': { long: 'Yeast-raised and fried at six every morning, glazed while still warm, then finished with chocolate drizzle and rainbow sprinkles. Three to a stack.', ings: ['Flour', 'Yeast', 'Sugar glaze', 'Chocolate', 'Sprinkles'], allergens: 'Gluten, dairy, egg.', kcal: 610, mins: 5, serves: '1-2' },
    'sundae': { long: 'Vanilla bean ice cream under warm salted caramel with toasted almond and a wafer roll. The caramel gets poured at your table, not in the kitchen.', ings: ['Vanilla ice cream', 'Salted caramel', 'Toasted almond', 'Wafer'], allergens: 'Dairy, tree nuts, gluten.', kcal: 470, mins: 6, serves: '1' },
    'cold-brew': { long: 'Coarse-ground beans steeped in cold water for eighteen hours and filtered twice, poured over a single large cube. Low acid, and considerably stronger than it tastes.', ings: ['Arabica coffee', 'Filtered water', 'Ice'], allergens: 'None.', kcal: 15, mins: 3, serves: '1' },
    'oreo-shake': { long: 'Cookies blended into cold milk and vanilla ice cream until it is thick enough to stand a straw up in, topped with whipped cream and a chocolate collar.', ings: ['Milk', 'Vanilla ice cream', 'Chocolate cookies', 'Whipped cream'], allergens: 'Dairy, gluten.', kcal: 590, mins: 6, serves: '1' },
    'mojito': { long: 'Fresh strawberry and lime muddled with mint, then lengthened with soda over crushed ice. No alcohol in it at all, and no shortage of fizz.', ings: ['Strawberry', 'Lime', 'Mint', 'Soda', 'Cane sugar'], allergens: 'None.', kcal: 140, mins: 4, serves: '1' },
    'masala-chai': { long: 'Assam leaf boiled hard with milk, ginger, cardamom and clove until it turns the colour it is supposed to turn. Served with two butter biscuits on the saucer.', ings: ['Assam tea', 'Milk', 'Ginger', 'Cardamom', 'Clove', 'Sugar'], allergens: 'Dairy, gluten.', kcal: 120, mins: 5, serves: '1' }
  };

  var CUISINE_LABEL = {
    indian: 'Indian', chinese: 'Chinese', italian: 'Italian',
    burgers: 'Burgers & grills', desserts: 'Desserts', drinks: 'Drinks'
  };

  var modal = $('#dishModal');
  var dmHero = $('#dmHero');
  var dmThumbs = $('#dmThumbs');
  var modalShots = [];
  var modalShot = 0;
  var modalOpener = null;

  function slugOf(dish) {
    var src = dish.querySelector('.dish__media img').getAttribute('src');
    var m = src.match(/dish-(.+)\.jpg$/);
    return m ? m[1] : null;
  }

  function lockScroll(on) {
    document.body.classList.toggle('is-locked', on);
    if (!lenis) return;
    on ? lenis.stop() : lenis.start();
  }

  function showModalShot(i) {
    if (!modalShots.length) return;
    modalShot = (i + modalShots.length) % modalShots.length;
    dmHero.src = modalShots[modalShot].src;
    dmHero.alt = modalShots[modalShot].alt;
    $$('button', dmThumbs).forEach(function (b, n) {
      b.setAttribute('aria-selected', String(n === modalShot));
    });
    if (animate) gsap.fromTo(dmHero, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: .35, ease: 'power2.out' });
  }

  function openDishModal(dish) {
    if (!modal) return;
    var slug = slugOf(dish);
    var info = DISH_INFO[slug] || { long: '', ings: [], allergens: 'Ask at the counter.', kcal: '-', mins: '-', serves: '1' };
    var mainImg = dish.querySelector('.dish__media img');
    var name = dish.querySelector('.dish__row h4').textContent.trim();
    var isVeg = !dish.querySelector('.diet--non');

    /* Photo set: the card image plus the two extra angles on disk. Any that
       404 are dropped, so a dish with only one photo still works. */
    modalShots = [{ src: mainImg.getAttribute('src'), alt: mainImg.getAttribute('alt') }];
    [2, 3].forEach(function (n) {
      modalShots.push({ src: 'assets/img/dish-' + slug + '-' + n + '.jpg', alt: name + ', another angle' });
    });

    $('#dmCat').textContent = CUISINE_LABEL[dish.dataset.cat] || '';
    $('#dmDiet').className = 'diet' + (isVeg ? '' : ' diet--non');
    $('#dmDietText').textContent = isVeg ? 'Pure veg' : 'Non-veg';
    $('#dmTitle').textContent = name;
    $('#dmDesc').textContent = info.long || dish.querySelector('.dish__desc').textContent.trim();
    $('#dmPrice').textContent = dish.querySelector('.dish__price').textContent.trim();
    $('#dmAllergens').textContent = info.allergens;

    var spice = dish.querySelectorAll('.spice i.on').length;
    $('#dmMeta').innerHTML =
      '<li><b>' + info.kcal + '</b><span>kcal</span></li>' +
      '<li><b>' + info.mins + ' min</b><span>to cook</span></li>' +
      '<li><b>' + info.serves + '</b><span>serves</span></li>' +
      '<li><b>' + (spice ? '●'.repeat(spice) : 'None') + '</b><span>spice</span></li>';

    $('#dmIngredients').innerHTML = info.ings.map(function (i) { return '<span>' + i + '</span>'; }).join('');

    dmThumbs.innerHTML = modalShots.map(function (s, n) {
      return '<button type="button" role="tab" aria-selected="' + (n === 0) + '"' +
             ' aria-label="Photo ' + (n + 1) + ' of ' + modalShots.length + '">' +
             '<img src="' + s.src + '" alt=""></button>';
    }).join('');
    $$('button', dmThumbs).forEach(function (b, n) {
      b.addEventListener('click', function () { showModalShot(n); });
      /* hide rather than remove, so thumb index still maps to modalShots */
      $('img', b).addEventListener('error', function () { b.style.display = 'none'; });
    });

    showModalShot(0);

    modalOpener = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    /* wait for the panel to actually become visible, or focus() is a no-op */
    setTimeout(function () { $('#dmClose').focus(); }, 50);
  }

  function closeDishModal() {
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    if (modalOpener) modalOpener.focus();
  }

  /* Give every card a real focusable control rather than a click handler on a
     div, so the modal is reachable by keyboard. */
  dishes.forEach(function (dish) {
    var media = dish.querySelector('.dish__media');
    var name = dish.querySelector('.dish__row h4').textContent.trim();

    var opener = document.createElement('button');
    opener.type = 'button';
    opener.className = 'dish__open';
    opener.setAttribute('aria-label', 'View details for ' + name);
    media.appendChild(opener);

    var hint = document.createElement('span');
    hint.className = 'dish__hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = 'View details';
    media.appendChild(hint);

    opener.addEventListener('click', function () { openDishModal(dish); });

    /* clicking the card body works too, except on the quick-add button */
    dish.addEventListener('click', function (e) {
      if (e.target.closest('.dish__add') || e.target.closest('.dish__open')) return;
      openDishModal(dish);
    });
  });

  if (modal) {
    $('#dmClose').addEventListener('click', closeDishModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeDishModal(); });

    $('#dmAdd').addEventListener('click', function () {
      var btn = $('#dmAdd');
      btn.innerHTML = '<span class="btn__ico" aria-hidden="true">✓</span> Added';
      if (animate) gsap.fromTo(btn, { scale: .92 }, { scale: 1, duration: .45, ease: 'back.out(3)' });
      setTimeout(function () {
        btn.innerHTML = '<span class="btn__ico" aria-hidden="true">+</span> Add to tray';
      }, 1500);
    });

    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') { closeDishModal(); return; }
      if (e.key === 'ArrowLeft') showModalShot(modalShot - 1);
      if (e.key === 'ArrowRight') showModalShot(modalShot + 1);
      if (e.key === 'Tab') {
        var f = $$('button, [href], input, select, textarea', modal)
          .filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ----------------------------------------------------------- 11. Lightbox */
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  var shots = $$('.shot');
  var lbIndex = 0;

  function showShot(i) {
    if (!shots.length) return;
    lbIndex = (i + shots.length) % shots.length;
    var fig = shots[lbIndex];
    var img = $('img', fig);
    var cap = $('figcaption', fig);
    lbImg.src = img.getAttribute('src');
    lbImg.alt = img.getAttribute('alt') || '';
    lbCap.textContent = cap ? cap.textContent : '';
    if (animate) gsap.fromTo(lbImg, { scale: .92, opacity: 0 }, { scale: 1, opacity: 1, duration: .4, ease: 'power3.out' });
  }

  function openLightbox(i) {
    if (!lb) return;
    showShot(i);
    lb.classList.add('is-open');
    document.body.classList.add('is-locked');
    if (lenis) lenis.stop();
    $('#lbClose').focus();
  }

  function closeLightbox() {
    if (!lb || !lb.classList.contains('is-open')) return;
    lb.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    if (lenis) lenis.start();
    if (shots[lbIndex]) shots[lbIndex].focus();
  }

  shots.forEach(function (fig, i) {
    fig.addEventListener('click', function () { openLightbox(i); });
    fig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
    });
  });

  if (lb) {
    $('#lbClose').addEventListener('click', closeLightbox);
    $('#lbPrev').addEventListener('click', function () { showShot(lbIndex - 1); });
    $('#lbNext').addEventListener('click', function () { showShot(lbIndex + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft') showShot(lbIndex - 1);
      if (e.key === 'ArrowRight') showShot(lbIndex + 1);
    });
  }

  /* ------------------------------------------------------------ 12. Hours */
  var today = new Date().getDay();
  var todayRow = $('#hours li[data-day="' + today + '"]');
  if (todayRow) {
    todayRow.classList.add('is-today');
    var label = $('span', todayRow);
    if (label) label.textContent = label.textContent + ' (today)';
  }

  /* ------------------------------------------------- 13. Reservation form */
  var form = $('#bookForm');
  var done = $('#formDone');

  function setError(field, msg) {
    var wrap = field.closest('.field');
    var slot = wrap ? $('.err', wrap) : null;
    if (wrap) wrap.setAttribute('data-invalid', msg ? 'true' : 'false');
    if (slot) slot.textContent = msg || '';
    return !msg;
  }

  function validate() {
    var ok = true;
    var name = $('#bName'), phone = $('#bPhone'), date = $('#bDate'), time = $('#bTime');

    ok = setError(name, name.value.trim().length < 2 ? 'Please tell us your name.' : '') && ok;

    var digits = phone.value.replace(/\D/g, '');
    ok = setError(phone, digits.length < 10 ? 'Enter a 10-digit phone number.' : '') && ok;

    if (!date.value) {
      ok = setError(date, 'Pick a date.') && ok;
    } else {
      var picked = new Date(date.value + 'T00:00:00');
      var midnight = new Date(); midnight.setHours(0, 0, 0, 0);
      ok = setError(date, picked < midnight ? 'That date has already passed.' : '') && ok;
    }

    ok = setError(time, !time.value ? 'Pick a time.' : '') && ok;
    return ok;
  }

  if (form) {
    /* today is the earliest bookable date */
    var dEl = $('#bDate');
    var t = new Date();
    var iso = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    dEl.min = iso;
    if (!dEl.value) dEl.value = iso;

    $$('input, select, textarea', form).forEach(function (el) {
      el.addEventListener('input', function () {
        var wrap = el.closest('.field');
        if (wrap && wrap.getAttribute('data-invalid') === 'true') validate();
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) {
        var bad = $('.field[data-invalid="true"] input, .field[data-invalid="true"] select', form);
        if (bad) bad.focus();
        if (animate) gsap.fromTo(form, { x: -8 }, { x: 0, duration: .5, ease: 'elastic.out(1, .35)' });
        return;
      }

      var payload = {
        name:   $('#bName').value.trim(),
        phone:  $('#bPhone').value.trim(),
        date:   $('#bDate').value,
        time:   $('#bTime').value,
        guests: $('#bGuests').value,
        note:   $('#bNote').value.trim()
      };
      /* Front end only. Post this to your booking endpoint when you have one. */
      console.log('[FoodieCafe] reservation request', payload);

      $('#formDoneText').textContent =
        'Thanks ' + payload.name.split(' ')[0] + '! Table for ' + payload.guests +
        ' on ' + payload.date + ' at ' + payload.time + '. We will call to confirm.';
      done.classList.add('is-on');
      if (animate) gsap.fromTo(done, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: 'power3.out' });
      form.reset();
      dEl.value = iso;
    });
  }

  /* --------------------------------------------------------- 14. Newsletter */
  var news = $('#newsForm'), newsMsg = $('#newsMsg');
  if (news) {
    news.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('#newsEmail').value.trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      newsMsg.textContent = ok ? 'You are on the list. Specials land every Thursday.' : 'That email does not look right.';
      if (ok) news.reset();
      if (animate) gsap.fromTo(newsMsg, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: .4 });
    });
  }

  /* --------------------------------------------------------------- 15. Misc */
  var yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* Images finish loading after ScrollTrigger measured the page, so re-measure. */
  window.addEventListener('load', function () {
    if (animate && ScrollTrigger) ScrollTrigger.refresh();
  });

  /* Handles for debugging in the console, e.g. FoodieCafe.lenis.destroy(). */
  window.FoodieCafe = { lenis: lenis, animate: animate, reduced: reduced };

})();
