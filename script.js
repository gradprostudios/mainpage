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

  // Fanned carousel: the active photo sits in the center, two on each side overlap behind it.
  // Positions/scales live in style.css under [data-slot]; this only decides which card goes where.
  const shell = document.querySelector('#graduation-carousel');
  const viewport = document.querySelector('#carousel-viewport');
  const track = document.querySelector('#portrait-gallery');
  const prev = document.querySelector('#gallery-prev');
  const next = document.querySelector('#gallery-next');
  const dots = [...document.querySelectorAll('.carousel-dot')];
  const count = document.querySelector('#carousel-count');
  if (viewport && track) {
    const cards = [...track.querySelectorAll('.portrait')];
    const total = cards.length;
    let index = Math.min(2, total - 1); // Start on the third sample.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function paint() {
      cards.forEach((card, i) => {
        // Shortest signed distance from the center photo (wraps around = loop).
        let d = ((i - index) % total + total) % total;
        if (d > total / 2) d -= total;
        const visible = Math.abs(d) <= 2;
        card.dataset.slot = visible ? String(d) : (d > 0 ? 'out-right' : 'out-left');
        card.classList.toggle('is-active', d === 0);
        card.setAttribute('aria-label', `Portrait ${i + 1} of ${total}`);
        if (visible) card.removeAttribute('aria-hidden');
        else card.setAttribute('aria-hidden', 'true');
      });
      dots.forEach((dot, i) => {
        const selected = i === index;
        dot.classList.toggle('is-active', selected);
        if (selected) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      if (count) count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    }
    function goTo(nextIndex) {
      index = ((nextIndex % total) + total) % total;
      paint();
      scheduleAuto();
    }
    const step = amount => goTo(index + amount);

    // ===== Autoplay =====
    const AUTOPLAY_MS = 2500; // time each photo stays in the center (change this to speed up / slow down)
    let autoTimer = null;
    let paused = false;
    function stopAuto() { clearTimeout(autoTimer); autoTimer = null; }
    function scheduleAuto() {
      stopAuto();
      if (paused || reducedMotion.matches || document.hidden || total < 2) return;
      autoTimer = setTimeout(() => step(1), AUTOPLAY_MS);
    }
    const pause = () => { paused = true; stopAuto(); };
    const resume = () => { paused = false; scheduleAuto(); };

    prev?.addEventListener('click', () => step(-1));
    next?.addEventListener('click', () => step(1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
    viewport.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
      if (event.key === 'Home') { event.preventDefault(); goTo(0); }
      if (event.key === 'End') { event.preventDefault(); goTo(total - 1); }
    });

    // Swipe / mouse drag: a short horizontal flick moves one photo.
    let dragStartX = null;
    let dragged = false;
    viewport.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      dragStartX = event.clientX; dragged = false;
      viewport.classList.add('is-dragging');
    });
    window.addEventListener('pointerup', event => {
      if (dragStartX === null) return;
      const delta = event.clientX - dragStartX;
      dragStartX = null;
      viewport.classList.remove('is-dragging');
      if (Math.abs(delta) > 40) { dragged = true; step(delta < 0 ? 1 : -1); }
    });
    window.addEventListener('pointercancel', () => { dragStartX = null; viewport.classList.remove('is-dragging'); });
    // Clicking a side photo brings it to the center.
    viewport.addEventListener('click', event => {
      if (dragged) { dragged = false; return; }
      const card = event.target.closest('.portrait');
      const cardIndex = cards.indexOf(card);
      if (cardIndex >= 0 && cardIndex !== index) goTo(cardIndex);
    });
    // Horizontal trackpad swipes only; vertical wheel keeps scrolling the page.
    let wheelCooldown = false;
    viewport.addEventListener('wheel', event => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 12) return;
      event.preventDefault();
      if (wheelCooldown) return;
      step(event.deltaX > 0 ? 1 : -1);
      wheelCooldown = true;
      setTimeout(() => { wheelCooldown = false; }, 450);
    }, { passive: false });
    track.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
      img.closest('.portrait')?.classList.add('asset-missing');
    }, { once: true }));

    // Autoplay pauses while hovering / focused / touching, and when the browser tab is hidden.
    const hoverTarget = shell || viewport;
    hoverTarget.addEventListener('mouseenter', pause);
    hoverTarget.addEventListener('mouseleave', resume);
    hoverTarget.addEventListener('focusin', pause);
    hoverTarget.addEventListener('focusout', resume);
    hoverTarget.addEventListener('touchstart', pause, { passive: true });
    hoverTarget.addEventListener('touchend', resume, { passive: true });
    hoverTarget.addEventListener('touchcancel', resume, { passive: true });
    document.addEventListener('visibilitychange', () => { document.hidden ? stopAuto() : scheduleAuto(); });
    reducedMotion.addEventListener?.('change', scheduleAuto);

    paint();
    scheduleAuto();
  }

  // Open mailto links in Gmail compose (desktop only; phones keep the default mail app)
  const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
    link.addEventListener('click', event => {
      if (!desktopPointer.matches) return;
      event.preventDefault();
      const url = new URL(link.href);
      const params = new URLSearchParams({ view: 'cm', fs: '1', to: decodeURIComponent(url.pathname) });
      const subject = url.searchParams.get('subject');
      if (subject) params.set('su', subject);
      window.open(`https://mail.google.com/mail/?${params}`, '_blank', 'noopener');
    });
  });

  // ===== Floating panels (Frames / Packages) =====
  // One reusable controller for every `.gps-modal[data-modal="name"]`.
  // Open with [data-open-modal="name"], close with [data-close-modal], backdrop click or Escape.
  const modals = {};
  document.querySelectorAll('.gps-modal').forEach(m => { modals[m.dataset.modal] = m; });
  if (Object.keys(modals).length) {
    const pageParts = ['.site-header', 'main', '.site-footer'].map(s => document.querySelector(s)).filter(Boolean);
    const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
    let activeModal = null;
    let lastFocus = null;

    const lockScroll = () => {
      const bar = window.innerWidth - root.clientWidth;
      document.body.style.overflow = 'hidden';
      if (bar > 0) document.body.style.paddingRight = bar + 'px';
    };
    const unlockScroll = () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
    const setBackground = hidden => pageParts.forEach(el => {
      if (hidden) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    });

    function openModal(name, trigger) {
      const next = modals[name];
      if (!next || next === activeModal) return;
      if (activeModal) {
        // Switching panels: keep the page locked, just swap the visible panel.
        activeModal.classList.remove('is-open');
        activeModal.setAttribute('aria-hidden', 'true');
      } else {
        lastFocus = trigger || document.activeElement;
        lockScroll();
        setBackground(true);
        closeMenu();
      }
      activeModal = next;
      next.removeAttribute('aria-hidden');
      next.classList.add('is-open');
      const body = next.querySelector('.gps-modal__body');
      if (body) body.scrollTop = 0;
      next.querySelector('.gps-modal__close')?.focus({ preventScroll: true });
    }

    function closeModal() {
      if (!activeModal) return;
      activeModal.classList.remove('is-open');
      activeModal.setAttribute('aria-hidden', 'true');
      activeModal = null;
      setBackground(false);
      unlockScroll();
      if (lastFocus && lastFocus.focus) {
        lastFocus.focus({ preventScroll: true });
        // The trigger may sit inside the (closed) mobile menu; fall back to the hamburger.
        if (document.activeElement !== lastFocus) menuButton?.focus({ preventScroll: true });
      }
      lastFocus = null;
    }

    document.querySelectorAll('[data-open-modal]').forEach(el => el.addEventListener('click', event => {
      event.preventDefault(); // keep the URL and the landing page position unchanged
      openModal(el.dataset.openModal, el);
    }));
    document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));

    // Backdrop click closes; clicks (or text-selection drags) that start inside the panel do not.
    Object.values(modals).forEach(modal => {
      let downOnBackdrop = false;
      modal.addEventListener('pointerdown', event => { downOnBackdrop = event.target === modal; });
      modal.addEventListener('click', event => {
        if (downOnBackdrop && event.target === modal) closeModal();
        downOnBackdrop = false;
      });
    });

    document.addEventListener('keydown', event => {
      if (!activeModal) return;
      if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
      if (event.key !== 'Tab') return;
      // Focus trap: keep Tab cycling inside the open panel.
      const items = [...activeModal.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!activeModal.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    // Hide broken preview images instead of showing the browser's broken-image icon.
    document.querySelectorAll('.gps-modal img').forEach(img => {
      img.addEventListener('error', () => { img.style.visibility = 'hidden'; }, { once: true });
    });
  }

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
