const jwt = require('jsonwebtoken')
const User = require('../modal/usermodal')

const authenticate = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const id = decoded.id
        if (!id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = await User.findOne({ _id: id });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.deviceToken != decoded.deviceToken) return res.status(403).json({ success: false, message: 'Your account has been logged into another device.' })
        req.user = user;
        next();



    } catch (error) {

        return res.status(400).json({ message: 'Invalid token' });
    }


}
module.exports = authenticate