import type { DemoPoint } from "./types";

type OverlayProxyLike = {
  location: (x: number, y: number) => { x: number; y: number };
  width: number;
  height: number;
};

type OverlayProps = {
  proxy: OverlayProxyLike;
  points: DemoPoint[];
  selectedId?: string | null;
};

export class AtlasOverlay {
  private readonly root: HTMLDivElement;
  private readonly nodeMap = new Map<string, HTMLImageElement>();

  private currentSize = 20;

  constructor(target: HTMLElement, props: OverlayProps) {
    this.root = document.createElement("div");
    this.root.className = "atlas-overlay";
    target.appendChild(this.root);
    this.update(props);
  }

  private pointKey(point: DemoPoint) {
    return `${point.id}|${point.x}|${point.y}|${point.thumb}`;
  }

  private fallbackThumb(point: DemoPoint) {
    return `/thumbs/${point.id}.jpg`;
  }

  private bindImageSource(node: HTMLImageElement, point: DemoPoint) {
    const primary = point.thumb;
    const secondary = this.fallbackThumb(point);
    const tertiary = point.full;

    node.dataset.fallbackStep = "0";
    node.onerror = () => {
      const step = Number(node.dataset.fallbackStep ?? "0");
      if (step === 0 && secondary !== primary) {
        node.dataset.fallbackStep = "1";
        node.src = secondary;
        return;
      }
      if (step <= 1 && tertiary && tertiary !== secondary) {
        node.dataset.fallbackStep = "2";
        node.src = tertiary;
        return;
      }
      node.onerror = null;
    };

    node.src = primary;
  }

  update(props: OverlayProps) {
    const origin = props.proxy.location(0, 0);
    const unitX = props.proxy.location(1, 0);
    const unitY = props.proxy.location(0, 1);
    const pxPerUnit = (Math.abs(unitX.x - origin.x) + Math.abs(unitY.y - origin.y)) / 2;
    const baseSizeRaw = Math.max(24, Math.min(112, (8 + pxPerUnit * 0.14) * 2));
    const zoomBoost = 1 + Math.max(0, Math.log2(Math.max(1, pxPerUnit / 90))) * 0.65;
    const baseSize = Math.max(12, Math.min(140, baseSizeRaw * zoomBoost));
    this.currentSize = baseSize;

    const nextIds = new Set(props.points.map((p) => this.pointKey(p)));

    for (const [id, node] of this.nodeMap.entries()) {
      if (!nextIds.has(id)) {
        node.remove();
        this.nodeMap.delete(id);
      }
    }

    for (const point of props.points) {
      const key = this.pointKey(point);
      let node = this.nodeMap.get(key);
      if (!node) {
        node = document.createElement("img");
        node.className = "atlas-point-thumb";
        node.alt = point.id;
        this.bindImageSource(node, point);
        this.root.appendChild(node);
        this.nodeMap.set(key, node);
      }

      const p = props.proxy.location(point.x, point.y);
      const visible = p.x >= -24 && p.x <= props.proxy.width + 24 && p.y >= -24 && p.y <= props.proxy.height + 24;
      node.style.display = visible ? "block" : "none";
      if (!visible) {
        continue;
      }

      const size = props.selectedId === point.id ? this.currentSize * 1.35 : this.currentSize;
      node.style.width = `${size}px`;
      node.style.height = `${size}px`;
      node.style.left = `${p.x}px`;
      node.style.top = `${p.y}px`;
      node.classList.toggle("selected", props.selectedId === point.id);
    }
  }

  destroy() {
    this.nodeMap.clear();
    this.root.remove();
  }
}
