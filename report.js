// Geração de parecer e PDF
function collectAna(){
  const f=document.querySelector('#formAna'); const o={};
  if(!f) return o;
  f.querySelectorAll('input, textarea').forEach(el=>{ if(el.name) o[el.name]=el.value||''; });
  return o;
}

async function callGestorBackend(prompt){
  try{
    const r=await fetch('/.netlify/functions/gestor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const j=await r.json();
    if(j.error) throw new Error(j.error);
    return j.text||j.reply||'';
  }catch(e){
    const a=collectAna();
    function sum(n){return String(n).split('').reduce((s,c)=>s+(+c||0),0)}
    function reduce(n){while(n>9 && ![11,22,33].includes(n)) n=sum(n); return n}
    let vida='—';
    const m=(a.data_nascimento||'').match(/(\d{1,2})[^\d](\d{1,2})[^\d](\d{2,4})/);
    if(m){ vida=reduce(+m[1]+ +m[2]+ +m[3]); }
    return `Exploração Dirigida\n1) ${a.q1||'—'}\n2) ${a.q2||'—'}\n3) ${a.q3||'—'}\n4) ${a.q4||'—'}\n5) ${a.q5||'—'}\n\n## Síntese do caso\nCliente: ${a.cliente||'—'} | Queixa: ${a.queixa||'—'} | Tempo: ${a.tempo||'—'} | Impacto: ${a.impacto||'—'}\nCaminho de Vida: ${vida}\n\n## Intervenções prioritárias\n1) TCC diário\n2) EFT 2x/dia\n3) Psicoaromaterapia`;
  }
}

document.querySelector('#btnGestor').addEventListener('click', async()=>{
  document.querySelector('#status').textContent='Gerando parecer...';
  const txt=await callGestorBackend(JSON.stringify(collectAna()));
  document.querySelector('#parecerBox').textContent=txt;
  document.querySelector('#status').textContent='Pronto';
});

// Pergunta ao mentor
document.querySelector('#btnSend').addEventListener('click', async()=>{
  const q=document.querySelector('#perguntaMentor').value.trim();
  if(!q){ alert('Digite sua pergunta.'); return; }
  const out=document.querySelector('#chatAnswer');
  out.innerHTML='<b>Você:</b> '+q+'<br>⌛ consultando...';
  try{
    const r=await fetch('/.netlify/functions/mentor-openai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:q})});
    const j=await r.json();
    out.innerHTML='<b>Você:</b> '+q+'<br><br>'+(j.reply||j.text||'Sem resposta');
  }catch(e){ out.innerHTML='<b>Você:</b> '+q+'<br><br>Falha, tente mais tarde.'; }
});

// PDF
document.querySelector('#btnPdf').addEventListener('click',()=>{
  if(window.html2pdf){
    html2pdf().from(document.body).set({margin:10,filename:'relatorio_isc.pdf',
      html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).save();
  }else{ alert('html2pdf não carregou'); }
});
