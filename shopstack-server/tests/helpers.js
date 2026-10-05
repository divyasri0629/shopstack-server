const request = require('supertest');
const User = require('../src/models/User');
const app = require('../src/app');

exports.api = () => request(app);

exports.registerCustomer = async (email = `c${Date.now()}${Math.random()}@t.com`) => {
  const res = await request(app).post('/api/auth/register')
    .send({ name: 'Cust', email, password: 'secret123' });
  return { token: res.body.token, id: res.body.user.id, email };
};

exports.makeAdmin = async () => {
  const email = `a${Date.now()}${Math.random()}@t.com`;
  await User.create({ name: 'Admin', email, password: 'secret123', role: 'admin' });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'secret123' });
  return res.body.token;
};
