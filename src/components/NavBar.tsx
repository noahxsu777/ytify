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
      ></i>

      <i
        aria-label={t('nav_hub')}
        class="ri-home-4-line"
        classList={{
          'on': navView('Hub'),
          'ri-home-4-fill': navView('Hub')
        }}
        onclick={() => saveHome('Hub')}
      ></i>
      <i
        aria-label={t('nav_search')}
        class="ri-search-line"
        classList={{
          'on': navView('Search'),
          'ri-search-fill': navView('Search')
        }}
        onclick={() => saveHome('Search')}
      ></i>
      <i
        aria-label={t('nav_library')}
        class="ri-book-3-line"
        classList={{
          'on': navView('Library'),
          'ri-book-3-fill': navView('Library')
        }}
        onclick={() => saveHome('Library')}
      ></i>

    </nav>
  );
}
