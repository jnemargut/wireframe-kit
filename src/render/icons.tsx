import type { IconName } from "../vocab";

/** Simple stroke icons on a 24 grid. A string is a path; arrays are circles, dots and rects. */
type Part = string | ["c", number, number, number] | ["dot", number, number, number?] | ["r", number, number, number, number, number?];

const I: Record<IconName, Part[]> = {
  menu: ["M4 7h16M4 12h16M4 17h16"],
  back: ["M20 12H5M11 6l-6 6 6 6"],
  close: ["M6 6l12 12M18 6L6 18"],
  search: [["c", 11, 11, 6], "M15.5 15.5l4.5 4.5"],
  plus: ["M12 5v14M5 12h14"],
  minus: ["M5 12h14"],
  check: ["M5 12.5l4.5 4.5L19 7"],
  "chevron-right": ["M9 5l7 7-7 7"],
  "chevron-down": ["M5 9l7 7 7-7"],
  "chevron-left": ["M15 5l-7 7 7 7"],
  heart: ["M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"],
  star: ["M12 3.5l2.6 5.5 6 .8-4.4 4.1 1.1 6L12 17l-5.3 2.9 1.1-6-4.4-4.1 6-.8z"],
  cart: ["M3 4h3l2.2 10.5h10L21 7H7", ["c", 9.5, 19, 1.5], ["c", 17, 19, 1.5]],
  bag: ["M5 8h14l-1 12H6z", "M9 8V6a3 3 0 0 1 6 0v2"],
  user: [["c", 12, 8, 4], "M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5"],
  users: [["c", 9, 8, 3.5], "M2.5 20c.8-3.8 3.6-5.5 6.5-5.5s5.7 1.7 6.5 5.5", ["c", 17, 9, 2.8], "M16.5 14.5c2.6 0 4.4 1.6 5.2 4.6"],
  home: ["M4 11l8-7 8 7", "M6 9.5V20h12V9.5", "M10 20v-5h4v5"],
  bell: ["M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15z", "M10 21.5h4"],
  settings: [["c", 12, 12, 3.2], "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"],
  share: [["c", 6, 12, 2.5], ["c", 18, 6, 2.5], ["c", 18, 18, 2.5], "M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"],
  more: [["dot", 5, 12, 1.7], ["dot", 12, 12, 1.7], ["dot", 19, 12, 1.7]],
  "map-pin": ["M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11z", ["c", 12, 10, 2.2]],
  clock: [["c", 12, 12, 8.5], "M12 7.5V12l3 2"],
  calendar: [["r", 4, 5.5, 16, 15, 2], "M4 10h16M8 3.5v4M16 3.5v4"],
  camera: ["M4 8h3.5L9 5.5h6L16.5 8H20v11H4z", ["c", 12, 13.5, 3.5]],
  image: [["r", 3.5, 5, 17, 14, 2], "M3.5 16l5-5 4 4 2.5-2.5 5.5 5.5", ["c", 15.5, 9.5, 1.5]],
  mail: [["r", 3.5, 6, 17, 12, 2], "M4 7l8 6 8-6"],
  phone: ["M6.5 3.5h3L11 8 9 9.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"],
  chat: ["M4 5h16v11H9l-5 4z"],
  filter: ["M4 5h16l-6 7.5V19l-4 2v-8.5z"],
  edit: ["M4 20l1-4.5L16 4.5 19.5 8 8.5 19z", "M14 7l3 3"],
  trash: ["M5 7h14M9.5 7V4.5h5V7", "M6.5 7l1 13h9l1-13"],
  lock: [["r", 5, 10.5, 14, 10, 2], "M8 10.5V8a4 4 0 0 1 8 0v2.5"],
  info: [["c", 12, 12, 8.5], "M12 11v5.5", ["dot", 12, 7.8, 1.2]],
  alert: ["M12 4l9 16H3z", "M12 10v4.5", ["dot", 12, 17.3, 1.2]],
  play: ["M8 5.5v13l10.5-6.5z"],
  list: ["M9 6h11M9 12h11M9 18h11", ["dot", 4.5, 6, 1.3], ["dot", 4.5, 12, 1.3], ["dot", 4.5, 18, 1.3]],
  grid: [["r", 4, 4, 7, 7, 1.5], ["r", 13, 4, 7, 7, 1.5], ["r", 4, 13, 7, 7, 1.5], ["r", 13, 13, 7, 7, 1.5]],
  download: ["M12 4v11M7 10.5l5 5 5-5M5 20h14"],
  upload: ["M12 16V5M7 9.5l5-5 5 5M5 20h14"],
  coffee: ["M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z", "M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16", "M8.5 3.5c-.8 1 .8 2 0 3M12.5 3.5c-.8 1 .8 2 0 3"],
  card: [["r", 3, 6, 18, 12.5, 2], "M3 10h18M6.5 15h4"],
  gift: [["r", 4, 9, 16, 4, 1], "M5.5 13v7.5h13V13M12 9v11.5", "M12 9C10.5 5 6 5 7 7.5S12 9 12 9zm0 0c1.5-4 6-4 5-1.5S12 9 12 9z"],
  bookmark: ["M6.5 4h11v16.5L12 16.5l-5.5 4z"],
  send: ["M4 12l16-7.5-5.5 16-3-6.5z", "M11.5 14l3-3.5"],
  mic: [["r", 9, 3.5, 6, 11, 3], "M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"],
  refresh: ["M19.5 12a7.5 7.5 0 1 1-2.2-5.3", "M19.5 4.5v4h-4"],
  logout: ["M10 4.5H5v15h5", "M14.5 8l4 4-4 4M18.5 12H9.5"],
  help: [["c", 12, 12, 8.5], "M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.6v.6", ["dot", 12, 16.9, 1.2]],
  doc: ["M6 3.5h8l4 4v13H6z", "M14 3.5V8h4M9 12.5h6M9 16h6"],
  folder: ["M3.5 6.5h6l2 2.5h9v10.5h-17z"],
  link: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
  eye: ["M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z", ["c", 12, 12, 3]],
  sun: [["c", 12, 12, 4], "M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"],
  moon: ["M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"],
};

export const hasIcon = (name: unknown): name is IconName => typeof name === "string" && name in I;

/** An icon whose top-left is (x, y), `size` px square. */
export function Icon({ name, x, y, size = 24, color = "#1c1c1e", sw }: { name: string; x: number; y: number; size?: number; color?: string; sw?: number }) {
  const parts = I[(hasIcon(name) ? name : "grid") as IconName];
  const k = size / 24;
  const width = sw ?? (size <= 28 ? 2 : 2 * Math.sqrt(k));
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} fill="none" stroke={color} strokeWidth={width / k} strokeLinecap="round" strokeLinejoin="round">
      {parts.map((p, i) => {
        if (typeof p === "string") return <path key={i} d={p} />;
        if (p[0] === "c") return <circle key={i} cx={p[1]} cy={p[2]} r={p[3]} />;
        if (p[0] === "dot") return <circle key={i} cx={p[1]} cy={p[2]} r={p[3] ?? 1.3} fill={color} stroke="none" />;
        return <rect key={i} x={p[1]} y={p[2]} width={p[3]} height={p[4]} rx={p[5] ?? 0} />;
      })}
    </g>
  );
}
