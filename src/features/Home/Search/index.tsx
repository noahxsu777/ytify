import { onCleanup, Show } from "solid-js";
import './Search.css';
import Results from './Results';
import Input from "./Input";
import { resetSearch, searchStore } from "@lib/stores";
import Filters from "./Filters";

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
      <form class="superInputContainer" onsubmit={e => e.preventDefault()}>
        <Input />
        <Filters />
      </form>

      {/* Category grid — only shown when no query entered */}
      <Show when={!searchStore.query}>
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
