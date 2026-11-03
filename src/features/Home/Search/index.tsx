import { createSignal, onCleanup, Show, For } from "solid-js";
import './Search.css';
import Results from './Results';
import Input from "./Input";
import { getSearchResults, resetSearch, searchStore, setSearchStore, updateParam } from "@lib/stores";
import Filters from "./Filters";
import { config, setConfig } from "@lib/utils";

const categories = [
  { label: 'Pop',        gradient: 'linear-gradient(135deg,#E13300,#FF6437)', shadow: 'rgba(225,51,0,0.3)',   query: 'pop music hits' },
  { label: 'Hip-Hop',   gradient: 'linear-gradient(135deg,#BC59FF,#8C67AC)', shadow: 'rgba(188,89,255,0.3)', query: 'hip hop rap' },
  { label: 'Latin',     gradient: 'linear-gradient(135deg,#E1118C,#FC6467)', shadow: 'rgba(225,17,140,0.3)', query: 'latin reggaeton' },
  { label: 'Rock',      gradient: 'linear-gradient(135deg,#444,#111)',        shadow: 'rgba(255,255,255,0.08)', query: 'rock music classic' },
  { label: 'Electronic',gradient: 'linear-gradient(135deg,#477D95,#172F3B)', shadow: 'rgba(71,125,149,0.3)', query: 'electronic edm dance' },
  { label: 'Jazz',      gradient: 'linear-gradient(135deg,#983000,#E1714A)', shadow: 'rgba(152,48,0,0.3)',   query: 'jazz blues smooth' },
  { label: 'Classical', gradient: 'linear-gradient(135deg,#4328FF,#7474FF)', shadow: 'rgba(67,40,255,0.3)',  query: 'classical orchestra' },
  { label: 'Workout',   gradient: 'linear-gradient(135deg,#5D377B,#9069B0)', shadow: 'rgba(93,55,123,0.3)',  query: 'workout gym motivation' },
];

export default function() {
  onCleanup(resetSearch);
  const [activeFilter, setActiveFilter] = createSignal(config.searchFilter);
  const es = () => document.documentElement.lang.startsWith('es');
  const chips = () => [
    { value: 'all', label: es() ? 'Todos' : 'All' },
    { value: 'music_songs', label: es() ? 'Canciones' : 'Songs' },
    { value: 'music_artists', label: es() ? 'Artistas' : 'Artists' },
    { value: 'music_playlists', label: es() ? 'Listas' : 'Playlists' },
  ];
  function changeFilter(value: string) {
    searchStore.observer.disconnect();
    setActiveFilter(value);
    setSearchStore({ page: 1, results: [] });
    setConfig('searchFilter', value);
    updateParam('f', value === 'all' ? '' : value);
    if (searchStore.query.trim()) getSearchResults();
  }

  function searchCategory(q: string) {
    import('@lib/stores').then(({ setSearchStore, getSearchResults }) => {
      setSearchStore('query', q);
      setSearchStore('page', 1);
      setSearchStore('results', []);
      getSearchResults();
    });
  }

  return (
    <div class="search">
      <div class="search-brand"><span class="sonic-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span>Sonic Boome</span></div>
      <div class="search-intro"><h1>{es() ? 'Buscar' : 'Search'}</h1><p>{es() ? 'Encuentra canciones, artistas, álbumes y listas' : 'Find songs, artists, albums and playlists'}</p></div>
      <form class="superInputContainer" onsubmit={e => e.preventDefault()}>
        <span class="search-icon ms material-symbols-outlined" aria-hidden="true">search</span>
        <Input />
        <Filters value={activeFilter()} onFilterChange={setActiveFilter} />
      </form>
      <div class="search-chips" aria-label={es() ? 'Filtros de búsqueda' : 'Search filters'}>
        <For each={chips()}>{chip => <button type="button" classList={{ active: activeFilter() === chip.value }} aria-pressed={activeFilter() === chip.value} onclick={() => changeFilter(chip.value)}>{chip.label}</button>}</For>
      </div>
      <Show when={searchStore.query && (searchStore.isLoading || searchStore.results.length > 0)}><h2 class="search-results-title">{es() ? 'Resultados' : 'Results'} <span aria-hidden="true">✦</span></h2></Show>

      {/* Keep categories visible while typing; only hide once a search is in flight or has results. */}
      <Show when={!searchStore.isLoading && searchStore.results.length === 0}>
        <div class="category-grid">
          {categories.map(cat => (
            <div
              class="category-card"
              style={{ background: cat.gradient, 'box-shadow': `0 8px 24px ${cat.shadow}` }}
              onclick={() => searchCategory(cat.query)}
            >
              <span class="cat-label">{cat.label}</span>
            </div>
          ))}
        </div>
      </Show>

      <Results />
    </div>
  );
}
