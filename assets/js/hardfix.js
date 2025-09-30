
/* hardfix.js — estabiliza layout: parecer à direita, Q&A à esquerda, PDF bom e plano 30 dias sem corte */
(function(){
  const $ = (s,r)=> (r||document).querySelector(s);
  const $$ = (s,r)=> Array.from((r||document).querySelectorAll(s));

  /* ---------- CSS gerais ---------- */
  (function ensureCSS(){
    if ($('#isc-hardfix-style')) return;
    const st = document.createElement('style');
    st.id = 'isc-hardfix-style';
    st.textContent = `
      #relatorio, #report { max-height: none !important; height: auto !important; overflow: visible !important; }
      #relatorio .box, #report .box, #relatorio .block, #report .block { max-height:none !important; height:auto !important; overflow:visible !important; }
      #relatorio pre, #report pre { white-space: pre-wrap; max-height:none !important; overflow: visible !important; }
      .sec, .section { margin: 10px 0; }
      @media print {
        .sec, .section, .block { break-inside: avoid; page-break-inside: avoid; }
        h2, h3 { break-after: avoid; }
      }
    `;
    document.head.appendChild(st);
  })();

  /* ---------- Desativa movers antigos ---------- */
  window.ensurePaneNearForm = function(){ /* noop */ };
  window.ensureOutputInRelatorio = function(){ /* noop */ };

  /* ---------- Q&A: botão Enviar + resposta abaixo do campo ---------- */
  function ensureAskMentorUI(){
    const ta = $('#mensagem_mentor, textarea[name="mensagem_mentor"]');
    if(!ta) return;
    // status
    let st = $('#mentor_status', ta.parentElement);
    if(!st){
      st = document.createElement('div');
      st.id = 'mentor_status';
      st.style.fontSize = '12px'; st.style.color = '#64748b'; st.style.marginTop = '6px';
      ta.insertAdjacentElement('afterend', st);
    }
    // botão
    let btn = $('#btn_enviar_pergunta_mentor', ta.parentElement);
    if(!btn){
      btn = document.createElement('button');
      btn.type='button'; btn.id='btn_enviar_pergunta_mentor';
      btn.className='btn'; btn.textContent='Enviar'; btn.style.marginTop='8px';
      ta.parentElement.appendChild(btn);
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        if(typeof window.enviarPerguntaMentor === 'function') window.enviarPerguntaMentor();
        else fallbackSend();
      });
    } else {
      btn.style.display = 'inline-block';
    }
    // saída
    let outWrap = $('#qa_output', ta.parentElement);
    if(!outWrap){
      outWrap = document.createElement('div');
      outWrap.id = 'qa_output'; outWrap.className='sec';
      outWrap.innerHTML = '<h3>Resposta do Gestor</h3><div class="block" id="qa_output_block">—</div>';
      btn.insertAdjacentElement('afterend', outWrap);
    }
  }

  async function fallbackSend(){
    const ta = $('#mensagem_mentor, textarea[name="mensagem_mentor"]');
    const out = $('#qa_output_block'); const st = $('#mentor_status');
    const q = ta ? (ta.value||'').trim() : '';
    if(!q){ if(st) st.textContent='Por favor, escreva a pergunta ao gestor.'; return; }
    if(st) st.textContent='Respondendo…';
    try{
      const form = $('form');
      const base = (typeof window.buildPromptFromForm==='function') ? window.buildPromptFromForm(form) : '';
      const prompt = base + "\n\nPergunta direta ao Mentor: \"" + q + "\"";
      const reply = await window.callMentorBackend(prompt);
      out.innerHTML = reply || '—';
      if(st) st.textContent='✓ Concluído';
    }catch(err){
      if(st) st.textContent='Falha: ' + (err && err.message ? err.message : String(err));
      alert('Erro ao obter resposta do Mentor:\n' + (err && err.message ? err.message : String(err)));
    }
  }

  /* ---------- Parecer (anamnese) na direita, após Conclusão ---------- */
  function ensureParecerRight(){
    const rel = $('#relatorio') || $('#report');
    if(!rel) return;
    // criar container se faltar
    let sec = $('#parecer_report_container', rel);
    if(!sec){
      sec = document.createElement('div');
      sec.id = 'parecer_report_container'; sec.className='section';
      sec.innerHTML = '<h2>Parecer do Gestor</h2><div id="parecer_report_block" class="box">—</div>';
      // colocar depois de "Conclusão"
      const hs = $$('h2,h3', rel);
      let after = null;
      hs.forEach(h=>{ const t=(h.textContent||'').toLowerCase(); if(t.includes('conclus')) after = h; });
      if(after && after.parentElement){
        const p = after.parentElement;
        if(p.nextSibling) p.parentNode.insertBefore(sec, p.nextSibling);
        else p.parentNode.appendChild(sec);
      } else {
        rel.appendChild(sec);
      }
    }
  }

  // wrapper que chama o gerador legado e garante destino certo
  const _gerarParecer = window.gerarParecerSemPergunta;
  window.gerarParecerSemPergunta = async function(formSelector){
    ensureParecerRight();
    const form = $(formSelector||'form');
    const target = $('#parecer_report_block');
    if(!_gerarParecer || !form || !target) return;
    const maybe = await _gerarParecer(formSelector);
    if(typeof maybe === 'string' && maybe.trim()){
      target.innerHTML = maybe;
    }
    // nunca mexer no Q&A
    const qa = $('#qa_output'); if(qa && ($('#relatorio')||$('#report')).contains(qa)) qa.remove();
    // tratar plano 30 dias (chunk)
    ensurePlanHandled();
  };

  /* ---------- Plano de 30 dias: não cortar; chunk por semana ---------- */
  function ensurePlanCSS(){
    if ($('#isc-plan30-style')) return;
    const st = document.createElement('style');
    st.id = 'isc-plan30-style';
    st.textContent = `
      #relatorio .plan30, #report .plan30 { break-inside: avoid; page-break-inside: avoid; }
      #relatorio .plan30 .week, #report .plan30 .week { break-inside: avoid; page-break-inside: avoid; margin-bottom: 8px; }
      #relatorio .box, #report .box, #relatorio .block, #report .block, 
      #relatorio pre, #report pre, #relatorio .content, #report .content,
      #relatorio .card, #report .card, #relatorio .section, #report .section, 
      #relatorio .sec, #report .sec { max-height: none !important; height: auto !important; overflow: visible !important; }
    `;
    document.head.appendChild(st);
  }

  function chunkPlanByWeek(container){
    if(container.dataset.chunked==='1') return;
    const html = container.innerHTML;
    const re = /(?:\*\*\s*Semana\s*\d+\s*\*\*|<strong>\s*Semana\s*\d+\s*<\/strong>)/ig;
    if(!re.test(html)){ container.classList.add('plan30'); return; }
    const parts = html.split(re);
    const headers = html.match(re) || [];
    const frag = document.createElement('div'); frag.className='plan30';
    for(let i=0;i<parts.length;i++){
      const body = parts[i]; const h = headers[i] || '';
      if(!h && !body.trim()) continue;
      const sec = document.createElement('div'); sec.className='week';
      if(h){
        const clean = h.replace(/\*\*/g,'').replace(/<\/?strong>/gi,'');
        const h4 = document.createElement('h4'); h4.textContent = clean.trim();
        sec.appendChild(h4);
      }
      const div = document.createElement('div'); div.innerHTML = body; sec.appendChild(div);
      frag.appendChild(sec);
    }
    container.innerHTML=''; container.appendChild(frag); container.dataset.chunked='1';
  }

  function ensurePlanHandled(){
    ensurePlanCSS();
    const rel = $('#relatorio') || $('#report'); if(!rel) return;
    const hs = $$('h2,h3', rel);
    let block = null;
    hs.forEach(h=>{
      const t=(h.textContent||'').toLowerCase();
      if(t.includes('plano de acompanhamento') && t.includes('30')){
        block = $('.box, .block, pre', h.parentElement) || h.parentElement;
      }
    });
    if(block){ block.classList.add('plan30'); chunkPlanByWeek(block); }
  }

  /* ---------- PDF ---------- */
  window.gerarPDFFromReport = async function(filename){
    const el = $('#relatorio') || $('#report');
    if(!el){ alert('Relatório não encontrado.'); return; }
    const opt = {
      margin: 10,
      filename: (filename || 'Relatorio-ISC') + '.pdf',
      html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css','legacy'], avoid: ['.plan30','.week','.sec','.section','.block','.box','h2','h3'] }
    };
    if(window.html2pdf){ await window.html2pdf().from(el).set(opt).save(); }
    else { window.print(); }
  };

  /* ---------- Bootstrap ---------- */
  function boot(){
    ensureAskMentorUI();
    ensureParecerRight();
    ensurePlanHandled();
  }
  if(document.readyState==='complete' || document.readyState==='interactive'){ setTimeout(boot,0); }
  else document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('click', (e)=>{
    const txt=(e.target.textContent||'').toLowerCase();
    if(txt.includes('pré-visualizar')||txt.includes('aplicar')||txt.includes('prosseguir')||txt.includes('gerar pdf')){
      setTimeout(boot,120);
    }
  }, true);
  setInterval(ensureAskMentorUI, 1200);

  /* ---------- Stubs ---------- */
  if(typeof window.attachDobNormalizer!=='function'){ window.attachDobNormalizer=function(){}; }
})();


/* --- v5: fix stray banner + hide history --- */
(function(){
  const q = (s,r)=> (r||document).querySelector(s);
  const qa = (s,r)=> Array.from((r||document).querySelectorAll(s));

  function inside(node, root){
    if(!node || !root) return false;
    let n = node;
    while(n){
      if(n === root) return true;
      n = n.parentElement;
    }
    return false;
  }

  function hideHistoryQA(){
    const rel = q('#relatorio') || q('#report');
    if(!rel) return;
    // remove cards that have an h3/h4 with the text "Histórico de Q&A com o Gestor"
    const headings = qa('h2,h3,h4', rel).filter(h => (h.textContent||'').toLowerCase().includes('histórico de q&a com o gestor'));
    headings.forEach(h => {
      const card = h.closest('.section, .sec, .card, .box, .block') || h.parentElement;
      if(card && inside(card, rel)) card.remove();
    });
  }

  function ensureParecerOnlyOnRight(){
    const rel = q('#relatorio') || q('#report');
    if(!rel) return;
    // Remove any parecer containers that are NOT inside rel
    qa('#parecer_report_container').forEach(sec => {
      if(!inside(sec, rel)) sec.remove();
    });
    // If there is a heading "Parecer do Gestor" outside rel, remove
    qa('h2,h3').forEach(h => {
      const t = (h.textContent||'').trim().toLowerCase();
      if(t === 'parecer do gestor' && !inside(h, rel)){
        const card = h.closest('.section, .sec, .card, .box, .block') || h.parentElement;
        if(card) card.remove();
        else h.remove();
      }
    });
  }

  function v5Fix(){
    ensureParecerOnlyOnRight();
    hideHistoryQA();
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(v5Fix, 50);
  } else {
    document.addEventListener('DOMContentLoaded', v5Fix);
  }
  // re-run after user actions
  document.addEventListener('click', function(e){
    const txt = (e.target.textContent||'').toLowerCase();
    if(txt.includes('pré-visualizar') || txt.includes('aplicar') || txt.includes('prosseguir') || txt.includes('gerar pdf')){
      setTimeout(v5Fix, 120);
    }
  }, true);
  // periodic guard
  setInterval(v5Fix, 1500);
})();


/* --- v6: remove "Histórico de Q&A com o Gestor" (qualquer variação) em todo lugar --- */
(function(){
  const q = (s,r)=> (r||document).querySelector(s);
  const qa = (s,r)=> Array.from((r||document).querySelectorAll(s));
  function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
  function closestCard(el){
    return el.closest('.section, .sec, .card, .box, .block, .callout, .panel, .container') || el;
  }
  function removeHistoryQAAnywhere(){
    const patterns = [
      'historico de q&a com o gestor',
      'historico de qa com o gestor',
      'historico de q e a com o gestor',
      'histórico de q&a com o gestor',
      'histórico de qa com o gestor',
      'histórico de q e a com o gestor'
    ];
    const msgPatterns = [
      'sem perguntas registradas',
      'sem perguntas registradas para este caso ainda',
      'sem perguntas para este caso'
    ];
    const nodes = qa('h1,h2,h3,h4,h5,p,div,section,article,span');
    nodes.forEach(n => {
      const t = norm(n.textContent);
      if(!t) return;
      if(patterns.some(p => t.includes(p))){
        const card = closestCard(n);
        card.remove();
      }
    });
    // Remove mensagens soltas de "sem perguntas registradas…"
    qa('p,div,span,li').forEach(n => {
      const t = norm(n.textContent);
      if(msgPatterns.some(p => t.includes(p))){
        const parent = closestCard(n);
        // se o parent ficou vazio depois, remove; senão só remove a linha
        if(parent && parent.children && parent.children.length<=1){ parent.remove(); }
        else { n.remove(); }
      }
    });
  }
  // run now and keep guarding
  const kick = ()=> setTimeout(removeHistoryQAAnywhere, 30);
  if(document.readyState === 'complete' || document.readyState === 'interactive'){ kick(); }
  else { document.addEventListener('DOMContentLoaded', kick); }
  // guard on user actions and periodically
  document.addEventListener('click', ()=> setTimeout(removeHistoryQAAnywhere, 50), true);
  setInterval(removeHistoryQAAnywhere, 1200);
})();


/* --- v7: remove "Histórico de Q&A com o Gestor" somente dentro do RELATÓRIO, de forma conservadora --- */
(function(){
  try{
    const q = (s,r)=> (r||document).querySelector(s);
    const qa = (s,r)=> Array.from((r||document).querySelectorAll(s));
    const norm = (s)=> (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const isSmallCard = (el)=> el && (el.classList?.contains('section') || el.classList?.contains('sec') 
                                      || el.classList?.contains('card') || el.classList?.contains('box') 
                                      || el.classList?.contains('block'));

    function removeHistoryQAReportOnly(){
      const rel = q('#relatorio') || q('#report');
      if(!rel) return;
      // 1) headings que contém "Histórico de Q&A com o Gestor"
      qa('h1,h2,h3,h4,h5', rel).forEach(h => {
        const t = norm(h.textContent);
        if(t.includes('historico de q&a com o gestor') or t.includes('historico de qa com o gestor') or t.includes('historico de q e a com o gestor')){
          const card = h.closest('.section, .sec, .card, .box, .block');
          if(card && rel.contains(card)) card.remove();
        }
      });
      // 2) mensagens "sem perguntas registradas..." dentro do relatorio
      qa('p,div,span,li', rel).forEach(n => {
        const t = norm(n.textContent);
        if(t.includes('sem perguntas registradas')){
          // só remove a linha; se o bloco ficar vazio e for pequeno, remove o bloco
          const parent = n.parentElement;
          n.remove();
          if(parent && isSmallCard(parent) && !parent.textContent.trim()) parent.remove();
        }
      });
    }

    // Run agora e proteger em ações comuns
    const run = ()=> setTimeout(removeHistoryQAReportOnly, 30);
    if(document.readyState === 'complete' || document.readyState === 'interactive'){ run(); }
    else { document.addEventListener('DOMContentLoaded', run); }
    document.addEventListener('click', (e)=>{
      const txt = (e.target.textContent||'').toLowerCase();
      if(txt.includes('pré-visualizar') || txt.includes('aplicar') || txt.includes('prosseguir') || txt.includes('gerar pdf')){
        setTimeout(removeHistoryQAReportOnly, 120);
      }
    }, true);
    setInterval(removeHistoryQAReportOnly, 2000);
  }catch(_e){ /* nunca deixa quebrar a página */ }
})();


/* --- v8: garante botão "Enviar" VISÍVEL e resposta abaixo do campo (Q&A) --- */
(function(){
  const q = (s,r)=> (r||document).querySelector(s);
  const qa = (s,r)=> Array.from((r||document).querySelectorAll(s));

  // acha a textarea da Pergunta ao gestor por id, name, label, placeholder
  function findQuestionField(){
    let el = q('#mensagem_mentor') || q('textarea[name="mensagem_mentor"]');
    if(el) return el;
    // tenta por label
    qa('label').forEach(lb=>{
      const t=(lb.textContent||'').toLowerCase();
      if(!el && t.includes('pergunta ao gestor')){
        const forId = lb.getAttribute('for');
        if(forId) el = document.getElementById(forId);
        else {
          // procura textarea no mesmo bloco
          const near = lb.closest('.field, .form-group, .row, div');
          el = q('textarea', near||lb.parentElement) || el;
        }
      }
    });
    // tenta por placeholder
    if(!el){
      qa('textarea').forEach(t=>{
        const ph = (t.getAttribute('placeholder')||'').toLowerCase();
        if(!el && (ph.includes('pergunta') || ph.includes('gestor'))) el = t;
      });
    }
    return el;
  }

  function ensureAskMentorUI_v8(){
    const ta = findQuestionField();
    if(!ta) return;
    const wrap = ta.parentElement || ta.closest('div') || document.body;

    // status (mensagem pequena)
    let st = q('#mentor_status', wrap);
    if(!st){
      st = document.createElement('div');
      st.id = 'mentor_status';
      st.style.fontSize='12px'; st.style.color='#64748b'; st.style.margin='6px 0 2px 0';
      ta.insertAdjacentElement('afterend', st);
    }

    // botão Enviar (sempre visível)
    let btn = q('#btn_enviar_pergunta_mentor', wrap);
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'btn_enviar_pergunta_mentor';
      btn.type='button';
      btn.className='btn';
      btn.textContent='Enviar';
      btn.style.margin='8px 0';
      st.insertAdjacentElement('afterend', btn);
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        if(typeof window.enviarPerguntaMentorHardfix === 'function') window.enviarPerguntaMentorHardfix();
      });
    } else {
      btn.style.display='inline-flex';
      btn.style.visibility='visible';
      if(!btn._wired){
        btn.addEventListener('click', function(ev){
          ev.preventDefault();
          if(typeof window.enviarPerguntaMentorHardfix === 'function') window.enviarPerguntaMentorHardfix();
        });
        btn._wired = true;
      }
    }

    // bloco de saída logo abaixo
    let out = q('#qa_output', wrap);
    if(!out){
      out = document.createElement('div');
      out.id = 'qa_output';
      out.className='sec';
      out.innerHTML = '<h3>Resposta do Gestor</h3><div class="block" id="qa_output_block">—</div>';
      btn.insertAdjacentElement('afterend', out);
    }
  }

  // handler garantido do Q&A
  window.enviarPerguntaMentorHardfix = async function(){
    const ta = findQuestionField();
    const wrap = ta ? (ta.parentElement||document.body) : document.body;
    const st = q('#mentor_status', wrap) || (function(){ const d=document.createElement('div'); d.id='mentor_status'; (ta||wrap).insertAdjacentElement('afterend', d); return d; })();
    const out = q('#qa_output_block', wrap) || (function(){ const d=document.createElement('div'); d.id='qa_output_block'; (ta||wrap).insertAdjacentElement('afterend', d); return d; })();
    if(!ta){ alert('Campo "Pergunta ao gestor" não encontrado.'); return; }
    const question = (ta.value||'').trim();
    if(!question){ st.textContent='Por favor, escreva a pergunta ao gestor.'; return; }

    st.textContent = 'Respondendo…';
    try{
      const form = q('form');
      const base = (typeof window.buildPromptFromForm==='function') ? window.buildPromptFromForm(form) : '';
      const prompt = base + "\\n\\nPergunta direta ao Mentor: \\"" + question.replace(/"/g,'\\"') + "\\"";
      if(typeof window.callMentorBackend !== 'function'){
        throw new Error('Backend não disponível');
      }
      const reply = await window.callMentorBackend(prompt);
      out.innerHTML = reply || '—';
      st.textContent = '✓ Concluído';
    } catch(err){
      st.textContent = 'Falha: ' + (err && err.message ? err.message : String(err));
      alert('Erro ao obter resposta do Mentor:\\n' + (err && err.message ? err.message : String(err)));
    }
  };

  // boot e guarda
  function boot(){ try{ ensureAskMentorUI_v8(); }catch(_e){} }
  if(document.readyState==='complete' || document.readyState==='interactive'){ setTimeout(boot,0); }
  else document.addEventListener('DOMContentLoaded', boot);
  // ações que costumam re-renderizar
  document.addEventListener('click', (e)=>{
    const t=(e.target.textContent||'').toLowerCase();
    if(t.includes('pré-visualizar') || t.includes('aplicar') || t.includes('prosseguir') || t.includes('gerar pdf')){
      setTimeout(boot, 100);
    }
  }, true);
  // verificação periódica leve pra manter botão/saída
  setInterval(boot, 1500);
})();


/* --- v9: Numerologia — preenche Dia de Nascimento e Caminho de Vida quando a anamnese tem data --- */
(function(){
  const q = (s,r)=> (r||document).querySelector(s);
  const qa = (s,r)=> Array.from((r||document).querySelectorAll(s));

  function parseDateLoose(txt){
    if(!txt) return null;
    txt = String(txt).trim();
    // ISO yyyy-mm-dd
    let m = txt.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if(m){
      const y=+m[1], mo=+m[2], d=+m[3];
      return new Date(y, mo-1, d);
    }
    // dd/mm/yyyy
    m = txt.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if(m){
      const d=+m[1], mo=+m[2], y=+m[3];
      return new Date(y, mo-1, d);
    }
    // ddmmyyyy or yyyymmdd
    m = txt.match(/^(\d{2})(\d{2})(\d{4})$/);
    if(m){
      const d=+m[1], mo=+m[2], y=+m[3];
      return new Date(y, mo-1, d);
    }
    m = txt.match(/^(\d{4})(\d{2})(\d{2})$/);
    if(m){
      const y=+m[1], mo=+m[2], d=+m[3];
      return new Date(y, mo-1, d);
    }
    return null;
  }

  function findBirthDate(){
    // try common inputs
    const candidates = [
      '#data_nascimento',
      'input[name="data_nascimento"]',
      'input[name="nascimento"]',
      'input[type="date"]',
      'input[placeholder*="nascimento" i]',
      'input[name*="nasc" i]',
      'input[id*="nasc" i]',
      'input[type="text"][placeholder*="nasc" i]',
    ];
    for(const sel of candidates){
      const el = q(sel);
      if(el && el.value) { const dt = parseDateLoose(el.value); if(dt) return dt; }
    }
    // try by label
    for(const lb of qa('label')){
      const t = (lb.textContent||'').toLowerCase();
      if(t.includes('data de nascimento') || t.includes('nascimento')){
        const forId = lb.getAttribute('for');
        const el = forId ? document.getElementById(forId) : lb.parentElement.querySelector('input');
        if(el && el.value){ const dt = parseDateLoose(el.value); if(dt) return dt; }
      }
    }
    return null;
  }

  function reduceSum(n){
    let s = String(n).replace(/\D/g,'');
    let val = s.split('').reduce((a,b)=>a+(+b),0);
    // preserve master numbers 11, 22
    while(val > 9 and val !== 11 and val !== 22 and val !== 33){
      val = String(val).split('').reduce((a,b)=>a+(+b),0);
    }
    return val;
  }

  function lifePathFromDate(dt){
    if(!dt) return null;
    const y = dt.getFullYear();
    const mo = dt.getMonth()+1;
    const d = dt.getDate();
    const sum = reduceSum(String(y)+String(mo).padStart(2,'0')+String(d).padStart(2,'0'));
    return sum;
  }

  function fillNumerologia(){
    const rel = q('#relatorio') || q('#report'); if(!rel) return;
    const dt = findBirthDate(); if(!dt) return;
    const dia = dt.getDate();
    const caminho = lifePathFromDate(dt);

    // Try to replace in tables/rows first
    const labels = qa('th,td,strong,b,span,p,div', rel);
    labels.forEach(n => {
      const t = (n.textContent||'').trim().toLowerCase();
      // Dia de Nascimento
      if(t.includes('número do dia de nascimento') || t.includes('numero do dia de nascimento')){
        const tr = n.closest('tr');
        if(tr){
          const tds = tr.querySelectorAll('td,th');
          if(tds.length>=2){
            tds[1].textContent = String(dia);
          }
        } else {
          // fallback: sibling text
          const sib = n.parentElement;
          if(sib){
            sib.innerHTML = sib.innerHTML.replace(/n[oó] fornecido\.?/i, String(dia));
          }
        }
      }
      // Caminho de Vida
      if(t.includes('número do caminho de vida') || t.includes('numero do caminho de vida')){
        const tr = n.closest('tr');
        if(tr){
          const tds = tr.querySelectorAll('td,th');
          if(tds.length>=2){
            tds[1].textContent = String(caminho);
          }
        } else {
          const sib = n.parentElement;
          if(sib){
            sib.innerHTML = sib.innerHTML.replace(/n[oó] fornecido\.?/i, String(caminho));
          }
        }
      }
    });

    // As a last resort, string replace in HTML
    let html = rel.innerHTML;
    html = html.replace(/(\*\*\s*N[uú]mero do Dia de Nascimento\s*\*\*[^|]*\|\s*)(N[oó] fornecido\.?)/gi, '$1'+dia);
    html = html.replace(/(\*\*\s*N[uú]mero do Caminho de Vida\s*\*\*[^|]*\|\s*)(N[oó] fornecido\.?)/gi, '$1'+caminho);
    rel.innerHTML = html;
  }

  function boot(){
    try{ fillNumerologia(); }catch(_){}
  }
  if(document.readyState==='complete' || document.readyState==='interactive'){ setTimeout(boot,0); }
  else document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('click', (e)=>{
    const t=(e.target.textContent||'').toLowerCase();
    if(t.includes('pré-visualizar') || t.includes('aplicar') || t.includes('prosseguir') || t.includes('gerar pdf')){
      setTimeout(fillNumerologia, 150);
    }
  }, true);
  setInterval(fillNumerologia, 1800);
})();


/* --- v10: Botão "Enviar" à prova de tudo no campo Pergunta ao gestor + resposta logo abaixo --- */
(function(){
  const q = (s,r)=> (r||document).querySelector(s);
  const qa = (s,r)=> Array.from((r||document).querySelectorAll(s));
  const norm = (s)=> (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  function findQuestionField(){
    // 1) ids/names mais comuns
    let el = q('#mensagem_mentor') || q('textarea[name="mensagem_mentor"]');
    if(el) return el;
    // 2) procura por label contendo "pergunta ao gestor"
    const labels = qa('label');
    for(const lb of labels){
      const t = norm(lb.textContent);
      if(t.includes('pergunta') && t.includes('gestor')){
        const forId = lb.getAttribute('for');
        if(forId){
          const cand = document.getElementById(forId);
          if(cand && (cand.tagName==='TEXTAREA' || cand.tagName==='INPUT')) return cand;
        }
        const near = lb.closest('.field, .form-group, .row, .col, div');
        const cand2 = q('textarea, input[type="text"]', near||lb.parentElement);
        if(cand2) return cand2;
      }
    }
    // 3) varredura de textareas com placeholder
    const tas = qa('textarea');
    for(const t of tas){
      const ph = norm(t.getAttribute('placeholder')||'');
      if(ph.includes('pergunta') || ph.includes('gestor')) return t;
    }
    return null;
  }

  function ensureAskMentorUI_v10(){
    const ta = findQuestionField();
    if(!ta) return;
    const wrap = ta.closest('.field, .form-group, .row, .col, .card, .box, .sec, .section') || ta.parentElement || document.body;

    // Status pequeno
    let st = q('#mentor_status', wrap);
    if(!st){
      st = document.createElement('div');
      st.id = 'mentor_status';
      st.style.cssText = 'font-size:12px;color:#64748b;margin:6px 0 4px 0;';
      ta.insertAdjacentElement('afterend', st);
    }

    // Botão Enviar (visível, sem classes de ocultação)
    let btn = q('#btn_enviar_pergunta_mentor', wrap);
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'btn_enviar_pergunta_mentor';
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = 'Enviar';
      btn.style.cssText = 'margin:8px 0;display:inline-flex;align-items:center;gap:6px;visibility:visible;opacity:1;pointer-events:auto;';
      st.insertAdjacentElement('afterend', btn);
    }
    // Remover classes que escondem
    ['hidden','d-none','is-hidden','sr-only','invisible'].forEach(c=> btn.classList.remove(c));
    Object.assign(btn.style, {display:'inline-flex', visibility:'visible', opacity:'1', pointerEvents:'auto'});

    // Click handler (depois de garantido o botão)
    if(!btn._wired){
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        if(typeof window.enviarPerguntaMentorHardfix === 'function') window.enviarPerguntaMentorHardfix();
      });
      btn._wired = true;
    }

    // Área de saída logo abaixo do botão
    let out = q('#qa_output', wrap);
    if(!out){
      out = document.createElement('div');
      out.id = 'qa_output';
      out.className = 'sec';
      out.innerHTML = '<h3>Resposta do Gestor</h3><div class="block" id="qa_output_block">—</div>';
      btn.insertAdjacentElement('afterend', out);
    }
  }

  // Reforço contínuo (em caso de re-render)
  function bootV10(){ try{ ensureAskMentorUI_v10(); }catch(_e){} }
  if(document.readyState==='complete' || document.readyState==='interactive'){ setTimeout(bootV10,0); }
  else document.addEventListener('DOMContentLoaded', bootV10);
  document.addEventListener('click', (e)=>{
    const t = norm(e.target.textContent||'');
    if(t.includes('pre-visualizar') || t.includes('pré-visualizar') || t.includes('aplicar') || t.includes('prosseguir') || t.includes('gerar pdf')){
      setTimeout(bootV10, 120);
    }
  }, true);
  const mo = new MutationObserver(()=> bootV10());
  mo.observe(document.documentElement, {childList:true, subtree:true});
  setInterval(bootV10, 1500);
})();


/* --- v11: anti-corte do relatório + botão Enviar indestrutível --- */
(function(){
  const q = (s,r)=> (r||document).querySelector(s);
  const qa = (s,r)=> Array.from((r||document).querySelectorAll(s));
  const norm = (s)=> (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  /* 1) CSS mais agressivo pro painel de RELATÓRIO */
  (function ensureReportCSS(){
    if (document.getElementById('isc-report-anti-cut')) return;
    const st = document.createElement('style'); st.id='isc-report-anti-cut';
    st.textContent = `
      #relatorioRootIndex, #relatorio, #report,
      [id*="relatorio"], [class*="relatorio"],
      .isc-relatorio-pane, .report-pane, .right, .right-pane, .col, .col-md-6, .col-lg-6 {
        max-height: none !important; height: auto !important; overflow: visible !important;
      }
      #relatorio pre, #report pre, [id*="relatorio"] pre { white-space: pre-wrap; max-height: none !important; overflow: visible !important; }
      .sec, .section, .block, .box, pre { break-inside: avoid; page-break-inside: avoid; }
    `;
    document.head.appendChild(st);
  })();

  /* 2) Botão Enviar: localizar campo da Pergunta ao gestor e blindar UI */
  function findQuestionField(){
    let el = q('#mensagem_mentor') || q('textarea[name="mensagem_mentor"]');
    if(el) return el;
    // label que contenha "Pergunta ao gestor"
    for(const lb of qa('label')){
      const t = norm(lb.textContent);
      if(t.includes('pergunta') && t.includes('gestor')){
        const forId = lb.getAttribute('for');
        if(forId){
          const cand = document.getElementById(forId);
          if(cand && (cand.tagName==='TEXTAREA'||cand.tagName==='INPUT')) return cand;
        }
        const near = lb.closest('.field, .form-group, .row, .col, .card, .box, .sec, .section') || lb.parentElement;
        const cand2 = q('textarea, input[type="text"]', near);
        if(cand2) return cand2;
      }
    }
    // placeholder com "pergunta" ou "gestor"
    for(const t of qa('textarea')){
      const ph = norm(t.getAttribute('placeholder')||'');
      if(ph.includes('pergunta') || ph.includes('gestor')) return t;
    }
    return null;
  }

  function ensureAskMentorUI_v11(){
    const ta = findQuestionField();
    if(!ta) return;
    const wrap = ta.closest('.field, .form-group, .row, .col, .card, .box, .sec, .section') || ta.parentElement || document.body;

    // status
    let st = q('#mentor_status', wrap);
    if(!st){
      st = document.createElement('div');
      st.id='mentor_status';
      st.style.cssText='font-size:12px;color:#64748b;margin:6px 0 4px 0;';
      ta.insertAdjacentElement('afterend', st);
    }

    // botão Enviar
    let btn = q('#btn_enviar_pergunta_mentor', wrap);
    if(!btn){
      btn = document.createElement('button');
      btn.id='btn_enviar_pergunta_mentor';
      btn.type='button'; btn.className='btn';
      btn.textContent='Enviar';
      btn.style.cssText='margin:8px 0;display:inline-flex;align-items:center;gap:6px;visibility:visible;opacity:1;pointer-events:auto;';
      st.insertAdjacentElement('afterend', btn);
    }
    // desbloqueia se estiver escondido por classes/estilos
    ['hidden','d-none','is-hidden','sr-only','invisible'].forEach(c=> btn.classList.remove(c));
    Object.assign(btn.style, {display:'inline-flex', visibility:'visible', opacity:'1', pointerEvents:'auto'});

    if(!btn._wired){
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        if(typeof window.enviarPerguntaMentorHardfix === 'function') window.enviarPerguntaMentorHardfix();
      });
      btn._wired = true;
    }

    // bloco de saída
    let out = q('#qa_output', wrap);
    if(!out){
      out = document.createElement('div');
      out.id='qa_output'; out.className='sec';
      out.innerHTML = '<h3>Resposta do Gestor</h3><div class="block" id="qa_output_block">—</div>';
      btn.insertAdjacentElement('afterend', out);
    }
  }

  // handler garantido
  window.enviarPerguntaMentorHardfix = async function(){
    const ta = findQuestionField();
    const wrap = ta ? (ta.closest('.field, .form-group, .row, .col, .card, .box, .sec, .section') || ta.parentElement || document.body) : document.body;
    const st = q('#mentor_status', wrap) || (function(){ const d=document.createElement('div'); d.id='mentor_status'; (ta||wrap).insertAdjacentElement('afterend', d); return d; })();
    const out = q('#qa_output_block', wrap) || (function(){ const d=document.createElement('div'); d.id='qa_output_block'; (ta||wrap).insertAdjacentElement('afterend', d); return d; })();
    if(!ta){ alert('Campo "Pergunta ao gestor" não encontrado.'); return; }
    const question = (ta.value||'').trim();
    if(!question){ st.textContent='Por favor, escreva a pergunta ao gestor.'; return; }

    st.textContent='Respondendo…';
    try{
      const form = q('form');
      const base = (typeof window.buildPromptFromForm==='function') ? window.buildPromptFromForm(form) : '';
      const prompt = base + "\\n\\nPergunta direta ao Mentor: \\"" + question.replace(/"/g,'\\"') + "\\"";
      if(typeof window.callMentorBackend !== 'function') throw new Error('Backend não disponível');
      const reply = await window.callMentorBackend(prompt);
      out.innerHTML = reply || '—';
      st.textContent='✓ Concluído';
    }catch(err){
      st.textContent='Falha: ' + (err && err.message ? err.message : String(err));
      alert('Erro ao obter resposta do Mentor:\\n' + (err && err.message ? err.message : String(err)));
    }
  };

  // re-aplica sempre que algo mudar no DOM
  function boot(){ try{ ensureAskMentorUI_v11(); }catch(e){} }
  if(document.readyState==='complete' || document.readyState==='interactive'){ setTimeout(boot,0); }
  else document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('click', (e)=>{
    const t=norm(e.target.textContent||'');
    if(t.includes('pre-visualizar')||t.includes('pré-visualizar')||t.includes('aplicar')||t.includes('prosseguir')||t.includes('gerar pdf')){
      setTimeout(boot,120);
    }
  }, true);
  const mo = new MutationObserver(()=> boot());
  mo.observe(document.documentElement, {childList:true, subtree:true});
  setInterval(boot, 1500);
})();


/* --- v12: Força rótulo do botão Enviar, Q&A só à esquerda, e anti-corte mais forte --- */
(function(){
  const q = (s,r)=> (r||document).querySelector(s);
  const qa = (s,r)=> Array.from((r||document).querySelectorAll(s));
  const norm = (s)=> (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  // 0) CSS anti-corte extra
  (function ensureNoCutCSS(){
    if(document.getElementById('isc-nocut-v12')) return;
    const st = document.createElement('style'); st.id='isc-nocut-v12';
    st.textContent = `
      #relatorio, #report, [id*="relatorio"], [class*="relatorio"] { max-height:none!important; height:auto!important; overflow:visible!important; }
      #relatorio pre, #report pre, [id*="relatorio"] pre { white-space:pre-wrap!important; word-break:break-word!important; overflow-wrap:anywhere!important; text-overflow:clip!important; }
      .sec, .section, .block, .box, pre { break-inside:avoid!important; page-break-inside:avoid!important; }
    `;
    document.head.appendChild(st);
  })();

  // 1) Localiza textarea da pergunta
  function findQuestionField(){
    let el = q('#mensagem_mentor') || q('textarea[name="mensagem_mentor"]');
    if(el) return el;
    for(const lb of qa('label')){
      const t = norm(lb.textContent);
      if(t.includes('pergunta') && t.includes('gestor')){
        const forId = lb.getAttribute('for');
        if(forId){
          const cand = document.getElementById(forId);
          if(cand && (cand.tagName==='TEXTAREA'||cand.tagName==='INPUT')) return cand;
        }
        const near = lb.closest('.field, .form-group, .row, .col, .card, .box, .sec, .section') || lb.parentElement;
        const cand2 = q('textarea, input[type="text"]', near);
        if(cand2) return cand2;
      }
    }
    for(const t of qa('textarea')){
      const ph = norm(t.getAttribute('placeholder')||'');
      if(ph.includes('pergunta') || ph.includes('gestor')) return t;
    }
    return null;
  }

  // 2) Garante UI do Q&A (botão + saída)
  function ensureQAUI(){
    const ta = findQuestionField(); if(!ta) return;
    const wrap = ta.closest('.field, .form-group, .row, .col, .card, .box, .sec, .section') || ta.parentElement || document.body;

    // status
    let st = q('#mentor_status', wrap);
    if(!st){
      st = document.createElement('div'); st.id='mentor_status';
      st.style.cssText='font-size:12px;color:#64748b;margin:6px 0 4px 0;';
      ta.insertAdjacentElement('afterend', st);
    }

    // botão
    let btn = q('#btn_enviar_pergunta_mentor', wrap);
    if(!btn){
      btn = document.createElement('button');
      btn.id='btn_enviar_pergunta_mentor'; btn.type='button';
      btn.className='btn';
      btn.innerText='Enviar';
      btn.setAttribute('aria-label','Enviar'); btn.title='Enviar';
      btn.style.cssText='margin:8px 0;display:inline-flex;align-items:center;gap:6px;visibility:visible;opacity:1;pointer-events:auto;min-width:96px;padding:8px 12px;';
      st.insertAdjacentElement('afterend', btn);
    } else {
      // força rótulo e visibilidade
      if(!btn.innerText || norm(btn.innerText)==='') btn.innerText='Enviar';
      btn.setAttribute('aria-label','Enviar'); btn.title='Enviar';
      ['hidden','d-none','is-hidden','sr-only','invisible'].forEach(c=> btn.classList.remove(c));
      Object.assign(btn.style, {display:'inline-flex', visibility:'visible', opacity:'1', pointerEvents:'auto', minWidth:'96px', padding:'8px 12px'});
    }

    // saída
    let out = q('#qa_output', wrap);
    if(!out){
      out = document.createElement('div'); out.id='qa_output'; out.className='sec';
      out.innerHTML = '<h3>Resposta do Gestor</h3><div class="block" id="qa_output_block">—</div>';
      btn.insertAdjacentElement('afterend', out);
    }

    // click
    if(!btn._wired){
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        if(typeof window.enviarPerguntaMentorHardfix === 'function') window.enviarPerguntaMentorHardfix();
      }, true);
      btn._wired = true;
    }
  }

  // 3) Handler do Q&A (com flag global para bloquear parecer)
  window.enviarPerguntaMentorHardfix = async function(){
    const ta = findQuestionField();
    const wrap = ta ? (ta.closest('.field, .form-group, .row, .col, .card, .box, .sec, .section') || ta.parentElement || document.body) : document.body;
    const st = q('#mentor_status', wrap) || (function(){ const d=document.createElement('div'); d.id='mentor_status'; (ta||wrap).insertAdjacentElement('afterend', d); return d; })();
    const out = q('#qa_output_block', wrap) || (function(){ const d=document.createElement('div'); d.id='qa_output_block'; (ta||wrap).insertAdjacentElement('afterend', d); return d; })();
    if(!ta){ alert('Campo "Pergunta ao gestor" não encontrado.'); return; }
    const question = (ta.value||'').trim();
    if(!question){ st.textContent='Por favor, escreva a pergunta ao gestor.'; return; }

    // seta flag de modo Q&A
    window.__hardfix_qamode = true;
    st.textContent='Respondendo…';
    try{
      const form = q('form');
      const base = (typeof window.buildPromptFromForm==='function') ? window.buildPromptFromForm(form) : '';
      const prompt = base + "\\n\\nPergunta direta ao Mentor: \\"" + question.replace(/"/g,'\\"') + "\\"";
      if(typeof window.callMentorBackend !== 'function') throw new Error('Backend não disponível');
      const reply = await window.callMentorBackend(prompt);
      out.innerHTML = reply || '—';
      st.textContent='✓ Concluído';
    }catch(err){
      st.textContent='Falha: ' + (err && err.message ? err.message : String(err));
      alert('Erro ao obter resposta do Mentor:\\n' + (err && err.message ? err.message : String(err)));
    }finally{
      // limpa a flag após pequenos ms pra pegar callbacks atrasados
      setTimeout(()=>{ window.__hardfix_qamode = false; }, 400);
    }
  };

  // 4) Blindagem: se algum submit tentar disparar parecer durante Q&A, cancela
  document.addEventListener('submit', function(e){
    if(window.__hardfix_qamode){
      e.stopPropagation(); e.preventDefault();
    }
  }, true);

  // 5) Blindagem: wrappers que ignoram chamadas se for Q&A
  const _genParecer = window.gerarParecerSemPergunta;
  window.gerarParecerSemPergunta = async function(formSelector){
    if(window.__hardfix_qamode) return; // não gera parecer quando estamos respondendo Q&A
    if(!_genParecer) return;
    return _genParecer(formSelector);
  };
  // Algumas páginas usam window.enviarPerguntaMentor – sobrescreve para o nosso
  window.enviarPerguntaMentor = function(){ return window.enviarPerguntaMentorHardfix(); };

  // 6) Reaplica UI após re-render
  function boot(){ try{ ensureQAUI(); }catch(_e){} }
  if(document.readyState==='complete' || document.readyState==='interactive'){ setTimeout(boot,0); }
  else document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('click', (e)=>{
    const t = norm(e.target.textContent||'');
    if(t.includes('pre-visualizar')||t.includes('pré-visualizar')||t.includes('aplicar')||t.includes('prosseguir')||t.includes('gerar pdf')){
      setTimeout(boot, 120);
    }
  }, true);
  const mo = new MutationObserver(()=> boot());
  mo.observe(document.documentElement, {childList:true, subtree:true});
  setInterval(boot, 1500);
})();
