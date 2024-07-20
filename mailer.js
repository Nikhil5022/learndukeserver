const nodeMailer = require("nodemailer");

const sendEmail = async (options) => {
  let template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SurelyWork | Webinar</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: Arial, Helvetica, sans-serif;
    }
    body {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      margin: 0 auto;
      background-color: #f7efeb;
    }
    .container {
      width: 90%;
      max-width: 800px;
      margin: 20px auto;
      border-radius: 10px;
      padding: 20px;
      background: #f7efeb;
      border: 3px solid pink;
      text-align: center;
    }
    .content {
      position: relative;
      z-index: 2;
    }
    h1, h3, p, h2 {
      margin: 10px 0;
    }
    img {
      margin: 10px;
      padding: 0 20px;
      width: 100%;
    }
    .details {
      display: flex;
      flex-direction: column;
      justify-content: space-evenly;
      padding: 10px 20px;
      color: #524949;
      font-weight: 800;
      font-size: 14px;
    }
    .details p {
      margin: 0;
    }
    .buttons {
      display: flex;
      flex-direction: column; 
      justify-content: space-between;
      align-items: center;
    }
    button {
      padding: 15px 0;
      font-size: large;
      width: 90%;
      margin: 10px;
      text-align: center;
      outline: 0;
      cursor: pointer;
      border-width: 2px;
      border-radius: 5px;
    }
    .buttons > button > a {
      text-decoration: none;
      color: inherit;
    }
    .btn-primary {
      border-color: #ff6200;
      background: #ff6200;
      color: #fff;
    }
    .btn-secondary {
      border-color: #ff6200;
      background: none;
      color: #000;
    }
    footer {
      margin: 0 auto;
      text-align: center;
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #524949;
    }
    footer p {
      padding: 10px 20px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="background-top"></div>
    <div class="background-bottom"></div>
    <div class="content">
      <h1>Hi, ${options.name}!</h1>
      <h3>Your webinar has been created successfully.</h3>
      <img src="${options.webinar.photo.url}" alt="SurelyWork">
      <p>${options.webinar.description}</p>
      <h2>Make sure to start meet on time!</h2>
      <div class="details">
        <p>Start Time: ${options.webinar.startTime.toLocaleString()}</p>
        <p>End Time: ${options.webinar.endTime.toLocaleString()}</p>
      </div>
      <div class="buttons">
        <button class="btn-secondary">
          <a href="https://learnduke-frontend-test.vercel.app/detailedWebinar/${options.webinar._id}">See Details</a>
        </button>
        <button class="btn-primary">
          <a href="https://learnduke-frontend-test.vercel.app/webinars">Explore Webinar</a>
        </button>
      </div>
      <footer>
        <p>&copy; 2024 SurelyWork. All rights reserved.</p>
        <p>Contact us: info@surelywork.com</p>
      </footer>
    </div>
  </div>
</body>
</html>
`;

  // switch (options.type) {
  //   case "webinar":
  //     template = "<h1>This is for webinar</h1>";
  //     break;
  //   case "jobalerts":
  //     template = "<h1>This is for job alerts</h1>";
  //     break;
  //   default:
  //     break;
  // }

  try {
    const transporter = nodeMailer.createTransport({
      service: process.env.SMTP_SERVICE,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    const mailOptions = {
      from: `Surelywork <${"webinar@surelywork.com"}>`,
      to: options.mail,
      subject: options.subject,
      html: template,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(`Unable to send message : ${error.message}`);
    return;
  }
};
module.exports = sendEmail;
