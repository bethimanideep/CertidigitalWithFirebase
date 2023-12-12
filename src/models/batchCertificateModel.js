const mongoose = require("mongoose");

const batchCertificateSchema = new mongoose.Schema({
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "template",
    required: true,
  },
  batch: { type: String },
  emailBody: { type: String, required: true },
  emailSubject: { type: String, required: true },

  fields: [
    {
      Name: { type: String },
      Email: { type: String },
      Email_subject: { type: String },
      Email_body: { type: String },
    },
  ],
  failedemails: { type: Array },
  successemails: { type: Array },
  Imagepath: {
    type: [{ type: Object }],
    default: []
  }
});

module.exports = mongoose.model("batchCertificate", batchCertificateSchema);


