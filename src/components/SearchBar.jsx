import { useEffect, useState } from "react";
import { suggest } from "../api/mockServer";

export default function SearchBar({ onSearch }) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState([]);

  // 200ms debounce: the capture showed one suggest call per keystroke (22 calls for one query).
  useEffect(() => {
    const t = setTimeout(() => suggest(text).then(setOptions), 200);
    return () => clearTimeout(t);
  }, [text]);

  const submit = (q) => {
    if (!q.trim()) return;
    setText(q);
    setOptions([]);
    onSearch(q.trim());
  };

  return (
    <form className="search" onSubmit={(e) => { e.preventDefault(); submit(text); }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="검색"
        aria-label="검색어"
        list="suggestions"
      />
      <datalist id="suggestions">
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
      <button type="submit">검색</button>
    </form>
  );
}
