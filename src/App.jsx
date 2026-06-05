import { useState, useEffect } from "react";

const PLATFORMS = ["Facebook", "Instagram", "YouTube", "TikTok", "LinkedIn", "X"];
const CONTENT_TYPES = ["فيديو/Reel", "بوست/كابشن", "كاروسيل", "Story"];
const STATUSES = ["✅ نزل", "📅 مجدول", "✍️ قيد الإنتاج"];

const PLATFORM_COLORS = {
  Facebook: "#1877F2", Instagram: "#E1306C", YouTube: "#FF0000",
  TikTok: "#010101", LinkedIn: "#0A66C2", X: "#14171A"
};

const STATUS_COLORS = {
  "✅ نزل": "#22c55e", "📅 مجدول": "#f59e0b", "✍️ قيد الإنتاج": "#f97316"
};

const TYPE_ICONS = {
  "فيديو/Reel": "🎬", "بوست/كابشن": "📝", "كاروسيل": "🎠", "Story": "⭕"
};

const emptyForm = {
  title: "", platforms: [], type: "", date: new Date().toISOString().split("T")[0],
  topic: "", status: "✅ نزل", link: "", notes: ""
};

export default function ContentTracker() {
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState("board"); // board | form | list
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState({ platform: "الكل", type: "الكل", status: "الكل" });
  const [notionStatus, setNotionStatus] = useState(null); // null | loading | success | error
  const [notionDbId, setNotionDbId] = useState(null);
  const [notionMsg, setNotionMsg] = useState("");

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("ihab-content-tracker-entries");
        if (r) setEntries(JSON.parse(r.value));
      } catch {}
      try {
        const r2 = await window.storage.get("ihab-notion-db-id");
        if (r2) setNotionDbId(r2.value);
      } catch {}
    })();
  }, []);

  const save = async (newEntries) => {
    setEntries(newEntries);
    try { await window.storage.set("ihab-content-tracker-entries", JSON.stringify(newEntries)); } catch {}
  };

  // ── Notion: Create DB then add entry ──────────────────────────────────
  const FIXED_DS_ID = "7a28c015-7b94-49b5-b358-6ec5e8eb6740";

  const ensureNotionDb = async () => {
    return FIXED_DS_ID;
  };

  const pushToNotion = async (entry) => {
    setNotionStatus("loading");
    setNotionMsg("جاري الرفع على Notion...");
    try {
      const dsId = FIXED_DS_ID;
      const prompt = `Add a new page to Notion data source "collection://${dsId}" with these properties:
- "عنوان المحتوى" (title): "${entry.title}"
- "المنصة" (multi_select): ${JSON.stringify(entry.platforms)}
- "نوع المحتوى" (select): "${entry.type}"
- "date:تاريخ النشر:start": "${entry.date}"
- "date:تاريخ النشر:is_datetime": 0
- "الموضوع / الفكرة" (text): "${entry.topic || ""}"
- "الحالة" (select): "${entry.status}"
- "رابط المنشور" (url): ${entry.link ? '"' + entry.link + '"' : 'null'}
- "ملاحظات" (text): "${entry.notes || ""}"
Use notion-create-pages with parent data_source_id="${dsId}". Reply only with تم if success.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
          mcp_servers: [{ type: "url", url: "https://mcp.notion.com/mcp", name: "notion-mcp" }]
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setNotionStatus("success");
      setNotionMsg("✅ اتضاف على Notion بنجاح!");
    } catch (e) {
      setNotionStatus("error");
      setNotionMsg("❌ " + (e.message || "مشكلة في الاتصال بـ Notion"));
    }
    setTimeout(() => { setNotionStatus(null); setNotionMsg(""); }, 4000);
  };

  // ── Submit form ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.title || !form.platforms.length || !form.type) return;
    const entry = { ...form, id: Date.now() };
    const newEntries = [entry, ...entries];
    await save(newEntries);
    await pushToNotion(entry);
    setForm(emptyForm);
    setView("board");
  };

  // ── Filter ─────────────────────────────────────────────────────────────
  const filtered = entries.filter(e => {
    if (filter.platform !== "الكل" && !e.platforms.includes(filter.platform)) return false;
    if (filter.type !== "الكل" && e.type !== filter.type) return false;
    if (filter.status !== "الكل" && e.status !== filter.status) return false;
    return true;
  });

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = {
    total: entries.length,
    published: entries.filter(e => e.status === "✅ نزل").length,
    scheduled: entries.filter(e => e.status === "📅 مجدول").length,
    inProd: entries.filter(e => e.status === "✍️ قيد الإنتاج").length,
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ fontFamily: "Cairo, Tajawal, Arial, sans-serif", background: "#f8f9fb", minHeight: "100vh", padding: "0" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a2744 0%, #2d4a8a 100%)", color: "#fff", padding: "20px 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>📊 Content Tracker</div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>د. إيهاب ماجد — سجل المحتوى على السوشيال ميديا</div>
        </div>
        <button onClick={() => setView(view === "form" ? "board" : "form")}
          style={{ background: view === "form" ? "#e74c3c" : "#f59e0b", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
          {view === "form" ? "← إلغاء" : "+ إضافة محتوى"}
        </button>
      </div>

      {/* Notion status toast */}
      {notionStatus && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 999,
          background: notionStatus === "success" ? "#22c55e" : notionStatus === "error" ? "#ef4444" : "#3b82f6",
          color: "#fff", padding: "12px 24px", borderRadius: 12, fontWeight: 600, fontSize: 14,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 8
        }}>
          {notionStatus === "loading" && <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>}
          {notionMsg}
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: "16px 24px" }}>
        {[
          { label: "إجمالي المحتوى", val: stats.total, color: "#1a2744" },
          { label: "✅ نزل", val: stats.published, color: "#22c55e" },
          { label: "📅 مجدول", val: stats.scheduled, color: "#f59e0b" },
          { label: "✍️ قيد الإنتاج", val: stats.inProd, color: "#f97316" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* FORM VIEW */}
      {view === "form" && (
        <div style={{ padding: "0 24px 24px" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#1a2744" }}>➕ تسجيل قطعة محتوى جديدة</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Title */}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>عنوان المحتوى *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="مثال: ٣ أخطاء بتدمر علاقتك بطفلك" style={inp} />
              </div>

              {/* Platforms */}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>المنصة *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PLATFORMS.map(p => (
                    <button key={p} onClick={() => setForm(f => ({
                      ...f, platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p]
                    }))} style={{
                      padding: "7px 16px", borderRadius: 20, border: "2px solid",
                      borderColor: form.platforms.includes(p) ? PLATFORM_COLORS[p] : "#ddd",
                      background: form.platforms.includes(p) ? PLATFORM_COLORS[p] : "#fff",
                      color: form.platforms.includes(p) ? "#fff" : "#555",
                      fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit"
                    }}>{p}</button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <label style={lbl}>نوع المحتوى *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CONTENT_TYPES.map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                      padding: "7px 14px", borderRadius: 20, border: "2px solid",
                      borderColor: form.type === t ? "#1a2744" : "#ddd",
                      background: form.type === t ? "#1a2744" : "#fff",
                      color: form.type === t ? "#fff" : "#555",
                      fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit"
                    }}>{TYPE_ICONS[t]} {t}</button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label style={lbl}>تاريخ النشر *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
              </div>

              {/* Status */}
              <div>
                <label style={lbl}>الحالة</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))} style={{
                      padding: "7px 14px", borderRadius: 20, border: "2px solid",
                      borderColor: form.status === s ? STATUS_COLORS[s] : "#ddd",
                      background: form.status === s ? STATUS_COLORS[s] : "#fff",
                      color: form.status === s ? "#fff" : "#555",
                      fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit"
                    }}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Link */}
              <div>
                <label style={lbl}>رابط المنشور (اختياري)</label>
                <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                  placeholder="https://..." style={inp} dir="ltr" />
              </div>

              {/* Topic */}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>الموضوع / الفكرة</label>
                <textarea value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="زي: إزاي تتعامل مع الطفل العنيد..." rows={2} style={{ ...inp, resize: "vertical" }} />
              </div>

              {/* Notes */}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="أي ملاحظات تانية..." rows={2} style={{ ...inp, resize: "vertical" }} />
              </div>
            </div>

            <button onClick={handleSubmit}
              disabled={!form.title || !form.platforms.length || !form.type}
              style={{
                marginTop: 20, width: "100%", padding: "14px", background: "#1a2744",
                color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700,
                cursor: !form.title || !form.platforms.length || !form.type ? "not-allowed" : "pointer",
                opacity: !form.title || !form.platforms.length || !form.type ? 0.5 : 1,
                fontFamily: "inherit"
              }}>
              ✅ حفظ + رفع على Notion
            </button>
          </div>
        </div>
      )}

      {/* BOARD / LIST VIEW */}
      {view !== "form" && (
        <div style={{ padding: "0 24px 24px" }}>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>فلترة:</span>
            {[
              { label: "المنصة", key: "platform", opts: ["الكل", ...PLATFORMS] },
              { label: "النوع", key: "type", opts: ["الكل", ...CONTENT_TYPES] },
              { label: "الحالة", key: "status", opts: ["الكل", ...STATUSES] },
            ].map(f => (
              <select key={f.key} value={filter[f.key]}
                onChange={e => setFilter(x => ({ ...x, [f.key]: e.target.value }))}
                style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                {f.opts.map(o => <option key={o}>{o}</option>)}
              </select>
            ))}
            <div style={{ marginRight: "auto", display: "flex", gap: 8 }}>
              {["board", "list"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: "7px 14px", borderRadius: 8, border: "1.5px solid",
                  borderColor: view === v ? "#1a2744" : "#ddd",
                  background: view === v ? "#1a2744" : "#fff",
                  color: view === v ? "#fff" : "#555",
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600
                }}>{v === "board" ? "🗂 بطاقات" : "📋 قائمة"}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#aaa" }}>
              <div style={{ fontSize: 48 }}>📭</div>
              <div style={{ fontSize: 16, marginTop: 12 }}>مفيش محتوى مسجل لحد دلوقتي</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>اضغط "إضافة محتوى" عشان تبدأ</div>
            </div>
          ) : view === "board" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
              {filtered.map(e => <EntryCard key={e.id} entry={e} onDelete={async (id) => {
                const newE = entries.filter(x => x.id !== id);
                await save(newE);
              }} />)}
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#1a2744", color: "#fff" }}>
                    {["العنوان", "المنصة", "النوع", "التاريخ", "الحالة", ""].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => (
                    <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fb", borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "11px 14px", fontWeight: 600, maxWidth: 200 }}>{e.title}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {e.platforms.map(p => (
                            <span key={p} style={{ background: PLATFORM_COLORS[p], color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{p}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>{TYPE_ICONS[e.type]} {e.type}</td>
                      <td style={{ padding: "11px 14px", direction: "ltr", textAlign: "right" }}>{e.date}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ background: STATUS_COLORS[e.status] + "22", color: STATUS_COLORS[e.status], padding: "3px 10px", borderRadius: 8, fontWeight: 700, fontSize: 12 }}>{e.status}</span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <button onClick={async () => { const n = entries.filter(x => x.id !== e.id); await save(n); }}
                          style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry: e, onDelete }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", borderRight: `4px solid ${STATUS_COLORS[e.status] || "#ccc"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#1a2744", flex: 1, lineHeight: 1.4 }}>{e.title}</div>
        <button onClick={() => onDelete(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 16, padding: "0 0 0 6px" }}>✕</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
        {e.platforms.map(p => (
          <span key={p} style={{ background: PLATFORM_COLORS[p], color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{p}</span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 11, padding: "3px 9px", borderRadius: 8, fontWeight: 600 }}>{TYPE_ICONS[e.type]} {e.type}</span>
        <span style={{ background: STATUS_COLORS[e.status] + "22", color: STATUS_COLORS[e.status], fontSize: 11, padding: "3px 9px", borderRadius: 8, fontWeight: 700 }}>{e.status}</span>
      </div>

      {e.topic && <div style={{ fontSize: 12, color: "#666", marginBottom: 6, lineHeight: 1.5 }}>💡 {e.topic}</div>}

      <div style={{ fontSize: 11, color: "#aaa", display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span>📅 {e.date}</span>
        {e.link && <a href={e.link} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>🔗 رابط المنشور</a>}
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 };
const inp = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
