const express = require('express')
const Auth=require('../middleware/Auth')
const {chatlist, chathistory, deletemassage, seenmessage, searchChat, clearchat, deletechat, pinuser} = require('../Controllers/mesageController')
const router = express.Router()
router.post("/chatlist",Auth, chatlist)
router.post("/history", Auth, chathistory)
router.post("/deleteforme", Auth, deletemassage)
router.post("/seen", Auth, seenmessage)

router.post("/searchchat", Auth, searchChat)
router.post("/clearchat", Auth, clearchat)
router.post("/deletechat", Auth, deletechat)
router.post("/pin",Auth,pinuser)






module.exports=router