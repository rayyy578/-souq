import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getProductReviews, getReviewStats, createReview, userHasReviewedProduct } from '@/lib/reviews'

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('productId')
  const type = request.nextUrl.searchParams.get('type')

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 })
  }

  try {
    if (type === 'stats') {
      const stats = await getReviewStats(productId)
      return NextResponse.json(stats)
    }

    const reviews = await getProductReviews(productId)
    return NextResponse.json(reviews)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { productId, rating, title, comment } = body

  if (!productId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: 'Valid productId and rating (1-5) required' },
      { status: 400 }
    )
  }

  const hasReviewed = await userHasReviewedProduct(productId, user.id)
  if (hasReviewed) {
    return NextResponse.json(
      { error: 'You have already reviewed this product' },
      { status: 409 }
    )
  }

  try {
    const review = await createReview(productId, user.id, rating, title ?? '', comment ?? '')
    return NextResponse.json(review, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }
}
