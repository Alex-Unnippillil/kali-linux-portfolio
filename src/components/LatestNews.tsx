"use client";

import { useEffect, useState } from "react";
import { XMLParser } from "fast-xml-parser";

interface Post {
  title: string;
  link: string;
  blurb: string;
  date: string;
}

const rssUrl = "https://www.kali.org/rss.xml";

const LatestNews: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch(rssUrl);
        const xml = await res.text();
        const parser = new XMLParser({ ignoreAttributes: false });
        const json = parser.parse(xml);
        const items = json?.rss?.channel?.item || [];
        const mapped: Post[] = items.slice(0, 5).map((item: any) => {
          const date = new Date(item.pubDate);
          const formatted = date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const blurb = String(item.description || "").replace(/<[^>]+>/g, "");
          return {
            title: item.title,
            link: item.link,
            blurb,
            date: formatted,
          };
        });
        setPosts(mapped);
      } catch (err) {
        console.error("Failed to load latest news", err);
      }
    };

    fetchPosts();
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="bg-[var(--color-bg)] text-[var(--color-text)] py-4">
      <div className="container mx-auto px-4">
        <h2 className="text-xl font-bold mb-4">Latest News</h2>
        <div className="flex gap-4 overflow-x-auto">
          {posts.map((post) => (
            <article
              key={post.link}
              className="min-w-[250px] bg-[var(--color-surface)] rounded p-4"
            >
              <h3 className="text-[var(--color-primary)] font-semibold">
                <a href={post.link} target="_blank" rel="noopener noreferrer">
                  {post.title}
                </a>
              </h3>
              <p className="text-sm mt-2 mb-2 line-clamp-3">{post.blurb}</p>
              <time className="text-xs text-[var(--color-muted)]">
                {post.date}
              </time>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestNews;
