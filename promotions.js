/* Shared promotion rules. Original prices are never overwritten. */
(function(){
 'use strict';
 function active(p,now=Date.now()) {return !!p?.enabled && (!p.starts_at || now>=Date.parse(p.starts_at)) && (!p.ends_at || now<Date.parse(p.ends_at));}
 function discount(row,p,now=Date.now()){
  const amount=Number(row.amount);
  if(!active(p,now)||row.price_mode==='quote'||row.amount===null||!Number.isFinite(amount)||amount<=0||(p.models.length&&!p.models.includes(row.model))||(p.services.length&&!p.services.includes(row.service)))return null;
  const reduced=Math.max(0,Math.round((p.discount_type==='percent'?amount*(1-Number(p.value)/100):amount-Number(p.value))*100)/100);
  return reduced<amount?{...row,amount:reduced}:null;
 }
 function validate(p){
  if(!p.name?.trim()||p.name.length>80)throw Error('Escribe un nombre de hasta 80 caracteres.');
  if(!['percent','fixed'].includes(p.discount_type)||!Number.isFinite(p.value)||p.value<=0||p.value>(p.discount_type==='percent'?100:1000000))throw Error('Escribe un descuento válido: hasta 100 % o RD$1,000,000.');
  for(const key of ['starts_at','ends_at'])if(p[key]&&!Number.isFinite(Date.parse(p[key])))throw Error('Revisa las fechas.');
  if(p.starts_at&&p.ends_at&&Date.parse(p.ends_at)<=Date.parse(p.starts_at))throw Error('La fecha final debe ser posterior al inicio.');
  if(!Array.isArray(p.models)||!Array.isArray(p.services))throw Error('Selecciona modelos y servicios.');
 }
 function localDate(iso){return iso?new Date(Date.parse(iso)-4*3600000).toISOString().slice(0,16):'';}
 function toISO(value){return value?new Date(value+':00-04:00').toISOString():null;}
 window.CelvisPromotions={active,discount,validate,localDate,toISO};
})();
