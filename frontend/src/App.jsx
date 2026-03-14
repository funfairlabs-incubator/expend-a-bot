import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://expenses-tracker-api.YOUR_SUBDOMAIN.workers.dev";

// Theme Constants aligned with index.html branding
const C = {
  bg:     "#fdfcfb", // Warm background from landing page
  surf:   "#ffffff",
  surf2:  "#f8f6f2", // Warm secondary surface
  surf3:  "#f0ede6",
  border: "#e2ddd4", 
  text:   "#1a1916", 
  muted:  "#8c8880",
  accent: "#f97316", // FunFairLabs Orange
  green:  "#16a34a", 
  red:    "#dc2626", 
  blue:   "#2563eb",
  text2:  "#4a4740",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  
  html,body,#root{min-height:100vh}
  
  body {
    background: ${C.bg};
    color: ${C.text};
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    -webkit-font-smoothing: antialiased;
    line-height: 1.5;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  /* Headlines / Titles use Syne for brand consistency */
  h1, h2, .modal-title {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${C.text};
  }

  /* Buttons */
  .btn {
    appearance: none;
    border: none;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    border-radius: 12px;
    padding: 10px 20px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .btn-accent {
    background: ${C.accent};
    color: white;
  }

  .btn-accent:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
  }

  .btn-ghost {
    background: transparent;
    color: ${C.muted};
    border: 1px solid ${C.border};
  }

  .btn-ghost:hover {
    background: ${C.surf2};
    color: ${C.text};
    border-color: ${C.muted};
  }

  /* Containers & Modals */
  .modal, .card {
    background: ${C.surf};
    border: 1px solid ${C.border};
    border-radius: 24px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.04);
    padding: 32px;
  }

  .overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(26, 25, 22, 0.4);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  /* Inputs & Forms */
  .field { margin-bottom: 24px; }
  .lbl { 
    display: block; 
    font-size: 12px; 
    font-weight: 600; 
    text-transform: uppercase; 
    letter-spacing: 0.05em; 
    margin-bottom: 8px; 
    color: ${C.muted};
  }
  
  .inp {
    width: 100%;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid ${C.border};
    background: ${C.surf2};
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    transition: all 0.2s ease;
  }

  .inp:focus {
    outline: none;
    border-color: ${C.accent};
    background: ${C.surf};
    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
  }

  /* Toast & Utilities */
  .toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: ${C.text};
    color: white;
    padding: 12px 24px;
    border-radius: 99px;
    font-weight: 500;
    z-index: 2000;
    box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export default function App() {
  const [emailModal, setEmailModal] = useState(null);
  const [emailTo, setEmailTo] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [detail, setDetail] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const sendEmail = async () => {
    if (!emailTo || sending) return;
    setSending(true);
    try {
      // Mock API call logic
      await new Promise(r => setTimeout(r, 1500));
      showToast("Email sent successfully! ✉️");
      setEmailModal(null);
    } catch (e) {
      showToast("Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
    <style>{css}</style>
    <div className="app">
      <header style={{marginBottom: 40, textAlign: 'center'}}>
        <h1>Expenses</h1>
        <p style={{color: C.muted}}>Manage your family trip receipts</p>
      </header>

      <main className="card">
        <div className="field">
          <label className="lbl">Quick Search</label>
          <input className="inp" placeholder="Search expenses..." />
        </div>
        
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <button className="btn btn-ghost" onClick={() => setDetail({id: 1, notes: "Sample notes for testing."})}>
            View Latest Detail
          </button>
          <button className="btn btn-accent" onClick={() => setEmailModal({expenses: [1,2,3]})}>
            Send Report ✉️
          </button>
        </div>
      </main>

      {/* ── Detail Modal ── */}
      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <div className="modal" style={{maxWidth: 500}} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Expense Detail</div>
            <div style={{marginTop: 16}}>
              <div className="lbl">Notes</div>
              <p style={{color: C.text2}}>{detail.notes}</p>
            </div>
            <div style={{marginTop: 24, textAlign: 'right'}}>
              <button className="btn btn-ghost" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Email Modal ── */}
      {emailModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setEmailModal(null)}>
          <div className="modal" style={{maxWidth: 460}} onClick={e => e.stopPropagation()}>
            <div className="modal-title">✉️ Email Trip</div>
            <p style={{fontSize: 14, color: C.muted, margin: '8px 0 24px'}}>
              Sends from your Google account — CSV + all {emailModal.expenses.length} receipts attached.
            </p>
            <div className="field">
              <label className="lbl">Send to</label>
              <input className="inp" type="email" placeholder="expenses@company.com"
                value={emailTo} onChange={e => setEmailTo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !sending && sendEmail()} autoFocus/>
            </div>
            <div style={{display:'flex', gap: 12, justifyContent: 'flex-end'}}>
              <button className="btn btn-ghost" onClick={() => setEmailModal(null)}>Cancel</button>
              <button className="btn btn-accent" onClick={sendEmail} disabled={sending || !emailTo.trim()}>
                {sending ? <><span className="spinner"/>Sending…</> : "Send ✉️"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
    </>
  );
}
