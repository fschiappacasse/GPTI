const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { DateTime } = require('luxon');
const axios = require('axios');

// Configuración del transporter (ejemplo con Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'buscacuposuc@gmail.com',
    pass: 'zmuv yksx smoz cajz'
  }
});

// Función para enviar mail
function sendMail(to, subject, html) {
  const mailOptions = {
    from: 'buscacuposuc@gmail.com',
    to,
    subject,
    html

  };

  return transporter.sendMail(mailOptions)
    .then(info => {
      console.log('Correo enviado:', info.response);
    })
    .catch(error => {
      console.error('Error al enviar el correo:', error);
    });
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
