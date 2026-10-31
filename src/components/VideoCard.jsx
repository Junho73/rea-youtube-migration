export default function VideoCard({ item }) {
  return (
    <article className="video">
      <div className="thumb" style={{ background: `hsl(${item.hue} 60% 55%)` }}>
        <span className="length">{item.length}</span>
      </div>
      <div className="meta">
        <h3>{item.title}</h3>
        <p>
          {item.channel} · 조회수 {item.views.toLocaleString("ko-KR")}회
        </p>
      </div>
    </article>
  );
}
