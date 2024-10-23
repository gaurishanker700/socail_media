const { off, findById } = require("../modal/commentmodal");
const Message = require("../modal/messagemodal");
const Pinned = require("../modal/pinnedmodal");
const User = require("../modal/usermodal");
const mongoose = require("mongoose");
const chatlist = async (req, res) => {
  try {
    const loggeduserid = req.user.id;
    const { offset = 0, limit = 10, query } = req.body;

    const loggeduser = await User.findById(loggeduserid).select("blocked");
    const blockusers = loggeduser.blocked.map(String);

    const chats = await Message.aggregate([
      {
        $match: {
          $or: [
            { from: new mongoose.Types.ObjectId(loggeduserid) },
            { to: new mongoose.Types.ObjectId(loggeduserid) },
          ],
          chatdeletedby: { $ne: new mongoose.Types.ObjectId(loggeduserid) },
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$from", new mongoose.Types.ObjectId(loggeduserid)] },
              "$to",
              "$from",
            ],
          },
          lastMessage: { $last: "$$ROOT" },
          unseenmsg: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$seen", false] },
                    { $eq: ["$to", new mongoose.Types.ObjectId(loggeduserid)] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $match: {
          $expr: {
            $not: {
              $in: [{ $toString: "$user._id" }, blockusers],
            },
          },
          ...(query && { 'user.name': new RegExp(query, "i") })
        },
      },
      {
        $lookup: {
          from: "pinneds",
          let: { userId: "$user._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user", "$$userId"] },
                    {
                      $eq: [
                        "$pinnedby",
                        new mongoose.Types.ObjectId(loggeduserid),
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                createdAt: 1,
              },
            },
          ],
          as: "pinnedUser",
        },
      },
      {
        $unwind: {
          path: "$pinnedUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: "$lastMessage._id",

          lastmsg: {
            $cond: [
              {
                $ne: [
                  "$lastMessage.clearedby",
                  new mongoose.Types.ObjectId(loggeduserid),
                ],
              },
              "",
              "$lastMessage.message",
            ],
          },

          from: "$lastMessage.from",
          to: "$lastMessage.to",
          createdAt: "$lastMessage.createdAt",
          unseenmsg: "$unseenmsg",
          user: {
            _id: "$user._id",
            name: "$user.name",
            email: "$user.email",
            Image: "$user.Image",
          },
          pinned: "$pinnedUser.createdAt",
        },
      },
      {
        $sort: { pinned: -1, createdAt: -1 },
      },
    ]);

    const chatUserIds = chats.map((chat) => chat.user._id.toString());

    let friendsData = [];

    if (chats.length < limit && query) {
      const regexQuery = new RegExp(query, "i");

      friendsData = await User.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(loggeduserid),
            ...(query && { name: new RegExp(query, "i") })
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "friends",
            foreignField: "_id",
            as: "friendsData",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "followers",
            foreignField: "_id",
            as: "followersData",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "following",
            foreignField: "_id",
            as: "followingData",
          },
        },
        {
          $addFields: {
            sort: {
              $cond: [
                { $gt: [{ $size: "$friendsData" }, 0] },
                0,
                {
                  $cond: [{ $gt: [{ $size: "$followingData" }, 0] }, 1, 2],
                },
              ],
            },
          },
        },
        {
          $sort: { sort: 1 },
        },
        {
          $project: {
            allUsers: {
              $setUnion: [
                {
                  $filter: {
                    input: {
                      $map: {
                        input: "$friendsData",
                        as: "friend",
                        in: {
                          name: "$$friend.name",
                          email: "$$friend.email",
                          image: "$$friend.image",
                        },
                      },
                    },
                    as: "user",
                    cond: {
                      $and: [
                        { $not: { $in: ["$$user._id", chatUserIds] } },
                        {
                          $regexMatch: {
                            input: "$$user.name",
                            regex: regexQuery,
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  $filter: {
                    input: {
                      $map: {
                        input: "$followersData",
                        as: "follower",
                        in: {
                          name: "$$follower.name",
                          email: "$$follower.email",
                          image: "$$follower.image",
                        },
                      },
                    },
                    as: "user",
                    cond: {
                      $and: [
                        { $not: { $in: ["$$user._id", chatUserIds] } },
                        {
                          $regexMatch: {
                            input: "$$user.name",
                            regex: regexQuery,
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  $filter: {
                    input: {
                      $map: {
                        input: "$followingData",
                        as: "following",
                        in: {
                          name: "$$following.name",
                          email: "$$following.email",
                          image: "$$following.image",
                        },
                      },
                    },
                    as: "user",
                    cond: {
                      $and: [
                        { $not: { $in: ["$$user._id", chatUserIds] } },
                        {
                          $regexMatch: {
                            input: "$$user.name",
                            regex: regexQuery,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
        {
          $unwind: {
            path: "$allUsers",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $replaceRoot: { newRoot: "$allUsers" },
        },
      ]);
    }

    const finalresult = [
      ...chats,
      ...friendsData.slice(0, limit - (chats?.length || 0)),
    ];

    res.status(200).json({
      finalresult,
      success: true,
      message: "Chats and users retrieved successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const chathistory = async (req, res) => {
  try {
    const loguser = req.user.id;
    const { offset = 0, limit = 10, userid } = req.body;
    const isvalidobjectid = mongoose.Types.ObjectId.isValid(userid);

    if (!isvalidobjectid) {
      return res.status(400).json({ message: "Invalid user id or object id" });
    }

    const logguser = await User.findById(loguser);
    const isblocked = logguser.blocked.includes(
      new mongoose.Types.ObjectId(userid)
    );
    if (isblocked) {
      return res.status(400).json({ message: "You are blocked by this user" });
    }
    const user = await User.findById(userid);
    const isBlockedd = user.blocked.includes(
      new mongoose.Types.ObjectId(loguser)
    );
    if (isBlockedd) {
      return res.status(400).json({ message: "You have blocked this user" });
    }

    const chats = await Message.aggregate([
      {
        $match: {
          $or: [
            {
              from: new mongoose.Types.ObjectId(loguser),
              to: new mongoose.Types.ObjectId(userid),
            },
            {
              from: new mongoose.Types.ObjectId(userid),
              to: new mongoose.Types.ObjectId(loguser),
            },
          ],
          deletedby: { $ne: new mongoose.Types.ObjectId(loguser) },
          clearedby: { $ne: new mongoose.Types.ObjectId(loguser) },
        },
      },
      {
        $sort: { createdAt: 1 },
      },
      {
        $lookup: {
          from: "users",
          localField: "from",
          foreignField: "_id",
          as: "fromUser",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "to",
          foreignField: "_id",
          as: "toUser",
        },
      },
      {
        $unwind: "$fromUser",
      },
      {
        $unwind: "$toUser",
      },
      {
        $project: {
          _id: "$_id",
          message: "$message",
          createdAt: "$createdAt",
          from: {
            _id: "$fromUser._id",
            name: "$fromUser.name",
            email: "$fromUser.email",
            image: "$fromUser.Image",
          },
          to: {
            _id: "$toUser._id",
            name: "$toUser.name",
            email: "$toUser.email",
            image: "$toUser.Image",
          },
          sent: { $eq: ["$from", new mongoose.Types.ObjectId(loguser)] },
        },
      },
      {
        $skip: parseInt(offset),
      },
      {
        $limit: parseInt(limit),
      },
    ]);

    res.status(200).json({
      status: "success",
      chats,
      msg: "Chats fetched successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deletemassage = async (req, res) => {
  try {
    const id = req.user.id;

    const { msgid } = req.body;
    const isvalidobjectid = mongoose.Types.ObjectId.isValid(msgid);
    if (!isvalidobjectid) {
      return res
        .status(400)
        .json({ message: "Invalid message id or object id" });
    }

    const singlemessage = await Message.findById(msgid);
    if (!singlemessage) {
      return res.status(200).json({
        success: false,
        message: "Message not found",
      });
    }
    if (
      singlemessage.from._id.toString() !== id ||
      singlemessage.to._id.toString() !== id
    ) {
      return res.status(200).json({
        success: false,
        message: "You cant delete this message",
      });
    }

    const deletedmessage = await Message.updateOne(
      { _id: msgid },
      { $addToSet: { deletedby: id } }
    );
    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
      deletedmessage,
    });
  } catch (error) {
    console.error(error, "delete msg error");
  }
};

const seenmessage = async (req, res) => {
  try {
    const loguser = req.user.id;
    const { userid } = req.body;
    const isvalidobjectid = mongoose.Types.ObjectId.isValid(userid);
    if (!isvalidobjectid) {
      return res.status(400).json({ message: "Invalid user id or object id" });
    }

    // const result = await Message.updateMany(
    //   {
    //     to: new mongoose.Types.ObjectId(loguser),
    //     from: new mongoose.Types.ObjectId(userid),
    //     seen: false,
    //   },
    //   {
    //     $set: { seen: true },
    //   }
    // );

    const result = await Message.updateMany(
      { to: loguser, from: userid, seen: false },
      { seen: true }
    );
    const pin = await User.updateOne(
      { _id: loguser },
      { $addToSet: { pinneduser: userid } }
    );
    console.log("Update Result:::::::nmessage seen:", result);

    res.status(200).json({
      success: true,
      message: "Message seen successfully",
    });
  } catch (error) {
    console.error(error, "seen msg error");
    res.status(500).json({
      success: false,
      message: "Error marking message as seen",
      error: error.message,
    });
  }
};

const searchChat = async (req, res) => {
  try {
    const { query } = req.body;
    const loguser = req.user.id;

    if (!query) {
      return res.status(400).json({ message: "Query cannot be empty" });
    }

    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { from: new mongoose.Types.ObjectId(loguser) },
            { to: new mongoose.Types.ObjectId(loguser) },
          ],
          message: { $regex: query, $options: "i" },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$from", loguser] }, "$to", "$from"] },
          lastMessage: { $last: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          _id: 1,
          lastMessage: 1,
          name: "$userInfo.name",
          email: "$userInfo.email",
          image: "$userInfo.image",
        },
      },
      {
        $sort: { "lastMessage.createdAt": -1 },
      },
    ]);

    return res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const clearchat = async (req, res) => {
  try {
    const loguser = req.user.id;
    const { userid } = req.body;
    const isvalidobjectid = mongoose.Types.ObjectId.isValid(userid);
    if (!isvalidobjectid) {
      return res.status(400).json({ message: "Invalid user id or object id" });
    }

    const result = await Message.updateMany(
      {
        $or: [
          {
            from: new mongoose.Types.ObjectId(loguser),
            to: new mongoose.Types.ObjectId(userid),
          },
          {
            from: new mongoose.Types.ObjectId(userid),
            to: new mongoose.Types.ObjectId(loguser),
          },
        ],
      },
      {
        $addToSet: { clearedby: loguser },
      }
    );

    return res
      .status(200)
      .json({ message: "Chat cleared successfully", result });
  } catch (error) {
    console.error("Error clearing chat:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while clearing the chat." });
  }
};

const deletechat = async (req, res) => {
  try {
    const loguser = req.user.id;
    const { userid } = req.body;
    const isvalidobjectid = mongoose.Types.ObjectId.isValid(userid);
    if (!isvalidobjectid) {
      return res.status(400).json({ message: "Invalid user id or object id" });
    }
    const result = await Message.updateMany(
      {
        $or: [
          {
            from: new mongoose.Types.ObjectId(loguser),
            to: new mongoose.Types.ObjectId(userid),
          },
          {
            from: new mongoose.Types.ObjectId(userid),
            to: new mongoose.Types.ObjectId(loguser),
          },
        ],
      },
      {
        $addToSet: { chatdeletedby: loguser },
      }
    );
    res.status(200).json({
      message: "Chat deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
  }
};

const pinuser = async (req, res) => {
  try {
    const loguser = req.user.id;
    const { userid } = req.body;
    const isvalidobjectid = mongoose.Types.ObjectId.isValid(userid);
    if (!isvalidobjectid) {
      return res.status(400).json({
        message: "Invalid user id or object id",
      });
    }
    const ispinned = await Pinned.findOne({ user: userid });
    console.log(ispinned)
    if (ispinned) {
      await Pinned.deleteOne({ user: userid });
      return res.status(200).json({
        message: "User unpinned successfully",
      });
    }

    const pin = await Pinned.create({
      user: userid,
      pinnedby: loguser,
    });

    res.status(200).json({
      message: "User pinned successfully",
      pin,
    });
  } catch (error) {
    console.error("Error pinning user:", error);
  }
};

module.exports = {
  chatlist,
  chathistory,
  deletemassage,
  seenmessage,

  searchChat,
  clearchat,
  deletechat,
  pinuser,
};
