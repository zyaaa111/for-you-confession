(function () {
  'use strict';

  const DEFAULT_VOLUME = 0.55;
  const FADE_DURATION = 650;

  window.createMusicPlayer = function (elements) {
    const audio = elements.audio;
    const toggleButton = elements.toggleButton;
    const hint = elements.hint;
    const officialLink = elements.officialLink;
    const settings = window.CONFESSION_CONTENT && window.CONFESSION_CONTENT.music
      ? window.CONFESSION_CONTENT.music
      : {};

    if (!audio || !toggleButton || !hint) {
      throw new TypeError('createMusicPlayer requires audio, toggleButton and hint elements.');
    }

    const playLabel = settings.playLabel || '播放音乐';
    const pauseLabel = '暂停音乐';
    const replayLabel = '重新播放';
    const normalHint = settings.hint || '';
    const errorHint = settings.error || '音乐暂时无法播放，告白仍会继续';

    let destroyed = false;
    let manuallyPaused = false;
    let playPending = false;
    let autoplayAttempted = false;
    let resumeAfterVisibility = false;
    let playVersion = 0;
    let fadeFrame = null;

    audio.volume = DEFAULT_VOLUME;
    audio.loop = false;
    toggleButton.hidden = false;
    toggleButton.disabled = false;
    toggleButton.style.minWidth = '44px';
    toggleButton.style.minHeight = '44px';
    setLabel(playLabel);
    hint.textContent = normalHint;
    hint.classList.remove('is-visible');
    configureOfficialLink();

    function configureOfficialLink() {
      if (!officialLink) {
        return;
      }
      if (settings.officialUrl) {
        officialLink.href = settings.officialUrl;
      }
      officialLink.target = '_blank';
      officialLink.rel = 'noopener noreferrer';
      if (!settings.officialLabel) {
        return;
      }
      const textNode = Array.prototype.find.call(
        officialLink.childNodes,
        function (node) { return node.nodeType === 3; }
      );
      if (textNode) {
        textNode.nodeValue = settings.officialLabel;
      } else {
        officialLink.insertBefore(document.createTextNode(settings.officialLabel), officialLink.firstChild);
      }
    }

    function setLabel(label) {
      toggleButton.textContent = label;
      toggleButton.setAttribute('aria-label', label);
    }

    function cancelFade() {
      if (fadeFrame !== null) {
        window.cancelAnimationFrame(fadeFrame);
        fadeFrame = null;
      }
    }

    function fadeIn() {
      cancelFade();
      if (audio.volume >= DEFAULT_VOLUME) {
        audio.volume = DEFAULT_VOLUME;
        return;
      }

      const initialVolume = Math.max(0, audio.volume);
      let startedAt = null;

      function step(timestamp) {
        fadeFrame = null;
        if (destroyed || audio.paused || document.hidden) {
          audio.volume = DEFAULT_VOLUME;
          return;
        }
        if (startedAt === null) {
          startedAt = timestamp;
        }
        const progress = Math.min(1, (timestamp - startedAt) / FADE_DURATION);
        audio.volume = Math.min(
          DEFAULT_VOLUME,
          initialVolume + (DEFAULT_VOLUME - initialVolume) * progress
        );
        if (progress < 1) {
          fadeFrame = window.requestAnimationFrame(step);
        }
      }

      fadeFrame = window.requestAnimationFrame(step);
    }

    function preparePlayback() {
      cancelFade();
      manuallyPaused = false;
      if (audio.paused && (audio.currentTime === 0 || audio.ended)) {
        audio.volume = 0;
      }
    }

    function handlePlayError(error) {
      playVersion += 1;
      playPending = false;
      resumeAfterVisibility = false;
      cancelFade();
      toggleButton.hidden = false;
      toggleButton.disabled = false;
      hint.classList.add('is-visible');

      if (error && error.name === 'NotAllowedError') {
        manuallyPaused = false;
        setLabel(playLabel);
        hint.textContent = '自动播放被浏览器阻止，请点“播放音乐”。';
        return;
      }

      manuallyPaused = true;
      setLabel(playLabel);
      hint.textContent = errorHint;
    }

    function settlePlay(playResult, version) {
      playPending = true;
      return Promise.resolve(playResult).then(function () {
        if (destroyed || version !== playVersion) {
          return false;
        }
        playPending = false;
        toggleButton.hidden = false;
        toggleButton.disabled = false;
        setLabel(pauseLabel);
        hint.textContent = normalHint;
        hint.classList.remove('is-visible');
        fadeIn();
        return true;
      }).catch(function (error) {
        if (destroyed || version !== playVersion) {
          return false;
        }
        handlePlayError(error);
        return false;
      });
    }

    function tryAutoplay() {
      if (destroyed || autoplayAttempted) {
        return Promise.resolve(false);
      }
      if (document.hidden) {
        return Promise.resolve(false);
      }
      autoplayAttempted = true;
      if (!audio.paused && !audio.ended) {
        setLabel(pauseLabel);
        hint.classList.remove('is-visible');
        return Promise.resolve(true);
      }

      preparePlayback();
      const version = ++playVersion;
      playPending = true;
      try {
        const playResult = audio.play();
        return settlePlay(playResult, version);
      } catch (error) {
        handlePlayError(error);
        return Promise.resolve(false);
      }
    }

    function pauseInternally() {
      playVersion += 1;
      playPending = false;
      cancelFade();
      audio.pause();
      audio.volume = DEFAULT_VOLUME;
      setLabel(audio.ended ? replayLabel : playLabel);
    }

    function pause() {
      if (destroyed) {
        return;
      }
      manuallyPaused = true;
      resumeAfterVisibility = false;
      pauseInternally();
    }

    function handleToggleClick() {
      if (destroyed) {
        return Promise.resolve(false);
      }
      if (playPending) {
        pause();
        return Promise.resolve(false);
      }
      if (!audio.paused && !audio.ended) {
        pause();
        return Promise.resolve(false);
      }

      preparePlayback();
      const version = ++playVersion;
      playPending = true;
      try {
        const playResult = audio.play();
        return settlePlay(playResult, version);
      } catch (error) {
        handlePlayError(error);
        return Promise.resolve(false);
      }
    }

    function toggle() {
      return handleToggleClick();
    }

    function handlePlay() {
      if (!destroyed && !manuallyPaused && !audio.paused) {
        setLabel(pauseLabel);
      }
    }

    function handlePause() {
      if (destroyed || !audio.ended) {
        if (!destroyed) {
          setLabel(playLabel);
        }
      }
    }

    function handleEnded() {
      if (destroyed) {
        return;
      }
      playVersion += 1;
      playPending = false;
      resumeAfterVisibility = false;
      cancelFade();
      audio.volume = DEFAULT_VOLUME;
      setLabel(replayLabel);
      hint.textContent = normalHint;
      hint.classList.remove('is-visible');
    }

    function handleMediaError() {
      if (!destroyed) {
        handlePlayError(new Error('Media playback failed.'));
      }
    }

    function handleVisibilityChange() {
      if (destroyed) {
        return;
      }
      if (document.hidden) {
        resumeAfterVisibility = !audio.paused && !audio.ended && !manuallyPaused;
        if (resumeAfterVisibility || playPending) {
          pauseInternally();
        }
        return;
      }

      if (!autoplayAttempted) {
        tryAutoplay();
        return;
      }

      if (!resumeAfterVisibility || manuallyPaused) {
        resumeAfterVisibility = false;
        return;
      }

      resumeAfterVisibility = false;
      preparePlayback();
      const version = ++playVersion;
      playPending = true;
      try {
        const playResult = audio.play();
        settlePlay(playResult, version);
      } catch (error) {
        handlePlayError(error);
      }
    }

    function destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      resumeAfterVisibility = false;
      playVersion += 1;
      playPending = false;
      cancelFade();
      audio.pause();
      audio.volume = DEFAULT_VOLUME;
      toggleButton.removeEventListener('click', handleToggleClick);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleMediaError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    toggleButton.addEventListener('click', handleToggleClick);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleMediaError);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return {
      tryAutoplay: tryAutoplay,
      toggle: toggle,
      pause: pause,
      destroy: destroy
    };
  };
}());
