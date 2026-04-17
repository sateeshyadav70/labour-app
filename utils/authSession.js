const sessionMaxAge = 30 * 24 * 60 * 60 * 1000;

const getSessionAuth = (req) => {
  if (!req || !req.session) {
    return null;
  }

  return req.session.auth || null;
};

const persistAuthSession = (req, payload) => {
  if (!req || !req.session) {
    return Promise.resolve(null);
  }

  req.session.auth = {
    accountType: payload.accountType || null,
    accountId: payload.accountId ? String(payload.accountId) : null,
    email: payload.email || null,
    name: payload.name || null,
  };

  if (req.session.cookie) {
    req.session.cookie.maxAge = sessionMaxAge;
  }

  if (typeof req.session.save !== "function") {
    return Promise.resolve(req.session.auth);
  }

  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(req.session.auth);
    });
  });
};

const clearAuthSession = (req) => {
  if (!req || !req.session) {
    return Promise.resolve();
  }

  if (typeof req.session.destroy !== "function") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

module.exports = {
  clearAuthSession,
  getSessionAuth,
  persistAuthSession,
  sessionMaxAge,
};
