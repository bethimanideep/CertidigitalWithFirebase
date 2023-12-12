const fs = require("fs");
const { Readable } = require('stream');
const Router = require("express");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const PDFDocument = require("pdfkit");
const certificateImage = Router();
const templateData = require("../models/templateModel");
const certificateData = require("../models/certificateModel");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const batchCertificateData = require("../models/batchCertificateModel");
const { logger } = require("handlebars");
const firebaseStorage = require('./firebase'); // Assuming you save your firebase configuration in a separate file
const jwt = require("jsonwebtoken")

const firebaseStoragePath = 'CanvasCertificates'; // Firebase storage path
const loadImageFromFirebase = async (filePath) => {
  try {
    const file = firebaseStorage.file(filePath);
    const stream = file.createReadStream();
    console.log("inside function")
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(loadImage(buffer));
        })
        .on('error', (error) => {
          console.error('Error reading image stream from Firebase:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('Error loading image from Firebase:', error);
    throw error; // Rethrow the error to be caught in the calling function
  }
};



certificateImage.post("/generate-image", async (req, res) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    const { role } = jwt.verify(token, process.env.JWT_KEY);
    if (role !== "Admin") {
      return res.status(403).send({ message: "Access denied" });
    }

    const { template, fields, canvasHeight, canvasWidth } = req.body;
    if (!template || fields.length <= 0) {
      return res.status(401).send({ message: "Please fill valid input" });
    }

    // Fetch template details from MongoDB
    const imagePath = await templateData.findById(template);
    if (!imagePath) {
      return res.status(404).send({ message: "Template not found" });
    }

    // Load image from Firebase Storage
    const image = await loadImageFromFirebase(imagePath.path);
    console.log(image+"in sdklafjldkfja");

    // Create canvas and draw fields
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    let draw_fields = function () {
      for (let field of fields) {
        ctx.fillStyle = field.fontColor;
        ctx.font = `${field.fontWeight} ${field.fontSize}px ${field.fontFamily}`;
        let textWidth = ctx.measureText(field.text).width;
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
          ctx.fillText(field.text, centerX, centerY - 1);
        } else if (field.alignment === "left") {
          ctx.textAlign = "left";
          ctx.fillText(field.text, field.x, centerY - 1);
        } else if (field.alignment === "right") {
          ctx.textAlign = "right";
          let textX = field.x + field.width;
          let textY = field.y + field.height / 2;
          ctx.fillText(field.text, textX, textY - 1);
          ctx.fillStyle = "transparent";
          ctx.fillRect(field.x, field.y, field.width, field.height);
        }
      }
    };
    draw_fields();

    // Convert canvas to buffer
    const imageData = canvas.toBuffer(imagePath.contentType);

    // Generate a unique filename
    const timeStamp = Math.floor(Math.random() * 10000);
    const certificataName = imagePath.name;
    const type = imagePath.contentType.split("/")[1];
    const fileName = `${timeStamp}${certificataName}.${type}`;
    const filePath = `${firebaseStoragePath}/${fileName}`;

    // Upload to Firebase Storage
    const file = firebaseStorage.file(filePath);
    const stream = file.createWriteStream();
    stream.end(imageData);

    // Save certificate data to MongoDB
    const saveCertificateData = await certificateData.create({
      template,
      fields,
      canvasHeight,
      canvasWidth,
      path: filePath,
      contentType: imagePath.contentType,
    });

    // Send response to client
    const responseObj = {
      imagePath: filePath,
      id: saveCertificateData._id.toString(),
    };
    res.write(JSON.stringify(responseObj));
    res.end();
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error generating image");
  }
});

certificateImage.get('/certificateimage/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const certificate = await certificateData.findOne({ template: id });

    if (!certificate) {
      return res.status(404).send({ message: "Image not found" });
    }

    const file = firebaseStorage.file(certificate.path);  
    const stream = file.createReadStream();

    // Convert the stream to a buffer
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);

      res.writeHead(200, {
        "Content-Type": certificate.contentType,
        "Content-Disposition": `inline; filename="${certificate.name}"`,
      });

      // Create a readable stream from the buffer and pipe it to the response
      const bufferStream = new Readable();
      bufferStream.push(buffer);
      bufferStream.push(null);
      bufferStream.pipe(res);
    });
    stream.on('error', (error) => {
      console.error('Error reading image stream from Firebase:', error);
      res.status(500).send("Error reading image from Firebase Storage");
    });

  } catch (error) {
    console.error('Error fetching certificate image from database:', error);
    res.status(500).send({ message: "Error fetching certificate image from database", error });
  }
});

certificateImage.get("/certificatedetails/:id", async (req, res) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {

      return res.status(401).send({ message: "Unauthorized" });
    }
    const { role } = jwt.verify(token, process.env.JWT_KEY);
    if (role !== "Admin") {

      return res.status(403).send({ message: "Access denied" });
    }
    const { id } = req.params;
    const batchCertificates = await batchCertificateData
      .find({ template: id })
      .populate("template");

    res.status(201).send(batchCertificates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong." });
  }
});
certificateImage.post("/samplecsv/:id", async (req, res) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    const { role } = jwt.verify(token, process.env.JWT_KEY);
    if (role !== "Admin") {
      return res.status(403).send({ message: "Access denied" });
    }

    // Set the correct filename
    const filename = "sample.csv";

    // Get a read stream for the file
    const file = firebaseStorage.file(filename);
    const stream = file.createReadStream();

    // Set the appropriate headers for the response
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    // Pipe the stream to the response
    stream.pipe(res);
  } catch (error) {
    return res.status(404).send({ message: "Error while downloading CSV file", error });
  }
});


certificateImage.post("/alldetails/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const certificateDetails = await certificateData
      .find({ template: id })
      .populate("template");
    if (certificateDetails.length <= 0) {
      return res.status(401).send({ message: "Data not available" });
    }
    return res
      .status(201)
      .send({ message: "data as per template id", certificateDetails });
  } catch (error) {
    logger.error("error occured", { error });
    return res.status(500).send("Error adding data to the certificate", error);
  }
});

module.exports = certificateImage;