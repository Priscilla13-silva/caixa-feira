const DIAS=['Domingo','Segunda-Feira','Terça-Feira','Quarta-Feira','Quinta-Feira','Sexta-Feira','Sábado'];
const POUPANCA='Poupança';
let motivos=JSON.parse(localStorage.getItem('frango-motivos')||'null')||
  ['Janete','Água','Luz','Internet','Bruno','Cartão','MEI','Boleto Barraca','Murilo','Sueli','Simone','Mercado','Paulo','TIM'];
let saidasVals={};
let editMode=false;

function fmt(v){return 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function val(id){return unmasked(document.getElementById(id).value);}
function unmasked(v){return parseFloat((v||'').replace(/[^0-9]/g,''))/100||0;}
function fmtInput(v){const n=parseFloat(v)||0;return n===0?'':n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function mascara(el){
  const digits=el.value.replace(/[^0-9]/g,'');
  if(!digits||digits==='0'||digits==='00'){el.value='';return;}
  el.value=(parseInt(digits,10)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function mascaraSaida(el,idx){
  mascara(el);
  const m=allMotivos()[idx];
  const n=unmasked(el.value);
  saidasVals[m]=n>0?n:'';
  calcTotais();
}
function allMotivos(){return [...motivos,POUPANCA];}

function switchTab(name){
  const ns=['lancar','historico','poupanca','resumo'];
  document.querySelectorAll('.tab-btn').forEach((b,i)=>b.classList.toggle('active',ns[i]===name));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if(name==='historico')renderHistorico();
  if(name==='poupanca')renderPoupanca();
  if(name==='resumo')renderResumo();
}

function onDateChange(){
  const v=document.getElementById('f-date').value;
  if(!v){document.getElementById('day-badge').textContent='—';return;}
  const [y,m,d]=v.split('-').map(Number);
  document.getElementById('day-badge').textContent=DIAS[new Date(y,m-1,d).getDay()];
  carregarDiaSalvo(v);
}

function calcSaldoDia(d){
  const entradas=(d.vendasMarluce||0)+(d.vendasPriscilla||0);
  let saidas=0,poup=0;
  Object.entries(d.saidas||{}).forEach(([k,v])=>{
    const n=parseFloat(v)||0;
    if(k===POUPANCA) poup+=n; else saidas+=n;
  });
  return (d.saldoConta||0)+entradas-saidas-poup;
}

function getDiaAnterior(date){
  const todos=getAllDays();
  return todos.find(d=>d.date < date) || null;
}

function carregarDiaSalvo(date){
  document.getElementById('saldo-conta').value='';
  document.getElementById('vendas-marluce').value='';
  document.getElementById('vendas-priscilla').value='';
  saidasVals={};
  const saved=getSavedDay(date);
  if(saved){
    document.getElementById('saldo-conta').value=fmtInput(saved.saldoConta);
    document.getElementById('vendas-marluce').value=fmtInput(saved.vendasMarluce);
    document.getElementById('vendas-priscilla').value=fmtInput(saved.vendasPriscilla);
    saidasVals=saved.saidas||{};
  } else {
    const anterior=getDiaAnterior(date);
    if(anterior){
      const saldoHerdado=calcSaldoDia(anterior);
      document.getElementById('saldo-conta').value=fmtInput(saldoHerdado);
    }
  }
  renderSaidas();calcTotais();
}

function calcTotais(){
  const sc=val('saldo-conta');
  const vm=val('vendas-marluce'),vp=val('vendas-priscilla');
  const entradas=vm+vp;
  let saidas=0,poupDia=0;
  allMotivos().forEach(m=>{
    const n=parseFloat(saidasVals[m]||0);
    if(m===POUPANCA)poupDia+=n; else saidas+=n;
  });
  const datePoup=document.getElementById('f-date').value;
  const saldoPoupSalvo=getPoupMovs()
    .filter(m=>!(m.date===datePoup&&m.auto))
    .reduce((s,m)=>s+(m.tipo==='entrada'?m.valor:-m.valor),0);
  const saldoPoup=saldoPoupSalvo+poupDia;
  document.getElementById('disp-saldo-conta').textContent=fmt(sc);
  document.getElementById('disp-marluce').textContent=fmt(vm);
  document.getElementById('disp-priscilla').textContent=fmt(vp);
  document.getElementById('disp-entradas').textContent=fmt(entradas);
  document.getElementById('disp-saidas').textContent=fmt(saidas);
  document.getElementById('disp-poupanca-dia').textContent=fmt(poupDia);
  document.getElementById('res-saldo-ant').textContent=fmt(sc);
  document.getElementById('res-entradas').textContent=fmt(entradas);
  document.getElementById('res-saidas').textContent=fmt(saidas);
  document.getElementById('res-poup').textContent=fmt(poupDia);
  const final=sc+entradas-saidas-poupDia;
  const el=document.getElementById('res-saldo-final');
  el.textContent=fmt(final);
  el.style.color=final<0?'var(--red)':'var(--blue)';
  document.getElementById('res-saldo-poupanca').textContent=fmt(saldoPoup);
}

function renderSaidas(){
  const todos=allMotivos();
  document.getElementById('saidas-list').innerHTML=todos.map((m,i)=>{
    const isPoup=m===POUPANCA;
    const badge=isPoup?'<span class="saida-poup-tag">poupança</span>':'';
    const cls=isPoup?'saida-input poup-input':'saida-input';
    return `<div class="saida-item">
      <span class="saida-label">${m}${badge}</span>
      <input class="${cls}" type="text" placeholder="R$ 0,00" inputmode="numeric"
        value="${saidasVals[m]?fmtInput(parseFloat(saidasVals[m])):''}"
        oninput="mascaraSaida(this,${i})" />
    </div>`;
  }).join('');
}

function renderTags(){
  document.getElementById('tags-list').innerHTML=
    motivos.map((m,i)=>`<span class="tag">${m}<button onclick="removeMotivo(${i})">×</button></span>`).join('')+
    `<span class="tag" style="opacity:.55;cursor:default">${POUPANCA} <span style="font-size:10px;color:var(--purple)">fixo</span></span>`;
}

function toggleEdit(){
  editMode=!editMode;
  document.getElementById('edit-panel').classList.toggle('open',editMode);
  if(editMode)renderTags();
}

function addMotivo(){
  const inp=document.getElementById('new-motivo');
  const v=inp.value.trim();
  if(!v||motivos.includes(v)||v===POUPANCA)return;
  motivos.push(v);inp.value='';
  saveMotivos();renderTags();renderSaidas();atualizarSelectPoupanca();
}

function removeMotivo(i){
  delete saidasVals[motivos[i]];
  motivos.splice(i,1);
  saveMotivos();renderTags();renderSaidas();calcTotais();atualizarSelectPoupanca();
}

function saveMotivos(){try{localStorage.setItem('frango-motivos',JSON.stringify(motivos));}catch(e){}}

function salvarDia(){
  const date=document.getElementById('f-date').value;
  if(!date){alert('Informe a data do caixa.');return;}
  const poupDia=parseFloat(saidasVals[POUPANCA]||0);
  const data={
    date,day:document.getElementById('day-badge').textContent,
    saldoConta:val('saldo-conta'),
    vendasMarluce:val('vendas-marluce'),
    vendasPriscilla:val('vendas-priscilla'),
    saidas:{...saidasVals}
  };
  try{localStorage.setItem('frango-caixa-'+date,JSON.stringify(data));}catch(e){}
  const movs=getPoupMovs().filter(m=>!(m.date===date&&m.auto));
  if(poupDia>0)movs.push({id:date+'-auto',date,tipo:'entrada',valor:poupDia,motivo:'Caixa do dia',auto:true});
  savePoupMovs(movs);
  const msg=document.getElementById('save-msg');
  msg.textContent='Caixa de '+date.split('-').reverse().join('/')+' salvo com sucesso!';
  setTimeout(()=>msg.textContent='',4000);
  calcTotais();
  if(document.getElementById('tab-poupanca').classList.contains('active')) renderPoupanca();
}

function getSavedDay(date){try{const r=localStorage.getItem('frango-caixa-'+date);return r?JSON.parse(r):null;}catch(e){return null;}}
function getAllDays(){
  const days=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&k.startsWith('frango-caixa-')){try{days.push(JSON.parse(localStorage.getItem(k)));}catch(e){}}
  }
  return days.sort((a,b)=>b.date.localeCompare(a.date));
}

function getPoupMovs(){try{return JSON.parse(localStorage.getItem('frango-poup-movs')||'[]');}catch(e){return[];}}
function savePoupMovs(movs){try{localStorage.setItem('frango-poup-movs',JSON.stringify(movs));}catch(e){}}
function calcSaldoPoupanca(){
  let s=0;getPoupMovs().forEach(m=>{s+=m.tipo==='entrada'?m.valor:-m.valor;});return s;
}

function atualizarSelectPoupanca(){
  const sel=document.getElementById('poup-motivo');
  const opts=[...motivos,'Rendimento','Resgate parcial','Outro'];
  sel.innerHTML='<option value="">— selecione —</option>'+opts.map(o=>`<option>${o}</option>`).join('');
}

function salvarMovPoupanca(){
  const date=document.getElementById('poup-data').value;
  const tipo=document.getElementById('poup-tipo').value;
  const valor=unmasked(document.getElementById('poup-valor').value);
  const motivo=document.getElementById('poup-motivo').value||'—';
  if(!date||!valor){alert('Informe data e valor.');return;}
  const movs=getPoupMovs();
  movs.push({id:Date.now()+'',date,tipo,valor,motivo,auto:false});
  savePoupMovs(movs);
  document.getElementById('poup-valor').value='';
  const msg=document.getElementById('poup-save-msg');
  msg.textContent='Registrado com sucesso!';
  setTimeout(()=>msg.textContent='',3000);
  renderPoupanca();calcTotais();
}

function deletePoupMov(id){
  if(!confirm('Excluir esta movimentação?'))return;
  savePoupMovs(getPoupMovs().filter(m=>m.id!==id));
  renderPoupanca();calcTotais();
}

function togglePoupItem(id){
  document.getElementById('pb-'+id).classList.toggle('open');
  document.getElementById('pc-'+id).classList.toggle('open');
}

function renderPoupanca(){
  const movs=getPoupMovs().sort((a,b)=>b.date.localeCompare(a.date));
  document.getElementById('poup-total').textContent=fmt(calcSaldoPoupanca());
  const lista=document.getElementById('poup-lista');
  if(!movs.length){lista.innerHTML='<div class="hist-empty">Nenhuma movimentação ainda.</div>';return;}
  let ac=0;
  const saldoMap={};
  [...movs].reverse().forEach(m=>{ac+=m.tipo==='entrada'?m.valor:-m.valor;saldoMap[m.id]=ac;});
  lista.innerHTML=movs.map(m=>{
    const dateF=m.date.split('-').reverse().join('/');
    const [y,mo,d]=m.date.split('-').map(Number);
    const dia=DIAS[new Date(y,mo-1,d).getDay()];
    const isE=m.tipo==='entrada';
    return `<div class="poup-item">
      <div class="poup-item-header" onclick="togglePoupItem('${m.id}')">
        <div class="hist-date-info">
          <div class="hist-date">${dateF}</div>
          <div class="hist-weekday">${dia}${m.auto?' <span style="font-size:10px;color:var(--purple)">(automático)</span>':''}</div>
        </div>
        <div class="hist-badges">
          <span class="badge ${isE?'badge-green':'badge-red'}">${isE?'+':'−'} ${fmt(m.valor)}</span>
          <span class="badge badge-purple">Saldo ${fmt(saldoMap[m.id])}</span>
        </div>
        <span class="hist-chevron" id="pc-${m.id}">▼</span>
      </div>
      <div class="poup-item-body" id="pb-${m.id}">
        <div class="hist-row"><span>Tipo</span><span style="color:${isE?'var(--green)':'var(--red)'}">${isE?'Entrada':'Saída'}</span></div>
        <div class="hist-row"><span>Valor</span><span>${fmt(m.valor)}</span></div>
        <div class="hist-row"><span>Motivo</span><span>${m.motivo}</span></div>
        <div class="hist-row"><span>Saldo após</span><span class="purple">${fmt(saldoMap[m.id])}</span></div>
        ${!m.auto?`<div class="hist-actions"><button class="btn btn-sm btn-danger" onclick="deletePoupMov('${m.id}')">🗑 Excluir</button></div>`:''}
      </div>
    </div>`;
  }).join('');
}

function deleteDia(date){
  if(!confirm('Excluir o caixa de '+date.split('-').reverse().join('/')+'?'))return;
  localStorage.removeItem('frango-caixa-'+date);
  savePoupMovs(getPoupMovs().filter(m=>!(m.date===date&&m.auto)));
  renderHistorico();renderResumo();
}

function editarDia(date){
  document.getElementById('f-date').value=date;
  onDateChange();switchTab('lancar');
}

function toggleHistDay(date){
  document.getElementById('hbody-'+date).classList.toggle('open');
  document.getElementById('hchev-'+date).classList.toggle('open');
}

function renderHistorico(){
  const filter=document.getElementById('hist-filter').value;
  let days=getAllDays();
  if(filter)days=days.filter(d=>d.date.startsWith(filter));
  const list=document.getElementById('hist-list');
  if(!days.length){list.innerHTML='<div class="hist-empty">Nenhum caixa salvo'+(filter?' neste mês':'')+'.</div>';return;}
  list.innerHTML=days.map(d=>{
    const entradas=(d.vendasMarluce||0)+(d.vendasPriscilla||0);
    const sc=d.saldoConta||0;
    let saidas=0,poupDia=0;
    const entries=Object.entries(d.saidas||{}).filter(([,v])=>parseFloat(v)>0);
    entries.forEach(([k,v])=>{if(k===POUPANCA)poupDia+=parseFloat(v);else saidas+=parseFloat(v);});
    const saldoFinal=sc+entradas-saidas-poupDia;
    const dateF=d.date.split('-').reverse().join('/');
    const semPoup=entries.filter(([k])=>k!==POUPANCA);
    const saidasHTML=semPoup.length
      ?semPoup.map(([k,v])=>`<div class="hist-saida-row"><span>${k}</span><span style="color:var(--red)">− ${fmt(v)}</span></div>`).join('')
      :'<div style="font-size:13px;color:var(--text-hint);padding:4px 0">Nenhuma</div>';
    return `<div class="hist-day">
      <div class="hist-day-header" onclick="toggleHistDay('${d.date}')">
        <div class="hist-date-info"><div class="hist-date">${dateF}</div><div class="hist-weekday">${d.day||''}</div></div>
        <div class="hist-badges">
          <span class="badge badge-green">+ ${fmt(entradas)}</span>
          <span class="badge badge-red">− ${fmt(saidas)}</span>
          ${poupDia>0?`<span class="badge badge-purple">poup ${fmt(poupDia)}</span>`:''}
          <span class="badge badge-blue">${fmt(saldoFinal)}</span>
        </div>
        <span class="hist-chevron" id="hchev-${d.date}">▼</span>
      </div>
      <div class="hist-body" id="hbody-${d.date}">
        <div class="hist-section">
          <div class="hist-section-title">Saldo anterior em conta</div>
          <div class="hist-row"><span>Valor em conta</span><span class="blue">${fmt(sc)}</span></div>
        </div>
        <div class="hist-section">
          <div class="hist-section-title">Entradas</div>
          <div class="hist-row"><span>Maquina Marluce</span><span class="green">${fmt(d.vendasMarluce)}</span></div>
          <div class="hist-row"><span>Maquina Priscilla</span><span class="green">${fmt(d.vendasPriscilla)}</span></div>
          <div class="hist-row"><span>Total de entradas</span><span class="green">${fmt(entradas)}</span></div>
        </div>
        <div class="hist-section">
          <div class="hist-section-title">Saídas</div>
          ${saidasHTML}
          <div class="hist-row" style="margin-top:6px"><span>Total de saídas</span><span class="red">${fmt(saidas)}</span></div>
        </div>
        ${poupDia>0?`<div class="hist-section">
          <div class="hist-section-title">Poupança</div>
          <div class="hist-row"><span>Depositado</span><span class="purple">${fmt(poupDia)}</span></div>
        </div>`:''}
        <div class="hist-total"><span>Saldo atualizado</span><span style="color:${saldoFinal<0?'var(--red)':'var(--blue)'}">${fmt(saldoFinal)}</span></div>
        <div class="hist-actions">
          <button class="btn btn-sm" onclick="editarDia('${d.date}')">✏️ Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deleteDia('${d.date}')">🗑 Excluir</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderResumo(){
  const days=getAllDays();
  let totE=0,totS=0,totM=0,totP=0,totPoup=0;
  const porMotivo={};
  days.forEach(d=>{
    totM+=(d.vendasMarluce||0);totP+=(d.vendasPriscilla||0);
    totE+=(d.vendasMarluce||0)+(d.vendasPriscilla||0);
    Object.entries(d.saidas||{}).forEach(([k,v])=>{
      const n=parseFloat(v)||0;
      if(k===POUPANCA)totPoup+=n;
      else{totS+=n;porMotivo[k]=(porMotivo[k]||0)+n;}
    });
  });
  document.getElementById('res-total-entradas').textContent=fmt(totE);
  document.getElementById('res-total-saidas').textContent=fmt(totS);
  document.getElementById('res-total-poupado').textContent=fmt(totPoup);
  document.getElementById('res-saldo-poup-atual').textContent=fmt(calcSaldoPoupanca());
  document.getElementById('res-total-dias').textContent=days.length;
  document.getElementById('res-media').textContent=days.length?fmt(totE/days.length):fmt(0);
  document.getElementById('res-marluce-total').textContent=fmt(totM);
  document.getElementById('res-priscilla-total').textContent=fmt(totP);
  const sorted=Object.entries(porMotivo).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const el=document.getElementById('res-por-motivo');
  if(!sorted.length){el.innerHTML='<div style="font-size:13px;color:var(--text-muted);padding:.5rem 0">Nenhuma saída ainda.</div>';return;}
  el.innerHTML=sorted.map(([k,v])=>`<div class="hist-saida-row"><span>${k}</span><span>${fmt(v)}</span></div>`).join('');
}

// INIT
const today=new Date().toISOString().split('T')[0];
document.getElementById('f-date').value=today;
document.getElementById('poup-data').value=today;
onDateChange();
renderSaidas();
calcTotais();
atualizarSelectPoupanca();
const now=new Date();
document.getElementById('hist-filter').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
