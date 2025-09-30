
(function(){
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const state = {
    selected: [], // max 3 (stores names)
    techniques: (window.__TECHNIQUES__ || []),
  };

  const el = {
    terapeuta: $("#terapeuta"),
    cliente: $("#cliente"),
    nascimento: $("#nascimento"),
        intensidade: $("#intensidade"),
    queixa: $("#queixa"),
    tempo: $("#tempo"),
    efeitos: $("#efeitos"),
    obs: $("#obs"),
    btnSugerir: $("#btnSugerir"),
    btnLimpar: $("#btnLimpar"),
    sugestoes: $("#sugestoes"),
    catalog: $("#tech-catalog"),
    btnGerar: $("#btnGerar"),
    report: $("#report"),
    btnPrint: $("#btnPrint"),
    btnReset: $("#btnReset"),
    btnCopiar: $("#btnCopiar"),
    selCount: $("#selCount"),
  };

  // ---------- Utils
  function parseDateFlexible(input){
    if(!input) return null;
    let s = String(input).trim();

    // Remove non-digits for compact formats
    const digits = s.replace(/\D+/g, "");
    let d, m, y;

    if(/^\d{6}$/.test(digits)){ // ddmmaa
      d = parseInt(digits.slice(0,2));
      m = parseInt(digits.slice(2,4));
      y = parseInt(digits.slice(4,6));
      y += (y <= 29 ? 2000 : 1900); // window 1930-2029
    } else if(/^\d{8}$/.test(digits)){ // ddmmaaaa
      d = parseInt(digits.slice(0,2));
      m = parseInt(digits.slice(2,4));
      y = parseInt(digits.slice(4,8));
    } else {
      // try Date.parse on normalized separators
      s = s.replace(/(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{2,4})/, "$1/$2/$3");
      const parts = s.split(/[\/\-\.]/).map(x=>x.trim()).filter(Boolean);
      if(parts.length === 3){
        d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]);
        if(y < 100) y += (y <= 29 ? 2000 : 1900);
      } else {
        return null;
      }
    }
    const dt = new Date(y, (m-1), d);
    if(dt && dt.getMonth() === (m-1) && dt.getDate() === d) return dt;
    return null;
  }

  function ageFromBirth(dt){
    if(!dt) return null;
    const now = new Date();
    let age = now.getFullYear() - dt.getFullYear();
    const beforeBirthday = (now.getMonth() < dt.getMonth()) || (now.getMonth() === dt.getMonth() && now.getDate() < dt.getDate());
    if(beforeBirthday) age--;
    return age;
  }

  function htmlesc(s){
    return String(s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  }

  function cleanText(s){
    return String(s || "").trim().replace(/\s+/g," ");
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function scrollInto(el){ try{ el.scrollIntoView({behavior:"smooth", block:"start"}); }catch(e){} }

  // ---------- Catalog rendering
  function renderCatalog(){
    const days = parseInt(10) || 0;
    const frag = document.createDocumentFragment();
    state.techniques.forEach(t => {
      const div = document.createElement("div");
      div.className = "tech-item";
      const lock = /* gating removed */

      const meta = `
        <div class="meta">
          ${(t.tags||[]).map(tag=>`<span class="pill">${htmlesc(tag)}</span>`).join("")}
          
          <span class="pill">${htmlesc(t.duration)}</span>
        </div>
      `;

      const btnAdd = `<button class="btn btn-ghost" data-add="${htmlesc(t.name)}" ${lock?'disabled':''}>${lock?'Bloqueado':'Inserir no plano'}</button>`;
      const btnView = `<button class="btn btn-ghost" data-view="${htmlesc(t.name)}">Ver detalhes</button>`;

      div.innerHTML = `
        <div class="name"><b>${htmlesc(t.name)}</b></div>
        <div class="small">${htmlesc(t.overview)}</div>
        ${meta}
        <div class="flex mt8">
          ${btnAdd}
          ${btnView}
        </div>
      `;
      frag.appendChild(div);
    });
    el.catalog.innerHTML = "";
    el.catalog.appendChild(frag);
    updateSelCount();
  }

  function updateSelCount(){
    el.selCount.textContent = `${state.selected.length}/3`;
  }

  function findTechnique(name){
    return state.techniques.find(t => (t.name || "").toLowerCase() === (name||"").toLowerCase());
  }

  function toggleSelect(name){
    const idx = state.selected.findIndex(n => n.toLowerCase() === name.toLowerCase());
    if(idx >= 0){
      state.selected.splice(idx,1);
    }else{
      if(state.selected.length >= 3){
        alert("Você já selecionou 3 técnicas. Remova alguma antes de adicionar outra.");
        return;
      }
      state.selected.push(name);
    }
    renderSuggestions(); // updates chips
    updateSelCount();
  }

  // ---------- Suggestions
  function suggestFromComplaint(q){
    const s = (q||"").toLowerCase();
    // simple keyword-based mapping
    const buckets = {
      "ansiedade": ["Mindfulness – Atenção Plena", "Aromaterapia", "Auriculoterapia", "Reiki usui tibetano nível 1 ao mestrado", "Florais de bach", "Cromoterapia"],
      "insônia": ["Aromaterapia", "Reiki usui tibetano nível 1 ao mestrado", "Cromoterapia", "Mindfulness – Atenção Plena"],
      "dor": ["Ventosaterapia", "Reflexologia Podal", "Moxaterapia", "Massagem com óleos essenciais", "Fitoterapia"],
      "estresse": ["Mindfulness – Atenção Plena", "Cristaloterapia", "Cromoterapia", "Aromaterapia"],
      "depress": ["PNL – Programação Neurolinguística", "Mindfulness – Atenção Plena", "Floral de st germain", "Cristaloterapia"],
      "prosper": ["Cocriando Prosperidade", "Radiestesia", "Mesa Radiônica Universal", "Soramig astral money reiki"],
      "relaciona": ["Ho’oponopono", "Constelação com Mesa Radiônica", "PNL – Programação Neurolinguística"],
      "proteção": ["Limpeza energética", "Radiestesia", "Chakras", "Apometria"],
      "feminino": ["Reiki do Sagrado Feminino", "Ginecologia natural disponível", "Chakras"],
      "espiritual": ["Registros akáshicos", "Meditação", "Reiki celestial", "Anjos de Cura"],
      "medo": ["Florais de bach", "Auriculoterapia", "Reiki usui tibetano nível 1 ao mestrado"],
      "gastrite": ["Psicossomática", "Mindfulness – Atenção Plena", "Aromaterapia"],
      "autoestima": ["PNL – Programação Neurolinguística", "Cristaloterapia", "Chakras"]
    };
    let picks = [];
    for(const key in buckets){
      if(s.includes(key)){
        picks = picks.concat(buckets[key]);
      }
    }
    if(picks.length === 0){
      // default fallback: show balanced set
      picks = ["Mindfulness – Atenção Plena", "Reiki usui tibetano nível 1 ao mestrado", "Aromaterapia", "Psicossomática", "Radiestesia"];
    }
    // Deduplicate & slice
    return [...new Set(picks)].slice(0,6);
  }

  function renderSuggestions(){
    const cont = el.sugestoes;
    cont.innerHTML = "";
    if(state.selected.length || cont.dataset.had){
      // show selection chips
      const box = document.createElement("div");
      box.className = "flex";
      box.style.flexWrap = "wrap";
      box.style.gap = "8px";
      state.selected.forEach(nm => {
        const chip = document.createElement("span");
        chip.className = "badge";
        chip.innerHTML = `<b>${htmlesc(nm)}</b> <button class="btn btn-ghost" data-remove="${htmlesc(nm)}" title="Remover" style="padding:4px 8px;border-radius:999px">×</button>`;
        box.appendChild(chip);
      });
      cont.appendChild(box);
      cont.dataset.had = "1";
    }
  }

  // ---------- Report generation
  function generateReport(){
    const terapeuta = cleanText(el.terapeuta.value);
    const cliente   = cleanText(el.cliente.value);
    const nascimento = parseDateFlexible(el.nascimento.value);
    const idade = ageFromBirth(nascimento);
    const diasForm = 0;
    const intensidade = clamp(parseInt(el.intensidade.value || "0", 10) || 0, 0, 10);
    const queixa = cleanText(el.queixa.value);
    const tempo = cleanText(el.tempo.value);
    const efeitos = cleanText(el.efeitos.value);
    const obs = cleanText(el.obs.value);

    if(!cliente || !queixa){
      alert("Preencha pelo menos o nome do cliente e a queixa principal.");
      return;
    }
    if(state.selected.length === 0){
      alert("Selecione pelo menos 1 técnica (máx. 3).");
      return;
    }

    // Detailed "parecer" with hidden dynamics
    const hidden = inferHiddenDynamics(queixa, efeitos, intensidade);
    const plan = buildPlan(state.selected);

    const lines = [];
    lines.push(`<div class="block"><div class="spread"><h2>Relatório — Instituto Saber Consciente</h2><span class="small">${new Date().toLocaleString()}</span></div>`);
    lines.push(`<p><b>Terapeuta:</b> ${htmlesc(terapeuta || "—")} &nbsp; <b>Cliente:</b> ${htmlesc(cliente)} ${idade?`&nbsp; <b>(${idade} anos)</b>`:""} &nbsp; <b>Nasc.:</b> ${nascimento? nascimento.toLocaleDateString() : "—"}</p>`);
    lines.push(`<p><b>Queixa:</b> ${htmlesc(queixa)} &nbsp; <b>Intensidade:</b> ${intensidade}/10 &nbsp; <b>Tempo:</b> ${htmlesc(tempo || "—")} </p>`);
    lines.push(`<p><b>Efeitos:</b> ${htmlesc(efeitos || "—")} &nbsp; <b>Obs.:</b> ${htmlesc(obs || "—")}</p></div>`);

    // Síntese + Formulação
    lines.push(`<div class="block"><h3>Síntese do Caso</h3><p>${hidden.summary}</p>`);
    lines.push(`<h3>O que está oculto no comportamento</h3><p>${hidden.hidden}</p>`);
    lines.push(`<h3>Hipótese Clínica-Energética</h3><ul>${hidden.hypotheses.map(h=>`<li>${htmlesc(h)}</li>`).join("")}</ul></div>`);

    // Técnicas selecionadas (full details)
    lines.push(`<div class="block"><h3>Técnicas Selecionadas (até 3)</h3>`);
    state.selected.forEach(nm => {
      const t = findTechnique(nm);
      if(!t) return;
      // gating check
      if(t.available_after_days && diasForm < t.available_after_days){
        lines.push(`<div class="hr"></div><p><b>${htmlesc(t.name)}</b> — <span class="small">Bloqueada: disponível após ${/* gating removed */
        return;
      }
      lines.push(`<div class="hr"></div>`);
      lines.push(`<p><b>${htmlesc(t.name)}</b></p>`);
      lines.push(`<p>${htmlesc(t.overview)}</p>`);
      lines.push(`<p><b>Indicações:</b> ${htmlesc((t.indications||[]).join(", "))}</p>`);
      lines.push(`<p><b>Contraindicações (checar):</b></p><ul>${t.contraindications.map(c=>`<li>${htmlesc(c)}</li>`).join("")}</ul>`);
      lines.push(`<p><b>Protocolo Básico:</b></p><ol>${t.protocol.map(p=>`<li>${htmlesc(p)}</li>`).join("")}</ol>`);
      lines.push(`<p><b>Duração média:</b> ${htmlesc(t.duration)} &nbsp; <b>Materiais:</b> ${htmlesc((t.materials||[]).join(", "))}</p>`);
      lines.push(`<p class="small">Racional clínico: selecionada por coerência com a hipótese energética e objetivos do cliente.</p>`);
    });
    lines.push(`</div>`);

    // Plano de Intervenção
    lines.push(`<div class="block"><h3>Plano de Intervenção (4 etapas)</h3><ol>${plan.steps.map(s=>`<li>${htmlesc(s)}</li>`).join("")}</ol></div>`);

    // Ações para Casa
    lines.push(`<div class="block"><h3>Ações para Casa (1 semana)</h3><ul>${hidden.home.map(h=>`<li>${htmlesc(h)}</li>`).join("")}</ul></div>`);

    el.report.innerHTML = lines.join("\n");
    scrollInto(el.report);
  }

  function inferHiddenDynamics(queixa, efeitos, intensidade){
    const s = (queixa||"").toLowerCase() + " " + (efeitos||"").toLowerCase();
    const H = {
      summary: "Cliente apresenta queixa focal com impacto em rotinas, sugerindo desequilíbrios entre regulação fisiológica e padrões cognitivo-emocionais.",
      hidden: "Padrões de controle/evitação podem estar operando nos bastidores, mantendo a ativação interna elevada e reações automáticas.",
      hypotheses: ["Sistema nervoso em hiperalerta com baixa variabilidade de estados.", "Conflito entre necessidade de segurança e desejo de expansão.", "Ciclo somático-emocional: sintoma como tentativa de regulação."],
      home: ["Respiração 4-4-6 (5× ao dia): inspire 4s, segure 4s, solte 6s.", "Grounding 5-4-3-2-1 em momentos de gatilho.", "Registro diário 3 linhas: situação → sensação → micro-ação."]
    };

    if(s.includes("ansiedad")){
      H.summary = "Quadro de ansiedade com reatividade aumentada e ruminação.";
      H.hidden = "Excesso de antecipação negativa; mente tenta controlar o incontrolável — corpo reage em alarme.";
      H.hypotheses = ["Hiperativação simpática + crenças de catastrofização.", "Evitação de desconforto reforçando o ciclo ansioso."];
      H.home = ["Respiração 4-4-6 (5 séries/dia).", "Exposição interoceptiva leve + reaterramento.", "Higiene do sono: reduzir telas 2h antes e ancorar rotina."];
    } else if(s.includes("insôni") || s.includes("insoni")){
      H.summary = "Dificuldades de iniciar/manter sono possivelmente mediadas por hiperalerta e hábitos.";
      H.hidden = "Ritmo circadiano desorganizado + condicionamento cognitivo ao estímulo cama/sono.";
      H.hypotheses = ["Hiperalerta noturno por estresse acumulado.", "Associação cama↔ruminação."];
      H.home = ["Ritual de desaceleração 60min antes do sono.", "Exposição à luz solar manhã (10–15min).", "Respiração 4-7-8 por 3 minutos na cama."];
    } else if(s.includes("dor")){
      H.summary = "Dor com componente miofascial/funcional, influenciada por estresse e padrões posturais.";
      H.hidden = "Ciclo tensão→dor→proteção; desequilíbrio entre esforço e recuperação.";
      H.hypotheses = ["Sensibilização periférica em pontos-gatilho.", "Falta de variação de movimento + estresse."];
      H.home = ["Auto-liberação (bola/rolinho) 5–8 min/dia.", "Hidratação e pausa ativa 2× ao dia.", "Calor local suave 10 min conforme orientação."];
    } else if(s.includes("prosper") || s.includes("dinhe") || s.includes("finance")){
      H.summary = "Bloqueios de prosperidade com crenças-raiz e conflitos de valor.";
      H.hidden = "Lealdades invisíveis e scripts familiares limitantes em operação.";
      H.hypotheses = ["Crença 'não mereço' / 'dinheiro afasta' ativa.", "Incoerência entre propósito e ação diária."];
      H.home = ["Ritual de gratidão com 3 evidências diárias.", "Micro-ação de oferta/valor em 10 min/dia.", "Afirmação ancorada + visualização 2 min."];
    } else if(s.includes("relacion")){
      H.summary = "Padrões relacionais repetitivos gerando conflito/evitação.";
      H.hidden = "Defesas de controle/placating e fronteiras difusas.";
      H.hypotheses = ["Scripts de infância replicados em vínculos atuais.", "Evitação de vulnerabilidade autêntica."];
      H.home = ["Diálogo não-violento (3 etapas) 1×/dia.", "Prática de 'não' gentil 1×/dia.", "Registro: gatilho→necessidade→pedido."];
    }
    if(intensidade >= 8){
      H.hidden += " Há sinais de alta carga; priorizar estabilização e técnicas de regulação antes de intervenções profundas.";
      H.hypotheses.push("Alta ativação neurovegetativa — intervir com segurança e gradiente.");
    }
    return H;
  }

  function buildPlan(selected){
    const steps = [
      "Estabilização: regulação do SNA (respiração 4-4-6, aterramento) + contrato terapêutico.",
      "Intervenção focal com técnica principal (12–20 min) + suporte secundário conforme resposta.",
      "Integração: simbolização e ancoragem (registro, gesto-âncora, mantra).",
      "Follow-up: revisão de métricas (0–10), planejamento de 7 dias e ajustes finos."
    ];
    // personalize by presence of certain techniques
    const names = selected.map(n=>n.toLowerCase()).join(" | ");
    if(names.includes("pnl")) steps[1] = "Intervenção PNL: ancoragem + ressignificação + ensaio mental (future pace).";
    if(names.includes("auriculo")) steps[1] = "Auriculoterapia: pontos Shen Men, Rim, Ansiedade/Insônia + instrução de estímulo em casa.";
    if(names.includes("reiki")) steps[1] = "Reiki: sequência por chakras; atenção a áreas hiporresponsivas e integração final.";
    if(names.includes("reflexologia")) steps[1] = "Reflexologia: plexo solar → sistema-alvo → pontos sensíveis (6–8s).";
    if(names.includes("ventosa")) steps[1] = "Ventosaterapia: estáticas/deslizantes 5–8 min; monitorar tolerância.";
    return {steps};
  }

  // ---------- Events
  function onCatalogClick(e){
    const add = e.target.getAttribute("data-add");
    const view = e.target.getAttribute("data-view");
    const remove = e.target.getAttribute("data-remove");
    if(add){
      toggleSelect(add);
    }
    if(view){
      const t = findTechnique(view);
      if(!t) return;
      const details = [
        `<b>${htmlesc(t.name)}</b>`,
        htmlesc(t.overview),
        `<b>Indicações:</b> ${htmlesc((t.indications||[]).join(", "))}`,
        `<b>Contraindicações (checar):</b>`,
        `<ul>${t.contraindications.map(c=>`<li>${htmlesc(c)}</li>`).join("")}</ul>`,
        `<b>Protocolo Básico:</b>`,
        `<ol>${t.protocol.map(p=>`<li>${htmlesc(p)}</li>`).join("")}</ol>`,
        `<b>Duração:</b> ${htmlesc(t.duration)} &nbsp; <b>Materiais:</b> ${htmlesc((t.materials||[]).join(", "))}`
      ].join("<br/>");
      alert(stripTags(details).replace(/<br\/?>/g,"\n").replace(/<[^>]*>/g,""));
    }
    if(remove){
      toggleSelect(remove);
    }
  }

  function stripTags(html){
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  function onSuggestClick(){
    const q = el.queixa.value || "";
    const picks = suggestFromComplaint(q);
    const days = parseInt(10) || 0;
    el.sugestoes.innerHTML = "";
    const box = document.createElement("div");
    box.className = "flex";
    box.style.flexWrap = "wrap";
    box.style.gap = "8px";

    picks.forEach(name => {
      const t = findTechnique(name);
      if(!t) return;
      const lock = /* gating removed */
      const btn = document.createElement("button");
      btn.className = "btn btn-ghost";
      btn.textContent = lock ? `${t.name} (bloq.)` : t.name;
      btn.disabled = !!lock;
      btn.addEventListener("click", ()=> toggleSelect(t.name));
      box.appendChild(btn);
    });
    el.sugestoes.appendChild(box);
    el.sugestoes.dataset.had = "1";
    updateSelCount();
  }

  function onClearSelection(){
    state.selected = [];
    renderSuggestions();
    updateSelCount();
  }

  function onPrint(){
    window.print();
  }

  function onReset(){
    if(confirm("Limpar o relatório e o formulário?")){
      el.report.innerHTML = `<div class="notice">Relatório limpo. Preencha à esquerda e gere novamente.</div>`;
      el.terapeuta.value = "";
      el.cliente.value = "";
      el.nascimento.value = "";
      el.diasFormacao.value = "";
      el.intensidade.value = "";
      el.queixa.value = "";
      el.tempo.value = "";
      el.efeitos.value = "";
      el.obs.value = "";
      state.selected = [];
      renderCatalog();
      renderSuggestions();
      updateSelCount();
      window.scrollTo({top:0, behavior:"smooth"});
    }
  }

  function onCopy(){
    const text = stripTags(el.report.innerHTML).replace(/\n{3,}/g, "\n\n");
    navigator.clipboard.writeText(text).then(()=>{
      alert("Relatório copiado para a área de transferência.");
    }).catch(()=>{
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand("copy"); alert("Relatório copiado."); }catch(e){ alert("Copie manualmente."); }
      document.body.removeChild(ta);
    });
  }

  // ---------- Init
  function init(){
    el.catalog.addEventListener("click", onCatalogClick);
    el.btnSugerir.addEventListener("click", onSuggestClick);
    el.btnLimpar.addEventListener("click", onClearSelection);
    el.btnGerar.addEventListener("click", generateReport);
    el.btnPrint.addEventListener("click", onPrint);
    el.btnReset.addEventListener("click", onReset);
    el.btnCopiar.addEventListener("click", onCopy);

    renderCatalog();
    renderSuggestions();
  }

  document.addEventListener("DOMContentLoaded", init);

})();


// ------- Minimal PDF writer (single-page text) -------
// Creates a basic PDF (A4, portrait) with Helvetica, 12pt, left-aligned, line-wrapped.
// No eval, no external libs.
const PDF = (function(){
  function makeObject(id, content){ return id + " 0 obj\n" + content + "\nendobj\n"; }

  function escapeText(s){
    return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  function wrapLines(text, maxChars){
    const words = text.split(/\s+/);
    const lines = [];
    let cur = "";
    words.forEach(w=>{
      if((cur + " " + w).trim().length > maxChars){
        if(cur) lines.push(cur);
        cur = w;
      } else {
        cur = (cur ? cur + " " + w : w);
      }
    });
    if(cur) lines.push(cur);
    return lines;
  }

  function toTextLines(raw){
    // Split by newlines and wrap each paragraph
    const paras = raw.split(/\r?\n/).map(s=>s.trimEnd());
    const lines = [];
    paras.forEach(p=>{
      if(p === "") { lines.push(""); return; }
      const wrapped = wrapLines(p, 95);
      wrapped.forEach(l=>lines.push(l));
    });
    return lines;
  }

  function generate(text){
    const lines = toTextLines(text);
    const lineHeight = 14; // pt
    const fontSize = 12;
    const pageWidth = 595.28;  // A4 width pt
    const pageHeight = 841.89; // A4 height pt
    const margin = 36; // 0.5 inch
    const maxLinesPerPage = Math.floor((pageHeight - 2*margin) / lineHeight);

    // Split into pages
    const pages = [];
    for(let i=0; i<lines.length; i += maxLinesPerPage){
      pages.push(lines.slice(i, i+maxLinesPerPage));
    }
    if(pages.length === 0) pages.push(["(vazio)"]);

    let objects = [];
    let objId = 1;

    // Font object
    const fontObjId = objId++; // 1
    objects.push(makeObject(fontObjId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));

    // Pages root and individual pages
    const kids = [];
    const pageObjIds = [];
    const contentObjIds = [];

    pages.forEach((pageLines, pageIndex)=>{
      // Build content stream
      let stream = "BT\n/F1 " + fontSize + " Tf\n";
      let y = pageHeight - margin;
      stream += "1 0 0 1 " + margin + " " + (y) + " Tm\n";
      pageLines.forEach((ln, idx)=>{
        if(idx === 0){
          stream += "(" + escapeText(ln) + ") Tj\n";
        } else {
          stream += "0 -" + lineHeight + " Td\n(" + escapeText(ln) + ") Tj\n";
        }
      });
      stream += "ET";
      const streamData = stream.encode ? stream.encode() : stream; // compatibility

      const contentObjId = objId++;
      const content = ("<< /Length " + len(streamData) + " >>\nstream\n" + stream + "\nendstream");
      objects.push(makeObject(contentObjId, content));
      contentObjIds.push(contentObjId);

      const pageObjId = objId++;
      const pageDict = "<< /Type /Page /Parent 0 0 R /MediaBox [0 0 " + pageWidth + " " + pageHeight + "] /Resources << /Font << /F1 " + fontObjId + " 0 R >> >> /Contents " + contentObjId + " 0 R >>";
      // Parent will be filled after pages root is known
      objects.push(makeObject(pageObjId, pageDict));
      pageObjIds.push(pageObjId);
      kids.push(pageObjId + " 0 R");
    });

    // Pages root
    const pagesObjId = objId++;
    const pagesDict = "<< /Type /Pages /Kids [ " + kids.join(" ") + " ] /Count " + pages.length + " >>";
    # objects.append(makeObject(pagesObjId, pagesDict))  # We'll fix Parent refs next

    # Fix Parent references inside each Page object (replace 0 0 R with actual id)
    fixed_objects = []
    for o in objects:
        if "/Parent 0 0 R" in o:
            o = o.replace("/Parent 0 0 R", f"/Parent {pagesObjId} 0 R")
        fixed_objects.append(o)
    objects = fixed_objects
    objects.append(makeObject(pagesObjId, pagesDict))

    # Catalog
    catalogObjId = objId
    objId += 1
    objects.append(makeObject(catalogObjId, f"<< /Type /Catalog /Pages {pagesObjId} 0 R >>"))

    # Assemble xref
    pdf = "%PDF-1.4\n"
    offsets = []
    for obj in objects:
        offsets.append(len(pdf.encode('latin1', 'ignore')))
        pdf += obj
    xref_pos = len(pdf.encode('latin1', 'ignore'))
    xref = "xref\n0 " + str(len(objects)+1) + "\n0000000000 65535 f \n"
    for off in offsets:
        xref += f"{off:010d} 00000 n \n"
    trailer = f"trailer\n<< /Size {len(objects)+1} /Root {catalogObjId} 0 R >>\nstartxref\n{xref_pos}\n%%EOF"

    pdf += xref + trailer
    return pdf;
  }

  function len(s){ return (new TextEncoder()).encode(String(s)).length; }

  function download(filename, data){
    const blob = new Blob([data], {type: "application/pdf"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  }

  return {
    generateAndDownload: function(filename, textContent){
      const pdf = generate(textContent);
      download(filename, pdf);
    }
  };
})();



  // PDF Button handler
  function onPDF(){
    const text = stripTags(el.report.innerHTML).replace(/\n{3,}/g, "\n\n");
    const filename = `Relatorio_Terapeuta_Holistico_${(new Date()).toISOString().slice(0,10)}.pdf`;
    try{
      PDF.generateAndDownload(filename, text);
    }catch(e){
      alert("Não consegui gerar o PDF interno. Você ainda pode usar Imprimir/Salvar PDF.");
      console.error(e);
    }
  }
  el.btnPDF.addEventListener("click", onPDF);

