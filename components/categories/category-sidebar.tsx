'use client'

import Link from 'next/link'
import { useState, useCallback } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
  icon: string
  sort_order: number
  children?: Category[]
}

interface CategorySidebarProps {
  categories: Category[]
  currentSlug?: string
}

function CategoryNode({ category, currentSlug }: { category: Category; currentSlug?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = category.children && category.children.length > 0
  const isActive = category.slug === currentSlug

  return (
    <div>
      <Link
        href={`/search?category=${category.slug}`}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-emerald-100 text-emerald-700 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsOpen(!isOpen)
            }}
            className="p-0.5 hover:text-gray-900"
          >
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="truncate">{category.name}</span>
      </Link>

      {hasChildren && isOpen && (
        <div className="ml-4 border-l border-gray-200 pl-2 space-y-0.5">
          {category.children!.map((child) => (
            <CategoryNode key={child.id} category={child} currentSlug={currentSlug} />
          ))}
        </div>
      )}
    </div>
  )
}

export function CategorySidebar({ categories, currentSlug }: CategorySidebarProps) {
  if (categories.length === 0) return null

  return (
    <nav className="space-y-0.5 py-2" aria-label="Category navigation">
      {categories.map((cat) => (
        <CategoryNode key={cat.id} category={cat} currentSlug={currentSlug} />
      ))}
    </nav>
  )
}
