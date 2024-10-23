const iomiddleware = require('./middleware/socketmiddleware');
const User = require('./modal/usermodal');
const Message = require('./modal/messagemodal');
const {chatlist}=require('./Controllers/mesageController')


module.exports.socketController = (io) => {
    io.use(iomiddleware);

    io.on("connection", async (socket) => {
        console.log(`A new client connected: ${socket?.user?.name}`);
        const sender = socket.user._id;

        const senderDetail = await User.findById(sender);
        const senderSocketId = senderDetail.socketId;

        socket.on("message", async (data) => {
            const { message, user } = data;

            console.log(message, user, socket.user._id);

            if (String(sender) === String(user)) {
                console.log("You cannot send a message to yourself.");
                return;
            }

            const userDetail = await User.findById(user);
            if (!userDetail) {
                console.log("User not found.");
                return io.to(senderSocketId).emit('error', { message: 'User not found' });
            }
            const receiverSocketId = userDetail.socketId;
            console.log(receiverSocketId, "receiversocketid");

            const isBlockedByUser = userDetail.blocked.map((x) => String(x)).includes(sender);
            const isBlockedBySender = senderDetail.blocked.map((x) => String(x)).includes(user);

            if (isBlockedByUser || isBlockedBySender) {
                console.log("You are blocked; you can't message.");
                return io.to(senderSocketId).emit('error', { message: 'You cannot message this user.' });
            }

           

            const messageDetail = await new Message({ message, from: sender, to: user }).save();
            if (messageDetail) {
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("chat", { senderSocketId: senderSocketId, message });
                } else {
                    console.log(`User ${user} is not connected.`);
                }

                if (senderSocketId) {
                    io.to(senderSocketId).emit('chat', { receiverSocketId: receiverSocketId, message });
                } else {
                    console.log(`Sender ${sender} is not connected.`);
                }

                // Assuming chatlist is defined and available
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("chatlist", { chatlist });
                }
                if (senderSocketId) {
                    io.to(senderSocketId).emit("chatlist", { chatlist });
                }
            }
        });

        socket.on("disconnect", () => {
            console.log(`User ${socket.id} disconnected`);
        });
    });
};

