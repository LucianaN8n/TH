(function(){
  "use strict";
  // ---------- refs
  const $ = (s)=>document.querySelector(s);
  const el = {
    terapeuta: $("#terapeuta"), cliente: $("#cliente"), nascimento: $("#nascimento"),
    intensidade: $("#intensidade"), queixa: $("#queixa"), tempo: $("#tempo"),
    efeitos: $("#efeitos"), modo: $("#modo"),
    btnGerar: $("#btnGerar"), btnReset: $("#btnReset"), btnPDF: $("#btnPDF"),
    report: $("#report")
  };
  const must=(x)=>String(x||"").trim();
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  // ---------- utils
  function parseDateFlex(v){
    if(!v) return "—";
    const d=String(v).replace(/\D+/g,"");
    if(d.length===8) return d.slice(0,2)+"/"+d.slice(2,4)+"/"+d.slice(4);
    if(d.length===6){ let yy=+d.slice(4); yy+= yy<=29?2000:1900; return d.slice(0,2)+"/"+d.slice(2,4)+"/"+yy; }
    const m=String(v).match(/(\d{1,2}).*?(\d{1,2}).*?(\d{2,4})/);
    if(m){ let yy=+m[3]; if(yy<100) yy+= yy<=29?2000:1900; return `${m[1].padStart(2,"0")}/${m[2].padStart(2,"0")}/${yy}`;}
    return v;
  }
  const normalizeAscii=(s)=>String(s||"").replace(/[“”„]/g,'"').replace(/[‘’]/g,"'").replace(/–|—/g,"-");

  // ---------- catálogo por categorias (com 60 técnicas ao todo)
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
  // Técnicas corporais (filtrar se modo=online)
  const CORPORAIS = new Set([
    "Reflexologia Podal","Ventosaterapia","Moxaterapia","Massagem com óleos essenciais","Auriculoterapia","Cone hindu",
    "Cristaloterapia" /* opcional: retire se usar cristais apenas posicionados pelo cliente (online) */
  ]);

  // mapa de palavras-chave → categorias
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

  // rotação determinística por caso (para não repetir sempre)
  function hash(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h*16777619)>>>0}return h>>>0}

  function chooseTechniques(ctxText, modo){
    const cats=[];
    for(const k of KEYMAP) if(k.rx.test(ctxText)) cats.push(k.key);
    if(cats.length===0) cats.push("ansiedade");

    const h=hash(ctxText), picks=[];
    for(const c of cats){
      const arr = (CAT[c]||[]).filter(t=> modo==="online" ? !CORPORAIS.has(t) : true);
      const start = h % (arr.length||1);
      for(let i=0;i<arr.length && picks.length<3;i++){
        const t = arr[(start+i)%arr.length];
        if(t && !picks.includes(t)) picks.push(t);
      }
      if(picks.length>=3) break;
    }
    // completa se faltou
    if(picks.length<3){
      for(const c in CAT){
        for(const t of CAT[c]){
          if(modo==="online" && CORPORAIS.has(t)) continue;
          if(picks.length>=3) break;
          if(!picks.includes(t)) picks.push(t);
        }
        if(picks.length>=3) break;
      }
    }
    return picks.slice(0,3)
