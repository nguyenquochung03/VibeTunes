// wwwroot/js/app.js
// Entry point — khởi tạo tất cả modules khi DOM ready

$(function () {
  'use strict';

  lucide.createIcons();

  window.VibeTunes.player.init();
  window.VibeTunes.search.init();

  if (window.VibeTunes.favoritesPage && typeof window.VibeTunes.favoritesPage.init === 'function') {
    window.VibeTunes.favoritesPage.init();
  }

  window.VibeTunes.shell.init();

  updateNavFavBadge();

  $(document).on('keydown', function (e) {
    if (e.code === 'Space' && !$(e.target).is('input, textarea')) {
      e.preventDefault();
      window.VibeTunes.player.togglePlayPause();
    }
  });

  $(document).on('keydown', function (e) {
    if (e.key === '/' && !$(e.target).is('input, textarea')) {
      e.preventDefault();
      $('#search-input').focus().select();
    }
  });

  if (window.VibeTunes.shell.hasExploreView()) {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q && q.trim().length >= 2) {
      $('#search-input').val(q.trim());
      $('#search-clear-btn').show();
      if (window.VibeTunes.shell.getViewFromPath() === 'favorites') {
        window.VibeTunes.shell.showView('explore', { pushState: false });
        history.replaceState({ vtView: 'explore' }, '', '/?q=' + encodeURIComponent(q.trim()));
      }
      window.VibeTunes.search.performSearchPublic(q.trim());
    }
  }
});

function updateNavFavBadge() {
  const count = window.VibeTunes.favorites.count();
  const $badge = $('#nav-fav-count');
  count > 0 ? $badge.text(count).show() : $badge.hide();
}

window.updateNavFavBadge = updateNavFavBadge;

window.escapeHtml = function (str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/** Điều hướng Khám phá / Yêu thích không reload trang (History API). */
window.VibeTunes.shell = (function ($) {
  'use strict';

  const TITLES = {
    explore: 'Khám phá — VibeTunes',
    favorites: 'Yêu thích — VibeTunes',
  };

  function hasExploreView() {
    return !!document.getElementById('view-explore');
  }

  function getViewFromPath() {
    const p = (window.location.pathname || '').toLowerCase();
    if (p.endsWith('/favorites')) return 'favorites';
    return 'explore';
  }

  function setNavActive(view) {
    $('.nav-spa').removeClass('is-active');
    $('.nav-spa[data-nav-view="' + view + '"]').addClass('is-active');
  }

  function setPanelA11y(view) {
    const explore = document.getElementById('view-explore');
    const fav = document.getElementById('view-favorites');
    if (!explore || !fav) return;
    const showExplore = view === 'explore';
    explore.setAttribute('aria-hidden', showExplore ? 'false' : 'true');
    fav.setAttribute('aria-hidden', showExplore ? 'true' : 'false');
  }

  function showView(view, options) {
    const push = options && options.pushState;
    const explore = document.getElementById('view-explore');
    const fav = document.getElementById('view-favorites');
    if (!explore || !fav) return;

    if (view === 'favorites') {
      explore.classList.add('is-hidden');
      fav.classList.remove('is-hidden');
      document.title = TITLES.favorites;
      if (window.VibeTunes.favoritesPage && typeof window.VibeTunes.favoritesPage.onShow === 'function') {
        window.VibeTunes.favoritesPage.onShow();
      }
    } else {
      explore.classList.remove('is-hidden');
      fav.classList.add('is-hidden');
      document.title = TITLES.explore;
    }

    setNavActive(view);
    setPanelA11y(view);

    if (push) {
      const path = view === 'favorites' ? '/Favorites' : '/';
      history.pushState({ vtView: view }, '', path);
    }
  }

  function ensureExplorePanel(options) {
    const fav = document.getElementById('view-favorites');
    if (!fav || fav.classList.contains('is-hidden')) return;
    const push = !options || options.pushState !== false;
    showView('explore', { pushState: push });
  }

  function onNavClick(e) {
    const $a = $(e.currentTarget);
    const view = $a.data('nav-view');
    if (!view) return;
    if (!hasExploreView()) {
      return;
    }
    e.preventDefault();
    const current = getViewFromPath();
    if (current === view) {
      return;
    }
    showView(view, { pushState: true });
  }

  function onPopState() {
    if (!hasExploreView()) return;
    showView(getViewFromPath(), { pushState: false });
  }

  function init() {
    if (!hasExploreView()) return;

    $(document).on('click', 'a.nav-spa', onNavClick);
    window.addEventListener('popstate', onPopState);

    const initial = getViewFromPath();
    setNavActive(initial);
    setPanelA11y(initial);
    if (initial === 'favorites' && window.VibeTunes.favoritesPage && typeof window.VibeTunes.favoritesPage.onShow === 'function') {
      window.VibeTunes.favoritesPage.onShow();
    }
  }

  return {
    init: init,
    hasExploreView: hasExploreView,
    showView: showView,
    ensureExplorePanel: ensureExplorePanel,
    getViewFromPath: getViewFromPath,
  };
})(jQuery);
