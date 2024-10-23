const mongoose = require('mongoose')
const likeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"User"
        
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"Post"
        

    }

    
}, { timestamps: true })
module.exports = mongoose.model('Like', likeSchema)  //export the model