/* ============================================================
   SuperLocal — Editorial Landing Page Scripts
   No external dependencies — vanilla JS only.
   ============================================================ */

/* Gate all reveal animations on JS being active.
   Without this, elements are always visible (CSS has no opacity:0 without .js). */
document.documentElement.classList.add('js');

/* ── HERO: image scale-in on load + staggered content reveal ── */
(function initHero() {
  const hero = document.querySelector('.hero');
  const content = hero?.querySelector('.reveal-hero');
  if (!hero) return;

  // Trigger image scale
  requestAnimationFrame(() => setTimeout(() => hero.classList.add('loaded'), 80));

  // Trigger text reveal shortly after
  setTimeout(() => {
    if (content) content.classList.add('visible');
  }, 250);
})();

/* ── NAV: scrolled class for background ── */
(function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const tick = () => nav.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', tick, { passive: true });
  tick();
})();

/* ── REVEAL: IntersectionObserver for .reveal elements ──
   Elements trigger BEFORE they fully enter the viewport
   (rootMargin bottom = +120px) so the animation is already
   complete by the time the user's eyes reach the content. */
(function initReveal() {
  const items = [...document.querySelectorAll('.reveal')];
  if (!items.length) return;

  // Stagger siblings that share the same immediate parent.
  // JS sets transitionDelay inline so it overrides any CSS value.
  const groups = new Map();
  items.forEach(el => {
    const key = el.parentElement;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(el);
  });
  groups.forEach(siblings => {
    if (siblings.length > 1) {
      siblings.forEach((el, i) => {
        // Only stagger the non-first items; first one stays at delay-0
        if (i > 0) el.style.transitionDelay = `${i * 0.09}s`;
      });
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0,
    // Positive bottom margin = elements are "in view" 120px BEFORE
    // they actually enter the viewport. Animation finishes before eyes reach it.
    rootMargin: '0px 0px 120px 0px',
  });

  items.forEach(el => observer.observe(el));
})();

/* ── PHOTO STRIP: drag-to-scroll + dots + prev/next ── */
(function initStrip() {
  const track = document.getElementById('photoStrip');
  const dotsWrap = document.getElementById('stripDots');
  const prevBtn = document.getElementById('stripPrev');
  const nextBtn = document.getElementById('stripNext');
  if (!track) return;

  const cards = [...track.querySelectorAll('.strip-card')];
  const count = cards.length;

  // Build dots
  const dots = cards.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'strip-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to photo ${i + 1}`);
    dot.addEventListener('click', () => scrollTo(i));
    dotsWrap?.appendChild(dot);
    return dot;
  });

  function getGap() {
    // Read computed gap from the track
    const style = getComputedStyle(track);
    return parseInt(style.gap) || 16;
  }

  function getActiveIndex() {
    const cardW = cards[0] ? cards[0].offsetWidth + getGap() : 1;
    return Math.round(track.scrollLeft / cardW);
  }

  function scrollTo(index) {
    const clamped = Math.max(0, Math.min(index, count - 1));
    const cardW = cards[0] ? cards[0].offsetWidth + getGap() : 0;
    track.scrollTo({ left: clamped * cardW, behavior: 'smooth' });
  }

  function updateDots() {
    const active = getActiveIndex();
    dots.forEach((d, i) => d.classList.toggle('active', i === active));
  }

  track.addEventListener('scroll', updateDots, { passive: true });
  prevBtn?.addEventListener('click', () => scrollTo(getActiveIndex() - 1));
  nextBtn?.addEventListener('click', () => scrollTo(getActiveIndex() + 1));

  // Keyboard on focused buttons
  prevBtn?.addEventListener('keydown', e => e.key === 'Enter' && scrollTo(getActiveIndex() - 1));
  nextBtn?.addEventListener('keydown', e => e.key === 'Enter' && scrollTo(getActiveIndex() + 1));

  // Drag-to-scroll (desktop)
  let isDragging = false;
  let startX = 0;
  let startLeft = 0;

  track.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.pageX - track.offsetLeft;
    startLeft = track.scrollLeft;
    track.classList.add('dragging');
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const x = e.pageX - track.offsetLeft;
    track.scrollLeft = startLeft - (x - startX) * 1.3;
  });
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('dragging');
  });
})();

/* ── SMOOTH SCROLL for same-page anchor links ── */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const target = id && document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
