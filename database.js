const { MongoClient, ObjectId } = require('mongodb');
const config = require('config');
const debug = require('debug')('app:database');

/** Generate/Parse an ObjectId */
const newId = (str) => ObjectId(str);

/** Global variable storing the open connection, do not use it directly. */
let _db = null;

/** Connect to the database */
async function connect() {
  if (!_db) {
    const dbUrl = config.get('db.url');
    const dbName = config.get('db.name');
    const client = await MongoClient.connect(dbUrl);
    _db = client.db(dbName);
    debug('Connected.');
  }
  return _db;
}

/** Connect to the database and verify the connection */
async function ping() {
  const db = await connect();
  await db.command({ ping: 1 });
  debug('Ping.');
}

async function findAllUsers() {
  const db = await connect();
  const users = await db.collection('user').find({}).toArray();
  /// ....
  return users;
}

async function findAllBugs() {
  const db = await connect();
  const bugs = await db.collection('bug').find({}).toArray();
  /// ....
  return bugs;
}



async function findUserById(userId) {
  const db = await connect();
  const user = await db.collection('user').findOne({ _id: { $eq: userId } });
  return user;
}

async function findCommentById(commentId) {
  const db = await connect();
  const comment = await db.collection('comment').findOne({ _id: { $eq: commentId } });
  return comment;
}

async function findTestCaseById(testId) {
  const db = await connect();
  const testCase = await db.collection('bug').findOne({ 'testCase._id': { $eq: testId } });
  return testCase;
}

async function findCommentByBugId(bugId) {
  const db = await connect();
  const comment = await db
    .collection('comment')
    .find({ bugId: { $eq: bugId } })
    .toArray()
  return comment;
}

async function findRoleByName(roleName) {
  const db = await connect();
  const role = await db.collection('roles').findOne({name: {$eq: roleName}});
  return role;
}

async function findBugById(bugId) {
  const db = await connect();
  const bug = await db.collection('bug').findOne({ _id: { $eq: bugId } });
  return bug;
}

async function insertOneComment(bugId, comment) {
  const db = await connect();
  await db.collection('comment').insertOne({
    ...comment,
    bugId,
    createdDate: new Date(),
  });
}

async function insertOneBug(bug, author) {
  const db = await connect();
  await db.collection('bug').insertOne({
    ...bug,
    createdDate: new Date(),
  });
}

async function updateOneBug(bugId, update) {
  const db = await connect();
  await db.collection('bug').updateOne(
    { _id: { $eq: bugId } },
    {
      $set: {
        ...update,
        lastUpdated: new Date(),
      },
    }
  );
}

async function classifyBug(bugId, classification) {
  const db = await connect();
  await db.collection('bug').updateOne(
    { _id: { $eq: bugId } },
    {
      $set: {
        ...classification,
        classifiedOn: new Date(),
        lastUpdated: new Date(),
      },
    }
  );
}

async function executeTestCase(testId, executed, bugId) {
  const db = await connect();
  await db.collection('bug').updateOne(
    { _id: bugId, 'testCase._id': testId },
    {
      $set: {
        'testCase.$.executed': executed,
        classifiedOn: new Date(),
        lastUpdated: new Date(),
      },
    }
  );
}

// async function findUserNameByUserId(userId){
//   const db = await connect();
//   const userName = await db.collection('user').find({userName: {$eq: userName}}).toArray();
//   return userName;
// }

async function assignBug(bugId, assignedTo) {
  const db = await connect();
  await db.collection('bug').updateOne(
    { _id: { $eq: bugId } },
    {
      $set: {
        assignee: assignedTo,
        assignedOn: new Date(),
        lastUpdated: new Date(),
      },
    }
  );
}

async function closeOneBug(bugId, closed) {
  const db = await connect();
  await db.collection('bug').updateOne(
    { _id: { $eq: bugId } },
    {
      $set: {
        closed: closed,

        closedOn: closed ? new Date() : null,
        lastUpdated: new Date(),
      },
    }
  );
}
async function openOneBug(bugId, open) {
  const db = await connect();
  await db.collection('bug').updateOne(
    { _id: { $eq: bugId } },
    {
      $set: {
        open: open,

        lastUpdated: new Date(),
      },
    }
  );
}

// async function userLogin(email, password){
//   const db = await connect();
//   const user = await db.collection('user').findOne({email: {$eq: email}, password: {$eq: password}});
//   //const user = await db.collection('user').findOne({ $and: [{email: {$eq: email}}, {password: {$eq: password}}] });
//   //const user = await db.collection('user').findOne({email: {$eq: email}} && {password: {$eq: password}});
//   //const user = (await db.collection('user').findOne({email: {$eq: email}})) && (await db.collection('user').findOne({password: {$eq: password}}));
//   return user;
// }

async function findUserByEmail(email) {
  const db = await connect();
  const user = await db.collection('user').findOne({ email: { $eq: email } });
  return user;
}

async function registerOneUser(user) {
  const db = await connect();
  await db.collection('user').insertOne({
    ...user,
    createdDate: new Date(),
  });
}



async function updateOneUser(userId, update) {
  const db = await connect();
  await db.collection('user').updateOne(
    { _id: { $eq: userId } },
    {
      $set: {
        ...update,
      },
    }
  );
}

async function updateOneTestCase( title, body, bugId, testId, testerName, testerId) {
  const db = await connect();
  await db.collection('bug').updateOne(
    { _id: bugId, 'testCase._id': testId },
    {
      $set: {
        'testCase.$.body': title,
        'testCase.$.title': body,
        'testCase.$.testerName': testerName,
        'testCase.$.testerId': testerId,
        lastUpdated: new Date(),
      },
    }
  );
}

async function deleteOneUser(userId) {
  const db = await connect();
  await db.collection('user').deleteOne({ _id: { $eq: userId } });
}

async function deleteOneTestCase(bugId, testId, testCase) {
  const db = await connect(); //$pull
  await db.collection('bug').updateOne(
    { _id: bugId, 'testCase._id': testId },
    {
      $set: {
        $pull: {
          testCase: testCase,
        },
      },
    }
  );
} 


async function saveEdit(edit) {
  const db = await connect();
  return await db.collection('edits').insertOne(edit);
}


// export functions
module.exports = {
  findRoleByName,
  openOneBug,
  saveEdit,
  executeTestCase,
  deleteOneTestCase,
  updateOneTestCase,
  insertOneTestCase,
  findTestCaseById,
  insertOneComment,
  findCommentByBugId,
  findCommentById,
  closeOneBug,
  assignBug,
  classifyBug,
  updateOneBug,
  insertOneBug,
  findBugById,
  findAllBugs,
  deleteOneUser,
  updateOneUser,
  findUserByEmail,
  registerOneUser,
  findUserById,
  findAllUsers,
  newId,
  connect,
  ping,
  // FIXME: remember to export your functions
};

// test the database connection
ping();
