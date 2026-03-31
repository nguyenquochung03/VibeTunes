# VibeTunes — Layout, Bootstrap & Razor Pages Structure

## Razor Pages / MVC Setup

### Không cần Controller logic phức tạp
Vì VibeTunes là client-side app, các Pages chỉ phục vụ HTML shell:

```
Pages/
├── Index.cshtml          ← Trang chính (search)
├── Index.cshtml.cs       ← PageModel rỗng
├── Favorites.cshtml      ← Trang yêu thích
├── Favorites.cshtml.cs   ← PageModel rỗng
└── Shared/
    ├── _Layout.cshtml    ← Layout chính
    └── _ViewStart.cshtml
```

### PageModel mẫu (rỗng)
```csharp
// Pages/Index.cshtml.cs
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace VibeTunes.Pages
{
    public class IndexModel : PageModel
    {
        public void OnGet() { }
    }
}

// Pages/Favorites.cshtml.cs
namespace VibeTunes.Pages
{
    public class FavoritesModel : PageModel
    {
        public void OnGet() { }
    }
}
```

---

## _Layout.cshtml — Đầy đủ

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="VibeTunes — Nghe thử nhạc trực tuyến" />
  <title>@ViewData["Title"] VibeTunes</title>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- Styles (load order QUAN TRỌNG) -->
  <link rel="stylesheet" href="~/css/site.css" asp-append-version="true" />
  <link rel="stylesheet" href="~/css/components.css" asp-append-version="true" />
  <link rel="stylesheet" href="~/css/search.css" asp-append-version="true" />
  <link rel="stylesheet" href="~/css/player.css" asp-append-version="true" />

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="~/images/logo.svg" />
</head>
<body>

  <!-- ── HEADER ── -->
  <header class="site-header" role="banner">
    <a href="/" class="site-logo" aria-label="VibeTunes trang chủ">
      <i data-lucide="music-2" class="logo-icon"></i>
      <span class="logo-text">VibeTunes</span>
    </a>

    <!-- Search Bar (chỉ hiển thị trên trang chủ, hoặc luôn hiển thị) -->
    <div class="search-bar-wrapper" role="search">
      <div class="search-bar">
        <i data-lucide="search" class="search-icon" aria-hidden="true"></i>
        <input
          type="search"
          id="search-input"
          class="search-input"
          placeholder="Tìm kiếm bài hát, nghệ sĩ..."
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          aria-label="Tìm kiếm bài hát"
          maxlength="100"
        />
        <button class="btn-icon search-clear" id="search-clear-btn"
          aria-label="Xóa tìm kiếm" style="display:none;">
          <i data-lucide="x"></i>
        </button>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="site-nav" aria-label="Navigation chính">
      <a href="/" class="nav-link @(ViewContext.RouteData.Values["page"]?.ToString() == "/Index" ? "is-active" : "")">
        <i data-lucide="home"></i>
        <span>Khám phá</span>
      </a>
      <a href="/Favorites" class="nav-link @(ViewContext.RouteData.Values["page"]?.ToString() == "/Favorites" ? "is-active" : "")">
        <i data-lucide="heart"></i>
        <span>Yêu thích</span>
        <span class="nav-badge" id="nav-fav-count" style="display:none;"></span>
      </a>
    </nav>
  </header>

  <!-- ── MAIN ── -->
  @RenderBody()

  <!-- ── MINI PLAYER (xem 04-mini-player.md để biết đầy đủ HTML) ── -->
  <div id="mini-player" class="mini-player is-hidden" role="region" aria-label="Trình phát nhạc">
    <div class="player-progress" id="player-progress"
      role="slider" aria-label="Tiến trình" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
      <div class="player-progress__bar" id="player-progress-bar"></div>
    </div>
    <div class="player-body">
      <div class="player-track-info">
        <img id="player-artwork" src="/images/placeholder-album.png" alt="Album art" class="player-artwork">
        <div class="player-track-text">
          <p class="player-track-title" id="player-title">-</p>
          <p class="player-track-artist" id="player-artist">-</p>
        </div>
        <button class="btn-favorite btn-icon" id="player-favorite-btn"
          aria-label="Thêm vào yêu thích" aria-pressed="false">
          <i data-lucide="heart"></i>
        </button>
      </div>
      <div class="player-controls">
        <span class="player-time" id="player-current-time">0:00</span>
        <button class="player-btn-play btn-icon" id="player-play-btn" aria-label="Phát">
          <i data-lucide="play" id="player-play-icon"></i>
          <i data-lucide="pause" id="player-pause-icon" style="display:none;"></i>
        </button>
        <span class="player-time" id="player-duration">0:30</span>
      </div>
      <div class="player-volume">
        <button class="btn-icon" id="player-mute-btn" aria-label="Tắt tiếng">
          <i data-lucide="volume-2" id="player-volume-icon"></i>
          <i data-lucide="volume-x" id="player-mute-icon" style="display:none;"></i>
        </button>
        <input type="range" id="player-volume-slider" class="volume-slider"
          min="0" max="1" step="0.05" value="0.8" aria-label="Âm lượng">
      </div>
    </div>
    <audio id="audio-engine" preload="none"></audio>
  </div>

  <!-- ── SCRIPTS (load order QUAN TRỌNG) ── -->
  <!-- jQuery TRƯỚC tất cả -->
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"
    integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>

  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

  <!-- VibeTunes modules (thứ tự: utils → api → favorites → player → search → app) -->
  <script src="~/js/api.js" asp-append-version="true"></script>
  <script src="~/js/favorites.js" asp-append-version="true"></script>
  <script src="~/js/player.js" asp-append-version="true"></script>
  <script src="~/js/search.js" asp-append-version="true"></script>
  <script src="~/js/app.js" asp-append-version="true"></script>

  <!-- Page-specific scripts -->
  @await RenderSectionAsync("Scripts", required: false)

</body>
</html>
```

---

## app.js — Bootstrap & Module Wiring

```javascript
// wwwroot/js/app.js
// Entry point — khởi tạo tất cả modules khi DOM ready

$(function () {
  'use strict';

  // 1. Khởi tạo Lucide icons
  lucide.createIcons();

  // 2. Khởi tạo các modules
  VibeTunes.player.init();
  VibeTunes.search.init();

  // 3. Cập nhật nav badge
  updateNavFavBadge();

  // 4. Keyboard shortcut: Space để play/pause (khi không đang focus input)
  $(document).on('keydown', function (e) {
    if (e.code === 'Space' && !$(e.target).is('input, textarea')) {
      e.preventDefault();
      VibeTunes.player.togglePlayPause();
    }
  });

  // 5. Focus search khi nhấn '/' (như GitHub)
  $(document).on('keydown', function (e) {
    if (e.key === '/' && !$(e.target).is('input, textarea')) {
      e.preventDefault();
      $('#search-input').focus().select();
    }
  });

  // 6. Redirect về trang chủ và focus search khi tìm kiếm từ trang Favorites
  const isIndexPage = window.location.pathname === '/' || window.location.pathname === '/Index';
  if (!isIndexPage) {
    // Ẩn search bar hoặc redirect khi search
    $('#search-input').on('keydown', function (e) {
      if (e.key === 'Enter' && $(this).val().trim().length >= 2) {
        const q = encodeURIComponent($(this).val().trim());
        window.location.href = '/?q=' + q;
      }
    });
  }

  // 7. Handle URL query param ?q= khi load trang
  if (isIndexPage) {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q && q.trim().length >= 2) {
      $('#search-input').val(q.trim());
      $('#search-clear-btn').show();
      VibeTunes.search.performSearchPublic(q.trim()); // nếu expose method này
    }
  }
});

function updateNavFavBadge() {
  const count = VibeTunes.favorites.count();
  const $badge = $('#nav-fav-count');
  count > 0 ? $badge.text(count).show() : $badge.hide();
}

// Utility toàn cục — escape HTML (dùng trong nhiều module)
window.escapeHtml = function (str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
```

---

## Program.cs — Minimal setup

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRazorPages();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.MapRazorPages();

// Route mặc định về Index
app.MapGet("/", () => Results.Redirect("/Index"));

app.Run();
```

---

## Static File Structure — wwwroot

```
wwwroot/
├── css/
│   ├── site.css          ← :root variables, reset, global styles, typography
│   ├── components.css    ← buttons, badges, dialog, nav, header, toast
│   ├── search.css        ← search bar, song grid, song card, states
│   └── player.css        ← mini player, progress, volume
├── js/
│   ├── api.js            ← iTunes API service
│   ├── favorites.js      ← localStorage CRUD
│   ├── player.js         ← HTML5 Audio controller
│   ├── search.js         ← Search logic + card rendering
│   └── app.js            ← Bootstrap + wiring
└── images/
    ├── placeholder-album.png   ← 300×300, màu xám nhạt với note nhạc
    └── logo.svg                ← Logo VibeTunes
```

---

## CSS Reset & Global (site.css)

```css
/* site.css — phần đầu */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--vt-font-base);
  font-size: 14px;
  line-height: 1.6;
  color: var(--vt-text-primary);
  background-color: var(--vt-bg-base);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  color: var(--vt-primary);
  text-decoration: none;
}
a:hover { text-decoration: underline; }

button { font-family: inherit; }

img { max-width: 100%; display: block; }

/* Focus visible for accessibility */
:focus-visible {
  outline: 2px solid var(--vt-border-focus);
  outline-offset: 2px;
  border-radius: 2px;
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--vt-border);
  border-radius: var(--vt-radius-full);
}
::-webkit-scrollbar-thumb:hover { background: var(--vt-text-muted); }
```

---

## Quy tắc Load Order JS (KHÔNG được thay đổi)

```
1. jQuery 3.7.1 (CDN)
2. Lucide Icons (CDN)
3. api.js           — không phụ thuộc gì (chỉ cần jQuery)
4. favorites.js     — không phụ thuộc gì (chỉ dùng localStorage)
5. player.js        — phụ thuộc: jQuery, VibeTunes.favorites
6. search.js        — phụ thuộc: jQuery, VibeTunes.api, VibeTunes.player, VibeTunes.favorites
7. app.js           — phụ thuộc: tất cả module trên + lucide
```

> **Lý do**: Các module dùng `window.VibeTunes.*` — nếu load sai thứ tự sẽ bị `undefined`.
