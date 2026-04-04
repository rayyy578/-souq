import { createClient } from '@supabase/supabase-js'
import { setupSearchIndex } from '../lib/search'
import { meiliClient } from '../lib/meilisearch'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function seedMeilisearch(): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('Failed to fetch products:', error)
    process.exit(1)
  }

  if (!products || products.length === 0) {
    console.log('No products to index')
    return
  }

  const searchProducts = products.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price_millimes: p.price_millimes,
    category: p.category,
    stock: p.stock,
    images: p.images ?? [],
    rating: 0,
  }))

  const index = meiliClient.index('products')
  await index.addDocuments(searchProducts, { primaryKey: 'id' })
  console.log(`Indexed ${searchProducts.length} products to Meilisearch`)
}

async function main() {
  await setupSearchIndex()
  await seedMeilisearch()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
