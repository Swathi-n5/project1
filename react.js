import React, { useEffect, useState, useRef } from "react";

const API_BASE = "https://newsapi.org/v2";

export default function NewsFeedApp() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState("");
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [totalResults, setTotalResults] = useState(null);
  const [dark, setDark] = useState(false);
  const abortCtrlRef = useRef(null);

  // Replace with your own API key in an .env file as REACT_APP_NEWS_API_KEY
  const API_KEY = process.env.REACT_APP_NEWS_API_KEY || "";

  // categories for the bonus feature
  const categories = ["", "business", "entertainment", "general", "health", "science", "sports", "technology"];

  // debounce query input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => clearTimeout(t);
  }, [query]);

  // fetch articles whenever category, debouncedQuery, or page changes
  useEffect(() => {
    // reset to page 1 when search or category changes
    setPage(1);
    setArticles([]);
    fetchArticles(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, category]);

  // fetch more when page changes (but not when we already refreshed for page 1 above)
  useEffect(() => {
    if (page === 1) return; // already handled
    fetchArticles(page, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function fetchArticles(fetchPage = 1, replace = false) {
    if (!API_KEY) {
      setError("No API key found. Put your NewsAPI key in REACT_APP_NEWS_API_KEY");
      return;
    }

    // Abort previous request
    if (abortCtrlRef.current) abortCtrlRef.current.abort();
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        apiKey: API_KEY,
        page: String(fetchPage),
        pageSize: String(pageSize),
      });

      // If user searched, prefer everything endpoint (free tier restrictions apply). Otherwise top-headlines
      // We try top-headlines first for categories; if a query exists, use everything endpoint to search across sources.
      let url;
      if (debouncedQuery) {
        params.set("q", debouncedQuery);
        // optionally add language or sortBy
        params.set("language", "en");
        // use 'everything' endpoint for search
        url = `${API_BASE}/everything?${params.toString()}`;
      } else {
        // top-headlines supports category
        if (category) params.set("category", category);
        // default to 'us' for demo — change or remove as needed
        params.set("country", "us");
        url = `${API_BASE}/top-headlines?${params.toString()}`;
      }

      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText} ${txt}`);
      }
      const data = await res.json();

      if (data.articles) {
        setArticles((prev) => (replace ? data.articles : [...prev, ...data.articles]));
        setTotalResults(data.totalResults ?? null);
      } else {
        throw new Error("No articles returned from API");
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleLoadMore() {
    // If totalResults is known, prevent loading past results
    if (totalResults && articles.length >= totalResults) return;
    setPage((p) => p + 1);
  }

  function handleCategoryClick(cat) {
    setCategory(cat);
    setQuery("");
  }

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <header className="max-w-6xl mx-auto p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">NewsFeed App</h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark((d) => !d)}
              className="px-3 py-1 rounded-md bg-white/80 dark:bg-gray-800/70 shadow-sm text-sm"
            >
              {dark ? "Light" : "Dark"}
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-4">
          {/* Search + filters */}
          <section className="mb-6">
            <div className="flex gap-3 flex-col sm:flex-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search news by keyword..."
                className="flex-1 px-4 py-2 rounded-lg shadow-sm border bg-white dark:bg-gray-800"
              />

              <div className="flex gap-2 flex-wrap">
                {categories.map((c) => (
                  <button
                    key={c || "all"}
                    onClick={() => handleCategoryClick(c)}
                    className={`px-3 py-1 rounded-full text-sm shadow-sm border ${
                      category === c ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800"
                    }`}
                  >
                    {c ? c : "All"}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Status */}
          <section className="mb-4">
            {loading && articles.length === 0 ? (
              <div className="py-6 text-center">Loading...</div>
            ) : error ? (
              <div className="py-6 text-center text-red-400">Something went wrong: {error}</div>
            ) : articles.length === 0 ? (
              <div className="py-6 text-center">No articles found.</div>
            ) : (
              <div className="text-sm text-gray-500 mb-2">
                Showing {articles.length} {totalResults ? `of ${totalResults}` : ""} results
              </div>
            )}
          </section>

          {/* Articles grid */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((a, idx) => (
                <article key={`${a.url}-${idx}`} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md">
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {a.urlToImage ? (
                      // eslint-disable-next-line jsx-a11y/img-redundant-alt
                      <img src={a.urlToImage} alt={`image-${idx}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="p-4 text-gray-500">No image</div>
                    )}
                  </div>

                  <div className="p-4">
                    <h2 className="font-semibold text-lg line-clamp-2">{a.title}</h2>
                    <p className="text-sm mt-2 line-clamp-3">{a.description ?? a.content ?? ""}</p>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>{a.source?.name ?? "Unknown source"}</span>
                      <a href={a.url} target="_blank" rel="noreferrer" className="underline">
                        Read
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Load more */}
            <div className="mt-6 flex justify-center">
              {loading && articles.length > 0 ? (
                <div className="px-4 py-2 rounded-md">Loading more...</div>
              ) : (
                <button
                  onClick={handleLoadMore}
                  disabled={totalResults && articles.length >= totalResults}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
                >
                  Load more
                </button>
              )}
            </div>
          </section>
        </main>

        <footer className="max-w-6xl mx-auto p-4 text-center text-sm text-gray-500">
          Built with React + Tailwind • Demo uses NewsAPI.org (you must provide API key)
        </footer>
      </div>
    </div>
  );
}
