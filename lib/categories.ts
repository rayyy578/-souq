import { createAdminClient } from './supabase/server'

export interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
  icon: string
  sort_order: number
  children?: Category[]
}

export async function getCategoryTree(): Promise<Category[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return buildTree(data ?? [])
}

export async function getCategoriesFlat(): Promise<Category[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map(cat => ({ ...cat, children: [] })) as Category[]
}

function buildTree(categories: Category[]): Category[] {
  const map = new Map<string, Category>()
  const roots: Category[] = []

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] })
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
