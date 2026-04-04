import { NextResponse } from 'next/server'
import { getCategoryTree } from '@/lib/categories'

export async function GET() {
  try {
    const tree = await getCategoryTree()
    return NextResponse.json(tree)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
