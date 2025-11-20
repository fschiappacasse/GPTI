require('dotenv').config();
const axios = require('axios');
const sgMail = require('@sendgrid/mail')



sgMail.setApiKey(process.env.SENDGRID_API_KEY);

//función para enviar correos
async function sendMail(to, subject, html) {
  const msg = {
    to, 
    from: 'buscacuposuc@gmail.com', 
    subject,
    html,
  };

  try {
    const result = await sgMail.send(msg);
    console.log('correo enviado de forma correcta:', result);

  } catch (error) {
    console.error('error enviando el correo:', error.response.body);
  }
}

const schedule = require('node-schedule');


// scheduleMail: programa un correo para una fecha y hora específicas, además llama a el curso 
function scheduleMail2(to, horario1, nrcList) {
  if (nrcList.length === 0) {
    throw new Error("Debes proporcionar al menos un NRC.");
  }
  if (nrcList.length > 10) {
    throw new Error("Solo se permite un máximo de 10 NRCs por correo.");
  }

  //const chileTime1 = DateTime.fromISO(horario1, { zone: "America/Santiago" });
  //const chileTime2 = DateTime.fromISO(horario2, { zone: "America/Santiago" });
  const [h1, m1] = horario1.split(":").map(Number);
  //const [h2, m2] = horario2.split(":").map(Number);

  const rule = new schedule.RecurrenceRule();
  rule.tz = "America/Santiago";   
  rule.hour = h1;
  rule.minute = m1;
  rule.second = 0;

  schedule.scheduleJob(rule, async () => {
    console.log("enviando a ", to);

    const subject = "Aviso BuscaCuposUC";
    let combinedHtml = `<h2>Estado de cursos (NRCs)</h2><ul>`;

    for (const nrc of nrcList) {
      
      const url = `https://buscacursos.uc.cl/informacionVacReserva.ajax.php?nrc=${nrc}&termcode=2025-2`; // Llamado a buscacursosUC
      try {
        const response = await axios.get(url);
        combinedHtml += `<li><strong>NRC ${nrc}:</strong><br>${response.data}</li><br>`;
      } catch (error) {
        console.error(`Error obteniendo info del NRC, al hacer fetch al buscacursosUC ${nrc}:`, error);
        combinedHtml += `<li><strong>NRC ${nrc}:</strong> Error al obtener la información </li><br>`;
      }
    }

    combinedHtml += "</ul>";

    await sendMail(to, subject, combinedHtml);
  });

  console.log(`correo programado`);
}

module.exports = { scheduleMail2 };

// Ejemplo: usuario programa un envío dentro de 2 minutos
//const now = DateTime.now().setZone('America/Santiago');
//const future = now.plus({ minutes: 2 });
//scheduleMail('schiappacasseflorencia@gmail.com', 'Correo dinámico', '¡Hola Florencia!', future.toISO());

//sendMail('schiappacasseflorencia@gmail.com', 'Prueba inmediata', 'Este correo se envía ahora mismo');
