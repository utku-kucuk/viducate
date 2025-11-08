const { Quiz, Question, Option, QuizQuestion, Video, VideoQuiz, QuizAttempt, AttemptAnswer, Progress } = require('../models');
const { sequelize } = require('../config/database');

async function getMissingQuizTables() {
  const qi = sequelize.getQueryInterface();
  const expected = ['Quizzes', 'Questions', 'Options', 'QuizQuestions', 'VideoQuizzes', 'QuizAttempts', 'AttemptAnswers'];
  const missing = [];
  for (const t of expected) {
    try {
      // describeTable throws if table doesn't exist
      // eslint-disable-next-line no-await-in-loop
      await qi.describeTable(t);
    } catch (e) {
      missing.push(t);
    }
  }
  return missing;
}

async function ensureQuizSchema() {
  const missing = await getMissingQuizTables();
  if (missing.length > 0) {
    try {
      // Sync only quiz-related models explicitly (alter to add missing columns)
      await Quiz.sync({ alter: true });
      await Question.sync({ alter: true });
      await Option.sync({ alter: true });
      await QuizQuestion.sync({ alter: true });
      await VideoQuiz.sync({ alter: true });
      await QuizAttempt.sync({ alter: true });
      await AttemptAnswer.sync({ alter: true });
    } catch (e) {
      // ignore
    }
  }
  return getMissingQuizTables();
}

// Create a quiz
const createQuiz = async (req, res) => {
  try {
    const missing = await ensureQuizSchema();
    if (missing.length > 0) {
      return res.status(500).json({ error: 'Quiz schema missing tables', details: { missing } });
    }
    const { title, description, passThreshold, timeLimitSec, maxAttempts, shuffleQuestions, shuffleOptions, isFinal } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }
    const quiz = await Quiz.create({
      title,
      description: description || null,
      passThreshold: typeof passThreshold === 'number' ? passThreshold : undefined,
      timeLimitSec: timeLimitSec || null,
      maxAttempts: maxAttempts || null,
      shuffleQuestions: !!shuffleQuestions,
      shuffleOptions: !!shuffleOptions,
      isFinal: !!isFinal,
      teacherId: req.user?.id || null
    });
    res.json({ success: true, data: quiz });
  } catch (error) {
    console.error('createQuiz error', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
};

// Add question with options to a quiz
const addQuestionToQuiz = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { quizId } = req.params;
    const { text, explanation, options, imageUrl } = req.body;
    // Ensure quiz exists
    const quiz = await Quiz.findByPk(quizId, { transaction: t });
    if (!quiz) {
      await t.rollback();
      return res.status(404).json({ error: 'Quiz not found' });
    }
    if (!text || !Array.isArray(options) || options.length !== 4) {
      await t.rollback();
      return res.status(400).json({ error: 'Question text and 4 options are required' });
    }
    // Ensure all four options have non-empty text
    const invalidOptionText = options.some(o => !o || typeof o.text !== 'string' || o.text.trim().length === 0);
    if (invalidOptionText) {
      await t.rollback();
      return res.status(400).json({ error: 'All options must have non-empty text' });
    }
    const hasCorrect = options.some(o => o && o.isCorrect === true);
    if (!hasCorrect) {
      await t.rollback();
      return res.status(400).json({ error: 'Exactly one option must be marked correct' });
    }
    const correctCount = options.filter(o => o && o.isCorrect === true).length;
    if (correctCount !== 1) {
      await t.rollback();
      return res.status(400).json({ error: 'Exactly one option must be marked correct' });
    }

    // Prepare payload; include imageUrl only if column exists (for dev DBs without migrations)
    const questionPayload = { text, explanation: explanation || null, ownerId: req.user?.id || null };
    try {
      const qi = sequelize.getQueryInterface();
      const desc = await qi.describeTable('Questions');
      if (desc && Object.prototype.hasOwnProperty.call(desc, 'imageUrl')) {
        questionPayload.imageUrl = imageUrl || null;
      }
    } catch (e) {
      // ignore describeTable errors; proceed without imageUrl
    }
    const question = await Question.create(questionPayload, { transaction: t });
    const createdOptions = [];
    for (const opt of options) {
      const created = await Option.create({ text: opt.text, isCorrect: !!opt.isCorrect, questionId: question.id }, { transaction: t });
      createdOptions.push(created);
    }

    // Determine order
    const count = await QuizQuestion.count({ where: { quizId }, transaction: t });
    await QuizQuestion.create({ quizId, questionId: question.id, order: count, points: 1 }, { transaction: t });
    await t.commit();
    res.json({ success: true, data: { question, options: createdOptions } });
  } catch (error) {
    await t.rollback();
    console.error('addQuestionToQuiz error', error);
    res.status(500).json({ error: 'Failed to add question', details: error?.message });
  }
};

// Assign quiz to a video (chapter)
const assignQuizToVideo = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { videoId, isRequired, unlockNextOnPass } = req.body;
    if (!videoId) return res.status(400).json({ error: 'videoId is required' });
    const video = await Video.findByPk(videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    const link = await VideoQuiz.upsert({
      videoId,
      quizId,
      isRequired: isRequired !== undefined ? !!isRequired : true,
      unlockNextOnPass: unlockNextOnPass !== undefined ? !!unlockNextOnPass : true
    }, { returning: true });
    res.json({ success: true, data: Array.isArray(link) ? link[0] : link });
  } catch (error) {
    console.error('assignQuizToVideo error', error);
    res.status(500).json({ error: 'Failed to assign quiz' });
  }
};

// Get quiz metadata for a video (student)
const getVideoQuiz = async (req, res) => {
  try {
    const { videoId } = req.params;
    const link = await VideoQuiz.findOne({ where: { videoId }, include: [{ model: Quiz, as: 'quiz' }] });
    if (!link) return res.json({ hasQuiz: false });
    let passed = false;
    if (req.user) {
      const lastPass = await QuizAttempt.findOne({ where: { userId: req.user.id, quizId: link.quizId, videoId, passed: true }, order: [['createdAt', 'DESC']] });
      passed = !!lastPass;
    }
    res.json({ hasQuiz: true, isRequired: link.isRequired, unlockNextOnPass: link.unlockNextOnPass, quizId: link.quizId, quizTitle: link.quiz?.title || 'Quiz', passed });
  } catch (error) {
    console.error('getVideoQuiz error', error);
    res.status(500).json({ error: 'Failed to get video quiz' });
  }
};

// Start an attempt (returns questions with options, without isCorrect)
const startAttempt = async (req, res) => {
  try {
    const missing = await ensureQuizSchema();
    if (missing.length > 0) {
      return res.status(500).json({ error: 'Quiz schema missing tables', details: { missing } });
    }
    const { quizId } = req.params;
    const { videoId } = req.body || {};

    // Optionally validate assignment when videoId given
    if (videoId) {
      const link = await VideoQuiz.findOne({ where: { videoId, quizId } });
      if (!link) return res.status(400).json({ error: 'Quiz not assigned to this video' });
    }

    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Load questions via manual queries (robust to association alias issues)
    const links = await QuizQuestion.findAll({ where: { quizId }, order: [['order', 'ASC']] });
    if (!links || links.length === 0) {
      return res.status(400).json({ error: 'Quiz has no questions' });
    }
    const questionIds = links.map(l => l.questionId);
    const questionsRaw = await Question.findAll({ where: { id: questionIds } });
    const optionsRaw = await Option.findAll({ where: { questionId: questionIds } });
    const byId = new Map();
    questionsRaw.forEach(q => { byId.set(q.id, q); });
    const optByQ = new Map();
    optionsRaw.forEach(o => {
      const arr = optByQ.get(o.questionId) || [];
      arr.push({ id: o.id, text: o.text });
      optByQ.set(o.questionId, arr);
    });
    const questions = links.map(l => {
      const q = byId.get(l.questionId);
      if (!q) return null;
      const opts = optByQ.get(q.id) || [];
      const shuffledOpts = quiz.shuffleOptions ? [...opts].sort(() => Math.random() - 0.5) : opts;
      return { id: q.id, text: q.text, imageUrl: q.imageUrl || null, options: shuffledOpts };
    }).filter(Boolean);

    // Count previous attempts for numbering
    const prevCount = await QuizAttempt.count({ where: { userId: req.user.id, quizId, videoId: videoId || null } });
    const attempt = await QuizAttempt.create({ userId: req.user.id, quizId, videoId: videoId || null, attemptNo: prevCount + 1 });

    const finalQuestions = quiz.shuffleQuestions ? [...questions].sort(() => Math.random() - 0.5) : questions;

    res.json({ success: true, data: { attemptId: attempt.id, quiz: { id: quiz.id, title: quiz.title, passThreshold: Number(quiz.passThreshold) }, questions: finalQuestions } });
  } catch (error) {
    console.error('startAttempt error', error);
    res.status(500).json({ error: 'Failed to start attempt', details: error?.message });
  }
};

// Submit attempt answers and grade
const submitAttempt = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { attemptId } = req.params;
    const { answers } = req.body || {};
    if (!Array.isArray(answers) || answers.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Answers are required' });
    }

    const attempt = await QuizAttempt.findByPk(attemptId, { transaction: t });
    if (!attempt) { await t.rollback(); return res.status(404).json({ error: 'Attempt not found' }); }
    if (attempt.userId !== req.user.id) { await t.rollback(); return res.status(403).json({ error: 'Not your attempt' }); }
    if (attempt.submittedAt) { await t.rollback(); return res.status(400).json({ error: 'Attempt already submitted' }); }

    // Load correct answers
    const quizQuestions = await QuizQuestion.findAll({ where: { quizId: attempt.quizId }, include: [{ model: Question, as: 'question', include: [{ model: Option, as: 'options' }] }], transaction: t });
    const questionIdToCorrectOptionId = new Map();
    quizQuestions.forEach(qq => {
      const q = qq.question;
      const correctOpt = (q.options || []).find(o => o.isCorrect === true);
      if (correctOpt) questionIdToCorrectOptionId.set(q.id, correctOpt.id);
    });

    let numCorrect = 0;
    let total = quizQuestions.length;

    for (const ans of answers) {
      const correctOptionId = questionIdToCorrectOptionId.get(ans.questionId);
      const isCorrect = !!correctOptionId && ans.optionId === correctOptionId;
      if (isCorrect) numCorrect += 1;
      await AttemptAnswer.create({ attemptId: attempt.id, questionId: ans.questionId, optionId: ans.optionId, isCorrect }, { transaction: t });
    }

    const scorePct = total > 0 ? (numCorrect / total) * 100 : 0;
    const quiz = await Quiz.findByPk(attempt.quizId, { transaction: t });
    const passed = scorePct >= Number(quiz.passThreshold) * 100;

    await attempt.update({ submittedAt: new Date(), numCorrect, numQuestions: total, scorePct, passed }, { transaction: t });

    // If tied to video and passed -> mark progress completed (manual)
    if (attempt.videoId && passed) {
      let existing = await Progress.findOne({ where: { userId: attempt.userId, videoId: attempt.videoId }, transaction: t });
      if (!existing) {
        existing = await Progress.create({ userId: attempt.userId, videoId: attempt.videoId, watchedDuration: 0, totalDuration: 1, watchPercentage: 0, lastWatchedAt: new Date() }, { transaction: t });
      }
      await existing.update({ isCompleted: true, completionMethod: 'manual', completionDate: new Date() }, { transaction: t });
    }

    await t.commit();
    res.json({ success: true, data: { passed, scorePct, numCorrect, numQuestions: total } });
  } catch (error) {
    await t.rollback();
    console.error('submitAttempt error', error);
    res.status(500).json({ error: 'Failed to submit attempt' });
  }
};

module.exports = {
  createQuiz,
  addQuestionToQuiz,
  assignQuizToVideo,
  getVideoQuiz,
  startAttempt,
  submitAttempt
};


