import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Filter from "bad-words";
import { toPng } from "html-to-image";

import defaultQuotes from "../../quotes/database.json";
import techQuotes from "./quotes_tech.json";

const SAFE_CATEGORIES = [
  "inspirational",
  "life",
  "love",
  "wisdom",
  "technology",
  "humor",
  "general",
];

const CATEGORY_KEYWORDS = {
  inspirational: [
    "inspire",
    "dream",
    "goal",
    "courage",
    "success",
    "motivation",
    "believe",
    "achieve",
  ],
  life: ["life", "living", "journey", "experience"],
  love: ["love", "heart", "passion"],
  wisdom: ["wisdom", "knowledge", "learn", "education"],
  technology: ["technology", "science", "computer"],
  humor: ["laugh", "funny", "humor"],
};

const processQuotes = (data) => {
  const filter = new Filter();
  return data
    .map((q) => {
      const content = q.content || q.quote || "";
      const author = q.author || "Unknown";
      // Use provided tags when available, otherwise guess based on keywords
      let tags = Array.isArray(q.tags)
        ? q.tags.map((t) => t.toLowerCase())
        : [];
      if (!tags.length) {
        const lower = content.toLowerCase();
        Object.entries(CATEGORY_KEYWORDS).forEach(([cat, keywords]) => {
          if (keywords.some((k) => lower.includes(k))) tags.push(cat);
        });
      }
      if (!tags.length) tags.push("general");
      return { content, author, tags };
    })
    .filter(
      (q) =>
        !filter.isProfane(q.content) &&
        q.tags.some((t) => SAFE_CATEGORIES.includes(t)),
    );
};
const PACKS = {
  default: processQuotes(defaultQuotes),
  tech: processQuotes(techQuotes),
};

const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const QuoteGenerator = () => {
  const [pack, setPack] = useState(
    () => localStorage.getItem("quotePack") || "default",
  );
  const [category, setCategory] = useState("");
  const [order, setOrder] = useState([]);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState(null);
  const [displayedText, setDisplayedText] = useState("");
  const [prefersReduced, setPrefersReduced] = useState(false);
  const rafRef = useRef();
  const liveRef = useRef(null);

  const getBase = useCallback(() => {
    const base = PACKS[pack] || [];
    return category ? base.filter((q) => q.tags.includes(category)) : base;
  }, [pack, category]);

  const categories = useMemo(() => {
    const base = PACKS[pack] || [];
    return Array.from(new Set(base.flatMap((q) => q.tags))).filter((t) =>
      SAFE_CATEGORIES.includes(t),
    );
  }, [pack]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setPrefersReduced(media.matches);
    handler();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);
  useEffect(() => {
    const base = getBase();
    let storedOrder;
    if (!category) {
      try {
        storedOrder = JSON.parse(localStorage.getItem("quoteOrder_" + pack));
      } catch {
        // ignore parse error
      }
      if (!Array.isArray(storedOrder) || storedOrder.length !== base.length) {
        storedOrder = shuffleArray(base.map((_, i) => i));
      }
      const savedIndex = parseInt(
        localStorage.getItem("quoteIndex_" + pack) || "0",
        10,
      );
      setIndex(Math.min(savedIndex, storedOrder.length - 1));
    } else {
      storedOrder = shuffleArray(base.map((_, i) => i));
      setIndex(0);
    }
    setOrder(storedOrder);
  }, [getBase, pack, category]);

  useEffect(() => {
    const base = getBase();
    if (!order.length) {
      setCurrent(null);
      return;
    }
    setCurrent(base[order[index]]);
  }, [getBase, order, index]);

  useEffect(() => {
    if (category) return;
    localStorage.setItem("quotePack", pack);
    localStorage.setItem("quoteIndex_" + pack, index.toString());
    localStorage.setItem("quoteOrder_" + pack, JSON.stringify(order));
  }, [pack, index, order, category]);

  useEffect(() => {
    if (!current || !liveRef.current) return;
    liveRef.current.textContent = "";
    const announcement = `"${current.content}" - ${current.author}`;
    requestAnimationFrame(() => {
      if (liveRef.current) liveRef.current.textContent = announcement;
    });
  }, [current]);

  const nextQuote = () => {
    if (!order.length) return;
    if (index + 1 >= order.length) {
      const base = getBase();
      const newOrder = shuffleArray(base.map((_, i) => i));
      setOrder(newOrder);
      setIndex(0);
    } else {
      setIndex(index + 1);
    }
  };

  const prevQuote = () => {
    if (!order.length) return;
    setIndex(index === 0 ? order.length - 1 : index - 1);
  };

  useEffect(() => {
    if (!current) return;
    cancelAnimationFrame(rafRef.current);
    if (prefersReduced) {
      setDisplayedText(current.content);
      return;
    }
    setDisplayedText("");
    let index = 0;
    let last = 0;
    const step = (time) => {
      if (time - last > 50) {
        index++;
        setDisplayedText(current.content.slice(0, index));
        last = time;
      }
      if (index < current.content.length) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [current, prefersReduced]);

  const copyQuote = () => {
    if (current && navigator.clipboard) {
      navigator.clipboard.writeText(`"${current.content}" - ${current.author}`);
    }
  };

  const tweetQuote = () => {
    if (!current) return;
    const text = `"${current.content}" - ${current.author}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const dataUrlToFile = (dataUrl, filename) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const shareCard = () => {
    const node = document.getElementById("quote-card");
    if (!node) return;
    const exportCard = () => {
      toPng(node)
        .then((dataUrl) => {
          const file = dataUrlToFile(dataUrl, "quote.png");
          const shareData = {
            files: [file],
            title: "Quote",
            text: current
              ? `"${current.content}" - ${current.author}`
              : "Quote",
          };
          if (
            navigator.share &&
            navigator.canShare &&
            navigator.canShare(shareData)
          ) {
            navigator.share(shareData).catch(() => {
              const link = document.createElement("a");
              link.download = "quote.png";
              link.href = dataUrl;
              link.click();
            });
          } else {
            const link = document.createElement("a");
            link.download = "quote.png";
            link.href = dataUrl;
            link.click();
          }
        })
        .catch(() => {
          /* ignore export errors */
        });
    };
    if (prefersReduced) {
      exportCard();
    } else {
      requestAnimationFrame(exportCard);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 overflow-auto">
      <div className="w-full max-w-md flex flex-col items-center">
        <div id="quote-card" className="p-4 text-center">
          {current ? (
            <>
              <p className="text-lg mb-2" aria-hidden="true">
                &quot;{displayedText}&quot;
              </p>
              <p className="text-sm text-gray-200" aria-hidden="true">
                - {current.author}
              </p>
              <span
                role="status"
                aria-live="polite"
                className="sr-only"
                ref={liveRef}
              />
            </>
          ) : (
            <p>No quotes found.</p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <button
            className="px-4 py-2 bg-gray-700 interactive-surface rounded"
            onClick={prevQuote}
          >
            Prev
          </button>
          <button
            className="px-4 py-2 bg-gray-700 interactive-surface rounded"
            onClick={nextQuote}
          >
            Next
          </button>
          <button
            className="px-4 py-2 bg-gray-700 interactive-surface rounded"
            onClick={copyQuote}
          >
            Copy
          </button>
          <button
            className="px-4 py-2 bg-gray-700 interactive-surface rounded"
            onClick={tweetQuote}
          >
            Tweet
          </button>
          <button
            className="px-4 py-2 bg-gray-700 interactive-surface rounded"
            onClick={shareCard}
          >
            Share as Card
          </button>
        </div>
        <select
          value={pack}
          onChange={(e) => {
            setPack(e.target.value);
            setCategory("");
          }}
          className="px-2 py-1 rounded text-black mt-4"
        >
          {Object.keys(PACKS).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {categories.length > 0 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-2 py-1 rounded text-black mt-2"
          >
            <option value="">all</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export default QuoteGenerator;
