// Real contact channels, as published on dsgnselo.com.
const WHATSAPP = '5541996069990'

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`
}

/** the brand's own list of resellers */
export const RESELLERS_URL = 'https://www.dsgnselo.com/revendas'
