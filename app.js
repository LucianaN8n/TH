/* TH60 — app.js v7.1 (alta performance)
   - Sempre inclui Aromaterapia + Floral
   - Sugere até 3 técnicas extras conforme anamnese (online filtra corporais)
   - Obesidade e Nutrição Holística incluídas
   - PDF PRO: título grande, cabeçalhos em negrito, rodapé com cliente+data
   - Sem eval, vanilla JS, compatível com CSP restrito
*/
(function () {
  "use strict";

  // ====================== REFS / HELPERS ======================
  const $ = (s) => document.querySelector(s);
  const el = {
    terapeuta: $("#terapeuta"),
    cliente: $("#cliente"),
    nascimento: $("#nascimento"),
    intensidade: $("#intensidade"),
    queixa: $("#queixa"),
    tempo: $("#tempo"),
    efeitos: $("#efeitos"),
    modo: $("#modo"),
    btnGerar: $("#btnGerar"),
    btnReset: $("#btnReset"),
    btnPDF: $("#btnPDF"),
    report: $("#report"),
    btnSalvarModelo: $("#btnSalvarModelo"),
    selModelos: $("#selModelos"),
    btnCSV: $("#btnCSV"),
  };
  const must = (x) => String(x || "").trim();
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

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
  const hash = (s) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  };

  // ====================== CATEGORIAS / MAPAS ======================
  const CORPORAIS = new Set([
    "Reflexologia Podal",
    "Ventosaterapia",
    "Moxaterapia",
    "Massagem com óleos essenciais",
    "Auriculoterapia",
  ]);

  const KEYMAP = [
    { rx: /ansiedad|p[aâ]nico|nervos|agita[cç][aã]o/i, key: "ansiedade" },
    { rx: /ins[oô]ni|insoni|sono|acordar/i, key: "insonia" },
    { rx: /gastrit|reflux|est[oô]m|digest|azia|n[aá]usea|c[oó]lica|constipa/i, key: "digestivo" },
    { rx: /obesidad|sobrepeso|obesidade|compuls/i, key: "obesidade" },
    { rx: /cefale|enxaquec|cabe[çc]a/i, key: "cefaleia" },
    { rx: /depress|apatia|anhedoni|tristeza/i, key: "depressao" },
    { rx: /foco|estudo|aten[cç][aã]o|concentra/i, key: "foco" },
  ];

  function chooseTechniques(ctx, modo) {
    // Obrigatórias
    const picks = ["Aromaterapia", "Floral"];
    const seen = new Set(picks);

    // categorias por padrão
    const poolByCat = {
      ansiedade: [
        "Cromoterapia",
        "PNL – Programação Neurolinguística",
        "Ho’oponopono",
        "Mindfulness – Atenção Plena",
      ],
      insonia: [
        "Cromoterapia",
        "Mindfulness – Atenção Plena",
        "PNL – Programação Neurolinguística",
        "Ho’oponopono",
      ],
      digestivo: [
        "Cromoterapia",
        "PNL – Programação Neurolinguística",
        "Ho’oponopono",
        "Mindfulness – Atenção Plena",
        "Reflexologia Podal",
      ],
      obesidade: [
        "Nutrição Holística",
        "PNL – Programação Neurolinguística",
        "Mindfulness – Atenção Plena",
        "Ho’oponopono",
        "Cromoterapia",
      ],
      cefaleia: [
        "Cromoterapia",
        "Mindfulness – Atenção Plena",
        "PNL – Programação Neurolinguística",
        "Ho’oponopono",
        "Auriculoterapia",
      ],
      depressao: [
        "PNL – Programação Neurolinguística",
        "Cromoterapia",
        "Ho’oponopono",
        "Mindfulness – Atenção Plena",
      ],
      foco: ["PNL – Programação Neurolinguística", "Cromoterapia", "Mindfulness – Atenção Plena"],
    };

    const cats = [];
    for (const k of KEYMAP) if (k.rx.test(ctx)) cats.push(k.key);
    const h = hash(ctx);
    for (const c of (cats.length ? cats : ["ansiedade"])) {
      const base = (poolByCat[c] || poolByCat.ansiedade).filter((t) =>
        modo === "online" ? !CORPORAIS.has(t) : true
      );
      for (let i = 0; i < base.length && picks.length < 5; i++) {
        const t = base[(h + i) % base.length];
        if (!seen.has(t)) {
          picks.push(t);
          seen.add(t);
        }
      }
      if (picks.length >= 5) break;
    }
    return picks.slice(0, 5);
  }

  // ====================== PROTOCOLOS ======================
  function aromaterapiaBlend(ctx) {
    ctx = ctx.toLowerCase();
    if (/ins[oô]ni|insoni|sono/.test(ctx))
      return {
        blend: "Lavanda 3gts + Bergamota 2gts + Camomila-romana 1gt",
        posologia:
          "Difusor 30–45 min antes de dormir (3–6 gts/200 mL). Inalação 2 respirações em picos.",
        cuidados: "Cítricos = fotossensíveis; dose baixa em gestantes/crianças.",
      };
    if (/gastrit|reflux|est[oô]m|digest|azia|n[aá]usea|c[oó]lica|constipa/.test(ctx))
      return {
        blend: "Camomila-alemã 2gts + Erva-doce 2gts + Gengibre 1gt (em 20 mL OV)",
        posologia:
          "Massagem no abdome sentido horário 3–5 min, 1–2×/dia; à noite: Lavanda 3–4 gts no difusor por 30–45 min.",
        cuidados: "Evitar menta/eucalipto em refluxo; gengibre é aquecedor.",
      };
    if (/cefale|enxaquec|cabe[çc]a/.test(ctx))
      return {
        blend: "Hortelã-pimenta 1gt + Lavanda 2gts + Manjerona 1gt (em 10 mL OV)",
        posologia:
          "Aplicar pequena quantidade em têmporas/nuca 1–2×/dia; evitar contato com olhos.",
        cuidados: "Evitar hortelã em <6 anos, gestantes e epilépticos.",
      };
    if (/foco|aten[cç][aã]o|estudo/.test(ctx))
      return {
        blend: "Alecrim qt. cineol 1gt + Hortelã-pimenta 1gt + Laranja-doce 2gts",
        posologia: "Difusor 20 min durante estudo; inalação breve antes de tarefas.",
        cuidados: "Evitar em gestantes/hipertensos/epilépticos.",
      };
    if (/obesidad|sobrepeso|obesidade/.test(ctx))
      return {
        blend: "Toranja 2gts + Laranja-doce 2gts + Alecrim qt. verbenona 1gt",
        posologia:
          "Difusor 20–30 min pela manhã para motivação; inalação breve antes das refeições para checar fome real (2 respirações).",
        cuidados:
          "Cítricos na pele + sol, não. Alecrim verbenona: evitar gestação/epilepsia.",
      };
    return {
      blend: "Lavanda 3gts + Laranja-doce 2gts",
      posologia: "Difusor 20–30 min 1–2×/dia; inalação 2 respirações quando necessário.",
      cuidados: "Cítricos na pele + sol, não.",
    };
  }

  function floralFormula(ctx) {
    // Bach padrão (ansiedade + GI), cobre maioria dos quadros
    return {
      sistema: "Bach",
      essencias: [
        "White Chestnut (ruminação)",
        "Aspen (ansiedade difusa)",
        "Mimulus (medos concretos)",
        "Agrimony (tensão + queixas GI)",
        "Rescue (picos)",
      ],
      posologia:
        "4 gotas, 4×/dia (acordar, meio-dia, fim da tarde, antes de dormir) + SOS em crise. 21 dias com reavaliação.",
    };
  }

  function cromoterapiaDetalhe(ctx) {
    const gi = /gastrit|reflux|est[oô]m|digest|azia|n[aá]usea|c[oó]lica|constipa/.test(
      ctx.toLowerCase()
    );
    return {
      cores: [
        "Azul-índigo (calmante, plexo solar)",
        gi ? "Verde (reparo/ equilíbrio, abdome superior)" : "Verde (equilíbrio geral)",
        "Rosa-suave (autoacolhimento, região cardíaca)",
      ],
      evitar: gi ? ["Amarelo/Laranja em azia ativa"] : [],
      como:
        "Visualização guiada 7–10 min: 10 respirações 4-4-6 → Azul-índigo no plexo 3 min → Verde 3 min → Rosa 2 min → 6 respirações 4-4-6. 2×/dia.",
    };
  }

  function pnlDetalhe() {
    return {
      protocolo: [
        "Swish Pattern: 5–7 swishes para a imagem de preocupação; instalar imagem alvo (você serena/corpo confortável).",
        "Âncora de calma: respiração + memória segura em toque polegar/indicador; usar no 1º sinal de ruminação.",
        "Reframing: de ‘sintoma = perigo’ para ‘sinal do corpo para desacelerar e cuidar’.",
      ],
      como: "Praticar 10–15 min, 2–3×/dia (manhã/pós-almoço/noite), fechando com respiração 4-4-6.",
    };
  }

  function hoOponoponoDetalhe() {
    return {
      foco: "Sensação física alvo + pensamento associado.",
      como:
        "Mão sobre a região; repetir 108×: 'Sinto muito. Me perdoe. Eu te amo. Sou grata(o).' Finalizar com 6 respirações 4-4-6. Registrar 1 frase do que mudou.",
      quando: "1×/dia à noite; extra em picos.",
    };
  }

  function mindfulnessDetalhe() {
    return {
      como:
        "Três blocos/dia (5–8 min): respiração diafragmática + ancoragem sensorial; 1 sessão guiada/semana.",
      porque: "Reduz hiperalerta e ruminação; melhora latência do sono.",
    };
  }

  function nutricaoHolisticaDetalhe() {
    return {
      como:
        "Janelas regulares (3–4h); prato: 50% verduras, 25% proteína, 25% carboidrato simples; hidratação 30–35 mL/kg; pausa de 2 min antes de comer para checar ‘fome x ansiedade’ (escala 1–10); higiene do sono; caminhar 15–20 min/dia.",
      porque:
        "Estabiliza glicemia, reduz gatilhos de comer por ansiedade e melhora energia/sono sem prescrição médica.",
      observacao:
        "Orientação educacional; não substitui acompanhamento nutricional/médico quando necessário.",
    };
  }

  // ====================== PARECER / CHECKLIST / PLANO ======================
  function parecerDetalhado(queixa, efeitos, intensidade) {
    const q = (queixa + " " + efeitos).toLowerCase();
    let sint =
      "Impacto funcional com hiperalerta/ruminação; somatização em região alvo. Precisa estabilização autonômica.";
    let oculto = "Ciclo ameaça→ruminação→tensão mantém sintomas e hábitos de evitação.";
    let crit =
      "Desligar resposta de ameaça, modular eixo límbico-autonômico e criar rotina antirrecidiva.";
    let sinais = ["Redução ≥2 pts na ansiedade", "<20 min de latência do sono", "Mais energia diária"];

    if (/gastrit|reflux|azia|digest|c[oó]lica|constipa/.test(q)) {
      sint = "Sintomas gastrointestinais ligados a estresse/hipervigilância visceral; tensão em plexo solar.";
      oculto = "Somatização de preocupações no estômago + loops de antecipação.";
      crit = "Favorecer digestão parasimpática, reduzir ruminação e modular sensações viscerais.";
      sinais = ["Menos episódios GI/dia", "Conforto pós-refeição", "Ansiedade −2 pts"];
    }
    if (/obesidad|sobrepeso|obesidade/.test(q)) {
      sint = "Ganho/ manutenção de peso com gatilhos emocionais e desritmia (sono/rotina).";
      oculto = "Ciclo ansiedade→beliscar→culpa reforça padrão; hiperalerta ↑ fome hedônica.";
      crit =
        "Estabilizar ritmos (sono/refeição), treinar percepção de fome x ansiedade e reduzir ruminação de gatilho.";
      sinais = ["≥70% refeições com pausa consciente", "Caminhada 5/7 dias", "Sono mais estável"];
    }
    if (+intensidade >= 8) crit += " — Intensidade alta: fracionar práticas e aumentar grounding.";
    return { sintese: sint, oculto, criterio: crit, sinais };
  }

  function checklist(ctx, intensidade) {
    const C = [];
    if (/gestant|gravidez|gr[áa]vida/.test(ctx)) C.push("Gestante: dose aromática baixa; sem ventosas/moxa.");
    if (/hipertens|press[aã]o alta/.test(ctx)) C.push("Hipertensão: evitar alecrim/estimulantes fortes.");
    if (/epileps/.test(ctx)) C.push("Epilepsia: evitar alecrim/menta e estímulos luminosos intensos.");
    if (/reflux|azia/.test(ctx)) C.push("Refluxo ativo: preferir lavanda/camomila; evitar menta/eucalipto.");
    if (/isrs|fluoxetin|sertralin|escitalo|paroxetin/.test(ctx))
      C.push("ISRS: evitar Erva-de-São-João; aromaterapia suave ok.");
    if (intensidade >= 8) C.push("Queixa ≥8/10: reduzir carga e aumentar grounding.");
    if (!C.length) C.push("Sem alertas críticos informados; manter bom senso clínico e consentimento.");
    return C;
  }

  function comoPorQue(nome, ctx) {
    const A = aromaterapiaBlend(ctx);
    const map = {
      Aromaterapia: {
        como: `Sinergia: ${A.blend}. ${A.posologia}`,
        porque: `Modulação límbica rápida; ${A.cuidados}`,
      },
      Floral: (function () {
        const f = floralFormula(ctx);
        return {
          como: `${f.sistema}: ${f.essencias.join(", ")}. Posologia: ${f.posologia}`,
          porque: "Trabalha núcleos emocionais e reduz ruminação de base.",
        };
      })(),
      "Cromoterapia": (function () {
        const c = cromoterapiaDetalhe(ctx);
        return {
          como: `Cores: ${c.cores.join(" • ")}. ${c.como} ${c.evitar.length ? "Evitar: " + c.evitar.join(", ") + "." : ""}`,
          porque: "Reduz tônus simpático e acalma plexo solar.",
        };
      })(),
      "PNL – Programação Neurolinguística": (function () {
        const p = pnlDetalhe();
        return {
          como: `${p.protocolo.join(" ")} ${p.como}`,
          porque: "Reprograma submodalidades e gatilhos, interrompendo ruminação.",
        };
      })(),
      "Ho’oponopono": (function () {
        const h = hoOponoponoDetalhe();
        return {
          como: `Foco: ${h.foco}. ${h.como} Quando: ${h.quando}.`,
          porque: "Integra o “nó” somatoemocional e reduz resistência.",
        };
      })(),
      "Mindfulness – Atenção Plena": mindfulnessDetalhe(),
      "Nutrição Holística": (function () {
        const n = nutricaoHolisticaDetalhe();
        return { como: `${n.como}`, porque: `${n.porque} ${n.observacao}` };
      })(),
      "Reflexologia Podal": {
        como: "Plexo solar → sistema-alvo → pontos dolorosos (6–8s) por 12–18 min.",
        porque: "Reflexos somatoautonômicos aliviam dor/ tensão.",
      },
      Moxaterapia: {
        como: "20–30s por ponto, 3 repetições.",
        porque: "Aquece e dinamiza fluxo energético.",
      },
      Auriculoterapia: {
        como: "Shen Men / Rim / Ansiedade; estímulo 3×/dia por 30–60s (seed/pressure).",
        porque: "Equilíbrio neuroenergético e redução de picos.",
      },
    };
    return map[nome] || {
      como: "Aplicação progressiva com monitoramento.",
      porque: "Favorece regulação autonômica e integração corpo–mente.",
    };
  }

  function plano7(tec, ctx) {
    const gi = /gastrit|reflux|azia|digest|c[oó]lica|constipa/.test(ctx.toLowerCase());
    const [t1, t2, t3, t4, t5] = tec;
    return [
      `Dia 1 — Ritual base: respiração 4-4-6 (3×/dia). Introduzir ${t1} + ${t2}. Diário 3 linhas.`,
      `Dia 2 — ${t3 || t1}: prática guiada; cromoterapia curta; registrar VAS antes/depois.`,
      `Dia 3 — ${t4 || t2}: consolidar; ${gi ? "aroma com massagem abdominal 1×/dia" : "reforço de âncora de calma"}.`,
      `Dia 4 — ${t5 || t3 || t1}: treino de interrupção de ruminação (<60 s).`,
      `Dia 5 — Revisão de adesão; ajustar blend floral/aroma se necessário.`,
      `Dia 6 — Sessão combinada (20 min) integrando 2–3 técnicas.`,
      `Dia 7 — Reavaliação 0–10, métricas e plano de continuidade (14 dias).`,
    ].join("\n");
  }

  function montarRelatorio() {
    const terapeuta = must(el.terapeuta.value);
    const cliente = must(el.cliente.value);
    const nasc = parseDateFlex(el.nascimento.value);
    const intensidade = clamp(+(el.intensidade.value || 0), 0, 10);
    const queixa = must(el.queixa.value);
    const tempo = must(el.tempo.value);
    const efeitos = must(el.efeitos.value);
    const modo = (el.modo && el.modo.value) || "online";
    if (!cliente || !queixa) throw new Error("Preencha pelo menos Cliente e Queixa.");

    const ctx = (queixa + " " + efeitos).toLowerCase();
    const tec = chooseTechniques(ctx, modo);
    const pr = parecerDetalhado(queixa, efeitos, intensidade);
    const chk = checklist(ctx, intensidade);

    const tecnicasDet = tec
      .map((t, i) => {
        const d = comoPorQue(t, ctx);
        return `${i + 1}) ${t}\n   • Como usar: ${d.como}\n   • Por que nesta sessão: ${d.porque}`;
      })
      .join("\n\n");

    const plano = plano7(tec, ctx);

    // registo local p/ CSV
    try {
      const logs = JSON.parse(localStorage.getItem("th60_logs") || "[]");
      logs.push({
        data: new Date().toISOString(),
        terapeuta,
        cliente,
        nascimento: nasc,
        intensidade,
        queixa,
        tempo,
        efeitos,
        modo,
        tecnicas: tec,
      });
      localStorage.setItem("th60_logs", JSON.stringify(logs));
    } catch {}

    return [
      `TH60 — Seu mentor holístico de alta performance`,
      `Terapeuta: ${terapeuta || "—"}   Cliente: ${cliente}   Nasc.: ${nasc}   Modo: ${modo.toUpperCase()}`,
      `Queixa: ${queixa}   Intensidade: ${intensidade}/10   Tempo: ${tempo}`,
      `Efeitos: ${efeitos || "—"}`,
      "",
      "SÍNTESE DO CASO",
      pr.sintese,
      "",
      "O QUE ESTÁ OCULTO",
      pr.oculto,
      "",
      "CRITÉRIO DO GESTOR",
      pr.criterio,
      "",
      "TÉCNICAS ESCOLHIDAS (máx. 5)",
      tecnicasDet,
      "",
      "PLANO DE INTERVENÇÃO — 7 DIAS",
      plano,
      "",
      "MÉTRICAS DE PROGRESSO",
      "• " + pr.sinais.join("\n• "),
      "",
      "CHECKLIST DE SEGURANÇA",
      "• " + chk.join("\n• "),
    ].join("\n");
  }

  // ====================== PDF PRO ======================
  const PDF = (function () {
    const MAP = {
      "á": 0xe1, "à": 0xe0, "â": 0xe2, "ã": 0xe3, "ä": 0xe4,
      "Á": 0xc1, "À": 0xc0, "Â": 0xc2, "Ã": 0xc3, "Ä": 0xc4,
      "é": 0xe9, "è": 0xe8, "ê": 0xea, "É": 0xc9, "È": 0xc8, "Ê": 0xca,
      "í": 0xed, "ì": 0xec, "Í": 0xcd, "Ì": 0xcc,
      "ó": 0xf3, "ò": 0xf2, "ô": 0xf4, "õ": 0xf5, "Ó": 0xd3, "Ò": 0xd2, "Ô": 0xd4, "Õ": 0xd5,
      "ú": 0xfa, "ù": 0xf9, "Ú": 0xda, "Ù": 0xd9,
      "ç": 0xe7, "Ç": 0xc7, "ñ": 0xf1, "Ñ": 0xd1, "ü": 0xfc, "Ü": 0xdc,
    };
    const esc = (s) =>
      String(s || "")
        .split("")
        .map((ch) => {
          if (ch === "(") return "\\(";
          if (ch === ")") return "\\)";
          if (ch === "\\") return "\\\\";
          const code = ch.charCodeAt(0);
          if (code >= 32 && code <= 126) return ch;
          if (MAP[ch] !== undefined) return "\\" + ("00" + MAP[ch].toString(8)).slice(-3);
          return " ";
        })
        .join("");
    const bytes = (t) => new TextEncoder().encode(String(t)).length;

    function wrap(text, w) {
      const out = [];
      for (const raw of String(text || "").split(/\r?\n/)) {
        if (raw.trim() === "") {
          out.push("");
          continue;
        }
        let cur = "";
        for (const word of raw.split(/\s+/)) {
          const probe = (cur ? cur + " " : "") + word;
          if (probe.length > w) {
            if (cur) out.push(cur);
            if (word.length > w) {
              for (let i = 0; i < word.length; i += w) out.push(word.slice(i, i + w));
              cur = "";
            } else cur = word;
          } else cur = probe;
        }
        if (cur) out.push(cur);
      }
      return out;
    }

    function typeset(bodyText, footerLeft, footerRight) {
      const W = 595.28,
        H = 841.89,
        Mx = 58,
        MyTop = 72,
        MyBottom = 64;
      const FS = 11,
        LH = 15;
      const charsPerLine = Math.floor((W - 2 * Mx) / (FS * 0.56));
      const lines = wrap(bodyText, charsPerLine);

      const sections = lines.map((l) =>
        /^[A-ZÇÃÉÊÍÓÚ0-9\- ]{3,}$/.test(l.trim()) ? { type: "h", text: l.trim() } : { type: "t", text: l }
      );

      const usableH = H - (MyTop + MyBottom);
      const linesPerPage = Math.floor(usableH / LH) - 2;

      const pages = [];
      let buf = [];
      for (const it of sections) {
        if (it.type === "h") {
          if (buf.length + 2 > linesPerPage) {
            pages.push(buf);
            buf = [];
          }
          buf.push({ h: it.text });
        } else {
          if (buf.length + 1 > linesPerPage) {
            pages.push(buf);
            buf = [];
          }
          buf.push({ t: it.text });
        }
      }
      if (buf.length) pages.push(buf);
      if (!pages.length) pages.push([{ t: "(vazio)" }]);

      let objs = [],
        id = 1;
      const add = (c) => {
        const s = `${id} 0 obj\n${c}\nendobj\n`;
        objs.push(s);
        return id++;
      };
      const font = add(
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
      );
      const fontB = add(
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
      );

      const pids = [];
      pages.forEach((items, i) => {
        let y = H - MyTop;
        let s = "";
        if (i === 0) {
          const title = "TH60 — Seu mentor holístico de alta performance";
          s += `BT\n/F2 16 Tf\n1 0 0 1 ${Mx} ${y} Tm\n(${esc(title)}) Tj\nET\n`;
          y -= 22;
        }
        s += `BT\n/F1 ${FS} Tf\n1 0 0 1 ${Mx} ${y} Tm\n`;
        for (const it of items) {
          if (it.h) {
            s += `ET\nBT\n/F2 12 Tf\n1 0 0 1 ${Mx} ${y} Tm\n(${esc(it.h)}) Tj\nET\n`;
            y -= LH;
            s += `BT\n/F1 ${FS} Tf\n1 0 0 1 ${Mx} ${y} Tm\n`;
          } else {
            s += `(${esc(it.t)}) Tj\n0 -${LH} Td\n`;
            y -= LH;
          }
        }
        const footY = MyBottom - 22;
        const left = esc(footerLeft || "");
        const right = esc(footerRight || "");
        s += `ET\nBT\n/F1 10 Tf\n1 0 0 1 ${Mx} ${footY} Tm\n(${left}) Tj\nET\n`;
        const approxRight = right.length * 10 * 0.56;
        const posRightX = Math.max(Mx, W - Mx - approxRight);
        s += `BT\n/F1 10 Tf\n1 0 0 1 ${posRightX} ${footY} Tm\n(${right}) Tj\nET`;

        const streamId = add(`<< /Length ${bytes(s)} >>\nstream\n${s}\nendstream`);
        const pageId = add(
          `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontB} 0 R >> >> /Contents ${streamId} 0 R >>`
        );
        pids.push(pageId);
      });

      const kids = pids.map((i) => `${i} 0 R`).join(" ");
      const pagesId = add(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pids.length} >>`);
      objs = objs.map((o) => o.replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`));
      const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

      let pdf = "%PDF-1.4\n",
        offs = [0];
      for (const o of objs) {
        offs.push(bytes(pdf));
        pdf += o;
      }
      const xref = bytes(pdf);
      let xr = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
      for (let i = 1; i <= objs.length; i++) xr += String(offs[i]).padStart(10, "0") + " 00000 n \n";
      const trailer = `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return pdf + xr + trailer;
    }

    function download(name, bodyText, footerLeft, footerRight) {
      const pdf = typeset(bodyText, footerLeft, footerRight);
      const blob = new Blob([pdf], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1200);
    }
    return { download };
  })();

  // ====================== MODELOS / CSV ======================
  function refreshModelos() {
    try {
      const dict = JSON.parse(localStorage.getItem("th60_modelos") || "{}");
      el.selModelos.innerHTML =
        `<option value="">Carregar modelo…</option>` +
        Object.keys(dict)
          .sort()
          .map((k) => `<option value="${k}">${k}</option>`)
          .join("");
    } catch {}
  }
  function coletarForm() {
    return {
      terapeuta: el.terapeuta.value,
      cliente: el.cliente.value,
      nascimento: el.nascimento.value,
      intensidade: el.intensidade.value,
      queixa: el.queixa.value,
      tempo: el.tempo.value,
      efeitos: el.efeitos.value,
      modo: el.modo.value,
    };
  }
  function aplicarForm(d) {
    if (!d) return;
    el.terapeuta.value = d.terapeuta || "";
    el.cliente.value = d.cliente || "";
    el.nascimento.value = d.nascimento || "";
    el.intensidade.value = d.intensidade || "";
    el.queixa.value = d.queixa || "";
    el.tempo.value = d.tempo || "";
    el.efeitos.value = d.efeitos || "";
    el.modo.value = d.modo || "online";
  }
  function exportCSV() {
    try {
      const rows = JSON.parse(localStorage.getItem("th60_logs") || "[]");
      if (!rows.length) {
        alert("Sem registros ainda.");
        return;
      }
      const header = [
        "data",
        "terapeuta",
        "cliente",
        "nascimento",
        "intensidade",
        "queixa",
        "tempo",
        "efeitos",
        "modo",
        "tecnicas",
      ];
      const csv = [header.join(",")]
        .concat(
          rows.map((r) => {
            const vals = header.map((h) => {
              let v = r[h];
              if (Array.isArray(v)) v = v.join(" / ");
              v = (v == null ? "" : String(v)).replace(/"/g, '""');
              return `"${v}"`;
            });
            return vals.join(",");
          })
        )
        .join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = "TH60_logs_" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1200);
    } catch (e) {
      console.error(e);
      alert("Falha ao exportar CSV.");
    }
  }

  // ====================== BINDINGS ======================
  document.addEventListener("DOMContentLoaded", function () {
    refreshModelos();

    el.btnGerar?.addEventListener("click", () => {
      try {
        el.report.textContent = montarRelatorio();
      } catch (e) {
        console.error(e);
        alert(e.message || "Falha ao gerar parecer.");
      }
    });
    el.btnReset?.addEventListener("click", () => {
      el.report.textContent = "O parecer aparecerá aqui.";
    });
    el.btnPDF?.addEventListener("click", () => {
      const txt = el.report?.textContent || "";
      const hoje = new Date().toISOString().slice(0, 10);
      const cliente = (el.cliente?.value || "—").trim();
      const left = `Cliente: ${cliente}`;
      const right = `Data do atendimento: ${hoje}  ·  TH60`;
      PDF.download(`Relatorio_${cliente.replace(/\s+/g, "_")}_${hoje}.pdf`, txt, left, right);
    });
    el.btnSalvarModelo?.addEventListener("click", () => {
      const nome = prompt("Nome do modelo:");
      if (!nome) return;
      try {
        const dict = JSON.parse(localStorage.getItem("th60_modelos") || "{}");
        dict[nome] = coletarForm();
        localStorage.setItem("th60_modelos", JSON.stringify(dict));
        refreshModelos();
        alert("Modelo salvo.");
      } catch (e) {
        console.error(e);
        alert("Não foi possível salvar o modelo.");
      }
    });
    el.selModelos?.addEventListener("change", () => {
      const k = el.selModelos.value;
      if (!k) return;
      try {
        const dict = JSON.parse(localStorage.getItem("th60_modelos") || "{}");
        aplicarForm(dict[k]);
      } catch (e) {
        console.error(e);
        alert("Falha ao carregar modelo.");
      }
    });
    el.btnCSV?.addEventListener("click", exportCSV);
  });
})();
