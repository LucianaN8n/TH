// Função Netlify opcional (não usada neste pacote de PDF). Mantida para compatibilidade.
export async function handler(event){
  if (event.httpMethod === "GET") return { statusCode:200, body: JSON.stringify({ok:true}) };
  if (event.httpMethod === "POST") return { statusCode:200, body: JSON.stringify({ reply: "OK" }) };
  return { statusCode:405, body:"Method not allowed" };
}
