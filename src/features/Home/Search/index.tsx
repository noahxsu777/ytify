import { onCleanup, Show } from "solid-js";
import './Search.css';
import Results from './Results';
import Input from "./Input";
import { resetSearch, searchStore } from "@lib/stores";
// import Filters from "./Filters"; // Hidden to match design
import SearchHome from "./SearchHome";

export default function() {

  onCleanup(resetSearch);

  return (
    <div class="search-view">
      <div class="search-header">
         <h1 class="search-title">Search</h1>
         <div class="search-bar-container">
            <i class="ri-search-line search-icon"></i>
            <Input />
         </div>
         {/* <Filters /> */}
      </div>

      <Show when={!searchStore.query}>
         <SearchHome />
      </Show>

      <Show when={searchStore.query}>
         <Results />
      </Show>
    </div>
  );
}
