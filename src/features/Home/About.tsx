import { setStore, t } from '@lib/stores';
import { setConfig } from '@lib/utils';
import './About.css';

export default function About() {
  const es = () => document.documentElement.lang.startsWith('es');
  return (
    <div class="about-sonic">
      <div class="about-sonic-card">
        <div class="about-sonic-mark" aria-hidden="true"><span class="sonic-wave"><i></i><i></i><i></i><i></i><i></i></span></div>
        <span class="about-sonic-eyebrow">SONIC BOOME</span>
        <h1>{es() ? 'Tu música, a tu ritmo.' : 'Your music, your rhythm.'}</h1>
        <p>{es() ? 'Descubre música, guarda tus canciones favoritas y crea tu propia experiencia de escucha.' : 'Discover music, save your favorites and make your listening experience your own.'}</p>
        <button type="button" onclick={() => { setStore('homeView', 'Hub'); setConfig('home', 'Hub'); }}>{es() ? 'Explorar música' : 'Explore music'} <span class="ms material-symbols-outlined" aria-hidden="true">arrow_forward</span></button>
        <div class="about-sonic-bottom"><span>SONIC BOOME</span><span>{t('nav_library')} · {t('nav_search')}</span></div>
      </div>
    </div>
  );
}
