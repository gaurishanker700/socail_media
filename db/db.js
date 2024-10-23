const mongoose = require('mongoose')
const Db = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/insta")
        console.log("connect to mongo db")
        
    } catch (error) {
        console.log("mongo error",error)
        
    }
    
}
module.exports=Db