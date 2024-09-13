import nodemailer from "nodemailer";

// this is for testing purspose not sent actual mail
export const sendEmail = async (senderName = "",senderEmail,recieverEmail,message) =>{
     try{
        const transporter = await nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT !== "587", 
            auth: {
              user: process.env.MY_EMAIL_ID ,
              pass: process.env.MY_EMAIL_PASSWORD,
            },
          });

          const info = await transporter.sendMail({
            from: `${senderName} <${senderEmail}>`, // sender address
            to: `${recieverEmail}`, // list of receivers
            subject: `${message.subject ? message.subject : "No reply"}`, // Subject line
            text: `${message.text ? message.text : ""}`, // plain text body
            html: `${message.html ? message.html : ""}`, // html body
          });
        
          console.log("Message sent: ", info);
          return info;

     }catch(err){
        console.log("Error while sending email :",err);
     }
}