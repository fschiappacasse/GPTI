const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { scheduleMail } = require('./backend/sendEmail');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// Servir archivos estáticos desde la carpeta 'frontend'
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Ruta para programar envío de correo
app.post('/backend/schedule', (req, res) => {
  const { to, dateTime, nrc } = req.body;
  if (!to || !dateTime || !nrc) {
    return res.status(400).json({ ok: false, message: 'Faltan datos.' });
  }

  scheduleMail(to, dateTime, nrc);
  res.json({ ok: true, message: 'Correo programado correctamente.' });
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
console.log('Esperando requests... Ctrl+C para salir');