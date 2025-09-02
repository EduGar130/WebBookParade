/* main.js — single clean implementation for helpers, nav and carousel */

/* ========= Helpers ========= */
const qs  = (s, c=document) => c.querySelector(s);
const qsa = (s, c=document) => Array.from(c.querySelectorAll(s));
const clamp = (v, min=0, max=1) => Math.min(max, Math.max(min, v));

function rafThrottle(fn) {
  let af = null, lastArgs = null;
  return function throttled(...args) {
    lastArgs = args;
    if (af) return;
    af = requestAnimationFrame(() => { af = null; fn.apply(this, lastArgs); });
  };
}

function elementScrollProgress(el, offset = 0) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const start = vh * offset;
  const end   = rect.height + vh * (1 - offset);
  const y = -rect.top + start;
  return clamp(y / end, 0, 1);
}

const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ========= Navbar: toggle + scrollspy ========= */
(function navInit(){
  const toggle = qs('.nav-toggle');
  const menu   = qs('#nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const links = qsa('[data-spy]');
  links.forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (!id || !id.startsWith('#')) return;
      const target = qs(id);
      if (!target) return;
      e.preventDefault();
      const headerH = qs('.site-header') ? qs('.site-header').offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - (headerH + 8);
      window.scrollTo({ top, behavior: 'smooth' });
      if (menu) menu.classList.remove('open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      history.pushState(null, '', id);
    });
  });

  const sections = qsa('main > .section');
  const byHref = Object.fromEntries(links.map(a => [a.getAttribute('href'), a]));
  if (sections.length && Object.keys(byHref).length) {
    const io = new IntersectionObserver((entries)=> {
      entries.forEach(en => {
        if (en.isIntersecting && en.target && en.target.id) {
          const id = '#' + en.target.id;
          links.forEach(a => a.removeAttribute('aria-current'));
          if (byHref[id]) byHref[id].setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });
    sections.forEach(s => io.observe(s));
  }
})();

/* ========= Carousel ========= */
(function carouselInit() {
  const carousel = qs('.carousel');
  if (!carousel) return;

  const items = qsa('.carousel-item', carousel);
  if (!items.length) return;

  const dotsContainer = qs('.carousel-dots', carousel.parentElement || document);
  const dots = dotsContainer ? qsa('.dot', dotsContainer) : [];
  const leftArrow = qs('.carrousel-arrow.left', carousel) || qs('.carousel-arrow.left', carousel);
  const rightArrow = qs('.carrousel-arrow.right', carousel) || qs('.carousel-arrow.right', carousel);

  let currentIndex = 0;
  let isTransitioning = false;
  let autoPlayInterval = null;
  const autoPlayDelay = 5000;

  function setClasses() {
    items.forEach((item, index) => {
      item.classList.remove('active', 'prev', 'next');
      if (index === currentIndex) item.classList.add('active');
      else if (index === (currentIndex - 1 + items.length) % items.length) item.classList.add('prev');
      else if (index === (currentIndex + 1) % items.length) item.classList.add('next');
    });
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
  }

  function updateCarousel() {
    if (isTransitioning) return;
    isTransitioning = true;
    setClasses();

    // Wait for transitionend on the active item or fallback after timeout
    const activeEl = items[currentIndex];
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      isTransitioning = false;
      activeEl && activeEl.removeEventListener('transitionend', onEnd);
    };

    const onEnd = (e) => {
      if (e && e.target) {
        if (!e.target.closest || e.target.closest('.carousel-item')) {
          cleanup();
        }
      } else {
        cleanup();
      }
    };

    (activeEl || carousel).addEventListener('transitionend', onEnd);
    const fallback = setTimeout(() => { cleanup(); clearTimeout(fallback); }, 700);
  }

  function nextSlide() { currentIndex = (currentIndex + 1) % items.length; updateCarousel(); resetAutoPlay(); }
  function prevSlide() { currentIndex = (currentIndex - 1 + items.length) % items.length; updateCarousel(); resetAutoPlay(); }
  function goToSlide(i) { if (i !== currentIndex && !isTransitioning) { currentIndex = i; updateCarousel(); resetAutoPlay(); } }

  function startAutoPlay() { if (prefersReduced) return; stopAutoPlay(); autoPlayInterval = setInterval(nextSlide, autoPlayDelay); }
  function stopAutoPlay() { if (autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval = null; } }
  function resetAutoPlay() { stopAutoPlay(); startAutoPlay(); }

  if (leftArrow) leftArrow.addEventListener('click', prevSlide);
  if (rightArrow) rightArrow.addEventListener('click', nextSlide);
  dots.forEach((dot, i) => dot.addEventListener('click', () => goToSlide(i)));

  let startX = 0, endX = 0;
  carousel.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; stopAutoPlay(); }, { passive: true });
  carousel.addEventListener('touchmove', (e) => { endX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', () => {
    const diffX = startX - endX; const threshold = 50;
    if (Math.abs(diffX) > threshold) { if (diffX > 0) nextSlide(); else prevSlide(); } else resetAutoPlay();
  });

  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (active && ['INPUT','TEXTAREA','SELECT'].includes(active.tagName)) return;
    if (e.key === 'ArrowLeft') prevSlide(); else if (e.key === 'ArrowRight') nextSlide();
  });

  carousel.addEventListener('mouseenter', stopAutoPlay);
  carousel.addEventListener('mouseleave', startAutoPlay);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAutoPlay(); else resetAutoPlay(); });

  // init
  updateCarousel();
  startAutoPlay();
})();
