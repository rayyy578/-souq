import { meiliClient } from './meilisearch'

export interface ProductSearch {
  id: string
  name: string
  description: string
  price_millimes: number
  category: string
  rating: number
  stock: number
  images: string[]
}

export interface SearchFilters {
  minPrice?: number
  maxPrice?: number
  minRating?: number
  category?: string
  inStock?: boolean
}

function buildFilterString(filters: SearchFilters): string {
  const parts: string[] = []
  if (filters.minPrice != null) parts.push(`price_millimes >= ${filters.minPrice}`)
  if (filters.maxPrice != null) parts.push(`price_millimes <= ${filters.maxPrice}`)
  if (filters.minRating != null) parts.push(`rating >= ${filters.minRating}`)
  if (filters.category) parts.push(`category = '${filters.category}'`)
  if (filters.inStock) parts.push('stock > 0')
  return parts.join(' AND ')
}

export interface SearchResult {
  results: ProductSearch[]
  total: number
  page: number
  totalPages: number
}

export async function searchProducts(
  query: string,
  filters: SearchFilters = {},
  page: number = 1,
  limit: number = 20,
): Promise<SearchResult> {
  const index = meiliClient.index('products')
  const filterString = buildFilterString(filters)

  const result = await index.search(query, {
    filter: filterString || undefined,
    limit,
    offset: (page - 1) * limit,
    sort: ['created_at:desc'],
  })

  return {
    results: result.hits as ProductSearch[],
    total: result.estimatedTotalHits ?? 0,
    page,
    totalPages: Math.ceil((result.estimatedTotalHits ?? 0) / limit),
  }
}

export async function getSuggestions(query: string, count: number = 5): Promise<string[]> {
  if (!query.trim()) return []
  const index = meiliClient.index('products')
  const result = await index.search(query, {
    limit: count,
    attributesToRetrieve: ['name'],
  })
  return result.hits.map((hit) => hit.name as string)
}

export async function setupSearchIndex(): Promise<void> {
  const index = meiliClient.index('products')
  await index.updateSettings({
    searchableAttributes: ['name', 'description', 'category'],
    filterableAttributes: ['category', 'rating', 'price_millimes', 'stock'],
    sortableAttributes: ['created_at'],
    displayedAttributes: [
      'id', 'name', 'description', 'price_millimes', 'category',
      'rating', 'stock', 'images',
    ],
    pagination: { maxTotalHits: 10000 },
  })
}
