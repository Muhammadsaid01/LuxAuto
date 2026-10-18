const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
// Set every credential before importing dotenv consumers; never read/use the application's database.
process.env.NODE_ENV = 'test';
process.env.SECRET_TOKEN = require('node:crypto').randomBytes(32).toString('hex');
process.env.SESSION_SECRET = require('node:crypto').randomBytes(32).toString('hex');
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.MONGO_URL = 'mongodb://127.0.0.1:1/unused';
require('ts-node/register');
const mongoose = require('mongoose');
mongoose.set('strictQuery', true);
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const Member = require('../src/schema/Member.model').default;
const Product = require('../src/schema/Product.model').default;
const Order = require('../src/schema/Order.model').default;
const OrderItem = require('../src/schema/OrderItem.model').default;
const MemberService = require('../src/models/Member.service').default;
const OrderService = require('../src/models/Order.service').default;
const router = require('../src/router').default;
const adminController = require('../src/controllers/dealership.controller').default;
const { authCookieOptions } = require('../src/libs/utils/auth-cookie');
const members = new MemberService();
const orders = new OrderService();
let mongod, directory, server, base, user, userCookie, isolatedUri;
const originalCwd = process.cwd();
const password = require('node:crypto').randomBytes(16).toString('hex');
async function freePort() {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const port = socket.address().port; await new Promise(resolve => socket.close(resolve)); return port;
}
async function request(route, { method = 'GET', body, cookie, form, origin } = {}) {
  const headers = {};
  if (origin) headers.Origin = origin;
  if (cookie) headers.Cookie = cookie;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + route, { method, headers, body: form || (body ? JSON.stringify(body) : undefined), redirect: 'manual' });
  const type = response.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await response.json() : await response.text();
  return { status: response.status, headers: response.headers, data };
}
async function car(overrides = {}) {
  return Product.create({ productName: 'Isolated test vehicle', productPrice: 49.95, productCollection: 'SEDAN',
    productDesc: 'Temporary test fixture', productMileage: 0, productYear: 2026, ...overrides });
}
before(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'luxavto-tests-'));
  const port = await freePort();
  mongod = spawn(process.env.MONGOD_BIN || 'mongod', ['--dbpath', directory, '--port', String(port), '--bind_ip', '127.0.0.1', '--replSet', 'luxavtoTest', '--logpath', path.join(directory, 'mongo.log')], { stdio: 'ignore' });
  let spawnError;
  mongod.on('error', error => { spawnError = error; });
  const uri = `mongodb://127.0.0.1:${port}/luxavto_regression`;
  let admin;
  for (let i = 0; i < 100; i++) {
    if (spawnError || mongod.exitCode !== null) throw new Error('Isolated mongod could not start');
    try { admin = await mongoose.mongo.MongoClient.connect(uri + '?directConnection=true', { serverSelectionTimeoutMS: 200 }); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(admin, 'isolated MongoDB started');
  await admin.db('admin').command({ replSetInitiate: { _id: 'luxavtoTest', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
  await admin.close();
  isolatedUri = uri + '?replicaSet=luxavtoTest';
  fs.mkdirSync(path.join(directory, 'uploads', 'members'), { recursive: true });
  process.chdir(directory);
  await mongoose.connect(uri + '?replicaSet=luxavtoTest', { serverSelectionTimeoutMS: 20000 });
  await Promise.all([Member.init(), Product.init(), Order.init(), OrderItem.init()]);
  const app = express(); app.use(express.json()); app.use(cookieParser()); app.use(router);
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 45000 });
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongod && mongod.exitCode === null) { mongod.kill('SIGTERM'); await once(mongod, 'exit'); }
  process.chdir(originalCwd);
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
});

test('signup ignores privilege, identity and operator injection; returns only HttpOnly authentication', async () => {
  const suppliedId = new mongoose.Types.ObjectId();
  const response = await request('/member/signup', { method: 'POST', body: {
    memberNick: 'isolated-user', memberPhone: 'test-phone-1', memberPassword: password,
    memberType: 'ADMIN', memberStatus: 'BLOCK', memberPoints: 9000, _id: suppliedId,
    memberImage: '/forged.png', $set: { memberType: 'ADMIN' },
  } });
  assert.equal(response.status, 201);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.doesNotMatch(cookie, /; Secure/);
  assert.equal(response.data.accessToken, undefined);
  user = response.data.member; userCookie = cookie.split(';')[0];
  assert.equal(user.memberType, 'USER'); assert.equal(user.memberStatus, 'ACTIVE'); assert.equal(user.memberPoints, 0);
  assert.notEqual(user._id, String(suppliedId)); assert.equal(user.memberImage, undefined);
  assert.ok(!user.memberPassword);
  const token = decodeURIComponent(userCookie.split('=')[1]);
  const payload = jwt.decode(token); assert.equal(payload.memberPhone, undefined); assert.equal(payload.memberPassword, undefined);
});
test('login, session restore and profile update reject protected fields and image spoofing', async () => {
  const login = await request('/member/login', { method: 'POST', body: { memberNick: user.memberNick, memberPassword: password } });
  assert.equal(login.status, 200); assert.equal(login.data.member.memberPassword, undefined);
  assert.equal((await request('/member/detail', { cookie: userCookie })).data._id, user._id);
  const form = new FormData();
  for (const [key, value] of Object.entries({ memberNick: 'updated-user', memberPhone: 'test-phone-1', memberAddress: 'Test address',
    memberDesc: 'Updated profile', memberType: 'ADMIN', memberStatus: 'DELETE', memberPoints: '500',
    memberPassword: 'forged-password', memberImage: '/forged.png', _id: String(new mongoose.Types.ObjectId()) })) form.append(key, value);
  const response = await request('/member/update', { method: 'POST', cookie: userCookie, form });
  assert.equal(response.status, 200); assert.equal(response.data.memberAddress, 'Test address');
  const current = await Member.findById(user._id).lean();
  assert.equal(current.memberType, 'USER'); assert.equal(current.memberStatus, 'ACTIVE'); assert.equal(current.memberPoints, 0);
  assert.equal(current.memberImage, undefined);
  assert.equal((await members.login({ memberNick: 'updated-user', memberPassword: password }))._id.toString(), user._id);
  await assert.rejects(members.updateMember(user, { memberNick: { $ne: '' } }));
});
test('protected APIs recheck blocked, deleted and missing accounts despite an existing valid token', async () => {
  for (const status of ['BLOCK', 'DELETE']) {
    await Member.updateOne({ _id: user._id }, { memberStatus: status });
    assert.equal((await request('/member/detail', { cookie: userCookie })).status, 401);
    assert.equal((await request('/order/all?page=1&limit=5&orderStatus=PENDING', { cookie: userCookie })).status, 401);
    assert.equal((await request('/member/login', { method: 'POST', body: { memberNick: 'updated-user', memberPassword: password } })).status, status === 'BLOCK' ? 403 : 404);
  }
  await Member.updateOne({ _id: user._id }, { memberStatus: 'ACTIVE' });
  const missing = jwt.sign({ _id: String(new mongoose.Types.ObjectId()) }, process.env.SECRET_TOKEN);
  assert.equal((await request('/member/detail', { cookie: `accessToken=${missing}` })).status, 401);
  assert.equal((await request('/member/detail', { cookie: 'accessToken=invalid' })).status, 401);
});
test('production cookie settings require secure cross-site cookies, logout clears the same path', async () => {
  process.env.NODE_ENV = 'production'; delete process.env.COOKIE_SECURE;
  assert.equal(authCookieOptions().secure, true); assert.equal(authCookieOptions().httpOnly, true);
  process.env.COOKIE_SAME_SITE = 'none'; assert.equal(authCookieOptions().sameSite, 'none');
  process.env.COOKIE_SECURE = 'false'; assert.throws(authCookieOptions);
  process.env.NODE_ENV = 'test'; process.env.COOKIE_SAME_SITE = 'lax';
  const response = await request('/member/logout', { method: 'POST', cookie: userCookie });
  assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /Path=\/; Expires=/);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
});
test('admin sessions recheck database status and role', async () => {
  let next = false, redirected = false;
  await adminController.verifyAdmin({ session: { member: { ...user, memberType: 'ADMIN' } } },
    { redirect() { redirected = true; } }, () => { next = true; });
  assert.equal(next, false); assert.equal(redirected, true);
});
test('order totals and item snapshots use database prices, cents and delivery rules', async () => {
  const product = await car();
  const response = await request('/order/create', { method: 'POST', cookie: userCookie, body: [
    { productId: String(product._id), itemQuantity: 2, itemPrice: 0.01, orderId: String(new mongoose.Types.ObjectId()) },
  ] });
  assert.equal(response.status, 201); assert.equal(response.data.orderTotal, 104.9); assert.equal(response.data.orderDelivery, 5);
  const item = await OrderItem.findOne({ orderId: response.data._id }).lean();
  assert.equal(item.itemPrice, 49.95); assert.equal(item.itemQuantity, 2);
  const threshold = await car({ productPrice: 100 });
  const free = await orders.createOrder(user, [{ productId: threshold._id, itemQuantity: 1, itemPrice: -99 }]);
  assert.equal(free.orderDelivery, 0); assert.equal(free.orderTotal, 100);
});
test('invalid quantities, duplicate/missing/unavailable products and invalid DB prices leave no partial orders', async () => {
  const product = await car();
  const before = await Order.countDocuments();
  for (const quantity of [0, -1, 1.5, '2', null, 101, Number.MAX_SAFE_INTEGER]) {
    await assert.rejects(orders.createOrder(user, [{ productId: product._id, itemQuantity: quantity }]));
  }
  await assert.rejects(orders.createOrder(user, []));
  await assert.rejects(orders.createOrder(user, [{ productId: 'invalid', itemQuantity: 1 }]));
  await assert.rejects(orders.createOrder(user, [{ productId: new mongoose.Types.ObjectId(), itemQuantity: 1 }]));
  await assert.rejects(orders.createOrder(user, [1, 2].map(() => ({ productId: product._id, itemQuantity: 1 }))));
  for (const status of ['PAUSE', 'SOLD', 'RESERVED', 'DELETE']) {
    const unavailable = await car({ productStatus: status });
    await assert.rejects(orders.createOrder(user, [{ productId: unavailable._id, itemQuantity: 1 }]));
  }
  const invalid = await car({ productPrice: -1 });
  await assert.rejects(orders.createOrder(user, [{ productId: invalid._id, itemQuantity: 1 }]));
  assert.equal(await Order.countDocuments(), before);
});
test('failed item writes roll back the order transaction', async () => {
  const product = await car(), before = await Order.countDocuments();
  const original = OrderItem.insertMany;
  OrderItem.insertMany = async () => { throw new Error('Isolated simulated write failure'); };
  try { await assert.rejects(orders.createOrder(user, [{ productId: product._id, itemQuantity: 1 }])); }
  finally { OrderItem.insertMany = original; }
  assert.equal(await Order.countDocuments(), before);
});
test('concurrent confirmations award exactly once; owner and status transitions are enforced', async () => {
  const product = await car();
  const order = await orders.createOrder(user, [{ productId: product._id, itemQuantity: 1 }]);
  const input = { orderId: String(order._id), orderStatus: 'PROCESS' };
  await assert.rejects(orders.updateOrder(user, { ...input, orderStatus: 'FINISH' }));
  await assert.rejects(orders.updateOrder({ ...user, _id: new mongoose.Types.ObjectId() }, input));
  const points = (await Member.findById(user._id)).memberPoints;
  await Promise.all(Array.from({ length: 4 }, () => orders.updateOrder(user, input)));
  assert.equal((await Member.findById(user._id)).memberPoints, points + 1);
  await orders.updateOrder(user, input);
  assert.equal((await Member.findById(user._id)).memberPoints, points + 1);
  await orders.updateOrder(user, { ...input, orderStatus: 'FINISH' });
  for (const status of ['PROCESS', 'PENDING', 'DELETE', 'CANCELED', 'invalid', '__proto__']) {
    await assert.rejects(orders.updateOrder(user, { ...input, orderStatus: status }));
  }
  const canceled = await orders.createOrder(user, [{ productId: product._id, itemQuantity: 1 }]);
  await orders.updateOrder(user, { orderId: String(canceled._id), orderStatus: 'DELETE' });
  await assert.rejects(orders.updateOrder(user, { orderId: String(canceled._id), orderStatus: 'PROCESS' }));
});
test('points failure rolls back status, making a later retry safe', async () => {
  const product = await car();
  const order = await orders.createOrder(user, [{ productId: product._id, itemQuantity: 1 }]);
  const input = { orderId: String(order._id), orderStatus: 'PROCESS' };
  const original = Member.updateOne;
  Member.updateOne = () => ({ exec: async () => { throw new Error('Isolated simulated points failure'); } });
  try { await assert.rejects(orders.updateOrder(user, input)); }
  finally { Member.updateOne = original; }
  assert.equal((await Order.findById(order._id)).orderStatus, 'PENDING');
  await orders.updateOrder(user, input);
});
test('catalog, detail and own orders connect through the actual HTTP router', async () => {
  const product = await car({ productCollection: 'SPORTS_CAR', productName: 'Sports fixture' });
  const list = await request('/product/all?page=1&limit=8&order=createdAt&productCollection=SPORTS_CAR&search=Sports');
  assert.equal(list.status, 200); assert.ok(list.data.some(p => p._id === String(product._id)));
  const detail = await request(`/product/${product._id}`); assert.equal(detail.status, 200);
  const paused = await car({ productStatus: 'PAUSE' });
  assert.equal((await request(`/product/${paused._id}`)).status, 404);
  const own = await request('/order/all?page=1&limit=50&orderStatus=PENDING', { cookie: userCookie });
  assert.equal(own.status, 201); assert.ok(own.data.every(order => order.memberId === user._id));
  assert.equal((await request('/member/Uzavto')).status, 404); // No admin fixture exists.
});


test('profile accepts a real uploaded image while ignoring a forged body path', async () => {
  const form = new FormData();
  form.append('memberNick', 'updated-user');
  form.append('memberPhone', 'test-phone-1');
  form.append('memberImage', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'fixture.png');
  const response = await request('/member/update', { method: 'POST', cookie: userCookie, form });
  assert.equal(response.status, 200);
  assert.match(response.data.memberImage, /^uploads\/members\/[^/]+\.png$/);
  assert.ok(fs.existsSync(response.data.memberImage));
});

test('profile rejects unsupported, spoofed and oversized images without changing the saved image or disk', async () => {
  const before = await Member.findById(user._id).lean();
  const imageDirectory = path.join(directory, 'uploads', 'members');
  const files = fs.readdirSync(imageDirectory).sort();
  for (const [filename, type, bytes, message] of [
    ['fixture.txt', 'text/plain', Buffer.from('not an image'), /jpeg, jpg, png/],
    ['fixture.png', 'image/png', Buffer.from('not an image'), /not a valid JPEG or PNG/],
    ['fixture.png', 'image/png', Buffer.alloc(5 * 1024 * 1024 + 1), /5 MiB or smaller/],
  ]) {
    const form = new FormData();
    form.append('memberImage', new Blob([bytes], { type }), filename);
    const response = await request('/member/update', { method: 'POST', cookie: userCookie, form });
    assert.equal(response.status, 400);
    assert.match(response.data.message, message);
    assert.equal((await Member.findById(user._id).lean()).memberImage, before.memberImage);
    assert.deepEqual(fs.readdirSync(imageDirectory).sort(), files);
  }
});

test('failed profile update removes only the new upload and retains the old photo', async () => {
  const before = await Member.findById(user._id).lean();
  const imageDirectory = path.join(directory, 'uploads', 'members');
  const files = fs.readdirSync(imageDirectory).sort();
  const other = await members.signup({ memberNick: 'photo-conflict', memberPhone: 'photo-conflict-phone', memberPassword: password });
  const form = new FormData();
  form.append('memberPhone', other.memberPhone);
  form.append('memberImage', new Blob([fs.readFileSync(before.memberImage)], { type: 'image/png' }), 'new.png');
  const response = await request('/member/update', { method: 'POST', cookie: userCookie, form });
  assert.equal(response.status, 400);
  assert.match(response.data.message, /already in use/);
  assert.equal((await Member.findById(user._id).lean()).memberImage, before.memberImage);
  assert.ok(fs.existsSync(before.memberImage));
  assert.deepEqual(fs.readdirSync(imageDirectory).sort(), files);
});

test('built production server serves admin assets and authenticates against only the isolated database', async () => {
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'dist', 'server.js')], {
    cwd: directory,
    env: { ...process.env, MONGO_URL: isolatedUri, PORT: String(port), NODE_ENV: 'production', COOKIE_SECURE: 'false' },
    stdio: 'ignore',
  });
  const originalBase = base;
  try {
    base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error('Production server stopped before listening');
      try { ready = (await request('/js/product.js')).status === 200; if (ready) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true);
    assert.equal((await request('/admin/login')).status, 200);
    assert.equal((await request('/member/logout', { method: 'POST', origin: 'https://untrusted.example' })).status, 403);
    const allowed = await request('/member/logout', { method: 'POST', origin: 'http://localhost:3000' });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
    const login = await request('/member/login', { method: 'POST', body: { memberNick: 'updated-user', memberPassword: password } });
    assert.equal(login.status, 200); assert.match(login.headers.get('set-cookie'), /HttpOnly/);
    const detail = await request('/member/detail', { cookie: login.headers.get('set-cookie').split(';')[0] });
    assert.equal(detail.status, 200); assert.equal(detail.data._id, user._id);
    const productsTemplate = fs.readFileSync(path.join(__dirname, '..', 'dist', 'views', 'products.ejs'), 'utf8');
    assert.ok(productsTemplate.includes('/js/product.js'));
    assert.ok(productsTemplate.includes('value="SPORTS_CAR"'));
  } finally {
    base = originalBase;
    if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
  }
}, { timeout: 30000 });

test('canonical dealership endpoint and admin bootstrap use server-controlled fields and current account status', async () => {
  const admin = await members.processSignup({ memberNick: 'isolated-admin', memberPhone: 'test-admin-phone', memberPassword: password,
    memberType: 'USER', memberStatus: 'BLOCK', memberPoints: 999, memberImage: '/forged.png' });
  assert.equal(admin.memberType, 'ADMIN'); assert.equal(admin.memberStatus, 'ACTIVE');
  assert.equal(admin.memberPoints, 0); assert.equal(admin.memberImage, undefined);
  await assert.rejects(members.processSignup({ memberNick: 'second-admin', memberPhone: 'second-admin-phone', memberPassword: password }));
  const response = await request('/member/Uzavto');
  assert.equal(response.status, 200); assert.equal(response.data._id, String(admin._id));
  assert.equal(response.data.memberPassword, undefined);
  let permitted = false;
  await adminController.verifyAdmin({ session: { member: admin } }, { redirect() {} }, () => { permitted = true; });
  assert.equal(permitted, true);
  await Member.updateOne({ _id: admin._id }, { memberStatus: 'BLOCK' });
  permitted = false;
  let redirected = false;
  await adminController.verifyAdmin({ session: { member: admin } }, { redirect() { redirected = true; } }, () => { permitted = true; });
  assert.equal(permitted, false); assert.equal(redirected, true);
});

test('catalog exposes exact totals, paginates consistently and treats regex punctuation literally', async () => {
  for (const [name, price] of [['Pagination fixture A', 30], ['Pagination fixture B', 10], ['Pagination fixture C', 20]]) {
    await car({ productName: name, productPrice: price });
  }
  const first = await request('/product/all?page=1&limit=2&order=productPrice&search=Pagination%20fixture');
  assert.equal(first.status, 200); assert.equal(first.headers.get('x-total-count'), '3');
  assert.deepEqual(first.data.map(item => item.productPrice), [10, 20]);
  const second = await request('/product/all?page=2&limit=2&order=productPrice&search=Pagination%20fixture');
  assert.equal(second.headers.get('x-total-count'), '3'); assert.equal(second.data.length, 1);
  await car({ productName: 'Literal [Car]' });
  const literal = await request('/product/all?page=1&limit=8&order=createdAt&search=%5B');
  assert.equal(literal.status, 200); assert.equal(literal.data.length, 1);
  for (const query of ['page=0&limit=8', 'page=1&limit=0', 'page=1.5&limit=8', 'page=1&limit=101']) {
    assert.equal((await request(`/product/all?${query}&order=createdAt`)).status, 400);
  }
});


test('duplicate profile identity returns a validation error without changing the account', async () => {
  const before = await Member.findById(user._id).lean();
  const form = new FormData();
  form.append('memberNick', 'updated-user');
  form.append('memberPhone', 'test-admin-phone');
  const response = await request('/member/update', { method: 'POST', cookie: userCookie, form });
  assert.equal(response.status, 400);
  assert.equal(response.data.message, 'The nickname or phone number is already in use.');
  assert.equal((await Member.findById(user._id).lean()).memberPhone, before.memberPhone);
});
