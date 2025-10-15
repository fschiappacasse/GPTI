require('dotenv').config();
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { DateTime } = require('luxon');
const axios = require('axios');
const formData = require("form-data");
const Mailgun = require("mailgun.js");
const sgMail = require('@sendgrid/mail')



// Configura tu API key de SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Función para enviar correos
async function sendMail(to, subject, html) {
  const msg = {
    to, // destinatario
    from: 'buscacuposuc@gmail.com', // debe ser un correo verificado en SendGrid
    subject,
    html,
  };

  try {
    const result = await sgMail.send(msg);
    console.log('Correo enviado:', result);
  } catch (error) {
    console.error('Error al enviar el correo:', error.response ? error.response.body : error);
  }
}

const schedule = require('node-schedule');

// scheduleMail: programa un correo para una fecha y hora específicas, además llama a el curso 
function scheduleMail(to, dateTimeUTC3, nrcList) {
  if (nrcList.length === 0) {
    throw new Error("Debes proporcionar al menos un NRC.");
  }
  if (nrcList.length > 10) {
    throw new Error("Solo se permite un máximo de 10 NRCs por correo.");
  }

  const chileTime = DateTime.fromISO(dateTimeUTC3, { zone: "America/Santiago" });
  const jsDate = chileTime.toJSDate();

  console.log(`📅 Programando correo para ${chileTime.toFormat("dd/MM/yyyy HH:mm:ss")}`);

  schedule.scheduleJob(jsDate, async () => {
    const subject = "Aviso BuscaCuposUC - Estado de cursos";
    let combinedHtml = `<h2>Estado de cursos (NRCs)</h2><ul>`;

    for (const nrc of nrcList) {
      const url = `https://buscacursos.uc.cl/informacionVacReserva.ajax.php?nrc=${nrc}&termcode=2025-2`;
      try {
        const response = await axios.get(url);
        combinedHtml += `<li><strong>NRC ${nrc}:</strong><br>${response.data}</li><br>`;
      } catch (error) {
        console.error(`Error obteniendo HTML del NRC ${nrc}:`, error);
        combinedHtml += `<li><strong>NRC ${nrc}:</strong> No se pudo obtener el estado del curso.</li><br>`;
      }
    }

    combinedHtml += "</ul>";
    await sendMail(to, subject, combinedHtml);
  });
}

module.exports = { scheduleMail };

// Ejemplo: usuario programa un envío dentro de 2 minutos
//const now = DateTime.now().setZone('America/Santiago');
//const future = now.plus({ minutes: 2 });
//scheduleMail('schiappacasseflorencia@gmail.com', 'Correo dinámico', '¡Hola Florencia!', future.toISO());

//sendMail('schiappacasseflorencia@gmail.com', 'Prueba inmediata', 'Este correo se envía ahora mismo');
