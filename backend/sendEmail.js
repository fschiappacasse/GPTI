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
function scheduleMail(to, dateTimeUTC3, nrc) {
  const chileTime = DateTime.fromISO(dateTimeUTC3, { zone: 'America/Santiago' });
  const jsDate = chileTime.toJSDate();

  console.log(`Programando correo para ${chileTime.toFormat('dd/MM/yyyy HH:mm:ss')}`);

  schedule.scheduleJob(jsDate, async () => {
    const subject = "Aviso BuscaCuposUC - Estado del curso";
    // `https://buscacursos.uc.cl/?cxml_semestre=2025-2&cxml_nrc=${nrc}`;
    // https://buscacursos.uc.cl/informacionVacReserva.ajax.php?nrc=13747&termcode=2025-2
    const url = `https://buscacursos.uc.cl/informacionVacReserva.ajax.php?nrc=${nrc}&termcode=2025-2`;
    try {
      const response = await axios.get(url);
      const html = response.data;
      await sendMail(to, subject, html);
    } catch (error) {
      console.error('Error obteniendo HTML:', error);
      await sendMail(to, subject, 'No se pudo obtener el estado del curso.');
    }
  });
}


module.exports = { scheduleMail };

// Ejemplo: usuario programa un envío dentro de 2 minutos
//const now = DateTime.now().setZone('America/Santiago');
//const future = now.plus({ minutes: 2 });
//scheduleMail('schiappacasseflorencia@gmail.com', 'Correo dinámico', '¡Hola Florencia!', future.toISO());

//sendMail('schiappacasseflorencia@gmail.com', 'Prueba inmediata', 'Este correo se envía ahora mismo');
