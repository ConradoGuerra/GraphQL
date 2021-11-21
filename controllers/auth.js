//Importing the result of validation route
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res, next) => {
  //Extrating errors, if exists
  const errors = validationResult(req);
  //If errors
  if (!errors.isEmpty()) {
    const error = new Error("Validation error.");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const password = req.body.password;
  const name = req.body.name;
  //Encripting the password
  try {
    const hashedPw = await bcrypt.hash(password, 12);
    //Creating a new user in mongodb
    const user = new User({
      email: email,
      password: hashedPw,
      name: name,
    });
    const result = await user.save();
    //Setting the status for new resource and send json msg with the userid
    res.status(201).json({ userId: result._Id, message: "User created!" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  //Retrieving the data
  const email = req.body.email;
  const password = req.body.password;
  const name = req.body.name;
  let loadedUser;
  try {
    //Searching for the user in mongodb
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("No user found!");
      error.statusCode = 401;
      throw error;
    }
    loadedUser = user;
    //Comparing the passwords, this return a promise
    const isEqual = await bcrypt.compare(password, user.password);
    //then, if not equal
    if (!isEqual) {
      const error = new Error("Wrong password!");
      error.status = 401;
      throw error;
    }
    //Creating a new signature for token
    const token = jwt.sign(
      {
        email: loadedUser.email,
        userId: loadedUser._id.toString(),
      },
      //Passing a private key to use for signing the token
      "ultrasecretconcontoken",
      { expiresIn: "1h" }
    );
    //Returning the response to client
    res.status(200).json({ token: token, userId: loadedUser._id.toString() });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
