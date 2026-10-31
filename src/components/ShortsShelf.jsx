export default function ShortsShelf({ item }) {
  return (
    <section className="shelf">
      <h2>{item.title}</h2>
      <div className="shelf-row">
        {item.shorts.map((s) => (
          <div key={s.id} className="short" style={{ background: `hsl(${s.hue} 55% 50%)` }}>
            <span>{s.title}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
