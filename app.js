const express = require("express");
const feedRoutes = require("./routes/feed");
const authRoutes = require("./routes/auth");
//Importing mongoose to create a model
const mongoose = require("mongoose");
const multer = require('multer')
const path = require('path')

const app = express();

//Creating a file storage
const fileStorage = multer.diskStorage({
  //Setting the destination of the file
  destination: (req, file, cb) => {
    //(if error, folder)
   cb(null, 'images')
  },
  //Setting the filename of the file
  filename: (req, file, cb) => {
    //(if error, name)
    cb(null, Date.now() + '-' +file.originalname)
  }
})

//Creating a filter of files
const fileFilter = (req, file, cb) => {
  if(file.mimetype === 'image//png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
    cb(null, true)
  }else{
    cb(null, false)
  }
}

// app.use(express.urlencoded()) // x-www-form-urlencoded <form>
app.use(express.json()); //application/json
//Registering the multer with the storage and filefilter setted 
app.use(multer({storage:fileStorage, fileFilter: fileFilter}).single('image'))
//Creating a static folder to serve all the requests from images
app.use('/images', express.static(path.join(__dirname, 'images')))

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
  next();
});

//Using and fowarding any incoming request of auth
app.use("/auth", authRoutes);
//Using and fowarding any incoming request of feed
app.use("/feed", feedRoutes);

//Error middleware this always has to stay at last middleware
app.use((error, req, res, next) => {
  //If status code is undefined, then the status will be 500
  const status = error.statusCode || 500
  //Extracting the error message
  const message = error.message
  const data = error.data
  //Responding to front the status and message
  res.status(status).json({message:message, data: data})
})

//Connecting to mongoose and creating a messages db
mongoose.connect(
  "mongodb+srv://conrado:262800@cluster0.gpslw.mongodb.net/messages"
).then(result => {
    const server = app.listen(8080);
    //Setting the socket connection using the http protocol
    const io = require('./socket').init(server)
    //Creating and event listener to each connection done
    io.on('connection', socket => {
      console.log('Client connected')
    })
}).catch(err => console.log(err));

