# VibeTunes — Favorites Feature

## Tổng quan

Người dùng có thể lưu bài hát yêu thích bằng nút ♥ (heart). Dữ liệu lưu vào `localStorage` — không cần đăng nhập, không cần backend. Có trang riêng `/Favorites` để xem toàn bộ danh sách đã lưu.

---

## localStorage Schema

```javascript
// Key: "vibetunes_favorites"
// Value: JSON array of Track objects

localStorage.setItem('vibetunes_favorites', JSON.stringify([
  {
    id: 123456789,
    title: "Muộn Rồi Mà Sao Còn",
    artist: "Sơn Tùng M-TP",
    album: "Muộn Rồi Mà Sao Còn - Single",
    artwork: "https://is1-ssl.mzstatic.com/.../300x300bb.jpg",
    artworkSmall: "https://is1-ssl.mzstatic.com/.../60x60bb.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/.../preview.m4a",
    durationMs: 238000,
    genre: "Pop",
    releaseDate: "2022",
    appleLink: "https://music.apple.com/vn/album/...",
    savedAt: 1700000000000   // Date.now() khi lưu
  }
  // ...
]));
```

### Quy tắc lưu trữ
- **Key duy nhất**: `vibetunes_favorites` (không tạo nhiều key)
- **Giới hạn**: Tối đa **200 bài** (localStorage thường giới hạn ~5MB)
- **Thứ tự**: Bài mới nhất ở đầu mảng (prepend)
- **Không duplicate**: Check `id` trước khi thêm

---

## Favorites Module — `favorites.js`

```javascript
// wwwroot/js/favorites.js
window.VibeTunes = window.VibeTunes || {};

window.VibeTunes.favorites = (function () {
  'use strict';

  const STORAGE_KEY = 'vibetunes_favorites';
  const MAX_FAVORITES = 200;

  // ── Internal helpers ──

  function loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('[Favorites] Parse error:', e);
      return [];
    }
  }

  function saveAll(tracks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
    } catch (e) {
      // localStorage full (QuotaExceededError)
      console.error('[Favorites] Storage full:', e);
      showToast('Không thể lưu — bộ nhớ đầy.', 'danger');
    }
  }

  // ── Public API ──

  /**
   * Thêm vào yêu thích
   * @param {Track} track
   */
  function add(track) {
    const all = loadAll();

    if (all.some(t => t.id === track.id)) return; // Already exists

    if (all.length >= MAX_FAVORITES) {
      showToast(`Danh sách yêu thích đã đạt tối đa ${MAX_FAVORITES} bài.`, 'warning');
      return;
    }

    const trackToSave = { ...track, savedAt: Date.now() };
    all.unshift(trackToSave); // Thêm vào đầu
    saveAll(all);
    showToast(`Đã thêm "${truncate(track.title, 30)}" vào yêu thích`, 'success');
  }

  /**
   * Xóa khỏi yêu thích
   * @param {number} trackId
   */
  function remove(trackId) {
    const all = loadAll();
    const filtered = all.filter(t => t.id !== trackId);
    saveAll(filtered);
    // Tìm tên bài để toast
    const removed = all.find(t => t.id === trackId);
    if (removed) {
      showToast(`Đã xóa "${truncate(removed.title, 30)}" khỏi yêu thích`, 'success');
    }
  }

  /**
   * Toggle (add nếu chưa có, remove nếu đã có)
   * @param {Track} track
   * @returns {boolean} true nếu đã thêm vào, false nếu đã xóa ra
   */
  function toggle(track) {
    if (isFavorite(track.id)) {
      remove(track.id);
      return false;
    } else {
      add(track);
      return true;
    }
  }

  /**
   * Kiểm tra một track có trong favorites không
   * @param {number} trackId
   * @returns {boolean}
   */
  function isFavorite(trackId) {
    return loadAll().some(t => t.id === trackId);
  }

  /**
   * Lấy toàn bộ danh sách yêu thích
   * @returns {Track[]}
   */
  function getAll() {
    return loadAll();
  }

  /**
   * Tìm track theo ID (dùng trong player khi track không có trong search results)
   * @param {number} trackId
   * @returns {Track|undefined}
   */
  function getById(trackId) {
    return loadAll().find(t => t.id === trackId);
  }

  /**
   * Đếm số lượng favorites
   * @returns {number}
   */
  function count() {
    return loadAll().length;
  }

  /**
   * Xóa toàn bộ favorites (dùng trong settings)
   */
  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    showToast('Đã xóa toàn bộ bài hát yêu thích.', 'success');
  }

  // Utility
  function truncate(str, max) {
    return str.length > max ? str.substring(0, max) + '...' : str;
  }

  return { add, remove, toggle, isFavorite, getAll, getById, count, clearAll };

}());
```

---

## Favorites Page — `Favorites.cshtml`

```html
@page
@model FavoritesModel
@{
    ViewData["Title"] = "Yêu thích — VibeTunes";
}

<main class="main-content" id="main-content">

  <div class="page-header">
    <h1 class="page-title">
      <i data-lucide="heart" class="page-title-icon"></i>
      Bài hát yêu thích
    </h1>
    <div class="page-header-actions">
      <span class="badge" id="fav-count-badge">0 bài</span>
      <button class="btn-danger-outline" id="clear-all-btn" style="display:none;">
        <i data-lucide="trash-2"></i>
        Xóa tất cả
      </button>
    </div>
  </div>

  <!-- Empty State -->
  <div class="empty-state" id="fav-empty-state">
    <i data-lucide="heart" style="opacity:0.2; width:64px; height:64px;"></i>
    <p class="empty-title">Chưa có bài hát yêu thích</p>
    <p class="empty-desc">Nhấn ♥ trên bất kỳ bài hát nào để lưu vào đây</p>
    <a href="/" class="btn-primary">Khám phá âm nhạc</a>
  </div>

  <!-- Favorites Grid -->
  <div class="song-grid" id="fav-grid" role="list" aria-label="Danh sách bài hát yêu thích">
    <!-- Rendered by favorites page JS -->
  </div>

  <!-- Confirm Clear Dialog -->
  <dialog id="confirm-clear-dialog" class="dialog">
    <div class="dialog__content">
      <h2 class="dialog__title">Xóa toàn bộ yêu thích?</h2>
      <p class="dialog__desc">Hành động này không thể hoàn tác.</p>
      <div class="dialog__actions">
        <button class="btn-ghost" id="cancel-clear-btn">Hủy</button>
        <button class="btn-danger" id="confirm-clear-btn">Xóa tất cả</button>
      </div>
    </div>
  </dialog>

</main>
```

### JavaScript cho Favorites Page

```javascript
// Script block trong Favorites.cshtml hoặc một favorites-page.js riêng
// Chỉ chạy trên trang Favorites

$(function () {
  renderFavorites();

  // Clear all button
  $('#clear-all-btn').on('click', function () {
    $('#confirm-clear-dialog')[0].showModal();
  });

  $('#cancel-clear-btn').on('click', function () {
    $('#confirm-clear-dialog')[0].close();
  });

  $('#confirm-clear-btn').on('click', function () {
    VibeTunes.favorites.clearAll();
    $('#confirm-clear-dialog')[0].close();
    renderFavorites();
  });
});

function renderFavorites() {
  const tracks = VibeTunes.favorites.getAll();
  const $grid = $('#fav-grid');
  const $empty = $('#fav-empty-state');
  const $clearBtn = $('#clear-all-btn');
  const $badge = $('#fav-count-badge');

  $badge.text(tracks.length + ' bài');

  if (tracks.length === 0) {
    $grid.empty();
    $empty.show();
    $clearBtn.hide();
    return;
  }

  $empty.hide();
  $clearBtn.show();
  $grid.empty();

  const html = tracks.map((track, i) => createFavCard(track, i)).join('');
  $grid.html(html);
  lucide.createIcons();
  bindFavCardEvents();
}

function createFavCard(track, index) {
  return `
    <article class="song-card fav-card" role="listitem" data-track-id="${track.id}"
      style="animation-delay:${index * 40}ms">
      <div class="song-card__artwork-wrapper">
        <img src="${track.artwork}" alt="${escapeHtml(track.album)}"
          class="song-card__artwork" loading="lazy"
          onerror="this.src='/images/placeholder-album.png'">
        <button class="song-card__play-btn" data-track-id="${track.id}"
          aria-label="Phát bài ${escapeHtml(track.title)}">
          <i data-lucide="play" class="play-icon"></i>
          <i data-lucide="pause" class="pause-icon" style="display:none;"></i>
        </button>
      </div>
      <div class="song-card__info">
        <h3 class="song-card__title">${escapeHtml(track.title)}</h3>
        <p class="song-card__artist">${escapeHtml(track.artist)}</p>
        <div class="song-card__meta">
          ${track.genre ? `<span class="badge">${escapeHtml(track.genre)}</span>` : ''}
          <button class="btn-remove btn-icon" data-track-id="${track.id}"
            aria-label="Xóa khỏi yêu thích">
            <i data-lucide="heart" style="fill: var(--vt-danger); color: var(--vt-danger)"></i>
          </button>
        </div>
      </div>
    </article>`;
}

function bindFavCardEvents() {
  const $grid = $('#fav-grid');

  $grid.on('click', '.song-card__play-btn', function (e) {
    e.stopPropagation();
    const id = parseInt($(this).data('track-id'));
    const track = VibeTunes.favorites.getById(id);
    if (track) VibeTunes.player.playTrack(track);
  });

  $grid.on('click', '.btn-remove', function (e) {
    e.stopPropagation();
    const id = parseInt($(this).data('track-id'));
    VibeTunes.favorites.remove(id);
    renderFavorites();
    // Update player favorite btn if this is currently playing
    if (VibeTunes.player.getCurrentTrack()?.id === id) {
      VibeTunes.player.updateFavoriteBtn();
    }
  });
}
```

---

## Navigation — Hiển thị số lượng Favorites trong Nav

```html
<!-- Trong _Layout.cshtml header nav -->
<nav class="site-nav">
  <a href="/" class="nav-link @(currentPage == "Index" ? "is-active" : "")">
    <i data-lucide="home"></i>
    Khám phá
  </a>
  <a href="/Favorites" class="nav-link @(currentPage == "Favorites" ? "is-active" : "")">
    <i data-lucide="heart"></i>
    Yêu thích
    <span class="nav-badge" id="nav-fav-count" style="display:none;"></span>
  </a>
</nav>
```

```javascript
// Cập nhật badge count trong nav — gọi từ app.js khi load và mỗi khi favorites thay đổi
function updateNavFavBadge() {
  const count = VibeTunes.favorites.count();
  const $badge = $('#nav-fav-count');
  if (count > 0) {
    $badge.text(count).show();
  } else {
    $badge.hide();
  }
}
```

---

## Edge Cases

| Trường hợp | Xử lý |
|---|---|
| `localStorage` bị disable (private mode Safari) | `try/catch` trong `loadAll`/`saveAll`, show toast warning |
| Dữ liệu bị corrupt (không parse được) | Return `[]`, log error |
| Thêm bài đã có | Silent return (không toast, không duplicate) |
| Xóa bài đang phát | Xóa bình thường, player vẫn tiếp tục phát (không dừng) |
| Trang favorites mở, xóa 1 bài | Re-render grid ngay lập tức |
| `previewUrl` trong track đã lưu hết hạn | Khi play sẽ lỗi → player's audio error handler xử lý |
