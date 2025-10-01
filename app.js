  function montarRelatorio(){
    const terapeuta=must(el.terapeuta.value);
    const cliente=must(el.cliente.value);
    const nasc=parseDateFlex(el.nascimento.value);
    const intensidade=clamp(+(el.intensidade.value||0),0,10);
    const queixa=must(el.queixa.value);
    const tempo=must(el.tempo.value);
    const efeitos=must(el.efeitos.value);
    const modo=(el.modo && el.modo.value)||"presencial";

    if(!cliente||!queixa) throw new Error("Preencha pelo menos Cliente e Queixa.");

    const ctx=(queixa+" "+efeitos).toLowerCase();
    const tec=chooseTechniques(ctx, modo);
    const pr=parecerDetalhado(queixa, efeitos, intensidade);
    const chk=checklist(ctx,intensidade);

    const tecnicasDet = tec.map((t,i)=>{
      const d=comoPorQue(t, ctx);
      return `${i+1}) ${t}\n   • Como usar: ${d.como}\n   • Por que nesta sessão: ${d.porque}`;
    }).join("\n\n");

    const plano = plano7(tec);

    // LOG
    try{
      const logs = JSON.parse(localStorage.getItem("th60_logs")||"[]");
      logs.push({
        data: new Date().toISOString(),
        terapeuta, cliente, nascimento:nasc, intensidade, queixa, tempo, efeitos, modo,
        tecnicas: tec
      });
      localStorage.setItem("th60_logs", JSON.stringify(logs));
    }catch(e){ console.warn("Falha ao registrar log:", e); }

    return [
      `Relatório  Instituto Saber Consciente`,
      `Terapeuta: ${terapeuta||"—"}   Cliente: ${cliente}   Nasc.: ${nasc}   Atendimento: ${modo.toUpperCase()}`,
      `Queixa: ${queixa}   Intensidade: ${intensidade}/10   Tempo: ${tempo}`,
      `Efeitos: ${efeitos||"—"}`, "",
      "SÍNTESE DO CASO", pr.sintese, "",
      "O QUE ESTÁ OCULTO", pr.oculto, "",
      "CRITÉRIO DO GESTOR", pr.criterio, "",
      "TÉCNICAS ESCOLHIDAS (máx. 3)", tecnicasDet, "",
      "PLANO DE INTERVENÇÃO — 7 DIAS (Sessão vs. Casa)", plano, "",
      "SINAIS DE PROGRESSO ESPERADOS", "• "+pr.sinais.join("\n• "), "",
      "CHECKLIST DE SEGURANÇA", "• "+chk.join("\n• ")
    ].join("\n");
  }

  // ======================= PDF (v6.4) =======================
  const PDF=(function(){
    const MAP={"á":0xe1,"à":0xe0,"â":0xe2,"ã":0xe3,"ä":0xe4,"Á":0xc1,"À":0xc0,"Â":0xc2,"Ã":0xc3,"Ä":0xc4,"é":0xe9,"è":0xe8,"ê":0xea,"É":0xc9,"È":0xc8,"Ê":0xca,"í":0xed,"ì":0xec,"Í":0xcd,"Ì":0xcc,"ó":0xf3,"ò":0xf2,"ô":0xf4,"õ":0xf5,"Ó":0xd3,"Ò":0xd2,"Ô":0xd4,"Õ":0xd5,"ú":0xfa,"ù":0xf9,"Ú":0xda,"Ù":0xd9,"ç":0xe7,"Ç":0xc7,"ñ":0xf1,"Ñ":0xd1,"ü":0xfc,"Ü":0xdc};
    const normalize=(s)=>String(s||"").replace(/[“”„]/g,'"').replace(/[‘’]/g,"'").replace(/–|—/g,"-");
    function esc(s){
      s=normalize(s); let out="";
      for(const ch of s){
        if(ch==="(") out+="\\("; else if(ch===")") out+="\\)"; else if(ch==="\\") out+="\\\\";
        else { const code=ch.charCodeAt(0);
          if(code>=32 && code<=126) out+=ch;
          else if(MAP[ch]!==undefined) out+="\\"+("00"+MAP[ch].toString(8)).slice(-3);
          else out+=" ";
        }
      }
      return out;
    }
    const bytelen=(t)=>new TextEncoder().encode(String(t)).length;

    function wrapLines(text, charsPerLine){
      const out=[];
      const src = String(text||"").split(/\r?\n/);
      for(const raw of src){
        const line=raw.replace(/\s+$/,"");
        if(line===""){ out.push(""); continue; }
        let cur="";
        for(const word of line.split(/\s+/)){
          const probe=(cur?cur+" ":"")+word;
          if(probe.length>charsPerLine){
            if(cur) out.push(cur);
            if(word.length>charsPerLine){
              for(let i=0;i<word.length;i+=charsPerLine) out.push(word.slice(i,i+charsPerLine));
              cur="";
            }else cur=word;
          }else cur=probe;
        }
        if(cur) out.push(cur);
      }
      return out;
    }

    function gen({bodyText, footerLeft, footerRight}){
      const W=595.28, H=841.89;
      const Mx=54, MyTop=54, MyBottom=54;
      const FS=12, LH=16;
      const usableH=H-(MyTop+MyBottom);
      const charsPerLine=Math.floor((W-2*Mx)/(FS*0.56));

      const lines=wrapLines(bodyText, charsPerLine);
      const linesPerPage=Math.max(1, Math.floor(usableH/LH)-2);

      const pages=[];
      for(let i=0;i<lines.length;i+=linesPerPage) pages.push(lines.slice(i,i+linesPerPage));
      if(!pages.length) pages.push(["(vazio)"]);

      let objs=[], id=1;
      const add=(c)=>{const s=`${id} 0 obj\n${c}\nendobj\n`; objs.push(s); return id++;};

      const font=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
      const pids=[];
      pages.forEach((L)=>{
        let stream=`BT\n/F1 ${FS} Tf\n1 0 0 1 ${Mx} ${H-MyTop} Tm\n`;
        let first=true;
        for(const ln of L){ const e=esc(ln); if(first){stream+=`(${e}) Tj\n`; first=false;} else {stream+=`0 -${LH} Td\n(${e}) Tj\n`;} }
        const footY=MyBottom-18;
        const left=esc(footerLeft||""); const right=esc(footerRight||"");
        stream+=`ET\nBT\n/F1 10 Tf\n1 0 0 1 ${Mx} ${footY} Tm\n(${left}) Tj\n`;
        const approxRight = right.length*10*0.56;
        const posRightX=Math.max(Mx, W-Mx-approxRight);
        stream+=`1 0 0 1 ${posRightX} ${footY} Tm\n(${right}) Tj\nET`;

        const cid=add(`<< /Length ${bytelen(stream)} >>\nstream\n${stream}\nendstream`);
        const pid=add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${cid} 0 R >>`);
        pids.push(pid);
      });

      const kids=pids.map(i=>`${i} 0 R`).join(" ");
      const pagesId=add(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pids.length} >>`);
      objs=objs.map(o=>o.replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`));
      const catalog=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

      let pdf="%PDF-1.4\n", offs=[0];
      for(const o of objs){ offs.push(bytelen(pdf)); pdf+=o; }
      const xref=bytelen(pdf);
      let xr=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
      for(let i=1;i<=objs.length;i++) xr+=String(offs[i]).padStart(10,"0")+" 00000 n \n";
      const trailer=`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return pdf+xr+trailer;
    }

    function download(name, bodyText, footerLeft, footerRight){
      const data=gen({bodyText, footerLeft, footerRight});
      const blob=new Blob([data],{type:"application/pdf"});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob); a.download=name; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1200);
    }
    return { download };
  })();

  // ======================= Modelos / CSV =======================
  function refreshModelos(){
    try{
      const dict = JSON.parse(localStorage.getItem("th60_modelos")||"{}");
      if(!el.selModelos) return;
      el.selModelos.innerHTML = `<option value="">Carregar modelo…</option>`+
        Object.keys(dict).sort().map(k=>`<option value="${k}">${k}</option>`).join("");
    }catch{}
  }
  function coletarForm(){
    return {
      terapeuta: el.terapeuta?.value || "", cliente: el.cliente?.value || "", nascimento: el.nascimento?.value || "",
      intensidade: el.intensidade?.value || "", queixa: el.queixa?.value || "", tempo: el.tempo?.value || "",
      efeitos: el.efeitos?.value || "", modo: el.modo?.value || "presencial"
    };
  }
  function aplicarForm(d){
    if(!d) return;
    if(el.terapeuta) el.terapeuta.value=d.terapeuta||"";
    if(el.cliente) el.cliente.value=d.cliente||"";
    if(el.nascimento) el.nascimento.value=d.nascimento||"";
    if(el.intensidade) el.intensidade.value=d.intensidade||"";
    if(el.queixa) el.queixa.value=d.queixa||"";
    if(el.tempo) el.tempo.value=d.tempo||"";
    if(el.efeitos) el.efeitos.value=d.efeitos||"";
    if(el.modo) el.modo.value=d.modo||"presencial";
  }
  function exportCSV(){
    try{
      const rows = JSON.parse(localStorage.getItem("th60_logs")||"[]");
      if(!rows.length){ alert("Sem registros ainda."); return; }
      const header = ["data","terapeuta","cliente","nascimento","intensidade","queixa","tempo","efeitos","modo","tecnicas"];
      const csv = [header.join(",")].concat(rows.map(r=>{
        const vals = header.map(h=>{
          let v = r[h];
          if(Array.isArray(v)) v = v.join(" / ");
          v = (v==null?"":String(v)).replace(/"/g,'""');
          return `"${v}"`;
        });
        return vals.join(",");
      })).join("\n");
      const blob = new Blob([csv],{type:"text/csv;charset=utf-8"});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="TH60_logs_"+new Date().toISOString().slice(0,10)+".csv";
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1200);
    }catch(e){ console.error(e); alert("Falha ao exportar CSV."); }
  }

  // ======================= Bindings =======================
  document.addEventListener("DOMContentLoaded", function(){
    refreshModelos();

    el.btnGerar?.addEventListener("click", ()=>{
      try{ el.report.textContent = montarRelatorio(); }
      catch(e){ console.error(e); alert(e.message || "Falha ao gerar parecer."); }
    });
    el.btnReset?.addEventListener("click", ()=>{ if(el.report) el.report.textContent="O parecer aparecerá aqui."; });
    el.btnPDF?.addEventListener("click", ()=>{
      const txt = el.report?.textContent || "";
      const hoje = new Date().toISOString().slice(0,10);
      const cliente = (el.cliente?.value || "—").trim();
      const name = `Relatorio_${cliente.replace(/\s+/g,"_")}_${hoje}.pdf`;
      const footerLeft = `Cliente: ${cliente}`;
      const footerRight = `Data do atendimento: ${hoje}  ·  TH60`;
      try{ PDF.download(name, txt, footerLeft, footerRight); }
      catch(e){ console.error(e); alert("Falha ao gerar PDF."); }
    });

    el.btnSalvarModelo?.addEventListener("click", ()=>{
      const nome = prompt("Nome do modelo:");
      if(!nome) return;
      try{
        const dict = JSON.parse(localStorage.getItem("th60_modelos")||"{}");
        dict[nome] = coletarForm();
        localStorage.setItem("th60_modelos", JSON.stringify(dict));
        refreshModelos();
        alert("Modelo salvo.");
      }catch(e){ console.error(e); alert("Não foi possível salvar o modelo."); }
    });
    el.selModelos?.addEventListener("change", ()=>{
      const k = el.selModelos.value; if(!k) return;
      try{
        const dict = JSON.parse(localStorage.getItem("th60_modelos")||"{}");
        aplicarForm(dict[k]);
      }catch(e){ console.error(e); alert("Falha ao carregar modelo."); }
    });

    el.btnCSV?.addEventListener("click", exportCSV);
  });

})();
