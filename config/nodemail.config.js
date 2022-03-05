require("dotenv").config();
const nodemailer = require("nodemailer");
const mod = require("../models/user.model")

async function sendEmail(email, code, name) {
  try {

  //L'email
    const body_html = `<!DOCTYPE> 
    <html>
      <body>
      <table cellspacing="0" cellpadding="0" width="600px" style="font-family:Montserrat,Arial,Tahoma,'sans serif';font-size:16px;line-height:26px;margin:auto;background-color:#ffffff">
    <tbody><tr height="45">
        <td>
            <table cellspacing="0" cellpadding="10" width="100%" style="text-align:center">
                <tbody><tr>
                    <td style="margin:0 auto;min-width:320px;max-width:640px;padding:16px;background-color:#e5e5e5;border-bottom:1px solid #8F577B">
                    <p style="font-weight:bolder;color:#8F577B; font-size:xxx-large">JEERE </p>
                    </td>
                </tr>
            </tbody></table>
        </td>
    </tr>
    <tr>
        <td style="padding:32px 16px 24px 16px;background-color:#e5e5e5">
            
<table width="568" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td>
<table width="570" cellpadding="0" cellspacing="0" >
    <tbody><tr>
        <td style="font-family:Montserrat,Arial,Tahoma,'sans serif';font-size:16px;line-height:26px;color:#000000">
            <h3 style="margin-bottom:24px">
                Bienvenue à JEERE, ${name}.
            </h3>

            <p style="margin-bottom:24px">
                Merci de terminer votre inscription. Pour cela veuillez confirmer votre email en renseignant le code suivant.
            </p>

            <p style="margin-bottom:24px;text-align:center; font-size:20px;line-height:20px;font-weight:bold;text-decoration:none;padding:10px 16px;color:#fefae0;background-color:#8F577B;border-radius:4p;text-decoration:none; focus:none">
                ${code}
            </p>

            <p style="margin-bottom:24px">
                Vous n'êtes pas à l'origine de cette demande d'inscription&nbsp;? Écrivez-nous à cette adresse&nbsp;: <a style="color:#7c4167"  href="mailto:jeerecompagny@gmail.com" target="_blank">jeerecompagny@<span class="il">gmail</span>.com</a>.
           
            </p>

            <p style="margin-bottom:24px">
                À bientôt,<br>
                L'équipe <span class="il">de JEERE</span>
            </p>
        </td>
    </tr>
</tbody></table>
      </body>
    </html>`;
 // Création du  SMTP transport.
    let transporter = nodemailer.createTransport({
      host: process.env.HOST,
      service: process.env.SERVICE,
      port: 587,
      secure: true,
      auth: {
          user: process.env.USER,
          pass: process.env.PASS,
      },
    });
   
    let mailOptions = {
      from: process.env.USER,
      to: email,
      subject: "Veuillez confirmez votre inscription",
      html: body_html,

    };
let info = await transporter.sendMail(mailOptions);
    return { error: false };
  } catch (error) {
    console.error("Erreur sur l'envoi de email", error);
    return {
      error: true,
      message: "Oups! Impossible d'envoyer l'email",
    };
  }
}

module.exports = { sendEmail };