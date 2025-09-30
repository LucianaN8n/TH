// netlify/functions/gestor.js
import fetch from "node-fetch";

export async function handler(event) {
  try {
    const { prompt } = JSON.parse(event.body || "{}");
    const system = `Você é o GESTOR do ISC. Responda com técnicas da grade (TCC, EFT, Numerologia, Psicoaromaterapia, etc.)
Blocos: Exploração Dirigida, Plano de Ação, Síntese do caso, Pontos de formulação, Intervenções prioritárias (1–3 com protocolos), Riscos/alertas, Próximos passos, Protocolo final.`;

    const body = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 900
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{
        "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify(body)
    });

    const j = await r.json();
    const text = j.choices?.[0]?.message?.content || "";
    return { statusCode:200, body:JSON.stringify({ text }) };
  } catch(e){
    return { statusCode:500, body:JSON.stringify({ error:e.message }) };
  }
}
