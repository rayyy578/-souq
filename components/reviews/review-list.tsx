interface Review {
  id: string
  rating: number
  title: string
  comment: string
  created_at: string
  buyer_name: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No reviews yet</p>
        <p className="text-sm mt-1">Be the first to review this product</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-400 text-sm">
              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
            </span>
            <span className="text-sm font-medium text-gray-900">{review.buyer_name}</span>
          </div>
          {review.title && (
            <h4 className="font-medium text-gray-900 text-sm mb-1">{review.title}</h4>
          )}
          {review.comment && (
            <p className="text-gray-600 text-sm">{review.comment}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">{formatDate(review.created_at)}</p>
        </div>
      ))}
    </div>
  )
}
