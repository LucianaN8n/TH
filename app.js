(function () {
  "use strict";

  // ------- helpers
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

  // ---------- TUNAGEM DO GESTOR ----------
  // categorias e técnicas (cobrem o curso todo, você pode expandir/ajustar livremente)
  const CATS = {
    ansiedade: [
      "Mindfulness – Atenção Plena",
      "Florais de bach",
      "Auriculoterapia",
      "Reiki usui tibetano nível 1 ao mestrado",
      "Cromoterapia",
      "PNL – Programação Neurolinguística",
    ],
    insonia: [
      "Aromaterapia",
      "Meditação",
      "Reiki usui tibetano nível 1 ao mestrado",
      "Cromoterapia",
      "Mindfulness – Atenção Plena",
      "Ho’oponopono",
    ],
    dor: [
      "Reflexologia Podal",
      "Ventosaterapia",
      "Moxaterapia",
      "Massagem com óleos essenciais",
      "Fitoterapia",
      "Biomagnetismo",
    ],
    digestivo: [
      "Psicossomática",
      "Fitoterapia",
      "Reflexologia Podal",
      "Aromaterapia",
      "Mindfulness – Atenção Plena",
      "Cromoterapia",
    ],
    cefaleia: [
      "Auriculoterapia",
      "Cromoterapia",
      "Reflexologia Podal",
      "Reiki usui tibetano nível 1 ao mestrado",
      "Cristaloterapia",
    ],
    depressao: [
      "Florais de bach",
      "Mindfulness – Atenção Plena",
      "PNL – Programação Neurolinguística",
      "Reiki usui tibetano nível 1 ao mestrado",
      "Crenças limitantes",
    ],
    prosperidade: [
      "Cocriando Prosperidade",
      "Radiestesia",
      "Mesa Radiônica Universal",
      "Runas draconianas",
      "Soramig astral money reiki",
    ],
    relacionamento: [
      "Ho’oponopono",
      "Constelação com Mesa Radiônica",
      "PNL – Programação Neurolinguística",
      "Florais de minas",
    ],
    feminino: [
      "Reiki do Sagrado Feminino",
      "Chakras",
      "Ginecologia natural disponível",
      "Cristaloterapia",
    ],
    trauma: [
      "Apometria",
      "Registros akáshicos",
      "Reiki xamânico mahe’o nível 1 ao mestrado",
      "Terapia dos sonhos",
    ],
    espiritual: [
      "Reiki celestial",
      "As 7 leis herméticas",
      "Arcanjos de cura",
      "Cortes Cármicos com Arcanjo Miguel",
      "Magia das Velas",
    ],
  };

  // mapa de palavras-chave -> categorias
  const KEYMAP = [
    { rx: /ansiedad|pânico|nervos/i, key: "ansiedade" },
    { rx: /insôni|insoni|sono|acordar/i, key: "insonia" },
    { rx: /dor|lombar|cervic|tens|músc|muscu|ombro|costas/i, key: "dor" },
    { rx: /gastrit|reflux|estôm|estom|digest|azia/i, key: "digestivo" },
    { rx: /cefale|enxaquec|enxaqueca|cabeça/i, key: "cefaleia" },
    { rx: /depress|apatia|anhedoni/i, key: "depressao" },
    { rx: /prosper|finan|dinhei|abund/i, key: "prosperidade" },
    { rx: /relacion|famí|casam|parceir|comunica/i, key: "relacionamento" },
    { rx: /femin|ciclo|tpm|menop/i, key: "feminino" },
    { rx: /trauma|luto|abuso|pesad/i, key: "trauma" },
    { rx: /espirit|fé|sutil|místico|mistic/i, key: "espiritual" },
  ];

  // rotação determinística para não repetir sempre as mesmas
  function hash(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function chooseTechniques(ctxText) {
    const cats = [];
    for (const k of KEYMAP) if (k.rx.test(ctxText)) cats.push(k.key);
    if (cats.length === 0) cats.push("ansiedade"); // fallback razoável

    const h = hash(ctxText);
    const picks = [];
    for (const c of cats) {
      const arr = CATS[c] || [];
      const start = h % (arr.length || 1);
      for (let i = 0; i < arr.length && picks.length < 3; i++) {
        const t = arr[(start + i) % arr.length];
        if (t && !picks.includes(t)) picks.push(t);
      }
      if (picks.length >= 3) break;
    }
    // completa de outras categorias, se precisar
    if (picks.length < 3) {
      for (const c in CATS) {
        for (const t of CATS[c]) {
          if (picks.length >= 3) break;
          if (!picks.includes(t)) picks.push(t);
        }
        if (picks.length >= 3) break;
      }
    }
    return picks.slice(0, 3);
  }

  // Parecer do Gestor (detalhado)
  function parecerDetalhado(queixa, efeitos, intensidade) {
    const q = (queixa + " " + efeitos).toLowerCase();
    let sintese =
      "Quadro com impacto funcional e oscilação autonômica; pede estabilização e integração mente-corpo.";
    let oculto =
      "Padrão de controle/evitação mantém ativação interna e ciclos de tensão; corpo sinaliza necessidade de reorganização.";
    let criterio =
      "Priorizadas técnicas de regulação do SNA, liberação somática e reorganização de hábitos/rotinas.";
    let sinais = [
      "Redução progressiva da escala 0–10.",
      "Melhora de sono/energia ao despertar.",
      "Queda de tensões em regiões-alvo.",
    ];

    if (/insôni|insoni|sono/.test(q)) {
      sintese =
        "Insônia com hiperalerta noturno e ruminação; dificuldade de desligamento e variação de humor diurno.";
      oculto =
        "Ritual de sono inconsistente e condicionamento de alerta ao deitar; respiração alta e mente acelerada.";
      criterio =
        "Atuar no eixo límbico-olfativo (aromas), reduzir excitação cortical (mindfulness) e harmonizar energia (reiki/aurículo).";
      sinais = ["Latência do sono menor", "Menos despertares noturnos", "Mais descanso matinal"];
    } else if (/gastrit|reflux|estom|digest|azia/.test(q)) {
      sintese =
        "Sintomas GI relacionados a estresse/hipervigilância visceral; tensão em plexo solar (MTC).";
      oculto =
        "Somatização de preocupações no eixo estômago; loops de apreensão e autocobrança aumentam secreção e motilidade.";
      criterio =
        "Desativar resposta de ameaça, favorecer digestão parasimpática e redirecionar energia acumulada.";
      sinais = ["Menos queimação/azia", "Melhora pós-refeições", "Redução de dor abdominal"];
    } else if (/dor|lombar|cervic|tens|músc|muscu|ombro|costas/.test(q)) {
      sintese =
        "Dor miofascial/funcional com proteção muscular e baixa variabilidade de movimento; gatilhos por estresse/postura.";
      oculto = "Ciclo tensão → dor → proteção; respiração encurtada mantém excitabilidade.";
      criterio =
        "Liberação mecânica suave + reflexos somatoautonômicos para alívio e reeducação de padrão.";
      sinais = ["Mais amplitude de movimento", "Menos dor ao final do dia", "Sono mais reparador"];
    } else if (/depress|apatia|anhedoni/.test(q)) {
      sintese =
        "Humor deprimido com baixa motivação e ruminação; energia vital reduzida e baixa autoeficácia.";
      oculto = "Narrativa interna autocrítica sustenta evitação e isolamento.";
      criterio =
        "Regular ritmos (sono/luz/movimento), simbolizar emoções com suporte floral/PNL e ancorar pequenos ganhos.";
      sinais = ["Aumento de interesse por atividades", "Rotina mais estável", "Auto-relatos mais positivos"];
    }

    if (+intensidade >= 8)
      criterio +=
        " Pela intensidade elevada, aplicar progressão em camadas, reduzir tempo de exposição e aumentar suporte entre sessões.";

    return { sintese, oculto, criterio, sinais };
  }

  // Plano 7 dias (Sessão vs Casa) com as três técnicas
  function plano7dias(tec) {
    const [t1, t2, t3] = tec;
    return [
      `Dia 1 — Sessão: acolhimento, métrica 0–10, ${t1} em dose leve;  Casa: respiração 4-4-6 (3×/dia, 5 min).`,
      `Dia 2 — Sessão: ${t1} com progressão suave;                        Casa: ritual noturno (higiene do sono) + diário (3 linhas).`,
      `Dia 3 — Sessão: introdução de ${t2};                               Casa: grounding 5-4-3-2-1 em gatilhos (2×/dia).`,
      `Dia 4 — Sessão: ${t1}+${t2} integrados;                            Casa: observação de pensamentos automáticos (3 registros/dia).`,
      `Dia 5 — Sessão: introdução de ${t3} (se indicado);                 Casa: prática breve combinada (10–15 min).`,
      `Dia 6 — Sessão: consolidação + simbolização;                       Casa: visualização/oração/afirmação alinhada ao objetivo.`,
      `Dia 7 — Sessão: reavaliação 0–10, reforço do que funcionou;        Casa: plano de continuidade por 2 semanas.`,
    ].join("\n");
  }

  // Como usar + Por que (por técnica) — descrições curtas e precisas
  function comoPorQue(nome) {
    const base = {
      como: "Aplicação progressiva, monitorando sinais de sobrecarga; ajustar dose conforme resposta.",
      porque: "Favorece regulação autonômica e integração mente-corpo.",
    };
    const map = {
      "Mindfulness – Atenção Plena": {
        como: "3 blocos/dia (5–8 min): respiração diafragmática + ancoragem sensorial; 1 sessão guiada/semana.",
        porque: "Reduz hiperalerta e ruminação; aumenta consciência corporal e tolerância ao desconforto.",
      },
      Aromaterapia: {
        como: "Difusor 30–45 min antes do sono; inalação pontual (2–3 respirações) em picos de ansiedade.",
        porque: "Ação límbica rápida: modula estresse, latência do sono e qualidade de descanso.",
      },
      Auriculoterapia: {
        como: "Pontos Shen Men / Rim / Ansiedade (estímulo leve 3×/dia por 30–60s).",
        porque: "Equilibra eixos nervoso-hormonal/energético e reduz picos de excitação.",
      },
      "Reflexologia Podal": {
        como: "Sequência: plexo solar → sistema-alvo → pontos dolorosos (6–8s) por 12–18 min.",
        porque: "Reflexos somatoautonômicos aliviam dor e melhoram circulação/relaxamento.",
      },
      Ventosaterapia: {
        como: "Cups estáticas/deslizantes em paravertebrais 5–8 min (sem hematomas excessivos).",
        porque: "Libera fáscia e reduz tensão protetiva, melhorando amplitude de movimento.",
      },
      Moxaterapia: {
        como: "Aplicações de 20–30s por ponto (3 repetições) — monitorar sensação térmica.",
        porque: "Aquece e dinamiza o fluxo energético, aliviando dor fria/estagnada.",
      },
      "Florais de bach": {
        como: "Mistura personalizada (4×/dia, 4 gotas) por 21 dias, reavaliando a cada semana.",
        porque: "Trabalha núcleos emocionais (medo, incerteza, desânimo) de forma suave e contínua.",
      },
      "PNL – Programação Neurolinguística": {
        como: "Mapeamento de submodalidades + ancoragem de recurso + ensaio mental de situação-alvo.",
        porque: "Redesenha representações internas e automatiza respostas mais funcionais.",
      },
      Meditação: {
        como: "Meditação guiada 10–12 min/diariamente (foco: relaxamento e sono).",
        porque: "Desacelera a mente e consolida nova higiene do sono.",
      },
      "Reiki usui tibetano nível 1 ao mestrado": {
        como: "Sequência por chakras com ênfase em plexo solar/cárdico; 15–25 min.",
        porque: "Harmoniza o campo energético e melhora autorregulação.",
      },
      Cromoterapia: {
        como: "Azul/verde suave no ambiente 10–15 min; evitar luzes frias à noite.",
        porque: "Cores calmantes reduzem excitação e favorecem relaxamento.",
      },
      "Psicossomática": {
        como: "Mapa sintoma↔emoção↔situação + tarefa de simbolização/expressão segura.",
        porque: "Integra significado emocional e reduz descarga somática desorganizada.",
      },
      Fitoterapia: {
        como: "Protocolos leves e seguros (ex.: camomila/passiflora à noite), checando interações.",
        porque: "Suporte fisiológico suave para ansiedade/digestão/sono.",
      },
    };
    return map[nome] || base;
  }

  // ---------- RELATÓRIO ----------
  function montarRelatorio() {
    const terapeuta = must(el.terapeuta.value);
    const cliente = must(el.cliente.value);
    const nasc = parseDateFlex(el.nascimento.value);
    const intensidade = clamp(+(el.intensidade.value || 0), 0, 10);
    const queixa = must(el.queixa.value);
    const tempo = must(el.tempo.value);
    const efeitos = must(el.efeitos.value);
    const obs = must(el.obs.value);

    if (!cliente || !queixa) throw new Error("Preencha pelo menos Cliente e Queixa.");

    const ctx = (queixa + " " + efeitos + " " + obs).toLowerCase();
    const tecnicas = chooseTechniques(ctx);
    const p = parecerDetalhado(queixa, efeitos, intensidade);

    // bloco de técnicas detalhadas
    const tecBlock = tecnicas
      .map((t, i) => {
        const { como, porque } = comoPorQue(t);
        return `${i + 1}) ${t}
   • Como usar: ${como}
   • Por que nesta sessão: ${porque}`;
      })
      .join("\n\n");

    const plano = plano7dias(tecnicas);

    return [
      `Relatório — Instituto Saber Consciente`,
      `Terapeuta: ${terapeuta || "—"}   Cliente: ${cliente}   Nasc.: ${nasc}`,
      `Queixa: ${queixa}   Intensidade: ${intensidade}/10   Tempo: ${tempo}`,
      `Efeitos: ${efeitos || "—"}   Obs.: ${obs || "—"}`,
      "",
      "SÍNTESE DO CASO",
      p.sintese,
      "",
      "O QUE ESTÁ OCULTO",
      p.oculto,
      "",
      "CRITÉRIO DO GESTOR",
      p.criterio,
      "",
      "TÉCNICAS ESCOLHIDAS (máx. 3)",
      tecBlock,
      "",
      "PLANO DE INTERVENÇÃO — 7 DIAS (Sessão vs. Casa)",
      plano,
      "",
      "SINAIS DE PROGRESSO ESPERADOS",
      "• " + p.sinais.join("\n• "),
      "",
      "ALERTAS / CUIDADOS",
      "• Hidratação e pausas ativas; interromper técnica que gere piora marcada.",
      "• Fitoterapia/óleos: verificar alergias e interações medicamentosas.",
      "• Intensidade ≥ 8/10: reduzir carga e aumentar ancoragens/grounding.",
    ].join("\n");
  }

  // ---------- PDF simples (acentos OK) ----------
  const PDF = (function () {
    const MAP = {
      "á": 0xe1, "à": 0xe0, "â": 0xe2, "ã": 0xe3, "ä": 0xe4, "Á": 0xc1, "À": 0xc0, "Â": 0xc2, "Ã": 0xc3, "Ä": 0xc4,
      "é": 0xe9, "è": 0xe8, "ê": 0xea, "É": 0xc9, "È": 0xc8, "Ê": 0xca,
      "í": 0xed, "ì": 0xec, "Í": 0xcd, "Ì": 0xcc,
      "ó": 0xf3, "ò": 0xf2, "ô": 0xf4, "õ": 0xf5, "Ó": 0xd3, "Ò": 0xd2, "Ô": 0xd4, "Õ": 0xd5,
      "ú": 0xfa, "ù": 0xf9, "Ú": 0xda, "Ù": 0xd9,
      "ç": 0xe7, "Ç": 0xc7, "ñ": 0xf1, "Ñ": 0xd1, "ü": 0xfc, "Ü": 0xdc,
    };
    function esc(s) {
      let out = "";
      for (const ch of String(s || "")) {
        if (ch === "(") out += "\\(";
        else if (ch === ")") out += "\\)";
        else if (ch === "\\") out += "\\\\";
        else {
          const code = ch.charCodeAt(0);
          if (code >= 32 && code <= 126) out += ch;
          else if (MAP[ch] !== undefined) out += "\\" + ("00" + MAP[ch].toString(8)).slice(-3);
          else out += " ";
        }
      }
      return out;
    }
    const len = (s) => new TextEncoder().encode(String(s)).length;
    function gen(text) {
      const W = 595.28, H = 841.89, M = 36, FS = 12, LH = 14;
      const lines = String(text || "").split(/\n/);
      const max = Math.floor((H - 2 * M) / LH);
      const pages = [];
      for (let i = 0; i < lines.length; i += max) pages.push(lines.slice(i, i + max));
      if (!pages.length) pages.push(["(vazio)"]);

      let objs = [], id = 1;
      const add = (c) => { const s = `${id} 0 obj\n${c}\nendobj\n`; objs.push(s); return id++; };
      const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
      const pageIds = [];
      for (const L of pages) {
        let stream = "BT\n/F1 " + FS + " Tf\n1 0 0 1 " + M + " " + (H - M) + " Tm\n";
        let first = true;
        for (const ln of L) {
          const e = esc(ln);
          if (first) { stream += "(" + e + ") Tj\n"; first = false; }
          else stream += "0 -" + LH + " Td\n(" + e + ") Tj\n";
        }
        stream += "ET";
        const cId = add("<< /Length " + len(stream) + " >>\nstream\n" + stream + "\nendstream");
        const pId = add("<< /Type /Page /Parent 0 0 R /MediaBox [0 0 " + W + " " + H + "] /Resources << /Font << /F1 " + font + " 0 R >> >> /Contents " + cId + " 0 R >>");
        pageIds.push(pId);
      }
      const kids = pageIds.map(i => i + " 0 R").join(" ");
      const pagesId = add("<< /Type /Pages /Kids [ " + kids + " ] /Count " + pageIds.length + " >>");
      objs = objs.map(o => o.replace("/Parent 0 0 R", "/Parent " + pagesId + " 0 R"));
      const catalog = add("<< /Type /Catalog /Pages " + pagesId + " 0 R >>");
      let pdf = "%PDF-1.4\n", offs = [0];
      for (const o of objs) { offs.push(len(pdf)); pdf += o; }
      const xref = len(pdf);
      let xr = "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n";
      for (let i = 1; i <= objs.length; i++) xr += String(offs[i]).padStart(10, "0") + " 00000 n \n";
      const trailer = "trailer\n<< /Size " + (objs.length + 1) + " /Root " + catalog + " 0 R >>\nstartxref\n" + xref + "\n%%EOF";
      return pdf + xr + trailer;
    }
    function dl(name, data) {
      const blob = new Blob([data], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    return { download(name, text) { dl(name, gen(text)); } };
  })();

  // --------- bindings (com try/catch e logs)
  document.addEventListener("DOMContentLoaded", function () {
    if (el.btnGerar) {
      el.btnGerar.addEventListener("click", () => {
        try {
          const txt = montarRelatorio();
          el.report.textContent = txt;
        } catch (e) {
          console.error("Erro ao gerar parecer:", e);
          alert(e.message || "Falha ao gerar parecer.");
        }
      });
    }
    if (el.btnReset) {
      el.btnReset.addEventListener("click", () => {
        el.report.textContent = "O parecer aparecerá aqui.";
      });
    }
    if (el.btnPDF) {
      el.btnPDF.addEventListener("click", () => {
        const txt = el.report.textContent || "";
        const name = "Relatorio_Gestor_" + new Date().toISOString().slice(0, 10) + ".pdf";
        try { PDF.download(name, txt); } catch (e) { console.error(e); alert("Falha ao gerar PDF."); }
      });
    }
  });
})();
