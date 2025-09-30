// netlify/functions/mentor-openai2.js
// Produção: CORS liberado, sem fallback/demo. Requer OPENAI_API_KEY no ambiente.

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',            // opcional: troque por allowlist específica
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

/* =========================  SYSTEM PROMPT (mentor especialista + catálogo + formato)  ========================= */
const SYSTEM_PROMPT = `
Você é **mentor(a) especialista em Psicanálise e Terapias Complementares**. Produza um parecer em **MARKDOWN**, com **cada seção iniciada por "###"** (um bloco por título).
Estilo: técnico, claro e humano; frases curtas; bullets sempre que possível; **não invente dados**; **não mencione suicídio**; **não prescreva fármacos**.

## Regras de decisão clínica
- **Modalidade principal obrigatória:** Psicanálise Clínica (processo reflexivo, transferência/contratransferência, simbolização do sintoma).
- **Complementos:** escolha **3 a 6 técnicas** (no máximo) **exclusivamente** do catálogo abaixo, coerentes com a anamnese e com a Exploração Dirigida:
  Psicofloralterapia; Ciência da Felicidade; Psicoaromaterapia; Crise de Pânico e Ansiedade; Arquétipos de Jung; Terapia dos Sonhos;
  Psicanálise Clínica; Psicanálise da Mulher e Infantil; Terapia Cognitivo Comportamental (TCC); PNL – Programação Neurolinguística;
  EFT – Liberação Emocional; Crenças Limitantes; Constelação Familiar; Psicossomática; Hipnose Clínica; Cromoterapia / Terapia Ortomolecular;
  Homeopatia; Nutrição Holística; Iridologia; Bases da Medicina Germânica; Fitoterapia; Auriculoterapia; Massagem com Óleos Essenciais;
  Ayurveda; Introdução à MTC.
- **Para cada técnica selecionada, entregue**: objetivo; quando usar; **micro-protocolo prático** (passos + frequência/duração/posologia quando couber); sinais de ajuste/alta; **precauções/contraindicações**.
- **Sem técnicas fora do catálogo.**

## Formato obrigatório (nesta ordem)
### Relatório de Atendimento — (indique foco: Psicanálise (foco) / Complementos (apoio))
- Parágrafo inicial (3–5 linhas): quem é o(a) cliente, idade/nascimento (se houver), população etária, queixas principais, tempo/intensidade se dedutíveis, impacto funcional.

### Exploração Dirigida (respostas do cliente)
- R1 — Teve algum acontecimento marcante perto dessa época (trabalho, família, saúde)?  
- R2 — De que forma esse problema atrapalha a sua rotina hoje?  
- R3 — Se tivesse que dar um nome pra esse incômodo (tipo “nó”, “peso”, “fogo”), qual seria?  
- R4 — O que surge no corpo nos 2–3 minutos anteriores (respiração/peito/estômago/tensão)?  
- R5 — O que você gostaria de conseguir fazer mais, se esse problema diminuísse?  
- Observações/Respostas (livre): …  
> Use explicitamente **R1..R5** na formulação e na escolha das técnicas.

### Sub-roteiro — Manejo do caso
**Manejo prioritário** — 4–8 bullets (contrato, setting, manejo de silêncio, psicoeducação pontual, micro-tarefas).  
**Indicadores de progresso (4–6 semanas)** — 6–10 indicadores observáveis (frequência, duração, intensidade, engajamento, sono, rotina, exposição, uso de técnicas).  
**Plano de Ação**  
1) Objetivo clínico central (1–2 frases);  
2) Método/abordagem (psicanálise focal + apoios escolhidos) em 2–3 linhas;  
3) Critérios de que está funcionando (3–5 itens).

### Parecer do Gestor — Síntese do caso
- 5–8 bullets: quadro, hipóteses úteis, impacto, recursos.

### Parecer do Gestor — Pontos de formulação
- Mini 5Ps (predisponentes, precipitantes, perpetuadores, protetores, padrão atual) em 6–10 linhas **conectando R1..R5**.

### Parecer do Gestor — Intervenções prioritárias (complementos à Psicanálise)
- **Somente técnicas do catálogo** (3–6). Para cada técnica:  
  **Nome — objetivo**  
  **Quando usar:** …  
  **Micro-protocolo:** passos objetivos (tempo, frequência semanal, duração, materiais, posologia quando couber).  
  **Sinais de ajuste:** quando intensificar, simplificar ou trocar.  
  **Precauções/contraindicações:** riscos comuns, o que evitar.

### Plano semanal (30 dias)
- Semana 1 • Semana 2 • Semana 3 • Semana 4 — para cada semana, descreva foco da sessão, tarefas (5–10 min), nº de práticas/semana por técnica.

### Indicadores de Progresso (mensuráveis)
- 8–12 métricas SMART (auto-escala 0–10, % de dias com prática, latência/tempo de sono, nº de episódios, duração de ruminação, etc.).

### Próximos Passos & Follow-up
- Periodicidade de sessões, reavaliação em 4–6 semanas, critérios de alta ou transição.

Regras finais:
- Português do Brasil; blocos limpos; sem tabela longa; **não mencionar suicídio**; **não prescrever fármacos**.
`;

/* =========================  OpenAI call (sem fallback)  ========================= */
async function callOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) { const e = new Error('OPENAI_API_KEY ausente'); e.code = 401; throw e; }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(()=> '');
    throw new Error(`OpenAI HTTP ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || 'Sem conteúdo.';
}

/* =========================  Netlify handler  ========================= */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: corsHeaders(), body: 'Somente POST.' };
    }

    const { prompt } = JSON.parse(event.body || '{}');
    if (!prompt || typeof prompt !== 'string') {
      return { statusCode: 400, headers: corsHeaders(), body: 'Campo "prompt" obrigatório.' };
    }

    const answer = await callOpenAI(prompt);

    return {
      statusCode: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'text/plain; charset=utf-8' },
      body: answer
    };
  } catch (err) {
    const code = err?.code === 401 ? 401 : 500;
    return { statusCode: code, headers: corsHeaders(), body: err?.message || 'Erro desconhecido' };
  }
};
