// ChoreTracker.jsx - Full rewrite with shared chore library, events, history, analytics
"use client"
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const nowStr = () => { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };
const fmtDate = (ds) => new Date(ds + "T12:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
const fmtMonthKey = (ds) => ds.slice(0, 7); // "2026-06"
const fmtMonthLabel = (mk) => new Date(mk + "-01T12:00:00").toLocaleDateString("en", { month: "long", year: "numeric" });

const FREQ_LABELS = { daily: "Daily", weekdays: "Weekdays", weekends: "Weekends", "2x_week": "2×/week", "3x_week": "3×/week", weekly: "Weekly" };
const FREQS = ["daily", "weekdays", "weekends", "2x_week", "3x_week", "weekly"];
const EMOJIS = ["⭐","🧹","🍽️","🛏️","🐶","📚","🗑️","🌿","🧺","🚿","🪥","🧴","💧","🍳","🛒","🎯","🏃","🎨","🎵","🧩","🪴","🐱","🧸","🎮","🏆","💪","🌟","✨","🎁","🎊"];

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  navy: "#1a2340", navyLight: "#2a3560",
  gold: "#f5c842", goldLight: "#fdf3c0",
  coral: "#ff6b6b", coralLight: "#fff0f0",
  mint: "#4ecdc4", mintLight: "#e8faf9",
  purple: "#a78bfa", purpleLight: "#f3f0ff",
  green: "#4ade80", greenLight: "#f0fdf4",
  orange: "#f97316", orangeLight: "#fff7ed",
  bg: "#f7f8fc", card: "#ffffff",
  text: "#1a2340", muted: "#8892a4", border: "#e8eaf0",
};

const CHILD_COLORS = ["#ff6b6b","#4ecdc4","#a78bfa","#f5c842","#4ade80","#f97316"];
const CHILD_BGS   = ["#fff0f0","#e8faf9","#f3f0ff","#fdf3c0","#f0fdf4","#fff7ed"];

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app:      { minHeight: "100vh", width: "100%", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text },
  header:   { background: C.navy, color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 12px rgba(26,35,64,0.15)" },
  body:     { padding: "16px 16px 100px" },
  card:     { background: C.card, borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(26,35,64,0.06)", border: `1px solid ${C.border}` },
  input:    { width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 15, outline: "none", background: "#fff", boxSizing: "border-box", color: C.text, fontFamily: "inherit" },
  label:    { fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" },
  bottomNav:{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 0 12px", zIndex: 20 },
  secTitle: { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 },
};

const btn = (variant = "primary", extra = {}) => ({
  background: variant === "primary" ? C.gold : variant === "navy" ? C.navy : variant === "danger" ? C.coral : variant === "green" ? C.green : "transparent",
  color: variant === "primary" ? C.navy : variant === "ghost" ? C.muted : "#fff",
  border: variant === "ghost" ? `1px solid ${C.border}` : "none",
  borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 14,
  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit", ...extra,
});

const navBtn = (active) => ({
  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  background: "none", border: "none", cursor: "pointer",
  color: active ? C.navy : C.muted, fontSize: 9, fontWeight: active ? 800 : 500, fontFamily: "inherit", padding: "4px 0",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLastNDates(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dates.push(d.toISOString().split("T")[0]); }
  return dates;
}

function isChoredue(chore) {
  const day = new Date().getDay();
  if (chore.frequency === "daily") return true;
  if (chore.frequency === "weekdays") return day >= 1 && day <= 5;
  if (chore.frequency === "weekends") return day === 0 || day === 6;
  return true; // weekly variants always show
}

function getMonthDates(year, month) {
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => `${year}-${String(month+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ profiles, onLogin }) {
  const [selectedId, setSelectedId] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const selected = profiles.find(p => p.id === selectedId);

  function handleKey(d) {
    if (!selected) return;
    const newPin = pin + d;
    setPin(newPin);
    if (newPin.length === 4) {
      if (newPin === selected.pin) {
        onLogin(selected);
      } else {
        setError("Wrong PIN"); setShake(true);
        setTimeout(() => { setPin(""); setError(""); setShake(false); }, 800);
      }
    }
  }

  return (
    <div style={{ ...S.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", width: "100%", maxWidth: 380, padding: 24 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>⭐</div>
        <div style={{ fontWeight: 900, fontSize: 28, color: C.navy, marginBottom: 4 }}>Chore Stars</div>
        <div style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>Who's logging in?</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 28 }}>
          {profiles.map((p, i) => (
            <button key={p.id} onClick={() => { setSelectedId(p.id); setPin(""); setError(""); }}
              style={{ padding: "12px 20px", borderRadius: 16, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
                background: selectedId === p.id ? CHILD_BGS[i % CHILD_BGS.length] : C.bg,
                color: selectedId === p.id ? CHILD_COLORS[i % CHILD_COLORS.length] : C.muted,
                border: `2px solid ${selectedId === p.id ? CHILD_COLORS[i % CHILD_COLORS.length] : C.border}` }}>
              {p.avatar} {p.name}
              <div style={{ fontSize: 10, fontWeight: 500, color: C.muted, marginTop: 2 }}>{p.role === "parent" ? "Parent" : "Kid"}</div>
            </button>
          ))}
        </div>
        {selected && (
          <>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 24, transform: shake ? "translateX(8px)" : "none", transition: "transform 0.1s" }}>
              {[0,1,2,3].map(i => <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < pin.length ? C.navy : C.border, transition: "background 0.15s" }} />)}
            </div>
            {error && <div style={{ color: C.coral, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 260, margin: "0 auto" }}>
              {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d, i) => (
                <button key={i} onClick={() => { if (d === "⌫") setPin(p => p.slice(0,-1)); else if (d !== "") handleKey(String(d)); }}
                  style={{ padding: "14px 0", fontSize: d === "⌫" ? 18 : 20, fontWeight: 700, background: d === "" ? "transparent" : C.card, border: d === "" ? "none" : `1.5px solid ${C.border}`, borderRadius: 12, cursor: d === "" ? "default" : "pointer", color: C.navy, fontFamily: "inherit" }}>{d}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Today Tab (Kid view) ─────────────────────────────────────────────────────
function TodayKidTab({ currentUser, chores, assignments, choreLogs, events, profiles, onToggleChore }) {
  const myChores = chores.filter(c => c.active && assignments.some(a => a.chore_id === c.id && a.child_id === currentUser.id) && isChoredue(c));
  const todayLogs = choreLogs.filter(l => l.child_id === currentUser.id && l.completed_date === todayStr());
  const todayEvents = events.filter(e => e.child_id === currentUser.id && e.event_date === todayStr());
  const doneCount = myChores.filter(c => todayLogs.some(l => l.chore_id === c.id)).length;
  const chorePoints = todayLogs.reduce((s, l) => { const c = chores.find(ch => ch.id === l.chore_id); return s + (c?.points || 0); }, 0);
  const eventPoints = todayEvents.reduce((s, e) => s + e.points, 0);
  const totalPoints = chorePoints + eventPoints;
  const pct = myChores.length ? Math.round((doneCount / myChores.length) * 100) : 0;

  const ci = profiles.findIndex(p => p.id === currentUser.id);
  const color = CHILD_COLORS[ci % CHILD_COLORS.length];
  const bg = CHILD_BGS[ci % CHILD_BGS.length];

  return (
    <div>
      {/* Hero card */}
      <div style={{ ...S.card, background: C.navy, color: "#fff", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 40 }}>{currentUser.avatar}</div>
          <div>
            <div style={{ fontSize: 11, color: "#a0aec0" }}>{new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>{currentUser.name}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: C.gold, lineHeight: 1 }}>{totalPoints}</div>
            <div style={{ fontSize: 11, color: "#a0aec0" }}>pts today</div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, height: 8, overflow: "hidden", marginBottom: 4 }}>
          <div style={{ background: C.gold, width: `${pct}%`, height: "100%", borderRadius: 8, transition: "width 0.4s" }} />
        </div>
        <div style={{ fontSize: 11, color: "#a0aec0" }}>{doneCount}/{myChores.length} chores done · {pct}%</div>
      </div>

      {/* Chores */}
      <div style={S.secTitle}>Today's Chores</div>
      {myChores.length === 0 && <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 24 }}><div style={{ fontSize: 32 }}>🎉</div><div style={{ fontWeight: 700, marginTop: 8 }}>No chores assigned</div></div>}
      {myChores.map(chore => {
        const done = todayLogs.some(l => l.chore_id === chore.id);
        return (
          <div key={chore.id} style={{ ...S.card, padding: "12px 14px", border: done ? `2px solid ${color}` : `1px solid ${C.border}`, background: done ? bg : C.card, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => onToggleChore(chore.id, currentUser.id, done)}
                style={{ width: 28, height: 28, borderRadius: "50%", background: done ? color : C.border, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", flexShrink: 0 }}>
                {done && <span style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>✓</span>}
              </button>
              <span style={{ fontSize: 24 }}>{chore.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, textDecoration: done ? "line-through" : "none", color: done ? C.muted : C.text }}>{chore.title}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{FREQ_LABELS[chore.frequency]}</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 16, color: done ? color : C.muted }}>+{chore.points}</div>
            </div>
          </div>
        );
      })}

      {/* Today's events */}
      {todayEvents.length > 0 && (
        <>
          <div style={{ ...S.secTitle, marginTop: 8 }}>Today's Events</div>
          {todayEvents.map(e => (
            <div key={e.id} style={{ ...S.card, padding: "12px 14px", background: e.points >= 0 ? C.greenLight : C.coralLight, border: `1px solid ${e.points >= 0 ? C.green : C.coral}`, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{e.points >= 0 ? "🌟" : "⚠️"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{e.title}</div>
                  {e.notes && <div style={{ fontSize: 12, color: C.muted }}>{e.notes}</div>}
                </div>
                <div style={{ fontWeight: 900, fontSize: 16, color: e.points >= 0 ? C.green : C.coral }}>{e.points >= 0 ? "+" : ""}{e.points}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Today Tab (Parent view) ──────────────────────────────────────────────────
function TodayParentTab({ profiles, chores, assignments, choreLogs, events, onToggleChore, onGoEvents }) {
  const kids = profiles.filter(p => p.role !== "parent");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Today's Overview</div>
        <button style={{ ...btn("primary"), fontSize: 12, padding: "8px 14px" }} onClick={onGoEvents}>+ Event</button>
      </div>
      {kids.map((kid, ki) => {
        const color = CHILD_COLORS[ki % CHILD_COLORS.length];
        const bg = CHILD_BGS[ki % CHILD_BGS.length];
        const myChores = chores.filter(c => c.active && assignments.some(a => a.chore_id === c.id && a.child_id === kid.id) && isChoredue(c));
        const todayLogs = choreLogs.filter(l => l.child_id === kid.id && l.completed_date === todayStr());
        const todayEvents = events.filter(e => e.child_id === kid.id && e.event_date === todayStr());
        const doneCount = myChores.filter(c => todayLogs.some(l => l.chore_id === c.id)).length;
        const chorePoints = todayLogs.reduce((s, l) => { const c = chores.find(ch => ch.id === l.chore_id); return s + (c?.points || 0); }, 0);
        const eventPoints = todayEvents.reduce((s, e) => s + e.points, 0);
        const total = chorePoints + eventPoints;
        const pct = myChores.length ? Math.round((doneCount / myChores.length) * 100) : 0;

        return (
          <div key={kid.id} style={{ ...S.card, border: `2px solid ${color}`, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 28 }}>{kid.avatar}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{kid.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{doneCount}/{myChores.length} chores</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 22, color: total >= 0 ? color : C.coral }}>{total >= 0 ? "+" : ""}{total} pts</div>
            </div>
            <div style={{ background: C.border, borderRadius: 8, height: 6, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ background: color, width: `${pct}%`, height: "100%", borderRadius: 8, transition: "width 0.4s" }} />
            </div>
            {myChores.map(chore => {
              const done = todayLogs.some(l => l.chore_id === chore.id);
              return (
                <div key={chore.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <button onClick={() => onToggleChore(chore.id, kid.id, done)}
                    style={{ width: 22, height: 22, borderRadius: "50%", background: done ? color : C.border, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {done && <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </button>
                  <span style={{ fontSize: 18 }}>{chore.emoji}</span>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, textDecoration: done ? "line-through" : "none", color: done ? C.muted : C.text }}>{chore.title}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: done ? color : C.muted }}>+{chore.points}</div>
                </div>
              );
            })}
            {todayEvents.map(e => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 18 }}>{e.points >= 0 ? "🌟" : "⚠️"}</span>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: e.points >= 0 ? C.green : C.coral }}>{e.points >= 0 ? "+" : ""}{e.points}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Events Tab (Parent only) ─────────────────────────────────────────────────
function EventsTab({ profiles, events, onAdd, onDelete }) {
  const kids = profiles.filter(p => p.role !== "parent");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ childId: kids[0]?.id || "", title: "", type: "positive", points: "10", notes: "", date: todayStr() });
  const [filterKid, setFilterKid] = useState("all");

  async function submit() {
    if (!form.title.trim() || !form.childId) return;
    const pts = form.type === "negative" ? -Math.abs(Number(form.points)) : Math.abs(Number(form.points));
    await onAdd({ child_id: form.childId, event_date: form.date, title: form.title, type: form.type, points: pts, notes: form.notes || null });
    setForm({ childId: kids[0]?.id || "", title: "", type: "positive", points: "10", notes: "", date: todayStr() });
    setShowForm(false);
  }

  const filtered = events.filter(e => filterKid === "all" || e.child_id === filterKid).sort((a, b) => b.event_date.localeCompare(a.event_date));

  return (
    <div>
      <button style={{ ...btn("primary"), width: "100%", justifyContent: "center", marginBottom: 14, padding: "13px" }} onClick={() => setShowForm(true)}>+ Record Event</button>

      {showForm && (
        <div style={{ ...S.card, border: `2px solid ${C.gold}`, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>Record Event</div>

          {/* Type toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button onClick={() => setForm(p => ({ ...p, type: "positive", points: String(Math.abs(Number(p.points))) }))}
              style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", background: form.type === "positive" ? C.greenLight : C.bg, color: form.type === "positive" ? C.green : C.muted, border: `2px solid ${form.type === "positive" ? C.green : C.border}` }}>🌟 Positive</button>
            <button onClick={() => setForm(p => ({ ...p, type: "negative", points: String(Math.abs(Number(p.points))) }))}
              style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", background: form.type === "negative" ? C.coralLight : C.bg, color: form.type === "negative" ? C.coral : C.muted, border: `2px solid ${form.type === "negative" ? C.coral : C.border}` }}>⚠️ Negative</button>
          </div>

          <label style={S.label}>Child</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {kids.map((k, i) => (
              <button key={k.id} onClick={() => setForm(p => ({ ...p, childId: k.id }))}
                style={{ padding: "8px 14px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", background: form.childId === k.id ? CHILD_BGS[i % CHILD_BGS.length] : C.bg, color: form.childId === k.id ? CHILD_COLORS[i % CHILD_COLORS.length] : C.muted, border: `2px solid ${form.childId === k.id ? CHILD_COLORS[i % CHILD_COLORS.length] : C.border}` }}>
                {k.avatar} {k.name}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div><label style={S.label}>Points</label><input style={S.input} type="number" min="1" placeholder="10" value={form.points} onChange={e => setForm(p => ({ ...p, points: e.target.value }))} /></div>
          </div>

          <label style={S.label}>What happened?</label>
          <input style={{ ...S.input, marginBottom: 12 }} placeholder={form.type === "positive" ? "e.g. Scored a goal, Piano recital..." : "e.g. Hit sibling, Refused homework..."} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />

          <label style={S.label}>Notes (optional)</label>
          <input style={{ ...S.input, marginBottom: 14 }} placeholder="Extra details..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />

          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btn("primary"), flex: 1, justifyContent: "center" }} onClick={submit}>Save</button>
            <button style={{ ...btn("ghost"), flex: 1, justifyContent: "center" }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => setFilterKid("all")} style={{ padding: "6px 12px", borderRadius: 20, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: filterKid === "all" ? C.navy : C.bg, color: filterKid === "all" ? "#fff" : C.muted, border: `1.5px solid ${filterKid === "all" ? C.navy : C.border}` }}>All</button>
        {kids.map((k, i) => (
          <button key={k.id} onClick={() => setFilterKid(k.id)} style={{ padding: "6px 12px", borderRadius: 20, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: filterKid === k.id ? CHILD_BGS[i % CHILD_BGS.length] : C.bg, color: filterKid === k.id ? CHILD_COLORS[i % CHILD_COLORS.length] : C.muted, border: `1.5px solid ${filterKid === k.id ? CHILD_COLORS[i % CHILD_COLORS.length] : C.border}` }}>
            {k.avatar} {k.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 24 }}><div style={{ fontSize: 32 }}>📋</div><div style={{ fontWeight: 700, marginTop: 8 }}>No events yet</div></div>}
      {filtered.map(e => {
        const kid = profiles.find(p => p.id === e.child_id);
        const ki = profiles.indexOf(kid);
        const color = CHILD_COLORS[ki % CHILD_COLORS.length];
        return (
          <div key={e.id} style={{ ...S.card, padding: "12px 14px", background: e.points >= 0 ? C.greenLight : C.coralLight, border: `1px solid ${e.points >= 0 ? C.green : C.coral}`, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{e.points >= 0 ? "🌟" : "⚠️"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{e.title}</span>
                  <span style={{ fontSize: 11, background: CHILD_BGS[ki % CHILD_BGS.length], color, borderRadius: 20, padding: "1px 8px", fontWeight: 700 }}>{kid?.avatar} {kid?.name}</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>{fmtDate(e.event_date)}</div>
                {e.notes && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{e.notes}</div>}
              </div>
              <div style={{ fontWeight: 900, fontSize: 18, color: e.points >= 0 ? C.green : C.coral }}>{e.points >= 0 ? "+" : ""}{e.points}</div>
              <button onClick={() => onDelete(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 15, padding: 4 }}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ profiles, chores, choreLogs, events }) {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterKid, setFilterKid] = useState(profiles.filter(p => p.role !== "parent")[0]?.id || "all");

  const kids = profiles.filter(p => p.role !== "parent");
  const firstDay = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7;
  const monthName = firstDay.toLocaleDateString("en", { month: "long", year: "numeric" });

  function netPointsForDay(kidId, ds) {
    const logs = choreLogs.filter(l => l.child_id === kidId && l.completed_date === ds);
    const chorePoints = logs.reduce((s, l) => { const c = chores.find(ch => ch.id === l.chore_id); return s + (c?.points || 0); }, 0);
    const evtPoints = events.filter(e => e.child_id === kidId && e.event_date === ds).reduce((s, e) => s + e.points, 0);
    return chorePoints + evtPoints;
  }

  function hasActivity(ds) {
    if (filterKid === "all") return kids.some(k => netPointsForDay(k.id, ds) !== 0 || choreLogs.some(l => l.child_id === k.id && l.completed_date === ds) || events.some(e => e.child_id === k.id && e.event_date === ds));
    return choreLogs.some(l => l.child_id === filterKid && l.completed_date === ds) || events.some(e => e.child_id === filterKid && e.event_date === ds);
  }

  const cells = [...Array(startDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); setSelectedDate(null); }
  function nextMonth() { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); setSelectedDate(null); }

  const detailKids = filterKid === "all" ? kids : kids.filter(k => k.id === filterKid);

  return (
    <div>
      {/* Kid filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => setFilterKid("all")} style={{ padding: "6px 12px", borderRadius: 20, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: filterKid === "all" ? C.navy : C.bg, color: filterKid === "all" ? "#fff" : C.muted, border: `1.5px solid ${filterKid === "all" ? C.navy : C.border}` }}>All</button>
        {kids.map((k, i) => (
          <button key={k.id} onClick={() => setFilterKid(k.id)} style={{ padding: "6px 12px", borderRadius: 20, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: filterKid === k.id ? CHILD_BGS[i % CHILD_BGS.length] : C.bg, color: filterKid === k.id ? CHILD_COLORS[i % CHILD_COLORS.length] : C.muted, border: `1.5px solid ${filterKid === k.id ? CHILD_COLORS[i % CHILD_COLORS.length] : C.border}` }}>
            {k.avatar} {k.name}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.navy, padding: "4px 8px" }}>‹</button>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{monthName}</div>
          <button onClick={nextMonth} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.navy, padding: "4px 8px" }}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
          {["M","T","W","T","F","S","S"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: C.muted, padding: "4px 0" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const ds = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const isToday = ds === todayStr();
            const selected = selectedDate === ds;
            const activity = hasActivity(ds);
            const net = filterKid !== "all" ? netPointsForDay(filterKid, ds) : null;
            return (
              <button key={i} onClick={() => setSelectedDate(selected ? null : ds)}
                style={{ padding: "7px 0", borderRadius: 10, border: "none", cursor: "pointer", background: selected ? C.navy : isToday ? C.goldLight : C.bg, color: selected ? "#fff" : isToday ? C.navy : C.text, fontWeight: isToday || selected ? 800 : 500, fontSize: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontFamily: "inherit" }}>
                {day}
                {activity && <div style={{ width: 6, height: 6, borderRadius: "50%", background: selected ? "#fff" : net !== null ? (net >= 0 ? C.mint : C.coral) : C.gold }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      {selectedDate && (
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 12 }}>{fmtDate(selectedDate)}</div>
          {detailKids.map((kid, ki) => {
            const color = CHILD_COLORS[profiles.indexOf(kid) % CHILD_COLORS.length];
            const bg = CHILD_BGS[profiles.indexOf(kid) % CHILD_BGS.length];
            const dayLogs = choreLogs.filter(l => l.child_id === kid.id && l.completed_date === selectedDate);
            const dayEvents = events.filter(e => e.child_id === kid.id && e.event_date === selectedDate);
            const net = netPointsForDay(kid.id, selectedDate);
            if (!dayLogs.length && !dayEvents.length) return null;
            return (
              <div key={kid.id} style={{ ...S.card, border: `2px solid ${color}`, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 24 }}>{kid.avatar}</span>
                  <div style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>{kid.name}</div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: net >= 0 ? color : C.coral }}>{net >= 0 ? "+" : ""}{net} pts</div>
                </div>
                {dayLogs.map(log => {
                  const chore = chores.find(c => c.id === log.chore_id);
                  if (!chore) return null;
                  return (
                    <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.mint, fontWeight: 900 }}>✓</span>
                      <span style={{ fontSize: 18 }}>{chore.emoji}</span>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{chore.title}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color }}> +{chore.points}</div>
                    </div>
                  );
                })}
                {dayEvents.map(e => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 18 }}>{e.points >= 0 ? "🌟" : "⚠️"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                      {e.notes && <div style={{ fontSize: 11, color: C.muted }}>{e.notes}</div>}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: e.points >= 0 ? C.green : C.coral }}>{e.points >= 0 ? "+" : ""}{e.points}</div>
                  </div>
                ))}
              </div>
            );
          })}
          {detailKids.every(k => !choreLogs.some(l => l.child_id === k.id && l.completed_date === selectedDate) && !events.some(e => e.child_id === k.id && e.event_date === selectedDate)) && (
            <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 24 }}><div style={{ fontSize: 32 }}>📭</div><div style={{ fontWeight: 700, marginTop: 8 }}>Nothing logged this day</div></div>
          )}
        </div>
      )}
      {!selectedDate && <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "16px 0" }}>Tap any date to see activity</div>}
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ profiles, chores, choreLogs, events, onGoHistory }) {
  const kids = profiles.filter(p => p.role !== "parent");
  const [filterKid, setFilterKid] = useState(kids[0]?.id || "");
  const [period, setPeriod] = useState(14);

  const kid = profiles.find(p => p.id === filterKid);
  const ki = profiles.indexOf(kid);
  const color = CHILD_COLORS[ki % CHILD_COLORS.length];

  function netForDay(kidId, ds) {
    const chorePoints = choreLogs.filter(l => l.child_id === kidId && l.completed_date === ds).reduce((s, l) => { const c = chores.find(ch => ch.id === l.chore_id); return s + (c?.points || 0); }, 0);
    const evtPoints = events.filter(e => e.child_id === kidId && e.event_date === ds).reduce((s, e) => s + e.points, 0);
    return chorePoints + evtPoints;
  }

  const dates = getLastNDates(period);
  const dailyData = dates.map(ds => ({ ds, net: netForDay(filterKid, ds), label: new Date(ds + "T12:00:00").toLocaleDateString("en", { weekday: "short" }) }));
  const maxAbs = Math.max(...dailyData.map(d => Math.abs(d.net)), 1);

  // Monthly aggregates — collect all months that have data
  const allDates = getLastNDates(120);
  const monthMap = {};
  allDates.forEach(ds => {
    const mk = fmtMonthKey(ds);
    if (!monthMap[mk]) monthMap[mk] = 0;
    monthMap[mk] += netForDay(filterKid, ds);
  });
  const months = Object.entries(monthMap).filter(([, v]) => v !== 0).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div>
      {/* Kid selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {kids.map((k, i) => (
          <button key={k.id} onClick={() => setFilterKid(k.id)} style={{ padding: "8px 14px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", background: filterKid === k.id ? CHILD_BGS[i % CHILD_BGS.length] : C.bg, color: filterKid === k.id ? CHILD_COLORS[i % CHILD_COLORS.length] : C.muted, border: `2px solid ${filterKid === k.id ? CHILD_COLORS[i % CHILD_COLORS.length] : C.border}` }}>
            {k.avatar} {k.name}
          </button>
        ))}
      </div>

      {/* Period toggle */}
      <div style={{ display: "flex", gap: 6, background: C.card, borderRadius: 12, padding: 4, marginBottom: 16, border: `1px solid ${C.border}` }}>
        {[7, 14, 30].map(p => <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", background: period === p ? C.gold : "transparent", color: period === p ? C.navy : C.muted, border: "none" }}>Last {p}d</button>)}
      </div>

      {/* Bar chart */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Net Points per Day</div>
          <div style={{ fontWeight: 900, fontSize: 18, color }}>
            {dailyData.reduce((s, d) => s + d.net, 0) >= 0 ? "+" : ""}{dailyData.reduce((s, d) => s + d.net, 0)} total
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, height: 120 }}>
          {dailyData.map((d, i) => {
            const barH = Math.max((Math.abs(d.net) / maxAbs) * 90, d.net !== 0 ? 4 : 0);
            const isPos = d.net >= 0;
            return (
              <div key={i} onClick={() => onGoHistory(d.ds)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", gap: 2 }}>
                {isPos && <div style={{ fontSize: 9, fontWeight: 700, color: d.net > 0 ? color : "transparent" }}>{d.net > 0 ? d.net : ""}</div>}
                <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 90 }}>
                  {isPos && <div style={{ background: color, height: barH, borderRadius: "4px 4px 0 0", width: "100%" }} />}
                </div>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", height: 0 }}>
                  {!isPos && <div style={{ background: C.coral, height: barH, borderRadius: "0 0 4px 4px", width: "100%", marginTop: 0 }} />}
                </div>
                {!isPos && <div style={{ fontSize: 9, fontWeight: 700, color: C.coral }}>{d.net}</div>}
                {period <= 14 && <div style={{ fontSize: 9, color: C.muted }}>{d.label}</div>}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 11 }}>
          <span style={{ color }}> Positive</span>
          <span style={{ color: C.coral }}> Negative</span>
          <span style={{ color: C.muted, marginLeft: "auto", fontSize: 10 }}>Tap a bar → day detail</span>
        </div>
      </div>

      {/* Monthly aggregate */}
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10, marginTop: 4 }}>Monthly Summary</div>
      {months.length === 0 && <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 24 }}>No monthly data yet</div>}
      {months.map(([mk, total]) => (
        <div key={mk} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtMonthLabel(mk)}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{kid?.avatar} {kid?.name}</div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 22, color: total >= 0 ? color : C.coral }}>{total >= 0 ? "+" : ""}{total}</div>
          <div style={{ fontSize: 11, color: C.muted }}>pts</div>
        </div>
      ))}
    </div>
  );
}

// ─── Chores Management Tab (Parent only) ──────────────────────────────────────
function ChoresTab({ chores, assignments, profiles, choreLogs, onUpdate }) {
  const kids = profiles.filter(p => p.role !== "parent");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: "", emoji: "⭐", points: "10", frequency: "daily", assignedTo: [] });

  const BLANK = { title: "", emoji: "⭐", points: "10", frequency: "daily", assignedTo: [] };

  function hasHistory(choreId) {
    return choreLogs.some(l => l.chore_id === choreId);
  }

  function openAdd() { setForm(BLANK); setEditingId(null); setShowForm(true); }

  function openEdit(chore) {
    const assigned = assignments.filter(a => a.chore_id === chore.id).map(a => a.child_id);
    setForm({ title: chore.title, emoji: chore.emoji, points: String(chore.points), frequency: chore.frequency, assignedTo: assigned });
    setEditingId(chore.id);
    setShowForm(true);
  }

  function toggleKid(kidId) {
    setForm(p => ({ ...p, assignedTo: p.assignedTo.includes(kidId) ? p.assignedTo.filter(id => id !== kidId) : [...p.assignedTo, kidId] }));
  }

  async function save() {
    if (!form.title.trim()) return;
    if (editingId) {
      // Update chore
      await supabase.from("chores").update({ title: form.title, emoji: form.emoji, points: Number(form.points), frequency: form.frequency }).eq("id", editingId);
      // Update assignments
      await supabase.from("chore_assignments").delete().eq("chore_id", editingId);
      if (form.assignedTo.length) {
        await supabase.from("chore_assignments").insert(form.assignedTo.map(cid => ({ chore_id: editingId, child_id: cid })));
      }
      onUpdate();
    } else {
      // Insert chore
      const { data } = await supabase.from("chores").insert([{ title: form.title, emoji: form.emoji, points: Number(form.points), frequency: form.frequency, active: true }]).select().single();
      if (data && form.assignedTo.length) {
        await supabase.from("chore_assignments").insert(form.assignedTo.map(cid => ({ chore_id: data.id, child_id: cid })));
      }
      onUpdate();
    }
    setShowForm(false); setEditingId(null); setForm(BLANK);
  }

  async function toggleActive(chore) {
    await supabase.from("chores").update({ active: !chore.active }).eq("id", chore.id);
    onUpdate();
  }

  async function removeOrArchive(chore) {
    if (hasHistory(chore.id)) {
      await supabase.from("chores").update({ active: false }).eq("id", chore.id);
    } else {
      await supabase.from("chore_assignments").delete().eq("chore_id", chore.id);
      await supabase.from("chores").delete().eq("id", chore.id);
    }
    onUpdate();
  }

  const ChoreForm = () => (
    <div style={{ ...S.card, border: `2px solid ${C.gold}`, marginBottom: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>{editingId ? "Edit Chore" : "New Chore"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", gap: 8, marginBottom: 10 }}>
        <div><label style={S.label}>Icon</label>
          <select value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))} style={{ ...S.input, fontSize: 18, padding: "8px 4px" }}>
            {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div><label style={S.label}>Chore name</label><input style={S.input} placeholder="e.g. Make bed" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div><label style={S.label}>Points</label><input style={S.input} type="number" min="1" value={form.points} onChange={e => setForm(p => ({ ...p, points: e.target.value }))} /></div>
        <div><label style={S.label}>Frequency</label>
          <select style={S.input} value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
            {FREQS.map(f => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
          </select>
        </div>
      </div>
      <label style={S.label}>Assign to</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {kids.map((k, i) => (
          <button key={k.id} onClick={() => toggleKid(k.id)}
            style={{ padding: "8px 14px", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", background: form.assignedTo.includes(k.id) ? CHILD_BGS[i % CHILD_BGS.length] : C.bg, color: form.assignedTo.includes(k.id) ? CHILD_COLORS[i % CHILD_COLORS.length] : C.muted, border: `2px solid ${form.assignedTo.includes(k.id) ? CHILD_COLORS[i % CHILD_COLORS.length] : C.border}` }}>
            {k.avatar} {k.name}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ ...btn("primary"), flex: 1, justifyContent: "center" }} onClick={save}>Save</button>
        <button style={{ ...btn("ghost"), flex: 1, justifyContent: "center" }} onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={S.secTitle}>Chore Library</div>
        <button style={btn("primary")} onClick={openAdd}>+ Add</button>
      </div>

      {showForm && <ChoreForm />}

      {chores.length === 0 && !showForm && (
        <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 24 }}><div style={{ fontSize: 32 }}>📋</div><div style={{ fontWeight: 700, marginTop: 8 }}>No chores yet. Add one!</div></div>
      )}

      {chores.map(chore => {
        const assigned = assignments.filter(a => a.chore_id === chore.id).map(a => profiles.find(p => p.id === a.child_id)).filter(Boolean);
        const withHistory = hasHistory(chore.id);
        const isEditing = editingId === chore.id && showForm;
        return (
          <div key={chore.id} style={{ ...S.card, padding: "12px 14px", opacity: chore.active ? 1 : 0.5, marginBottom: 8, border: isEditing ? `2px solid ${C.gold}` : `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{chore.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{chore.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
                  {FREQ_LABELS[chore.frequency]} · <span style={{ color: C.gold, fontWeight: 700 }}>+{chore.points} pts</span>
                  {withHistory && <span style={{ marginLeft: 6, color: C.purple }}>· 📊 has history</span>}
                </div>
                {assigned.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {assigned.map((k, i) => {
                      const ki = profiles.indexOf(k);
                      return <span key={k.id} style={{ fontSize: 11, background: CHILD_BGS[ki % CHILD_BGS.length], color: CHILD_COLORS[ki % CHILD_COLORS.length], borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>{k.avatar} {k.name}</span>;
                    })}
                  </div>
                )}
              </div>
              <button onClick={() => openEdit(chore)} style={{ padding: "4px 8px", borderRadius: 12, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", background: isEditing ? C.goldLight : C.bg, color: isEditing ? C.navy : C.muted, border: `1px solid ${isEditing ? C.gold : C.border}` }}>✏️</button>
              <button onClick={() => toggleActive(chore)} style={{ padding: "5px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", background: chore.active ? C.mintLight : C.bg, color: chore.active ? C.mint : C.muted, border: `1.5px solid ${chore.active ? C.mint : C.border}` }}>{chore.active ? "On" : "Off"}</button>
              <button onClick={() => removeOrArchive(chore)} title={withHistory ? "Has history — will deactivate" : "Delete"} style={{ background: "none", border: "none", cursor: "pointer", color: withHistory ? C.muted : C.coral, fontSize: 15, padding: 4 }}>{withHistory ? "🗃️" : "✕"}</button>
            </div>
          </div>
        );
      })}

      <div style={{ ...S.card, background: C.bg, border: `1px dashed ${C.border}`, padding: "12px 16px", marginTop: 8 }}>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
          <strong>✏️</strong> Edit name, icon, points, frequency, assignments<br/>
          <strong>On/Off</strong> Hide from Today without losing data<br/>
          <strong>🗃️</strong> Has history — deactivates to preserve records<br/>
          <strong>✕</strong> No history — permanently deleted
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ChoreTracker() {
  const [appState, setAppState] = useState("loading");
  const [profiles, setProfiles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("today");
  const [chores, setChores] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [choreLogs, setChoreLogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [historyJumpDate, setHistoryJumpDate] = useState(null);

  const isParent = currentUser?.role === "parent";

  async function loadAll() {
    const [{ data: ch }, { data: as }, { data: cl }, { data: ev }] = await Promise.all([
      supabase.from("chores").select("*").order("created_at"),
      supabase.from("chore_assignments").select("*"),
      supabase.from("chore_logs").select("*").gte("completed_date", getLastNDates(120)[0]),
      supabase.from("events").select("*").order("event_date", { ascending: false }),
    ]);
    if (ch) setChores(ch);
    if (as) setAssignments(as);
    if (cl) setChoreLogs(cl);
    if (ev) setEvents(ev);
  }

  useEffect(() => {
    async function init() {
      const { data: pr } = await supabase.from("profiles").select("*").order("role");
      if (pr) setProfiles(pr);
      await loadAll();
      setAppState("login");
    }
    init();
  }, []);

  async function toggleChore(choreId, childId, isDone) {
    if (isDone) {
      const log = choreLogs.find(l => l.chore_id === choreId && l.child_id === childId && l.completed_date === todayStr());
      if (log) { await supabase.from("chore_logs").delete().eq("id", log.id); }
    } else {
      const { data } = await supabase.from("chore_logs").insert([{ chore_id: choreId, child_id: childId, completed_date: todayStr() }]).select().single();
      if (data) setChoreLogs(p => [...p, data]);
    }
    await loadAll();
  }

  async function addEvent(ev) {
    const { data } = await supabase.from("events").insert([ev]).select().single();
    if (data) setEvents(p => [data, ...p]);
  }

  async function deleteEvent(id) {
    await supabase.from("events").delete().eq("id", id);
    setEvents(p => p.filter(e => e.id !== id));
  }

  function goToHistory(ds) {
    setHistoryJumpDate(ds);
    setView("history");
  }

  if (appState === "loading") return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", color: C.muted }}><div style={{ fontSize: 56 }}>⭐</div><div style={{ fontWeight: 700, marginTop: 8 }}>Loading...</div></div>
    </div>
  );

  if (appState === "login" || !currentUser) return (
    <LoginScreen profiles={profiles} onLogin={user => { setCurrentUser(user); setAppState("app"); }} />
  );

  const NAV_PARENT = [
    { id: "today",    label: "Today",   emoji: "🏠" },
    { id: "events",   label: "Events",  emoji: "🌟" },
    { id: "history",  label: "History", emoji: "📅" },
    { id: "analytics",label: "Stats",   emoji: "📊" },
    { id: "chores",   label: "Chores",  emoji: "⚙️" },
  ];
  const NAV_KID = [
    { id: "today",   label: "Today",   emoji: "🏠" },
    { id: "history", label: "History", emoji: "📅" },
  ];
  const NAV = isParent ? NAV_PARENT : NAV_KID;

  const TITLES = { today: "Chore Stars", events: "Events", history: "History", analytics: "Analytics", chores: "Manage Chores" };

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>⭐ {TITLES[view]}</div>
          <div style={{ fontSize: 10, color: "#a0aec0" }}>{currentUser.avatar} {currentUser.name} · {new Date().toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}</div>
        </div>
        <button onClick={() => { setCurrentUser(null); setAppState("login"); }} style={{ background: "none", border: "none", color: "#a0aec0", cursor: "pointer", fontSize: 18 }}>↩</button>
      </div>

      <div style={S.body}>
        {view === "today" && isParent && <TodayParentTab profiles={profiles} chores={chores} assignments={assignments} choreLogs={choreLogs} events={events} onToggleChore={toggleChore} onGoEvents={() => setView("events")} />}
        {view === "today" && !isParent && <TodayKidTab currentUser={currentUser} chores={chores} assignments={assignments} choreLogs={choreLogs} events={events} profiles={profiles} onToggleChore={toggleChore} />}
        {view === "events" && <EventsTab profiles={profiles} events={events} onAdd={addEvent} onDelete={deleteEvent} />}
        {view === "history" && <HistoryTab profiles={profiles} chores={chores} choreLogs={choreLogs} events={events} initialDate={historyJumpDate} />}
        {view === "analytics" && <AnalyticsTab profiles={profiles} chores={chores} choreLogs={choreLogs} events={events} onGoHistory={goToHistory} />}
        {view === "chores" && isParent && <ChoresTab chores={chores} assignments={assignments} profiles={profiles} choreLogs={choreLogs} onUpdate={loadAll} />}
      </div>

      <div style={S.bottomNav}>
        {NAV.map(n => (
          <button key={n.id} style={navBtn(view === n.id)} onClick={() => setView(n.id)}>
            <span style={{ fontSize: 16 }}>{n.emoji}</span>
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}
