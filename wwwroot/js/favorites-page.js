// wwwroot/js/favorites-page.js — panel Yêu thích (SPA, không reload)

window.VibeTunes = window.VibeTunes || {};

window.VibeTunes.favoritesPage = (function ($) {
  'use strict';

  function createFavCard(track, index) {
    return (
      '<article class="song-card fav-card" role="listitem" data-track-id="' +
      track.id +
      '" style="animation-delay:' +
      index * 40 +
      'ms">' +
      '<div class="song-card__artwork-wrapper">' +
      '<img src="' +
      (track.artwork || '') +
      '" alt="' +
      window.escapeHtml(track.album || '') +
      '" class="song-card__artwork" loading="lazy" onerror="this.src=\'/images/placeholder-album.svg\'">' +
      '<button class="song-card__play-btn" data-track-id="' +
      track.id +
      '" aria-label="Phát bài ' +
      window.escapeHtml(track.title) +
      '">' +
      '<i data-lucide="play" class="play-icon"></i>' +
      '<i data-lucide="pause" class="pause-icon"></i>' +
      '</button>' +
      '</div>' +
      '<div class="song-card__info">' +
      '<h3 class="song-card__title">' +
      window.escapeHtml(track.title) +
      '</h3>' +
      '<p class="song-card__artist">' +
      window.escapeHtml(track.artist) +
      '</p>' +
      '<div class="song-card__meta">' +
      (track.genre ? '<span class="badge">' + window.escapeHtml(track.genre) + '</span>' : '') +
      '<button class="btn-remove btn-icon" data-track-id="' +
      track.id +
      '" aria-label="Xóa khỏi yêu thích">' +
      '<i data-lucide="heart"></i>' +
      '</button>' +
      '</div>' +
      '</div>' +
      '</article>'
    );
  }

  function renderFavorites() {
    const tracks = window.VibeTunes.favorites.getAll();
    const $grid = $('#fav-grid');
    const $empty = $('#fav-empty-state');
    const $clearBtn = $('#clear-all-btn');
    const $badge = $('#fav-count-badge');

    $badge.text(tracks.length + ' bài');

    if (tracks.length === 0) {
      $grid.empty();
      $empty.show();
      $clearBtn.hide();
      if (typeof window.updateNavFavBadge === 'function') {
        window.updateNavFavBadge();
      }
      return;
    }

    $empty.hide();
    $clearBtn.show();
    $grid.empty();

    const html = tracks.map(function (track, i) {
      return createFavCard(track, i);
    }).join('');
    $grid.html(html);
    lucide.createIcons({ nodes: [$grid[0]] });
    if (window.VibeTunes.search && typeof window.VibeTunes.search.updatePlayingState === 'function') {
      window.VibeTunes.search.updatePlayingState();
    }
    if (typeof window.updateNavFavBadge === 'function') {
      window.updateNavFavBadge();
    }
  }

  function bindFavGridEvents() {
    const $grid = $('#fav-grid');

    $grid.on('click', '.song-card__play-btn', function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data('track-id'), 10);
      const track = window.VibeTunes.favorites.getById(id);
      if (track) window.VibeTunes.player.playTrack(track);
    });

    $grid.on('click', '.btn-remove', function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data('track-id'), 10);
      window.VibeTunes.favorites.remove(id);
      renderFavorites();
      if (window.VibeTunes.player.getCurrentTrack() && window.VibeTunes.player.getCurrentTrack().id === id) {
        window.VibeTunes.player.updateFavoriteBtn();
      }
    });
  }

  function bindDialog() {
    $('#clear-all-btn').on('click', function () {
      const dlg = document.getElementById('confirm-clear-dialog');
      if (dlg && dlg.showModal) dlg.showModal();
    });

    $('#cancel-clear-btn').on('click', function () {
      const dlg = document.getElementById('confirm-clear-dialog');
      if (dlg && dlg.close) dlg.close();
    });

    $('#confirm-clear-btn').on('click', function () {
      window.VibeTunes.favorites.clearAll();
      const dlg = document.getElementById('confirm-clear-dialog');
      if (dlg && dlg.close) dlg.close();
      renderFavorites();
    });
  }

  function init() {
    bindDialog();
    bindFavGridEvents();
  }

  function onShow() {
    renderFavorites();
  }

  return {
    init: init,
    onShow: onShow,
    renderFavorites: renderFavorites,
  };
})(jQuery);
