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


app.get("/api/buscacursos", async (req, res) => {
  const sigla = req.query.sigla || "";
  const nombre = req.query.nombre || "";

  const url = `https://buscacursos.uc.cl/?cxml_semestre=2025-2&cxml_sigla=${encodeURIComponent(sigla)}&cxml_nombre=${encodeURIComponent(nombre)}&cxml_nrc=`;
 
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    console.log(html)

    res.send(html);   // devolvemos el HTML al cliente
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});


app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
console.log('Esperando requests... Ctrl+C para salir');