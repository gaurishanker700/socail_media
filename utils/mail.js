const nodemailer = require('nodemailer')

const sendemail = async (to, subject, html) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 587,

        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASS

        }
    })
    const mailoption = {
        from: process.env.EMAIL,
        to: to,
        subject,
        html


    }
    try {
        const info = await transporter.sendMail(mailoption)
        console.log('mail sent', info.response)


    } catch (error) {
        console.log("send email error", error)

    }
}
module.exports = sendemail;  
