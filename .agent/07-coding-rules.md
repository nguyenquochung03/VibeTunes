# VibeTunes — Coding Rules & Conventions (for AI Agents)

Đây là các quy tắc bắt buộc khi implement hoặc refactor code trong dự án VibeTunes. Agent **PHẢI** tuân theo toàn bộ các quy tắc này.

---

## 🔴 TUYỆT ĐỐI KHÔNG LÀM

### Backend
- ❌ KHÔNG tạo `Controller` action gọi iTunes API từ server
- ❌ KHÔNG tạo `DbContext`, Entity Framework, database connection bất kỳ
- ❌ KHÔNG thêm authentication/authorization (không cần login)
- ❌ KHÔNG tạo API endpoint (`[ApiController]`, `[HttpGet]`) cho nhạc
- ❌ KHÔNG lưu dữ liệu người dùng lên server

### Frontend
- ❌ KHÔNG dùng CSS framework (Bootstrap, Tailwind, Bulma, Foundation)
- ❌ KHÔNG dùng JS framework (React, Vue, Angular, Svelte)
- ❌ KHÔNG dùng TypeScript (dự án dùng vanilla JS)
- ❌ KHÔNG dùng `import`/`export` ES modules (dùng IIFE + window namespace)
- ❌ KHÔNG thêm `<form>` element có `action` submit lên server
- ❌ KHÔNG dùng `innerHTML` với data từ API mà CHƯA escape HTML (XSS risk)
- ❌ KHÔNG hard-code API key, credentials bất kỳ vào source code
- ❌ KHÔNG thay đổi CSS variable names (tiền tố `--vt-*`)
- ❌ KHÔNG thay đổi JS namespace `window.VibeTunes.*`
- ❌ KHÔNG thay đổi `localStorage` key `vibetunes_favorites`
- ❌ KHÔNG thay đổi HTML `id` attributes đã được document trong các skill files

---

## 🟢 LUÔN PHẢI LÀM

### Code Quality
- ✅ Escape HTML khi render data từ API: luôn gọi `escapeHtml()` cho `title`, `artist`, `album`
- ✅ Handle lỗi với `try/catch` cho mọi `localStorage` operation
- ✅ Wrap mọi AJAX callback trong `.then().catch().always()`
- ✅ Debounce search input (400ms) — không gọi API mỗi keystroke
- ✅ Filter `previewUrl === null` trước khi render card
- ✅ Gọi `lucide.createIcons()` sau mỗi lần inject HTML mới vào DOM
- ✅ Dùng `parseInt()` khi lấy `data-track-id` từ DOM attributes
- ✅ Sử dụng `Track` object đã normalize — không dùng raw iTunes API response

### CSS
- ✅ Luôn dùng CSS variables (`var(--vt-*)`) thay vì hard-code màu
- ✅ Mọi layout dùng Flexbox hoặc CSS Grid
- ✅ Responsive: mobile ≤ 640px, tablet ≤ 1024px, desktop > 1024px
- ✅ Transition cho hover states: `transition: var(--vt-transition-normal)`
- ✅ `loading="lazy"` cho tất cả `<img>` album art
- ✅ `onerror="this.src='/images/placeholder-album.png'"` cho tất cả album art img

### Accessibility
- ✅ `aria-label` cho tất cả button không có text
- ✅ `role="list"` + `role="listitem"` cho song grid + cards
- ✅ `aria-pressed` cho toggle buttons (favorite, play)
- ✅ `aria-live="polite"` cho loading states
- ✅ Focus ring visible (không `outline: none` không có replacement)

---

## JS Module Pattern

Mọi module JS phải dùng IIFE pattern và expose qua `window.VibeTunes`:

```javascript
// ✅ ĐÚNG
window.VibeTunes = window.VibeTunes || {};
window.VibeTunes.moduleName = (function ($) {
  'use strict';

  // private state
  let privateVar = '';

  // private function
  function privateHelper() { ... }

  // public API
  return {
    publicMethod: function () { ... },
  };
}(jQuery));

// ❌ SAI — không dùng ES module
export const moduleName = { ... };

// ❌ SAI — không pollute global scope
function myGlobalFunction() { ... }
```

---

## HTML Rendering Pattern

```javascript
// ✅ ĐÚNG — luôn escape data từ API
const html = `<h3 class="song-card__title">${escapeHtml(track.title)}</h3>`;

// ❌ SAI — XSS vulnerability
const html = `<h3 class="song-card__title">${track.title}</h3>`;
```

---

## Event Binding Pattern

```javascript
// ✅ ĐÚNG — event delegation (vì cards được render động)
$('#song-grid').on('click', '.song-card__play-btn', function (e) {
  const id = parseInt($(this).data('track-id'));
  ...
});

// ❌ SAI — direct binding không hoạt động với dynamic elements
$('.song-card__play-btn').on('click', function () { ... });
```

---

## CSS Specificity Rules

```css
/* ✅ ĐÚNG — class selectors, low specificity */
.song-card { ... }
.song-card__title { ... }
.song-card.is-playing { ... }

/* ❌ SAI — ID selectors trong CSS (chỉ dùng ID cho JS targeting) */
#song-grid .song-card { ... }

/* ❌ SAI — inline styles trong CSS files */
/* Inline style chỉ được dùng trong JS cho dynamic values như animation-delay */
```

---

## Naming Conventions Summary

```
CSS Classes:        kebab-case          .song-card, .mini-player
CSS Variables:      --vt-{name}         --vt-primary, --vt-shadow-sm
HTML IDs:           kebab-case          #search-input, #mini-player
JS Variables:       camelCase           currentTrack, searchTimer
JS Functions:       camelCase           playTrack(), renderSongGrid()
JS Module Names:    camelCase           VibeTunes.player, VibeTunes.api
localStorage Keys:  vibetunes_{name}    vibetunes_favorites, vibetunes_volume
Data Attributes:    kebab-case          data-track-id
```

---

## File Modification Rules

Khi AI agent implement một feature mới hoặc refactor:

1. **Chỉ sửa files liên quan** — không sửa files khác không cần thiết
2. **Không xóa CSS variables** — có thể thêm nhưng không xóa/đổi tên biến có sẵn
3. **Không đổi tên public methods** trong JS modules — có thể thêm methods mới
4. **Giữ nguyên HTML structure** — có thể thêm class/attribute nhưng không thay đổi cấu trúc cốt lõi
5. **Comments**: Viết comment giải thích "tại sao" không phải "cái gì"

---

## Performance Rules

- **Debounce search**: 400ms — không thay đổi giá trị này
- **Limit API results**: Mặc định 30, tối đa 50 — không lấy >50 kết quả một lần
- **Image lazy loading**: `loading="lazy"` cho tất cả album art
- **Animation**: Stagger delay tối đa 40ms × index — không dùng delay lớn hơn
- **Audio preload**: `preload="none"` — chỉ load audio khi user click play
- **localStorage reads**: Minimize — không đọc localStorage trong loop

---

## Security Rules

- **XSS Prevention**: `escapeHtml()` cho tất cả data từ API trước khi insert vào DOM
- **Không eval()**: Không dùng `eval()`, `new Function()`, hay `innerHTML` với untrusted data
- **Không lưu sensitive data**: localStorage chỉ lưu track metadata (public data từ iTunes API)
- **HTTPS only**: iTunes API chỉ hoạt động trên HTTPS — deploy phải dùng HTTPS

---

## Checklist trước khi Submit Code

- [ ] Tất cả `data-track-id` được parse bằng `parseInt()` khi lấy từ DOM
- [ ] Tất cả user-facing strings từ API đều qua `escapeHtml()`
- [ ] `lucide.createIcons()` được gọi sau khi inject HTML mới
- [ ] Event listeners dùng delegation (`.on('click', selector, fn)`)
- [ ] Mọi API call có `.catch()` handler
- [ ] Mọi `localStorage` operation có `try/catch`
- [ ] CSS chỉ dùng `var(--vt-*)` cho colors, không hard-code màu hex
- [ ] Responsive: test ở 375px, 768px, 1280px
- [ ] Không có `console.log()` debug còn sót lại (chỉ `console.error()` cho lỗi thật)
