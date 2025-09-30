
(function(){
  "use strict";
  const $ = (s)=>document.querySelector(s);
  const state = { selected: [], techniques: (window.__TECHNIQUES__||[]) };

  const el = {
    terapeuta: $("#terapeuta"), cliente: $("#cliente"), nascimento: $("#nascimento"),
    intensidade: $("#intensidade"), queixa: $("#queixa"), tempo: $("#tempo"),
    efeitos: $("#efeitos"), obs: $("#obs"),
    btnSugerir: $("#btnSugerir"), btnLimpar: $("#btnLimpar"), sugestoes: $("#sugestoes"),
    catalog: $("#tech-catalog"), btnGerar: $("#btnGerar"), report: $("#report"),
    btnPrint: $("#btnPrint"), btnReset: $("#btnReset"), btnCopiar: $("#btnCopiar"), selCount: $("#selCount")
  };

  function htmlesc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
  function clean(s){return String(s||"").trim().replace(/\s+/g," ");}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function parseDateFlex(v){
    if(!v) return null; const digits=String(v).replace(/\D+/g,"");
    let d,m,y;
    if(digits.length===6){ d=+digits.slice(0,2); m=+digits.slice(2,4); y=+digits.slice(4,6); y+=(y<=29?2000:1900); }
    else if(digits.length===8){ d=+digits.slice(0,2); m=+digits.slice(2,4); y=+digits.slice(4,8); }
    else {
      const parts = String(v).replace(/(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{2,4})/,"$1/$2/$3").split(/[\/\-\.]/);
      if(parts.length===3){ d=+parts[0]; m=+parts[1]; y=+parts[2]; if(y<100) y+=(y<=29?2000:1900); } else { return null; }
    }
    const dt = new Date(y,m-1,d); if(dt && dt.getMonth()===(m-1) && dt.getDate()===d) return dt; return null;
  }
  function age(dt){ if(!dt) return null; const now=new Date(); let a=now.getFullYear()-dt.getFullYear(); if(now.getMonth()<dt.getMonth()|| (now.getMonth()===dt.getMonth() && now.getDate()<dt.getDate())) a--; return a; }
  function strip(html){ const t=document.createElement("div"); t.innerHTML=html; return t.textContent||t.innerText||""; }

  function renderCatalog(){
    const frag=document.createDocumentFragment();
    state.techniques.forEach(t=>{
      const div=document.createElement("div"); div.className="tech-item";
      div.innerHTML = `<div class="name"><b>${htmlesc(t.name)}</b></div>
        <div class="small">${htmlesc(t.overview)}</div>
        <div class="meta"><span class="pill">${htmlesc(t.duration||"")}</span></div>
        <div class="flex mt8"><button class="btn btn-ghost" data-add="${htmlesc(t.name)}">Inserir no plano</button>
        <button class="btn btn-ghost" data-view="${htmlesc(t.name)}">Ver detalhes</button></div>`;
      frag.appendChild(div);
    });
    el.catalog.innerHTML=""; el.catalog.appendChild(frag); updateSelCount();
  }
  function updateSelCount(){ el.selCount.textContent = `${state.selected.length}/3`; }
  function findTech(n){ return state.techniques.find(t=>(t.name||"").toLowerCase()===String(n||"").toLowerCase()); }
  function toggleSelect(n){
    const idx = state.selected.findIndex(x=>x.toLowerCase()===String(n).toLowerCase());
    if(idx>=0) state.selected.splice(idx,1); else { if(state.selected.length>=3){ alert("Máximo 3 técnicas."); return; } state.selected.push(n); }
    renderChips();
  }
  function renderChips(){
    const box=document.createElement("div"); box.className="flex"; box.style.flexWrap="wrap"; box.style.gap="8px";
    state.selected.forEach(nm=>{ const span=document.createElement("span"); span.className="badge"; span.innerHTML = `<b>${htmlesc(nm)}</b> <button class="btn btn-ghost" data-remove="${htmlesc(nm)}" style="padding:4px 8px;border-radius:999px">×</button>`; box.appendChild(span); });
    el.sugestoes.innerHTML=""; el.sugestoes.appendChild(box); updateSelCount();
  }

  function suggestFromComplaint(q){
    const s=String(q||"").toLowerCase();
    const out=[]; const push=(arr)=>arr.forEach(x=>{if(!out.includes(x)) out.push(x);});
    if(s.includes("ansiedad")) push(["Mindfulness – Atenção Plena","Aromaterapia","Auriculoterapia","Reiki usui tibetano nível 1 ao mestrado","Florais de bach","Cromoterapia"]);
    if(s.includes("insôni")||s.includes("insoni")) push(["Aromaterapia","Reiki usui tibetano nível 1 ao mestrado","Cromoterapia","Mindfulness – Atenção Plena"]);
    if(s.includes("dor")) push(["Ventosaterapia","Reflexologia Podal","Moxaterapia","Massagem com óleos essenciais","Fitoterapia"]);
    if(s.includes("estresse")) push(["Mindfulness – Atenção Plena","Cristaloterapia","Cromoterapia","Aromaterapia"]);
    if(s.includes("prosper")) push(["Cocriando Prosperidade","Radiestesia","Mesa Radiônica Universal","Soramig astral money reiki"]);
    if(s.includes("relacion")) push(["Ho’oponopono","Constelação com Mesa Radiônica","PNL – Programação Neurolinguística"]);
    if(out.length===0) push(["Mindfulness – Atenção Plena","Reiki usui tibetano nível 1 ao mestrado","Aromaterapia","Psicossomática","Radiestesia"]);
    return out.slice(0,6);
  }

  function onSuggest(){
    const picks = suggestFromComplaint(el.queixa.value||"");
    const box=document.createElement("div"); box.className="flex"; box.style.flexWrap="wrap"; box.style.gap="8px";
    picks.forEach(nm=>{ const b=document.createElement("button"); b.className="btn btn-ghost"; b.textContent=nm; b.addEventListener("click",()=>toggleSelect(nm)); box.appendChild(b); });
    el.sugestoes.innerHTML=""; el.sugestoes.appendChild(box);
  }

  function inferHidden(queixa, efeitos, intensidade){
    const s=(queixa||"").toLowerCase()+" "+(efeitos||"").toLowerCase();
    const H={ summary:"Queixa com impacto em rotinas; desequilíbrio entre regulação fisiológica e padrões cognitivo-emocionais.",
      hidden:"Controle/evitação nos bastidores mantêm ativação interna elevada e respostas automáticas.",
      hypotheses:["Hiperalerta com baixa variabilidade de estados.","Conflito segurança↔expansão.","Sintoma como tentativa de regulação."],
      home:["Respiração 4-4-6 (5×/dia).","Grounding 5-4-3-2-1 em gatilhos.","Registro 3 linhas: situação→sensação→micro-ação."]};
    if(s.includes("ansiedad")){ H.summary="Ansiedade com reatividade aumentada e ruminação."; H.hidden="Anticipação negativa; mente tenta controlar o incontrolável — corpo reage em alarme."; H.hypotheses=["Hiperativação simpática + catastrofização.","Evitação reforçando ciclo ansioso."]; H.home=["Respiração 4-4-6 (5 séries/dia).","Exposição interoceptiva leve + reaterramento.","Higiene do sono."]; }
    if(s.includes("dor")){ H.summary="Dor miofascial/funcional influenciada por estresse e postura."; H.hidden="Ciclo tensão→dor→proteção."; H.hypotheses=["Sensibilização periférica.","Falta de variação de movimento."]; H.home=["Auto-liberação 5–8 min/dia.","Pausa ativa 2×/dia.","Calor local 10 min."]; }
    if(intensidade>=8){ H.hidden += " Priorize estabilização e regulação antes de intervenções profundas."; H.hypotheses.push("Alta ativação neurovegetativa — intervir com gradiente."); }
    return H;
  }

  function buildPlan(selected){
    const names = selected.map(x=>x.toLowerCase()).join("|");
    let step = "Intervenção com técnica principal (12–20 min) + suporte secundário conforme resposta.";
    if(names.includes("pnl")) step="PNL: ancoragem + ressignificação + ensaio mental.";
    if(names.includes("auriculo")) step="Auriculoterapia: Shen Men, Rim, Ansiedade/Insônia + instrução de estímulo em casa.";
    if(names.includes("reiki")) step="Reiki: sequência por chakras; atenção a áreas hiporresponsivas.";
    if(names.includes("reflexologia")) step="Reflexologia: plexo solar → sistema-alvo → pontos sensíveis (6–8s).";
    return {
      steps:[
        "Estabilização: regulação do SNA (respiração 4-4-6, grounding) + contrato terapêutico.",
        step,
        "Integração: simbolização e ancoragem (registro, gesto-âncora, mantra).",
        "Follow-up: revisão de métricas (0–10), plano de 7 dias e ajustes finos."
      ]
    };
  }

  function generateReport(){
    const terapeuta=clean(el.terapeuta.value), cliente=clean(el.cliente.value);
    const nasc=parseDateFlex(el.nascimento.value), idade=nasc? (function(d){const n=new Date(); let a=n.getFullYear()-d.getFullYear(); if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate())) a--; return a;})(nasc):null;
    const intensidade = Math.max(0, Math.min(10, +(el.intensidade.value||0)));
    const queixa=clean(el.queixa.value), tempo=clean(el.tempo.value), efeitos=clean(el.efeitos.value), obs=clean(el.obs.value);
    if(!cliente || !queixa){ alert("Preencha pelo menos o nome do cliente e a queixa."); return; }
    if(state.selected.length===0){ alert("Selecione pelo menos 1 técnica (máximo 3)."); return; }
    const H = inferHidden(queixa, efeitos, intensidade);
    const plan = buildPlan(state.selected);

    const lines=[];
    lines.push(`<div class="block"><div class="spread"><h2>Relatório — Instituto Saber Consciente</h2><span class="small">${new Date().toLocaleString()}</span></div>
      <p><b>Terapeuta:</b> ${htmlesc(terapeuta||"—")} &nbsp; <b>Cliente:</b> ${htmlesc(cliente)} ${idade?`&nbsp; <b>(${idade} anos)</b>`:""} &nbsp; <b>Nasc.:</b> ${nasc? nasc.toLocaleDateString():"—"}</p>
      <p><b>Queixa:</b> ${htmlesc(queixa)} &nbsp; <b>Intensidade:</b> ${intensidade}/10 &nbsp; <b>Tempo:</b> ${htmlesc(tempo||"—")}</p>
      <p><b>Efeitos:</b> ${htmlesc(efeitos||"—")} &nbsp; <b>Obs.:</b> ${htmlesc(obs||"—")}</p></div>`);
    lines.push(`<div class="block"><h3>Síntese do Caso</h3><p>${htmlesc(H.summary)}</p><h3>O que está oculto no comportamento</h3><p>${htmlesc(H.hidden)}</p><h3>Hipótese Clínica-Energética</h3><ul>${H.hypotheses.map(x=>`<li>${htmlesc(x)}</li>`).join("")}</ul></div>`);
    lines.push(`<div class="block"><h3>Técnicas Selecionadas</h3>`);
    state.selected.forEach(nm=>{
      const t=findTech(nm); if(!t) return;
      lines.push(`<div class="hr"></div><p><b>${htmlesc(t.name)}</b></p><p>${htmlesc(t.overview)}</p>`);
      lines.push(`<p><b>Indicações:</b> ${htmlesc((t.indications||[]).join(", "))}</p>`);
      lines.push(`<p><b>Contraindicações (checar):</b></p><ul>${(t.contraindications||[]).map(c=>`<li>${htmlesc(c)}</li>`).join("")}</ul>`);
      lines.push(`<p><b>Protocolo Básico:</b></p><ol>${(t.protocol||[]).map(p=>`<li>${htmlesc(p)}</li>`).join("")}</ol>`);
      lines.push(`<p><b>Duração:</b> ${htmlesc(t.duration||"")} &nbsp; <b>Materiais:</b> ${htmlesc((t.materials||[]).join(", "))}</p>`);
    });
    lines.push(`</div>`);
    lines.push(`<div class="block"><h3>Plano de Intervenção (4 etapas)</h3><ol>${plan.steps.map(s=>`<li>${htmlesc(s)}</li>`).join("")}</ol></div>`);
    lines.push(`<div class="block"><h3>Ações para Casa (1 semana)</h3><ul>${H.home.map(x=>`<li>${htmlesc(x)}</li>`).join("")}</ul></div>`);
    el.report.innerHTML = lines.join("\n");
  }

  function onCatalogClick(e){
    const add=e.target.getAttribute("data-add"); const view=e.target.getAttribute("data-view"); const remove=e.target.getAttribute("data-remove");
    if(add){ toggleSelect(add); }
    if(view){ const t=findTech(view); if(!t) return; alert(strip(`<b>${t.name}</b>\n${t.overview}\nIndicações: ${(t.indications||[]).join(", ")}\nContraindicações: ${(t.contraindications||[]).join("; ")}\nProtocolo:\n- ${(t.protocol||[]).join("\n- ")}\nMateriais: ${(t.materials||[]).join(", ")}`)); }
    if(remove){ toggleSelect(remove); }
  }

  function init(){
    el.catalog.addEventListener("click", onCatalogClick);
    el.btnSugerir.addEventListener("click", onSuggest);
    el.btnLimpar.addEventListener("click", ()=>{state.selected=[]; renderChips();});
    el.btnGerar.addEventListener("click", generateReport);
    el.btnPrint.addEventListener("click", ()=>window.print());
    el.btnReset.addEventListener("click", ()=>{ el.report.innerHTML='<div class="notice">Relatório limpo. Preencha novamente.</div>'; state.selected=[]; renderChips(); window.scrollTo({top:0,behavior:"smooth"}); });
    el.btnCopiar.addEventListener("click", ()=>{ const txt=(strip(el.report.innerHTML)||"").replace(/\n{3,}/g,"\n\n"); navigator.clipboard.writeText(txt).then(()=>alert("Relatório copiado.")); });
    renderCatalog(); renderChips();
  }
  document.addEventListener("DOMContentLoaded", init);
})();

// ------- Minimal PDF writer (pure JS, multi-page text) -------
const PDF = (function(){
  function escapeText(s){ return String(s||"").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)"); }
  function wrap(text, max){ const words=String(text||"").split(/\s+/); const out=[]; let cur=""; for(const w of words){ if(!w) continue; if((cur?cur.length+1:0)+w.length>max){ if(cur) out.push(cur); cur=w; } else { cur=cur?cur+" "+w:w; } } if(cur) out.push(cur); return out; }
  function toLines(raw){ const paras=String(raw||"").replace(/\r\n/g,"\n").split("\n"); const L=[]; for(const p of paras){ if(!p.trim()){ L.push(""); continue; } L.push(...wrap(p.trim(),95)); } return L; }
  function encLen(s){ return new TextEncoder().encode(String(s)).length; }
  function gen(text){
    const W=595.28,H=841.89,M=36,FS=12,LH=14;
    const lines=toLines(text), maxLines=Math.floor((H-2*M)/LH);
    const pages=[]; for(let i=0;i<lines.length;i+=maxLines){ pages.push(lines.slice(i,i+maxLines)); } if(pages.length===0) pages.push(["(vazio)"]);
    let objs=[], ids=1, offs=[0];
    const add=o=>{ const s=ids+" 0 obj\n"+o+"\nendobj\n"; objs.push(s); return ids++; };
    const fontId=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const pageIds=[];
    for(const L of pages){
      let stream="BT\n/F1 "+FS+" Tf\n1 0 0 1 "+M+" "+(H-M)+" Tm\n";
      let first=true; for(const ln of L){ if(first){ stream+="("+escapeText(ln)+") Tj\n"; first=false; } else { stream+="0 -"+LH+" Td\n("+escapeText(ln)+") Tj\n"; } }
      stream+="ET";
      const cId=add("<< /Length "+encLen(stream)+" >>\nstream\n"+stream+"\nendstream");
      const pId=add("<< /Type /Page /Parent 0 0 R /MediaBox [0 0 "+W+" "+H+"] /Resources << /Font << /F1 "+fontId+" 0 R >> >> /Contents "+cId+" 0 R >>");
      pageIds.push(pId);
    }
    const kids=pageIds.map(i=>i+" 0 R").join(" ");
    const pagesId=add("<< /Type /Pages /Kids [ "+kids+" ] /Count "+pageIds.length+" >>");
    objs = objs.map(o=>o.replace("/Parent 0 0 R","/Parent "+pagesId+" 0 R"));
    const catalogId=add("<< /Type /Catalog /Pages "+pagesId+" 0 R >>");
    let pdf="%PDF-1.4\n"; for(const o of objs){ offs.push(encLen(pdf)); pdf+=o; }
    const xrefPos=encLen(pdf); let xref="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n"; for(let i=1;i<=objs.length;i++){ xref+=String(offs[i]).padStart(10,"0")+" 00000 n \n"; }
    const trailer="trailer\n<< /Size "+(objs.length+1)+" /Root "+catalogId+" 0 R >>\nstartxref\n"+xrefPos+"\n%%EOF";
    return pdf+xref+trailer;
  }
  function download(name,data){ const blob=new Blob([data],{type:"application/pdf"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
  return { generateAndDownload(name,text){ download(name, gen(text)); } };
})();

// Wire PDF button
document.addEventListener("DOMContentLoaded", function(){
  const btn=document.querySelector("#btnPDF");
  if(btn){
    btn.addEventListener("click", function(){
      const txt=(document.querySelector("#report")?.textContent||"").trim().replace(/\n{3,}/g,"\n\n");
      const name="Relatorio_Terapeuta_Holistico_"+(new Date()).toISOString().slice(0,10)+".pdf";
      try{ PDF.generateAndDownload(name, txt); }catch(e){ console.error(e); alert("Falha ao gerar PDF interno. Use Imprimir/Salvar PDF."); }
    });
  }
});
