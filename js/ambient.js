(function () {
  'use strict';

  const STAR_COUNT = 28;
  const MID_PETAL_COUNT = 14;
  const NEAR_PETAL_COUNT = 4;

  window.createAmbientScene = function (canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new TypeError('createAmbientScene requires a canvas element.');
    }

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is unavailable.');
    }

    const motionQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    const stars = new Array(STAR_COUNT);
    const midPetals = new Array(MID_PETAL_COUNT);
    const nearPetals = new Array(NEAR_PETAL_COUNT);

    let width = 1;
    let height = 1;
    let started = false;
    let focused = false;
    let reducedMotion = motionQuery ? motionQuery.matches : false;
    let frameId = null;
    let lastTimestamp = null;

    for (let index = 0; index < stars.length; index += 1) {
      stars[index] = createStar();
    }

    for (let index = 0; index < midPetals.length; index += 1) {
      midPetals[index] = createPetal(false);
    }

    for (let index = 0; index < nearPetals.length; index += 1) {
      nearPetals[index] = createPetal(true);
    }

    function random(min, max) {
      return min + Math.random() * (max - min);
    }

    function createStar() {
      return {
        x: Math.random(),
        y: Math.random(),
        radius: random(0.45, 1.35),
        baseAlpha: random(0.2, 0.62),
        phase: random(0, Math.PI * 2),
        twinkleSpeed: random(0.35, 0.85),
        drift: random(-0.0018, 0.0018),
        color: Math.random() > 0.28 ? '#FFF7F2' : '#E7C98F'
      };
    }

    function createPetal(near) {
      const petal = {
        near: near,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 0,
        rotation: 0,
        spin: 0,
        phase: 0,
        swaySpeed: 0,
        sway: 0,
        baseAlpha: 0,
        alpha: 0,
        color: Math.random() > 0.22 ? '#F4A7C3' : '#E7C98F'
      };
      resetPetal(petal, true);
      return petal;
    }

    function resetPetal(petal, initial) {
      petal.x = random(-0.08, 1.08);
      petal.y = initial ? random(-0.16, 1.06) : random(-0.24, -0.07);
      petal.vx = random(-0.016, 0.016);
      petal.vy = petal.near ? random(0.042, 0.072) : random(0.024, 0.052);
      petal.size = petal.near ? random(16, 23) : random(8, 14);
      petal.rotation = random(0, Math.PI * 2);
      petal.spin = random(-0.75, 0.75);
      petal.phase = random(0, Math.PI * 2);
      petal.swaySpeed = random(0.45, 0.95);
      petal.sway = random(0.007, 0.018);
      petal.baseAlpha = petal.near ? random(0.16, 0.3) : random(0.22, 0.46);
      petal.alpha = petal.baseAlpha;
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      width = Math.max(1, bounds.width || canvas.clientWidth || window.innerWidth || 1);
      height = Math.max(1, bounds.height || canvas.clientHeight || window.innerHeight || 1);

      const pixelWidth = Math.round(width * pixelRatio);
      const pixelHeight = Math.round(height * pixelRatio);
      if (canvas.width !== pixelWidth) {
        canvas.width = pixelWidth;
      }
      if (canvas.height !== pixelHeight) {
        canvas.height = pixelHeight;
      }

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      if (started && reducedMotion && !document.hidden) {
        drawFrame(false, 0);
      }
    }

    function updateStar(star, delta) {
      star.phase += star.twinkleSpeed * delta;
      star.x += star.drift * delta;
      if (star.x > 1.02) {
        star.x = -0.02;
      } else if (star.x < -0.02) {
        star.x = 1.02;
      }
    }

    function updatePetal(petal, delta) {
      petal.phase += petal.swaySpeed * delta;
      petal.x += (petal.vx + Math.sin(petal.phase) * petal.sway) * delta;
      petal.y += petal.vy * delta;
      petal.rotation += petal.spin * delta;
      petal.alpha = petal.baseAlpha * (0.84 + Math.sin(petal.phase * 0.72) * 0.16);

      if (petal.y > 1.14 || petal.x < -0.2 || petal.x > 1.2) {
        resetPetal(petal, false);
      }
    }

    function drawStar(star, animate) {
      const alpha = animate
        ? star.baseAlpha * (0.78 + Math.sin(star.phase) * 0.22)
        : star.baseAlpha;
      context.globalAlpha = alpha;
      context.fillStyle = star.color;
      context.beginPath();
      context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
      context.fill();
    }

    function drawPetal(petal) {
      const size = petal.size;
      const focusAlpha = focused ? 0.38 : 1;
      context.save();
      context.translate(petal.x * width, petal.y * height);
      context.rotate(petal.rotation);
      context.globalAlpha = petal.alpha * focusAlpha;
      context.fillStyle = petal.color;
      context.beginPath();
      context.moveTo(0, -size * 0.68);
      context.bezierCurveTo(size * 0.66, -size * 0.45, size * 0.62, size * 0.42, 0, size * 0.72);
      context.bezierCurveTo(-size * 0.62, size * 0.42, -size * 0.66, -size * 0.45, 0, -size * 0.68);
      context.fill();
      context.restore();
    }

    function drawPetals(petals, count, animate, delta) {
      for (let index = 0; index < count; index += 1) {
        const petal = petals[index];
        if (animate) {
          updatePetal(petal, delta);
        }
        drawPetal(petal);
      }
    }

    function drawFrame(animate, delta) {
      context.clearRect(0, 0, width, height);

      for (let index = 0; index < stars.length; index += 1) {
        if (animate) {
          updateStar(stars[index], delta);
        }
        drawStar(stars[index], animate);
      }

      drawPetals(midPetals, focused ? 7 : midPetals.length, animate, delta);
      drawPetals(nearPetals, focused ? 1 : nearPetals.length, animate, delta);
      context.globalAlpha = 1;
    }

    function canAnimate() {
      return started && !document.hidden && !reducedMotion;
    }

    function scheduleFrame() {
      if (frameId === null && canAnimate()) {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    function cancelFrame() {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      lastTimestamp = null;
    }

    function tick(timestamp) {
      frameId = null;
      if (!canAnimate()) {
        return;
      }

      const delta = lastTimestamp === null
        ? 0
        : Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;
      drawFrame(true, delta);
      scheduleFrame();
    }

    function start() {
      if (started) {
        return;
      }
      started = true;
      if (document.hidden) {
        return;
      }
      if (reducedMotion) {
        drawFrame(false, 0);
        return;
      }
      scheduleFrame();
    }

    function stop() {
      started = false;
      cancelFrame();
    }

    function setFocused(value) {
      const nextFocused = Boolean(value);
      if (focused === nextFocused) {
        return;
      }
      focused = nextFocused;
      if (started && reducedMotion && !document.hidden) {
        drawFrame(false, 0);
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        cancelFrame();
        return;
      }
      if (!started) {
        return;
      }
      if (reducedMotion) {
        drawFrame(false, 0);
      } else {
        scheduleFrame();
      }
    }

    function handleMotionChange(event) {
      reducedMotion = event.matches;
      cancelFrame();
      if (!started || document.hidden) {
        return;
      }
      if (reducedMotion) {
        drawFrame(false, 0);
      } else {
        scheduleFrame();
      }
    }

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (motionQuery) {
      if (typeof motionQuery.addEventListener === 'function') {
        motionQuery.addEventListener('change', handleMotionChange);
      } else if (typeof motionQuery.addListener === 'function') {
        motionQuery.addListener(handleMotionChange);
      }
    }

    resize();

    return {
      start: start,
      stop: stop,
      setFocused: setFocused
    };
  };
}());
