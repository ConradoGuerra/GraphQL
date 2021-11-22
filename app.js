const express = require("express");
//Importing mongoose to create a model
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const { graphqlHTTP } = require("express-graphql");
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");

const app = express();

//Creating a file storage
const fileStorage = multer.diskStorage({
  //Setting the destination of the file
  destination: (req, file, cb) => {
    //(if error, folder)
    cb(null, "images");
  },
  //Setting the filename of the file
  filename: (req, file, cb) => {
    //(if error, name)
    cb(null, Date.now() + "-" + file.originalname);
  },
});

//Creating a filter of files
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image//png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(express.urlencoded()) // x-www-form-urlencoded <form>
app.use(express.json()); //application/json
//Registering the multer with the storage and filefilter setted
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
//Creating a static folder to serve all the requests from images
app.use("/images", express.static(path.join(__dirname, "images")));

//Setting especial headers to avoid CORS error
app.use((req, res, next) => {
  //Adding a specified header to response, allow any browser to access the header of the server
  res.setHeader("Access-Control-Allow-Origin", "*");
  //Allow the origins to use the specific http methods
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  //Set a response
  if(req.method === 'OPTIONS'){
    return res.sendStatus(200)
  }
  next();
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    //Enable the IDE
    graphiql: true,
    //Formatting the error
    customFormatErrorFn(err){
      //If it's not an original error, if it is a technical error
      if(!err.originalError){
        return err
      }
      //Retrieving from resolver the characteristic of error
      const data = err.originalError.data
      const message = err.originalError.message || 'An error occurred!'
      const code = err.originalError.code || 500
      return {message: message, status: code, data: data}
    }

  })
);

//Error middleware this always has to stay at last middleware
app.use((error, req, res, next) => {
  //If status code is undefined, then the status will be 500
  const status = error.statusCode || 500;
  //Extracting the error message
  const message = error.message;
  const data = error.data;
  //Responding to front the status and message
  res.status(status).json({ message: message, data: data });
});

//Connecting to mongoose and creating a messages db
mongoose
  .connect("mongodb+srv://conrado:262800@cluster0.gpslw.mongodb.net/messages")
  .then((result) => {
    app.listen(8080);
  })
  .catch((err) => console.log(err));
