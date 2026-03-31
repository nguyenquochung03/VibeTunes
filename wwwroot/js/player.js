// wwwroot/js/player.js
// Mini Player controller for VibeTunes

window.VibeTunes = window.VibeTunes || {};

// Toast Notification Helper (used by player/favorites/search)
window.VibeTunes.toast = (function () {
  function show(message, type = 'success') {
    const id = 'toast-' + Date.now();
    const colors = {
      success: 'var(--vt-success)',
      info: 'var(--vt-primary)',
      danger: 'var(--vt-danger)',
      warning: 'var(--vt-warning)',
    };

    const icons = {
      success: 'check-circle',
      info: 'info',
      danger: 'alert-circle',
      warning: 'alert-triangle',
    };

    const $toast = $(`
      <div class="toast toast--${type}" id="${id}" style="color: ${colors[type] || colors.success}">
        <i data-lucide="${icons[type] || icons.success}"></i>
        <span>${message}</span>
      </div>
    `);

    $('body').append($toast);
    lucide.createIcons({ nodes: [$toast[0]] });

    // Auto dismiss
    setTimeout(function () {
      $toast.css({ opacity: 0, transform: 'translateX(100%)' });
      setTimeout(function () {
        $toast.remove();
      }, 300);
    }, 3000);
  }

  return { show };
}());

function showToast(msg, type) {
  window.VibeTunes.toast.show(msg, type);
}

window.VibeTunes.player = (function ($) {
  'use strict';

  // ── State ──
  let currentTrack = null;
  let isPlaying = false;
  let isSeeking = false;
  let queueTracks = [];
  let audioContext = null;
  let analyser = null;
  let sourceNode = null;
  let animationId = null;
  let lyricsCache = {};
  let currentLyrics = '';
  let isLyricsOpen = false;
  let playbackToken = 0;
  let fadeOutTimer = null;
  let fadeInTimer = null;
  let visualizerFakeMode = false;
  let isRestoringSession = false;
  let lastSessionPersistMs = 0;
  const DEFAULT_TITLE = 'VibeTunes';
  const FADE_DURATION_MS = 300;
  const PLAYBACK_SESSION_KEY = 'vibetunes_playback_session';
  const PLAYBACK_SESSION_VERSION = 1;
  const SESSION_PERSIST_INTERVAL_MS = 900;

  // ── DOM refs ──
  let $player, $audio, $playBtn;
  let $progressBar, $progressTrack;
  let $title, $artist, $artwork;
  let $currentTime, $duration;
  let $volumeSlider, $muteBtn, $volumeIcon, $muteIcon;
  let $favBtn, $visualizer;
  let $lyricsBtn, $lyricsBackdrop, $lyricsCloseBtn, $lyricsMeta, $lyricsContent;
  let $optionsBtn, $optionsMenu, $optionsLyrics, $optionsMute;

  function init() {
    $player = $('#mini-player');
    $audio = $('#audio-engine')[0]; // native element
    $playBtn = $('#player-play-btn');
    $progressBar = $('#player-progress-bar');
    $progressTrack = $('#player-progress');
    $title = $('#player-title');
    $artist = $('#player-artist');
    $artwork = $('#player-artwork');
    $currentTime = $('#player-current-time');
    $duration = $('#player-duration');
    $volumeSlider = $('#player-volume-slider');
    $muteBtn = $('#player-mute-btn');
    $volumeIcon = $('#player-volume-icon');
    $muteIcon = $('#player-mute-icon');
    $favBtn = $('#player-favorite-btn');
    $visualizer = $('#player-visualizer');
    $lyricsBtn = $('#player-lyrics-btn');
    $lyricsBackdrop = $('#lyrics-modal-backdrop');
    $lyricsCloseBtn = $('#lyrics-modal-close-btn');
    $lyricsMeta = $('#lyrics-modal-meta');
    $lyricsContent = $('#lyrics-modal-content');
    $optionsBtn = $('#player-options-btn');
    $optionsMenu = $('#player-options-menu');
    $optionsLyrics = $('#player-options-lyrics');
    $optionsMute = $('#player-options-mute');

    // Restore volume
    try {
      $audio.volume = parseFloat(localStorage.getItem('vibetunes_volume') || '0.8');
    } catch (e) {
      $audio.volume = 0.8;
    }

    $volumeSlider.val($audio.volume);
    updateVolumeIcon($audio.volume);
    $audio.crossOrigin = 'anonymous';
    resizeVisualizerCanvas();

    bindAudioEvents();
    bindUIEvents();
    bindAudioContextUnlock();
    window.addEventListener('resize', resizeVisualizerCanvas);
    window.addEventListener('pagehide', persistPlaybackStateNow);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        persistPlaybackStateNow();
      } else if (document.visibilityState === 'visible' && audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(function () {});
      }
    });
    tryRestorePlaybackSession();
  }

  function playTrack(track) {
    if (!track || !track.previewUrl) {
      showToast('Bài hát này không có bản preview.', 'warning');
      return;
    }

    ensureAudioContext();

    // Toggle if same track
    if (currentTrack && currentTrack.id === track.id) {
      togglePlayPause();
      return;
    }

    const nextQueue = buildQueueForTrack(track);
    playbackToken += 1;
    startTrackWithFade(track, nextQueue, playbackToken);
  }

  function togglePlayPause() {
    if (!currentTrack) return;
    ensureAudioContext();
    if ($audio.paused) {
      $audio.play().catch(function (err) {
        if (!isAbortError(err)) {
          console.error('[Player] Playback error:', err);
        }
      });
    } else {
      $audio.pause();
    }
  }

  function getCurrentTrack() {
    return currentTrack;
  }

  function getIsPlaying() {
    return isPlaying;
  }

  function bindAudioEvents() {
    const audio = $audio;

    audio.addEventListener('timeupdate', function () {
      if (isSeeking) return;
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      $progressBar.css('width', pct + '%');
      $progressTrack.attr('aria-valuenow', Math.round(pct));
      $currentTime.text(formatTime(audio.currentTime));
      const now = Date.now();
      if (now - lastSessionPersistMs >= SESSION_PERSIST_INTERVAL_MS) {
        lastSessionPersistMs = now;
        persistPlaybackStateNow();
      }
    });

    audio.addEventListener('loadedmetadata', function () {
      $duration.text(formatTime(audio.duration));
    });

    audio.addEventListener('ended', function () {
      let nextTrack = null;
      while (queueTracks.length > 0) {
        const candidate = queueTracks.shift();
        if (candidate && candidate.previewUrl) {
          nextTrack = candidate;
          break;
        }
      }
      if (nextTrack) {
        startTrackWithFade(nextTrack, queueTracks.slice(), playbackToken);
        return;
      }
      clearPlaybackSessionStorage();
      setPlayingState(false);
      $progressBar.css('width', '0%');
      $currentTime.text('0:00');

      if (window.VibeTunes.search) window.VibeTunes.search.updatePlayingState(null);
      updateDocumentTitle();
    });

    audio.addEventListener('error', function () {
      showToast('Lỗi phát nhạc. Vui lòng thử bài khác.', 'danger');
      setPlayingState(false);
    });

    audio.addEventListener('waiting', function () {
      $playBtn.addClass('is-loading');
    });

    audio.addEventListener('canplay', function () {
      $playBtn.removeClass('is-loading');
    });

    audio.addEventListener('play', function () {
      connectVisualizer();
      setPlayingState(true);
      startVisualizer();
      updateDocumentTitle();
    });

    audio.addEventListener('pause', function () {
      setPlayingState(false);
      updateDocumentTitle();
      persistPlaybackStateNow();
    });
  }

  function clearPlaybackSessionStorage() {
    try {
      sessionStorage.removeItem(PLAYBACK_SESSION_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function persistPlaybackStateNow() {
    if (isRestoringSession) return;
    if (!currentTrack || !currentTrack.previewUrl) {
      clearPlaybackSessionStorage();
      return;
    }
    try {
      const payload = {
        version: PLAYBACK_SESSION_VERSION,
        currentTrack: currentTrack,
        currentTime: $audio.currentTime || 0,
        wasPlaying: !$audio.paused,
        queue: (queueTracks || []).filter(trackHasPreview),
      };
      sessionStorage.setItem(PLAYBACK_SESSION_KEY, JSON.stringify(payload));
    } catch (e) {
      /* Quota hoặc private mode */
    }
  }

  function tryRestorePlaybackSession() {
    let data = null;
    try {
      const raw = sessionStorage.getItem(PLAYBACK_SESSION_KEY);
      if (!raw) return;
      data = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!data || data.version !== PLAYBACK_SESSION_VERSION || !data.currentTrack || !data.currentTrack.previewUrl) {
      return;
    }

    const restoreToken = playbackToken;
    isRestoringSession = true;
    queueTracks = Array.isArray(data.queue) ? data.queue.filter(trackHasPreview).slice() : [];
    currentTrack = data.currentTrack;
    const targetTime = Math.max(0, Number(data.currentTime) || 0);
    const shouldPlay = !!data.wasPlaying;

    $audio.src = currentTrack.previewUrl;
    $audio.load();
    updateTrackInfo(currentTrack);
    showPlayer();
    updateFavoriteBtn();
    fetchLyrics(currentTrack);

    let restoreSeekApplied = false;

    function applySeekAndPlay() {
      if (restoreSeekApplied) return;
      restoreSeekApplied = true;
      if (restoreToken !== playbackToken) {
        isRestoringSession = false;
        return;
      }
      const dur = $audio.duration;
      const maxT = dur && isFinite(dur) ? Math.max(0, dur - 0.25) : targetTime;
      $audio.currentTime = Math.min(targetTime, maxT);
      if (shouldPlay) {
        ensureAudioContext();
        $audio
          .play()
          .then(function () {
            isRestoringSession = false;
            if (restoreToken !== playbackToken) return;
            /* play event đã gọi connectVisualizer / setPlayingState / updateDocumentTitle */
          })
          .catch(function () {
            isRestoringSession = false;
            setPlayingState(false);
            updateDocumentTitle();
          });
      } else {
        isRestoringSession = false;
        const d = $audio.duration;
        const pct = d && isFinite(d) ? ($audio.currentTime / d) * 100 : 0;
        $progressBar.css('width', pct + '%');
        $currentTime.text(formatTime($audio.currentTime));
        setPlayingState(false);
        updateDocumentTitle();
      }
    }

    function onCanPlayOnce() {
      $audio.removeEventListener('canplay', onCanPlayOnce);
      applySeekAndPlay();
    }

    $audio.addEventListener('canplay', onCanPlayOnce);
  }

  function bindUIEvents() {
    $playBtn.on('click', togglePlayPause);

    // Click to seek
    $progressTrack.on('click', function (e) {
      if (!audioDurationReady()) return;
      const rect = this.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      $audio.currentTime = pct * $audio.duration;
    });

    // Drag to seek
    $progressTrack.on('mousedown touchstart', function (e) {
      if (!audioDurationReady()) return;
      isSeeking = true;

      $(document).on('mousemove touchmove.seek', function (ev) {
        const rect = $progressTrack[0].getBoundingClientRect();
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        $progressBar.css('width', pct * 100 + '%');
        if ($audio.duration) $audio.currentTime = pct * $audio.duration;
      });

      $(document).one('mouseup touchend', function () {
        isSeeking = false;
        $(document).off('mousemove touchmove.seek');
      });
    });

    // Volume
    $volumeSlider.on('input', function () {
      const vol = parseFloat($(this).val());
      $audio.volume = vol;
      $audio.muted = false;

      try {
        localStorage.setItem('vibetunes_volume', vol.toString());
      } catch (e) {
        // Ignore persistence error
      }

      updateVolumeIcon(vol);
    });

    // Mute toggle
    $muteBtn.on('click', function () {
      $audio.muted = !$audio.muted;
      updateVolumeIcon($audio.muted ? 0 : $audio.volume);
    });

    // Favorite toggle in player
    $favBtn.on('click', function () {
      if (!currentTrack) return;
      window.VibeTunes.favorites.toggle(currentTrack);
      updateFavoriteBtn();
    });

    $lyricsBtn.on('click', function () {
      openLyricsModal();
    });

    $lyricsCloseBtn.on('click', closeLyricsModal);
    $lyricsBackdrop.on('click', function (e) {
      if (e.target === this) closeLyricsModal();
    });

    $optionsBtn.on('click', function (e) {
      e.stopPropagation();
      const isOpen = $optionsMenu.hasClass('is-open');
      if (isOpen) {
        closeOptionsMenu();
      } else {
        $optionsMenu.addClass('is-open');
        $optionsBtn.attr('aria-expanded', 'true');
      }
    });

    $optionsLyrics.on('click', function () {
      openLyricsModal();
      closeOptionsMenu();
    });

    $optionsMute.on('click', function () {
      $audio.muted = !$audio.muted;
      updateVolumeIcon($audio.muted ? 0 : $audio.volume);
      closeOptionsMenu();
    });

    $(document).on('click', function (e) {
      if (!$(e.target).closest('.player-options').length) {
        closeOptionsMenu();
      }
    });
  }

  function bindAudioContextUnlock() {
    function unlock() {
      ensureAudioContext();
      $(document).off('pointerdown.vtunlock keydown.vtunlock touchstart.vtunlock', unlock);
    }
    $(document).on('pointerdown.vtunlock keydown.vtunlock touchstart.vtunlock', unlock);
  }

  function audioDurationReady() {
    return !!$audio && !!$audio.duration && !isNaN($audio.duration);
  }

  function updateTrackInfo(track) {
    $title.text(track.title);
    $artist.text(track.artist);

    const src = track.artworkSmall || track.artwork || '/images/placeholder-album.svg';
    $artwork.attr('src', src).attr('alt', track.album || track.title);

    // iTunes preview always 30 seconds
    $duration.text('0:30');
    $currentTime.text('0:00');
    $progressBar.css('width', '0%');
    updateLyricsMeta(track);
  }

  function updateFavoriteBtn() {
    if (!currentTrack) return;
    const isFav = window.VibeTunes.favorites.isFavorite(currentTrack.id);
    $favBtn.toggleClass('is-favorited', isFav);
    $favBtn.attr('aria-pressed', isFav.toString());
    $favBtn.attr('aria-label', isFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích');
  }

  function setPlayingState(playing) {
    isPlaying = playing;
    $playBtn.toggleClass('is-playing', playing);
    $playBtn.attr('aria-label', playing ? 'Tạm dừng' : 'Phát');
    if (!playing) stopVisualizer();
    if (window.VibeTunes.search && typeof window.VibeTunes.search.updatePlayingState === 'function') {
      window.VibeTunes.search.updatePlayingState();
    }
  }

  function updateVolumeIcon(vol) {
    const muted = $audio.muted || vol === 0;
    $volumeIcon.toggle(!muted);
    $muteIcon.toggle(muted);
  }

  function showPlayer() {
    $player.removeClass('is-hidden').addClass('is-visible');
  }

  function ensureAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      return;
    }
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(function () {
        // Browser chặn resume ngoài user gesture.
      });
    }
  }

  function connectVisualizer() {
    if (visualizerFakeMode) return;
    if (!audioContext || audioContext.state !== 'running' || sourceNode) return;
    try {
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      sourceNode = audioContext.createMediaElementSource($audio);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);
    } catch (err) {
      visualizerFakeMode = true;
      try {
        if (sourceNode) sourceNode.disconnect();
      } catch (e) {
        /* ignore */
      }
      try {
        if (analyser) analyser.disconnect();
      } catch (e2) {
        /* ignore */
      }
      sourceNode = null;
      analyser = null;
    }
  }

  function resizeVisualizerCanvas() {
    const el = $visualizer && $visualizer[0];
    if (!el) return;
    el.width = el.clientWidth;
    el.height = el.clientHeight;
  }

  function startVisualizer() {
    const canvas = $visualizer && $visualizer[0];
    if (!canvas || animationId) return;

    if (visualizerFakeMode || !analyser) {
      const ctx = canvas.getContext('2d');
      const bars = 32;

      function drawFake() {
        if (!isPlaying) {
          animationId = null;
          return;
        }
        const t = performance.now() / 320;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = Math.max(2, (canvas.width / bars) * 0.8);
        let x = 0;
        const grad = ctx.createLinearGradient(0, canvas.height, canvas.width, 0);
        grad.addColorStop(0, '#6366F1');
        grad.addColorStop(1, '#A855F7');
        ctx.fillStyle = grad;
        for (let i = 0; i < bars; i += 1) {
          const h = (0.2 + 0.65 * Math.abs(Math.sin(t + i * 0.38))) * canvas.height;
          ctx.fillRect(x, canvas.height - h, barWidth, h);
          x += barWidth + 1;
        }
        animationId = window.requestAnimationFrame(drawFake);
      }
      animationId = window.requestAnimationFrame(drawFake);
      return;
    }

    const ctx = canvas.getContext('2d');
    const data = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
      if (!isPlaying) {
        animationId = null;
        return;
      }
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = Math.max(2, (canvas.width / data.length) * 0.8);
      let x = 0;
      const grad = ctx.createLinearGradient(0, canvas.height, canvas.width, 0);
      grad.addColorStop(0, '#6366F1');
      grad.addColorStop(1, '#A855F7');
      ctx.fillStyle = grad;
      for (let i = 0; i < data.length; i += 1) {
        const h = (data[i] / 255) * canvas.height;
        ctx.fillRect(x, canvas.height - h, barWidth, h);
        x += barWidth + 1;
      }
      animationId = window.requestAnimationFrame(draw);
    }
    animationId = window.requestAnimationFrame(draw);
  }

  function stopVisualizer() {
    if (animationId) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function updateDocumentTitle() {
    if (isPlaying && currentTrack) {
      document.title = '🎵 ' + currentTrack.title + ' - ' + currentTrack.artist;
      return;
    }
    document.title = DEFAULT_TITLE;
  }

  function trackHasPreview(t) {
    return !!(t && t.previewUrl);
  }

  function sliceQueueAfter(tracks, trackId) {
    if (!tracks || tracks.length === 0) return [];
    const idx = tracks.findIndex(function (t) { return t.id === trackId; });
    if (idx < 0 || idx + 1 >= tracks.length) return [];
    return tracks.slice(idx + 1).filter(trackHasPreview);
  }

  /** Đang xem panel Yêu thích (URL /Favorites hoặc SPA vẫn ở / nhưng panel hiển thị). */
  function isFavoritesPageRoute() {
    const p = (window.location.pathname || '').toLowerCase();
    if (p.indexOf('favorite') !== -1) return true;
    const fav = document.getElementById('view-favorites');
    return !!(fav && !fav.classList.contains('is-hidden'));
  }

  /**
   * Hàng đợi auto-next: các bài sau bài đang phát trong danh sách đang hiển thị
   * (Khám phá: kết quả tìm kiếm; panel Yêu thích: thứ tự yêu thích).
   */
  function buildQueueForTrack(track) {
    if (!track) return [];

    if (isFavoritesPageRoute() && window.VibeTunes.favorites) {
      return sliceQueueAfter(window.VibeTunes.favorites.getAll(), track.id);
    }

    const searchModule = window.VibeTunes.search;
    if (searchModule && typeof searchModule.getCurrentViewTracks === 'function') {
      return sliceQueueAfter(searchModule.getCurrentViewTracks(), track.id);
    }

    return [];
  }

  function fadeOutCurrentAudio() {
    return new Promise(function (resolve) {
      if (fadeOutTimer) {
        clearInterval(fadeOutTimer);
        fadeOutTimer = null;
      }
      if (!$audio || $audio.paused) {
        resolve();
        return;
      }
      const startVol = $audio.volume;
      const steps = 6;
      const stepMs = Math.max(30, Math.floor(FADE_DURATION_MS / steps));
      let currentStep = 0;
      fadeOutTimer = setInterval(function () {
        currentStep += 1;
        const nextVol = Math.max(0, startVol * (1 - currentStep / steps));
        $audio.volume = nextVol;
        if (currentStep >= steps) {
          clearInterval(fadeOutTimer);
          fadeOutTimer = null;
          $audio.pause();
          $audio.currentTime = 0;
          $audio.volume = startVol;
          resolve();
        }
      }, stepMs);
    });
  }

  function startTrackWithFade(track, nextQueue, token) {
    fadeOutCurrentAudio().then(function () {
      if (token !== playbackToken) return;
      queueTracks = Array.isArray(nextQueue) ? nextQueue.slice() : [];
      currentTrack = track;
      const targetVolume = parseFloat(localStorage.getItem('vibetunes_volume') || '0.8');
      $audio.src = track.previewUrl;
      $audio.load();
      updateTrackInfo(track);
      showPlayer();
      fetchLyrics(track);
      ensureAudioContext();
      $audio.volume = 0;

      $audio.play().then(function () {
        if (token !== playbackToken) return;
        if ($audio.paused) return;
        fadeInAudio(targetVolume);
        showToast('Đang phát: ' + track.title, 'info');
        if (window.VibeTunes.search) {
          window.VibeTunes.search.updatePlayingState(track.id);
        }
        if (window.VibeTunes.favorites && window.VibeTunes.favorites.updatePlayingState) {
          window.VibeTunes.favorites.updatePlayingState(track.id);
        }
        updateDocumentTitle();
      }).catch(function (err) {
        if (token !== playbackToken || isAbortError(err)) return;
        console.error('[Player] Playback error:', err);
        showToast('Không thể phát bài hát này.', 'danger');
        setPlayingState(false);
      });
      updateFavoriteBtn();
    });
  }

  function fadeInAudio(targetVolume) {
    if (fadeInTimer) {
      clearInterval(fadeInTimer);
      fadeInTimer = null;
    }
    const safeTarget = Math.max(0, Math.min(1, Number.isNaN(targetVolume) ? 0.8 : targetVolume));
    const steps = 6;
    const stepMs = Math.max(30, Math.floor(FADE_DURATION_MS / steps));
    let currentStep = 0;
    fadeInTimer = setInterval(function () {
      currentStep += 1;
      $audio.volume = safeTarget * (currentStep / steps);
      if (currentStep >= steps) {
        clearInterval(fadeInTimer);
        fadeInTimer = null;
        $audio.volume = safeTarget;
      }
    }, stepMs);
  }

  function isAbortError(err) {
    return !!(err && (err.name === 'AbortError' || String(err.message || '').toLowerCase().includes('interrupted')));
  }

  function sanitizeLyricsQuery(str) {
    if (!str) return '';
    return String(str)
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeLyricsText(text) {
    if (!text || !String(text).trim()) {
      return 'Không tìm thấy lời bài hát';
    }
    return String(text).trim();
  }

  function updateLyricsMeta(track) {
    if (!track) {
      $lyricsMeta.text('-');
      return;
    }
    $lyricsMeta.text(track.title + ' - ' + track.artist);
  }

  function fetchLyrics(track) {
    if (!track) return;
    const key = track.artist + '::' + track.title;
    if (lyricsCache[key]) {
      currentLyrics = lyricsCache[key];
      refreshLyricsUI();
      return;
    }
    currentLyrics = 'Đang tải lời bài hát...';
    refreshLyricsUI();
    const artistQ = sanitizeLyricsQuery(track.artist) || track.artist;
    const titleQ = sanitizeLyricsQuery(track.title) || track.title;
    $.ajax({
      url: 'https://api.lyrics.ovh/v1/' + encodeURIComponent(artistQ) + '/' + encodeURIComponent(titleQ),
      method: 'GET',
      dataType: 'json',
      timeout: 10000,
    }).then(function (data) {
      const raw = data && data.lyrics;
      const txt = raw && String(raw).trim() ? normalizeLyricsText(raw) : 'Không tìm thấy lời bài hát';
      lyricsCache[key] = txt;
      currentLyrics = txt;
      refreshLyricsUI();
    }).catch(function () {
      currentLyrics = 'Không tìm thấy lời bài hát';
      lyricsCache[key] = currentLyrics;
      refreshLyricsUI();
    });
  }

  function refreshLyricsUI() {
    $lyricsContent.text(currentLyrics || 'Không tìm thấy lời bài hát');
  }

  function openLyricsModal() {
    isLyricsOpen = true;
    if (!currentTrack) {
      $lyricsMeta.text('-');
      $lyricsContent.text('Chọn bài hát để xem lời.');
    } else {
      updateLyricsMeta(currentTrack);
      refreshLyricsUI();
    }
    $lyricsBackdrop.show();
    lucide.createIcons({ nodes: [$lyricsBackdrop[0]] });
  }

  function closeLyricsModal() {
    isLyricsOpen = false;
    $lyricsBackdrop.hide();
  }

  function closeOptionsMenu() {
    $optionsMenu.removeClass('is-open');
    $optionsBtn.attr('aria-expanded', 'false');
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + s.toString().padStart(2, '0');
  }

  return {
    init, playTrack, togglePlayPause, getCurrentTrack, getIsPlaying, updateFavoriteBtn,
  };
}(jQuery));

