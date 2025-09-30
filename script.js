document.getElementById("anamneseForm").addEventListener("submit", function(e){
  e.preventDefault();
  const formData = new FormData(e.target);
  const terapeuta = formData.get("terapeuta");
  const cliente = formData.get("cliente");
  const nascimento = formData.get("nascimento");
  const queixa = formData.get("queixa");

  const chat = document.getElementById("chat");
  chat.innerHTML = "<h2>Diagnóstico</h2>" +
    "<p><b>Terapeuta:</b> " + terapeuta + "</p>" +
    "<p><b>Cliente:</b> " + cliente + "</p>" +
    "<p><b>Data de Nascimento:</b> " + nascimento + "</p>" +
    "<p><b>Queixa:</b> " + queixa + "</p>" +
    "<hr><p><b>Mapa Numerológico:</b> baseado em " + nascimento + "...</p>" +
    "<p><b>Protocolos:</b> Psicanálise Clínica, PNL, Cristaloterapia, Reiki, Homeopatia, etc.</p>";
});

document.getElementById("gerarPdf").addEventListener("click", function(){
  const element = document.getElementById("chat");
  html2pdf().from(element).set({filename: "relatorio.pdf"}).save();
});