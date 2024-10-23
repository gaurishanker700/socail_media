const jwt = require('jsonwebtoken');
const User = require('../modal/usermodal');

const iomiddleware = async (socket, next) => {
    const token = socket.handshake.headers['authorization'];

    if (!token) {
        return next(new Error('Unauthorized'));
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const id = decoded.id;


        if (!id) {
            return next(new Error('Unauthorized'));
        }

        const user = await User.findOne({ _id: id });

        if (!user) return next(new Error('User not found'));
        // if (user.deviceToken !== decoded.deviceToken) {
        //     return next(new Error('Your account has been logged into another device.'));
        // }

        user['socketId'] = socket.id
        const userDetail = await user.save()
        socket.user = userDetail;
        next();

    } catch (error) {
        return next(new Error('Invalid token'));
    }
}

module.exports = iomiddleware;
