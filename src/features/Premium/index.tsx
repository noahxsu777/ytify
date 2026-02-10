import { onMount } from "solid-js";
import './Premium.css';
import { closeFeature, setNavStore, t } from '@lib/stores';

export default function() {
  let premiumSection!: HTMLDivElement;

  onMount(() => {
    setNavStore('premium', 'ref', premiumSection);
    premiumSection.scrollIntoView();
  });

  return (
    <section
      ref={premiumSection}
      class="premiumSection"
    >
      <header>
        <p>{t('premium_title')}</p>
        <i
          aria-label={t('close')}
          class="ri-close-large-line"
          onclick={() => closeFeature('premium')}
        ></i>
      </header>

      <div class="premium-hero">
        <i class="ri-vip-crown-2-fill premium-icon"></i>
        <h2>{t('premium_title')}</h2>
        <p>{t('premium_subtitle')}</p>
      </div>

      <div class="premium-features">
        <div class="premium-feature-card">
          <div class="feature-icon">
            <i class="ri-headphone-fill"></i>
          </div>
          <div class="feature-text">
            <h3>{t('premium_high_quality')}</h3>
            <p>{t('premium_high_quality_desc')}</p>
          </div>
        </div>

        <div class="premium-feature-card">
          <div class="feature-icon">
            <i class="ri-download-cloud-2-fill"></i>
          </div>
          <div class="feature-text">
            <h3>{t('premium_offline')}</h3>
            <p>{t('premium_offline_desc')}</p>
          </div>
        </div>

        <div class="premium-feature-card">
          <div class="feature-icon">
            <i class="ri-shield-check-fill"></i>
          </div>
          <div class="feature-text">
            <h3>{t('premium_no_ads')}</h3>
            <p>{t('premium_no_ads_desc')}</p>
          </div>
        </div>

        <div class="premium-feature-card">
          <div class="feature-icon">
            <i class="ri-skip-forward-fill"></i>
          </div>
          <div class="feature-text">
            <h3>{t('premium_unlimited_skips')}</h3>
            <p>{t('premium_unlimited_skips_desc')}</p>
          </div>
        </div>
      </div>

      <button class="premium-cta">
        {t('premium_get_premium')}
      </button>

      <p class="premium-note">
        {t('premium_note')}
      </p>
    </section>
  );
}
