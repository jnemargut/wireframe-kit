import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { C } from "../../vendor/sketch/tokens";
import { WobbleFilter } from "../../vendor/sketch/wobble";
import { MarkupStrokes, ShapeMark, shapeId } from "../../vendor/sketch/shapes";
import { layoutScreen, type Box, type Layout } from "../layout";
import type { MarkupStroke, SketchShape, WireframeFile } from "../types";
import { draw, HomeIndicator, StatusBar, type DrawCtx } from "./components";

export interface ScreenOpts {
  /** Wobble on (off while dragging in the editor). */
  wobble?: boolean;
  asset?: (src: string) => string | undefined;
  /** Unique id prefix when several screens share one SVG. */
  uid?: string;
  /** Round the screen's corners (to sit inside a device body). */
  rx?: number;
  /** Draw play-mode sharpie markup. Only play mode does. */
  showMarkup?: boolean;
  /** Markup strokes are clickable (the play-mode eraser). */
  markupHit?: boolean;
  /** Leave out designer shapes (the editor draws them itself so they can be selected). */
  hideShapes?: boolean;
}

/** Drawings are sized for a phone; they scale up a little on bigger screens. */
export const shapeScale = (w: number) => Math.max(1.4, Math.min(2.4, w / 280));

/** Wobble settings for screen-sized art (a phone screen is about twice the scale of a storyboard panel). */
export const SCREEN_WOBBLE = { scale: 3, frequency: 0.02 };

function scaled(b: Box, node: ReactNode) {
  if (!b.scale || b.scale === 1) return node;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  return <g transform={`translate(${cx} ${cy}) scale(${b.scale}) translate(${-cx} ${-cy})`}>{node}</g>;
}

/** One screen's artwork in screen units (0,0 → w,h). Put it inside an <svg> that defines no filter; it brings its own. */
export function ScreenArt({ layout, opts = {}, shapes = [], markup = [] }: { layout: Layout; opts?: ScreenOpts; shapes?: SketchShape[]; markup?: MarkupStroke[] }) {
  const uid = opts.uid ?? `wf-${layout.screen.replace(/[^a-z0-9]/gi, "_")}`;
  const ctx: DrawCtx = { asset: opts.asset, uid };
  const fid = `${uid}-wob`;
  const clip = `${uid}-clip`;
  const filter = opts.wobble === false ? undefined : `url(#${fid})`;
  const planes = [...new Set(layout.boxes.map((b) => b.plane))].sort((a, b) => a - b);
  const drawn = new Map(layout.boxes.filter((b) => !b.hidden).map((b) => [b, draw(b, ctx)]));
  const layer = (p: number) => {
    const bs = layout.boxes.filter((b) => b.plane === p && !b.hidden);
    const scrim = bs.some((b) => b.scrim);
    return (
      <g key={p}>
        {scrim ? <rect x={0} y={0} width={layout.w} height={layout.h} fill={C.ink} opacity={0.28} /> : null}
        <g filter={filter}>{bs.map((b) => <g key={b.key}>{scaled(b, drawn.get(b)?.shape)}</g>)}</g>
        <g>{bs.map((b) => <g key={b.key}>{scaled(b, drawn.get(b)?.words)}</g>)}</g>
      </g>
    );
  };
  return (
    <g>
      <defs>
        <WobbleFilter id={fid} region={{ x: -12, y: -12, width: layout.w + 24, height: layout.h + 24 }} {...SCREEN_WOBBLE} />
        <clipPath id={clip}><rect x={0} y={0} width={layout.w} height={layout.h} rx={opts.rx ?? 0} /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x={0} y={0} width={layout.w} height={layout.h} fill={C.paper} />
        {layer(0)}
        {layout.statusbar ? <StatusBar w={layout.w} phone={layout.phone} /> : null}
        {planes.filter((p) => p > 0).map(layer)}
        {layout.statusbar && layout.phone ? <HomeIndicator w={layout.w} h={layout.h} /> : null}
        {!opts.hideShapes && shapes.length ? <g filter={filter}>{shapes.map((sh, i) => <g key={shapeId(sh, i)}><ShapeMark s={sh} scale={shapeScale(layout.w)} /></g>)}</g> : null}
        {opts.showMarkup && markup.length ? <g pointerEvents={opts.markupHit ? "stroke" : "none"}><MarkupStrokes strokes={markup} hit={opts.markupHit} scale={shapeScale(layout.w)} /></g> : null}
      </g>
    </g>
  );
}

export interface SvgOpts extends ScreenOpts { fontCss?: string; scale?: number }

/** A standalone SVG of one screen. */
export function screenSVG(file: WireframeFile, screenId: string, o: SvgOpts = {}): string {
  const l = layoutScreen(file, screenId);
  const el = (
    <svg xmlns="http://www.w3.org/2000/svg" width={l.w} height={l.h} viewBox={`0 0 ${l.w} ${l.h}`}>
      {o.fontCss ? <style>{o.fontCss}</style> : null}
      <ScreenArt layout={l} opts={o} shapes={file.screens[screenId]?.shapes} />
    </svg>
  );
  return renderToStaticMarkup(el);
}

export const svgString = (node: ReactNode) => renderToStaticMarkup(createElement("g", null, node));
