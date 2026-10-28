/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** raster tile URL template for the showroom map ({z}/{x}/{y}) */
  readonly VITE_MAP_TILES?: string
  readonly VITE_MAP_ATTRIBUTION?: string
}
