(function () {
  "use strict";

  // -------- Helpers e refs
  const $ = (s) => document.querySelector(s);
  const el = {
    terapeuta: $("#terapeuta"),
    cliente: $("#cliente"),
    nascimento: $("#nascimento"),
    intensidade: $("#intensidade"),
    queixa: $("#queixa"),
    tempo: $("#tempo"),
    efeitos: $("#efeitos"),
    obs: $("#obs"),
    btnGerar: $("#btnGerar"),
    btnReset: $("#btnReset"),
    btnPDF: $("#btnPDF"),
    report: $("#report"),
  };
  const must = (x) => String(x || "").trim();
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // aceita 16011971, 16/01/1971, 16-01-71
  function parseDateFlex(v) {
    if (!v) return "—";
    const d = String(v).replace(/\D+/g, "");
    if (d.length === 8) return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
    if (d.length === 6) {
      let yy = +d.slice(4);
      yy += yy <= 29 ? 2000 : 1900;
      return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + yy;
    }
    const m = String(v).match(/(\d{1,2}).*?(\d{1,2}).*?(\d{2,4})/);
    if (m) {
      let yy = +m[3];
      if (yy < 100) yy += yy <= 29 ? 2000 : 1900;
      return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${yy}`;
    }
    return v;
  }

  // -------- Catálogo por categorias (cobre as 60 técnicas)
  const CAT = {
    ansiedade: ["Mindfulness – Atenção Plena","Florais de bach","Auriculoterapia","Reiki usui tibetano nível 1 ao mestrado","Cromoterapia","PNL – Programação Neurolinguística","Ho’oponopono","Chakras"],
    insonia: ["Aromaterapia","Meditação","Reiki usui tibetano nível 1 ao mestrado","Cromoterapia","Mindfulness – Atenção Plena","Florais de bach"],
    dor: ["Reflexologia Podal","Ventosaterapia","Moxaterapia","Massagem com óleos essenciais","Fitoterapia","Biomagnetismo","Cristaloterapia"],
    digestivo: ["Psicossomática","Fitoterapia","Reflexologia Podal","Aromaterapia","Mindfulness – Atenção Plena","Cromoterapia"],
    cefaleia: ["Auriculoterapia","Cromoterapia","Reflexologia Podal","Reiki usui tibetano nível 1 ao mestrado","Cristaloterapia"],
    depressao: ["Florais de bach","Mindfulness – Atenção Plena","PNL – Programação Neurolinguística","Reiki usui tibetano nível 1 ao mestrado","Crenças limitantes","Ho’oponopono"],
    prosperidade: ["Cocriando Prosperidade","Radiestesia","Mesa Radiônica Universal","Runas draconianas","Soramig astral money reiki","Constelação com Mesa Radiônica"],
    relacionamento: ["Ho’oponopono","Constelação com Mesa Radiônica","PNL – Programação Neurolinguística","Florais de minas","Registros akáshicos"],
    feminino: ["Reiki do Sagrado Feminino","Chakras","Ginecologia natural disponível","Cristaloterapia","Florais de minas"],
    trauma: ["Apometria","Registros akáshicos","Reiki xamânico mahe’o nível 1 ao mestrado","Terapia dos sonhos","Mesa Apométrica"],
    espiritual: ["Reiki celestial","As 7 leis herméticas","Arcanjos de cura","Cortes Cármicos com Arcanjo Miguel","Magia das Velas","Magia dos Nós"],
    energia_limpeza: ["Limpeza energética","Radiestesia","Mesa Radiônica Universal","Cromoterapia","Magia das Velas"],
    estudos_foco: ["PNL – Programação Neurolinguística","Mindfulness – Atenção Plena","Chakras","Cristaloterapia"],
    projeção: ["Projeção Astral","Leitura da Alma","Registros akáshicos","Anjos de Cura"]
  };

  // Chaves → categorias
  const KEYMAP = [
    {rx:/ansiedad|p[aâ]nico|nervos|agita[cç][aã]o/i, key:"ansiedade"},
    {rx:/ins[oô]ni|insoni|sono|acordar/i, key:"insonia"},
    {rx:/dor|lombar|cervic|tens|m[uú]sc|costas|ombro/i, key:"dor"},
    {rx:/gastrit|reflux|est[oô]m|digest|azia|n[aá]usea/i, key:"digestivo"},
    {rx:/cefale|enxaquec|cabe[çc]a/i, key:"cefaleia"},
    {rx:/depress|apatia|anhedoni/i, key:"depressao"},
    {rx:/prosper|finan|dinhei|abund/i, key:"prosperidade"},
    {rx:/relacion|fam[ií]l|casam|parceir|comunica/i, key:"relacionamento"},
    {rx:/femin|ciclo|tpm|menop|fertilidade/i, key:"feminino"},
    {rx:/trauma|luto|abuso|pesad|p[óo]s-traum/i, key:"trauma"},
    {rx:/espirit|f[eé]|sutil|m[ií]stic/i, key:"espiritual"},
    {rx:/limpeza|miasma|obsess/i, key:"energia_limpeza"},
    {rx:/foco|estudo|aten[cç][aã]o/i, key:"estudos_foco"},
    {rx:/proje[cç][aã]o|astral|alma/i, key:"projeção"}
  ];

  // rotação determinística (variar por caso)
  function hash(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h*16777619)>>>0}return h>>>0}

  function chooseTechniques(ctxText){
    const cats=[];
    for(const k of KEYMAP) if(k.rx.test(ctxText)) cats.push(k.key);
    if(cats.length===0) cats.push("ansiedade"); // fallback
    const h=hash(ctxText); const picks=[];
    for(const c of cats){
      const arr = CAT[c]||[]; const start = h % (arr.length||1);
      for(let i=0;i<arr.length && picks.length<3;i++){
        const t=arr[(start+i)%arr.length];
        if(t && !picks.includes(t)) picks.push(t);
      }
      if(picks.length>=3) break;
    }
    // completa se faltar
    if(picks.length<3){
      for(const c in CAT){
        for(const t of CAT[c]){
          if(picks.length>=3) break;
          if(!picks.includes(t)) picks.push(t);
        }
        if(picks.length>=3) break;
      }
    }
    return picks.slice(0,3);
  }

  // Como usar & Por que — base de várias técnicas
  function comoPorQue(nome){
    const base={como:"Aplicação progressiva com monitoramento de sinais; ajustar dose.", porque:"Promove regulação autonômica e integração corpo–mente."};
    const map={
      "Mindfulness – Atenção Plena":{como:"3 blocos/dia (5–8 min): respiração diafragmática + ancoragem sensorial; 1 sessão guiada/semana.", porque:"Reduz hiperalerta e ruminação; aumenta consciência corporal."},
      "Meditação":{como:"10–12 min/dia guiada (relaxamento/sono); evitar após 18h se tende a ativação.", porque:"Desacelera a mente, melhora latência do sono."},
      "Aromaterapia":{como:"Difusor 30–45 min antes do sono; inalação pontual (2–3 respirações) em picos de ansiedade.", porque:"Ação límbica rápida modulando estresse."},
      "Auriculoterapia":{como:"Shen Men / Rim / Ansiedade; estímulo leve 3×/dia por 30–60s.", porque:"Equilibra eixos nervoso-hormonal e reduz excitação."},
      "Reflexologia Podal":{como:"Plexo solar → sistema-alvo → pontos dolorosos (6–8s) por 12–18 min.", porque:"Reflexos somatoautonômicos aliviam dor e favorecem relaxamento."},
      "Ventosaterapia":{como:"Cups estáticas/deslizantes em paravertebrais 5–8 min (evite hematomas excessivos).", porque:"Libera fáscia e reduz tensão protetiva."},
      "Moxaterapia":{como:"20–30s por ponto (3 repetições); monitorar sensação térmica.", porque:"Aquece e dinamiza fluxo energético (dor fria/estagnada)."},
      "Massagem com óleos essenciais":{como:"Deslizamentos leves 15–25 min; óleos diluídos em vegetal.", porque:"Libera tensão muscular leve e regula SNA."},
      "Fitoterapia":{como:"Protocolos leves (camomila/passiflora/valeriana à noite) — checar interações.", porque:"Suporte fisiológico suave p/ ansiedade/sono/digestão."},
      "Biomagnetismo":{como:"Pareamento básico conforme mapa; 10–20 min.", porque:"Equilibra pH/fluxos sutis; suporte em dor crônica."},
      "Florais de bach":{como:"Fórmula personalizada 4×/dia (4 gotas) por 21 dias.", porque:"Trabalha núcleos emocionais de forma suave."},
      "Florais de minas":{como:"Posologia conforme composição; reavaliar semanalmente.", porque:"Suporte emocional fino a padrões afetivos."},
      "PNL – Programação Neurolinguística":{como:"Submodalidades + ancoragem de recurso + ensaio mental de situação-alvo.", porque:"Reprograma padrões automáticos de resposta."},
      "Crenças limitantes":{como:"Técnicas de ressignificação + evidências contrárias guiadas.", porque:"Dissolve barreiras internas (merecimento/prosperidade)."},
      "Ho’oponopono":{como:"Prática guiada 5–10 min/dia, foco em situações/pessoas-alvo.", porque:"Liberação emocional e reconciliação interna."},
      "Cromoterapia":{como:"Azul/verde suave 10–15 min; evitar luz fria à noite.", porque:"Cores calmantes reduzem excitação cortical."},
      "Reiki usui tibetano nível 1 ao mestrado":{como:"Sequência por chakras com ênfase em plexo solar/cárdico; 15–25 min.", porque:"Harmoniza campo energético e melhora autorregulação."},
      "Reiki do Sagrado Feminino":{como:"Ênfase em sacral/cárdico; 15–20 min.", porque:"Regula ciclos e autoestima/acolhimento."},
      "Chakras":{como:"Alinhamento semanal; cristais de apoio por 10–15 min.", porque:"Equilibra centros energéticos e vitalidade."},
      "Cristaloterapia":{como:"Cristais alvo em pontos ou chakras (10–20 min).", porque:"Ressonância suave para equilíbrio emocional e dor leve."},
      "Radiestesia":{como:"Leitura de bloqueios + harmonização (pêndulo/gráficos).", porque:"Ajuste fino de padrões sutis e ambiente."},
      "Mesa Radiônica Universal":{como:"Tema objetivo + autorização consciente.", porque:"Intervenção no campo informacional do cliente."},
      "Constelação com Mesa Radiônica":{como:"Mapa de vínculos + movimentos do sistema.", porque:"Reorganiza ordens do amor e lealdades invisíveis."},
      "Cocriando Prosperidade":{como:"Ritual diário: gratidão + micro-oferta de valor + ação 1%/dia.", porque:"Alinha intenção e comportamento com abundância."},
      "Runas draconianas":{como:"Leitura/ativação responsável (foco objetivo).", porque:"Arquétipos de transformação e poder pessoal."},
      "Soramig astral money reiki":{como:"Sintonização e prática diária (5–10 min).", porque:"Sintoniza campo de prosperidade com ética/propósito."},
      "Registros akáshicos":{como:"Leitura focada em perguntas abertas; integrar insights.", porque:"Amplia compreensão de padrões e escolhas."},
      "Apometria":{como:"Estabilização + comandos precisos, com ética e limite.", porque:"Integra fragmentos e reduz disparos traumáticos."},
      "Terapia dos sonhos":{como:"Registro matinal + decodificação simbólica semanal.", porque:"Acessa material inconsciente e integra emoções."},
      "Reiki celestial":{como:"Imantação suave; 12–20 min.", porque:"Eleva frequência e acolhe estados emocionais."},
      "As 7 leis herméticas":{como:"Educação de princípios + exercícios simples diários.", porque:"Reestrutura visão de mundo e autorresponsabilidade."},
      "Arcanjos de cura":{como:"Oração/visualização dirigida (5–10 min).", porque:"Suporte espiritual/âncora de fé."},
      "Cortes Cármicos com Arcanjo Miguel":{como:"Ritual consciente e responsável.", porque:"Desata laços energeticamente disfuncionais."},
      "Magia das Velas":{como:"Intenção clara; vela segura; cores correspondentes.", porque:"Foco e simbolismo para transmutação."},
      "Magia dos Nós":{como:"Nó/afirmação/respiração; desfazer com gratidão.", porque:"Encapsula intenção de forma concreta."},
      "Projeção Astral":{como:"Higiene do sono + técnica de saída responsável.", porque:"Exploração consciente; autoconhecimento."},
      "Leitura da Alma":{como:"Escuta profunda + espelhamento compassivo.", porque:"Clareza de propósito e sentido."},
      "Mesa Apométrica":{como:"Comandos apométricos sob protocolo.", porque:"Organização de campos/partes e sintonia."},
      "Corpos dimensionais e Frequência Energética":{como:"Educação + exercícios de percepção.", porque:"Autogestão de estados vibracionais."},
      "Terapia com pantáculos":{como:"Seleção de pantáculo alinhado ao objetivo.", porque:"Foco/ordem simbólica do campo."},
      "Kundalini reiki":{como:"Séries curtas 10–20 min; progressão.", porque:"Eleva vitalidade; limpeza suave."},
      "Baralho cigano":{como:"Leitura oracular com ética/consentimento.", porque:"Insight e aconselhamento simbólico."},
      "Reiki xamânico mahe’o nível 1 ao mestrado":{como:"Ancoragem com elementos; 15–25 min.", porque:"Força arquetípica e aterramento."},
      "Reiki xamânico amadeus nível 1 e mestrado":{como:"Canalização com intenção calma.", porque:"Amor compassivo e cura sutil."},
      "Florais Etéricos Xamânicos":{como:"Sintonização conforme arquétipo.", porque:"Cura simbólica profunda."},
      "Bases da medicina germânica":{como:"Educar conflito-biológico↔sintoma (sem substituir medicina).", porque:"Releitura de fases/tecidos para reduzir medo."},
      "Introdução a medicina tradicional chinesa":{como:"Educar yin/yang, 5 elementos, hábitos.", porque:"Autocuidado balizado por MTC."},
      "Nutrição Holística":{como:"Ajustes simples (água, fibras, proteína, horários).", porque:"Estabiliza energia/sono/humor."},
      "Psicossomática":{como:"Mapa sintoma↔emoção↔situação + expressão segura.", porque:"Reduz descarga somática e integra significado."},
      "Limpeza energética":{como:"Banhos/defumações/orações simples.", porque:"Higiene do campo e ambiente."},
      "Terapia quântica":{como:"Intervenções informacionais com intenção.", porque:"Ajustes sutis de padrão."},
      "Radiestesia":{como:"Leitura + harmonização (pêndulo/gráficos).", porque:"Sintoniza campo e ambiente."}
    };
    return map[nome] || base;
  }

  // Parecer (síntese/oculto/critério/sinais)
  function parecerDetalhado(queixa, efeitos, intensidade){
    const q=(queixa+" "+efeitos).toLowerCase();
    let sint="Quadro com impacto funcional e oscilação autonômica; pede estabilização e integração mente–corpo.";
    let oculto="Padrão de controle/evitação mantém ativação interna e ciclos de tensão; corpo sinaliza necessidade de reorganização.";
    let crit="Priorizadas técnicas de regulação do SNA, liberação somática e reorganização de hábitos/rotinas.";
    let sinais=["Redução progressiva da escala 0–10","Melhor sono/energia ao despertar","Menos tensão em regiões-alvo"];

    if(/ins[oô]ni|insoni|sono/.test(q)){sint="Insônia com hiperalerta noturno e ruminação; dificuldade de desligamento.";oculto="Ritual de sono inconsistente e condicionamento de alerta ao deitar.";crit="Atuar no eixo límbico-olfativo (aromas), reduzir excitação cortical (mindfulness) e harmonizar energia (reiki/aurículo).";sinais=["Latência menor","Menos despertares","Descanso matinal melhor"];}
    else if(/gastrit|reflux|est[oô]m|digest|azia/.test(q)){sint="Sintomas GI ligados a estresse/hipervigilância visceral; tensão em plexo solar (MTC).";oculto="Somatização de preocupações no eixo estômago; loops de apreensão aumentam secreção/motilidade.";crit="Desativar resposta de ameaça, favorecer digestão parasimpática e redirecionar energia acumulada.";sinais=["Menos queimação","Conforto pós-refeição","Menos dor abdominal"];}
    else if(/dor|lombar|cervic|tens|m[uú]sc|costas|ombro/.test(q)){sint="Dor miofascial/funcional com proteção muscular e baixa variabilidade de movimento.";oculto="Ciclo tensão→dor→proteção; respiração encurtada mantém excitabilidade.";crit="Liberação mecânica suave + reflexos somatoautonômicos para alívio e reeducação.";sinais=["Mais amplitude","Menos dor ao fim do dia","Sono mais reparador"];}
    else if(/depress|apatia|anhedoni/.test(q)){sint="Humor deprimido com baixa motivação; energia vital reduzida.";oculto="Narrativa interna autocrítica sustenta evitação/isolamento.";crit="Regular ritmos, simbolizar emoções com floral/PNL e ancorar pequenos ganhos.";sinais=["Mais interesse por atividades","Rotina mais estável","Auto-relatos positivos"];}
    if(+intensidade>=8) crit += " Intensidade elevada: progredir em camadas, mais ancoragens e suporte entre sessões.";

    return {sintese:sint, oculto, criterio:crit, sinais};
  }

  // checklist de segurança com base em observações/efeitos
  function checklist(ctx,intensidade){
    const C=[];
    if(/gestant|gravidez|gr[áa]vida/i.test(ctx)) C.push("Gestante: evitar ventosas/moxa em regiões de risco; fitoterapia apenas com segurança comprovada.");
    if(/hipertens|press[aã]o alta/i.test(ctx)) C.push("Hipertensão: cuidado com ventosas fortes, estimulantes e certos óleos (alecrim).");
    if(/anticoag|varfarin|clopidogrel/i.test(ctx)) C.push("Anticoagulante: evitar ventosas/massagens vigorosas; atenção com fitoterápicos que alteram coagulação.");
    if(/fluoxetina|sertralin|escitalopram|isrs/i.test(ctx)) C.push("ISRS (ex.: fluoxetina): evitar Erva-de-São-João e combinações serotoninérgicas; aromaterapia suave ok.");
    if(/benzodiaz|diazep|clonazepam|alprazolam/i.test(ctx)) C.push("Benzodiazepínicos: evitar sedativos acumulativos; priorizar técnicas não-farmacológicas.");
    if(/dermatit|ferida|les[aã]o cut/i.test(ctx)) C.push("Pele sensível/lesão: evitar óleos/cosmeticos irritantes e ventosas na área.");
    if(/epileps/i.test(ctx)) C.push("Epilepsia: evitar estimulações luminosas intensas; aromaterapia com cautela (sem alecrim/arruda).");
    if(intensidade>=8) C.push("Queixa ≥8/10: reduzir carga, fracionar técnica e monitorar proximamente.");
    if(C.length===0) C.push("Sem alertas críticos informados; manter bom senso clínico e consentimento esclarecido.");
    return C;
  }

  function plano7dias(tec){
    const [t1,t2,t3]=tec;
    return [
      `Dia 1 — Sessão: acolhimento, métrica 0–10, ${t1} em dose leve;  Casa: respiração 4-4-6 (3×/dia, 5 min).`,
      `Dia 2 — Sessão: ${t1} com progressão suave;                        Casa: ritual noturno (higiene do sono) + diário (3 linhas).`,
      `Dia 3 — Sessão: introdução de ${t2};                               Casa: grounding 5-4-3-2-1 em gatilhos (2×/dia).`,
      `Dia 4 — Sessão: ${t1}+${t2} integrados;                            Casa: observação de pensamentos automáticos (3 registros/dia).`,
      `Dia 5 — Sessão: introdução de ${t3 || "reforço do t1/t2"};          Casa: prática breve combinada (10–15 min).`,
      `Dia 6 — Sessão: consolidação + simbolização;                       Casa: visualização/oração/afirmação alinhada ao objetivo.`,
      `Dia 7 — Sessão: reavaliação 0–10, reforço do que funcionou;        Casa: plano de continuidade por 2 semanas.`
    ].join("\n");
  }

  // -------- Relatório final
  function montarRelatorio(){
    const terapeuta=must(el.terapeuta.value);
    const cliente=must(el.cliente.value);
    const nasc=parseDateFlex(el.nascimento.value);
    const intensidade=clamp(+(el.intensidade.value||0),0,10);
    const queixa=must(el.queixa.value);
    const tempo=must(el.tempo.value);
    const efeitos=must(el.efeitos.value);
    const obs=must(el.obs.value);
    if(!cliente||!queixa) throw new Error("Preencha pelo menos Cliente e Queixa.");

    const ctx=(queixa+" "+efeitos+" "+obs).toLowerCase();
    const tec=chooseTechniques(ctx);
    const pr=parecerDetalhado(queixa, efeitos, intensidade);
    const chk=checklist(ctx,intensidade);

    const tecnicasDet = tec.map((t,i)=>{
      const {como,porque}=comoPorQue(t);
      return `${i+1}) ${t}
   • Como usar: ${como}
   • Por que nesta sessão: ${porque}`;
    }).join("\n\n");

    const plano = plano7dias(tec);

    return [
      `Relatório — Instituto Saber Consciente`,
      `Terapeuta: ${terapeuta||"—"}   Cliente: ${cliente}   Nasc.: ${nasc}`,
      `Queixa: ${queixa}   Intensidade: ${intensidade}/10   Tempo: ${tempo}`,
      `Efeitos: ${efeitos||"—"}   Obs.: ${obs||"—"}`,
      "",
      "SÍNTESE DO CASO",
      pr.sintese,
      "",
      "O QUE ESTÁ OCULTO",
      pr.oculto,
      "",
      "CRITÉRIO DO GESTOR",
      pr.criterio,
      "",
      "TÉCNICAS ESCOLHIDAS (máx. 3)",
      tecnicasDet,
      "",
      "PLANO DE INTERVENÇÃO — 7 DIAS (Sessão vs. Casa)",
      plano,
      "",
      "SINAIS DE PROGRESSO ESPERADOS",
      "• "+pr.sinais.join("\n• "),
      "",
      "CHECKLIST DE SEGURANÇA",
      "• "+chk.join("\n• ")
    ].join("\n");
  }

  // -------- PDF interno (acentos OK via WinAnsi)
  const PDF = (function () {
    const MAP={"á":0xe1,"à":0xe0,"â":0xe2,"ã":0xe3,"ä":0xe4,"Á":0xc1,"À":0xc0,"Â":0xc2,"Ã":0xc3,"Ä":0xc4,"é":0xe9,"è":0xe8,"ê":0xea,"É":0xc9,"È":0xc8,"Ê":0xca,"í":0xed,"ì":0xec,"Í":0xcd,"Ì":0xcc,"ó":0xf3,"ò":0xf2,"ô":0xf4,"õ":0xf5,"Ó":0xd3,"Ò":0xd2,"Ô":0xd4,"Õ":0xd5,"ú":0xfa,"ù":0xf9,"Ú":0xda,"Ù":0xd9,"ç":0xe7,"Ç":0xc7,"ñ":0xf1,"Ñ":0xd1,"ü":0xfc,"Ü":0xdc};
    function esc(s){
      let out=""; for(const ch of String(s||"")){
        if(ch==="(") out+="\\("; else if(ch===")") out+="\\)"; else if(ch==="\\") out+="\\\\";
        else { const code=ch.charCodeAt(0);
          if(code>=32 && code<=126) out+=ch;
          else if(MAP[ch]!==undefined) out+="\\"+("00"+MAP[ch].toString(8)).slice(-3);
          else out+=" ";
        }
      } return out;
    }
    const len=(s)=>new TextEncoder().encode(String(s)).length;
    function gen(text){
      const W=595.28,H=841.89,M=36,FS=12,LH=14;
      const lines=String(text||"").split(/\n/); const max=Math.floor((H-2*M)/LH);
      const pages=[]; for(let i=0;i<lines.length;i+=max) pages.push(lines.slice(i,i+max));
      if(!pages.length) pages.push(["(vazio)"]);
      let objs=[], id=1; const add=(c)=>{const s=`${id} 0 obj\n${c}\nendobj\n`; objs.push(s); return id++;};
      const font=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
      const pids=[];
      for(const L of pages){
        let stream=`BT\n/F1 ${FS} Tf\n1 0 0 1 ${M} ${H-M} Tm\n`; let first=true;
        for(const ln of L){ const e=esc(ln); if(first){stream+=`(${e}) Tj\n`; first=false;} else {stream+=`0 -${LH} Td\n(${e}) Tj\n`;} }
        stream+="ET";
        const cid=add(`<< /Length ${len(stream)} >>\nstream\n${stream}\nendstream`);
        const pid=add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${cid} 0 R >>`);
        pids.push(pid);
      }
      const kids=pids.map(i=>i+" 0 R").join(" ");
      const pagesId=add(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pids.length} >>`);
      objs=objs.map(o=>o.replace("/Parent 0 0 R","/Parent "+pagesId+" 0 R"));
      const catalog=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
      let pdf="%PDF-1.4\n"; const offs=[0]; for(const o of objs){ offs.push(len(pdf)); pdf+=o; }
      const xref=len(pdf); let xr=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
      for(let i=1;i<=objs.length;i++){ xr+=String(offs[i]).padStart(10,"0")+" 00000 n \n"; }
      const trailer=`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return pdf+xr+trailer;
    }
    function dl(name,data){const blob=new Blob([data],{type:"application/pdf"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
    return {download(name,text){dl(name,gen(text));}};
  })();

  // -------- Bindings
  document.addEventListener("DOMContentLoaded", function(){
    if(el.btnGerar){
      el.btnGerar.addEventListener("click", ()=>{
        try{
          const txt = montarRelatorio();
          el.report.textContent = txt;
        }catch(e){
          console.error("Erro ao gerar parecer:", e);
          alert(e.message || "Falha ao gerar parecer.");
        }
      });
    }
    if(el.btnReset){
      el.btnReset.addEventListener("click", ()=>{ el.report.textContent="O parecer aparecerá aqui."; });
    }
    if(el.btnPDF){
      el.btnPDF.addEventListener("click", ()=>{
        const txt = el.report.textContent || "";
        const name = "Relatorio_Gestor_"+(new Date()).toISOString().slice(0,10)+".pdf";
        try{ PDF.download(name, txt); }catch(e){ console.error(e); alert("Falha ao gerar PDF."); }
      });
    }
  });
})();
