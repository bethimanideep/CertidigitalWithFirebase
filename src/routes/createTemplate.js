const fs = require("fs");
const Router = require('express');
const multer = require('multer');
const path = require('path');
const createTemplate = Router();
const logger = require('./logger');
const imageData = require('../models/templateModel');
const jwt = require('jsonwebtoken');
const sizeOf = require('image-size');

const firebaseStorage = require('./firebase'); // Assuming you save your firebase configuration in a separate file

// multer //
const storage = multer.memoryStorage(); // Store the file in memory
const upload = multer({ storage: storage });

// upload template //
createTemplate.post('/uploadtemplate', upload.single('image'), async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).send({ message: 'Unauthorized' });
    }

    const { role } = jwt.verify(token, process.env.JWT_KEY);
    if (role !== 'Admin') {
      return res.status(403).send({ message: 'Access denied' });
    }

    const { name } = req.body;

    // Get dimensions of the image
    const dimensions = sizeOf(req.file.buffer);

    // Create a unique filename for the image
    const fileName = `${Date.now()}_${name}_${req.file.originalname}`;

    // Upload the image to Firebase Storage
    const file = firebaseStorage.file(fileName);
    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    stream.end(req.file.buffer);

    // Save information about the uploaded image to your database
    const image = new imageData({
      name: name,
      path: fileName, // You may want to store the full path, or just the filename depending on your needs
      contentType: req.file.mimetype,
      height: dimensions.height,
      width: dimensions.width,
    });

    await image.save();

    logger.info('File saved successfully to Firebase Storage and database.');

    return res.status(200).send({
      message: 'File uploaded and saved to Firebase Storage and database successfully!',
      aspectRatio: dimensions.width / dimensions.height,
      height: dimensions.height,
      width: dimensions.width,
    });
  } catch (error) {
    logger.error('Error occurred', { error });
    return res.status(500).send('Error saving image to Firebase Storage and database.');
  }
});


createTemplate.get('/alltemplates', async (req, res) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {

      return res.status(401).send({ message: "Unauthorized" });
    }
    const { role } = jwt.verify(token, process.env.JWT_KEY);
    if (role !== "Admin") {

      return res.status(403).send({ message: "Access denied" });
    }
    const images = await imageData.find({});
    if (!images || images.length <= 0) {
      return res.status(404).send({ message: "Images not found" });
    }

    const array = images.map(async (image) => {
      const [signedUrl] = await firebaseStorage.file(image.path).getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // Link expires in 15 minutes
      });

      return {
        id: image._id,
        name: image.name,
        path: signedUrl,
        contentType: image.contentType,
        height: image.height,
        width: image.width,
      };
    });
    const imageDataArray = await Promise.all(array);
    console.log(imageDataArray);
    res.send(imageDataArray);
  } catch (error) {
    logger.error('Error occurred', { error });
    return res.status(500).send({ message: 'Error fetching images from database', error });
  }
});



createTemplate.get('/singletemplate/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const image = await imageData.findById(id).lean().exec();

    if (!image || image.length <= 0) {
      return res.status(404).send({ message: 'Image not found' });
    }

    // Get a signed URL for the file
    const [signedUrl] = await firebaseStorage.file(image.path).getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // Link expires in 15 minutes
    });

    // Redirect the client to the signed URL
    return res.redirect(signedUrl);
  } catch (error) {
    logger.error('Error occurred', { error });
    return res.status(500).send({ message: 'Error fetching images from database', error });
  }
});

// Update a template
createTemplate.patch('/updatetemplate/:id', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).send({ message: 'Unauthorized' });
    }
    const { role } = jwt.verify(token, process.env.JWT_KEY);
    if (role !== 'Admin') {
      return res.status(403).send({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { name } = req.body;

    const existingImage = await imageData.findOne({ name });
    if (existingImage) {
      return res.status(400).send({ message: 'Image name already exists' });
    }

    const image = await imageData.findById(id);

    if (!image) {
      return res.status(404).send({ message: 'Image not found' });
    }

    // Update the image object with the new file name and path
    image.name = name;
    await image.save();

    logger.info('Image updated successfully');
    return res.send({ message: 'Image updated successfully' });
  } catch (error) {
    logger.error('Error occurred', { error });
    return res.status(500).send({ message: 'Error updating image', error });
  }
});


// Delete a template
createTemplate.delete('/deletetemplate/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const image = await imageData.findById(id);

    if (!image) {
      return res.status(404).send({ message: 'Image not found' });
    }

    // Delete the file from Firebase Storage
    await firebaseStorage.file(image.path).delete();

    // Delete the image from the database
    await imageData.findByIdAndDelete(id);

    logger.info('Image deleted successfully');
    return res.send({ message: 'Image deleted successfully' });
  } catch (error) {
    logger.error('Error occurred', { error });
    return res.status(500).send({ message: 'Error deleting image', error });
  }
});
module.exports = createTemplate;
