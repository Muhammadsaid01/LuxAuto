# LuxAvto backend

Node.js/TypeScript, Express, Mongoose; React API and EJS admin panel.

## Run

Copy `.env.example` to `.env` and supply independent random `SECRET_TOKEN` and
`SESSION_SECRET` values. Never commit or log these values. Existing `.env` files
are not changed by the fixes. `npm run start:dev` runs source; `npm run build`
compiles TypeScript and copies EJS/static assets; `npm start` runs `dist/server.js`.
The default server fallback is 3003, so set `PORT=3004` to match the existing frontend.
Create writable `uploads/members` and `uploads/products` directories in the working directory.

Orders and points now use MongoDB transactions: MongoDB must be a replica set
(including a single-node local replica set) or a sharded cluster. A standalone
MongoDB server cannot safely run these operations. There is no non-atomic fallback.
Provision a separate local development replica set rather than modifying production data.

## Cookies and frontend

The current local deployment is frontend `http://localhost:3000`, API
`http://localhost:3004`: `HttpOnly`, `SameSite=Lax`, `Secure=false`, host-only cookies.
Use `NODE_ENV=production` for HTTPS deployment (`Secure=true` by default), and
configure `FRONTEND_ORIGIN` to the frontend's exact origin. An explicit
`COOKIE_SECURE` overrides the default; HTTP should only be used for local development.
State-changing browser requests also check their Origin against the configured frontend or API origin.
Different sites require HTTPS, `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`.
Configure `TRUST_PROXY=1` only behind a trusted single reverse proxy.
Login/signup return the member, with the token only in the HttpOnly cookie.
The React context restores the session using `/member/detail`, never cookie JS access.
The existing public dealership endpoint remains `/member/Uzavto`.

## Validation and order behavior

Public signup accepts nickname, phone and password; the server assigns USER,
ACTIVE and zero points. Profile edits accept nickname, phone, address, description
and an image path produced by the upload middleware. Body-supplied roles, status,
points, password, IDs, operators and image paths cannot change those fields.
The initial admin bootstrap remains a separate server-controlled flow, available
only while no admin exists; subsequent admin signup is rejected.

Orders require 1–100 distinct active products and integer quantities 1–100 per
product (the current model has no inventory quantity). Database prices are
snapshotted in cents; delivery remains $5 below $100 and free otherwise.
The client-supplied price is ignored. Creation and item writes commit together.
The allowed transitions are PENDING -> PROCESS, PENDING -> DELETE, and
PROCESS -> FINISH. Repeating the same completed transition is idempotent.
Status changes and confirmation points commit in one transaction, so concurrent
requests/retries award at most once. Existing orders/points are not migrated.

## Regression tests

`npm test` builds the backend and runs Node's test runner. Requirements: Node 20+
and a local `mongod` executable (or set `MONGOD_BIN`). Tests start a temporary
single-node replica set on a random loopback port, use a separate database and
random test-only credentials, and remove their files/processes afterwards.
They never connect to the application's MONGO_URL, and need permission to bind
loopback sockets. Coverage includes field injection, account revocation, cookies,
real multipart uploads, database pricing, unavailable products, rollback,
concurrent transitions, and the built production HTTP server/admin assets.

Payment is still a status confirmation without a payment provider. The frontend
contact form still has no contact service; neither was implemented in this change.

## Local replica set setup

For a new local development database (not an existing production instance), run
this in the first terminal. Keep mongod in the foreground; `--fork` is not
supported by the installed MongoDB build on macOS:

```sh
mkdir -p /tmp/luxavto-dev/db
mongod --dbpath /tmp/luxavto-dev/db --port 27027 --bind_ip 127.0.0.1 --replSet luxavtoDev --logpath /tmp/luxavto-dev/mongo.log
```

In a second terminal, initialize the replica set once:

```sh
mongosh 'mongodb://127.0.0.1:27027/?directConnection=true' --eval 'rs.initiate({_id:"luxavtoDev",members:[{_id:0,host:"127.0.0.1:27027"}]})'
```

Set `MONGO_URL=mongodb://127.0.0.1:27027/luxavto_dev?replicaSet=luxavtoDev`
in the backend `.env` (the set name and port must match). Wait for
`mongosh 'mongodb://127.0.0.1:27027/?directConnection=true' --eval 'db.hello().isWritablePrimary'`
to report `true`, then run the backend from its project directory after creating
`uploads/members` and `uploads/products`. This local setup binds only to loopback.
`npm test` provisions and removes its own isolated replica set automatically;
it does not need this development database.

The React app and API must use the same hostname for the current SameSite=Lax
cookie setup: use both `localhost` or both `127.0.0.1`. If port 3000 is occupied,
set an explicit frontend port and set backend `FRONTEND_ORIGIN` to that exact
origin before starting it. For example frontend port 3010 and API port 3014 use
`FRONTEND_ORIGIN=http://127.0.0.1:3010` and frontend
`REACT_APP_API_URL=http://127.0.0.1:3014`. Restart the API after backend changes;
rebuild/reload a statically served frontend after frontend changes.

The catalog keeps its array response and exposes matching totals in
`X-Total-Count`, including that header in CORS exposed headers.
