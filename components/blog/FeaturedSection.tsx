import { PostCardBusiness } from '@/components/blog/PostCardBusiness'

interface Post {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string | null
  published_at: string | null
  categories: { id: number; name: string; slug: string }[]
}

interface Props {
  posts: Post[]
}

export function FeaturedSection({ posts }: Props) {
  if (posts.length === 0) return null

  const [featured, ...secondaries] = posts

  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-bold text-neutral-900 whitespace-nowrap">Destaques</h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <PostCardBusiness post={featured} variant="featured" />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4">
          {secondaries.filter(Boolean).map((post) => (
            <PostCardBusiness key={post.id} post={post} variant="secondary" />
          ))}
        </div>
      </div>
    </section>
  )
}
