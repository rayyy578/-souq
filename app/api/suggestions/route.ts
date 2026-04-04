import { NextRequest, NextResponse } from 'next/server'
import { getSuggestions } from '@/lib/search'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') ?? ''

  if (!query.trim()) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const suggestions = await getSuggestions(query)
    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 200 })
  }
}
