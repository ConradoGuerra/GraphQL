const express = require("express");
const { body } = require("express-validator");
const feedController = require("../controllers/feed");
const router = express.Router();
const isAuth = require("../middleware/is-auth");

//The route and the function that should be executed for the route
//GET /feed/posts
router.get("/posts", isAuth, feedController.getPosts);

//POST /feed/post
router.post(
  "/post",
  isAuth,
  //Creating a validation array to post route
  [
    //The title without spaces and minimum length of 5 characters
    body("title").trim().isLength({ min: 5 }),
    //The body without extra spaces and minimum length of 5 characters
    body("content").trim().isLength({ min: 5 }),
  ],
  feedController.createPost
);

//GET /feed/post/:postId
router.get("/post/:postId", isAuth, feedController.getPost);

//PUT /feed/post/:postId
router.put(
  "/post/:postId",
  isAuth,
  //Creating a validation array to put route
  [
    //The title without spaces and minimum length of 5 characters
    body("title").trim().isLength({ min: 5 }),
    //The body without extra spaces and minimum length of 5 characters
    body("content").trim().isLength({ min: 5 }),
  ],
  feedController.updatePost
);

//DELETE /feed/post/:postId
router.delete("/post/:postId", isAuth, feedController.deletePost);

//GET /feed/status
router.get('/status', isAuth, feedController.getUserStatus)

//POST /feed/status
router.patch('/status', isAuth, feedController.updateUsertatus)

module.exports = router;
