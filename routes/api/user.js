const debug = require('debug')('app:route:user');
const express = require('express');
const { nanoid } = require('nanoid');
const dbModule = require('../../database');
const { newId, connect } = require('../../database');
const Joi = require('joi');
const validId = require('../../middleware/validId');
const validBody = require('../../middleware/validBody');
const auth = require('../../middleware/auth');
const moment = require('moment'); // require
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('config');
moment().format();

const {
  findRoleByName,
  registerOneUser,
  updateOneUser,
  findUserById,
  findUserByEmail,
  saveEdit,
} = require('../../database');
const isLoggedIn = require('../../middleware/isLoggedIn');
const hasAnyRole = require('../../middleware/hasAnyRole');
const hasPermission = require('../../middleware/hasPermission');
const hasRole = require('../../middleware/hasRole');

const roleSchema = Joi.string().valid(
  // 'Developer',
  // 'Quality Analyst',
  // 'Business Analyst',
  // 'Product Manager',
  // 'Technical Manager'
  'Verified User'
);

const newUserSchema = Joi.object({
  email: Joi.string().trim().min(1).required().email(),
  password: Joi.string().trim().min(1).required(),
  username: Joi.string().trim().min(1).required(),
});

const updateUserSchema = Joi.object({
  email: Joi.string().trim().min(1).email(),
  password: Joi.string().trim().min(1),
  username: Joi.string().trim().min(1),
  role: Joi.alternatives().try(roleSchema, Joi.array().items(roleSchema)),
});

const updateSelfSchema = Joi.object({
  email: Joi.string().trim().min(1).email(),
  password: Joi.string().trim().min(1),
  username: Joi.string().trim().min(1),
  givenName: Joi.string().trim().min(1),
  familyName: Joi.string().trim().min(1),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().min(1).email().required(),
  password: Joi.string().trim().min(1).required(),
});

const router = express.Router();


router.get('/me', isLoggedIn(), async (req, res, next) => {
  try {
    // const users = await dbModule.findAllUsers();
    // res.json(users);
    const userId = newId(req.auth._id);

    const match = {};

    if (userId) {
      match._id = { $eq: userId };
    }

    const project = { role: 1, givenName: 1, familyName: 1, fullName: 1, email: 1, createdDate: 1 };

    const pipeline = [{ $match: match }, { $project: project }];

    const db = await connect();
    const cursor = db.collection('user').aggregate(pipeline);
    const results = await cursor.toArray();

    res.send(results);
  } catch (err) {
    next(err);
  }
});

router.get('/list', isLoggedIn(), hasPermission('viewUser'), async (req, res, next) => {
  try {
    // const users = await dbModule.findAllUsers();
    // res.json(users);
    let { keywords, role, maxAge, minAge, sortBy, pageSize, pageNumber } = req.query;

    // date creation
    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    const maxAgeDate = new Date(today);

    const minAgeDate = new Date(today);

    // match
    const match = {};
    if (keywords) {
      match.$text = { $search: keywords };
    }
    if (role) {
      match.role = { $eq: role };
    }
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

    // sorting

    let sort = { givenName: 1, familyName: 1, createdDate: 1 };
    switch (sortBy) {
      case 'givenName':
        sort = { givenName: 1, familyName: 1, createdDate: 1 };
        break;
      case 'familyName':
        sort = { familyName: 1, givenName: 1, createdDate: 1 };
        break;
      case 'role':
        sort = { role: 1, givenName: 1, familyName: 1, createdDate: 1 };
        break;
      case 'givenName':
        sort = { givenName: 1, createdDate: 1 };
        break;
      case 'newest':
        sort = { createdDate: -1 };
        break;
      case 'oldest':
        sort = { createdDate: 1 };
        break;
    }
    const project = { role: 1, username: 1, email: 1, createdDate: 1 };

    pageNumber = parseInt(pageNumber) || 1;
    pageSize = parseInt(pageSize) || 5;
    const skip = (pageNumber - 1) * pageSize;
    const limit = pageSize;

    const pipeline = [{ $match: match }, { $sort: sort }, { $project: project }, { $skip: skip }, { $limit: limit }];

    const db = await connect();
    const cursor = db.collection('user').aggregate(pipeline);
    const results = await cursor.toArray();

    res.send(results);
  } catch (err) {
    next(err);
  }
});

router.get('/:userId', isLoggedIn(), validId('userId'), hasPermission('viewUser'), async (req, res, next) => {
  try {
    // const userId = req.userId;
    // const user = await dbModule.findUserById(userId);
    // if (!user) {
    //   res.status(404).json({ error: `${userId} user not found` });
    // } else {
    //   res.json(user);
    // }
    const userId = newId(req.params.userId);

    const match = {};

    if (userId) {
      match._id = { $eq: userId };
    }

    const project = { role: 1, username: 1, email: 1, createdDate: 1 };

    const pipeline = [{ $match: match }, { $project: project }];

    const db = await connect();
    const cursor = db.collection('user').aggregate(pipeline);
    const results = await cursor.toArray();

    console.log(results);
    res.send(results);
  } catch (err) {
    next(err);
  }
});

router.post('/register', validBody(newUserSchema), async (req, res, next) => {
  try {
    const user = {
      ...req.body,
      _id: newId(),
      createdDate: new Date(),
    };
    const update = req.body;

    if (await findUserByEmail(user.email)) {
      res.status(400).json({ error: `Email "${user.email}" is already in use!` });
    } else {
      const saltRounds = parseInt(config.get('auth.saltRounds'));
      user.password = await bcrypt.hash(user.password, saltRounds);

      const dbResult = await registerOneUser(user);

      const authPayload = {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        permissions: {},
      };
      const authSecret = config.get('auth.secret');
      const authOptions = { expiresIn: config.get('auth.tokenExpiresIn') };
      const authToken = jwt.sign(authPayload, authSecret, authOptions);

      const cookieOptions = {
        httpOnly: true,
        maxAge: parseInt(config.get('auth.cookieMaxAge')),
      };
      res.cookie('authToken', authToken, cookieOptions);

      // if (Object.keys(update).length > 0) {
      //   update.createdOn = new Date();
      //   update.createdBy = {
      //     _id: req.auth._id,
      //     role: null,
      //   };
      // }

      const edit = {
        timestamp: new Date(),
        op: 'insert',
        col: 'user',
        target: { userId: user._id },
        update,
        auth: req.auth,
      };
      await saveEdit(edit);
      debug('edit saved');

      res.status(200).json({ message: 'User Registered!', userId: user._id, authToken });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/login', validBody(loginSchema), async (req, res, next) => {
  try {
    const login = req.body;
    const user = await findUserByEmail(login.email);
    // const role = await findRoleByName('Business Analyst');
    // debug(role)
    if (user && (await bcrypt.compare(login.password, user.password))) {
      const authPayload = {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      };

      if (user.role) {
        const roles = await Promise.all(user.role.map((roleName) => findRoleByName(roleName)));

        const permissions = {};
        for (const role of roles) {
          if (role && role.permissions) {
            for (const permission in role.permissions) {
              if (role.permissions[permission]) {
                permissions[permission] = true;
              }
            }
          }
        }

        authPayload.permissions = permissions;
        debug(authPayload);
      }

      const authSecret = config.get('auth.secret');
      const authOptions = { expiresIn: config.get('auth.tokenExpiresIn') };
      const authToken = jwt.sign(authPayload, authSecret, authOptions);

      const cookieOptions = {
        httpOnly: true,
        maxAge: parseInt(config.get('auth.cookieMaxAge')),
      };
      res.cookie('authToken', authToken, cookieOptions);

      res.status(200).json({
        message: 'Welcome Back!',
        userId: user._id,
        token: authToken,
      });
    } else {
      res.status(400).json({ error: 'Invalid Credentials' });
    }
  } catch (err) {
    next(err);
  }
});


router.put('/me', validBody(updateSelfSchema), isLoggedIn(), async (req, res, next) => {
  // self-service update
  try {
    const userId = newId(req.auth._id);
    const user = findUserById(userId);
    const update = req.body;

    if (update.password) {
      const saltRounds = parseInt(config.get('auth.saltRounds'));
      update.password = await bcrypt.hash(update.password, saltRounds);

      const authPayload = {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      };

      if (user.role) {
        const roles = await Promise.all(user.role.map((roleName) => findRoleByName(roleName)));

        const permissions = {};
        for (const role of roles) {
          if (role && role.permissions) {
            for (const permission in role.permissions) {
              if (role.permissions[permission]) {
                permissions[permission] = true;
              }
            }
          }
        }

        authPayload.permissions = permissions;
        debug(authPayload);
      }
      const authSecret = config.get('auth.secret');
      const authOptions = { expiresIn: config.get('auth.tokenExpiresIn') };
      const authToken = jwt.sign(authPayload, authSecret, authOptions);

      const cookieOptions = {
        httpOnly: true,
        maxAge: parseInt(config.get('auth.cookieMaxAge')),
      };
      res.cookie('authToken', authToken, cookieOptions);
      debug('authToken', authToken, cookieOptions)
    }

    if (Object.keys(update).length > 0) {
      update.lastUpdatedOn = new Date();
      update.lastUpdatedBy = {
        _id: req.auth._id,
        email: req.auth.email,
        username: req.auth.username,
      };
    }

    const dbResult = await updateOneUser(userId, update);
    debug('update me result:', dbResult);

    const edit = {
      timestamp: new Date(),
      op: 'update',
      col: 'user',
      target: { userId },
      update,
      auth: req.auth,
    };
    await saveEdit(edit);
    debug('edit saved');

    res.status(200).json({ message: 'User Updated!'});
  } catch (err) {
    next(err);
  }
});



router.put('/:userId', validId('userId'), isLoggedIn(), hasPermission('updateAnyUser'), validBody(updateUserSchema), async (req, res, next) => {
    try {
      const userId = req.userId;
      const user = await dbModule.findUserById(userId);
      const update = req.body;

      if (!user) {
        res.status(404).json({ error: `user ${userId} not found` });
      } else {
        const users = await dbModule.updateOneUser(userId, update);
      }
      if (update.password) {
        const saltRounds = parseInt(config.get('auth.saltRounds'));
        update.password = await bcrypt.hash(update.password, saltRounds);
      }
      //if updating a role, turn role into array if it is a string
      if (update.role) {
        if (Array.isArray(update.role)) {
        } else {
          update.role = [update.role];
        }
      }

      if (Object.keys(update).length > 0) {
        update.lastUpdatedOn = new Date();
        update.lastUpdatedBy = {
          _id: req.auth._id,
          email: req.auth.email,
          username: req.auth.username,
          givenName: req.auth.givenName,
          familyName: req.auth.familyName,
          role: req.auth.role,
        };
      }

      const dbResult = await updateOneUser(userId, update);
      debug('update user result:', dbResult);

      const edit = {
        timestamp: new Date(),
        op: 'update',
        col: 'user',
        target: { userId },
        update,
        auth: req.auth,
      };
      await saveEdit(edit);
      debug('edit saved');

      res.status(200).json({ message: `User ${userId} Updated!` });
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/:userId', isLoggedIn(), hasPermission('updateAnyUser'), validId('userId'), async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await dbModule.findUserById(userId);
    if (user) {
      await dbModule.deleteOneUser(userId);
      res.status(200).json({ message: `User ${userId} deleted!`, userId });
      const edit = {
        timestamp: new Date(),
        op: 'delete',
        col: 'user',
        target: { userId },
        auth: req.auth,
      };
      await saveEdit(edit);
      debug('edit saved');
    } else {
      res.status(404).json({ error: `user ${userId} not found` });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
