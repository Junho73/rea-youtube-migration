import VideoCard from "./VideoCard";
import ShortsShelf from "./ShortsShelf";

// type -> component registry: the client half of server-driven UI.
const REGISTRY = { video: VideoCard, shorts_shelf: ShortsShelf };

export default function ItemRenderer({ item }) {
  const Component = REGISTRY[item.type];
  return Component ? <Component item={item} /> : null; // unknown types are skipped, like the original
}
