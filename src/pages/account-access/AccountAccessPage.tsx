import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CalendarPlus, CircleDollarSign, Eye, EyeOff, Loader2, Pencil, Plus, Search, ShieldCheck, Trash2, UserMinus, UserPlus, Users, X } from "lucide-react";
import axios from "axios";

import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AccountSummary = {
  id: string; service_name: string; login_identifier: string; max_capacity: number;
  status: "active" | "expired" | "suspended"; notes?: string | null;
  renewal_start_date?: string | null; renewal_end_date?: string | null;
  renewal_cost?: number | string | null; profile_count: number; occupied_count: number;
  paid_count: number; free_count: number; internal_count: number;
  monthly_revenue: number | string; account_profit: number | string;
};
type Profile = {
  id: string; profile_name: string; is_active: boolean; assignment_id?: string | null;
  client_id?: string | null; client_name?: string | null;
  assignment_type?: "paid" | "free" | "internal" | null;
  revenue_amount?: number | string | null; start_date?: string | null;
  end_date?: string | null; assignment_status?: string | null;
};
type Renewal = { id: string; start_date: string; end_date: string; cost: number | string; payment_method: string; expense_id?: string | null };
type AssignmentHistory = { id: string; profile_name: string; client_name?: string | null; assignment_type: "paid" | "free" | "internal"; revenue_amount: number | string; start_date: string; end_date?: string | null; status: string };
type AccountDetail = { account: AccountSummary; profiles: Profile[]; renewals: Renewal[]; assignment_history: AssignmentHistory[] };
type Client = { id: string; name: string; phone?: string | null; email?: string | null };

const today = () => new Date().toISOString().slice(0, 10);
function addOneMonth(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const targetYear = month === 12 ? year + 1 : year;
  const targetMonth = month === 12 ? 1 : month + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}
const money = (value: number | string | null | undefined) => `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
function dateLabel(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}
function errorMessage(error: unknown, fallback: string) {
  return axios.isAxiosError(error) ? error.response?.data?.message || fallback : fallback;
}

function AccountAccessPage() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"account" | "renewal" | "profile" | "assignment" | null>(null);
  const [editingAccount, setEditingAccount] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [credentials, setCredentials] = useState<{ password: string | null; profile_pins: Record<string, string | null> } | null>(null);
  const [accountForm, setAccountForm] = useState({ service_name: "Netflix", login_identifier: "", password: "", max_capacity: "5", status: "active", notes: "" });
  const [renewalForm, setRenewalForm] = useState(() => ({ start_date: today(), end_date: addOneMonth(today()), cost: "0", payment_method: "orange_money", notes: "" }));
  const [profileForm, setProfileForm] = useState({ profile_name: "", pin: "" });
  const [assignmentForm, setAssignmentForm] = useState(() => ({ client_id: "", assignment_type: "paid", revenue_amount: "0", start_date: today(), end_date: addOneMonth(today()), notes: "" }));

  const loadAccounts = useCallback(async () => {
    const response = await api.get<AccountSummary[]>("/account-access");
    setAccounts(response.data);
    setSelectedId((current) => current || response.data[0]?.id || null);
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetailLoading(true);
      const response = await api.get<AccountDetail>(`/account-access/${id}`);
      setDetail(response.data); setCredentials(null);
    } catch (requestError) { setError(errorMessage(requestError, "Impossible de charger ce compte.")); }
    finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { void (async () => {
    try {
      setLoading(true); setError("");
      const [, clientResponse] = await Promise.all([loadAccounts(), api.get<Client[]>("/clients")]);
      setClients(Array.isArray(clientResponse.data) ? clientResponse.data : []);
    } catch (requestError) { setError(errorMessage(requestError, "Impossible de charger les accès.")); }
    finally { setLoading(false); }
  })(); }, [loadAccounts]);
  useEffect(() => {
    if (!selectedId) return;
    void Promise.resolve().then(() => loadDetail(selectedId));
  }, [loadDetail, selectedId]);

  const filteredAccounts = useMemo(() => {
    const value = search.trim().toLowerCase();
    return value ? accounts.filter((a) => `${a.service_name} ${a.login_identifier}`.toLowerCase().includes(value)) : accounts;
  }, [accounts, search]);
  const refresh = useCallback(async () => { await loadAccounts(); if (selectedId) await loadDetail(selectedId); }, [loadAccounts, loadDetail, selectedId]);

  function openCreateAccount() {
    setEditingAccount(false);
    setAccountForm({ service_name: "Netflix", login_identifier: "", password: "", max_capacity: "5", status: "active", notes: "" });
    setModal("account");
  }
  function openEditAccount() {
    if (!detail) return;
    setEditingAccount(true);
    setAccountForm({ service_name: detail.account.service_name, login_identifier: detail.account.login_identifier, password: "", max_capacity: String(detail.account.max_capacity), status: detail.account.status, notes: detail.account.notes || "" });
    setModal("account");
  }
  async function submitAccount(event: FormEvent) {
    event.preventDefault();
    try {
      setSaving(true); setError("");
      const payload = { ...accountForm, max_capacity: Number(accountForm.max_capacity) };
      if (editingAccount && selectedId) await api.put(`/account-access/${selectedId}`, payload);
      else { const response = await api.post<{ account: AccountSummary }>("/account-access", payload); setSelectedId(response.data.account.id); }
      setModal(null); await refresh();
    } catch (requestError) { setError(errorMessage(requestError, "Impossible d’enregistrer le compte.")); }
    finally { setSaving(false); }
  }
  async function submitRenewal(event: FormEvent) {
    event.preventDefault(); if (!selectedId) return;
    try { setSaving(true); await api.post(`/account-access/${selectedId}/renewals`, { ...renewalForm, cost: Number(renewalForm.cost) }); setModal(null); await refresh(); }
    catch (requestError) { setError(errorMessage(requestError, "Impossible de renouveler le compte.")); }
    finally { setSaving(false); }
  }
  async function submitProfile(event: FormEvent) {
    event.preventDefault(); if (!selectedId) return;
    try {
      setSaving(true);
      if (editingProfile) await api.put(`/account-access/profiles/${editingProfile.id}`, profileForm);
      else await api.post(`/account-access/${selectedId}/profiles`, profileForm);
      setModal(null); setEditingProfile(null); await refresh();
    }
    catch (requestError) { setError(errorMessage(requestError, "Impossible d’ajouter le profil.")); }
    finally { setSaving(false); }
  }
  function openCreateProfile() {
    setEditingProfile(null);
    setProfileForm({ profile_name: "", pin: "" });
    setModal("profile");
  }
  function openEditProfile(profile: Profile) {
    setEditingProfile(profile);
    setProfileForm({ profile_name: profile.profile_name, pin: "" });
    setModal("profile");
  }
  async function deleteProfile(profile: Profile) {
    if (!window.confirm(`Supprimer le profil « ${profile.profile_name} » ?`)) return;
    try { await api.delete(`/account-access/profiles/${profile.id}`); await refresh(); }
    catch (requestError) { setError(errorMessage(requestError, "Impossible de supprimer ce profil.")); }
  }
  async function submitAssignment(event: FormEvent) {
    event.preventDefault(); if (!targetProfile) return;
    if (assignmentForm.assignment_type !== "internal" && !assignmentForm.client_id) {
      setError("Sélectionnez le client dans la liste de recherche.");
      return;
    }
    try {
      setSaving(true);
      await api.post(`/account-access/profiles/${targetProfile.id}/assignments`, { ...assignmentForm, client_id: assignmentForm.assignment_type === "internal" ? null : assignmentForm.client_id, revenue_amount: assignmentForm.assignment_type === "paid" ? Number(assignmentForm.revenue_amount) : 0 });
      setModal(null); setTargetProfile(null); await refresh();
    } catch (requestError) { setError(errorMessage(requestError, "Impossible de rattacher le client.")); }
    finally { setSaving(false); }
  }
  async function reveal() {
    if (!selectedId) return;
    try { if (credentials) return setCredentials(null); const response = await api.post(`/account-access/${selectedId}/reveal`); setCredentials(response.data); }
    catch (requestError) { setError(errorMessage(requestError, "Accès réservé à l’administrateur.")); }
  }
  async function release(profile: Profile) {
    if (!profile.assignment_id || !window.confirm(`Libérer le profil « ${profile.profile_name} » ?`)) return;
    try { await api.put(`/account-access/assignments/${profile.assignment_id}/end`, { end_date: today() }); await refresh(); }
    catch (requestError) { setError(errorMessage(requestError, "Impossible de libérer le profil.")); }
  }
  async function archiveAccount() {
    if (!selectedId || !detail || !window.confirm(`Supprimer le compte ${detail.account.service_name} ?`)) return;
    try { await api.delete(`/account-access/${selectedId}`); setSelectedId(null); setDetail(null); await loadAccounts(); }
    catch (requestError) { setError(errorMessage(requestError, "Impossible de supprimer ce compte.")); }
  }
  function openAssignment(profile: Profile) {
    setTargetProfile(profile);
    setAssignmentForm({ client_id: "", assignment_type: "paid", revenue_amount: "0", start_date: today(), end_date: addOneMonth(today()), notes: "" });
    setModal("assignment");
  }

  if (loading) return <div className="flex min-h-[400px] items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin" />Chargement des accès…</div>;
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="relative p-6 md:p-8"><div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-blue-50" /><div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"><ShieldCheck size={14} />Accès sécurisés</div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Accès aux comptes</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Renouvelez les comptes, gérez leur capacité et rattachez manuellement les clients aux profils.</p></div><Button onClick={openCreateAccount} className="gap-2 bg-blue-600 hover:bg-blue-700"><Plus size={17} />Ajouter un compte</Button></div></div></section>
    {error && <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError("")}><X size={17} /></button></div>}
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="h-fit border-slate-200 shadow-sm"><CardHeader className="space-y-4"><CardTitle>Comptes ({accounts.length})</CardTitle><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Service ou identifiant…" className="field pl-10" /></div></CardHeader><CardContent className="space-y-2">
        {filteredAccounts.length === 0 && <Empty text="Aucun compte enregistré." />}
        {filteredAccounts.map((account) => { const full = Number(account.occupied_count) >= Number(account.max_capacity); return <button key={account.id} onClick={() => setSelectedId(account.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === account.id ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"}`}><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-slate-900">{account.service_name}</p><p className="mt-1 truncate text-xs text-slate-500">{account.login_identifier}</p></div><Status status={account.status} /></div><div className="mt-3 flex justify-between text-xs"><span className={full ? "font-semibold text-red-600" : "text-slate-600"}>{account.occupied_count}/{account.max_capacity} occupés</span><span className="font-medium text-emerald-700">{money(account.monthly_revenue)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={full ? "h-full bg-red-500" : "h-full bg-blue-500"} style={{width:`${Math.min(100, Number(account.occupied_count)/Number(account.max_capacity)*100)}%`}} /></div></button>; })}
      </CardContent></Card>
      <div className="min-w-0 space-y-6">
        {detailLoading && <Card><CardContent className="flex min-h-72 items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin" />Chargement…</CardContent></Card>}
        {!detailLoading && !detail && <Card><CardContent className="py-20"><Empty text="Sélectionnez ou ajoutez un compte." /></CardContent></Card>}
        {!detailLoading && detail && <>
          <Card className="border-slate-200 shadow-sm"><CardContent className="p-6"><div className="flex flex-col justify-between gap-5 md:flex-row"><div><div className="flex items-center gap-3"><h2 className="text-2xl font-bold">{detail.account.service_name}</h2><Status status={detail.account.status} /></div><p className="mt-1 text-sm text-slate-500">{detail.account.login_identifier}</p><p className="mt-2 text-sm">Mot de passe : <span className="font-mono">{credentials?.password || "••••••••"}</span></p></div><div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><Button variant="outline" onClick={reveal} className="gap-2">{credentials ? <EyeOff size={16}/> : <Eye size={16}/>} {credentials ? "Masquer" : "Révéler"}</Button><Button variant="outline" onClick={openEditAccount} className="gap-2"><Pencil size={16}/>Modifier</Button><Button variant="outline" onClick={archiveAccount} className="col-span-2 gap-2 text-red-600 sm:col-span-1"><Trash2 size={16}/>Supprimer</Button></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Occupation" value={`${detail.profiles.filter((p)=>p.assignment_id).length}/${detail.account.max_capacity}`} icon={<Users size={18}/>} /><Metric label="Revenu mensuel" value={money(detail.account.monthly_revenue)} icon={<CircleDollarSign size={18}/>} /><Metric label="Coût du compte" value={money(detail.account.renewal_cost)} icon={<CalendarPlus size={18}/>} /><Metric label="Bénéfice" value={money(detail.account.account_profit)} icon={<CircleDollarSign size={18}/>} /></div></CardContent></Card>
          <Card className="border-slate-200 shadow-sm"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Renouvellement mensuel</CardTitle><Button onClick={() => { const start=detail.account.renewal_end_date?.slice(0,10)||today(); setRenewalForm({start_date:start,end_date:addOneMonth(start),cost:String(detail.account.renewal_cost||0),payment_method:"orange_money",notes:""}); setModal("renewal"); }} className="gap-2 bg-blue-600 hover:bg-blue-700"><CalendarPlus size={16}/>Renouveler</Button></div></CardHeader><CardContent>{detail.renewals.length===0?<Empty text="Aucun renouvellement enregistré."/>:<div className="grid gap-3 md:grid-cols-2">{detail.renewals.slice(0,6).map((r)=><div key={r.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><p className="font-medium">{dateLabel(r.start_date)} → {dateLabel(r.end_date)}</p><p className="mt-1 text-xs text-slate-500">Dépense {r.expense_id?"créée":"non créée"}</p></div><strong>{money(r.cost)}</strong></div></div>)}</div>}</CardContent></Card>
          <Card className="border-slate-200 shadow-sm"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Profils et rattachements</CardTitle><p className="mt-1 text-sm text-slate-500">Le rattachement reste toujours manuel.</p></div><Button variant="outline" onClick={openCreateProfile} disabled={detail.profiles.filter((p)=>p.is_active).length>=detail.account.max_capacity} className="gap-2"><Plus size={16}/>Ajouter un profil</Button></div></CardHeader><CardContent>{detail.profiles.length===0?<Empty text="Ajoutez les profils disponibles sur ce compte."/>:<div className="grid gap-4 md:grid-cols-2">{detail.profiles.filter((p)=>p.is_active).map((p)=><div key={p.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{p.profile_name}</p><p className="mt-1 text-xs text-slate-500">PIN : <span className="font-mono">{credentials?.profile_pins?.[p.id]||"••••"}</span></p></div><div className="flex items-center gap-1"><button type="button" onClick={()=>openEditProfile(p)} aria-label={`Modifier ${p.profile_name}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Pencil size={16}/></button><button type="button" onClick={()=>deleteProfile(p)} aria-label={`Supprimer ${p.profile_name}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16}/></button></div></div><div className="mt-3">{p.assignment_id?<TypeBadge type={p.assignment_type||"paid"}/>:<span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Disponible</span>}</div>{p.assignment_id?<div className="mt-4 space-y-2 text-sm"><p><span className="text-slate-500">Client :</span> <strong>{p.client_name||"Usage interne"}</strong></p><p><span className="text-slate-500">Période :</span> {dateLabel(p.start_date)} → {dateLabel(p.end_date)}</p><p><span className="text-slate-500">Revenu :</span> {money(p.revenue_amount)}</p><Button variant="outline" onClick={()=>release(p)} className="mt-2 w-full gap-2 text-red-600"><UserMinus size={16}/>Libérer</Button></div>:<Button onClick={()=>openAssignment(p)} className="mt-4 w-full gap-2 bg-blue-600 hover:bg-blue-700"><UserPlus size={16}/>Rattacher un client</Button>}</div>)}</div>}</CardContent></Card>
          {detail.assignment_history.length>0&&<Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Historique des affectations</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="py-3">Profil</th><th>Client</th><th>Type</th><th>Période</th><th className="text-right">Revenu</th></tr></thead><tbody>{detail.assignment_history.map((e)=><tr key={e.id} className="border-b border-slate-100"><td className="py-3 font-medium">{e.profile_name}</td><td>{e.client_name||"Usage interne"}</td><td><TypeBadge type={e.assignment_type}/></td><td>{dateLabel(e.start_date)} → {dateLabel(e.end_date)}</td><td className="text-right font-medium">{money(e.revenue_amount)}</td></tr>)}</tbody></table></div></CardContent></Card>}
        </>}
      </div>
    </div>
    {modal==="account"&&<Modal title={editingAccount?"Modifier le compte":"Ajouter un compte"} onClose={()=>setModal(null)}><form onSubmit={submitAccount} className="space-y-4"><Field label="Service"><input required value={accountForm.service_name} onChange={(e)=>setAccountForm({...accountForm,service_name:e.target.value})} className="field"/></Field><Field label="E-mail ou identifiant"><input required value={accountForm.login_identifier} onChange={(e)=>setAccountForm({...accountForm,login_identifier:e.target.value})} className="field"/></Field><Field label={editingAccount?"Nouveau mot de passe (vide = conserver)":"Mot de passe (facultatif)"}><input type="password" value={accountForm.password} onChange={(e)=>setAccountForm({...accountForm,password:e.target.value})} className="field"/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Capacité maximale"><input type="number" min="1" required value={accountForm.max_capacity} onChange={(e)=>setAccountForm({...accountForm,max_capacity:e.target.value})} className="field"/></Field><Field label="Statut"><select value={accountForm.status} onChange={(e)=>setAccountForm({...accountForm,status:e.target.value})} className="field"><option value="active">Actif</option><option value="expired">Expiré</option><option value="suspended">Suspendu</option></select></Field></div><Field label="Notes"><textarea value={accountForm.notes} onChange={(e)=>setAccountForm({...accountForm,notes:e.target.value})} className="field min-h-20"/></Field><Submit saving={saving}/></form></Modal>}
    {modal==="renewal"&&<Modal title="Renouveler le compte" onClose={()=>setModal(null)}><form onSubmit={submitRenewal} className="space-y-4"><div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">Le coût sera ajouté aux dépenses « Abonnement compte ».</div><div className="grid gap-4 sm:grid-cols-2"><Field label="Début"><input type="date" required value={renewalForm.start_date} onChange={(e)=>setRenewalForm({...renewalForm,start_date:e.target.value,end_date:addOneMonth(e.target.value)})} className="field"/></Field><Field label="Fin"><input type="date" required value={renewalForm.end_date} onChange={(e)=>setRenewalForm({...renewalForm,end_date:e.target.value})} className="field"/></Field></div><Field label="Coût"><input type="number" min="0" required value={renewalForm.cost} onChange={(e)=>setRenewalForm({...renewalForm,cost:e.target.value})} className="field"/></Field><Field label="Paiement"><select value={renewalForm.payment_method} onChange={(e)=>setRenewalForm({...renewalForm,payment_method:e.target.value})} className="field"><option value="orange_money">Orange Money</option><option value="mobile_money">Mobile Money</option><option value="cash">Espèces</option><option value="bank_transfer">Virement</option></select></Field><Field label="Notes"><textarea value={renewalForm.notes} onChange={(e)=>setRenewalForm({...renewalForm,notes:e.target.value})} className="field min-h-20"/></Field><Submit saving={saving}/></form></Modal>}
    {modal==="profile"&&<Modal title={editingProfile?"Modifier le profil":"Ajouter un profil"} onClose={()=>{setModal(null);setEditingProfile(null);}}><form onSubmit={submitProfile} className="space-y-4"><Field label="Nom du profil"><input required value={profileForm.profile_name} onChange={(e)=>setProfileForm({...profileForm,profile_name:e.target.value})} placeholder="Profil 1" className="field"/></Field><Field label={editingProfile?"Nouveau PIN (vide = conserver)":"PIN (facultatif)"}><input type="password" value={profileForm.pin} onChange={(e)=>setProfileForm({...profileForm,pin:e.target.value})} className="field"/></Field><Submit saving={saving}/></form></Modal>}
    {modal==="assignment"&&targetProfile&&<Modal title={`Rattacher — ${targetProfile.profile_name}`} onClose={()=>setModal(null)}><form onSubmit={submitAssignment} className="space-y-4"><Field label="Type"><select value={assignmentForm.assignment_type} onChange={(e)=>setAssignmentForm({...assignmentForm,assignment_type:e.target.value,revenue_amount:e.target.value==="paid"?assignmentForm.revenue_amount:"0"})} className="field"><option value="paid">Payant</option><option value="free">Offert</option><option value="internal">Personnel / interne</option></select></Field>{assignmentForm.assignment_type!=="internal"&&<Field label="Client"><ClientPicker clients={clients} selectedId={assignmentForm.client_id} onSelect={(clientId)=>setAssignmentForm({...assignmentForm,client_id:clientId})}/></Field>}{assignmentForm.assignment_type==="paid"&&<Field label="Revenu de la période"><input type="number" min="0" required value={assignmentForm.revenue_amount} onChange={(e)=>setAssignmentForm({...assignmentForm,revenue_amount:e.target.value})} className="field"/></Field>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Début"><input type="date" required value={assignmentForm.start_date} onChange={(e)=>setAssignmentForm({...assignmentForm,start_date:e.target.value,end_date:addOneMonth(e.target.value)})} className="field"/></Field><Field label="Fin prévue"><input type="date" value={assignmentForm.end_date} onChange={(e)=>setAssignmentForm({...assignmentForm,end_date:e.target.value})} className="field"/></Field></div><Field label="Notes"><textarea value={assignmentForm.notes} onChange={(e)=>setAssignmentForm({...assignmentForm,notes:e.target.value})} className="field min-h-20"/></Field><Submit saving={saving} label="Rattacher manuellement"/></form></Modal>}
  </div>;
}

function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) { return <div className="pwa-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-6"><div className="max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-4 sm:px-6"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X size={18}/></button></div><div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">{children}</div></div></div>; }
function Field({label,children}:{label:string;children:ReactNode}) { return <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>; }
function Submit({saving,label="Enregistrer"}:{saving:boolean;label?:string}) { return <Button type="submit" disabled={saving} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">{saving&&<Loader2 size={16} className="animate-spin"/>}{label}</Button>; }
function Empty({text}:{text:string}) { return <div className="py-8 text-center text-sm text-slate-500">{text}</div>; }
function Status({status}:{status:string}) { const labels:Record<string,string>={active:"Actif",expired:"Expiré",suspended:"Suspendu"}; return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status==="active"?"bg-emerald-50 text-emerald-700":status==="expired"?"bg-red-50 text-red-700":"bg-orange-50 text-orange-700"}`}>{labels[status]||status}</span>; }
function TypeBadge({type}:{type:"paid"|"free"|"internal"}) { const c={paid:["Payant","bg-blue-50 text-blue-700"],free:["Offert","bg-violet-50 text-violet-700"],internal:["Interne","bg-slate-100 text-slate-700"]} as const; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${c[type][1]}`}>{c[type][0]}</span>; }
function Metric({label,value,icon}:{label:string;value:string;icon:ReactNode}) { return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-slate-500">{icon}<span className="text-xs font-medium">{label}</span></div><p className="mt-2 text-lg font-bold">{value}</p></div>; }

function ClientPicker({clients,selectedId,onSelect}:{clients:Client[];selectedId:string;onSelect:(clientId:string)=>void}) {
  const selectedClient = clients.find((client) => client.id === selectedId);
  const [query, setQuery] = useState(selectedClient?.name || "");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    return clients.filter((client) => !value || [client.name,client.phone,client.email].filter(Boolean).some((item)=>String(item).toLowerCase().includes(value))).slice(0,10);
  }, [clients,query]);
  return <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input required autoComplete="off" value={query} onFocus={()=>setOpen(true)} onChange={(event)=>{setQuery(event.target.value);onSelect("");setOpen(true);}} placeholder="Tapez une lettre, un nom ou un numéro…" className="field pl-10 pr-9"/>{query&&<button type="button" aria-label="Effacer le client" onClick={()=>{setQuery("");onSelect("");setOpen(true);}} className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={16}/></button>}{open&&<div className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{results.length===0?<p className="px-3 py-3 text-sm text-slate-500">Aucun client trouvé.</p>:results.map((client)=><button key={client.id} type="button" onPointerDown={(event)=>{event.preventDefault();onSelect(client.id);setQuery(client.name);setOpen(false);}} onClick={()=>{onSelect(client.id);setQuery(client.name);setOpen(false);}} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-blue-50"><span className="block text-sm font-semibold text-slate-900">{client.name}</span>{(client.phone||client.email)&&<span className="block truncate text-xs text-slate-500">{[client.phone,client.email].filter(Boolean).join(" · ")}</span>}</button>)}</div>}{query&&!selectedId&&!open&&<p className="mt-1 text-xs text-orange-600">Sélectionnez le client dans la liste.</p>}</div>;
}

export default AccountAccessPage;
