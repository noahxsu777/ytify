import './NavBar.css';
import { setConfig } from '@lib/utils';
import { navStore, setNavStore, store, setStore, t } from '@lib/stores';

export default function() {
  type Nav = 'Hub' | 'Library' | 'Search';

  // Close any feature views that render on top of home so the selected tab
  // is always actually visible (prevents "unresponsive" taps).
  function closeOverlays() {
    if (navStore.player.state) setNavStore('player', 'state', false);
    if (navStore.list.state) setNavStore('list', 'state', false);
    if (navStore.settings.state) setNavStore('settings', 'state', false);
    if (navStore.updater.state) setNavStore('updater', 'state', false);
  }

  function saveHome(name: '' | Nav) {
    closeOverlays();
    setStore('homeView', name);
    setConfig('home', name);
    setNavStore('home', 'state', true);
    // Defer scroll so the section is mounted before scrolling to it
    requestAnimationFrame(() => navStore.home.ref?.scrollIntoView());
  }

  const navView = (item: Nav) => navStore.home.state && store.homeView === item;

  return (
    <nav>
      {/* Home / Hub */}
      <div
        class="nav-item"
        classList={{ on: navView('Hub') }}
        onclick={() => saveHome('Hub')}
        aria-label={t('nav_hub')}
      >
        <span class="ms material-symbols-outlined"
          style={{ 'font-variation-settings': navView('Hub') ? "'FILL' 1" : "'FILL' 0" }}>
          home
        </span>
        <span>Home</span>
      </div>

      {/* Search */}
      <div
        class="nav-item"
        classList={{ on: navView('Search') }}
        onclick={() => saveHome('Search')}
        aria-label={t('nav_search')}
      >
        <span class="ms material-symbols-outlined"
          style={{ 'font-variation-settings': navView('Search') ? "'FILL' 1" : "'FILL' 0" }}>
          search
        </span>
        <span>Search</span>
      </div>

      {/* Library */}
      <div
        class="nav-item"
        classList={{ on: navView('Library') }}
        onclick={() => saveHome('Library')}
        aria-label={t('nav_library')}
      >
        <span class="ms material-symbols-outlined"
          style={{ 'font-variation-settings': navView('Library') ? "'FILL' 1" : "'FILL' 0" }}>
          library_music
        </span>
        <span>Library</span>
      </div>

      {/* Queue */}
      <div
        class="nav-item"
        classList={{ on: navStore.queue.state }}
        onclick={() => {
          if (navStore.player.state) setNavStore('player', 'state', false);
          const willOpen = !navStore.queue.state;
          setNavStore('queue', 'state', willOpen);
          if (willOpen)
            requestAnimationFrame(() => navStore.queue.ref?.scrollIntoView());
        }}
        aria-label={t('nav_queue')}
      >
        <span class="ms material-symbols-outlined"
          style={{ 'font-variation-settings': navStore.queue.state ? "'FILL' 1" : "'FILL' 0" }}>
          queue_music
        </span>
        <span>Queue</span>
      </div>
    </nav>
  );
}
