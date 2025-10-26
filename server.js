const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const geminiService = require('./services/geminiService');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'interview-optimizer-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

// ✅ MySQL Database Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to MySQL:', err);
    return;
  }
  console.log('✅ Connected to MySQL database');
});

// Routes

// Serve login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve signup page
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Serve dashboard page
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      if (results.length > 0) {
        return res.status(400).json({ success: false, message: 'User already exists with this email' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      db.query(
        'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
        [fullName, email, hashedPassword],
        (err, result) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Failed to create user' });
          }

          req.session.userId = result.insertId;
          req.session.userName = fullName;

          res.json({ success: true, message: 'Account created successfully' });
        }
      );
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login endpoint
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid email or password' });
      }

      const user = results[0];
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(400).json({ success: false, message: 'Invalid email or password' });
      }

      req.session.userId = user.id;
      req.session.userName = user.full_name;

      res.json({ success: true, message: 'Login successful' });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out' });
    }
    res.json({ success: true, message: 'Logout successful' });
  });
});

// Get user info endpoint
app.get('/api/user', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  db.query('SELECT id, full_name, email, created_at FROM users WHERE id = ?', [req.session.userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: results[0] });
  });
});

// POST /api/interview/start
app.post('/api/interview/start', requireAuth, async (req, res) => {
  try {
    const { interviewType } = req.body;

    if (!interviewType || interviewType !== 'technical') {
      return res.status(400).json({ success: false, message: 'Invalid or missing interviewType. Only "technical" is supported.' });
    }

    // Insert new session
    db.query(
      'INSERT INTO interview_sessions (user_id, interview_type, status, total_questions) VALUES (?, ?, ?, ?)',
      [req.session.userId, interviewType, 'in_progress', 0],
      async (err, result) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ success: false, message: 'Failed to create interview session' });
        }

        const sessionId = result.insertId;

        try {
          // Call Gemini to initialize
          const initResult = await geminiService.initializeInterview(interviewType);

          // Store first question
          db.query(
            'INSERT INTO interview_conversations (session_id, message_type, content, sequence_number) VALUES (?, ?, ?, ?)',
            [sessionId, 'question', initResult.question, 1],
            (err) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, message: 'Failed to store initial question' });
              }

              res.json({
                success: true,
                sessionId,
                question: initResult.question,
                difficulty_level: initResult.difficulty_level
              });
            }
          );
        } catch (geminiError) {
          console.error('Gemini error:', geminiError);
          res.status(500).json({ success: false, message: geminiError.message });
        }
      }
    );
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/interview/respond
app.post('/api/interview/respond', requireAuth, async (req, res) => {
  try {
    const { sessionId, answer } = req.body;

    if (!sessionId || !Number.isInteger(sessionId) || !answer || typeof answer !== 'string' || answer.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid sessionId or answer' });
    }

    // Verify session ownership and status
    db.query(
      'SELECT * FROM interview_sessions WHERE id = ? AND user_id = ? AND status = ?',
      [sessionId, req.session.userId, 'in_progress'],
      async (err, results) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (results.length === 0) {
          return res.status(403).json({ success: false, message: 'Unauthorized or session not active' });
        }

        const session = results[0];
        const interviewType = session.interview_type;

        // Get current max sequence number
        db.query(
          'SELECT MAX(sequence_number) AS maxSeq FROM interview_conversations WHERE session_id = ?',
          [sessionId],
          async (err, seqResults) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ success: false, message: 'Database error' });
            }

            const nextSeq = (seqResults[0].maxSeq || 0) + 1;

            // Store user answer
            db.query(
              'INSERT INTO interview_conversations (session_id, message_type, content, sequence_number) VALUES (?, ?, ?, ?)',
              [sessionId, 'answer', answer.trim(), nextSeq],
              async (err) => {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ success: false, message: 'Failed to store answer' });
                }

                // Retrieve conversation history
                db.query(
                  'SELECT message_type, content FROM interview_conversations WHERE session_id = ? ORDER BY sequence_number',
                  [sessionId],
                  async (err, convResults) => {
                    if (err) {
                      console.error('Database error:', err);
                      return res.status(500).json({ success: false, message: 'Database error' });
                    }

                    // Build Q&A pairs (previous pairs)
                    const conversationHistory = [];
                    let currentPair = {};
                    convResults.forEach((msg) => {
                      if (msg.message_type === 'question') {
                        currentPair.question = msg.content;
                      } else if (msg.message_type === 'answer' && currentPair.question) {
                        currentPair.answer = msg.content;
                        conversationHistory.push({ ...currentPair });
                        currentPair = {};
                      }
                    });

                    try {
                      // Call Gemini for next question
                      const nextResult = await geminiService.generateNextQuestion(conversationHistory, answer.trim(), interviewType);

                      // Store next question
                      const nextSeqQ = nextSeq + 1;
                      db.query(
                        'INSERT INTO interview_conversations (session_id, message_type, content, sequence_number) VALUES (?, ?, ?, ?)',
                        [sessionId, 'question', nextResult.question, nextSeqQ],
                        (err) => {
                          if (err) {
                            console.error('Database error:', err);
                            return res.status(500).json({ success: false, message: 'Failed to store next question' });
                          }

                          // Update total_questions
                          db.query(
                            'UPDATE interview_sessions SET total_questions = total_questions + 1 WHERE id = ?',
                            [sessionId],
                            (err) => {
                              if (err) {
                                console.error('Database error:', err);
                                return res.status(500).json({ success: false, message: 'Failed to update session' });
                              }

                              res.json({
                                success: true,
                                nextQuestion: nextResult.question,
                                analysis: nextResult.analysis,
                                difficulty_level: nextResult.difficulty_level
                              });
                            }
                          );
                        }
                      );
                    } catch (geminiError) {
                      console.error('Gemini error:', geminiError);
                      res.status(500).json({ success: false, message: geminiError.message });
                    }
                  }
                );
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Respond error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/interview/session/:id
app.get('/api/interview/session/:id', requireAuth, (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);

    if (isNaN(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session ID' });
    }

    // Verify session ownership
    db.query(
      'SELECT id, interview_type, status, started_at, ended_at, duration_minutes, total_questions FROM interview_sessions WHERE id = ? AND user_id = ?',
      [sessionId, req.session.userId],
      (err, sessionResults) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (sessionResults.length === 0) {
          return res.status(404).json({ success: false, message: 'Session not found' });
        }

        const session = sessionResults[0];

        // Retrieve conversations
        db.query(
          'SELECT message_type, content, timestamp, sequence_number FROM interview_conversations WHERE session_id = ? ORDER BY sequence_number',
          [sessionId],
          (err, convResults) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ success: false, message: 'Database error' });
            }

            const conversations = convResults.map((msg) => ({
              message_type: msg.message_type,
              content: msg.content,
              timestamp: msg.timestamp,
              sequence_number: msg.sequence_number
            }));

            let feedback = null;
            if (session.status === 'completed') {
              // Retrieve feedback
              db.query(
                'SELECT overall_score, technical_accuracy, communication_quality, strengths, areas_of_improvement FROM interview_feedback WHERE session_id = ?',
                [sessionId],
                (err, feedbackResults) => {
                  if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                  }

                  if (feedbackResults.length > 0) {
                    feedback = feedbackResults[0];
                  }

                  res.json({
                    success: true,
                    session,
                    conversations,
                    feedback
                  });
                }
              );
            } else {
              res.json({
                success: true,
                session,
                conversations,
                feedback
              });
            }
          }
        );
      }
    );
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/interview/end
app.post('/api/interview/end', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || !Number.isInteger(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid sessionId' });
    }

    // Verify session ownership and status
    db.query(
      'SELECT * FROM interview_sessions WHERE id = ? AND user_id = ? AND status = ?',
      [sessionId, req.session.userId, 'in_progress'],
      async (err, results) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (results.length === 0) {
          return res.status(403).json({ success: false, message: 'Unauthorized or session not active' });
        }

        const session = results[0];
        const interviewType = session.interview_type;

        // Retrieve conversation history
        db.query(
          'SELECT message_type, content FROM interview_conversations WHERE session_id = ? ORDER BY sequence_number',
          [sessionId],
          async (err, convResults) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ success: false, message: 'Database error' });
            }

            // Build Q&A pairs
            const conversationHistory = [];
            let currentPair = {};
            convResults.forEach((msg) => {
              if (msg.message_type === 'question') {
                currentPair.question = msg.content;
              } else if (msg.message_type === 'answer' && currentPair.question) {
                currentPair.answer = msg.content;
                conversationHistory.push({ ...currentPair });
                currentPair = {};
              }
            });

            try {
              // Call Gemini for feedback
              const feedback = await geminiService.generateFinalFeedback(conversationHistory, interviewType);

              // Calculate duration
              const startedAt = new Date(session.started_at);
              const now = new Date();
              const durationMinutes = Math.floor((now - startedAt) / (1000 * 60));

              // Use transaction for updating session and inserting feedback
              db.beginTransaction((err) => {
                if (err) {
                  console.error('Transaction error:', err);
                  return res.status(500).json({ success: false, message: 'Database error' });
                }

                // Update session
                db.query(
                  'UPDATE interview_sessions SET status = ?, ended_at = NOW(), duration_minutes = ? WHERE id = ?',
                  ['completed', durationMinutes, sessionId],
                  (err) => {
                    if (err) {
                      return db.rollback(() => {
                        console.error('Database error:', err);
                        res.status(500).json({ success: false, message: 'Failed to update session' });
                      });
                    }

                    // Insert feedback
                    db.query(
                      'INSERT INTO interview_feedback (session_id, overall_score, technical_accuracy, communication_quality, strengths, areas_of_improvement) VALUES (?, ?, ?, ?, ?, ?)',
                      [sessionId, feedback.overall_score, feedback.technical_accuracy, feedback.communication_quality, feedback.strengths, feedback.areas_of_improvement],
                      (err) => {
                        if (err) {
                          return db.rollback(() => {
                            console.error('Database error:', err);
                            res.status(500).json({ success: false, message: 'Failed to store feedback' });
                          });
                        }

                        db.commit((err) => {
                          if (err) {
                            return db.rollback(() => {
                              console.error('Commit error:', err);
                              res.status(500).json({ success: false, message: 'Database error' });
                            });
                          }

                          res.json({
                            success: true,
                            feedback,
                            duration_minutes: durationMinutes
                          });
                        });
                      }
                    );
                  }
                );
              });
            } catch (geminiError) {
              console.error('Gemini error:', geminiError);
              res.status(500).json({ success: false, message: geminiError.message });
            }
          }
        );
      }
    );
  } catch (error) {
    console.error('End interview error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/interview/history
app.get('/api/interview/history', requireAuth, (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    // Query sessions with feedback
    db.query(
      `SELECT s.id, s.interview_type, s.status, s.started_at, s.ended_at, s.duration_minutes, s.total_questions, f.overall_score
       FROM interview_sessions s
       LEFT JOIN interview_feedback f ON s.id = f.session_id
       WHERE s.user_id = ?
       ORDER BY s.started_at DESC
       LIMIT ? OFFSET ?`,
      [req.session.userId, limit, offset],
      (err, results) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }

        const interviews = results.map((row) => ({
          id: row.id,
          interview_type: row.interview_type,
          status: row.status,
          started_at: row.started_at,
          ended_at: row.ended_at,
          duration_minutes: row.duration_minutes,
          total_questions: row.total_questions,
          overall_score: row.overall_score
        }));

        res.json({ success: true, interviews });
      }
    );
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});