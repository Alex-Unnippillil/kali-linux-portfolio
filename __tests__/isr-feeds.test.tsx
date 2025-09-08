import type { GetStaticPropsResult } from "next";
import { getStaticProps as getHomeProps } from "../pages/index";
import { getStaticProps as getToolsProps } from "../pages/tools/index";

describe("ISR feeds", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it("home page revalidates and fetches blog RSS", async () => {
    const rss = `<rss><channel><item><title>Post</title><link>https://example.com</link><pubDate>2020-01-01</pubDate></item></channel></rss>`;
    (global.fetch as any) = jest.fn().mockResolvedValue({
      text: () => Promise.resolve(rss),
    });

    const result = (await getHomeProps({} as any)) as GetStaticPropsResult<{
      posts: any[];
    }>;

    expect(global.fetch).toHaveBeenCalledWith("https://www.kali.org/rss.xml");
    expect(result).toEqual(
      expect.objectContaining({ revalidate: 7200 })
    );
    expect(result.props?.posts[0]).toEqual({
      title: "Post",
      link: "https://example.com",
      date: "2020-01-01",
    });
  });

  it("tools page revalidates and fetches tools list", async () => {
    const tools = [{ id: "nmap", name: "Nmap" }];
    (global.fetch as any) = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(tools),
    });

    const result = (await getToolsProps({} as any)) as GetStaticPropsResult<{
      tools: any[];
    }>;

    expect(global.fetch).toHaveBeenCalledWith(
      "https://www.kali.org/tools/kali-tools.json"
    );
    expect(result).toEqual(
      expect.objectContaining({ revalidate: 7200 })
    );
    expect(result.props?.tools).toEqual(tools);
  });
});

