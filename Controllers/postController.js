const User = require("../modal/usermodal");
const Post = require("../modal/postmodal");
const Like = require("../modal/likemodal");
const Comment = require("../modal/commentmodal");
const { default: mongoose } = require("mongoose");

const createpost = async (req, res) => {
  try {
    const id = req.user.id;
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const { type, description, status, mentionid } =
      req.body;
    console.log(description);
    if (!description || !status) {
      return res.status(400).send("Please fill in all fields.");
    }
    let mentionarray = mentionid.split(',')
    console.log(mentionarray)

    const posts = await Post.create({
      file: req.file.path,
      description,
      type,
      user: id,
      status,
      mention: mentionarray
    });
    // const user = await User.findById(id);
    // user.post = Post._id
    // await user.save();

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      posts,
    });
  } catch (error) {
    console.error("Create post error:", error.message || error);
  }
};

const showuserposts = async (req, res) => {
  try {
    const id = req.user.id;
    const { offset, limit } = req.body;
    // const allpost = await Post.find({ user: id }).populate('user');
    const allpost = await Post.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(id) },
      },

      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                name: 1,
                image: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          description: 1,
          user: 1,
          type: 1,
          media: 1,
        },
      },
      // Faceit
      {
        $facet: {
          data: [
            {
              $skip: offset,
            },
            {
              $limit: limit,
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);
    res.status(200).json({
      success: true,
      message: "User posts fetched successfully",
      allpost,
    });
  } catch (error) {
    console.error("Show user posts error:", error.message || error);
  }
};

const showuserbypost = async (req, res) => {
  try {
    const id = req.params.id;
    const post = await Post.findById(id).populate("user");

    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      post,
    });
  } catch (error) {
    console.error("Show user by post error:", error.message || error);
  }
};
const getPostOfOtherUser = async (req, res) => {
  try {
    let loggedid = req.user.id;
    const { userid, offset, limit } = req.body;






    const allpost = await Post.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userid) },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                name: 1,
                image: 1,
                email: 1,
                friends: 1,
                followers: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$user",
      },
      {
        $addFields: {
          visible: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$status", "everyOne"] },
                  then: true,
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$status", "friends"] },
                      {
                        $in: [
                          new mongoose.Types.ObjectId(loggedid),
                          { $ifNull: ["$user.friends", []] },
                        ],
                      },
                    ],
                  },
                  then: true,
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$status", "followers"] },
                      {
                        $in: [
                          new mongoose.Types.ObjectId(loggedid),
                          { $ifNull: ["$user.followers", []] },
                        ],
                      },
                    ],
                  },
                  then: true,
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$status", "onlyme"] },
                      {
                        $eq: [
                          "$user._id",
                          new mongoose.Types.ObjectId(loggedid),
                        ],
                      },
                    ],
                  },
                  then: true,
                },
              ],
              default: false,
            },
          },
        },
      },
      {
        $match: {
          visible: true,
        },
      },
      {
        $project: {
          visible: 1,
          description: 1,
          user: 1,
          type: 1,
          media: 1,
        },
      },
      {
        $facet: {
          data: [
            {
              $skip: parseInt(offset, 10),
            },
            {
              $limit: parseInt(limit, 10),
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    if (!allpost || allpost.length === 0) {
      return res.status(404).json({ msg: "Post not Found" });
    }

    res.status(200).json({
      success: true,
      message: "Posts fetched successfully",
      allpost,
    });
  } catch (error) {
    console.error("Get post of other user error:", error.message || error);
    res.status(500).json({ msg: "Internal server error" });
  }
};

const addCommentToParticularPost = async (req, res) => {
  try {
    const id = req.user.id;
    console.log(id);
    const { des, postid, mentionid } = req.body;
    if (!des || !postid) return res.status(400).json({
      success: false,
      message: "Please fill all fields",

    })
    const comments = await Comment.create({
      des,
      post: postid,
      user: id,
      mention: mentionid
    });
    if (!comments)
      res.status(404).json({ msg: "comment has been deleted by user" });
    res.status(200).json({
      success: true,
      message: "Comment added successfully",
      comments,
    });
  } catch (error) {
    console.error("Add comment to post error:", error.message || error);
  }
};
const likeOnParticularPost = async (req, res) => {
  try {
    const id = req.user.id;
    // console.log(id)
    const { postid } = req.body;
    console.log(postid);
    // const post = await Post.findOne({ where: { id: postid } });
    // if (!post) res.status(404).json({ msg: "post not found" });
    const like = await Like.create({
      post: postid,
      user: id,
    });
    res.status(201).json({
      success: true,
      message: "Like added successfully",
      like,
    });
  } catch (error) {
    console.error("Like on post error:", error.message || error);
  }
};
const getAllCommentsOfParticularPost = async (req, res) => {
  try {
    const id = req.user.id;
    const { commentId, postid, offset, limit } = req.body;
    const comments = await Comment.aggregate([
      {
        $match: {
          post: new mongoose.Types.ObjectId(postid),
          parentcomment: null,
        },
      },
      // {
      //   $facet: {
      //     data: [
      //       {
      //         $skip: parseInt(offset),
      //       },
      //       {
      //         $limit: parseInt(limit),
      //       },
      //     ],
      //   },
      // },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "parentcomment",
          as: "replies",
          // pipeline: [
          //   {
          //     $lookup:
          //   }
          // ]
        },
      },
      {
        $unwind: {
          path: "$replies",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "replies.user",
          foreignField: "_id",
          as: "replies.user",
        },
      },
      {
        $group: {
          _id: "$_id",
          des: { $first: "$des" },
          user: { $first: "$user" },
          replies: { $push: "$replies" },
        },
      },
      {
        $project: {
          _id: 1,
          des: 1,
          user: {
            _id: "$user._id",
            name: "$user.name",
            email: "$user.email",
            image: "$user.image",
          },
          replies: {
            $map: {
              input: "$replies",
              as: "reply",
              in: {
                _id: "$$reply._id",
                des: "$$reply.des",
                user: {
                  _id: { $arrayElemAt: ["$$reply.user._id", 0] },
                  name: { $arrayElemAt: ["$$reply.user.name", 0] },
                  email: { $arrayElemAt: ["$$reply.user.email", 0] },
                  image: { $arrayElemAt: ["$$reply.user.image", 0] },
                },
              },
            },
          },
        },
      },
      {
        $facet: {
          data: [
            {
              $skip: parseInt(offset),
            },
            {
              $limit: parseInt(limit),
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Comments fetched successfully",
      comments,
    });
  } catch (error) {
    console.error("Get all comments of post error:", error.message || error);
  }
};
const replyOnComment = async (req, res) => {
  try {
    const { commentId, des, postid } = req.body;
    const existcomment = await Comment.findOne({ _id: commentId });
    if (commentId && !existcomment) return; // res.status(404).json({ success: false, message: "Comment not found" });
    if (commentId && existcomment) {
      const reply = await Comment.create({
        des,
        post: postid,
        user: req.user._id,
        parentcomment: commentId,
      });
      res.status(200).json({
        success: true,
        message: "Reply created successfully",
        reply,
      });
    } else {
      const comment = await Comment.create({
        des,
        post: postid,
        user: req.user._id,
      });

      res.status(200).json({
        success: true,
        message: "Comment created successfully",
        comment,
      });
    }
  } catch (error) {
    console.error("Create comment error:", error.message || error);
  }
};
const getLikeDetailsOfPost = async (req, res) => {
  try {
    const { postid } = req.body;

    const likes = await Like.aggregate([
      {
        $match: {
          post: new mongoose.Types.ObjectId(postid),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $group: {
          _id: "$post",
          totalLikes: { $sum: 1 },
          likesDetails: {
            $push: {
              _id: "$userDetails._id",
              name: "$userDetails.name",
              email: "$userDetails.email",
              image: "$userDetails.image",
            },
          },
        },
      },
      {
        $project: {
          totalLikes: 1,
          likesDetails: 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $limit: 10,
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Like details of post",
      likes,
    });
  } catch (error) {
    console.error("Get like details of post error:", error.message || error);
  }
};



module.exports = {
  createpost,
  showuserposts,
  showuserbypost,
  getPostOfOtherUser,
  addCommentToParticularPost,
  likeOnParticularPost,
  getAllCommentsOfParticularPost,
  replyOnComment,
  getLikeDetailsOfPost,

};
