"use strict";
const $ = id => document.getElementById(id);
let prices = [], unsaved = false, busy = false;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function status(id,message,error=false){ $(id).textContent=message; $(id).classList.toggle('error',error); }
function formFor(row){
 const id=row.id || `new-${Date.now()}`;
 return `<form class="row" data-id="${id}">
 <label class="service">Reparación<input name="service" maxlength="120" required value="${escapeHTML(row.service)}"></label>
 <label>Tipo de precio<select name="price_mode"><option value="fixed" ${row.price_mode==='fixed'?'selected':''}>Precio fijo</option><option value="from" ${row.price_mode==='from'?'selected':''}>Desde</option><option value="quote" ${row.price_mode==='quote'?'selected':''}>Cotizar</option></select></label>
 <label>Precio RD$<input name="amount" type="number" min="0" max="1000000" step="0.01" inputmode="decimal" ${row.price_mode==='quote'?'disabled':''} value="${row.amount??''}"></label>
 <label class="note">Condiciones / garantía<input name="note" maxlength="300" value="${escapeHTML(row.note)}"></label>
 <div class="row-actions"><button class="primary" type="submit">Guardar</button></div>
 <label class="visibility"><input name="enabled" type="checkbox" ${row.enabled?'checked':''}>Mostrar en la página</label><p class="row-status" role="status" aria-live="polite"></p></form>`;
}
function render(){
 $('rows').innerHTML=prices.filter(row=>row.model===$('model').value).map(formFor).join('');
}
async function loadPrices(){
 const selected=$('model').value;
 const loaded=await CelvisAPI.adminPrices();
 prices=loaded;
 const models=[...new Set(prices.map(row=>row.model))];
 $('model').innerHTML=models.map(model=>`<option>${escapeHTML(model)}</option>`).join('');
 if(models.includes(selected)) $('model').value=selected;
 render();unsaved=false;
}
function sessionError(error){
 if(error.status===401){ $('panel').hidden=true;$('loginBox').hidden=false;$('logout').hidden=true;status('loginStatus','Tu sesión venció. Vuelve a entrar.',true); }
}
$('loginForm').addEventListener('submit',async event=>{
 event.preventDefault();$('loginButton').disabled=true;status('loginStatus','Entrando…');
 try{
  const user=await CelvisAPI.signIn($('email').value.trim(),$('password').value);
  $('password').value='';await loadPrices();
  $('sessionUser').textContent=user.email;
  $('loginBox').hidden=true;$('panel').hidden=false;$('logout').hidden=false;
  status('loginStatus','');
 }catch(error){ await CelvisAPI.signOut();status('loginStatus',error.message,true); }
 finally{ $('loginButton').disabled=false; }
});
$('model').addEventListener('change',()=>{
 if(unsaved && !confirm('Hay cambios sin guardar. ¿Quieres cambiar de modelo y descartarlos?')){
  $('model').value=$('rows').dataset.previousModel;return;
 }
 render();$('rows').dataset.previousModel=$('model').value;unsaved=false;status('panelStatus','');
});
$('rows').addEventListener('input',event=>{
 unsaved=true;$('rows').dataset.previousModel=$('model').value;
 const form=event.target.closest('form');
 form.dataset.dirty='true';
 if(event.target.name==='price_mode') form.elements.amount.disabled=event.target.value==='quote';
});
$('rows').addEventListener('change',event=>{
 if(event.target.name==='price_mode') event.target.closest('form').elements.amount.disabled=event.target.value==='quote';
});
$('rows').addEventListener('submit',async event=>{
 event.preventDefault();if(busy) return;
 const form=event.target;const old=prices.find(row=>String(row.id)===form.dataset.id);
 const mode=form.elements.price_mode.value;
 const amount=mode==='quote'?null:form.elements.amount.value.trim()===''?NaN:Number(form.elements.amount.value);
 const row={...old, model:$('model').value,service:form.elements.service.value,price_mode:mode,amount,note:form.elements.note.value,enabled:form.elements.enabled.checked,sort_order:old?.sort_order??(prices.filter(x=>x.model===$('model').value).at(-1)?.sort_order??0)+1};
 const button=form.querySelector('button');const note=form.querySelector('.row-status');
 busy=true;button.disabled=true;$('model').disabled=true;$('reload').disabled=true;$('add').disabled=true;$('logout').disabled=true;note.textContent='Guardando…';note.classList.remove('error');
 try{
  const saved=await CelvisAPI.savePrice(row);
  if(old) prices[prices.indexOf(old)]=saved;else prices.push(saved);
  form.dataset.id=String(saved.id);delete form.dataset.dirty;
  unsaved=Boolean($('rows').querySelector('[data-dirty="true"]'));
  note.textContent='Guardado en línea. Ya está disponible en la página.';
 }catch(error){note.textContent=error.message;note.classList.add('error');sessionError(error);}
 finally{busy=false;button.disabled=false;$('model').disabled=false;$('reload').disabled=false;$('add').disabled=false;$('logout').disabled=false;}
});
$('add').addEventListener('click',()=>{
 $('rows').insertAdjacentHTML('beforeend',formFor({service:'',price_mode:'quote',amount:null,note:'Confirmar condiciones',enabled:true}));
 $('rows').lastElementChild.dataset.dirty='true';unsaved=true;$('rows').dataset.previousModel=$('model').value;
 $('rows').lastElementChild.querySelector('input').focus();
});
$('reload').addEventListener('click',async()=>{
 if(unsaved && !confirm('¿Descartar los cambios sin guardar y recargar?'))return;
 $('reload').disabled=true;status('panelStatus','Consultando precios…');
 try{await loadPrices();status('panelStatus','Precios actualizados.');}catch(error){status('panelStatus',error.message,true);sessionError(error);}finally{$('reload').disabled=false;}
});
$('logout').addEventListener('click',async()=>{
 if(unsaved && !confirm('¿Cerrar sesión y descartar los cambios sin guardar?'))return;
 await CelvisAPI.signOut();prices=[];unsaved=false;$('rows').innerHTML='';$('sessionUser').textContent='';$('panel').hidden=true;$('loginBox').hidden=false;$('logout').hidden=true;
});
window.addEventListener('beforeunload',event=>{if(unsaved){event.preventDefault();event.returnValue='';}});
if(!CelvisAPI.configured()){$('loginButton').disabled=true;status('loginStatus','El panel todavía necesita conectar su proyecto de precios.',true);}
