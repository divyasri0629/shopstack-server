const db = require('./setup');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const { api, registerCustomer } = require('./helpers');

beforeAll(db.start); afterAll(db.stop); beforeEach(db.clear);

const buy = (token, productId, qty = 1) =>
  api().post('/api/orders').set('Authorization', `Bearer ${token}`)
    .send({ items: [{ productId, qty }] });

describe('server-side pricing (price tampering)', () => {
  test('ignores client-sent total and item price', async () => {
    const { token } = await registerCustomer();
    const p = await Product.create({ name: 'Watch', price: 1000, stock: 5 });
    const res = await api().post('/api/orders').set('Authorization', `Bearer ${token}`)
      .send({ total: 1, items: [{ productId: String(p._id), qty: 2, price: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(2000);
    expect(res.body.items[0].price).toBe(1000);
  });

  test('rejects invalid quantities', async () => {
    const { token } = await registerCustomer();
    const p = await Product.create({ name: 'Pen', price: 10, stock: 5 });
    expect((await buy(token, String(p._id), -3)).status).toBe(400);
    expect((await buy(token, String(p._id), 1.5)).status).toBe(400);
  });

  test("a customer cannot read another customer's order", async () => {
    const a = await registerCustomer(); const b = await registerCustomer();
    const p = await Product.create({ name: 'Bag', price: 500, stock: 5 });
    const order = (await buy(a.token, String(p._id))).body;
    const res = await api().get(`/api/orders/${order._id}`).set('Authorization', `Bearer ${b.token}`);
    expect(res.status).toBe(403);
  });
});

describe('overselling prevention', () => {
  test('10 concurrent buyers for 5 units: exactly 5 succeed, stock ends at 0', async () => {
    const p = await Product.create({ name: 'Console', price: 100, stock: 5 });
    const users = await Promise.all(Array.from({ length: 10 }, () => registerCustomer()));
    const results = await Promise.all(users.map((u) => buy(u.token, String(p._id), 1)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(5);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
    expect((await Product.findById(p._id)).stock).toBe(0);
    expect(await Order.countDocuments()).toBe(5);
  });

  test('failed multi-item order rolls back the stock it reserved', async () => {
    const { token } = await registerCustomer();
    const a = await Product.create({ name: 'A', price: 10, stock: 5 });
    const b = await Product.create({ name: 'B', price: 10, stock: 1 });
    const res = await api().post('/api/orders').set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: String(a._id), qty: 2 }, { productId: String(b._id), qty: 3 }] });
    expect(res.status).toBe(409);
    expect((await Product.findById(a._id)).stock).toBe(5);
    expect((await Product.findById(b._id)).stock).toBe(1);
  });
});
