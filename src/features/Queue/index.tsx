import { onMount, Show, lazy } from 'solid-js';
import './Queue.css';
import { queueStore, setNavStore, t, setQueueStore, setStore, totalQueueDuration } from "@lib/stores";
import List from "./List";
import Dropdown from './Dropdown';
import { config, setConfig } from '@lib/utils';

const Standby = lazy(() => import('./Standby'));

export default function() {

  let queueSection!: HTMLDivElement;

  onMount(() => {
    setNavStore('queue', 'ref', queueSection);
    queueSection.scrollIntoView();
  });

  return (
    <section
      class="queueSection"
      ref={queueSection}
    >

      <div class="queue-brand"><span class="sonic-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span>Sonic Boome</span></div>
      <header>
        <div class="queue-heading"><h1>{t('nav_queue')}</h1><p>{queueStore.list.length} {document.documentElement.lang.startsWith('es') ? 'canciones' : 'tracks'}<Show when={queueStore.list.length}> · {totalQueueDuration(queueStore.list)}</Show></p></div>
        <div class="right-group">
          <i
            class="ri-shuffle-line"
            aria-label={t('queue_shuffle')}
            onclick={() => {
              setQueueStore('list', (list) => {
                const shuffled = [...list];
                for (let i = shuffled.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                return shuffled;
              });
            }}
          ></i>

          <i
            class="ri-indeterminate-circle-line"
            classList={{
              on: queueStore.removeMode,
            }}
            aria-label={t('queue_remove_mode')}
            onclick={() => {
              setQueueStore('removeMode', !queueStore.removeMode);
            }}
          ></i>
        </div>

        <Dropdown
        />
      </header>

      <Show
        when={!queueStore.isLoading}
        fallback={<i class="ri-loader-3-line"></i>}
      >
        <Show when={queueStore.list.length === 0}>
          <div class="queue-empty"><span class="queue-empty-icon ms material-symbols-outlined" aria-hidden="true">queue_music</span><h2>{document.documentElement.lang.startsWith('es') ? 'Tu cola está vacía' : 'Your queue is empty'}</h2><p>{document.documentElement.lang.startsWith('es') ? 'Añade canciones y disfruta tu música sin parar.' : 'Add songs to keep your music playing.'}</p><button type="button" onclick={() => { setNavStore('queue', 'state', false); setNavStore('home', 'state', true); setStore('homeView', 'Search'); setConfig('home', 'Search'); requestAnimationFrame(() => document.querySelector('.home')?.scrollIntoView()); }}>{document.documentElement.lang.startsWith('es') ? 'Buscar música' : 'Find music'}</button></div>
        </Show>
        <Show when={queueStore.list.length > 0}><h2 class="queue-next-title">{document.documentElement.lang.startsWith('es') ? 'A continuación' : 'Up next'}</h2></Show>
        <List />
        <Show when={
          queueStore.list.length === 0 &&
          config.contextualFill && config.similarContent}>
          <Standby />
        </Show>
      </Show>
    </section >
  );
}
