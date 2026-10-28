// The contact page of dsgnselo.com, structured. Parsed from the imported blocks so
// the site never drifts from the brand's own published details.
import { catalog } from './catalog'

export interface Channel {
  label: string
  email?: string
  phone?: string
}

export interface Contact {
  showroom: { label: string; lines: string[]; phone?: string; mapsUrl: string }
  channels: Channel[]
  social: { label: string; url: string }[]
}

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g
const PHONE = /^\+?[\d\s()-]{8,}$/
const bold = (s: string) => s.match(/^\*\*(.+?)\s*\*\*/)?.[1].trim()

function parse(): Contact {
  const blocks = catalog.pages.contact.blocks
  const address = blocks.find((b) => /endere/i.test(b.title))
  const contact = blocks.find((b) => /^contato$/i.test(b.title))
  const social = blocks.find((b) => /redes/i.test(b.title))

  const [addressPara = '', ...addressRest] = address?.paragraphs ?? []
  const addressLines = addressPara.split('\n')
  const showroomLabel = bold(addressLines[0]) ?? 'Showroom'
  const lines = addressLines.slice(bold(addressLines[0]) ? 1 : 0)

  // channels: a bold label + an e-mail, optionally followed by a phone paragraph
  const channels: Channel[] = []
  for (const p of contact?.paragraphs ?? []) {
    if (PHONE.test(p) && channels.length) {
      channels[channels.length - 1].phone = p
      continue
    }
    const label = bold(p)
    const email = [...p.matchAll(LINK)][0]?.[1]
    if (label || email) channels.push({ label: label ?? 'Contato', email })
  }

  return {
    showroom: {
      label: showroomLabel,
      lines,
      phone: addressRest.find((p) => PHONE.test(p)),
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lines.join(', '))}`,
    },
    channels,
    social: [...(social?.paragraphs.join('\n') ?? '').matchAll(LINK)].map((m) => ({ label: m[1], url: m[2] })),
  }
}

export const contact = parse()

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`
