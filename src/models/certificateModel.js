const mongoose = require("mongoose") ;

const certificateSchema = mongoose.Schema({
    
    "template": { type: mongoose.Schema.Types.ObjectId, ref: "template", required: true },
    "canvasHeight": {type: Number},
    "canvasWidth" : {type: Number},
    "path": String,
    "contentType": String,
    "fields": [
      {
        "text": { type: String, required: true },
        "fontFamily": { type: String },
        "fontColor": { type: String },
        "name": { type: String },
        "fontSize": { type: Number },
        "fontWeight" : {type: Number},
        "x": { type: Number },
        "y": { type: Number },
        "width": { type: Number },
        "height": { type: Number },
        "alignment": { type: String },
        "lineGap": { type: Number },
        "lineBreak": { type: Boolean },
        "align": { type: String },
        "lineHeight": { type: Number },
        "transform": { type: String } ,
        
      }
    ]
  })

  const certificateModel = mongoose.model("certificate",certificateSchema ) ;


  module.exports = certificateModel ;