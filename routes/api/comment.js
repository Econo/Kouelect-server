const debug = require('debug')('app:route:bug');
const express = require('express');
const { nanoid } = require('nanoid');
const dbModule = require('../../database');
const { newId, connect } = require('../../database');
const Joi = require('joi');
const validId = require('../../middleware/validId');
const validBody = require('../../middleware/validBody');
const auth = require('../../middleware/auth');
const hasAnyRole = require('../../middleware/hasAnyRole');
const hasPermission = require('../../middleware/hasPermission');
const hasRole = require('../../middleware/hasRole');
const isLoggedIn = require('../../middleware/isLoggedIn');

const commentSchema = Joi.object({
  commentText: Joi.string().trim().min(1).required(),
});

const router = express.Router();

router.get('/:bugId/comment/list', validId('bugId'), isLoggedIn(), hasPermission('viewComment'), async (req, res, next) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in!' });
    }

    //For future comment sorting uses

    const bugId = req.bugId;
    // const comment = await dbModule.findCommentByBugId(bugId);
    // res.json(comment);

    let {maxAge, minAge, sortBy, pageSize, pageNumber, } =
    req.query;

  //date creation

  // matching
  const match = { bugId: bugId};

  if (minAge && maxAge) {
    maxAgeDate.setDate(maxAgeDate.getDate() - maxAge);
    minAgeDate.setDate(minAgeDate.getDate() - minAge + 1);
    match.createdDate = { $gte: maxAgeDate, $lt: minAgeDate };
  } else if (maxAge) {
    maxAgeDate.setDate(maxAgeDate.getDate() - maxAge);
    match.createdDate = { $gte: maxAgeDate };
  } else if (minAge) {
    minAgeDate.setDate(minAgeDate.getDate() - minAge + 1);
    match.createdDate = { $lt: minAgeDate };
  }


  //sorting
  let sort = { createdDate: 1 };
  switch (sortBy) {
    case 'newest':
      sort = { createdDate: -1 };
      break;
    case 'oldest':
      sort = { createdDate: 1 };
      break;
  }

  // projection
  const project = { createdDate: 1, commenter: 1, commentText: 1};

  //skip & limit stages
  pageNumber = parseInt(pageNumber) || 1;
  pageSize = parseInt(pageSize) || 100;
  const skip = (pageNumber - 1) * pageSize;
  const limit = pageSize;

  //aggregate pipeline

  const pipeline = [{ $match: match }, { $sort: sort }, { $project: project }, { $skip: skip }, { $limit: limit }];
  debug(pipeline);

  const db = await connect();
  const cursor = db.collection('comment').aggregate(pipeline);
  const results = await cursor.toArray();

  res.send(results);


  } catch (err) {
    next(err);
  }
});

router.get('/:bugId/comment/:commentId', validId('bugId'), validId('commentId'), isLoggedIn(), hasPermission('viewComment'), async (req, res, next) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in!' });
    }

    const bugId = req.bugId;
    const commentId = req.commentId;
    const bug = await dbModule.findBugById(bugId);
    const comment = await dbModule.findCommentById(commentId);
    if (!comment) {
      res.status(404).json({ error: `${commentId} comment not found` });
    } else {
      res.json(comment);
    }
  } catch (err) {
    next(err);
  }
});

router.put('/:bugId/comment/new', validId('bugId'), validBody(commentSchema), hasPermission('insertComment'), isLoggedIn(), async (req, res, next) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in!' });
    }
    const bugId = req.bugId;
    const bug = await dbModule.findBugById(bugId);
    const comment = req.body;
    comment.commenter = { username: req.auth.username, role: req.auth.role, _id: req.auth._id };
    comment._id = newId();
    if (!bug) {
      res.status(404).json({ error: `${bugId} bug not found` });
    } else {
      await dbModule.insertOneComment(bugId, comment);
      res.json({ message: 'Comment inserted.' });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
