import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "https://expenses-tracker-api.YOUR_SUBDOMAIN.workers.dev";

const C = {
  bg:     "#0C0C0C", surf:   "#161616", surf2:  "#1E1E1E", surf3:  "#232323",
  border: "#2A2A2A", text:   "#EDEBE6", muted:  "#6B6762",
  accent: "#C8A96E", green:  "#6DBF8A", red:    "#C06060", blue:   "#7EB8D4",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{min-height:100vh}
  body{background:${C.bg};color:${C.text};font-family:'Sora',sans-serif;font-size:14px}
  .app{min-height:100vh;display:flex;flex-direction:column}

  .header{background:${C.surf};border-bottom:1px solid ${C.border};padding:14px 28px;
    display:flex;align-items:center;gap:16px;position:sticky;top:0;z-index:50}
  .logo{font-family:'DM Serif Display',serif;font-size:18px;color:${C.accent}}
  .header-right{margin-left:auto;display:flex;align-items:center;gap:10px}
  .avatar{width:28px;height:28px;border-radius:50%;border:1px solid ${C.border}}

  .btn{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:3px;
    border:none;font-family:'Sora',sans-serif;font-size:12px;font-weight:500;cursor:pointer;
    transition:all 0.15s;letter-spacing:0.02em}
  .btn:disabled{opacity:.4;cursor:not-allowed}
  .btn-accent{background:${C.accent};color:#0C0C0C}
  .btn-accent:hover:not(:disabled){background:#D4B57A}
  .btn-ghost{background:transparent;color:${C.muted};border:1px solid ${C.border}}
  .btn-ghost:hover:not(:disabled){border-color:${C.accent};color:${C.accent}}
  .btn-danger{background:transparent;color:${C.red};border:1px solid transparent;padding:5px 9px;font-size:11px}
  .btn-danger:hover{border-color:${C.red}}
  .btn-sm{padding:6px 12px;font-size:11px}

  .main{flex:1;padding:28px;max-width:1100px;margin:0 auto;width:100%}
  .slbl{font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:${C.accent};font-weight:600;margin-bottom:10px}

  .login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;
    background-image:radial-gradient(ellipse at 25% 30%,rgba(200,169,110,.07) 0%,transparent 55%)}
  .login-card{background:${C.surf};border:1px solid ${C.border};border-radius:6px;padding:48px;width:400px;text-align:center}
  .login-title{font-family:'DM Serif Display',serif;font-size:28px;color:${C.accent};margin-bottom:8px}
  .login-sub{color:${C.muted};font-size:13px;line-height:1.6;margin-bottom:32px}
  .auth-btn{width:100%;padding:13px 18px;border-radius:4px;border:1px solid ${C.border};
    background:${C.surf2};color:${C.text};font-family:'Sora',sans-serif;font-size:13px;font-weight:500;
    cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;transition:all 0.15s;text-decoration:none}
  .auth-btn:hover{border-color:${C.accent};background:rgba(200,169,110,.06)}
  .auth-note{font-size:11px;color:${C.muted};margin-top:16px;line-height:1.6}

  .tabs{display:flex;margin-bottom:24px;border-bottom:1px solid ${C.border}}
  .tab{padding:10px 20px;font-size:12px;font-weight:500;cursor:pointer;
    border-bottom:2px solid transparent;margin-bottom:-1px;color:${C.muted};transition:all 0.15s}
  .tab.on{color:${C.accent};border-bottom-color:${C.accent}}
  .tab:hover:not(.on){color:${C.text}}
  .badge{display:inline-flex;align-items:center;justify-content:center;background:${C.accent};
    color:#0C0C0C;border-radius:10px;font-size:10px;font-weight:700;padding:1px 6px;margin-left:6px}

  .pending-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:16px}
  .pending-card{background:${C.surf};border:1px solid ${C.border};border-radius:5px;
    overflow:hidden;transition:border-color 0.15s;cursor:pointer}
  .pending-card:hover{border-color:rgba(200,169,110,.4)}
  .pending-thumb{width:100%;height:140px;object-fit:cover;background:${C.surf2};display:block}
  .pending-thumb-ph{width:100%;height:140px;background:${C.surf2};display:flex;align-items:center;
    justify-content:center;font-size:32px;opacity:.25}
  .pending-body{padding:12px 14px}
  .pending-merchant{font-weight:600;font-size:13px;margin-bottom:3px}
  .pending-meta{font-size:11px;color:${C.muted};line-height:1.7}
  .pending-amount{font-size:16px;font-weight:600;color:${C.accent};margin-top:8px}

  .trip-section{margin-bottom:32px}
  .trip-hd{display:flex;align-items:center;gap:10px;padding-bottom:10px;
    border-bottom:1px solid ${C.border};margin-bottom:10px}
  .trip-title{font-family:'DM Serif Display',serif;font-size:18px}
  .trip-year-tag{font-size:12px;color:${C.muted};background:${C.surf2};
    border:1px solid ${C.border};border-radius:3px;padding:2px 8px}
  .trip-total{margin-left:auto;font-size:12px;color:${C.muted}}
  .trip-total strong{color:${C.accent};font-size:15px}
  .col-hd{display:grid;grid-template-columns:44px 1fr 110px 100px 80px 80px 44px;
    gap:10px;padding:0 12px;font-size:10px;text-transform:uppercase;
    letter-spacing:.1em;color:${C.muted};margin-bottom:6px}
  .exp-row{display:grid;grid-template-columns:44px 1fr 110px 100px 80px 80px 44px;
    gap:10px;padding:10px 12px;background:${C.surf2};border:1px solid ${C.border};
    border-radius:4px;align-items:center;margin-bottom:6px;cursor:pointer;transition:border-color 0.15s}
  .exp-row:hover{border-color:rgba(200,169,110,.3)}
  .thumb{width:40px;height:32px;object-fit:cover;border-radius:3px;border:1px solid ${C.border}}
  .thumb-ph{width:40px;height:32px;background:${C.surf};border:1px solid ${C.border};
    border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:13px;opacity:.35}

  .tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;
    font-size:10px;font-weight:600;letter-spacing:.04em;white-space:nowrap}
  .tg{background:rgba(109,191,138,.12);color:${C.green};border:1px solid rgba(109,191,138,.2)}
  .tb{background:rgba(126,184,212,.12);color:${C.blue};border:1px solid rgba(126,184,212,.2)}
  .ta{background:rgba(200,169,110,.12);color:${C.accent};border:1px solid rgba(200,169,110,.2)}
  .tr{background:rgba(192,96,96,.1);color:${C.red};border:1px solid rgba(192,96,96,.18)}
  .tn{background:rgba(120,120,120,.08);color:${C.muted};border:1px solid ${C.border}}

  .field{margin-bottom:13px}
  .lbl{display:block;font-size:10px;color:${C.muted};text-transform:uppercase;
    letter-spacing:.1em;margin-bottom:5px;font-weight:600}
  .inp{width:100%;background:${C.surf2};border:1px solid ${C.border};border-radius:3px;
    padding:9px 11px;color:${C.text};font-family:'Sora',sans-serif;font-size:13px;
    outline:none;transition:border-color 0.15s}
  .inp:focus{border-color:${C.accent}}
  select.inp{cursor:pointer}
  textarea.inp{resize:vertical;min-height:60px;line-height:1.5}
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px}
  hr.dv{border:none;border-top:1px solid ${C.border};margin:18px 0}

  .overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;
    display:flex;align-items:flex-start;justify-content:center;
    padding:24px 16px 60px;backdrop-filter:blur(6px);overflow-y:auto}
  .modal{background:${C.surf};border:1px solid ${C.border};border-radius:6px;
    padding:28px 32px;width:100%;max-width:760px}
  .modal-title{font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:4px}
  .modal-sub{font-size:12px;color:${C.muted};margin-bottom:20px}
  .preview-img{width:100%;max-height:200px;object-fit:contain;border-radius:4px;
    border:1px solid ${C.border};margin-bottom:18px;background:${C.surf2};display:block}
  .modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:22px}

  .choice-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:10px 0}
  .choice{padding:11px 8px;border-radius:4px;border:1px solid ${C.border};background:${C.surf2};
    color:${C.text};font-family:'Sora',sans-serif;font-size:12px;font-weight:500;
    cursor:pointer;text-align:center;transition:all 0.15s}
  .choice:hover{border-color:${C.accent}}
  .choice.on{border-color:${C.accent};background:rgba(200,169,110,.09);color:${C.accent}}

  .dtable{width:100%;border-collapse:collapse;font-size:12px}
  .dtable th{text-align:left;padding:5px 8px;font-size:10px;color:${C.muted};
    text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid ${C.border}}
  .dtable td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.04);vertical-align:middle}
  .dtable tr:last-child td{border-bottom:none}
  .dtable .amt{text-align:right;color:${C.accent};font-weight:600}

  .summary{background:${C.surf};border:1px solid ${C.border};border-radius:4px;
    padding:14px 22px;display:flex;gap:28px;margin-bottom:24px;align-items:center;flex-wrap:wrap}
  .stat .v{font-family:'DM Serif Display',serif;font-size:22px;color:${C.accent};display:block}
  .stat .l{font-size:10px;color:${C.muted};text-transform:uppercase;letter-spacing:.08em}

  .spinner{width:14px;height:14px;border:2px solid rgba(200,169,110,.3);
    border-top-color:${C.accent};border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
  @keyframes spin{to{transform:rotate(360deg)}}
  .empty{text-align:center;padding:52px 20px;color:${C.muted}}
  .empty-ico{font-size:40px;opacity:.25;margin-bottom:14px}
  .toast{position:fixed;top:66px;right:22px;background:${C.surf};border:1px solid ${C.border};
    border-left:3px solid ${C.accent};padding:10px 16px;border-radius:4px;font-size:12px;
    z-index:400;animation:slideIn .2s ease;max-width:280px}
  @keyframes slideIn{from{transform:translateX(14px);opacity:0}to{transform:translateX(0);opacity:1}}
  .sync-dot{width:6px;height:6px;border-radius:50%;background:${C.green};flex-shrink:0}
  .sync-dot.busy{background:${C.accent};animation:pulse .9s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  .path-preview{font-size:11px;color:${C.muted};margin-top:-8px;margin-bottom:14px;
    padding:6px 10px;background:${C.surf3};border-radius:3px;border:1px solid ${C.border}}
  .path-preview span{color:${C.text}}
  .ai-flag{font-size:10px;color:${C.muted};background:${C.surf3};border:1px solid ${C.border};
    border-radius:3px;padding:2px 7px;display:inline-flex;align-items:center;gap:4px;margin-bottom:16px}
  .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:16px}
  .drow{padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)}
  .dkey{font-size:10px;color:${C.muted};text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px}
  .dval{font-size:13px}
`;

const fmt = (n, cur = "GBP") => {
  if (n === "" || n == null) return "—";
  const s = { GBP:"£",USD:"$",EUR:"€",HKD:"HK$",SGD:"S$",AUD:"A$",JPY:"¥",CHF:"CHF ",AED:"AED ",THB:"฿" };
  return `${s[cur]||cur+" "}${parseFloat(n).toFixed(2)}`;
};
const fmtDate = d => {
  try { return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
  catch { return d||"—"; }
};
const payIcon = m => {
  if (!m) return "💳";
  const l = m.toLowerCase();
  if (l.includes("cash")) return "💵";
  if (l.includes("wechat")||l.includes("alipay")) return "📱";
  return "💳";
};

const CATS  = ["meals","transport","accommodation","entertainment","supplies","telecoms","other"];
const CURS  = ["GBP","EUR","USD","HKD","SGD","AUD","JPY","CHF","AED","THB"];

export default function App() {
  const [user,       setUser]       = useState(undefined);
  const [pending,    setPending]    = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [tab,        setTab]        = useState("pending");
  const [triage,     setTriage]     = useState(null);
  const [detail,     setDetail]     = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [emailTo,    setEmailTo]    = useState("");
  const [sending,    setSending]    = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const pollRef = useRef();

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials:"include" })
      .then(r=>r.json()).then(d=>{ if(d.error) setUser(null); else setUser(d); })
      .catch(()=>setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/api/subscribe`, { method:"POST", credentials:"include" }).catch(()=>{});
    loadData();
    pollRef.current = setInterval(loadPending, 30000);
    return () => clearInterval(pollRef.current);
  }, [user]);

  const loadPending = async () => {
    try {
      const r = await fetch(`${API}/api/pending`, { credentials:"include" });
      const d = await r.json();
      if (Array.isArray(d)) setPending(d.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)));
    } catch {}
  };

  const loadData = async () => {
    await loadPending();
    try {
      const r = await fetch(`${API}/api/expenses`, { credentials:"include" });
      const d = await r.json();
      if (Array.isArray(d)) setExpenses(d);
    } catch {}
  };

  const toast$ = msg => { setToast(msg); setTimeout(()=>setToast(null), 3500); };

  // ── Triage form ───────────────────────────────────────────────────────────

  const blankForm = r => {
    const ex = r?.extracted || {};
    return {
      tripName:"", year:String(new Date().getFullYear()),
      merchant:        ex.merchant         || r?.merchant         || "",
      date:            ex.date             || r?.date             || "",
      time:            ex.time             || r?.time             || "",
      amount:          ex.total_amount     || r?.amount           || "",
      currency:        ex.currency         || r?.currency         || "GBP",
      category:        ex.category         || r?.category         || "other",
      merchant_address:ex.merchant_address || "",
      merchant_phone:  ex.merchant_phone   || ex.merchant_website || "",
      customer_name:   ex.customer_name    || "",
      customer_address:ex.customer_address || "",
      nationality:     ex.nationality      || "",
      room_number:     ex.room_number      || "",
      check_in:        ex.check_in         || "",
      check_out:       ex.check_out        || "",
      payment_method:  ex.payment_method   || "",
      card_last4:      ex.card_last4       || "",
      subtotal:        ex.subtotal         || "",
      tip:             ex.tip              || "",
      discount:        ex.discount         || "",
      taxes:           ex.taxes            || [],
      items:           ex.items            || [],
      receipt_number:  ex.receipt_number   || "",
      order_number:    ex.order_number     || "",
      notes:           ex.notes            || "",
      personal:"none", personalPct:50,
    };
  };

  const [form, setForm] = useState({});
  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const openTriage = r => { setTriage(r); setForm(blankForm(r)); };

  const submitTriage = async () => {
    if (!form.tripName.trim()) { toast$("Please enter a trip name"); return; }
    setSyncing(true);
    try {
      const r = await fetch(`${API}/api/assign`, {
        method:"POST", credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ fileId:triage.id, ...form, extracted:triage.extracted }),
      });
      const d = await r.json();
      if (d.ok) {
        setPending(p=>p.filter(x=>x.id!==triage.id));
        setExpenses(p=>[...p, d.expense]);
        setTriage(null);
        toast$(`✓ Filed → ${form.year}/${form.tripName}`);
        setTab("expenses");
      } else toast$(d.error||"Something went wrong");
    } catch { toast$("Network error"); }
    finally { setSyncing(false); }
  };

  const sendEmail = async () => {
    if (!emailTo.trim()) { toast$("Enter a recipient email"); return; }
    setSending(true);
    try {
      const r = await fetch(`${API}/api/email-trip`, {
        method:"POST", credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ toEmail:emailTo.trim(), ...emailModal }),
      });
      const d = await r.json();
      if (d.ok) { toast$(`✉️ Sent to ${emailTo}`); setEmailModal(null); setEmailTo(""); }
      else toast$(d.message||"Send failed");
    } catch { toast$("Network error"); }
    finally { setSending(false); }
  };

  const exportCSV = () => {
    if (!expenses.length) { toast$("No expenses yet"); return; }
    const hdr = ["Filename","Year","Trip","Date","Time","Merchant","Merchant Address",
      "Merchant Phone","Category","Customer Name","Customer Address","Nationality",
      "Room/Ref","Check-in","Check-out","Payment Method","Card Last 4",
      "Receipt No.","Order No.","Subtotal","Taxes Total","Tip","Discount",
      "Total Amount","Currency","Personal %","Work Amount","Drive Link","Notes"];
    const rows = [hdr];
    expenses.forEach(e => {
      const amt      = parseFloat(e.amount)||0;
      const taxTotal = (e.taxes||[]).reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
      const work     = +(amt*(100-(e.personalPct||0))/100).toFixed(2);
      rows.push([
        e.filename, e.year, e.tripName, e.date, e.time||"", e.merchant,
        e.merchant_address||"", e.merchant_phone||"", e.category||"",
        e.customer_name||"", e.customer_address||"", e.nationality||"",
        e.room_number||"", e.check_in||"", e.check_out||"",
        e.payment_method||"", e.card_last4||"",
        e.receipt_number||"", e.order_number||"",
        e.subtotal||"", taxTotal.toFixed(2), e.tip||"", e.discount||"",
        amt, e.currency||"GBP", e.personalPct||0, work,
        e.driveLink||"", e.notes||"",
      ]);
    });
    const csv  = rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `expenses_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast$("CSV exported");
  };

  const grouped = {};
  expenses.forEach(e => {
    const k = `${e.year||""}__${e.tripName||"Unassigned"}`;
    if (!grouped[k]) grouped[k] = { year:e.year, name:e.tripName||"Unassigned", items:[] };
    grouped[k].items.push(e);
  });
  const totalWork = expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0)*(100-(e.personalPct||0))/100, 0);

  // ── Auth screens ──────────────────────────────────────────────────────────

  if (user === undefined) return (
    <><style>{css}</style>
    <div className="login-wrap"><div style={{color:C.muted}}>Loading…</div></div></>
  );

  if (!user) return (
    <><style>{css}</style>
    <div className="login-wrap">
      <div className="login-card">
        <div style={{fontSize:38,marginBottom:18}}>🧾</div>
        <div className="login-title">Expense Tracker</div>
        <div className="login-sub">Scan with your phone → Drive → AI extracts everything<br/>Triage, file by trip, email to accounts</div>
        <a className="auth-btn" href={`${API}/auth/google`}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>
        <div className="auth-note">Needs Drive (move receipts) and Gmail (send expenses).<br/>Drop receipts into <strong>/receipts/Pending</strong> on your phone.</div>
      </div>
    </div></>
  );

  // ── Main ──────────────────────────────────────────────────────────────────

  return (
    <><style>{css}</style>
    <div className="app">

      <div className="header">
        <div className="logo">Expense Tracker</div>
        <div className="header-right">
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.muted}}>
            <div className={`sync-dot${syncing?" busy":""}`}/>
            {syncing?"Syncing…":"Live"}
          </div>
          <img className="avatar" src={user.avatar} alt=""/>
          <span style={{fontSize:12,color:C.muted}}>{user.name}</span>
          <a href={`${API}/auth/logout`} className="btn btn-ghost btn-sm">Sign out</a>
          <button className="btn btn-accent btn-sm" onClick={exportCSV}>↓ CSV</button>
        </div>
      </div>

      <div className="main">
        {expenses.length > 0 && (
          <div className="summary">
            <div className="stat"><span className="v">{expenses.length}</span><span className="l">Receipts</span></div>
            <div className="stat"><span className="v">{Object.keys(grouped).length}</span><span className="l">Trips</span></div>
            <div className="stat"><span className="v">£{totalWork.toFixed(2)}</span><span className="l">Work Total</span></div>
            <button className="btn btn-accent" style={{marginLeft:"auto"}} onClick={exportCSV}>↓ Export CSV</button>
          </div>
        )}

        <div className="tabs">
          <div className={`tab${tab==="pending"?" on":""}`} onClick={()=>setTab("pending")}>
            📥 Inbox{pending.length>0&&<span className="badge">{pending.length}</span>}
          </div>
          <div className={`tab${tab==="expenses"?" on":""}`} onClick={()=>setTab("expenses")}>
            📋 Expenses ({expenses.length})
          </div>
        </div>

        {/* ── Inbox ── */}
        {tab==="pending" && (
          pending.length===0
            ? <div className="empty">
                <div className="empty-ico">📥</div>
                <div style={{fontWeight:500,marginBottom:8}}>Nothing to triage</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>
                  Save a receipt to <strong style={{color:C.text}}>Google Drive → receipts → Pending</strong><br/>
                  It'll appear here within seconds.
                </div>
              </div>
            : <div className="pending-grid">
                {pending.map(r => {
                  const ex = r.extracted||{};
                  const taxNames = (ex.taxes||[]).map(t=>t.name).filter(Boolean).join(", ");
                  return (
                    <div className="pending-card" key={r.id} onClick={()=>openTriage(r)}>
                      <img className="pending-thumb"
                        src={`https://drive.google.com/thumbnail?id=${r.driveFileId}&sz=w400`} alt="receipt"
                        onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex"}}/>
                      <div className="pending-thumb-ph" style={{display:"none"}}>🧾</div>
                      <div className="pending-body">
                        <div className="pending-merchant">{r.merchant||r.driveName||"Receipt"}</div>
                        <div className="pending-meta">
                          {r.merchant_address&&<div style={{fontSize:10,marginBottom:2}}>{r.merchant_address}</div>}
                          {r.date?fmtDate(r.date):"Date unknown"}{r.time?` · ${r.time}`:""}
                          {r.category?` · ${r.category}`:""}
                          {r.payment_method&&<div style={{marginTop:2}}>{payIcon(r.payment_method)} {r.payment_method}{r.card_last4?` ···${r.card_last4}`:""}</div>}
                          {taxNames&&<div style={{marginTop:2}}>🏷 {taxNames}</div>}
                          {r.customer_name&&<div style={{marginTop:2}}>👤 {r.customer_name}</div>}
                        </div>
                        {r.amount&&<div className="pending-amount">{fmt(r.amount,r.currency)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
        )}

        {/* ── Expenses ── */}
        {tab==="expenses" && (
          expenses.length===0
            ? <div className="empty"><div className="empty-ico">📋</div><div>No filed expenses yet.</div></div>
            : Object.entries(grouped).map(([k,g]) => {
                const gWork = g.items.reduce((s,e)=>s+(parseFloat(e.amount)||0)*(100-(e.personalPct||0))/100, 0);
                return (
                  <div className="trip-section" key={k}>
                    <div className="trip-hd">
                      <span className="trip-year-tag">{g.year}</span>
                      <span className="trip-title">✈️ {g.name}</span>
                      <div className="trip-total"><strong>{fmt(gWork)}</strong> work</div>
                      <button className="btn btn-ghost btn-sm" style={{marginLeft:8}}
                        onClick={()=>setEmailModal({tripName:g.name,year:g.year,expenses:g.items})}>
                        ✉️ Email
                      </button>
                    </div>
                    <div className="col-hd">
                      <span>File</span><span>Merchant</span><span>Date</span>
                      <span>Payment</span><span>Taxes</span><span>Total</span><span></span>
                    </div>
                    {g.items.map(e => (
                      <div className="exp-row" key={e.id} onClick={()=>setDetail(e)}>
                        {e.driveLink
                          ? <a href={e.driveLink} target="_blank" rel="noreferrer"
                              onClick={ev=>ev.stopPropagation()} style={{display:"flex"}}>
                              <img className="thumb"
                                src={`https://drive.google.com/thumbnail?id=${e.driveFileId}&sz=w80`} alt=""
                                onError={ev=>{ev.target.style.display="none";ev.target.nextSibling.style.display="flex"}}/>
                              <div className="thumb-ph" style={{display:"none"}}>🧾</div>
                            </a>
                          : <div className="thumb-ph">🧾</div>
                        }
                        <div>
                          <div style={{fontWeight:500}}>{e.merchant||"—"}</div>
                          <div style={{fontSize:11,color:C.muted,marginTop:2}}>{e.category}</div>
                        </div>
                        <div style={{color:C.muted,fontSize:12}}>{fmtDate(e.date)}</div>
                        <div style={{fontSize:11}}>
                          {e.payment_method
                            ? `${payIcon(e.payment_method)} ${e.payment_method}${e.card_last4?` ···${e.card_last4}`:""}`
                            : <span style={{color:C.muted}}>—</span>}
                        </div>
                        <div>
                          {e.taxes?.length
                            ? <span className="tag tg" title={e.taxes.map(t=>t.name).join(", ")}>
                                {e.taxes.length>1?`${e.taxes.length} taxes`:e.taxes[0].name}
                              </span>
                            : <span className="tag tn">None</span>}
                        </div>
                        <div style={{fontWeight:600}}>{fmt(e.amount,e.currency)}</div>
                        <div onClick={ev=>ev.stopPropagation()}>
                          <button className="btn btn-danger"
                            onClick={()=>setExpenses(p=>p.filter(x=>x.id!==e.id))}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
        )}
      </div>

      {/* ── Triage Modal ── */}
      {triage && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setTriage(null)}>
          <div className="modal">
            <div className="modal-title">File Receipt</div>
            <div className="modal-sub">Review AI-extracted details, correct anything wrong, then assign to a trip.</div>

            <img className="preview-img"
              src={`https://drive.google.com/thumbnail?id=${triage.driveFileId}&sz=w700`} alt="receipt"/>

            <div className="ai-flag">🤖 AI-extracted · please verify all fields before filing</div>

            {/* Trip */}
            <div className="slbl">Trip</div>
            <div className="g2" style={{marginBottom:8}}>
              <div className="field">
                <label className="lbl">Trip name *</label>
                <input className="inp" placeholder="e.g. Cisco Office Visit Q1"
                  value={form.tripName} onChange={e=>f("tripName",e.target.value)} autoFocus/>
              </div>
              <div className="field">
                <label className="lbl">Year</label>
                <input className="inp" value={form.year} onChange={e=>f("year",e.target.value)}/>
              </div>
            </div>
            <div className="path-preview">
              📁 receipts / <span>{form.year||"…"}</span> / <span>{form.tripName||"…"}</span>
            </div>

            <hr className="dv"/>

            {/* Merchant */}
            <div className="slbl">Merchant</div>
            <div className="g2">
              <div className="field">
                <label className="lbl">Business name</label>
                <input className="inp" value={form.merchant} onChange={e=>f("merchant",e.target.value)}/>
              </div>
              <div className="field">
                <label className="lbl">Category</label>
                <select className="inp" value={form.category} onChange={e=>f("category",e.target.value)}>
                  {CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="lbl">Business address</label>
              <input className="inp" value={form.merchant_address} onChange={e=>f("merchant_address",e.target.value)} placeholder="If shown"/>
            </div>
            <div className="field">
              <label className="lbl">Phone / website</label>
              <input className="inp" value={form.merchant_phone} onChange={e=>f("merchant_phone",e.target.value)} placeholder="If shown"/>
            </div>

            <hr className="dv"/>

            {/* Customer */}
            <div className="slbl">Customer Details</div>
            <div className="g3">
              <div className="field">
                <label className="lbl">Customer name</label>
                <input className="inp" value={form.customer_name} onChange={e=>f("customer_name",e.target.value)} placeholder="If shown"/>
              </div>
              <div className="field">
                <label className="lbl">Nationality</label>
                <input className="inp" value={form.nationality} onChange={e=>f("nationality",e.target.value)} placeholder="e.g. British"/>
              </div>
              <div className="field">
                <label className="lbl">Room / folio no.</label>
                <input className="inp" value={form.room_number} onChange={e=>f("room_number",e.target.value)} placeholder="Hotel room etc."/>
              </div>
            </div>
            <div className="field">
              <label className="lbl">Customer address</label>
              <input className="inp" value={form.customer_address} onChange={e=>f("customer_address",e.target.value)} placeholder="If shown on receipt"/>
            </div>
            {(form.check_in||form.check_out) && (
              <div className="g2">
                <div className="field">
                  <label className="lbl">Check-in</label>
                  <input className="inp" type="date" value={form.check_in} onChange={e=>f("check_in",e.target.value)}/>
                </div>
                <div className="field">
                  <label className="lbl">Check-out</label>
                  <input className="inp" type="date" value={form.check_out} onChange={e=>f("check_out",e.target.value)}/>
                </div>
              </div>
            )}

            <hr className="dv"/>

            {/* Transaction */}
            <div className="slbl">Transaction</div>
            <div className="g4">
              <div className="field">
                <label className="lbl">Date</label>
                <input className="inp" type="date" value={form.date} onChange={e=>f("date",e.target.value)}/>
              </div>
              <div className="field">
                <label className="lbl">Time</label>
                <input className="inp" type="time" value={form.time} onChange={e=>f("time",e.target.value)}/>
              </div>
              <div className="field">
                <label className="lbl">Receipt no.</label>
                <input className="inp" value={form.receipt_number} onChange={e=>f("receipt_number",e.target.value)} placeholder="Optional"/>
              </div>
              <div className="field">
                <label className="lbl">Order no.</label>
                <input className="inp" value={form.order_number} onChange={e=>f("order_number",e.target.value)} placeholder="Optional"/>
              </div>
            </div>

            <hr className="dv"/>

            {/* Payment */}
            <div className="slbl">Payment</div>
            <div className="g3">
              <div className="field">
                <label className="lbl">Method</label>
                <input className="inp" value={form.payment_method} onChange={e=>f("payment_method",e.target.value)} placeholder="e.g. Visa, Cash, Amex"/>
              </div>
              <div className="field">
                <label className="lbl">Card last 4</label>
                <input className="inp" value={form.card_last4} onChange={e=>f("card_last4",e.target.value)} placeholder="1234" maxLength={4}/>
              </div>
              <div className="field">
                <label className="lbl">Currency</label>
                <select className="inp" value={form.currency} onChange={e=>f("currency",e.target.value)}>
                  {CURS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <hr className="dv"/>

            {/* Amounts */}
            <div className="slbl">Amounts</div>
            <div className="g4">
              <div className="field">
                <label className="lbl">Subtotal</label>
                <input className="inp" type="number" step="0.01" value={form.subtotal} onChange={e=>f("subtotal",e.target.value)} placeholder="0.00"/>
              </div>
              <div className="field">
                <label className="lbl">Tip / gratuity</label>
                <input className="inp" type="number" step="0.01" value={form.tip} onChange={e=>f("tip",e.target.value)} placeholder="0.00"/>
              </div>
              <div className="field">
                <label className="lbl">Discount</label>
                <input className="inp" type="number" step="0.01" value={form.discount} onChange={e=>f("discount",e.target.value)} placeholder="0.00"/>
              </div>
              <div className="field">
                <label className="lbl">Total *</label>
                <input className="inp" type="number" step="0.01" value={form.amount} onChange={e=>f("amount",e.target.value)} placeholder="0.00"/>
              </div>
            </div>

            {/* Taxes */}
            <div className="slbl">Taxes</div>
            {form.taxes?.length>0 && (
              <table className="dtable" style={{marginBottom:10}}>
                <thead><tr><th>Tax name</th><th>Rate</th><th style={{textAlign:"right"}}>Amount</th><th></th></tr></thead>
                <tbody>
                  {form.taxes.map((t,i)=>(
                    <tr key={i}>
                      <td><input className="inp" style={{padding:"5px 8px",fontSize:12}}
                        value={t.name} placeholder="e.g. VAT, City Tax, GST"
                        onChange={e=>{const tx=[...form.taxes];tx[i]={...t,name:e.target.value};f("taxes",tx)}}/></td>
                      <td><input className="inp" style={{padding:"5px 8px",fontSize:12}}
                        value={t.rate} placeholder="e.g. 20%"
                        onChange={e=>{const tx=[...form.taxes];tx[i]={...t,rate:e.target.value};f("taxes",tx)}}/></td>
                      <td><input className="inp" style={{padding:"5px 8px",fontSize:12,textAlign:"right"}}
                        type="number" step="0.01" value={t.amount}
                        onChange={e=>{const tx=[...form.taxes];tx[i]={...t,amount:e.target.value};f("taxes",tx)}}/></td>
                      <td><button className="btn btn-danger"
                        onClick={()=>f("taxes",form.taxes.filter((_,j)=>j!==i))}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="btn btn-ghost btn-sm" style={{marginBottom:16}}
              onClick={()=>f("taxes",[...(form.taxes||[]),{name:"",rate:"",amount:""}])}>
              + Add tax line
            </button>

            {/* Items */}
            {form.items?.length>0 && (
              <>
                <hr className="dv"/>
                <div className="slbl">Items Purchased</div>
                <table className="dtable" style={{marginBottom:14}}>
                  <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th style={{textAlign:"right"}}>Total</th></tr></thead>
                  <tbody>
                    {form.items.map((it,i)=>(
                      <tr key={i}>
                        <td style={{color:C.text}}>{it.name}</td>
                        <td style={{color:C.muted}}>{it.qty||"1"}</td>
                        <td style={{color:C.muted}}>{it.unit_price?fmt(it.unit_price,form.currency):"—"}</td>
                        <td className="amt">{it.total?fmt(it.total,form.currency):"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Notes */}
            {(form.notes) && (
              <>
                <hr className="dv"/>
                <div className="field">
                  <label className="lbl">Notes from receipt</label>
                  <textarea className="inp" value={form.notes} onChange={e=>f("notes",e.target.value)}/>
                </div>
              </>
            )}

            <hr className="dv"/>

            {/* Personal split */}
            <div className="slbl">Personal Expense?</div>
            <div className="choice-row">
              {[["none","💼","Fully Work"],["partial","⚖️","Part Personal"],["full","🙋","Fully Personal"]].map(([v,ico,lbl])=>(
                <button key={v} className={`choice${form.personal===v?" on":""}`} onClick={()=>f("personal",v)}>
                  <div>{ico}</div><div style={{marginTop:5}}>{lbl}</div>
                </button>
              ))}
            </div>
            {form.personal==="partial" && (
              <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
                <span style={{fontSize:12,color:C.muted}}>Personal portion:</span>
                <input className="inp" type="number" min="1" max="99" value={form.personalPct}
                  onChange={e=>f("personalPct",Math.min(99,Math.max(1,+e.target.value||0)))} style={{width:68}}/>
                <span style={{fontSize:12,color:C.muted}}>% — Work: {100-form.personalPct}%</span>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setTriage(null)}>Cancel</button>
              <button className="btn btn-accent" onClick={submitTriage} disabled={syncing}>
                {syncing?<><span className="spinner"/>Filing…</>:"File Receipt →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail View ── */}
      {detail && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setDetail(null)}>
          <div className="modal">
            <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:20}}>
              {detail.driveLink && (
                <a href={detail.driveLink} target="_blank" rel="noreferrer">
                  <img src={`https://drive.google.com/thumbnail?id=${detail.driveFileId}&sz=w200`}
                    style={{width:90,height:72,objectFit:"cover",borderRadius:4,border:`1px solid ${C.border}`}} alt=""/>
                </a>
              )}
              <div style={{flex:1}}>
                <div className="modal-title">{detail.merchant||"Receipt"}</div>
                <div style={{color:C.muted,fontSize:12,lineHeight:1.6}}>
                  {detail.merchant_address&&<div>{detail.merchant_address}</div>}
                  {fmtDate(detail.date)}{detail.time?` · ${detail.time}`:""}
                  {detail.driveLink&&<a href={detail.driveLink} target="_blank" rel="noreferrer"
                    style={{marginLeft:10,color:C.accent,fontSize:11}}>Open in Drive →</a>}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setDetail(null)}>✕</button>
            </div>

            <div className="detail-grid" style={{marginBottom:18}}>
              {[
                ["Category",    detail.category],
                ["Trip",        `${detail.year} / ${detail.tripName}`],
                ["Payment",     detail.payment_method?`${payIcon(detail.payment_method)} ${detail.payment_method}${detail.card_last4?` ···${detail.card_last4}`:""}`:null],
                ["Receipt no.", detail.receipt_number],
                ["Order no.",   detail.order_number],
                ["Customer",    detail.customer_name],
                ["Address",     detail.customer_address],
                ["Nationality", detail.nationality],
                ["Room / folio",detail.room_number],
                ["Check-in",    detail.check_in?fmtDate(detail.check_in):null],
                ["Check-out",   detail.check_out?fmtDate(detail.check_out):null],
              ].filter(([,v])=>v).map(([k,v])=>(
                <div className="drow" key={k}>
                  <div className="dkey">{k}</div>
                  <div className="dval">{v}</div>
                </div>
              ))}
            </div>

            {detail.items?.length>0 && (
              <>
                <div className="slbl">Items Purchased</div>
                <table className="dtable" style={{marginBottom:18}}>
                  <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th style={{textAlign:"right"}}>Total</th></tr></thead>
                  <tbody>
                    {detail.items.map((it,i)=>(
                      <tr key={i}>
                        <td style={{color:C.text}}>{it.name}</td>
                        <td style={{color:C.muted}}>{it.qty||"1"}</td>
                        <td style={{color:C.muted}}>{it.unit_price?fmt(it.unit_price,detail.currency):"—"}</td>
                        <td className="amt">{it.total?fmt(it.total,detail.currency):"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="slbl">Amounts</div>
            <table className="dtable" style={{marginBottom:18}}>
              <tbody>
                {detail.subtotal&&<tr><td style={{color:C.muted}}>Subtotal</td><td className="amt">{fmt(detail.subtotal,detail.currency)}</td></tr>}
                {(detail.taxes||[]).map((t,i)=>(
                  <tr key={i}>
                    <td style={{color:C.muted}}>{t.name}{t.rate?` (${t.rate})`:""}</td>
                    <td className="amt">{fmt(t.amount,detail.currency)}</td>
                  </tr>
                ))}
                {detail.tip&&<tr><td style={{color:C.muted}}>Tip / Gratuity</td><td className="amt">{fmt(detail.tip,detail.currency)}</td></tr>}
                {detail.discount&&<tr><td style={{color:C.muted}}>Discount</td><td style={{textAlign:"right",color:C.green}}>−{fmt(detail.discount,detail.currency)}</td></tr>}
                <tr>
                  <td style={{fontWeight:600,color:C.text,paddingTop:10}}>Total</td>
                  <td style={{textAlign:"right",fontWeight:700,fontSize:15,paddingTop:10}}>{fmt(detail.amount,detail.currency)}</td>
                </tr>
                {detail.personalPct>0&&(
                  <tr>
                    <td style={{color:C.muted}}>Work portion ({100-detail.personalPct}%)</td>
                    <td style={{textAlign:"right",color:C.green}}>{fmt((parseFloat(detail.amount)||0)*(100-detail.personalPct)/100,detail.currency)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {detail.notes&&(
              <>
                <div className="slbl">Notes</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{detail.notes}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Email Modal ── */}
      {emailModal && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setEmailModal(null)}>
          <div className="modal" style={{maxWidth:460}}>
            <div className="modal-title">✉️ Email Trip</div>
            <div className="modal-sub">Sends from your Google account — CSV + all {emailModal.expenses.length} receipts attached.</div>
            <div className="field">
              <label className="lbl">Send to</label>
              <input className="inp" type="email" placeholder="expenses@company.com"
                value={emailTo} onChange={e=>setEmailTo(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!sending&&sendEmail()} autoFocus/>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setEmailModal(null)}>Cancel</button>
              <button className="btn btn-accent" onClick={sendEmail} disabled={sending||!emailTo.trim()}>
                {sending?<><span className="spinner"/>Sending…</>:"Send ✉️"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast&&<div className="toast">{toast}</div>}
    </div>
    </>
  );
}
