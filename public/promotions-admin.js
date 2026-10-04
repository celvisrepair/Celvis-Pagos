'use strict';
let promotion=null,promoDirty=false,promoBusy=false;
const pe=id=>document.getElementById(id);
const ph=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function promoSelections(id){return [...pe(id).querySelectorAll('input:checked')].map(x=>x.value);}
function promoOptions(id,values,selected){pe(id).innerHTML=[...new Set([...values,...selected])].map(value=>`<label class="promo-choice"><input type="checkbox" value="${ph(value)}" ${selected.includes(value)?'checked':''}>${ph(value)}</label>`).join('');}
function promoFromForm(){return {...promotion,name:pe('promoName').value,enabled:pe('promoEnabled').checked,discount_type:pe('promoType').value,value:pe('promoValue').value.trim()===''?NaN:Number(pe('promoValue').value),models:pe('promoAllModels').checked?[]:promoSelections('promoModels'),services:pe('promoAllServices').checked?[]:promoSelections('promoServices'),starts_at:CelvisPromotions.toISO(pe('promoStart').value),ends_at:CelvisPromotions.toISO(pe('promoEnd').value)};}
function validateSelections(p){if(!pe('promoAllModels').checked&&!p.models.length)throw Error('Selecciona al menos un modelo o marca Todos.');if(!pe('promoAllServices').checked&&!p.services.length)throw Error('Selecciona al menos un servicio o marca Todos.');}
function renderPromoPreview(){
 pe('promoModels').hidden=pe('promoAllModels').checked;pe('promoServices').hidden=pe('promoAllServices').checked;
 try{
  const p=promoFromForm();CelvisPromotions.validate(p);validateSelections(p);
  const sample=prices.filter(x=>x.enabled).map(row=>({row,discounted:CelvisPromotions.discount(row,{...p,enabled:true,starts_at:null,ends_at:null})})).filter(x=>x.discounted);
  const state=!p.enabled?'Desactivada':CelvisPromotions.active(p)?'Activa ahora':p.ends_at&&Date.parse(p.ends_at)<=Date.now()?'Finalizada':'Programada';
  pe('promoPreview').innerHTML=`<strong>${ph(state)} · ${sample.length} precios con descuento</strong><p>Vista previa del descuento:</p>`+sample.slice(0,6).map(({row,discounted})=>`<p>${ph(row.model)} · ${ph(row.service)}<br><del>${ph(CelvisAPI.priceLabel(row))}</del> → <strong>${ph(CelvisAPI.priceLabel(discounted))}</strong></p>`).join('')+(sample.length>6?'<p>Y otros servicios seleccionados.</p>':'')+(!sample.length?'<p>No hay precios definidos que coincidan. «Cotizar» no recibe descuentos.</p>':'');
 }catch(error){pe('promoPreview').textContent=error.message;}
}
async function loadPromotion(){
 promotion=await CelvisAPI.adminPromotion();if(!promotion)throw Error('La sección Promociones todavía no está configurada.');
 pe('promoName').value=promotion.name;pe('promoEnabled').checked=promotion.enabled;pe('promoType').value=promotion.discount_type;pe('promoValue').value=promotion.value;
 pe('promoStart').value=CelvisPromotions.localDate(promotion.starts_at);pe('promoEnd').value=CelvisPromotions.localDate(promotion.ends_at);
 pe('promoAllModels').checked=!promotion.models.length;pe('promoAllServices').checked=!promotion.services.length;
 promoOptions('promoModels',prices.map(x=>x.model),promotion.models);promoOptions('promoServices',prices.map(x=>x.service),promotion.services);
 promoDirty=false;renderPromoPreview();pe('promoStatus').textContent='';
}
pe('promoForm').addEventListener('input',()=>{promoDirty=true;renderPromoPreview();});
pe('promoForm').addEventListener('change',()=>{promoDirty=true;renderPromoPreview();});
pe('promoForm').addEventListener('submit',async event=>{
 event.preventDefault();if(promoBusy)return;
 try{
  const p=promoFromForm();CelvisPromotions.validate(p);validateSelections(p);promoBusy=true;
  pe('promoForm').querySelector('fieldset').disabled=true;pe('logout').disabled=true;pe('promoReload').disabled=true;
  pe('promoStatus').classList.remove('error');pe('promoStatus').textContent='Guardando…';
  promotion=await CelvisAPI.savePromotion(p);promoDirty=false;renderPromoPreview();pe('promoStatus').textContent='Promoción guardada en línea. Los clientes la verán al actualizar la página.';
 }catch(error){pe('promoStatus').textContent=error.message;pe('promoStatus').classList.add('error');sessionError(error);}
 finally{promoBusy=false;pe('promoForm').querySelector('fieldset').disabled=false;pe('logout').disabled=false;pe('promoReload').disabled=false;}
});
pe('promoReload').addEventListener('click',async()=>{
 if(promoDirty&&!confirm('¿Descartar los cambios de la promoción y recargar?'))return;
 pe('promoReload').disabled=true;
 try{await loadPromotion();}catch(error){pe('promoStatus').textContent=error.message;sessionError(error);}finally{pe('promoReload').disabled=false;}
});
window.addEventListener('beforeunload',event=>{if(promoDirty){event.preventDefault();event.returnValue='';}});
