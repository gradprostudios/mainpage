(() => {
  // ===== Theme (dark / light) =====
  const THEME_KEY = 'gps-theme';
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let themeButton = null;
  const getSavedTheme = () => { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } };
  const saveTheme = theme => { try { localStorage.setItem(THEME_KEY, theme); } catch (e) {} };
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    themeMeta?.setAttribute('content', theme === 'light' ? '#f6f4f1' : '#050505');
    if (themeButton) {
      const label = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
      themeButton.setAttribute('aria-label', label);
      themeButton.setAttribute('title', label);
      themeButton.setAttribute('aria-pressed', String(theme === 'light'));
    }
  }
  // Default is dark. To follow the device setting instead, replace 'dark' below with:
  // (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  applyTheme(getSavedTheme() === 'light' ? 'light' : 'dark');

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  const closeMenu = () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
    nav?.classList.remove('is-open');
  };
  menuButton?.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    nav?.classList.toggle('is-open', !isOpen);
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

  // Create the theme toggle button inside the nav (no HTML change needed).
  if (nav) {
    themeButton = document.createElement('button');
    themeButton.type = 'button';
    themeButton.className = 'theme-toggle';
    themeButton.innerHTML = '<svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
    nav.append(themeButton);
    themeButton.addEventListener('click', () => {
      const nextTheme = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(nextTheme);
      saveTheme(nextTheme);
    });
    applyTheme(root.getAttribute('data-theme') || 'dark');
  }
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  // Lightweight infinite carousel: cloned end cards make the loop feel seamless.
  const shell = document.querySelector('#graduation-carousel');
  const viewport = document.querySelector('#carousel-viewport');
  const track = document.querySelector('#portrait-gallery');
  const prev = document.querySelector('#gallery-prev');
  const next = document.querySelector('#gallery-next');
  const dots = [...document.querySelectorAll('.carousel-dot')];
  const count = document.querySelector('#carousel-count');
  if (viewport && track) {
    const originals = [...track.querySelectorAll('.portrait')];
    const total = originals.length;
    const cloneCard = (card, cloneIndex) => {
      const clone = card.cloneNode(true);
      clone.dataset.clone = 'true';
      clone.dataset.realIndex = card.dataset.slide;
      clone.dataset.cloneIndex = String(cloneIndex);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelector('img')?.setAttribute('loading', 'lazy');
      return clone;
    };
    // Two clones on either side allow neighboring portraits to remain visible.
    originals.slice(-2).forEach((card, i) => track.prepend(cloneCard(card, -2 + i)));
    originals.slice(0, 2).forEach((card, i) => track.append(cloneCard(card, total + i)));
    const cards = [...track.querySelectorAll('.portrait')];
    let index = 4; // Start on the third sample, matching the initial featured portrait.
    let isAnimating = false;
    let dragStartX = 0;
    let dragDelta = 0;
    let isDragging = false;
    let dragPointer = null;
    let resizeFrame = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const duration = () => reducedMotion.matches ? '0ms' : '520ms';
    const realIndex = i => ((i - 2) % total + total) % total;

    // ===== Autoplay =====
    const AUTOPLAY_MS = 3000; // time between slides (change this to speed up / slow down)
    let autoTimer = null;
    const stopAuto = () => { clearInterval(autoTimer); autoTimer = null; };
    const startAuto = () => {
      stopAuto();
      if (reducedMotion.matches || document.hidden) return;
      autoTimer = setInterval(() => { if (!isDragging) step(1); }, AUTOPLAY_MS);
    };

    function paint(animate = true) {
      const active = cards[index];
      if (!active) return;
      track.style.transition = animate ? `transform ${duration()} cubic-bezier(.22,.75,.25,1)` : 'none';
      const center = active.offsetLeft + active.offsetWidth / 2;
      track.style.transform = `translate3d(${viewport.clientWidth / 2 - center}px,0,0)`;
      cards.forEach((card, i) => {
        const distance = i - index;
        card.classList.toggle('is-active', i === index);
        card.classList.toggle('is-neighbor', Math.abs(distance) === 1);
        card.style.setProperty('--distance', Math.min(Math.abs(distance), 4));
        card.setAttribute('aria-label', `Portrait ${realIndex(i) + 1} of ${total}`);
      });
      const activeReal = realIndex(index);
      dots.forEach((dot, i) => {
        const selected = i === activeReal;
        dot.classList.toggle('is-active', selected);
        if (selected) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      if (count) count.textContent = `${String(activeReal + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    }
    function goTo(nextIndex, animate = true) {
      if (isAnimating && animate) return;
      index = nextIndex;
      isAnimating = animate;
      paint(animate);
      if (animate && !reducedMotion.matches) window.setTimeout(() => { isAnimating = false; normalize(); }, 560);
      else { isAnimating = false; normalize(); }
    }
    // Silent jump from a cloned card back to its real twin (no visible animation).
    function normalize() {
      let jumped = false;
      if (index >= total + 2) { index -= total; jumped = true; }
      else if (index < 2) { index += total; jumped = true; }
      if (!jumped) return;
      track.classList.add('no-anim');
      paint(false);
      void track.offsetWidth; // force reflow so the swap is instant
      track.classList.remove('no-anim');
    }
    function step(amount) { goTo(index + amount); }
    prev?.addEventListener('click', () => step(-1));
    next?.addEventListener('click', () => step(1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => {
      const currentReal = realIndex(index);
      let delta = i - currentReal;
      if (delta > total / 2) delta -= total;
      if (delta < -total / 2) delta += total;
      goTo(index + delta);
    }));
    track.addEventListener('transitionend', event => {
      if (event.target !== track || event.propertyName !== 'transform') return;
      normalize();
      isAnimating = false;
    });
    viewport.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
      if (event.key === 'Home') { event.preventDefault(); goTo(2); }
      if (event.key === 'End') { event.preventDefault(); goTo(total + 1); }
    });
    viewport.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      isDragging = true; dragPointer = event.pointerId; dragStartX = event.clientX; dragDelta = 0;
      viewport.classList.add('is-dragging');
      track.style.transition = 'none';
      viewport.setPointerCapture?.(event.pointerId);
    });
    viewport.addEventListener('pointermove', event => {
      if (!isDragging || event.pointerId !== dragPointer) return;
      dragDelta = event.clientX - dragStartX;
      const active = cards[index];
      const center = active.offsetLeft + active.offsetWidth / 2;
      track.style.transform = `translate3d(${viewport.clientWidth / 2 - center + dragDelta}px,0,0)`;
    });
    function finishDrag(event) {
      if (!isDragging || (event && event.pointerId !== dragPointer)) return;
      isDragging = false; viewport.classList.remove('is-dragging');
      if (Math.abs(dragDelta) > Math.min(55, viewport.clientWidth * .12)) step(dragDelta < 0 ? 1 : -1);
      else paint(true);
      dragPointer = null; dragDelta = 0;
    }
    viewport.addEventListener('pointerup', finishDrag);
    viewport.addEventListener('pointercancel', finishDrag);
    viewport.addEventListener('lostpointercapture', finishDrag);
    viewport.addEventListener('click', event => {
      const card = event.target.closest('.portrait');
      if (!card || isDragging) return;
      const cardIndex = cards.indexOf(card);
      if (cardIndex >= 0 && cardIndex !== index) goTo(cardIndex);
    });
    // Trackpad horizontal gestures remain native; vertical wheel is not hijacked.
    viewport.addEventListener('wheel', event => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 12) {
        event.preventDefault(); step(event.deltaX > 0 ? 1 : -1);
      }
    }, { passive: false });
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => paint(false));
    });
    reducedMotion.addEventListener?.('change', () => { paint(false); startAuto(); });
    paint(false);
    // Repaint after images load so the active card remains centered at all widths.
    track.querySelectorAll('img').forEach(img => img.addEventListener('load', () => paint(false), { once: true }));
    track.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
      img.closest('.portrait')?.classList.add('asset-missing');
    }, { once: true }));

    // Autoplay triggers: pause while hovering / focused / touching, resume after.
    // Also pauses when the browser tab is hidden.
    const hoverTarget = shell || viewport;
    hoverTarget.addEventListener('mouseenter', stopAuto);
    hoverTarget.addEventListener('mouseleave', startAuto);
    hoverTarget.addEventListener('focusin', stopAuto);
    hoverTarget.addEventListener('focusout', startAuto);
    hoverTarget.addEventListener('touchstart', stopAuto, { passive: true });
    hoverTarget.addEventListener('touchend', startAuto, { passive: true });
    hoverTarget.addEventListener('touchcancel', startAuto, { passive: true });
    document.addEventListener('visibilitychange', () => { document.hidden ? stopAuto() : startAuto(); });
    startAuto();
  }
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
})();