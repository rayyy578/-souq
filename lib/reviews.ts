import { createAdminClient } from './supabase/server'
import { createClient as createBrowserClient } from './supabase/client'

export interface Review {
  id: string
  product_id: string
  buyer_id: string
  rating: number
  title: string
  comment: string
  created_at: string
  buyer_name: string
}

export interface ReviewStats {
  average: number
  total: number
  distribution: Record<number, number>
}

export async function getProductReviews(productId: string): Promise<Review[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*, users(name)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(r => ({
    ...r,
    buyer_name: (r as any).users?.name ?? 'Anonymous',
  }))
}

export async function getReviewStats(productId: string): Promise<ReviewStats> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('product_id', productId)

  if (error) throw error

  const reviews = data ?? []
  const total = reviews.length

  if (total === 0) {
    return { average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
  }

  const average = reviews.reduce((sum: number, r) => sum + r.rating, 0) / total
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  for (const review of reviews) {
    distribution[review.rating] = (distribution[review.rating] ?? 0) + 1
  }

  return { average, total, distribution }
}

export async function createReview(
  productId: string,
  buyerId: string,
  rating: number,
  title: string,
  comment: string,
): Promise<Review> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('reviews')
    .insert({ product_id: productId, buyer_id: buyerId, rating, title, comment })
    .select('*, users(name)')
    .single()

  if (error) throw error

  return {
    ...data,
    buyer_name: (data as any).users?.name ?? 'Anonymous',
  }
}

export async function userHasReviewedProduct(productId: string, userId: string): Promise<boolean> {
  const supabase = createBrowserClient()
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('product_id', productId)
    .eq('buyer_id', userId)
    .maybeSingle()

  return !!data
}
