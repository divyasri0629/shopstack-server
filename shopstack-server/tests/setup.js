const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
process.env.JWT_SECRET = 'test_secret';
process.env.RAZORPAY_KEY_SECRET = 'test_rzp_secret';
process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy';

exports.start = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};
exports.clear = async () => {
  for (const c of Object.values(mongoose.connection.collections)) await c.deleteMany({});
};
exports.stop = async () => {
  await mongoose.disconnect();
  await mongod.stop();
};
