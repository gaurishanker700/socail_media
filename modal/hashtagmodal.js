const mongoose = require('mongoose')
const hashtagSchema = new mongoose.Schema({
    hashtag: [{
        type:String
    }],
    createdby: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

    
}, { timestamps: true })
module.exports = mongoose.model('Hashtag', hashtagSchema)  
