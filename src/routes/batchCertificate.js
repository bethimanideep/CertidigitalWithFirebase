const firebaseStorage = require("./firebase"); // Assuming you save your firebase configuration in a separate file
const fastCsv = require('fast-csv');
const dotenv = require("dotenv");
dotenv.config();
const Router = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const batchCertiRoute = Router();
const nodemailer = require("nodemailer");
const upload = multer({ storage: multer.memoryStorage() });
const jwt = require("jsonwebtoken");
const BatchCertificate = require("../models/batchCertificateModel");
const certificateModelData = require("../models/certificateModel");
const studentCertificates = require("../models/studentModel");

const createCsvWriter = require("csv-writer").createObjectCsvWriter;

batchCertiRoute.get("/image", async (req, res) => {
  const { path } = req.query;

  try {
    const file = firebaseStorage.file(path);
    const stream = file.createReadStream();

    let data = Buffer.from([]);
    stream
      .on("data", (chunk) => {
        data = Buffer.concat([data, chunk]);
      })
      .on("end", () => {
        res.end(data);
      })
      .on("error", (error) => {
        console.error("Error reading image from Firebase Storage:", error);
        res.status(500).send("Error reading image from Firebase Storage");
      });
  } catch (error) {
    console.error("Error fetching image from Firebase Storage:", error);
    res.status(500).send("Error fetching image from Firebase Storage");
  }
});

batchCertiRoute.post("/batch/:id", async (req, res) => {
  //uniq/
  let id = req.params.id;
  try {
    let document = await BatchCertificate.findById(id);
    if (!document) {
      res.json("not found");
      return;
    }
    res.status(200).json(document);
  } catch (error) {
    res.status(200).json("not found");
  }
});

batchCertiRoute.post(
  "/certificate/batch/:id",
  upload.single("csv"),
  async (req, res) => {
    try {
      // ... (authentication checks)

      const token = req.headers["authorization"]?.split(" ")[1];
      if (!token) {
        return res.status(401).send({ message: "Unauthorized" });
      }
      const { role } = jwt.verify(token, process.env.JWT_KEY);
      if (role !== "Admin") {
        return res.status(403).send({ message: "Access denied" });
      }

      const { id } = req.params;
      const { batch } = req.body;
      const csvData = [];

      req.file.buffer
        .toString() // Convert the buffer to a string assuming it's UTF-8 encoded
        .split("\n") // Split the string into lines
        .map((line) => line.split(",")) // Split each line into an array of values
        .forEach((data) => {
          if (data[0] !== "") {
            csvData.push({
              Name: data[3],
              Email: data[0],
              Email_subject: data[1],
              Email_body: data[2],
            });
          }
        });

      const batchCertificates = {
        template: id,
        batch: batch,
        emailBody: csvData[0].Email_body,
        emailSubject: csvData[0].Email_subject,
        fields: [],
        failedemails: [],
        successemails: [],
      };
      csvData.shift();
      console.log(JSON.stringify(csvData) + "mydata");
      for (const row of csvData) {
        const fieldObject = {
          Name: row.Name,
          Email: row.Email,
          Email_subject: row.Email_subject,
          Email_body: row.Email_body,
        };
        console.log(fieldObject + "data from csv");
        batchCertificates.fields.push(fieldObject);
      }

      const certificate = new BatchCertificate(batchCertificates);
      await certificate.save();
      res.json(certificate);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message, status: "false" });
    }
  }
);

batchCertiRoute.get("/batchdetails/:unique", async (req, res) => {
  let { unique } = req.params;
  console.log(unique);
  let doc = await BatchCertificate.findOne({ unique });
  console.log(doc);
  return res.status(200).json(doc);
});

const loadImageFromFirebase = async (filePath) => {
  try {
    const file = firebaseStorage.file(filePath);
    const stream = file.createReadStream();
    console.log("inside function");
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream
        .on("data", (chunk) => chunks.push(chunk))
        .on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve(loadImage(buffer));
        })
        .on("error", (error) => {
          console.error("Error reading image stream from Firebase:", error);
          reject(error);
        });
    });
  } catch (error) {
    console.error("Error loading image from Firebase:", error);
    throw error; // Rethrow the error to be caught in the calling function
  }
};

batchCertiRoute.post("/startsendingemails/:id", async (req, res) => {
  try {
    let { id } = req.params;
    let emailDataArray = await BatchCertificate.findById({ _id: id });
    if (!emailDataArray) return res.json("no data to send email");
    console.log(emailDataArray + "data to start emailing");
    const emailPromises = emailDataArray.fields.map(
      async (data) =>
        await sendMailToUser(
          data,
          emailDataArray.template,
          emailDataArray.batch,
          emailDataArray._id
        )
    );

    // Wait for all emails to be sent concurrently
    const results = await Promise.all(emailPromises);
    console.log("All emails sent successfully", emailPromises);

    res
      .status(200)
      .json({ success: true, message: "All emails sent successfully" });
  } catch (error) {
    console.error("Error sending emails:", error.message);
    res.status(500).json({
      success: false,
      message: "Error sending emails",
      error: error.message,
    });
  }
});

async function sendMailToUser(obj, id, batch, batch_id) {
  console.log(obj, id, batch);
  try {
    ``;
    //get all data certificate and template
    const getData = await certificateModelData
      .findOne({ template: id })
      .populate("template");

    console.log(getData);
    //checking
    if (!getData || getData.length <= 0) {
      ``;
      throw new Error("Certificate template not found");
    }
    if (!getData.template.path) {
      return res.status(404).send({ message: "Template not found" });
    }

    const templatepath = getData.template.path;
    let fields = getData.fields;
    ``;
    const image = await loadImageFromFirebase(templatepath);
    console.log(image + "image form firebase");

    const canvas = createCanvas(getData.canvasWidth, getData.canvasHeight);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let value;

    for (let field of fields) {
      value=obj.Name
      ctx.fillStyle = field.fontColor;
      ctx.font = `${field.fontWeight} ${field.fontSize}px ${field.fontFamily}`;
      let textWidth = ctx.measureText(value).width;
      let textHeight = field.fontSize;
      field.height = textHeight;
      if (textWidth > field.width) {
        field.width = textWidth + 60;
      }
      let centerX = field.x + field.width / 2;
      let centerY = field.y + field.height / 2;
      ctx.textBaseline = "middle";
      if (field.alignment === "center") {
        ctx.textAlign = "center";
        ctx.fillText(value, centerX, centerY - 1);
      } else if (field.alignment === "left") {
        ctx.textAlign = "left";
        ctx.fillText(value, field.x, centerY - 1);
      } else if (field.alignment === "right") {
        ctx.textAlign = "right";
        let textX = field.x + field.width;
        let textY = field.y + field.height / 2;
        ctx.fillText(value, textX, textY - 1);
        ctx.fillStyle = "transparent";
        ctx.fillRect(field.x, field.y, field.width, field.height);
      }
    }

    // Convert canvas to buffer
    const imageData = canvas.toBuffer(getData.template.contentType);

    //renaming
    const timeStamp = Math.floor(Math.random() * 10000);
    const certificataName = getData.template.name;
    const type = getData.template.contentType.split("/")[1];
    const fileName = `${timeStamp}${certificataName}.${type}`;
    const filePath = `StudentCertificates/${fileName}`;

    //pushing path to batchcertificate
    let previousdata = await BatchCertificate.findOne({ _id: batch_id });
    let arr = previousdata.Imagepath;
    arr.push({ Email: obj.Email, Path: filePath });
    await BatchCertificate.findOneAndUpdate(
      { _id: batch_id },
      { Imagepath: arr }
    );

    // Upload to Firebase Storage
    const file = firebaseStorage.file(filePath);
    const stream = file.createWriteStream();
    stream.end(imageData);
    console.log("Image uploaded successfully");

    //saving to studentscertificates
    const batchData = await studentCertificates({
      name: obj.Name,
      batch: batch,
      email: obj.Email,
      path: filePath,
      contentType: getData.template.contentType,
    });
    await batchData.save();

    //sending email
    console.log(obj + "emaildata");
    return new Promise((resolve, reject) => {
      const attachment = {
        filename: `${obj.Name}.jpg`,
        content: imageData,
      };

      let mailOptions = {
        from: process.env.USER_EMAIL,
        to: obj.Email,
        subject: obj.Email_subject,
        text: obj.Email_body,
        attachments: [attachment],
      };

      let mailConfig = {
        service: "gmail",
        auth: {
          user: process.env.USER_EMAIL,
          pass: process.env.USER_PASS,
        },
      };

      nodemailer
        .createTransport(mailConfig)
        .sendMail(mailOptions, async (err, info) => {
          try {
            console.log(info);
            if (info) {
              let doc = await BatchCertificate.findById({ _id: batch_id });
              doc.successemails.push(obj);
              await BatchCertificate.findOneAndUpdate(
                { _id: batch_id },
                { successemails: doc.successemails }
              );
              resolve(info);
            } else {
              if (err) {
                let doc = await BatchCertificate.findById({ _id: batch_id });
                doc.failedemails.push(obj);
                await BatchCertificate.findOneAndUpdate(
                  { _id: batch_id },
                  { failedemails: doc.failedemails }
                );
              }
              reject(err);
            }
          } catch (error) {
            console.log(error);
            reject(error);
          }
        });
    });
  } catch (error) {
    console.error(error);
  }
}



batchCertiRoute.get("/allemails/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await BatchCertificate.findOne({ _id: id });
    console.log(doc);

    if (!doc) {
      return res.json("not found");
    }

    const data = doc.fields;

    // Set the correct filename
    const filename = "output.csv";

    // Set the appropriate headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Create a CSV stream
    const csvStream = fastCsv.format({ headers: true });

    // Pipe the CSV stream to the response
    csvStream.pipe(res);

    // Write records to CSV stream
    data.forEach(row => {
      const csvRow = {
        Email: row.Email || '',
        Email_subject: row.Email_subject || '',
        Email_body: row.Email_body || '',
        Name: row.Name || '',
      };
      csvStream.write(csvRow);
    });

    // End the CSV stream when done
    csvStream.end();

  } catch (error) {
    console.error("Error creating CSV file:", error);
    res.status(500).send("Error creating CSV file");
  }
});


batchCertiRoute.get("/successemails/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await BatchCertificate.findOne({ _id: id });
    
    if (!doc) {
      return res.json("not found");
    }

    const data = doc.successemails;

    // Set the correct filename
    const filename = "temporaryCSV/output.csv";

    // Set the appropriate headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Create a CSV stream and pipe it to the response
    const csvStream = fastCsv.format({ headers: true });

    // Pipe the CSV stream to the response
    csvStream.pipe(res);

    // Write records to CSV stream
    data.forEach(row => {
      const csvRow = {
        Email: row.Email || '',
        Email_subject: row.Email_subject || '',
        Email_body: row.Email_body || '',
        Name: row.Name || '',
      };
      csvStream.write(csvRow);
    });

    // End the CSV stream when done
    csvStream.end();

  } catch (error) {
    console.error("Error creating CSV file:", error);
    res.status(500).send("Error creating CSV file");
  }
});

batchCertiRoute.get("/failedemails/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await BatchCertificate.findOne({ _id: id });

    if (!doc) {
      return res.json("not found");
    }

    const data = doc.failedemails;

    // Set the correct filename
    const filename = "temporaryCSV/output.csv";

    // Set the appropriate headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Create a CSV stream and pipe it to the response
    const csvStream = fastCsv.format({ headers: true });

    // Pipe the CSV stream to the response
    csvStream.pipe(res);

    // Write records to CSV stream
    data.forEach(row => {
      const csvRow = {
        Email: row.Email || '',
        Email_subject: row.Email_subject || '',
        Email_body: row.Email_body || '',
        Name: row.Name || '',
      };
      csvStream.write(csvRow);
    });

    // End the CSV stream when done
    csvStream.end();

  } catch (error) {
    console.error("Error creating CSV file:", error);
    res.status(500).send("Error creating CSV file");
  }
});

module.exports = batchCertiRoute;
