const { Quiz, Question, Option, QuizQuestion, Video, VideoQuiz, QuizAttempt, AttemptAnswer, Progress, Course } = require('../models');
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
    const missing = await ensureQuizSchema();
    if (missing.length > 0) {
      await t.rollback();
      return res.status(500).json({ error: 'Quiz schema missing tables', details: { missing } });
    }
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
    // Describe Questions table to avoid selecting non-existent columns (e.g., imageUrl)
    let questionAttributes = ['id', 'text'];
    try {
      const qi = sequelize.getQueryInterface();
      const desc = await qi.describeTable('Questions');
      if (desc && Object.prototype.hasOwnProperty.call(desc, 'imageUrl')) {
        questionAttributes = ['id', 'text', 'imageUrl'];
      }
    } catch (e) {
      // fallback to basic attributes
      questionAttributes = ['id', 'text'];
    }
    const questionsRaw = await Question.findAll({ where: { id: questionIds }, attributes: questionAttributes });
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
    const missing = await ensureQuizSchema();
    if (missing.length > 0) {
      await t.rollback();
      return res.status(500).json({ error: 'Quiz schema missing tables', details: { missing } });
    }
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

    // Load correct answers (manual queries to avoid imageUrl column issues)
    const quizQuestions = await QuizQuestion.findAll({ where: { quizId: attempt.quizId }, transaction: t });
    const questionIds = quizQuestions.map(q => q.questionId);
    const optionsRaw = await Option.findAll({ where: { questionId: questionIds }, transaction: t });
    const questionIdToCorrectOptionId = new Map();
    optionsRaw.forEach(o => {
      if (o.isCorrect === true) {
        questionIdToCorrectOptionId.set(o.questionId, o.id);
      }
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
    res.status(500).json({ error: 'Failed to submit attempt', details: error?.message });
  }
};

module.exports = {
  createQuiz,
  listMyQuizzes,
  getQuizDetail,
  updateQuiz,
  deleteQuiz,
  addQuestionToQuiz,
  assignQuizToVideo,
  assignQuizToCourses,
  unassignQuizFromVideo,
  unassignQuizFromCourse,
  assignQuizToVideos,
  updateQuestion,
  deleteQuestion,
  getVideoQuiz,
  startAttempt,
  submitAttempt
};

// List quizzes owned by the teacher
async function listMyQuizzes(req, res) {
  try {
    const teacherId = req.user?.id;
    const quizzes = await Quiz.findAll({
      where: { teacherId },
      order: [['updatedAt', 'DESC']]
    });
    // Augment with counts
    const quizIds = quizzes.map(q => q.id);
    const links = await VideoQuiz.findAll({ where: { quizId: quizIds } });
    const linkCount = new Map();
    links.forEach(l => linkCount.set(l.quizId, (linkCount.get(l.quizId) || 0) + 1));
    const qq = await QuizQuestion.findAll({ where: { quizId: quizIds } });
    const qCount = new Map();
    qq.forEach(x => qCount.set(x.quizId, (qCount.get(x.quizId) || 0) + 1));
    const data = quizzes.map(q => ({
      id: q.id,
      title: q.title,
      passThreshold: Number(q.passThreshold),
      shuffleQuestions: !!q.shuffleQuestions,
      shuffleOptions: !!q.shuffleOptions,
      isFinal: !!q.isFinal,
      updatedAt: q.updatedAt,
      questionCount: qCount.get(q.id) || 0,
      assignmentCount: linkCount.get(q.id) || 0
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('listMyQuizzes error', error);
    res.status(500).json({ error: 'Failed to list quizzes' });
  }
}

// Get quiz detail with questions/options (for teacher)
async function getQuizDetail(req, res) {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.teacherId && quiz.teacherId !== req.user.id) return res.status(403).json({ error: 'Not your quiz' });
    const links = await QuizQuestion.findAll({ where: { quizId }, order: [['order', 'ASC']] });
    const questionIds = links.map(l => l.questionId);
    const questions = await Question.findAll({ where: { id: questionIds } });
    const options = await Option.findAll({ where: { questionId: questionIds } });
    const byQ = new Map();
    options.forEach(o => {
      const arr = byQ.get(o.questionId) || [];
      arr.push({ id: o.id, text: o.text, isCorrect: !!o.isCorrect });
      byQ.set(o.questionId, arr);
    });
    const items = links.map(l => {
      const q = questions.find(x => x.id === l.questionId);
      if (!q) return null;
      return {
        id: q.id,
        text: q.text,
        imageUrl: q.imageUrl || null,
        options: (byQ.get(q.id) || [])
      };
    }).filter(Boolean);
    res.json({ success: true, data: { quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      passThreshold: Number(quiz.passThreshold),
      timeLimitSec: quiz.timeLimitSec,
      maxAttempts: quiz.maxAttempts,
      shuffleQuestions: !!quiz.shuffleQuestions,
      shuffleOptions: !!quiz.shuffleOptions,
      isFinal: !!quiz.isFinal
    }, questions: items } });
  } catch (error) {
    console.error('getQuizDetail error', error);
    res.status(500).json({ error: 'Failed to get quiz detail' });
  }
}

// Update quiz metadata
async function updateQuiz(req, res) {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.teacherId && quiz.teacherId !== req.user.id) return res.status(403).json({ error: 'Not your quiz' });
    const allowed = ['title', 'description', 'passThreshold', 'timeLimitSec', 'maxAttempts', 'shuffleQuestions', 'shuffleOptions', 'isFinal'];
    const updates = {};
    for (const key of allowed) {
      if (req.body.hasOwnProperty(key)) updates[key] = req.body[key];
    }
    await quiz.update(updates);
    res.json({ success: true, data: quiz });
  } catch (error) {
    console.error('updateQuiz error', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
}

// Delete quiz and its relations
async function deleteQuiz(req, res) {
  const t = await sequelize.transaction();
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findByPk(quizId, { transaction: t });
    if (!quiz) { await t.rollback(); return res.status(404).json({ error: 'Quiz not found' }); }
    if (quiz.teacherId && quiz.teacherId !== req.user.id) { await t.rollback(); return res.status(403).json({ error: 'Not your quiz' }); }
    const qlinks = await QuizQuestion.findAll({ where: { quizId }, transaction: t });
    const questionIds = qlinks.map(l => l.questionId);
    // Remove assignments
    await VideoQuiz.destroy({ where: { quizId }, transaction: t });
    // Remove attempts (answers will cascade)
    await QuizAttempt.destroy({ where: { quizId }, transaction: t });
    // Remove quiz-question links
    await QuizQuestion.destroy({ where: { quizId }, transaction: t });
    // Remove options and questions
    if (questionIds.length > 0) {
      await Option.destroy({ where: { questionId: questionIds }, transaction: t });
      await Question.destroy({ where: { id: questionIds }, transaction: t });
    }
    // Remove quiz
    await Quiz.destroy({ where: { id: quizId }, transaction: t });
    await t.commit();
    res.json({ success: true });
  } catch (error) {
    await t.rollback();
    console.error('deleteQuiz error', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
}

// Assign quiz to all videos in given courses
async function assignQuizToCourses(req, res) {
  const t = await sequelize.transaction();
  try {
    const { quizId } = req.params;
    const { courseIds, isRequired, unlockNextOnPass } = req.body || {};
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'courseIds must be a non-empty array' });
    }
    const quiz = await Quiz.findByPk(quizId, { transaction: t });
    if (!quiz) { await t.rollback(); return res.status(404).json({ error: 'Quiz not found' }); }
    if (quiz.teacherId && quiz.teacherId !== req.user.id) { await t.rollback(); return res.status(403).json({ error: 'Not your quiz' }); }
    // Load all videos of those courses
    const videos = await Video.findAll({ where: { courseId: courseIds }, transaction: t });
    for (const v of videos) {
      // eslint-disable-next-line no-await-in-loop
      await VideoQuiz.upsert({
        videoId: v.id,
        quizId,
        isRequired: isRequired !== undefined ? !!isRequired : true,
        unlockNextOnPass: unlockNextOnPass !== undefined ? !!unlockNextOnPass : true
      }, { transaction: t });
    }
    await t.commit();
    res.json({ success: true, data: { assignedVideos: videos.length } });
  } catch (error) {
    await t.rollback();
    console.error('assignQuizToCourses error', error);
    res.status(500).json({ error: 'Failed to assign quiz to courses' });
  }
}

// Unassign quiz from a specific video
async function unassignQuizFromVideo(req, res) {
  try {
    const { quizId } = req.params;
    const { videoId } = req.query;
    if (!videoId) return res.status(400).json({ error: 'videoId is required' });
    const link = await VideoQuiz.findOne({ where: { quizId, videoId } });
    if (!link) return res.status(404).json({ error: 'Assignment not found' });
    await VideoQuiz.destroy({ where: { id: link.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('unassignQuizFromVideo error', error);
    res.status(500).json({ error: 'Failed to unassign quiz from video' });
  }
}

// Unassign quiz from all videos in a course
async function unassignQuizFromCourse(req, res) {
  try {
    const { quizId, courseId } = req.params;
    // Get videos in course
    const videos = await Video.findAll({ where: { courseId } });
    const videoIds = videos.map(v => v.id);
    await VideoQuiz.destroy({ where: { quizId, videoId: videoIds } });
    res.json({ success: true });
  } catch (error) {
    console.error('unassignQuizFromCourse error', error);
    res.status(500).json({ error: 'Failed to unassign quiz from course' });
  }
}

// Assign quiz to specific videos (bulk)
async function assignQuizToVideos(req, res) {
  const t = await sequelize.transaction();
  try {
    const { quizId } = req.params;
    const { videoIds, isRequired, unlockNextOnPass } = req.body || {};
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'videoIds must be a non-empty array' });
    }
    const quiz = await Quiz.findByPk(quizId, { transaction: t });
    if (!quiz) { await t.rollback(); return res.status(404).json({ error: 'Quiz not found' }); }
    if (quiz.teacherId && quiz.teacherId !== req.user.id) { await t.rollback(); return res.status(403).json({ error: 'Not your quiz' }); }
    const videos = await Video.findAll({ where: { id: videoIds }, transaction: t });
    for (const v of videos) {
      // eslint-disable-next-line no-await-in-loop
      await VideoQuiz.upsert({
        videoId: v.id,
        quizId,
        isRequired: isRequired !== undefined ? !!isRequired : true,
        unlockNextOnPass: unlockNextOnPass !== undefined ? !!unlockNextOnPass : true
      }, { transaction: t });
    }
    await t.commit();
    res.json({ success: true, data: { assignedVideos: videos.length } });
  } catch (error) {
    await t.rollback();
    console.error('assignQuizToVideos error', error);
    res.status(500).json({ error: 'Failed to assign quiz to videos' });
  }
}

// Update a question (text, imageUrl, options)
async function updateQuestion(req, res) {
  const t = await sequelize.transaction();
  try {
    // Soft-ensure only critical tables needed for this operation
    try {
      const missing = await getMissingQuizTables();
      const critical = missing.filter(tn => ['Quizzes', 'Questions', 'Options', 'QuizQuestions'].includes(tn));
      if (critical.length > 0) {
        // Attempt to sync required models without failing the request
        await Quiz.sync({ alter: true });
        await Question.sync({ alter: true });
        await Option.sync({ alter: true });
        await QuizQuestion.sync({ alter: true });
      }
    } catch (e) {
      // Proceed even if ensure fails; downstream calls will error with clearer messages if truly missing
    }
    const { quizId, questionId } = req.params;
    const { text, imageUrl, options } = req.body || {};
    const quiz = await Quiz.findByPk(quizId, { transaction: t });
    if (!quiz) { await t.rollback(); return res.status(404).json({ error: 'Quiz not found' }); }
    if (quiz.teacherId && quiz.teacherId !== req.user.id) { await t.rollback(); return res.status(403).json({ error: 'Not your quiz' }); }
    const link = await QuizQuestion.findOne({ where: { quizId, questionId }, transaction: t });
    if (!link) { await t.rollback(); return res.status(404).json({ error: 'Question not part of quiz' }); }
    const question = await Question.findByPk(questionId, { transaction: t });
    if (!question) { await t.rollback(); return res.status(404).json({ error: 'Question not found' }); }
    const updates = {};
    if (typeof text === 'string') updates.text = text;
    if (imageUrl !== undefined) {
      try {
        const qi = sequelize.getQueryInterface();
        const desc = await qi.describeTable('Questions');
        if (desc && Object.prototype.hasOwnProperty.call(desc, 'imageUrl')) {
          updates.imageUrl = imageUrl || null;
        }
      } catch (e) {
        // ignore if unable to describe; skip imageUrl update to avoid 500 on older DBs
      }
    }
    if (Object.keys(updates).length > 0) {
      await question.update(updates, { transaction: t });
    }
    if (Array.isArray(options)) {
      if (options.length !== 4) { await t.rollback(); return res.status(400).json({ error: 'Exactly 4 options are required' }); }
      const invalidOptionText = options.some(o => !o || typeof o.text !== 'string' || o.text.trim().length === 0);
      if (invalidOptionText) { await t.rollback(); return res.status(400).json({ error: 'All options must have non-empty text' }); }
      const hasCorrect = options.some(o => o && o.isCorrect === true);
      const correctCount = options.filter(o => o && o.isCorrect === true).length;
      if (!hasCorrect || correctCount !== 1) { await t.rollback(); return res.status(400).json({ error: 'Exactly one option must be marked correct' }); }
      // Update-in-place to avoid breaking existing AttemptAnswer FKs. Create new for missing; remove extras safely.
      const existing = await Option.findAll({ where: { questionId }, transaction: t });
      const existingMap = new Map(existing.map(o => [o.id, o]));
      const incomingIds = new Set(options.filter(o => o && o.id).map(o => o.id));
      // Update or create
      for (const opt of options) {
        const targetText = String(opt.text || '').trim();
        const targetCorrect = !!opt.isCorrect;
        if (opt.id && existingMap.has(opt.id)) {
          const row = existingMap.get(opt.id);
          await row.update({ text: targetText, isCorrect: targetCorrect }, { transaction: t });
        } else {
          await Option.create({ questionId, text: targetText, isCorrect: targetCorrect }, { transaction: t });
        }
      }
      // Delete removed options safely (first delete dependent answers)
      const toDelete = existing.filter(o => !incomingIds.has(o.id)).map(o => o.id);
      if (toDelete.length > 0) {
        await AttemptAnswer.destroy({ where: { optionId: toDelete }, transaction: t });
        await Option.destroy({ where: { id: toDelete }, transaction: t });
      }
    }
    await t.commit();
    res.json({ success: true });
  } catch (error) {
    await t.rollback();
    console.error('updateQuestion error', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
}

// Delete a question from quiz
async function deleteQuestion(req, res) {
  const t = await sequelize.transaction();
  try {
    const { quizId, questionId } = req.params;
    const quiz = await Quiz.findByPk(quizId, { transaction: t });
    if (!quiz) { await t.rollback(); return res.status(404).json({ error: 'Quiz not found' }); }
    if (quiz.teacherId && quiz.teacherId !== req.user.id) { await t.rollback(); return res.status(403).json({ error: 'Not your quiz' }); }
    const link = await QuizQuestion.findOne({ where: { quizId, questionId }, transaction: t });
    if (!link) { await t.rollback(); return res.status(404).json({ error: 'Question not part of quiz' }); }
    await Option.destroy({ where: { questionId }, transaction: t });
    await QuizQuestion.destroy({ where: { quizId, questionId }, transaction: t });
    await Question.destroy({ where: { id: questionId }, transaction: t });
    await t.commit();
    res.json({ success: true });
  } catch (error) {
    await t.rollback();
    console.error('deleteQuestion error', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
}


