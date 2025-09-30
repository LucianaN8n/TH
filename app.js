
(function(){
  "use strict";
  const $ = (s)=>document.querySelector(s);
  const el = {terapeuta:$("#terapeuta"),cliente:$("#cliente"),nascimento:$("#nascimento"),intensidade:$("#intensidade"),
              queixa:$("#queixa"),tempo:$("#tempo"),efeitos:$("#efeitos"),obs:$("#obs"),
              btnGerar:$("#btnGerar"),btnReset:$("#btnReset"),btnPDF:$("#btnPDF"),report:$("#report")};

  function clean(s){return String(s||"").trim();}
  function parseDate(v){if(!v)return "—";const d=v.replace(/\D/g,"");if(d.length===8){return d.slice(0,2)+"/"+d.slice(2,4)+"/"+d.slice(4);}return v;}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function hash(s){let h=2166136261>>>0; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i); h=(h*16777619)>>>0;} return h>>>0;}

  // Catalog (subset representativo das 60 técnicas, pode ser expandido)
  const CATS = {
    ansiedade: ["Mindfulness – Atenção Plena","Florais de bach","Auriculoterapia","Reiki usui tibetano nível 1 ao mestrado","Cromoterapia"],
    insonia: ["Aromaterapia","Meditação","Reiki usui tibetano nível 1 ao mestrado","Cromoterapia","Mindfulness – Atenção Plena"],
    dor: ["Reflexologia Podal","Ventosaterapia","Moxaterapia","Massagem com óleos essenciais","Fitoterapia"],
    digestivo: ["Psicossomática","Fitoterapia","Reflexologia Podal","Aromaterapia","Mindfulness – Atenção Plena"],
    prosperidade: ["Cocriando Prosperidade","Radiestesia","Mesa Radiônica Universal","Runas draconianas","Soramig astral money reiki"],
    relacionamento: ["Ho’oponopono","Constelação com Mesa Radiônica","PNL – Programação Neurolinguística","Florais de minas"],
    feminino: ["Reiki do Sagrado Feminino","Chakras","Ginecologia natural disponível","Cristaloterapia"],
    trauma: ["Apometria","Registros akáshicos","Reiki xamânico mahe’o nível 1 ao mestrado","Terapia dos sonhos"],
    espiritual: ["Reiki celestial","As 7 leis herméticas","Arcanjos de cura","Cortes Cármicos com Arcanjo Miguel","Magia das Velas"]
  };

  const KEYMAP = [
    {rx:/ansiedad|pânico|nervos/i, key:"ansiedade"},
    {rx:/insôni|insoni|sono|acordar/i, key:"insonia"},
    {rx:/dor|lombar|cervic|tens/i, key:"dor"},
    {rx:/gastrit|reflux|estôm|estom|digest/i, key:"digestivo"},
    {rx:/prosper|finan|dinhei|abund/i, key:"prosperidade"},
    {rx:/relacion|famí|casam|parceir|comunica/i, key:"relacionamento"},
    {rx:/femin|ciclo|tpm|menop/i, key:"feminino"},
    {rx:/trauma|abuso|luto|pesad/i, key:"trauma"},
    {rx:/espirit|fé|sutil|místico/i, key:"espiritual"}
  ];

  function chooseTechniques(ctxText){
    // Detect categories by keywords
    const cats=[];
    for(const k of KEYMAP){ if(k.rx.test(ctxText)) cats.push(k.key); }
    if(cats.length===0){ cats.push("ansiedade"); } // fallback razoável

    // Deterministic rotation based on case hash
    const h = hash(ctxText);
    const picks=[];
    for(const c of cats){
      const arr = CATS[c] || [];
      if(arr.length===0) continue;
      const start = h % arr.length;
      for(let i=0;i<arr.length && picks.length<3;i++){
        const t = arr[(start+i)%arr.length];
        if(!picks.includes(t)) picks.push(t);
      }
      if(picks.length>=3) break;
    }
    // Se ainda faltar, completa com outras categorias correlatas
    if(picks.length<3){
      for(const c of Object.keys(CATS)){
        for(const t of CATS[c]){
          if(picks.length>=3) break;
          if(!picks.includes(t)) picks.push(t);
        }
        if(picks.length>=3) break;
      }
    }
    return picks.slice(0,3);
  }

  function parecer(queixa, efeitos, intensidade){
    const q=(queixa+" "+efeitos).toLowerCase();
    let sintese = "Quadro com impacto funcional e variação autonômica; requer estabilização e integração mente-corpo.";
    let oculto = "Padrão de controle/evitação mantendo ativação interna e ciclos de tensão.";
    let criterio = "Priorizadas técnicas de regulação do SNA, liberação somática e reorganização de hábitos.";

    if(/insôni|insoni|sono/.test(q)){
      sintese = "Insônia associada a hiperalerta noturno; padrão ruminativo e dificuldade de desligamento.";
      oculto = "Ritual de sono inconsistente e condicionamento de alerta na hora de deitar.";
      criterio = "Intervir no eixo límbico-olfativo (aromas), reduzir excitação cortical (mindfulness) e harmonizar energia (reiki/aurículo).";
    } else if(/gastrit|reflux|estom|digest/.test(q)){
      sintese = "Sintomas gastrintestinais ligados a estresse e hipervigilância visceral (psicossomática).";
      oculto = "Somatização de preocupações no eixo estômago/plexo solar (MTC).";
      criterio = "Desativar resposta de ameaça, promover digestão parasimpática e redirecionar energia acumulada.";
    } else if(/dor|lombar|cervic|tens/.test(q)){
      sintese = "Dor miofascial/funcional com proteção muscular e baixa variabilidade de movimento.";
      oculto = "Ciclo tensão→dor→proteção, mantido por estresse e postura.";
      criterio = "Liberação mecânica suave + reflexos somatoautonômicos para alívio e reorganização.";
    } else if(/prosper|finan|dinhei|abund/.test(q)){
      sintese = "Bloqueios de prosperidade associados a crenças de merecimento e padrões transgeracionais.";
      oculto = "Autoimagem de escassez e contratos inconscientes com o sistema familiar.";
      criterio = "Alinhar campo de intenção, romper contratos limitantes e criar trilha de ações concretas.";
    } else if(/trauma|luto|abuso|pesad/.test(q)){
      sintese = "Resíduos traumáticos com disparos autonômicos e fragmentos imagéticos em intrusões.";
      oculto = "Memórias implícitas sem integração narrativa e ancoragem corporal frágil.";
      criterio = "Técnicas de estabilização, acesso controlado e integração simbólica segura.";
    }

    if(+intensidade>=8){
      criterio += " Devido à alta intensidade, aplicar progressão em camadas e ampliar suporte entre sessões.";
    }
    return {sintese, oculto, criterio};
  }

  function plano7diasDetalhado(tec){
    const [t1,t2,t3] = tec;
    return [
`Dia 1 — Sessão: acolhimento, métrica inicial (0–10), ${t1} em dose leve; Casa: respiração 4-4-6 (5 min) 3×/dia.`,
`Dia 2 — Sessão: revisão; ${t1} com leve progressão; Casa: ritual noturno (higiene do sono) + diário de sintomas.`,
`Dia 3 — Sessão: introdução de ${t2}; Casa: grounding 5-4-3-2-1 em gatilhos, 2× ao dia.`,
`Dia 4 — Sessão: ${t1}+${t2} integrados; Casa: observação de pensamentos automáticos (3 registros/dia).`,
`Dia 5 — Sessão: introdução de ${t3} se indicado; Casa: prática breve das três técnicas (10–15 min) conforme orientação.`,
`Dia 6 — Sessão: consolidação; Casa: visualização/oração/afirmação coerente com objetivo terapêutico.`,
`Dia 7 — Sessão: reavaliação (0–10), ajustar técnica mais responsiva; Casa: plano de continuidade de 2 semanas.`
    ].join("\n");
  }

  function gerar(){
    const terapeuta=clean(el.terapeuta.value), cliente=clean(el.cliente.value);
    const nasc=parseDate(el.nascimento.value), intensidade = clamp(+(el.intensidade.value||0),0,10);
    const queixa=clean(el.queixa.value), tempo=clean(el.tempo.value), efeitos=clean(el.efeitos.value), obs=clean(el.obs.value);
    if(!cliente||!queixa){ alert("Preencha pelo menos Cliente e Queixa."); return; }

    const ctx = (queixa+" "+efeitos+" "+obs).toLowerCase();
    const tec = chooseTechniques(ctx);
    const pr = parecer(queixa, efeitos, intensidade);

    const bloco = [
`Relatório — Instituto Saber Consciente`,
`Terapeuta: ${terapeuta||"—"}   Cliente: ${cliente}   Nasc.: ${nasc}`,
`Queixa: ${queixa}   Intensidade: ${intensidade}/10   Tempo: ${tempo}`,
`Efeitos: ${efeitos||"—"}   Obs.: ${obs||"—"}`,
"", "SÍNTESE DO CASO", pr.sintese,
"", "O QUE ESTÁ OCULTO", pr.oculto,
"", "CRITÉRIO DO GESTOR", pr.criterio,
"", "TÉCNICAS ESCOLHIDAS (máx. 3)",
`1) ${tec[0] || "—"}`,
`2) ${tec[1] || "—"}`,
`3) ${tec[2] || "—"}`,
"", "PLANO DE INTERVENÇÃO — 7 DIAS (Sessão vs. Casa)",
plano7diasDetalhado(tec),
"", "OBSERVAÇÕES DO GESTOR",
"Orientar hidratação, pausa ativa, e retorno imediato em caso de piora acentuada."
    ].join("\n");

    el.report.textContent = bloco;
  }

  // -------- PDF generator (WinAnsi via octal escapes, acentos OK) --------
  const PDF = (function(){
    // WinAnsi codes for Portuguese chars (subset)
    const MAP = {
      "á":0xe1,"à":0xe0,"â":0xe2,"ã":0xe3,"ä":0xe4,"Á":0xc1,"À":0xc0,"Â":0xc2,"Ã":0xc3,"Ä":0xc4,
      "é":0xe9,"è":0xe8,"ê":0xea,"É":0xc9,"È":0xc8,"Ê":0xca,
      "í":0xed,"ì":0xec,"Í":0xcd,"Ì":0xcc,
      "ó":0xf3,"ò":0xf2,"ô":0xf4,"õ":0xf5,"Ó":0xd3,"Ò":0xd2,"Ô":0xd4,"Õ":0xd5,
      "ú":0xfa,"ù":0xf9,"Ú":0xda,"Ù":0xd9,
      "ç":0xe7,"Ç":0xc7,"ñ":0xf1,"Ñ":0xd1,"ü":0xfc,"Ü":0xdc
    };
    function escapePDF(s){
      // Escape (), \ and convert non-ASCII to octal \ddd (WinAnsi)
      let out = "";
      for(const ch of String(s||"")){
        if(ch === "(") out += "\\(";
        else if(ch === ")") out += "\\)";
        else if(ch === "\\") out += "\\\\";
        else {
          const code = ch.charCodeAt(0);
          if(code>=32 && code<=126){
            out += ch;
          } else if(MAP[ch] !== undefined){
            const b = MAP[ch];
            const oct = "\\" + ((b>>6)&7).toString() + (((b>>3)&7).toString()) + ((b&7).toString());
            // ensure 3-digit octal
            const o3 = "\\" + ("00"+b.toString(8))[-3:];
            out += "\\" + ("00"+b.toString(8))[-3:]; // fixed 3 digits
          } else {
            // Fallback: replace with space
            out += " ";
          }
        }
      }
      return out;
    }
    function toLines(t){return String(t||"").split(/\n/);}
    function byteLenASCII(str){ return new TextEncoder().encode(str).length; } // ASCII only here
    function gen(txt){
      const W=595.28,H=841.89,M=36,FS=12,LH=14;
      const lines = toLines(txt), max = Math.floor((H-2*M)/LH);
      const pages=[]; for(let i=0;i<lines.length;i+=max){ pages.push(lines.slice(i,i+max)); }
      if(pages.length===0) pages.push(["(vazio)"]);
      const objects=[]; let objId=1;
      const offsets=[];
      function add(content){ const obj = `${objId} 0 obj\n${content}\nendobj\n`; objects.push(obj); objId++; }
      // Font
      add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); const fontId=1;
      // Pages
      const pageIds=[]; const contentIds=[];
      for(const L of pages){
        let stream = "BT\n/F1 "+FS+" Tf\n1 0 0 1 "+M+" "+(H-M)+" Tm\n";
        let first = true;
        for(const raw of L){
          const esc = escapePDF(raw);
          if(first){ stream += "("+esc+") Tj\n"; first=false; }
          else { stream += "0 -"+LH+" Td\n("+esc+") Tj\n"; }
        }
        stream += "ET";
        const content = f"<< /Length {byteLenASCII(stream)} >>\nstream\n{stream}\nendstream>"
      }
      return "TODO";
    }
    return { download(name,text){ /* replaced below after build */ } };
  })();

  // Build final PDF generator (string assembly safest in this context)
  const PDF2 = (function(){
    // reuse escapePDF from PDF (quick inline copy to avoid scope issues)
    const MAP = {"á":0xe1,"à":0xe0,"â":0xe2,"ã":0xe3,"ä":0xe4,"Á":0xc1,"À":0xc0,"Â":0xc2,"Ã":0xc3,"Ä":0xc4,"é":0xe9,"è":0xe8,"ê":0xea,"É":0xc9,"È":0xc8,"Ê":0xca,"í":0xed,"ì":0xec,"Í":0xcd,"Ì":0xcc,"ó":0xf3,"ò":0xf2,"ô":0xf4,"õ":0xf5,"Ó":0xd3,"Ò":0xd2,"Ô":0xd4,"Õ":0xd5,"ú":0xfa,"ù":0xf9,"Ú":0xda,"Ù":0xd9,"ç":0xe7,"Ç":0xc7,"ñ":0xf1,"Ñ":0xd1,"ü":0xfc,"Ü":0xdc};
    function esc(s){
      let out=""; for(const ch of String(s||"")){
        if(ch==="(") out+="\\(";
        else if(ch===")") out+="\\)";
        else if(ch==="\\") out+="\\\\";
        else {
          const code=ch.charCodeAt(0);
          if(code>=32 && code<=126){ out+=ch; }
          else if(MAP[ch]!==undefined){ out+="\\"+("00"+MAP[ch].toString(8)).slice(-3); }
          else { out+=" "; }
        }
      } return out;
    }
    function toLines(t){return String(t||"").split(/\n/);}
    function len(s){ return new TextEncoder().encode(String(s)).length; } // ASCII safe here
    function gen(txt){
      const W=595.28,H=841.89,M=36,FS=12,LH=14;
      const lines=toLines(txt), max=Math.floor((H-2*M)/LH);
      const pages=[]; for(let i=0;i<lines.length;i+=max){ pages.push(lines.slice(i,i+max)); }
      if(pages.length===0) pages.push(["(vazio)"]);
      let objs=[], id=1;
      const add=(c)=>{ const s=`${id} 0 obj\n${c}\nendobj\n`; objs.push(s); return id++; };
      const font=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
      const pageIds=[];
      for(const L of pages){
        let stream="BT\n/F1 "+FS+" Tf\n1 0 0 1 "+M+" "+(H-M)+" Tm\n";
        let first=true; for(const ln of L){ const e=esc(ln); if(first){ stream+="("+e+") Tj\n"; first=false; } else { stream+="0 -"+LH+" Td\n("+e+") Tj\n"; } }
        stream+="ET";
        const contentId=add("<< /Length "+len(stream)+" >>\nstream\n"+stream+"\nendstream");
        const pageId=add("<< /Type /Page /Parent 0 0 R /MediaBox [0 0 "+W+" "+H+"] /Resources << /Font << /F1 "+font+" 0 R >> >> /Contents "+contentId+" 0 R >>");
        pageIds.push(pageId);
      }
      const kids=pageIds.map(i=>i+" 0 R").join(" ");
      const pagesId=add("<< /Type /Pages /Kids [ "+kids+" ] /Count "+pageIds.length+" >>");
      objs=objs.map(o=>o.replace("/Parent 0 0 R","/Parent "+pagesId+" 0 R"));
      const catalog=add("<< /Type /Catalog /Pages "+pagesId+" 0 R >>");
      let pdf="%PDF-1.4\n"; const offs=[0];
      for(const o of objs){ const off=len(pdf); offs.push(off); pdf+=o; }
      const xref=len(pdf);
      let xr="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n";
      for(let i=1;i<=objs.length;i++){ xr+=String(offs[i]).padStart(10,"0")+" 00000 n \n"; }
      const trailer="trailer\n<< /Size "+(objs.length+1)+" /Root "+catalog+" 0 R >>\nstartxref\n"+xref+"\n%%EOF";
      return pdf+xr+trailer;
    }
    function dl(name,data){ const blob=new Blob([data],{type:"application/pdf"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
    return { download(name,text){ dl(name, gen(text)); } };
  })();

  document.addEventListener("DOMContentLoaded",()=>{
    el.btnGerar.addEventListener("click", gerar);
    el.btnReset.addEventListener("click", ()=>{ el.report.textContent=""; });
    el.btnPDF.addEventListener("click", ()=>{
      const txt = el.report.textContent || "";
      const name = "Relatorio_Gestor_"+(new Date()).toISOString().slice(0,10)+".pdf";
      PDF2.download(name, txt);
    });
  });
})();