export interface ReviewStats {
  average: number
  total: number
  distribution: Record<number, number>
}

interface RatingSummaryProps {
  stats: ReviewStats
}

export function RatingSummary({ stats }: RatingSummaryProps) {
  const { average, total, distribution } = stats

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 bg-gray-50 rounded-lg">
      <div className="text-center md:text-left">
        <div className="text-4xl font-bold text-gray-900">{average.toFixed(1)}</div>
        <div className="text-yellow-400 text-lg">
          {'★'.repeat(Math.round(average))}{'☆'.repeat(5 - Math.round(average))}
        </div>
        <div className="text-sm text-gray-500 mt-1">{total} review{total !== 1 ? 's' : ''}</div>
      </div>

      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] ?? 0
          const percentage = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-sm text-gray-600 w-8">{star}★</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
