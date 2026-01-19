import { Match, Show, Switch, lazy, onMount } from 'solid-js';
import './Home.css';
import { config } from '@lib/utils';
import { setNavStore, store, t } from '@lib/stores';
import Dropdown from './Dropdown';

const About = lazy(() => import('./About'));
const Hub = lazy(() => import('./Hub'));
const Search = lazy(() => import('./Search'));
const Library = lazy(() => import('./Library'));


export default function() {

  let syncBtn!: HTMLElement;
  let homeRef!: HTMLElement;

  onMount(() => {
    homeRef.scrollIntoView();
    setNavStore('home', 'ref', homeRef);
  });

  const map: Record<string, TranslationKeys> = {
    'Hub': 'nav_hub',
    'Library': 'nav_library',
    'Search': 'nav_search'
  };


  return (
    <section class="home" ref={homeRef}>

      <Show when={store.homeView !== 'Hub' && store.homeView !== 'Premium'}>
        <header>
          <p>
            {store.homeView ? t(map[store.homeView]) : 'Sonic'}</p>

          <Show when={config.dbsync}>
            <i
              id="syncNow"
              classList={{
                'ri-cloud-fill': store.syncState === 'synced',
                'ri-loader-3-line': store.syncState === 'syncing',
                'ri-cloud-off-fill': store.syncState === 'dirty' || store.syncState === 'error',
                'error': store.syncState === 'error',
              }}
              aria-label={
                (store.syncState === 'dirty' || store.syncState === 'error') ?
                  'Save to Cloud' :
                  store.syncState === 'synced' ?
                    'Import from Cloud' : 'Syncing'
              }
              ref={syncBtn}
              onclick={() => {
                import('@lib/modules/cloudSync').then(({ runSync }) => {
                  runSync(config.dbsync);
                });
              }}
            ></i>
          </Show>

          <Dropdown />
        </header>
      </Show>

      <Switch fallback={<About />}>
        <Match when={store.homeView === 'Hub'}>
          <Hub />
        </Match>
        <Match when={store.homeView === 'Library'}>
          <Library />
        </Match>
        <Match when={store.homeView === 'Search'}>
          <Search />
        </Match>
        <Match when={store.homeView === 'Premium'}>
            <div style={{ padding: "2rem", "text-align": "center", "margin-top": "20vh" }}>
                <h1>Premium</h1>
                <p>Unlock high quality audio and offline listening.</p>
                <button style={{
                    "background-color": "var(--primary)",
                    "color": "black",
                    "padding": "1rem 2rem",
                    "border-radius": "2rem",
                    "border": "none",
                    "margin-top": "1rem",
                    "font-weight": "bold",
                    "font-size": "1.1rem"
                }}>
                    Get Premium
                </button>
            </div>
        </Match>

      </Switch>

    </section >
  )
}
