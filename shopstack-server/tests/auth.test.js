const db = require('./setup');
const { api, registerCustomer, makeAdmin } = require('./helpers');

beforeAll(db.start); afterAll(db.stop); beforeEach(db.clear);

describe('JWT authentication', () => {
  test('register returns a token and always assigns the customer role', async () => {
    const res = await api().post('/api/auth/register')
      .send({ name: 'X', email: 'x@t.com', password: 'secret123', role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('customer');
  });

  test('login succeeds with correct password and fails with wrong one', async () => {
    await registerCustomer('l@t.com');
    expect((await api().post('/api/auth/login').send({ email: 'l@t.com', password: 'secret123' })).status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email: 'l@t.com', password: 'nope' })).status).toBe(401);
  });

  test('protected routes reject missing and invalid tokens', async () => {
    expect((await api().get('/api/orders/mine')).status).toBe(401);
    expect((await api().get('/api/orders/mine').set('Authorization', 'Bearer bad')).status).toBe(401);
  });

  test('protected route accepts a valid token', async () => {
    const { token } = await registerCustomer();
    expect((await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });
});

describe('role enforcement', () => {
  test('customer cannot create products', async () => {
    const { token } = await registerCustomer();
    const res = await api().post('/api/products').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hack', price: 1, stock: 1 });
    expect(res.status).toBe(403);
  });

  test('admin can create products', async () => {
    const token = await makeAdmin();
    const res = await api().post('/api/products').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mug', price: 299, stock: 10 });
    expect(res.status).toBe(201);
  });

  test('customer cannot list all orders', async () => {
    const { token } = await registerCustomer();
    expect((await api().get('/api/orders').set('Authorization', `Bearer ${token}`)).status).toBe(403);
  });
});
