const express = require('express')
const upload = require('../middleware/multerconf')
const Auth = require('../middleware/Auth')
const {createpost, showuserposts, showuserbypost, getPostOfOtherUser, addCommentToParticularPost, likeOnParticularPost, getAllCommentsOfParticularPost, replyOnComment, getLikeDetailsOfPost}=require('../Controllers/postController')

const router = express.Router()
router.post("/createpost", Auth, upload.single('media'), createpost)
router.get("/showpost", Auth, showuserposts)
router.get("/postedbyuser/:id", Auth, showuserbypost)
router.get("/postofotheruser",Auth, getPostOfOtherUser)
router.post("/addcomment", Auth, addCommentToParticularPost)
router.post("/addlike", Auth, likeOnParticularPost)
router.get("/getcomments", Auth, getAllCommentsOfParticularPost)
router.post("/reply", Auth, replyOnComment)
router.get("/likes",getLikeDetailsOfPost)

module.exports = router