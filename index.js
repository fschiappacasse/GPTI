require('dotenv').config(); 
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { scheduleMail,  scheduleMail2} = require('./backend/sendEmail');
const cheerio = require("cheerio");
const { Console } = require('console');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());

// frontend   
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Ruta para programar envío de correo / llamado a Api después de un tiempo
app.post('/backend/schedule', (req, res) => {
  const { to, dateTime, nrcList } = req.body;

  if (!to || !dateTime || !Array.isArray(nrcList) || nrcList.length === 0) {
    return res.status(400).json({ ok: false, message: 'Faltan datos o la lista de NRCs es inválida.' });
  }

  try {
    scheduleMail(to, dateTime, nrcList);
    res.json({
      ok: true,
      message: `Correo programado correctamente para ${to}`,
      nrcs: nrcList,
    });
  } catch (error) {
    console.error('Error programando correo:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor.' });
  }
});

//  Llamado para buscar un curso (maneja html tambien)
app.get("/api/buscacursos", async (req, res) => {
  const siglaQ = req.query.sigla || "";
  const nombreQ = req.query.nombre || "";
  const format = (req.query.format || "html").toLowerCase();

  const url = `https://buscacursos.uc.cl/?cxml_semestre=2025-2&cxml_sigla=${encodeURIComponent(siglaQ)}&cxml_nombre=${encodeURIComponent(nombreQ)}&cxml_nrc=`;

  try {
    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);


    const rows = [];
    //las siguientes lineas son parabuscar la info especifica dentro del html que devuelve el buscacursos
    $("tr.resultadosRowPar, tr.resultadosRowImpar").each((i, row) => {
      const $row = $(row);
      const tds = $row.find("td");

      const nrc = $(tds[0]).text()//nrc
      let sigla = $(tds[1]).text()
      const seccion = $(tds[4]).text() //seccion
      let nombre = $(tds[1]).attr("title"); //nombre del curso
    
      rows.push({
        nrc,
        sigla,
        seccion,
        nombre,
      });
    
    });

    

    // Generar HTML limpio
    const cleanHTML = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Resultados filtrados</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 12px; color:#222 }
          table { width:100%; border-collapse:collapse; }
          th, td { padding:8px; border:1px solid #ddd; text-align:left; font-size:14px }
          th { background:#f5f7fb; text-align:center; }
          td.center { text-align:center; }
          .small { font-size:13px; color:#555 }
        </style>
      </head>
      <body>
        <h3>Resultados filtrados (${rows.length})</h3>
        <table>
          <thead>
            <tr>
              <th>NRC</th>
              <th>Sigla</th>
              <th class="center">Sección</th>
              <th>Nombre</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td class="center">${r.nrc}</td>
                <td>${r.sigla}</td>
                <td class="center">${r.seccion}</td>
                <td>${r.nombre}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    res.send(cleanHTML);

  } 
  
  catch (err) {
    console.error("Error fetching/parsing buscacursos:", err);
    res.status(500).send("Error fetching data");
  }
    });


// Ruta para horarios predeterminados
app.post('/backend/schedule2', (req, res) => {
  //console.log("LLEGÓ A BACK")
  const { to, horarios, nrcList } = req.body;

  if (!to  || !horarios || nrcList.length === 0) {
    return res.status(400).json({ 
      ok: false, message: 'Faltan datos' });
  }
  //console.log("PASÓ VALIDACION")

  const horario1 = horarios[0] || null;
  const horario2 = horarios[1] || null;

  try {
    if(horario1){
    scheduleMail2(to, horario1, nrcList);
   }
 
    if(horario2){
    scheduleMail2(to, horario2, nrcList);
  }

    res.json({
    ok: true,
    message: `Correo programado correctamente para ${to}`,
    nrcs: nrcList,
  });



  } catch (error) {
    console.error('Error programando correo:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor.' });
  }
});


app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
console.log('esperando req');