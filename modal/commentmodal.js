const mongoose = require('mongoose')
const commentSchema = new mongoose.Schema({
    des: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    },
    parentcomment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    },
    mention: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
        
    }]

}, { timestamps: true })

commentSchema.index({ post: 1 })

module.exports = mongoose.model('Comment', commentSchema)