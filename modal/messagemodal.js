const mongoose = require('mongoose')
const messageSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
    , to: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    message: {
        type: String,
        
    },
    deletedby: [{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    seen: {
        type: Boolean,
        default: false
    },
    clearedby: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    ],
    chatdeletedby: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User"

        }
    ]


    





}, { timestamps: true })
module.exports = mongoose.model('Message', messageSchema)  //exporting the model