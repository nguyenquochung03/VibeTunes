// wwwroot/js/search.js
window.VibeTunes = window.VibeTunes || {};

window.VibeTunes.search = (function ($) {
  'use strict';

  let currentQuery = '';
  let currentTracks = [];
  let currentViewTracks = [];
  let currentPage = 1;
  let currentSort = 'default';
  let activeMoodQuery = '';
  const PAGE_SIZE = 12;
  /** Số ô trang tối đa trên desktop (trong khoảng 7–10, kèm đầu/cuối + …) */
  const DESKTOP_PAGE_WINDOW = 9;
  let searchTimer = null;
  const DEBOUNCE_DELAY = 400;
  const MIN_QUERY_LENGTH = 2;

  function ensureExploreShell(pushState) {
    if (window.VibeTunes.shell && typeof window.VibeTunes.shell.ensureExplorePanel === 'function') {
      window.VibeTunes.shell.ensureExplorePanel({ pushState: pushState !== false });
    }
  }

  const SORT_LABELS = {
    default: 'Mặc định',
    'release-desc': 'Ngày phát hành mới nhất',
    'title-asc': 'Tên bài hát A-Z',
    'artist-asc': 'Nghệ sĩ A-Z',
  };

  function setSortUiValue(value) {
    $('#sort-trigger-label').text(SORT_LABELS[value] || SORT_LABELS.default);
    $('.sort-option').attr('aria-selected', 'false');
    $('.sort-option[data-value="' + value + '"]').attr('aria-selected', 'true');
  }

  function closeSortDropdown() {
    $('#sort-dropdown').removeClass('is-open');
    $('#sort-trigger').attr('aria-expanded', 'false');
  }

  function showPageLoadingBar() {
    $('#page-loading-bar').addClass('is-active');
  }

  function hidePageLoadingBar() {
    $('#page-loading-bar').removeClass('is-active');
  }

  function init() {
    bindEvents();
  }

  function bindEvents() {
    const $input = $('#search-input');
    const $clearBtn = $('#search-clear-btn');
    const $retryBtn = $('#retry-btn');
    const $prevBtn = $('#pagination-prev');
    const $nextBtn = $('#pagination-next');
    const $pages = $('#pagination-pages');
    const $sortDropdown = $('#sort-dropdown');
    const $sortTrigger = $('#sort-trigger');
    const $sortMenu = $('#sort-menu');
    const $moodBar = $('#mood-bar');

    $input.on('input', handleInput);

    $input.on('keydown', function (e) {
      if (e.key === 'Enter') {
        clearTimeout(searchTimer);
        const raw = $input.val().trim();
        if (
          raw.length >= MIN_QUERY_LENGTH &&
          window.VibeTunes.shell &&
          typeof window.VibeTunes.shell.getViewFromPath === 'function' &&
          window.VibeTunes.shell.getViewFromPath() === 'favorites'
        ) {
          window.VibeTunes.shell.showView('explore', { pushState: false });
          history.replaceState({ vtView: 'explore' }, '', '/?q=' + encodeURIComponent(raw));
        }
        performSearch(raw, true);
      }
      if (e.key === 'Escape') {
        clearSearch();
        $input.blur();
      }
    });

    $clearBtn.on('click', function () {
      clearSearch();
      $input.focus();
    });

    $input.on('input', function () {
      $clearBtn.toggle($(this).val().length > 0);
    });

    $retryBtn.on('click', function () {
      if (currentQuery) performSearch(currentQuery, true);
    });

    $prevBtn.on('click', function () {
      if (currentPage > 1) {
        currentPage -= 1;
        renderCurrentPage();
      }
    });

    $nextBtn.on('click', function () {
      const totalPages = getTotalPages();
      if (currentPage < totalPages) {
        currentPage += 1;
        renderCurrentPage();
      }
    });

    $pages.on('click', '.pagination-page', function () {
      const page = parseInt($(this).data('page'));
      if (!isNaN(page) && page !== currentPage) {
        currentPage = page;
        renderCurrentPage();
      }
    });

    $sortTrigger.on('click', function (e) {
      e.stopPropagation();
      const isOpen = $sortDropdown.hasClass('is-open');
      if (isOpen) {
        closeSortDropdown();
      } else {
        $sortDropdown.addClass('is-open');
        $sortTrigger.attr('aria-expanded', 'true');
      }
    });

    $sortMenu.on('click', '.sort-option', function () {
      const val = $(this).data('value');
      if (!val) return;
      currentSort = val;
      setSortUiValue(val);
      closeSortDropdown();
      currentPage = 1;
      renderCurrentPage();
    });

    $(document).on('click', function (e) {
      if (!$(e.target).closest('#sort-dropdown').length) {
        closeSortDropdown();
      }
    });

    $(document).on('keydown', function (e) {
      if (e.key === 'Escape') closeSortDropdown();
    });

    $moodBar.on('click', '.mood-chip', function () {
      const query = String($(this).data('query') || '').trim();
      if (!query) return;
      activeMoodQuery = query;
      $('.mood-chip').removeClass('is-active');
      $(this).addClass('is-active');
      $('#search-input').val(query);
      $('#search-clear-btn').show();
      performSearch(query, true);
    });
  }

  function handleInput() {
    const query = $('#search-input').val().trim();
    clearTimeout(searchTimer);

    if (query.length < MIN_QUERY_LENGTH) {
      if (query.length === 0) {
        showWelcomeState();
        currentQuery = '';
        currentTracks = [];
        hidePageLoadingBar();
      }
      return;
    }

    ensureExploreShell(true);
    showLoadingState();
    searchTimer = setTimeout(function () {
      performSearch(query, true);
    }, DEBOUNCE_DELAY);
  }

  function performSearch(query, forceRefresh) {
    if (!query || (query === currentQuery && !forceRefresh)) return;
    ensureExploreShell(true);
    currentQuery = query;
    currentPage = 1;

    showLoadingState();

    window.VibeTunes.api
      .searchTracks(query, { limit: 50 })
      .then(function (tracks) {
        hidePageLoadingBar();
        currentTracks = tracks;
        currentViewTracks = tracks.slice();
        hideAllStates();

        if (tracks.length === 0) {
          showEmptyState(query);
        } else {
          showResults(query);
        }
      })
      .catch(function (error) {
        hidePageLoadingBar();
        hideAllStates();
        showErrorState(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      });
  }

  function showResults(query) {
    $('#results-query').text(query);
    $('#results-count').text(currentTracks.length + ' bài hát');
    $('#results-header').show();

    renderCurrentPage();
  }

  function getSortedTracks(tracks) {
    const sorted = tracks.slice();
    if (currentSort === 'release-desc') {
      sorted.sort(function (a, b) {
        return (new Date(b.releaseDateRaw || b.releaseDate || 0)).getTime() - (new Date(a.releaseDateRaw || a.releaseDate || 0)).getTime();
      });
    } else if (currentSort === 'title-asc') {
      sorted.sort(function (a, b) { return String(a.title).localeCompare(String(b.title), 'vi'); });
    } else if (currentSort === 'artist-asc') {
      sorted.sort(function (a, b) { return String(a.artist).localeCompare(String(b.artist), 'vi'); });
    }
    return sorted;
  }

  function renderCurrentPage() {
    const $grid = $('#song-grid');
    $grid.empty();

    currentViewTracks = getSortedTracks(currentTracks);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageTracks = currentViewTracks.slice(start, start + PAGE_SIZE);

    const cardsHtml = pageTracks
      .map(function (track, i) { return createSongCard(track, start + i); })
      .join('');

    $grid.html(cardsHtml);
    lucide.createIcons();
    bindCardEvents($grid);
    updatePaginationUI();
    updatePlayingState();
  }

  function getTotalPages() {
    return Math.max(1, Math.ceil(currentViewTracks.length / PAGE_SIZE));
  }

  function updatePaginationUI() {
    const totalPages = getTotalPages();
    const $pagination = $('#search-pagination');
    const $prevBtn = $('#pagination-prev');
    const $nextBtn = $('#pagination-next');
    const $pages = $('#pagination-pages');

    if (currentViewTracks.length <= PAGE_SIZE) {
      $pagination.hide();
      return;
    }

    $pagination.show();
    $prevBtn.prop('disabled', currentPage <= 1);
    $nextBtn.prop('disabled', currentPage >= totalPages);

    const windowSize = Math.min(DESKTOP_PAGE_WINDOW, totalPages);
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    let html = '';
    if (start > 1) {
      html += createPageBtn(1);
      if (start > 2) html += `<span class="pagination-ellipsis" aria-hidden="true">…</span>`;
    }

    for (let p = start; p <= end; p++) {
      html += createPageBtn(p);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) html += `<span class="pagination-ellipsis" aria-hidden="true">…</span>`;
      html += createPageBtn(totalPages);
    }

    $pages.html(html);
    $('#pagination-mobile-summary').text('Trang ' + currentPage + ' / ' + totalPages);
  }

  function createPageBtn(page) {
    const active = page === currentPage ? ' is-active' : '';
    return `<button type="button" class="pagination-page${active}" data-page="${page}" aria-label="Trang ${page}"${active ? ' aria-current="page"' : ''}>${page}</button>`;
  }

  function bindCardEvents($container) {
    // Khi render lại grid (phân trang / sort / search), bindCardEvents có thể được gọi nhiều lần.
    // Nếu không off trước, jQuery sẽ gắn trùng listener => click 1 lần nhưng toggle chạy nhiều lần.
    $container.off('click.vtSongPlay', '.song-card__play-btn');
    $container.off('click.vtSongArtwork', '.song-card__artwork-wrapper');
    $container.off('click.vtSongFavorite', '.btn-favorite');

    $container.on('click.vtSongPlay', '.song-card__play-btn', function (e) {
      e.stopPropagation();
      const trackId = parseInt($(this).data('track-id'));
      const track = findTrackById(trackId);
      if (track) window.VibeTunes.player.playTrack(track);
    });

    $container.on('click.vtSongArtwork', '.song-card__artwork-wrapper', function () {
      const trackId = parseInt($(this).closest('.song-card').data('track-id'));
      const track = findTrackById(trackId);
      if (track) window.VibeTunes.player.playTrack(track);
    });

    $container.on('click.vtSongFavorite', '.btn-favorite', function (e) {
      e.stopPropagation();
      const trackId = parseInt($(this).data('track-id'));
      const track = findTrackById(trackId);
      if (track) {
        window.VibeTunes.favorites.toggle(track);
        updateFavoriteButton($(this), trackId);
      }
    });
  }

  function updateFavoriteButton($btn, trackId) {
    const isFav = window.VibeTunes.favorites.isFavorite(trackId);
    $btn.toggleClass('is-favorited', isFav);
    $btn.attr('aria-pressed', isFav.toString());
    $btn.attr('aria-label', isFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích');
  }

  function updatePlayingState() {
    const track = window.VibeTunes.player.getCurrentTrack();
    const playing = window.VibeTunes.player.getIsPlaying();
    $('.song-card').removeClass('is-playing');
    if (track && playing) {
      $('.song-card[data-track-id="' + track.id + '"]').addClass('is-playing');
    }
  }

  function findTrackById(id) {
    return (
      currentTracks.find(function (t) { return t.id === id; }) ||
      window.VibeTunes.favorites.getById(id)
    );
  }

  function clearSearch() {
    currentQuery = '';
    currentTracks = [];
    currentViewTracks = [];
    currentPage = 1;
    currentSort = 'default';
    $('#search-input').val('');
    $('#search-clear-btn').hide();
    currentSort = 'default';
    setSortUiValue('default');
    $('.mood-chip').removeClass('is-active');
    activeMoodQuery = '';
    clearTimeout(searchTimer);
    hidePageLoadingBar();
    hideAllStates();
    showWelcomeState();
  }

  function hideAllStates() {
    $('#error-state, #empty-state, #welcome-state, #results-header').hide();
    $('#song-grid').empty();
    $('#search-pagination').hide();
  }

  function showLoadingState() {
    showPageLoadingBar();
    hideAllStates();
  }

  function showEmptyState(query) {
    $('#empty-desc').text('Không tìm thấy kết quả cho "' + query + '"');
    $('#empty-state').show();
  }

  function showErrorState(message) {
    $('#error-message').text(message);
    $('#error-state').show();
  }

  function showWelcomeState() {
    $('#welcome-state').show();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function createSongCard(track, index) {
    const isFav = window.VibeTunes.favorites.isFavorite(track.id);
    const favoriteOverlay = `<button type="button" class="btn-favorite ${isFav ? 'is-favorited' : ''}"
          data-track-id="${track.id}"
          aria-pressed="${isFav}"
          aria-label="${isFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}">
          <i data-lucide="heart"></i>
        </button>`;

    return `
      <article class="song-card" role="listitem" data-track-id="${track.id}" style="animation-delay:${index * 40}ms">
        <div class="song-card__artwork-wrapper">
          <img src="${track.artwork}" alt="${escapeHtml(track.album || track.title)}"
            class="song-card__artwork" loading="lazy"
            onerror="this.src='/images/placeholder-album.svg'">
          <button class="song-card__play-btn" data-track-id="${track.id}"
            aria-label="Phát bài ${escapeHtml(track.title)}">
            <i data-lucide="play" class="play-icon"></i>
            <i data-lucide="pause" class="pause-icon"></i>
          </button>
          ${favoriteOverlay}
        </div>
        <div class="song-card__info">
          <h3 class="song-card__title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</h3>
          <p class="song-card__artist">${escapeHtml(track.artist)}</p>
          <div class="song-card__meta">
            ${track.genre ? `<span class="badge">${escapeHtml(track.genre)}</span>` : ''}
          </div>
        </div>
      </article>`;
  }

  // Expose for app bootstrap query param ?q=
  function performSearchPublic(query) {
    // Reset state so URL search always executes (even if same as currentQuery).
    currentQuery = '';
    currentTracks = [];
    currentPage = 1;
    $('#search-clear-btn').show();
    $('#search-input').val(query);
    performSearch(query, true);
  }

  return {
    init,
    updatePlayingState,
    getCurrentTracks: function () { return currentTracks; },
    performSearchPublic: performSearchPublic,
    getCurrentViewTracks: function () { return currentViewTracks; },
  };
}(jQuery));

