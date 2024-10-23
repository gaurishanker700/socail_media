const mongoose = require('mongoose')
const postSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true
    },
    file: {
        type: String,
        default: null
    },
    type: {
        type: String,
        enum: ['image', 'video']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ["friends", "followers", "everyOne", "onlyme"]
    },
    mention: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        
    }]
}, { timestamps: true })
const post = mongoose.model("Post", postSchema)
module.exports = post;