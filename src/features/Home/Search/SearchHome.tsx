import { For, createMemo } from "solid-js";
import { getCollection, getTracksMap, generateImageUrl } from "@lib/utils";
import './Search.css';

const GENRES = [
  { title: "Podcasts", color: "#27856a", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA6VjNcvU3FXrzOqQD5I4Z7dC0By-dWgEkhs68kL3IvWJ873U-ru3t5IOqvdGHwZkg_NHPojXmInmpNQ7g_AwYU76nf0SOh4KvtNkvzA1xKSh25blTGvbtjKO0kzkkLSKcoD2hvZMqVK4MFLWnynee_urHC6f5nrpkAm6l_gQhVaJWbkLYD7c70y2wOlaVJuk7HIoBabd7626_puUVh07VjAQLtzz7C5exjdlapBthxHsBJm4TUkhzuMNz4lHc08eIxOvkgJBMESZ4W" },
  { title: "Pop", color: "#8d67ab", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCR365a4IRu716lLu7hV9SwzTZHgXEj-ePIHVEqPzj8rfZgXAJsZfoJcWFF0SNuWJCUp4qMbl6ODMKrwkDmShhZAmB-Bu3rCvr5csKYmr2OL8tvgOg0YEAdSR6YnNJna6i-C36ZoAjXk0wQg_6GV-Zb-ens0DwVYmCO4o6yW9MSBhsEWsDd4Fs4WUNYp7NvReVBS4wMjhRQRXipHW4tNfqgtqegja8FSiw-r4OBmPAokwdTkDzVpA-4aQJU9ReThn_xQFUT1LhQ-ecu" },
  { title: "Hip-Hop", color: "#ba5d07", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCacrTGfz76Q_C3JpCsR5cg2hZiUekKeVOlj-4pUjkbHm4JHyJpZGcwvCtfaoppSqrUDCMOT-kgHop8fW4LKzJLikQvMsdowN1g2al0YkCJXpOv2DjqFMP0k_EvOmgixqNxuoYTYgbEhjPOvRmkJtts-hQ1IDbYfaAmX_wWP7IzNCXDeHA60gAb_LRGRUsfHxLxb7C2uIPCSu9MV_f7o3zsG33UygVL59uPgcraCqr161qkdLOOox0q6UKxrJrDipJ0mcpQKBHH7UUH" },
  { title: "Rock", color: "#e8115b", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAVStTW1ClecBHjDlsMfIhWSTN99NNJ-6vrd2uQ8fXTYX83dCafZxdf25vQANBcgnaZBdsMPMoF-Hw9nXOxT5WtRxVngbES4S8Nx7JDyAau3UJDgHSU9yRSJGX8_fXs1Xdu_UFRW8hpuMkHmHTyPwN6uUpRmvmlfZmx3Dc2gpWOy1F_etINRP_8YY3mYCGdjPDx5XE914-9TPRzvhQUS-LjYl-xZC64iRTapC_AdSmu_nUdhgIkxK4t2Un-8QoLGJwFfpL39ct8UqhW" },
  { title: "Indie", color: "#608108", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD46dSV0BnhDBL8vmMv5pYNmtKBf6OSIQ3Ae2BEZhy__KW0aor4SC4gwn6YqCz_lGmcnhfALvLkV5oze7nzHXZ9aqg1M_0KkchBEPGlg_h50aqiMoroXgNgmjvWCqVIP4Yvp-JutfNqHIhxvL9JHmwZ3MqHaVvuYHXELc8vkvZGK0NGYrO2dq_9fY5PBC_-31JoGTyvkz3fTKBxmdFRk2-0IoykwjP490NY0PHKumhgk1LRD3NzV3WtHBnz4vb6g3YJioaJSdQZEnkE" },
  { title: "Dance", color: "#503750", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9jXHwTnT6gw1BGq6ykkv46I3-LuorfhFswT6MEcN5pdWE7jBaHSR32IvGt5aj0lm9ElR0UIk1eGTBi3omCl7LEbaDygWQQWEV3oFzI4wnoaqRjjYsH7PbGwiGIbgOpr6OHB_UHaRGLLrdhl43XcUSdDJpBGSqmB_4rbV509cds5Qts1d5rGQpljrw6gaxdTO2Ch8aTbFVO3_9CPP5nf2nKMdfkChBSTMxzRBzDN3YEYLbCNJnK5OXat28sZX8CwI9c-JEI3lYkq_P" },
  { title: "Workout", color: "#777777", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA16664pos0Fq0aO69Jn63HE13ppcfeOJHfbhdxjsfX-JhtygXwTAzsah8SFGb3dL5XWoXIdPwftMXIQE6FeDWwcSLpG3NFv7ocGwF2k1lqGXN_WJjE4yzBMroCvR7UyXP3sLmKtnxTMvq6jyObBzIw4exdTNh4k-mbQOf7MzkMVEvW0eTSnzdkQVlWsMPmxEd5q-MqLT6qvD3-QImsSvUllZc3jzFFAV1UqZOuQ4b4XO8TAyOATbBZizA3s-VYardNZL_AFfvPSp7g" },
  { title: "Sleep", color: "#1e3264", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC08GLvwI6n6dMPN_5cvRy6I1rJXzZn6qmFnx6Ezq9t8J4FYTQisWdNWH3p5IN4vUTKqYu5fKkigkc_L-uFB5r4B9nJrAw7yvB_PW2PxUwa8-CHQr7jbSgo7VLdL0ZYqwS8GVENqjO5HhMJXRzhBEUNl35mrf4f6-iRkrubD6K-DywfbDcehLiYdUBOIC_gXPLZAsUJa_loKmzWUSpdGR_BgfmywkgK-IoEAWGAhOTLmd08-vGxJZYlnyB3wsiMAXV1wKY9ATmFND1G" },
  { title: "Jazz", color: "#b02897", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBGxsiLcilY_Ot40rds0bCGcGnec24ibChDJNXhA2WhHXVr5FBzgnUGLNTDzzSdOUbSTmMZe24mh47CU_S-YoQQOg1HPURNDC-ZTuwI_s1R3Qb9t6iPNrky6oORbkj5ONC0LWNva767-EImvRyqu8ekEdhxaa2caeWqmJC-EvugfjP25D-HoeKzzNLl5TwDHbfNY9OjOLJGTBS34SBq_SbgsGpLkCMSFuc0CUA8mNXgUrROQrzQmzONv9iQylmjWqMQ477gxvWqKW7F" },
  { title: "Focus", color: "#503750", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB6EdN2mddFgCXOPwEfgZ2AkxPEowxmYAxSRiTIvAHH5hiDougL4XArJR7GZhDEG2AevkGRgvFFjZke6z5TVq0lSduyiHPWC4sfvtv4QX0VDBXuAYpSV0RqVJemd1OlxLenI639QbzAD7koEdacWKgNShkTV0g4Bs11qf5toGt8T38MrwTSeDJMKVXrz_iIb8403TALCoJVQwHD0xPusJBqJVb6M65PzojnZE8TkRS1VfXMpJK5NP3lPMVeqr3EgrX7RCKi_qpMjFUB" },
];

export default function SearchHome() {
  const tracksMap = getTracksMap();
  const recents = createMemo(() => getCollection('history')
    .slice(0, 10)
    .map(id => tracksMap[id])
    .filter(Boolean) as CollectionItem[]);

  return (
    <div class="search-home">
      {/* Recent Searches (using History for visuals) */}
      <section class="recent-searches-section">
        <h2 class="section-title">Recent searches</h2>
        <div class="recent-searches hide-scrollbar">
          <For each={recents()}>
            {(item) => (
              <div class="recent-item">
                <div class="recent-img-container">
                  <img
                    src={generateImageUrl(item.id, 'mq')}
                    alt={item.title}
                    class="recent-img"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                </div>
                <span class="recent-name">{item.title}</span>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* Browse All Grid */}
      <section class="browse-all-section">
        <h2 class="section-title">Browse all</h2>
        <div class="browse-grid">
          <For each={GENRES}>
            {(genre) => (
              <div
                 class="genre-card"
                 style={{ "background-color": genre.color }}
              >
                <span class="genre-name">{genre.title}</span>
                <img src={genre.img} alt={genre.title} class="genre-img" />
              </div>
            )}
          </For>
        </div>
      </section>
    </div>
  );
}
