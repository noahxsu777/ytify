import { createSignal } from 'solid-js';
import './GreetingCard.css';
import { hostResolver } from '@lib/utils';
import { setListStore, getList } from '@lib/stores';

export default function GreetingCard(props: {
  title: string;
  thumbnail: string;
  url: string;
}) {
  const [imgError, setImgError] = createSignal(false);

  return (
    <a
      class="greeting-card"
      href={hostResolver(props.url)}
      onClick={(e) => {
        e.preventDefault();
        setListStore('thumbnail', props.thumbnail);
        if (props.url.startsWith('/channel'))
           getList(props.url.slice(9), 'channel');
        else if (props.url.includes('MPREb'))
           getList(props.url.split('/').pop()!, 'album')
        else if (props.url.startsWith('/playlist')) {
           getList(props.url.slice(10), 'playlist')
        }
        else getList(props.url.slice(8), 'artist');
      }}
    >
      <div class="img-container">
        <img
          src={imgError() ? '/logo192.png' : props.thumbnail}
          onError={() => setImgError(true)}
          alt={props.title}
        />
      </div>
      <span class="title">{props.title}</span>
      <div class="play-btn">
        <i class="ri-play-fill"></i>
      </div>
    </a>
  );
}
