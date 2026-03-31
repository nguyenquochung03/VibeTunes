// wwwroot/js/api.js
// iTunes API service layer for VibeTunes
// KHÔNG dùng module syntax (import/export) — dùng IIFE + window namespace

window.VibeTunes = window.VibeTunes || {};

window.VibeTunes.api = (function ($) {
  'use strict';

  const BASE_URL = 'https://itunes.apple.com/search';
  const DEFAULT_LIMIT = 20;
  const DEFAULT_COUNTRY = 'VN';

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
      dataType: 'jsonp',
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

  function normalizeResults(rawResults) {
    return rawResults
      .filter(function (item) {
        return item.previewUrl;
      })
      .map(function (item) {
        return {
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
          releaseDateRaw: item.releaseDate || '',
          appleLink: item.trackViewUrl || '',
        };
      });
  }

  function getHighResArtwork(url, size) {
    if (!url) return '/images/placeholder-album.svg';
    return url.replace('100x100bb', `${size}x${size}bb`);
  }

  return {
    searchTracks: searchTracks,
    getHighResArtwork: getHighResArtwork,
  };
}(jQuery));

