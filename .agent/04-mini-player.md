# VibeTunes — Mini Player & Audio Feature

## Tổng quan

Mini Player là component **cố định ở footer** (`position: fixed; bottom: 0`), hiển thị thông tin bài hát đang phát, controls phát/tạm dừng, và progress bar. Sử dụng HTML5 `<audio>` element để stream preview URL từ iTunes (~30 giây).

---

## HTML Structure

```html
<!-- Đặt trong _Layout.cshtml, trước </body> -->
<!-- Luôn có trong DOM, ẩn bằng class .is-hidden khi chưa có bài -->

<div id="mini-player" class="mini-player is-hidden" role="region" aria-label="Trình phát nhạc">

  <!-- Progress Bar (click để seek) -->
  <div class="player-progress" id="player-progress" role="slider"
    aria-label="Tiến trình phát" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
    <div class="player-progress__bar" id="player-progress-bar"></div>
  </div>

  <div class="player-body">

    <!-- Track Info -->
    <div class="player-track-info">
      <img
        id="player-artwork"
        src="/images/placeholder-album.png"
        alt="Album art"
        class="player-artwork"
        onerror="this.src='/images/placeholder-album.png'"
      />
      <div class="player-track-text">
        <p class="player-track-title" id="player-title">-</p>
        <p class="player-track-artist" id="player-artist">-</p>
      </div>
      <button
        class="btn-favorite btn-icon"
        id="player-favorite-btn"
        aria-label="Thêm vào yêu thích"
        aria-pressed="false"
      >
        <i data-lucide="heart"></i>
      </button>
    </div>

    <!-- Controls -->
    <div class="player-controls">
      <span class="player-time" id="player-current-time">0:00</span>

      <button class="btn-icon player-btn-play" id="player-play-btn" aria-label="Phát">
        <i data-lucide="play" id="player-play-icon"></i>
        <i data-lucide="pause" id="player-pause-icon" style="display:none;"></i>
      </button>

      <span class="player-time" id="player-duration">0:30</span>
    </div>

    <!-- Volume -->
    <div class="player-volume">
      <button class="btn-icon" id="player-mute-btn" aria-label="Tắt tiếng">
        <i data-lucide="volume-2" id="player-volume-icon"></i>
        <i data-lucide="volume-x" id="player-mute-icon" style="display:none;"></i>
      </button>
      <input
        type="range"
        id="player-volume-slider"
        class="volume-slider"
        min="0" max="1" step="0.05" value="0.8"
        aria-label="Âm lượng"
      />
    </div>

  </div>

  <!-- Hidden audio element -->
  <audio id="audio-engine" preload="none"></audio>
</div>
```

---

## Player Module — `player.js`

```javascript
// wwwroot/js/player.js
window.VibeTunes = window.VibeTunes || {};

window.VibeTunes.player = (function ($) {
  'use strict';

  // ── State ──
  let currentTrack = null;
  let isPlaying = false;
  let isSeeking = false;

  // ── DOM refs ──
  let $player, $audio, $playBtn, $playIcon, $pauseIcon;
  let $progressBar, $progressTrack;
  let $title, $artist, $artwork;
  let $currentTime, $duration;
  let $volumeSlider, $muteBtn, $volumeIcon, $muteIcon;
  let $favBtn;

  /**
   * Khởi tạo player — gọi từ app.js
   */
  function init() {
    $player       = $('#mini-player');
    $audio        = $('#audio-engine')[0]; // native element
    $playBtn      = $('#player-play-btn');
    $playIcon     = $('#player-play-icon');
    $pauseIcon    = $('#player-pause-icon');
    $progressBar  = $('#player-progress-bar');
    $progressTrack = $('#player-progress');
    $title        = $('#player-title');
    $artist       = $('#player-artist');
    $artwork      = $('#player-artwork');
    $currentTime  = $('#player-current-time');
    $duration     = $('#player-duration');
    $volumeSlider = $('#player-volume-slider');
    $muteBtn      = $('#player-mute-btn');
    $volumeIcon   = $('#player-volume-icon');
    $muteIcon     = $('#player-mute-icon');
    $favBtn       = $('#player-favorite-btn');

    // Restore volume
    $audio.volume = parseFloat(localStorage.getItem('vibetunes_volume') || '0.8');
    $volumeSlider.val($audio.volume);

    bindAudioEvents();
    bindUIEvents();
  }

  // ──────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────

  /**
   * Phát một track mới hoặc toggle play/pause nếu cùng track
   * @param {Track} track
   */
  function playTrack(track) {
    if (!track || !track.previewUrl) {
      showToast('Bài hát này không có bản preview.', 'warning');
      return;
    }

    // Toggle nếu cùng track
    if (currentTrack && currentTrack.id === track.id) {
      togglePlayPause();
      return;
    }

    // Load track mới
    currentTrack = track;
    $audio.src = track.previewUrl;
    $audio.load();

    // Update UI ngay lập tức (không đợi canplay)
    updateTrackInfo(track);
    showPlayer();

    $audio.play()
      .then(() => {
        setPlayingState(true);
        // Notify search module update card UI
        if (VibeTunes.search) {
          VibeTunes.search.updatePlayingState(track.id);
        }
        if (VibeTunes.favorites && VibeTunes.favorites.updatePlayingState) {
          VibeTunes.favorites.updatePlayingState(track.id);
        }
      })
      .catch(err => {
        console.error('[Player] Playback error:', err);
        showToast('Không thể phát bài hát này.', 'danger');
        setPlayingState(false);
      });

    // Update favorite button
    updateFavoriteBtn();
  }

  function togglePlayPause() {
    if (!currentTrack) return;
    if ($audio.paused) {
      $audio.play().then(() => setPlayingState(true));
    } else {
      $audio.pause();
      setPlayingState(false);
    }
  }

  function getCurrentTrack() { return currentTrack; }
  function getIsPlaying() { return isPlaying; }

  // ──────────────────────────────────────────────
  // AUDIO EVENT LISTENERS
  // ──────────────────────────────────────────────

  function bindAudioEvents() {
    const audio = $audio;

    // Cập nhật progress bar
    audio.addEventListener('timeupdate', function () {
      if (isSeeking) return;
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      $progressBar.css('width', pct + '%');
      $progressTrack.attr('aria-valuenow', Math.round(pct));
      $currentTime.text(formatTime(audio.currentTime));
    });

    // Khi metadata loaded (biết duration)
    audio.addEventListener('loadedmetadata', function () {
      $duration.text(formatTime(audio.duration));
    });

    // Khi bài kết thúc
    audio.addEventListener('ended', function () {
      setPlayingState(false);
      $progressBar.css('width', '0%');
      $currentTime.text('0:00');
      // Notify cards
      if (VibeTunes.search) VibeTunes.search.updatePlayingState(null);
    });

    // Lỗi audio
    audio.addEventListener('error', function () {
      showToast('Lỗi phát nhạc. Vui lòng thử bài khác.', 'danger');
      setPlayingState(false);
    });

    // Loading indicator
    audio.addEventListener('waiting', function () {
      $playBtn.addClass('is-loading');
    });

    audio.addEventListener('canplay', function () {
      $playBtn.removeClass('is-loading');
    });
  }

  // ──────────────────────────────────────────────
  // UI EVENT LISTENERS
  // ──────────────────────────────────────────────

  function bindUIEvents() {
    // Play/Pause button
    $playBtn.on('click', togglePlayPause);

    // Progress bar — click to seek
    $progressTrack.on('click', function (e) {
      if (!$audio.duration) return;
      const rect = this.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      $audio.currentTime = pct * $audio.duration;
    });

    // Progress bar — drag to seek
    $progressTrack.on('mousedown touchstart', function (e) {
      isSeeking = true;
      $(document).on('mousemove touchmove.seek', function (ev) {
        const rect = $progressTrack[0].getBoundingClientRect();
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        $progressBar.css('width', (pct * 100) + '%');
        if ($audio.duration) $audio.currentTime = pct * $audio.duration;
      });
      $(document).one('mouseup touchend', function () {
        isSeeking = false;
        $(document).off('mousemove touchmove.seek');
      });
    });

    // Volume slider
    $volumeSlider.on('input', function () {
      const vol = parseFloat($(this).val());
      $audio.volume = vol;
      $audio.muted = false;
      localStorage.setItem('vibetunes_volume', vol.toString());
      updateVolumeIcon(vol);
    });

    // Mute button
    $muteBtn.on('click', function () {
      $audio.muted = !$audio.muted;
      updateVolumeIcon($audio.muted ? 0 : $audio.volume);
    });

    // Favorite button in player
    $favBtn.on('click', function () {
      if (!currentTrack) return;
      VibeTunes.favorites.toggle(currentTrack);
      updateFavoriteBtn();
    });
  }

  // ──────────────────────────────────────────────
  // UI HELPERS
  // ──────────────────────────────────────────────

  function updateTrackInfo(track) {
    $title.text(track.title);
    $artist.text(track.artist);
    $artwork
      .attr('src', track.artworkSmall || track.artwork)
      .attr('alt', track.album || track.title);
    $duration.text('0:30'); // iTunes preview luôn là 30s
    $currentTime.text('0:00');
    $progressBar.css('width', '0%');
  }

  function updateFavoriteBtn() {
    if (!currentTrack) return;
    const isFav = VibeTunes.favorites.isFavorite(currentTrack.id);
    $favBtn.toggleClass('is-favorited', isFav);
    $favBtn.attr('aria-pressed', isFav.toString());
    $favBtn.attr('aria-label', isFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích');
  }

  function setPlayingState(playing) {
    isPlaying = playing;
    $playIcon.toggle(!playing);
    $pauseIcon.toggle(playing);
    $playBtn.attr('aria-label', playing ? 'Tạm dừng' : 'Phát');
  }

  function updateVolumeIcon(vol) {
    const muted = $audio.muted || vol === 0;
    $volumeIcon.toggle(!muted);
    $muteIcon.toggle(muted);
  }

  function showPlayer() {
    $player.removeClass('is-hidden').addClass('is-visible');
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Public
  return { init, playTrack, togglePlayPause, getCurrentTrack, getIsPlaying, updateFavoriteBtn };

}(jQuery));
```

---

## CSS cho Mini Player

```css
/* player.css */

.mini-player {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 72px;
  background: var(--vt-bg-surface);
  border-top: 1px solid var(--vt-border);
  box-shadow: var(--vt-shadow-player);
  z-index: var(--vt-z-player);
  transition: transform var(--vt-transition-normal);
}

.mini-player.is-hidden {
  transform: translateY(100%);
  pointer-events: none;
}

.mini-player.is-visible {
  transform: translateY(0);
}

/* Progress bar (thin strip at top of player) */
.player-progress {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--vt-bg-subtle);
  cursor: pointer;
}

.player-progress:hover { height: 5px; }

.player-progress__bar {
  height: 100%;
  background: var(--vt-primary);
  width: 0%;
  transition: width 0.2s linear;
  border-radius: 0 var(--vt-radius-full) var(--vt-radius-full) 0;
}

/* Player body layout: 3 columns */
.player-body {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 100%;
  padding: 0 var(--vt-space-5);
  gap: var(--vt-space-4);
}

/* Track info (left column) */
.player-track-info {
  display: flex;
  align-items: center;
  gap: var(--vt-space-3);
  min-width: 0; /* allow truncation */
}

.player-artwork {
  width: 44px; height: 44px;
  border-radius: var(--vt-radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}

.player-track-text {
  min-width: 0;
}

.player-track-title {
  font-size: 13px; font-weight: 600;
  color: var(--vt-text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin: 0;
}

.player-track-artist {
  font-size: 11px;
  color: var(--vt-text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin: 0;
}

/* Controls (center column) */
.player-controls {
  display: flex;
  align-items: center;
  gap: var(--vt-space-3);
}

.player-time {
  font-size: 11px;
  color: var(--vt-text-muted);
  font-variant-numeric: tabular-nums;
  min-width: 28px;
  text-align: center;
}

.player-btn-play {
  width: 40px; height: 40px;
  background: var(--vt-primary);
  color: white;
  border: none;
  border-radius: var(--vt-radius-full);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background var(--vt-transition-fast),
              transform var(--vt-transition-fast);
}

.player-btn-play:hover { background: var(--vt-primary-hover); transform: scale(1.05); }
.player-btn-play:active { transform: scale(0.95); }

.player-btn-play.is-loading {
  background: var(--vt-bg-subtle);
  cursor: wait;
}

/* Volume (right column) */
.player-volume {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--vt-space-2);
}

.volume-slider {
  width: 80px;
  accent-color: var(--vt-primary);
  cursor: pointer;
}

/* Mobile: hide volume, simplify */
@media (max-width: 640px) {
  .player-body {
    grid-template-columns: 1fr auto;
    padding: 0 var(--vt-space-4);
  }

  .player-volume { display: none; }

  .player-track-title { font-size: 12px; }
  .player-track-artist { font-size: 11px; }
}
```

---

## Behavior Rules

| Scenario | Expected Behavior |
|---|---|
| Click Play trên card đang phát | Toggle pause/play (không reload audio) |
| Click Play trên card khác | Stop current, load + play new track |
| `previewUrl` là `null` hoặc undefined | Show toast "Bài hát này không có bản preview", không thay đổi player |
| Audio error (network, format) | Show toast error, reset playing state |
| Trang refresh | Player ẩn (không auto-play khi load trang) |
| Volume thay đổi | Persist vào `localStorage` key `vibetunes_volume` |
| Track kết thúc | Reset progress, đổi icon về play, update card UI |

---

## Toast Notification Helper

```javascript
// Đặt trong app.js hoặc một util.js riêng
window.VibeTunes.toast = (function () {
  function show(message, type = 'success') {
    const id = 'toast-' + Date.now();
    const colors = {
      success: 'var(--vt-success)',
      danger:  'var(--vt-danger)',
      warning: 'var(--vt-warning)',
    };
    const icons = {
      success: 'check-circle',
      danger:  'alert-circle',
      warning: 'alert-triangle',
    };

    const $toast = $(`
      <div class="toast" id="${id}" style="color: ${colors[type]}">
        <i data-lucide="${icons[type]}"></i>
        <span>${message}</span>
      </div>
    `);

    $('body').append($toast);
    lucide.createIcons({ nodes: [$toast[0]] });

    // Auto dismiss
    setTimeout(() => {
      $toast.css({ opacity: 0, transform: 'translateX(100%)' });
      setTimeout(() => $toast.remove(), 300);
    }, 3000);
  }

  return { show };
}());

// Shorthand
function showToast(msg, type) { VibeTunes.toast.show(msg, type); }
```
