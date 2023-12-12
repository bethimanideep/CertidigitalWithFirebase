const mongoose = require("mongoose");

const templateSchema = mongoose.Schema({
  name: String,
  path: String,
  contentType: String,
  height: Number,
  width: Number,
  timeStamp: { type: Date, default: Date.now },
});

const templateModel = mongoose.model("template", templateSchema);

module.exports = templateModel;
