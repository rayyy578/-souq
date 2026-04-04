import { Meilisearch } from 'meilisearch'

const MEILI_HOST = process.env.MEILI_HOST ?? 'http://localhost:7700'
const MEILI_API_KEY = process.env.MEILI_API_KEY ?? ''

export const meiliClient = new Meilisearch({
  host: MEILI_HOST,
  apiKey: MEILI_API_KEY,
})
