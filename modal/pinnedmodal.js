const mongoose = require('mongoose')
const pinnedSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'

    },
    pinnedby: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true })
module.exports = mongoose.model('Pinned', pinnedSchema) 