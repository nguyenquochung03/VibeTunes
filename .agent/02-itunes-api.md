# VibeTunes — iTunes Search API Integration

## Endpoint

```
GET https://itunes.apple.com/search
```

**CORS**: Apple hỗ trợ CORS — gọi thẳng từ browser, **không cần proxy**.

---

## Query Parameters

| Param | Type | Required | Mô tả |
|---|---|---|---|
| `term` | string | ✅ | Từ khóa tìm kiếm (URL-encoded) |
| `media` | string | ✅ | Luôn là `"music"` |
| `entity` | string | ✅ | Luôn là `"song"` |
| `limit` | number | ✅ | Số kết quả, mặc định `20`, tối đa `200` |
| `country` | string | ✅ | Luôn là `"VN"` (Việt Nam) hoặc `"US"` nếu không có kết quả |
| `lang` | string | ❌ | `"vi_VN"` hoặc bỏ qua |
| `explicit` | string | ❌ | `"No"` để lọc nội dung người lớn |

### URL mẫu
```
https://itunes.apple.com/search?term=son+tung&media=music&entity=song&limit=20&country=VN
```

---

## Response Structure

```json
{
  "resultCount": 20,
  "results": [
    {
      "trackId": 123456789,
      "trackName": "Muộn Rồi Mà Sao Còn",
      "artistName": "Sơn Tùng M-TP",
      "collectionName": "Muộn Rồi Mà Sao Còn - Single",
      "artworkUrl100": "https://is1-ssl.mzstatic.com/image/thumb/Music/.../100x100bb.jpg",
      "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/.../preview.m4a",
      "trackTimeMillis": 238000,
      "primaryGenreName": "Pop",
      "trackViewUrl": "https://music.apple.com/vn/album/...",
      "releaseDate": "2022-01-01T07:00:00Z",
      "trackPrice": -1,
      "collectionPrice": -1,
      "currency": "VND",
      "country": "VNM"
    }
  ]
}
```

### Các trường QUAN TRỌNG cần dùng

| Trường | Dùng để |
|---|---|
| `trackId` | ID duy nhất để identify track, lưu vào localStorage |
| `trackName` | Tên bài hát (hiển thị trên card và player) |
| `artistName` | Tên nghệ sĩ |
| `collectionName` | Tên album |
| `artworkUrl100` | Ảnh album 100×100 — **replace thành 300×300** (xem bên dưới) |
| `previewUrl` | URL audio preview 30 giây — có thể `null` |
| `trackTimeMillis` | Thời lượng bài gốc (milliseconds) |
| `primaryGenreName` | Thể loại nhạc |
| `releaseDate` | Ngày phát hành |
| `trackViewUrl` | Link mở Apple Music |

### Trick lấy ảnh chất lượng cao hơn
```javascript
// artworkUrl100 trả về "...100x100bb.jpg"
// Thay thế để lấy kích thước khác:
const getHighResArtwork = (url, size = 300) =>
  url ? url.replace('100x100bb', `${size}x${size}bb`) : '/images/placeholder-album.png';
```

---

## API Service Module — `api.js`

```javascript
// wwwroot/js/api.js
// KHÔNG dùng module syntax (import/export) — dùng IIFE + window namespace

window.VibeTunes = window.VibeTunes || {};

window.VibeTunes.api = (function ($) {
  'use strict';

  const BASE_URL = 'https://itunes.apple.com/search';
  const DEFAULT_LIMIT = 20;
  const DEFAULT_COUNTRY = 'VN';

  /**
   * Tìm kiếm bài hát
   * @param {string} query - Từ khóa tìm kiếm
   * @param {object} options - { limit, country, explicit }
   * @returns {Promise<Track[]>}
   */
  function searchTracks(query, options = {}) {
    if (!query || !query.trim()) {
      return Promise.resolve([]);
    }

    const params = {
      term: query.trim(),
      media: 'music',
      entity: 'song',
      limit: options.limit || DEFAULT_LIMIT,
      country: options.country || DEFAULT_COUNTRY,
    };

    if (options.explicit === false) {
      params.explicit = 'No';
    }

    return $.ajax({
      url: BASE_URL,
      method: 'GET',
      data: params,
      dataType: 'jsonp',   // iTunes API yêu cầu JSONP hoặc thêm callback
      timeout: 10000,
    })
    .then(function (data) {
      return normalizeResults(data.results || []);
    })
    .catch(function (err) {
      console.error('[VibeTunes API] Search failed:', err);
      // Nếu VN không có kết quả, thử lại với country=US
      if (options.country !== 'US') {
        return searchTracks(query, { ...options, country: 'US' });
      }
      throw new Error('Không thể kết nối đến dịch vụ âm nhạc. Vui lòng thử lại.');
    });
  }

  /**
   * Normalize raw API results thành Track objects chuẩn hóa
   * @param {object[]} rawResults
   * @returns {Track[]}
   */
  function normalizeResults(rawResults) {
    return rawResults
      .filter(item => item.previewUrl) // Chỉ giữ bài có preview
      .map(item => ({
        id: item.trackId,
        title: item.trackName || 'Unknown Title',
        artist: item.artistName || 'Unknown Artist',
        album: item.collectionName || '',
        artwork: getHighResArtwork(item.artworkUrl100, 300),
        artworkSmall: getHighResArtwork(item.artworkUrl100, 60),
        previewUrl: item.previewUrl,
        durationMs: item.trackTimeMillis || 30000,
        genre: item.primaryGenreName || '',
        releaseDate: item.releaseDate ? item.releaseDate.substring(0, 4) : '',
        appleLink: item.trackViewUrl || '',
      }));
  }

  /**
   * Lấy artwork URL với kích thước tùy chỉnh
   */
  function getHighResArtwork(url, size) {
    if (!url) return '/images/placeholder-album.png';
    return url.replace('100x100bb', `${size}x${size}bb`);
  }

  // Public API
  return {
    searchTracks,
    getHighResArtwork,
  };

}(jQuery));
```

---

## Track Object Schema (chuẩn hóa)

Sau khi `normalizeResults()`, mọi track trong app đều có shape này:

```typescript
// Type reference (không dùng TypeScript, chỉ để document)
interface Track {
  id: number;           // trackId từ iTunes
  title: string;        // trackName
  artist: string;       // artistName
  album: string;        // collectionName
  artwork: string;      // URL 300×300
  artworkSmall: string; // URL 60×60
  previewUrl: string;   // URL audio .m4a
  durationMs: number;   // trackTimeMillis
  genre: string;        // primaryGenreName
  releaseDate: string;  // Year only "2022"
  appleLink: string;    // trackViewUrl
}
```

**QUAN TRỌNG**: Luôn dùng `Track` object chuẩn hóa này khi truyền data giữa các modules. Không dùng raw API response trực tiếp.

---

## Error Handling

```javascript
// Trong search.js khi gọi api
VibeTunes.api.searchTracks(query)
  .then(function(tracks) {
    if (tracks.length === 0) {
      showEmptyState('Không tìm thấy kết quả cho "' + query + '"');
    } else {
      renderSongGrid(tracks);
    }
  })
  .catch(function(error) {
    showErrorState(error.message);
  })
  .always(function() {
    hideLoading();
  });
```

### Các trường hợp lỗi cần handle

| Trường hợp | Xử lý |
|---|---|
| `previewUrl` là `null` | Filter ra khỏi danh sách (đã handle trong `normalizeResults`) |
| Network timeout (>10s) | Hiển thị error state với nút retry |
| `resultCount === 0` | Hiển thị empty state |
| JSONP parse error | Log console, show error state |
| Country VN không có kết quả | Tự động retry với `country=US` |

---

## Debounce Pattern (trong search.js)

```javascript
// Không gọi API mỗi keystroke — debounce 400ms
let searchTimer = null;

$('#search-input').on('input', function() {
  const query = $(this).val().trim();

  clearTimeout(searchTimer);

  if (query.length < 2) {
    clearResults();
    return;
  }

  showLoadingState();

  searchTimer = setTimeout(function() {
    VibeTunes.api.searchTracks(query)
      .then(renderSongGrid)
      .catch(showErrorState)
      .always(hideLoading);
  }, 400);
});
```

---

## JSONP vs Fetch

iTunes API hỗ trợ cả hai:

**Dùng JSONP với jQuery (recommended cho compatibility)**:
```javascript
$.ajax({ url: BASE_URL, dataType: 'jsonp', data: params })
```

**Dùng fetch API (nếu cần)**:
```javascript
// iTunes API có header CORS: Access-Control-Allow-Origin: *
// Nên fetch() cũng hoạt động được
const url = new URL(BASE_URL);
Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
const res = await fetch(url.toString());
const data = await res.json();
```

> **Lưu ý**: Ưu tiên JSONP với jQuery để nhất quán với tech stack đã chọn.
