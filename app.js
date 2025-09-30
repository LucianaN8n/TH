(function(){
  "use strict";

  // -------------------- Refs / Helpers --------------------
  const $ = (s)=>document.querySelector(s);
  const el = {
    terapeuta: $("#terapeuta"), cliente: $("#cliente"), nascimento: $("#nascimento"),
    intensidade: $("#intensidade"), queixa: $("#queixa"), tempo: $("#tempo"),
    efeitos: $("#efeitos"), modo: $("#modo"),
    btnGerar: $("#btnGerar"), btnReset: $("#btnReset"), btnPDF: $("#btnPDF"),
    report: $("#report"),
    btnSalvarModelo: $("#btnSalvarModelo"), selModelos: $("#selModelos"),
    btnCSV: $("#btnCSV")
  };
  const must=(x)=>String(x||"").trim();
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  function parseDateFlex(v){
    if(!v) return "—";
    const d=String(v).replace(/\D+/g,"");
    if(d.length===8) return d.slice(0,2)+"/"+d.slice(2,4)+"/"+d.slice(4);
    if(d.length===6){ let yy=+d.slice(4); yy+= yy<=29?2000:1900; return d.slice(0,2)+"/"+d.slice(2,4)+"/"+yy; }
    const m=String(v).match(/(\d{1,2}).*?(\d{1,2}).*?(\d{2,4})/);
    if(m){ let yy=+m[3]; if(yy<100) yy+= yy<=29?2000:1900; return `${m[1].padStart(2,"0")}/${m[2].padStart(2,"0")}/${yy}`; }
    return v;
  }
  const normalizeAscii=(s)=>String(s||"").replace(/[“”„]/g,'"').replace(/[‘’]/g,"'").replace(/–|—/g,"-");

  // -------------------- Catálogo / Regras --------------------
  const CAT = {
    ansiedade:["Mindfulness – Atenção Plena","Florais de bach","Auriculoterapia","Reiki usui tibetano nível 1 ao mestrado","Cromoterapia","PNL – Programação Neurolinguística","Ho’oponopono","Chakras"],
    insonia:["Aromaterapia","Meditação","Reiki usui tibetano nível 1 ao mestrado","Cromoterapia","Mindfulness – Atenção Plena","Florais de bach"],
    dor:["Reflexologia Podal","Ventosaterapia","Moxaterapia","Massagem com óleos essenciais","Fitoterapia","Biomagnetismo","Cristaloterapia"],
    digestivo:["Psicossomática","Fitoterapia","Reflexologia Podal","Aromaterapia","Mindfulness – Atenção Plena","Cromoterapia"],
    cefaleia:["Auriculoterapia","Cromoterapia","Reflexologia Podal","Reiki usui tibetano nível 1 ao mestrado","Cristaloterapia"],
    depressao:["Florais de bach","Mindfulness – Atenção Plena","PNL – Programação Neurolinguística","Reiki usui tibetano nível 1 ao mestrado","Crenças limitantes","Ho’oponopono"],
    prosperidade:["Cocriando Prosperidade","Radiestesia","Mesa Radiônica Universal","Runas draconianas","Soramig astral money reiki","Constelação com Mesa Radiônica"],
    relacionamento:["Ho’oponopono","Constelação com Mesa Radiônica","PNL – Programação Neurolinguística","Florais de minas","Registros akáshicos"],
    feminino:["Reiki do Sagrado Feminino","Chakras","Ginecologia natural disponível","Cristaloterapia","Florais de minas"],
    trauma:["Apometria","Registros akáshicos","Reiki xamânico mahe’o nível 1 ao mestrado","Terapia dos sonhos","Mesa Apométrica"],
    espiritual:["Reiki celestial","As 7 leis herméticas","Arcanjos de cura","Cortes Cármicos com Arcanjo Miguel","Magia das Velas","Magia dos Nós"],
    energia_limpeza:["Limpeza energética","Radiestesia","Mesa Radiônica Universal","Cromoterapia","Magia das Velas"],
    estudos_foco:["PNL – Programação Neurolinguística","Mindfulness – Atenção Plena","Chakras","Cristaloterapia"],
    projeção:["Projeção Astral","Leitura da Alma","Registros akáshicos","Anjos de Cura"]
  };
  const CORPORAIS = new Set(["Reflexologia Podal","Ventosaterapia","Moxaterapia","Massagem com óleos essenciais","Auriculoterapia"]);

  const KEYMAP = [
    {rx:/ansiedad|p[aâ]nico|nervos|agita[cç][aã]o/i, key:"ansiedade"},
    {rx:/ins[oô]ni|insoni|sono|acordar/i, key:"insonia"},
    {rx:/dor|lombar|cervic|tens|m[uú]sc|costas|ombro/i, key:"dor"},
    {rx:/gastrit|reflux|est[oô]m|digest|azia|n[aá]usea|c[oó]lica/i, key:"digestivo"},
    {rx:/cefale|enxaquec|cabe[çc]a/i, key:"cefaleia"},
    {rx:/depress|apatia|anhedoni|tristeza/i, key:"depressao"},
    {rx:/prosper|finan|dinhei|abund/i, key:"prosperidade"},
    {rx:/relacion|fam[ií]l|casam|parceir|comunica/i, key:"relacionamento"},
    {rx:/femin|ciclo|tpm|menop|fertilidade/i, key:"feminino"},
    {rx:/trauma|luto|abuso|pesad|p[óo]s-traum/i, key:"trauma"},
    {rx:/espirit|f[eé]|sutil|m[ií]stic/i, key:"espiritual"},
    {rx:/limpeza|miasma|obsess/i, key:"energia_limpeza"},
    {rx:/foco|estudo|aten[cç][aã]o|concentra/i, key:"estudos_foco"},
    {rx:/proje[cç][aã]o|astral|alma/i, key:"projeção"},
    {rx:/rinite|sinus|congest/i, key:"rinite"}
  };

  function hash(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h*16777619)>>>0;}return h>>>0;}

  function chooseTechniques(ctxText, modo){
    const cats=[]; for(const k of KEYMAP) if(k.rx.test(ctxText)) cats.push(k.key);
    if(cats.length===0) cats.push("ansiedade");
    const h=hash(ctxText), picks=[];
    for(const c of cats){
      const pool = (CAT[c]||CAT.ansiedade||[]).filter(t=> modo==="online" ? !CORPORAIS.has(t) : true);
      const start = pool.length ? h % pool.length : 0;
      for(let i=0;i<pool.length && picks.length<3;i++){
        const t=pool[(start+i)%pool.length]; if(t && !picks.includes(t)) picks.push(t);
      }
      if(picks.length>=3) break;
    }
    if(picks.length<3){
      for(const c in CAT){ for(const t of CAT[c]){
        if(modo==="online" && CORPORAIS.has(t)) continue;
        if(picks.length>=3) break; if(!picks.includes(t)) picks.push(t);
      } if(picks.length>=3) break; }
    }
    return picks.slice(0,3);
  }

  // ---------- Aromaterapia turbinada
  function aromaterapiaBlend(ctx){
    if(/ins[oô]ni|insoni|sono/.test(ctx)) return {blend:"Lavanda 3gts + Bergamota 2gts + Camomila-romana 1gt", posologia:"Difusor 30–45 min antes de deitar (3–6 gts/200 mL). Inalação 2 respirações em picos.", cuidados:"Cítricos fotossensíveis na pele; dose baixa em gestantes/crianças."};
    if(/ansiedad|p[aâ]nico|nervos/.test(ctx)) return {blend:"Lavanda 3gts + Laranja-doce 2gts + Vetiver 1gt", posologia:"Difusor 20–30 min 2×/dia; inalação 2–3 respirações.", cuidados:"Vetiver é denso (1 gt). Evite dirigir se ficar sonolento."};
    if(/cefale|enxaquec|cabe[çc]a/.test(ctx)) return {blend:"Hortelã-pimenta 1gt + Lavanda 2gts + Manjerona 1gt (em 10 mL óleo vegetal)", posologia:"Aplicar pouca quantidade na nuca/templos 1–2×/dia; evitar olhos.", cuidados:"Evitar hortelã em <6 anos, gestantes e epilépticos."};
    if(/gastrit|reflux|est[oô]m|digest|azia|n[aá]usea|c[oó]lica/.test(ctx)) return {blend:"Camomila-alemã 2gts + Erva-doce 2gts + Gengibre 1gt (em 20 mL OV)", posologia:"Massagem no abdome sentido horário 1–2×/dia 3–5 min; difusor Lavanda 3–4 gts à noite.", cuidados:"Evitar hortelã em refluxo ativo; gengibre é aquecedor."};
    if(/tpm|c[oó]licas? menstruais|femin|menop/.test(ctx)) return {blend:"Gerânio 2gts + Lavanda 2gts + Sálvia-esclareia 1gt", posologia:"Difusor 20–30 min/dia; tópico em abdome baixo: 3 gts em 10 mL OV, 1–2×/dia.", cuidados:"Sálvia-esclareia: evitar na gestação."};
    if(/rinite|sinus|congest/.test(ctx)) return {blend:"Eucalipto globulus 1gt + Tea tree 1gt + Lavanda 2gts + Limão 1gt", posologia:"Difusor 15–20 min, 2×/dia. Inalação a vapor suave (1–2 gts em bacia quente).", cuidados:"Limão fotossensível na pele; evitar eucalipto em <6 anos."};
    if(/foco|estudo|aten[cç][aã]o|concentra/.test(ctx)) return {blend:"Alecrim qt. cineol 1gt + Hortelã-pimenta 1gt + Laranja-doce 2gts", posologia:"Difusor durante estudo por 20 min. Inalação pontual antes de tarefas.", cuidados:"Alecrim e hortelã: evitar em gestantes/hipertensos/epilépticos."};
    if(/tristeza|des[aâ]nimo|apatia/.test(ctx)) return {blend:"Laranja-doce 2gts + Bergamota 2gts + Olíbano 1gt", posologia:"Difusor manhã/tarde 15–20 min; inalação breve em momentos de queda.", cuidados:"Cítricos fotossensíveis na pele; usar em ambiente ventilado."};
    return {blend:"Lavanda 3gts + Laranja-doce 2gts", posologia:"Difusor 20–30 min 1–2×/dia.", cuidados:"Cítricos na pele + sol não."};
  }

  function parecerDetalhado(queixa, efeitos, intensidade){
    const q=(queixa+" "+efeitos).toLowerCase();
    let sint="Quadro com impacto funcional e oscilação autonômica; pede estabilização e integração mente–corpo.";
    let oculto="Padrão de controle/evitação mantém ativação interna e ciclos de tensão.";
    let crit="Regulação do SNA, liberação somática e reorganização de hábitos.";
    let sinais=["Redução da escala 0–10","Sono/energia melhores","Menos tensão regional"];
    if(/ins[oô]ni|insoni|sono/.test(q)){sint="Insônia com hiperalerta noturno e ruminação."; oculto="Ritual de sono inconsistente e condicionamento de alerta."; crit="Aromaterapia límbica, mindfulness e harmonização energética."; sinais=["Latência menor","Menos despertares","Mais descanso"]; }
    else if(/gastrit|reflux|est[oô]m|digest|azia|n[aá]usea|c[oó]lica/.test(q)){sint="Sintomas GI por estresse/hipervigilância visceral."; oculto="Somatização de preocupações no estômago."; crit="Desativar ameaça, favorecer digestão parasimpática."; sinais=["Menos azia","Conforto pós-refeição","Menos dor abdominal"]; }
    else if(/dor|lombar|cervic|tens|m[uú]sc|costas|ombro/.test(q)){sint="Dor miofascial com proteção muscular."; oculto="Ciclo tensão→dor→proteção."; crit="Liberação mecânica suave + reflexos somatoautonômicos."; sinais=["Mais ADM","Menos dor ao fim do dia","Sono melhor"]; }
    else if(/depress|apatia|anhedoni|tristeza/.test(q)){sint="Humor deprimido/baixo com pouca motivação."; oculto="Narrativa autocrítica mantém evitação."; crit="Ritmos, simbolização (floral/PNL) e pequenos ganhos."; sinais=["Mais interesse","Rotina estável","Auto-relatos positivos"]; }
    if(+intensidade>=8) crit += " Intensidade elevada: progredir devagar e aumentar grounding/suporte.";
    return {sintese:sint, oculto, criterio:crit, sinais};
  }

  function checklist(ctx,intensidade){
    const C=[];
    if(/gestant|gravidez|gr[áa]vida/.test(ctx)) C.push("Gestante: evitar ventosas/moxa; dose baixa em aromaterapia; fitoterapia apenas segura.");
    if(/hipertens|press[aã]o alta/.test(ctx)) C.push("Hipertensão: cautela com ventosas fortes e óleos estimulantes (alecrim).");
    if(/anticoag|varfarin|clopidogrel/.test(ctx)) C.push("Anticoagulante: evitar ventosas/massagens vigorosas; atenção a fitoterápicos que alteram coagulação.");
    if(/fluoxetina|sertralin|escitalopram|paroxetin|isrs/.test(ctx)) C.push("ISRS (ex.: fluoxetina): evitar Erva-de-São-João; aromaterapia suave ok.");
    if(/benzodiaz|diazep|clonazepam|alprazolam/.test(ctx)) C.push("Benzodiazepínicos: evitar sedativos acumulativos; priorizar técnicas não-farmacológicas.");
    if(/dermatit|ferida|les[aã]o cut/.test(ctx)) C.push("Lesão/pele sensível: evitar irritantes e ventosas na área.");
    if(/epileps/.test(ctx)) C.push("Epilepsia: evitar estímulos luminosos intensos; aromaterapia sem alecrim.");
    if(intensidade>=8) C.push("Queixa ≥8/10: reduzir carga, fracionar, aumentar grounding/ancoragens.");
    if(C.length===0) C.push("Sem alertas críticos informados; manter bom senso clínico e consentimento.");
    return C;
  }

  function comoPorQue(nome, ctx){
    const base={como:"Aplicação progressiva com monitoramento.", porque:"Favorece regulação autonômica e integração corpo–mente."};
    const A=aromaterapiaBlend(ctx);
    const map={
      "Mindfulness – Atenção Plena":{como:"3 blocos/dia (5–8 min): respiração diafragmática + ancoragem sensorial; 1 sessão guiada/semana.", porque:"Reduz hiperalerta e ruminação."},
      "Meditação":{como:"10–12 min/dia guiada (relaxamento/sono).", porque:"Desacelera a mente e melhora latência do sono."},
      "Aromaterapia":{como:`Sinergia: ${A.blend}. ${A.posologia}`, porque:`Cuidados: ${A.cuidados}`},
      "Auriculoterapia":{como:"Shen Men / Rim / Ansiedade; estímulo 3×/dia por 30–60s.", porque:"Equilíbrio neuroenergético e redução de picos."},
      "Reflexologia Podal":{como:"Plexo solar → sistema-alvo → pontos dolorosos (6–8s) por 12–18 min.", porque:"Reflexos somatoautonômicos aliviam dor."},
      "Ventosaterapia":{como:"Cups estáticas/deslizantes 5–8 min.", porque:"Libera fáscia e reduz tensão protetiva."},
      "Moxaterapia":{como:"20–30s por ponto, 3 repetições.", porque:"Aquece e dinamiza fluxo energético."},
      "Massagem com óleos essenciais":{como:"Deslizamentos leves 15–25 min; diluição 1–2%.", porque:"Libera tensão e regula SNA."},
      "Fitoterapia":{como:"Infusões leves: camomila/passiflora à noite; checar interações.", porque:"Suporte fisiológico suave."},
      "Florais de bach":{como:"Fórmula personalizada 4×/dia (4 gotas) por 21 dias.", porque:"Trabalha núcleos emocionais com suavidade."},
      "PNL – Programação Neurolinguística":{como:"Submodalidades + ancoragem + ensaio mental.", porque:"Reprograma respostas automáticas."}
    };
    return map[nome] || base;
  }

  function plano7(tec){
    const [t1,t2,t3]=tec;
    return [
      `Dia 1 — Sessão: acolhimento, métrica 0–10, ${t1} leve;  Casa: respiração 4-4-6 (3×/dia, 5 min).`,
      `Dia 2 — Sessão: ${t1} com progressão;                      Casa: ritual noturno + diário (3 linhas).`,
      `Dia 3 — Sessão: introdução de ${t2};                       Casa: grounding 5-4-3-2-1 (2×/dia).`,
      `Dia 4 — Sessão: ${t1}+${t2} integrados;                    Casa: registrar pensamentos automáticos (3).`,
      `Dia 5 — Sessão: introdução de ${t3||"reforço do t1/t2"};    Casa: prática combinada 10–15 min.`,
      `Dia 6 — Sessão: consolidação + simbolização;               Casa: visualização/afirmação alinhada.`,
      `Dia 7 — Sessão: reavaliação 0–10 e ajustes;                Casa: plano de continuidade (2 semanas).`
    ].join("\n");
  }

  function montarRelatorio(){
    const terapeuta=must(el.terapeuta.value), cliente=must(el.cliente.value);
    const nasc=parseDateFlex(el.nascimento.value), intensidade=clamp(+(el.intensidade.value||0),0,10);
    const queixa=must(el.queixa.value), tempo=must(el.tempo.value), efeitos=must(el.efeitos.value);
    const modo=(el.modo && el.modo.value)||"presencial";
    if(!cliente||!queixa) throw new Error("Preencha pelo menos Cliente e Queixa.");

    const ctx=(queixa+" "+efeitos).toLowerCase();
    const tec=chooseTechniques(ctx, modo);
    const pr=parecerDetalhado(queixa, efeitos, intensidade);
    const chk=checklist(ctx,intensidade);

    const tecnicasDet = tec.map((t,i)=>{
      const {como,porque}=comoPorQue(t, ctx);
      return `${i+1}) ${t}\n   • Como usar: ${como}\n   • Por que nesta sessão: ${porque}`;
    }).join("\n\n");

    const plano = plano7(tec);

    // LOG (para exportar CSV depois)
    try{
      const logs = JSON.parse(localStorage.getItem("th60_logs")||"[]");
      logs.push({
        data: new Date().toISOString(),
        terapeuta, cliente, nascimento:nasc, intensidade, queixa, tempo, efeitos, modo,
        tecnicas: tec
      });
      localStorage.setItem("th60_logs", JSON.stringify(logs));
    }catch(e){ console.warn("Falha ao registrar log:", e); }

    return [
      `Relatório  Instituto Saber Consciente`,
      `Terapeuta: ${terapeuta||"—"}   Cliente: ${cliente}   Nasc.: ${nasc}   Atendimento: ${modo.toUpperCase()}`,
      `Queixa: ${queixa}   Intensidade: ${intensidade}/10   Tempo: ${tempo}`,
      `Efeitos: ${efeitos||"—"}`, "",
      "SÍNTESE DO CASO", pr.sintese, "",
      "O QUE ESTÁ OCULTO", pr.oculto, "",
      "CRITÉRIO DO GESTOR", pr.criterio, "",
      "TÉCNICAS ESCOLHIDAS (máx. 3)", tecnicasDet, "",
      "PLANO DE INTERVENÇÃO — 7 DIAS (Sessão vs. Casa)", plano, "",
      "SINAIS DE PROGRESSO ESPERADOS", "• "+pr.sinais.join("\n• "), "",
      "CHECKLIST DE SEGURANÇA", "• "+chk.join("\n• ")
    ].join("\n");
  }

  // -------------------- PDF (v6.4) com wrap, margens e rodapé --------------------
  const PDF=(function(){
    const MAP={"á":0xe1,"à":0xe0,"â":0xe2,"ã":0xe3,"ä":0xe4,"Á":0xc1,"À":0xc0,"Â":0xc2,"Ã":0xc3,"Ä":0xc4,"é":0xe9,"è":0xe8,"ê":0xea,"É":0xc9,"È":0xc8,"Ê":0xca,"í":0xed,"ì":0xec,"Í":0xcd,"Ì":0xcc,"ó":0xf3,"ò":0xf2,"ô":0xf4,"õ":0xf5,"Ó":0xd3,"Ò":0xd2,"Ô":0xd4,"Õ":0xd5,"ú":0xfa,"ù":0xf9,"Ú":0xda,"Ù":0xd9,"ç":0xe7,"Ç":0xc7,"ñ":0xf1,"Ñ":0xd1,"ü":0xfc,"Ü":0xdc};
    const normalize=(s)=>String(s||"").replace(/[“”„]/g,'"').replace(/[‘’]/g,"'").replace(/–|—/g,"-");
    function esc(s){
      s=normalize(s); let out="";
      for(const ch of s){
        if(ch==="(") out+="\\("; else if(ch===")") out+="\\)"; else if(ch==="\\") out+="\\\\";
        else { const code=ch.charCodeAt(0);
          if(code>=32 && code<=126) out+=ch;
          else if(MAP[ch]!==undefined) out+="\\"+("00"+MAP[ch].toString(8)).slice(-3);
          else out+=" ";
        }
      } return out;
    }
    const bytelen=(t)=>new TextEncoder().encode(String(t)).length;

    function wrapLines(text, charsPerLine){
      const out=[];
      for(const raw of String(text||"").split(/\r?\n/)){
        const line=raw.replace(/\s+$/,"");
        if(line===""){ out.push(""); continue; }
        let cur="";
        for(const word of line.split(/\s+/)){
          const probe=(cur?cur+" ":"")+word;
          if(probe.length>charsPerLine){
            if(cur) out.push(cur);
            if(word.length>charsPerLine){
              let i=0; while(i<word.length){ out.push(word.slice(i,i+charsPerLine)); i+=charsPerLine; }
              cur="";
            }else cur=word;
          }else cur=probe;
        }
        if(cur) out.push(cur);
      }
      return out;
    }

    function gen({bodyText, footerLeft, footerRight}){
      const W=595.28, H=841.89;
      const Mx=54, MyTop=54, MyBottom=54;
      const FS=12, LH=16;
      const usableH=H-(MyTop+MyBottom);
      const charsPerLine=Math.floor((W-2*Mx)/(FS*0.56));

      const lines=wrapLines(bodyText, charsPerLine);
      const linesPerPage=Math.max(1, Math.floor(usableH/LH)-2);

      const pages=[];
      for(let i=0;i<lines.length;i+=linesPerPage) pages.push(lines.slice(i,i+linesPerPage));
      if(!pages.length) pages.push(["(vazio)"]);

      let objs=[], id=1;
      const add=(c)=>{const s=`${id} 0 obj\n${c}\nendobj\n`; objs.push(s); return id++;};

      const font=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
      const pids=[];
      pages.forEach((L)=>{
        let stream=`BT\n/F1 ${FS} Tf\n1 0 0 1 ${Mx} ${H-MyTop} Tm\n`;
        let first=true;
        for(const ln of L){ const e=esc(ln); if(first){stream+=`(${e}) Tj\n`; first=false;} else {stream+=`0 -${LH} Td\n(${e}) Tj\n`;} }
        const footY=MyBottom-18;
        const left=esc(footerLeft||""); const right=esc(footerRight||"");
        stream+=`ET\nBT\n/F1 10 Tf\n1 0 0 1 ${Mx} ${footY} Tm\n(${left}) Tj\n`;
        const approxRight = right.length*10*0.56;
        const posRightX=Math.max(Mx, W-Mx-approxRight);
        stream+=`1 0 0 1 ${posRightX} ${footY} Tm\n(${right}) Tj\nET`;

        const cid=add(`<< /Length ${bytelen(stream)} >>\nstream\n${stream}\nendstream`);
        const pid=add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${cid} 0 R >>`);
        pids.push(pid);
      });

      const kids=pids.map(i=>`${i} 0 R`).join(" ");
      const pagesId=add(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pids.length} >>`);
      objs=objs.map(o=>o.replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`));
      const catalog=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

      let pdf="%PDF-1.4\n", offs=[0];
      for(const o of objs){ offs.push(bytelen(pdf)); pdf+=o; }
      const xref=bytelen(pdf);
      let xr=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
      for(let i=1;i<=objs.length;i++) xr+=String(offs[i]).padStart(10,"0")+" 00000 n \n";
      const trailer=`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return pdf+xr+trailer;
    }

    function download(name, bodyText, footerLeft, footerRight){
      const data=gen({bodyText, footerLeft, footerRight});
      const blob=new Blob([data],{type:"application/pdf"});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob); a.download=name; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1200);
    }
    return { download };
  })();

  // -------------------- Modelos (localStorage) --------------------
  function refreshModelos(){
    try{
      const dict = JSON.parse(localStorage.getItem("th60_modelos")||"{}");
      el.selModelos.innerHTML = `<option value="">Carregar modelo…</option>`+
        Object.keys(dict).sort().map(k=>`<option value="${k}">${k}</option>`).join("");
    }catch{ /* ignore */ }
  }
  function coletarForm(){
    return {
      terapeuta: el.terapeuta.value, cliente: el.cliente.value, nascimento: el.nascimento.value,
      intensidade: el.intensidade.value, queixa: el.queixa.value, tempo: el.tempo.value,
      efeitos: el.efeitos.value, modo: el.modo.value
    };
  }
  function aplicarForm(d){
    if(!d) return;
    el.terapeuta.value=d.terapeuta||""; el.cliente.value=d.cliente||"";
    el.nascimento.value=d.nascimento||""; el.intensidade.value=d.intensidade||"";
    el.queixa.value=d.queixa||""; el.tempo.value=d.tempo||"";
    el.efeitos.value=d.efeitos||""; el.modo.value=d.modo||"presencial";
  }

  // -------------------- CSV (Exportar log) --------------------
  function exportCSV(){
    try{
      const rows = JSON.parse(localStorage.getItem("th60_logs")||"[]");
      if(!rows.length){ alert("Sem registros ainda."); return; }
      const header = ["data","terapeuta","cliente","nascimento","intensidade","queixa","tempo","efeitos","modo","tecnicas"];
      const csv = [header.join(",")].concat(rows.map(r=>{
        const vals = header.map(h=>{
          let v = r[h];
          if(Array.isArray(v)) v = v.join(" / ");
          v = (v==null?"":String(v)).replace(/"/g,'""');
          return `"${v}"`;
        });
        return vals.join(",");
      })).join("\n");
      const blob = new Blob([csv],{type:"text/csv;charset=utf-8"});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="TH60_logs_"+new Date().toISOString().slice(0,10)+".csv";
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1200);
    }catch(e){ console.error(e); alert("Falha ao exportar CSV."); }
  }

  // -------------------- Bindings --------------------
  document.addEventListener("DOMContentLoaded", function(){
    refreshModelos();

    el.btnGerar?.addEventListener("click", ()=>{
      try{ el.report.textContent = montarRelatorio(); }
      catch(e){ console.error(e); alert(e.message || "Falha ao gerar parecer."); }
    });
    el.btnReset?.addEventListener("click", ()=>{ el.report.textContent="O parecer aparecerá aqui."; });
    el.btnPDF?.addEventListener("click", ()=>{
      const txt = el.report.textContent || "";
      const hoje = new Date().toISOString().slice(0,10);
      const cliente = (el.cliente?.value || "—").trim();
      const name = `Relatorio_${cliente.replace(/\s+/g,"_")}_${hoje}.pdf`;
      const footerLeft = `Cliente: ${cliente}`;
      const footerRight = `Data do atendimento: ${hoje}  ·  TH60`;
      try{ PDF.download(name, txt, footerLeft, footerRight); }
      catch(e){ console.error(e); alert("Falha ao gerar PDF."); }
    });

    // Modelos
    el.btnSalvarModelo?.addEventListener("click", ()=>{
      const nome = prompt("Nome do modelo:");
      if(!nome) return;
      try{
        const dict = JSON.parse(localStorage.getItem("th60_modelos")||"{}");
        dict[nome] = coletarForm();
        localStorage.setItem("th60_modelos", JSON.stringify(dict));
        refreshModelos();
        alert("Modelo salvo.");
      }catch(e){ console.error(e); alert("Não foi possível salvar o modelo."); }
    });
    el.selModelos?.addEventListener("change", ()=>{
      const k = el.selModelos.value; if(!k) return;
      try{
        const dict = JSON.parse(localStorage.getItem("th60_modelos")||"{}");
        aplicarForm(dict[k]);
      }catch(e){ console.error(e); alert("Falha ao carregar modelo."); }
    });

    // CSV
    el.btnCSV?.addEventListener("click", exportCSV);
  });

})();
