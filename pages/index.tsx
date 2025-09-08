import Link from 'next/link';
import { baseMetadata } from '../lib/metadata';

export const metadata = baseMetadata;

interface Post {
  slug: string;
  title: string;
  date: string;
  summary: string;
}

interface HomeProps {
  posts: Post[];
}

export const getStaticProps = async () => {
  const posts: Post[] = [
    {
      slug: 'first-post',
      title: 'First Post',
      date: '2024-01-01',
      summary:
        'This is the first mock blog post summary. It demonstrates the layout expected for each entry on the home page.',
    },
    {
      slug: 'second-post',
      title: 'Second Post',
      date: '2024-02-01',
      summary:
        'Another mock post with example text to illustrate how summaries are displayed using only two lines in the UI.',
    },
    {
      slug: 'third-post',
      title: 'Third Post',
      date: '2024-03-01',
      summary:
        'The final mock article shows linking behaviour and static data fetching inside Next.js getStaticProps.',
    },
  ];

  return {
    props: {
      posts,
    },
  };
};

const Home = ({ posts }: HomeProps) => {
  return (
    <main className="p-4">
      <h1 className="text-2xl mb-4">Latest Blog Posts</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.slug} className="mb-6">
            <Link href={`/blog/${post.slug}`} className="block">
              <p className="text-sm text-gray-500">{post.date}</p>
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p
                className="text-gray-700"
                style={{
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden',
                }}
              >
                {post.summary}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default Home;

