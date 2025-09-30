
(function(){
  "use strict";
  const $ = (s)=>document.querySelector(s);
  const el = {terapeuta:$("#terapeuta"),cliente:$("#cliente"),nascimento:$("#nascimento"),intensidade:$("#intensidade"),
              queixa:$("#queixa"),tempo:$("#tempo"),efeitos:$("#efeitos"),obs:$("#obs"),
              btnGerar:$("#btnGerar"),btnReset:$("#btnReset"),btnPrint:$("#btnPrint"),btnPDF:$("#btnPDF"),report:$("#report")};

  function clean(s){return String(s||"").trim();}
  function parseDate(v){if(!v)return null;const d=v.replace(/\D/g,"");if(d.length==8){return d.slice(0,2)+"/"+d.slice(2,4)+"/"+d.slice(4);}return v;}

  function plano7dias(){
    return `Plano de Intervenção (7 dias)
Dia 1: Acolhimento, respiração 4-4-6 (5 min), introdução leve da técnica principal.
Dia 2: Reforço em casa, Aromaterapia noturna, registro diário dos sintomas.
Dia 3: Sessão de Auriculoterapia, grounding 5-4-3-2-1, observar redução da tensão.
Dia 4: Introdução de segunda técnica, exercício de observação de pensamentos automáticos.
Dia 5: Prática conjunta, registro de padrões emocionais/físicos, tarefa de auto-observação.
Dia 6: Visualização positiva guiada, Aromaterapia, exercício de gratidão.
Dia 7: Revisão geral dos sintomas, comparação intensidade inicial/final, ajustes.`;
  }

  function generateReport(){
    const terapeuta=clean(el.terapeuta.value),cliente=clean(el.cliente.value);
    const nasc=parseDate(el.nascimento.value),intensidade=clean(el.intensidade.value);
    const queixa=clean(el.queixa.value),tempo=clean(el.tempo.value),efeitos=clean(el.efeitos.value),obs=clean(el.obs.value);
    if(!cliente||!queixa){alert("Preencha Cliente e Queixa.");return;}
    let out=`Relatório — Instituto Saber Consciente\n`;
    out+=`Terapeuta: ${terapeuta||"—"}  Cliente: ${cliente}  Nasc.: ${nasc||"—"}\n`;
    out+=`Queixa: ${queixa}  Intensidade: ${intensidade}/10  Tempo: ${tempo}\n`;
    out+=`Efeitos: ${efeitos||"—"}  Obs.: ${obs||"—"}\n\n`;
    out+=`Síntese do caso: Desequilíbrio identificado, necessidade de estabilização e técnicas integrativas.\n\n`;
    out+=`Critério do Gestor: Técnicas escolhidas para reduzir ansiedade, melhorar energia e promover equilíbrio.\n\n`;
    out+=`Técnicas escolhidas:\n- Mindfulness (redução de ansiedade)\n- Aromaterapia (relaxamento)\n- Auriculoterapia (equilíbrio)\n\n`;
    out+=plano7dias();
    el.report.textContent=out;
  }

  // PDF generator with UTF-8
  const PDF=(function(){function esc(s){return String(s||"").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");}
    function toLines(t){return String(t||"").split(/\n/);}function len(s){return new TextEncoder().encode(String(s)).length;}
    function gen(txt){const W=595.28,H=841.89,M=36,FS=12,LH=14;const lines=toLines(txt),max=Math.floor((H-2*M)/LH);
      const pages=[];for(let i=0;i<lines.length;i+=max){pages.push(lines.slice(i,i+max));}
      if(pages.length===0)pages.push(["(vazio)"]);let objs=[],offs=[0],id=1;
      const add=o=>{const s=id+" 0 obj\n"+o+"\nendobj\n";objs.push(s);return id++;};
      const font=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),pids=[];
      for(const L of pages){let stream="BT\n/F1 "+FS+" Tf\n1 0 0 1 "+M+" "+(H-M)+" Tm\n";let first=true;
        for(const ln of L){if(first){stream+="("+esc(ln)+") Tj\n";first=false;}else{stream+="0 -"+LH+" Td\n("+esc(ln)+") Tj\n";}}stream+="ET";
          const cid=add("<< /Length "+len(stream)+" >>\nstream\n"+stream+"\nendstream");
          const pid=add("<< /Type /Page /Parent 0 0 R /MediaBox [0 0 "+W+" "+H+"] /Resources << /Font << /F1 "+font+" 0 R >> >> /Contents "+cid+" 0 R >>");pids.push(pid);}
      const kids=pids.map(i=>i+" 0 R").join(" ");const pagesId=add("<< /Type /Pages /Kids [ "+kids+" ] /Count "+pids.length+" >>");
      objs=objs.map(o=>o.replace("/Parent 0 0 R","/Parent "+pagesId+" 0 R"));const catalog=add("<< /Type /Catalog /Pages "+pagesId+" 0 R >>");
      let pdf="%PDF-1.4\n";for(const o of objs){offs.push(len(pdf));pdf+=o;}const xref=len(pdf);
      let xr="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n";for(let i=1;i<=objs.length;i++){xr+=String(offs[i]).padStart(10,"0")+" 00000 n \n";}
      return pdf+xr+"trailer\n<< /Size "+(objs.length+1)+" /Root "+catalog+" 0 R >>\nstartxref\n"+xref+"\n%%EOF";}
    function dl(n,d){const b=new Blob([d],{type:"application/pdf"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
    return {download:(n,t)=>dl(n,gen(t))};})();

  document.addEventListener("DOMContentLoaded",()=>{
    el.btnGerar.addEventListener("click",generateReport);
    el.btnReset.addEventListener("click",()=>{el.report.textContent="";});
    el.btnPrint.addEventListener("click",()=>window.print());
    el.btnPDF.addEventListener("click",()=>{const txt=el.report.textContent;const name="Relatorio_Gestor_"+(new Date()).toISOString().slice(0,10)+".pdf";PDF.download(name,txt);});
  });
})();