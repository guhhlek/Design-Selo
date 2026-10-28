import { useEffect, useRef, useState } from 'react'
import { contact } from '../data/contact'
import { useInView } from '../lib/useInView'
import './showroom-map.css'

/**
 * Showroom position on Rua São Paulo, Água Verde, Curitiba. The address number is
 * not in OpenStreetMap, so the point follows the brand's own published map
 * (dsgnselo.com/contato): west side of Rua São Paulo, about 45% of the block from
 * Rua Amazonas (-25.462313, -49.279718) towards Rua Pará (-25.463268, -49.279277).
 */
const SHOWROOM: [number, number] = [-25.46275, -49.27964]

/**
 * Minimal light-grey base (no key required) plus its street-name layer.
 * For production traffic, point VITE_MAP_TILES at a keyed provider's raster URL
 * ({z}/{x}/{y}); the base below is then replaced and the labels layer dropped.
 */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas'
const TILE_LAYERS: { url: string; attribution?: string }[] = import.meta.env.VITE_MAP_TILES
  ? [{ url: import.meta.env.VITE_MAP_TILES, attribution: import.meta.env.VITE_MAP_ATTRIBUTION ?? '© OpenStreetMap' }]
  : [
      { url: `${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, attribution: 'Esri, HERE, Garmin, © OpenStreetMap' },
      { url: `${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}` },
    ]

const directions = {
  google: `https://www.google.com/maps/dir/?api=1&destination=${SHOWROOM.join(',')}`,
  waze: `https://waze.com/ul?ll=${SHOWROOM.join(',')}&navigate=yes`,
}

/**
 * A real, explorable map in the site's own tones: a minimal base warmed to paper,
 * and the showroom marked as a point of 2700K light rather than a pin.
 */
export function ShowroomMap() {
  const [ref, inView] = useInView<HTMLDivElement>(0.05)
  const mapRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const address = contact.showroom.lines.join(', ')

  useEffect(() => {
    if (!inView) return
    let map: import('leaflet').Map | undefined
    let disposed = false
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
      .then(([{ default: L }]) => {
        if (disposed || !mapRef.current) return
        const touch = window.matchMedia('(pointer: coarse)').matches
        map = L.map(mapRef.current, {
          center: SHOWROOM,
          zoom: 16,
          minZoom: 12,
          maxZoom: 18,
          zoomControl: false,
          scrollWheelZoom: false, // the page keeps the wheel
          dragging: !touch, // one finger keeps scrolling the page on phones
          attributionControl: true,
        })
        for (const layer of TILE_LAYERS) {
          L.tileLayer(layer.url, { maxNativeZoom: 16, maxZoom: 18, attribution: layer.attribution }).addTo(map)
        }
        L.control.zoom({ position: 'topright', zoomInTitle: 'Aproximar', zoomOutTitle: 'Afastar' }).addTo(map)
        L.marker(SHOWROOM, {
          icon: L.divIcon({
            className: 'showroom-light',
            html: '<span class="showroom-light__halo"></span><span class="showroom-light__ring"></span><span class="showroom-light__core"></span>',
            iconSize: [120, 120],
            iconAnchor: [60, 60],
          }),
          keyboard: false,
          title: 'Showroom dsgnselo',
        }).addTo(map)
        // the light sits a little right of centre so the address card never covers it
        if (!touch) map.panBy([-140, 0], { animate: false })
      })
      .catch(() => setFailed(true))
    return () => {
      disposed = true
      map?.remove()
    }
  }, [inView])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // clipboard blocked: nothing to do, the address is on screen
    }
  }

  return (
    <div ref={ref} className="smap">
      <div ref={mapRef} className="smap__canvas" role="region" aria-label={`Mapa do showroom: ${address}`}>
        {failed && <p className="smap__fallback">{address}</p>}
      </div>
      <div className="smap__card">
        <p className="smap__label">{contact.showroom.label} dsgnselo</p>
        <address className="smap__address">
          {contact.showroom.lines.map((l) => <span key={l}>{l}</span>)}
        </address>
        <div className="smap__actions">
          <a href={directions.google} target="_blank" rel="noreferrer">Google Maps ↗</a>
          <a href={directions.waze} target="_blank" rel="noreferrer">Waze ↗</a>
          <button type="button" onClick={copy} aria-live="polite">{copied ? 'Endereço copiado' : 'Copiar endereço'}</button>
        </div>
      </div>
    </div>
  )
}
