"use client"

import { useState, useEffect } from "react";

// ─── Palette & Theme ────────────────────────────────────────────────────────
// Playful but not childish: deep navy base, warm yellow gold accent,
// coral for alerts, mint for success. Rounded cards, emoji-forward UI.
const COLORS = {
  navy: "#1a2340",
  navyLight: "#2a3560",
  gold: "#f5c842",
  goldLight: "#fdf3c0",
  coral: "#ff6b6b",
  mint: "#4ecdc4",
  mintLight: "#e8faf9",
  lavender: "#a78bfa",
  lavenderLight: "#f3f0ff",
  bg: "#f7f8fc",
  card: "#ffffff",
  text: "#1a2340",
  muted: "#8892a4",
  border: "#e8eaf0",
};

// ─── Mock Data ───────────────────────────────────────────────────────────────
const INITIAL_USERS = [
  { id: "parent1", name: "Parent", role: "parent", pin: "1234", avatar: "👨‍👩‍👧‍👦" },
  { id: "child1", name: "Emma", role: "child", pin: "1111", avatar: "🦄", points: 0 },
  { id: "child2", name: "Jake", role: "child", pin: "2222", avatar: "🦖", points: 0 },
];

const INITIAL_CHORES = [
  { id: "c1", title: "Make bed", emoji: "🛏️", points: 5, assignedTo: "child1", frequency: "daily" },
  { id: "c2", title: "Clear dishes", emoji: "🍽️", points: 5, assignedTo: "child1", frequency: "daily" },
  { id: "c3", title: "Tidy room", emoji: "🧹", points: 10, assignedTo: "child1", frequency: "weekly" },
  { id: "c4", title: "Feed the dog", emoji: "🐕", points: 5, assignedTo: "child2", frequency: "daily" },
  { id: "c5", title: "Take out trash", emoji: "🗑️", points: 10, assignedTo: "child2", frequency: "weekly" },
  { id: "c6", title: "Vacuum living room", emoji: "🌀", points: 15, assignedTo: "child2", frequency: "weekly" },
];

// Get today's date string
const today = () => new Date().toISOString().split("T")[0];

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: COLORS.bg,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    color: COLORS.text,
    maxWidth: 480,
    margin: "0 auto",
    position: "relative",
  },
  header: {
    background: COLORS.navy,
    color: "#fff",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: "0 2px 12px rgba(26,35,64,0.15)",
  },
  logo: { fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" },
  body: { padding: "16px 16px 100px" },
  card: {
    background: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0 2px 8px rgba(26,35,64,0.06)",
    border: `1px solid ${COLORS.border}`,
  },
  btn: (variant = "primary") => ({
    background: variant === "primary" ? COLORS.gold : variant === "danger" ? COLORS.coral : variant === "ghost" ? "transparent" : COLORS.navyLight,
    color: variant === "primary" ? COLORS.navy : variant === "ghost" ? COLORS.muted : "#fff",
    border: variant === "ghost" ? `1px solid ${COLORS.border}` : "none",
    borderRadius: 12,
    padding: "10px 18px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  }),
  input: {
    width: "100%",
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 15,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
    color: COLORS.text,
  },
  label: { fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" },
  tab: (active) => ({
    flex: 1,
    padding: "10px 0",
    background: active ? COLORS.gold : "transparent",
    color: active ? COLORS.navy : COLORS.muted,
    border: "none",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  }),
  badge: (color = COLORS.goldLight) => ({
    background: color,
    borderRadius: 20,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 700,
    display: "inline-block",
  }),
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 480,
    background: "#fff",
    borderTop: `1px solid ${COLORS.border}`,
    display: "flex",
    padding: "8px 0 12px",
    zIndex: 20,
  },
  navBtn: (active) => ({
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: active ? COLORS.navy : COLORS.muted,
    fontSize: 10,
    fontWeight: active ? 800 : 500,
  }),
};

// ─── Components ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const users = INITIAL_USERS;

  function handlePinKey(digit) {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === selectedUser.pin) {
          onLogin(selectedUser);
        } else {
          setError("Wrong PIN, try again");
          setTimeout(() => { setPin(""); setError(""); }, 800);
        }
      }
    }
  }

  if (!selectedUser) {
    return (
      <div style={{ ...S.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 0 }}>
        <div style={{ background: COLORS.navy, width: "100%", maxWidth: 480, padding: "40px 24px 32px", textAlign: "center", borderRadius: "0 0 32px 32px" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⭐</div>
          <div style={{ color: "#fff", fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px" }}>Chore Stars</div>
          <div style={{ color: COLORS.muted, fontSize: 14, marginTop: 4 }}>Who's checking in today?</div>
        </div>
        <div style={{ padding: "28px 20px", width: "100%", maxWidth: 480, boxSizing: "border-box" }}>
          {users.map(u => (
            <button key={u.id} onClick={() => setSelectedUser(u)} style={{
              width: "100%", background: COLORS.card, border: `2px solid ${COLORS.border}`,
              borderRadius: 16, padding: "16px 20px", marginBottom: 10,
              display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(26,35,64,0.06)",
            }}>
              <span style={{ fontSize: 36 }}>{u.avatar}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 800, fontSize: 17, color: COLORS.navy }}>{u.name}</div>
                <div style={{ fontSize: 12, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{u.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...S.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ width: "100%", maxWidth: 360, padding: 24, textAlign: "center" }}>
        <button onClick={() => { setSelectedUser(null); setPin(""); setError(""); }}
          style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, marginBottom: 16 }}>
          ← Back
        </button>
        <div style={{ fontSize: 56, marginBottom: 8 }}>{selectedUser.avatar}</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: COLORS.navy }}>{selectedUser.name}</div>
        <div style={{ color: COLORS.muted, fontSize: 14, marginBottom: 28 }}>Enter your PIN</div>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 28 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: "50%",
              background: i < pin.length ? COLORS.navy : COLORS.border,
              transition: "background 0.15s",
            }} />
          ))}
        </div>

        {error && <div style={{ color: COLORS.coral, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 280, margin: "0 auto" }}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d, i) => (
            <button key={i} onClick={() => {
              if (d === "⌫") setPin(p => p.slice(0, -1));
              else if (d !== "") handlePinKey(String(d));
            }} style={{
              padding: "18px 0", fontSize: d === "⌫" ? 20 : 22, fontWeight: 700,
              background: d === "" ? "transparent" : COLORS.card,
              border: d === "" ? "none" : `1.5px solid ${COLORS.border}`,
              borderRadius: 12, cursor: d === "" ? "default" : "pointer",
              color: COLORS.navy,
            }}>{d}</button>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: COLORS.muted }}>Hint: Parent=1234, Emma=1111, Jake=2222</div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return <span style={{ fontSize: 18 }}>✓</span>;
}

function ParentApp({ user, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState(INITIAL_USERS);
  const [chores, setChores] = useState(INITIAL_CHORES);
  const [logs, setLogs] = useState({});
  const [showAddChore, setShowAddChore] = useState(false);
  const [newChore, setNewChore] = useState({ title: "", emoji: "⭐", points: 5, assignedTo: "child1", frequency: "daily" });

  const children = users.filter(u => u.role === "child");

  function getChildLogs(childId) {
    return logs[childId] || {};
  }

  function getTodayCompletions(childId) {
    const childLogs = getChildLogs(childId);
    return Object.entries(childLogs).filter(([k, v]) => v === today()).length;
  }

  function getTotalPoints(childId) {
    const childLogs = getChildLogs(childId);
    let pts = 0;
    Object.entries(childLogs).forEach(([choreId]) => {
      const chore = chores.find(c => c.id === choreId);
      if (chore) pts += chore.points;
    });
    return pts;
  }

  function getWeeklyData(childId) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en", { weekday: "short" });
      const childLogs = getChildLogs(childId);
      const count = Object.values(childLogs).filter(v => v === ds).length;
      days.push({ day: dayName, count });
    }
    return days;
  }

  function addChore() {
    if (!newChore.title.trim()) return;
    const id = "c" + Date.now();
    setChores(prev => [...prev, { ...newChore, id, points: Number(newChore.points) }]);
    setNewChore({ title: "", emoji: "⭐", points: 5, assignedTo: "child1", frequency: "daily" });
    setShowAddChore(false);
  }

  function deleteChore(id) {
    setChores(prev => prev.filter(c => c.id !== id));
  }

  const EMOJIS = ["⭐","🧹","🛏️","🍽️","🌀","🐕","🗑️","📚","🌱","🧺","🚿","🪟"];

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div>
          <div style={S.logo}>⭐ Chore Stars</div>
          <div style={{ fontSize: 11, color: "#a0aec0" }}>Parent Dashboard</div>
        </div>
        <button onClick={onLogout} style={{ ...S.btn("ghost"), color: "#a0aec0", border: "1px solid #3a4560", fontSize: 12 }}>Sign out</button>
      </div>

      <div style={S.body}>
        {/* Tab Bar */}
        <div style={{ ...S.card, padding: 6, display: "flex", gap: 4, marginBottom: 16 }}>
          {["overview","chores","analytics"].map(t => (
            <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
              {t === "overview" ? "👨‍👩‍👧 Overview" : t === "chores" ? "📋 Chores" : "📊 Analytics"}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Today's Progress</div>
            {children.map(child => {
              const childChores = chores.filter(c => c.assignedTo === child.id);
              const done = getTodayCompletions(child.id);
              const pct = childChores.length ? Math.round((done / childChores.length) * 100) : 0;
              const pts = getTotalPoints(child.id);
              return (
                <div key={child.id} style={S.card}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 32 }}>{child.avatar}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 17 }}>{child.name}</div>
                        <div style={{ fontSize: 12, color: COLORS.muted }}>{done}/{childChores.length} chores done</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900, fontSize: 22, color: COLORS.navy }}>{pts}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>total pts</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ background: COLORS.border, borderRadius: 8, height: 8, overflow: "hidden" }}>
                    <div style={{ background: pct === 100 ? COLORS.mint : COLORS.gold, width: `${pct}%`, height: "100%", borderRadius: 8, transition: "width 0.4s" }} />
                  </div>
                  <div style={{ textAlign: "right", fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{pct}% complete</div>
                </div>
              );
            })}
          </div>
        )}

        {/* CHORES TAB */}
        {tab === "chores" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>All Chores</div>
              <button style={S.btn("primary")} onClick={() => setShowAddChore(true)}>+ Add Chore</button>
            </div>

            {showAddChore && (
              <div style={{ ...S.card, border: `2px solid ${COLORS.gold}`, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>New Chore</div>
                <div style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={S.label}>Icon</label>
                    <select value={newChore.emoji} onChange={e => setNewChore(p => ({ ...p, emoji: e.target.value }))}
                      style={{ ...S.input, fontSize: 20, padding: "8px 4px", textAlign: "center" }}>
                      {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Chore name</label>
                    <input style={S.input} placeholder="e.g. Make bed" value={newChore.title}
                      onChange={e => setNewChore(p => ({ ...p, title: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div>
                    <label style={S.label}>Points</label>
                    <input style={S.input} type="number" min="1" max="100" value={newChore.points}
                      onChange={e => setNewChore(p => ({ ...p, points: e.target.value }))} />
                  </div>
                  <div>
                    <label style={S.label}>Assign to</label>
                    <select style={S.input} value={newChore.assignedTo}
                      onChange={e => setNewChore(p => ({ ...p, assignedTo: e.target.value }))}>
                      {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Frequency</label>
                    <select style={S.input} value={newChore.frequency}
                      onChange={e => setNewChore(p => ({ ...p, frequency: e.target.value }))}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...S.btn("primary"), flex: 1 }} onClick={addChore}>Save Chore</button>
                  <button style={{ ...S.btn("ghost"), flex: 1 }} onClick={() => setShowAddChore(false)}>Cancel</button>
                </div>
              </div>
            )}

            {children.map(child => (
              <div key={child.id} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{child.avatar}</span>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{child.name}'s Chores</span>
                </div>
                {chores.filter(c => c.assignedTo === child.id).map(chore => (
                  <div key={chore.id} style={{ ...S.card, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{chore.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{chore.title}</div>
                        <div style={{ fontSize: 11, color: COLORS.muted, textTransform: "capitalize" }}>{chore.frequency}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ ...S.badge(COLORS.goldLight), color: COLORS.navy }}>{chore.points}pts</span>
                      <button onClick={() => deleteChore(chore.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: COLORS.coral }}>✕</button>
                    </div>
                  </div>
                ))}
                {chores.filter(c => c.assignedTo === child.id).length === 0 && (
                  <div style={{ ...S.card, textAlign: "center", color: COLORS.muted, fontSize: 13, padding: 20 }}>
                    No chores yet — add one above!
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {tab === "analytics" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>This Week</div>
            {children.map(child => {
              const weekly = getWeeklyData(child.id);
              const maxCount = Math.max(...weekly.map(d => d.count), 1);
              const totalPts = getTotalPoints(child.id);
              const totalDone = Object.keys(getChildLogs(child.id)).length;
              return (
                <div key={child.id} style={{ ...S.card, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 28 }}>{child.avatar}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 17 }}>{child.name}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900, fontSize: 24, color: COLORS.gold }}>{totalPts}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>total pts</div>
                    </div>
                  </div>
                  {/* Bar chart */}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, marginBottom: 6 }}>
                    {weekly.map((d, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <div style={{ width: "100%", background: d.count > 0 ? COLORS.gold : COLORS.border,
                          height: Math.max((d.count / maxCount) * 64, d.count > 0 ? 8 : 4),
                          borderRadius: "4px 4px 0 0", transition: "height 0.3s" }} />
                        <div style={{ fontSize: 10, color: COLORS.muted }}>{d.day}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <div style={{ flex: 1, background: COLORS.goldLight, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontWeight: 900, fontSize: 20, color: COLORS.navy }}>{totalDone}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>chores done</div>
                    </div>
                    <div style={{ flex: 1, background: COLORS.mintLight, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontWeight: 900, fontSize: 20, color: COLORS.navy }}>{totalPts}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>points earned</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ChildApp({ user, onLogout, sharedState }) {
  const { chores, logs, setLogs } = sharedState;
  const [tab, setTab] = useState("today");

  const myChores = chores.filter(c => c.assignedTo === user.id);
  const myLogs = logs[user.id] || {};

  function isDoneToday(choreId) {
    return myLogs[choreId] === today();
  }

  function toggleChore(choreId) {
    setLogs(prev => {
      const userLogs = { ...(prev[user.id] || {}) };
      if (userLogs[choreId] === today()) {
        delete userLogs[choreId];
      } else {
        userLogs[choreId] = today();
      }
      return { ...prev, [user.id]: userLogs };
    });
  }

  const doneToday = myChores.filter(c => isDoneToday(c.id)).length;
  const totalPoints = Object.entries(myLogs).reduce((sum, [choreId]) => {
    const chore = chores.find(c => c.id === choreId);
    return sum + (chore ? chore.points : 0);
  }, 0);

  const pct = myChores.length ? Math.round((doneToday / myChores.length) * 100) : 0;
  const allDone = doneToday === myChores.length && myChores.length > 0;

  // Weekly data
  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en", { weekday: "short" });
    const count = Object.values(myLogs).filter(v => v === ds).length;
    weekly.push({ day: dayName, count });
  }
  const maxCount = Math.max(...weekly.map(d => d.count), 1);

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div>
          <div style={S.logo}>⭐ Chore Stars</div>
          <div style={{ fontSize: 11, color: "#a0aec0" }}>{user.avatar} {user.name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: COLORS.gold, color: COLORS.navy, borderRadius: 20, padding: "4px 12px", fontWeight: 900, fontSize: 15 }}>
            {totalPoints} ⭐
          </div>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: "#a0aec0", cursor: "pointer", fontSize: 18 }}>↩</button>
        </div>
      </div>

      <div style={S.body}>
        {/* Tab Bar */}
        <div style={{ ...S.card, padding: 6, display: "flex", gap: 4, marginBottom: 16 }}>
          <button style={S.tab(tab === "today")} onClick={() => setTab("today")}>📋 Today</button>
          <button style={S.tab(tab === "progress")} onClick={() => setTab("progress")}>📊 My Progress</button>
        </div>

        {tab === "today" && (
          <div>
            {/* Progress summary */}
            <div style={{ ...S.card, background: allDone ? COLORS.mint : COLORS.navy, color: "#fff", textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: allDone ? 48 : 36, marginBottom: 4 }}>{allDone ? "🏆" : user.avatar}</div>
              <div style={{ fontWeight: 900, fontSize: allDone ? 20 : 18 }}>
                {allDone ? "All done! Amazing work!" : `${doneToday} of ${myChores.length} done`}
              </div>
              <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, height: 8, margin: "12px 0 4px", overflow: "hidden" }}>
                <div style={{ background: COLORS.gold, width: `${pct}%`, height: "100%", borderRadius: 8, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{pct}% complete</div>
            </div>

            {/* Chore list */}
            {myChores.map(chore => {
              const done = isDoneToday(chore.id);
              return (
                <button key={chore.id} onClick={() => toggleChore(chore.id)} style={{
                  width: "100%", ...S.card,
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px",
                  border: done ? `2px solid ${COLORS.mint}` : `1px solid ${COLORS.border}`,
                  background: done ? COLORS.mintLight : COLORS.card,
                  cursor: "pointer", textAlign: "left",
                  transition: "all 0.2s",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: done ? COLORS.mint : COLORS.border,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "background 0.2s",
                  }}>
                    {done && <span style={{ color: "#fff", fontSize: 16, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 28 }}>{chore.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, textDecoration: done ? "line-through" : "none", color: done ? COLORS.muted : COLORS.text }}>
                      {chore.title}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.muted, textTransform: "capitalize" }}>{chore.frequency}</div>
                  </div>
                  <div style={{ ...S.badge(done ? COLORS.mintLight : COLORS.goldLight), color: COLORS.navy }}>+{chore.points}⭐</div>
                </button>
              );
            })}

            {myChores.length === 0 && (
              <div style={{ ...S.card, textAlign: "center", padding: 32, color: COLORS.muted }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                <div style={{ fontWeight: 700 }}>No chores assigned yet!</div>
                <div style={{ fontSize: 13 }}>Ask a parent to set up your chores.</div>
              </div>
            )}
          </div>
        )}

        {tab === "progress" && (
          <div>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ ...S.card, textAlign: "center", background: COLORS.goldLight }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: COLORS.navy }}>{totalPoints}</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>Total Stars ⭐</div>
              </div>
              <div style={{ ...S.card, textAlign: "center", background: COLORS.mintLight }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: COLORS.navy }}>{Object.keys(myLogs).length}</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>Chores Done 🏆</div>
              </div>
            </div>

            {/* Weekly bar chart */}
            <div style={S.card}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>This Week</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
                {weekly.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    {d.count > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.navy }}>{d.count}</div>}
                    <div style={{
                      width: "100%", background: d.count > 0 ? COLORS.gold : COLORS.border,
                      height: Math.max((d.count / maxCount) * 72, d.count > 0 ? 10 : 4),
                      borderRadius: "6px 6px 0 0", transition: "height 0.3s",
                    }} />
                    <div style={{ fontSize: 10, color: COLORS.muted }}>{d.day}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reward levels */}
            <div style={{ ...S.card, marginTop: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>⭐ Star Levels</div>
              {[
                { pts: 0, label: "Rookie", emoji: "🌱" },
                { pts: 25, label: "Helper", emoji: "🌟" },
                { pts: 75, label: "Champion", emoji: "🏆" },
                { pts: 150, label: "Legend", emoji: "🦄" },
              ].map((level, i, arr) => {
                const reached = totalPoints >= level.pts;
                const next = arr[i + 1];
                const isCurrentLevel = reached && (!next || totalPoints < next.pts);
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                    borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    opacity: reached ? 1 : 0.4,
                  }}>
                    <span style={{ fontSize: 24 }}>{level.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{level.label}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{level.pts}+ stars</div>
                    </div>
                    {isCurrentLevel && <span style={{ ...S.badge(COLORS.goldLight), color: COLORS.navy }}>Current!</span>}
                    {reached && !isCurrentLevel && <span style={{ color: COLORS.mint, fontSize: 18 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [chores, setChores] = useState(INITIAL_CHORES);
  const [logs, setLogs] = useState({});

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  const sharedState = { chores, setChores, logs, setLogs };

  if (currentUser.role === "parent") {
    return <ParentApp user={currentUser} onLogout={() => setCurrentUser(null)}
      sharedState={sharedState} />;
  }

  return <ChildApp user={currentUser} onLogout={() => setCurrentUser(null)}
    sharedState={sharedState} />;
}