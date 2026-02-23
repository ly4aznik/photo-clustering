import { useEffect, useMemo, useRef, useState } from "react";
import { EmbeddingView } from "embedding-atlas/react";
import { AtlasTooltip } from "./AtlasTooltip";
import { AtlasOverlay } from "./AtlasOverlay";
import { DEMO_POINTS, LABELS } from "./data/demoPoints";
import type { DemoPoint } from "./types";

type DataPointLike = {
  x?: number;
  y?: number;
  identifier?: string;
};

type ViewportStateLike = {
  x: number;
  y: number;
  scale: number;
};

const FULL_PHOTO_EXTENSIONS = ["JPG", "jpg", "JPEG", "jpeg", "PNG", "png", "WEBP", "webp"] as const;

function App() {
  const [enabledLabels, setEnabledLabels] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(LABELS.map((label) => [label, true]))
  );
  const [idQuery, setIdQuery] = useState("");
  const [tooltip, setTooltip] = useState<DataPointLike | null>(null);
  const [selection, setSelection] = useState<DataPointLike[] | null>(null);
  const [viewportState, setViewportState] = useState<ViewportStateLike>({
    x: 0,
    y: 0,
    scale: 0.22
  });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 840, height: 620 });

  useEffect(() => {
    if (!viewportRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setSize({
        width: Math.max(320, Math.floor(entry.contentRect.width)),
        height: Math.max(360, Math.floor(entry.contentRect.height))
      });
    });

    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  const labelIndex = useMemo(
    () => Object.fromEntries(LABELS.map((label, index) => [label, index])),
    []
  );

  const visiblePoints = useMemo(() => {
    const query = idQuery.trim().toLowerCase();
    return DEMO_POINTS.filter((point) => {
      if (!enabledLabels[point.label]) {
        return false;
      }
      if (!query) {
        return true;
      }
      return point.id.toLowerCase().includes(query);
    });
  }, [enabledLabels, idQuery]);

  const byId = useMemo(() => new Map(visiblePoints.map((point) => [point.id, point])), [visiblePoints]);

  const data = useMemo(
    () => ({
      x: new Float32Array(visiblePoints.map((point) => point.x)),
      y: new Float32Array(visiblePoints.map((point) => point.y)),
      category: new Uint8Array(visiblePoints.map((point) => labelIndex[point.label]))
    }),
    [visiblePoints, labelIndex]
  );

  const resolvePoint = (value: DataPointLike): DemoPoint | null => {
    if (value.identifier) {
      const point = byId.get(value.identifier);
      if (point) {
        return point;
      }
    }

    if (typeof value.x !== "number" || typeof value.y !== "number") {
      return null;
    }

    let best: DemoPoint | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const point of visiblePoints) {
      const dx = point.x - value.x;
      const dy = point.y - value.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = point;
      }
    }

    return best;
  };

  const querySelection = async (x: number, y: number, unitDistance: number) => {
    let best: DemoPoint | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const point of visiblePoints) {
      const dx = point.x - x;
      const dy = point.y - y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = point;
      }
    }

    if (!best) {
      return null;
    }

    if (Math.sqrt(bestDistance) > Math.max(unitDistance * 12, 0.05)) {
      return null;
    }

    return {
      x: best.x,
      y: best.y,
      category: labelIndex[best.label],
      text: best.label,
      identifier: best.id
    };
  };

  const selectedPoint = useMemo(() => {
    if (!selection || selection.length === 0) {
      return null;
    }
    return resolvePoint(selection[0]);
  }, [selection, byId, visiblePoints]);

  const selectedId = selectedPoint?.id ?? null;
  const [selectedFullPhoto, setSelectedFullPhoto] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveFullPhoto = async () => {
      if (!selectedPoint) {
        setSelectedFullPhoto(null);
        return;
      }

      for (const ext of FULL_PHOTO_EXTENSIONS) {
        const candidate = `/photos/${selectedPoint.id}.${ext}`;
        try {
          const response = await fetch(candidate, { method: "HEAD" });
          if (response.ok) {
            if (!cancelled) {
              setSelectedFullPhoto(candidate);
            }
            return;
          }
        } catch {
          // Ignore and try next extension.
        }
      }

      if (!cancelled) {
        setSelectedFullPhoto(selectedPoint.thumb);
      }
    };

    void resolveFullPhoto();
    return () => {
      cancelled = true;
    };
  }, [selectedPoint]);

  return (
    <div className="page">
      <header className="topbar">
        <h1>Embedding Atlas Demo</h1>
        <div className="summary">points: {visiblePoints.length}/100</div>
      </header>

      <div className="layout">
        <aside className="controls">
          <section>
            <h2>Search by id</h2>
            <input
              value={idQuery}
              onChange={(event) => setIdQuery(event.target.value)}
              placeholder="DSC_01"
            />
          </section>

          <section>
            <h2>Filter by label</h2>
            <div className="labels">
              {LABELS.map((label) => (
                <label key={label}>
                  <input
                    type="checkbox"
                    checked={enabledLabels[label]}
                    onChange={(event) => {
                      setEnabledLabels((prev) => ({ ...prev, [label]: event.target.checked }));
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2>Hover</h2>
            <p>Наведите курсор на точку, чтобы увидеть миниатюру.</p>
          </section>
        </aside>

        <main className="chart-wrap" ref={viewportRef}>
          <EmbeddingView
            data={data}
            width={size.width}
            height={size.height}
            viewportState={viewportState}
            onViewportState={(value) => setViewportState(value as ViewportStateLike)}
            tooltip={tooltip as never}
            onTooltip={(value) => setTooltip((value as DataPointLike | null) ?? null)}
            selection={selection as never}
            onSelection={(value) => setSelection((value as DataPointLike[] | null) ?? null)}
            querySelection={querySelection as never}
            config={{ colorScheme: "light", mode: "points" }}
            customTooltip={{
              class: AtlasTooltip,
              props: { resolvePoint }
            }}
            customOverlay={{
              class: AtlasOverlay,
              props: {
                points: visiblePoints,
                selectedId
              }
            }}
          />
        </main>

        <aside className="details">
          <h2>Selected</h2>
          {selectedPoint ? (
            <div className="card">
              <a href={selectedFullPhoto ?? selectedPoint.thumb} target="_blank" rel="noreferrer">
                <img src={selectedFullPhoto ?? selectedPoint.thumb} alt={selectedPoint.id} className="large-thumb" />
              </a>
              <div>id: {selectedPoint.id}</div>
              <div>label: {selectedPoint.label}</div>
              <div>
                x: {selectedPoint.x}, y: {selectedPoint.y}
              </div>
            </div>
          ) : (
            <p>Кликните по точке, чтобы зафиксировать выбор.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;

