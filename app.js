
(function(){
  "use strict";
  const $ = (s)=>document.querySelector(s);
  const el = {
    terapeuta: $("#terapeuta"), cliente: $("#cliente"), nascimento: $("#nascimento"),
    intensidade: $("#intensidade"), queixa: $("#queixa"), tempo: $("#tempo"),
    efeitos: $("#efeitos"), obs: $("#obs"),
    btnGerar: $("#btnGerar"), btnReset: $("#btnReset"),
    btnPrint: $("#btnPrint"), btnPDF: $("#btnPDF"), btnCopiar: $("#btnCopiar"),
    report: $("#report")
  };
  const DB = (window.__TECHNIQUES__||[]);

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
    const dt=new Date(y,m-1,d); if(dt && dt.getMonth()===(m-1) && dt.getDate()===d) return dt; return null;
  }
  function age(dt){ if(!dt) return null; const n=new Date(); let a=n.getFullYear()-dt.getFullYear(); if(n.getMonth()<dt.getMonth()||(n.getMonth()===dt.getMonth()&&n.getDate()<dt.getDate())) a--; return a; }
  function strip(html){ const t=document.createElement("div"); t.innerHTML=html; return t.textContent||t.innerText||""; }

  // --- Mapeamento do Gestor (rules → técnicas)
  const RULES = [
    {k:/ansiedad/i, picks:["Mindfulness – Atenção Plena","Aromaterapia","Auriculoterapia"], why:(ctx)=>`Reduzem hiperalerta, criam ancoragem corporal e interrompem ruminação (${ctx}).`, how:[
      "Mindfulness: 3 ciclos/dia de 5 min (respiração âncora + body scan curto).",
      "Aromaterapia: inalação 3×/dia de nota calmante (ex.: lavanda 1–2 gotas em lenço).",
      "Auriculoterapia: pontos Shen Men / Ansiedade; instruir estímulo leve 3× ao dia."
    ]},
    {k:/insôni|insoni/i, picks:["Aromaterapia","Reiki usui tibetano nível 1 ao mestrado","Cromoterapia"], why:(ctx)=>`Reorganizam ritmo sono-vigília e baixam ativação noturna (${ctx}).`, how:[
      "Aromaterapia noturna: difusor 30–60 min antes de dormir.",
      "Reiki: sequência por chakras com ênfase em plexo solar e cardíaco.",
      "Cromoterapia: azul suave no ambiente 15 min antes do sono."
    ]},
    {k:/dor|lombar|cervic|múscul|tensão/i, picks:["Ventosaterapia","Reflexologia Podal","Moxaterapia"], why:(ctx)=>`Desfazem ciclo tensão→dor→proteção e melhoram perfusão (${ctx}).`, how:[
      "Ventosaterapia: estáticas/deslizantes 5–8 min em paravertebrais.",
      "Reflexologia: plexo solar → coluna → pontos dolorosos (pressão 6–8s).",
      "Moxa: 3×30s em pontos escolhidos; monitorar sensação térmica."
    ]},
    {k:/prosper|finance|dinhei/i, picks:["Cocriando Prosperidade","Radiestesia","Mesa Radiônica Universal"], why:(ctx)=>`Atuam em crenças-raiz e sintonia do campo de abundância (${ctx}).`, how:[
      "Cocriar Prosperidade: ritual diário de gratidão+micro-oferta de valor.",
      "Radiestesia: leitura e harmonização de bloqueios do campo.",
      "Mesa Radiônica: tema objetivo e autorização consciente do cliente."
    ]},
    {k:/relacion|famíli|casament|amor/i, picks:["Ho’oponopono","Constelação com Mesa Radiônica","PNL – Programação Neurolinguística"], why:(ctx)=>`Resignificam vínculos e padrões de comunicação (${ctx}).`, how:[
      "Ho’oponopono guiado 5–10 min/dia.",
      "Constelação via Mesa Radiônica: mapa de vínculos e movimentos do sistema.",
      "PNL: ancoragem de recurso + ensaio mental para conversas difíceis."
    ]},
    {k:/gastrit|psicossom|estômago|pele|enxaquec/i, picks:["Psicossomática","Mindfulness – Atenção Plena","Aromaterapia"], why:(ctx)=>`Integram mente-corpo e modulam reatividade autonômica (${ctx}).`, how:[
      "Psicossomática: mapa sintoma↔emoção↔relação.",
      "Mindfulness pós-refeição: 3 min de respiração diafragmática.",
      "Aromaterapia digestiva suave tópico (diluído) se não houver contraindicação."
    ]},
    {k:/femin|ciclo|tpm|autocuidado/i, picks:["Reiki do Sagrado Feminino","Chakras","Ginecologia natural disponível"], why:(ctx)=>`Regulação de ciclos, autoestima e vitalidade (${ctx}).`, how:[
      "Reiki do Sagrado Feminino: foco em sacral e cardíaco.",
      "Chakras: alinhamento semanal com cristais de apoio.",
      "Ginecologia natural: orientações seguras de autocuidado."
    ]},
  ];

  function chooseByGestor(ctxText){
    const hits = [];
    for(const rule of RULES){
      if(rule.k.test(ctxText)){
        hits.push(rule);
      }
    }
    // fallback
    if(hits.length===0){
      return { picks:["Mindfulness – Atenção Plena","Reiki usui tibetano nível 1 ao mestrado","Psicossomática"], why:"Caso genérico: estabilização do SNA + integração mente-corpo.", how:[
        "Mindfulness diário 5 min.",
        "Reiki por chakras 15–20 min.",
        "Psicossomática: simbolização do sintoma e contrato de mudança."
      ]};
    }
    // Prioriza a primeira regra que bateu (mais específica) e limita a 3 técnicas
    const r = hits[0];
    return { picks: r.picks.slice(0,3), why: r.why(ctxText), how: r.how.slice(0,3) };
  }

  function generateReport(){
    const terapeuta=clean(el.terapeuta.value), cliente=clean(el.cliente.value);
    const nasc=parseDateFlex(el.nascimento.value), idadeVal = nasc? age(nasc): null;
    const intensidade = clamp(+(el.intensidade.value||0),0,10);
    const queixa=clean(el.queixa.value), tempo=clean(el.tempo.value), efeitos=clean(el.efeitos.value), obs=clean(el.obs.value);
    if(!cliente || !queixa){ alert("Preencha pelo menos o nome do cliente e a queixa."); return; }

    const ctx = (queixa+" "+efeitos+" "+obs).toLowerCase();
    const choice = chooseByGestor(ctx);

    const linhas=[];
    linhas.push(`<div class="notice">Técnicas definidas automaticamente pelo <b>Gestor</b> a partir da anamnese (máx. 3).</div>`);
    linhas.push(`<h2>Relatório — Instituto Saber Consciente</h2><p><b>Terapeuta:</b> ${htmlesc(terapeuta||"—")} &nbsp; <b>Cliente:</b> ${htmlesc(cliente)} ${idadeVal?`&nbsp;<b>(${idadeVal} anos)</b>`:""} &nbsp; <b>Nasc.:</b> ${nasc? nasc.toLocaleDateString():"—"}</p>`);
    linhas.push(`<p><b>Queixa:</b> ${htmlesc(queixa)} &nbsp; <b>Intensidade:</b> ${intensidade}/10 &nbsp; <b>Tempo:</b> ${htmlesc(tempo||"—")}</p>`);
    linhas.push(`<p><b>Efeitos:</b> ${htmlesc(efeitos||"—")} &nbsp; <b>Obs.:</b> ${htmlesc(obs||"—")}</p>`);
    linhas.push(`<div class="hr"></div>`);

    // Síntese e hipótese
    const sint = intensidade>=8 ? "Alta carga emocional/fisiológica — iniciar por estabilização e progressão segura." :
                "Desequilíbrio moderado — combinar regulação autonômica e intervenção focal.";
    linhas.push(`<h3>Síntese do caso</h3><p>${htmlesc(sint)}</p>`);
    linhas.push(`<h3>Critério do Gestor</h3><p>${htmlesc(choice.why)}</p>`);

    // Técnicas (detalhar como usar e por quê)
    linhas.push(`<h3>Técnicas indicadas (até 3)</h3>`);
    choice.picks.slice(0,3).forEach((nm, i)=>{
      const t = DB.find(x => (x.name||"").toLowerCase() === nm.toLowerCase()) || {name:nm, overview:""};
      const como = choice.how[i] || "Aplicação conforme protocolo padrão, com monitoramento de resposta.";
      linhas.push(`<p><b>${htmlesc(t.name)}</b><br>${htmlesc(t.overview)}</p>`);
      linhas.push(`<p><b>Como usar:</b> ${htmlesc(como)}</p>`);
      linhas.push(`<p><b>Por que nesta sessão:</b> ${htmlesc(choice.why)}</p>`);
      if(i < choice.picks.length-1) linhas.push(`<div class="hr"></div>`);
    });

    // Plano
    linhas.push(`<h3>Plano de intervenção (7 dias)</h3><ol>
      <li>Estabilização diária (respiração 4-4-6 + grounding 5-4-3-2-1).</li>
      <li>Aplicação das técnicas conforme orientado, registrando intensidade (0–10) antes/depois.</li>
      <li>Integração com registro de padrões e micro-ações.</li>
      <li>Revisão em 7 dias para ajuste fino.</li>
    </ol>`);

    el.report.innerHTML = linhas.join("\n");
  }

  // PDF (vendorizado, sem eval)
  const PDF = (function(){
    function esc(s){return String(s||"").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");}
    function wrap(t,max){const w=String(t||"").split(/\s+/),o=[];let c="";for(const x of w){if(!x)continue;if((c?c.length+1:0)+x.length>max){if(c)o.push(c);c=x;}else{c=c?c+" "+x:x;}}if(c)o.push(c);return o;}
    function toLines(r){const p=String(r||"").replace(/\r\n/g,"\n").split("\n"),L=[];for(const x of p){if(!x.trim()){L.push("");continue}L.push(...wrap(x.trim(),95))}return L;}
    function len(s){return new TextEncoder().encode(String(s)).length;}
    function gen(text){const W=595.28,H=841.89,M=36,FS=12,LH=14;const lines=toLines(text),max=Math.floor((H-2*M)/LH);
      const pages=[];for(let i=0;i<lines.length;i+=max){pages.push(lines.slice(i,i+max))}if(pages.length===0)pages.push(["(vazio)"]);
      let objs=[], offs=[0], id=1; const add=o=>{const s=id+" 0 obj\n"+o+"\nendobj\n";objs.push(s);return id++};
      const font=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); const pids=[];
      for(const L of pages){let stream="BT\n/F1 "+FS+" Tf\n1 0 0 1 "+M+" "+(H-M)+" Tm\n";let first=true;for(const ln of L){if(first){stream+="("+esc(ln)+") Tj\n";first=false;}else{stream+="0 -"+LH+" Td\n("+esc(ln)+") Tj\n";}}stream+="ET";
        const cid=add("<< /Length "+len(stream)+" >>\nstream\n"+stream+"\nendstream");
        const pid=add("<< /Type /Page /Parent 0 0 R /MediaBox [0 0 "+W+" "+H+"] /Resources << /Font << /F1 "+font+" 0 R >> >> /Contents "+cid+" 0 R >>"); pids.push(pid);}
      const kids=pids.map(i=>i+" 0 R").join(" "); const pagesId=add("<< /Type /Pages /Kids [ "+kids+" ] /Count "+pids.length+" >>");
      objs=objs.map(o=>o.replace("/Parent 0 0 R","/Parent "+pagesId+" 0 R")); const catalog=add("<< /Type /Catalog /Pages "+pagesId+" 0 R >>");
      let pdf="%PDF-1.4\n"; for(const o of objs){offs.push(len(pdf)); pdf+=o;} const xref=len(pdf);
      let xr="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n"; for(let i=1;i<=objs.length;i++){xr+=String(offs[i]).padStart(10,"0")+" 00000 n \n";}
      const tr="trailer\n<< /Size "+(objs.length+1)+" /Root "+catalog+" 0 R >>\nstartxref\n"+xref+"\n%%EOF"; return pdf+xr+tr;}
    function dl(name,data){const b=new Blob([data],{type:"application/pdf"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
    return {download(name,text){dl(name,gen(text))}};
  })();

  // Binds
  document.addEventListener("DOMContentLoaded", function(){
    el.btnGerar.addEventListener("click", generateReport);
    el.btnReset.addEventListener("click", ()=>{ el.report.innerHTML='<div class="notice">O parecer aparecerá aqui.</div>'; });
    el.btnPrint.addEventListener("click", ()=>window.print());
    el.btnCopiar.addEventListener("click", ()=>{ const t=(strip(el.report.innerHTML)||"").replace(/\n{3,}/g,"\n\n"); navigator.clipboard.writeText(t).then(()=>alert("Relatório copiado.")); });
    el.btnPDF.addEventListener("click", ()=>{
      const txt=(document.querySelector("#report")?.textContent||"").trim().replace(/\n{3,}/g,"\n\n");
      const name="Relatorio_TH60_Gestor_"+(new Date()).toISOString().slice(0,10)+".pdf";
      try{ PDF.download(name, txt); }catch(e){ console.error(e); alert("Falha ao gerar PDF interno. Use Imprimir/Salvar PDF."); }
    });
  });
})();