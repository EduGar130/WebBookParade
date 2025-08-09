/* ========= Helpers ========= */
const qs  = (s, c=document) => c.querySelector(s);
const qsa = (s, c=document) => [...c.querySelectorAll(s)];
const clamp = (v, min=0, max=1) => Math.min(max, Math.max(min, v));

/** Throttle basado en rAF: ejecuta handler ~1x por frame */
function rafThrottle(fn) {
  let af = null, lastArgs = null;
  return function throttled(...args) {
    lastArgs = args;
    if (af) return;
    af = requestAnimationFrame(() => {
      af = null;
      fn.apply(this, lastArgs);
    });
  };
}

/** Calcula progreso 0..1 del scroll relativo a un elemento (entra y sale del viewport) */
function elementScrollProgress(el, offset = 0) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  // Comienza a animar cuando el top entra en viewport; termina cuando bottom sale
  const start = vh * (0 + offset);
  const end   = rect.height + vh * (1 - offset);
  const y = -rect.top + start;
  return clamp(y / end, 0, 1);
}

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  // Smooth-scroll manual para compensar cabecera sticky en algunos navegadores
  links.forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (!id || !id.startsWith('#')) return;
      const target = qs(id);
      if (!target) return;
      e.preventDefault();
      const headerH = qs('.site-header').offsetHeight || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - (headerH + 8);
      window.scrollTo({ top, behavior: 'smooth' });
      menu?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      history.pushState(null, '', id);
    });
  });

  // Scrollspy con IntersectionObserver
  const sections = qsa('main > .section');
  const byId = Object.fromEntries(links.map(a => [a.getAttribute('href'), a]));
  const io = new IntersectionObserver((entries)=> {
    entries.forEach(en => {
      if (en.isIntersecting) {
        const id = '#' + en.target.id;
        links.forEach(a => a.removeAttribute('aria-current'));
        byId[id]?.setAttribute('aria-current', 'true');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });
  sections.forEach(s => io.observe(s));
})();

/* ========= Parallax por capas ========= */
function parallaxTick() {
  if (prefersReduced) return; // respetar accesibilidad
  qsa('.section-book[data-variant="parallax"]').forEach(section => {
    const hero = qs('[data-hero]', section);
    if (!hero) return;
    const p = elementScrollProgress(section, 0); // progreso 0..1 de toda la sección
    // Velocidades configurables por data-attrs
    const bgS  = parseFloat(section.dataset.speedBg  || '0.2');
    const midS = parseFloat(section.dataset.speedMid || '0.5');
    const fgS  = parseFloat(section.dataset.speedFg  || '0.9');

    const layers = {
      bg:  qs('.layer-bg img', hero),
      mid: qs('.layer-mid img', hero),
      fg:  qs('.layer-fg img', hero),
    };
    // Parallax: movemos en Y, leve en X para "vida"
    if (layers.bg)  layers.bg.style.transform  = `translate3d(0, ${(-20 + p*40)*bgS}px, 0)`;
    if (layers.mid) layers.mid.style.transform = `translate3d(0, ${(-30 + p*60)*midS}px, 0)`;
    if (layers.fg)  layers.fg.style.transform  = `translate3d(0, ${(-40 + p*80)*fgS}px, 0)`;
  });
}

/* ========= Vídeo scrub ========= */
function videoScrubTick() {
  if (prefersReduced) return;
  qsa('.section-book[data-variant="video"]').forEach(section => {
    const video = qs('.scrub-video', section);
    if (!video) return;
    // Asegurar que el vídeo está pausado; usamos currentTime manual
    if (!video.dataset.bound) {
      video.dataset.bound = '1';
      video.pause();
      // iOS: cargar metadata para conocer duración
      video.addEventListener('loadedmetadata', ()=>{ /* no-op */ }, { once: true });
    }
    const p = elementScrollProgress(section, 0);
    if (isFinite(video.duration) && video.duration > 0) {
      const t = p * (video.duration - 0.05);
        video.currentTime = t;
    }
  });
}

/* ========= Loop de scroll rAF ========= */
const onScroll = rafThrottle(() => {
  parallaxTick();
  videoScrubTick();
});
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', rafThrottle(()=> { parallaxTick(); videoScrubTick(); }));

/* ========= Carrusel ========= */
(function carouselInit() {
  const carousel = qs('.carousel');
  const items = qsa('.carousel-item');
  const dots = qsa('.carousel-dots .dot');
  const leftArrow = qs('.carrousel-arrow.left');
  const rightArrow = qs('.carrousel-arrow.right');
  
  if (!carousel || items.length === 0) return;
  
  let currentIndex = 0;
  let isTransitioning = false;
  
  // Auto-play interval (opcional)
  let autoPlayInterval = null;
  const autoPlayDelay = 5000; // 5 segundos
  
  function updateCarousel() {
    if (isTransitioning) return;
    isTransitioning = true;
    
    items.forEach((item, index) => {
      item.classList.remove('active', 'prev', 'next');
      
      if (index === currentIndex) {
        item.classList.add('active');
      } else if (index === currentIndex - 1 || (currentIndex === 0 && index === items.length - 1)) {
        item.classList.add('prev');
      } else if (index === currentIndex + 1 || (currentIndex === items.length - 1 && index === 0)) {
        item.classList.add('next');
      }
    });
    
    // Actualizar dots
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentIndex);
    });
    
    // Permitir nueva transición después de la animación
    setTimeout(() => {
      isTransitioning = false;
    }, 600);
  }
  
  function nextSlide() {
    currentIndex = (currentIndex + 1) % items.length;
    updateCarousel();
    resetAutoPlay();
  }
  
  function prevSlide() {
    currentIndex = (currentIndex - 1 + items.length) % items.length;
    updateCarousel();
    resetAutoPlay();
  }
  
  function goToSlide(index) {
    if (index !== currentIndex && !isTransitioning) {
      currentIndex = index;
      updateCarousel();
      resetAutoPlay();
    }
  }
  
  function startAutoPlay() {
    if (prefersReduced) return; // Respetar preferencias de movimiento
    autoPlayInterval = setInterval(nextSlide, autoPlayDelay);
  }
  
  function stopAutoPlay() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
    }
  }
  
  function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
  }
  
  // Event listeners para flechas
  leftArrow?.addEventListener('click', prevSlide);
  rightArrow?.addEventListener('click', nextSlide);
  
  // Event listeners para dots
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => goToSlide(index));
  });
  
  // Touch/swipe support
  let startX = 0;
  let endX = 0;
  
  carousel.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    stopAutoPlay();
  }, { passive: true });
  
  carousel.addEventListener('touchmove', (e) => {
    endX = e.touches[0].clientX;
  }, { passive: true });
  
  carousel.addEventListener('touchend', () => {
    const diffX = startX - endX;
    const threshold = 50; // mínimo movimiento para activar swipe
    
    if (Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        nextSlide(); // Swipe left -> next
      } else {
        prevSlide(); // Swipe right -> prev
      }
    } else {
      resetAutoPlay();
    }
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  });
  
  // Pause auto-play when hovering
  carousel.addEventListener('mouseenter', stopAutoPlay);
  carousel.addEventListener('mouseleave', startAutoPlay);
  
  // Pause auto-play when tab is not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoPlay();
    } else {
      resetAutoPlay();
    }
  });
  
  // Initialize
  updateCarousel();
  startAutoPlay();
})();

/* ========= Ping-pong loop para videos ========= */
function setupPingPongVideos() {
  // Selecciona todos los videos que deben hacer ping-pong
  const videos = qsa('video[autoplay][loop]');
  console.log(`Configurando ${videos.length} videos para ping-pong...`);
  console.log(videos);
  
  videos.forEach(video => {
    let isReversing = false;
    
    // Asegurar que el video esté cargado antes de configurar el ping-pong
    video.addEventListener('loadedmetadata', () => {
      video.removeAttribute('loop'); // Removemos el loop nativo para controlarlo manualmente
      
      video.addEventListener('timeupdate', () => {
        console.log(`Current time: ${video.currentTime}, Duration: ${video.duration}`);
        if (video.currentTime >= video.duration - 0.1 && !isReversing) {
          console.log('Reversing video...');
          // Llegó al final, iniciar reversa
          isReversing = true;
          reverseVideo(video);
        } else if (video.currentTime <= 0.1 && isReversing) {
          console.log('Forwarding video...');
          // Llegó al inicio en reversa, iniciar forward
          isReversing = false;
          forwardVideo(video);
        }
      });
    });
    
    // Si el video ya está cargado, ejecutar inmediatamente
    if (video.readyState >= 1) {
      console.log('Video already loaded, setting up immediately...');
      video.addEventListener('timeupdate', () => {
        console.log(`Current time: ${video.currentTime}, Duration: ${video.duration}`);
        if (video.currentTime >= video.duration - 0.1 && !isReversing) {
          console.log('Reversing video...');
          // Llegó al final, iniciar reversa
          isReversing = true;
          reverseVideo(video);
        } else if (video.currentTime <= 0.1 && isReversing) {
          console.log('Forwarding video...');
          // Llegó al inicio en reversa, iniciar forward
          isReversing = false;
          forwardVideo(video);
        }
      });
      video.removeAttribute('loop');
    }
  });
  
  function reverseVideo(video) {
    const fps = 12; // frames por segundo aproximados
    const frameInterval = 1000 / fps;
    const step = 1 / fps; // segundos por frame
    
    const reverseInterval = setInterval(() => {
      if (video.currentTime > 0) {
        video.currentTime = Math.max(0, video.currentTime - step);
      } else {
        clearInterval(reverseInterval);
      }
    }, frameInterval);
    
    // Almacenar el interval para poder limpiarlo si es necesario
    video.reverseInterval = reverseInterval;
  }
  
  function forwardVideo(video) {
    // Limpiar cualquier interval de reversa anterior
    if (video.reverseInterval) {
      clearInterval(video.reverseInterval);
      delete video.reverseInterval;
    }
    
    // Reproducir normalmente hacia adelante
    video.play();
  }
}

/* ========= Inicialización / estado ========= */
(function init(){
  // Año footer
  const y = qs('#year'); if (y) y.textContent = new Date().getFullYear();

  // Switch rápido por query ?variant=video|parallax (debug)
  const params = new URLSearchParams(location.search);
  const forceVariant = params.get('variant'); // "video" / "parallax"
  if (forceVariant) {
    qsa('.section-book').forEach(sec => sec.setAttribute('data-variant', forceVariant));
  }

  // Si JS desactivado → <noscript>. Aquí: marcar will-change para capas
  if (!prefersReduced) {
    qsa('.layer img').forEach(el => el.style.willChange = 'transform');
  }

  // Configurar ping-pong para videos
  setupPingPongVideos();

  // Primer paint
  parallaxTick(); videoScrubTick();
})();