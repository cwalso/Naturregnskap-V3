import { useState } from 'react'
import type { OverviewImage } from './content'

export function OverviewPhoto({ image, eager = false }: { readonly image: OverviewImage; readonly eager?: boolean }) {
  const [failed, setFailed] = useState(false)
  const url = `https://images.unsplash.com/photo-${image.photoId}`
  return <figure className="overview-photo">
    <div className="overview-photo__frame">
      <img src={`${url}?auto=format&fit=crop&w=1000&q=80`}
        srcSet={[480, 800, 1200].map(width => `${url}?auto=format&fit=crop&w=${width}&q=80 ${width}w`).join(', ')}
        sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 560px"
        alt={image.alt} width="1200" height="800" loading={eager ? 'eager' : 'lazy'} decoding="async"
        hidden={failed} onError={() => setFailed(true)} />
      {failed && <div className="overview-photo__fallback" role="img" aria-label={image.alt}>
        <span>Bilde er ikke tilgjengelig akkurat nå.</span><small>{image.alt}</small>
      </div>}
    </div>
    <figcaption>Illustrasjonsfoto · {image.location}<br />
      <a href={`https://unsplash.com/photos/${image.id}`} target="_blank" rel="noreferrer">{image.photographer} / Unsplash</a>
    </figcaption>
  </figure>
}
