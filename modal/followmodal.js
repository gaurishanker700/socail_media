const mongoose = require('mongoose')
const followSchema = new mongoose.Schema({
    



    
},{
    timestamps:true
})
const Follow=new mongoose.model('Follow',followSchema)