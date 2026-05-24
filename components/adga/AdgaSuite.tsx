// @ts-nocheck
"use client";

import React from "react";
import Script from "next/script";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SUITE_ROUTES,
  SUITE_ROUTE_IDS as REGISTRY_ROUTE_IDS,
  ROUTE_PATHS as REGISTRY_ROUTE_PATHS,
  ROUTE_LABELS as REGISTRY_ROUTE_LABELS,
  getSidebarGroups as registryGetSidebarGroups,
  resolveSuitePathname,
} from "@/app/suite/routes";
import { WORKSPACES, getWorkspaceContract } from "@/app/suite/workspaces";
import { SuiteContextProvider, type SuiteContextValue } from "@/components/suite/suite-context";
import { emitSuiteEvent } from "@/lib/events/hooks";
import { KNOWLEDGE } from "@/lib/seed/knowledge";

// Contract-driven workspace renderers. Each entry in WORKSPACES that ships with a real renderer
// gets lazy-imported here. The shell prefers these over the inline route-switch below — the
// inline switch is the legacy path that shrinks as more workspaces extract.
const CONTRACT_WORKSPACE_RENDERERS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  knowledge: React.lazy(() => import("@/components/suite/workspaces/KnowledgeWorkspace")),
};

declare global {
  interface Window {
    [key: string]: any;
  }
}

async function recordApprovalDecision(item, status, proposedAction) {
  const create = await fetch('/api/agent/approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent: item.agent,
      title: item.title,
      proposed_action: proposedAction || item.proposed,
      risk: item.urgency === 'med' ? 'medium' : item.urgency,
      resource_type: item.target?.id?.startsWith('DEAL') ? 'deal' : 'suite_item',
      resource_id: item.target?.id || item.id,
      payload: {
        target: item.target,
        reasoning: item.reasoning,
        timeline: item.timeline,
      },
    }),
  });
  if (!create.ok) return null;
  const data = await create.json();
  if (!data?.approval?.id) return data;
  const patch = await fetch(`/api/agent/approvals/${data.approval.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      proposed_action: proposedAction || item.proposed,
      payload: { source_pending_id: item.id },
    }),
  });
  return patch.ok ? patch.json() : data;
}




// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues((prev) => ({ ...prev, ...edits }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', { detail: edits }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({ title = 'Tweaks', noDeckControls = false, children }) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  // Auto-inject a rail toggle when a <deck-stage> is on the page. The
  // toggle drives the deck's per-viewer _railVisible via window message;
  // state is mirrored from the same localStorage key the deck reads so
  // the control reflects reality across reloads. The mechanism is the
  // message — authors who want custom placement can post it directly
  // and pass noDeckControls to suppress this one.
  const hasDeckStage = React.useMemo(
    () => typeof document !== 'undefined' && !!document.querySelector('deck-stage'),
    [],
  );
  // deck-stage enables its rail in connectedCallback, but this panel can
  // mount before that element has upgraded. The initial read catches the
  // common case; the listener covers mounting first. (Older deck-stage.js
  // copies still wait for the host's __omelette_rail_enabled postMessage —
  // same listener handles those.)
  const [railEnabled, setRailEnabled] = React.useState(
    () => hasDeckStage && !!document.querySelector('deck-stage')?._railEnabled,
  );
  React.useEffect(() => {
    if (!hasDeckStage || railEnabled) return undefined;
    const onMsg = (e) => {
      if (e.data && e.data.type === '__omelette_rail_enabled') setRailEnabled(true);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [hasDeckStage, railEnabled]);
  const [railVisible, setRailVisible] = React.useState(() => {
    try { return localStorage.getItem('deck-stage.railVisible') !== '0'; } catch (e) { return true; }
  });
  const toggleRail = (on) => {
    setRailVisible(on);
    window.postMessage({ type: '__deck_rail_visible', on }, '*');
  };
  const offsetRef = React.useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  React.useEffect(() => {
    const onMsg = (e) => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);
      else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  };

  const onDragStart = (e) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;
  return (
    <>
      <style>{__TWEAKS_STYLE}</style>
      <div ref={dragRef} className="twk-panel" data-noncommentable=""
           style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>{title}</b>
          <button className="twk-x" aria-label="Close tweaks"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={dismiss}>✕</button>
        </div>
        <div className="twk-body">
          {children}
          {hasDeckStage && railEnabled && !noDeckControls && (
            <TweakSection label="Deck">
              <TweakToggle label="Thumbnail rail" value={railVisible} onChange={toggleRail} />
            </TweakSection>
          )}
        </div>
      </div>
    </>
  );
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({ label, children }) {
  return (
    <>
      <div className="twk-sect">{label}</div>
      {children}
    </>
  );
}

function TweakRow({ label, value, children, inline = false }) {
  return (
    <div className={inline ? 'twk-row twk-row-h' : 'twk-row'}>
      <div className="twk-lbl">
        <span>{label}</span>
        {value != null && <span className="twk-val">{value}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({ label, value, min = 0, max = 100, step = 1, unit = '', onChange }) {
  return (
    <TweakRow label={label} value={`${value}${unit}`}>
      <input type="range" className="twk-slider" min={min} max={max} step={step}
             value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </TweakRow>
  );
}

function TweakToggle({ label, value, onChange }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button type="button" className="twk-toggle" data-on={value ? '1' : '0'}
              role="switch" aria-checked={!!value}
              onClick={() => onChange(!value)}><i /></button>
    </div>
  );
}

function TweakRadio({ label, value, options, onChange }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = (o) => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({ 2: 16, 3: 10 }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = (s) => {
      const m = options.find((o) => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return <TweakSelect label={label} value={value} options={options}
                        onChange={(s) => onChange(resolve(s))} />;
  }
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const n = opts.length;

  const segAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor(((clientX - r.left - 2) / inner) * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };

  const onPointerDown = (e) => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = (ev) => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <TweakRow label={label}>
      <div ref={trackRef} role="radiogroup" onPointerDown={onPointerDown}
           className={dragging ? 'twk-seg dragging' : 'twk-seg'}>
        <div className="twk-seg-thumb"
             style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
                      width: `calc((100% - 4px) / ${n})` }} />
        {opts.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value}>
            {o.label}
          </button>
        ))}
      </div>
    </TweakRow>
  );
}

function TweakSelect({ label, value, options, onChange }) {
  return (
    <TweakRow label={label}>
      <select className="twk-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </TweakRow>
  );
}

function TweakText({ label, value, placeholder, onChange }) {
  return (
    <TweakRow label={label}>
      <input className="twk-field" type="text" value={value} placeholder={placeholder}
             onChange={(e) => onChange(e.target.value)} />
    </TweakRow>
  );
}

function TweakNumber({ label, value, min, max, step = 1, unit = '', onChange }) {
  const clamp = (n) => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({ x: 0, val: 0 });
  const onScrubStart = (e) => {
    e.preventDefault();
    startRef.current = { x: e.clientX, val: value };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = (ev) => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div className="twk-num">
      <span className="twk-num-lbl" onPointerDown={onScrubStart}>{label}</span>
      <input type="number" value={value} min={min} max={max} step={step}
             onChange={(e) => onChange(clamp(Number(e.target.value)))} />
      {unit && <span className="twk-num-unit">{unit}</span>}
    </div>
  );
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}

const __TwkCheck = ({ light }) => (
  <svg viewBox="0 0 14 14" aria-hidden="true">
    <path d="M3 7.2 5.8 10 11 4.2" fill="none" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          stroke={light ? 'rgba(0,0,0,.78)' : '#fff'} />
  </svg>
);

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({ label, value, options, onChange }) {
  if (!options || !options.length) {
    return (
      <div className="twk-row twk-row-h">
        <div className="twk-lbl"><span>{label}</span></div>
        <input type="color" className="twk-swatch" value={value}
               onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = (o) => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return (
    <TweakRow label={label}>
      <div className="twk-chips" role="radiogroup">
        {options.map((o, i) => {
          const colors = Array.isArray(o) ? o : [o];
          const [hero, ...rest] = colors;
          const sup = rest.slice(0, 4);
          const on = key(o) === cur;
          return (
            <button key={i} type="button" className="twk-chip" role="radio"
                    aria-checked={on} data-on={on ? '1' : '0'}
                    aria-label={colors.join(', ')} title={colors.join(' · ')}
                    style={{ background: hero }}
                    onClick={() => onChange(o)}>
              {sup.length > 0 && (
                <span>
                  {sup.map((c, j) => <i key={j} style={{ background: c }} />)}
                </span>
              )}
              {on && <__TwkCheck light={__twkIsLight(hero)} />}
            </button>
          );
        })}
      </div>
    </TweakRow>
  );
}

function TweakButton({ label, onClick, secondary = false }) {
  return (
    <button type="button" className={secondary ? 'twk-btn secondary' : 'twk-btn'}
            onClick={onClick}>{label}</button>
  );
}




/* Seed data for ADGA Suite — mixed deal types, no real estate */
// Loaded as a Babel script, exposes everything on window.

const PIPELINE_STAGES = [
  { id: 'lead',     name: 'Lead',     dot: '#94a3b8', wip: 18 },
  { id: 'qualify',  name: 'Qualify',  dot: '#67e8f9', wip: 12 },
  { id: 'discover', name: 'Discover', dot: '#60a5fa', wip: 10 },
  { id: 'scope',    name: 'Scope',    dot: '#a78bfa', wip: 8  },
  { id: 'design',   name: 'Design',   dot: '#fbbf24', wip: 6  },
  { id: 'close',    name: 'Close',    dot: '#f59e0b', wip: 5  },
  { id: 'sign',     name: 'Sign',     dot: '#fb923c', wip: 4  },
  { id: 'deliver',  name: 'Deliver',  dot: '#4ade80', wip: null },
  { id: 'expand',   name: 'Expand',   dot: '#22c55e', wip: null },
];

const PEOPLE = [
  { id: 'p1', name: 'Maren Voss',     initials: 'MV', av: 0, role: 'Principal' },
  { id: 'p2', name: 'Dario Kett',     initials: 'DK', av: 1, role: 'Senior Associate' },
  { id: 'p3', name: 'Aisha Bremer',   initials: 'AB', av: 2, role: 'Director' },
  { id: 'p4', name: 'Theo Lange',     initials: 'TL', av: 3, role: 'Analyst' },
  { id: 'p5', name: 'Saoirse Quinn',  initials: 'SQ', av: 4, role: 'VP' },
  { id: 'p6', name: 'Jules Mendez',   initials: 'JM', av: 5, role: 'Associate' },
  { id: 'p7', name: 'Hana Okafor',    initials: 'HO', av: 6, role: 'Counsel' },
  { id: 'p8', name: 'Rune Sato',      initials: 'RS', av: 7, role: 'Operator' },
];

const DEAL_TYPES = [
  'Acquisition', 'Partnership', 'Licensing', 'Capital Raise',
  'Reseller', 'Procurement', 'JV', 'Buyout'
];

const SECTORS = [
  'Energy', 'Healthcare', 'Fintech', 'Industrial', 'Logistics',
  'Consumer', 'Media', 'SaaS', 'Biotech', 'Defense', 'AgTech'
];

const COMPANIES = [
  { id: 'c1',  name: 'Heliograph Industries',  sector: 'Industrial',  emp: '1,200',  hq: 'Rotterdam, NL',      logo: 'HI' },
  { id: 'c2',  name: 'Northbound Therapeutics',sector: 'Biotech',     emp: '85',     hq: 'Cambridge, MA',      logo: 'NT' },
  { id: 'c3',  name: 'Larkfield Capital',      sector: 'Fintech',     emp: '320',    hq: 'Singapore',          logo: 'LC' },
  { id: 'c4',  name: 'Meridian Cold Chain',    sector: 'Logistics',   emp: '2,400',  hq: 'Chicago, IL',        logo: 'MC' },
  { id: 'c5',  name: 'Vellum & Atlas',         sector: 'Media',       emp: '74',     hq: 'Brooklyn, NY',       logo: 'VA' },
  { id: 'c6',  name: 'Sondercast',             sector: 'SaaS',        emp: '210',    hq: 'Austin, TX',         logo: 'SC' },
  { id: 'c7',  name: 'Quorum Energy',          sector: 'Energy',      emp: '5,600',  hq: 'Calgary, AB',        logo: 'QE' },
  { id: 'c8',  name: 'Kestrel Defense Works',  sector: 'Defense',     emp: '1,800',  hq: 'Huntsville, AL',     logo: 'KD' },
  { id: 'c9',  name: 'Ostern Foods',           sector: 'Consumer',    emp: '4,300',  hq: 'Hamburg, DE',        logo: 'OF' },
  { id: 'c10', name: 'Albatross Bio',          sector: 'Healthcare',  emp: '160',    hq: 'San Diego, CA',      logo: 'AB' },
  { id: 'c11', name: 'Polaris Grain Co-op',    sector: 'AgTech',      emp: '880',    hq: 'Saskatoon, SK',      logo: 'PG' },
  { id: 'c12', name: 'Tessellate Robotics',    sector: 'Industrial',  emp: '410',    hq: 'Pittsburgh, PA',     logo: 'TR' },
  { id: 'c13', name: 'Halcyon Payments',       sector: 'Fintech',     emp: '95',     hq: 'London, UK',         logo: 'HP' },
  { id: 'c14', name: 'Driftless Studios',      sector: 'Media',       emp: '38',     hq: 'Madison, WI',        logo: 'DS' },
  { id: 'c15', name: 'Bramble & Co.',          sector: 'Consumer',    emp: '120',    hq: 'Portland, OR',       logo: 'BC' },
];

function dealId(n) { return 'DEAL-' + String(n).padStart(4, '0'); }

const DEALS = [
  { id: dealId(1207), name: 'Heliograph Industries — Series C extension', company: 'c1', type: 'Capital Raise', value: 42000000, currency: 'USD', stage: 'design', prob: 75, owner: 'p1', team: ['p1','p2','p4'], close: '2026-07-12', updated: '6h ago', tags: ['cross-border'], priority: 'high', source: 'Inbound — Referral' },
  { id: dealId(1208), name: 'Northbound Therapeutics — Licensing deal',   company: 'c2', type: 'Licensing',     value: 18500000, currency: 'USD', stage: 'discover',   prob: 45, owner: 'p3', team: ['p3','p7'],     close: '2026-09-01', updated: '2d ago', tags: ['IP'], priority: 'med', source: 'Outbound' },
  { id: dealId(1209), name: 'Larkfield Capital — Strategic partnership',  company: 'c3', type: 'Partnership',   value: 9750000,  currency: 'SGD', stage: 'scope',    prob: 60, owner: 'p5', team: ['p5','p6'],     close: '2026-06-30', updated: '1d ago', tags: ['APAC'], priority: 'high', source: 'Event' },
  { id: dealId(1210), name: 'Meridian Cold Chain — Acquisition',          company: 'c4', type: 'Acquisition',   value: 215000000,currency: 'USD', stage: 'close',     prob: 92, owner: 'p1', team: ['p1','p2','p4','p7'], close: '2026-06-04', updated: '3h ago', tags: ['carve-out'], priority: 'high', source: 'Banker' },
  { id: dealId(1211), name: 'Vellum & Atlas — Catalog licensing',         company: 'c5', type: 'Licensing',     value: 1200000,  currency: 'USD', stage: 'qualify',  prob: 30, owner: 'p6', team: ['p6'],          close: '2026-08-22', updated: '5d ago', tags: [], priority: 'low', source: 'Inbound' },
  { id: dealId(1212), name: 'Sondercast — Reseller agreement',            company: 'c6', type: 'Reseller',      value: 480000,   currency: 'USD', stage: 'discover',   prob: 55, owner: 'p2', team: ['p2','p6'],     close: '2026-07-01', updated: '11h ago', tags: ['MRR'], priority: 'med', source: 'Outbound' },
  { id: dealId(1213), name: 'Quorum Energy — Joint venture',              company: 'c7', type: 'JV',            value: 88000000, currency: 'USD', stage: 'scope',    prob: 50, owner: 'p3', team: ['p3','p1','p7'], close: '2026-10-15', updated: '4d ago', tags: ['regulated'], priority: 'high', source: 'Outbound' },
  { id: dealId(1214), name: 'Kestrel Defense — Procurement contract',     company: 'c8', type: 'Procurement',   value: 27500000, currency: 'USD', stage: 'design', prob: 70, owner: 'p5', team: ['p5','p4'],     close: '2026-06-20', updated: '20h ago', tags: ['ITAR'], priority: 'high', source: 'RFP' },
  { id: dealId(1215), name: 'Ostern Foods — Brand acquisition',           company: 'c9', type: 'Acquisition',   value: 64000000, currency: 'EUR', stage: 'discover',   prob: 40, owner: 'p1', team: ['p1','p3'],     close: '2026-09-18', updated: '1d ago', tags: ['EU'], priority: 'med', source: 'Banker' },
  { id: dealId(1216), name: 'Albatross Bio — Co-development',             company: 'c10',type: 'Partnership',   value: 15000000, currency: 'USD', stage: 'qualify',  prob: 25, owner: 'p7', team: ['p7','p3'],     close: '2026-11-05', updated: '3d ago', tags: ['R&D'], priority: 'low', source: 'Inbound' },
  { id: dealId(1217), name: 'Polaris Grain — Off-take agreement',         company: 'c11',type: 'Procurement',   value: 6300000,  currency: 'CAD', stage: 'lead',        prob: 15, owner: 'p4', team: ['p4'],          close: '2026-12-01', updated: '6d ago', tags: [], priority: 'low', source: 'Cold outreach' },
  { id: dealId(1218), name: 'Tessellate Robotics — Series B participation',company: 'c12',type: 'Capital Raise',value: 24000000, currency: 'USD', stage: 'design', prob: 80, owner: 'p1', team: ['p1','p4'],     close: '2026-06-28', updated: '9h ago', tags: ['follow-on'], priority: 'high', source: 'Existing portfolio' },
  { id: dealId(1219), name: 'Halcyon Payments — Buyout',                  company: 'c13',type: 'Buyout',        value: 110000000,currency: 'GBP', stage: 'scope',    prob: 65, owner: 'p3', team: ['p3','p5','p7'], close: '2026-08-09', updated: '2d ago', tags: ['LBO'], priority: 'high', source: 'Banker' },
  { id: dealId(1220), name: 'Driftless Studios — Catalog rights',         company: 'c14',type: 'Licensing',     value: 850000,   currency: 'USD', stage: 'deliver',         prob: 100,owner: 'p6', team: ['p6'],          close: '2026-05-12', updated: '8d ago', tags: ['closed'], priority: 'low', source: 'Inbound' },
  { id: dealId(1221), name: 'Bramble & Co. — Growth equity',              company: 'c15',type: 'Capital Raise', value: 12000000, currency: 'USD', stage: 'close',     prob: 88, owner: 'p2', team: ['p2','p1'],     close: '2026-06-11', updated: '4h ago', tags: ['minority'], priority: 'high', source: 'Inbound' },
  { id: dealId(1222), name: 'Heliograph Industries — Bolt-on Tessellate', company: 'c1', type: 'Acquisition',   value: 38000000, currency: 'USD', stage: 'discover',   prob: 38, owner: 'p2', team: ['p2','p4'],     close: '2026-10-30', updated: '7d ago', tags: ['add-on'], priority: 'med', source: 'Portfolio synergy' },
  { id: dealId(1223), name: 'Larkfield Capital — APAC fund LP',           company: 'c3', type: 'Capital Raise', value: 5000000,  currency: 'USD', stage: 'lead',        prob: 10, owner: 'p5', team: ['p5'],          close: '2026-12-15', updated: '2w ago', tags: [], priority: 'low', source: 'Network' },
  { id: dealId(1224), name: 'Quorum Energy — Carbon credits partnership', company: 'c7', type: 'Partnership',   value: 3400000,  currency: 'USD', stage: 'qualify',  prob: 35, owner: 'p4', team: ['p4','p3'],     close: '2026-09-09', updated: '3d ago', tags: ['ESG'], priority: 'med', source: 'Inbound' },
];

const LEADS = [
  { id: 'L-9881', name: 'Aurore Chastain',  title: 'Head of Corp Dev',         company: 'Sutter Maritime',         sector: 'Logistics',   score: 92, intent: 'high',   value: 22000000, channel: 'Webinar', last: '2h ago',  status: 'hot', urgency: 'Immediate', priority: 'high', receivedAt: '2026-05-20T13:42:00.000Z', followUpDueAt: '2026-05-20T13:47:00.000Z', followUpStatus: 'due_now', preferredContact: 'Phone', phone: '(646) 555-0198', email: 'aurore@sutter.co', city: 'New York', state: 'NY', social: { linkedin: 'linkedin.com/in/aurorechastain' } },
  { id: 'L-9882', name: 'Beni Okonkwo',     title: 'CFO',                       company: 'Foundry Helix',           sector: 'Industrial',  score: 78, intent: 'high',   value: 14500000, channel: 'Outbound', last: '5h ago',  status: 'hot', urgency: 'Same Day', priority: 'high', receivedAt: '2026-05-20T10:18:00.000Z', followUpDueAt: '2026-05-20T20:00:00.000Z', followUpStatus: 'scheduled', preferredContact: 'Email', email: 'beni@foundryhelix.com', city: 'Chicago', state: 'IL' },
  { id: 'L-9883', name: 'Yusra Damiani',    title: 'VP Strategy',               company: 'Crinkle & Cull',          sector: 'Consumer',    score: 64, intent: 'med',    value: 3200000,  channel: 'Referral', last: '1d ago',  status: 'warm', urgency: 'Scheduled', priority: 'medium', receivedAt: '2026-05-19T15:20:00.000Z', followUpDueAt: '2026-05-22T14:00:00.000Z', followUpStatus: 'scheduled', email: 'yusra@crinklecull.com' },
  { id: 'L-9884', name: 'Pieter Voorhees',  title: 'Director, Partnerships',    company: 'Calderwood Health',       sector: 'Healthcare',  score: 71, intent: 'med',    value: 9800000,  channel: 'Inbound', last: '1d ago',  status: 'warm', urgency: 'Normal', priority: 'medium', receivedAt: '2026-05-19T12:04:00.000Z', followUpDueAt: '2026-05-21T18:00:00.000Z', followUpStatus: 'upcoming' },
  { id: 'L-9885', name: 'Linnea Bjorne',    title: 'Founder & CEO',             company: 'Stellaris Compute',       sector: 'SaaS',        score: 88, intent: 'high',   value: 11000000, channel: 'Conference', last: '3h ago', status: 'hot', urgency: 'Immediate', priority: 'high', receivedAt: '2026-05-20T12:30:00.000Z', followUpDueAt: '2026-05-20T12:35:00.000Z', followUpStatus: 'overdue' },
  { id: 'L-9886', name: 'Marcos Quinteros', title: 'GM, Defense Programs',      company: 'Ironhold Systems',        sector: 'Defense',     score: 55, intent: 'low',    value: 41000000, channel: 'RFP',     last: '4d ago',  status: 'warm', urgency: 'Low', priority: 'medium', receivedAt: '2026-05-16T16:10:00.000Z', followUpStatus: 'not_started' },
  { id: 'L-9887', name: 'Saskia Krieg',     title: 'Managing Partner',          company: 'Brunswick Spectrum LP',   sector: 'Fintech',     score: 48, intent: 'low',    value: 6500000,  channel: 'Network', last: '6d ago',  status: 'cool', urgency: 'Low', priority: 'low', receivedAt: '2026-05-14T09:25:00.000Z', followUpStatus: 'stale' },
  { id: 'L-9888', name: 'Atsuko Voorman',   title: 'COO',                       company: 'Pelagic Labs',            sector: 'Biotech',     score: 81, intent: 'high',   value: 19000000, channel: 'Outbound', last: '8h ago',  status: 'hot', urgency: 'Same Day', priority: 'high', receivedAt: '2026-05-20T07:50:00.000Z', followUpDueAt: '2026-05-20T19:30:00.000Z', followUpStatus: 'scheduled' },
  { id: 'L-9889', name: 'Dimitrov Reyes',   title: 'Head of M&A',               company: 'Cantilever Group',        sector: 'Industrial',  score: 76, intent: 'med',    value: 28000000, channel: 'Banker',  last: '1d ago',  status: 'hot', urgency: 'Scheduled', priority: 'high', receivedAt: '2026-05-19T17:44:00.000Z', followUpDueAt: '2026-05-22T16:00:00.000Z', followUpStatus: 'scheduled' },
  { id: 'L-9890', name: 'Halle Brügger',    title: 'CRO',                       company: 'Northgate Botanicals',    sector: 'Consumer',    score: 36, intent: 'low',    value: 1800000,  channel: 'Inbound', last: '2w ago',  status: 'cool', urgency: 'Low', priority: 'low', receivedAt: '2026-05-06T11:10:00.000Z', followUpStatus: 'stale' },
  { id: 'L-9891', name: 'Roan Iwasaki',     title: 'VP Corporate Development', company: 'Telluride Aerospace',     sector: 'Defense',     score: 69, intent: 'med',    value: 33000000, channel: 'Referral', last: '2d ago', status: 'warm', urgency: 'Normal', priority: 'medium', receivedAt: '2026-05-18T14:05:00.000Z', followUpDueAt: '2026-05-21T15:00:00.000Z', followUpStatus: 'upcoming' },
  { id: 'L-9892', name: 'Esmé Petrov',      title: 'Investment Director',       company: 'Caraway Ventures',        sector: 'Fintech',     score: 84, intent: 'high',   value: 8500000,  channel: 'Network', last: '5h ago', status: 'hot', urgency: 'Same Day', priority: 'high', receivedAt: '2026-05-20T10:05:00.000Z', followUpDueAt: '2026-05-20T18:00:00.000Z', followUpStatus: 'scheduled' },
];

function formatDateTime(value) {
  if (!value) return 'Not set';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  } catch (e) {
    return value;
  }
}

function leadReceivedTime(lead) {
  return new Date(lead.receivedAt || lead.created_at || 0).getTime() || 0;
}

function normalizeCreatedLead(record) {
  const fullName = record.full_name || record.name || record.title || 'New lead';
  const value = Number(record.estimated_value_cents || 0) / 100;
  return {
    id: record.id,
    name: fullName,
    title: record.job_title || 'Contact',
    company: record.company || 'Unassigned',
    sector: record.industry || record.business_type || 'Unassigned',
    score: record.score || 55,
    intent: record.urgency === 'Immediate' || record.priority === 'high' ? 'high' : 'med',
    value,
    channel: record.qr_source ? 'QR' : record.source || 'Manual',
    last: 'Just now',
    status: String(record.status || 'warm').toLowerCase(),
    urgency: record.urgency || 'Normal',
    priority: record.priority || 'medium',
    receivedAt: record.received_at || record.created_at || new Date().toISOString(),
    followUpDueAt: record.follow_up_due_at || record.next_scheduled_follow_up_at || null,
    followUpStatus: record.follow_up_status || 'not_started',
    preferredContact: record.preferred_contact_method || '',
    phone: record.phone || '',
    email: record.email || '',
    city: record.city || '',
    state: record.state_region || '',
    social: (() => { try { return JSON.parse(record.social_profiles_json || '{}'); } catch (e) { return {}; } })(),
    notes: record.notes || '',
    needSummary: record.need_summary || '',
    nextAction: record.next_action || record.agent_next_move || 'Review lead and determine next action.',
  };
}

function normalizeStoredLead(record) {
  const social = (() => { try { return JSON.parse(record.social_profiles_json || '{}'); } catch (e) { return {}; } })();
  return normalizeCreatedLead({
    ...record,
    name: record.full_name,
    title: record.full_name,
    social_profiles_json: JSON.stringify(social),
  });
}

const DOCUMENTS = [
  { id: 'd1', name: 'CIM — Meridian Cold Chain.pdf',     ext: 'pdf',  size: '4.2 MB', updated: '2h ago',  deal: dealId(1210), owner: 'p1', signed: false },
  { id: 'd2', name: 'LOI — Bramble & Co.docx',           ext: 'docx', size: '124 KB', updated: '1d ago',  deal: dealId(1221), owner: 'p2', signed: true  },
  { id: 'd3', name: 'Definitive Agreement v3.docx',      ext: 'docx', size: '892 KB', updated: '4h ago',  deal: dealId(1210), owner: 'p7', signed: false },
  { id: 'd4', name: 'Financial Model — Heliograph.xlsx', ext: 'xlsx', size: '2.1 MB', updated: '3d ago',  deal: dealId(1207), owner: 'p4', signed: false },
  { id: 'd5', name: 'Term Sheet — Tessellate.pdf',       ext: 'pdf',  size: '380 KB', updated: '9h ago',  deal: dealId(1218), owner: 'p1', signed: true  },
  { id: 'd6', name: 'IP Schedule — Northbound.pdf',      ext: 'pdf',  size: '1.6 MB', updated: '5d ago',  deal: dealId(1208), owner: 'p7', signed: false },
  { id: 'd7', name: 'NDA — Quorum Energy.pdf',           ext: 'pdf',  size: '210 KB', updated: '2w ago',  deal: dealId(1213), owner: 'p3', signed: true  },
  { id: 'd8', name: 'Diligence Summary — Halcyon.pdf',   ext: 'pdf',  size: '5.4 MB', updated: '11h ago', deal: dealId(1219), owner: 'p5', signed: false },
  { id: 'd9', name: 'Cap Table — Tessellate.xlsx',       ext: 'xlsx', size: '92 KB',  updated: '2d ago',  deal: dealId(1218), owner: 'p4', signed: false },
  { id: 'd10',name: 'Investor Deck — Albatross.pdf',     ext: 'pdf',  size: '8.8 MB', updated: '6d ago',  deal: dealId(1216), owner: 'p3', signed: false },
];

const DD_CHECKLIST = [
  { section: 'Financial',
    items: [
      { id: 'F-01', title: 'Audited financials (last 3 years)',  owner: 'p4', status: 'approved',  due: 'May 22', from: 'Seller' },
      { id: 'F-02', title: 'Monthly P&L since last close',       owner: 'p4', status: 'in-review', due: 'May 24', from: 'Seller' },
      { id: 'F-03', title: 'Working capital adjustments',        owner: 'p1', status: 'requested', due: 'May 28', from: 'Seller' },
      { id: 'F-04', title: 'Customer concentration analysis',    owner: 'p2', status: 'in-review', due: 'May 25', from: 'Seller' },
    ]
  },
  { section: 'Legal',
    items: [
      { id: 'L-01', title: 'Corporate organization chart',       owner: 'p7', status: 'approved',  due: 'May 18', from: 'Seller' },
      { id: 'L-02', title: 'Material contracts schedule',        owner: 'p7', status: 'in-review', due: 'May 26', from: 'Seller' },
      { id: 'L-03', title: 'Pending litigation summary',         owner: 'p7', status: 'flagged',   due: 'May 24', from: 'Seller' },
      { id: 'L-04', title: 'IP assignment agreements',           owner: 'p7', status: 'requested', due: 'May 30', from: 'Seller' },
    ]
  },
  { section: 'Commercial',
    items: [
      { id: 'C-01', title: 'Top 20 customer interviews',         owner: 'p5', status: 'in-review', due: 'Jun 02', from: 'Seller' },
      { id: 'C-02', title: 'Channel partner agreements',         owner: 'p5', status: 'approved',  due: 'May 19', from: 'Seller' },
      { id: 'C-03', title: 'Pricing & discount policy',          owner: 'p2', status: 'requested', due: 'May 27', from: 'Seller' },
    ]
  },
  { section: 'Operational',
    items: [
      { id: 'O-01', title: 'Headcount by function',              owner: 'p3', status: 'approved',  due: 'May 20', from: 'Seller' },
      { id: 'O-02', title: 'Facility leases & subleases',        owner: 'p7', status: 'in-review', due: 'May 26', from: 'Seller' },
      { id: 'O-03', title: 'Vendor concentration',               owner: 'p3', status: 'requested', due: 'May 31', from: 'Seller' },
    ]
  },
  { section: 'Technology',
    items: [
      { id: 'T-01', title: 'Systems & architecture diagram',     owner: 'p8', status: 'in-review', due: 'May 24', from: 'Seller' },
      { id: 'T-02', title: 'Security posture & SOC2 report',     owner: 'p8', status: 'approved',  due: 'May 21', from: 'Seller' },
      { id: 'T-03', title: 'Tech debt & roadmap',                owner: 'p8', status: 'requested', due: 'Jun 04', from: 'Seller' },
    ]
  },
];

const TASKS = [
  { id: 'T-2201', title: 'Draft Q2 LOI revisions for Bramble', deal: dealId(1221), owner: 'p2', due: 'today',     status: 'doing',    priority: 'high' },
  { id: 'T-2202', title: 'Schedule mgmt presentation — Meridian', deal: dealId(1210), owner: 'p1', due: 'today',     status: 'todo',    priority: 'high' },
  { id: 'T-2203', title: 'Send NDA countersign — Polaris',     deal: dealId(1217), owner: 'p4', due: 'tomorrow',  status: 'todo',    priority: 'med' },
  { id: 'T-2204', title: 'Update cap table — Tessellate',     deal: dealId(1218), owner: 'p4', due: 'May 22',    status: 'doing',   priority: 'med' },
  { id: 'T-2205', title: 'Counsel review — IP schedule',      deal: dealId(1208), owner: 'p7', due: 'May 24',    status: 'todo',    priority: 'high' },
  { id: 'T-2206', title: 'Banker call — Halcyon',             deal: dealId(1219), owner: 'p3', due: 'May 23',    status: 'todo',    priority: 'high' },
  { id: 'T-2207', title: 'Finalize working capital memo',     deal: dealId(1210), owner: 'p1', due: 'May 28',    status: 'todo',    priority: 'high' },
  { id: 'T-2208', title: 'Customer reference calls (x5)',     deal: dealId(1219), owner: 'p5', due: 'May 30',    status: 'todo',    priority: 'med' },
];

const ACTIVITY = [
  { who: 'p2', what: 'moved', target: dealId(1221), to: 'Closing',    time: '12m ago', icon: '→' },
  { who: 'p7', what: 'commented on', target: dealId(1210), note: 'Counsel flagged Sec. 4.3 — see thread', time: '34m ago', icon: '💬' },
  { who: 'p1', what: 'uploaded', target: dealId(1210), file: 'Definitive Agreement v3.docx', time: '1h ago', icon: '↑' },
  { who: 'p4', what: 'completed task', target: dealId(1218), task: 'Update cap table', time: '2h ago', icon: '✓' },
  { who: 'p3', what: 'invited', target: dealId(1213), party: 'Quorum Energy counsel', time: '3h ago', icon: '+' },
  { who: 'p5', what: 'opened deal room', target: dealId(1219), time: '4h ago', icon: '◉' },
  { who: 'p6', what: 'closed (Won)', target: dealId(1220), time: '8h ago', icon: '★' },
  { who: 'p2', what: 'requested signature', target: dealId(1218), party: 'Tessellate CFO', time: '1d ago', icon: '✎' },
];

const COMMENTS = [
  { who: 'p7', initials: 'HO', av: 6, time: '2h ago',  text: 'Counsel review complete on the IP schedule. Flagged 2 items in §4.3 — both relate to the 2024 Tessellate assignment. Recommend conditional close.', mentions: [] },
  { who: 'p1', initials: 'MV', av: 0, time: '1h ago',  text: 'Thanks @Hana — looping in @Theo to pull the original assignment docs from the 2024 close. Let\'s settle this before Friday\'s SC.', mentions: ['Hana','Theo'] },
  { who: 'p4', initials: 'TL', av: 3, time: '34m ago', text: 'On it. Pulling from VDR-2024-Q3. Should have them in the room within the hour.', mentions: [] },
];

// KNOWLEDGE seed moved to lib/seed/knowledge.ts and imported at the top of this file. The
// constant remains in scope here for the legacy KnowledgePage fallback.

// Demo conversation shown to unauthenticated previews only. A real signed-in user gets a clean
// chat (see the real-user bootstrap effect in App). Keeping it specific but not making up exact
// company dollar figures — claims like "$284M weighted" presented in a real workspace look like
// the platform is lying.
const VOICE_TRANSCRIPT = [
  { who: 'agent', text: 'Morning. Three deals are advancing today — one entered Closing, one has a signature request open, and one needs sign-off on the working capital memo.' },
  { who: 'user',  text: 'What\'s the total weighted pipeline this quarter?' },
  { who: 'agent', text: 'Pulling it now from the live deals on your board — I\'ll show weighted by stage, what moved this week, and where the gap to plan is.', cite: 'forecast/this-quarter' },
  { who: 'user',  text: 'Flag anything that\'s slipping.' },
  { who: 'agent', text: 'Two deals haven\'t had activity in over a week. One\'s waiting on counsel; the other never got the term sheet follow-up. Want me to draft outreach for both?' },
];

Object.assign(window, {
  PIPELINE_STAGES, PEOPLE, DEAL_TYPES, SECTORS, COMPANIES,
  DEALS, LEADS, DOCUMENTS, DD_CHECKLIST, TASKS,
  ACTIVITY, COMMENTS, KNOWLEDGE, VOICE_TRANSCRIPT
});


/* Shared UI primitives + icons (Lucide-style hand-built minimal set) */

const Icon = ({ name, size = 16, stroke = 1.5, className = '' }) => {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    className: 'sb-icon ' + className
  };
  switch (name) {
    case 'home':       return <svg {...props}><path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/></svg>;
    case 'flame':      return <svg {...props}><path d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-1.5 1-2.5 1-2.5S8 11 12 3z"/><path d="M12 21a6 6 0 0 0 6-6c0-2-1-3.5-1-3.5S15 14 14 14a4 4 0 0 0-4 0c-1 0-2.5-2.5-2.5-2.5S6 13 6 15a6 6 0 0 0 6 6z"/></svg>;
    case 'pipeline':   return <svg {...props}><rect x="3" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/></svg>;
    case 'users':      return <svg {...props}><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15 20c0-2.4 2-4 4-4"/></svg>;
    case 'file':       return <svg {...props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>;
    case 'book':       return <svg {...props}><path d="M4 5a2 2 0 0 1 2-2h12v17H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 0 2 2h12"/></svg>;
    case 'spark':      return <svg {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>;
    case 'shield':     return <svg {...props}><path d="M12 3l8 3v6c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V6z"/></svg>;
    case 'card':       return <svg {...props}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>;
    case 'cog':        return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9A1.7 1.7 0 0 0 10 3.1V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case 'search':     return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'plus':       return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'filter':     return <svg {...props}><path d="M3 5h18l-7 9v5l-4 2v-7z"/></svg>;
    case 'sort':       return <svg {...props}><path d="M3 6h13M3 12h9M3 18h5"/><path d="M17 8l4-4 4 4" transform="translate(-4,8)"/></svg>;
    case 'more':       return <svg {...props}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>;
    case 'chevR':      return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case 'chevD':      return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case 'chevUD':     return <svg {...props}><path d="m7 9 5-5 5 5M7 15l5 5 5-5"/></svg>;
    case 'x':          return <svg {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case 'check':      return <svg {...props}><path d="m20 6-11 11-5-5"/></svg>;
    case 'bell':       return <svg {...props}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'mic':        return <svg {...props}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    case 'phone':      return <svg {...props}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z"/></svg>;
    case 'mute':       return <svg {...props}><path d="m1 1 22 22"/><path d="M9 9v6a3 3 0 0 0 5.1 2.1"/><path d="M12 1a3 3 0 0 1 3 3v6"/><path d="M19 10v1a7 7 0 0 1-.7 3"/><path d="M5 10v1a7 7 0 0 0 12 5"/><path d="M12 18v3"/></svg>;
    case 'cal':        return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case 'panel':      return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>;
    case 'panelR':     return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg>;
    case 'dollar':     return <svg {...props}><path d="M12 2v20M16 6h-5a3 3 0 0 0 0 6h2a3 3 0 0 1 0 6H7"/></svg>;
    case 'building':   return <svg {...props}><rect x="3" y="3" width="14" height="18" rx="1"/><path d="M17 8h4v13h-4M7 7h2M7 11h2M7 15h2M13 7h2M13 11h2M13 15h2"/></svg>;
    case 'arrow-up':   return <svg {...props}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case 'arrow-dn':   return <svg {...props}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>;
    case 'lock':       return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case 'kanban':     return <svg {...props}><rect x="3" y="3" width="6" height="14" rx="1"/><rect x="11" y="3" width="6" height="9" rx="1"/><rect x="19" y="3" width="2" height="6" rx="1" transform="translate(-2 0)"/></svg>;
    case 'table':      return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 16h18M9 4v16M15 4v16"/></svg>;
    case 'timeline':   return <svg {...props}><path d="M3 7h7M14 7h7M3 12h11M18 12h3M3 17h5M12 17h9"/></svg>;
    case 'docs':       return <svg {...props}><path d="M9 3h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9"/><path d="M5 7h8a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2z"/></svg>;
    case 'inbox':      return <svg {...props}><path d="M3 14h4l2 3h6l2-3h4"/><path d="m3 14 3-9h12l3 9v6H3z"/></svg>;
    case 'send':       return <svg {...props}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>;
    case 'paperclip':  return <svg {...props}><path d="M21 12 12 21a6 6 0 1 1-8.5-8.5L13 3a4 4 0 0 1 5.7 5.7L9.4 18a2 2 0 1 1-2.8-2.8L15 7"/></svg>;
    case 'sun':        return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case 'moon':       return <svg {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>;
    case 'eye':        return <svg {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'upload':     return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v13"/></svg>;
    case 'download':   return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V2"/></svg>;
    case 'flag':       return <svg {...props}><path d="M4 22V4M4 4h12l-2 4 2 4H4"/></svg>;
    case 'sliders':    return <svg {...props}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/></svg>;
    case 'sparkles':   return <svg {...props}><path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 14l1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1zM5 14l.7 1.7L7.4 16l-1.7.7L5 18l-.7-1.7L2.6 16l1.7-.7z"/></svg>;
    default: return <span/>;
  }
};

const Avatar = ({ person, size = 'sm' }) => {
  const cls = size === 'lg' ? 'avatar lg' : size === 'xl' ? 'avatar xl' : 'avatar';
  return <span className={cls + ' av-' + person.av}>{person.initials}</span>;
};

const AvatarStack = ({ ids, max = 3 }) => {
  const people = ids.map(id => PEOPLE.find(p => p.id === id)).filter(Boolean);
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="avatar-stack">
      {shown.map(p => <Avatar key={p.id} person={p} />)}
      {rest > 0 && <span className="avatar av-7">+{rest}</span>}
    </span>
  );
};

const Pill = ({ tone = 'gray', children, noDot, className = '' }) => (
  <span className={'pill ' + tone + ' ' + (noDot ? 'no-dot ' : '') + className}>{children}</span>
);

const KPI = ({ label, value, delta, deltaTone }) => (
  <div className="kpi">
    <div className="lbl">{label}</div>
    <div className="val">{value}</div>
    {delta && <div className={'delta ' + (deltaTone || '')}>{delta}</div>}
  </div>
);

const fmtCurrency = (n, cur = 'USD') => {
  const sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', SGD: 'S$' }[cur] || '';
  if (n >= 1_000_000) return sym + (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M';
  if (n >= 1_000) return sym + Math.round(n / 1_000) + 'K';
  return sym + n;
};

const compactNum = (n) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
};

const stageOf = id => PIPELINE_STAGES.find(s => s.id === id);
const personOf = id => PEOPLE.find(p => p.id === id);
const companyOf = id => COMPANIES.find(c => c.id === id);

Object.assign(window, {
  Icon, Avatar, AvatarStack, Pill, KPI,
  fmtCurrency, compactNum, stageOf, personOf, companyOf
});


/* Sidebar — text-only, left-aligned, no icons */

const CURRENT_USER = { id: 'p1', name: 'Maren Voss', role: 'owner' };

// Sidebar groups are generated from the route contract — never hand-maintained here.
// `getSidebarGroups({ ownerView })` reads app/suite/routes.ts and returns ordered groups.
// To add a sidebar entry, declare it in routes.ts (section: "" | "LIBRARY" | "PERSONAL" | "OWNER").
function getNav(ownerView) {
  return registryGetSidebarGroups({ ownerView }).map((group) => ({
    section: group.section,
    ownerOnly: group.section === 'OWNER',
    items: group.items,
  }));
}

function Sidebar({ route, setRoute, collapsed, setCollapsed }) {
  const router = useRouter();
  const [wsOpen, setWsOpen] = React.useState(false);
  const teams = TEAMS || [];
  const [activeTeamId, setActiveTeamId] = React.useState('all');
  const activeTeam = teams.find(t => t.id === activeTeamId);

  React.useEffect(() => {
    window.activeTeamId = activeTeamId;
    window.dispatchEvent(new CustomEvent('adga-team-changed', { detail: { teamId: activeTeamId } }));
  }, [activeTeamId]);

  return (
    <aside className={'sidebar ' + (collapsed ? 'collapsed' : 'open')}>
      <div className="sb-brand">
        <Link
          href="/suite"
          className="sb-brand-link"
          onClick={() => { if (window.matchMedia('(max-width: 820px)').matches) setCollapsed(true); }}
          aria-label="Go to suite home"
        >
          <span className="sb-wordmark sb-wordmark-logo">ADGA</span>
        </Link>
      </div>

      <div className="sb-workspace" style={{position:'relative'}}>
        <button className="sb-ws-btn" type="button" onClick={() => setWsOpen(o => !o)}>
          <span className="sb-ws-avatar" style={activeTeam ? {background: activeTeam.color, color: 'var(--accent-fg)'} : null}>CG</span>
          <span className="sb-ws-name">
            <span style={{display:'block',fontSize:13,color:'var(--text)'}}>Concorde Group</span>
            <span style={{display:'block',fontSize:11,color:'var(--text-3)',marginTop:1}}>
              {activeTeam ? activeTeam.name : 'All teams'}
            </span>
          </span>
          <svg className="sb-ws-chev" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 9 5-5 5 5M7 15l5 5 5-5"/></svg>
        </button>

        {wsOpen && (
          <>
            <div onClick={() => setWsOpen(false)} style={{position:'fixed',inset:0,zIndex:65}} aria-hidden="true"/>
            <div className="ws-menu">
              <div className="ws-menu-label">Workspace</div>
              <div className="ws-menu-item active">
                <span className="sb-ws-avatar" style={{background:'var(--accent)',color:'var(--accent-fg)'}}>CG</span>
                <span style={{flex:1}}>Concorde Group</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--accent)'}}><path d="m20 6-11 11-5-5"/></svg>
              </div>

              <div className="ws-menu-label" style={{marginTop:14}}>Focus on team</div>
              <button
                type="button"
                className={'ws-menu-item ' + (activeTeamId === 'all' ? 'sel' : '')}
                onClick={() => { setActiveTeamId('all'); setWsOpen(false); }}
              >
                <span className="ws-dot" style={{background:'var(--text-3)'}}/>
                <span style={{flex:1}}>All teams</span>
                <span className="text-xs muted mono">{teams.length}</span>
              </button>
              {teams.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={'ws-menu-item ' + (activeTeamId === t.id ? 'sel' : '')}
                onClick={() => { setActiveTeamId(t.id); setWsOpen(false); setRoute('teams'); if (window.matchMedia('(max-width: 820px)').matches) setCollapsed(true); }}
                >
                  <span className="ws-dot" style={{background: t.color}}/>
                  <span style={{flex:1,textAlign:'left'}}>{t.name}</span>
                  <span className="text-xs muted mono">{t.members.length}</span>
                </button>
              ))}

              <div className="ws-menu-foot">
                <button type="button" className="btn ghost sm" onClick={() => { setRoute('teams'); setWsOpen(false); }}>Manage teams →</button>
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="sb-nav">
        {getNav(CURRENT_USER.role === 'owner').map((sec, secIdx) => (
          <React.Fragment key={sec.section || ('group-' + secIdx)}>
            {sec.section && <div className="sb-section">{sec.section}</div>}
            {sec.items.map(it => (
              <Link
                key={it.id}
                href={it.path || ROUTE_PATHS[it.id] || ('/suite/' + it.id)}
                className={'sb-item ' + (route === it.id || route === (SUITE_ROUTE_ALIASES && SUITE_ROUTE_ALIASES[it.id]) ? 'active' : '')}
                onClick={() => {
                  // Next.js Link drives the URL change. Persist the last route so reloads land here.
                  try { window.localStorage.setItem('adga-suite-route', it.id); } catch (e) {}
                  if (window.matchMedia('(max-width: 820px)').matches) setCollapsed(true);
                }}
              >
                <span className="sb-label">{it.label}</span>
                {it.indicator && <span style={{width:6,height:6,borderRadius:'50%',background:'var(--accent)',marginRight:6}}/>}
                {it.badge != null && <span className="sb-badge">{it.badge}</span>}
              </Link>
            ))}
          </React.Fragment>
        ))}
      </nav>

      <div className="sb-bottom">
        <span className="avatar av-0">MV</span>
        <div style={{flex:1,minWidth:0}}>
          <div className="user-name">Maren Voss</div>
          <div className="user-sub">Principal</div>
        </div>
      </div>
    </aside>
  );
}


/* Agentic data — multiple named agents, their live activity, pending approvals */

const AGENTS = [
  {
    id: 'margaret',
    name: 'Margaret',
    role: 'Pipeline',
    scope: 'Advances stages, watches SLAs, flags slippage',
    color: '#202124',
    initials: 'M',
    status: 'working',
    statusText: 'Watching 17 active deals · 3 advances pending your review',
  },
  {
    id: 'theo',
    name: 'Theo',
    role: 'Due Diligence',
    scope: 'Reviews DD items, flags legal & financial risks',
    color: '#c47214',
    initials: 'T',
    status: 'working',
    statusText: 'Reviewing §4.3 of Heliograph DA · ETA 8 minutes',
  },
  {
    id: 'liam',
    name: 'Liam',
    role: 'Drafting',
    scope: 'Drafts emails, memos, briefs in your voice',
    color: '#2d4a32',
    initials: 'L',
    status: 'idle',
    statusText: 'Idle · 2 drafts queued for your review',
  },
  {
    id: 'iris',
    name: 'Iris',
    role: 'Call intelligence',
    scope: 'Listens, transcribes, extracts decisions',
    color: '#7a1f1a',
    initials: 'I',
    status: 'listening',
    statusText: 'Live · transcribing your Quorum call',
  },
  {
    id: 'owen',
    name: 'Owen',
    role: 'Operations',
    scope: 'Handoffs, scheduling, admin chores',
    color: '#0e7490',
    initials: 'O',
    status: 'idle',
    statusText: 'Idle · 1 handoff queued',
  },
];

const PENDING_ACTIONS = [
  {
    id: 'pa-001',
    agent: 'liam',
    type: 'email_draft',
    urgency: 'high',
    target: { type: 'deal', id: 'DEAL-1210', label: 'Meridian Cold Chain — Acquisition' },
    title: 'Reply to Aurore Chastain · §4 working capital',
    proposed: `Hi Aurore,

Thanks for the careful read. Three quick responses, in order:

(1) Working-capital peg — we agree. We'll move from the rolling-average mechanism to a fixed peg at the September close. Maren has signed off.

(2) Earnout EBITDA definition — happy to sharpen. Proposing we use the same definition as §3.2 of the management presentation, which is GAAP-EBITDA less stock-comp and capex. If that works for your team I'll have counsel mark it up by Wednesday.

(3) R&W cap — 13.5% is our floor with insurance backstop. We can walk you through the math on the call.

Wednesday afternoon at 3pm EST works on our end. I'll send the invite.

Best,
Maren`,
    reasoning: 'Aurore raised three §4 items in her email yesterday. Maren signed off on items 1 and 3 in your morning brief; item 2 is consistent with the management deck. Tone matches Maren\'s last 12 replies to Aurore.',
    timeline: 'Send by 11:00 EST · maintains 24h reply SLA',
    created: '4m ago',
  },
  {
    id: 'pa-002',
    agent: 'margaret',
    type: 'stage_advance',
    urgency: 'high',
    target: { type: 'deal', id: 'DEAL-1221', label: 'Bramble & Co — Growth equity' },
    title: 'Advance Bramble to Closing',
    proposed: 'Stage: Negotiation → Closing · Probability: 88% → 92%',
    reasoning: 'Term sheet executed May 2nd. All DD items cleared. Signing scheduled Friday May 23rd. The deal has been sitting in Negotiation past its 14-day SLA. Recommended move.',
    timeline: 'Apply immediately',
    created: '12m ago',
  },
  {
    id: 'pa-003',
    agent: 'theo',
    type: 'risk_flag',
    urgency: 'high',
    target: { type: 'deal', id: 'DEAL-1219', label: 'Halcyon Payments — Buyout' },
    title: 'Flag: customer concentration risk (top 3 = 47%)',
    proposed: 'Add to deal risks · notify Maren and Hana · request seller breakdown by tier',
    reasoning: 'Just finished reviewing the audited financials. Top 3 merchants = 47% of GMV. Above your 35% threshold. Pricing implication estimated at $4-7M reduction. Recommend flagging before Friday\'s SC.',
    timeline: 'Flag now · request breakdown by EOD',
    created: '34m ago',
  },
  {
    id: 'pa-004',
    agent: 'owen',
    type: 'meeting_schedule',
    urgency: 'med',
    target: { type: 'deal', id: 'DEAL-1213', label: 'Quorum Energy — JV' },
    title: 'Schedule JV term sheet review with Magnus Bell',
    proposed: 'Thursday May 22 · 14:00 EST · 60min · Zoom · attendees: Maren, Aisha, Magnus Bell, Quorum counsel',
    reasoning: 'Magnus replied to our outreach yesterday — proposed "next week." This slot works for all parties based on calendar availability. Quorum has not responded to the term sheet sent April 28th; this re-opens the dialogue.',
    timeline: 'Send invite if approved',
    created: '52m ago',
  },
  {
    id: 'pa-005',
    agent: 'liam',
    type: 'memo_draft',
    urgency: 'med',
    target: { type: 'deal', id: 'DEAL-1210', label: 'Meridian Cold Chain' },
    title: 'Working capital memo · v2 for SC review',
    proposed: '12-page memo covering: peg mechanism, $14M adjustment in our favor, sensitivity table, recommended floor & ceiling. Draft attached for review.',
    reasoning: 'You asked for a SC-ready memo by Friday. Pulled the numbers from Theo\'s DD output and the working model. Format matches your last memo to the SC (Tessellate, April).',
    timeline: 'Memo ready for review · 8 minutes to read',
    created: '1h ago',
  },
  {
    id: 'pa-006',
    agent: 'margaret',
    type: 'idle_nudge',
    urgency: 'med',
    target: { type: 'deal', id: 'DEAL-1208', label: 'Northbound Therapeutics' },
    title: 'Idle 9 days · suggest disposition decision',
    proposed: 'Propose: (a) reach out to Dr. Reyes, (b) downgrade probability to 25%, or (c) park deal in cold pipeline',
    reasoning: 'No activity for 9 days. Probability still at 45% but trending stale. Northbound\'s competing process likely advancing. Either we engage this week or we should park it.',
    timeline: 'Decision needed today',
    created: '2h ago',
  },
  {
    id: 'pa-007',
    agent: 'iris',
    type: 'call_summary',
    urgency: 'low',
    target: { type: 'deal', id: 'DEAL-1218', label: 'Tessellate Robotics' },
    title: 'Call summary · CFO sync · 22 min',
    proposed: 'Decisions: (1) cap table reflects new SAFE conversions, (2) Series B closes June 28, (3) board observer seat goes to Maren. Three action items extracted.',
    reasoning: 'Listened on the call this morning. Extracted decisions and assigned action items based on speakers. Confidence: high. Ready to file under the deal Story.',
    timeline: 'File when approved',
    created: '3h ago',
  },
  {
    id: 'pa-008',
    agent: 'owen',
    type: 'handoff',
    urgency: 'low',
    target: { type: 'deal', id: 'DEAL-1220', label: 'Driftless Studios — Won' },
    title: 'Hand off to Operations team for post-close',
    proposed: 'Pass DEAL-1220 to Operations · transfer ownership · create 30/60/90 onboarding tasks',
    reasoning: 'Deal moved to Won 8 hours ago. Standard playbook: hand off to Ops for post-close onboarding. Saves you the manual step.',
    timeline: 'Apply when approved',
    created: '8h ago',
  },
];

const AGENT_HISTORY = [
  { agent: 'margaret', action: 'Advanced',  target: 'DEAL-1221', detail: 'Negotiation → Closing',           when: '12m ago', approver: 'Maren', icon: '✓' },
  { agent: 'liam',     action: 'Sent',       target: 'DEAL-1218', detail: 'Cap table follow-up to CFO',       when: '34m ago', approver: 'Maren', icon: '✓' },
  { agent: 'theo',     action: 'Filed',      target: 'DEAL-1207', detail: '§4.3 clearance memo · 2 pages',    when: '1h ago',  approver: 'Maren', icon: '✓' },
  { agent: 'iris',     action: 'Transcribed',target: 'DEAL-1213', detail: 'Quorum call · 47 min',             when: '2h ago',  approver: 'Auto',  icon: '◉' },
  { agent: 'owen',     action: 'Scheduled',  target: 'DEAL-1210', detail: 'Mgmt presentation · Wed 3pm',      when: '3h ago',  approver: 'Maren', icon: '✓' },
  { agent: 'liam',     action: 'Drafted',    target: 'DEAL-1219', detail: 'Customer-ref talking points · v2', when: '5h ago',  approver: 'Edited', icon: '✎' },
  { agent: 'margaret', action: 'Flagged',    target: 'DEAL-1217', detail: 'Stage SLA exceeded · 14d',         when: '8h ago',  approver: 'Maren', icon: '⚑' },
  { agent: 'theo',     action: 'Approved',   target: 'DEAL-1218', detail: 'DD F-01 audited financials · clear',when: '1d ago', approver: 'Maren', icon: '✓' },
];

const AGENT_FEED = [
  { agent: 'theo',     verb: 'Reviewing',    target: 'Heliograph §4.3',      tag: 'live', eta: '8 min remaining' },
  { agent: 'iris',     verb: 'Transcribing', target: 'Quorum call',          tag: 'live', eta: 'Now · 23 min in' },
  { agent: 'margaret', verb: 'Watching',     target: '17 active deals',      tag: 'live', eta: 'Continuous' },
  { agent: 'liam',     verb: 'Drafted',      target: 'Reply to Aurore',      tag: 'pending', eta: '4 min ago' },
  { agent: 'theo',     verb: 'Flagged',      target: 'Halcyon concentration',tag: 'pending', eta: '34 min ago' },
  { agent: 'owen',     verb: 'Proposed',     target: 'Schedule Magnus',      tag: 'pending', eta: '52 min ago' },
];

const agentOf = id => AGENTS.find(a => a.id === id) || AGENTS[0];

Object.assign(window, { AGENTS, PENDING_ACTIONS, AGENT_HISTORY, AGENT_FEED, agentOf });


/* Agent Console — replaces the chat right-rail with a live AI-workforce view */

function AgentConsole({ state, setState, collapsed, setCollapsed, onWorkflow, deals }) {
  const [tab, setTab] = React.useState('live');
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const taRef = React.useRef(null);

  if (collapsed) {
    return <aside className="voice collapsed" data-state={state} aria-hidden="true"/>;
  }

  const pending = PENDING_ACTIONS;
  const pendingByAgent = AGENTS.map(a => ({
    agent: a,
    count: pending.filter(p => p.agent === a.id).length,
  }));

  return (
    <aside className="voice agent-console" data-state={state}>
      {/* Header */}
      <div className="ac-h">
        <div className="ac-h-title">
          <span className="ac-pulse"/>
          <span>The Room</span>
          <span className="ac-h-state">{AGENTS.filter(a => a.status === 'working' || a.status === 'listening').length} working</span>
        </div>
        <div className="voice-tools">
          <button
            className="composer-tool"
            type="button"
            onClick={() => setComposeOpen(o => !o)}
            title="Speak to the room"
            aria-label="Speak"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
            </svg>
          </button>
          <button
            className="composer-tool"
            type="button"
            onClick={() => setCollapsed(true)}
            title="Hide"
            aria-label="Hide"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Agent roster strip */}
      <div className="ac-roster">
        {AGENTS.map(a => {
          const pendingCount = pending.filter(p => p.agent === a.id).length;
          return (
            <div key={a.id} className="ac-agent" title={`${a.name} · ${a.role}`}>
              <div className="ac-agent-av" style={{background: a.color}}>{a.initials}</div>
              <div className="ac-agent-meta">
                <div className="ac-agent-name">{a.name}</div>
                <div className="ac-agent-role">{a.role}</div>
              </div>
              <div className={'ac-agent-st st-' + a.status}>
                {a.status === 'listening' ? '● Live' : a.status === 'working' ? '● Working' : '○ Idle'}
              </div>
              {pendingCount > 0 && <span className="ac-agent-badge">{pendingCount}</span>}
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="ac-tabs">
        <button className={'ac-tab ' + (tab === 'live' ? 'active' : '')} type="button" onClick={() => setTab('live')}>
          Live
        </button>
        <button className={'ac-tab ' + (tab === 'pending' ? 'active' : '')} type="button" onClick={() => setTab('pending')}>
          Pending <span className="ac-tab-count">{pending.length}</span>
        </button>
        <button className={'ac-tab ' + (tab === 'history' ? 'active' : '')} type="button" onClick={() => setTab('history')}>
          History
        </button>
      </div>

      {/* Body */}
      <div className="ac-body">
        {tab === 'live'    && <AgentLive/>}
        {tab === 'pending' && <AgentPending compact onWorkflow={onWorkflow} deals={deals}/>}
        {tab === 'history' && <AgentHistory/>}
      </div>

      {/* Speak panel */}
      {composeOpen && (
        <div className="ac-speak">
          <div className="ac-speak-h">
            <span className="ed-tag">Speak to the room</span>
            <button className="btn ghost sm" type="button" onClick={() => setComposeOpen(false)}>Close</button>
          </div>
          <textarea
            ref={taRef}
            placeholder="Tell the room what to do. They'll draft an action you can review."
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
          />
          <div className="ac-speak-foot">
            <span className="ed-tag">Routes to · <b style={{color:'var(--text)'}}>{routeAgent(draft)}</b></span>
            <button
              className="btn primary sm"
              type="button"
              onClick={() => { setDraft(''); setComposeOpen(false); setTab('pending'); }}
            >
              <Icon name="send" size={12}/> Queue
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function routeAgent(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('draft') || t.includes('email') || t.includes('reply') || t.includes('memo')) return 'Liam · drafting';
  if (t.includes('schedule') || t.includes('meeting') || t.includes('handoff')) return 'Owen · operations';
  if (t.includes('flag') || t.includes('risk') || t.includes('dd') || t.includes('diligence')) return 'Theo · DD';
  if (t.includes('listen') || t.includes('call') || t.includes('record')) return 'Iris · call intelligence';
  return 'Margaret · pipeline';
}

function AgentLive() {
  return (
    <div className="ac-live">
      <div className="ac-section-h">
        <span className="ed-tag">Live activity</span>
        <span className="ed-tag" style={{color:'var(--text-3)'}}>Real-time</span>
      </div>
      {AGENT_FEED.map((f, i) => {
        const a = agentOf(f.agent);
        return (
          <div key={i} className={'ac-feed-card ' + f.tag}>
            <div className="ac-feed-avatar" style={{background: a.color}}>{a.initials}</div>
            <div className="ac-feed-body">
              <div className="ac-feed-line">
                <b>{a.name}</b>
                <span style={{color:'var(--text-3)'}}> · {a.role.toLowerCase()}</span>
              </div>
              <div className="ac-feed-verb">{f.verb} <b>{f.target}</b></div>
              <div className="ac-feed-eta">{f.eta}</div>
            </div>
            {f.tag === 'live' && <span className="ac-live-dot"/>}
          </div>
        );
      })}

      <div className="ac-promote">
        <div className="ed-tag" style={{marginBottom:8}}>Waiting on you</div>
        <div className="ac-promote-list">
          {PENDING_ACTIONS.filter(p => p.urgency === 'high').slice(0, 2).map(p => {
            const a = agentOf(p.agent);
            return (
              <div key={p.id} className="ac-promote-card">
                <div className="ac-promote-h">
                  <div className="ac-feed-avatar" style={{background: a.color}}>{a.initials}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:500}}>{p.title}</div>
                    <div style={{fontSize:11.5,color:'var(--text-3)'}}>{a.name} · {p.target.id}</div>
                  </div>
                  <span className="ac-urg-dot" data-urgency={p.urgency}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgentPending({ compact, onWorkflow, deals }) {
  const [editing, setEditing] = React.useState({});
  const [drafts, setDrafts] = React.useState({});
  const [decided, setDecided] = React.useState({});

  const decide = (item, verdict) => {
    setDecided(d => ({ ...d, [item.id]: verdict }));
    recordApprovalDecision(item, verdict === 'approved' ? 'approved' : 'rejected', drafts[item.id] || item.proposed).catch(() => {});
  };
  const startEdit = (id, current) => {
    setEditing(e => ({ ...e, [id]: true }));
    setDrafts(d => ({ ...d, [id]: current }));
  };

  const visible = PENDING_ACTIONS.filter(p => !decided[p.id]);

  return (
    <div className="ac-pending">
      <div className="ac-section-h">
        <span className="ed-tag">{visible.length} waiting · sorted by urgency</span>
        <button className="btn ghost sm" type="button">Bulk approve safe</button>
      </div>

      {visible.map(p => {
        const a = agentOf(p.agent);
        const isEditing = editing[p.id];
        const draft = drafts[p.id] !== undefined ? drafts[p.id] : p.proposed;
        return (
          <div key={p.id} className="ac-card" data-urgency={p.urgency}>
            <div className="ac-card-h">
              <div className="ac-feed-avatar" style={{background: a.color}}>{a.initials}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="ac-card-author">
                  <b>{a.name}</b>
                  <span style={{color:'var(--text-3)'}}> · {a.role.toLowerCase()}</span>
                  <span className="ac-urg-dot" data-urgency={p.urgency}/>
                  <span className="ed-tag" style={{marginLeft:'auto',color:'var(--text-3)'}}>{p.created}</span>
                </div>
                <div className="ac-card-title">{p.title}</div>
                <div className="ac-card-target mono">{p.target.id} · {p.target.label}</div>
              </div>
            </div>

            <div className="ac-card-section">
              <div className="ed-tag">Proposed</div>
              {isEditing ? (
                <textarea
                  className="ac-card-edit"
                  value={draft}
                  onChange={e => setDrafts(d => ({ ...d, [p.id]: e.target.value }))}
                  rows={Math.min(14, draft.split('\n').length + 1)}
                />
              ) : (
                <div className="ac-card-proposed">{draft}</div>
              )}
            </div>

            <div className="ac-card-section">
              <div className="ed-tag">Why · {a.name}'s reasoning</div>
              <div className="ac-card-reasoning">{p.reasoning}</div>
            </div>

            <div className="ac-card-meta">
              <span className="ed-tag">Timing</span>
              <span>{p.timeline}</span>
            </div>

            <div className="ac-card-actions">
              {isEditing ? (
                <>
                  <button className="btn" type="button" onClick={() => setEditing(e => ({ ...e, [p.id]: false }))}>Cancel</button>
                  <button className="btn primary" type="button" onClick={() => { setEditing(e => ({ ...e, [p.id]: false })); decide(p, 'approved'); }}>
                    <Icon name="check" size={13}/> Save &amp; approve
                  </button>
                </>
              ) : (
                <>
                  <button className="btn ghost" type="button" onClick={() => decide(p, 'rejected')}>Reject</button>
                  <button className="btn" type="button" onClick={() => startEdit(p.id, p.proposed)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                    Edit
                  </button>
                  <button className="btn primary" type="button" onClick={() => decide(p, 'approved')}>
                    <Icon name="check" size={13}/> Approve
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {visible.length === 0 && (
        <div className="ac-empty">
          <div style={{fontFamily:'var(--font-serif)',fontSize:22,fontStyle:'italic',color:'var(--text-2)',marginBottom:6}}>The room is settled.</div>
          <div className="text-sm muted">No actions are waiting on you right now.</div>
        </div>
      )}
    </div>
  );
}

function AgentHistory() {
  return (
    <div className="ac-history">
      <div className="ac-section-h">
        <span className="ed-tag">Today · {AGENT_HISTORY.length} actions taken</span>
      </div>
      {AGENT_HISTORY.map((h, i) => {
        const a = agentOf(h.agent);
        return (
          <div key={i} className="ac-h-row">
            <div className="ac-feed-avatar sm" style={{background: a.color}}>{a.initials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13}}><b>{a.name}</b> {h.action.toLowerCase()} <span className="mono muted">{h.target}</span></div>
              <div style={{fontSize:11.5,color:'var(--text-3)'}}>{h.detail}</div>
            </div>
            <div style={{textAlign:'right',fontSize:11,color:'var(--text-3)'}}>
              <div>{h.when}</div>
              <div style={{fontFamily:'var(--font-mono)',letterSpacing:'.1em'}}>{h.icon} {h.approver}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}




/* ADGA — conversational AI panel (right rail) */

const SAMPLE_HISTORY = [
  { id: 'c-201', title: 'Meridian Cold Chain — closing memo',  date: 'May 21, 2026', time: '09:14 AM', scope: 'Closing', active: true },
  { id: 'c-200', title: 'Forecast slipping risks',             date: 'May 20, 2026', time: '04:42 PM', scope: 'Risk' },
  { id: 'c-199', title: 'Quorum JV term sheet review',         date: 'May 20, 2026', time: '11:18 AM', scope: 'Legal' },
  { id: 'c-198', title: 'Q2 weighted pipeline breakdown',      date: 'May 18, 2026', time: '02:05 PM', scope: 'Forecast' },
  { id: 'c-197', title: 'Outreach draft — Northbound',         date: 'May 18, 2026', time: '10:37 AM', scope: 'Outreach' },
  { id: 'c-196', title: 'DD §4.3 Heliograph',                  date: 'May 15, 2026', time: '03:22 PM', scope: 'Diligence' },
  { id: 'c-195', title: 'Banker performance · TTM',            date: 'Apr 30, 2026', time: '01:11 PM', scope: 'Report' },
  { id: 'c-194', title: 'Cap table reconciliation',            date: 'Apr 28, 2026', time: '09:48 AM', scope: 'Finance' },
  { id: 'c-193', title: 'Customer references for Halcyon',     date: 'Apr 22, 2026', time: '04:16 PM', scope: 'References' },
];

const SUGGESTIONS = [
  'Open Meridian story',
  'Show today\'s pipeline',
  'Pull tasks due',
  'Draft outreach to Quorum',
  'Forecast by sector',
];

/* Workflow parser — given a message, return an action the main app should take */
function parseWorkflow(text, deals) {
  const t = text.toLowerCase();
  // Module routes
  const moduleMatch = {
    pipeline: ['pipeline', 'kanban', 'board'],
    leads: ['lead', 'prospect'],
    crm: ['contact', 'company', 'companies', 'crm'],
    documents: ['document', 'docs', 'files', 'vdr', 'deal room'],
    knowledge: ['knowledge', 'playbook', 'template', 'sop'],
    intelligence: ['intelligence', 'forecast', 'analytics', 'risk'],
    reports: ['report', 'dashboard'],
    tasks: ['task', 'todo', 'checklist'],
    calendar: ['calendar', 'meeting', 'schedule', 'call', 'availability', 'agenda'],
    inbox: ['inbox', 'mail', 'message'],
    story: ['story', 'timeline', 'history', 'history of', 'dealflow'],
    home: ['home', 'today', 'morning'],
    billing: ['billing', 'plan', 'invoice'],
    admin: ['admin', 'permission', 'audit'],
    settings: ['setting', 'profile'],
  };
  // Deal name match
  const dealMatch = deals.find(d => {
    const short = d.name.split(' — ')[0].toLowerCase();
    const co = (companyOf(d.company)?.name || '').toLowerCase();
    return t.includes(short.split(' ')[0]) || t.includes(co.split(' ')[0]);
  });
  // Deal ID match
  const idMatch = t.match(/deal[\s-]?(\d+)/);

  if (idMatch) {
    const id = 'DEAL-' + idMatch[1].padStart(4, '0');
    const d = deals.find(x => x.id === id);
    if (d) return { type: 'open-deal', deal: d };
  }
  if (dealMatch && (t.includes('story') || t.includes('history') || t.includes('timeline'))) {
    return { type: 'story', dealId: dealMatch.id };
  }
  if (dealMatch && (t.includes('open') || t.includes('show') || t.includes('pull'))) {
    return { type: 'open-deal', deal: dealMatch };
  }
  for (const [route, words] of Object.entries(moduleMatch)) {
    if (words.some(w => t.includes(w))) return { type: 'route', route };
  }
  if (dealMatch) return { type: 'open-deal', deal: dealMatch };
  return null;
}

function searchPlatform(query, deals = DEALS, leads = LEADS) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const entries = [];
  const add = (type, label, detail, ref, haystack, action) => {
    entries.push({
      type,
      label,
      detail,
      ref,
      action,
      haystack: [label, detail, ref, haystack].filter(Boolean).join(' ').toLowerCase(),
    });
  };

  (deals || []).forEach(d => {
    const company = companyOf(d.company);
    const stage = stageOf(d.stage);
    add('Deal', d.name, `${company?.name || 'Company'} · ${stage?.name || 'Stage'} · ${fmtCurrency(d.value, d.currency)}`, d.id, [d.type, d.source, d.priority, ...(d.tags || [])].join(' '), { type: 'open-deal', deal: d });
  });
  (leads || []).forEach(l => add('Lead', l.name, `${l.title || 'Contact'} · ${l.company || 'Company'} · ${l.urgency || 'Normal'}`, l.id, [l.email, l.phone, l.sector, l.channel, l.status].join(' '), { type: 'route', route: 'leads' }));
  COMPANIES.forEach(c => add('Company', c.name, `${c.sector} · ${c.hq} · ${c.emp} employees`, c.id, c.logo, { type: 'route', route: 'crm' }));
  PEOPLE.forEach(p => add('Contact', p.name, p.role, p.id, p.initials, { type: 'route', route: 'crm' }));
  DOCUMENTS.forEach(d => add('Document', d.name, `${d.ext.toUpperCase()} · ${d.size} · ${d.updated}`, d.id, d.deal, { type: 'route', route: 'documents' }));
  TASKS.forEach(t => add('Task', t.title, `${t.due} · ${t.priority}`, t.id, t.deal, { type: 'route', route: 'tasks' }));
  KNOWLEDGE.forEach(k => add('Knowledge', k.title, `${k.tag} · updated ${k.updated}`, k.tag, k.desc, { type: 'route', route: 'knowledge' }));

  return entries
    .filter(e => e.haystack.includes(q))
    .sort((a, b) => {
      const as = a.label.toLowerCase().startsWith(q) ? 0 : 1;
      const bs = b.label.toLowerCase().startsWith(q) ? 0 : 1;
      return as - bs || a.type.localeCompare(b.type) || a.label.localeCompare(b.label);
    })
    .slice(0, 8);
}

function routeAgentKey(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('invoice') || t.includes('payment') || t.includes('payout') || t.includes('bank') || t.includes('subscription')) return 'payments';
  if (t.includes('sms') || t.includes('email') || t.includes('message') || t.includes('call') || t.includes('voice') || t.includes('meeting') || t.includes('invite')) return 'communication';
  if (t.includes('document') || t.includes('proposal') || t.includes('contract') || t.includes('memo') || t.includes('file')) return 'documents';
  if (t.includes('risk') || t.includes('market') || t.includes('battlecard') || t.includes('research') || t.includes('forecast')) return 'intelligence';
  if (t.includes('lead') || t.includes('follow') || t.includes('deal') || t.includes('pipeline')) return 'sales';
  if (t.includes('calendar') || t.includes('task') || t.includes('setup') || t.includes('remind')) return 'operations';
  return 'conductor';
}

function routeAgentLabel(agent) {
  return {
    conductor: 'Conductor',
    sales: 'Sales',
    intelligence: 'Intelligence',
    documents: 'Documents',
    operations: 'Operations',
    communication: 'Communication',
    payments: 'Payments',
  }[agent] || 'Conductor';
}

function ADGAPanel({ state, setState, collapsed, setCollapsed, onWorkflow, deals, leads, activeContext = null }) {
  const bodyRef = React.useRef(null);
  const taRef = React.useRef(null);
  const fileRef = React.useRef(null);

  const [draft, setDraft] = React.useState('');
  const [attachments, setAttachments] = React.useState([]);
  const [panelTab, setPanelTab] = React.useState('chat');
  const [activeChat, setActiveChat] = React.useState(SAMPLE_HISTORY[0].id);
  // Chat history is shared across every suite page — persist to localStorage so the
  // conversation looks identical whether the user is on /suite, /suite/dealflow/<id>, or any
  // other route inside the platform. For real authenticated users we drop the demo seed.
  const [messages, setMessages] = React.useState(() => {
    if (typeof window === 'undefined') return VOICE_TRANSCRIPT;
    try {
      const raw = window.localStorage.getItem('adga-chat-messages');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
      if (window.localStorage.getItem('adga-real-user-bootstrapped')) {
        return [];
      }
    } catch (e) {}
    return VOICE_TRANSCRIPT;
  });
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('adga-chat-messages', JSON.stringify(messages.slice(-60)));
    } catch (e) {}
  }, [messages]);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'adga-chat-messages' || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) setMessages(parsed);
      } catch (err) {}
    };
    const onRealUser = () => setMessages([]);
    window.addEventListener('storage', onStorage);
    window.addEventListener('adga:real-user-bootstrap', onRealUser);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('adga:real-user-bootstrap', onRealUser);
    };
  }, []);
  const [chatSearch, setChatSearch] = React.useState('');
  const [historySearch, setHistorySearch] = React.useState('');

  const chatResults = React.useMemo(
    () => searchPlatform(chatSearch, deals || [], leads || []),
    [chatSearch, deals, leads]
  );
  const historyResults = React.useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return SAMPLE_HISTORY;
    return SAMPLE_HISTORY.filter(c => [c.title, c.date, c.time, c.scope].join(' ').toLowerCase().includes(q));
  }, [historySearch]);

  React.useEffect(() => {
    if (panelTab === 'chat' && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, state, panelTab]);

  const autosize = () => {
    if (!taRef.current) return;
    taRef.current.style.height = 'auto';
    taRef.current.style.height = Math.min(220, taRef.current.scrollHeight) + 'px';
  };
  React.useEffect(() => { autosize(); }, [draft]);

  const send = async () => {
    const text = draft.trim();
    if (!text && attachments.length === 0) return;
    const userMsg = { who: 'user', text: text || '[attachments]' };
    setMessages(m => [...m, userMsg]);
    setDraft('');
    setAttachments([]);
    setState('working');

    // Workflow-aware: parse intent and surface content
    const action = parseWorkflow(text, deals || []);
    const platformMatches = searchPlatform(text, deals || [], leads || []);
    let agentReply;
    if (action?.type === 'open-deal') {
      agentReply = { who: 'agent', text: `Opening “${action.deal.name.split(' — ')[0]}.” Loading the file on your desk now.`, cite: action.deal.id };
    } else if (action?.type === 'story') {
      const d = (deals || []).find(x => x.id === action.dealId);
      agentReply = { who: 'agent', text: `Pulling the full story for ${d?.name.split(' — ')[0]}. Every touch, in order.`, cite: action.dealId };
    } else if (action?.type === 'route') {
      agentReply = { who: 'agent', text: `Bringing up ${action.route} for you.`, cite: 'workflow/route' };
    } else if (platformMatches.length) {
      const top = platformMatches.slice(0, 4).map(r => `${r.type}: ${r.label}`).join('; ');
      agentReply = { who: 'agent', text: `I found ${platformMatches.length} matching platform records. Top matches: ${top}.`, cite: 'platform/search' };
    } else {
      agentReply = { who: 'agent', text: 'Working on that — pulling the relevant deals and surfacing context now.', cite: 'context/active-pipeline' };
    }

    try {
      // Prefer the live Kimi 2.6 chat endpoint when available; fall back to the
      // jobs endpoint so older agent jobs surface still works.
      const chatHistory = [
        ...messages.slice(-12).map(m => ({
          role: m.who === 'user' ? 'user' : 'assistant',
          content: String(m.text || ''),
        })),
        { role: 'user', content: text || 'Process attached files.' },
      ];
      const chatResponse = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          context: activeContext || { kind: 'workspace' },
        }),
      });
      const chatJson = await chatResponse.json();
      if (chatResponse.ok && chatJson?.message?.content) {
        agentReply = {
          who: 'agent',
          text: chatJson.message.content,
          cite: chatJson?.meta?.model || agentReply.cite || 'kimi-2.6',
        };
      } else {
        const response = await fetch('/api/agent/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: routeAgentKey(text),
            job_type: 'suite.agent_command',
            prompt: text || 'Process attached files.',
            context: {
              workflow_action: action,
              attachment_count: attachments.length,
              platform_search: platformMatches.slice(0, 6).map(({ type, label, detail, ref }) => ({ type, label, detail, ref })),
            },
          }),
        });
        const result = await response.json();
        const summary = result?.output?.summary || result?.job?.output?.summary;
        if (summary) {
          agentReply = {
            who: 'agent',
            text: summary,
            cite: result?.job?.id || agentReply.cite || 'agent/job',
          };
        }
      }
    } catch (e) {
      agentReply = {
        ...agentReply,
        cite: agentReply.cite || 'local/workflow',
      };
    }

    setTimeout(() => {
      setMessages(m => [...m, agentReply]);
      setState('idle');
      if (action && onWorkflow) onWorkflow(action);
    }, 450);
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onFile = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachments(a => [...a, ...files.map(f => ({ name: f.name, size: f.size }))]);
    e.target.value = '';
  };

  const toggleMic = () => {
    setState(s => s === 'listening' ? 'idle' : 'listening');
  };

  if (collapsed) {
    return (
      <aside className="voice collapsed" data-state={state} aria-hidden="true"/>
    );
  }

  return (
    <aside className="voice" data-state={state}>
      <div className="voice-h">
        <div className="voice-orb" aria-hidden="true"></div>
        <div className="voice-title">
          <span>ADGA</span>
          {activeContext?.kind === 'map' && activeContext.deal && (
            <span className="state" title="ADGA is aware of this dealflow">
              · on {activeContext.deal.name?.split(' — ')[0] || 'dealflow'}
            </span>
          )}
          {state !== 'idle' && (
            <span className="state">
              {state === 'listening' && '• Listening'}
              {state === 'talking' && '• Speaking'}
            </span>
          )}
        </div>
        <div className="voice-tools">
          <button
            className="composer-tool"
            type="button"
            onClick={() => { setMessages([]); setDraft(''); setPanelTab('chat'); }}
            title="New chat"
            aria-label="New chat"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
            </svg>
          </button>
          <button
            className="composer-tool"
            type="button"
            onClick={() => setCollapsed(true)}
            title="Hide"
            aria-label="Hide ADGA"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="voice-tabs" role="tablist" aria-label="ADGA panel">
        <button
          type="button"
          role="tab"
          aria-selected={panelTab === 'chat'}
          className={panelTab === 'chat' ? 'active' : ''}
          onClick={() => setPanelTab('chat')}
        >
          Chat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={panelTab === 'history'}
          className={panelTab === 'history' ? 'active' : ''}
          onClick={() => setPanelTab('history')}
        >
          History
        </button>
      </div>

      {panelTab === 'chat' && (
        <div className="voice-search">
          <Icon name="search" size={13}/>
          <input
            value={chatSearch}
            onChange={e => setChatSearch(e.target.value)}
            placeholder="Search deals, contacts, documents, tasks..."
            aria-label="Search platform from ADGA"
          />
          {chatSearch && <button type="button" onClick={() => setChatSearch('')} aria-label="Clear search">Clear</button>}
        </div>
      )}

      {panelTab === 'history' && (
        <div className="voice-search">
          <Icon name="search" size={13}/>
          <input
            value={historySearch}
            onChange={e => setHistorySearch(e.target.value)}
            placeholder="Search chat history..."
            aria-label="Search chat history"
          />
          {historySearch && <button type="button" onClick={() => setHistorySearch('')} aria-label="Clear history search">Clear</button>}
        </div>
      )}

      {/* Dealflow-aware suggestion row — when ADGA is sitting on a dealflow canvas, show 4 one-tap prompts
          that are specific to the deal context. Click sends the prompt straight through the
          existing send() pipeline so the chat fans into the bus the same way as typing. */}
      {panelTab === 'chat' && activeContext?.kind === 'map' && activeContext.deal && (
        <div
          style={{
            padding: '10px 12px 4px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            borderBottom: '1px solid var(--rule, #e8e4de)',
          }}
        >
          {[
            { label: 'What\'s the next move?', prompt: `On the ${activeContext.deal.name?.split(' — ')[0] || 'deal'} dealflow, what's the highest-leverage next action right now?` },
            { label: 'Who haven\'t we reached?', prompt: `Who is on the ${activeContext.deal.name?.split(' — ')[0] || 'deal'} dealflow that we haven't actually had a conversation with yet?` },
            { label: 'Draft the next message', prompt: `Draft the next outreach message I should send on the ${activeContext.deal.name?.split(' — ')[0] || 'deal'} dealflow.` },
            { label: 'Where\'s the risk?', prompt: `Looking at the ${activeContext.deal.name?.split(' — ')[0] || 'deal'} dealflow, where's the biggest risk to closing on schedule?` },
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => { setDraft(s.prompt); setTimeout(send, 0); }}
              style={{
                fontSize: 11,
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(86, 36, 199, 0.2)',
                background: 'rgba(86, 36, 199, 0.04)',
                color: 'var(--adga-accent, #5d2cd6)',
                cursor: 'pointer',
                fontWeight: 500,
                lineHeight: 1.2,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="voice-body" ref={bodyRef}>
        {panelTab === 'history' ? (
          <div className="voice-history-panel">
            <div className="vh-head">
              <span>{historyResults.length} conversations</span>
              <button type="button" onClick={() => setHistorySearch('')}>Reset</button>
            </div>
            {historyResults.map(c => (
              <button
                key={c.id}
                type="button"
                className={'vh-item ' + (c.id === activeChat ? 'active' : '')}
                onClick={() => { setActiveChat(c.id); setPanelTab('chat'); }}
              >
                <span className="ttl">{c.title}</span>
                <span className="scope">{c.scope}</span>
                <span className="when">{c.date} · {c.time}</span>
              </button>
            ))}
          </div>
        ) : chatSearch.trim().length >= 2 ? (
          <div className="voice-search-results">
            <div className="vh-head">
              <span>{chatResults.length ? `${chatResults.length} platform matches` : 'No platform matches'}</span>
              <button type="button" onClick={() => { setDraft(chatSearch); setChatSearch(''); taRef.current?.focus(); }}>Ask ADGA</button>
            </div>
            {chatResults.map(r => (
              <button
                key={`${r.type}-${r.ref}-${r.label}`}
                type="button"
                className="vs-result"
                onClick={() => {
                  setDraft(r.type === 'Deal' ? `Open ${r.label}` : `Find ${r.label}`);
                  if (r.action && onWorkflow) onWorkflow(r.action);
                  setChatSearch('');
                }}
              >
                <span className="type">{r.type}</span>
                <span className="ttl">{r.label}</span>
                <span className="detail">{r.detail}</span>
              </button>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:'24px 16px',textAlign:'center'}}>
            <div style={{width:48,height:48,borderRadius:'50%',background:'var(--accent-soft)',display:'grid',placeItems:'center'}}>
              <div style={{width:18,height:18,borderRadius:'50%',background:'var(--accent)'}}/>
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:600,letterSpacing:'-0.01em'}}>How can I help, Maren?</div>
              <div style={{fontSize:12.5,color:'var(--text-3)',marginTop:4,lineHeight:1.5,maxWidth:260}}>
                Ask about a contact, deal, meeting, document, or next action.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="voice-meta">Session · 09:14 · {messages.length} messages</div>
            {messages.map((m, i) => (
              <div key={i} className={'voice-msg ' + m.who}>
                <span className="who">{m.who === 'user' ? 'You' : 'ADGA'}</span>
                <div className="what">
                  {m.text}
                  {m.cite && (
                    <div className="cite">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12 12 21a6 6 0 1 1-8.5-8.5L13 3a4 4 0 0 1 5.7 5.7L9.4 18a2 2 0 1 1-2.8-2.8L15 7"/>
                      </svg>
                      {m.cite}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {state === 'talking' && (
              <div className="voice-msg agent">
                <span className="who">ADGA</span>
                <div className="what">
                  <span style={{display:'inline-flex',gap:4,alignItems:'center'}}>
                    <span className="dot-typing"/>
                    <span className="dot-typing" style={{animationDelay:'0.15s'}}/>
                    <span className="dot-typing" style={{animationDelay:'0.3s'}}/>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {panelTab === 'chat' && state === 'listening' && (
        <div className="voice-live">
          <div className="voice-live-wave" aria-hidden="true">
            {Array.from({length: 28}).map((_, i) => (
              <i key={i} style={{animationDelay: (i * 0.04) + 's'}}/>
            ))}
          </div>
          <div style={{fontSize:12,color:'var(--text-2)'}}>Listening… tap mic to stop</div>
        </div>
      )}

      {panelTab === 'chat' && messages.length <= 1 && state === 'idle' && (
        <div className="voice-suggests">
          {SUGGESTIONS.map(s => (
            <button key={s} type="button" onClick={() => setDraft(s)}>{s}</button>
          ))}
        </div>
      )}

      {panelTab === 'chat' && (
        <div className="voice-command">
          <div className="composer-box">
            {attachments.length > 0 && (
              <div className="composer-attachments">
                {attachments.map((a, i) => (
                  <div key={i} className="composer-chip">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--text-3)'}}>
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>
                      <path d="M14 3v5h5"/>
                    </svg>
                    <span>{a.name}</span>
                    <span
                      className="x"
                      onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                      role="button"
                      aria-label="Remove attachment"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <textarea
              ref={taRef}
              className="composer-textarea"
              placeholder="Ask ADGA to brief a contact, draft outreach, find documents, or move a deal forward."
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKey}
              rows={4}
            />
            <div className="composer-bar">
              <button
                className="composer-tool"
                type="button"
                onClick={() => fileRef.current?.click()}
                title="Attach files"
                aria-label="Attach files"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12 12 21a6 6 0 1 1-8.5-8.5L13 3a4 4 0 0 1 5.7 5.7L9.4 18a2 2 0 1 1-2.8-2.8L15 7"/>
                </svg>
              </button>
              <button
                className={'composer-tool mic' + (state === 'listening' ? ' live' : '')}
                type="button"
                onClick={toggleMic}
                title={state === 'listening' ? 'Stop voice input' : 'Start voice input'}
                aria-label="Voice input"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="3" width="6" height="12" rx="3"/>
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
                </svg>
              </button>
              <button
                className="composer-send"
                type="button"
                onClick={send}
                disabled={!draft.trim() && attachments.length === 0}
                aria-label="Send"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                onChange={onFile}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.txt"
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}


const VoicePanel = ADGAPanel;

// alias for back-compat

/* Pipeline module — kanban, table, and timeline views + filter bar */

function PipelineViewTabs({ view, setView }) {
  return (
    <div className="seg suite-view-tabs" role="tablist" aria-label="Pipeline view">
      <button type="button" className={view==='kanban'?'active':''} onClick={()=>setView('kanban')}>
        <Icon name="kanban" size={13}/> Kanban
      </button>
      <button type="button" className={view==='table'?'active':''} onClick={()=>setView('table')}>
        <Icon name="table" size={13}/> Table
      </button>
      <button type="button" className={view==='timeline'?'active':''} onClick={()=>setView('timeline')}>
        <Icon name="timeline" size={13}/> Timeline
      </button>
    </div>
  );
}

function PipelineHeader({ section, setSection, onAdd, deals }) {
  const active = (deals || []).filter(d => d.stage !== 'won' && d.stage !== 'lost');
  const total = active.reduce((s, d) => s + (d.value || 0), 0);
  const weighted = active.reduce((s, d) => s + (d.value || 0) * (d.prob || 0) / 100, 0);
  return (
    <>
      <div className="page-h">
        <div>
          <h1>Pipeline</h1>
          <div className="sub">{active.length} active deal{active.length === 1 ? '' : 's'} · ${compactNum(total)} total · ${compactNum(weighted)} weighted</div>
        </div>
        <div className="page-actions">
          <button className="btn primary" type="button" onClick={onAdd}><Icon name="plus" size={13}/> New deal</button>
        </div>
      </div>
      <div className="suite-subtabs pipeline-subtabs" role="tablist" aria-label="Pipeline sections">
        <button type="button" role="tab" aria-selected={section === 'pipeline'} className={section === 'pipeline' ? 'active' : ''} onClick={() => setSection('pipeline')}>
          Pipeline
        </button>
        <button type="button" role="tab" aria-selected={section === 'controls'} className={section === 'controls' ? 'active' : ''} onClick={() => setSection('controls')}>
          Controls
        </button>
      </div>
    </>
  );
}

function PipelineControls({ view, setView }) {
  return (
    <div className="pipeline-controls-panel">
      <div className="pc-row">
        <div>
          <div className="ttl">Pipeline controls</div>
          <div className="sub">Adjust view, filters, sorting, imports, and list hygiene without crowding the board.</div>
        </div>
        <button className="btn" type="button"><Icon name="upload" size={13}/> Import</button>
      </div>
      <div className="pc-row compact">
        <PipelineViewTabs view={view} setView={setView}/>
        <span className="mono muted">Sorted by close date · ascending</span>
      </div>
      <div className="filterbar pipeline-filterbar">
        <button className="chip applied" type="button">Owner: Me <Icon name="x" size={10} className="x"/></button>
        <button className="chip applied" type="button">Stage: All active <Icon name="x" size={10} className="x"/></button>
        <button className="chip" type="button"><Icon name="plus" size={10}/> Type</button>
        <button className="chip" type="button"><Icon name="plus" size={10}/> Sector</button>
        <button className="chip" type="button"><Icon name="plus" size={10}/> Close date</button>
        <button className="chip" type="button"><Icon name="plus" size={10}/> Value</button>
      </div>
    </div>
  );
}

function pipelineHealthForDeal(deal) {
  const taskCount = TASKS.filter(t => t.deal === deal.id).length;
  const docCount = DOCUMENTS.filter(d => d.deal === deal.id).length;
  const daysToClose = deal.close ? Math.ceil((new Date(deal.close + 'T00:00:00') - new Date()) / 86400000) : 999;
  const lateStage = ['scope', 'design', 'close', 'sign'].includes(deal.stage);
  const stale = String(deal.updated || '').includes('w') || String(deal.updated || '').includes('2w') || String(deal.updated || '').includes('7d');
  const score = Math.max(0, Math.min(100,
    (deal.prob || 0)
    + (lateStage ? 12 : 0)
    + (docCount >= 2 ? 8 : 0)
    + (taskCount >= 2 ? 6 : 0)
    - (stale ? 18 : 0)
    - (daysToClose < 7 && deal.stage !== 'close' && deal.stage !== 'sign' ? 12 : 0)
  ));
  const blockers = [
    stale ? 'No recent dealflow activity' : null,
    daysToClose < 7 && deal.stage !== 'close' && deal.stage !== 'sign' ? 'Close date is near but stage is not late' : null,
    docCount === 0 ? 'No attached documents' : null,
    taskCount === 0 ? 'No open tasks' : null,
  ].filter(Boolean);
  return { score, taskCount, docCount, daysToClose, blockers };
}

function PipelineOpsPanel({ deals, selectedDeal, onSelect, openDeal }) {
  const active = (deals || []).filter(d => d.stage !== 'won' && d.stage !== 'lost');
  const staleDeals = active.filter(d => pipelineHealthForDeal(d).blockers.length).slice(0, 5);
  const stageRows = PIPELINE_STAGES.map(stage => {
    const stageDeals = active.filter(d => d.stage === stage.id);
    const value = stageDeals.reduce((s, d) => s + d.value, 0);
    const weighted = stageDeals.reduce((s, d) => s + d.value * d.prob / 100, 0);
    return { stage, count: stageDeals.length, value, weighted };
  });
  const activityRows = active
    .slice()
    .sort((a, b) => pipelineHealthForDeal(a).blockers.length - pipelineHealthForDeal(b).blockers.length || new Date(a.close) - new Date(b.close))
    .slice(0, 6)
    .map(d => ({ deal: d, health: pipelineHealthForDeal(d), docs: DOCUMENTS.filter(x => x.deal === d.id).slice(0, 2), tasks: TASKS.filter(x => x.deal === d.id).slice(0, 2) }));

  return (
    <div style={{padding:'0 var(--suite-gutter, 32px) 18px',display:'grid',gridTemplateColumns:'minmax(0,1.15fr) minmax(320px,.85fr)',gap:14}}>
      <div className="card">
        <div className="card-h">
          <div><div className="ttl">Pipeline operations</div><div className="sub">Stage health, weighted forecast, and stuck-deal signals from live dealflow evidence.</div></div>
          <Pill tone="blue" noDot>{active.length} active</Pill>
        </div>
        <div className="card-b" style={{padding:0}}>
          {stageRows.map(({ stage, count, value, weighted }) => (
            <div key={stage.id} className="list-row" style={{height:'auto',padding:'12px 16px'}}>
              <span className="col-dot" style={{background:stage.dot}}/>
              <div className="grow">
                <b>{stage.name}</b>
                <div className="sub">{count} deals · {fmtCurrency(value, 'USD')} gross · {fmtCurrency(weighted, 'USD')} weighted</div>
              </div>
              <span className="mono text-xs muted">WIP {stage.wip || '∞'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-h"><div><div className="ttl">Needs attention</div><div className="sub">Evidence gaps and stale movement.</div></div></div>
        <div className="card-b" style={{padding:0}}>
          {staleDeals.map(d => {
            const health = pipelineHealthForDeal(d);
            return (
              <button key={d.id} type="button" className="list-row" style={{height:'auto',padding:'12px 16px',width:'100%',textAlign:'left'}} onClick={() => onSelect(d)}>
                <Icon name="flag" size={14} className="muted"/>
                <div className="grow">
                  <b>{d.name}</b>
                  <div className="sub">{health.blockers[0]} · {health.docCount} docs · {health.taskCount} tasks</div>
                </div>
                <Pill tone={health.score > 70 ? 'green' : health.score > 45 ? 'amber' : 'red'}>{health.score}</Pill>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{gridColumn:'1 / -1'}}>
        <div className="card-h">
          <div><div className="ttl">Dealflow activity feeding the pipeline</div><div className="sub">Documents, tasks, and notes are the evidence behind each stage movement.</div></div>
          <button className="btn sm" type="button" onClick={() => selectedDeal && openDeal(selectedDeal)} disabled={!selectedDeal}>Open selected dealflow</button>
        </div>
        <div className="card-b" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:10}}>
          {activityRows.map(({ deal, health, docs, tasks }) => (
            <button key={deal.id} type="button" className="card" style={{padding:14,textAlign:'left',borderColor:selectedDeal?.id === deal.id ? 'var(--accent)' : 'var(--border)'}} onClick={() => onSelect(deal)}>
              <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'flex-start'}}>
                <div>
                  <div className="ttl">{deal.name}</div>
                  <div className="sub mono">{deal.id} · {stageOf(deal.stage)?.name || deal.stage}</div>
                </div>
                <Pill tone={health.blockers.length ? 'amber' : 'green'}>{health.blockers.length ? 'Review' : 'Clean'}</Pill>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}>
                <div className="tag">{health.docCount} deal docs</div>
                <div className="tag">{health.taskCount} tasks</div>
              </div>
              <div style={{marginTop:10,fontSize:12,color:'var(--text-2)',lineHeight:1.45}}>
                {(docs[0]?.name || tasks[0]?.title || health.blockers[0] || 'Recent dealflow activity is current.')}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PipelineDealInspector({ deal, onClose, openDeal }) {
  if (!deal) return null;
  const co = companyOf(deal.company);
  const owner = personOf(deal.owner);
  const stage = stageOf(deal.stage);
  const docs = DOCUMENTS.filter(d => d.deal === deal.id);
  const tasks = TASKS.filter(t => t.deal === deal.id);
  const health = pipelineHealthForDeal(deal);
  return (
    <aside style={{position:'absolute',top:0,right:0,bottom:0,width:380,background:'var(--surface)',borderLeft:'1px solid var(--border)',zIndex:8,boxShadow:'-18px 0 40px rgba(15,23,42,.08)',display:'flex',flexDirection:'column'}}>
      <div className="drawer-h">
        <div>
          <div className="eyebrow mono">{deal.id}</div>
          <h2>{deal.name}</h2>
          <div className="sub">{co?.name || 'Company'} · {stage?.name || deal.stage}</div>
        </div>
        <button className="btn icon ghost" type="button" onClick={onClose}><Icon name="x" size={14}/></button>
      </div>
      <div style={{padding:18,overflow:'auto',display:'flex',flexDirection:'column',gap:14}}>
        <div className="kpis" style={{padding:0,gridTemplateColumns:'1fr 1fr'}}>
          <KPI label="Health" value={health.score} delta={health.blockers.length ? 'review' : 'clean'}/>
          <KPI label="Weighted" value={fmtCurrency(deal.value * deal.prob / 100, deal.currency)} delta={deal.prob + '% prob'}/>
        </div>
        <div className="card">
          <div className="card-h"><div className="ttl">Stage evidence</div></div>
          <div className="card-b" style={{padding:0}}>
            {[
              ['Deal documents', docs.length, docs[0]?.name || 'No document evidence yet'],
              ['Open tasks', tasks.length, tasks[0]?.title || 'No task evidence yet'],
              ['Owner', owner?.name || 'Unassigned', 'Responsible for stage movement'],
              ['Close date', deal.close || 'Unset', health.daysToClose < 7 ? 'Needs near-term attention' : 'Inside forecast horizon'],
            ].map(([label, value, note]) => (
              <div key={label} className="list-row" style={{height:'auto',padding:'12px 14px'}}>
                <div className="grow"><b>{label}</b><div className="sub">{note}</div></div>
                <span className="mono text-xs muted">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="ttl">Recommended next moves</div></div>
          <div className="card-b" style={{display:'flex',flexDirection:'column',gap:8}}>
            {(health.blockers.length ? health.blockers : ['Dealflow evidence supports current stage', 'Prepare next client update']).map(item => (
              <div key={item} style={{display:'flex',gap:8,alignItems:'center',fontSize:13}}>
                <Icon name="check" size={13}/><span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <button className="btn primary" type="button" onClick={() => openDeal(deal)}>Open dealflow</button>
      </div>
    </aside>
  );
}

function Kanban({ deals, onOpen, onMove, onInspect }) {
  const [dragId, setDragId] = React.useState(null);
  const [overCol, setOverCol] = React.useState(null);

  return (
    <div className="kanban">
      {PIPELINE_STAGES.map(stage => {
        const colDeals = deals.filter(d => d.stage === stage.id);
        const colValue = colDeals.reduce((s,d) => s + d.value, 0);
        return (
          <div
            key={stage.id}
            className="col"
            onDragOver={e => { e.preventDefault(); setOverCol(stage.id); }}
            onDragLeave={() => setOverCol(null)}
            onDrop={e => { e.preventDefault(); if (dragId) onMove(dragId, stage.id); setDragId(null); setOverCol(null); }}
            style={overCol === stage.id ? {borderColor: 'var(--accent)', background: 'var(--accent-soft)'} : null}
          >
            <div className="col-h">
              <span className="col-dot" style={{background: stage.dot}}/>
              <span className="col-name">{stage.name}</span>
              <span className="col-count">{colDeals.length}</span>
              <span className="col-value">{fmtCurrency(colValue, 'USD')}</span>
            </div>
            <div className="col-body">
              {colDeals.map(d => {
                const co = companyOf(d.company);
                const owner = personOf(d.owner);
                return (
                  <div
                    key={d.id}
                    className="deal-card"
                    draggable
                    onDragStart={() => setDragId(d.id)}
                    onClick={() => onInspect ? onInspect(d) : onOpen(d)}
                  >
                    <div className="deal-row between">
                      <span className="tag">{d.type}</span>
                      <span className="mono text-xs muted">{d.id}</span>
                    </div>
                    <div className="deal-name">{d.name}</div>
                    <div className="deal-row between">
                      <span className="deal-value">{fmtCurrency(d.value, d.currency)}</span>
                      <Pill tone={d.priority === 'high' ? 'red' : d.priority === 'med' ? 'amber' : 'gray'}>
                        {d.priority === 'high' ? 'P0' : d.priority === 'med' ? 'P1' : 'P2'}
                      </Pill>
                    </div>
                    <div className="progress"><i style={{width: d.prob + '%'}}/></div>
                    <div className="deal-row between">
                      <div className="deal-meta">
                        <Icon name="building" size={11}/> {co?.sector}
                        <span style={{opacity:.5}}>·</span>
                        <Icon name="cal" size={11}/> {d.close.slice(5)}
                      </div>
                      <AvatarStack ids={d.team} max={3}/>
                    </div>
                  </div>
                );
              })}
              {colDeals.length === 0 && (
                <button className="btn ghost sm" type="button" style={{justifyContent:'center',padding:'18px 8px',color:'var(--text-3)'}}>
                  <Icon name="plus" size={12}/> Drop or add
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineTable({ deals, onOpen }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th style={{width:32}}></th>
            <th>Deal</th>
            <th>Company</th>
            <th>Type</th>
            <th>Stage</th>
            <th>Owner</th>
            <th>Team</th>
            <th className="num">Value</th>
            <th className="num">Prob.</th>
            <th>Close</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {deals.map(d => {
            const co = companyOf(d.company);
            const owner = personOf(d.owner);
            const stage = stageOf(d.stage);
            const tone = d.stage === 'expand' ? 'green' :
                         d.stage === 'deliver' ? 'green' :
                         d.stage === 'sign' ? 'amber' :
                         d.stage === 'close' ? 'amber' :
                         d.stage === 'design' ? 'amber' :
                         d.stage === 'scope' ? 'violet' :
                         d.stage === 'discover' ? 'blue' :
                         d.stage === 'qualify' ? 'cyan' : 'gray';
            return (
              <tr key={d.id} onClick={() => onOpen(d)} style={{cursor:'pointer'}}>
                <td><input type="checkbox" onClick={e => e.stopPropagation()}/></td>
                <td>
                  <div style={{display:'flex',flexDirection:'column',gap:2}}>
                    <span className="deal-name">{d.name}</span>
                    <span className="mono text-xs muted">{d.id}</span>
                  </div>
                </td>
                <td>{co?.name}</td>
                <td><span className="tag">{d.type}</span></td>
                <td><Pill tone={tone}>{stage?.name}</Pill></td>
                <td><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Avatar person={owner}/> {owner.name}</span></td>
                <td><AvatarStack ids={d.team} max={3}/></td>
                <td className="num">{fmtCurrency(d.value, d.currency)}</td>
                <td className="num">{d.prob}%</td>
                <td className="mono">{d.close}</td>
                <td className="muted">{d.updated}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PipelineTimeline({ deals, onOpen }) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Use months May 2026 (index 4) → Apr 2027 — show 12 months from current
  const startMonth = 4; // May
  const startYear = 2026;
  const getMonthOffset = (dateStr) => {
    const [y, m] = dateStr.split('-').map(Number);
    return (y - startYear) * 12 + (m - 1) - startMonth;
  };

  return (
    <div className="gantt">
      <div className="gantt-grid">
        <div className="gantt-h">
          <div style={{padding:'8px 12px',borderRight:'1px solid var(--border)',fontSize:'10px',textTransform:'uppercase',letterSpacing:'.04em'}}>Deal</div>
          <div className="gantt-months">
            {months.map((m, i) => {
              const mi = (startMonth + i) % 12;
              const yr = startYear + Math.floor((startMonth + i) / 12);
              return <div key={i} className="gantt-month">{months[mi]} '{String(yr).slice(2)}</div>;
            })}
          </div>
        </div>
        {deals.map(d => {
          const off = getMonthOffset(d.close);
          const startOff = Math.max(0, off - 4);
          const widthMonths = Math.min(12 - startOff, off - startOff + 1);
          const leftPct = (startOff / 12) * 100;
          const widthPct = (widthMonths / 12) * 100;
          const stage = stageOf(d.stage);
          const muted = d.stage === 'lead' || d.stage === 'qualify';
          return (
            <div key={d.id} className="gantt-row" onClick={() => onOpen(d)} style={{cursor:'pointer'}}>
              <div className="gantt-name">
                <span className="col-dot" style={{background: stage.dot}}/>
                <div style={{display:'flex',flexDirection:'column',minWidth:0}}>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'200px'}}>{d.name.split(' — ')[0]}</span>
                  <span className="mono text-xs muted">{d.id}</span>
                </div>
              </div>
              <div className="gantt-track">
                <div className={'gantt-bar' + (muted ? ' muted' : '')} style={{left: leftPct + '%', width: widthPct + '%'}}>
                  <span className="pct" style={{width: d.prob + '%'}}/>
                  <span style={{position:'relative',zIndex:1}}>{d.name.split(' — ')[1] || d.type} · {fmtCurrency(d.value, d.currency)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelinePage({ view, setView, deals, setDeals, openDeal, setQuickCreate }) {
  const [section, setSection] = React.useState('pipeline');
  const [selectedDeal, setSelectedDeal] = React.useState(null);
  const move = (id, newStage) => {
    setDeals(ds => ds.map(d => d.id === id ? {...d, stage: newStage} : d));
    fetch('/api/deals/' + encodeURIComponent(id) + '/stage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ stage: newStage }),
    }).catch(() => {});
  };
  return (
    <div style={{position:'relative',display:'flex',flexDirection:'column',minHeight:0,flex:1}}>
      <PipelineHeader section={section} setSection={setSection} onAdd={() => setQuickCreate && setQuickCreate('deal')} deals={deals}/>
      {section === 'pipeline' && (
        <div className="pipeline-viewbar">
          <PipelineViewTabs view={view} setView={setView}/>
        </div>
      )}
      {section === 'controls' && <PipelineControls view={view} setView={setView}/>}
      {section === 'pipeline' && <PipelineOpsPanel deals={deals} selectedDeal={selectedDeal} onSelect={setSelectedDeal} openDeal={openDeal}/>}
      {view === 'kanban' && <Kanban deals={deals} onOpen={openDeal} onMove={move} onInspect={setSelectedDeal}/>}
      {view === 'table' && <PipelineTable deals={deals} onOpen={openDeal}/>}
      {view === 'timeline' && <PipelineTimeline deals={deals} onOpen={openDeal}/>}
      <PipelineDealInspector deal={selectedDeal} onClose={() => setSelectedDeal(null)} openDeal={openDeal}/>
    </div>
  );
}


/* Deal detail drawer with tabs */

function DealDrawer({ deal, onClose }) {
  const [tab, setTab] = React.useState('overview');
  if (!deal) return null;
  const co = companyOf(deal.company);
  const owner = personOf(deal.owner);
  const stage = stageOf(deal.stage);
  const stageTone = deal.stage === 'expand' ? 'green' :
                    deal.stage === 'deliver' ? 'green' :
                    deal.stage === 'sign' ? 'amber' :
                    deal.stage === 'close' ? 'amber' :
                    deal.stage === 'design' ? 'amber' :
                    deal.stage === 'scope' ? 'violet' :
                    deal.stage === 'discover' ? 'blue' :
                    deal.stage === 'qualify' ? 'cyan' : 'gray';

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}/>
      <div className="drawer" role="dialog" aria-label={'Deal ' + deal.id}>
        <div className="drawer-h">
          <button className="btn icon ghost" type="button" onClick={onClose}><Icon name="x" size={14}/></button>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:4}}>
            <div style={{display:'flex',alignItems:'center',gap:10,color:'var(--text-3)',fontSize:11}}>
              <span className="mono">{deal.id}</span>
              <span>·</span>
              <span className="tag">{deal.type}</span>
              <span>·</span>
              <Pill tone={stageTone}>{stage.name}</Pill>
              <span>·</span>
              <span>{co.name}</span>
            </div>
            <h2>{deal.name}</h2>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button className="btn" type="button" onClick={() => window.openHandoff && window.openHandoff(deal)}>
              <Icon name="users" size={13}/> Hand off
            </button>
            <button className="btn" type="button" onClick={() => window.openShare && window.openShare({ type: 'deal', id: deal.id, title: deal.name, subtitle: deal.id + ' · ' + (companyOf(deal.company)?.name || '') })}>
              <Icon name="paperclip" size={13}/> Share
            </button>
            <button className="btn" type="button"><Icon name="send" size={13}/> Update</button>
            <button className="btn primary" type="button"><Icon name="check" size={13}/> Advance stage</button>
          </div>
        </div>

        <div className="drawer-tabs">
          <button type="button" className={'drawer-tab ' + (tab==='overview'?'active':'')} onClick={()=>setTab('overview')}>Overview</button>
          <button type="button" className={'drawer-tab ' + (tab==='client'?'active':'')} onClick={()=>setTab('client')}>Client</button>
          <button type="button" className={'drawer-tab ' + (tab==='communication'?'active':'')} onClick={()=>setTab('communication')}>Communication</button>
          <button type="button" className={'drawer-tab ' + (tab==='room'?'active':'')} onClick={()=>setTab('room')}>Deal Room</button>
          <button type="button" className={'drawer-tab ' + (tab==='diligence'?'active':'')} onClick={()=>setTab('diligence')}>Due Diligence</button>
          <button type="button" className={'drawer-tab ' + (tab==='tasks'?'active':'')} onClick={()=>setTab('tasks')}>Tasks</button>
          <button type="button" className={'drawer-tab ' + (tab==='audit'?'active':'')} onClick={()=>setTab('audit')}>Audit</button>
        </div>

        {tab === 'overview' && <DealOverview deal={deal} co={co} owner={owner}/>}
        {tab === 'client' && <DealClientPortal deal={deal} co={co} owner={owner}/>}
        {tab === 'communication' && <DealCommunicationCenter deal={deal} co={co}/>}
        {tab === 'room' && <DealRoom deal={deal}/>}
        {tab === 'diligence' && <DealDiligence deal={deal}/>}
        {tab === 'tasks' && <DealTasks deal={deal}/>}
        {tab === 'audit' && <DealAudit deal={deal}/>}
      </div>
    </>
  );
}

function DealOverview({ deal, co, owner }) {
  const stages = PIPELINE_STAGES.slice(0, 6);
  const stageIdx = stages.findIndex(s => s.id === deal.stage);
  const docs = DOCUMENTS.filter(d => d.deal === deal.id);

  return (
    <div className="drawer-body">
      <div>
        {/* Stage tracker */}
        <div style={{display:'flex',gap:4,marginBottom:18}}>
          {stages.map((s, i) => (
            <div key={s.id} style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
              <div style={{
                height:4,borderRadius:2,
                background: i <= stageIdx ? 'var(--accent)' : 'var(--surface-3)',
                opacity: i < stageIdx ? 0.55 : 1
              }}/>
              <div style={{fontSize:10.5,color: i === stageIdx ? 'var(--text)' : 'var(--text-3)',fontWeight: i===stageIdx?500:400}}>
                {s.name}
              </div>
            </div>
          ))}
        </div>

        {/* Three-up stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:12,marginBottom:18}}>
          <div className="card" style={{padding:'12px 14px'}}>
            <div style={{fontSize:10.5,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.04em'}}>Deal value</div>
            <div className="mono" style={{fontSize:22,fontWeight:500,marginTop:4}}>{fmtCurrency(deal.value, deal.currency)}</div>
            <div className="text-xs muted" style={{marginTop:2}}>{deal.currency}</div>
          </div>
          <div className="card" style={{padding:'12px 14px'}}>
            <div style={{fontSize:10.5,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.04em'}}>Probability</div>
            <div className="mono" style={{fontSize:22,fontWeight:500,marginTop:4}}>{deal.prob}%</div>
            <div className="progress" style={{marginTop:6}}><i style={{width: deal.prob + '%'}}/></div>
          </div>
          <div className="card" style={{padding:'12px 14px'}}>
            <div style={{fontSize:10.5,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.04em'}}>Target close</div>
            <div className="mono" style={{fontSize:22,fontWeight:500,marginTop:4}}>{deal.close}</div>
            <div className="text-xs muted" style={{marginTop:2}}>{Math.max(0, Math.round((new Date(deal.close) - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000))} days out</div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-h"><div className="ttl">Activity</div><button className="btn ghost sm" type="button">View all</button></div>
          <div className="card-b" style={{padding:0}}>
            <div style={{padding:'0 16px'}}>
              {ACTIVITY.slice(0, 5).map((a, i) => {
                const p = personOf(a.who);
                return (
                  <div key={i} className="act">
                    <span className="ic">{a.icon}</span>
                    <div className="b"><b>{p.name}</b> {a.what} {a.note || a.file || a.task || a.party || a.to || ''} <span className="mono muted">{a.target}</span></div>
                    <span className="t">{a.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card" style={{marginTop:14}}>
          <div className="card-h"><div className="ttl">Documents <span className="sub">({docs.length})</span></div>
            <button className="btn ghost sm" type="button"><Icon name="upload" size={12}/> Upload</button>
          </div>
          <div className="card-b" style={{padding:0}}>
            {docs.map(d => (
              <div key={d.id} className="list-row" style={{borderBottom:'1px solid var(--border)'}}>
                <Icon name="file" size={15} className="muted"/>
                <div className="grow"><div className="ttl">{d.name}</div><div className="sub">{d.size} · updated {d.updated}</div></div>
                {d.signed && <Pill tone="green">Signed</Pill>}
                <span className="mono muted text-xs">{d.ext.toUpperCase()}</span>
              </div>
            ))}
            {docs.length === 0 && <div style={{padding:'18px',textAlign:'center',color:'var(--text-3)',fontSize:13}}>No documents yet</div>}
          </div>
        </div>
      </div>

      <div className="drawer-side">
        <div className="card">
          <div className="card-b">
            <dl className="kv">
              <dt>Company</dt><dd>{co.name}</dd>
              <dt>Sector</dt><dd>{co.sector}</dd>
              <dt>HQ</dt><dd>{co.hq}</dd>
              <dt>Employees</dt><dd className="mono">{co.emp}</dd>
              <dt>Source</dt><dd className="muted">{deal.source}</dd>
              <dt>Owner</dt><dd><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Avatar person={owner}/> {owner.name}</span></dd>
              <dt>Team</dt><dd><AvatarStack ids={deal.team} max={4}/></dd>
              <dt>Priority</dt><dd><Pill tone={deal.priority === 'high' ? 'red' : deal.priority === 'med' ? 'amber' : 'gray'}>{deal.priority.toUpperCase()}</Pill></dd>
              <dt>Tags</dt><dd>{deal.tags.length ? deal.tags.map(t => <span key={t} className="tag" style={{marginRight:4}}>{t}</span>) : <span className="muted">—</span>}</dd>
            </dl>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><div className="ttl">Next steps</div></div>
          <div className="card-b" style={{display:'flex',flexDirection:'column',gap:8,fontSize:13}}>
            <label style={{display:'flex',gap:8,alignItems:'flex-start'}}><input type="checkbox" defaultChecked/><span>Send working capital memo to seller</span></label>
            <label style={{display:'flex',gap:8,alignItems:'flex-start'}}><input type="checkbox"/><span>Schedule mgmt call with CFO</span></label>
            <label style={{display:'flex',gap:8,alignItems:'flex-start'}}><input type="checkbox"/><span>Counsel sign-off on §4.3</span></label>
            <label style={{display:'flex',gap:8,alignItems:'flex-start'}}><input type="checkbox"/><span>Schedule SC review</span></label>
          </div>
        </div>
      </div>
    </div>
  );
}

function DealRoom({ deal }) {
  const docs = DOCUMENTS.filter(d => d.deal === deal.id);
  return (
    <div className="drawer-body full">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <h3 style={{margin:'0 0 4px',fontSize:16,fontWeight:600}}>Virtual Deal Room</h3>
          <div className="text-sm muted">Secure document workspace · {docs.length} files · 3 external collaborators</div>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button className="btn" type="button"><Icon name="users" size={13}/> Manage access</button>
          <button className="btn" type="button"><Icon name="eye" size={13}/> Watermark</button>
          <button className="btn primary" type="button"><Icon name="upload" size={13}/> Upload</button>
        </div>
      </div>
      <div className="card">
        <div className="card-h"><div className="ttl">Files</div>
          <div style={{display:'flex',gap:6}}>
            <div className="seg">
              <button className="active" type="button">All</button>
              <button type="button">Financial</button>
              <button type="button">Legal</button>
              <button type="button">Commercial</button>
            </div>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr><th></th><th>Name</th><th>Folder</th><th>Owner</th><th>Updated</th><th>Size</th><th>Status</th><th>Access</th></tr>
          </thead>
          <tbody>
            {docs.concat(DOCUMENTS.slice(0, 4)).map((d, i) => {
              const p = personOf(d.owner);
              const folders = ['Financial','Legal','Commercial','Operational','Technology'];
              return (
                <tr key={d.id + '-' + i}>
                  <td><Icon name="file" size={14}/></td>
                  <td><b>{d.name}</b></td>
                  <td className="muted">{folders[i % folders.length]}</td>
                  <td><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Avatar person={p}/> {p.name.split(' ')[0]}</span></td>
                  <td className="muted">{d.updated}</td>
                  <td className="num">{d.size}</td>
                  <td>{d.signed ? <Pill tone="green">Signed</Pill> : <Pill tone="amber">Pending</Pill>}</td>
                  <td><Pill tone="violet" noDot><Icon name="lock" size={10}/> NDA</Pill></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DealDiligence({ deal }) {
  const statusTone = s => s === 'approved' ? 'green' : s === 'in-review' ? 'amber' : s === 'flagged' ? 'red' : 'gray';
  const statusLabel = s => ({approved:'Approved','in-review':'In review',flagged:'Flagged',requested:'Requested'}[s]);
  const totals = DD_CHECKLIST.reduce((acc, s) => {
    s.items.forEach(it => acc[it.status] = (acc[it.status] || 0) + 1);
    return acc;
  }, {});
  const total = Object.values(totals).reduce((a,b) => a+b, 0);

  return (
    <div className="drawer-body full">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <h3 style={{margin:'0 0 4px',fontSize:16,fontWeight:600}}>Due Diligence — Request List</h3>
          <div className="text-sm muted">{total} requests across 5 workstreams · {totals.approved || 0} approved · {totals['in-review'] || 0} in review · {totals.flagged || 0} flagged</div>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button className="btn" type="button"><Icon name="download" size={13}/> Export</button>
          <button className="btn primary" type="button"><Icon name="plus" size={13}/> Add request</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {[
          {l:'Approved', v: totals.approved || 0, tone:'green'},
          {l:'In review', v: totals['in-review'] || 0, tone:'amber'},
          {l:'Requested', v: totals.requested || 0, tone:'gray'},
          {l:'Flagged', v: totals.flagged || 0, tone:'red'},
        ].map(s => (
          <div key={s.l} className="card" style={{padding:'12px 14px'}}>
            <div className="text-xs muted" style={{textTransform:'uppercase',letterSpacing:'.04em'}}>{s.l}</div>
            <div className="mono" style={{fontSize:22,fontWeight:500,marginTop:4}}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <table className="dd-table">
          <thead>
            <tr><th style={{width:80}}>ID</th><th>Request</th><th style={{width:140}}>Owner</th><th style={{width:100}}>Due</th><th style={{width:120}}>Status</th><th style={{width:80}}></th></tr>
          </thead>
          <tbody>
            {DD_CHECKLIST.map(section => (
              <React.Fragment key={section.section}>
                <tr className="section">
                  <td colSpan={6}>{section.section} · {section.items.length} items</td>
                </tr>
                {section.items.map(it => {
                  const o = personOf(it.owner);
                  return (
                    <tr key={it.id}>
                      <td className="mono muted">{it.id}</td>
                      <td>{it.title}</td>
                      <td><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Avatar person={o}/> {o.name.split(' ')[0]}</span></td>
                      <td className="mono muted">{it.due}</td>
                      <td><Pill tone={statusTone(it.status)}>{statusLabel(it.status)}</Pill></td>
                      <td><button className="btn ghost sm" type="button"><Icon name="more" size={12}/></button></td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DealTasks({ deal }) {
  const tasks = TASKS.filter(t => t.deal === deal.id).concat(TASKS.slice(0, 3));
  return (
    <div className="drawer-body full">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h3 style={{margin:0,fontSize:16,fontWeight:600}}>Tasks</h3>
        <button className="btn primary" type="button"><Icon name="plus" size={13}/> New task</button>
      </div>
      <div className="card">
        <div className="list">
          {tasks.map(t => {
            const o = personOf(t.owner);
            return (
              <div key={t.id + Math.random()} className="list-row">
                <input type="checkbox" defaultChecked={t.status === 'done'}/>
                <div className="grow">
                  <div className="ttl">{t.title}</div>
                  <div className="sub"><span className="mono">{t.deal}</span> · due {t.due}</div>
                </div>
                <Pill tone={t.priority === 'high' ? 'red' : t.priority === 'med' ? 'amber' : 'gray'}>{t.priority.toUpperCase()}</Pill>
                <Avatar person={o}/>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function representedClientForDeal(deal, co) {
  const primary = co || companyOf(deal.company) || {};
  return {
    id: 'client-' + deal.id.toLowerCase(),
    name: deal.clientName || primary.clientName || primary.name || 'Represented client',
    company: deal.clientCompany || primary.name || deal.company || 'Client',
    email: deal.clientEmail || primary.clientEmail || '',
    phone: deal.clientPhone || primary.clientPhone || '',
    relationship: deal.relationshipType || 'Represented client',
    portalStatus: deal.clientPortalStatus || (deal.stage === 'lead' || deal.stage === 'qualify' ? 'Prepared' : 'Active'),
    accessLevel: 'Deal status, approved documents, meetings, visible updates',
    nextVisibleUpdate: deal.stage === 'close' ? 'Closing package and signature tracker' : 'Deal status and next milestone',
  };
}

function DealClientPortal({ deal, co, owner }) {
  const client = representedClientForDeal(deal, co);
  const visibleDocs = DOCUMENTS.filter(d => d.deal === deal.id).slice(0, 4);
  const stage = stageOf(deal.stage);

  return (
    <div className="drawer-body full">
      <div style={{display:'grid',gridTemplateColumns:'1.2fr .8fr',gap:14}}>
        <div className="card">
          <div className="card-h">
            <div>
              <div className="ttl">Client representation</div>
              <div className="sub">This deal shows who ADGA represents and what the client can see.</div>
            </div>
            <Pill tone={client.portalStatus === 'Active' ? 'green' : 'amber'}>{client.portalStatus}</Pill>
          </div>
          <div className="card-b">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <dl className="kv">
                <dt>Client</dt><dd>{client.name}</dd>
                <dt>Relationship</dt><dd>{client.relationship}</dd>
                <dt>Email</dt><dd className="mono text-xs">{client.email || 'Not captured'}</dd>
                <dt>Phone</dt><dd className="mono text-xs">{client.phone || 'Not captured'}</dd>
              </dl>
              <dl className="kv">
                <dt>Deal</dt><dd>{deal.name}</dd>
                <dt>Current stage</dt><dd>{stage.name}</dd>
                <dt>Owner</dt><dd><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Avatar person={owner}/> {owner.name}</span></dd>
                <dt>Target close</dt><dd className="mono text-xs">{deal.close}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><div className="ttl">Client portal</div></div>
          <div className="card-b" style={{display:'flex',flexDirection:'column',gap:10}}>
            <div className="field"><label>Portal link</label><input readOnly value={`https://adga.ai/suite/client/${deal.id.toLowerCase()}`}/></div>
            <div className="text-sm muted">{client.accessLevel}</div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn primary" type="button"><Icon name="send" size={13}/> Invite client</button>
              <button className="btn" type="button"><Icon name="eye" size={13}/> Preview</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><div className="ttl">What the client sees</div></div>
          <div className="card-b" style={{padding:0}}>
            {[
              ['Deal status', stage.name],
              ['Next milestone', client.nextVisibleUpdate],
              ['Meeting link', 'Available after scheduling'],
              ['Open requests', 'Visible requests only'],
              ['Approved files', `${visibleDocs.length} documents`],
            ].map(([label, value]) => (
              <div key={label} className="list-row">
                <div className="grow"><div className="ttl">{label}</div><div className="sub">{value}</div></div>
                <Pill tone="blue" noDot>Client-visible</Pill>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><div className="ttl">Visibility rules</div></div>
          <div className="card-b" style={{display:'flex',flexDirection:'column',gap:8,fontSize:13}}>
            <label style={{display:'flex',gap:8,alignItems:'flex-start'}}><input type="checkbox" defaultChecked/><span>Internal notes stay private unless marked client-visible.</span></label>
            <label style={{display:'flex',gap:8,alignItems:'flex-start'}}><input type="checkbox" defaultChecked/><span>Voice notes and transcripts attach to the deal before agents summarize them.</span></label>
            <label style={{display:'flex',gap:8,alignItems:'flex-start'}}><input type="checkbox" defaultChecked/><span>Client updates write back to the deal timeline.</span></label>
          </div>
        </div>
      </div>
    </div>
  );
}

function DealCommunicationCenter({ deal, co }) {
  const client = representedClientForDeal(deal, co);
  const [internalDraft, setInternalDraft] = React.useState('');
  const [clientMessage, setClientMessage] = React.useState(`Hi ${client.name}, here is the latest update on ${deal.name}.`);
  const [internalResult, setInternalResult] = React.useState(null);
  const [clientResult, setClientResult] = React.useState(null);
  const [voiceResult, setVoiceResult] = React.useState(null);
  const [busy, setBusy] = React.useState('');

  const createMessage = async ({ audience, channel, body, visibility }) => {
    setBusy(audience + channel);
    try {
      const response = await fetch('/api/deal-communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          resource_type: 'deal',
          resource_id: deal.id,
          audience,
          channel,
          body,
          visibility,
          title: audience === 'client' ? 'Client update' : 'Internal team update',
        }),
      });
      return await response.json();
    } finally {
      setBusy('');
    }
  };

  const postInternal = async (event) => {
    event.preventDefault();
    const result = await createMessage({
      audience: 'internal',
      channel: 'note',
      body: internalDraft,
      visibility: 'internal',
    });
    setInternalResult(result);
    if (result.ok) setInternalDraft('');
  };

  const sendClientSms = async (event) => {
    event.preventDefault();
    setBusy('clientsms');
    try {
      const smsResponse = await fetch('/api/messages/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client.phone,
          message: clientMessage,
          resource_type: 'deal',
          resource_id: deal.id,
        }),
      });
      const sms = await smsResponse.json();
      const message = await createMessage({
        audience: 'client',
        channel: 'sms',
        body: clientMessage,
        visibility: 'client_visible',
      });
      setClientResult({ sms, message });
    } finally {
      setBusy('');
    }
  };

  const uploadVoice = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set('resource_type', 'deal');
    form.set('resource_id', deal.id);
    if (!form.get('title')) form.set('title', `Deal voice note for ${deal.id}`);
    setBusy('voice');
    try {
      const response = await fetch('/api/voice-notes', { method: 'POST', body: form });
      const voice = await response.json();
      await createMessage({
        audience: form.get('audience') || 'internal',
        channel: 'voice',
        body: `Voice note attached: ${form.get('title') || deal.id}`,
        visibility: form.get('audience') === 'client' ? 'client_visible' : 'internal',
      });
      setVoiceResult(voice);
      event.currentTarget.reset();
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="drawer-body full">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div className="card">
          <div className="card-h">
            <div><div className="ttl">Internal team lane</div><div className="sub">Private notes, mentions, calls, and agent summaries for the deal team.</div></div>
            <Pill tone="gray" noDot>Internal</Pill>
          </div>
          <form className="card-b" onSubmit={postInternal} style={{display:'flex',flexDirection:'column',gap:10}}>
            <textarea value={internalDraft} onChange={e => setInternalDraft(e.target.value)} rows={6} placeholder="Post an internal update, decision, blocker, or call note..." required/>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button className="btn" type="button"><Icon name="users" size={13}/> @ Team</button>
              <button className="btn" type="button"><Icon name="phone" size={13}/> Log call</button>
              <div style={{flex:1}}/>
              <button className="btn primary" type="submit" disabled={busy === 'internalnote'}>{busy === 'internalnote' ? 'Saving...' : 'Save to deal'}</button>
            </div>
            {internalResult?.message && <div className="text-xs muted">Saved to {internalResult.message.resource_id} as {internalResult.message.visibility}.</div>}
          </form>
        </div>

        <div className="card">
          <div className="card-h">
            <div><div className="ttl">Client lane</div><div className="sub">Client-visible updates and outbound messages tied to this represented client.</div></div>
            <Pill tone="blue" noDot>{client.name}</Pill>
          </div>
          <form className="card-b" onSubmit={sendClientSms} style={{display:'flex',flexDirection:'column',gap:10}}>
            <div className="field"><label>Client phone</label><input readOnly value={client.phone || 'Not captured'}/></div>
            <textarea value={clientMessage} onChange={e => setClientMessage(e.target.value)} rows={5} required/>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button className="btn" type="button"><Icon name="send" size={13}/> Email update</button>
              <button className="btn" type="button"><Icon name="calendar" size={13}/> Meeting invite</button>
              <div style={{flex:1}}/>
              <button className="btn primary" type="submit" disabled={busy === 'clientsms' || !client.phone}>{busy === 'clientsms' ? 'Sending...' : 'Send SMS'}</button>
            </div>
            {!client.phone && <div className="text-xs muted">Add a client phone number before sending SMS from this deal.</div>}
            {clientResult?.message?.message && <div className="text-xs muted">Client update saved to {deal.id}; SMS status: {clientResult.sms?.sms?.status || 'queued'}.</div>}
          </form>
        </div>

        <div className="card">
          <div className="card-h"><div><div className="ttl">Voice note</div><div className="sub">Attach audio to this deal, transcribe it, then route it to the right lane.</div></div></div>
          <form className="card-b" onSubmit={uploadVoice} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div className="field"><label>Title</label><input name="title" placeholder={`Voice note for ${deal.id}`}/></div>
            <div className="field"><label>Lane</label><select name="audience" defaultValue="internal"><option value="internal">Internal team</option><option value="client">Client-visible</option></select></div>
            <div className="field" style={{gridColumn:'1 / -1'}}><label>Audio</label><input name="audio" type="file" accept="audio/*" required/></div>
            <div style={{gridColumn:'1 / -1',display:'flex',justifyContent:'flex-end'}}><button className="btn primary" type="submit" disabled={busy === 'voice'}>{busy === 'voice' ? 'Processing...' : 'Attach and transcribe'}</button></div>
            {voiceResult?.voice_note && <div className="text-xs muted" style={{gridColumn:'1 / -1'}}>Voice note saved and attached to this deal.</div>}
          </form>
        </div>

        <div className="card">
          <div className="card-h"><div className="ttl">Agent trace</div></div>
          <div className="card-b">
            <dl className="kv">
              <dt>Resource</dt><dd className="mono text-xs">deal:{deal.id}</dd>
              <dt>Internal lane</dt><dd>Private team notes, calls, summaries, blockers</dd>
              <dt>Client lane</dt><dd>Client-visible updates, invites, messages</dd>
              <dt>Files</dt><dd>Documents and voice notes stay attached to this deal.</dd>
              <dt>Follow-up</dt><dd>Prepared workflows keep the next action ready for the team.</dd>
              <dt>Status</dt><dd>Internal and client-facing updates remain separated.</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function DealThread({ deal }) {
  const [draft, setDraft] = React.useState('');
  return (
    <div className="drawer-body full">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <h3 style={{margin:0,fontSize:16,fontWeight:600}}>Discussion</h3>
        <div className="text-xs muted">3 participants · 12 messages</div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="card-b" style={{paddingTop:0,paddingBottom:0}}>
          {COMMENTS.map((c, i) => {
            const p = PEOPLE[i % PEOPLE.length];
            return (
              <div key={i} className="comment">
                <span className={'avatar av-' + c.av}>{c.initials}</span>
                <div className="body">
                  <div className="head">
                    <b>{personOf(c.who).name}</b>
                    <span className="t">· {c.time}</span>
                  </div>
                  <div className="text">
                    {c.text.split(/(@\w+)/).map((part, j) =>
                      part.startsWith('@') ? <span key={j} className="mention">{part}</span> : <React.Fragment key={j}>{part}</React.Fragment>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-b">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Write a comment, use @ to mention…"
            style={{width:'100%',border:0,outline:'none',resize:'vertical',background:'transparent',color:'var(--text)',fontSize:13,minHeight:60}}
          />
          <div style={{display:'flex',gap:6,marginTop:8}}>
            <button className="btn ghost sm" type="button"><Icon name="paperclip" size={12}/> Attach</button>
            <button className="btn ghost sm" type="button">@ Mention</button>
            <div style={{flex:1}}/>
            <button className="btn primary sm" type="button"><Icon name="send" size={12}/> Post</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DealAudit({ deal }) {
  const rows = [
    { t: 'May 20 · 09:14', who: 'Maren Voss',   action: 'Opened deal room', ip: '10.42.x.x', sev: 'info' },
    { t: 'May 20 · 09:02', who: 'Hana Okafor',  action: 'Approved DD item L-01', ip: '10.42.x.x', sev: 'info' },
    { t: 'May 20 · 08:51', who: 'Theo Lange',   action: 'Uploaded "Cap Table — Tessellate.xlsx"', ip: '10.42.x.x', sev: 'info' },
    { t: 'May 19 · 18:33', who: 'External (Sutter counsel)', action: 'Viewed §4.3 redline', ip: '203.0.x.x', sev: 'warn' },
    { t: 'May 19 · 17:20', who: 'Maren Voss',   action: 'Granted access to external user', ip: '10.42.x.x', sev: 'warn' },
    { t: 'May 19 · 16:08', who: 'Jules Mendez', action: 'Moved deal Negotiation → Closing', ip: '10.42.x.x', sev: 'info' },
    { t: 'May 19 · 14:55', who: 'Hana Okafor',  action: 'Flagged DD item L-03', ip: '10.42.x.x', sev: 'warn' },
    { t: 'May 19 · 12:01', who: 'Dario Kett',   action: 'Edited definitive agreement v2', ip: '10.42.x.x', sev: 'info' },
  ];
  return (
    <div className="drawer-body full">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h3 style={{margin:0,fontSize:16,fontWeight:600}}>Audit trail</h3>
        <div style={{display:'flex',gap:6}}>
          <button className="btn" type="button"><Icon name="filter" size={13}/> Filter</button>
          <button className="btn" type="button"><Icon name="download" size={13}/> Export</button>
        </div>
      </div>
      <div className="card">
        <div className="audit-row h">
          <span>Timestamp</span><span>Action</span><span>Source IP</span><span>Severity</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="audit-row">
            <span className="mono muted">{r.t}</span>
            <span><b>{r.who}</b> · {r.action}</span>
            <span className="mono muted">{r.ip}</span>
            <span><Pill tone={r.sev === 'warn' ? 'amber' : 'blue'}>{r.sev === 'warn' ? 'Warning' : 'Info'}</Pill></span>
          </div>
        ))}
      </div>
    </div>
  );
}


/* Leads + CRM modules */

function LeadsPageLegacy({ openDeal }) {
  const tone = s => s === 'hot' ? 'red' : s === 'warm' ? 'amber' : 'gray';
  const intent = s => s === 'high' ? 'High' : s === 'med' ? 'Medium' : 'Low';

  const hot = LEADS.filter(l => l.status === 'hot').length;
  const warm = LEADS.filter(l => l.status === 'warm').length;
  const totalPipe = LEADS.reduce((s,l) => s + l.value, 0);

  return (
    <>
      <div className="page-h">
        <div><h1>Leads</h1><div className="sub">{LEADS.length} active · {hot} hot · estimated pipeline ${compactNum(totalPipe)}</div></div>
        <div className="page-actions">
          <div className="seg">
            <button className="active" type="button">All</button>
            <button type="button">Hot ({hot})</button>
            <button type="button">Warm ({warm})</button>
            <button type="button">Unqualified</button>
          </div>
          <button className="btn" type="button"><Icon name="filter" size={13}/></button>
          <button className="btn" type="button"><Icon name="upload" size={13}/> Import CSV</button>
          <button className="btn primary" type="button"><Icon name="plus" size={13}/> New lead</button>
        </div>
      </div>

      <div className="kpis">
        <KPI label="New this week" value="14" delta={<><Icon name="arrow-up" size={11}/> +3</>} deltaTone="up"/>
        <KPI label="Conversion (30d)" value="22.4%" delta={<><Icon name="arrow-up" size={11}/> +1.8 pp</>} deltaTone="up"/>
        <KPI label="Avg. lead score" value="68" delta={<><Icon name="arrow-up" size={11}/> +4</>} deltaTone="up"/>
        <KPI label="Avg. response time" value="2h 14m" delta={<><Icon name="arrow-dn" size={11}/> -38m</>} deltaTone="up"/>
      </div>

      <div className="filterbar">
        <button className="chip applied" type="button">Score ≥ 60 <Icon name="x" size={10} className="x"/></button>
        <button className="chip" type="button"><Icon name="plus" size={10}/> Channel</button>
        <button className="chip" type="button"><Icon name="plus" size={10}/> Sector</button>
        <button className="chip" type="button"><Icon name="plus" size={10}/> Owner</button>
        <span style={{marginLeft:'auto',fontSize:11,color:'var(--text-3)'}} className="mono">Ranked by score · descending</span>
      </div>

      <div style={{flex:1,overflowY:'auto'}}>
        {LEADS.sort((a,b) => b.score - a.score).map(l => (
          <div key={l.id} className="lead-card">
            <ScoreRingLegacy score={l.score}/>
            <div style={{display:'flex',gap:14,flex:1,minWidth:0,alignItems:'center'}}>
              <div style={{minWidth:170,flex:'0 0 220px'}}>
                <b style={{fontSize:13.5}}>{l.name}</b>
                <div className="text-xs muted">{l.title}</div>
              </div>
              <div style={{minWidth:170,flex:1}}>
                <div style={{fontSize:13}}>{l.company}</div>
                <div className="text-xs muted">{l.sector}</div>
              </div>
              <div style={{flex:1,display:'flex',alignItems:'center',gap:12}}>
                <Pill tone={tone(l.status)}>{l.status.toUpperCase()}</Pill>
                <Pill tone={l.intent === 'high' ? 'violet' : l.intent === 'med' ? 'blue' : 'gray'} noDot>{intent(l.intent)} intent</Pill>
                <span className="tag">{l.channel}</span>
              </div>
              <div className="text-xs muted mono" style={{minWidth:80,textAlign:'right'}}>{l.last}</div>
              <div className="mono" style={{minWidth:90,textAlign:'right',fontWeight:500}}>${compactNum(l.value)}</div>
            </div>
            <div style={{display:'flex',gap:4}}>
              <button className="btn ghost sm" type="button" title="Email"><Icon name="send" size={12}/></button>
              <button className="btn ghost sm" type="button" title="Call"><Icon name="phone" size={12}/></button>
              <button className="btn primary sm" type="button">Convert</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ScoreRingLegacy({ score }) {
  const radius = 14;
  const C = 2 * Math.PI * radius;
  const off = C - (score / 100) * C;
  const color = score >= 75 ? 'var(--status-green)' :
                score >= 50 ? 'var(--status-amber)' :
                'var(--status-red)';
  return (
    <div className="score-ring">
      <svg viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="3"/>
        <circle cx="18" cy="18" r={radius} fill="none" stroke={color} strokeWidth="3" strokeDasharray={C} strokeDashoffset={off} strokeLinecap="round"/>
      </svg>
      <div className="v">{score}</div>
    </div>
  );
}

function CRMPage({ openDeal, deals }) {
  const [tab, setTab] = React.useState('companies');
  return (
    <>
      <div className="page-h">
        <div><h1>Contacts & Companies</h1><div className="sub">{COMPANIES.length} companies · 84 contacts · 12 relationships</div></div>
        <div className="page-actions">
          <button className="btn" type="button"><Icon name="upload" size={13}/> Import</button>
          <button className="btn primary" type="button"><Icon name="plus" size={13}/> New record</button>
        </div>
      </div>
      <div className="tabs">
        <button className={'tab ' + (tab==='companies'?'active':'')} type="button" onClick={()=>setTab('companies')}>Companies <span className="muted">· {COMPANIES.length}</span></button>
        <button className={'tab ' + (tab==='contacts'?'active':'')} type="button" onClick={()=>setTab('contacts')}>Contacts <span className="muted">· 84</span></button>
        <button className={'tab ' + (tab==='relationships'?'active':'')} type="button" onClick={()=>setTab('relationships')}>Relationships</button>
      </div>

      {tab === 'companies' && <CRMCompanies deals={deals} openDeal={openDeal}/>}
      {tab === 'contacts' && <CRMContacts/>}
      {tab === 'relationships' && <CRMRelationships/>}
    </>
  );
}

function CRMCompanies({ deals, openDeal }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr><th></th><th>Company</th><th>Sector</th><th>HQ</th><th>Employees</th><th>Open deals</th><th className="num">Pipeline value</th><th>Owner</th><th>Last touch</th></tr>
        </thead>
        <tbody>
          {COMPANIES.map((c, i) => {
            const cDeals = deals.filter(d => d.company === c.id);
            const val = cDeals.reduce((s,d) => s + d.value, 0);
            const owner = personOf(PEOPLE[i % PEOPLE.length].id);
            return (
              <tr key={c.id} style={{cursor:'pointer'}} onClick={() => cDeals[0] && openDeal(cDeals[0])}>
                <td><span className={'avatar av-' + (i % 8)}>{c.logo}</span></td>
                <td><b>{c.name}</b></td>
                <td><span className="tag">{c.sector}</span></td>
                <td className="muted">{c.hq}</td>
                <td className="num">{c.emp}</td>
                <td>{cDeals.length > 0 ? <span className="mono">{cDeals.length}</span> : <span className="muted">—</span>}</td>
                <td className="num">{val > 0 ? '$' + compactNum(val) : <span className="muted">—</span>}</td>
                <td><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Avatar person={owner}/> {owner.name.split(' ')[0]}</span></td>
                <td className="muted">{i < 4 ? Math.floor(Math.random() * 6 + 1) + 'h ago' : (i % 7 + 1) + 'd ago'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CRMContacts() {
  const contacts = [
    { name: 'Aurore Chastain',  title: 'Head of Corp Dev',         company: 'Sutter Maritime',         email: 'aurore.c@sutter.co',   phone: '+1 312 555 0184', last: '2h' },
    { name: 'Magnus Bell',      title: 'CFO',                       company: 'Quorum Energy',           email: 'mbell@quorum.energy',  phone: '+1 403 555 0029', last: '4d' },
    { name: 'Linnea Bjorne',    title: 'Founder & CEO',             company: 'Stellaris Compute',       email: 'lb@stellaris.io',      phone: '+46 8 555 0042',  last: '8h' },
    { name: 'K. Senthil',       title: 'Managing Partner',          company: 'Larkfield Capital',       email: 'senthil@larkfield.sg', phone: '+65 6 555 0111',  last: '1d' },
    { name: 'Pieter Voorhees',  title: 'Director, Partnerships',    company: 'Calderwood Health',       email: 'pieter@calderwood.io', phone: '+1 415 555 0202', last: '1d' },
    { name: 'Hannelore Vogt',   title: 'General Counsel',           company: 'Ostern Foods',            email: 'h.vogt@ostern.de',     phone: '+49 40 555 0388', last: '3d' },
    { name: 'Marcos Quinteros', title: 'GM, Defense Programs',      company: 'Ironhold Systems',        email: 'mq@ironhold.us',       phone: '+1 256 555 0144', last: '4d' },
    { name: 'Atsuko Voorman',   title: 'COO',                       company: 'Pelagic Labs',            email: 'atsuko@pelagic.bio',   phone: '+1 619 555 0177', last: '8h' },
    { name: 'Dimitrov Reyes',   title: 'Head of M&A',               company: 'Cantilever Group',        email: 'dreyes@cantilever.co', phone: '+1 212 555 0098', last: '1d' },
    { name: 'Tane Whitaker',    title: 'VP Engineering',            company: 'Tessellate Robotics',     email: 't.whitaker@tess.ai',   phone: '+1 412 555 0061', last: '9h' },
    { name: 'Saskia Krieg',     title: 'Managing Partner',          company: 'Brunswick Spectrum LP',   email: 'skrieg@brunswick.lp',  phone: '+44 20 555 0233', last: '6d' },
    { name: 'Roan Iwasaki',     title: 'VP Corporate Development',  company: 'Telluride Aerospace',     email: 'roan@telluride.ae',    phone: '+1 970 555 0119', last: '2d' },
  ];
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr><th></th><th>Name</th><th>Title</th><th>Company</th><th>Email</th><th>Phone</th><th>Last contact</th><th></th></tr>
        </thead>
        <tbody>
          {contacts.map((c, i) => (
            <tr key={c.email}>
              <td><span className={'avatar av-' + (i % 8)}>{c.name.split(' ').map(p => p[0]).join('')}</span></td>
              <td><b>{c.name}</b></td>
              <td className="muted">{c.title}</td>
              <td>{c.company}</td>
              <td className="mono text-xs">{c.email}</td>
              <td className="mono text-xs">{c.phone}</td>
              <td className="muted">{c.last} ago</td>
              <td><button className="btn ghost sm" type="button"><Icon name="more" size={12}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CRMRelationships() {
  // Simple network graph using SVG
  return (
    <div style={{padding:'16px 24px 24px',overflow:'auto',flex:1}}>
      <div className="card" style={{padding:'18px 20px',marginBottom:14}}>
        <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
          <div>
            <h3 style={{margin:'0 0 4px',fontSize:16,fontWeight:600}}>Relationship graph</h3>
            <div className="text-sm muted">How your team is connected to deal counterparties</div>
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            <button className="btn" type="button"><Icon name="filter" size={13}/> Filter</button>
            <button className="btn" type="button"><Icon name="download" size={13}/> Export</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{height:480,position:'relative',background:'var(--surface-2)'}}>
          <svg width="100%" height="100%" viewBox="0 0 800 480">
            {/* Edges */}
            {[
              [400,240, 200,120],[400,240, 230,260],[400,240, 220,380],
              [400,240, 600,120],[400,240, 590,260],[400,240, 600,380],
              [400,240, 380,80],[400,240, 380,420],
            ].map(([x1,y1,x2,y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border-strong)" strokeWidth="1"/>
            ))}
            {/* Center node */}
            <g transform="translate(400 240)">
              <circle r="36" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5"/>
              <text textAnchor="middle" dy="4" fontSize="12" fontWeight="600" fill="var(--text)">You</text>
              <text textAnchor="middle" dy="18" fontSize="10" fill="var(--text-3)">Maren Voss</text>
            </g>
            {/* Outer nodes */}
            {[
              {x:200,y:120,l:'Sutter Maritime',s:'2 contacts'},
              {x:230,y:260,l:'Quorum Energy',s:'4 contacts'},
              {x:220,y:380,l:'Halcyon Payments',s:'1 contact'},
              {x:600,y:120,l:'Tessellate',s:'3 contacts'},
              {x:590,y:260,l:'Bramble & Co.',s:'2 contacts'},
              {x:600,y:380,l:'Albatross Bio',s:'1 contact'},
              {x:380,y:80,l:'Stellaris Compute',s:'1 contact'},
              {x:380,y:420,l:'Larkfield Capital',s:'2 contacts'},
            ].map((n, i) => (
              <g key={i} transform={`translate(${n.x} ${n.y})`}>
                <circle r="26" fill="var(--surface)" stroke="var(--border-strong)"/>
                <text textAnchor="middle" dy="2" fontSize="10" fontWeight="500" fill="var(--text)">{n.l.slice(0,12)}</text>
                <text textAnchor="middle" dy="14" fontSize="9" fill="var(--text-3)">{n.s}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}



/* Documents library page (global view) */

function DocumentsPage({ deals, openDeal }) {
  const [view, setView] = React.useState('grid');
  const [folder, setFolder] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [recordFilter, setRecordFilter] = React.useState('all');
  const [uploadDealId, setUploadDealId] = React.useState(deals[0]?.id || '');
  const [selectedDoc, setSelectedDoc] = React.useState(null);
  const [uploads, setUploads] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const contactsByCompany = {
    c1: 'Ingrid Veen · CFO',
    c2: 'Dalia North · General Counsel',
    c3: 'K. Senthil · Managing Partner',
    c4: 'Aurore Chastain · Head of Corp Dev',
    c7: 'Magnus Bell · CFO',
    c8: 'Marcos Quinteros · GM, Defense Programs',
    c12: 'Tane Whitaker · VP Engineering',
    c13: 'Nora Vale · COO',
    c15: 'Mira Bramble · Founder',
  };
  const folderFor = (doc) => {
    const name = doc.name.toLowerCase();
    if (name.includes('loi') || name.includes('nda') || name.includes('agreement') || name.includes('term sheet')) return 'legal';
    if (name.includes('model') || name.includes('cap table') || name.includes('cim')) return 'financial';
    if (name.includes('deck') || name.includes('summary')) return 'commercial';
    if (name.includes('ip')) return 'diligence';
    return 'general';
  };
  const hydrateDoc = (doc, index) => {
    const deal = deals.find(x => x.id === doc.deal) || deals[index % Math.max(deals.length, 1)];
    const company = deal ? companyOf(deal.company) : null;
    const owner = personOf(doc.owner) || PEOPLE[0];
    const docFolder = doc.folder || folderFor(doc);
    return {
      ...doc,
      deal,
      dealId: deal?.id || doc.deal || 'Unassigned',
      company,
      owner,
      folder: docFolder,
      contact: company ? (contactsByCompany[company.id] || `${company.name} contact`) : 'Unassigned contact',
      storage: doc.storage || { visibility: 'workspace', bucket: 'documents' },
      status: doc.signed ? 'Signed' : docFolder === 'legal' ? 'Needs review' : 'Stored',
    };
  };

  const uploadFiles = async (files) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    setUploading(true);
    try {
      const completed = [];
      for (const file of selected) {
        const form = new FormData();
        form.append('file', file);
        form.append('deal_id', uploadDealId);
        const uploadDeal = deals.find(d => d.id === uploadDealId);
        if (uploadDeal) {
          const company = companyOf(uploadDeal.company);
          form.append('company_id', uploadDeal.company);
          form.append('company_name', company?.name || '');
          form.append('contact_name', company ? (contactsByCompany[company.id] || `${company.name} contact`) : '');
        }
        form.append('folder', folder === 'all' ? 'general' : folder);
        const response = await fetch('/api/documents/upload', { method: 'POST', body: form });
        if (response.ok) {
          const data = await response.json();
          completed.push({
            id: data.document?.id || data.storage_object?.id || file.name,
            name: file.name,
            ext: (file.name.split('.').pop() || 'file').toLowerCase(),
            size: file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`,
            updated: 'Just now',
            owner: 'p1',
            deal: uploadDealId || data.document?.id || 'Upload',
            folder: folder === 'all' ? 'general' : folder,
            signed: false,
            storage: data.storage_object,
          });
        }
      }
      setUploads(prev => [...completed, ...prev]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const rows = [].concat(uploads, DOCUMENTS).map(hydrateDoc);
  const totalSizeMb = rows.reduce((sum, doc) => {
    const raw = String(doc.size || '');
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return sum;
    return sum + (raw.toLowerCase().includes('kb') ? n / 1024 : n);
  }, 0);
  const folderCounts = rows.reduce((acc, doc) => ({ ...acc, [doc.folder]: (acc[doc.folder] || 0) + 1 }), {});
  const filteredRows = rows.filter(doc => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [
      doc.name,
      doc.ext,
      doc.dealId,
      doc.deal?.name,
      doc.company?.name,
      doc.contact,
      doc.owner?.name,
      doc.folder,
      doc.status,
    ].filter(Boolean).some(value => String(value).toLowerCase().includes(q));
    const matchesFolder = folder === 'all' || (folder === 'esign' ? doc.status === 'Signed' || doc.status === 'Needs review' : doc.folder === folder);
    const matchesRecord = recordFilter === 'all' || doc.dealId === recordFilter || doc.company?.id === recordFilter;
    return matchesQuery && matchesFolder && matchesRecord;
  });
  const selected = selectedDoc || filteredRows[0] || rows[0];

  return (
    <>
      <div className="page-h">
        <div><h1>Documents</h1><div className="sub">{rows.length} files across {deals.length} deal rooms · tied to accounts, contacts, and deal records</div></div>
        <div className="page-actions">
          <div className="seg">
            <button className={view==='grid'?'active':''} type="button" onClick={()=>setView('grid')}><Icon name="kanban" size={12}/> Grid</button>
            <button className={view==='list'?'active':''} type="button" onClick={()=>setView('list')}><Icon name="table" size={12}/> List</button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(event) => uploadFiles(event.target.files)}
          />
          <button className="btn primary" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Icon name="upload" size={13}/> {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      <div className="doc-center-shell">
        <div className="doc-search-panel">
          <label className="doc-search">
            <Icon name="search" size={14}/>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents, accounts, contacts, deals, owners..." />
          </label>
          <select value={recordFilter} onChange={(e) => setRecordFilter(e.target.value)} aria-label="Filter by linked record">
            <option value="all">All accounts and deals</option>
            {COMPANIES.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
            {deals.map(deal => <option key={deal.id} value={deal.id}>{deal.id} · {deal.name.split(' — ')[0]}</option>)}
          </select>
        </div>

        <div className="doc-library-summary">
          <div><span>{rows.length}</span><small>stored files</small></div>
          <div><span>{COMPANIES.length}</span><small>linked accounts</small></div>
          <div><span>{Object.values(folderCounts).filter(Boolean).length}</span><small>library folders</small></div>
          <div><span>{totalSizeMb.toFixed(1)} MB</span><small>indexed storage</small></div>
        </div>

        <div className="doc-upload-panel">
          <div>
            <b>Upload to a record</b>
            <span>Files are stored in the document library and attached to the selected deal, account, and contact context.</span>
          </div>
          <select value={uploadDealId} onChange={(e) => setUploadDealId(e.target.value)} aria-label="Attach upload to deal">
            {deals.map(deal => {
              const company = companyOf(deal.company);
              return <option key={deal.id} value={deal.id}>{deal.id} · {company?.name || deal.name}</option>;
            })}
          </select>
          <button className="btn" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Icon name="upload" size={13}/> Select files
          </button>
        </div>
      </div>

      <div className="filterbar">
        <button className={'chip ' + (folder === 'all' ? 'applied' : '')} type="button" onClick={()=>setFolder('all')}>All files <span>{rows.length}</span></button>
        <button className={'chip ' + (folder === 'commercial' ? 'applied' : '')} type="button" onClick={()=>setFolder('commercial')}>CIMs & decks <span>{folderCounts.commercial || 0}</span></button>
        <button className={'chip ' + (folder === 'legal' ? 'applied' : '')} type="button" onClick={()=>setFolder('legal')}>Legal</button>
        <button className={'chip ' + (folder === 'financial' ? 'applied' : '')} type="button" onClick={()=>setFolder('financial')}>Financial</button>
        <button className={'chip ' + (folder === 'diligence' ? 'applied' : '')} type="button" onClick={()=>setFolder('diligence')}>Diligence</button>
        <button className={'chip ' + (folder === 'esign' ? 'applied' : '')} type="button" onClick={()=>setFolder('esign')}>Awaiting e-sign</button>
        <span style={{marginLeft:'auto',fontSize:11,color:'var(--text-3)'}} className="mono">{filteredRows.length} visible · R2 document bucket + metadata index</span>
      </div>

      <div className="doc-library-layout">
        <div className="doc-library-main">
          {view === 'grid' ? (
            <div className="docs-grid">
              {filteredRows.map((d, i) => {
            return (
              <div key={d.id + '-' + i} className={'doc-card ' + (selected?.id === d.id ? 'selected' : '')} onClick={() => {
                setSelectedDoc(d);
              }}>
                <div className="doc-thumb">
                  <span className="ext">{d.ext.toUpperCase()}</span>
                  <div className="lines"><i/><i/><i/><i/><i/><i/><i/></div>
                </div>
                <div className="doc-info">
                  <div className="doc-name">{d.name}</div>
                  <div className="doc-record">{d.company?.name || 'Unassigned account'} · {d.contact}</div>
                  <div className="doc-meta">
                    <Avatar person={d.owner}/>
                    <span>{d.owner.name.split(' ')[0]}</span>
                    <span style={{opacity:.5}}>·</span>
                    <span>{d.updated}</span>
                  </div>
                  <div style={{display:'flex',gap:6,marginTop:4}}>
                    <Pill tone={d.status === 'Signed' ? 'green' : d.status === 'Needs review' ? 'amber' : 'blue'}>{d.status}</Pill>
                    <span className="mono text-xs muted" style={{marginLeft:'auto'}}>{d.dealId}</span>
                  </div>
                </div>
              </div>
            );
              })}
            </div>
          ) : (
            <div className="tbl-wrap doc-table-wrap">
              <table className="tbl">
                <thead>
                  <tr><th></th><th>Name</th><th>Account / contact</th><th>Deal</th><th>Owner</th><th>Folder</th><th className="num">Size</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {filteredRows.map((d, i) => {
                return (
                  <tr key={d.id + i} onClick={() => setSelectedDoc(d)} style={{cursor:'pointer'}}>
                    <td><Icon name="file" size={15}/></td>
                    <td><b>{d.name}</b></td>
                    <td><b>{d.company?.name || 'Unassigned'}</b><div className="text-xs muted">{d.contact}</div></td>
                    <td className="mono">{d.dealId}</td>
                    <td><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Avatar person={d.owner}/> {d.owner.name.split(' ')[0]}</span></td>
                    <td><span className="tag">{d.folder}</span></td>
                    <td className="num">{d.size}</td>
                    <td><Pill tone={d.status === 'Signed' ? 'green' : d.status === 'Needs review' ? 'amber' : 'blue'}>{d.status}</Pill></td>
                  </tr>
                );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="doc-detail-panel">
          {selected ? (
            <>
              <div className="doc-preview">
                <span className="ext">{selected.ext.toUpperCase()}</span>
                <div className="lines"><i/><i/><i/><i/><i/></div>
              </div>
              <h3>{selected.name}</h3>
              <dl className="kv">
                <dt>Stored in</dt><dd>Document Library / {selected.folder}</dd>
                <dt>Account</dt><dd>{selected.company?.name || 'Unassigned'}</dd>
                <dt>Contact</dt><dd>{selected.contact}</dd>
                <dt>Deal</dt><dd className="mono">{selected.dealId}</dd>
                <dt>Owner</dt><dd>{selected.owner.name}</dd>
                <dt>Storage</dt><dd>{selected.storage?.bucket || 'documents'} · {selected.storage?.visibility || 'workspace'}</dd>
              </dl>
              <div className="doc-detail-actions">
                <button className="btn primary" type="button" onClick={() => selected.deal && openDeal(selected.deal)}><Icon name="eye" size={13}/> Open record</button>
                <button className="btn" type="button"><Icon name="download" size={13}/> Download</button>
              </div>
            </>
          ) : (
            <div className="text-sm muted">Select a document to see account, contact, deal, and storage details.</div>
          )}
        </aside>
      </div>
    </>
  );
}

function KnowledgePage() {
  const [filter, setFilter] = React.useState('all');
  const filtered = filter === 'all' ? KNOWLEDGE : KNOWLEDGE.filter(k => k.tag.toLowerCase() === filter);

  return (
    <>
      <div className="page-h">
        <div><h1>Knowledge Hub</h1><div className="sub">Playbooks, templates, and SOPs your team uses to close deals consistently</div></div>
        <div className="page-actions">
          <button className="btn" type="button"><Icon name="search" size={13}/> Search articles</button>
          <button className="btn primary" type="button"><Icon name="plus" size={13}/> New article</button>
        </div>
      </div>

      <div className="filterbar">
        {['all','playbook','template','sop','reference','compliance'].map(f => (
          <button key={f} className={'chip ' + (filter === f ? 'applied' : '')} type="button" onClick={()=>setFilter(f)}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{marginLeft:'auto',fontSize:11,color:'var(--text-3)'}} className="mono">{filtered.length} articles</span>
      </div>

      <div className="kb-grid">
        {filtered.map((k, i) => (
          <div key={k.title} className="kb-card">
            <div className="kb-tag">{k.tag}</div>
            <div className="kb-title">{k.title}</div>
            <div className="kb-desc">{k.desc}</div>
            <div className="kb-foot">
              <Icon name="eye" size={11}/> {k.readers} readers
              <span style={{opacity:.5}}>·</span>
              <span>Updated {k.updated}</span>
              <span style={{marginLeft:'auto'}}><Icon name="chevR" size={11}/></span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}



/* Intelligence (forecasting + insights) and Reports */

function IntelligencePage({ deals }) {
  // Build a quick "forecast over 6 months" chart from the data
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const monthData = months.map((m, i) => {
    // Stack: closed (green), expected (accent), at-risk (amber)
    const base = 40 + i * 8 + (i === 2 ? 25 : 0);
    return {
      m,
      closed:  Math.round(base * 0.45),
      expected: Math.round(base * 0.40),
      risk:    Math.round(base * 0.15),
    };
  });
  const max = Math.max(...monthData.map(d => d.closed + d.expected + d.risk));

  return (
    <>
      <div className="page-h">
        <div><h1>Analytics</h1><div className="sub">Forecasting, deal health scoring, conversion analytics, and pipeline risk intelligence</div></div>
        <div className="page-actions">
          <div className="seg">
            <button className="active" type="button">Q2 2026</button>
            <button type="button">Q3 2026</button>
            <button type="button">H2 2026</button>
            <button type="button">Custom</button>
          </div>
          <button className="btn" type="button"><Icon name="download" size={13}/> Export</button>
        </div>
      </div>

      {(() => {
        const active = (deals || []).filter(d => d.stage !== 'won' && d.stage !== 'lost');
        const committed = active.filter(d => (d.prob || 0) >= 70).reduce((s, d) => s + (d.value || 0), 0);
        const best = active.reduce((s, d) => s + (d.value || 0), 0);
        const weighted = active.reduce((s, d) => s + (d.value || 0) * (d.prob || 0) / 100, 0);
        const highProb = active.filter(d => (d.prob || 0) >= 60).length;
        const closed = (deals || []).filter(d => d.stage === 'won').length;
        const lost = (deals || []).filter(d => d.stage === 'lost').length;
        const winRate = (closed + lost) > 0 ? Math.round((closed / (closed + lost)) * 1000) / 10 : 0;
        return (
          <div className="kpis">
            <KPI label="Forecast (committed)" value={'$' + compactNum(committed)} delta={<>Probability ≥ 70%</>} deltaTone="up"/>
            <KPI label="Best case" value={'$' + compactNum(best)} delta={<>{highProb} high-prob deal{highProb === 1 ? '' : 's'}</>} />
            <KPI label="Weighted (probability)" value={'$' + compactNum(weighted)} delta={<>{active.length} active</>} deltaTone="up"/>
            <KPI label="Win rate" value={winRate > 0 ? winRate + '%' : '—'} delta={<>{closed} won · {lost} lost</>} deltaTone={winRate >= 30 ? 'up' : undefined}/>
          </div>
        );
      })()}

      <div style={{display:'grid',gridTemplateColumns:'minmax(0, 1.5fr) minmax(0, 1fr)',gap:14,padding:'0 32px 28px'}}>
        <div className="card">
          <div className="card-h">
            <div className="ttl">Forecast by month <span className="sub">Closed / Expected / At-risk</span></div>
            <div className="seg" style={{padding:1}}>
              <button className="active" type="button">Stacked</button>
              <button type="button">Cumulative</button>
            </div>
          </div>
          <div className="card-b">
            <div className="chart-bars">
              {monthData.map(d => (
                <div key={d.m} className="chart-bar">
                  <div className="stack">
                    <i style={{height: (d.closed / max * 160) + 'px', background:'var(--status-green)'}}/>
                    <i style={{height: (d.expected / max * 160) + 'px', background:'var(--accent)'}}/>
                    <i style={{height: (d.risk / max * 160) + 'px', background:'var(--status-amber)'}}/>
                  </div>
                  <div className="lbl">{d.m}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:14,fontSize:11,color:'var(--text-2)',marginTop:8,justifyContent:'center'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:6}}><i style={{width:8,height:8,background:'var(--status-green)',borderRadius:2,display:'inline-block'}}/> Closed-won</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:6}}><i style={{width:8,height:8,background:'var(--accent)',borderRadius:2,display:'inline-block'}}/> Expected</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:6}}><i style={{width:8,height:8,background:'var(--status-amber)',borderRadius:2,display:'inline-block'}}/> At risk</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><div className="ttl">Deal mix by type</div></div>
          <div className="card-b" style={{display:'flex',gap:18,alignItems:'center',justifyContent:'center'}}>
            <Donut/>
            <div style={{display:'flex',flexDirection:'column',gap:8,fontSize:12}}>
              {[
                ['Acquisition','38%','var(--accent)'],
                ['Capital Raise','24%','var(--status-blue)'],
                ['Partnership','14%','var(--status-cyan)'],
                ['Licensing','12%','var(--status-violet)'],
                ['JV','8%','var(--status-amber)'],
                ['Other','4%','var(--text-3)'],
              ].map(([n,v,c]) => (
                <div key={n} style={{display:'flex',alignItems:'center',gap:8,minWidth:160}}>
                  <i style={{width:8,height:8,background:c,borderRadius:2,display:'inline-block'}}/>
                  <span style={{flex:1}}>{n}</span>
                  <span className="mono muted">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'minmax(0, 1.5fr) minmax(0, 1fr)',gap:14,padding:'0 32px 28px'}}>
        <div className="card">
          <div className="card-h">
            <div className="ttl">Pipeline health <span className="sub">flags & risks</span></div>
            <button className="btn ghost sm" type="button">Run audit →</button>
          </div>
          <div className="card-b" style={{padding:0}}>
            <div className="list">
              <RiskRow deal="Northbound Therapeutics" risk="No activity 9d" sev="amber" rec="Schedule outreach to Dr. Reyes" id="DEAL-1208"/>
              <RiskRow deal="Quorum Energy — JV" risk="Term sheet unsigned 22d" sev="red" rec="Escalate to banker" id="DEAL-1213"/>
              <RiskRow deal="Halcyon Payments — Buyout" risk="DD §4.3 flagged by counsel" sev="amber" rec="Resolve before SC Friday" id="DEAL-1219"/>
              <RiskRow deal="Ostern Foods — Brand acq." risk="Slipping close date by 14d" sev="amber" rec="Update forecast to next Q" id="DEAL-1215"/>
              <RiskRow deal="Polaris Grain — Off-take" risk="Inactive 6d, low engagement" sev="gray" rec="Disposition: park or close" id="DEAL-1217"/>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><div className="ttl">Conversion by stage</div></div>
          <div className="card-b">
            <div style={{display:'flex',flexDirection:'column',gap:10,fontSize:13}}>
              {[
                ['Lead → Qualify', 62, '4'],
                ['Qualify → Discover', 78, '6'],
                ['Discover → Scope', 71, '9'],
                ['Scope → Design', 65, '11'],
                ['Design → Close', 70, '8'],
                ['Close → Sign', 84, '5'],
                ['Sign → Deliver', 96, '2'],
                ['Deliver → Expand', 38, '90'],
              ].map(([l, p, d]) => (
                <div key={l}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span>{l}</span>
                    <span className="mono muted">{p}% · avg {d}d</span>
                  </div>
                  <div className="progress"><i style={{width: p + '%'}}/></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function RiskRow({ deal, risk, sev, rec, id }) {
  return (
    <div className="list-row">
      <div className="grow">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <b>{deal}</b>
          <span className="mono text-xs muted">{id}</span>
          <Pill tone={sev}>{risk}</Pill>
        </div>
        <div className="sub">Recommendation: {rec}</div>
      </div>
      <button className="btn sm" type="button">Action</button>
    </div>
  );
}

function Donut() {
  // Single donut chart with multiple segments
  const segs = [
    { v: 38, c: 'var(--accent)' },
    { v: 24, c: 'var(--status-blue)' },
    { v: 14, c: 'var(--status-cyan)' },
    { v: 12, c: 'var(--status-violet)' },
    { v: 8,  c: 'var(--status-amber)' },
    { v: 4,  c: 'var(--text-3)' },
  ];
  const r = 30, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10"/>
        {segs.map((s, i) => {
          const len = (s.v / 100) * C;
          const off = -acc;
          acc += len;
          return (
            <circle key={i} cx="40" cy="40" r={r} fill="none"
              stroke={s.c} strokeWidth="10"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={off}/>
          );
        })}
      </svg>
      <div className="donut-c">
        <div>
          <div className="v">17</div>
          <div className="l">Active</div>
        </div>
      </div>
    </div>
  );
}

function ReportsPage() {
  const reports = [
    { name: 'Weekly pipeline review',    desc: 'Stage flow + risks + commitments', updated: 'Today',     owner: 'p1', tag: 'Recurring' },
    { name: 'Win/Loss analysis (TTM)',  desc: 'Outcomes broken down by reason & stage', updated: '2d ago', owner: 'p3', tag: 'Snapshot' },
    { name: 'Banker source attribution', desc: 'Which intermediaries drove the most pipeline value', updated: '4d ago', owner: 'p5', tag: 'Snapshot' },
    { name: 'Diligence cycle time',      desc: 'How long DD takes by workstream and deal size', updated: '1w ago', owner: 'p7', tag: 'Snapshot' },
    { name: 'Forecast accuracy (90d)',   desc: 'Committed vs. actual closes over rolling 90 days', updated: '1w ago', owner: 'p1', tag: 'Snapshot' },
    { name: 'Team velocity',             desc: 'Activities + advances per principal per week', updated: '2w ago', owner: 'p3', tag: 'Recurring' },
  ];
  const exportReports = () => {
    const csv = ['name,description,updated,owner,type']
      .concat(reports.map(r => [r.name, r.desc, r.updated, personOf(r.owner)?.name || '', r.tag]
        .map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `adga-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    fetch('/api/agent/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'reports.exported', resource_type: 'report', payload: { count: reports.length } }),
    }).catch(() => {});
  };

  return (
    <>
      <div className="page-h">
        <div><h1>Reports</h1><div className="sub">Saved dashboards · {reports.length} reports · Auto-refreshed nightly</div></div>
        <div className="page-actions">
          <button className="btn" type="button" onClick={exportReports}><Icon name="download" size={13}/> Export all</button>
          <button className="btn primary" type="button"><Icon name="plus" size={13}/> New report</button>
        </div>
      </div>

      <div className="docs-grid">
        {reports.map((r, i) => {
          const p = personOf(r.owner);
          return (
            <div key={r.name} className="kb-card" style={{minHeight:170}}>
              <div className="kb-tag">{r.tag}</div>
              <div className="kb-title">{r.name}</div>
              <div className="kb-desc">{r.desc}</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <Avatar person={p}/>
                <span className="text-xs muted">{p.name.split(' ')[0]} · updated {r.updated}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}



/* Admin, Billing, Settings */

function AdminPage({ initialSection }: { initialSection?: string } = {}) {
  const [section, setSection] = React.useState(initialSection || 'users');
  return (
    <>
      <div className="page-h">
        <div><h1>Admin</h1><div className="sub">Workspace administration, permissions, and compliance</div></div>
        <div className="page-actions">
          <button className="btn" type="button"><Icon name="shield" size={13}/> Compliance center</button>
        </div>
      </div>
      <div className="split">
        <div className="split-nav">
          <div className="lbl">Access</div>
          <button type="button" className={section==='users'?'active':''} onClick={()=>setSection('users')}>Users & roles</button>
          <button type="button" className={section==='teams'?'active':''} onClick={()=>setSection('teams')}>Teams</button>
          <button type="button" className={section==='perms'?'active':''} onClick={()=>setSection('perms')}>Permissions matrix</button>
          <button type="button" className={section==='guests'?'active':''} onClick={()=>setSection('guests')}>External guests</button>

          <div className="lbl">Security</div>
          <button type="button" className={section==='sso'?'active':''} onClick={()=>setSection('sso')}>SSO & SAML</button>
          <button type="button" className={section==='audit'?'active':''} onClick={()=>setSection('audit')}>Audit log</button>
          <button type="button" className={section==='retention'?'active':''} onClick={()=>setSection('retention')}>Data retention</button>

          <div className="lbl">Workflow</div>
          <button type="button" className={section==='stages'?'active':''} onClick={()=>setSection('stages')}>Pipeline stages</button>
          <button type="button" className={section==='playbooks'?'active':''} onClick={()=>setSection('playbooks')}>Automation playbooks</button>
          <button type="button" className={section==='fields'?'active':''} onClick={()=>setSection('fields')}>Custom fields</button>

          <div className="lbl">Integrations</div>
          <button type="button" className={section==='integrations'?'active':''} onClick={()=>setSection('integrations')}>Native integrations</button>
        </div>

        <div className="split-content">
          {section === 'users' && <AdminUsers/>}
          {section === 'perms' && <AdminPerms/>}
          {section === 'audit' && <AdminAudit/>}
          {section === 'stages' && <AdminStages/>}
          {section === 'playbooks' && <AdminPlaybooks/>}
          {section === 'integrations' && <AdminIntegrations/>}
          {section === 'teams' && <AdminConfigPanel title="Teams" desc="Organise users into deal teams and sector pods." rows={[
            ['M&A Principal Pod', '4 members', 'Active deal coverage', 'Healthy'],
            ['Diligence Review', '3 members', 'Documents and requests', 'Healthy'],
            ['Counterparty Desk', '2 members', 'External-room oversight', 'Review'],
          ]}/>}
          {section === 'guests' && <AdminConfigPanel title="External guests" desc="Counterparty users with scoped VDR access." rows={[
            ['Sutter Maritime Counsel', 'Deal room only', 'Expires Jun 4', 'Active'],
            ['Quorum Energy CFO', 'View and comment', 'Expires Jun 12', 'Active'],
            ['Tessellate Robotics', 'Signature packet', 'Expires May 23', 'Review'],
          ]}/>}
          {section === 'sso' && <AdminConfigPanel title="SSO & SAML" desc="Identity provider configuration." rows={[
            ['Google Workspace', 'Primary identity provider', 'Domain verified', 'Connected'],
            ['SCIM provisioning', 'User lifecycle sync', 'Manual review', 'Ready'],
            ['Emergency owner bypass', 'hellonolen@gmail.com', 'Local allowed', 'Active'],
          ]}/>}
          {section === 'retention' && <AdminConfigPanel title="Data retention" desc="Configure how long deal records and documents are retained." rows={[
            ['Deal records', '7 years after close', 'Workspace policy', 'Active'],
            ['Documents', '7 years after close', 'Workspace policy', 'Active'],
            ['Activity history', 'Permanent unless exported', 'Workspace policy', 'Active'],
          ]}/>}
          {section === 'fields' && <AdminConfigPanel title="Custom fields" desc="Add company, deal, and contact attributes specific to your firm." rows={[
            ['Deal source quality', 'Select', 'Pipeline and reports', 'Active'],
            ['Regulatory exposure', 'Risk flag', 'Diligence and agent review', 'Active'],
            ['Board approval needed', 'Boolean', 'Closing checklist', 'Active'],
          ]}/>}
        </div>
      </div>
    </>
  );
}

function AdminConfigPanel({ title, desc, rows }) {
  return (
    <div style={{paddingTop:14}}>
      <h3 style={{margin:'0 0 6px',fontSize:17,fontWeight:600}}>{title}</h3>
      <div className="text-sm muted" style={{marginBottom:16}}>{desc}</div>
      <div className="card">
        <div className="card-h">
          <div className="ttl">{title}</div>
          <button className="btn primary sm" type="button" onClick={() => fetch('/api/agent/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: 'admin.configuration_reviewed', resource_type: 'admin_section', resource_id: title, payload: { title } }),
          }).catch(() => {})}>Save review</button>
        </div>
        <div className="card-b" style={{padding:0}}>
          {rows.map(([name, scope, policy, status]) => (
            <div key={name} className="list-row">
              <Icon name="shield" size={14} className="muted"/>
              <div className="grow">
                <b>{name}</b>
                <div className="sub">{scope} · {policy}</div>
              </div>
              <Pill tone={status === 'Review' ? 'amber' : 'green'}>{status}</Pill>
              <button className="btn ghost sm" type="button">Edit</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const users = PEOPLE.map((p, i) => ({
    ...p,
    email: p.name.toLowerCase().replace(' ', '.') + '@concorde.co',
    last: ['12m','1h','2h','5h','1d','2d','3d','1w'][i],
    role: ['Owner','Admin','Member','Member','Admin','Member','Member','Member'][i],
    teams: ['M&A · APAC','M&A','Capital Markets','M&A','Capital Markets','APAC','Legal','Ops'][i],
    seat: ['Teams','Teams','Teams','Teams','Teams','Teams','Teams','Basic'][i],
  }));
  return (
    <div style={{paddingTop:14}}>
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14}}>
        <h3 style={{margin:0,fontSize:17,fontWeight:600}}>Users & roles</h3>
        <div className="text-sm muted">{users.length} seats · 7 active in last 24h</div>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          <button className="btn" type="button"><Icon name="upload" size={13}/> Bulk invite</button>
          <button className="btn primary" type="button"><Icon name="plus" size={13}/> Invite user</button>
        </div>
      </div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th></th><th>Name</th><th>Email</th><th>Team</th><th>Role</th><th>Seat</th><th>Last active</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><Avatar person={u}/></td>
                <td><b>{u.name}</b><div className="text-xs muted">{u.role === 'Owner' ? 'Workspace owner' : u.role}</div></td>
                <td className="mono text-xs">{u.email}</td>
                <td><span className="tag">{u.teams}</span></td>
                <td>
                  <Pill tone={u.role === 'Owner' ? 'violet' : u.role === 'Admin' ? 'blue' : 'gray'}>{u.role}</Pill>
                </td>
                <td><Pill tone={u.seat === 'Teams' ? 'green' : 'gray'} noDot>{u.seat}</Pill></td>
                <td className="muted">{u.last} ago</td>
                <td><button className="btn ghost sm" type="button"><Icon name="more" size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminPerms() {
  const roles = ['Owner','Admin','Member','Viewer','External'];
  const perms = [
    'Create deals', 'Edit deals', 'Delete deals', 'Move deals across stages',
    'Upload documents', 'Sign documents', 'Invite external users',
    'View financials', 'Edit financials', 'Run reports',
    'Manage automations', 'View audit log', 'Manage billing'
  ];
  const grid = {
    Owner:    perms.map(() => true),
    Admin:    perms.map((_, i) => i !== 12),
    Member:   [true, true, false, true, true, true, false, true, true, true, false, false, false],
    Viewer:   [false, false, false, false, false, false, false, true, false, true, false, false, false],
    External: [false, false, false, false, true, true, false, false, false, false, false, false, false],
  };
  return (
    <div style={{paddingTop:14}}>
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14}}>
        <h3 style={{margin:0,fontSize:17,fontWeight:600}}>Permissions matrix</h3>
        <div className="text-sm muted">Granular controls per role</div>
        <div style={{marginLeft:'auto'}}>
          <button className="btn" type="button"><Icon name="plus" size={13}/> New role</button>
        </div>
      </div>
      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{width:'30%'}}>Permission</th>
              {roles.map(r => <th key={r} style={{textAlign:'center'}}>{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {perms.map((p, i) => (
              <tr key={p}>
                <td>{p}</td>
                {roles.map(r => (
                  <td key={r} style={{textAlign:'center'}}>
                    {grid[r][i] ?
                      <Icon name="check" size={13} className="" /> :
                      <span className="muted">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAudit() {
  const rows = [
    { t: 'May 20 · 09:14', who: 'Maren Voss',   action: 'Logged in', sev: 'info' },
    { t: 'May 20 · 09:12', who: 'Hana Okafor',  action: 'Granted access to External (Sutter)', sev: 'warn' },
    { t: 'May 20 · 08:42', who: 'Theo Lange',   action: 'Created automation "Auto-advance on signature"', sev: 'info' },
    { t: 'May 19 · 18:33', who: 'External (Sutter counsel)', action: 'Downloaded "Definitive Agreement v3"', sev: 'warn' },
    { t: 'May 19 · 17:20', who: 'Maren Voss',   action: 'Changed workspace SSO settings', sev: 'crit' },
    { t: 'May 19 · 16:08', who: 'Jules Mendez', action: 'Deleted deal DEAL-1099', sev: 'crit' },
    { t: 'May 19 · 14:55', who: 'Aisha Bremer', action: 'Exported pipeline report', sev: 'info' },
    { t: 'May 19 · 12:01', who: 'Dario Kett',   action: 'Updated DD checklist template', sev: 'info' },
    { t: 'May 18 · 19:33', who: 'System',       action: 'Backup completed (4.2 GB)', sev: 'info' },
    { t: 'May 18 · 14:22', who: 'Saoirse Quinn',action: 'Invited new user "rune.sato@concorde.co"', sev: 'warn' },
  ];
  return (
    <div style={{paddingTop:14}}>
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14}}>
        <h3 style={{margin:0,fontSize:17,fontWeight:600}}>Audit log</h3>
        <div className="text-sm muted">Workspace-wide events · last 30 days</div>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          <button className="btn" type="button"><Icon name="filter" size={13}/> Filter</button>
          <button className="btn" type="button"><Icon name="download" size={13}/> Export</button>
        </div>
      </div>
      <div className="card">
        <div className="audit-row h">
          <span>Timestamp</span><span>Action</span><span>Source</span><span>Severity</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="audit-row">
            <span className="mono muted">{r.t}</span>
            <span><b>{r.who}</b> · {r.action}</span>
            <span className="mono muted">web · 10.42.x.x</span>
            <span><Pill tone={r.sev === 'crit' ? 'red' : r.sev === 'warn' ? 'amber' : 'blue'}>{r.sev === 'crit' ? 'Critical' : r.sev === 'warn' ? 'Warning' : 'Info'}</Pill></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminStages() {
  return (
    <div style={{paddingTop:14}}>
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14}}>
        <h3 style={{margin:0,fontSize:17,fontWeight:600}}>Pipeline stages</h3>
        <div className="text-sm muted">Default pipeline · 3 custom pipelines available</div>
        <div style={{marginLeft:'auto'}}>
          <button className="btn primary" type="button"><Icon name="plus" size={13}/> Add stage</button>
        </div>
      </div>
      <div className="card">
        {PIPELINE_STAGES.concat([{id:'lost',name:'Lost',dot:'#f87171',wip:null}]).map((s, i) => (
          <div key={s.id} className="list-row">
            <Icon name="chevUD" size={12} className="muted"/>
            <span className="col-dot" style={{background: s.dot}}/>
            <div className="grow">
              <b>{s.name}</b>
              <div className="sub mono">Default probability · {[5,15,35,55,72,88,100,0][i]}%</div>
            </div>
            <span className="text-xs muted">{s.wip != null ? 'WIP limit ' + s.wip : 'no limit'}</span>
            <button className="btn ghost sm" type="button"><Icon name="cog" size={12}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPlaybooks() {
  const plays = [
    { name: 'Auto-advance on signature',      desc: 'When all signers complete a Definitive Agreement, move deal to Closing', active: true,  runs: 38 },
    { name: 'Idle deal nudge',                 desc: 'If no activity for 7 days, notify deal owner and surface in Inbox',     active: true,  runs: 122 },
    { name: 'DD due-date escalation',          desc: 'Escalate overdue DD items to the deal lead and counsel',                active: true,  runs: 54 },
    { name: 'Stage SLA enforcement',           desc: 'Flag deals stuck past stage SLA · suggest disposition',                  active: true,  runs: 71 },
    { name: 'Welcome counterparty to VDR',     desc: 'On invite, send NDA template + access guide to external user',          active: false, runs: 19 },
    { name: 'Banker source tagging',           desc: 'Auto-tag deal source from inbound email signature',                      active: true,  runs: 14 },
    { name: 'Won-deal handoff to PostClose',  desc: 'On Won, create handoff packet + assign to PostClose team',                active: false, runs: 8  },
  ];
  return (
    <div style={{paddingTop:14}}>
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14}}>
        <h3 style={{margin:0,fontSize:17,fontWeight:600}}>Automation playbooks</h3>
        <div className="text-sm muted">Stage-based triggers and team workflows</div>
        <div style={{marginLeft:'auto'}}>
          <button className="btn primary" type="button"><Icon name="plus" size={13}/> New playbook</button>
        </div>
      </div>
      <div className="card">
        {plays.map(p => (
          <div key={p.name} className="list-row" style={{height:'auto',padding:'12px 16px'}}>
            <div className="grow">
              <b style={{fontSize:13.5}}>{p.name}</b>
              <div className="sub" style={{maxWidth:'70ch'}}>{p.desc}</div>
            </div>
            <span className="text-xs muted mono">{p.runs} runs · 30d</span>
            <div className={'switch ' + (p.active ? 'on' : '')}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminIntegrations() {
  const ints = [
    { name: 'Gmail',            cat: 'Email',     status: 'connected', user: 'maren@concorde.co'  },
    { name: 'Outlook',          cat: 'Email',     status: 'available', user: null                 },
    { name: 'Google Calendar',  cat: 'Calendar',  status: 'connected', user: '4 team members'     },
    { name: 'DocuSign',         cat: 'e-Sign',    status: 'connected', user: 'Workspace-wide'     },
    { name: 'Dropbox Sign',     cat: 'e-Sign',    status: 'available', user: null                 },
    { name: 'Box',              cat: 'Storage',   status: 'connected', user: 'Workspace-wide'     },
    { name: 'Google Drive',     cat: 'Storage',   status: 'connected', user: 'Workspace-wide'     },
    { name: 'OneDrive',         cat: 'Storage',   status: 'available', user: null                 },
    { name: 'Slack',            cat: 'Messaging', status: 'connected', user: '#deal-flow'         },
    { name: 'Salesforce',       cat: 'CRM',       status: 'available', user: null                 },
    { name: 'NetSuite',         cat: 'Finance',   status: 'available', user: null                 },
    { name: 'Zoom',             cat: 'Meetings',  status: 'connected', user: 'Auto-recording on'  },
  ];
  return (
    <div style={{paddingTop:14}}>
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14}}>
        <h3 style={{margin:0,fontSize:17,fontWeight:600}}>Native integrations</h3>
        <div className="text-sm muted">Connect your existing tools</div>
        <div style={{marginLeft:'auto'}}>
          <button className="btn" type="button">Browse all (40+)</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:10}}>
        {ints.map((it, i) => (
          <div key={it.name} className="card" style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
            <div className={'avatar lg av-' + (i % 8)} style={{borderRadius:8}}>{it.name.slice(0,2)}</div>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <b>{it.name}</b>
                <span className="tag">{it.cat}</span>
              </div>
              <div className="text-xs muted">{it.user || 'Not connected'}</div>
            </div>
            {it.status === 'connected' ? (
              <Pill tone="green">Connected</Pill>
            ) : (
              <button className="btn primary sm" type="button">Connect</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


/* Billing and Settings */

function BillingPage() {
  return (
    <>
      <div className="page-h">
        <div><h1>Billing & Subscription</h1><div className="sub">Concorde Group · Teams plan · 8 seats</div></div>
        <div className="page-actions">
          <button className="btn" type="button"><Icon name="download" size={13}/> Download invoices</button>
        </div>
      </div>
      <div className="billing-content" style={{padding:'0 32px 28px',display:'flex',flexDirection:'column',gap:14,overflow:'auto',flex:1}}>
        <div className="kpis" style={{padding:0,gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))'}}>
          <KPI label="Current plan" value="Teams" delta="$249 / seat / mo"/>
          <KPI label="Seats used" value="8 / 25" delta="17 available"/>
          <KPI label="Storage" value="42.6 GB" delta="of 240 GB"/>
          <KPI label="Next invoice" value="Jun 01" delta="$1,992"/>
        </div>

        <div className="billing-main-grid" style={{display:'grid',gridTemplateColumns:'minmax(0, 1.5fr) minmax(0, 1fr)',gap:14}}>
          <div className="card">
            <div className="card-h"><div className="ttl">Plans</div></div>
            <div className="card-b">
              <div className="price-grid">
                <div className="price-card">
                  <div className="name">Individual</div>
                  <div className="price">$99<small>/mo</small></div>
                  <ul>
                    <li>Pipeline & CRM</li>
                    <li>Tasks & checklists</li>
                    <li>Calendar and document storage</li>
                    <li>10 GB storage</li>
                    <li>1 named user</li>
                    <li>AI setup queue</li>
                  </ul>
                  <button className="btn" type="button">Downgrade</button>
                </div>
                <div className="price-card current">
                  <span className="badge">Current</span>
                  <div className="name">Teams</div>
                  <div className="price">$249<small>/seat/mo</small></div>
                  <ul>
                    <li>Everything in Individual</li>
                    <li>Virtual Deal Rooms</li>
                    <li>DD tracking & playbooks</li>
                    <li>Native integrations</li>
                    <li>30 GB / seat</li>
                    <li>Shared team workspace</li>
                    <li>Priority AI operations queue</li>
                  </ul>
                  <button className="btn" type="button" disabled>Current plan</button>
                </div>
                <div className="price-card">
                  <div className="name">Enterprise</div>
                  <div className="price">Custom</div>
                  <ul>
                    <li>Everything in Teams</li>
                    <li>SSO / SAML / SCIM</li>
                    <li>Granular permissions</li>
                    <li>Custom retention & legal hold</li>
                    <li>Custom agent workflows</li>
                    <li>99.95% SLA</li>
                  </ul>
                  <button className="btn primary" type="button" onClick={() => fetch('/api/billing/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan: 'enterprise' }),
                  }).catch(() => {})}>Start enterprise</button>
                </div>
              </div>
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="card">
              <div className="card-h"><div className="ttl">Payment method</div><button className="btn ghost sm" type="button">Update</button></div>
              <div className="card-b" style={{display:'flex',gap:12,alignItems:'center'}}>
                <div style={{width:48,height:32,background:'var(--surface-3)',borderRadius:4,display:'grid',placeItems:'center',fontWeight:600,fontSize:11,letterSpacing:'0.04em'}}>VISA</div>
                <div>
                  <div><b className="mono">•••• 4218</b> · expires 09/2028</div>
                  <div className="text-xs muted">Maren Voss · billing@concorde.co</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-h"><div className="ttl">Usage</div></div>
              <div className="card-b" style={{display:'flex',flexDirection:'column',gap:12}}>
                <UsageRow label="Active seats" v={8} max={10}/>
                <UsageRow label="Storage" v={43} max={250} unit="GB"/>
                <UsageRow label="Active deal rooms" v={12} max={50}/>
                <UsageRow label="External guests" v={18} max={100}/>
                <UsageRow label="API calls (this month)" v={148} max={1000} unit="k"/>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><div className="ttl">Invoices</div></div>
          <table className="tbl">
            <thead><tr><th>Invoice #</th><th>Date</th><th>Period</th><th>Status</th><th className="num">Amount</th><th></th></tr></thead>
            <tbody>
              {[
                ['INV-2026-005', 'May 01, 2026', 'May 2026',  'Paid',    '$4,180.00'],
                ['INV-2026-004', 'Apr 01, 2026', 'Apr 2026',  'Paid',    '$4,180.00'],
                ['INV-2026-003', 'Mar 01, 2026', 'Mar 2026',  'Paid',    '$3,860.00'],
                ['INV-2026-002', 'Feb 01, 2026', 'Feb 2026',  'Paid',    '$3,860.00'],
                ['INV-2026-001', 'Jan 01, 2026', 'Jan 2026',  'Paid',    '$3,580.00'],
                ['INV-2025-012', 'Dec 01, 2025', 'Dec 2025',  'Paid',    '$3,580.00'],
              ].map(([n, d, p, s, a]) => (
                <tr key={n}>
                  <td className="mono">{n}</td>
                  <td>{d}</td>
                  <td>{p}</td>
                  <td><Pill tone="green">{s}</Pill></td>
                  <td className="num">{a}</td>
                  <td><button className="btn ghost sm" type="button"><Icon name="download" size={12}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

type AdpReferralRow = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  affiliate_code?: string | null;
  affiliate_url?: string | null;
  company_size?: string | null;
  payroll_timing?: string | null;
  current_payroll_provider?: string | null;
  status: string;
  email_sent_count?: number;
  last_email_sent_at?: string | null;
  last_to_email?: string | null;
  last_delivery_status?: string | null;
  created_at: string;
};

function AffiliateCenterPage({ initialSection: _initialSection }: { initialSection?: string } = {}) {
  const [adpReferrals, setAdpReferrals] = React.useState<AdpReferralRow[]>([]);
  const [adpReferralsLoading, setAdpReferralsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    fetch('/api/partners/adp/leads')
      .then((response) => response.json())
      .then((payload) => {
        if (active) setAdpReferrals(Array.isArray(payload.leads) ? payload.leads : []);
      })
      .catch(() => {
        if (active) setAdpReferrals([]);
      })
      .finally(() => {
        if (active) setAdpReferralsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const rows = [
    ['AFF-001', 'Northstar Partners', 'NORTHSTAR', 'Approved', '42', '8', '$18,420', '$1,842'],
    ['AFF-002', 'DealDesk Media', 'DEALDESK', 'Pending', '19', '3', '$6,970', '$697'],
    ['AFF-003', 'Operator Network', 'OPSNET', 'Approved', '88', '14', '$31,240', '$3,124'],
  ];
  return (
    <>
      <div className="page-h">
        <div><h1>Affiliate Center</h1><div className="sub">Referral links, attribution, commission tracking, and payout status.</div></div>
        <div className="page-actions"><button className="btn primary" type="button">New affiliate</button></div>
      </div>
      <div style={{padding:'0 32px 28px',display:'flex',flexDirection:'column',gap:14,overflow:'auto',flex:1}}>
        <div className="kpis" style={{padding:0}}>
          <KPI label="Affiliate revenue" value="$56.6K" delta="tracked"/>
          <KPI label="Commission owed" value="$5.6K" delta="pending payout"/>
          <KPI label="Paid accounts" value="25" delta="from referrals"/>
          <KPI label="Risk flags" value="0" delta="clean"/>
        </div>
        <div className="card">
          <div className="card-h"><div className="ttl">Affiliates</div><span className="text-xs muted">Approve, pause, reject, or archive from here.</span></div>
          <table className="tbl">
            <thead><tr><th>ID</th><th>Name</th><th>Code</th><th>Status</th><th>Clicks</th><th>Paid accounts</th><th>Revenue</th><th>Commission</th></tr></thead>
            <tbody>{rows.map(r => <tr key={r[0]}><td className="mono">{r[0]}</td><td>{r[1]}</td><td className="mono">{r[2]}</td><td><Pill tone={r[3]==='Approved'?'green':'amber'}>{r[3]}</Pill></td><td>{r[4]}</td><td>{r[5]}</td><td>{r[6]}</td><td>{r[7]}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-h">
            <div className="ttl">ADP payroll inquiries</div>
            <span className="text-xs muted">Stored partner referral leads and Matthew email delivery status.</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Size</th>
                <th>Timing</th>
                <th>Provider</th>
                <th>Affiliate code</th>
                <th>Email route</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {adpReferralsLoading ? (
                <tr><td colSpan={10} className="muted">Loading ADP inquiries...</td></tr>
              ) : adpReferrals.length ? adpReferrals.map((lead) => (
                <tr key={lead.id}>
                  <td className="mono">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}</td>
                  <td>{lead.full_name}</td>
                  <td>{lead.company || '—'}</td>
                  <td>{lead.email}</td>
                  <td>{lead.company_size || '—'}</td>
                  <td>{lead.payroll_timing || '—'}</td>
                  <td>{lead.current_payroll_provider || '—'}</td>
                  <td className="mono">{lead.affiliate_code || 'PW56143'}</td>
                  <td>{lead.last_to_email || 'matt.ganton@adp.com'}</td>
                  <td><Pill tone={lead.email_sent_count ? 'green' : 'amber'}>{lead.email_sent_count ? 'Emailed' : lead.status || 'New'}</Pill></td>
                </tr>
              )) : (
                <tr><td colSpan={10} className="muted">No ADP payroll inquiries captured yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function InvoicingCenterPage() {
  const invoices = [
    ['CL-2026-001', 'Axiom Group', 'Sent', '$12,500.00', '5.00%', '$625.00', '$11,875.00'],
    ['CL-2026-002', 'Peak Co', 'Draft', '$4,800.00', '5.00%', '$240.00', '$4,560.00'],
    ['CL-2026-003', 'Vertex Systems', 'Paid', '$18,000.00', '5.00%', '$900.00', '$17,100.00'],
  ];
  const connectors = [
    ['bank_account', 'Bank account', 'Receive payouts by ACH or bank transfer', 'Not connected'],
    ['card_payments', 'Card payments', 'Payment links, card payments, payouts', 'Not connected'],
    ['paypal', 'PayPal', 'PayPal payments, payment links, payouts', 'Not connected'],
    ['quickbooks', 'QuickBooks', 'Accounting sync and invoice payment routing', 'Not connected'],
  ];
  const [connectorResult, setConnectorResult] = React.useState(null);
  const [connecting, setConnecting] = React.useState('');
  const [invoiceResult, setInvoiceResult] = React.useState(null);
  const [invoiceSaving, setInvoiceSaving] = React.useState(false);
  const [invoiceDraft, setInvoiceDraft] = React.useState({
    client_name: 'Axiom Group',
    client_email: 'ap@axiom.example',
    client_company: 'Axiom Group',
    description: 'Advisory retainer',
    amount: '12500',
    platform_fee_bps: '500',
    due_at: '2026-06-15',
  });

  const connect = async (connectorType, displayName) => {
    setConnecting(connectorType);
    try {
      const response = await fetch('/api/payment-connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connector_type: connectorType,
          display_name: displayName,
          tenant_type: 'company',
          metadata: { source: 'invoicing_center' },
        }),
      });
      setConnectorResult(await response.json());
    } finally {
      setConnecting('');
    }
  };

  const createInvoice = async (event) => {
    event.preventDefault();
    setInvoiceSaving(true);
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: invoiceDraft.client_name,
          client_email: invoiceDraft.client_email,
          client_company: invoiceDraft.client_company,
          currency: 'USD',
          due_at: invoiceDraft.due_at ? new Date(invoiceDraft.due_at + 'T12:00:00').toISOString() : null,
          platform_fee_bps: Number(invoiceDraft.platform_fee_bps || 0),
          line_items: [{
            description: invoiceDraft.description,
            quantity: 1,
            unit_amount_cents: Math.round(Number(invoiceDraft.amount || 0) * 100),
          }],
          notes: 'Created from ADGA invoicing center.',
        }),
      });
      setInvoiceResult(await response.json());
    } finally {
      setInvoiceSaving(false);
    }
  };

  return (
    <>
      <div className="page-h">
        <div><h1>Invoicing Center</h1><div className="sub">Owner invoices and user client invoices with platform transaction fee tracking.</div></div>
        <div className="page-actions"><button className="btn primary" type="button">New invoice</button></div>
      </div>
      <div style={{padding:'0 32px 28px',display:'flex',flexDirection:'column',gap:14,overflow:'auto',flex:1}}>
        <div className="kpis" style={{padding:0}}>
          <KPI label="Invoice volume" value="$35.3K" delta="client invoices"/>
          <KPI label="Fees tracked" value="$1.8K" delta="max 5%"/>
          <KPI label="Unpaid" value="$17.3K" delta="2 invoices"/>
          <KPI label="Net to users" value="$33.5K" delta="after platform fee"/>
        </div>
        <div className="card">
          <div className="card-h">
            <div><div className="ttl">Money destinations and connectors</div><div className="sub">Each tenant can connect where they receive money and which provider powers invoices.</div></div>
            <Pill tone="blue" noDot>Payments agent</Pill>
          </div>
          <div className="card-b" style={{padding:0}}>
            {connectors.map(([type, name, detail, status]) => (
              <div key={type} className="list-row">
                <div className="grow">
                  <div className="ttl">{name}</div>
                  <div className="sub">{detail}</div>
                </div>
                <Pill tone={status === 'Pending setup' ? 'amber' : 'gray'}>{status}</Pill>
                <button className="btn sm" type="button" onClick={() => connect(type, name)} disabled={connecting === type}>
                  {connecting === type ? 'Saving...' : 'Set up'}
                </button>
              </div>
            ))}
          </div>
          {connectorResult?.connector && (
            <div className="card-b" style={{borderTop:'1px solid var(--border)'}}>
              <div className="text-xs muted">Connector tracked: {connectorResult.connector.display_name} · {connectorResult.connector.status} · {connectorResult.connector.owner_user_id}</div>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-h">
            <div><div className="ttl">Create and send invoice</div><div className="sub">Draft an invoice, calculate platform fee, and prepare it for payment collection.</div></div>
            <Pill tone={invoiceResult?.invoice ? 'green' : 'amber'}>{invoiceResult?.invoice ? 'Draft saved' : 'Ready'}</Pill>
          </div>
          <form className="card-b" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12}} onSubmit={createInvoice}>
            <div className="field"><label>Client</label><input value={invoiceDraft.client_name} onChange={e => setInvoiceDraft(d => ({...d, client_name:e.target.value}))} required/></div>
            <div className="field"><label>Email</label><input type="email" value={invoiceDraft.client_email} onChange={e => setInvoiceDraft(d => ({...d, client_email:e.target.value}))}/></div>
            <div className="field"><label>Company</label><input value={invoiceDraft.client_company} onChange={e => setInvoiceDraft(d => ({...d, client_company:e.target.value}))}/></div>
            <div className="field"><label>Due date</label><input type="date" value={invoiceDraft.due_at} onChange={e => setInvoiceDraft(d => ({...d, due_at:e.target.value}))}/></div>
            <div className="field" style={{gridColumn:'span 2'}}><label>Line item</label><input value={invoiceDraft.description} onChange={e => setInvoiceDraft(d => ({...d, description:e.target.value}))}/></div>
            <div className="field"><label>Amount</label><input type="number" min="0" value={invoiceDraft.amount} onChange={e => setInvoiceDraft(d => ({...d, amount:e.target.value}))}/></div>
            <div className="field"><label>Platform fee bps</label><input type="number" min="0" max="500" value={invoiceDraft.platform_fee_bps} onChange={e => setInvoiceDraft(d => ({...d, platform_fee_bps:e.target.value}))}/></div>
            <div style={{gridColumn:'1 / -1',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
              <div className="text-xs muted">
                Net to user: {fmtCurrency(Math.max(0, Number(invoiceDraft.amount || 0) * (1 - Number(invoiceDraft.platform_fee_bps || 0) / 10000)), 'USD')} · payment link generated when a payment provider is connected.
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn" type="button">Preview</button>
                <button className="btn primary" type="submit" disabled={invoiceSaving}>{invoiceSaving ? 'Saving...' : 'Save invoice'}</button>
              </div>
            </div>
          </form>
          {invoiceResult?.invoice && (
            <div className="card-b" style={{borderTop:'1px solid var(--border)'}}>
              <div className="text-xs muted">Invoice tracked: {invoiceResult.invoice.invoice_number} · {fmtCurrency(invoiceResult.invoice.total_cents / 100, invoiceResult.invoice.currency)} · fee {fmtCurrency(invoiceResult.invoice.platform_fee_cents / 100, invoiceResult.invoice.currency)}</div>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-h"><div className="ttl">Client invoices</div><span className="text-xs muted">Invoice records and generated files stay attached to the right client.</span></div>
          <table className="tbl">
            <thead><tr><th>Invoice</th><th>Client</th><th>Status</th><th>Total</th><th>Platform fee</th><th>Fee amount</th><th>Net to user</th></tr></thead>
            <tbody>{invoices.map(r => <tr key={r[0]}><td className="mono">{r[0]}</td><td>{r[1]}</td><td><Pill tone={r[2]==='Paid'?'green':r[2]==='Sent'?'blue':'gray'}>{r[2]}</Pill></td><td>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td><td>{r[6]}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function VoiceNotesPage() {
  const [result, setResult] = React.useState(null);
  const [notes, setNotes] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [liveTranscript, setLiveTranscript] = React.useState('');
  const [interimTranscript, setInterimTranscript] = React.useState('');
  const [liveError, setLiveError] = React.useState('');
  const recognitionRef = React.useRef(null);
  const listeningRef = React.useRef(false);
  const finalTranscriptRef = React.useRef('');

  React.useEffect(() => {
    fetch('/api/voice-notes')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.voice_notes)) setNotes(data.voice_notes); })
      .catch(() => {});
  }, []);

  const supportsLiveSpeech = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const startLiveNote = () => {
    setLiveError('');
    if (!supportsLiveSpeech()) {
      setLiveError('Live speech-to-text is not available in this browser. You can still attach audio below.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    finalTranscriptRef.current = liveTranscript ? liveTranscript.trim() + ' ' : '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalTranscriptRef.current += text.trim() + ' ';
        else interim += text;
      }
      setLiveTranscript(finalTranscriptRef.current.trim());
      setInterimTranscript(interim.trim());
    };
    recognition.onerror = () => {
      setLiveError('Speech-to-text stopped. Start again when ready.');
      setListening(false);
      listeningRef.current = false;
    };
    recognition.onend = () => {
      if (listeningRef.current) {
        try { recognition.start(); } catch (e) {}
      }
    };
    recognitionRef.current = recognition;
    listeningRef.current = true;
    setListening(true);
    recognition.start();
  };

  const stopLiveNote = () => {
    listeningRef.current = false;
    setListening(false);
    setInterimTranscript('');
    try { recognitionRef.current?.stop(); } catch (e) {}
  };

  const saveLiveNote = async () => {
    const transcript = [liveTranscript, interimTranscript].filter(Boolean).join(' ').trim();
    if (!transcript) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.set('title', 'Live voice note');
      form.set('transcript_text', transcript);
      form.set('resource_type', 'workspace');
      const response = await fetch('/api/voice-notes', { method: 'POST', body: form });
      const data = await response.json();
      setResult(data);
      if (data.voice_note) setNotes(prev => [data.voice_note, ...prev]);
      setLiveTranscript('');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const response = await fetch('/api/voice-notes', { method: 'POST', body: form });
      const data = await response.json();
      setResult(data);
      if (data.voice_note) setNotes(prev => [data.voice_note, ...prev]);
      event.currentTarget.reset();
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className="page-h">
        <div><h1>Voice Notes</h1><div className="sub">Speak, upload audio, let AI transcribe, and attach the result to deals, leads, or contacts.</div></div>
      </div>
      <div style={{padding:'0 32px 28px',display:'grid',gridTemplateColumns:'minmax(0,1fr) 420px',gap:14,overflow:'auto',flex:1}}>
        <div className="card">
          <div className="card-h"><div className="ttl">Live note</div><span className="text-xs muted">{listening ? 'Listening now' : 'Ready'}</span></div>
          <div className="card-b" style={{display:'flex',flexDirection:'column',gap:12}}>
            <div className="live-transcript">
              {liveTranscript || interimTranscript ? (
                <>
                  <span>{liveTranscript}</span>
                  {interimTranscript && <em>{interimTranscript}</em>}
                </>
              ) : (
                <span className="muted">Click Start and speak. Your words will appear here as you talk.</span>
              )}
            </div>
            <div className="text-xs muted">Live notes save immediately as completed transcripts. Uploaded audio uses Cloudflare AI Whisper when the AI binding is available.</div>
            {liveError && <div className="text-sm" style={{color:'var(--status-amber)'}}>{liveError}</div>}
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {!listening && <button className="btn primary" type="button" onClick={startLiveNote}><Icon name="mic" size={13}/> Start speaking</button>}
              {listening && <button className="btn primary" type="button" onClick={stopLiveNote}>Stop</button>}
              <button className="btn" type="button" onClick={saveLiveNote} disabled={saving || !(liveTranscript || interimTranscript)}>{saving ? 'Saving...' : 'Save note'}</button>
              <button className="btn ghost" type="button" onClick={() => { setLiveTranscript(''); setInterimTranscript(''); finalTranscriptRef.current = ''; }}>Clear</button>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="ttl">Attach audio</div><span className="text-xs muted">Optional fallback</span></div>
          <form className="card-b" style={{display:'flex',flexDirection:'column',gap:12}} onSubmit={submit}>
            <div className="field"><label>Title</label><input name="title" type="text" placeholder="Follow-up call, meeting recap, field note"/></div>
            <div className="field"><label>Audio</label><input name="audio" type="file" accept="audio/*" required/></div>
            <div className="row2">
              <div className="field"><label>Record type</label><input name="resource_type" type="text" placeholder="lead, deal, contact"/></div>
              <div className="field"><label>Record ID</label><input name="resource_id" type="text" placeholder="Optional"/></div>
            </div>
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Processing...' : 'Attach audio'}</button>
          </form>
        </div>
        <div className="card">
          <div className="card-h"><div className="ttl">Latest note</div></div>
          <div className="card-b">
            {!result && <div className="text-sm muted">Your saved voice note will appear here.</div>}
            {result?.voice_note && (
              <dl className="kv">
                <dt>Status</dt><dd><Pill tone={String(result.voice_note.transcription_status).startsWith('completed') ? 'green' : 'amber'}>{String(result.voice_note.transcription_status).startsWith('completed') ? 'Saved' : 'Processing'}</Pill></dd>
                <dt>AI model</dt><dd className="mono">{result.voice_note.stt_model || 'browser speech recognition'}</dd>
                <dt>Words</dt><dd>{result.voice_note.word_count || 0}</dd>
                <dt>Transcript</dt><dd>{result.voice_note.transcript_text || 'Transcript will appear when processing finishes.'}</dd>
              </dl>
            )}
          </div>
        </div>
        <div className="card" style={{gridColumn:'1 / -1'}}>
          <div className="card-h"><div><div className="ttl">Voice-note library</div><div className="sub">{notes.length} saved notes · transcripts stay linked to the source record.</div></div></div>
          <div className="card-b" style={{padding:0}}>
            {notes.length === 0 && <div className="list-row"><div className="muted">No saved voice notes yet.</div></div>}
            {notes.slice(0, 12).map(note => (
              <div key={note.id} className="list-row" style={{height:'auto',padding:'12px 16px'}}>
                <Icon name="mic" size={14} className="muted"/>
                <div className="grow">
                  <b>{note.title || note.file_name || 'Voice note'}</b>
                  <div className="sub">{note.resource_type || 'workspace'}{note.resource_id ? ' · ' + note.resource_id : ''} · {note.word_count || 0} words</div>
                </div>
                <Pill tone={String(note.transcription_status || '').startsWith('completed') ? 'green' : note.transcription_status === 'failed' ? 'red' : 'amber'}>
                  {String(note.transcription_status || '').startsWith('completed') ? 'Transcribed' : note.transcription_status === 'failed' ? 'Failed' : 'Processing'}
                </Pill>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function MessagingPage() {
  const [result, setResult] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [sending, setSending] = React.useState(false);
  React.useEffect(() => {
    fetch('/api/messages/sms')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.messages)) setMessages(data.messages); })
      .catch(() => {});
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSending(true);
    try {
      const response = await fetch('/api/messages/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: form.get('to'), message: form.get('message') }),
      });
      const data = await response.json();
      setResult(data);
      if (data.sms) setMessages(prev => [data.sms, ...prev]);
    } finally {
      setSending(false);
    }
  };
  return (
    <>
      <div className="page-h">
        <div><h1>Messaging</h1><div className="sub">Send and track client text messages from the same workspace where the lead and deal live.</div></div>
      </div>
      <div style={{padding:'0 32px 28px',display:'grid',gridTemplateColumns:'420px minmax(0,1fr)',gap:14,overflow:'auto',flex:1}}>
        <div className="card">
          <div className="card-h"><div className="ttl">Send text message</div></div>
          <form className="card-b" style={{display:'flex',flexDirection:'column',gap:12}} onSubmit={submit}>
            <div className="field"><label>Phone number</label><input name="to" type="tel" placeholder="+15551234567" required/></div>
            <div className="field"><label>Message</label><textarea name="message" rows={5} placeholder="Meeting reminder, follow-up, or lead response" required/></div>
            <button className="btn primary" type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send message'}</button>
          </form>
        </div>
        {result?.sms && (
          <div className="card">
            <div className="card-h"><div className="ttl">Delivery</div></div>
            <div className="card-b">
              <dl className="kv"><dt>Status</dt><dd><Pill tone={result.sms.status === 'sent' ? 'green' : 'amber'}>{result.sms.status === 'sent' ? 'Sent' : 'Queued'}</Pill></dd><dt>Message</dt><dd>{result.sms.body}</dd></dl>
            </div>
          </div>
        )}
        <div className="card" style={{gridColumn:'1 / -1'}}>
          <div className="card-h"><div className="ttl">Message history</div></div>
          <table className="tbl">
            <thead><tr><th>To</th><th>Status</th><th>Message</th><th>Created</th></tr></thead>
            <tbody>
              {messages.length === 0 && <tr><td colSpan={4} className="muted">No messages yet.</td></tr>}
              {messages.map(m => (
                <tr key={m.id}>
                  <td className="mono">{m.to_number}</td>
                  <td><Pill tone={m.status === 'sent' ? 'green' : m.status === 'failed' ? 'red' : 'amber'}>{m.status === 'sent' ? 'Sent' : m.status === 'failed' ? 'Needs attention' : 'Queued'}</Pill></td>
                  <td>{m.body}</td>
                  <td className="mono text-xs">{formatDateTime(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function UsageRow({ label, v, max, unit }) {
  const pct = Math.min(100, (v / max) * 100);
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
        <span>{label}</span>
        <span className="mono muted">{v}{unit ? ' ' + unit : ''} <span style={{opacity:.5}}>/ {max}{unit ? ' ' + unit : ''}</span></span>
      </div>
      <div className="progress"><i style={{width: pct + '%', background: pct > 80 ? 'var(--status-amber)' : 'var(--accent)'}}/></div>
    </div>
  );
}

function SettingsPage({ tweaks, setTweak, initialSection }) {
  const [section, setSection] = React.useState(initialSection || 'profile');
  return (
    <>
      <div className="page-h">
        <div><h1>Settings</h1><div className="sub">Workspace, account, and personal preferences</div></div>
      </div>
      <div className="split">
        <div className="split-nav">
          <div className="lbl">Personal</div>
          <button type="button" className={section==='profile'?'active':''} onClick={()=>setSection('profile')}>Profile</button>
          <button type="button" className={section==='user-billing'?'active':''} onClick={()=>setSection('user-billing')}>Payment method</button>
          <button type="button" className={section==='preferences'?'active':''} onClick={()=>setSection('preferences')}>Preferences</button>
          <button type="button" className={section==='notif'?'active':''} onClick={()=>setSection('notif')}>Notifications</button>
          <button type="button" className={section==='display'?'active':''} onClick={()=>setSection('display')}>Display</button>
          <button type="button" className={section==='shortcuts'?'active':''} onClick={()=>setSection('shortcuts')}>Keyboard shortcuts</button>

          <div className="lbl">Workspace</div>
          <button type="button" className={section==='ws'?'active':''} onClick={()=>setSection('ws')}>General</button>
          <button type="button" className={section==='team-settings'?'active':''} onClick={()=>setSection('team-settings')}>Team settings</button>
          <button type="button" className={section==='brand'?'active':''} onClick={()=>setSection('brand')}>Branding</button>
          <button type="button" className={section==='integrations'?'active':''} onClick={()=>setSection('integrations')}>Integrations</button>
        </div>

        <div className="split-content">
          {section === 'profile' && <SettingsProfile/>}
          {section === 'user-billing' && <SettingsUserBilling/>}
          {section === 'preferences' && <SettingsPreferences/>}
          {section === 'notif' && <SettingsNotif/>}
          {section === 'display' && <SettingsDisplay/>}
          {section === 'shortcuts' && <SettingsShortcuts/>}
          {section === 'ws' && <SettingsWorkspace/>}
          {section === 'team-settings' && <SettingsTeam/>}
          {section === 'brand' && <SettingsBranding/>}
          {section === 'integrations' && <SettingsIntegrations/>}
        </div>
      </div>
    </>
  );
}

function SettingsProfile() {
  return (
    <div style={{maxWidth:520,paddingTop:14}}>
      <h3 style={{margin:'0 0 14px',fontSize:17,fontWeight:600}}>Profile</h3>
      <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:18}}>
        <span className="avatar xl av-0">MV</span>
        <div>
          <button className="btn" type="button">Upload photo</button>
          <div className="text-xs muted" style={{marginTop:4}}>PNG, JPG up to 2 MB</div>
        </div>
      </div>
      <div className="row2">
        <div className="field"><label>First name</label><input type="text" defaultValue="Maren"/></div>
        <div className="field"><label>Last name</label><input type="text" defaultValue="Voss"/></div>
      </div>
      <div className="field"><label>Email</label><input type="email" defaultValue="maren.voss@concorde.co"/></div>
      <div className="row2">
        <div className="field"><label>Title</label><input type="text" defaultValue="Principal"/></div>
        <div className="field"><label>Team</label><input type="text" defaultValue="M&A · APAC"/></div>
      </div>
      <div className="field"><label>Bio</label><textarea rows="3" defaultValue="Cross-border deals, fintech and industrials. 14y in capital markets."/></div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn primary" type="button">Save changes</button>
        <button className="btn" type="button">Cancel</button>
      </div>
    </div>
  );
}

function SettingsUserBilling() {
  return (
    <div style={{paddingTop:14,maxWidth:720}}>
      <h3 style={{margin:'0 0 6px',fontSize:17,fontWeight:600}}>Payment method</h3>
      <div className="text-sm muted" style={{marginBottom:18}}>Personal payment profile for add-ons, reimbursable invoices, and workspace-billed seats.</div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 260px',gap:14}}>
        <div className="card">
          <div className="card-h"><div className="ttl">Cards and bank accounts</div><button className="btn primary sm" type="button"><Icon name="plus" size={12}/> Add method</button></div>
          <div className="card-b" style={{padding:0}}>
            {[
              ['Visa ending 4218', 'Default card · expires 09/2028', 'Ready'],
              ['ACH bank account', 'Payout destination · verification needed', 'Review'],
            ].map(([name, detail, status]) => (
              <div key={name} className="list-row" style={{height:'auto',padding:'12px 16px'}}>
                <Icon name="card" size={15} className="muted"/>
                <div className="grow"><b>{name}</b><div className="sub">{detail}</div></div>
                <Pill tone={status === 'Ready' ? 'green' : 'amber'}>{status}</Pill>
                <button className="btn ghost sm" type="button">Edit</button>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="ttl">Billing identity</div></div>
          <div className="card-b" style={{display:'flex',flexDirection:'column',gap:10}}>
            <div className="field"><label>Billing email</label><input type="email" defaultValue="maren.voss@concorde.co"/></div>
            <div className="field"><label>Tax region</label><select defaultValue="US"><option>US</option><option>EU</option><option>UK</option></select></div>
            <button className="btn primary" type="button">Save billing profile</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPreferences() {
  return (
    <div style={{paddingTop:14,maxWidth:720}}>
      <h3 style={{margin:'0 0 6px',fontSize:17,fontWeight:600}}>Preferences</h3>
      <div className="text-sm muted" style={{marginBottom:18}}>User-level defaults that travel with your account across workspaces.</div>
      <div className="card">
        <div className="card-b" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:14}}>
          <div className="field"><label>Default landing page</label><select><option>Pipeline</option><option>Home</option><option>Maps</option><option>Inbox</option></select></div>
          <div className="field"><label>Default dealflow edge style</label><select><option>Curved</option><option>Straight</option></select></div>
          <div className="field"><label>AI tone</label><select><option>Direct operator</option><option>Detailed analyst</option><option>Concise closer</option></select></div>
          <div className="field"><label>Digest cadence</label><select><option>Every weekday morning</option><option>Only Mondays</option><option>Never</option></select></div>
          <div className="field"><label>Preferred currency</label><select><option>Workspace default</option><option>USD</option><option>EUR</option><option>GBP</option></select></div>
          <div className="field"><label>Voice-note language</label><select><option>English (US)</option><option>English (UK)</option><option>Spanish</option><option>French</option></select></div>
        </div>
      </div>
    </div>
  );
}

function SettingsNotif() {
  const events = [
    'Deal assigned to me', 'Mention in comment', 'DD item flagged',
    'Document uploaded to my deal', 'Signature requested', 'External party joined VDR',
    'Stage SLA exceeded', 'Forecast change > 10%', 'Weekly digest'
  ];
  return (
    <div style={{paddingTop:14}}>
      <h3 style={{margin:'0 0 6px',fontSize:17,fontWeight:600}}>Notifications</h3>
      <div className="text-sm muted" style={{marginBottom:18}}>Choose how you're notified for each event</div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Event</th><th style={{textAlign:'center'}}>In-app</th><th style={{textAlign:'center'}}>Email</th><th style={{textAlign:'center'}}>SMS</th><th style={{textAlign:'center'}}>Slack</th></tr></thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={e}>
                <td>{e}</td>
                {[true, true, i % 3 === 0, i < 6].map((v, j) => (
                  <td key={j} style={{textAlign:'center'}}>
                    <div className={'switch ' + (v ? 'on' : '')} style={{margin:'0 auto'}}/>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsDisplay() {
  return (
    <div style={{maxWidth:520,paddingTop:14}}>
      <h3 style={{margin:'0 0 6px',fontSize:17,fontWeight:600}}>Display</h3>
      <div className="text-sm muted" style={{marginBottom:18}}>Personalize how ADGA looks for you. Use the Tweaks panel for live preview.</div>
      <div className="field">
        <label>Default home view</label>
        <select><option>Home dashboard</option><option>Pipeline</option><option>Inbox</option></select>
      </div>
      <div className="field">
        <label>Date format</label>
        <select><option>2026-05-20 (ISO)</option><option>May 20, 2026</option><option>20 May 2026</option></select>
      </div>
      <div className="field">
        <label>Currency display</label>
        <select><option>Original currency</option><option>Always USD (converted)</option><option>Workspace default</option></select>
      </div>
      <div className="field">
        <label>Number format</label>
        <select><option>$1,234,567</option><option>$1.23M (compact)</option></select>
      </div>
    </div>
  );
}

function SettingsShortcuts() {
  const groups = [
    { sec: 'Navigation', items: [
      ['Open command bar', '⌘ K'],
      ['Go to Pipeline', 'G then P'],
      ['Go to Inbox', 'G then I'],
      ['Go to Home', 'G then H'],
      ['Toggle sidebar', '⌘ \\'],
      ['Toggle Voice Agent', '⌘ J'],
    ]},
    { sec: 'Deal actions', items: [
      ['New deal', 'N'],
      ['Open selected deal', 'Enter'],
      ['Advance stage', '⌘ ↑'],
      ['Assign to me', 'A'],
      ['Add comment', 'C'],
    ]},
    { sec: 'Tweaks', items: [
      ['Toggle dark mode', '⌘ Shift D'],
      ['Toggle density', '⌘ Shift ='],
      ['Cycle pipeline view', 'V'],
    ]},
  ];
  return (
    <div style={{paddingTop:14}}>
      <h3 style={{margin:'0 0 18px',fontSize:17,fontWeight:600}}>Keyboard shortcuts</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        {groups.map(g => (
          <div key={g.sec} className="card">
            <div className="card-h"><div className="ttl">{g.sec}</div></div>
            <div className="card-b" style={{padding:0}}>
              {g.items.map(([l, k]) => (
                <div key={l} className="list-row">
                  <div className="grow">{l}</div>
                  <span className="mono text-xs" style={{padding:'2px 6px',border:'1px solid var(--border)',borderRadius:4,background:'var(--surface)'}}>{k}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsWorkspace() {
  return (
    <div style={{maxWidth:520,paddingTop:14}}>
      <h3 style={{margin:'0 0 14px',fontSize:17,fontWeight:600}}>Workspace</h3>
      <div className="field"><label>Workspace name</label><input type="text" defaultValue="Concorde Group"/></div>
      <div className="field"><label>Workspace URL</label><input type="text" defaultValue="concorde.adga.app"/></div>
      <div className="row2">
        <div className="field"><label>Default currency</label><select><option>USD</option><option>EUR</option><option>GBP</option></select></div>
        <div className="field"><label>Time zone</label><select><option>America/New_York</option><option>Europe/London</option><option>Asia/Singapore</option></select></div>
      </div>
      <div className="field"><label>Fiscal year start</label><select><option>January</option><option>April</option><option>July</option></select></div>
      <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginTop:16}}>
        <h4 style={{margin:'0 0 8px',fontSize:14}}>Danger zone</h4>
        <div className="text-sm muted" style={{marginBottom:10}}>Archive the workspace. Members lose access; data is retained 90 days.</div>
        <button className="btn" type="button" style={{color:'var(--status-red)',borderColor:'color-mix(in srgb, var(--status-red) 30%, var(--border))'}}>Archive workspace</button>
      </div>
    </div>
  );
}

function SettingsTeam() {
  return (
    <div style={{paddingTop:14}}>
      <h3 style={{margin:'0 0 6px',fontSize:17,fontWeight:600}}>Team settings</h3>
      <div className="text-sm muted" style={{marginBottom:18}}>Seats, team membership, shared workspace access, and handoff rules.</div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:14}}>
        <div className="card">
          <div className="card-h"><div className="ttl">Seat policy</div><button className="btn primary sm" type="button"><Icon name="plus" size={12}/> Invite</button></div>
          <div className="card-b" style={{padding:0}}>
            {[
              ['Pro', '1 owner, no shared team members', 'Individual'],
              ['Team', 'Shared workspace, deal teams, team settings', 'Enabled'],
              ['Enterprise', 'Org-wide sharing, SSO, advanced roles', 'Enabled'],
            ].map(([plan, desc, status]) => (
              <div key={plan} className="list-row" style={{height:'auto',padding:'12px 16px'}}>
                <div className="grow"><b>{plan}</b><div className="sub">{desc}</div></div>
                <Pill tone={status === 'Individual' ? 'gray' : 'green'}>{status}</Pill>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="ttl">Deal teams</div></div>
          <div className="card-b" style={{padding:0}}>
            {[
              ['M&A Principal Pod', '4 members · default for acquisitions'],
              ['Capital Markets', '3 members · raises and investor relations'],
              ['Diligence Review', '3 members · documents and requests'],
            ].map(([name, detail]) => (
              <div key={name} className="list-row" style={{height:'auto',padding:'12px 16px'}}>
                <Icon name="users" size={14} className="muted"/>
                <div className="grow"><b>{name}</b><div className="sub">{detail}</div></div>
                <button className="btn ghost sm" type="button">Manage</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card" style={{marginTop:14}}>
        <div className="card-h"><div className="ttl">Sharing rules</div></div>
        <div className="card-b" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12}}>
          {[
            ['Auto-share new maps', 'Team and Enterprise only', true],
            ['Require owner on external invite', 'Applies to guests and counterparties', true],
            ['Allow team handoff', 'Move owner and tasks together', true],
          ].map(([title, desc, on]) => (
            <div key={title} className="card" style={{padding:14}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:10}}><b>{title}</b><span className={'switch ' + (on ? 'on' : '')}/></div>
              <div className="sub" style={{marginTop:6}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsBranding() {
  const portalAccents = ['#5b21b6', '#4c1d95', '#7c3aed', '#1e5aa8', '#475569', '#202124'];

  return (
    <div style={{paddingTop:14,maxWidth:600}}>
      <h3 style={{margin:'0 0 14px',fontSize:17,fontWeight:600}}>Branding</h3>
      <div className="text-sm muted" style={{marginBottom:18}}>Customize how ADGA appears for your workspace and external counterparties.</div>
      <div className="field">
        <label>Workspace logo</label>
        <div style={{display:'flex',gap:14,alignItems:'center'}}>
          <div className="imgph" style={{width:80,height:80}}>LOGO</div>
          <div><button className="btn" type="button"><Icon name="upload" size={13}/> Upload</button><div className="text-xs muted" style={{marginTop:4}}>SVG or PNG · 256×256+</div></div>
        </div>
      </div>
      <div className="field">
        <label>Counterparty portal accent</label>
        <div className="text-xs muted">Used on the public VDR portal and signed-document footers.</div>
        <div style={{display:'flex',gap:8,marginTop:6}}>
          {portalAccents.map(c => (
            <div key={c} title={c} aria-label={'Portal accent ' + c} style={{width:28,height:28,borderRadius:'50%',background:c,border:'2px solid var(--surface)',boxShadow:'0 0 0 1px var(--border-strong)',cursor:'pointer'}}/>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Email footer signature</label>
        <textarea rows="3" defaultValue="Concorde Group · ADGA Suite · 230 Park Ave, NY · concorde.co"/>
      </div>
    </div>
  );
}

function SettingsIntegrations() {
  return (
    <div style={{paddingTop:14,maxWidth:680}}>
      <h3 style={{margin:'0 0 14px',fontSize:17,fontWeight:600}}>Integrations</h3>
      <div className="card" style={{marginBottom:14}}>
        <div className="card-h"><div className="ttl">Connected tools</div><button className="btn primary sm" type="button"><Icon name="plus" size={12}/> Add connection</button></div>
        <div className="card-b" style={{padding:0}}>
          {[
            ['Calendar', 'Invites, meetings, and reminders', 'Connected', 'p1'],
            ['Documents', 'Client files and signed records', 'Connected', 'p4'],
            ['Payments', 'Invoices and checkout links', 'Setup needed', 'p3'],
          ].map(([n, desc, status, owner]) => {
            const o = personOf(owner);
            return (
              <div key={n} className="list-row">
                <Icon name="link" size={14} className="muted"/>
                <div className="grow">
                  <b>{n}</b>
                  <div className="sub">{desc}</div>
                </div>
                <Pill tone={status === 'Connected' ? 'green' : 'amber'}>{status}</Pill>
                <Avatar person={o}/>
                <button className="btn ghost sm" type="button"><Icon name="more" size={12}/></button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <div className="card-h"><div className="ttl">Automation</div><button className="btn primary sm" type="button"><Icon name="plus" size={12}/> Add automation</button></div>
        <div className="card-b" style={{padding:0}}>
          {[
            ['Deal stage updates', 'Notify owners when a deal moves or stalls', 'green'],
            ['Diligence review', 'Route flagged items to the right team', 'green'],
            ['Client follow-up', 'Prepare reminders after meetings and messages', 'amber'],
          ].map(([name, desc, t]) => (
            <div key={name} className="list-row">
              <Icon name="send" size={14} className="muted"/>
              <div className="grow">
                <b>{name}</b>
                <div className="sub">{desc}</div>
              </div>
              <Pill tone={t}>{t === 'green' ? 'Active' : 'Needs review'}</Pill>
              <button className="btn ghost sm" type="button"><Icon name="more" size={12}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



/* HomePage v2 — workspace home (no marketing/editorial framing) */

function HomePage({ deals, openDeal, setRoute }) {
  const [period, setPeriod] = React.useState('quarter');
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const active = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
  const totalValue = active.reduce((s,d) => s + d.value, 0);
  const weighted = active.reduce((s,d) => s + d.value * d.prob / 100, 0);
  const focusStages = new Set(['close', 'sign', 'design', 'scope']);
  const periodTabs = [
    { id: 'day', label: 'Day', days: 1 },
    { id: 'week', label: 'Week', days: 7 },
    { id: 'month', label: 'Month', days: 31 },
    { id: 'quarter', label: 'Quarter', days: 92 },
    { id: 'year', label: 'Year', days: 365 },
  ];
  const selectedPeriod = periodTabs.find(t => t.id === period) || periodTabs[3];
  const horizon = new Date(today);
  horizon.setDate(today.getDate() + selectedPeriod.days);
  const displayDate = today.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const displayMonth = today.toLocaleDateString(undefined, { month: 'short' });
  const tasksDueToday = TASKS.filter(t => t.due === 'today').length;
  const todayHorizon = new Date(today);
  todayHorizon.setDate(today.getDate() + 1);
  const advancingToday = active.filter(d => {
    const close = new Date(d.close + 'T00:00:00');
    return close >= today && close <= todayHorizon && (focusStages.has(d.stage) || d.priority === 'high');
  }).length;
  const focusedDeals = active
    .filter(d => {
      const close = new Date(d.close + 'T00:00:00');
      return close >= today && close <= horizon && (focusStages.has(d.stage) || d.priority === 'high');
    })
    .sort((a, b) => new Date(a.close) - new Date(b.close))
    .slice(0, period === 'day' ? 5 : 9);
  const periodValue = focusedDeals.reduce((s, d) => s + d.value, 0);
  const periodWeighted = focusedDeals.reduce((s, d) => s + d.value * d.prob / 100, 0);
  const highUrgency = focusedDeals.filter(d => d.stage === 'close' || d.priority === 'high').length;
  const displayedDeals = focusedDeals.length ? focusedDeals : active
    .filter(d => focusStages.has(d.stage) || d.priority === 'high')
    .sort((a, b) => new Date(a.close) - new Date(b.close))
    .slice(0, 5);

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Good morning, <em>Maren</em>.</h1>
          <div className="sub">{displayDate} · {advancingToday} deals advancing today · {tasksDueToday} tasks due</div>
        </div>
        <div className="page-actions">
          <button className="btn" type="button"><Icon name="cal" size={13}/> {displayMonth}</button>
          <button className="btn primary" type="button"><Icon name="plus" size={13}/> New deal</button>
        </div>
      </div>

      <div className="kpis">
        <KPI label="Pipeline value"    value={'$' + compactNum(totalValue)} delta={<><Icon name="arrow-up" size={11}/> +11.2% wk</>} deltaTone="up"/>
        <KPI label="Weighted forecast" value={'$' + compactNum(weighted)}   delta={<><Icon name="arrow-up" size={11}/> +$24.1M</>} deltaTone="up"/>
        <KPI label="Active deals"      value={active.length}                 delta={<><Icon name="arrow-up" size={11}/> +2 this wk</>} deltaTone="up"/>
        <KPI label="Avg. days in stage" value="14.2"                         delta={<><Icon name="arrow-dn" size={11}/> -2.1d</>} deltaTone="up"/>
      </div>

      <div className="home-content-grid home-focus-stack" style={{display:'grid',gridTemplateColumns:'minmax(0, 1fr)',gap:14,padding:'0 32px 28px',flex:1,overflow:'auto'}}>
        <div className="card deal-focus-card">
          <div className="card-h deal-focus-header">
            <div>
              <div className="ttl">Closing focus <span className="sub">{selectedPeriod.label.toLowerCase()} view</span></div>
              <div className="sub">Late-stage deals, negotiations, and relationship owners tied back to contact records.</div>
            </div>
            <div className="deal-period-tabs" role="tablist" aria-label="Closing period">
              {periodTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={period === tab.id}
                  className={period === tab.id ? 'active' : ''}
                  onClick={() => setPeriod(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="deal-focus-summary">
            <div><span>{displayedDeals.length}</span><small>visible deals</small></div>
            <div><span>{fmtCurrency(periodValue || displayedDeals.reduce((s,d)=>s+d.value,0), 'USD')}</span><small>gross value</small></div>
            <div><span>{fmtCurrency(periodWeighted || displayedDeals.reduce((s,d)=>s+d.value*d.prob/100,0), 'USD')}</span><small>weighted</small></div>
            <div><span>{highUrgency || displayedDeals.filter(d => d.priority === 'high').length}</span><small>priority records</small></div>
          </div>
          <div className="deal-focus-table">
            <table className="tbl">
              <thead><tr><th>Deal</th><th>Contact record</th><th>Stage</th><th>Team</th><th className="num">Value</th><th>Close</th></tr></thead>
              <tbody>
                {displayedDeals.map(d => {
                  const o = personOf(d.owner);
                  const s = stageOf(d.stage);
                  const co = companyOf(d.company);
                  const team = (d.team || []).map(personOf).filter(Boolean);
                  return (
                    <tr key={d.id} onClick={() => openDeal(d)} style={{cursor:'pointer'}}>
                      <td>
                        <b>{d.name.split(' — ')[0]}</b>
                        <div className="mono text-xs muted">{d.id} · {d.type}</div>
                      </td>
                      <td>
                        <div className="contact-link-cell">
                          <span className="avatar">{co?.logo || 'CO'}</span>
                          <span><b>{co?.name || 'Unassigned'}</b><small>{co?.sector || 'Company'} · {co?.hq || 'Contact record'}</small></span>
                          <button className="btn ghost sm" type="button" onClick={(e) => { e.stopPropagation(); setRoute('crm'); }}>Contact record</button>
                        </div>
                      </td>
                      <td><Pill tone={d.stage === 'close' ? 'amber' : d.stage === 'design' || d.stage === 'sign' ? 'amber' : 'blue'}>{s.name}</Pill></td>
                      <td><span className="deal-team-cell"><Avatar person={o}/> <span>{o.name.split(' ')[0]}</span><AvatarStack ids={team.slice(1).map(p => p.id)} max={3}/></span></td>
                      <td className="num">{fmtCurrency(d.value, d.currency)}</td>
                      <td className="mono">{d.close}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="home-follow-grid" style={{display:'grid',gridTemplateColumns:'minmax(0, 1fr) minmax(0, 1fr)',gap:14,minWidth:0}}>
          <div className="card">
            <div className="card-h"><div className="ttl">Tasks due today</div><span className="text-xs muted">5</span></div>
            <div className="card-b" style={{padding:0}}>
              {TASKS.slice(0, 5).map(t => {
                const o = personOf(t.owner);
                return (
                  <div key={t.id} className="list-row">
                    <input type="checkbox"/>
                    <div className="grow">
                      <div className="ttl">{t.title}</div>
                      <div className="sub mono">{t.deal} · {t.due}</div>
                    </div>
                    <Pill tone={t.priority === 'high' ? 'red' : 'amber'} noDot>{t.priority === 'high' ? 'P0' : 'P1'}</Pill>
                    <Avatar person={o}/>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><div className="ttl">Activity</div><button className="btn ghost sm" type="button">View all</button></div>
            <div className="card-b" style={{padding:'0 16px 8px'}}>
              {ACTIVITY.slice(0, 6).map((a, i) => {
                const p = personOf(a.who);
                return (
                  <div key={i} className="act">
                    <span className="ic">{a.icon}</span>
                    <div className="b"><b>{p.name.split(' ')[0]}</b> {a.what} <span className="mono muted">{a.target}</span></div>
                    <span className="t">{a.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* Inbox + Tasks pages */

function InboxPage({ openDeal, deals, meetingInbox = [] }) {
  const items = [
    ...meetingInbox,
    { id: 'm1', from: 'Sutter Maritime · Aurore Chastain', subj: 'Re: Term sheet draft', preview: 'Thanks for sending — a few comments on §4. Otherwise looks aligned. Can we…', time: '12m', deal: 'DEAL-1210', unread: true, tag: 'Counterparty' },
    { id: 'm2', from: 'DocuSign', subj: 'Signature requested · Bramble LOI', preview: 'Maren, your signature is needed on document "LOI — Bramble & Co"…', time: '34m', deal: 'DEAL-1221', unread: true, tag: 'eSign' },
    { id: 'm3', from: 'Hana Okafor', subj: '@ you on Heliograph §4.3', preview: '@Maren — counsel flagged the assignment language. Two items inside.', time: '1h', deal: 'DEAL-1207', unread: true, tag: 'Mention' },
    { id: 'm4', from: 'Calendar', subj: 'Tomorrow · Quorum JV term sheet review', preview: '4 attendees · 60 min · Confluence call link attached', time: '2h', deal: 'DEAL-1213', unread: false, tag: 'Calendar' },
    { id: 'm5', from: 'ADGA · Pipeline Insights', subj: 'Tessellate signature SLA expiring', preview: 'No response in 5d. Suggested action: nudge CFO via email or schedule call.', time: '3h', deal: 'DEAL-1218', unread: false, tag: 'Insight' },
    { id: 'm6', from: 'Quorum Energy · Magnus Bell', subj: 'Re: JV proposal — meeting next week?', preview: 'Apologies for the delay. Can we get something on the calendar for next week?', time: '5h', deal: 'DEAL-1213', unread: false, tag: 'Counterparty' },
  ];
  const [sel, setSel] = React.useState(items[0]);
  const findDeal = (id) => deals.find(d => d.id === id);
  return (
    <>
      <div className="page-h">
        <div><h1>Inbox</h1><div className="sub">7 unread · linked to live deals</div></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'380px 1fr',flex:1,overflow:'hidden',borderTop:'1px solid var(--border)'}}>
        <div style={{borderRight:'1px solid var(--border)',overflowY:'auto'}}>
          {items.map(it => (
            <div key={it.id} onClick={() => setSel(it)} style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',background:sel.id===it.id?'var(--surface-3)':'transparent',borderLeft:'2px solid '+(sel.id===it.id?'var(--accent)':'transparent'),cursor:'pointer'}}>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4}}>
                {it.unread && <span style={{width:6,height:6,borderRadius:3,background:'var(--accent)'}}/>}
                <b style={{fontSize:13,flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontWeight:500}}>{it.from}</b>
                <span className="text-xs muted">{it.time}</span>
              </div>
              <div style={{fontSize:14,fontWeight:500,marginBottom:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',letterSpacing:'-0.005em'}}>{it.subj}</div>
              <div className="text-xs muted" style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:6}}>{it.preview}</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span className="tag">{it.tag}</span>
                <span className="mono text-xs muted">{it.deal}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{overflowY:'auto',padding:'24px 32px'}}>
          <div style={{borderBottom:'1px solid var(--border)',paddingBottom:16,marginBottom:18}}>
            <span className="tag" style={{marginBottom:10,display:'inline-flex'}}>{sel.tag}</span>
            <h2 style={{margin:'8px 0 12px',fontSize:22,fontWeight:600,lineHeight:1.2,letterSpacing:'-0.01em'}}>{sel.subj}</h2>
            <div style={{display:'flex',alignItems:'center',gap:12,fontSize:13}}>
              <span className="avatar av-1">{sel.from.slice(0, 2).toUpperCase()}</span>
              <div><b>{sel.from}</b><div className="text-xs muted">to me · {sel.time} ago</div></div>
              <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                <button className="btn sm" type="button">Reply</button>
                {findDeal(sel.deal) && <button className="btn primary sm" type="button" onClick={() => openDeal(findDeal(sel.deal))}>Open deal</button>}
              </div>
            </div>
          </div>
          <div style={{fontSize:14,lineHeight:1.6,maxWidth:'62ch',color:'var(--text)'}}>
            <p>Hi Maren — thanks for sending the latest term sheet. We're aligned on structure and valuation; a few items in §4 to walk through before signing.</p>
            <p>The working-capital adjustment mechanism reads a touch generous — we'd prefer a simple peg. Earnout milestones could use a sharper EBITDA definition. And the R&W cap, we'd like to discuss alternatives in the 12–15% range.</p>
            <p>Otherwise we're ready to move. Wednesday afternoon or Thursday morning works on our end.</p>
            <p style={{color:'var(--text-3)'}}>— Aurore</p>
          </div>
        </div>
      </div>
    </>
  );
}

function TasksPage({ openDeal, deals, setQuickCreate }) {
  const [filter, setFilter] = React.useState('all');
  const filtered = filter === 'all' ? TASKS : TASKS.filter(t => t.priority === filter);
  return (
    <>
      <div className="page-h">
        <div><h1>Tasks</h1><div className="sub">{TASKS.length} open · 5 due today</div></div>
        <div className="page-actions">
          <div className="seg">
            <button className={filter==='all'?'active':''} type="button" onClick={()=>setFilter('all')}>All</button>
            <button className={filter==='high'?'active':''} type="button" onClick={()=>setFilter('high')}>High</button>
            <button className={filter==='med'?'active':''} type="button" onClick={()=>setFilter('med')}>Medium</button>
            <button className={filter==='low'?'active':''} type="button" onClick={()=>setFilter('low')}>Low</button>
          </div>
          <button className="btn primary" type="button" onClick={() => setQuickCreate && setQuickCreate('task')}><Icon name="plus" size={13}/> New task</button>
        </div>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th style={{width:32}}></th><th>Task</th><th>Deal</th><th>Owner</th><th>Due</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(t => {
              const o = personOf(t.owner);
              const d = deals.find(x => x.id === t.deal);
              return (
                <tr key={t.id} onClick={() => d && openDeal(d)} style={{cursor:'pointer'}}>
                  <td><input type="checkbox" defaultChecked={t.status === 'done'} onClick={e => e.stopPropagation()}/></td>
                  <td><b>{t.title}</b></td>
                  <td className="mono">{t.deal}</td>
                  <td><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Avatar person={o}/> {o.name}</span></td>
                  <td className="mono">{t.due}</td>
                  <td><Pill tone={t.priority === 'high' ? 'red' : t.priority === 'med' ? 'amber' : 'gray'}>{t.priority.toUpperCase()}</Pill></td>
                  <td><Pill tone={t.status === 'doing' ? 'blue' : 'gray'}>{t.status === 'doing' ? 'In progress' : 'To do'}</Pill></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function parseAttendees(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const match = item.match(/^(.*?)\s*<([^>]+)>$/);
      if (match) return { name: match[1].trim(), email: match[2].trim(), role: 'counterparty' };
      return { email: item, role: 'counterparty' };
    });
}

function CalendarPage({ deals, openDeal, onMeetingCreated }) {
  const seed = [
    { id: 'cal_001', title: 'Sutter Maritime pre-signing alignment', starts_at: '2026-05-20T14:00:00.000Z', ends_at: '2026-05-20T14:45:00.000Z', event_type: 'meeting', status: 'confirmed', deal_id: 'DEAL-1210', attendees: [{ name: 'Aurore Chastain', email: 'aurore.c@sutter.co' }], location: 'Zoom', notes: 'Final review of working capital peg, holdback mechanic, and signature timeline.' },
    { id: 'cal_002', title: 'Quorum Energy follow-up', starts_at: '2026-05-21T16:30:00.000Z', ends_at: '2026-05-21T17:00:00.000Z', event_type: 'call', status: 'tentative', deal_id: 'DEAL-1213', attendees: [{ name: 'Magnus Bell', email: 'mbell@quorum.energy' }], location: 'Google Meet', notes: 'Re-open dialogue on JV term sheet.' },
    { id: 'cal_003', title: 'Tessellate signature SLA', starts_at: '2026-05-23T20:00:00.000Z', ends_at: '2026-05-23T20:15:00.000Z', event_type: 'deadline', status: 'confirmed', deal_id: 'DEAL-1218', attendees: [], location: '', notes: 'Signature request expires without response.' },
  ];
  const [events, setEvents] = React.useState(seed);
  const [view, setView] = React.useState('agenda');
  const [draft, setDraft] = React.useState({
    title: '',
    starts_at: '2026-05-24T15:00',
    ends_at: '2026-05-24T15:30',
    deal_id: deals?.[0]?.id || '',
    event_type: 'meeting',
    meeting_url: '',
    attendees: '',
    send_invites: true,
  });

  React.useEffect(() => {
    fetch('/api/calendar/events')
      .then(r => r.json())
      .then(data => { if (data?.events?.length) setEvents(data.events); })
      .catch(() => {});
  }, []);

  const fmt = (iso) => {
    try {
      return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
    } catch (e) {
      return iso;
    }
  };

  const create = async () => {
    const title = draft.title.trim();
    if (!title) return;
    const payload = {
      ...draft,
      starts_at: new Date(draft.starts_at).toISOString(),
      ends_at: new Date(draft.ends_at).toISOString(),
      attendees: parseAttendees(draft.attendees),
      meeting_url: draft.meeting_url || undefined,
      send_invites: draft.send_invites,
      notes: 'Created from ADGA Suite calendar.',
    };
    const optimistic = { id: 'local-' + Date.now(), status: 'tentative', ...payload };
    setEvents(prev => [...prev, optimistic].sort((a,b) => a.starts_at.localeCompare(b.starts_at)));
    setDraft(d => ({ ...d, title: '' }));
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result?.event) {
        setEvents(prev => prev.map(e => e.id === optimistic.id ? result.event : e).sort((a,b) => a.starts_at.localeCompare(b.starts_at)));
        onMeetingCreated && onMeetingCreated(result.event, result.deliveries || []);
      }
    } catch (e) {}
  };

  const today = events.filter(e => e.starts_at.slice(0, 10) === '2026-05-20');

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Calendar</h1>
          <div className="sub">{events.length} scheduled · {today.length} today · agent follow-up queued on new meetings</div>
        </div>
        <div className="page-actions">
          <div className="seg">
            <button className={view==='agenda'?'active':''} type="button" onClick={()=>setView('agenda')}>Agenda</button>
            <button className={view==='week'?'active':''} type="button" onClick={()=>setView('week')}>Week</button>
            <button className={view==='availability'?'active':''} type="button" onClick={()=>setView('availability')}>Availability</button>
          </div>
          <button className="btn primary" type="button" onClick={create}><Icon name="plus" size={13}/> Add meeting</button>
        </div>
      </div>

      <div className="suite-workspace-grid calendar-workspace-grid">
        <div className="card">
          <div className="card-h">
            <div><div className="ttl">{view === 'agenda' ? 'Agenda' : view === 'week' ? 'Week view' : 'Availability'}</div><div className="sub">Meetings, calls, deadlines, and agent-suggested follow-up.</div></div>
            <Pill tone="blue">{events.filter(e => e.event_type === 'meeting' || e.event_type === 'call').length} live touchpoints</Pill>
          </div>
          <div className="card-b" style={{padding:0}}>
            {events.map(e => {
              const deal = (deals || []).find(d => d.id === e.deal_id);
              return (
                <div key={e.id} className="list-row" style={{height:'auto',padding:'14px 16px',alignItems:'flex-start'}}>
                  <div style={{width:92,fontFamily:'var(--font-mono)',fontSize:10.5,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--text-3)'}}>{fmt(e.starts_at)}</div>
                  <div className="grow" style={{minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <b style={{fontSize:14}}>{e.title}</b>
                      <Pill tone={e.status === 'confirmed' ? 'green' : e.event_type === 'deadline' ? 'red' : 'amber'}>{e.status}</Pill>
                      <Pill tone="gray">{e.event_type}</Pill>
                    </div>
                    <div className="sub">{e.location || 'No location'} · {(e.attendees || []).length} attendees · {e.meeting_url ? 'meeting link ready' : 'no meeting link'}</div>
                    {e.meeting_url && <div className="mono text-xs" style={{marginTop:5,color:'var(--text-2)'}}>{e.meeting_url}</div>}
                    {e.notes && <div style={{fontSize:12.5,color:'var(--text-2)',marginTop:6}}>{e.notes}</div>}
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    {deal && <button className="btn ghost sm" type="button" onClick={() => openDeal(deal)}>Open deal</button>}
                    <button className="btn ghost sm" type="button" onClick={() => window.openShare?.({ title: e.title, id: e.id })}>Share</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="suite-workspace-stack">
          <div className="card">
            <div className="card-h"><div className="ttl">Schedule</div></div>
            <div className="card-b" style={{display:'flex',flexDirection:'column',gap:10}}>
              <div className="field"><label>Title</label><input type="text" value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} placeholder="Meeting title"/></div>
              <div className="field"><label>Starts</label><input type="datetime-local" value={draft.starts_at} onChange={e=>setDraft(d=>({...d,starts_at:e.target.value}))}/></div>
              <div className="field"><label>Ends</label><input type="datetime-local" value={draft.ends_at} onChange={e=>setDraft(d=>({...d,ends_at:e.target.value}))}/></div>
              <div className="field"><label>Deal</label><select value={draft.deal_id} onChange={e=>setDraft(d=>({...d,deal_id:e.target.value}))}>{(deals||[]).slice(0,12).map(d=><option key={d.id} value={d.id}>{d.id} · {d.name.split(' — ')[0]}</option>)}</select></div>
              <div className="field"><label>Type</label><select value={draft.event_type} onChange={e=>setDraft(d=>({...d,event_type:e.target.value}))}><option value="meeting">Meeting</option><option value="call">Call</option><option value="deadline">Deadline</option><option value="reminder">Reminder</option><option value="internal">Internal</option></select></div>
              <div className="field"><label>Attendees</label><textarea rows={3} value={draft.attendees} onChange={e=>setDraft(d=>({...d,attendees:e.target.value}))} placeholder="Name <email@company.com>, or one email per line"/></div>
              <div className="field"><label>Meeting link</label><input type="url" value={draft.meeting_url} onChange={e=>setDraft(d=>({...d,meeting_url:e.target.value}))} placeholder="Leave blank to generate ADGA meeting link"/></div>
              <label className="share-pw-row" style={{fontSize:12}}>
                <input type="checkbox" checked={draft.send_invites} onChange={e=>setDraft(d=>({...d,send_invites:e.target.checked}))}/>
                Send calendar invite to attendees
              </label>
              <button className="btn primary" type="button" onClick={create}>Create event and send invite</button>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><div className="ttl">Agent coverage</div></div>
            <div className="card-b" style={{display:'flex',flexDirection:'column',gap:10}}>
              <div className="list-row" style={{height:'auto',padding:0}}><div className="grow"><b>Before meeting</b><div className="sub">Prepare brief, context, open questions.</div></div><Pill tone="blue">Owen</Pill></div>
              <div className="list-row" style={{height:'auto',padding:0}}><div className="grow"><b>During meeting</b><div className="sub">Capture notes, decisions, and objections.</div></div><Pill tone="violet">Iris</Pill></div>
              <div className="list-row" style={{height:'auto',padding:0}}><div className="grow"><b>After meeting</b><div className="sub">Queue follow-up, tasks, and deal updates.</div></div><Pill tone="green">Conductor</Pill></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}




/* Story — per-deal historical timeline / mind-map */

const STORY_DEALS = ['DEAL-1210', 'DEAL-1207', 'DEAL-1221', 'DEAL-1218', 'DEAL-1219', 'DEAL-1213'];

/* A rich timeline for the active deal — touchpoints in TIME */
const STORY_TOUCHES_BY_DEAL = {
  'DEAL-1210': [
    { date: 'Mar 04 · 2026',  time: '10:14', kind: 'milestone', major: true,  who: 'p1', title: 'Deal opened',          body: 'Sutter Maritime introduced via Greenhill banker. Initial range $180–230M for the cold-chain carve-out. Sector: industrial logistics.' },
    { date: 'Mar 06 · 2026',  time: '15:22', kind: 'call',                    who: 'p1', title: 'First call — Aurore Chastain (Sutter Head of Corp Dev)', body: 'Aligned on transaction structure (stock, not asset). Aurore confirmed seller is "motivated, not desperate." Mentioned a competing process — likely Cantilever Group.', audio: { dur: '12:34' } },
    { date: 'Mar 11 · 2026',  time: '09:01', kind: 'email',                   who: 'p3', title: 'NDA countersigned',     body: 'Mutual NDA executed. Sutter requested 30-day exclusivity window — declined; offered 14 days post-LOI instead.' },
    { date: 'Mar 14 · 2026',  time: '11:30', kind: 'meeting', major: true,    who: 'p1', title: 'CIM review — internal session', body: 'Reviewed Sutter\'s CIM with the deal team. Top-line revenue $412M, EBITDA $58M, growth 9% CAGR. Customer concentration is the flag: top 5 = 41%.' },
    { date: 'Mar 19 · 2026',  time: '14:00', kind: 'note',                    who: 'p4', title: 'Working model v1',       body: 'Built base/bull/bear DCF. Base case: 7.2x EBITDA → $420M EV. Bull case: 8.5x → $495M. Bear: 6.0x → $350M. Recommend opening at $385M, walking to $440M.' },
    { date: 'Mar 22 · 2026',  time: '17:45', kind: 'video',                   who: 'p1', title: 'Mgmt presentation — recorded', body: 'CFO walked the team through ops and capex. Sharp question from Theo on the depreciation policy. Asset-light model is more believable than expected.', video: { dur: '54:12' } },
    { date: 'Apr 02 · 2026',  time: '08:14', kind: 'milestone', major: true,  who: 'p1', title: 'IOI submitted at $400M', body: 'Indication of Interest letter delivered. Range $385–420M, structure cash-free debt-free, exclusivity 30 days post-acceptance. Set first-round bid deadline as Apr 10.' },
    { date: 'Apr 08 · 2026',  time: '10:30', kind: 'audio',                   who: 'p1', title: 'Voice memo — recap of banker call', body: '"They have one other party at higher headline price but messier structure. Banker says we\'re the favored buyer if we can hold $415 and offer speed."', audio: { dur: '03:42' } },
    { date: 'Apr 12 · 2026',  time: '13:55', kind: 'milestone', major: true,  who: 'p1', title: 'Selected as preferred bidder — exclusivity granted', body: 'Sutter accepted $415M headline with rep & warranty insurance backstop. 30-day exclusivity through May 12. Definitive agreement target: signing by Friday May 23.' },
    { date: 'Apr 18 · 2026',  time: '09:00', kind: 'doc',                     who: 'p7', title: 'DD request list issued',  body: '47 items across 5 workstreams (Financial, Legal, Commercial, Operational, Technology). Estimated 18 business days to clear.' },
    { date: 'Apr 24 · 2026',  time: '16:08', kind: 'meeting',                 who: 'p2', title: 'Customer reference calls (5 of top 20)', body: 'Three of five gave strong references; two flagged delivery-time inconsistency in Q4. Not deal-breaking but a price-conversation lever.' },
    { date: 'Apr 30 · 2026',  time: '11:22', kind: 'note',                    who: 'p4', title: 'Working capital memo — first draft', body: 'Identified $14M working-capital adjustment in our favor. Pushing for peg vs. rolling-average mechanism.' },
    { date: 'May 06 · 2026',  time: '14:15', kind: 'audio',                   who: 'p7', title: 'Counsel debrief — §4.3 flag',  body: 'Hana walked through assignment language concerns. Tessellate 2024 patent assignment chain has a gap. Mitigant: rep & warranty + holdback.', audio: { dur: '07:18' } },
    { date: 'May 12 · 2026',  time: '17:01', kind: 'email',                   who: 'p1', title: 'Exclusivity extended by 10 days', body: 'Sutter agreed to extend through May 22 to accommodate DD §4.3 resolution.' },
    { date: 'May 16 · 2026',  time: '10:40', kind: 'doc',                     who: 'p7', title: 'Definitive agreement v3 uploaded', body: 'v3 reflects revised R&W cap (13.5%), peg-based WC mechanism, and the §4.3 holdback ($8M, 18 months).' },
    { date: 'May 18 · 2026',  time: '19:33', kind: 'signature',               who: 'external', title: 'External: Sutter counsel viewed §4.3 redline', body: 'Audit trail entry — counterparty counsel accessed the redline at 19:33 EST. Watermarked copy, 4 page views.' },
    { date: 'May 19 · 2026',  time: '14:55', kind: 'note',                    who: 'p7', title: '§4.3 — flag cleared',    body: 'After 11 days of back-and-forth, both sides agreed to the holdback structure. Ready to sign.' },
    { date: 'May 20 · 2026',  time: '08:42', kind: 'meeting', major: true,    who: 'p1', title: 'Pre-signing alignment — internal',  body: 'Final review of WC peg, holdback mechanic, and post-close timeline. Maren cleared to sign Friday May 23.' },
  ],
  'DEAL-1207': [
    { date: 'Jan 12 · 2026',  time: '10:00', kind: 'milestone', major: true,  who: 'p1', title: 'Deal opened',          body: 'Series C extension introduced by existing investor.' },
    { date: 'Jan 18 · 2026',  time: '14:30', kind: 'call',                    who: 'p1', title: 'CEO first call',         body: 'Set up first principals meeting. Confirmed €42M ask, 18-month runway target.', audio: { dur: '08:22' } },
    { date: 'Feb 04 · 2026',  time: '11:00', kind: 'meeting',                 who: 'p1', title: 'On-site visit, Rotterdam', body: 'Plant tour. Saw the new fabrication line. Capex spend looks justified.' },
    { date: 'Mar 02 · 2026',  time: '16:20', kind: 'note',                    who: 'p4', title: 'Term sheet draft',       body: 'Drafted at $42M @ $310M pre-money. Teams-rata, board observer, no anti-dilution past 15%.' },
    { date: 'May 18 · 2026',  time: '09:14', kind: 'note',                    who: 'p7', title: '§4.3 — counsel flag',    body: 'Two items in assignment language. Tracking to clearance by Friday.' },
  ],
  'DEAL-1221': [
    { date: 'Apr 03 · 2026',  time: '11:00', kind: 'milestone', major: true,  who: 'p2', title: 'Deal opened',           body: 'Bramble & Co. inbound via investor network. Growth equity, minority position.' },
    { date: 'Apr 14 · 2026',  time: '15:00', kind: 'meeting',                 who: 'p2', title: 'Founder meeting',         body: 'Spent 90 minutes with the founders in Portland. Brand discipline is exceptional.' },
    { date: 'May 02 · 2026',  time: '09:00', kind: 'doc',                     who: 'p2', title: 'Term sheet executed',    body: 'Counter-signed at $12M, 20% post-money minority.' },
    { date: 'May 20 · 2026',  time: '06:42', kind: 'milestone', major: true,  who: 'p2', title: 'Moved to Closing',       body: 'All DD cleared. Scheduling signing for end of week.' },
  ],
  'DEAL-1218': [
    { date: 'Feb 22 · 2026',  time: '10:00', kind: 'milestone', major: true,  who: 'p1', title: 'Follow-on opened',        body: 'Tessellate Series B follow-on. Existing portfolio company.' },
    { date: 'Mar 10 · 2026',  time: '11:30', kind: 'call',                    who: 'p1', title: 'Board catch-up call',     body: 'Updated on traction. ARR up 38% since last raise.', audio: { dur: '14:09' } },
    { date: 'May 12 · 2026',  time: '13:40', kind: 'doc',                     who: 'p4', title: 'Updated cap table',       body: 'Reflects new SAFE conversions.' },
    { date: 'May 19 · 2026',  time: '17:01', kind: 'signature',               who: 'p2', title: 'Signature requested · Tessellate CFO', body: 'Awaiting CFO countersign on term sheet.' },
  ],
  'DEAL-1219': [
    { date: 'Mar 19 · 2026',  time: '14:00', kind: 'milestone', major: true,  who: 'p3', title: 'Buyout introduced by banker', body: 'Halcyon Payments — full-platform buyout, ~£110M.' },
    { date: 'Apr 11 · 2026',  time: '10:00', kind: 'meeting',                 who: 'p3', title: 'Management presentation', body: 'Full deck and Q&A session with the leadership team.' },
    { date: 'May 09 · 2026',  time: '16:00', kind: 'video',                   who: 'p5', title: 'Customer ref interview — anonymous', body: 'Strong positive ref from a top-10 merchant.', video: { dur: '22:14' } },
  ],
  'DEAL-1213': [
    { date: 'Feb 02 · 2026',  time: '09:00', kind: 'milestone', major: true,  who: 'p3', title: 'JV exploration opened',   body: 'Quorum Energy — carbon-credit joint venture concept.' },
    { date: 'Apr 22 · 2026',  time: '14:00', kind: 'note',                    who: 'p3', title: 'JV term sheet sent',       body: '$88M JV structured 60/40, 7-year horizon.' },
    { date: 'May 14 · 2026',  time: '09:00', kind: 'note',                    who: 'p3', title: 'No response — flagged',   body: 'No movement in 22 days. Escalating to banker.' },
  ],
};

function kindIcon(kind) {
  switch (kind) {
    case 'call':      return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z"/></svg>;
    case 'meeting':   return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case 'email':     return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>;
    case 'note':      return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>;
    case 'doc':       return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8 13h6M8 17h6"/></svg>;
    case 'audio':     return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    case 'video':     return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-4v12l-6-4z"/></svg>;
    case 'signature': return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17s1-2 5-2 5 2 9 2"/><path d="M16 5l3 3-7 7-3 1 1-3z"/></svg>;
    case 'milestone': return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.4 6.4L21 12l-6.6 2.6L12 21l-2.4-6.4L3 12l6.6-2.6z"/></svg>;
    default:          return null;
  }
}

function kindLabel(kind) {
  return { call:'Call', meeting:'Meeting', email:'Email', note:'Note', doc:'Document', audio:'Voice memo', video:'Video', signature:'Signature', milestone:'Milestone' }[kind] || kind;
}

function StoryPage({ deals, openDeal, focusDealId }) {
  const [activeId, setActiveId] = React.useState(focusDealId || STORY_DEALS[0]);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [composeKind, setComposeKind] = React.useState('note');
  const [draft, setDraft] = React.useState('');
  const [extraTouches, setExtraTouches] = React.useState({});
  const [clientQuery, setClientQuery] = React.useState('');
  const [contactQuery, setContactQuery] = React.useState('');
  const [storyQuery, setStoryQuery] = React.useState('');

  React.useEffect(() => {
    if (focusDealId) setActiveId(focusDealId);
  }, [focusDealId]);

  const deal = deals.find(d => d.id === activeId);
  const baseTouches = STORY_TOUCHES_BY_DEAL[activeId] || [];
  const userTouches = extraTouches[activeId] || [];
  const touches = [...baseTouches, ...userTouches];
  const co = deal ? companyOf(deal.company) : null;
  const stage = deal ? stageOf(deal.stage) : null;
  const selectedCompanyLabel = co?.name || deal?.company || 'No client selected';
  const selectedDealLabel = deal ? `${deal.id} · ${deal.name}` : 'Select a deal';

  const counts = touches.reduce((acc, t) => { acc[t.kind] = (acc[t.kind] || 0) + 1; return acc; }, {});
  const selectedOwner = deal ? personOf(deal.owner) : null;
  const selectedTeam = deal ? (deal.team || []).map(personOf).filter(Boolean) : [];
  const selectedContacts = selectedOwner ? [selectedOwner, ...selectedTeam.filter(p => p.id !== selectedOwner.id)] : selectedTeam;
  const clientMatches = (d) => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return true;
    const company = companyOf(d.company);
    return [
      d.name,
      d.id,
      d.type,
      d.source,
      company?.name,
      company?.sector,
      company?.hq,
    ].filter(Boolean).some(value => String(value).toLowerCase().includes(q));
  };
  const contactMatches = (d) => {
    const q = contactQuery.trim().toLowerCase();
    if (!q) return true;
    return [d.owner, ...(d.team || [])]
      .map(personOf)
      .filter(Boolean)
      .some(person => [person.name, person.role, person.initials].some(value => String(value).toLowerCase().includes(q)));
  };
  const dealOptions = deals.filter(d => clientMatches(d) && contactMatches(d));
  const visibleTouches = storyQuery.trim()
    ? touches.filter(t => [t.title, t.body, t.kind, kindLabel(t.kind), personOf(t.who)?.name]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(storyQuery.trim().toLowerCase())))
    : touches;

  const submitTouch = () => {
    if (!draft.trim()) return;
    const now = new Date();
    const newTouch = {
      date: 'May 20 · 2026',
      time: now.toTimeString().slice(0, 5),
      kind: composeKind,
      who: 'p1',
      title: composeKind === 'note' ? 'Note' :
             composeKind === 'audio' ? 'Voice memo' :
             composeKind === 'video' ? 'Video clip' :
             kindLabel(composeKind),
      body: draft,
      ...(composeKind === 'audio' ? { audio: { dur: '00:18' } } : {}),
      ...(composeKind === 'video' ? { video: { dur: '00:42' } } : {}),
    };
    setExtraTouches(prev => ({ ...prev, [activeId]: [newTouch, ...(prev[activeId] || [])] }));
    setDraft('');
    setComposeOpen(false);
  };

  // Group touches by month for editorial month rules
  const byMonth = visibleTouches.reduce((acc, t) => {
    const m = t.date.split(' · ')[0].slice(0, 3);
    if (!acc[m]) acc[m] = [];
    acc[m].push(t);
    return acc;
  }, {});

  return (
    <div className="story">
      <header className="story-h">
        <div className="story-title-block">
          <div className="deal-label">
            <span style={{width:8,height:8,borderRadius:'50%',background:'var(--accent)'}}/>
            <span>Story record</span>
            <span style={{opacity:0.5}}>·</span>
            <span className="mono" style={{fontFamily:'var(--font-mono)'}}>{activeId}</span>
            {stage && <><span style={{opacity:0.5}}>·</span><span>{stage.name}</span></>}
          </div>
          <h1>
            {deal ? deal.name.split(' — ')[0] : 'Select a deal'}<br/>
            {deal && <em>— {deal.name.split(' — ')[1] || deal.type}</em>}
          </h1>
          {deal && (
            <div className="summary">
              {co?.sector} · {co?.hq} · {co?.emp} employees. Opened {baseTouches[0]?.date || '—'}, currently in {stage?.name}.
              {deal.tags?.length > 0 && ' Flagged: ' + deal.tags.join(', ') + '.'}
            </div>
          )}
        </div>
        {deal && (
          <div className="stats">
            <div className="story-stat">
              <span className="l">Deal value</span>
              <span className="v">{fmtCurrency(deal.value, deal.currency)}</span>
            </div>
            <div className="story-stat">
              <span className="l">Probability</span>
              <span className="v">{deal.prob}<small>%</small></span>
            </div>
            <div className="story-stat">
              <span className="l">Target close</span>
              <span className="v" style={{fontSize:18}}>{deal.close}</span>
            </div>
            <div className="story-stat">
              <span className="l">Touches</span>
              <span className="v">{touches.length}</span>
            </div>
          </div>
        )}
      </header>

      {/* Scalable Story selectors */}
      <div className="story-selector-bar">
        <div className="story-control">
          <label htmlFor="story-deal-select">Client / deal</label>
          <select
            id="story-deal-select"
            className="story-control-field"
            value={activeId}
            onChange={(event) => setActiveId(event.target.value)}
          >
            {dealOptions.map(d => {
              const company = companyOf(d.company);
              return <option key={d.id} value={d.id}>{company?.name || d.company} - {d.name}</option>;
            })}
            {!dealOptions.find(d => d.id === activeId) && deal && (
              <option value={deal.id}>{co?.name || deal.company} - {deal.name}</option>
            )}
          </select>
        </div>
        <div className="story-control">
          <label htmlFor="story-client-search">Search clients</label>
          <input
            id="story-client-search"
            className="story-control-field"
            value={clientQuery}
            onChange={(event) => setClientQuery(event.target.value)}
            placeholder="Company, sector, location"
          />
        </div>
        <div className="story-control">
          <label htmlFor="story-contact-search">Search contacts</label>
          <input
            id="story-contact-search"
            className="story-control-field"
            value={contactQuery}
            onChange={(event) => setContactQuery(event.target.value)}
            placeholder={selectedContacts.length ? selectedContacts.map(p => p.name.split(' ')[0]).join(', ') : 'Owner or team'}
          />
        </div>
        <div className="story-control">
          <label htmlFor="story-record-search">Search story</label>
          <input
            id="story-record-search"
            className="story-control-field"
            value={storyQuery}
            onChange={(event) => setStoryQuery(event.target.value)}
            placeholder="Notes, calls, documents"
          />
        </div>
      </div>
      <div className="story-result-count">
        {dealOptions.length} deal{dealOptions.length === 1 ? '' : 's'} available · {visibleTouches.length} of {touches.length} story item{touches.length === 1 ? '' : 's'} shown
      </div>

      <div className="story-workbar">
        <div className="story-context-line">
          <span>{selectedCompanyLabel}</span>
          <span>{selectedDealLabel}</span>
          <span>{visibleTouches.length} visible</span>
        </div>
        <div className="story-action-group">
          <label htmlFor="story-action-select">Add</label>
          <select
            id="story-action-select"
            className="story-control-field"
            value={composeKind}
            onChange={(event) => setComposeKind(event.target.value)}
          >
            <option value="note">Note</option>
            <option value="audio">Voice memo</option>
            <option value="video">Video clip</option>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="doc">Document</option>
          </select>
          <button className="story-tool add" type="button" onClick={() => setComposeOpen(true)}>
            <span className="ic">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </span>
            Add item
          </button>
        </div>
      </div>

      {composeOpen && (
        <div className="add-sheet" style={{marginBottom:24}}>
          <div className="row" style={{justifyContent:'space-between',alignItems:'center'}}>
            <span className="ed-label">Adding · {kindLabel(composeKind)}</span>
            <button className="btn ghost sm" type="button" onClick={() => { setComposeOpen(false); setDraft(''); }}>Cancel</button>
          </div>
          {composeKind === 'audio' ? (
            <div style={{display:'flex',flexDirection:'column',gap:10,alignItems:'stretch'}}>
              <div className="audio-bar">
                <div className="play" style={{background:'var(--accent)'}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="4" height="12"/><rect x="14" y="6" width="4" height="12"/></svg>
                </div>
                <div className="wave" style={{height:36}}>
                  {Array.from({length: 60}).map((_, i) => (
                    <i key={i} style={{height: (8 + Math.abs(Math.sin(i*0.4))*24) + 'px', background:'var(--accent)'}}/>
                  ))}
                </div>
                <span className="dur">REC · 00:18</span>
              </div>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Optional transcript / note…"/>
            </div>
          ) : composeKind === 'video' ? (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div className="video-card photo" style={{aspectRatio:'16/9'}}>
                <div className="ph-title italic">Recording</div>
                <div className="ph-meta">VIDEO · 00:42 · 1080p</div>
                <div className="play-overlay">
                  <div className="pb">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
              </div>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Caption / note…"/>
            </div>
          ) : (
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={
                composeKind === 'note' ? 'Write a note for the file… (visible to deal team)' :
                composeKind === 'call' ? 'Who did you speak with? What was decided?' :
                composeKind === 'meeting' ? 'Attendees, agenda, decisions…' :
                composeKind === 'email' ? 'Subject + summary…' :
                'Describe…'
              }
            />
          )}
          <div className="row">
            <button className="story-tool" type="button" title="Attach file">
              <span className="ic">{kindIcon('doc')}</span>Attach
            </button>
            <button className="story-tool" type="button" title="Mention teammate">
              <span className="ic">@</span>Mention
            </button>
            <div className="grow"/>
            <button className="btn primary sm" type="button" onClick={submitTouch}>Add to story</button>
          </div>
        </div>
      )}

      {/* The river */}
      <div className="story-track">
        {Object.entries(byMonth).map(([month, items]) => (
          <React.Fragment key={month}>
            <div className="month-mark">
              <div className="label">{month}.</div>
              <div className="rule"/>
            </div>
            {items.map((t, i) => {
              const p = t.who === 'external' ? null : personOf(t.who);
              return (
                <div key={month + i} className={'touch ' + (t.major ? 'major' : '')}>
                  <div className="date">
                    {t.date.split(' · ')[0]}<br/>
                    <span style={{color:'var(--text-3)',letterSpacing:'0.1em'}}>{t.time}</span>
                  </div>
                  <div className="touch-card">
                    <div className="touch-h">
                      <span className={'kind ' + t.kind}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                          {kindIcon(t.kind)} {kindLabel(t.kind)}
                        </span>
                      </span>
                      {p ? (
                        <span className="who">
                          <Avatar person={p}/> {p.name}
                        </span>
                      ) : (
                        <span className="who" style={{color:'var(--accent)'}}>External party</span>
                      )}
                      {t.major && <span style={{color:'var(--accent)',fontWeight:600}}>· KEY MOMENT</span>}
                    </div>
                    <div className="title">{t.title}</div>
                    {t.body && <div className="body">{t.body}</div>}
                    {t.audio && (
                      <div className="audio-bar">
                        <div className="play">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                        <div className="wave">
                          {Array.from({length: 80}).map((_, j) => (
                            <i key={j} style={{height: (5 + Math.abs(Math.sin(j*0.3 + i))*22) + 'px'}}/>
                          ))}
                        </div>
                        <span className="dur">{t.audio.dur}</span>
                      </div>
                    )}
                    {t.video && (
                      <div className="video-card photo">
                        <div className="ph-title italic">Video</div>
                        <div className="play-overlay">
                          <div className="pb">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                        <div className="dur">{t.video.dur}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}

        {/* End-of-story marker */}
        <div className="touch">
          <div className="date" style={{paddingTop:6}}>
            <span style={{color:'var(--accent)',fontWeight:600}}>NOW</span>
          </div>
          <div style={{paddingTop:6,fontFamily:'var(--font-serif)',fontSize:24,fontStyle:'italic',color:'var(--text-2)'}}>
            …the story continues.
          </div>
        </div>
      </div>
    </div>
  );
}


/* Leads v2 — list + click-into-detail screen */

const LEAD_TOUCHES = {
  'L-9881': [
    { date: 'May 20', time: '08:42', kind: 'event',  who: 'p1', title: 'Joined "Cross-border M&A in 2026" webinar', body: 'Attended 47 of 60 minutes. Asked one question on cross-border tax treatment.' },
    { date: 'May 19', time: '14:11', kind: 'email',  who: 'p1', title: 'Downloaded "Mid-market DD checklist"',          body: 'Source: organic search · landing page → content asset' },
    { date: 'May 17', time: '09:30', kind: 'visit',  who: 'p1', title: 'Visited pricing page (3rd time)',               body: 'Spent 4m 12s on Teams tier. Bounced from FAQ on Enterprise pricing.' },
    { date: 'May 14', time: '16:08', kind: 'email',  who: 'p1', title: 'Replied to outbound sequence (step 2)',         body: 'Aurore: "Curious about your VDR — currently using Datasite. What\'s different?"' },
    { date: 'May 09', time: '11:24', kind: 'visit',  who: 'p1', title: 'First touch — visited from a Banker referral',  body: 'Referrer: Greenhill & Co. Source attribution: clean inbound.' },
  ],
  'L-9882': [
    { date: 'May 20', time: '07:18', kind: 'email',  who: 'p1', title: 'Replied to introduction',           body: 'CFO open to a 30-minute call this week. Mentioned competing tools.' },
    { date: 'May 18', time: '12:00', kind: 'visit',  who: 'p1', title: 'Reviewed Security page',           body: 'Spent 6m on SOC 2 + residency sections.' },
    { date: 'May 12', time: '15:45', kind: 'event',  who: 'p1', title: 'Outbound sequence step 1 sent',    body: 'Personalized: referenced Foundry Helix\'s carbon-credit acquisition strategy.' },
  ],
};

const LEAD_RECS = {
  'L-9881': [
    { score: 92, action: 'Book a 30-min discovery call',           why: 'Three pricing-page visits + downloaded DD checklist · high purchase intent', cta: 'Send Calendly link' },
    { score: 78, action: 'Send Datasite comparison brief',         why: 'Aurore asked about VDR · provide a side-by-side · close the loop on the inbound reply', cta: 'Draft email' },
    { score: 64, action: 'Loop in Hana for legal-DD questions',    why: 'Cross-border M&A · counsel touchpoint accelerates decisions', cta: 'Send invite' },
  ],
  'L-9882': [
    { score: 81, action: 'Send pre-call brief for Foundry Helix',  why: 'CFO accepted call · arm them with talking points on industrial carbon-credit deals', cta: 'Draft brief' },
    { score: 62, action: 'Schedule security review with their CISO', why: 'They spent 6m on SOC 2 page · likely a security blocker',                       cta: 'Send invite' },
  ],
};

function LeadsPage({ openDeal, setQuickCreate, leads, selectedLead, setSelectedLead }) {
  if (selectedLead) {
    return <LeadDetail lead={selectedLead} onBack={() => setSelectedLead(null)}/>;
  }
  return <LeadsList leads={leads} onOpen={setSelectedLead} setQuickCreate={setQuickCreate}/>;
}

function LeadsList({ leads, onOpen, setQuickCreate }) {
  const [view, setView] = React.useState('all');
  const [sort, setSort] = React.useState('recent');
  const [dateRange, setDateRange] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const tone = s => s === 'hot' ? 'red' : s === 'warm' ? 'amber' : 'gray';
  const intent = s => s === 'high' ? 'High' : s === 'med' ? 'Medium' : 'Low';
  const allLeads = leads || LEADS;
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const inDateRange = (lead) => {
    if (dateRange === 'all') return true;
    const received = lead.receivedAt ? new Date(lead.receivedAt) : null;
    if (!received) return false;
    if (dateRange === 'today') return lead.receivedAt.slice(0, 10) === todayKey;
    if (dateRange === 'week') return now.getTime() - received.getTime() <= 7 * 24 * 60 * 60 * 1000;
    return true;
  };
  const filtered = allLeads
    .filter(l => view === 'all' ? true : view === 'needs_followup' ? ['due_now', 'overdue', 'scheduled', 'upcoming'].includes(l.followUpStatus) : view === 'qr' ? l.channel === 'QR' || l.qrSource : view === 'stale' ? l.followUpStatus === 'stale' : l.status === view)
    .filter(inDateRange)
    .filter(l => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return [l.name, l.company, l.title, l.email, l.phone, l.channel, l.sector, l.notes].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sort === 'oldest') return leadReceivedTime(a) - leadReceivedTime(b);
      if (sort === 'followup') return new Date(a.followUpDueAt || '2999-12-31').getTime() - new Date(b.followUpDueAt || '2999-12-31').getTime();
      if (sort === 'priority') return ({ high: 3, medium: 2, low: 1 }[b.priority] || 0) - ({ high: 3, medium: 2, low: 1 }[a.priority] || 0);
      if (sort === 'value') return (b.value || 0) - (a.value || 0);
      if (sort === 'status') return String(a.status).localeCompare(String(b.status));
      return leadReceivedTime(b) - leadReceivedTime(a);
    });
  const hot = allLeads.filter(l => l.status === 'hot').length;
  const warm = allLeads.filter(l => l.status === 'warm').length;
  const totalPipe = allLeads.reduce((s, l) => s + (l.value || 0), 0);
  const urgent = allLeads.filter(l => l.urgency === 'Immediate').length;

  return (
    <>
      <div className="page-h">
        <div><h1>Leads</h1><div className="sub">{allLeads.length} active · {hot} hot · {urgent} immediate · estimated pipeline ${compactNum(totalPipe)}</div></div>
        <div className="page-actions">
          <button className="btn" type="button" onClick={() => window.openShare && window.openShare({ type: 'capture', id: 'capture', title: 'Public lead capture page', subtitle: 'capture.html · share this link or its QR code to invite leads' })}>
            <Icon name="upload" size={13}/> Share capture link
          </button>
          <div className="seg">
            <button className={view === 'all' ? 'active' : ''} type="button" onClick={() => setView('all')}>All</button>
            <button className={view === 'hot' ? 'active' : ''} type="button" onClick={() => setView('hot')}>Hot ({hot})</button>
            <button className={view === 'warm' ? 'active' : ''} type="button" onClick={() => setView('warm')}>Warm ({warm})</button>
            <button className={view === 'needs_followup' ? 'active' : ''} type="button" onClick={() => setView('needs_followup')}>Needs follow-up</button>
          </div>
          <button className="btn" type="button" onClick={() => setView('qr')}><Icon name="filter" size={13}/> QR</button>
          <button className="btn" type="button"><Icon name="upload" size={13}/> Import CSV</button>
          <button className="btn primary" type="button" onClick={() => setQuickCreate && setQuickCreate('lead')}><Icon name="plus" size={13}/> New lead</button>
        </div>
      </div>

      <div className="filterbar">
        <input className="chip" style={{minWidth:220}} placeholder="Search leads, company, email..." value={query} onChange={(e) => setQuery(e.target.value)}/>
        <select className="chip" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort leads">
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest</option>
          <option value="followup">Follow-up due</option>
          <option value="priority">Priority</option>
          <option value="status">Status</option>
          <option value="value">Deal value</option>
        </select>
        <select className="chip" value={dateRange} onChange={(e) => setDateRange(e.target.value)} aria-label="Filter by received date">
          <option value="all">All dates</option>
          <option value="today">Received today</option>
          <option value="week">Last 7 days</option>
        </select>
        <button className={'chip ' + (view === 'stale' ? 'applied' : '')} type="button" onClick={() => setView(view === 'stale' ? 'all' : 'stale')}>Stale leads</button>
        <span style={{marginLeft:'auto',fontSize:11,color:'var(--text-3)'}} className="mono">{filtered.length} shown · sorted by {sort}</span>
      </div>

      <div style={{flex:1,overflowY:'auto'}}>
        {filtered.map(l => (
          <div key={l.id} className="lead-card" onClick={() => onOpen(l)}>
            <ScoreRing score={l.score}/>
            <div style={{display:'flex',gap:14,flex:1,minWidth:0,alignItems:'center'}}>
              <div style={{minWidth:170,flex:'0 0 220px'}}>
                <b style={{fontSize:13.5}}>{l.name}</b>
                <div className="text-xs muted">{l.title}</div>
              </div>
              <div style={{minWidth:170,flex:1}}>
                <div style={{fontSize:13}}>{l.company}</div>
                <div className="text-xs muted">{l.sector}</div>
              </div>
              <div style={{flex:1,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <Pill tone={tone(l.status)}>{l.status.toUpperCase()}</Pill>
                <Pill tone={l.intent === 'high' ? 'violet' : l.intent === 'med' ? 'blue' : 'gray'} noDot>{intent(l.intent)} intent</Pill>
                <Pill tone={l.urgency === 'Immediate' ? 'red' : l.urgency === 'Same Day' ? 'amber' : 'gray'} noDot>{l.urgency || 'Normal'}</Pill>
                <span className="tag">{l.channel}</span>
              </div>
              <div className="text-xs muted mono" style={{minWidth:130,textAlign:'right'}}>In {formatDateTime(l.receivedAt)}<br/>Next {formatDateTime(l.followUpDueAt)}</div>
              <div className="mono" style={{minWidth:90,textAlign:'right',fontWeight:500}}>${compactNum(l.value)}</div>
            </div>
            <div style={{display:'flex',gap:4}}>
              <button className="btn ghost sm" type="button" title="Email" onClick={e => e.stopPropagation()}><Icon name="send" size={12}/></button>
              <button className="btn ghost sm" type="button" title="Call"  onClick={e => e.stopPropagation()}><Icon name="phone" size={12}/></button>
              <button className="btn primary sm" type="button" onClick={e => { e.stopPropagation(); onOpen(l); }}>Open</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ScoreRing({ score }) {
  const radius = 14;
  const C = 2 * Math.PI * radius;
  const off = C - (score / 100) * C;
  const color = score >= 75 ? 'var(--status-green)' : score >= 50 ? 'var(--status-amber)' : 'var(--status-red)';
  return (
    <div className="score-ring">
      <svg viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="3"/>
        <circle cx="18" cy="18" r={radius} fill="none" stroke={color} strokeWidth="3" strokeDasharray={C} strokeDashoffset={off} strokeLinecap="round"/>
      </svg>
      <div className="v">{score}</div>
    </div>
  );
}

function BigScoreRing({ score }) {
  const radius = 56;
  const C = 2 * Math.PI * radius;
  const off = C - (score / 100) * C;
  const color = score >= 75 ? 'var(--status-green)' : score >= 50 ? 'var(--status-amber)' : 'var(--status-red)';
  return (
    <div style={{width:140,height:140,position:'relative',display:'grid',placeItems:'center'}}>
      <svg viewBox="0 0 130 130" style={{position:'absolute',inset:0,transform:'rotate(-90deg)'}}>
        <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="6"/>
        <circle cx="65" cy="65" r={radius} fill="none" stroke={color} strokeWidth="6" strokeDasharray={C} strokeDashoffset={off} strokeLinecap="round"/>
      </svg>
      <div style={{textAlign:'center',position:'relative'}}>
        <div style={{fontFamily:'var(--font-serif)',fontSize:44,fontWeight:400,lineHeight:1,color:'var(--text)'}}>{score}</div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'.14em',color:'var(--text-3)',textTransform:'uppercase',marginTop:4}}>Score</div>
      </div>
    </div>
  );
}

function LeadDetail({ lead, onBack }) {
  const [tab, setTab] = React.useState('overview');
  const [convertOpen, setConvertOpen] = React.useState(false);
  const touches = LEAD_TOUCHES[lead.id] || [];
  const recs = LEAD_RECS[lead.id] || [];

  return (
    <>
      <div className="lead-detail-h">
        <div className="lead-detail-back">
          <button className="btn ghost sm" type="button" onClick={onBack}>
            <Icon name="chevR" size={12} className="rev"/> Back to leads
          </button>
          <span className="mono text-xs muted">{lead.id}</span>
          <Pill tone={lead.status === 'hot' ? 'red' : lead.status === 'warm' ? 'amber' : 'gray'}>{lead.status.toUpperCase()}</Pill>
          <Pill tone={lead.intent === 'high' ? 'violet' : lead.intent === 'med' ? 'blue' : 'gray'} noDot>{lead.intent.toUpperCase()} INTENT</Pill>
          <Pill tone={lead.urgency === 'Immediate' ? 'red' : lead.urgency === 'Same Day' ? 'amber' : 'gray'} noDot>{lead.urgency || 'Normal'} URGENCY</Pill>
          <span className="tag">{lead.channel}</span>
        </div>

        <div className="lead-detail-top">
          <div>
            <h1 className="lead-name">{lead.name}<em>.</em></h1>
            <div className="lead-sub">
              {lead.title} <span style={{opacity:0.5}}>·</span> {lead.company} <span style={{opacity:0.5}}>·</span> {lead.sector}
            </div>
            <div className="lead-actions">
              <button className="btn primary" type="button" onClick={() => setConvertOpen(true)}>
                <Icon name="check" size={13}/> Convert to opportunity
              </button>
              <button className="btn" type="button"><Icon name="send" size={13}/> Email</button>
              <button className="btn" type="button"><Icon name="phone" size={13}/> Call</button>
              <button className="btn" type="button"><Icon name="cal" size={13}/> Meeting</button>
              <button className="btn ghost icon" type="button" title="More"><Icon name="more" size={14}/></button>
            </div>
          </div>
          <div className="lead-detail-score">
            <BigScoreRing score={lead.score}/>
            <div style={{fontSize:12.5,color:'var(--text-2)',lineHeight:1.5}}>
              <div>Est. value <b className="mono">${compactNum(lead.value)}</b></div>
              <div>Last touch <span className="muted mono">{lead.last}</span></div>
              <div>Received <span className="muted mono">{formatDateTime(lead.receivedAt)}</span></div>
              <div>Follow-up <span className="muted mono">{formatDateTime(lead.followUpDueAt)}</span></div>
              <div>Owner <b>You</b></div>
            </div>
          </div>
        </div>

        <div className="tabs">
          <button className={'tab ' + (tab==='overview'?'active':'')} type="button" onClick={()=>setTab('overview')}>Overview</button>
          <button className={'tab ' + (tab==='activity'?'active':'')} type="button" onClick={()=>setTab('activity')}>Activity <span className="muted">· {touches.length}</span></button>
          <button className={'tab ' + (tab==='communication'?'active':'')} type="button" onClick={()=>setTab('communication')}>Communication</button>
          <button className={'tab ' + (tab==='recs'?'active':'')}      type="button" onClick={()=>setTab('recs')}>Recommended actions <span className="muted">· {recs.length}</span></button>
          <button className={'tab ' + (tab==='convert'?'active':'')}   type="button" onClick={()=>setTab('convert')}>Convert</button>
        </div>
      </div>

      <div className="lead-detail-body">
        {tab === 'overview' && <LeadOverview lead={lead} touches={touches} recs={recs} onTab={setTab}/>}
        {tab === 'activity' && <LeadActivity lead={lead} touches={touches}/>}
        {tab === 'communication' && <LeadCommunicationCenter lead={lead}/>}
        {tab === 'recs' && <LeadRecs recs={recs}/>}
        {tab === 'convert' && <LeadConvert lead={lead} onDone={onBack}/>}
      </div>

      {convertOpen && <LeadConvertSheet lead={lead} onClose={() => setConvertOpen(false)} onDone={onBack}/>}
    </>
  );
}

function LeadOverview({ lead, touches, recs, onTab }) {
  const breakdown = [
    { label: 'Pricing-page activity', weight: 22, max: 25 },
    { label: 'Content downloads',      weight: 14, max: 20 },
    { label: 'Channel quality',        weight: 18, max: 20 },
    { label: 'Reply engagement',       weight: 12, max: 15 },
    { label: 'Title / seniority',      weight: 14, max: 15 },
    { label: 'Recency',                weight: 12, max: 5 },
  ];

  return (
    <div className="lead-grid">
      <div className="lead-col-main">
        <div className="card">
          <div className="card-h"><div className="ttl">Score breakdown</div><span className="text-xs muted mono">Updated 2m ago</span></div>
          <div className="card-b">
            {breakdown.map(b => (
              <div key={b.label} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:5}}>
                  <span>{b.label}</span>
                  <span className="mono muted">{b.weight}<span style={{opacity:0.5}}> / {b.max}</span></span>
                </div>
                <div className="progress"><i style={{width: Math.min(100, (b.weight / b.max) * 100) + '%'}}/></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{marginTop:14}}>
          <div className="card-h">
            <div className="ttl">Recent activity</div>
            <button className="btn ghost sm" type="button" onClick={() => onTab('activity')}>See all →</button>
          </div>
          <div className="card-b" style={{padding:0}}>
            {touches.slice(0, 3).map((t, i) => (
              <div key={i} className="list-row" style={{height:'auto',padding:'12px 16px'}}>
                <span className="mono text-xs muted" style={{minWidth:48}}>{t.date}</span>
                <div className="grow">
                  <div className="ttl">{t.title}</div>
                  <div className="sub">{t.body}</div>
                </div>
                <span className="tag">{t.kind}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lead-col-side">
        <div className="card">
          <div className="card-h"><div className="ttl">About</div></div>
          <div className="card-b">
            <dl className="kv">
              <dt>Name</dt><dd>{lead.name}</dd>
              <dt>Title</dt><dd>{lead.title}</dd>
              <dt>Company</dt><dd>{lead.company}</dd>
              <dt>Sector</dt><dd>{lead.sector}</dd>
              <dt>Email</dt><dd className="mono text-xs">{lead.email || 'Not captured'}</dd>
              <dt>Phone</dt><dd className="mono text-xs">{lead.phone || 'Not captured'}</dd>
              <dt>Location</dt><dd>{[lead.city, lead.state].filter(Boolean).join(', ') || 'Not captured'}</dd>
              <dt>LinkedIn</dt><dd className="mono text-xs">{lead.social?.linkedin || 'Not captured'}</dd>
              <dt>Preferred contact</dt><dd>{lead.preferredContact || 'Not captured'}</dd>
              <dt>Source</dt><dd><span className="tag">{lead.channel}</span></dd>
              <dt>Status</dt><dd><Pill tone={lead.status === 'hot' ? 'red' : lead.status === 'warm' ? 'amber' : 'gray'}>{lead.status.toUpperCase()}</Pill></dd>
              <dt>Urgency</dt><dd><Pill tone={lead.urgency === 'Immediate' ? 'red' : lead.urgency === 'Same Day' ? 'amber' : 'gray'} noDot>{lead.urgency || 'Normal'}</Pill></dd>
              <dt>Follow-up due</dt><dd className="mono text-xs">{formatDateTime(lead.followUpDueAt)}</dd>
              <dt>Est. value</dt><dd className="mono">${compactNum(lead.value)}</dd>
              <dt>Last touch</dt><dd className="muted mono">{lead.last}</dd>
              <dt>Need</dt><dd>{lead.needSummary || lead.notes || 'Not captured'}</dd>
            </dl>
          </div>
        </div>

        <div className="card" style={{marginTop:14}}>
          <div className="card-h"><div className="ttl">Suggested next</div></div>
          <div className="card-b" style={{padding:0}}>
            {recs.slice(0, 2).map((r, i) => (
              <div key={i} className="list-row" style={{height:'auto',padding:'12px 16px'}}>
                <div className="grow">
                  <div className="ttl">{r.action}</div>
                  <div className="sub">{r.why}</div>
                </div>
                <button className="btn primary sm" type="button">{r.cta}</button>
              </div>
            ))}
            <div style={{padding:'10px 16px'}}>
              <button className="btn ghost sm" type="button" onClick={() => onTab('recs')}>All recommendations →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadActivity({ lead, touches }) {
  return (
    <div className="lead-activity">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <div className="seg">
          <button className="active" type="button">All</button>
          <button type="button">Emails</button>
          <button type="button">Calls</button>
          <button type="button">Visits</button>
          <button type="button">Events</button>
        </div>
        <div style={{flex:1}}/>
        <button className="btn sm" type="button"><Icon name="plus" size={12}/> Log activity</button>
      </div>
      <div className="lead-tl">
        {touches.map((t, i) => {
          const p = personOf(t.who);
          return (
            <div key={i} className="lead-tl-item">
              <div className="lead-tl-date">
                <div>{t.date}</div>
                <div style={{color:'var(--text-3)'}}>{t.time}</div>
              </div>
              <div className="lead-tl-card">
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                  <span className="tag">{t.kind}</span>
                  <span style={{fontSize:11.5,color:'var(--text-3)'}}>via {p.name}</span>
                </div>
                <div style={{fontFamily:'var(--font-serif)',fontSize:20,lineHeight:1.2,marginBottom:6}}>{t.title}</div>
                <div style={{fontSize:13.5,color:'var(--text-2)',lineHeight:1.55}}>{t.body}</div>
              </div>
            </div>
          );
        })}
        <div className="lead-tl-item">
          <div className="lead-tl-date"><div style={{color:'var(--accent)',fontWeight:600}}>NOW</div></div>
          <div style={{paddingTop:4,fontFamily:'var(--font-serif)',fontStyle:'italic',fontSize:18,color:'var(--text-3)'}}>…awaiting your next move.</div>
        </div>
      </div>
    </div>
  );
}

function LeadCommunicationCenter({ lead }) {
  const [smsResult, setSmsResult] = React.useState(null);
  const [voiceResult, setVoiceResult] = React.useState(null);
  const [sending, setSending] = React.useState(false);
  const [savingVoice, setSavingVoice] = React.useState(false);

  const sendSms = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSending(true);
    try {
      const response = await fetch('/api/messages/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: form.get('to') || lead.phone,
          message: form.get('message'),
          resource_type: 'lead',
          resource_id: lead.id,
        }),
      });
      setSmsResult(await response.json());
    } finally {
      setSending(false);
    }
  };

  const uploadVoice = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set('resource_type', 'lead');
    form.set('resource_id', lead.id);
    if (!form.get('title')) form.set('title', `Voice note for ${lead.name}`);
    setSavingVoice(true);
    try {
      const response = await fetch('/api/voice-notes', { method: 'POST', body: form });
      setVoiceResult(await response.json());
      event.currentTarget.reset();
    } finally {
      setSavingVoice(false);
    }
  };

  return (
    <div className="lead-grid">
      <div className="lead-col-main">
        <div className="card">
          <div className="card-h">
            <div><div className="ttl">Communication center</div><div className="sub">Every message, note, call, and transcript stays attached to this lead.</div></div>
            <Pill tone="blue" noDot>{lead.id}</Pill>
          </div>
          <div className="card-b" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <form onSubmit={sendSms} style={{display:'flex',flexDirection:'column',gap:10}}>
              <div className="ttl">Send SMS</div>
              <div className="field"><label>Phone</label><input name="to" type="tel" defaultValue={lead.phone || ''} placeholder="+15551234567" required/></div>
              <div className="field"><label>Message</label><textarea name="message" rows={5} defaultValue={`Hi ${lead.name?.split(' ')[0] || ''}, following up from ADGA.`} required/></div>
              <button className="btn primary" type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send text'}</button>
              {smsResult?.sms && <div className="text-xs muted">Message {smsResult.sms.status === 'sent' ? 'sent' : 'queued'} and attached to this lead.</div>}
            </form>

            <form onSubmit={uploadVoice} style={{display:'flex',flexDirection:'column',gap:10}}>
              <div className="ttl">Voice note</div>
              <div className="field"><label>Title</label><input name="title" type="text" placeholder={`Voice note for ${lead.name}`}/></div>
              <div className="field"><label>Audio</label><input name="audio" type="file" accept="audio/*" required/></div>
              <button className="btn primary" type="submit" disabled={savingVoice}>{savingVoice ? 'Processing...' : 'Attach and transcribe'}</button>
              {voiceResult?.voice_note && <div className="text-xs muted">Voice note {voiceResult.voice_note.transcription_status}. Transcript remains tied to {lead.id}.</div>}
            </form>
          </div>
        </div>
      </div>

      <div className="lead-col-side">
        <div className="card">
          <div className="card-h"><div className="ttl">Trace</div></div>
          <div className="card-b">
            <dl className="kv">
              <dt>Lead</dt><dd>{lead.name}</dd>
              <dt>Phone</dt><dd className="mono text-xs">{lead.phone || 'Not captured'}</dd>
              <dt>Email</dt><dd className="mono text-xs">{lead.email || 'Not captured'}</dd>
              <dt>Preferred contact</dt><dd>{lead.preferredContact || 'Not captured'}</dd>
              <dt>Next follow-up</dt><dd className="mono text-xs">{formatDateTime(lead.followUpDueAt)}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadRecs({ recs }) {
  return (
    <div className="lead-recs">
      <div className="text-sm muted" style={{marginBottom:18,maxWidth:'56ch'}}>
        Ranked by predicted lift on conversion. ADGA updates these every few minutes based on activity.
      </div>
      {recs.map((r, i) => (
        <div key={i} className="rec-card">
          <div className="rec-num">{String(i + 1).padStart(2, '0')}</div>
          <div className="rec-body">
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,flexWrap:'wrap'}}>
              <div style={{fontFamily:'var(--font-serif)',fontSize:24,lineHeight:1.15}}>{r.action}</div>
              <span className="rec-score">+{r.score}</span>
            </div>
            <div style={{fontSize:13.5,color:'var(--text-2)',lineHeight:1.55,marginBottom:14}}>{r.why}</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button className="btn primary sm" type="button">{r.cta}</button>
              <button className="btn ghost sm" type="button">Dismiss</button>
              <button className="btn ghost sm" type="button">Schedule for later</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadConvert({ lead, onDone }) {
  return <LeadConvertForm lead={lead} onDone={onDone} embedded/>;
}

function LeadConvertSheet({ lead, onClose, onDone }) {
  return (
    <>
      <div className="drawer-overlay" onClick={onClose}/>
      <div className="drawer" style={{width:'min(560px, 92vw)'}}>
        <div className="drawer-h">
          <button className="btn icon ghost" type="button" onClick={onClose}><Icon name="x" size={14}/></button>
          <div style={{flex:1}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'.18em',color:'var(--text-3)',textTransform:'uppercase'}}>Convert lead</div>
            <h2>{lead.name}</h2>
          </div>
        </div>
        <div className="drawer-body full">
          <LeadConvertForm lead={lead} onDone={() => { onClose(); onDone(); }}/>
        </div>
      </div>
    </>
  );
}

function LeadConvertForm({ lead, onDone, embedded }) {
  const [dealName, setDealName] = React.useState(lead.company + ' — opportunity');
  const [type, setType] = React.useState('Acquisition');
  const [stage, setStage] = React.useState('qualify');
  const [value, setValue] = React.useState(String(lead.value));

  return (
    <div style={embedded ? { maxWidth:'820px', padding:'0 32px' } : {}}>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:18,marginBottom:18}}>
        <div className="card">
          <div className="card-h"><div className="ttl">Create contact</div><span className="text-xs muted">From lead</span></div>
          <div className="card-b">
            <dl className="kv">
              <dt>Name</dt><dd>{lead.name}</dd>
              <dt>Title</dt><dd>{lead.title}</dd>
              <dt>Email</dt><dd className="mono text-xs">{lead.name.toLowerCase().replace(' ', '.')}@{lead.company.toLowerCase().split(' ')[0]}.com</dd>
            </dl>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="ttl">Create / link account</div><span className="text-xs muted">Company</span></div>
          <div className="card-b">
            <dl className="kv">
              <dt>Account</dt><dd>{lead.company}</dd>
              <dt>Sector</dt><dd>{lead.sector}</dd>
              <dt>Match</dt><dd className="muted">No existing account — new will be created</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><div className="ttl">Create opportunity</div></div>
        <div className="card-b">
          <div className="field">
            <label>Deal name</label>
            <input type="text" value={dealName} onChange={e => setDealName(e.target.value)}/>
          </div>
          <div className="row2">
            <div className="field">
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                {DEAL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Starting stage</label>
              <select value={stage} onChange={e => setStage(e.target.value)}>
                {PIPELINE_STAGES.slice(0, 5).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Estimated value (USD)</label>
              <input type="text" value={value} onChange={e => setValue(e.target.value)}/>
            </div>
            <div className="field">
              <label>Owner</label>
              <select><option>Maren Voss (you)</option>{PEOPLE.slice(1).map(p => <option key={p.id}>{p.name}</option>)}</select>
            </div>
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:18}}>
        <button className="btn" type="button" onClick={onDone}>Cancel</button>
        <button className="btn primary" type="button" onClick={onDone}>
          <Icon name="check" size={13}/> Convert lead
        </button>
      </div>
    </div>
  );
}


/* Teams — directory + detail */

const TEAMS = [
  {
    id: 't1', name: 'M&A · APAC', focus: 'Cross-border M&A',
    region: 'Singapore · APAC', formed: 'Jan 2024',
    lead: 'p1', members: ['p1','p3','p4','p5'], dealIds: ['DEAL-1207','DEAL-1210','DEAL-1209','DEAL-1213','DEAL-1222'],
    goalQ: 850_000_000, attainedQ: 644_000_000,
    color: 'var(--accent)',
  },
  {
    id: 't2', name: 'Capital Markets', focus: 'Growth equity & private credit',
    region: 'New York · global',  formed: 'Jun 2023',
    lead: 'p1', members: ['p1','p2','p4','p6'], dealIds: ['DEAL-1218','DEAL-1221','DEAL-1216','DEAL-1224'],
    goalQ: 240_000_000, attainedQ: 196_000_000,
    color: '#c47214',
  },
  {
    id: 't3', name: 'Corporate Development', focus: 'Bolt-ons & strategic',
    region: 'New York · Rotterdam', formed: 'Mar 2023',
    lead: 'p3', members: ['p3','p2','p4'], dealIds: ['DEAL-1215','DEAL-1219','DEAL-1217'],
    goalQ: 320_000_000, attainedQ: 198_000_000,
    color: '#2d4a32',
  },
  {
    id: 't4', name: 'Legal & Counsel', focus: 'Cross-deal counsel · DD',
    region: 'New York · firmwide',  formed: 'Sep 2022',
    lead: 'p7', members: ['p7'], dealIds: [],
    goalQ: null, attainedQ: null,
    color: '#7a1f1a',
  },
  {
    id: 't5', name: 'Operations', focus: 'Workflow, intake, post-close',
    region: 'Firmwide', formed: 'Sep 2022',
    lead: 'p8', members: ['p8'], dealIds: [],
    goalQ: null, attainedQ: null,
    color: '#5b3bff',
  },
];

const TEAM_ACTIVITY = {
  't1': [
    { who: 'p1', what: 'closed', target: 'DEAL-1220', time: '8h ago', icon: '★' },
    { who: 'p1', what: 'advanced', target: 'DEAL-1210', note: '→ Closing', time: '11h ago', icon: '→' },
    { who: 'p4', what: 'updated cap table', target: 'DEAL-1218', time: '2d ago', icon: '↑' },
    { who: 'p3', what: 'logged call', target: 'DEAL-1213', time: '3d ago', icon: '☎' },
  ],
  't2': [
    { who: 'p2', what: 'moved to Closing', target: 'DEAL-1221', time: '12m ago', icon: '→' },
    { who: 'p2', what: 'requested signature', target: 'DEAL-1218', time: '1d ago', icon: '✎' },
    { who: 'p6', what: 'closed (Won)', target: 'DEAL-1220', time: '8h ago', icon: '★' },
  ],
  't3': [
    { who: 'p3', what: 'invited counsel to', target: 'DEAL-1213', time: '3h ago', icon: '+' },
    { who: 'p4', what: 'sent NDA',           target: 'DEAL-1217', time: '6h ago', icon: '✎' },
  ],
};

function TeamsPage({ deals, openDeal, setRoute }) {
  const [activeId, setActiveId] = React.useState(null);

  if (activeId) {
    const team = TEAMS.find(t => t.id === activeId);
    if (team) return <TeamDetail team={team} deals={deals} openDeal={openDeal} onBack={() => setActiveId(null)}/>;
  }
  return <TeamsList deals={deals} onOpen={setActiveId} setRoute={setRoute}/>;
}

function TeamsList({ deals, onOpen, setRoute }) {
  const totalMembers = TEAMS.reduce((s, t) => s + t.members.length, 0);
  const totalGoal    = TEAMS.reduce((s, t) => s + (t.goalQ || 0), 0);
  const totalAtt     = TEAMS.reduce((s, t) => s + (t.attainedQ || 0), 0);

  return (
    <>
      <div className="page-h">
        <div>
          <h1>Teams</h1>
          <div className="sub">{TEAMS.length} teams · {totalMembers} members · ${compactNum(totalAtt)} of ${compactNum(totalGoal)} attained this quarter</div>
        </div>
        <div className="page-actions">
          <button className="btn" type="button"><Icon name="users" size={13}/> Manage members</button>
          <button className="btn primary" type="button"><Icon name="plus" size={13}/> New team</button>
        </div>
      </div>

      <div className="kpis">
        <KPI label="Teams"            value={TEAMS.length}/>
        <KPI label="Members"          value={totalMembers}/>
        <KPI label="Q2 attainment"    value={Math.round((totalAtt / totalGoal) * 100) + '%'} delta={<><Icon name="arrow-up" size={11}/> +6 pp</>} deltaTone="up"/>
        <KPI label="Closing this Qtr" value={'$' + compactNum(totalAtt)} delta={<><Icon name="arrow-up" size={11}/> +$48M</>} deltaTone="up"/>
      </div>

      <div className="teams-grid">
        {TEAMS.map(t => {
          const lead = personOf(t.lead);
          const teamDeals = deals.filter(d => t.dealIds.includes(d.id));
          const pipelineValue = teamDeals.reduce((s, d) => s + d.value, 0);
          const attainPct = t.goalQ ? Math.min(100, Math.round((t.attainedQ / t.goalQ) * 100)) : 0;
          return (
            <div key={t.id} className="team-card" onClick={() => onOpen(t.id)} style={{borderLeftColor: t.color}}>
              <div className="team-card-h">
                <div>
                  <div className="team-name">{t.name}</div>
                  <div className="team-focus">{t.focus}</div>
                </div>
                <span className="team-color-dot" style={{background: t.color}}/>
              </div>

              <div className="team-meta">
                <span className="ed-tag">{t.region}</span>
                <span style={{opacity:0.5}}>·</span>
                <span>Formed {t.formed}</span>
              </div>

              <div className="team-row">
                <span className="team-row-l">Lead</span>
                <span><Avatar person={lead}/> <span style={{marginLeft:6}}>{lead.name}</span></span>
              </div>
              <div className="team-row">
                <span className="team-row-l">Members</span>
                <AvatarStack ids={t.members} max={6}/>
              </div>
              <div className="team-row">
                <span className="team-row-l">Open deals</span>
                <span className="mono">{teamDeals.length} · ${compactNum(pipelineValue)}</span>
              </div>

              {t.goalQ && (
                <div className="team-goal">
                  <div className="team-goal-row">
                    <span className="ed-tag">Q2 attainment</span>
                    <span className="mono"><b>{attainPct}%</b> <span style={{color:'var(--text-3)'}}> · ${compactNum(t.attainedQ)} of ${compactNum(t.goalQ)}</span></span>
                  </div>
                  <div className="progress"><i style={{width: attainPct + '%', background: t.color}}/></div>
                </div>
              )}

              <div className="team-card-foot">
                <button className="btn ghost sm" type="button">Open team →</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TeamDetail({ team, deals, openDeal, onBack }) {
  const [tab, setTab] = React.useState('overview');
  const lead = personOf(team.lead);
  const teamDeals = deals.filter(d => team.dealIds.includes(d.id));
  const pipelineValue = teamDeals.reduce((s, d) => s + d.value, 0);
  const weighted = teamDeals.reduce((s, d) => s + d.value * d.prob / 100, 0);
  const attainPct = team.goalQ ? Math.min(100, Math.round((team.attainedQ / team.goalQ) * 100)) : null;
  const activity = TEAM_ACTIVITY[team.id] || [];

  return (
    <>
      <div className="lead-detail-h">
        <div className="lead-detail-back">
          <button className="btn ghost sm" type="button" onClick={onBack}>
            <Icon name="chevR" size={12} className="rev"/> All teams
          </button>
          <span className="ed-tag">Team</span>
          <span className="team-color-dot" style={{background: team.color}}/>
        </div>

        <div className="lead-detail-top">
          <div>
            <h1 className="lead-name">{team.name}<em>.</em></h1>
            <div className="lead-sub">
              {team.focus} <span style={{opacity:0.5}}>·</span> {team.region} <span style={{opacity:0.5}}>·</span> Formed {team.formed}
            </div>
            <div className="lead-actions">
              <button className="btn primary" type="button"><Icon name="plus" size={13}/> Add member</button>
              <button className="btn" type="button" onClick={() => window.openShare && window.openShare({ type: 'team', id: team.id, title: team.name, subtitle: 'Team page · share with members or stakeholders' })}>
                <Icon name="paperclip" size={13}/> Share
              </button>
              <button className="btn" type="button"><Icon name="cog" size={13}/> Settings</button>
            </div>
          </div>

          <div className="lead-detail-score" style={{borderLeftColor: team.color}}>
            {team.goalQ ? (
              <>
                <div style={{width:140,height:140,position:'relative',display:'grid',placeItems:'center'}}>
                  <svg viewBox="0 0 130 130" style={{position:'absolute',inset:0,transform:'rotate(-90deg)'}}>
                    <circle cx="65" cy="65" r="56" fill="none" stroke="var(--surface-3)" strokeWidth="6"/>
                    <circle cx="65" cy="65" r="56" fill="none" stroke={team.color} strokeWidth="6" strokeDasharray={2 * Math.PI * 56} strokeDashoffset={2 * Math.PI * 56 * (1 - attainPct / 100)} strokeLinecap="round"/>
                  </svg>
                  <div style={{textAlign:'center',position:'relative'}}>
                    <div style={{fontFamily:'var(--font-serif)',fontSize:36,fontWeight:400,lineHeight:1,color:'var(--text)'}}>{attainPct}<span style={{fontSize:18,color:'var(--text-3)'}}>%</span></div>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:9.5,letterSpacing:'.16em',color:'var(--text-3)',textTransform:'uppercase',marginTop:2}}>Q2 attain</div>
                  </div>
                </div>
                <div style={{fontSize:12.5,color:'var(--text-2)',lineHeight:1.55}}>
                  <div>Goal <b className="mono">${compactNum(team.goalQ)}</b></div>
                  <div>Booked <b className="mono">${compactNum(team.attainedQ)}</b></div>
                  <div>Pipeline <span className="muted mono">${compactNum(pipelineValue)}</span></div>
                </div>
              </>
            ) : (
              <div style={{fontSize:12.5,color:'var(--text-2)',lineHeight:1.55}}>
                <div className="ed-tag" style={{marginBottom:6}}>Service team</div>
                <div>No quarterly goal · supports deals across the firm</div>
              </div>
            )}
          </div>
        </div>

        <div className="tabs">
          <button className={'tab ' + (tab==='overview'?'active':'')} type="button" onClick={()=>setTab('overview')}>Overview</button>
          <button className={'tab ' + (tab==='deals'?'active':'')}    type="button" onClick={()=>setTab('deals')}>Deal book <span className="muted">· {teamDeals.length}</span></button>
          <button className={'tab ' + (tab==='members'?'active':'')}  type="button" onClick={()=>setTab('members')}>Members <span className="muted">· {team.members.length}</span></button>
          <button className={'tab ' + (tab==='activity'?'active':'')} type="button" onClick={()=>setTab('activity')}>Activity</button>
          <button className={'tab ' + (tab==='settings'?'active':'')} type="button" onClick={()=>setTab('settings')}>Permissions</button>
        </div>
      </div>

      <div className="lead-detail-body">
        {tab === 'overview' && <TeamOverview team={team} lead={lead} teamDeals={teamDeals} weighted={weighted} pipelineValue={pipelineValue} openDeal={openDeal} activity={activity} onTab={setTab}/>}
        {tab === 'deals'    && <TeamDeals    team={team} teamDeals={teamDeals} openDeal={openDeal}/>}
        {tab === 'members'  && <TeamMembers  team={team}/>}
        {tab === 'activity' && <TeamActivityTab activity={activity}/>}
        {tab === 'settings' && <TeamPermissions team={team}/>}
      </div>
    </>
  );
}

function TeamOverview({ team, lead, teamDeals, weighted, pipelineValue, openDeal, activity, onTab }) {
  return (
    <div className="lead-grid">
      <div className="lead-col-main">
        <div className="kpis" style={{padding:0,marginBottom:14,gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))'}}>
          <KPI label="Open deals"  value={teamDeals.length}/>
          <KPI label="Pipeline"    value={'$' + compactNum(pipelineValue)}/>
          <KPI label="Weighted"    value={'$' + compactNum(weighted)}/>
          <KPI label="Members"     value={team.members.length}/>
        </div>

        <div className="card">
          <div className="card-h">
            <div className="ttl">Open deals <span className="sub">{teamDeals.length}</span></div>
            <button className="btn ghost sm" type="button" onClick={() => onTab('deals')}>See all →</button>
          </div>
          <div style={{padding:0}}>
            <table className="tbl">
              <thead><tr><th>Deal</th><th>Stage</th><th>Owner</th><th className="num">Value</th><th>Close</th></tr></thead>
              <tbody>
                {teamDeals.slice(0, 6).map(d => {
                  const o = personOf(d.owner);
                  const s = stageOf(d.stage);
                  return (
                    <tr key={d.id} onClick={() => openDeal(d)} style={{cursor:'pointer'}}>
                      <td><b>{d.name.split(' — ')[0]}</b><div className="mono text-xs muted">{d.id}</div></td>
                      <td><Pill tone="violet">{s.name}</Pill></td>
                      <td><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Avatar person={o}/> {o.name.split(' ')[0]}</span></td>
                      <td className="num">{fmtCurrency(d.value, d.currency)}</td>
                      <td className="mono">{d.close}</td>
                    </tr>
                  );
                })}
                {teamDeals.length === 0 && (
                  <tr><td colSpan="5" style={{textAlign:'center',padding:'24px',color:'var(--text-3)'}}>This team doesn't own any deals (service team)</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{marginTop:14}}>
          <div className="card-h"><div className="ttl">Activity</div><button className="btn ghost sm" type="button" onClick={() => onTab('activity')}>See all →</button></div>
          <div className="card-b" style={{padding:'0 16px 8px'}}>
            {activity.slice(0, 5).map((a, i) => {
              const p = personOf(a.who);
              return (
                <div key={i} className="act">
                  <span className="ic">{a.icon}</span>
                  <div className="b"><b>{p.name.split(' ')[0]}</b> {a.what} <span className="mono muted">{a.target}</span>{a.note && <span style={{color:'var(--text-2)'}}> {a.note}</span>}</div>
                  <span className="t">{a.time}</span>
                </div>
              );
            })}
            {activity.length === 0 && <div style={{padding:'18px',textAlign:'center',color:'var(--text-3)',fontSize:13}}>No recent activity</div>}
          </div>
        </div>
      </div>

      <div className="lead-col-side">
        <div className="card">
          <div className="card-h"><div className="ttl">Team lead</div></div>
          <div className="card-b">
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
              <Avatar person={lead} size="lg"/>
              <div>
                <div style={{fontWeight:500}}>{lead.name}</div>
                <div className="text-xs muted">{lead.role}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button className="btn sm" type="button"><Icon name="send" size={12}/> Message</button>
              <button className="btn sm" type="button"><Icon name="cal" size={12}/> Meet</button>
            </div>
          </div>
        </div>

        <div className="card" style={{marginTop:14}}>
          <div className="card-h"><div className="ttl">Members</div><button className="btn ghost sm" type="button" onClick={() => onTab('members')}>Manage →</button></div>
          <div className="card-b" style={{padding:0}}>
            {team.members.map(id => {
              const p = personOf(id);
              return (
                <div key={id} className="list-row" style={{padding:'10px 16px'}}>
                  <Avatar person={p}/>
                  <div className="grow">
                    <div className="ttl">{p.name}</div>
                    <div className="sub">{p.role}</div>
                  </div>
                  {id === team.lead && <Pill tone="violet" noDot>LEAD</Pill>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamDeals({ team, teamDeals, openDeal }) {
  return (
    <div className="card">
      <div className="card-h">
        <div className="ttl">Deal book · {teamDeals.length} open</div>
        <div className="seg">
          <button className="active" type="button">All</button>
          <button type="button">Mine</button>
          <button type="button">Confidential</button>
        </div>
      </div>
      <table className="tbl">
        <thead><tr><th>Deal</th><th>Type</th><th>Stage</th><th>Owner</th><th>Team</th><th className="num">Value</th><th className="num">Prob.</th><th>Close</th></tr></thead>
        <tbody>
          {teamDeals.map(d => {
            const o = personOf(d.owner);
            const s = stageOf(d.stage);
            return (
              <tr key={d.id} onClick={() => openDeal(d)} style={{cursor:'pointer'}}>
                <td><b>{d.name}</b></td>
                <td><span className="tag">{d.type}</span></td>
                <td><Pill tone="violet">{s.name}</Pill></td>
                <td><Avatar person={o}/></td>
                <td><AvatarStack ids={d.team} max={3}/></td>
                <td className="num">{fmtCurrency(d.value, d.currency)}</td>
                <td className="num">{d.prob}%</td>
                <td className="mono">{d.close}</td>
              </tr>
            );
          })}
          {teamDeals.length === 0 && <tr><td colSpan="8" style={{textAlign:'center',padding:'24px',color:'var(--text-3)'}}>No deals owned by this team</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function TeamMembers({ team }) {
  return (
    <div className="card">
      <div className="card-h">
        <div className="ttl">Members · {team.members.length}</div>
        <button className="btn primary sm" type="button"><Icon name="plus" size={12}/> Add member</button>
      </div>
      <table className="tbl">
        <thead><tr><th></th><th>Name</th><th>Title</th><th>Role on team</th><th>Open deals</th><th>Joined</th><th></th></tr></thead>
        <tbody>
          {team.members.map((id, i) => {
            const p = personOf(id);
            return (
              <tr key={id}>
                <td><Avatar person={p}/></td>
                <td><b>{p.name}</b><div className="text-xs muted mono">{p.name.toLowerCase().replace(' ', '.')}@concorde.co</div></td>
                <td className="muted">{p.role}</td>
                <td>
                  <Pill tone={id === team.lead ? 'violet' : 'gray'} noDot>
                    {id === team.lead ? 'Lead' : i === 1 ? 'Senior' : 'Member'}
                  </Pill>
                </td>
                <td className="mono">{Math.max(1, team.dealIds.length - i)}</td>
                <td className="muted">Jan 2024</td>
                <td><button className="btn ghost sm" type="button"><Icon name="more" size={12}/></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamActivityTab({ activity }) {
  return (
    <div className="card">
      <div className="card-h"><div className="ttl">Activity · last 30 days</div></div>
      <div className="card-b" style={{padding:'0 16px'}}>
        {activity.map((a, i) => {
          const p = personOf(a.who);
          return (
            <div key={i} className="act" style={{padding:'12px 0'}}>
              <span className="ic">{a.icon}</span>
              <div className="b"><b>{p.name}</b> {a.what} <span className="mono muted">{a.target}</span>{a.note && <span style={{color:'var(--text-2)'}}> {a.note}</span>}</div>
              <span className="t">{a.time}</span>
            </div>
          );
        })}
        {activity.length === 0 && <div style={{padding:'24px',textAlign:'center',color:'var(--text-3)',fontSize:13}}>No activity in the last 30 days</div>}
      </div>
    </div>
  );
}

function TeamPermissions({ team }) {
  const rows = [
    { k: 'Visibility',           v: 'Firmwide visible · individual deals can be marked confidential', tone: 'gray' },
    { k: 'Deal creation',        v: 'Team members can create deals owned by this team',               tone: 'green' },
    { k: 'Cross-team handoff',   v: 'Lead can hand deals to another team with audit',                 tone: 'gray' },
    { k: 'External guests',      v: 'Lead can invite up to 25 guests per deal',                       tone: 'gray' },
    { k: 'Document export',      v: 'Members can export; downloads logged in audit trail',            tone: 'gray' },
    { k: 'Forecast roll-up',     v: 'Contributes to firm-level forecast',                             tone: 'green' },
  ];
  return (
    <>
      <div className="card">
        <div className="card-h"><div className="ttl">Default permissions</div><button className="btn ghost sm" type="button">Edit</button></div>
        <div className="card-b" style={{padding:0}}>
          {rows.map(r => (
            <div key={r.k} className="list-row" style={{padding:'12px 16px',height:'auto'}}>
              <div className="grow">
                <b style={{fontSize:13}}>{r.k}</b>
                <div className="sub">{r.v}</div>
              </div>
              <Pill tone={r.tone}>Default</Pill>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{marginTop:14}}>
        <div className="card-h"><div className="ttl">Danger zone</div></div>
        <div className="card-b" style={{display:'flex',gap:8}}>
          <button className="btn" type="button">Archive team</button>
          <button className="btn" type="button" style={{color:'var(--status-red)'}}>Delete team</button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { TEAMS, TeamsPage });


/* Pending — full-page Pending Actions surface */

function PendingPage({ deals, openDeal }) {
  const [filterAgent, setFilterAgent] = React.useState('all');
  const [filterUrgency, setFilterUrgency] = React.useState('all');
  const [editing, setEditing] = React.useState({});
  const [drafts, setDrafts] = React.useState({});
  const [decided, setDecided] = React.useState({});

  const decide = (item, verdict) => {
    setDecided(d => ({ ...d, [item.id]: verdict }));
    recordApprovalDecision(item, verdict === 'approved' ? 'approved' : 'rejected', drafts[item.id] || item.proposed).catch(() => {});
  };
  const startEdit = (id, current) => {
    setEditing(e => ({ ...e, [id]: true }));
    setDrafts(d => ({ ...d, [id]: current }));
  };

  let visible = PENDING_ACTIONS.filter(p => !decided[p.id]);
  if (filterAgent !== 'all') visible = visible.filter(p => p.agent === filterAgent);
  if (filterUrgency !== 'all') visible = visible.filter(p => p.urgency === filterUrgency);

  const total = PENDING_ACTIONS.length;
  const high = PENDING_ACTIONS.filter(p => p.urgency === 'high').length;

  return (
    <>
      <div className="page-h">
        <div>
          <h1><em>Pending</em>.</h1>
          <div className="sub">{total} actions waiting · {high} high urgency · agents drafted; you approve.</div>
        </div>
        <div className="page-actions">
          <button className="btn" type="button"><Icon name="check" size={13}/> Approve safe actions ({total - high})</button>
          <button className="btn primary" type="button">Review all high urgency</button>
        </div>
      </div>

      {/* Agent filter row */}
      <div className="pending-filters">
        <div className="seg">
          <button className={filterAgent === 'all' ? 'active' : ''} type="button" onClick={() => setFilterAgent('all')}>All agents</button>
          {AGENTS.map(a => (
            <button
              key={a.id}
              className={filterAgent === a.id ? 'active' : ''}
              type="button"
              onClick={() => setFilterAgent(a.id)}
            >
              <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:a.color,marginRight:6,verticalAlign:'1px'}}/>
              {a.name}
            </button>
          ))}
        </div>
        <div className="seg">
          <button className={filterUrgency === 'all' ? 'active' : ''} type="button" onClick={() => setFilterUrgency('all')}>All urgency</button>
          <button className={filterUrgency === 'high' ? 'active' : ''} type="button" onClick={() => setFilterUrgency('high')}>High</button>
          <button className={filterUrgency === 'med' ? 'active' : ''} type="button" onClick={() => setFilterUrgency('med')}>Medium</button>
          <button className={filterUrgency === 'low' ? 'active' : ''} type="button" onClick={() => setFilterUrgency('low')}>Low</button>
        </div>
        <span style={{marginLeft:'auto',fontFamily:'var(--font-mono)',fontSize:10.5,letterSpacing:'.14em',color:'var(--text-3)',textTransform:'uppercase'}}>
          {visible.length} of {total}
        </span>
      </div>

      <div className="pending-body">
        {visible.map(p => {
          const a = agentOf(p.agent);
          const isEditing = editing[p.id];
          const draft = drafts[p.id] !== undefined ? drafts[p.id] : p.proposed;
          const deal = (deals || []).find(d => d.id === p.target.id);
          return (
            <div key={p.id} className="ac-card big" data-urgency={p.urgency}>
              <div className="ac-card-h">
                <div className="ac-feed-avatar lg" style={{background: a.color}}>{a.initials}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="ac-card-author">
                    <b style={{fontSize:14}}>{a.name}</b>
                    <span style={{color:'var(--text-3)',fontSize:12.5}}> · {a.role.toLowerCase()}</span>
                    <span className="ac-urg-dot" data-urgency={p.urgency}/>
                    <span className="ed-tag" style={{color:'var(--text-3)'}}>{p.urgency.toUpperCase()}</span>
                    <span className="ed-tag" style={{marginLeft:'auto',color:'var(--text-3)'}}>{p.created}</span>
                  </div>
                  <div className="ac-card-title" style={{fontSize:22}}>{p.title}</div>
                  <div className="ac-card-target">
                    <span className="mono">{p.target.id}</span>
                    <span style={{opacity:0.5,margin:'0 8px'}}>·</span>
                    <span>{p.target.label}</span>
                    {deal && <button className="btn ghost sm" type="button" onClick={() => openDeal(deal)} style={{marginLeft:8}}>Open deal →</button>}
                  </div>
                </div>
              </div>

              <div className="ac-card-grid">
                <div className="ac-card-section">
                  <div className="ed-tag">Proposed action</div>
                  {isEditing ? (
                    <textarea
                      className="ac-card-edit"
                      value={draft}
                      onChange={e => setDrafts(d => ({ ...d, [p.id]: e.target.value }))}
                      rows={Math.min(20, draft.split('\n').length + 2)}
                    />
                  ) : (
                    <div className="ac-card-proposed">{draft}</div>
                  )}
                </div>
                <div className="ac-card-section">
                  <div className="ed-tag">Reasoning · {a.name}</div>
                  <div className="ac-card-reasoning">{p.reasoning}</div>

                  <div className="ed-tag" style={{marginTop:18}}>Timing</div>
                  <div className="ac-card-reasoning">{p.timeline}</div>

                  <div className="ed-tag" style={{marginTop:18}}>Confidence</div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{flex:1,height:4,background:'var(--surface-3)',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',background:a.color,width:(p.urgency === 'high' ? 92 : p.urgency === 'med' ? 78 : 64) + '%'}}/>
                    </div>
                    <span className="mono" style={{fontSize:12}}>{p.urgency === 'high' ? '92' : p.urgency === 'med' ? '78' : '64'}%</span>
                  </div>
                </div>
              </div>

              <div className="ac-card-actions" style={{paddingTop:16,marginTop:0,borderTop:'1px solid var(--border)'}}>
                {isEditing ? (
                  <>
                    <button className="btn" type="button" onClick={() => setEditing(e => ({ ...e, [p.id]: false }))}>Cancel</button>
                    <button className="btn primary" type="button" onClick={() => { setEditing(e => ({ ...e, [p.id]: false })); decide(p, 'approved'); }}>
                      <Icon name="check" size={13}/> Save &amp; approve
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn ghost" type="button" onClick={() => decide(p, 'rejected')}>
                      <Icon name="x" size={13}/> Reject
                    </button>
                    <button className="btn" type="button" onClick={() => startEdit(p.id, p.proposed)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                      Edit in your voice
                    </button>
                    <button className="btn" type="button">
                      <Icon name="cal" size={13}/> Defer
                    </button>
                    <button className="btn primary" type="button" onClick={() => decide(p, 'approved')}>
                      <Icon name="check" size={13}/> Approve as is
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="ac-empty" style={{padding:'80px 24px'}}>
            <div style={{fontFamily:'var(--font-serif)',fontSize:42,fontStyle:'italic',color:'var(--text-2)',marginBottom:8}}>The room is settled.</div>
            <div className="text-sm muted">Nothing waiting on you. Margaret is watching the pipeline. Theo is reviewing DD. Liam, Iris, and Owen are standing by.</div>
          </div>
        )}
      </div>
    </>
  );
}


/* Share modal — generate shareable link + QR for any doc, contact, or deal */

function QuickCreateModal({ type, onClose, onCreated }) {
  const [form, setForm] = React.useState({
    title: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
    website: '',
    linkedin_url: '',
    preferred_contact_method: 'Email',
    best_time_to_contact: '',
    industry: '',
    business_type: '',
    city: '',
    state_region: '',
    country: '',
    business_state: '',
    need_summary: '',
    source: 'Manual',
    qr_source: '',
    referral_source: '',
    urgency: 'Normal',
    value: '',
    priority: 'medium',
    follow_up_due_at: '',
    document_links: '',
    due_at: '',
    notes: '',
  });
  const [saving, setSaving] = React.useState(false);
  if (!type) return null;

  const label = type === 'lead' ? 'New lead' : type === 'deal' ? 'New deal' : 'New task';
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/records/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: form.title,
          email: form.email,
          phone: form.phone,
          company: form.company,
          job_title: form.job_title,
          website: form.website,
          linkedin_url: form.linkedin_url,
          preferred_contact_method: form.preferred_contact_method,
          best_time_to_contact: form.best_time_to_contact,
          industry: form.industry,
          business_type: form.business_type,
          city: form.city,
          state_region: form.state_region,
          country: form.country,
          business_state: form.business_state,
          need_summary: form.need_summary,
          source: form.source,
          qr_source: form.qr_source,
          referral_source: form.referral_source,
          urgency: form.urgency,
          value: Number(form.value || 0),
          priority: form.priority,
          follow_up_due_at: form.follow_up_due_at ? new Date(form.follow_up_due_at).toISOString() : null,
          document_links: form.document_links.split('\n').map(x => x.trim()).filter(Boolean),
          due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
          notes: form.notes,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        onCreated && onCreated(type, data.record);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cmdk-bg" onMouseDown={onClose}>
      <form className="cmdk" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="cmdk-input">
          <Icon name="plus" size={16}/>
          <input value={label} readOnly aria-label={label}/>
          <button className="btn icon ghost" type="button" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div style={{padding:16}}>
          <div className="field">
            <label>{type === 'task' ? 'Task' : type === 'deal' ? 'Deal name' : 'Lead name'}</label>
            <input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required autoFocus/>
          </div>
          {type === 'lead' && (
            <>
              <div className="row2">
                <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}/></div>
                <div className="field"><label>Phone</label><input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}/></div>
              </div>
              <div className="row2">
                <div className="field"><label>Company</label><input type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})}/></div>
                <div className="field"><label>Title</label><input type="text" value={form.job_title} onChange={(e) => setForm({...form, job_title: e.target.value})}/></div>
              </div>
              <div className="row2">
                <div className="field"><label>Website</label><input type="url" value={form.website} onChange={(e) => setForm({...form, website: e.target.value})}/></div>
                <div className="field"><label>LinkedIn</label><input type="text" value={form.linkedin_url} onChange={(e) => setForm({...form, linkedin_url: e.target.value})}/></div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Preferred contact</label>
                  <select value={form.preferred_contact_method} onChange={(e) => setForm({...form, preferred_contact_method: e.target.value})}>
                    <option>Email</option>
                    <option>Phone</option>
                    <option>Text</option>
                    <option>LinkedIn</option>
                  </select>
                </div>
                <div className="field"><label>Best time to contact</label><input type="text" value={form.best_time_to_contact} onChange={(e) => setForm({...form, best_time_to_contact: e.target.value})} placeholder="Morning, afternoon, specific window"/></div>
              </div>
              <div className="row2">
                <div className="field"><label>Industry</label><input type="text" value={form.industry} onChange={(e) => setForm({...form, industry: e.target.value})}/></div>
                <div className="field"><label>Business type</label><input type="text" value={form.business_type} onChange={(e) => setForm({...form, business_type: e.target.value})}/></div>
              </div>
              <div className="row2">
                <div className="field"><label>City</label><input type="text" value={form.city} onChange={(e) => setForm({...form, city: e.target.value})}/></div>
                <div className="field"><label>State</label><input type="text" value={form.state_region} onChange={(e) => setForm({...form, state_region: e.target.value})}/></div>
              </div>
              <div className="row2">
                <div className="field"><label>Country</label><input type="text" value={form.country} onChange={(e) => setForm({...form, country: e.target.value})}/></div>
                <div className="field"><label>Business state</label><input type="text" value={form.business_state} onChange={(e) => setForm({...form, business_state: e.target.value})} placeholder="New inquiry, urgent, active buyer..."/></div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Urgency</label>
                  <select value={form.urgency} onChange={(e) => setForm({...form, urgency: e.target.value})}>
                    <option>Immediate</option>
                    <option>Same Day</option>
                    <option>Scheduled</option>
                    <option>Normal</option>
                    <option>Low</option>
                  </select>
                </div>
                <div className="field"><label>Follow-up due</label><input type="datetime-local" value={form.follow_up_due_at} onChange={(e) => setForm({...form, follow_up_due_at: e.target.value})}/></div>
              </div>
              <div className="row2">
                <div className="field"><label>Source</label><input type="text" value={form.source} onChange={(e) => setForm({...form, source: e.target.value})}/></div>
                <div className="field"><label>QR source</label><input type="text" value={form.qr_source} onChange={(e) => setForm({...form, qr_source: e.target.value})}/></div>
              </div>
              <div className="row2">
                <div className="field"><label>Estimated value</label><input type="number" min="0" value={form.value} onChange={(e) => setForm({...form, value: e.target.value})}/></div>
                <div className="field">
                  <label>Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="field"><label>Need</label><textarea rows={2} value={form.need_summary} onChange={(e) => setForm({...form, need_summary: e.target.value})}/></div>
              <div className="field"><label>Document links</label><textarea rows={2} value={form.document_links} onChange={(e) => setForm({...form, document_links: e.target.value})} placeholder="One link per line"/></div>
            </>
          )}
          {type === 'deal' && (
            <div className="row2">
              <div className="field"><label>Company</label><input type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})}/></div>
              <div className="field"><label>Value</label><input type="number" min="0" value={form.value} onChange={(e) => setForm({...form, value: e.target.value})}/></div>
            </div>
          )}
          {type === 'task' && (
            <div className="row2">
              <div className="field">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="field"><label>Due</label><input type="datetime-local" value={form.due_at} onChange={(e) => setForm({...form, due_at: e.target.value})}/></div>
            </div>
          )}
          <div className="field">
            <label>Notes</label>
            <textarea rows={4} value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})}/>
            <div className="hint">Saved and queued for agent review.</div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
            <button className="btn" type="button" onClick={onClose}>Cancel</button>
            <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ShareModal({ subject, onClose }) {
  if (!subject) return null;

  // Mock generated link
  const token = React.useMemo(() => {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  }, [subject.id]);
  const baseUrl = (typeof window !== 'undefined' && window.location.origin) || 'https://adga.app';
  const shareUrl = `${baseUrl}/s/${subject.type}/${token}`;

  const [access, setAccess] = React.useState('view');     // view | comment | edit
  const [expiry, setExpiry] = React.useState('7d');       // 24h | 7d | 30d | never
  const [pw, setPw] = React.useState(false);
  const [pwValue, setPwValue] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  const qrRef = React.useRef(null);
  React.useEffect(() => {
    if (!qrRef.current) return;
    qrRef.current.innerHTML = '';
    if (typeof window.qrcode !== 'function') return;
    const qr = window.qrcode(0, 'M');
    qr.addData(shareUrl);
    qr.make();
    qrRef.current.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 0, scalable: true });
    const svg = qrRef.current.querySelector('svg');
    if (svg) {
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.style.width = '100%';
      svg.style.height = '100%';
      // Replace black/white with brand colors
      svg.querySelectorAll('rect').forEach(r => {
        const f = r.getAttribute('fill');
        if (f === '#000000' || f === '#000' || !f) r.setAttribute('fill', 'var(--text)');
        if (f === '#ffffff' || f === '#fff') r.setAttribute('fill', 'transparent');
      });
    }
  }, [shareUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      // Fallback: select text in input
      const el = document.getElementById('share-url-input');
      if (el) { el.select(); document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    }
  };

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.querySelectorAll('rect').forEach(r => {
      if (r.getAttribute('fill') === 'var(--text)') r.setAttribute('fill', '#1a1a22');
      if (r.getAttribute('fill') === 'transparent') r.setAttribute('fill', '#ffffff');
    });
    clone.setAttribute('width', '512');
    clone.setAttribute('height', '512');
    const data = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `adga-qr-${subject.type}-${token}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const subjectLabel = {
    document: 'document', contact: 'contact', deal: 'deal',
    capture: 'lead capture link', lead: 'lead'
  }[subject.type] || 'item';

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}/>
      <div className="share-modal" role="dialog" aria-label="Share">
        <div className="share-h">
          <div>
            <div className="share-eyebrow">Share · {subjectLabel}</div>
            <h2 className="share-title">{subject.title}</h2>
            {subject.subtitle && <div className="share-sub">{subject.subtitle}</div>}
          </div>
          <button className="btn icon ghost" type="button" onClick={onClose} aria-label="Close">
            <Icon name="x" size={14}/>
          </button>
        </div>

        <div className="share-body">
          <div className="share-link">
            <div className="share-section-l">Link</div>
            <div className="share-url-row">
              <input
                id="share-url-input"
                type="text"
                readOnly
                value={shareUrl}
                onClick={e => e.target.select()}
              />
              <button className={'btn ' + (copied ? '' : 'primary')} type="button" onClick={copyLink}>
                {copied ? <><Icon name="check" size={13}/> Copied</> : <>Copy</>}
              </button>
            </div>
          </div>

          <div className="share-grid">
            <div className="share-qr-wrap">
              <div className="share-section-l">QR code</div>
              <div className="share-qr" ref={qrRef}></div>
              <div className="share-qr-actions">
                <button className="btn sm" type="button" onClick={downloadQr}>
                  <Icon name="download" size={12}/> Download SVG
                </button>
                <button className="btn sm" type="button" onClick={() => window.print()}>
                  <Icon name="upload" size={12}/> Print
                </button>
              </div>
            </div>

            <div className="share-settings">
              <div className="share-section-l">Access</div>
              <div className="share-radio">
                {[
                  { v: 'view',    l: 'View only', d: 'Read the document. No comments, no edits.' },
                  { v: 'comment', l: 'View &amp; comment', d: 'Read and leave comments. Visible in the audit trail.' },
                  { v: 'edit',    l: 'Edit', d: 'Read, comment, and edit. Requires sign-in.' },
                ].map(o => (
                  <label key={o.v} className={'share-radio-option ' + (access === o.v ? 'on' : '')}>
                    <input type="radio" name="access" value={o.v} checked={access === o.v} onChange={() => setAccess(o.v)}/>
                    <div>
                      <div className="l" dangerouslySetInnerHTML={{__html: o.l}}/>
                      <div className="d">{o.d}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="share-section-l" style={{marginTop:18}}>Expiry</div>
              <div className="seg">
                {[
                  { v: '24h',   l: '24 hours' },
                  { v: '7d',    l: '7 days' },
                  { v: '30d',   l: '30 days' },
                  { v: 'never', l: 'No expiry' },
                ].map(o => (
                  <button
                    key={o.v}
                    type="button"
                    className={expiry === o.v ? 'active' : ''}
                    onClick={() => setExpiry(o.v)}
                  >
                    {o.l}
                  </button>
                ))}
              </div>

              <div className="share-section-l" style={{marginTop:18}}>Password</div>
              <label className="share-pw-row">
                <span className={'switch ' + (pw ? 'on' : '')} onClick={() => setPw(p => !p)}/>
                <span style={{fontSize:13,color:'var(--text-2)'}}>{pw ? 'Password required' : 'No password'}</span>
              </label>
              {pw && (
                <input
                  type="text"
                  value={pwValue}
                  onChange={e => setPwValue(e.target.value)}
                  placeholder="Set a password"
                  className="share-pw-input"
                />
              )}
            </div>
          </div>

          <div className="share-foot">
            <div className="share-meta">
              <div><span className="share-meta-l">Created by</span><span>Maren Voss · just now</span></div>
              <div><span className="share-meta-l">Audit</span><span>Every view, every download, recorded</span></div>
              <div><span className="share-meta-l">Watermark</span><span>Viewer email stamped on each page</span></div>
            </div>
            <div className="share-cta">
              <button className="btn" type="button" onClick={onClose}>Done</button>
              <button className="btn primary" type="button" onClick={copyLink}>
                <Icon name="send" size={13}/> Copy and close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


/* Cross-team handoff modal */

function HandoffModal({ deal, onClose, onConfirm }) {
  if (!deal) return null;
  const teams = TEAMS || [];

  // Infer current team from deal — pick the first team that owns this deal, fallback to first
  const currentTeam = teams.find(t => t.dealIds.includes(deal.id)) || teams[0];
  const [targetId, setTargetId] = React.useState(null);
  const [reason, setReason] = React.useState('');
  const target = teams.find(t => t.id === targetId);

  const confirm = () => {
    if (!target) return;
    onConfirm && onConfirm({ deal, from: currentTeam, to: target, reason });
    onClose();
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}/>
      <div className="handoff-modal" role="dialog" aria-label="Hand off deal">
        <div className="handoff-h">
          <div className="ed-tag" style={{marginBottom:8}}>Hand off · cross-team</div>
          <h2>{deal.name}</h2>
          <div className="sub mono">{deal.id}</div>
        </div>

        <div className="handoff-body">
          <div className="handoff-from">
            <span className="ws-dot" style={{background: currentTeam?.color || 'var(--text-3)'}}/>
            <div>
              <div style={{fontWeight:500,fontSize:13}}>{currentTeam?.name || 'Currently unassigned'}</div>
              <div style={{fontSize:11.5,color:'var(--text-3)'}}>Current team · {currentTeam?.members.length || 0} members</div>
            </div>
          </div>

          <div className="handoff-arrow">— TO —</div>

          <div className="handoff-target-list">
            {teams.filter(t => t.id !== currentTeam?.id).map(t => {
              const lead = personOf(t.lead);
              return (
                <div
                  key={t.id}
                  className={'handoff-target ' + (targetId === t.id ? 'sel' : '')}
                  onClick={() => setTargetId(t.id)}
                >
                  <span className="ws-dot" style={{background: t.color}}/>
                  <div>
                    <div className="target-name">{t.name}</div>
                    <div className="target-meta">{t.focus} · {lead?.name} (lead)</div>
                  </div>
                  <span className="check-radio"/>
                </div>
              );
            })}
          </div>

          <div className="handoff-reason" style={{marginTop:18}}>
            <div className="share-section-l">Reason / context for the receiving team</div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={'Why this team is taking it over, what stage it\'s at, any blockers, who the right contact is\u2026'}
            />
          </div>

          <div style={{display:'flex',gap:10,alignItems:'flex-start',marginTop:14,padding:'12px 14px',background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:6}}>
            <span style={{color:'var(--accent)',fontSize:18,lineHeight:1}}>ⓘ</span>
            <div style={{fontSize:12.5,color:'var(--text-2)',lineHeight:1.5}}>
              A handoff entry will be added to the deal's Story timeline with both teams, the reason, and a timestamp. The receiving team's lead will be notified.
            </div>
          </div>
        </div>

        <div className="handoff-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn primary"
            disabled={!target}
            style={!target ? {opacity:0.45,cursor:'not-allowed'} : null}
            onClick={confirm}
          >
            <Icon name="send" size={13}/> Hand off to {target?.name || 'team'}
          </button>
        </div>
      </div>
    </>
  );
}


/* Main App — routing, theme, tweaks integration */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#5b21b6",
  "theme": "light",
  "density": "spacious",
  "pipelineView": "kanban",
  "sidebarCollapsed": false,
  "voiceCollapsed": false,
  "voiceState": "idle"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  { name: 'Violet',   color: '#5b21b6' },
  { name: 'Royal',    color: '#4c1d95' },
  { name: 'Amethyst', color: '#7c3aed' },
  { name: 'Cobalt',   color: '#1e5aa8' },
  { name: 'Ink',      color: '#202124' },
];

const ACCENT_HOVER = {
  '#5b21b6': '#4c1d95',
  '#4c1d95': '#3b0764',
  '#7c3aed': '#6d28d9',
  '#1e5aa8': '#174987',
  '#202124': '#111827',
};

function getAccentFg(hex) {
  // Use light text on dark accents, dark text on light accents
  const r = parseInt(hex.slice(1,3),16),
        g = parseInt(hex.slice(3,5),16),
        b = parseInt(hex.slice(5,7),16);
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  return lum > 0.7 ? '#0a0a0b' : '#ffffff';
}

function applyTweaks(t) {
  const root = document.documentElement;
  const accent = ACCENT_OPTIONS.some(a => a.color === t.accent) ? t.accent : TWEAK_DEFAULTS.accent;
  const hover = ACCENT_HOVER[accent] || accent;
  root.setAttribute('data-theme', t.theme);
  root.setAttribute('data-density', t.density);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--adga-accent', accent);
  root.style.setProperty('--accent-hover', hover);
  root.style.setProperty('--adga-accent-hover', hover);
  root.style.setProperty('--accent-fg', getAccentFg(accent));
  root.style.setProperty('--adga-accent-fg', getAccentFg(accent));
}

// Suite routes are sourced from the contract at app/suite/routes.ts — single source of truth.
// SUITE_ROUTE_ALIASES are *URL aliases* — incoming paths that should normalize to a real route id
// (e.g. /suite/contacts → crm). They are NOT a route list; routes themselves live in the registry.
const SUITE_ROUTE_IDS = REGISTRY_ROUTE_IDS;
const ROUTE_PATHS = REGISTRY_ROUTE_PATHS;

const SUITE_ROUTE_ALIASES = {
  contacts: 'crm',
  contact: 'crm',
  companies: 'crm',
  files: 'documents',
  docs: 'documents',
  approvals: 'pending',
  templates: 'knowledge',
};

function normalizeSuiteRoute(value) {
  const route = SUITE_ROUTE_ALIASES[value] || value;
  return SUITE_ROUTE_IDS.includes(route) ? route : null;
}

function getInitialSuiteRoute() {
  if (typeof window === 'undefined') return 'home';
  // Prefer the URL pathname so /suite/<route> resolves cleanly on refresh + share + bookmark.
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (path[0] === 'suite' && path[1]) {
    const fromPath = normalizeSuiteRoute(path[1]);
    if (fromPath) return fromPath;
  }
  const params = new URLSearchParams(window.location.search);
  const fromQuery = normalizeSuiteRoute(params.get('view') || params.get('route'));
  if (fromQuery) return fromQuery;
  const fromHash = normalizeSuiteRoute(window.location.hash.replace(/^#\/?/, ''));
  if (fromHash) return fromHash;
  try {
    return normalizeSuiteRoute(window.localStorage.getItem('adga-suite-route')) || 'home';
  } catch (e) {
    return 'home';
  }
}

const MapWorkspace = React.lazy(() =>
  import('@/components/suite/DealMindmap').then(mod => ({
    default: function MapWorkspaceInner({ mapData }) {
      if (!mapData?.deal) {
        return (
          <div style={{ padding: 24, color: '#6b6760', fontSize: 14 }}>
            No dealflow selected. Open a deal from Deals.
          </div>
        );
      }
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', minHeight: 0 }}>
          <mod.DealMindmap
            deal={mapData.deal}
            entities={mapData.entities || []}
            mapId={mapData.mapId}
            initialNodes={mapData.initialNodes}
            initialEdges={mapData.initialEdges}
            persistApiBase={mapData.persistApiBase}
          />
        </div>
      );
    },
  })),
);


function App({ bootstrap = null, children = null }: { bootstrap?: any; children?: React.ReactNode } = {}) {
  const [tweaks, setTweaks] = React.useState(() => {
    if (typeof window === 'undefined') return TWEAK_DEFAULTS;
    return {
      ...TWEAK_DEFAULTS,
      sidebarCollapsed: window.innerWidth <= 820 ? true : TWEAK_DEFAULTS.sidebarCollapsed,
      voiceCollapsed: window.innerWidth <= 820 ? true : TWEAK_DEFAULTS.voiceCollapsed,
    };
  });
  const setTweak = (k, v) => {
    setTweaks(prev => {
      const next = typeof k === 'object' ? {...prev, ...k} : {...prev, [k]: v};
      try {
        window.parent.postMessage({ type: '__edit_mode_set_keys', edits: typeof k === 'object' ? k : {[k]: v} }, '*');
      } catch (e) {}
      return next;
    });
  };

  React.useEffect(() => { applyTweaks(tweaks); }, [tweaks]);

  // Edit mode wiring
  const [editMode, setEditMode] = React.useState(false);
  React.useEffect(() => {
    const handler = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setEditMode(true);
      if (e.data.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  // Auto-collapse rails at their responsive breakpoints.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncRails = () => {
      setTweaks(prev => ({
        ...prev,
        sidebarCollapsed: window.innerWidth <= 820 ? true : prev.sidebarCollapsed,
        voiceCollapsed: window.innerWidth <= 820 ? true : prev.voiceCollapsed,
      }));
    };
    syncRails();
    window.addEventListener('resize', syncRails);
    return () => window.removeEventListener('resize', syncRails);
  }, []);

  // URL is the source of truth — read pathname via Next.js hook so client-side nav stays in sync.
  const pathname = usePathname();
  const resolved = pathname ? resolveSuitePathname(pathname) : null;
  const pathRoute = resolved?.route?.id;
  const pathSection = resolved?.section?.id;
  const [route, setRoute] = React.useState(() => {
    if (bootstrap?.route) return bootstrap.route;
    if (pathRoute) return pathRoute;
    return getInitialSuiteRoute();
  });
  React.useEffect(() => {
    if (pathRoute && pathRoute !== route) setRoute(pathRoute);
  }, [pathRoute]);
  const sectionFromUrl = pathSection || bootstrap?.section;
  const mapData = bootstrap?.mapData || null;
  const [deals, setDeals] = React.useState(DEALS);
  const [leads, setLeads] = React.useState(LEADS);
  const [selectedLead, setSelectedLead] = React.useState(null);
  const [openDeal, setOpenDeal] = React.useState(null);
  const [cmdkOpen, setCmdkOpen] = React.useState(false);
  const [focusDealId, setFocusDealId] = React.useState(null);
  const [shareSubject, setShareSubject] = React.useState(null);
  const [handoffDeal, setHandoffDeal] = React.useState(null);
  const [quickCreate, setQuickCreate] = React.useState(null);
  const [meetingInbox, setMeetingInbox] = React.useState([]);
  // Programmatic nav — drives the URL through Next.js's router so it's the same code path as a
  // <Link> click. Internal route state will sync via the pathname effect above.
  const router = useRouter();
  const navigate = React.useCallback((next, options = {}) => {
    const normalized = normalizeSuiteRoute(next) || 'home';
    if (normalized === 'leads' && !options.keepLeadSelection) setSelectedLead(null);
    const path = ROUTE_PATHS[normalized] || ('/suite/' + normalized);
    try { window.localStorage.setItem('adga-suite-route', normalized); } catch (e) {}
    router.push(path);
  }, [router]);

  // Opening a deal lands on its dealflow canvas.
  // Drawer state below is retained for legacy programmatic open paths (workflow actions) but
  // every user click flows through this and lands on /suite/dealflow/<dealId>.
  const openDealInMap = React.useCallback((deal) => {
    if (!deal) return;
    const id = typeof deal === 'string' ? deal : deal.id;
    if (!id) return;
    router.push('/suite/dealflow/' + encodeURIComponent(id));
  }, [router]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const next = getInitialSuiteRoute();
      setRoute(next);
      if (next === 'leads') setSelectedLead(null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Seed-vs-real-user: the suite ships with demo seed data (impressive numbers, sample chat) so
  // marketing/preview surfaces feel alive. As soon as a real authenticated user lands, swap in
  // their real data — even when it's empty (which is the honest signal for a brand-new account).
  React.useEffect(() => {
    fetch('/api/suite/state', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return;
        window.ADGA_RUNTIME_STATE = data;
        const realUser = !!data.user?.email && !data.user?.isLocalAdminBypass;
        if (!realUser) return;
        // Real user signed in — trust the API response. Empty deals = empty pipeline; real ones replace seed.
        if (Array.isArray(data.deals)) {
          setDeals(data.deals.map((d) => ({
            id: d.id,
            name: d.name || d.id,
            company: d.company || 'c1',
            type: d.type || 'Acquisition',
            value: Math.round((d.value_cents || 0) / 100),
            currency: d.currency || 'USD',
            stage: d.stage || 'qualify',
            prob: d.probability || d.prob || 10,
            owner: d.owner_user_id || 'p1',
            team: d.team || ['p1'],
            close: d.expected_close_at ? String(d.expected_close_at).slice(0, 10) : '',
            updated: d.updated_at ? new Date(d.updated_at).toLocaleString() : 'Just now',
            tags: d.tags || [],
          })));
        }
        // First-time real user — wipe the demo chat seed so the persisted demo chat doesn't bleed
        // into their workspace. We use a one-time flag so we don't blow away their actual chats.
        try {
          if (!window.localStorage.getItem('adga-real-user-bootstrapped')) {
            window.localStorage.removeItem('adga-chat-messages');
            window.localStorage.setItem('adga-real-user-bootstrapped', '1');
            window.dispatchEvent(new CustomEvent('adga:real-user-bootstrap'));
          }
        } catch (e) {}
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    window.__adgaDeals = deals;
  }, [deals]);

  React.useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.leads) && data.leads.length) {
          setLeads(data.leads.map(normalizeStoredLead));
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    // Persist the event to D1 (audit trail) and mirror it onto the client bus so any subscribed
    // workspace can react via useSuiteEvent("suite.route_viewed", ...).
    fetch('/api/agent/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'suite.route_viewed',
        actor_type: 'user',
        resource_type: 'suite_route',
        resource_id: route,
        payload: { route },
      }),
    }).catch(() => {});
    emitSuiteEvent({
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      organization_id: 'org_adga_primary',
      event_type: 'suite.route_viewed',
      actor_type: 'user',
      actor_id: null,
      resource_type: 'suite_route',
      resource_id: route,
      created_at: new Date().toISOString(),
      payload: { route },
    } as any);
  }, [route]);

  // Expose openShare globally for any component to trigger
  React.useEffect(() => {
    window.openShare = (subject) => setShareSubject(subject);
    window.openHandoff = (deal) => setHandoffDeal(deal);
    return () => { delete window.openShare; delete window.openHandoff; };
  }, []);

  // Workflow handler — ADGA chat asks for content, app surfaces it
  const handleWorkflow = (action) => {
    if (!action) return;
    if (action.type === 'open-deal') { setOpenDeal(action.deal); }
    else if (action.type === 'story') { setFocusDealId(action.dealId); navigate('story'); }
    else if (action.type === 'route') { navigate(action.route); }
  };

  // Keyboard
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdkOpen(v => !v); }
      if (e.key === 'Escape') { setOpenDeal(null); setCmdkOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const crumb = route === 'map' && mapData?.deal
    ? `Dealflow · ${mapData.deal.name?.split(' — ')[0] || mapData.deal.name || ''}`.trim().replace(/·\s*$/, '')
    : (ROUTE_LABELS[route] || 'Home');

  // Context value exposed to every extracted workspace. As more workspaces migrate out of this
  // file, they'll consume from here instead of taking ad-hoc props through the route switch.
  const suiteContextValue: SuiteContextValue = React.useMemo(() => ({
    user: { id: CURRENT_USER.id, name: CURRENT_USER.name, role: (CURRENT_USER.role as any) || 'member' },
    deals,
    leads,
    openDeal: openDealInMap,
    tweaks,
    setTweak,
    navigate,
    setQuickCreate,
  }), [deals, leads, tweaks, navigate]);

  return (
    <SuiteContextProvider value={suiteContextValue}>
    <div className={'app ' + (!tweaks.sidebarCollapsed ? 'sidebar-open ' : 'sidebar-closed ') + (!tweaks.voiceCollapsed ? 'voice-open' : 'voice-closed')}>
      <Sidebar
        route={route}
        setRoute={navigate}
        collapsed={tweaks.sidebarCollapsed}
        setCollapsed={(c) => setTweak('sidebarCollapsed', typeof c === 'function' ? c(tweaks.sidebarCollapsed) : c)}
      />
      <div className="main">
        <Topbar crumb={crumb} setCmdk={setCmdkOpen} tweaks={tweaks} setTweak={setTweak} setRoute={navigate} setQuickCreate={setQuickCreate}/>
        <div className="workspace" data-route={route} style={route === 'map' ? { position: 'relative', overflow: 'hidden', padding: 0 } : undefined}>
          {/* Routes that inject workspace content via page.tsx (map / maps) render that
              content as children. Every other route falls back to the in-monolith route
              switch below. Using a route-id allowlist instead of `!children` because Next.js
              wraps even a `return null` page in a non-null React node — naive truthy check
              would skip the fallback and leave the workspace empty. As more workspaces
              extract into their own page.tsx files, add their route ids to CHILDREN_ROUTES. */}
          {(() => {
            const CHILDREN_ROUTES = new Set(['map', 'maps', 'settings', 'onboarding']);
            return CHILDREN_ROUTES.has(route) || (route === 'admin' && sectionFromUrl === 'audit') ? children : null;
          })()}
          {!(new Set(['map', 'maps', 'settings', 'onboarding']).has(route) || (route === 'admin' && sectionFromUrl === 'audit')) && (<>
          {route === 'home'      && <HomePage deals={deals} openDeal={openDealInMap} setRoute={navigate}/>}
          {route === 'pending'   && <PendingPage deals={deals} openDeal={openDealInMap}/>}
          {route === 'inbox'     && <InboxPage openDeal={openDealInMap} deals={deals} meetingInbox={meetingInbox}/>}
          {route === 'tasks'     && <TasksPage openDeal={openDealInMap} deals={deals} setQuickCreate={setQuickCreate}/>}
          {route === 'calendar'  && <CalendarPage openDeal={openDealInMap} deals={deals} onMeetingCreated={(event, deliveries) => {
            setMeetingInbox(prev => [{
              id: 'cal-inbox-' + event.id,
              from: 'Calendar',
              subj: 'Meeting scheduled · ' + event.title,
              preview: `${(event.attendees || []).length} attendees · ${deliveries.filter(d => d.status === 'sent').length} invites sent · ${event.meeting_url || 'meeting link pending'}`,
              time: 'now',
              deal: event.deal_id || 'Calendar',
              unread: true,
              tag: 'Calendar',
            }, ...prev]);
          }}/>}
          {route === 'teams'     && <TeamsPage deals={deals} openDeal={openDealInMap} setRoute={navigate}/>}
          {route === 'leads'     && <LeadsPage openDeal={openDealInMap} setQuickCreate={setQuickCreate} leads={leads} selectedLead={selectedLead} setSelectedLead={setSelectedLead}/>}
          {route === 'pipeline'  && <PipelinePage view={tweaks.pipelineView} setView={v => setTweak('pipelineView', v)} deals={deals} setDeals={setDeals} openDeal={openDealInMap} setQuickCreate={setQuickCreate}/> }
          {route === 'story'     && <StoryPage deals={deals} openDeal={openDealInMap} focusDealId={focusDealId}/>}
          {route === 'crm'       && <CRMPage openDeal={openDealInMap} deals={deals}/>}
          {route === 'documents' && <DocumentsPage deals={deals} openDeal={openDealInMap}/>}
          {route === 'knowledge' && (
            CONTRACT_WORKSPACE_RENDERERS.knowledge ? (
              <React.Suspense fallback={<div style={{ padding: 24, color: '#6b6760', fontSize: 14 }}>Loading…</div>}>
                {React.createElement(CONTRACT_WORKSPACE_RENDERERS.knowledge)}
              </React.Suspense>
            ) : <KnowledgePage/>
          )}
          {route === 'intelligence' && <IntelligencePage deals={deals}/>}
          {route === 'voice-notes' && <VoiceNotesPage/>}
          {route === 'messaging' && <MessagingPage/>}
          {route === 'reports'   && <ReportsPage/>}
          {route === 'admin'     && <AdminPage initialSection={sectionFromUrl}/>}
          {route === 'affiliates' && <AffiliateCenterPage initialSection={sectionFromUrl}/>}
          {route === 'invoicing'  && <InvoicingCenterPage/>}
          {route === 'billing'   && <BillingPage/>}
          {route === 'settings'  && <SettingsPage tweaks={tweaks} setTweak={setTweak} initialSection={sectionFromUrl}/>}
          {route === 'map'       && (
            <React.Suspense fallback={<div style={{ padding: 24, color: '#6b6760', fontSize: 14 }}>Loading dealflow...</div>}>
              <MapWorkspace mapData={mapData}/>
            </React.Suspense>
          )}
          {/* /suite/deals renders through children. No in-monolith renderer. */}
          </>)}
        </div>
      </div>
      <VoicePanel
        state={tweaks.voiceState}
        setState={(s) => setTweak('voiceState', typeof s === 'function' ? s(tweaks.voiceState) : s)}
        collapsed={tweaks.voiceCollapsed}
        setCollapsed={(c) => setTweak('voiceCollapsed', typeof c === 'function' ? c(tweaks.voiceCollapsed) : c)}
        onWorkflow={handleWorkflow}
        deals={deals}
        leads={leads}
        activeContext={route === 'map' && mapData ? {
          kind: 'map',
          mapId: mapData.mapId,
          deal: mapData.deal,
          nodeCount: (mapData.initialNodes || []).length,
          edgeCount: (mapData.initialEdges || []).length,
        } : { kind: 'workspace', route }}
      />
      <button
        className={'mobile-scrim ' + ((!tweaks.sidebarCollapsed || !tweaks.voiceCollapsed) ? 'on' : '')}
        type="button"
        aria-label="Close panels"
        onClick={() => setTweak({ sidebarCollapsed: true, voiceCollapsed: true })}
      />

      {openDeal && <DealDrawer deal={openDeal} onClose={() => setOpenDeal(null)}/>}
      {cmdkOpen && <CommandBar deals={deals} setRoute={navigate} openDeal={openDealInMap} close={() => setCmdkOpen(false)}/>}
      {shareSubject && <ShareModal subject={shareSubject} onClose={() => setShareSubject(null)}/>}
      {handoffDeal && <HandoffModal deal={handoffDeal} onClose={() => setHandoffDeal(null)} onConfirm={(payload) => { console.log('Handoff:', payload); }}/>}
      <QuickCreateModal
        type={quickCreate}
        onClose={() => setQuickCreate(null)}
        onCreated={(type, record) => {
          if (type === 'deal') {
            setDeals(prev => [{
              id: record.id || dealId(9999),
              name: record.name,
              company: 'c1',
              type: 'Acquisition',
              value: Math.round((record.value_cents || 0) / 100),
              currency: 'USD',
              stage: 'qualify',
              prob: record.probability || 10,
              owner: 'p1',
              team: ['p1'],
              close: record.expected_close_at ? String(record.expected_close_at).slice(0, 10) : '2026-06-30',
              updated: 'Just now',
              tags: ['manual'],
              priority: 'med',
              source: 'Manual',
            }, ...prev]);
          }
          if (type === 'lead') {
            const createdLead = normalizeCreatedLead(record);
            setLeads(prev => [createdLead, ...prev]);
            setSelectedLead(createdLead);
            navigate('leads');
          }
        }}
      />
      {editMode && <ADGATweaks tweaks={tweaks} setTweak={setTweak}/>}
    </div>
    </SuiteContextProvider>
  );
}

// Labels mirror the registry. Sourced through the import so adding a route in routes.ts updates
// crumb + sidebar labels in one place.
const ROUTE_LABELS = REGISTRY_ROUTE_LABELS;

function Topbar({ crumb, setCmdk, tweaks, setTweak, setRoute, setQuickCreate }) {
  return (
    <div className="topbar">
      <button
        className="btn icon ghost menu-btn"
        type="button"
        onClick={() => setTweak('sidebarCollapsed', !tweaks.sidebarCollapsed)}
        title="Menu"
        aria-label="Toggle menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <div className="crumb">
        <span className="here">{crumb}.</span>
      </div>
      <div className="topbar-actions">
        <button className="search" type="button" onClick={() => setCmdk(true)}>
          <Icon name="search" size={13}/>
          <span>Search deals, contacts, files…</span>
          <span className="kbd">⌘K</span>
        </button>

        <button
          className="btn icon ghost"
          type="button"
          onClick={() => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
        >
          <Icon name={tweaks.theme === 'dark' ? 'sun' : 'moon'} size={15}/>
        </button>
        <button className="btn icon ghost" type="button" title="Notifications"><Icon name="bell" size={15}/></button>
        {tweaks.voiceCollapsed && (
          <button className="btn adga-open-btn" type="button" onClick={() => setTweak('voiceCollapsed', false)} title="Show ADGA panel">
            <Icon name="sparkles" size={13}/> ADGA
          </button>
        )}
        {!tweaks.voiceCollapsed && (
          <button className="btn icon ghost adga-mobile-btn" type="button" onClick={() => setTweak('voiceCollapsed', true)} title="Close ADGA" aria-label="Close ADGA">
            <Icon name="x" size={15}/>
          </button>
        )}
        <button className="btn primary" type="button" onClick={() => {
          if (crumb === 'Leads') setQuickCreate('lead');
          else if (crumb === 'Tasks') setQuickCreate('task');
          else setQuickCreate('deal');
        }}>
          <Icon name="plus" size={13}/> New
        </button>
      </div>
    </div>
  );
}

function CommandBar({ deals, setRoute, openDeal, close }) {
  const [q, setQ] = React.useState('');
  const ql = q.toLowerCase();
  const matchedDeals = deals.filter(d =>
    !ql ||
    d.name.toLowerCase().includes(ql) ||
    d.id.toLowerCase().includes(ql) ||
    (companyOf(d.company)?.name || '').toLowerCase().includes(ql)
  ).slice(0, 6);

  const matchedRoutes = Object.entries(ROUTE_LABELS).filter(([k,v]) =>
    !ql || v.toLowerCase().includes(ql)
  ).slice(0, 6);

  return (
    <div className="cmdk-bg" onClick={close}>
      <div className="cmdk" onClick={e => e.stopPropagation()}>
        <div className="cmdk-input">
          <Icon name="search" size={16} className="muted"/>
          <input
            autoFocus
            placeholder="Find deals, contacts, files, settings…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <button className="btn ghost sm" type="button" onClick={close}>Esc</button>
        </div>
        <div className="cmdk-list">
          {matchedDeals.length > 0 && <div className="cmdk-sec">Deals</div>}
          {matchedDeals.map(d => (
            <button
              key={d.id}
              type="button"
              className="cmdk-item"
              onClick={() => { openDeal(d); close(); }}
            >
              <Icon name="pipeline" size={14}/>
              <span><b>{d.name.split(' — ')[0]}</b> <span className="muted">— {d.name.split(' — ')[1] || d.type}</span></span>
              <span className="desc mono">{d.id}</span>
            </button>
          ))}
          {matchedRoutes.length > 0 && <div className="cmdk-sec">Navigate</div>}
          {matchedRoutes.map(([k, v]) => (
            <button
              key={k}
              type="button"
              className="cmdk-item"
              onClick={() => { setRoute(k); close(); }}
            >
              <Icon name="chevR" size={14}/>
              <span>{v}</span>
              <span className="desc">Go to {v.toLowerCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ADGATweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Appearance">
        <TweakRadio
          label="Theme"
          value={tweaks.theme}
          onChange={v => setTweak('theme', v)}
          options={[{value:'light',label:'Light'},{value:'dark',label:'Dark'}]}
        />
        <TweakColor
          label="Accent"
          value={tweaks.accent}
          onChange={v => setTweak('accent', v)}
          options={ACCENT_OPTIONS.map(a => a.color)}
        />
        <TweakRadio
          label="Density"
          value={tweaks.density}
          onChange={v => setTweak('density', v)}
          options={[{value:'compact',label:'Compact'},{value:'spacious',label:'Spacious'}]}
        />
      </TweakSection>

      <TweakSection label="Layout">
        <TweakToggle
          label="Collapse sidebar"
          value={tweaks.sidebarCollapsed}
          onChange={v => setTweak('sidebarCollapsed', v)}
        />
        <TweakToggle
          label="Collapse Voice Agent"
          value={tweaks.voiceCollapsed}
          onChange={v => setTweak('voiceCollapsed', v)}
        />
      </TweakSection>

      <TweakSection label="Pipeline">
        <TweakSelect
          label="Default view"
          value={tweaks.pipelineView}
          onChange={v => setTweak('pipelineView', v)}
          options={[
            {value:'kanban',label:'Kanban'},
            {value:'table',label:'Table'},
            {value:'timeline',label:'Timeline'},
          ]}
        />
      </TweakSection>

      <TweakSection label="Voice Agent">
        <TweakSelect
          label="State"
          value={tweaks.voiceState}
          onChange={v => setTweak('voiceState', v)}
          options={[
            {value:'idle',label:'Idle'},
            {value:'listening',label:'Listening'},
            {value:'talking',label:'Speaking'},
          ]}
        />
      </TweakSection>
    </TweaksPanel>
  );
}




export default function AdgaSuite({
  bootstrap = null,
  children = null,
}: { bootstrap?: any; children?: React.ReactNode } = {}) {
  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js" strategy="afterInteractive" />
      <App bootstrap={bootstrap}>{children}</App>
    </>
  );
}
