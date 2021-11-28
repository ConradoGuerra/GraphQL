const User = require("../models/user");
const Post = require("../models/post");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const {clearImage} = require("../util/file");

module.exports = {
  //Creating a function exactly the same as schema
  //Getting the argument passed by schema
  createUser: async function ({ userInput }, req) {
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: "E-mail is invalid!" });
    }
    if (
      validator.isEmpty(
        userInput.password ||
          !validator.isLength(userInput.password, { min: 4 })
      )
    ) {
      errors.push({ message: "Password too short" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      const error = new Error("User already exists!");
      throw error;
    }
    const hashedPw = await bcrypt.hash(userInput.password, 12);
    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPw,
    });
    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },

  login: async function ({ email, password }) {
    //Finding the user
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("User does not exist.");
      error.code = 401;
      throw error;
    }
    //Comparing passwords
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Passwords is incorrect");
      error.code = 401;
      throw error;
    }
    //Creating a token for the user
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      "secreto",
      { expiresIn: "1h" }
    );

    //Return exactly the same as schema
    return { token: token, userId: user._id.toString() };
  },

  createPost: async function ({ postInput }, req) {
    //Checking the middleware authentication
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: "Invalid title" });
    }
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: "Invalid content" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    //Searching for the user
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Invalid User");
      error.code = 401;
      throw error;
    }
    //Creating a new post
    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user,
    });
    const createdPost = await post.save();
    //Adding to the user the craeted post
    user.posts.push(createdPost);
    await user.save();
    //This return should be exactly as the return of createPost query
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toString(),
      updatedAt: createdPost.updatedAt.toString(),
    };
  },

  posts: async function ({ page }, req) {
    //Checking the middleware authentication
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    if (!page) {
      page = 1;
    }
    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");
    return {
      posts: posts.map((p) => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          createdAt: p.createdAt.toString(),
          updatedAt: p.updatedAt.toString(),
        };
      }),
      totalPosts: totalPosts,
    };
  },

  post: async function ({ id }, req) {
    //Checking the middleware authentication
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate('creator');
    if(!post){
      const error = new Error('No post found!')
      error.code = 404
      throw error
    }
    const imageUrl = "http://localhost:8080/" + post.imageUrl;
    post.imageUrl = imageUrl
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toString(),
      updatedAt: post.updatedAt.toString()
    }
  },

  updatePost: async function({id, postInput}, req){
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate('creator')
    if(!post){
      const error = new Error('No post found!')
      error.code = 404
      throw error
    }
    //If the userId is different from the post creator
    if(req.userId.toString() !== post.creator._id.toString()){
      const error = new Error('Not authorized')
      error.code = 403
      throw error
    }
    //Validation check
    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: "Invalid title" });
    }
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: "Invalid content" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    post.title = postInput.title
    post.content = postInput.content
    if(postInput.imageUrl !== 'undefined'){
      post.imageUrl = postInput.imageUrl
    }
    const updatedPost = await post.save()
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toString(),
      updatedAt: updatedPost.updatedAt.toString(),
    }
  },

  deletePost: async function({id}, req){
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id)
    if(!post){
      const error = new Error('No post found!')
      error.code = 404
      throw error
    }
    //If the userId is different from the post creator
    if(req.userId.toString() !== post.creator.toString()){
      const error = new Error('Not authorized')
      error.code = 403
      throw error
    }

    //Clearing the image path
    clearImage(post.imageUrl)

    //Removing the post from mondodb
    await Post.findByIdAndRemove(id)

    //Removing the post id from user in mongodb
    const user = await User.findById(req.userId)
    user.posts.pull(id)
    await user.save()

    return true

  },

  //I HAVE to pass an argument as firts element
  userStatus: async function(args, req){
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId)
    return {
      status: user.status
    }
  },

  updateUserStatus: async function({statusInput}, req){
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId)
    user.status = statusInput
    await user.save()
    return {
      status: user.status
    }
  } 
};
