import type { DemoPoint } from "./types";

type TooltipLike = {
  identifier?: string;
  text?: string;
  x?: number;
  y?: number;
};

type TooltipProps = {
  tooltip: TooltipLike | null;
  resolvePoint: (tooltip: TooltipLike) => DemoPoint | null;
};

export class AtlasTooltip {
  private readonly root: HTMLDivElement;
  private readonly image: HTMLImageElement;
  private readonly idLine: HTMLDivElement;
  private readonly labelLine: HTMLDivElement;
  private resolver: (tooltip: TooltipLike) => DemoPoint | null;

  constructor(target: HTMLElement, props: TooltipProps) {
    this.root = document.createElement("div");
    this.root.className = "atlas-tooltip";
    this.image = document.createElement("img");
    this.image.alt = "thumbnail";
    this.idLine = document.createElement("div");
    this.labelLine = document.createElement("div");

    this.root.append(this.image, this.idLine, this.labelLine);
    target.appendChild(this.root);

    this.resolver = props.resolvePoint;
    this.update(props);
  }

  update(props: TooltipProps) {
    this.resolver = props.resolvePoint;

    if (!props.tooltip) {
      this.root.style.display = "none";
      return;
    }

    const point = this.resolver(props.tooltip);
    if (!point) {
      this.root.style.display = "none";
      return;
    }

    this.root.style.display = "flex";
    this.image.src = point.thumb;
    this.idLine.textContent = `id: ${point.id}`;
    this.labelLine.textContent = `label: ${point.label}`;
  }

  destroy() {
    this.root.remove();
  }
}
