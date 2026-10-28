// Awards, transcribed from the certificates published on dsgnselo.com/conquistas
// (the page has images only). Each entry keeps its certificate (`media`) and
// states only what the certificate says.
import type { MediaId } from './catalog'

export interface Award {
  /** certificate image */
  media: MediaId
  award: string
  edition?: string
  distinction: string
  piece: string
  /** a collection in this catalogue, when the piece belongs to one */
  collection?: string
  /** as printed on the certificate */
  date?: string
  year?: number
  credit?: string
}

const published: Award[] = [
  {
    media: 11344, award: 'LIT Lighting Design Awards', edition: '2025', distinction: 'Vencedor',
    piece: 'Alva', collection: 'alva', year: 2025,
    credit: 'Categoria Pendant Lighting · dsgnselo · lead designer Alberth Murta',
  },
  {
    media: 11342, award: 'Prêmio Design Museu da Casa Brasileira', edition: '36º', distinction: 'Selecionado para a exposição',
    piece: 'Altar Parede', collection: 'altar', date: '25 de abril de 2026', year: 2026,
    credit: 'Categoria Iluminar · autoria Alberth Diego Murta Ribas · dsgnselo',
  },
  {
    media: 11343, award: 'Prêmio Design Museu da Casa Brasileira', edition: '36º', distinction: 'Selecionado para a exposição',
    piece: 'Alva Pendente', collection: 'alva', date: '25 de abril de 2026', year: 2026,
    credit: 'Categoria Iluminar · autoria Alberth Diego Murta Ribas · dsgnselo',
  },
  {
    media: 7711, award: 'LIT Lighting Design Awards', edition: '2022', distinction: 'Menção honrosa',
    piece: 'Ábaco Mesa Bold 2', year: 2022,
    credit: 'Categoria Desk Lamps, Floor Lamps · LightDesign + Exporlux · lead designer Alberth Murta',
  },
  {
    media: 7710, award: 'Prêmio Design Museu da Casa Brasileira', edition: '34º', distinction: '2º lugar',
    piece: 'Linha Glória — Parede, Pendente e Piso', collection: 'gloria', date: '14 de outubro de 2021', year: 2021,
    credit: 'Categoria Iluminação · autoria Alberth Diego Murta Ribas · produção dsgnselo',
  },
  {
    media: 7709, award: 'Prêmio Design Museu da Casa Brasileira', edition: '32º', distinction: 'Selecionado para a exposição',
    piece: 'Cyli Clamp', collection: 'cyli', date: '10 de novembro de 2018', year: 2018,
    credit: 'Categoria Iluminação, modalidade Produto · autoria Alberth Diego Murta Ribas · DSGNSelo Light Lab',
  },
  {
    media: 7707, award: 'Prêmio Design Museu da Casa Brasileira', edition: '31º', distinction: 'Selecionado para a exposição',
    piece: 'Cyli luminária de parede', collection: 'cyli', date: '11 de novembro de 2017', year: 2017,
    credit: 'Categoria Iluminação, modalidade Produto · autoria Ari José Coelho Filho e Alberth Diego · Occo Design',
  },
  {
    media: 7708, award: 'Prêmio Design Museu da Casa Brasileira', edition: '30º', distinction: 'Selecionado para a exposição',
    piece: 'Luminária Dots',
    credit: 'Categoria Iluminação, modalidade Produto · autoria Jorge Elmor e Alberth Diego · Elmor Arquitetura',
  },
]

/** most recent first; an edition without a printed date goes last */
export const awards = [...published].sort((x, y) => (y.year ?? 0) - (x.year ?? 0))

/** "36º Prêmio Design…" / "LIT Lighting Design Awards 2025" */
export function awardTitle(a: Award) {
  if (!a.edition) return a.award
  return a.edition.endsWith('º') ? `${a.edition} ${a.award}` : `${a.award} ${a.edition}`
}
