import { useEffect, useRef, useState } from "react";
import { search, next } from "./api/mockServer";
import SearchBar from "./components/SearchBar";
import ItemRenderer from "./components/ItemRenderer";
import "./App.css";

export default function App() {
  const [items, setItems] = useState([]);
  const [continuation, setContinuation] = useState(null);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef(null);

  const runSearch = async (q) => {
    setLoading(true);
    const page = await search(q);
    setItems(page.items);
    setContinuation(page.continuation);
    setLoading(false);
  };

  // Infinite scroll: when the sentinel enters the viewport, request the next page with the token.
  useEffect(() => {
    if (!continuation || !sentinel.current) return;
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loading) return;
      setLoading(true);
      const page = await next(continuation);
      setItems((prev) => [...prev, ...page.items]);
      setContinuation(page.continuation);
      setLoading(false);
    }, { rootMargin: "200px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [continuation, loading]);

  return (
    <main>
      <header>
        <strong>REA Migration Demo</strong>
        <SearchBar onSearch={runSearch} />
      </header>
      {items.length === 0 && !loading && <p className="empty">검색어를 입력해 시작하세요.</p>}
      <div className="results">
        {items.map((item) => <ItemRenderer key={item.id} item={item} />)}
      </div>
      {continuation && <div ref={sentinel} className="sentinel">{loading ? "불러오는 중…" : ""}</div>}
      {!continuation && items.length > 0 && <p className="empty">마지막 결과입니다.</p>}
    </main>
  );
}
