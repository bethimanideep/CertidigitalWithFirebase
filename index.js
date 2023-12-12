// For building on vercel: https://github.com/Automattic/node-canvas/issues/1779
if (
  process.env.LD_LIBRARY_PATH == null ||
  !process.env.LD_LIBRARY_PATH.includes(
    `${process.env.PWD}/node_modules/canvas/build/Release:`,
  )
) {
  process.env.LD_LIBRARY_PATH = `${
    process.env.PWD
  }/node_modules/canvas/build/Release:${process.env.LD_LIBRARY_PATH || ''}`;
}

const express = require("express") ;
const app = express() ;
const connection = require("./src/database/db");
const authRoute = require("./src/routes/user");
const batchCertiRoute= require("./src/routes/batchCertificate")
const cors = require("cors") ;
const dotenv = require("dotenv");

const { swaggerUi, swaggerSpec } = require("./swagger");
const studentRoute = require("./src/routes/student")
const createTemplate = require("./src/routes/createTemplate");
const certificateImage = require("./src/routes/certificateImage");
dotenv.config({ path: "./src/config/.env" });
require('./src/routes/firebase');
app.use(express.urlencoded({ extended: true }));
app.use(express.json())
app.use(express.static("uploads"))
app.use(cors());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/auth", authRoute);
app.use("/template", createTemplate);
app.use("/certificate", certificateImage);
app.use('/batchcertificate',batchCertiRoute)
app.use("/student", studentRoute);

 
app.get("/", (req, res) => {
  res.send({ message: "Welcome to our website" })
}) 
 
app.listen(process.env.PORT, async () => {
   await connection;
   console.log(`server start at ${process.env.PORT}`);
});
     
module.exports = app;
