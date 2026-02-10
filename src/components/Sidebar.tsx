import { navStore, setNavStore, setStore, store, t } from "@lib/stores";
import './Sidebar.css';

export default function Sidebar() {

  type Nav = 'Hub' | 'Library' | 'Search';

  function saveHome(name: '' | Nav) {
    if (store.homeView === name && navStore.home.state) {
      setNavStore('home', 'state', false);
    } else {
      setStore('homeView', name);
      setNavStore('home', 'state', true);
      // scroll to top logic if needed
    }
  }

  const navView = (item: Nav) => navStore.home.state && store.homeView === item;

  return (
    <nav class="sidebar">
      <div class="sidebar-logo">
        <i class="ri-spotify-fill" style="font-size: 40px; color: var(--text);"></i>
        <span>Sonic Boom</span>
      </div>

      <ul class="nav-links">
        <li
          class={navView('Hub') ? 'active' : ''}
          onClick={() => saveHome('Hub')}
        >
          <i class={navView('Hub') ? "ri-home-4-fill" : "ri-home-4-line"}></i>
          <span>{t('nav_hub')}</span>
        </li>
        <li
          class={navView('Search') ? 'active' : ''}
          onClick={() => saveHome('Search')}
        >
          <i class={navView('Search') ? "ri-search-fill" : "ri-search-line"}></i>
          <span>{t('nav_search')}</span>
        </li>
        <li
          class={navView('Library') ? 'active' : ''}
          onClick={() => saveHome('Library')}
        >
          <i class={navView('Library') ? "ri-book-3-fill" : "ri-book-3-line"}></i>
          <span>{t('nav_library')}</span>
        </li>
      </ul>

      <div class="sidebar-divider"></div>

      <ul class="library-links">
        <li class="create-playlist">
           <div class="icon-box add">
             <i class="ri-add-fill"></i>
           </div>
           <span>Create Playlist</span>
        </li>
        <li class="liked-songs" onClick={() => {
           // Logic to go to Liked Songs (Favorites collection)
           // Typically handled via URL params or store action
           // Assuming favorites collection ID is 'favorites'
           // We'll mimic navigating to a playlist/collection
           // For now just console log or TODO
        }}>
           <div class="icon-box liked">
             <i class="ri-heart-fill"></i>
           </div>
           <span>Liked Songs</span>
        </li>
      </ul>

      <div class="sidebar-divider"></div>

      <div class="playlists-scroll">
         {/* Placeholder for user playlists */}
         <p style="padding: 0 24px; font-size: 14px; opacity: 0.7;">Your Playlists will appear here</p>
      </div>
    </nav>
  );
}
