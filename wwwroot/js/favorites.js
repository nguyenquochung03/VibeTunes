// wwwroot/js/favorites.js

window.VibeTunes = window.VibeTunes || {};

window.VibeTunes.favorites = (function () {
  'use strict';

  const STORAGE_KEY = 'vibetunes_favorites';
  const MAX_FAVORITES = 200;

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

  function add(track) {
    const all = loadAll();
    if (all.some(function (t) { return t.id === track.id; })) return;

    if (all.length >= MAX_FAVORITES) {
      showToast('Danh sách yêu thích đã đạt tối đa ' + MAX_FAVORITES + ' bài.', 'warning');
      return;
    }

    const trackToSave = normalizeTrackForStorage(track);
    all.unshift(trackToSave);
    saveAll(all);
    showToast('Đã thêm "' + truncate(track.title, 30) + '" vào yêu thích', 'success');
  }

  function remove(trackId) {
    const all = loadAll();
    const filtered = all.filter(function (t) { return t.id !== trackId; });
    saveAll(filtered);

    const removed = all.find(function (t) { return t.id === trackId; });
    if (removed) {
      showToast('Đã xóa "' + truncate(removed.title, 30) + '" khỏi yêu thích', 'success');
    }
  }

  function toggle(track) {
    if (isFavorite(track.id)) {
      remove(track.id);
      return false;
    }
    add(track);
    return true;
  }

  function isFavorite(trackId) {
    return loadAll().some(function (t) { return t.id === trackId; });
  }

  function getAll() {
    return loadAll().map(normalizeTrackForStorage);
  }

  function getById(trackId) {
    const track = loadAll().find(function (t) { return t.id === trackId; });
    return track ? normalizeTrackForStorage(track) : null;
  }

  function count() {
    return loadAll().length;
  }

  function clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      showToast('Đã xóa toàn bộ bài hát yêu thích.', 'success');
    } catch (e) {
      console.error('[Favorites] Clear error:', e);
      showToast('Không thể xóa dữ liệu yêu thích.', 'danger');
    }
  }

  function truncate(str, max) {
    return str.length > max ? str.substring(0, max) + '...' : str;
  }

  function normalizeTrackForStorage(track) {
    return {
      id: track.id,
      title: track.title || track.trackName || 'Unknown Title',
      artist: track.artist || track.artistName || 'Unknown Artist',
      album: track.album || '',
      artwork: track.artwork || track.image || '/images/placeholder-album.svg',
      artworkSmall: track.artworkSmall || track.artwork || track.image || '/images/placeholder-album.svg',
      previewUrl: track.previewUrl || '',
      genre: track.genre || '',
      releaseDate: track.releaseDate || '',
      releaseDateRaw: track.releaseDateRaw || '',
      savedAt: track.savedAt || Date.now(),
    };
  }

  return { add, remove, toggle, isFavorite, getAll, getById, count, clearAll };
}());

