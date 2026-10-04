/* Celvis: public reads and authenticated writes. Authorization is enforced by RLS. */
(function () {
  "use strict";
  const cfg = window.CELVIS_CONFIG || {};
  const base = (cfg.supabaseUrl || "").replace(/\/$/, "");
  const key = cfg.publishableKey || "";
  let session = null;
  let refreshing = null;
  // Memory-only session: closing/reloading the panel requires signing in again.
  function configured(){ return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base) && Boolean(key); }
  async function request(path, {method="GET", body, token, prefer} = {}) {
    if(!configured()) throw new Error("Falta conectar el proyecto de precios.");
    const headers = {apikey:key, "Content-Type":"application/json"};
    if(token) headers.Authorization = `Bearer ${token}`;
    if(prefer) headers.Prefer = prefer;
    const response = await fetch(base + path, {method, headers, body:body ? JSON.stringify(body) : undefined, cache:"no-store", signal:AbortSignal.timeout(15000)});
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) {}
    if(!response.ok){
      const error = new Error(response.status === 400 && path.includes("grant_type=password") ? "Correo o contraseña incorrectos, o correo pendiente de confirmar." : response.status === 401 ? "Sesión vencida. Vuelve a iniciar sesión." : response.status === 403 ? "Tu cuenta no tiene permiso para cambiar precios." : "No se pudo completar la operación. Revisa la conexión y vuelve a intentar.");
      error.status = response.status; throw error;
    }
    return data;
  }
  function setSession(data){ session = {...data, expiresAt:Date.now() + Number(data.expires_in || 3600)*1000}; }
  async function accessToken(){
    if(!session) throw new Error("Inicia sesión para continuar.");
    if(session.expiresAt - Date.now() < 60000){
      if(!refreshing) refreshing = request("/auth/v1/token?grant_type=refresh_token", {method:"POST",body:{refresh_token:session.refresh_token}})
        .then(setSession).catch(error => { session=null;throw error; }).finally(() => {refreshing=null;});
      await refreshing;
    }
    return session.access_token;
  }
  async function signIn(email,password){
    const data = await request("/auth/v1/token?grant_type=password", {method:"POST",body:{email,password}});
    setSession(data);
    try {
      const allowed = await request("/rest/v1/celvis_admins?select=user_id&user_id=eq." + encodeURIComponent(data.user.id), {token:await accessToken()});
      if(!allowed?.length) throw new Error("Esta cuenta no está autorizada para administrar Celvis.");
    } catch(error){ await signOut(); throw error; }
    return data.user;
  }
  async function signOut(){
    const token=session?.access_token; session=null;
    if(token){ try {await request("/auth/v1/logout?scope=local",{method:"POST",token});}catch(_){} }
  }
  const fields="id,model,service,amount,price_mode,note,enabled,sort_order,version";
  async function publicPrices(){ return await request(`/rest/v1/repair_prices?select=${fields}&enabled=eq.true&order=sort_order.asc,id.asc`); }
  async function adminPrices(){ return await request(`/rest/v1/repair_prices?select=${fields}&order=sort_order.asc,id.asc`,{token:await accessToken()}); }
  function validatePrice(row){
    if(!row.model?.trim() || !row.service?.trim()) throw new Error("Completa el modelo y la reparación.");
    if(!["fixed","from","quote"].includes(row.price_mode)) throw new Error("Selecciona un tipo de precio.");
    if(row.price_mode !== "quote" && (!Number.isFinite(row.amount) || row.amount < 0 || row.amount > 1000000)) throw new Error("Escribe un precio válido de 0 a 1,000,000.");
  }
  async function savePrice(row){
    validatePrice(row);
    const body={model:row.model.trim(),service:row.service.trim(),amount:row.price_mode === "quote" ? null : row.amount,price_mode:row.price_mode,note:row.note.trim(),enabled:row.enabled,sort_order:row.sort_order};
    const token=await accessToken();
    if(row.id){
      const data=await request(`/rest/v1/repair_prices?id=eq.${encodeURIComponent(row.id)}&version=eq.${encodeURIComponent(row.version)}`,{method:"PATCH",body,token,prefer:"return=representation"});
      if(!data?.length) throw new Error("Este precio cambió desde que lo abriste. Recarga el panel antes de guardar.");
      return data[0];
    }
    const data=await request("/rest/v1/repair_prices",{method:"POST",body,token,prefer:"return=representation"});
    return data[0];
  }
  function priceLabel(row){
    if(row.price_mode === "quote") return "Cotizar";
    return (row.price_mode === "from" ? "Desde " : "") + "RD$ " + Number(row.amount).toLocaleString("en-US",{maximumFractionDigits:2});
  }
  async function publicPromotion(){const rows=await request('/rest/v1/repair_promotions?select=*&id=eq.1');return rows[0]||null;}
  async function adminPromotion(){const rows=await request('/rest/v1/repair_promotions?select=*&id=eq.1',{token:await accessToken()});return rows[0]||null;}
  async function savePromotion(p){
    CelvisPromotions.validate(p);
    const body={name:p.name.trim(),enabled:p.enabled,discount_type:p.discount_type,value:p.value,models:p.models,services:p.services,starts_at:p.starts_at,ends_at:p.ends_at};
    const rows=await request(`/rest/v1/repair_promotions?id=eq.1&version=eq.${encodeURIComponent(p.version)}`,{method:'PATCH',body,token:await accessToken(),prefer:'return=representation'});
    if(!rows?.length)throw Error('La promoción cambió. Recarga antes de guardar.');
    return rows[0];
  }
  window.CelvisAPI={publicPromotion,adminPromotion,savePromotion,configured,signIn,signOut,publicPrices,adminPrices,savePrice,priceLabel};
})();
