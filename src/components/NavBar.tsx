import './NavBar.css';
import { setConfig } from '@lib/utils';
import { navStore, setNavStore, store, setStore, t } from '@lib/stores';

export default function() {


  type Nav = 'Hub' | 'Library' | 'Search';

  function saveHome(name: '' | Nav) {
    if (store.homeView === name && navStore.home.state) {
      setNavStore('home', 'state', false);
    } else {
      setStore('homeView', name);
      setConfig('home', name);
      setNavStore('home', 'state', true);
      navStore.home.ref?.scrollIntoView();
    }
  }

  const navView = (item: Nav) => navStore.home.state && store.homeView === item;

  return (
    <nav>
      <i
        aria-label={t('nav_queue')}
        class="ri-order-play-fill"
        classList={{ on: navStore.queue.state }}
        onclick={() => {
          setNavStore('queue', 'state', !navStore.queue.state);
        }}
      >
        <span class="navLabel">{t('nav_queue')}</span>
      </i>

      <i
        aria-label={t('nav_hub')}
        class="ri-store-2-line"
        classList={{ 'on': navView('Hub') }}
        onclick={() => saveHome('Hub')}
      >
        <span class="navLabel">{t('nav_hub')}</span>
      </i>
      <i
        aria-label={t('nav_library')}
        class="ri-archive-stack-line"
        classList={{ 'on': navView('Library') }}
        onclick={() => saveHome('Library')}
      >
        <span class="navLabel">{t('nav_library')}</span>
      </i>
      <i
        aria-label={t('nav_search')}
        class="ri-search-2-line"
        classList={{ 'on': navView('Search') }}
        onclick={() => saveHome('Search')}
      >
        <span class="navLabel">{t('nav_search')}</span>
      </i>

    </nav>
  );
}
