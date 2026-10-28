// Imports the real DSGNSELO catalogue (texts + photographs) from dsgnselo.com
// into this repository, so the site never depends on remote images.
//
//   node scripts/import-catalog.mjs
//
// Output:
//   src/data/catalog.json            typed via src/data/catalog.ts
//   public/assets/media/<id>/{l,s}.webp   l = 2000px max, s = 900px max
//
// Texts are copied verbatim. Nothing is generated or inferred.

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ORIGIN = 'https://www.dsgnselo.com'
const ROOT = path.resolve(import.meta.dirname, '..')
const MEDIA_DIR = path.join(ROOT, 'public/assets/media')
const DATA_FILE = path.join(ROOT, 'src/data/catalog.json')
// original URLs are only needed by scripts; keep them out of the app bundle
const SOURCES_FILE = path.join(ROOT, 'scripts/media-sources.json')
const SIZES = { l: 2000, s: 900 }

const unknownComponents = new Set()

async function getState(route) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(ORIGIN + route, { headers: { 'user-agent': 'Mozilla/5.0 dsgnselo-import' } })
      if (!res.ok) throw new Error(`${res.status} ${route}`)
      const html = await res.text()
      const m = html.match(/__STATE__ = JSON\.parse\("([\s\S]*?)"\)<\/script>/)
      if (!m) throw new Error(`no state in ${route}`)
      const state = JSON.parse(JSON.parse(`"${m[1]}"`))
      const key = Object.keys(state.pt).find((k) => !['appName', 'menu', 'languages', 'labelCode', 'copyright', 'homeUrl', 'socialLinks', 'langTag'].includes(k))
      return state.pt[key]
    } catch (err) {
      if (attempt === 2) throw err
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
    }
  }
}

// ---------- media ----------

const media = new Map() // id -> Promise<Media | null>

function largestUrl(imageTag) {
  const urls = [...imageTag.matchAll(/https:[^\s"]+?\.(?:jpe?g|png|webp)/gi)].map((m) => m[0])
  const score = (u) => {
    const s = u.match(/-(\d+)x(\d+)\.\w+$/)
    return s ? +s[1] : 1e6 // unsuffixed = original
  }
  return urls.sort((a, b) => score(b) - score(a))[0]
}

function importImage(image) {
  if (!image?.imageTag) return null
  if (!media.has(image.id)) media.set(image.id, downloadImage(image))
  return image.id
}

async function downloadImage(image) {
  const dir = path.join(MEDIA_DIR, String(image.id))
  const url = largestUrl(image.imageTag)
  if (!url) return null
  try {
    await fs.mkdir(dir, { recursive: true })
    const done = await fs.stat(path.join(dir, 's.webp')).catch(() => null)
    let meta
    if (!done) {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${res.status} ${url}`)
      const buf = Buffer.from(await res.arrayBuffer())
      for (const [name, max] of Object.entries(SIZES)) {
        await sharp(buf).rotate().resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: name === 'l' ? 82 : 78 }).toFile(path.join(dir, `${name}.webp`))
      }
    }
    meta = await sharp(path.join(dir, 'l.webp')).metadata()
    const { dominant } = await sharp(path.join(dir, 's.webp')).stats()
    const hex = '#' + [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('')
    return { id: image.id, w: meta.width, h: meta.height, tone: hex, caption: clean(image.caption) || undefined, source: url }
  } catch (err) {
    console.warn('  ! image failed', image.id, err.message)
    return null
  }
}

// ---------- text ----------

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;/g, '–').replace(/&#8217;/g, '’')
  .replace(/&#8220;/g, '“').replace(/&#8221;/g, '”').replace(/&quot;/g, '"').replace(/&#215;/g, '×')

function clean(html = '') {
  return decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim()
}

const paragraphs = (html = '') =>
  [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => clean(m[1])).filter(Boolean)

// Product "about" blocks are usually <p>Label<br>Value</p>, but some entries put
// the label and value in separate paragraphs, or add a loose line (e.g. a
// finish variant code) after a value. Labels are canonicalised; values are verbatim.
const LABELS = [
  [/^descri[çc][ãa]o$|^description$/i, 'Descrição'],
  [/^dimens(ão|ao|ões|oes)$/i, 'Dimensão'],
  [/^fonte de luz$/i, 'Fonte de luz'],
  [/^c[óo]digos?$/i, 'Código'],
  [/^acabamentos?$/i, 'Acabamento'],
  [/^materia(l|is)$/i, 'Material'],
]
const labelOf = (s) => LABELS.find(([re]) => re.test(s.trim()))?.[1]

function parseSpecs(html) {
  const specs = []
  let pending = null
  for (const p of paragraphs(html)) {
    const [first, ...rest] = p.split('\n')
    const label = labelOf(first)
    if (label && !rest.length) { pending = label; continue }
    if (pending) { specs.push({ label: pending, value: p }); pending = null; continue }
    if (label) specs.push({ label, value: rest.join('\n') })
    else if (specs.length) specs[specs.length - 1].value += '\n' + p
    else specs.push({ label: '', value: p })
  }
  return specs
}

const slugOf = (link) => link.split('/').filter(Boolean).pop()

// ---------- pages ----------

async function importCollection(item) {
  const page = await getState(item.link)
  const out = {
    slug: slugOf(item.link),
    name: item.heading.trim(),
    letter: item.letter,
    thumb: importImage(item.image),
    cover: null,
    text: [],
    gallery: [],
    products: [],
    designers: [],
  }
  for (const mod of page.modules) {
    switch (mod.component) {
      case 'ModuleImage': out.cover ??= importImage(mod.image); break
      case 'ModuleAbout': out.text = paragraphs(mod.content); break
      case 'ModuleGallery': out.gallery.push(...mod.images.map(importImage).filter(Boolean)); break
      case 'ModuleScroll': out.products = mod.items.map((p) => ({ link: p.link, title: p.title.trim(), thumb: importImage(p.image) })); break
      case 'ModuleThumbs': out.designers = mod.items.map((d) => slugOf(d.link)); designerLinks.push(...mod.items); break
      case 'ModuleBack': break
      default: unknownComponents.add('collection:' + mod.component)
    }
  }
  return out
}

async function importProduct(collectionSlug, ref) {
  const page = await getState(ref.link)
  const out = { slug: slugOf(ref.link), collection: collectionSlug, name: ref.title, image: null, specs: [], gallery: [], thumb: ref.thumb }
  for (const mod of page.modules) {
    switch (mod.component) {
      case 'ModuleImageZoom': case 'ModuleImage': out.image ??= importImage(mod.image); break
      case 'ModuleAbout': out.specs = parseSpecs(mod.content); out.name = clean(mod.title) || out.name; break
      case 'ModuleGallery': out.gallery.push(...mod.images.map(importImage).filter(Boolean)); break
      case 'ModuleBack': break
      default: unknownComponents.add('product:' + mod.component)
    }
  }
  return out
}

const designerLinks = []

async function importDesigner(link) {
  const ref = designerLinks.find((d) => d.link === link)
  const out = { slug: slugOf(link), name: clean(ref.title), text: [], image: importImage(ref.image) }
  let page
  try { page = await getState(link) } catch (err) {
    console.warn('  ! designer page unavailable, keeping name only:', link, err.message)
    return out
  }
  for (const mod of page.modules ?? []) {
    if (mod.component === 'ModuleAbout' || mod.component === 'ModuleProfile') {
      out.name = clean(mod.title) || out.name
      out.text = paragraphs(mod.content)
      if (mod.expertise) out.role = clean(mod.expertise)
      if (mod.image) out.image = importImage(mod.image) ?? out.image
    }
    else if (mod.component === 'ModuleDesignerRelated' || mod.component === 'ModuleBack') continue
    else if (/Image/.test(mod.component)) out.image = importImage(mod.image) ?? out.image
    else unknownComponents.add('designer:' + mod.component)
  }
  out.name ||= clean(page.title)
  return out
}

async function pool(items, size, fn) {
  const results = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) { const n = i++; results[n] = await fn(items[n], n) }
  }))
  return results
}

// ---------- run ----------

const home = await getState('/')
const about = await getState('/sobre')
const index = await getState('/colecoes')

console.log(`collections: ${index.items.length}`)
const collections = await pool(index.items, 3, async (item) => {
  const c = await importCollection(item)
  c.products = await pool(c.products, 3, (ref) => importProduct(c.slug, ref))
  console.log(`  ${c.name}: ${c.products.length} products, ${c.gallery.length} gallery`)
  return c
})

const uniqueDesigners = [...new Map(designerLinks.map((d) => [d.link, d])).keys()]
const designers = await pool(uniqueDesigners, 3, importDesigner)

const studio = {
  homeImage: importImage(home.modules.find((m) => m.image)?.image),
  about: about.modules.map((m) => m.component === 'ModuleText'
    ? { kind: 'text', blocks: paragraphs(m.content) }
    : { kind: 'image', image: importImage(m.image) }),
}

// institutional pages, verbatim
const contactPage = await getState('/contato')
const awardsPage = await getState('/conquistas')
const designersIndex = await getState('/designers')
const pages = {
  contact: {
    blocks: (contactPage.modules.find((m) => m.component === 'ModuleTextBlocks')?.blocks ?? []).map((b) => ({
      title: clean(b.title),
      // keep paragraphs with their line breaks; links are kept as [text](href)
      paragraphs: [...b.content.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map((m) => decode(m[1]
          .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => `[${clean(text)}](${href})`)
          .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, ''))
          .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim())
        .filter(Boolean),
    })),
    map: importImage(contactPage.modules.find((m) => m.component === 'ModuleImage')?.image),
  },
  awards: (awardsPage.modules.find((m) => m.component === 'ModuleGallery')?.images ?? []).map(importImage).filter(Boolean),
  designers: designersIndex.items.map((d) => slugOf(d.link)),
}

console.log(`downloading ${media.size} images...`)
const resolved = {}
const sources = {}
for (const [id, p] of media) {
  const m = await p
  if (!m) continue
  const { source, ...rest } = m
  resolved[id] = rest
  sources[id] = source
}

await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
await fs.writeFile(DATA_FILE, JSON.stringify({ importedAt: new Date().toISOString(), studio, pages, collections, designers, media: resolved }))
await fs.writeFile(SOURCES_FILE, JSON.stringify(sources, null, 1))
console.log(`wrote ${DATA_FILE}: ${Object.keys(resolved).length} images`)
if (unknownComponents.size) console.log('unhandled components:', [...unknownComponents].join(', '))
