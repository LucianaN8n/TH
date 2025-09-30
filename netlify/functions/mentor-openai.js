// netlify/functions/mentor-openai2.js
// Funciona com Node 18+ (fetch nativo). Responde texto simples.
// CORS liberado p/ mentorholistico.life e para embeds (ATH/Wix).

const ALLOW_LIST = [
  'https://mentorholistico.life',
  'https://www.ath.org.br',
  'https://ath.org.br',
  'https://*.filesusr.com',
  'https://*.wixsite.com',
];

function pickOrigin(origin) {
  if (!origin) return '*';
  const ok = ALLOW_LIST.some(pat => {
    const re = new RegExp('^' + pat.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    return re.test(origin);
  });
  return ok ? origin : '*';
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': pickOrigin(origin),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // fallback para não quebrar o front se a chave não estiver setada
    return `Parecer (demo): ${String(prompt || '').slice(0, 300)}...`;
  }

  // Modelo enxuto e rápido; pode trocar se preferir
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content:
          'Você é um supervisor clínico. Gere um parecer organizado em blocos: Síntese, Formulação, Recomendações (com técnicas práticas) e Plano de 30 dias. ' +
          'Se houver menção a ideação/comportamento suicida, inclua orientação clara de encaminhamento imediato ao psiquiatra/serviço de emergência.'
      },
      { role: 'user', content: prompt }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OpenAI HTTP ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const answer = data?.choices?.[0]?.message?.content?.trim();
  return answer || 'Sem conteúdo gerado.';
}

exports.handler = async (event) => {
  const origin = event.headers?.origin;

  // Pré-flight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders(origin),
        body: 'Somente POST é permitido.'
      };
    }

    const { prompt } = JSON.parse(event.body || '{}');
    if (!prompt || typeof prompt !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders(origin),
        body: 'Campo "prompt" obrigatório.'
      };
    }

    // Timeout de segurança (28s)
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 28000);

    let answer;
    try {
      answer = await callOpenAI(prompt);
    } finally {
      clearTimeout(t);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'text/plain; charset=utf-8' },
      body: answer
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: 'Erro: ' + (err?.message || 'desconhecido')
    };
  }
};
