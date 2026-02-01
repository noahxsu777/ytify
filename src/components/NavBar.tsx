import './NavBar.css';
import { setConfig } from '@lib/utils';
import { navStore, setNavStore, store, setStore } from '@lib/stores';

export default function() {
  type Nav = 'Hub' | 'Library' | 'Search' | 'Premium';

  function saveHome(name: Nav) {
    setStore('homeView', name);
    setConfig('home', name);
    // Ensure the home feature is active
    if (!navStore.home.state) {
        setNavStore('home', 'state', true);
    }
  }

  const navView = (item: Nav) => navStore.home.state && store.homeView === item;

  return (
    <nav class="bottom-nav">
      <div
        class="nav-item"
        classList={{ 'active': navView('Hub') }}
        onClick={() => saveHome('Hub')}
      >
        <i class={navView('Hub') ? "ri-store-2-line" : "ri-store-2-line"}></i>
        <span>Home</span>
      </div>

      <div
        class="nav-item"
        classList={{ 'active': navView('Search') }}
        onClick={() => saveHome('Search')}
      >
        <i class={navView('Search') ? "ri-search-2-line" : "ri-search-2-line"}></i>
        <span>Search</span>
      </div>

      <div
        class="nav-item"
        classList={{ 'active': navView('Library') }}
        onClick={() => saveHome('Library')}
      >
        <i class={navView('Library') ? "ri-archive-stack-line" : "ri-archive-stack-line"}></i>
        <span>Library</span>
      </div>

      <div
        class="nav-item"
        classList={{ 'active': navView('Premium') }}
        onClick={() => saveHome('Premium')}
      >
        <i class={navView('Premium') ? "ri-star-fill" : "ri-star-line"}></i>
        <span>Premium</span>
      </div>
    </nav>
  );
}
