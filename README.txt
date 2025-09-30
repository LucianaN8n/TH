Seu Mentor Holístico — Pacote pronto
====================================

Arquivos:
- app.html  → aplicativo completo (anamnese + parecer + PDF por impressão do navegador)
- index.html → redireciona para app.html

Como publicar (Netlify, Vercel ou hospedagem estática):
1) Envie estes dois arquivos para a pasta pública do seu site.
2) Abra https://SEU-DOMINIO/app.html para testar.

Embed na Hotmart Club (Campo "Incorporar código"):
--------------------------------------------------
Cole o snippet abaixo (ajuste o domínio):
<iframe
  src="https://SEU-DOMINIO/app.html?embed=hotmart&noapi=1"
  style="width:100%;max-width:980px;height:1900px;border:0;overflow:hidden;border-radius:12px;"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
  allow="clipboard-read; clipboard-write">
</iframe>

Embed no Wix (Adicionar → Incorporar → Código):
-----------------------------------------------
<iframe
  src="https://SEU-DOMINIO/app.html?embed=wix&noapi=1"
  style="width:100%;height:2000px;border:0;overflow:hidden;border-radius:12px;"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
  allow="clipboard-read; clipboard-write">
</iframe>

Observações importantes:
- O PDF é gerado via **Imprimir** do navegador (window.print) — escolha "Salvar como PDF".
- CSS de impressão já ajusta margens e esconde a anamnese, mantendo só o relatório.
- Nada de chamadas remotas: compatível com iframes do Hotmart/Wix.
