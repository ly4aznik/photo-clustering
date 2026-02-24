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

  update(props: OverlayProps) {
    const origin = props.proxy.location(0, 0);
    const unitX = props.proxy.location(1, 0);
    const unitY = props.proxy.location(0, 1);
    const pxPerUnit = (Math.abs(unitX.x - origin.x) + Math.abs(unitY.y - origin.y)) / 2;
    const baseSizeRaw = Math.max(24, Math.min(112, (8 + pxPerUnit * 0.14) * 2));
    const zoomBoost = 1 + Math.max(0, Math.log2(Math.max(1, pxPerUnit / 90))) * 0.65;
    const baseSize = Math.max(12, Math.min(140, baseSizeRaw * zoomBoost));
    this.currentSize = baseSize;

    const nextIds = new Set(props.points.map((p) => p.id));

    for (const [id, node] of this.nodeMap.entries()) {
      if (!nextIds.has(id)) {
        node.remove();
        this.nodeMap.delete(id);
      }
    }

    for (const point of props.points) {
      let node = this.nodeMap.get(point.id);
      if (!node) {
        node = document.createElement("img");
        node.className = "atlas-point-thumb";
        node.alt = point.id;
        node.src = point.thumb;
        this.root.appendChild(node);
        this.nodeMap.set(point.id, node);
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
