import posts from '../../data/kali-blog.json';

interface Post {
  title: string;
  link: string;
  date: string;
}

export default function BlogHighlights() {
  const [mainPost, ...otherPosts] = (posts as Post[]).slice(0, 3);

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-bold">From the blog</h2>
      <div className="flex flex-col gap-4 md:flex-row">
        <a
          href={mainPost.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col justify-end rounded bg-gray-800 p-4 text-white md:flex-[2]"
        >
          <h3 className="text-2xl font-semibold">{mainPost.title}</h3>
          <p className="text-sm text-gray-400">
            {new Date(mainPost.date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </a>
        <div className="flex flex-col gap-4 md:flex-1">
          {otherPosts.map((post) => (
            <a
              key={post.link}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col justify-end rounded bg-gray-800 p-4 text-white md:flex-1"
            >
              <h3 className="text-lg font-semibold">{post.title}</h3>
              <p className="text-sm text-gray-400">
                {new Date(post.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

