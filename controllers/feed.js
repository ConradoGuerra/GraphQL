//Importing the result of validation route
const { validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const io = require('../socket')

//Importing the post model
const Post = require("../models/post");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page;
  const perPage = 2;
  //Working with await, await is a way to substitute the then block, it does the same task of then in a way more simple
  //In this case, we use the await to count the documents of Post, the total items variable will receive the result
  try {
    const totalItems = await Post.find().countDocuments();
    //Here posts will receive the posts respecting the orientation below
    const posts = await Post.find()
      .populate('creator')
      .sort({createdAt: -1})
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    //Sending a response to client as JSON format
    res.status(200).json({
      message: "Posts fetched successfully!",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  //Assining the validationResult to a variable
  const errors = validationResult(req);
  //If an error exists
  if (!errors.isEmpty()) {
    //Error handling, creating the message and statusCode
    const error = new Error("Validation failed, data inserted was incorrect.");
    error.statusCode = 422;
    //Throwing the error to the first middleware to catch it
    throw error;
  }
  //If the file doesnt exist
  if (!req.file) {
    const error = new Error("File doesnt exists.");
    error.statusCode = 422;
    throw error;
  }
  //Extracting the file path with multer
  const imageUrl = req.file.path.replace("\\", "/");
  const title = req.body.title;
  const content = req.body.content;

  //Creating a mongodb document
  const post = new Post({
    title: title,
    content: content,
    creator: req.userId,
    imageUrl: imageUrl,
  });
  try {
    // Create post in DB
    await post.save();
    //With the post created, i will find the user and add the post to that user
    const user = await User.findById(req.userId);
    user.posts.push(post);
    await user.save();
    //Getting the IO estabilish object (connection)
    //Emit function send a message to all users (event name, the data I wanna send)
    io.getIO().emit('posts', {action : 'create', post: post, creator: {_id: req.userId, name: user.name}})
    res.status(201).json({
      message: "Post created successfully",
      post: post,
      creator: {
        _id: user._id,
        name: user.name,
      },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//Getting the detailed post
exports.getPost = async (req, res, next) => {
  //Requesting the parameter from body
  const postId = req.params.postId;
  //Searching for the post in mongodb
  try {
    const post = await Post.findById(postId);
    //If the post was not found
    if (!post) {
      const error = new Error("Post not found!");
      error.statusCode = 404;
      //When we throw an error inside of a then block, then the error will be catched in the next catch error block
      throw error;
    }
    post.imageUrl = "http://localhost:8080/" + post.imageUrl;
    res.status(200).json({ message: "Detailed post fetched", post: post });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  //Assining the validationResult to a variable
  const errors = validationResult(req);
  //If an error exists
  if (!errors.isEmpty()) {
    //Error handling, creating the message and statusCode
    const error = new Error("Validation failed, data inserted was incorrect.");
    error.statusCode = 422;
    //Throwing the error to the first middleware to catch it
    throw error;
  }
  //Assingning variables received from user
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  //If the user selected a file, then the imageUrl will be overwrited by the file
  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }
  if (!imageUrl) {
    const error = new Error("No file selected.");
    error.statusCode = 422;
    throw error;
  }
  try {
    //Searching for the post
    const post = await Post.findById(postId).populate('creator');
    //If the post was not found
    if (!post) {
      const error = new Error("Post not found!");
      error.statusCode = 404;
      //When we throw an error inside of a then block, then the error will be catched in the next catch error block
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("Not authorized!");
      error.statusCode = 403;
      throw error;
    }
    //If the url inputed from user is different from the one is saved in db, then the saved one will be deleted
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    post.title = title;
    post.content = content;
    post.imageUrl = imageUrl;
    const result = await post.save();
    //Emit function send a message to all users (event name, the data I wanna send)
    io.getIO().emit('posts', {action: 'update', post: result})
    res.status(200).json({ message: "Post updated", post: result });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    //If the post was not found
    if (!post) {
      const error = new Error("Post not found!");
      error.statusCode = 404;
      //When we throw an error inside of a then block, then the error will be catched in the next catch error block
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error("Not authorized!");
      error.statusCode = 403;
      throw error;
    }
    //Deleting the file from server
    clearImage(post.imageUrl);
    //Returning the method to delete the post from mongodb
    await Post.findByIdAndRemove(postId);
    const user = await User.findById(req.userId);
    //Deleting the postId in the user document
    user.posts.pull(postId);
    const result = await user.save();
    //Emit function send a message to all users (event name, the data I wanna send)
    io.getIO().emit('posts', {action: 'delete', post: postId})
    //Sending the result to front
    res.status(200).json({ message: "Deleted post." });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getUserStatus = async (req, res, next) => {
  try {
    //Searching for the user to get its status
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found!");
      error.statusCode = 404;
      throw error;
    }
    const status = user.status;
    if (!status) {
      const error = new Error("Status not found!");
      error.statusCode = 404;
      //When we throw an error inside of a then block, then the error will be catched in the next catch error block
      throw error;
    }
    res.status(200).json({ message: "Status fetched", status: status });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateUsertatus = async (req, res, next) => {
  const userId = req.userId;
  const newStatus = req.body.status;
  try {
    //Searching for the user
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("User not found!");
      error.statusCode = 404;
      throw error;
    }
    //Changing the user status
    user.status = newStatus;
    //Saving in DB the newStatys
    await user.save();
    //Sending to front-end the data
    res.status(200).json({ message: "Status Updated!", status: newStatus });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//Function to remove a file
const clearImage = (filePath) => {
  //Assigning the path of image
  filePath = path.join(__dirname, "..", filePath);
  //Deleting the image
  fs.unlink(filePath, (err) => console.log(err));
};
