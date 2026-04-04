import { render, screen } from '@testing-library/react'
import { RatingSummary } from '@/components/reviews/rating-summary'
import { ReviewList } from '@/components/reviews/review-list'

const stats = {
  average: 4.2,
  total: 10,
  distribution: { 1: 0, 2: 1, 3: 1, 4: 3, 5: 5 },
}

const reviews = [
  {
    id: '1',
    rating: 5,
    title: 'Great product',
    comment: 'Very satisfied',
    created_at: '2026-04-01T00:00:00Z',
    buyer_name: 'John',
  },
  {
    id: '2',
    rating: 3,
    title: 'Decent',
    comment: 'Average quality',
    created_at: '2026-03-15T00:00:00Z',
    buyer_name: 'Jane',
  },
]

describe('RatingSummary', () => {
  it('displays average rating and total count', () => {
    render(<RatingSummary stats={stats} />)
    expect(screen.getByText('4.2')).toBeInTheDocument()
    expect(screen.getByText('10 reviews')).toBeInTheDocument()
  })

  it('shows rating distribution rows', () => {
    render(<RatingSummary stats={stats} />)
    expect(screen.getByText('5★')).toBeInTheDocument()
    expect(screen.getByText('1★')).toBeInTheDocument()
  })

  it('displays correct counts for each rating level', () => {
    render(<RatingSummary stats={stats} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})

describe('ReviewList', () => {
  it('shows empty state when no reviews', () => {
    render(<ReviewList reviews={[]} />)
    expect(screen.getByText('No reviews yet')).toBeInTheDocument()
  })

  it('displays review content', () => {
    render(<ReviewList reviews={reviews} />)
    expect(screen.getByText('Great product')).toBeInTheDocument()
    expect(screen.getByText('Very satisfied')).toBeInTheDocument()
    expect(screen.getByText('John')).toBeInTheDocument()
  })

  it('displays multiple reviews', () => {
    render(<ReviewList reviews={reviews} />)
    expect(screen.getByText('Decent')).toBeInTheDocument()
    expect(screen.getByText('Jane')).toBeInTheDocument()
  })
})
