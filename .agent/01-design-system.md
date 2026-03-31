# VibeTunes — Design System & UI Rules

## Design Philosophy

**Clean Light** — tối giản, chuyên nghiệp, dễ chịu. Không rối mắt, không decoration thừa. Mọi element đều có lý do tồn tại.

---

## Color Palette (CSS Custom Properties)

Định nghĩa tất cả màu trong `site.css` tại `:root`:

```css
:root {
  /* Backgrounds */
  --vt-bg-base:        #F8FAFC;   /* Nền trang chính */
  --vt-bg-surface:     #FFFFFF;   /* Card, modal, sidebar */
  --vt-bg-subtle:      #F1F5F9;   /* Hover state nhẹ, divider */
  --vt-bg-overlay:     rgba(0, 0, 0, 0.40);  /* Modal backdrop */

  /* Brand / Primary */
  --vt-primary:        #1E6FC3;   /* CTA buttons, links, active states */
  --vt-primary-hover:  #1557A0;   /* Hover trên primary */
  --vt-primary-light:  #EBF4FF;   /* Background nhẹ cho primary badge */
  --vt-primary-rgb:    30, 111, 195; /* Dùng cho rgba() */

  /* Text */
  --vt-text-primary:   #0F172A;   /* Tiêu đề, tên bài hát */
  --vt-text-secondary: #475569;   /* Tên nghệ sĩ, metadata */
  --vt-text-muted:     #94A3B8;   /* Placeholder, disabled */
  --vt-text-inverse:   #FFFFFF;   /* Text trên nền tối */

  /* Status */
  --vt-success:        #10B981;   /* Thêm vào favorites thành công */
  --vt-success-light:  #D1FAE5;
  --vt-danger:         #EF4444;   /* Xóa, lỗi */
  --vt-danger-light:   #FEE2E2;
  --vt-warning:        #F59E0B;   /* Cảnh báo */
  --vt-warning-light:  #FEF3C7;

  /* Border */
  --vt-border:         #E2E8F0;   /* Border mặc định */
  --vt-border-focus:   #1E6FC3;   /* Focus ring */

  /* Shadow */
  --vt-shadow-sm:      0 1px 3px rgba(0, 0, 0, 0.08);
  --vt-shadow-md:      0 4px 12px rgba(0, 0, 0, 0.10);
  --vt-shadow-lg:      0 8px 24px rgba(0, 0, 0, 0.12);
  --vt-shadow-player:  0 -2px 16px rgba(0, 0, 0, 0.10);

  /* Radius */
  --vt-radius-sm:      6px;
  --vt-radius-md:      10px;
  --vt-radius-lg:      16px;
  --vt-radius-full:    9999px;

  /* Spacing scale */
  --vt-space-1: 4px;
  --vt-space-2: 8px;
  --vt-space-3: 12px;
  --vt-space-4: 16px;
  --vt-space-5: 20px;
  --vt-space-6: 24px;
  --vt-space-8: 32px;
  --vt-space-10: 40px;
  --vt-space-12: 48px;

  /* Transition */
  --vt-transition-fast:   150ms ease;
  --vt-transition-normal: 250ms ease;
  --vt-transition-slow:   400ms ease;

  /* Z-index layers */
  --vt-z-player:   100;
  --vt-z-modal:    200;
  --vt-z-toast:    300;
}
```

---

## Typography

```css
/* Import trong <head> của _Layout.cshtml */
/* <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"> */

:root {
  --vt-font-base: 'Inter', system-ui, -apple-system, sans-serif;
  --vt-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

body {
  font-family: var(--vt-font-base);
  font-size: 14px;
  line-height: 1.6;
  color: var(--vt-text-primary);
  background-color: var(--vt-bg-base);
  -webkit-font-smoothing: antialiased;
}
```

### Typography Scale

| Token | Size | Weight | Dùng cho |
|---|---|---|---|
| `--vt-text-xs` | 11px | 400 | Badge, timestamp |
| `--vt-text-sm` | 13px | 400/500 | Metadata, caption |
| `--vt-text-base` | 14px | 400 | Body text |
| `--vt-text-md` | 15px | 500 | Tên bài hát trong card |
| `--vt-text-lg` | 18px | 600 | Section heading |
| `--vt-text-xl` | 22px | 700 | Page title |
| `--vt-text-2xl` | 28px | 700 | Hero heading |

---

## Layout Structure

### Bố cục trang tổng thể
```
┌─────────────────────────────────────┐
│           HEADER (fixed top)         │  height: 64px
│   [Logo]    [Search Bar]   [Nav]     │
├─────────────────────────────────────┤
│                                      │
│         MAIN CONTENT AREA            │  flex: 1, padding-bottom: 80px
│   [Filter Bar]                       │  (để không bị mini player che)
│   [Song Grid - responsive]           │
│                                      │
├─────────────────────────────────────┤
│        MINI PLAYER (fixed bottom)    │  height: 72px, z-index: 100
│  [Art][Title/Artist][Controls][Vol]  │
└─────────────────────────────────────┘
```

### Header
```css
.site-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 64px;
  background: var(--vt-bg-surface);
  border-bottom: 1px solid var(--vt-border);
  box-shadow: var(--vt-shadow-sm);
  z-index: 50;
  display: flex;
  align-items: center;
  padding: 0 var(--vt-space-6);
}
```

### Main Content
```css
.main-content {
  margin-top: 64px;      /* offset header */
  padding-bottom: 80px;  /* offset mini player */
  min-height: calc(100vh - 64px);
  padding: 64px var(--vt-space-6) 80px;
  max-width: 1280px;
  margin-inline: auto;
}
```

### Song Grid
```css
.song-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--vt-space-5);
  margin-top: var(--vt-space-6);
}

/* Tablet */
@media (max-width: 1024px) {
  .song-grid {
    grid-template-columns: repeat(auto-fill, minmax(172px, 1fr));
  }
}

/* Mobile */
@media (max-width: 640px) {
  .song-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--vt-space-3);
  }
}
```

---

## Component Specifications

### Song Card
```
┌──────────────────┐
│                  │
│   Album Art      │  aspect-ratio: 1/1, border-radius top
│   (200×200)      │
│                  │
│  ▶  (play btn)   │  overlay on hover, absolute center
├──────────────────┤
│ Tên bài hát      │  font-weight: 600, truncate 2 lines
│ Tên nghệ sĩ      │  text-secondary, truncate 1 line
│ [♥] [genre]      │  favorite btn + badge
└──────────────────┘
```

```css
.song-card {
  background: var(--vt-bg-surface);
  border-radius: var(--vt-radius-md);
  box-shadow: var(--vt-shadow-sm);
  overflow: hidden;
  transition: transform var(--vt-transition-normal),
              box-shadow var(--vt-transition-normal);
  cursor: pointer;
}

.song-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--vt-shadow-md);
}

.song-card.is-playing {
  box-shadow: 0 0 0 2px var(--vt-primary), var(--vt-shadow-md);
}
```

### Buttons
```css
/* Primary Button */
.btn-primary {
  background: var(--vt-primary);
  color: var(--vt-text-inverse);
  border: none;
  border-radius: var(--vt-radius-full);
  padding: var(--vt-space-2) var(--vt-space-5);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--vt-transition-fast);
}
.btn-primary:hover { background: var(--vt-primary-hover); }

/* Icon Button */
.btn-icon {
  width: 36px; height: 36px;
  border: none; border-radius: var(--vt-radius-full);
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background var(--vt-transition-fast);
}
.btn-icon:hover { background: var(--vt-bg-subtle); }
```

### Favorite Button States
```css
.btn-favorite { color: var(--vt-text-muted); }
.btn-favorite:hover { color: var(--vt-danger); }
.btn-favorite.is-favorited { color: var(--vt-danger); fill: var(--vt-danger); }
```

---

## Icons

Dùng **Lucide Icons** (CDN) hoặc inline SVG — không dùng Font Awesome.
```html
<!-- CDN trong _Layout.cshtml -->
<script src="https://unpkg.com/lucide@latest"></script>
<!-- Sau khi DOM ready: lucide.createIcons(); -->
```

Icons dùng trong app:
- `play`, `pause` — player controls
- `skip-forward`, `skip-back` — không cần (chỉ có preview)
- `heart` — favorite toggle
- `search` — search bar
- `volume-2`, `volume-x` — mute toggle
- `music` — placeholder khi không có album art
- `x` — close / clear
- `loader-2` — loading spinner (với animation `spin`)

---

## Animations

```css
/* Loading spinner */
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.animate-spin { animation: spin 1s linear infinite; }

/* Fade in cards */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.song-card {
  animation: fadeInUp 200ms ease both;
}
/* Stagger delay cho grid items */
.song-card:nth-child(n) { animation-delay: calc(n * 30ms); }

/* Progress bar pulse khi đang play */
@keyframes progressPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

---

## States & Feedback

### Empty State
```html
<div class="empty-state">
  <i data-lucide="music" class="empty-icon"></i>
  <p class="empty-title">Chưa có bài hát nào</p>
  <p class="empty-desc">Tìm kiếm để khám phá âm nhạc</p>
</div>
```

### Error State
```html
<div class="error-state">
  <i data-lucide="wifi-off"></i>
  <p>Không thể kết nối. Vui lòng thử lại.</p>
  <button class="btn-primary" id="retry-btn">Thử lại</button>
</div>
```

### Toast Notifications
- Hiển thị góc dưới phải, trên mini player
- Auto-dismiss sau 3 giây
- Màu theo trạng thái: success (#10B981), danger (#EF4444)

```css
.toast {
  position: fixed;
  bottom: calc(72px + var(--vt-space-4)); /* above mini player */
  right: var(--vt-space-5);
  z-index: var(--vt-z-toast);
  background: var(--vt-bg-surface);
  border-radius: var(--vt-radius-md);
  box-shadow: var(--vt-shadow-lg);
  padding: var(--vt-space-3) var(--vt-space-4);
  display: flex;
  align-items: center;
  gap: var(--vt-space-2);
  font-size: 13px;
  font-weight: 500;
  border-left: 3px solid currentColor;
  animation: slideInRight 200ms ease;
}
```

---

## Accessibility (A11y)

- Tất cả button phải có `aria-label` rõ ràng: `aria-label="Phát bài hát X"`
- Focus ring: `outline: 2px solid var(--vt-border-focus); outline-offset: 2px;`
- Color contrast ratio: tối thiểu 4.5:1 cho body text
- Audio player phải có `aria-live="polite"` để screen reader thông báo bài hát đang phát
- Images: `alt` attribute đầy đủ cho album art
