const jwt = require("jsonwebtoken");
const Router = require("express");
const studentRoute = Router();
const logger = require("./logger");
const studentCertificates = require("../models/studentModel");
const fs = require("fs");
const path = require("path");

studentRoute.get("/certificate", async (req, res) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    const decodeToken = jwt.verify(token, process.env.JWT_KEY)
    const certificates = await studentCertificates.find({ email: decodeToken.email })

    // check if any certificate is found for the given email
    if (certificates.length === 0) {
      return res.status(404).json({ message: "No certificates found" });
    }

    const array = certificates.map((image) => {
      return new Promise((resolve, reject) => {
        const filePath = image.path
        fs.readFile(filePath, (err, data) => {
          if (err) {
            console.error(err);
            logger.error("error occured", { err })
            return reject(`Error reading image from disk: ${image.name}`);
          }
          resolve({
            id: image._id,
            batch: image.batch,
            name: image.name,
            path: filePath,
            contentType: image.contentType,
          })
        })
      })
    })
    const certificatesArray = await Promise.all(array);
    res.status(200).send(certificatesArray)
  } catch (err) {
    logger.error("error occured", { err })
    res.status(500).json({ error: err.message });
  }
});

studentRoute.get("/certificateimages/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const image = await studentCertificates.findById(id)
    // console.log(image)
    if (!image) {
      return res.status(404).send({ message: "Image not found" });
    }

    fs.readFile(image.path, (err, data) => {
      if (err) {
        console.error(err);
        logger.error("error occured", { err })
        return res.status(500).send("Error reading image from disk");
      }

      res.writeHead(200, {
        "Content-Type": image.contentType,
        "Content-Disposition": `inline; filename="${image.name}"`,
      });
      res.end(data);
    });

  } catch (err) {
    logger.error("error occured", { err });
    return res.status(500).send(err);
  }
})

module.exports = studentRoute;
