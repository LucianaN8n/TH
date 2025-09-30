
function parseDOB(input){
  if(!input) return null;
  input = input.toString().trim();
  var digits = input.replace(/[^0-9]/g,'');
  if(digits.length===8){
    return digits.slice(0,2)+'/'+digits.slice(2,4)+'/'+digits.slice(4);
  } else if(digits.length===6){
    var yy = parseInt(digits.slice(4),10);
    var full = (yy>30?'19':'20') + (yy<10?('0'+yy):yy);
    return digits.slice(0,2)+'/'+digits.slice(2,4)+'/'+full;
  } else {
    var m = /^([0-9]{2})[\/\-]([0-9]{2})[\/\-]([0-9]{2,4})$/.exec(input);
    if(m){
      var y = m[3].length===2 ? ((parseInt(m[3],10)>30?'19':'20') + m[3]) : m[3];
      return m[1]+'/'+m[2]+'/'+y;
    }
    return null;
  }
}
function normalizarDOB(input){ try{ return parseDOB(input)||null; }catch(e){ return null; } }
function validarDOB(input){ return !!normalizarDOB(input); }
window.normalizarDOB = normalizarDOB; window.validarDOB = validarDOB;

function normalizeDate(input){ return normalizarDOB(input) || input; }
function calcIdade(dobStr){
  const m = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/.exec(dobStr||"");
  if(!m) return ""; const d=parseInt(m[1],10), mo=parseInt(m[2],10)-1, y=parseInt(m[3],10);
  const birth = new Date(y,mo,d); const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if(md<0 || (md===0 && today.getDate()<birth.getDate())) age--; return age;
}

function buildRelatorio(data){
  const dob = normalizeDate(data.dataNascimento||""); const idade = calcIdade(dob);
  const today = new Date(); const dataAtendimento = today.toLocaleDateString('pt-BR');
  const section=(t,c)=>`<div class="section"><h2>${t}</h2>${c}</div>`; const box=(h)=>`<div class="box">${h}</div>`;
  const tecnicasTable = `
    <table class="tech-table">
      <thead><tr><th>Técnica</th><th>Justificativa</th><th>Protocolo</th></tr></thead>
      <tbody>${(data.tecnicas||[]).map(t=>`<tr><td>${t.nome||"—"}</td><td>${t.justificativa||"—"}</td><td>${t.protocolo||"—"}</td></tr>`).join("")}</tbody>
    </table>`;
  const plano = (data.planoPassos||[]).map((p,i)=>`<li><strong>Passo ${i+1}:</strong> ${p}</li>`).join("");
  const resultados = (data.resultados||[]).map(r=>`<li>${r}</li>`).join("");

  return `
  <div id="relatorio" class="container">
    <div class="header">
      <div class="logo">ISC</div>
      <div>
        <h1>Relatório — Instituto Saber Consciente</h1>
        <div class="meta">
          <span><strong>Cliente:</strong> ${data.nomeCliente||"—"}</span>
          <span><strong>Terapeuta:</strong> ${data.nomeTerapeuta||"—"}</span>
          <span><strong>Atendimento:</strong> ${dataAtendimento}</span>
        </div>
        <div class="meta">
          <span><strong>Data de Nascimento:</strong> ${dob||"—"}</span>
          <span><strong>Idade:</strong> ${idade||"—"}</span>
        </div>
      </div>
    </div>

    ${section("Queixa & Contexto", box(`<strong>Queixa principal:</strong> ${data.queixa||"—"}<br><strong>Tempo de sintomas:</strong> ${data.tempoSintomas||"—"}<br><strong>Impactos/Efeitos:</strong> ${data.impactos||"—"}<br><strong>Observações:</strong> ${data.observacoes||"—"}`))}
    ${section("Anamnese (Eixos)", `${box(`<strong>Físico:</strong> ${data.eixoFisico||"—"}`)}${box(`<strong>Emocional:</strong> ${data.eixoEmocional||"—"}`)}${box(`<strong>Mental:</strong> ${data.eixoMental||"—"}`)}${box(`<strong>Espiritual:</strong> ${data.eixoEspiritual||"—"}`)}`)}
    ${section("Técnicas Aplicadas & Protocolos", `${tecnicasTable||"—"}`)}
    <div class="page-break"></div>
    ${section("Plano Prático (30 dias)", `<ul>${plano||"<li>—</li>"}</ul>`)}
    ${section("Resultados Esperados", `<ul>${resultados||"<li>—</li>"}</ul>`)}
    ${section("Seguimento", box(`<strong>Cronograma sugerido:</strong> ${data.seguimento||"—"}`))}
    ${section("Notas Técnicas (Opcional)", box(`${data.notasTecnicas||"—"}`))}
    ${section("Mensagem ao Mentor (Opcional)", box(`${(data.mensagemAoMentor||"—").replace(/\n/g,"<br>")}`))}
  </div>`;
}
function montarRelatorioNaPagina(data, targetSelector="#relatorioRoot"){
  const html = buildRelatorio(data); const root = document.querySelector(targetSelector); if (root) root.innerHTML = html;
}
async function baixarPDF(selector="#relatorio"){
  const node = document.querySelector(selector); if(!node) return alert("Relatório não encontrado.");
  if (window.html2pdf) {
    const opt={margin:10,filename:'relatorio-isc.pdf',image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}};
    await html2pdf().from(node).set(opt).save();
  } else { window.print(); }
}

// --- Auto-Seleção de técnicas e plano 30 dias (prioriza Psicanálise) ---
function palavras(s){ return (s||"").toLowerCase(); }
function selecionarTecnicas(data){
  const eFis=palavras(data.eixoFisico), eEmo=palavras(data.eixoEmocional), eMen=palavras(data.eixoMental), eEsp=palavras(data.eixoEspiritual);
  const queixa=palavras(data.queixa), impactos=palavras(data.impactos||"")+" "+palavras(data.observacoes||"");
  const t=[{nome:"Psicanálise", justificativa:"Eixo central para investigar conflitos inconscientes, padrões repetitivos e transferência.", protocolo:"Sessões semanais (1–2x), associação livre, análise de resistências e padrões familiares."}];
  const add=(n,j,p)=>t.push({nome:n,justificativa:j,protocolo:p});
  if(/ansiedade|pânico|taquicardia|insônia|gastrite|rumina(ç|c)ão/.test(eFis+eEmo+eMen+queixa+impactos)){ add("Aromaterapia","Regulação autonômica e higiene do sono.","Difusão lavanda/bergamota à noite; inalação 2–3x/dia."); add("EFT","Dessensibilização rápida.","Sequência curta 1–2x/dia."); add("Psicossomática","Leitura simbólica.","Mapear órgão e mensagem simbólica."); }
  if(/(m(ã|a)e|pai|culpa|fam(í|i)lia|transgeracional|herdado)/.test(eEmo+eMen+impactos)){ add("Constelação Familiar","Reequilíbrio de vínculos.","Mini‑mapa + frases de solução."); }
  if(/(cren(ç|c)as|auto\-?sabotagem|negativo|perfeccionismo|rumina(ç|c)ão)/.test(eMen+queixa)){ add("TCC","Reestruturação cognitiva.","Diário + disputa de crenças (diário)."); add("PNL","Ancoragem de estado.","Âncora de confiança; linha do tempo 1x/sem."); }
  if(/(trauma|abuso|mem(ó|o)ria|flashback)/.test(eEmo+eMen+impactos)){ add("Hipnose","Ressignificação de memórias.","Indução leve 1x/semana."); add("Rebirthing","Liberação emocional.","Respiração guiada 1–2x/semana."); }
  if(/(dor|inflama(ç|c)ão|fadiga|digest(ã|a)o|pele|cabe(ç|c)a)/.test(eFis)){ add("Terapia Ortomolecular","Suporte físico.","Avaliação; magnésio/triptofano conforme caso."); add("Bases da Medicina Germânica","Conflito‑órgão.","Identificar DHS/fase e plano."); }
  if(/(prop(ó|o)sito|sem sentido|procrastina(ç|c)ão|ambiente|casa)/.test(queixa+eEsp+impactos)){ add("Feng Shui","Harmonização do espaço.","Rever cama; destralhar; plantas vivas."); add("Terapia Quântica","Coerência e visão.","Visualização diária do futuro (5–7min)."); }
  if(/(espiritual|energia|chakra|aura)/.test(eEsp)){ add("Cromoterapia","Regulação sutil.","Azul manhã; verde noite (10 min)."); add("Cristaloterapia","Estabilização do campo.","Quartzo rosa/ametista 10 min."); add("Radiestesia","Ajuste com gráficos radiônicos.","Harmonização 1x/semana."); }
  if(/(clareza|dire(ç|c)ão|identidade|decis(ã|a)o|prop(ó|o)sito)/.test(queixa+eMen)){ add("Ciência da Felicidade","Bem‑estar baseado em evidências.","Gratidão 3x/dia; gentileza 2x/semana."); add("Numerologia","Auto‑compreensão simbólica.","Usar número de destino nos rituais/mantras."); }
  add("Terapia Floral","Regulação emocional suave.","Composto personalizado 4 gotas 4x/dia.");
  const uniq=[]; const seen=new Set(); for(const item of t){ const k=(item.nome||'').toLowerCase(); if(!seen.has(k)){ seen.add(k); uniq.push(item);} } return uniq;
}
function montarPlano30Dias(data, tecnicas){
  const passosFixos=["Diário psicanalítico (10 min).","Técnica do dia (EFT/aroma/cromo/floral).","Mantra manhã/noite: “Eu libero padrões e ajo com clareza e propósito.”"];
  const s1=["Psicanálise 2x; mapa de padrões familiares.","Aromaterapia noturna.","Floral diário."];
  const s2=["Psicanálise 1x (resistências).","TCC diário + PNL âncora.","EFT para gatilhos."];
  const s3=["Psicanálise 1x (elaboração).","Psicossomática + Hipnose leve (se indicado).","Grounding diário."];
  const s4=["Rebirthing 1–2x.","Feng Shui + Visualização (quântica).","Radiestesia 1x; Cristais + Numerologia no ritual."];
  return { passosFixos, semanas:[s1,s2,s3,s4], resultadosEsperados:["Mais clareza e menos ruminação.","Quebra de padrões com maior tolerância ao desconforto.","Ações alinhadas ao propósito."], seguimento:"Reavaliar ao fim de 30 dias; manter psicanálise e ajustar técnicas." };
}
const _orig_buildRelatorio = buildRelatorio;
buildRelatorio = function(data){
  const d = Object.assign({}, data);
  if(!Array.isArray(d.tecnicas) || d.tecnicas.length===0) d.tecnicas = selecionarTecnicas(d);
  if(!Array.isArray(d.planoPassos) || d.planoPassos.length===0){
    const plano = montarPlano30Dias(d, d.tecnicas);
    d.planoPassos = [...plano.passosFixos, "SEMANA 1: "+plano.semanas[0].join(" | "), "SEMANA 2: "+plano.semanas[1].join(" | "), "SEMANA 3: "+plano.semanas[2].join(" | "), "SEMANA 4: "+plano.semanas[3].join(" | ")];
    if(!Array.isArray(d.resultados)||d.resultados.length===0) d.resultados = plano.resultadosEsperados;
    if(!d.seguimento) d.seguimento = plano.seguimento;
  }
  return _orig_buildRelatorio(d);
};
