const path = require("path");
const fs = require("fs");

//Function to remove a file
const clearImage = (filePath) => {
  //Assigning the path of image
  filePath = path.join(__dirname, "..", filePath);
  //Deleting the image
  fs.unlink(filePath, (err) => console.log(err));
};

exports.clearImage = clearImage
