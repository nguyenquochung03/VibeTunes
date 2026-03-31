# VibeTunes — Search Feature

## Tổng quan

Feature tìm kiếm cho phép người dùng nhập từ khóa (tên bài hát, nghệ sĩ, album) và nhận về danh sách bài hát từ iTunes API, hiển thị dạng grid card.

---

## HTML Structure

### Search Bar (trong header)
```html
<!-- Trong _Layout.cshtml, bên trong .site-header -->
<div class="search-bar-wrapper">
  <div class="search-bar" role="search">
    <i data-lucide="search" class="search-icon" aria-hidden="true"></i>
    <input
      type="search"
      id="search-input"
      class="search-input"
      placeholder="Tìm kiếm bài hát, nghệ sĩ, album..."
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      aria-label="Tìm kiếm bài hát"
      maxlength="100"
    />
    <button
      class="search-clear btn-icon"
      id="search-clear-btn"
      aria-label="Xóa tìm kiếm"
      style="display: none;"
    >
      <i data-lucide="x"></i>
    </button>
  </div>
</div>
```

### Main Content Area (trong Index.cshtml)
```html
<main class="main-content" id="main-content">

  <!-- Search Results Header -->
  <div class="results-header" id="results-header" style="display: none;">
    <h2 class="results-title">
      Kết quả cho "<span id="results-query"></span>"
    </h2>
    <span class="results-count" id="results-count"></span>
  </div>

  <!-- Loading State -->
  <div class="loading-state" id="loading-state" style="display: none;" aria-live="polite" aria-busy="true">
    <i data-lucide="loader-2" class="animate-spin"></i>
    <span>Đang tìm kiếm...</span>
  </div>

  <!-- Error State -->
  <div class="error-state" id="error-state" style="display: none;" role="alert">
    <i data-lucide="wifi-off"></i>
    <p id="error-message">Đã xảy ra lỗi</p>
    <button class="btn-primary" id="retry-btn">Thử lại</button>
  </div>

  <!-- Empty State -->
  <div class="empty-state" id="empty-state" style="display: none;">
    <i data-lucide="search-x"></i>
    <p class="empty-title">Không tìm thấy kết quả</p>
    <p class="empty-desc" id="empty-desc">Thử tìm với từ khóa khác</p>
  </div>

  <!-- Welcome State (mặc định khi chưa tìm kiếm) -->
  <div class="welcome-state" id="welcome-state">
    <i data-lucide="music-2"></i>
    <h1 class="welcome-title">Khám phá âm nhạc</h1>
    <p class="welcome-desc">Nhập tên bài hát, nghệ sĩ hoặc album để bắt đầu</p>
  </div>

  <!-- Song Grid -->
  <div class="song-grid" id="song-grid" role="list" aria-label="Danh sách bài hát">
    <!-- Song cards rendered by JS -->
  </div>

</main>
```

---

## Song Card HTML Template

Mỗi card được render bởi JavaScript — hàm `createSongCard(track)`:

```javascript
function createSongCard(track, index) {
  const isFav = VibeTunes.favorites.isFavorite(track.id);

  return `
    <article
      class="song-card"
      role="listitem"
      data-track-id="${track.id}"
      style="animation-delay: ${index * 40}ms"
    >
      <div class="song-card__artwork-wrapper">
        <img
          src="${track.artwork}"
          alt="Album art: ${escapeHtml(track.album || track.title)}"
          class="song-card__artwork"
          loading="lazy"
          onerror="this.src='/images/placeholder-album.png'"
        />
        <button
          class="song-card__play-btn"
          data-track-id="${track.id}"
          aria-label="Phát bài ${escapeHtml(track.title)}"
        >
          <i data-lucide="play" class="play-icon"></i>
          <i data-lucide="pause" class="pause-icon" style="display:none;"></i>
        </button>
      </div>

      <div class="song-card__info">
        <h3 class="song-card__title" title="${escapeHtml(track.title)}">
          ${escapeHtml(track.title)}
        </h3>
        <p class="song-card__artist" title="${escapeHtml(track.artist)}">
          ${escapeHtml(track.artist)}
        </p>

        <div class="song-card__meta">
          ${track.genre ? `<span class="badge badge-genre">${escapeHtml(track.genre)}</span>` : ''}
          <button
            class="btn-favorite ${isFav ? 'is-favorited' : ''}"
            data-track-id="${track.id}"
            aria-label="${isFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} bài ${escapeHtml(track.title)}"
            aria-pressed="${isFav}"
          >
            <i data-lucide="heart"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}
```

---

## Search Module — `search.js`

```javascript
// wwwroot/js/search.js
window.VibeTunes = window.VibeTunes || {};

window.VibeTunes.search = (function ($) {
  'use strict';

  // State
  let currentQuery = '';
  let currentTracks = [];
  let searchTimer = null;
  const DEBOUNCE_DELAY = 400; // ms
  const MIN_QUERY_LENGTH = 2;

  /**
   * Khởi tạo search module — gọi từ app.js khi DOM ready
   */
  function init() {
    bindEvents();
  }

  function bindEvents() {
    const $input = $('#search-input');
    const $clearBtn = $('#search-clear-btn');
    const $retryBtn = $('#retry-btn');

    // Search on input
    $input.on('input', handleInput);

    // Search on Enter
    $input.on('keydown', function(e) {
      if (e.key === 'Enter') {
        clearTimeout(searchTimer);
        performSearch($input.val().trim());
      }
      // ESC clears search
      if (e.key === 'Escape') {
        clearSearch();
        $input.blur();
      }
    });

    // Clear button
    $clearBtn.on('click', function() {
      clearSearch();
      $input.focus();
    });

    // Toggle clear button visibility
    $input.on('input', function() {
      $clearBtn.toggle($(this).val().length > 0);
    });

    // Retry button
    $retryBtn.on('click', function() {
      if (currentQuery) performSearch(currentQuery);
    });
  }

  function handleInput() {
    const query = $('#search-input').val().trim();

    clearTimeout(searchTimer);

    if (query.length < MIN_QUERY_LENGTH) {
      if (query.length === 0) {
        showWelcomeState();
      }
      return;
    }

    showLoadingState();

    searchTimer = setTimeout(function() {
      performSearch(query);
    }, DEBOUNCE_DELAY);
  }

  function performSearch(query) {
    if (!query || query === currentQuery) return;
    currentQuery = query;

    showLoadingState();
    hideAllStates();
    $('#loading-state').show();

    VibeTunes.api.searchTracks(query, { limit: 30 })
      .then(function(tracks) {
        currentTracks = tracks;
        hideAllStates();

        if (tracks.length === 0) {
          showEmptyState(query);
        } else {
          showResults(query, tracks);
        }
      })
      .catch(function(error) {
        hideAllStates();
        showErrorState(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      });
  }

  function showResults(query, tracks) {
    $('#results-query').text(query);
    $('#results-count').text(tracks.length + ' bài hát');
    $('#results-header').show();

    const $grid = $('#song-grid');
    $grid.empty();

    const cardsHtml = tracks.map((track, i) => createSongCard(track, i)).join('');
    $grid.html(cardsHtml);

    // Re-init Lucide icons cho các card mới
    lucide.createIcons();

    // Bind card events
    bindCardEvents($grid);

    // Update playing state nếu đang có track
    updatePlayingState();
  }

  function bindCardEvents($container) {
    // Play button click
    $container.on('click', '.song-card__play-btn', function(e) {
      e.stopPropagation();
      const trackId = parseInt($(this).data('track-id'));
      const track = findTrackById(trackId);
      if (track) {
        VibeTunes.player.playTrack(track);
      }
    });

    // Card click (cũng play)
    $container.on('click', '.song-card__artwork-wrapper', function() {
      const trackId = parseInt($(this).closest('.song-card').data('track-id'));
      const track = findTrackById(trackId);
      if (track) VibeTunes.player.playTrack(track);
    });

    // Favorite button
    $container.on('click', '.btn-favorite', function(e) {
      e.stopPropagation();
      const trackId = parseInt($(this).data('track-id'));
      const track = findTrackById(trackId);
      if (track) {
        VibeTunes.favorites.toggle(track);
        updateFavoriteButton($(this), trackId);
      }
    });
  }

  function updateFavoriteButton($btn, trackId) {
    const isFav = VibeTunes.favorites.isFavorite(trackId);
    $btn.toggleClass('is-favorited', isFav);
    $btn.attr('aria-pressed', isFav.toString());
    $btn.attr('aria-label', isFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích');
  }

  /**
   * Cập nhật visual state của card đang play
   * Được gọi bởi player.js khi track thay đổi
   */
  function updatePlayingState(playingTrackId) {
    $('.song-card').removeClass('is-playing');
    $('.song-card__play-btn .play-icon').show();
    $('.song-card__play-btn .pause-icon').hide();

    if (playingTrackId) {
      const $card = $(`.song-card[data-track-id="${playingTrackId}"]`);
      $card.addClass('is-playing');
      $card.find('.play-icon').hide();
      $card.find('.pause-icon').show();
    }
  }

  function findTrackById(id) {
    return currentTracks.find(t => t.id === id) ||
           VibeTunes.favorites.getById(id);
  }

  function clearSearch() {
    currentQuery = '';
    currentTracks = [];
    $('#search-input').val('');
    $('#search-clear-btn').hide();
    clearTimeout(searchTimer);
    hideAllStates();
    showWelcomeState();
  }

  // --- State display helpers ---

  function hideAllStates() {
    $('#loading-state, #error-state, #empty-state, #welcome-state, #results-header').hide();
    $('#song-grid').empty();
  }

  function showLoadingState() {
    hideAllStates();
    $('#loading-state').show();
  }

  function showEmptyState(query) {
    $('#empty-desc').text(`Không tìm thấy kết quả cho "${query}"`);
    $('#empty-state').show();
  }

  function showErrorState(message) {
    $('#error-message').text(message);
    $('#error-state').show();
  }

  function showWelcomeState() {
    $('#welcome-state').show();
  }

  // Utility
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function createSongCard(track, index) {
    const isFav = VibeTunes.favorites.isFavorite(track.id);
    return `
      <article class="song-card" role="listitem" data-track-id="${track.id}" style="animation-delay:${index * 40}ms">
        <div class="song-card__artwork-wrapper">
          <img src="${track.artwork}" alt="${escapeHtml(track.album || track.title)}"
            class="song-card__artwork" loading="lazy"
            onerror="this.src='/images/placeholder-album.png'">
          <button class="song-card__play-btn" data-track-id="${track.id}"
            aria-label="Phát bài ${escapeHtml(track.title)}">
            <i data-lucide="play" class="play-icon"></i>
            <i data-lucide="pause" class="pause-icon" style="display:none;"></i>
          </button>
        </div>
        <div class="song-card__info">
          <h3 class="song-card__title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</h3>
          <p class="song-card__artist">${escapeHtml(track.artist)}</p>
          <div class="song-card__meta">
            ${track.genre ? `<span class="badge">${escapeHtml(track.genre)}</span>` : ''}
            <button class="btn-favorite ${isFav ? 'is-favorited' : ''}"
              data-track-id="${track.id}"
              aria-pressed="${isFav}"
              aria-label="${isFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}">
              <i data-lucide="heart"></i>
            </button>
          </div>
        </div>
      </article>`;
  }

  // Public API
  return {
    init,
    updatePlayingState,
    getCurrentTracks: () => currentTracks,
  };

}(jQuery));
```

---

## CSS cho Search Components

```css
/* Search Bar */
.search-bar-wrapper {
  flex: 1;
  max-width: 560px;
  margin: 0 var(--vt-space-6);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: var(--vt-space-2);
  background: var(--vt-bg-subtle);
  border: 1.5px solid var(--vt-border);
  border-radius: var(--vt-radius-full);
  padding: var(--vt-space-2) var(--vt-space-3);
  transition: border-color var(--vt-transition-fast),
              box-shadow var(--vt-transition-fast);
}

.search-bar:focus-within {
  border-color: var(--vt-border-focus);
  box-shadow: 0 0 0 3px rgba(var(--vt-primary-rgb), 0.12);
  background: var(--vt-bg-surface);
}

.search-icon { color: var(--vt-text-muted); flex-shrink: 0; }

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--vt-font-base);
  font-size: 14px;
  color: var(--vt-text-primary);
  outline: none;
}
.search-input::placeholder { color: var(--vt-text-muted); }

/* Song Card */
.song-card__artwork-wrapper {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}

.song-card__artwork {
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform var(--vt-transition-slow);
}

.song-card:hover .song-card__artwork {
  transform: scale(1.04);
}

.song-card__play-btn {
  position: absolute;
  inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  opacity: 0;
  transition: opacity var(--vt-transition-normal);
  border: none; cursor: pointer;
  color: white;
}

.song-card:hover .song-card__play-btn,
.song-card.is-playing .song-card__play-btn {
  opacity: 1;
}

.song-card__play-btn svg { width: 36px; height: 36px; }

.song-card__info {
  padding: var(--vt-space-3);
}

.song-card__title {
  font-size: 14px; font-weight: 600;
  color: var(--vt-text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0 0 var(--vt-space-1);
}

.song-card__artist {
  font-size: 12px;
  color: var(--vt-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 var(--vt-space-2);
}

.song-card__meta {
  display: flex; align-items: center;
  justify-content: space-between;
}

/* States */
.welcome-state, .empty-state, .error-state, .loading-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: var(--vt-space-3);
  padding: var(--vt-space-12) var(--vt-space-6);
  text-align: center;
  color: var(--vt-text-muted);
}

.welcome-title { font-size: 22px; font-weight: 700; color: var(--vt-text-primary); }
.welcome-desc, .empty-desc { font-size: 14px; color: var(--vt-text-secondary); }
```
