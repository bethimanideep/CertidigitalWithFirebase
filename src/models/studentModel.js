const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  batch: { type: String, required: true },
  email: { type: String, required: true },
  path: { type: String, required: true },
  contentType: { type: String, required: true },
});

module.exports = mongoose.model("studentCertificates", studentSchema);
