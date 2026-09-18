import {useEffect,useState} from 'react';
import type {FormEvent,ReactNode} from 'react';

const monthStart=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10)};
const money=(n:number)=>new Intl.NumberFormat('bn-BD',{style:'currency',currency:'BDT',maximumFractionDigits:0}).format(Number(n||0));
import {supabase} from './lib/supabase';

export default function App(){
 const [session,setSession]=useState<any>(null);
 const [profile,setProfile]=useState<any>(null);
 const [loading,setLoading]=useState(true);
 const [page,setPage]=useState('dashboard');

 useEffect(()=>{
  supabase.auth.getSession().then(async ({data})=>{
   setSession(data.session);
   if(data.session) await loadProfile(data.session.user.id);
   setLoading(false);
  });
  const sub=supabase.auth.onAuthStateChange((_event,next)=>{
   setSession(next);
   if(!next) setProfile(null);
  });
  return ()=>sub.data.subscription.unsubscribe();
 },[]);

 async function loadProfile(id:string){
  const {data}=await supabase.from('profiles').select('*').eq('id',id).single();
  setProfile(data);
 }

 if(loading) return <div className="loading">লোড হচ্ছে…</div>;
 if(!session || !profile) return <Login/>;

 async function logout(){ await supabase.auth.signOut(); }

 if(profile.role==='customer'){
  return <CustomerPortal profile={profile} logout={logout}/>;
 }

 return (
  <div className="app-shell">
   <aside className="sidebar">
    <div className="side-brand"><div className="logo">আরকি</div><div><b>আরকি নেটওয়ার্ক</b><span>Billing System</span></div></div>
    <nav>
     <button className={page==='dashboard'?'nav active':'nav'} onClick={()=>setPage('dashboard')}>ড্যাশবোর্ড</button>
     <button className={page==='customers'?'nav active':'nav'} onClick={()=>setPage('customers')}>গ্রাহক</button>
     <button className={page==='bills'?'nav active':'nav'} onClick={()=>setPage('bills')}>মাসিক বিল</button>
     <button className={page==='reports'?'nav active':'nav'} onClick={()=>setPage('reports')}>রিপোর্ট</button>
     <button className={page==='employees'?'nav active':'nav'} onClick={()=>setPage('employees')}>কর্মচারী</button>
     <button className={page==='audit'?'nav active':'nav'} onClick={()=>setPage('audit')}>অডিট লগ</button>
     <button className={page==='settings'?'nav active':'nav'} onClick={()=>setPage('settings')}>সেটিংস</button>
    </nav>
    <button className="nav" onClick={logout}>↪ লগআউট</button>
   </aside>
   <main className="main">
    <header className="topbar"><div><span className="eyebrow">মাসিক বিল ব্যবস্থাপনা</span><h2>আরকি নেটওয়ার্ক</h2></div><span className="role-pill">{profile.role}</span></header>
    {page==='dashboard' && <Dashboard/>}
    {page==='customers' && <Customers/>}
    {page==='bills' && <Bills/>}
    {page==='reports' && <Reports/>}
    {page==='employees' && <Employees/>}
    {page==='audit' && <AuditLogs/>}
    {page==='settings' && <Settings/>}
   </main>
  </div>
 );
}

function Login(){
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [error,setError]=useState('');
 async function submit(e:FormEvent){
  e.preventDefault();
  setError('');
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error) setError(error.message);
 }
 return <div className="login-page"><div className="login-card"><div className="brand-mark">আরকি</div><h1>আরকি নেটওয়ার্ক</h1><p>মাসিক বিল ম্যানেজমেন্ট সিস্টেম</p><form onSubmit={submit}><label>ইমেইল<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>পাসওয়ার্ড<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error && <div className="error">{error}</div>}<button className="primary full">লগইন</button></form></div></div>;
}

function Dashboard(){
 const [customers,setCustomers]=useState(0);
 const [due,setDue]=useState(0);
 useEffect(()=>{(async()=>{
  const c=await supabase.from('customers').select('id',{count:'exact',head:true});
  const b=await supabase.from('bills').select('due_amount').eq('billing_month',monthStart());
  setCustomers(c.count||0);
  setDue((b.data||[]).reduce((sum,row)=>sum+Number(row.due_amount),0));
 })()},[]);
 return <section className="content"><div className="hero-strip"><div><span>এই মাস</span><h1>{monthStart()}</h1><p>বিল ও আদায়ের সারাংশ</p></div></div><div className="stats-grid"><Stat title="মোট গ্রাহক" value={String(customers)} icon="◉"/><Stat title="মোট বকেয়া" value={money(due)} icon="!"/></div></section>;
}

function Customers(){
 const [rows,setRows]=useState<any[]>([]);
 const [open,setOpen]=useState(false);
 const [name,setName]=useState('');
 const [phone,setPhone]=useState('');
 const [amount,setAmount]=useState('150');
 async function load(){const {data}=await supabase.from('customers').select('*').order('created_at',{ascending:false});setRows(data||[]);}
 useEffect(()=>{load()},[]);
 async function save(){const {error}=await supabase.from('customers').insert({name,phone,monthly_amount:Number(amount)||150,status:'active',customer_code:'CUST-'+Date.now().toString().slice(-6)});if(!error){setName('');setPhone('');setAmount('150');setOpen(false);load();}}
 return <section className="content"><div className="toolbar"><button className="primary" onClick={()=>setOpen(true)}>＋ নতুন গ্রাহক</button></div><div className="panel table-wrap"><table><thead><tr><th>গ্রাহক</th><th>ফোন</th><th>মাসিক বিল</th><th>স্ট্যাটাস</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.name}<span>{row.customer_code}</span></td><td>{row.phone}</td><td>{money(row.monthly_amount)}</td><td>{row.status}</td></tr>)}</tbody></table></div>{open && <Modal title="নতুন গ্রাহক" close={()=>setOpen(false)}><label>নাম<input value={name} onChange={e=>setName(e.target.value)}/></label><label>মোবাইল<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>মাসিক বিল<input type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></label><button className="primary" onClick={save}>সংরক্ষণ</button></Modal>}</section>;
}

function Bills(){
 const [month,setMonth]=useState(monthStart());
 const [rows,setRows]=useState<any[]>([]);
 const [pay,setPay]=useState<any>(null);
 async function load(){const {data}=await supabase.from('bills').select('*,customers(name,customer_code)').eq('billing_month',month).order('created_at',{ascending:false});setRows(data||[]);}
 useEffect(()=>{load()},[month]);
 async function generate(){await supabase.rpc('generate_monthly_bills',{p_month:month});load();}
 async function collect(amount:number){if(!pay)return;await supabase.rpc('record_payment',{p_bill_id:pay.id,p_amount:amount,p_method:'cash',p_notes:null});setPay(null);load();}
 return <section className="content"><div className="toolbar"><input type="month" value={month.slice(0,7)} onChange={e=>setMonth(e.target.value+'-01')}/><button className="primary" onClick={generate}>Generate Bills</button></div><div className="panel table-wrap"><table><thead><tr><th>গ্রাহক</th><th>বিল</th><th>পরিশোধ</th><th>বকেয়া</th><th></th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.customers?.name}<span>{row.customers?.customer_code}</span></td><td>{money(row.amount_due)}</td><td>{money(row.amount_paid)}</td><td>{money(row.due_amount)}</td><td>{Number(row.due_amount)>0 && <button className="small-primary" onClick={()=>setPay(row)}>পেমেন্ট</button>}</td></tr>)}</tbody></table></div>{pay && <Payment bill={pay} close={()=>setPay(null)} save={collect}/>}</section>;
}

function Payment({bill,close,save}:{bill:any;close:()=>void;save:(amount:number)=>void}){
 const [amount,setAmount]=useState(String(bill.due_amount));
 return <Modal title="পেমেন্ট গ্রহণ" close={close}><p>বকেয়া: {money(bill.due_amount)}</p><label>পরিমাণ<input type="number" value={amount} max={bill.due_amount} onChange={e=>setAmount(e.target.value)}/></label><button className="primary" onClick={()=>save(Number(amount))}>সংরক্ষণ</button></Modal>;
}

function Reports(){return <section className="content"><div className="panel"><h3>মাসিক রিপোর্ট</h3><p>বিল ও পেমেন্টের রিপোর্ট এখানে দেখা যাবে।</p></div></section>;}
function Employees(){return <section className="content"><div className="panel"><h3>কর্মচারী</h3><p>Employee permission management backend প্রস্তুত আছে।</p></div></section>;}
function AuditLogs(){const [rows,setRows]=useState<any[]>([]);useEffect(()=>{supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(100).then(r=>setRows(r.data||[]))},[]);return <section className="content"><div className="panel table-wrap"><h3>অডিট লগ</h3><table><thead><tr><th>সময়</th><th>Action</th><th>Entity</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString('bn-BD')}</td><td>{r.action}</td><td>{r.entity_type}</td></tr>)}</tbody></table></div></section>;}
function Settings(){const [amount,setAmount]=useState('150');useEffect(()=>{supabase.from('settings').select('monthly_bill').eq('id',1).single().then(r=>setAmount(String(r.data?.monthly_bill||150)))},[]);async function save(){await supabase.from('settings').update({monthly_bill:Number(amount)}).eq('id',1)}return <section className="content"><div className="panel settings"><h3>Business Settings</h3><label>Default Monthly Bill<input type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></label><button className="primary" onClick={save}>সংরক্ষণ</button></div></section>;}
function CustomerPortal({profile,logout}:{profile:any;logout:()=>void}){const [customer,setCustomer]=useState<any>(null);const [bills,setBills]=useState<any[]>([]);useEffect(()=>{(async()=>{const c=await supabase.from('customers').select('*').eq('user_id',profile.id).maybeSingle();setCustomer(c.data);if(c.data){const b=await supabase.from('bills').select('*').eq('customer_id',c.data.id).order('billing_month',{ascending:false});setBills(b.data||[])}})()},[profile.id]);return <div className="portal"><header className="portal-head"><div><b>আরকি নেটওয়ার্ক</b><span>Customer Portal</span></div><button onClick={logout}>লগআউট</button></header><main><h1>{customer?.name||profile.full_name}</h1><p>Customer ID: {customer?.customer_code||'—'}</p><div className="stats-grid"><Stat title="মাসিক বিল" value={money(customer?.monthly_amount||0)} icon="৳"/><Stat title="মোট বিল" value={String(bills.length)} icon="▤"/></div><div className="panel"><h3>Bill History</h3>{bills.map(b=><div className="list-row" key={b.id}><span>{b.billing_month}</span><strong>{money(b.amount_due)} / Due {money(b.due_amount)}</strong></div>)}</div></main></div>;}
function Modal({title,close,children}:{title:string;close:()=>void;children:ReactNode}){return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h3>{title}</h3><button onClick={close}>×</button></div>{children}</div></div>;}
function Stat({title,value,icon}:{title:string;value:string;icon:string}){return <div className="stat"><div className="stat-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong></div></div>;}
