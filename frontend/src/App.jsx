import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://expenses-tracker-api.YOUR_SUBDOMAIN.workers.dev";

// Dynamic palette — mirrors funfairlabs.com/index.html palette rotation exactly.
// Three hue ranges, one picked at random on every page load.
function pickPalette() {
  const ranges = [[0, 35], [165, 260], [280, 340]];
  const r = ranges[Math.floor(Math.random() * ranges.length)];
  const h = Math.floor(Math.random() * (r[1] - r[0]) + r[0]);
  return {
    h,
    pri:  `hsl(${h},78%,42%)`,
    priD: `hsl(${h},76%,30%)`,
    priL: `hsl(${h},82%,95%)`,
    priT: `hsla(${h},78%,42%,0.13)`,
  };
}

// Palette is fixed for the lifetime of this module (one load = one palette).
const PAL = pickPalette();

// Static tokens — match CSS variables in index.html
const C = {
  bg:       "#faf9f7",
  surface:  "#ffffff",
  surface2: "#f3f1ed",
  border:   "#e4e0d8",
  borderS:  "#ccc8be",
  text:     "#1c1a17",
  text2:    "#4a4540",
  text3:    "#908a80",
  radius:   "10px",
  radiusLg: "18px",
  shadow:   "0 1px 4px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.05)",
  shadowMd: "0 6px 24px rgba(0,0,0,.09)",
  // Dynamic palette slots — resolved once per load
  pri:  PAL.pri,
  priD: PAL.priD,
  priL: PAL.priL,
  priT: PAL.priT,
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    background: ${C.bg};
    color: ${C.text};
    min-height: 100vh;
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  a { color: inherit; text-decoration: none; }

  /* ── NAV — matches site nav exactly ── */
  nav {
    position: sticky; top: 0; z-index: 200;
    background: rgba(250,249,247,0.92);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid ${C.border};
    border-top: 3px solid ${C.pri};
  }
  .nav-inner {
    max-width: 1080px; margin: 0 auto;
    display: flex; align-items: center;
    padding: 0 32px; height: 58px; gap: 28px;
  }
  .nav-logo {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 18px; font-weight: 700;
    letter-spacing: -0.01em;
    color: ${C.text}; flex-shrink: 0;
    display: flex; align-items: center; gap: 9px;
  }
  .nav-logo em { color: ${C.pri}; font-style: normal; }
  .nav-spacer { flex: 1; }

  /* ── LAYOUT ── */
  .app {
    max-width: 1080px;
    margin: 0 auto;
    padding: 48px 32px;
  }

  /* ── HERO — mirrors site hero section ── */
  .hero {
    text-align: center;
    padding: 64px 0 48px;
  }
  .hero-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    background: ${C.priL};
    color: ${C.pri};
    font-size: 13px; font-weight: 600;
    padding: 5px 13px;
    border-radius: 20px;
    border: 1px solid hsla(24, 78%, 42%, 0.25);
    margin-bottom: 20px;
  }
  .hero h1 {
    font-size: clamp(28px, 5vw, 48px);
    font-weight: 700;
    letter-spacing: -0.03em;
    color: ${C.text};
    line-height: 1.1;
    margin-bottom: 14px;
  }
  .hero h1 em { color: ${C.pri}; font-style: normal; }
  .hero p {
    font-size: 17px;
    color: ${C.text2};
    max-width: 480px;
    margin: 0 auto 32px;
    line-height: 1.6;
  }
  .hero-actions {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    flex-wrap: wrap;
  }

  /* ── CARDS — matches .product-card on site ── */
  .card {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: ${C.radiusLg};
    box-shadow: ${C.shadow};
    padding: 28px;
    transition: box-shadow .2s, border-color .2s, transform .15s;
  }
  .card:hover {
    box-shadow: ${C.shadowMd};
    border-color: ${C.borderS};
    transform: translateY(-2px);
  }
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    margin-top: 32px;
  }
  .card-icon {
    width: 44px; height: 44px;
    background: ${C.priL};
    color: ${C.pri};
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    margin-bottom: 16px;
  }
  .card h3 {
    font-size: 16px; font-weight: 700;
    color: ${C.text};
    margin-bottom: 6px;
    letter-spacing: -0.01em;
  }
  .card p {
    font-size: 14px; color: ${C.text2}; line-height: 1.55;
  }

  /* ── SECTION LABEL ── */
  .section-label {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: ${C.text3};
    margin-bottom: 8px;
  }
  .section-title {
    font-size: 22px; font-weight: 700;
    letter-spacing: -0.02em; color: ${C.text};
    margin-bottom: 4px;
  }

  /* ── BUTTONS — matches site .btn / .btn-primary ── */
  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px; font-weight: 600;
    padding: 10px 20px;
    border-radius: ${C.radius};
    border: none; cursor: pointer;
    transition: all .2s;
    text-decoration: none;
  }
  .btn-primary {
    background: ${C.pri};
    color: #fff;
  }
  .btn-primary:hover {
    background: ${C.priD};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px hsla(24, 78%, 42%, 0.35);
  }
  .btn-ghost {
    background: transparent;
    color: ${C.text2};
    border: 1px solid ${C.border};
  }
  .btn-ghost:hover {
    border-color: ${C.borderS};
    background: ${C.surface2};
  }

  /* ── FORM ELEMENTS ── */
  .form-section {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: ${C.radiusLg};
    box-shadow: ${C.shadow};
    padding: 28px;
    margin-top: 24px;
  }
  .form-group { margin-bottom: 18px; }
  .form-label {
    display: block;
    font-size: 13px; font-weight: 600; color: ${C.text2};
    margin-bottom: 6px;
  }
  .inp {
    width: 100%;
    padding: 10px 14px;
    border-radius: ${C.radius};
    border: 1px solid ${C.border};
    background: ${C.surface2};
    font-family: Arial, Helvetica, sans-serif;
    font-size: 15px; color: ${C.text};
    transition: border-color .15s, box-shadow .15s;
    outline: none;
  }
  .inp:focus {
    border-color: ${C.pri};
    background: ${C.surface};
    box-shadow: 0 0 0 3px ${C.priT};
  }
  .inp::placeholder { color: ${C.text3}; }

  /* ── TABLE ── */
  .table-wrap {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: ${C.radiusLg};
    box-shadow: ${C.shadow};
    overflow: hidden;
    margin-top: 24px;
  }
  .table-header {
    padding: 16px 24px;
    border-bottom: 1px solid ${C.border};
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px;
  }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.07em; text-transform: uppercase;
    color: ${C.text3};
    padding: 12px 16px;
    border-bottom: 1px solid ${C.border};
    background: ${C.surface2};
  }
  td {
    padding: 14px 16px;
    font-size: 14px; color: ${C.text};
    border-bottom: 1px solid ${C.border};
    vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: ${C.surface2}; }

  /* ── BADGE ── */
  .badge {
    display: inline-flex; align-items: center;
    font-size: 12px; font-weight: 600;
    padding: 3px 9px; border-radius: 20px;
  }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-red   { background: #fee2e2; color: #991b1b; }
  .badge-pri   { background: ${C.priL}; color: ${C.priD}; }

  /* ── DIVIDER ── */
  .divider { height: 1px; background: ${C.border}; margin: 32px 0; }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(28,26,23,.45);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 500; padding: 24px;
  }
  .modal {
    background: ${C.surface};
    border-radius: ${C.radiusLg};
    box-shadow: 0 20px 60px rgba(0,0,0,.2);
    padding: 32px;
    width: 100%; max-width: 480px;
    border: 1px solid ${C.border};
  }
  .modal h2 {
    font-size: 20px; font-weight: 700;
    color: ${C.text}; margin-bottom: 6px;
  }
  .modal-sub {
    font-size: 14px; color: ${C.text2}; margin-bottom: 24px;
  }
  .modal-actions {
    display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;
  }

  /* ── FOOTER ── */
  footer {
    margin-top: 64px;
    padding: 24px 0;
    border-top: 1px solid ${C.border};
    text-align: center;
    font-size: 13px; color: ${C.text3};
  }
  footer a { color: ${C.pri}; }

  /* ── STATS ROW ── */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
    margin: 24px 0;
  }
  .stat-card {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: ${C.radius};
    padding: 18px 20px;
    box-shadow: ${C.shadow};
  }
  .stat-label {
    font-size: 12px; font-weight: 600;
    color: ${C.text3}; text-transform: uppercase;
    letter-spacing: 0.06em; margin-bottom: 6px;
  }
  .stat-value {
    font-size: 24px; font-weight: 700;
    color: ${C.text}; letter-spacing: -0.02em;
  }
  .stat-value em { color: ${C.pri}; font-style: normal; }
`;

// Sample data
const SAMPLE_EXPENSES = [
  { id: 1, description: "Tesco Weekly Shop",    category: "Groceries", amount: 87.43, date: "2025-03-10", status: "approved" },
  { id: 2, description: "Northern Rail Return", category: "Travel",    amount: 34.20, date: "2025-03-11", status: "pending"  },
  { id: 3, description: "Broadband Bill",        category: "Utilities", amount: 42.99, date: "2025-03-12", status: "approved" },
  { id: 4, description: "Greggs Meal Deal",      category: "Food",      amount: 4.75,  date: "2025-03-13", status: "pending"  },
];

function EmailModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSend() {
    if (!email) return;
    setSending(true);
    setTimeout(() => { setSending(false); setSent(true); }, 1200);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Send Expense Report</h2>
        <p className="modal-sub">We'll send a summary of all expenses to the address below.</p>
        <div className="form-group">
          <label className="form-label">Email address</label>
          <input
            className="inp"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        {sent && (
          <p style={{ fontSize: 14, color: C.pri, fontWeight: 600 }}>
            ✓ Report sent to {email}
          </p>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSend} disabled={sending || sent}>
            {sending ? "Sending…" : sent ? "Sent ✓" : "Send Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [search, setSearch]       = useState("");
  const [emailModal, setEmailModal] = useState(false);
  const [expenses]                 = useState(SAMPLE_EXPENSES);

  const filtered = expenses.filter(e =>
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const total    = expenses.reduce((s, e) => s + e.amount, 0);
  const approved = expenses.filter(e => e.status === "approved").reduce((s, e) => s + e.amount, 0);
  const pending  = expenses.filter(e => e.status === "pending").length;


  return (
    <>
      <style>{css}</style>

      {/* NAV */}
      <nav>
        <div className="nav-inner">
          <div className="nav-logo">
            <span>FunFair<em>Labs</em></span>
          </div>
          <span style={{ fontSize: 14, color: C.text3, fontWeight: 500 }}>Expenses</span>
          <div className="nav-spacer" />
          <button className="btn btn-primary" style={{ padding: "7px 15px", fontSize: 13 }} onClick={() => setEmailModal(true)}>
            Send Report ✉
          </button>
        </div>
      </nav>

      <div className="app">

        {/* HERO */}
        <div className="hero">
          <div className="hero-eyebrow">💸 Family Expense Tracker</div>
          <h1>Your <em>expenses</em>,<br />beautifully organised</h1>
          <p>Track receipts, manage budgets, and send reports — all in one place.</p>
          <div className="hero-actions">
            <button className="btn btn-primary">+ Add Expense</button>
            <button className="btn btn-ghost" onClick={() => setEmailModal(true)}>Send Report</button>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Spent</div>
            <div className="stat-value"><em>£{total.toFixed(2)}</em></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Approved</div>
            <div className="stat-value">£{approved.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Items</div>
            <div className="stat-value">{pending}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">This Month</div>
            <div className="stat-value">{expenses.length}</div>
          </div>
        </div>

        {/* EXPENSE TABLE */}
        <div className="table-wrap">
          <div className="table-header">
            <div>
              <div className="section-label">Expenses</div>
              <div className="section-title">Recent transactions</div>
            </div>
            <input
              className="inp"
              style={{ width: 220 }}
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: C.text3, padding: 32 }}>
                    No expenses found.
                  </td>
                </tr>
              )}
              {filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500 }}>{e.description}</td>
                  <td>
                    <span className="badge badge-pri">{e.category}</span>
                  </td>
                  <td style={{ color: C.text2 }}>{e.date}</td>
                  <td>
                    <span className={`badge ${e.status === "approved" ? "badge-green" : "badge-red"}`}>
                      {e.status === "approved" ? "✓ Approved" : "⏳ Pending"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    £{e.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divider" />

        {/* FEATURE CARDS — mirrors site product cards */}
        <div>
          <div className="section-label">Features</div>
          <div className="section-title">Everything you need</div>
          <div className="card-grid">
            {[
              { icon: "📸", title: "Receipt Capture",    desc: "Photograph receipts on the go and have them auto-categorised instantly." },
              { icon: "📊", title: "Spend Reports",      desc: "Export clean summaries by category, date range, or family member." },
              { icon: "✉️",  title: "Email Delivery",    desc: "Send polished expense reports directly to your inbox or accountant." },
              { icon: "🏷️", title: "Smart Categories",   desc: "AI-powered categorisation that learns your spending patterns over time." },
            ].map(f => (
              <div className="card" key={f.title}>
                <div className="card-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <footer>
          <p>© 2025 <a href="https://funfairlabs.com">FunFairLabs</a> — Software products for modern family life</p>
        </footer>
      </div>

      {emailModal && <EmailModal onClose={() => setEmailModal(false)} />}
    </>
  );
}
