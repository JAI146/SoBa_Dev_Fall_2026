const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function setup() {
  const storage = () => {
    const values = new Map();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    };
  };
  const localStorage = storage();
  const sessionStorage = storage();
  const window = new EventTarget();
  const modules = new Map();
  const context = vm.createContext({
    window,
    localStorage,
    sessionStorage,
    Event,
    Headers,
    FormData,
    Response,
    Date,
    process,
    navigator: { locks: { request: async (_name, callback) => callback() } },
    fetch: (...args) => context.handleFetch(...args),
  });
  function load(name) {
    if (modules.has(name)) return modules.get(name);
    const filename = path.join(
      __dirname,
      "../apps/dashboard/lib",
      `${name}.ts`,
    );
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const module = { exports: {} };
    modules.set(name, module.exports);
    const requireModule = (id) =>
      id === "@purposemint/contracts"
        ? {
            userPublicSchema: {
              safeParse: (user) => ({ success: Boolean(user?.id) }),
            },
          }
        : load(id.replace("./", ""));
    vm.runInContext(`(function(require,module,exports){${source}\n})`, context)(
      requireModule,
      module,
      module.exports,
    );
    return module.exports;
  }
  const auth = load("auth");
  const activity = load("session-activity");
  const api = load("api-client");
  const user = { id: "admin-test", userType: "admin" };
  auth.saveAuth({ user, accessToken: "old-token" }, false);
  return { context, auth, activity, api, user, localStorage, sessionStorage };
}

test("idle warning at 10 minutes, logout at 12 minutes, precise boundaries", () => {
  const { activity } = setup();
  const last = 1000;
  assert.equal(activity.idleState(last, last + 599999).warning, false);
  assert.equal(activity.idleState(last, last + 600000).warning, true);
  assert.equal(activity.idleState(last, last + 600000).secondsRemaining, 120);
  assert.equal(activity.idleState(last, last + 719999).expired, false);
  assert.equal(activity.idleState(last, last + 720000).expired, true);
  assert.equal(activity.idleState(last, last + 900000).secondsRemaining, 0);
});

test("refresh preserves storage preference and does not reset inactivity", () => {
  for (const remember of [true, false]) {
    const { auth, user, activity, localStorage, sessionStorage } = setup();
    auth.saveAuth({ user, accessToken: "old-token" }, remember);
    const key = activity.activityKey(user.id);
    localStorage.setItem(key, "123");
    assert.equal(
      auth.updateAuth({ user, accessToken: "new-token" }, "old-token"),
      true,
    );
    assert.equal(localStorage.getItem(key), "123");
    assert.equal(
      (remember ? localStorage : sessionStorage).getItem(
        "purposemint_access_token",
      ),
      "new-token",
    );
    assert.equal(
      (remember ? sessionStorage : localStorage).getItem(
        "purposemint_access_token",
      ),
      null,
    );
  }
});

test("simultaneous expired requests share one refresh and retry with the new token", async () => {
  const { context, api, auth, user } = setup();
  let refreshes = 0;
  context.handleFetch = async (url, options) => {
    if (url.endsWith("/auth/refresh")) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return Response.json({ user, accessToken: "new-token", expiresIn: 900 });
    }
    return options.headers.get("Authorization") === "Bearer new-token"
      ? Response.json({ ok: true })
      : Response.json({}, { status: 401 });
  };
  const results = await Promise.all([
    api.apiRequest("/users/me", {}, "old-token"),
    api.apiRequest("/admin/audit-hierarchy", {}, "old-token"),
  ]);
  assert.equal(refreshes, 1);
  assert.ok(results.every((result) => result.ok));
  assert.equal(auth.getToken(), "new-token");
});

test("rejected refresh clears authentication; transient errors do not", async () => {
  for (const status of [401, 503]) {
    const { context, api, auth } = setup();
    context.handleFetch = async (url) =>
      Response.json(
        {},
        { status: url.endsWith("/auth/refresh") ? status : 401 },
      );
    await assert.rejects(api.apiRequest("/users/me", {}, "old-token"));
    assert.equal(auth.getToken(), status === 401 ? null : "old-token");
  }
});

test("permission errors do not refresh or sign out", async () => {
  const { context, api, auth } = setup();
  let requests = 0;
  context.handleFetch = async () => {
    requests++;
    return Response.json({}, { status: 403 });
  };
  await assert.rejects(api.apiRequest("/admin/users", {}, "old-token"));
  assert.equal(requests, 1);
  assert.equal(auth.getToken(), "old-token");
});

test("a refresh finishing after sign out cannot restore authentication", async () => {
  const { context, api, auth, user } = setup();
  context.handleFetch = async (url) => {
    if (url.endsWith("/auth/refresh")) {
      auth.clearAuth();
      return Response.json({ user, accessToken: "new-token" });
    }
    return Response.json({}, { status: 401 });
  };
  await assert.rejects(api.apiRequest("/users/me", {}, "old-token"));
  assert.equal(auth.getToken(), null);
});

test("logout renews an expired access token before revoking the session", async () => {
  const { context, api, user } = setup();
  let logoutCalls = 0;
  context.handleFetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) return Response.json({ user, accessToken: 'new-token' });
    assert.ok(url.endsWith('/auth/logout'));
    logoutCalls++;
    return Response.json({}, { status: options.headers.get('Authorization') === 'Bearer new-token' ? 200 : 401 });
  };
  await api.apiRequest('/auth/logout', { method: 'POST' }, 'old-token');
  assert.equal(logoutCalls, 2);
});

test("a network failure does not clear the session", async () => {
  const { context, api, auth } = setup();
  context.handleFetch = async () => { throw new TypeError('Network offline'); };
  await assert.rejects(api.apiRequest('/users/me', {}, 'old-token'));
  assert.equal(auth.getToken(), 'old-token');
});
