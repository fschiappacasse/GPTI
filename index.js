require('dotenv').config(); 
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { scheduleMail } = require('./backend/sendEmail');

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

  // Validación
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


// Asegúrate de: npm install cheerio
const cheerio = require("cheerio");

app.get("/api/buscacursos", async (req, res) => {
  const siglaQ = req.query.sigla || "";
  const nombreQ = req.query.nombre || "";
  const format = (req.query.format || "html").toLowerCase();

  const url = `https://buscacursos.uc.cl/?cxml_semestre=2025-2&cxml_sigla=${encodeURIComponent(siglaQ)}&cxml_nombre=${encodeURIComponent(nombreQ)}&cxml_nrc=`;

  try {
    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);

    // Seleccionamos sólo las filas que contienen resultados reales
    const rows = [];
    $("tr.resultadosRowPar, tr.resultadosRowImpar").each((i, row) => {
      const $row = $(row);
      const tds = $row.find("td");

      // Protección: debe tener al menos algunas celdas
      if (tds.length < 6) return;

      // NRC (primer td)
      const nrc = $(tds[0]).text().trim();

      // Sigla (segundo td) — limpiar íconos, etc.
      let sigla = $(tds[1]).text().replace(/\s+/g, " ").trim();
      // normalmente contiene "EYP1113" + quizás iconos o texto
      // intentamos sacar la primera palabra que parece sigla
      const siglaMatch = sigla.match(/[A-ZÑÁÉÍÓÚ0-9\-]{2,}/i);
      if (siglaMatch) sigla = siglaMatch[0];

      // Sección (usualmente en la columna índice 4)
      const seccion = $(tds[4]).text().trim();

      // Nombre del curso: preferimos el atributo title del segundo td (tooltip)
      let nombre = $(tds[1]).attr("title");
      if (nombre) {
        // title suele tener "EYP1113 Probabilidades y Estadística"
        nombre = nombre.replace(/^[^\s]+\s*/, "").trim();
      } else {
        // fallback: buscar una td con texto largo (no numérico) — normalmente es la columna ~9
        nombre = "";
        tds.each((j, td) => {
          const txt = $(td).text().trim();
          if (txt.length > 10 && /\D/.test(txt) && !/SI|NO|Presencial|Online/i.test(txt)) {
            // heurística: si contiene palabras (no solo números) y no es "Presencial" ni "SI/NO"
            nombre = txt;
          }
        });
      }

      // Profesor(es): preferir enlaces con cxml_profesor en href
      let profesores = [];
      $row.find('a[href*="cxml_profesor"]').each((k, a) => {
        const p = $(a).text().trim();
        if (p) profesores.push(p);
      });
      // fallback: buscar la celda siguiente al nombre (si profesores vacíos)
      if (profesores.length === 0) {
        // heurística: la celda del profesor suele estar cerca de la del nombre
        // buscamos la primera td después de la que contiene 'nombre' con >3 chars y comas/espacios
        let foundIdx = -1;
        tds.each((j, td) => {
          const txt = $(td).text().trim();
          if (txt && txt === nombre) foundIdx = j;
        });
        if (foundIdx >= 0) {
          const maybeProf = $(tds[foundIdx + 1]).text().trim();
          if (maybeProf) profesores = maybeProf.split(/\s*,\s*|\<br|\n/).map(s => s.replace(/\s+/g,' ').trim()).filter(Boolean);
        }
      }

      const profesor = profesores.join(", ");

      // Validar que nrc sea un número (evitamos filas de header)
      if (nrc && /^[0-9]+$/.test(nrc)) {
        rows.push({
          nrc,
          sigla,
          seccion,
          nombre,
          profesor
        });
      }
    });

    if (format === "json") {
      return res.json({ url, count: rows.length, rows });
    }

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
              <th>Profesor</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td class="center">${r.nrc}</td>
                <td>${r.sigla}</td>
                <td class="center">${r.seccion}</td>
                <td>${escapeHtml(r.nombre)}</td>
                <td>${escapeHtml(r.profesor)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    res.send(cleanHTML);
  } catch (err) {
    console.error("Error fetching/parsing buscacursos:", err);
    res.status(500).send("Error fetching data");
  }
});

// helper para escapar texto en HTML
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}




app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
console.log('Esperando requests... Ctrl+C para salir');