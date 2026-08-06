"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "./Avatar";

export interface OrgPerson {
  id: string;
  firstName: string;
  lastName: string;
  designation?: string | null;
  profilePicture?: string | null;
  managerId?: string | null;
  department?: { id: string; name: string } | null;
  /** Colour token from the role roster, e.g. "blue". */
  color?: string | null;
  roleName?: string | null;
}

interface Placed extends OrgPerson {
  x: number;
  y: number;
  depth: number;
  childIds: string[];
}

export const NODE_W = 240;
export const NODE_H = 84;
const H_GAP = 32;
const V_GAP = 72;

const COLOR_HEX: Record<string, string> = {
  red: "#f43f5e",
  purple: "#a78bfa",
  blue: "#5b9dff",
  green: "#2dd4bf",
  orange: "#ffb454",
  gray: "#94a3b8",
};

/** Initials sit on the role's own colour, so a card reads as its role at a glance. */
const COLOR_AVATAR: Record<string, string> = {
  red: "bg-rose-500",
  purple: "bg-violet-500",
  blue: "bg-blue-500",
  green: "bg-teal-500",
  orange: "bg-amber-500",
  gray: "bg-slate-500",
};

const hexFor = (color?: string | null) => COLOR_HEX[color || "gray"] ?? COLOR_HEX.gray;
const avatarClassFor = (color?: string | null) =>
  COLOR_AVATAR[color || "gray"] ?? COLOR_AVATAR.gray;

/**
 * Tidy tree layout: children are packed left to right, then each parent is centred
 * over its own children. Computed from the data — positions are never stored, so
 * adding a person never leaves the chart stale.
 */
function layout(people: OrgPerson[]): { placed: Placed[]; width: number; height: number } {
  const byId = new Map(people.map((p) => [p.id, p]));
  const childrenOf = new Map<string, string[]>();
  const roots: string[] = [];

  for (const p of people) {
    if (p.managerId && byId.has(p.managerId) && p.managerId !== p.id) {
      childrenOf.set(p.managerId, [...(childrenOf.get(p.managerId) ?? []), p.id]);
    } else {
      roots.push(p.id);
    }
  }

  const placed: Placed[] = [];
  let cursor = 0;

  const walk = (id: string, depth: number, seen: Set<string>): number => {
    // a manager cycle would otherwise recurse forever
    if (seen.has(id)) return cursor;
    seen.add(id);

    const person = byId.get(id)!;
    const kids = childrenOf.get(id) ?? [];
    let x: number;

    if (kids.length === 0) {
      x = cursor;
      cursor += NODE_W + H_GAP;
    } else {
      const centres = kids.map((kid) => walk(kid, depth + 1, seen));
      x = (centres[0] + centres[centres.length - 1]) / 2;
    }

    placed.push({
      ...person,
      x,
      y: depth * (NODE_H + V_GAP),
      depth,
      childIds: kids,
    });
    return x;
  };

  const seen = new Set<string>();
  for (const root of roots) {
    walk(root, 0, seen);
    cursor += H_GAP * 2; // breathing room between separate trees
  }
  // anyone left over sat in a cycle; show them rather than dropping them
  for (const p of people) {
    if (!seen.has(p.id)) walk(p.id, 0, seen);
  }

  const width = Math.max(...placed.map((p) => p.x + NODE_W), NODE_W);
  const height = Math.max(...placed.map((p) => p.y + NODE_H), NODE_H);
  return { placed, width, height };
}

/** An in-progress reporting link being dragged from a card's handle. */
interface Link {
  fromId: string;
  x: number;
  y: number;
  overId?: string;
}

/** Cubic bezier from a parent's bottom edge to a child's top edge. */
function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const dy = Math.max(28, Math.abs(y2 - y1) * 0.5);
  return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
}

/**
 * Pan-and-zoom organisation chart.
 *
 * Draws the reporting tree on a canvas you can drag and zoom, with curved
 * connectors. Cards are coloured by the person's role. When `onReassign` is
 * provided, dragging from a card's bottom handle onto another card makes that
 * person report to the first — the move is refused if it would create a loop.
 */
export function OrgChartCanvas({
  people,
  highlightId,
  onReassign,
  onOpen,
}: {
  people: OrgPerson[];
  highlightId?: string | null;
  /** Omit to make the chart read-only. */
  onReassign?: (personId: string, newManagerId: string) => void | Promise<void>;
  onOpen?: (personId: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 });
  const [panning, setPanning] = useState(false);
  const [link, setLinkState] = useState<Link | null>(null);
  /** The same value, readable synchronously from a pointer handler. */
  const linkRef = useRef<Link | null>(null);
  const setLink = useCallback((next: Link | null) => {
    linkRef.current = next;
    setLinkState(next);
  }, []);

  const { placed, width, height } = useMemo(() => layout(people), [people]);
  const byId = useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed]);

  /** Screen point → canvas point, so a drag lands where the cursor is at any zoom. */
  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - camera.x) / camera.z,
        y: (clientY - rect.top - camera.y) / camera.z,
      };
    },
    [camera]
  );

  const fit = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || !placed.length) return;
    const pad = 48;
    const z = Math.min(1, (rect.width - pad * 2) / width, (rect.height - pad * 2) / height);
    setCamera({
      x: (rect.width - width * z) / 2,
      y: Math.max(pad, (rect.height - height * z) / 2),
      z: Math.max(0.3, z),
    });
  }, [placed.length, width, height]);

  // fit once the tree is known, and again whenever its shape changes
  useEffect(() => {
    const id = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(id);
  }, [fit]);

  // wheel zoom toward the cursor. Non-passive, so the page cannot scroll instead.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      setCamera((cam) => {
        const z = Math.min(2, Math.max(0.25, cam.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
        const wx = (e.clientX - rect.left - cam.x) / cam.z;
        const wy = (e.clientY - rect.top - cam.y) / cam.z;
        return { x: e.clientX - rect.left - wx * z, y: e.clientY - rect.top - wy * z, z };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // centre on the searched person without losing the current zoom
  useEffect(() => {
    if (!highlightId) return;
    const node = byId.get(highlightId);
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!node || !rect) return;
    const id = requestAnimationFrame(() =>
      setCamera((cam) => ({
        ...cam,
        x: rect.width / 2 - (node.x + NODE_W / 2) * cam.z,
        y: rect.height / 2 - (node.y + NODE_H / 2) * cam.z,
      }))
    );
    return () => cancelAnimationFrame(id);
  }, [highlightId, byId]);

  const startPan = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const origin = { x: e.clientX - camera.x, y: e.clientY - camera.y };
    setPanning(true);
    const move = (ev: PointerEvent) =>
      setCamera((cam) => ({ ...cam, x: ev.clientX - origin.x, y: ev.clientY - origin.y }));
    const up = () => {
      setPanning(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /** True when `candidate` sits under `personId`, i.e. the move would loop. */
  const isDescendant = (personId: string, candidate: string): boolean => {
    let cursor: string | null | undefined = byId.get(candidate)?.managerId;
    let guard = 0;
    while (cursor && guard++ < 500) {
      if (cursor === personId) return true;
      cursor = byId.get(cursor)?.managerId;
    }
    return false;
  };

  const startLink = (fromId: string) => (e: React.PointerEvent) => {
    if (!onReassign) return;
    e.stopPropagation();
    e.preventDefault();
    const point = toCanvas(e.clientX, e.clientY);
    setLink({ fromId, x: point.x, y: point.y });

    const move = (ev: PointerEvent) => {
      const p = toCanvas(ev.clientX, ev.clientY);
      const card = (ev.target as Element | null)?.closest?.("[data-person]") as HTMLElement | null;
      const overId = card?.dataset.person;
      setLink({
        fromId,
        x: p.x,
        y: p.y,
        overId: overId && overId !== fromId && !isDescendant(overId, fromId) ? overId : undefined,
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      // Read the drop target from the ref, never from inside a setState updater:
      // React may run an updater during render, and `onReassign` opens a dialog —
      // setting another component's state mid-render is the "Cannot update a
      // component while rendering a different component" warning.
      const target = linkRef.current?.overId;
      setLink(null);
      if (target) void onReassign(target, fromId);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const from = link ? byId.get(link.fromId) : null;

  return (
    <div className="relative">
      <div
        ref={viewportRef}
        onPointerDown={startPan}
        className="relative h-[min(70vh,640px)] overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-950"
        style={{
          cursor: link ? "crosshair" : panning ? "grabbing" : "grab",
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: `${28 * camera.z}px ${28 * camera.z}px`,
          backgroundPosition: `${camera.x}px ${camera.y}px`,
          color: "rgb(148 163 184 / 0.35)",
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})` }}
        >
          {/* connectors sit under the cards and are drawn in one pass */}
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={Math.max(width, 1)}
            height={Math.max(height, 1)}
            aria-hidden="true"
          >
            {placed.flatMap((parent) =>
              parent.childIds.map((childId) => {
                const child = byId.get(childId);
                if (!child) return null;
                const d = edgePath(
                  parent.x + NODE_W / 2,
                  parent.y + NODE_H,
                  child.x + NODE_W / 2,
                  child.y
                );
                return (
                  <g key={`${parent.id}-${childId}`}>
                    <path
                      d={d}
                      fill="none"
                      stroke={hexFor(parent.color)}
                      strokeOpacity={0.25}
                      strokeWidth={7}
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke={hexFor(parent.color)}
                      strokeWidth={2.25}
                      strokeLinecap="round"
                    />
                  </g>
                );
              })
            )}
            {from && link && (
              <path
                d={edgePath(from.x + NODE_W / 2, from.y + NODE_H, link.x, link.y)}
                fill="none"
                stroke="#2dd4bf"
                strokeWidth={2.25}
                strokeDasharray="6 6"
                strokeLinecap="round"
              />
            )}
          </svg>

          {placed.map((person) => {
            const accent = hexFor(person.color);
            const isTarget = link?.overId === person.id;
            // `rounded` — same 4px radius as Input/Card, so the chart matches the app
            return (
              <div
                key={person.id}
                data-person={person.id}
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={() => onOpen?.(person.id)}
                className={`group absolute rounded border bg-white transition-shadow dark:bg-gray-900 ${
                  isTarget
                    ? "border-teal-400 shadow-lg ring-2 ring-teal-400/40"
                    : person.id === highlightId
                      ? "border-gray-900 shadow-lg ring-2 ring-gray-900/20 dark:border-white dark:ring-white/20"
                      : "border-gray-200 shadow-sm hover:shadow-md dark:border-gray-700"
                }`}
                style={{ left: person.x, top: person.y, width: NODE_W, height: NODE_H }}
              >
                <div className="flex h-full items-center gap-3 px-4">
                  <Avatar
                    src={person.profilePicture}
                    name={`${person.firstName} ${person.lastName}`}
                    size="lg"
                    colorClass={avatarClassFor(person.color)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight text-gray-900 dark:text-white">
                      {person.firstName} {person.lastName}
                    </p>
                    <p className="truncate text-xs leading-snug text-gray-500 dark:text-gray-400">
                      {person.designation || person.roleName || "—"}
                    </p>
                  </div>
                </div>

                {/* the port an incoming line lands on */}
                {person.managerId && byId.has(person.managerId) && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white dark:border-gray-900"
                    style={{ background: accent }}
                  />
                )}

                {/* the outgoing port: a plain dot when read-only, a drag handle when not */}
                {onReassign ? (
                  <button
                    type="button"
                    onPointerDown={startLink(person.id)}
                    title="Drag onto someone to make them report here"
                    aria-label={`Add a report under ${person.firstName}`}
                    className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 cursor-crosshair rounded-full border-2 border-white opacity-60 transition-transform hover:scale-150 focus:scale-150 group-hover:opacity-100 dark:border-gray-900"
                    style={{ background: accent }}
                  />
                ) : (
                  person.childIds.length > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white dark:border-gray-900"
                      style={{ background: accent }}
                    />
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* camera controls, kept out of the drag surface */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-gray-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/90">
        <button
          type="button"
          onClick={() => setCamera((c) => ({ ...c, z: Math.max(0.25, c.z / 1.2) }))}
          className="h-7 w-7 rounded text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="w-10 text-center text-xs tabular-nums text-gray-500 dark:text-gray-400">
          {Math.round(camera.z * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setCamera((c) => ({ ...c, z: Math.min(2, c.z * 1.2) }))}
          className="h-7 w-7 rounded text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={fit}
          className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Fit
        </button>
      </div>
    </div>
  );
}
