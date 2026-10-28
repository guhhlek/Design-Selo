import { useEffect } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { SiteHeader } from './components/SiteHeader'
import { Home } from './pages/Home'
import { CollectionPage } from './pages/CollectionPage'
import { ProductPage } from './pages/ProductPage'
import { SobrePage } from './pages/SobrePage'
import { DesignersPage } from './pages/DesignersPage'
import { PremiosPage } from './pages/PremiosPage'
import { ContatoPage } from './pages/ContatoPage'
import { SiteFooter } from './components/SiteFooter'
import { jumpTo, useSmoothScroll } from './lib/smoothScroll'
import { useReducedMotionChoice } from './lib/usePrefersReducedMotion'

/** Route changes start at the top; `/#id` links land on their section. */
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
    } else {
      jumpTo(0)
    }
  }, [pathname, hash])
  return null
}

function Layout() {
  const { reduced } = useReducedMotionChoice()
  useSmoothScroll(!reduced)
  return (
    <>
      <ScrollManager />
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="colecoes/:slug" element={<CollectionPage />} />
          <Route path="colecoes/:slug/:product" element={<ProductPage />} />
          <Route path="sobre" element={<SobrePage />} />
          <Route path="designers" element={<DesignersPage />} />
          <Route path="premios" element={<PremiosPage />} />
          <Route path="contato" element={<ContatoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
