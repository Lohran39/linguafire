const jwt = require('jsonwebtoken');

function isGoogleOAuthConfigured(env = process.env) {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;

  return !!(
    clientId && clientSecret &&
    clientId !== 'seu-google-client-id-aqui' &&
    clientId !== 'SUA_CLIENT_ID_DO_GOOGLE' &&
    clientSecret !== 'seu-google-client-secret-aqui' &&
    clientSecret !== 'SUA_CLIENT_SECRET_DO_GOOGLE'
  );
}

function encodeOAuthState(payload = {}) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeOAuthState(rawState = '') {
  if (!rawState) return {};
  try {
    return JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8'));
  } catch (_error) {
    return {};
  }
}

function redirectWithBaseUrl(res, baseUrl, params) {
  const query = new URLSearchParams(params).toString();
  res.redirect(`${baseUrl}/?${query}`);
}

function setupGoogleAuthRoutes(app, deps = {}) {
  const {
    passport,
    GoogleStrategy,
    jwtSecret,
    baseUrl,
    isProduction = false,
    getCookieToken,
    setAuthCookie,
    supabaseFindUserByGoogleOrEmail,
    supabaseGetUserById,
    supabaseCreateUser,
    supabaseUpdateGoogleLink,
    logger = console,
    env = process.env
  } = deps;

  const configured = () => isGoogleOAuthConfigured(env);

  if (configured()) {
    passport.serializeUser((user, done) => done(null, user.googleId || user.id || user.email));
    passport.deserializeUser(async (identifier, done) => {
      try {
        const user = await supabaseFindUserByGoogleOrEmail(identifier, identifier)
          || await supabaseGetUserById(identifier);
        done(null, user || null);
      } catch (error) {
        done(error, null);
      }
    });

    passport.use(new GoogleStrategy({
      passReqToCallback: true,
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${baseUrl}/auth/google/callback`
    }, (_req, _accessToken, _refreshToken, profile, done) => {
      done(null, {
        email: profile.emails[0].value,
        name: profile.displayName,
        googleId: profile.id
      });
    }));
  }

  app.get('/auth/google', (req, res, next) => {
    if (!configured()) return res.redirect('/?error=google_oauth_not_configured');

    const mode = req.query.mode === 'link' ? 'link' : 'login';
    const state = encodeOAuthState({ mode });
    return passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'select_account',
      state
    })(req, res, next);
  });

  app.get('/auth/google/callback', (req, res, next) => {
    if (!configured()) return res.redirect('/?error=google_oauth_not_configured');
    return next();
  }, passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }), async (req, res) => {
    const googleUser = req.user;
    const oauthState = decodeOAuthState(req.query.state);

    try {
      if (oauthState.mode === 'link') {
        const cookieToken = getCookieToken(req);
        let authUser = null;

        if (cookieToken) {
          try {
            authUser = jwt.verify(cookieToken, jwtSecret);
          } catch (_error) {}
        }

        if (!authUser) return redirectWithBaseUrl(res, baseUrl, { error: 'google_link_failed' });

        const currentUser = await supabaseGetUserById(authUser.id);
        if (!currentUser) return redirectWithBaseUrl(res, baseUrl, { error: 'google_link_failed' });

        const existingGoogleUser = await supabaseFindUserByGoogleOrEmail(googleUser.googleId, googleUser.email);
        if (existingGoogleUser && existingGoogleUser.id !== currentUser.id) {
          return redirectWithBaseUrl(res, baseUrl, { error: 'google_already_linked' });
        }

        await supabaseUpdateGoogleLink(currentUser.id, googleUser.googleId);
        return redirectWithBaseUrl(res, baseUrl, { google: 'linked' });
      }

      let isNewUser = false;
      let user = await supabaseFindUserByGoogleOrEmail(googleUser.googleId, googleUser.email);
      if (!user) {
        user = await supabaseCreateUser({
          name: googleUser.name,
          email: googleUser.email,
          password: '',
          google_id: googleUser.googleId
        });
        if (user.error) throw new Error(user.error);
        user = user.data;
        isNewUser = true;
      } else if (!user.google_id) {
        await supabaseUpdateGoogleLink(user.id, googleUser.googleId);
      }

      const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
      setAuthCookie(res, token);
      return redirectWithBaseUrl(res, baseUrl, {
        auth: 'success',
        userId: user.id,
        ...(isNewUser ? { placement: '1' } : {})
      });
    } catch (error) {
      if (!isProduction) logger.error?.('Google OAuth callback failed', { error });
      return redirectWithBaseUrl(res, baseUrl, { error: 'auth_failed' });
    }
  });

  app.get('/api/auth/google/configured', (_req, res) => {
    res.json({ configured: configured() });
  });

  return { isGoogleOAuthConfigured: configured };
}

module.exports = {
  decodeOAuthState,
  encodeOAuthState,
  isGoogleOAuthConfigured,
  redirectWithBaseUrl,
  setupGoogleAuthRoutes
};
