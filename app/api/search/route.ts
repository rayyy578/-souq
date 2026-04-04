import { NextRequest, NextResponse } from 'next/server'
import { searchProducts, type SearchFilters } from '@/lib/search'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)

  const filters: SearchFilters = {}
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const minRating = searchParams.get('minRating')
  const category = searchParams.get('category')
  const inStock = searchParams.get('inStock')

  if (minPrice != null) filters.minPrice = parseInt(minPrice, 10)
  if (maxPrice != null) filters.maxPrice = parseInt(maxPrice, 10)
  if (minRating != null) filters.minRating = parseFloat(minRating)
  if (category) filters.category = category
  if (inStock === 'true') filters.inStock = true

  try {
    const result = await searchProducts(query, filters, page, limit)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: 'Search service unavailable' },
      { status: 503 }
    )
  }
}
