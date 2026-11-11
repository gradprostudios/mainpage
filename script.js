(() => {
  // ===== Theme (dark / light) =====
  const THEME_KEY = 'gps-theme';
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let themeButton = null;
  const getSavedTheme = () => { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } };
  const saveTheme = theme => { try { localStorage.setItem(THEME_KEY, theme); } catch (e) {} };
  const clearTheme = () => { try { localStorage.removeItem(THEME_KEY); } catch (e) {} };
  // The device's light/dark setting is the default; a toggle click only overrides it when it differs.
  const deviceLight = window.matchMedia('(prefers-color-scheme: light)');
  const deviceTheme = () => deviceLight.matches ? 'light' : 'dark';
  const savedOrDevice = () => { const saved = getSavedTheme(); return saved === 'light' || saved === 'dark' ? saved : deviceTheme(); };
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
  applyTheme(savedOrDevice());
  // Follow the device live (e.g. phone switching to dark at night) unless the visitor picked a theme.
  deviceLight.addEventListener?.('change', () => { if (!getSavedTheme()) applyTheme(deviceTheme()); });

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
      // Picking the same theme as the device goes back to following the device.
      if (nextTheme === deviceTheme()) clearTheme(); else saveTheme(nextTheme);
    });
    applyTheme(root.getAttribute('data-theme') || savedOrDevice());
  }
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  // Fanned carousel: the active photo sits in the center, two on each side overlap behind it.
  // Positions/scales live in style.css under [data-slot]; this only decides which card goes where.
  const shell = document.querySelector('#graduation-carousel');
  const viewport = document.querySelector('#carousel-viewport');
  const track = document.querySelector('#portrait-gallery');
  const prev = document.querySelector('#gallery-prev');
  const next = document.querySelector('#gallery-next');
  const pagination = document.querySelector('#carousel-pagination');
  const count = document.querySelector('#carousel-count');
  if (viewport && track) {
    const cards = [...track.querySelectorAll('.portrait')];
    const total = cards.length;
    // One dot per photo, so adding/removing photos in index.html needs no other change.
    pagination?.replaceChildren(...cards.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Go to portrait ${i + 1}`);
      return dot;
    }));
    const dots = [...document.querySelectorAll('.carousel-dot')];
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

  // ===== Frame styles: frames hanging on a wall =====
  // Tap a frame (or a chip under the room) to zoom in on it; arrows / swipe move along the wall.
  // Names, sizes and prices come from data-* on each .fw-frame in index.html.
  const fwStage = document.querySelector('#fw-stage');
  const fwRoom = document.querySelector('#fw-room');
  const fwLayer = document.querySelector('#fw-layer');
  const fwFrames = [...document.querySelectorAll('.fw-frame')];
  if (fwStage && fwRoom && fwFrames.length) {
    const byId = id => document.getElementById(id);
    const pad2 = n => String(n).padStart(2, '0');
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    let current = -1;   // -1 = whole wall
    let panX = null;    // sideways slide when the room is wider than the box
    let startX = null, startPan = 0, moved = false;

    const chips = fwFrames.map((frame, i) => {
      const chip = document.createElement('button');
      chip.type = 'button'; chip.className = 'fw-chip';
      const img = document.createElement('img');
      img.src = frame.querySelector('img').getAttribute('src'); img.alt = ''; img.loading = 'lazy';
      chip.append(img, frame.dataset.name);
      chip.addEventListener('click', () => zoomTo(i));
      byId('fw-chips')?.append(chip);
      return chip;
    });

    // Room-sized things: shadow/glow scale (em) and the wall light lined up on each frame.
    function sizeRoomParts() {
      const W = fwRoom.clientWidth, H = fwRoom.clientHeight;
      fwRoom.style.fontSize = (W * 0.012) + 'px';
      fwFrames.forEach(f => {
        const art = f.querySelector('.fw-art');
        art.style.setProperty('--bgw', W + 'px'); art.style.setProperty('--bgh', H + 'px');
        art.style.setProperty('--bgx', -f.offsetLeft + 'px'); art.style.setProperty('--bgy', -f.offsetTop + 'px');
      });
    }
    function layout() {
      unbake();
      sizeRoomParts();
      if (panX === null) panX = (fwStage.clientWidth - fwRoom.clientWidth) / 2;
      camera();
    }

    // Sharp zoom: the zoom animates with a CSS scale (smooth, but the browser stretches what it already drew,
    // so photos look blurry). When the zoom finishes, the room is re-laid out at its real zoomed size
    // ("baked") so the frame photos are drawn sharp. Before the next move it is put back the way it was.
    let cam = { k: 1, tx: 0, ty: 0 }, baked = false, bakeTimer = null;
    const noAnim = fn => { fwRoom.classList.add('fw-no-anim'); fn(); void fwRoom.offsetWidth; fwRoom.classList.remove('fw-no-anim'); };
    function bake() {
      if (baked || current < 0 || cam.k === 1) return;
      noAnim(() => {
        fwRoom.style.height = (fwStage.clientHeight * cam.k) + 'px';
        sizeRoomParts();
        fwRoom.style.transform = `translate(${cam.tx}px, ${cam.ty}px)`;
      });
      baked = true;
    }
    function unbake() {
      clearTimeout(bakeTimer);
      if (!baked) return;
      noAnim(() => {
        fwRoom.style.height = '';
        sizeRoomParts();
        fwRoom.style.transform = `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.k})`;
      });
      baked = false;
    }

    // Camera: zoom/slide the room. Never shows past the photo's edges.
    function camera() {
      unbake();
      const Ws = fwStage.clientWidth, Hs = fwStage.clientHeight, Wr = fwRoom.clientWidth, Hr = fwRoom.clientHeight;
      let k = 1, tx, ty = 0;
      if (current < 0) {
        tx = clamp(panX, Math.min(0, Ws - Wr), 0);
        panX = tx;
      } else {
        const f = fwFrames[current];
        const fx = f.offsetLeft, fy = f.offsetTop, fw = f.offsetWidth, fh = f.offsetHeight;
        k = Math.min(Ws * 0.9 / fw, Hs * 0.78 / fh); // close-up: only a little wall left around the frame
        tx = clamp(Ws / 2 - k * (fx + fw / 2), Ws - k * Wr, 0);
        ty = clamp(Hs * 0.5 - k * (fy + fh / 2), Hs - k * Hr, 0);
      }
      fwRoom.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
      cam = { k, tx, ty };
      if (current >= 0) bakeTimer = setTimeout(bake, 1150); // just after the 1.1s zoom
    }

    function render() {
      const zoomed = current >= 0;
      fwStage.classList.toggle('is-zoomed', zoomed);
      fwFrames.forEach((f, i) => {
        f.classList.toggle('is-selected', i === current);
        f.style.removeProperty('--tx'); f.style.removeProperty('--ty');
        f.tabIndex = zoomed ? -1 : 0;
      });
      chips.forEach((c, i) => c.setAttribute('aria-current', String(i === current)));
      byId('fw-wall-text').hidden = zoomed;
      byId('fw-detail').hidden = !zoomed;
      byId('fw-meta').hidden = !zoomed;
      if (zoomed) {
        const d = fwFrames[current].dataset;
        const n = `${pad2(current + 1)} / ${pad2(fwFrames.length)}`;
        byId('fw-zoom-count').textContent = n; byId('fw-detail-count').textContent = n;
        byId('fw-zoom-name').textContent = d.name || ''; byId('fw-detail-name').textContent = d.name || '';
        byId('fw-detail-desc').textContent = d.desc || ''; byId('fw-size').textContent = d.size || ''; byId('fw-price').textContent = d.price || '';
      }
      if (fwLayer) fwLayer.style.translate = '';
      camera();
    }
    function zoomTo(i) { current = ((i % fwFrames.length) + fwFrames.length) % fwFrames.length; render(); }
    function backToWall() {
      unbake(); // read frame positions at normal size
      const f = fwFrames[current];
      if (f) panX = fwStage.clientWidth / 2 - (f.offsetLeft + f.offsetWidth / 2);
      current = -1; render();
    }

    fwFrames.forEach((f, i) => f.addEventListener('click', () => { if (current < 0 && !moved) zoomTo(i); }));
    byId('fw-back')?.addEventListener('click', backToWall);
    byId('fw-prev')?.addEventListener('click', () => zoomTo(current - 1));
    byId('fw-next')?.addEventListener('click', () => zoomTo(current + 1));
    document.addEventListener('keydown', e => {
      if (current < 0) return;
      if (e.key === 'Escape') backToWall();
      if (e.key === 'ArrowLeft') zoomTo(current - 1);
      if (e.key === 'ArrowRight') zoomTo(current + 1);
    });
    window.addEventListener('resize', layout);
    window.matchMedia('(max-width:760px)').addEventListener?.('change', () => { panX = null; layout(); });
    fwRoom.querySelector('.fw-photo')?.addEventListener('load', layout);

    // Mouse depth: frames drift a little against the room; zoomed in, the frame tilts toward the pointer.
    fwStage.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || startX !== null) return;
      const r = fwStage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width * 2 - 1, py = (e.clientY - r.top) / r.height * 2 - 1;
      if (current < 0) { if (fwLayer) fwLayer.style.translate = `${px * -4}px ${py * -3}px`; }
      else {
        const f = fwFrames[current];
        f.style.setProperty('--tx', clamp(px * 1.2, -1, 1).toFixed(3));
        f.style.setProperty('--ty', clamp(py * 1.2, -1, 1).toFixed(3));
      }
    });
    fwStage.addEventListener('pointerleave', () => {
      if (fwLayer) fwLayer.style.translate = '';
      if (current >= 0) { fwFrames[current].style.removeProperty('--tx'); fwFrames[current].style.removeProperty('--ty'); }
    });

    // Drag: zoomed = swipe to the next frame; wall view = slide along the wall if it's wider than the box.
    fwStage.addEventListener('pointerdown', e => {
      if (e.target.closest('.fw-zoom-ui button')) return;
      startX = e.clientX; startPan = panX; moved = false;
    });
    window.addEventListener('pointermove', e => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 8) moved = true;
      if (moved && current < 0 && fwRoom.clientWidth > fwStage.clientWidth + 1) {
        fwStage.classList.add('is-panning');
        panX = startPan + dx; camera();
      }
    });
    const endDrag = e => {
      if (startX === null) return;
      const dx = (e.clientX ?? startX) - startX; startX = null;
      fwStage.classList.remove('is-panning');
      if (current >= 0 && Math.abs(dx) > 45) zoomTo(current + (dx < 0 ? 1 : -1));
      setTimeout(() => { moved = false; }, 0);
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    layout();
    render();
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

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
})();