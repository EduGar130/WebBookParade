/* main.js — Eduardo Montalbán Poeta */

'use strict';

const qs  = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => Array.from(c.querySelectorAll(s));
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   NAV — hamburger toggle + scroll spy
   ============================================================ */
(function navInit() {
  const toggle = qs('#nav-toggle');
  const menu   = qs('#nav-menu');
  const header = qs('.site-header');
  if (!toggle || !menu) return;

  // Toggle mobile menu
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close on link click
  qsa('.nav-link', menu).forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      toggle.focus();
    }
  });

  // Scroll spy — highlight active nav link
  const sections = qsa('main > .section[id]');
  const links    = qsa('.nav-link[href^="#"]');

  if (sections.length && links.length) {
    const headerH = header ? header.offsetHeight : 64;
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = '#' + entry.target.id;
        links.forEach(a => {
          const active = a.getAttribute('href') === id;
          a.setAttribute('aria-current', active ? 'true' : 'false');
          a.toggleAttribute('aria-current', active);
          if (active) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: `-${headerH}px 0px -55% 0px`, threshold: 0 });

    sections.forEach(s => io.observe(s));
  }
})();

/* ============================================================
   REVEAL — fade-in sections on scroll
   ============================================================ */
(function revealInit() {
  if (prefersReduced) return;

  // Add data-reveal to major blocks automatically
  const targets = qsa(
    '.about-inner, .books-grid .book-card, .book-section-media, .book-section-content, .hero-content, .hero-books'
  );
  targets.forEach((el, i) => {
    el.setAttribute('data-reveal', '');
    // Stagger book cards
    if (el.classList.contains('book-card')) {
      el.setAttribute('data-reveal-delay', String(i % 3 + 1));
    }
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  qsa('[data-reveal]').forEach(el => io.observe(el));
})();

/* ============================================================
   HERO BOOKS — subtle parallax on mouse move (desktop only)
   ============================================================ */
(function heroParallax() {
  if (prefersReduced) return;
  if (window.innerWidth < 900) return;

  const books = qsa('.hero-book');
  if (!books.length) return;

  const depths = [0.015, 0.025, 0.015];
  document.addEventListener('mousemove', e => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    books.forEach((book, i) => {
      const d = depths[i];
      const tx = dx * d;
      const ty = dy * d;
      const base = i === 0 ? 'rotate(-4deg) translateY(8px)' :
                   i === 1 ? 'rotate(0deg) translateY(-4px)' :
                              'rotate(4deg) translateY(8px)';
      book.style.transform = `${base} translate(${tx}px, ${ty}px)`;
    });
  });
})();
