# VibeTunes — Feature Implementation Guide (Quick Reference)

Đây là hướng dẫn nhanh cho AI Agent khi nhận lệnh implement/refactor. Mỗi lệnh tham chiếu đến các skill file liên quan.

---

## Lệnh implement chuẩn

Khi nhận lệnh dạng: **"Implement [feature X]"** hoặc **"Refactor [component Y]"**, agent phải:

1. Đọc skill file liên quan từ `.agent/` folder
2. Implement ĐÚNG theo spec trong skill file
3. Không thêm logic không được mô tả
4. Báo cáo các files đã tạo/sửa

---

## Map Feature → Skill Files

| Lệnh / Feature | Skill Files cần đọc |
|---|---|
| Implement toàn bộ dự án từ đầu | 00, 01, 02, 03, 04, 05, 06, 07 (tất cả) |
| Implement search feature | `02-itunes-api.md`, `03-search-feature.md`, `01-design-system.md` |
| Implement audio player / mini player | `04-mini-player.md`, `01-design-system.md` |
| Implement favorites feature | `05-favorites-feature.md` |
| Setup layout / _Layout.cshtml | `06-layout-bootstrap.md`, `01-design-system.md` |
| Setup design system / CSS | `01-design-system.md` |
| Implement iTunes API service | `02-itunes-api.md` |
| Refactor bất kỳ component nào | `07-coding-rules.md` + skill file tương ứng |
| Fix search không hoạt động | `02-itunes-api.md`, `03-search-feature.md` |
| Fix player không phát được | `04-mini-player.md` |
| Fix favorites không lưu được | `05-favorites-feature.md` |
| Thêm responsive cho mobile | `01-design-system.md` (breakpoints section) |
| Thêm toast notifications | `04-mini-player.md` (Toast section) |
| Thêm keyboard shortcuts | `06-layout-bootstrap.md` (app.js section) |

---

## Thứ tự implement từ đầu (fresh start)

```
Bước 1: Setup project structure
  → Đọc: 00-project-overview.md
  → Tạo: ASP.NET Core Razor Pages project
  → Tạo: wwwroot/ folder structure

Bước 2: Design System (CSS)
  → Đọc: 01-design-system.md
  → Tạo: wwwroot/css/site.css (variables + reset + global)
  → Tạo: wwwroot/css/components.css (buttons, badges, nav, header)

Bước 3: Layout
  → Đọc: 06-layout-bootstrap.md
  → Tạo: Pages/Shared/_Layout.cshtml
  → Tạo: Pages/Shared/_ViewStart.cshtml
  → Tạo: Program.cs

Bước 4: iTunes API Service
  → Đọc: 02-itunes-api.md
  → Tạo: wwwroot/js/api.js

Bước 5: Favorites Module
  → Đọc: 05-favorites-feature.md
  → Tạo: wwwroot/js/favorites.js

Bước 6: Audio Player
  → Đọc: 04-mini-player.md, 01-design-system.md
  → Tạo: wwwroot/js/player.js
  → Tạo: wwwroot/css/player.css

Bước 7: Search Feature
  → Đọc: 03-search-feature.md, 01-design-system.md
  → Tạo: wwwroot/js/search.js
  → Tạo: wwwroot/css/search.css
  → Tạo: Pages/Index.cshtml

Bước 8: Favorites Page
  → Đọc: 05-favorites-feature.md
  → Tạo: Pages/Favorites.cshtml (+ .cshtml.cs)

Bước 9: App Bootstrap
  → Đọc: 06-layout-bootstrap.md
  → Tạo: wwwroot/js/app.js

Bước 10: Assets
  → Tạo: wwwroot/images/placeholder-album.png
  → Tạo: wwwroot/images/logo.svg
```

---

## Ví dụ lệnh hợp lệ

```
"Implement search feature"
→ Agent đọc 02-itunes-api.md + 03-search-feature.md
→ Tạo api.js + search.js + search.css + cập nhật Index.cshtml

"Implement mini player"
→ Agent đọc 04-mini-player.md + 01-design-system.md
→ Tạo player.js + player.css + cập nhật _Layout.cshtml

"Refactor favorites module để hỗ trợ sort by savedAt"
→ Agent đọc 05-favorites-feature.md + 07-coding-rules.md
→ Sửa favorites.js, thêm sort logic, KHÔNG phá vỡ API hiện tại

"Fix lỗi search không hiện kết quả"
→ Agent đọc 02-itunes-api.md + 03-search-feature.md
→ Debug và sửa, không thêm/xóa feature
```

---

## Data Flow Summary

```
User Input
    │
    ▼
[search.js] debounce(400ms)
    │
    ▼
[api.js] $.ajax(iTunes API) → JSONP
    │
    ▼
normalize raw → Track[] (chuẩn hóa)
    │
    ▼
[search.js] render song-card × N (với escapeHtml)
    │
    ▼
User click Play
    │
    ▼
[player.js] audio.src = track.previewUrl → audio.play()
    │
    ├──→ update mini-player UI (artwork, title, artist)
    ├──→ notify search.js → update card .is-playing state
    └──→ listen to timeupdate → update progress bar

User click Heart
    │
    ▼
[favorites.js] toggle(track) → localStorage.setItem(...)
    │
    ├──→ show toast (success/warning)
    └──→ caller updates .btn-favorite.is-favorited state
```

---

## Inter-Module Communication

Các modules giao tiếp qua **direct function calls** (không dùng events/pubsub):

| Caller | Callee | Method | Mục đích |
|---|---|---|---|
| `search.js` | `api.js` | `VibeTunes.api.searchTracks(q)` | Gọi API |
| `search.js` | `player.js` | `VibeTunes.player.playTrack(t)` | Phát bài |
| `search.js` | `favorites.js` | `VibeTunes.favorites.toggle(t)` | Yêu thích |
| `player.js` | `search.js` | `VibeTunes.search.updatePlayingState(id)` | Update card UI |
| `player.js` | `favorites.js` | `VibeTunes.favorites.isFavorite(id)` | Check fav |
| `player.js` | `favorites.js` | `VibeTunes.favorites.toggle(t)` | Fav từ player |
| `app.js` | tất cả | `.init()` | Bootstrap |
| `favorites page` | `player.js` | `VibeTunes.player.playTrack(t)` | Phát từ fav page |

---

## Glossary

| Thuật ngữ | Nghĩa |
|---|---|
| `Track` | Object bài hát đã normalize (xem `02-itunes-api.md`) |
| `previewUrl` | URL audio .m4a 30 giây từ iTunes |
| `artworkUrl100` | URL ảnh album 100×100 từ iTunes (raw) |
| `artwork` | URL ảnh đã được upgrade lên 300×300 (sau normalize) |
| `is-playing` | CSS class trên `.song-card` khi đang phát |
| `is-favorited` | CSS class trên `.btn-favorite` khi đã yêu thích |
| `is-hidden` | CSS class trên `#mini-player` khi chưa có bài |
| `IIFE` | Immediately Invoked Function Expression — pattern cho JS modules |
| `vibetunes_favorites` | localStorage key duy nhất cho favorites |
| `--vt-*` | Prefix cho tất cả CSS custom properties của VibeTunes |
