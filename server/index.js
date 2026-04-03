const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'linguafire-super-secret-key-2024';

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Session middleware for passport
app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from public/dist
app.use(express.static(path.join(__dirname, '../public/dist')));

// Database setup
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'linguafire.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite');
    initDatabase();
    initPassport();
  }
});

// Initialize database tables
function initDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        lessons_completed INTEGER DEFAULT 0,
        english_level TEXT DEFAULT 'A1',
        achievements TEXT DEFAULT '[]',
        favorites TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Erro ao criar tabela users:', err);
      else console.log('✅ Tabela users criada');
    });

    // Daily progress table
    db.run(`
      CREATE TABLE IF NOT EXISTS daily_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        xp_earned INTEGER DEFAULT 0,
        lessons_done INTEGER DEFAULT 0,
        streak_maintained INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err) console.error('Erro ao criar tabela daily_progress:', err);
      else console.log('✅ Tabela daily_progress criada');
    });
  });
}

// Initialize Passport with Google OAuth
function initPassport() {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
      done(err, user);
    });
  });

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL}/auth/google/callback`
  }, (accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const googleId = profile.id;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if (err) return done(err);
      
      if (user) {
        return done(null, user);
      }

      db.run(
        'INSERT INTO users (name, email, password, google_id) VALUES (?, ?, ?, ?)',
        [name, email, '', googleId],
        function(err) {
          if (err) return done(err);
          const newUser = { id: this.lastID, name, email, level: 1, xp: 0, streak: 0 };
          return done(null, newUser);
        }
      );
    });
  }));
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
}

// ============ AUTH ROUTES ============

// Register
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Este email já está cadastrado' });
          }
          return res.status(500).json({ error: 'Erro ao criar conta' });
        }

        const userId = this.lastID;
        const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
          success: true,
          token,
          user: {
            id: userId,
            name,
            email,
            level: 1,
            xp: 0,
            streak: 0,
            correct_answers: 0,
            lessons_completed: 0,
            english_level: 'A1'
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          level: user.level,
          xp: user.xp,
          streak: user.streak,
          correct_answers: user.correct_answers,
          lessons_completed: user.lessons_completed,
          english_level: user.english_level,
          achievements: JSON.parse(user.achievements || '[]'),
          favorites: JSON.parse(user.favorites || '[]')
        }
      });
    }
  );
});

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, name, email, level, xp, streak, correct_answers, lessons_completed, english_level, achievements, favorites, created_at FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({
        user: {
          ...user,
          achievements: JSON.parse(user.achievements || '[]'),
          favorites: JSON.parse(user.favorites || '[]')
        }
      });
    }
  );
});

// Update user profile
app.put('/api/profile', authenticateToken, (req, res) => {
  const { name, level, xp, streak, correct_answers, lessons_completed, english_level, achievements, favorites } = req.body;

  db.run(
    `UPDATE users SET 
      name = COALESCE(?, name),
      level = COALESCE(?, level),
      xp = COALESCE(?, xp),
      streak = COALESCE(?, streak),
      correct_answers = COALESCE(?, correct_answers),
      lessons_completed = COALESCE(?, lessons_completed),
      english_level = COALESCE(?, english_level),
      achievements = COALESCE(?, achievements),
      favorites = COALESCE(?, favorites)
    WHERE id = ?`,
    [name, level, xp, streak, correct_answers, lessons_completed, english_level, 
     achievements ? JSON.stringify(achievements) : null,
     favorites ? JSON.stringify(favorites) : null,
     req.user.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar perfil' });
      }
      res.json({ success: true, message: 'Perfil atualizado com sucesso' });
    }
  );
});

// Change password
app.put('/api/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Senhas são obrigatórias' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
  }

  db.get('SELECT password FROM users WHERE id = ?', [req.user.id], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao alterar senha' });
      }
      res.json({ success: true, message: 'Senha alterada com sucesso' });
    });
  });
});

// Delete account
app.delete('/api/account', authenticateToken, (req, res) => {
  db.run('DELETE FROM daily_progress WHERE user_id = ?', [req.user.id], (err) => {
    if (err) console.error('Erro ao deletar progress:', err);
    
    db.run('DELETE FROM users WHERE id = ?', [req.user.id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao deletar conta' });
      }
      res.json({ success: true, message: 'Conta deletada com sucesso' });
    });
  });
});

// ============ GOOGLE AUTH ROUTES ============

// Google Auth routes
app.get('/auth/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.redirect(`${process.env.BASE_URL}/?auth=success&token=${token}&userId=${user.id}`);
  }
);

// Check if Google OAuth is configured
app.get('/api/auth/google/configured', (req, res) => {
  const configured = process.env.GOOGLE_CLIENT_ID && 
                     process.env.GOOGLE_CLIENT_ID !== 'SUA_CLIENT_ID_DO_GOOGLE' &&
                     process.env.GOOGLE_CLIENT_SECRET &&
                     process.env.GOOGLE_CLIENT_SECRET !== 'SUA_CLIENT_SECRET_DO_GOOGLE';
  res.json({ configured });
});

// ============ STATS ROUTES ============

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  db.all(
    'SELECT name, xp, level, streak FROM users ORDER BY xp DESC LIMIT 20',
    [],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar ranking' });
      }
      res.json({ leaderboard: users });
    }
  );
});

// Get user rank
app.get('/api/rank', authenticateToken, (req, res) => {
  db.get('SELECT xp FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: 'Erro interno' });
    }

    db.get('SELECT COUNT(*) + 1 as rank FROM users WHERE xp > ?', [user.xp], (err, result) => {
      res.json({ rank: result.rank });
    });
  });
});

// Serve app for all other routes (must be last)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/dist/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse em: http://localhost:${PORT}`);
});