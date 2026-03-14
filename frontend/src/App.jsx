import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://expenses-tracker-api.YOUR_SUBDOMAIN.workers.dev";

// Theme Constants aligned with index.html
const C = {
  bg:     "#fdfcfb", // Warm background from index.html
  surf:   "#ffffff",
  surf2:  "#f8f6f2", 
  border: "#e2ddd4", 
  text:   "#1a1916", 
  muted:  "#8c8880",
  accent: "#f97316", // Brand Orange from index.html
  green:  "#16a34a", 
  red:    "#dc2626", 
  text2:  "#4a4740",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
  
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  
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
    max-width: 800px;
    margin: 0 auto;
    padding: 60px 20px;
  }

  /* Matching the brand typography from index.html */
  h1 {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 42px;
    letter-spacing: -0.03em;
    margin-bottom: 12px;
    color: ${C.text};
    text-align: center;
  }

  header p {
    text-align: center;
    color: ${C.muted};
    font-weight: 500;
    margin-bottom: 40px;
  }

  .card {
    background: ${C.surf};
    border: 1px solid ${C.border};
    border-radius: 24px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.04);
    padding: 32px;
  }

  .btn {
    appearance: none;
    border: none;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    border-radius: 12px;
    padding: 12px 24px;
    transition: all 0.2s ease;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .btn-accent {
    background: ${C.accent};
    color: white;
  }

  .btn-accent:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
  }

  .btn-ghost {
    background: transparent;
    color: ${C.muted};
    border: 1px solid ${C.border};
  }

  .inp {
    width: 100%;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid ${C.border};
    background: ${C.surf2};
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    transition: all 0.2s;
  }

  .inp:focus {
    outline: none;
    border-color: ${C.accent};
    background: white;
  }
`;

export default function App() {
  const [emailModal, setEmailModal] = useState(false);

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <header>
          <h1>Expenses</h1>
          <p>Manage your family trip receipts</p>
        </header>

        <main className="card">
          <div style={{marginBottom: 24}}>
            <label style={{display:'block', fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', marginBottom: 8}}>
              Quick Search
            </label>
            <input className="inp" placeholder="Search expenses..." />
          </div>
          
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <button className="btn btn-ghost">View History</button>
            <button className="btn btn-accent" onClick={() => setEmailModal(true)}>
              Send Report ✉️
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
