// const Follow=require('../modal/followmodal')
const User = require("../modal/usermodal");
const Post = require("../modal/postmodal");
const sendemail = require("../utils/mail");
const dayjs = require('dayjs')
const bcrypt = require('bcryptjs');

const jwt = require("jsonwebtoken");
const ejs = require("ejs");

const { default: mongoose } = require("mongoose");
const register = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const { name, email, password, phone, accounttype } = req.body;
    if (!name || !email || !password || !phone || !accounttype)
      return res.status(400).json({
        message: "Please fill in all fields",
      });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({
        message: "email already registered",
      });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      image: req.file.path,
      accounttype,
    });

    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, {
      expiresIn: "10m",
    });
    const verificationLink = `http://localhost:8000/api/user/verify?token=${token}`;

    ejs.renderFile(
      "views/verifyemail.ejs",
      { verificationLink },
      (err, data) => {
        if (err) {
          console.error("EJS render error", err);
          return res.status(500).send("Error rendering email template.");
        }
        sendemail(email, "Email verification", data);
      }
    );


    res.status(201).json({
      msg: "mail sent check email",

    });
  } catch (error) {
    console.log("register error", error);
  }
};
const verifyemail = async (req, res) => {
  try {
    const { token } = req.query;


    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (!decoded) {
      ejs.renderFile("views/tokenexpire.ejs", {}, (err, html) => {


        res.status(200).send(html);
      });
    }

    const id = decoded.userId;


    await User.findByIdAndUpdate(id, { isverified: true });


    ejs.renderFile("views/emailverified.ejs", {}, (err, html) => {


      res.status(200).send(html);
    });
  } catch (error) {
    console.log("Verification error", error);
    res.status(500).send("Internal Server Error");
  }
};

const Login = async (req, res) => {
  try {
    const { email, password, deviceToken, lat, long } = req.body;

    if (!email || !password)
      return res.status(400).json({
        msg: "Fill all fields",
      });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({
        success: false,
        msg: "User does not exist",
      });

    // if (!user.isverified) {
    //   return res.status(400).json({
    //     msg: "Email not verified",
    //   });
    // }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({
        success: false,
        msg: "Invalid email or password",
      });

    user.deviceToken = deviceToken;




    await User.updateOne({ _id: user._id }, { deviceToken, location: { type: 'Point', coordinates: [long, lat] } })



    const token = jwt.sign(
      { id: user._id, deviceToken },
      process.env.SECRET_KEY
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    });

    res.status(200).json({
      success: true,
      msg: "Login successfully",
      token,
    });
  } catch (error) {
    console.log("Login error:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};


const Logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({
      msg: "logout succesfully",
    });
  } catch (error) {
    console.log("logout error", error);
  }
};
const getprofile = async (req, res) => {
  try {
    const id = req.user.id;
    console.log(id);
    const user = await User.findById(id);
    const { password, ...userData } = user._doc;
    res.status(200).json({
      success: true,
      userData,
      msg: "user profile",
    });
  } catch (error) {
    console.log("get profile error", error);
  }
};

const updateprofile = async (req, res) => {
  try {
    const id = req.user.id;

    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const { name, email, phone, accountType } = req.body;
    const newObj = {};

    newObj.image = req.file.path;

    Object.keys(req.body).forEach((key) => {
      if (req.body[key]) newObj[key] = req.body[key];
    });

    console.log(newObj);
    const user = await User.findByIdAndUpdate(id, newObj, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
      success: true,
      userData,
    });
  } catch (error) {
    console.error("Update profile error:", error.message || error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const changepassword = async (req, res) => {
  try {
    const id = req.user.id;
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid old password",
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error.message || error);
  }
};

const followUser = async (req, res) => {
  try {
    const id = req.user.id;
    const { userId } = req.body;

    const user = await User.findById(userId);
    const loggedUser = await User.findById(id);

    if (!user || !loggedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    // if (
    //   loggedUser.friends.some(friend => user.friends.includes(friend)) ||
    //   loggedUser.following.some(follow => user.followers.includes(follow))
    // ) {

    // }

    const isFollowing = loggedUser.following
      .map((x) => String(x))
      .includes(userId);
    const isFriends = loggedUser.friends.map((x) => String(x)).includes(userId);

    if (isFollowing || isFriends) {
      // Unfollow logic
      await User.updateOne({ _id: id }, { $pull: { following: userId } });
      await User.updateOne({ _id: userId }, { $pull: { followers: id } });
      await User.updateOne({ _id: id }, { $pull: { friends: userId } });
      await User.updateOne({ _id: userId }, { $pull: { friends: id } });
      return res.status(200).json({
        success: true,
        message: "User unfollowed successfully",
      });
    }

    // if (isFriends) {

    //   return res.status(200).json({
    //     success: true,
    //     message: "User unfollowed successfully",
    //   });
    // }

    // Follow logic
    if (user.accounttype === "public") {
      await User.updateOne({ _id: userId }, { $addToSet: { followers: id } });
      await User.updateOne({ _id: id }, { $addToSet: { following: userId } });

      return res.status(201).json({
        success: true,
        message: "User followed successfully",
      });
    } else if (user.accounttype === "private") {
      await User.updateOne(
        { _id: userId },
        { $addToSet: { receiveRequest: id } }
      );
      await User.updateOne({ _id: id }, { $addToSet: { sentRequest: userId } });

      return res.status(201).json({
        success: true,
        message: "Request sent successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid account type",
      });
    }
  } catch (error) {
    console.errorerror("Follow user error:", error.message || error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing your request.",
    });
  }
};

const makefriend = async (req, res) => {
  try {
    const loggeduserid = req.user.id;
    const { userId, status } = req.body;
    console.log(loggeduserid, userId);
    const loguser = await User.findById(loggeduserid);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }
    if (status === "reject") {
      const requestrev = await User.updateOne(
        { _id: userId },
        { $pull: { receiveRequest: loggeduserid } }
      );
      const requestsent = await User.updateOne(
        { _id: loggeduserid },
        { $pull: { sentRequest: userId } }
      );
      console.log(requestrev, requestsent);
      return res.status(201).json({
        success: true,
        message: " friend request rejected ",
      });
    }

    if (status === "accept") {
      //      if (
      //   loguser.sentRequest.some(req => user.receiveRequest.includes(req)) ||
      //   loguser.following.some(follow => user.followers.includes(follow))
      // )
      const sender = await User.updateOne(
        { _id: loggeduserid },
        { $addToSet: { friends: userId } }
      );
      const receiver = await User.updateOne(
        { _id: userId },
        {
          $addToSet: { friends: loggeduserid },
        }
      );
      const u = await User.updateOne(
        { _id: userId },
        { $addToSet: { followers: loggeduserid } }
      );
      const s = await User.updateOne(
        { _id: loggeduserid },
        { $addToSet: { following: userId } }
      );

      res.status(200).json({
        success: true,
        message: "Friend made successfully",
      });

      // if (
      //   (loguser.sentRequest === userId &&
      //     user.receiveRequest === loggeduserid) ||
      //   (loguser.following.includes(new mongoose.Types.ObjectId(userId)) &&
      //     user.followers.includes(new mongoose.Types.ObjectId(loggeduserid)))
      // ) {

      // } else {
      //   return res.status(400).json({
      //     success: false,
      //     msg: "You are already friends",
      //   });
      // }
    }
  } catch (error) {
    console.error("Make friend error:", error.message || error);
  }
};

const blockotheruser = async (req, res) => {
  try {
    const loggeduserid = req.user.id;
    const { userid } = req.body;

    const loggedUser = await User.findById(loggeduserid);
    if (!loggedUser) {
      return res.status(404).json({
        success: false,
        msg: "Logged user not found",
      });
    }

    const userToBlock = await User.findById(userid);
    if (!userToBlock) {
      return res.status(404).json({
        success: false,
        msg: "User not found that you want to block",
      });
    }

    if (loggedUser.blocked.includes(new mongoose.Types.ObjectId(userid))) {
      await User.updateOne(
        { _id: loggeduserid },
        { $pull: { blocked: userid } }
      );
      return res.status(200).json({
        success: true,
        message: "User unblocked successfully",
      });
    }

    const blockResult = await User.updateOne(
      { _id: loggeduserid },
      { $addToSet: { blocked: userid } }
    );

    if (!blockResult) {
      return res.status(400).json({
        success: false,
        msg: "Failed to block user",
      });
    }

    res.status(200).json({
      success: true,
      message: "User blocked successfully",
      blockResult,
    });
  } catch (error) {
    console.error("Block user error:", error.message || error);
    res.status(500).json({
      success: false,
      msg: "An error occurred while processing your request.",
    });
  }
};
const leaderboard = async (req, res) => {
  try {
    const loguser = req.user.id;

    const leaderboardData = await User.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "user",
          as: "posts",
        },
      },
      {
        $unwind: {
          path: "$posts",
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "posts._id",
          foreignField: "post",
          as: "likes",
        },
      },
      {
        $group: {
          _id: "$_id",
          totalLikes: { $sum: { $size: "$likes" } },
          lastLikedPost: {
            $max: {
              $cond: [
                { $gt: ["$likes.createdAt", null] },
                { $first: "$likes.createdAt" },
                null,
              ],
            },
          },
          name: { $first: "$name" },
          email: { $first: "$email" },
          image: { $first: "$image" },
        },
      },
      {
        $sort: {
          totalLikes: -1,
          lastLikedPost: 1,
        },
      },
    ]);

    res.status(200).json({ leaderboardData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const resetform = async (req, res) => {
  try {
    const token = req.query.token
    res.render('resetpassword', { url: `http://localhost:8000/api/user/resetpassword?token=${token}` });
  } catch (error) {
    console.error('Error rendering reset request page:', error);
    res.status(500).send('Internal Server Error');
  }
};
const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, {
      expiresIn: "10m",
    });

    const url = `http://localhost:8000/api/user/resetpassword?token=${token}`;
    const resetlink = `http://localhost:8000/api/user/resetform?token=${token}`

    ejs.renderFile("views/resetrequest.ejs", { resetlink }, async (err, data) => {
      if (err) {
        return res.status(500).json({ msg: "Error rendering email template", error: err });
      }

      try {
        await sendemail(email, "Reset Password", data);
        res.status(200).json({
          msg: "Mail sent",
          token,
        });
      } catch (emailError) {
        res.status(500).json({
          msg: "Error sending email",
          error: emailError,
        });
      }
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Error in reset password",
      error,
    });
  }
};

const resetpassword = async (req, res) => {
  const { token } = req.query
  const { password, cpassword } = req.body
  console.log('data', token, req.body)

  if (password !== cpassword) {
    ejs.renderFile("views/doesnotupdate.ejs", {}, (err, html) => {


      res.status(200).send(html);
    });
  }
  const decoded = jwt.verify(token, process.env.SECRET_KEY)
  if (!decoded) {
    ejs.renderFile("views/tokenexpire.ejs", {}, (err, html) => {


      res.status(200).send(html);
    });
  }
  const id = decoded.userId

  console.log(id)
  const verified = await User.findById(id)
  if (!verified) {
    return res.status(400), json({
      msg: "invalid token"
    })
  }
  const hashedPassword = await bcrypt.hashSync(password, 10)
  const pass = verified.password = hashedPassword
  await verified.save()
  ejs.renderFile("views/success.ejs", {}, (err, html) => {


    res.status(200).send(html);
  });






}
const Allusers = async (req, res) => {
  try {
    const { offset, limit } = req.body
    const date = dayjs()
    console.log(date)

    const users = await User.aggregate([
      {
        $match: {
          $or: [
            { createdAt: { $gt: dayjs(date).subtract(7, 'day').toDate() } },
            { createdAt: { $gt: dayjs(date).subtract(1, 'month').toDate() } },
            { createdAt: { $gt: dayjs(date).subtract(3, 'month').toDate() } },
            { createdAt: { $gt: dayjs(date).subtract(1, 'year').toDate() } }
          ]
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          image: 1,
          createdAt: 1,
          period: {
            $switch: {
              branches: [
                {
                  case: { $gte: ["$createdAt", dayjs(date).subtract(7, 'day').toDate()] },
                  then: "this week"
                },
                {
                  case: { $gte: ["$createdAt", dayjs(date).subtract(1, 'month').toDate()] },
                  then: "this month"
                },
                {
                  case: { $gte: ["$createdAt", dayjs(date).subtract(3, 'month').toDate()] },
                  then: "this quarter"
                },
                {
                  case: { $gte: ["$createdAt", dayjs(date).subtract(1, 'year').toDate()] },
                  then: "this year"
                }
              ],
              default: "older"
            }
          }
        }
      },
      {
        $group: {
          _id: "$period",
          users: { $push: { name: "$name", email: "$email", image: "$image" } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $skip: parseInt(offset)
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    return res.status(200).json({
      users,
      msg: "all users fetched"
    })

  } catch (error) {
    return res.status(500).json({
      msg: "Error fetching users",
      error: error.message
    })

  }


}
const home = async (req, res) => {
  try {
    const { filter, offset = 0, limit = 10 } = req.body; 
    const loggeduserid = req.user.id;
    
    const loguser = await User.findById(loggeduserid);
    if (!loguser) {
      return res.status(404).json({ msg: "User not found" });
    }

    const location = loguser.location.coordinates;
    console.log(location)
    const disinmeter = filter * 1000;

    const homeposts = await User.aggregate([
      {
          $geoNear: {
              near: { type: "Point", coordinates: location },
              maxDistance: disinmeter,
              spherical: true,
              distanceField: "dist.calculated"
          }
      },
      {
          $match: {
              _id: { $ne: loggeduserid }
          }
      },
      {
          $lookup: {
              from: 'posts',
              localField: '_id',
              foreignField: 'user',
              as: 'posts'
          }
      },
      {
          $unwind: {
              path: '$posts',
              preserveNullAndEmptyArrays: true 
          }
      },
      {
          $project: {
              _id: 1,
              name: 1,
              email: 1,
              image: 1,
              'posts.description': 1,
              'posts.file': 1,
              'posts.type': 1
          }
      }
  ]);
  
    return res.status(200).json(homeposts);

  } catch (error) {
    return res.status(500).json({
      msg: "Error fetching users",
      error,
    });
  }
};






module.exports = {
  register,
  Login,
  Logout,
  getprofile,
  updateprofile,
  changepassword,
  followUser,
  makefriend,
  blockotheruser,
  leaderboard,
  verifyemail,
  forgetPassword,
  resetpassword,
  resetform,
  Allusers,
  home
};
