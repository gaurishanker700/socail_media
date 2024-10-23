const express = require('express')
const Auth = require('../middleware/Auth')
const upload = require('../middleware/multerconf')
const { register, Login, Logout, getprofile, updateprofile, changepassword, followUser, makefriend, blockotheruser, leaderboard, verifyemail, forgetPassword, resetpassword, resetform, Allusers, home } = require('../Controllers/userController')
const bcrypt = require('bcryptjs');

const router = express.Router()
router.post("/register", upload.single('image'), register)
router.post("/login", Login)
router.get("/logout", Auth, Logout)
router.get("/profile", Auth, getprofile)
router.put("/update", Auth, upload.single('image'), updateprofile)
router.post("/changepassword", Auth, changepassword)
router.post("/follow", Auth, followUser)
router.post("/friend", Auth, makefriend)
router.post("/block", Auth, blockotheruser)
router.get("/leaderboard", Auth, leaderboard)
router.get("/verify", verifyemail)
router.post("/forgetpassword", forgetPassword)
router.post("/resetpassword", resetpassword)
router.get('/resetform', resetform)
router.post("/dashboard", Allusers)
router.post("/home",Auth,home)






module.exports = router