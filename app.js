// --- Modo embed/local-safe (Wix/Hotmart, mobile incluso)
const QS = new URLSearchParams(location.search);
const EMBED = QS.get('embed');                // "wix" | "club" | etc.
const FORCE_LOCAL = QS.has('noapi');          // ?noapi=1
const EMBED_SAFE = FORCE_LOCAL || !!EMBED;

// Bloqueia chamadas remotas em embed (evita 504 no mobile/webview)
(function hardenEmbed() {
  if (!EMBED_SAFE || !window.fetch) return;
  const orig = window.fetch.bind(window);
  const BLOCK = [/\/ns\/mentor-openai/i, /\/ns\/mentor-openai2/i, /\.netlify\/functions/i, /\/api\//i];
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (BLOCK.some(rx => rx.test(url))) return Promise.reject(new Error('remote-calls-blocked-in-embed'));
    return orig(input, init);
  };
})();

// iOS: evita zoom ao focar inputs
if (/iP(hone|ad|od)/.test(navigator.userAgent)) {
  document.documentElement.style.setProperty('--fix-ios-font', '16px');
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input, textarea, select').forEach(el => el.style.fontSize = 'var(--fix-ios-font)');
  });
}

// Nunca use alert() em embed; use um status na tela
function showError(msg) {
  console.error(msg);
  const el = document.getElementById('status') || document.querySelector('[data-status]');
  if (el) { el.textContent = msg; el.style.color = '#b42318'; }
}





<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Seu Mentor Hollístico</title>
  <style>
    :root{
      --ink:#0f172a;--muted:#475569;--bg:#f8fafc;--card:#ffffff;--brand:#0d9488;--soft:#e2e8f0;
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    body{margin:0;background:var(--bg);color:var(--ink);
      font:400 16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
    .wrap{max-width:1200px;margin:0 auto;padding:20px}
    h1{font:700 20px/1.2 system-ui;margin:0 0 18px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .card{background:var(--card);border:1px solid var(--soft);border-radius:14px;padding:16px}
    .card h2{font:700 16px/1.2 system-ui;margin:0 0 8px}
    .field{margin:10px 0 12px}
    .field label{display:block;font:600 13px system-ui;margin-bottom:6px;color:var(--muted)}
    .field input,.field textarea,.field select{
      width:100%;padding:10px 12px;border:1px solid var(--soft);border-radius:10px;background:#fff;outline:none
    }
    .field textarea{min-height:80px;resize:vertical}
    .actions{display:flex;gap:10px;flex-wrap:wrap}
    .btn{appearance:none;border:0;border-radius:12px;padding:10px 14px;font:600 14px system-ui;cursor:pointer}
    .btn.primary{background:var(--brand);color:#fff}
    .btn.ghost{background:#fff;border:1px solid var(--soft);color:var(--ink)}
    .pill{display:inline-block;background:#eef2ff;border:1px solid #c7d2fe;color:#3730a3;margin:4px 6px 0 0;padding:4px 8px;border-radius:999px;font:600 12px system-ui}
    .mono{white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace}
    .status{font:600 12px system-ui;color:var(--muted);margin-top:6px}
    .chat{height:200px;overflow:auto;border:1px solid var(--soft);border-radius:10px;padding:10px;background:#fff;margin-top:6px}
    .bubble{padding:8px 10px;border-radius:12px;margin:6px 0;max-width:85%}
    .me{background:#ecfeff;border:1px solid #cffafe;align-self:flex-end;margin-left:auto}
    .ther{background:#f1f5f9;border:1px solid var(--soft)}
    @media (max-width:980px){.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Seu Mentor Hollístico — <span style="font-weight:600;color:var(--muted)">Instituto Saber Consciente</span></h1>
    <div class="grid">
      <div class="card">
        <h2>Anamnese dinâmica (orientada por Psicanálise)</h2>

        <div class="field"><label>Nome do terapeuta</label>
          <input id="f_terapeuta" placeholder="Ex.: Luciana"/></div>

        <div class="field"><label>Nome do paciente</label>
          <input id="f_paciente" placeholder="Ex.: Joana"/></div>

        <div class="field"><label>Data de nascimento</label>
          <input id="f_nasc" placeholder="DDMMAAAA (aceita sem barras)"/></div>

        <div class="field"><label>Queixa principal</label>
          <input id="f_queixa" placeholder="Ex.: ansiedade, pânico, compulsão por doce…"/></div>

        <div class="field"><label>1) Teve algum acontecimento marcante perto dessa época?</label>
          <textarea id="f_q1" placeholder="Trabalho, família, saúde…"></textarea></div>

        <div class="field"><label>2) Como isso atrapalha sua rotina hoje?</label>
          <textarea id="f_q2"></textarea></div>

        <div class="field"><label>3) Se tivesse que dar um nome pra esse incômodo (nó, peso, fogo), qual seria?</label>
          <textarea id="f_q3"></textarea></div>

        <div class="field"><label>4) O que surge no corpo nos 2–3 minutos anteriores (respiração/peito/estômago/tensão)?</label>
          <textarea id="f_q4"></textarea></div>

        <div class="field"><label>5) O que você gostaria de conseguir fazer mais, se esse problema diminuísse?</label>
          <textarea id="f_q5"></textarea></div>

        <div class="field"><label>Observações/Respostas (livre)</label>
          <textarea id="f_obs" placeholder="Registre respostas-chave do cliente…"></textarea></div>

        <div class="actions">
          <button class="btn primary" id="btn_aplicar">Aplicar & Prosseguir</button>
          <button class="btn ghost" id="btn_limpar">Limpar</button>
          <span class="status" id="status">Pronto. Preencha e clique em “Aplicar & Prosseguir”.</span>
        </div>

        <div class="field" style="margin-top:18px">
          <label>Pergunte ao Psicanalista (tempo real)</label>
          <div class="chat" id="chat"></div>
          <div class="actions" style="margin-top:8px">
            <input id="chat_input" placeholder="Escreva sua pergunta…" style="flex:1;padding:10px 12px;border:1px solid var(--soft);border-radius:10px;background:#fff"/>
            <button class="btn primary" id="chat_send">Enviar</button>
          </div>
          <div class="status" style="margin-top:6px">Respostas adaptativas baseadas na anamnese. Não substituem supervisão.</div>
        </div>
      </div>

      <div class="card">
        <h2>Parecer do Gestor</h2>
        <div id="parecer" class="mono" style="min-height:110px">—</div>

        <div class="card" style="margin-top:14px">
          <h2>Plano de ação (30 dias)</h2>
          <div id="plano" class="mono">Geraremos um plano ao final da anamnese.</div>
        </div>

        <div class="card" style="margin-top:14px">
          <h2>Indicação de estudos (módulos do curso)</h2>
          <div id="mods" class="mono">Recomendações aparecerão aqui.</div>
          <div id="tags" style="margin-top:6px"></div>
        </div>

        <div class="actions" style="margin-top:14px">
          <button class="btn primary" id="btn_pdf">Gerar PDF</button>
          <button class="btn ghost" id="btn_copiar">Copiar parecer</button>
        </div>
      </div>
    </div>
  </div>

  <script>
  // ===== Configurações de embed / ambiente seguro (Wix/Hotmart) =====
  const EMBED = new URLSearchParams(location.search).get('embed'); // "wix" | "club" | null
  const IS_WIX_SANDBOX = /filesusr\.com$/i.test(location.hostname);
  const EMBED_SAFE = !!EMBED || IS_WIX_SANDBOX;

  // Bloqueia chamadas remotas em modo embed
  (function hardenEmbed(){
    if(!EMBED_SAFE || !window.fetch) return;
    const of = window.fetch.bind(window);
    const BLOCK = [/\.netlify\/functions/i,/\/api\//i,/openai/i,/mentor-openai/i];
    window.fetch = (input, init)=>{
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if(BLOCK.some(rx=>rx.test(url))) return Promise.reject(new Error('remote-calls-blocked-in-embed'));
      return of(input, init);
    };
  })();

  // ===== Helpers =====
  const $ = sel => document.querySelector(sel);
  const val = id => (document.getElementById(id).value || '').trim();
  const setStatus = (msg, isErr=false) => {
    const s = $('#status'); s.textContent = msg; s.style.color = isErr ? '#b91c1c' : 'var(--muted)';
  };
  const setBusy = (on)=>{ $('#btn_aplicar').disabled=on; $('#btn_pdf').disabled=on; };

  // ===== Engine local (sem fetch) =====
  function readForm(){
    return {
      terapeuta: val('f_terapeuta'),
      paciente: val('f_paciente'),
      nasc: val('f_nasc'),
      queixa: val('f_queixa'),
      q1: val('f_q1'), q2: val('f_q2'), q3: val('f_q3'), q4: val('f_q4'), q5: val('f_q5'),
      obs: val('f_obs')
    };
  }

  function idadeAprox(nasc){
    const only = nasc.replace(/\D/g,'');
    if(only.length<4) return null;
    const ano = only.slice(-4);
    const y = Number(ano); if(!y || y>2100) return null;
    const now = new Date().getFullYear();
    return Math.max(0, now - y);
  }

  function perfis(queixa){
    const q = (queixa||'').toLowerCase();
    const has = (k)=>q.includes(k);

    const out = new Set();

    if(/pani(c|co)/.test(q) || has('ansiedade') || has('taquicardia')) out.add('Ansiedade/Pânico');
    if(has('compuls') || has('doces') || has('alimentar')) out.add('Compulsão/Alimentar');
    if(has('toc')) out.add('TOC');
    if(has('tdah')) out.add('TDAH adulto');
    if(has('luto perinatal')||has('luto')) out.add('Luto/Luto perinatal');
    if(has('trauma')||has('abuso')||has('tept')||has('pós-trauma')) out.add('Trauma/TEPT');
    if(has('borderline')||has('tpb')) out.add('Transtorno de Personalidade Borderline');
    if(has('depend')||has('alcool')||has('drog')||has('jogo')) out.add('Dependências');
    if(has('conjugal')||has('relacionamento')||has('casal')) out.add('Crise conjugal');
    if(has('gastrite')||has('dor')||has('psicossom')) out.add('Psicossomática');

    return [...out];
  }

  function modulosRecomendados(perfis){
    const base = [
      'Psicanálise Clínica','Psicopatologias','Psicanálise Aprofundamento',
      'Psicanálise Humanista e Herança Emocional','Supervisão de Atendimento e Estudos de Caso',
      'Psicoterapia Contextual e Breve','Psicoterapia Baseada na Mentalização',
      'Terapia Cognitiva Baseada em Mindfulness','Terapia Positiva, de Aceitação e Compromisso',
      'Psicossomática e Metafísica','Logoterapia'
    ];
    const extras = {
      'TDAH adulto':['Psicoterapia Contextual e Breve','MBCT','Psicanálise Clínica'],
      'TOC':['Psicopatologias','MBCT','Psicanálise Aprofundamento'],
      'Ansiedade/Pânico':['MBCT','Contextual/Breve','Psicanálise Clínica'],
      'Compulsão/Alimentar':['ACT/ACEitação','Contextual/Breve','Psicopatologias'],
      'Trauma/TEPT':['Psicanálise Aprofundamento','Mentalização','Logoterapia'],
      'Luto/Luto perinatal':['Logoterapia','Psicanálise Clínica','Humanista/Herança Emocional'],
      'Transtorno de Personalidade Borderline':['Mentalização','Psicanálise Aprofundamento','Supervisão de Caso'],
      'Dependências':['Contextual/Breve','ACT','Psicopatologias'],
      'Crise conjugal':['Psicanálise Sistêmica e da Mulher','Supervisão de Caso','Humanista/Herança Emocional'],
      'Psicossomática':['Psicossomática e Metafísica','Psicanálise Clínica']
    };
    const pick = new Set(base);
    for(const p of perfis){
      (extras[p]||[]).forEach(m=>pick.add(m.replace('MBCT','Terapia Cognitiva Baseada em Mindfulness').replace('ACT','Terapia Positiva, de Aceitação e Compromisso')));
    }
    return [...pick];
  }

  function gerarParecerLocal(d){
    const idade = idadeAprox(d.nasc);
    const tags = perfis(d.queixa);
    const foco = tags[0]||'Autoconhecimento clínico';
    const idadeTxt = idade!=null ? ` (~${idade} anos)` : '';

    const oculto = [];
    if(/controle|perfeito|erra|cert[oa]/i.test(d.q2)) oculto.push('rigidez/controle como tentativa de reduzir angústia');
    if(/evit|fug/i.test(d.q2+d.q1)) oculto.push('evitação mantém o sintoma (ciclo curto de alívio → reforço)');
    if(/culpa|vergonh/i.test(d.q2+d.q1)) oculto.push('culpa/autoexigência elevadas → autocrítica crônica');
    if(/taquic|falta de ar|aperto|tremor/i.test(d.q4)) oculto.push('hipervigilância interoceptiva (interpretação catastrófica de sinais corporais)');
    if(/gastrite|dor|enxaqueca|psicossom/i.test(d.queixa+d.q4)) oculto.push('somatização de conflito psíquico não simbolizado');
    if(d.q1 && /perda|falenci|demiss/i.test(d.q1)) oculto.push('evento de perda/ameaça recente como gatilho de regressão ansiosa');

    const parecer =
`Paciente: ${d.paciente}${idadeTxt}
Terapeuta: ${d.terapeuta}
Foco clínico: ${foco}

Formulação psicanalítica
• Queixa manifesta: ${d.queixa||'—'}
• Padrões observáveis: ${d.q2||'—'}
• Atribuição simbólica (“nome do incômodo”): ${d.q3||'—'}
• Sinais corporais prévios: ${d.q4||'—'}
${oculto.length?`• Padrões ocultos: ${oculto.join(' ; ')}`:'• Padrões ocultos: —'}

Hipóteses
1) Conflito entre exigências de controle e afetos evitados.
2) Circuito de evitação/segurança que mantém o sintoma.
3) Necessidade de ampliar mentalização e tolerância à incerteza.

Intervenções prioritárias
• Psicanálise focal com interpretação de defesas e sentido do sintoma.
• Treino interoceptivo e respiração 4-4-6 + grounding 5-4-3-2-1.
• Tarefas de exposição graduada a situações evitadas, com validação emocional.
• Registro de evidências (texto breve, após episódios).
• Acordo de linguagem: “o corpo está sinalizando algo que podemos traduzir”.`;

    const plano =
`Semana 1 — Estabilização
• Cartão de crise (respira 4-4-6 ×5 + grounding 5-4-3-2-1 + micro-ação).
• Diálogo interno compassivo: 2x/dia (2–3 min).
• Sono/rotina: horário fixo; reduzir cafeína após 15h.

Semana 2 — Exposição + reforço positivo
• Escolher 1 situação evitada e quebrar em micro-passos.
• Após cada passo: autodiálogo + recompensa saudável.
• Registrar evidências contra catastrofismos.

Semana 3 — Consolidação
• Subir 1 ponto na hierarquia (quando tolerável).
• 1 conversa estruturada/semana usando CNV (observar, sentir, precisar, pedir).
• Revisar crenças centrais por escrito (“se eu não controlar, serei rejeitado?”) → gerar alternativas.

Semana 4 — Prevenção de recaída
• Plano de escada: sinais precoces → resposta rápida (3 ações de 2 minutos).
• Check-in semanal com o terapeuta para ajuste fino.
• Ritual de fechamento: carta reconhecendo progressos + próximos 14 dias.`;

    return { parecer, plano, tags, mods: modulosRecomendados(tags) };
  }

  function renderAll(r){
    $('#parecer').textContent = r.parecer;
    $('#plano').textContent = r.plano;
    $('#mods').textContent = r.mods.join(' • ');
    const t = $('#tags'); t.innerHTML='';
    r.tags.forEach(x=>{
      const s = document.createElement('span'); s.className='pill'; s.textContent=x; t.appendChild(s);
    });
  }

  async function aplicar(){
    try{
      setBusy(true); setStatus('Gerando parecer…');
      const r = gerarParecerLocal(readForm());
      renderAll(r);
      setStatus('Pronto!');
    }catch(e){
      console.error(e); setStatus('Falha ao gerar parecer: '+(e?.message||'erro'), true);
    }finally{ setBusy(false); }
  }

  // ===== Chat adaptativo =====
  const chatBox = $('#chat');
  const say = (txt, who='ther')=>{
    const b = document.createElement('div');
    b.className = 'bubble '+(who==='me'?'me':'ther'); b.textContent = txt;
    chatBox.appendChild(b); chatBox.scrollTop = chatBox.scrollHeight;
  };
  const QROT = [
    // Rotaciona dicas sem repetir
    d => `Vamos destrinchar um episódio recente. Onde estava? Com quem? O que seu corpo fez? O que pensou? E o que fez em seguida? Eu devolvo formulação + próximo passo.`,
    d => `Olho clínico aqui: qual foi o primeiro gatilho visível (lugar, pessoa, pensamento, sensação)? Me descreva um em 4 linhas.`,
    d => `Se o corpo pudesse falar, o que ele diria antes do pico? Dê falas ao peito/estômago (“estou tentando te proteger de…”).`,
  ];
  let qPtr = 0;
  function nextPrompt(d){
    const p = QROT[qPtr%QROT.length](d); qPtr++; return p;
  }

  function replyChat(msg){
    const d = readForm();
    const m = (msg||'').toLowerCase();

    // respostas específicas
    if(/pregabalin|pregabalina|rivotril|clonazepam/.test(m)){
      return 'Anote: uso de medicação atual. Se houver sedação/rebote, ajuste de higiene do sono e micro-exposições com tempo curto ajudam a não associar 100% o alívio ao fármaco. Coordene mudanças com o médico.';
    }
    if(/p[aâ]nico|crise/.test(m)){
      return 'Protocolo de crise: 4-4-6 ×5 + grounding 5-4-3-2-1 + micro-ação de 60–120s. Depois, escreva 3 evidências que contrariem o pensamento catastrófico.';
    }
    if(/compul|doce|alimentar/.test(m)){
      return 'Para compulsão: plano ABC (antecedente→comportamento→consequência), atraso de 10min + substituto compatível (andar 5 min, água, ligar para alguém).';
    }
    if(/toc/.test(m)){
      return 'TOC: diferencie “pensamento intrusivo” de intenção. Exposição com prevenção de resposta em degraus, acompanhada de psicanálise focal no sentido do sintoma.';
    }
    if(/trauma|tept|abuso/.test(m)){
      return 'Trauma/TEPT: janela de tolerância primeiro (respiração + interocepção guiada), depois reconsolidação narrativa com segurança relacional. Evite detalhamento sem estabilização.';
    }

    // default: prompt rotativo vinculado à anamnese
    return nextPrompt(d);
  }

  // ===== PDF “Wix-safe” =====
  async function generatePDF(){
    const html = `
      <h1>Seu Mentor Hollístico — Parecer</h1>
      <h2>Parecer do Gestor</h2><pre>${($('#parecer').textContent||'—')}</pre>
      <h2>Plano de ação (30 dias)</h2><pre>${($('#plano').textContent||'—')}</pre>
      <h2>Indicação de estudos (módulos do curso)</h2><pre>${($('#mods').textContent||'—')}</pre>
    `;

    // jsPDF UMD, se disponível
    if(window.jspdf?.jsPDF){
      try{
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit:'pt', format:'a4' });
        await doc.html(`<div>${html}</div>`, {
          x:24,y:24,width:547,windowWidth:900,autoPaging:'text',
          callback:(d)=>d.save('parecer.pdf')
        });
        return;
      }catch(e){ console.warn('jsPDF falhou; usando impressão via iframe', e); }
    }

    // Fallback: imprime via iframe oculto (funciona no sandbox do Wix)
    try{
      const iframe = document.createElement('iframe');
      iframe.style.position='fixed'; iframe.style.right='0'; iframe.style.bottom='0';
      iframe.style.width='0'; iframe.style.height='0'; iframe.style.border='0';
      document.body.appendChild(iframe);
      const idoc = iframe.contentDocument || iframe.contentWindow.document;
      idoc.open();
      idoc.write(`<!doctype html><html><head><meta charset="utf-8">
        <title>Parecer</title>
        <style>@page{size:A4;margin:16mm}
        body{font:400 12pt/1.45 system-ui; color:#111; padding:0 8mm 8mm}
        h1{font:700 18pt;margin:0 0 8pt} h2{font:700 13pt;margin:12pt 0 6pt}
        pre{white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace}</style>
      </head><body>${html}</body></html>`);
      idoc.close();
      setTimeout(()=>{ iframe.contentWindow.focus(); iframe.contentWindow.print(); document.body.removeChild(iframe); }, 350);
      return;
    }catch(e){ console.error(e); }

    // Último recurso
    const w = window.open('', '_blank');
    if(!w) return;
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Parecer</title>${html}`);
    w.document.close(); try{ w.focus(); w.print(); }catch{}
  }

  // ===== Ações =====
  $('#btn_aplicar').addEventListener('click', aplicar);
  $('#btn_limpar').addEventListener('click', ()=>{
    ['f_terapeuta','f_paciente','f_nasc','f_queixa','f_q1','f_q2','f_q3','f_q4','f_q5','f_obs']
    .forEach(id=>document.getElementById(id).value='');
    $('#parecer').textContent='—'; $('#plano').textContent=''; $('#mods').textContent=''; $('#tags').innerHTML='';
    setStatus('Pronto. Preencha e clique em “Aplicar & Prosseguir”.');
  });
  $('#btn_pdf').addEventListener('click', generatePDF);
  $('#btn_copiar').addEventListener('click', async ()=>{
    const blob = `Parecer do Gestor\n\n${$('#parecer').textContent}\n\nPlano de ação (30 dias)\n\n${$('#plano').textContent}\n\nMódulos indicados\n\n${$('#mods').textContent}`;
    try{ await navigator.clipboard.writeText(blob); setStatus('Parecer copiado!'); }catch{ setStatus('Não foi possível copiar', true); }
  });

  // Chat
  $('#chat_send').addEventListener('click', ()=>{
    const i = $('#chat_input'); const txt = (i.value||'').trim(); if(!txt) return;
    say(txt, 'me'); const r = replyChat(txt); say(r, 'ther'); i.value='';
  });
  $('#chat_input').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); $('#chat_send').click(); } });

  // Mensagem inicial do chat
  say('Vamos começar focando no aqui-e-agora. Descreva um episódio recente (onde, com quem, corpo, pensamento, ação). Eu devolvo formulação + próximo passo.');
  </script>

  <!-- (Opcional) jsPDF UMD local/externo: descomente se quiser download direto
  <script src="/vendor/jspdf.umd.min.js" defer></script>
  -->
</body>
</html>
