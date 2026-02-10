/* @refresh reload */

import { For, lazy, onMount, Show } from 'solid-js';
import '../styles/global.css';
import { navStore, playerStore, setStore, store } from '@lib/stores';
import { config } from '@lib/utils';
import NavBar from '@components/NavBar.tsx';
import Sidebar from '@components/Sidebar';
import PlayerBar from '@components/PlayerBar';

const MiniPlayer = lazy(() => import('../components/MiniPlayer'));
const ActionsMenu = lazy(() => import('../components/ActionsMenu'));
const SnackBar = lazy(() => import('../components/SnackBar'));

export default function() {

  onMount(async () => {
    await import('../lib/modules/start.ts').then(mod => mod.default());

    setStore('syncState', 'synced'); // Initialize syncState

    // Initial sync attempt
    if (config.dbsync) {
      setStore('syncState', 'synced'); // Initialize syncState to synced
      import('@lib/modules/cloudSync').then(({ runSync }) => {
        runSync(config.dbsync);
      });
    }
  });

  return (
    <>
      <main>
        <Sidebar />
        <div class="main-content">
          <For each={Object.values(navStore)}>
            {(item) =>
              <Show when={item.state}>
                <item.component />
              </Show>
            }
          </For>
        </div>
      </main>

      <footer>
        <Show when={!navStore.player.state && playerStore.playbackState !== 'none'}>
          <MiniPlayer />
        </Show >
        <NavBar />

        <Show when={playerStore.playbackState !== 'none' || playerStore.isMusic}>
           <PlayerBar />
        </Show>
      </footer>

      <Show when={store.actionsMenu?.id}>
        <ActionsMenu />
      </Show>
      <Show when={store.snackbar}>
        <SnackBar />
      </Show>
    </>
  );
}
