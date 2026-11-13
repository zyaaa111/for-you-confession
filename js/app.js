(function () {
  'use strict';

  const content = window.CONFESSION_CONTENT;
  if (!content) {
    return;
  }

  const COPY_SCENES = ['opening', 'meeting', 'together', 'confession'];
  const NEXT_SCENE = {
    opening: 'meeting',
    meeting: 'together',
    together: 'confession',
    confession: 'ring',
    ring: 'response',
    response: null,
    accepted: null,
    declined: null
  };
  const ALLOWED_TRANSITIONS = {
    opening: ['meeting'],
    meeting: ['together'],
    together: ['confession'],
    confession: ['ring'],
    ring: ['response'],
    response: ['accepted', 'declined'],
    accepted: [],
    declined: []
  };
  const AUTO_ADVANCE_DELAYS = {
    opening: 14000,
    meeting: 15000,
    together: 16000,
    confession: 14000
  };
  const RING_REVEAL_DELAY = 3000;

  const sceneCopy = document.getElementById('scene-copy');
  const sceneEyebrow = sceneCopy.querySelector('.scene-copy__eyebrow');
  const sceneTitle = document.getElementById('scene-title');
  const sceneBody = sceneCopy.querySelector('.scene-copy__body');
  const nextButton = document.getElementById('next-scene');
  const ringScene = document.getElementById('ring-scene');
  const ringTitle = document.getElementById('ring-title');
  const ringJewel = ringScene.querySelector('.ring-box__jewel');
  const openRingButton = document.getElementById('open-ring');
  const responseScene = document.getElementById('response-scene');
  const responseTitle = document.getElementById('response-title');
  const acceptedScene = document.getElementById('accepted-scene');
  const acceptedTitle = document.getElementById('accepted-title');
  const acceptedDate = document.getElementById('accepted-date');
  const declinedScene = document.getElementById('declined-scene');
  const declinedTitle = document.getElementById('declined-title');
  const motionToggle = document.getElementById('motion-toggle');
  const motionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  const ambient = window.createAmbientScene(document.getElementById('ambient-canvas'));
  const music = window.createMusicPlayer({
    audio: document.getElementById('music'),
    toggleButton: document.getElementById('music-toggle'),
    hint: document.getElementById('music-hint'),
    officialLink: document.getElementById('music-official')
  });

  let currentScene = 'opening';
  let ringOpened = false;
  let manuallyMotionPaused = false;
  let lastNextActivation = -Infinity;
  let timerId = null;
  let timerCallback = null;
  let timerRemaining = 0;
  let timerStartedAt = 0;

  function replaceParagraphs(container, paragraphs) {
    const elements = (paragraphs || []).map(function (text) {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    });
    container.replaceChildren.apply(container, elements);
  }

  function renderCopyScene(name) {
    const scene = content.scenes[name];
    sceneCopy.dataset.scene = name;
    sceneEyebrow.textContent = scene.eyebrow;
    sceneTitle.textContent = scene.title;
    replaceParagraphs(sceneBody, scene.paragraphs);
  }

  function renderStaticContent() {
    const greeting = content.recipientName && content.recipientName.trim();
    const signature = content.senderName && content.senderName.trim();
    document.getElementById('recipient-greeting').textContent = greeting
      ? '致 ' + greeting
      : content.defaultRecipient;
    document.getElementById('sender-signature').textContent = signature
      ? '来自 ' + signature
      : content.defaultSignature;

    const ring = content.scenes.ring;
    ringScene.querySelector('.ring-scene__eyebrow').textContent = ring.eyebrow;
    ringTitle.textContent = ring.title;
    ringScene.querySelector('.ring-scene__intro').textContent = ring.intro;
    openRingButton.textContent = ring.openLabel;
    responseScene.querySelector('.response-scene__ring-copy').textContent = ring.revealed;

    const response = content.scenes.response;
    const likeText = '我喜欢你。';
    const like = responseTitle.querySelector('.response-scene__like') || document.createElement('span');
    like.className = 'response-scene__like';
    like.textContent = likeText;
    const question = response.title.indexOf(likeText) === 0
      ? response.title.slice(likeText.length)
      : response.title;
    responseTitle.replaceChildren(like, document.createTextNode(question));
    responseScene.querySelector('.response-scene__assurance').textContent = response.assurance;
    const acceptButton = document.getElementById('accept');
    const declineButton = document.getElementById('decline');
    acceptButton.textContent = response.acceptLabel;
    acceptButton.setAttribute('aria-label', response.acceptLabel);
    declineButton.textContent = response.declineLabel;
    declineButton.setAttribute('aria-label', response.declineLabel);

    const accepted = content.scenes.accepted;
    acceptedScene.querySelector('.accepted-scene__eyebrow').textContent = accepted.eyebrow;
    acceptedTitle.textContent = accepted.title;
    acceptedScene.querySelector('p:not([class])').textContent = accepted.paragraphs[0] || '';
    const dateLine = acceptedScene.querySelector('.accepted-scene__date-line');
    dateLine.replaceChildren(document.createTextNode(accepted.dateLabel), acceptedDate);
    const firstPlan = document.getElementById('first-plan');
    firstPlan.textContent = content.firstPlan;
    const planLine = acceptedScene.querySelector('.accepted-scene__plan');
    planLine.replaceChildren(document.createTextNode(accepted.planLabel), firstPlan);

    const declined = content.scenes.declined;
    declinedScene.querySelector('.declined-scene__eyebrow').textContent = declined.eyebrow;
    declinedTitle.textContent = declined.title;
    declinedScene.querySelector('p:not([class])').textContent = declined.paragraphs[0] || '';
  }

  function cancelTimer() {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
    timerCallback = null;
    timerRemaining = 0;
  }

  function startTimer() {
    if (timerId !== null || timerCallback === null || document.hidden || isMotionPaused()) {
      return;
    }
    timerStartedAt = Date.now();
    timerId = window.setTimeout(function () {
      timerId = null;
      if (document.hidden) {
        timerRemaining = 0;
        return;
      }
      const callback = timerCallback;
      timerCallback = null;
      timerRemaining = 0;
      if (callback) {
        callback();
      }
    }, timerRemaining);
  }

  function scheduleTimer(callback, delay) {
    cancelTimer();
    timerCallback = callback;
    timerRemaining = delay;
    startTimer();
  }

  function pauseTimer() {
    if (timerId === null) {
      return;
    }
    window.clearTimeout(timerId);
    timerId = null;
    timerRemaining = Math.max(0, timerRemaining - (Date.now() - timerStartedAt));
  }

  function isMotionPaused() {
    return Boolean(motionQuery && motionQuery.matches)
      || document.body.classList.contains('is-motion-paused');
  }

  function focusHeading(heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  function focusAndReveal(heading) {
    focusHeading(heading);
    heading.scrollIntoView({
      behavior: isMotionPaused() ? 'auto' : 'smooth',
      block: 'center'
    });
  }

  function updateSceneVisibility(name) {
    const isCopyScene = COPY_SCENES.indexOf(name) !== -1;
    sceneCopy.hidden = !isCopyScene;
    nextButton.hidden = !isCopyScene;
    ringScene.hidden = name !== 'ring' && name !== 'response';
    responseScene.hidden = name !== 'response';
    acceptedScene.hidden = name !== 'accepted';
    declinedScene.hidden = name !== 'declined';
  }

  function scheduleAutoAdvance(name) {
    if (!AUTO_ADVANCE_DELAYS[name]) {
      return;
    }
    scheduleTimer(function () {
      goToScene(NEXT_SCENE[name]);
    }, AUTO_ADVANCE_DELAYS[name]);
  }

  function goToScene(name) {
    if (name === currentScene) {
      return true;
    }
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_TRANSITIONS, currentScene)
      || ALLOWED_TRANSITIONS[currentScene].indexOf(name) === -1) {
      return false;
    }
    if (name === 'response' && !ringOpened) {
      return false;
    }

    const shouldFocusRing = name === 'ring' && sceneCopy.contains(document.activeElement);
    cancelTimer();
    currentScene = name;
    document.body.dataset.scene = name;
    if (COPY_SCENES.indexOf(name) !== -1) {
      renderCopyScene(name);
    }
    updateSceneVisibility(name);

    if (name === 'accepted') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      acceptedDate.textContent = year + '年' + month + '月' + day + '日';
      acceptedDate.setAttribute(
        'datetime',
        year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0')
      );
      focusAndReveal(acceptedTitle);
    } else if (name === 'declined') {
      focusAndReveal(declinedTitle);
    } else if (name === 'response') {
      focusAndReveal(responseTitle);
    } else if (name === 'ring') {
      if (shouldFocusRing) {
        focusAndReveal(ringTitle);
      }
    } else {
      scheduleAutoAdvance(name);
    }
    return true;
  }

  function openRing() {
    if (currentScene !== 'ring' || ringOpened) {
      return false;
    }
    ringOpened = true;
    cancelTimer();
    ringScene.classList.add('is-open');
    ringScene.classList.add('has-opened');
    ringJewel.removeAttribute('aria-hidden');
    openRingButton.setAttribute('aria-expanded', 'true');
    openRingButton.hidden = true;
    focusHeading(ringTitle);
    ambient.setFocused(true);

    if (isMotionPaused()) {
      return goToScene('response');
    }
    scheduleTimer(function () {
      goToScene('response');
    }, RING_REVEAL_DELAY);
    return true;
  }

  function acceptResponse() {
    if (currentScene !== 'response') {
      return false;
    }
    return goToScene('accepted');
  }

  function declineResponse() {
    if (currentScene !== 'response') {
      return false;
    }
    return goToScene('declined');
  }

  function handleNextClick() {
    const now = Date.now();
    if (now - lastNextActivation < 400) {
      return;
    }
    lastNextActivation = now;
    const next = NEXT_SCENE[currentScene];
    if (COPY_SCENES.indexOf(currentScene) !== -1 && next) {
      goToScene(next);
    }
  }

  function applyMotionState() {
    const systemReduced = Boolean(motionQuery && motionQuery.matches);
    const paused = systemReduced || manuallyMotionPaused;
    const label = systemReduced ? '静态模式' : (paused ? '继续动效' : '暂停动效');
    document.body.classList.toggle('is-motion-paused', paused);
    motionToggle.textContent = label;
    motionToggle.setAttribute('aria-label', label);
    motionToggle.disabled = systemReduced;
    motionToggle.dataset.motionState = systemReduced
      ? 'system-reduced'
      : (paused ? 'paused' : 'running');

    if (systemReduced) {
      motionToggle.title = '系统已开启减少动态效果，页面保持静态。';
      motionToggle.setAttribute('aria-description', motionToggle.title);
    } else {
      motionToggle.removeAttribute('title');
      motionToggle.removeAttribute('aria-description');
    }

    if (paused) {
      pauseTimer();
      ambient.stop();
      if (!document.hidden && currentScene === 'ring' && ringOpened) {
        cancelTimer();
        goToScene('response');
      }
    } else {
      ambient.start();
      startTimer();
    }
  }

  function handleMotionToggle() {
    if (motionQuery && motionQuery.matches) {
      return;
    }
    manuallyMotionPaused = !manuallyMotionPaused;
    applyMotionState();
  }

  function handleMotionChange() {
    applyMotionState();
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      pauseTimer();
      return;
    }
    if (currentScene === 'ring' && ringOpened && isMotionPaused()) {
      cancelTimer();
      goToScene('response');
      return;
    }
    startTimer();
  }

  renderStaticContent();
  renderCopyScene('opening');
  updateSceneVisibility('opening');
  document.body.dataset.scene = 'opening';

  nextButton.addEventListener('click', handleNextClick);
  openRingButton.addEventListener('click', openRing);
  document.getElementById('accept').addEventListener('click', acceptResponse);
  document.getElementById('decline').addEventListener('click', declineResponse);
  motionToggle.addEventListener('click', handleMotionToggle);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  if (motionQuery) {
    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', handleMotionChange);
    } else if (typeof motionQuery.addListener === 'function') {
      motionQuery.addListener(handleMotionChange);
    }
  }

  ambient.start();
  applyMotionState();
  scheduleAutoAdvance('opening');
  music.tryAutoplay();

  window.confessionController = Object.freeze({
    goToScene: goToScene,
    openRing: openRing,
    acceptResponse: acceptResponse,
    declineResponse: declineResponse
  });
}());
