const dotenv = require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const http = require("http");
const logger = require('morgan')


const cookieParser = require("cookie-parser");
const Db = require("./db/db");
const userRoutes = require("./Routes/userRoute");
const postRoutes = require("./Routes/postRoute");
const messageRoutes = require('./Routes/messageRoute')
const { socketController } = require('./socket')
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);



socketController(io)
app.use(logger('dev'))
app.use(express.json());

app.use(express.urlencoded({ extended: false }))
app.use(cookieParser());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use("/api/user", userRoutes);
app.use("/api/post", postRoutes)
app.use('/api/message', messageRoutes)





// app.get("/", (req, res) => {
//     res.send("hello");
// });
Db();

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port  ${process.env.PORT}`);
});
