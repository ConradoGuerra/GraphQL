const express = require("express");
const { body } = require("express-validator");
const User = require("../models/user");
const authController = require("../controllers/auth");

const router = express.Router();

//PUT /auth/signup
router.put(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter with a valid e-mail.")
      .custom((value, { req }) => {
        return User.findOne({email: value}).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("E-mail already exists!");
          }
        });
      })
      .normalizeEmail(),
    body("password").trim().isLength({ min: 5 }),
    body("name").trim().not().isEmpty(),
  ],
  authController.signup
);


//POST /auth/login
router.post('/login', authController.login)

module.exports = router;
