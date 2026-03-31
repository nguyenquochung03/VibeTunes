# VibeTunes — Project Overview & Architecture

## Tổng quan dự án

**VibeTunes** là một ứng dụng web nghe nhạc trực tuyến dạng lightweight, hoạt động hoàn toàn phía client (client-side rendering). Người dùng tìm kiếm bài hát qua iTunes Search API, xem kết quả dạng card, nghe preview 30 giây qua HTML5 Audio, và lưu bài hát yêu thích bằng localStorage — **không cần backend, không cần đăng nhập**.

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Framework | ASP.NET Core Razor Pages / MVC |
| Markup | HTML5 |
| Styling | CSS3 (thuần, không framework CSS) |
| Scripting | Vanilla JavaScript (ES6+) + jQuery 3.x |
| API | iTunes Search API (`https://itunes.apple.com/search`) |
| Audio | HTML5 `<audio>` element |
| Persistence | `window.localStorage` |
| Build | Không cần bundler — static assets trực tiếp |

---

## Kiến trúc tổng thể

```
VibeTunes/
├── .agent/                        ← Thư mục chứa toàn bộ skill/rule files này
├── Pages/ (hoặc Views/)
│   ├── Index.cshtml               ← Trang chính (search + results)
│   ├── Favorites.cshtml           ← Trang bài hát yêu thích
│   └── Shared/
│       └── _Layout.cshtml         ← Layout chung (header, mini player)
├── wwwroot/
│   ├── css/
│   │   ├── site.css               ← Design tokens + global styles
│   │   ├── components.css         ← Card, button, badge styles
│   │   ├── player.css             ← Mini player styles
│   │   └── search.css             ← Search bar + results styles
│   ├── js/
│   │   ├── api.js                 ← iTunes API service layer
│   │   ├── player.js              ← Audio player controller
│   │   ├── search.js              ← Search logic + UI rendering
│   │   ├── favorites.js           ← Favorites CRUD via localStorage
│   │   └── app.js                 ← Bootstrap + event wiring
│   └── images/
│       └── logo.svg
└── appsettings.json
```

---

## Nguyên tắc kiến trúc (PHẢI tuân thủ)

### 1. Không có backend xử lý dữ liệu nhạc
- **KHÔNG** tạo Controller action nào gọi iTunes API từ server.
- Mọi request đến iTunes API đều thực hiện **trực tiếp từ browser** qua AJAX (`$.ajax` hoặc `fetch`).
- Razor Pages/MVC chỉ phục vụ HTML pages tĩnh và static assets.

### 2. Separation of Concerns trong JavaScript
Mỗi module JS có trách nhiệm rõ ràng:
- `api.js` → chỉ giao tiếp với iTunes API, trả về Promise.
- `player.js` → chỉ điều khiển `<audio>` element và cập nhật UI player.
- `search.js` → nhận kết quả từ `api.js`, render card, bind events.
- `favorites.js` → đọc/ghi localStorage, không biết về API hay player.
- `app.js` → wiring tất cả modules lại, khởi tạo khi DOM ready.

### 3. Progressive Enhancement
- Trang phải hiển thị được cấu trúc cơ bản khi JS chưa load.
- Kết quả tìm kiếm render vào `<div id="search-results">` đã có sẵn trong HTML.

### 4. Responsive-first
- Mọi layout dùng CSS Grid hoặc Flexbox.
- Breakpoints: mobile ≤ 640px, tablet 641–1024px, desktop > 1024px.

### 5. Không dùng CSS framework bên ngoài
- **KHÔNG** Bootstrap, Tailwind, Bulma.
- Tất cả styles viết thuần CSS3 với CSS Custom Properties (variables).

---

## Flow chính của ứng dụng

```
User nhập từ khóa
        ↓
[search.js] debounce 400ms → gọi api.js.search(query)
        ↓
[api.js] gửi AJAX GET đến iTunes Search API
        ↓
API trả về JSON { results: [...] }
        ↓
[search.js] render danh sách SongCard
        ↓
User click nút Play trên card
        ↓
[player.js] nhận track object → gọi audio.src = previewUrl → play()
        ↓
Mini player hiển thị: album art, tên bài, controls, progress bar
        ↓
User click nút Heart (yêu thích)
        ↓
[favorites.js] lưu/xóa track vào localStorage key "vibetunes_favorites"
```

---

## Quy ước đặt tên

| Loại | Convention | Ví dụ |
|---|---|---|
| CSS class | kebab-case | `song-card`, `mini-player`, `search-bar` |
| JS variable/function | camelCase | `currentTrack`, `playTrack()` |
| JS module export | camelCase object | `window.VibeTunes.player` |
| HTML id | kebab-case | `#search-input`, `#mini-player` |
| localStorage key | prefix `vibetunes_` | `vibetunes_favorites` |
| CSS variable | `--vt-*` prefix | `--vt-primary`, `--vt-bg-base` |

---

## Môi trường & Constraints

- **CORS**: iTunes API hỗ trợ CORS, gọi thẳng từ browser được.
- **HTTPS**: Luôn dùng HTTPS khi deploy (iTunes API yêu cầu).
- **Preview URL**: `previewUrl` trong response chỉ là đoạn 30 giây, không phải full track.
- **Rate limit**: iTunes API không có rate limit rõ ràng nhưng không spam request — luôn dùng debounce.
- **No API key**: iTunes Search API là public, không cần authentication.
