'use client'

import { useState, useEffect, useCallback } from 'react'
import { ReviewForm } from '@/components/reviews/review-form'
import { ReviewList } from '@/components/reviews/review-list'
import { RatingSummary, type ReviewStats } from '@/components/reviews/rating-summary'

interface Review {
  id: string
  rating: number
  title: string
  comment: string
  created_at: string
  buyer_name: string
}

interface ProductReviewsProps {
  productId: string
}

const emptyStats: ReviewStats = {
  average: 0,
  total: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats>(emptyStats)
  const [loading, setLoading] = useState(true)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        fetch(`/api/reviews?productId=${productId}`),
        fetch(`/api/reviews?productId=${productId}&type=stats`),
      ])
      if (reviewsRes.ok) {
        const data = await reviewsRes.json()
        setReviews(data)
      }
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded" />
        <div className="h-24 bg-gray-200 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>

      {stats.total > 0 && <RatingSummary stats={stats} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <ReviewForm productId={productId} onSuccess={fetchReviews} />
        <ReviewList reviews={reviews} />
      </div>
    </div>
  )
}
