// In-browser stand-in for the Express API, used by the static demo build.
// Response shapes mirror backend/src/controllers so the UI runs unchanged.
import { AxiosError } from 'axios';
import { db, save, newId } from './db';
import { sampleVideoUrl, samplePdfUrl, thumbnailSvg } from './seed';

const PROTECTED_MSG = 'Demo accounts are protected and cannot be changed in the live demo.';

// ---------- helpers ----------
const now = () => new Date().toISOString();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const latency = () => wait(120 + Math.random() * 220);

class HttpError extends Error {
  constructor(status, data) {
    super(data?.message || data?.error || 'Request failed');
    this.status = status;
    this.data = data;
  }
}
const fail = (status, message, extra = {}) => {
  throw new HttpError(status, { success: false, message, error: message, ...extra });
};

const publicUser = (u) => {
  if (!u) return null;
  const { password, isProtected, ...rest } = u;
  return rest;
};
const teacherOf = (id) => {
  const t = db().users.find((u) => u.id === id);
  return t ? { id: t.id, firstName: t.firstName, lastName: t.lastName, email: t.email } : null;
};
const findOr404 = (list, id, what) => list.find((x) => x.id === id) || fail(404, `${what} not found`);

const requireRole = (user, ...roles) => {
  if (!roles.includes(user.role)) fail(403, 'Access denied. Insufficient permissions.');
};

const courseVideos = (courseId) =>
  db().videos.filter((v) => v.courseId === courseId).sort((a, b) => (a.order || 0) - (b.order || 0));

const withVideoMeta = (v) => ({
  ...v,
  availableQualities: v.type === 'file' ? [] : ['720p'],
  selectedUrl: v.fileUrl,
  currentQuality: v.type === 'file' ? null : '720p',
});

const isPublic = (c) => c.isPublished && !c.adminDisabled && c.teacherPublishAllowed !== false;
const enrollmentOf = (userId, courseId) => db().enrollments.find((e) => e.userId === userId && e.courseId === courseId);
const progressOf = (userId, videoId) => db().progress.find((p) => p.userId === userId && p.videoId === videoId);

function recomputeEnrollment(userId, courseId) {
  const e = enrollmentOf(userId, courseId);
  if (!e) return;
  const vids = courseVideos(courseId);
  if (!vids.length) return;
  const done = vids.filter((v) => progressOf(userId, v.id)?.isCompleted).length;
  e.progress = Math.round((done / vids.length) * 100);
}

function enrichChapters(course) {
  const byId = new Map(courseVideos(course.id).map((v) => [v.id, withVideoMeta(v)]));
  return (course.chapters || []).map((ch) => ({
    ...ch,
    sections: (ch.sections || []).map((s) => ({
      ...s,
      videos: (s.videos || []).map((v) => {
        const actual = v.id ? byId.get(v.id) : null;
        return actual ? { ...v, ...actual, title: v.title || actual.title, type: actual.type || v.type || 'video' } : v;
      }),
    })),
  }));
}

function canAccessVideo(user, video) {
  if (user.role === 'admin') return true;
  const course = db().courses.find((c) => c.id === video.courseId);
  if (course?.teacherId === user.id || video.teacherId === user.id) return true;
  return !!(course && enrollmentOf(user.id, course.id));
}

function log(level, message, context, userId = null) {
  const logs = db().logs;
  const id = (logs[0]?.id || 0) + 1;
  logs.unshift({ id, level, message, context, userId, meta: {}, createdAt: now() });
  logs.length = Math.min(logs.length, 200);
}

const readAsDataUrl = (file) =>
  new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });

// Small images are kept (as data URLs); anything bigger becomes a placeholder
async function storeImage(file, label) {
  if (file && file.size <= 400 * 1024 && /^image\//.test(file.type)) {
    const url = await readAsDataUrl(file);
    if (url) return url;
  }
  return thumbnailSvg(label || 'Image', Math.floor(Math.random() * 6));
}

async function fakeUploadProgress(config, file) {
  if (!config.onUploadProgress) return;
  const total = file?.size || 1000000;
  for (const pct of [0.15, 0.4, 0.7, 1]) {
    await wait(180);
    config.onUploadProgress({ loaded: total * pct, total, progress: pct, bytes: total * 0.25, lengthComputable: true });
  }
}

// ---------- routes ----------
const routes = [];
const on = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp(
    '^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$'
  );
  routes.push({ method, re, keys, handler, auth: !pattern.startsWith('/api/meta') && pattern !== '/api/auth/login' });
};

// Auth
on('post', '/api/auth/login', ({ body }) => {
  const email = String(body.email || '').trim().toLowerCase();
  const user = db().users.find((u) => u.email.toLowerCase() === email);
  if (!user || user.password !== String(body.password || '').trim()) {
    fail(401, 'Invalid email or password. Use one of the demo accounts shown below.');
  }
  if (!user.isActive) fail(401, 'Account is deactivated');
  user.lastLogin = now();
  log('info', `User logged in: ${user.email}`, 'auth', user.id);
  return { message: 'Login successful', user: publicUser(user), token: `demo.${user.id}` };
});
on('post', '/api/auth/register', () => fail(403, 'Registration is disabled in the live demo. Use a demo account.'));
on('get', '/api/auth/profile', ({ user }) => ({ user: publicUser(user) }));
on('put', '/api/auth/profile', ({ user, body }) => {
  ['firstName', 'lastName', 'bio', 'profilePicture'].forEach((k) => { if (body[k] !== undefined) user[k] = body[k]; });
  user.updatedAt = now();
  return { message: 'Profile updated successfully', user: publicUser(user) };
});
on('post', '/api/auth/change-password', ({ user, body }) => {
  if (user.isProtected) fail(403, PROTECTED_MSG);
  if (user.password !== body.currentPassword) fail(400, 'Current password is incorrect');
  if (!body.newPassword || body.newPassword.length < 6) fail(400, 'New password must be at least 6 characters');
  user.password = body.newPassword;
  user.isPasswordChangeRequired = false;
  return { message: 'Password changed successfully' };
});
on('post', '/api/auth/upload-profile-picture', async ({ user, form }) => {
  const url = await storeImage(form?.get('profilePicture'), `${user.firstName} ${user.lastName}`);
  user.profilePicture = url;
  return { success: true, message: 'Profile picture uploaded', data: { url, filename: 'avatar', size: 0 } };
});
on('post', '/api/auth/forgot-password', () => ({ message: 'Password reset is disabled in the live demo.' }));

// Meta
on('get', '/api/meta/categories', () => ({ success: true, data: db().categories }));
on('get', '/api/meta/departments', () => ({ success: true, data: db().departments }));

// Courses
on('get', '/api/courses', () => ({
  success: true,
  data: db().courses.filter(isPublic).map((c) => ({
    ...c,
    teacher: teacherOf(c.teacherId),
    videos: courseVideos(c.id).map(({ id, title, duration, order }) => ({ id, title, duration, order })),
  })),
}));
on('get', '/api/courses/enrolled', ({ user }) => ({
  success: true,
  data: db().enrollments.filter((e) => e.userId === user.id).map((e) => {
    const c = db().courses.find((x) => x.id === e.courseId);
    if (!c) return null;
    return {
      ...c,
      teacher: teacherOf(c.teacherId),
      videos: courseVideos(c.id).map(({ id, title, duration, order }) => ({ id, title, duration, order })),
      completedAt: e.completedAt,
      enrollmentProgress: e.progress,
      isCompleted: !!e.completedAt,
    };
  }).filter(Boolean),
}));
on('get', '/api/courses/teacher/my-courses', ({ user }) => {
  requireRole(user, 'teacher', 'admin');
  const mine = db().courses.filter((c) => c.teacherId === user.id);
  return {
    success: true,
    courses: mine.map((c) => {
      const vids = courseVideos(c.id);
      return { ...c, videos: vids.map(({ id, title, duration, order, fileUrl, videoVariants, quality }) => ({ id, title, duration, order, fileUrl, videoVariants, quality })), totalVideos: vids.length };
    }),
  };
});
on('get', '/api/courses/teacher/students', ({ user }) => {
  requireRole(user, 'teacher', 'admin');
  const mine = new Map(db().courses.filter((c) => c.teacherId === user.id).map((c) => [c.id, c]));
  return {
    success: true,
    students: db().enrollments.filter((e) => mine.has(e.courseId)).map((e) => {
      const s = db().users.find((u) => u.id === e.userId);
      if (!s) return null;
      return { id: s.id, firstName: s.firstName, lastName: s.lastName, email: s.email, courseId: e.courseId, courseTitle: mine.get(e.courseId).title, enrolledAt: e.enrolledAt, progress: e.progress, completedAt: e.completedAt, isCompleted: !!e.completedAt };
    }).filter(Boolean),
  };
});
on('post', '/api/courses/upload-thumbnail', async ({ user, form }) => {
  requireRole(user, 'teacher', 'admin');
  const url = await storeImage(form?.get('thumbnail'), 'New course');
  return { success: true, message: 'Thumbnail uploaded', data: { url, filename: 'thumbnail', size: 0 } };
});
on('get', '/api/courses/:id', ({ user, params, query }) => {
  const c = findOr404(db().courses, params.id, 'Course');
  const adminPreview = user.role === 'admin' && (query.adminPreview === '1' || query.adminPreview === 'true');
  const e = enrollmentOf(user.id, c.id);
  const isTeacher = c.teacherId === user.id;
  if (!e && !isTeacher && !adminPreview) {
    if (!isPublic(c)) fail(404, 'Course not found');
    return {
      success: true,
      data: { id: c.id, title: c.title, description: c.description, category: c.category, level: c.level, studentCount: c.studentCount, teacher: teacherOf(c.teacherId), videos: [], chapters: c.chapters || [], thumbnail: c.thumbnail },
      message: 'Basic course information',
    };
  }
  const data = {
    ...c,
    teacher: teacherOf(c.teacherId),
    videos: courseVideos(c.id).map(({ id, title, description, duration, order, fileUrl }) => ({ id, title, description, duration, order, fileUrl })),
    isEnrolled: !!e,
    chapters: enrichChapters(c),
  };
  if (e) Object.assign(data, { completedAt: e.completedAt, isCompleted: !!e.completedAt, enrollmentProgress: e.progress });
  return { success: true, data };
});
on('post', '/api/courses/:id/enroll', ({ user, params }) => {
  const c = findOr404(db().courses, params.id, 'Course');
  if (enrollmentOf(user.id, c.id)) fail(400, 'Already enrolled in this course');
  db().enrollments.push({ id: newId('e'), userId: user.id, courseId: c.id, enrolledAt: now(), completedAt: null, progress: 0 });
  c.studentCount = (c.studentCount || 0) + 1;
  return [201, { success: true, message: 'Successfully enrolled in course' }];
});
on('post', '/api/courses/:id/complete', ({ user, params }) => {
  const e = enrollmentOf(user.id, params.id) || fail(404, 'Enrollment not found');
  e.completedAt = e.completedAt || now();
  e.progress = 100;
  return { success: true, message: 'Course marked as completed', data: { completedAt: e.completedAt, progress: 100 } };
});
on('post', '/api/courses', ({ user, body }) => {
  requireRole(user, 'teacher', 'admin');
  if (!body.title) fail(400, 'Title is required');
  const id = newId('c');
  const course = {
    id, title: String(body.title).slice(0, 120), description: body.description || '', thumbnail: body.thumbnail || thumbnailSvg(body.title, db().courses.length),
    category: body.category || '', department: body.department || '', level: body.level || 'beginner',
    adminDisabled: false, adminPublishLocked: false, teacherPublishAllowed: true, isPublished: false,
    duration: 0, totalVideos: 0, studentCount: 0, rating: '0.00', totalRatings: 0, language: 'en',
    teacherId: user.id, chapters: Array.isArray(body.chapters) ? body.chapters : [], createdAt: now(), updatedAt: now(),
  };
  linkChapterVideos(course);
  db().courses.push(course);
  log('info', `Course created: ${course.title}`, 'courses', user.id);
  return [201, { success: true, data: course, message: 'Course created successfully' }];
});
function linkChapterVideos(course) {
  (course.chapters || []).forEach((ch) => (ch.sections || []).forEach((s) => (s.videos || []).forEach((v, i) => {
    const video = v.id && db().videos.find((x) => x.id === v.id);
    if (video) { video.courseId = course.id; video.order = video.order || i + 1; }
  })));
}
on('put', '/api/courses/:id', ({ user, params, body }) => {
  const c = findOr404(db().courses, params.id, 'Course');
  if (c.teacherId !== user.id && user.role !== 'admin') fail(403, 'Not allowed to update this course');
  if (body.isPublished === true && c.teacherPublishAllowed === false) fail(403, 'Publishing is not allowed by admin');
  ['title', 'description', 'category', 'department', 'level', 'thumbnail', 'isPublished'].forEach((k) => { if (body[k] !== undefined) c[k] = body[k]; });
  if (Array.isArray(body.chapters)) { c.chapters = body.chapters; linkChapterVideos(c); }
  c.updatedAt = now();
  return { success: true, data: c, message: 'Course updated successfully' };
});
on('delete', '/api/courses/:id', ({ user, params }) => {
  const c = findOr404(db().courses, params.id, 'Course');
  if (c.teacherId !== user.id && user.role !== 'admin') fail(403, 'Not allowed to delete this course');
  removeCourse(c.id);
  return { success: true, message: 'Course deleted successfully' };
});
function removeCourse(id) {
  const d = db();
  d.courses = d.courses.filter((c) => c.id !== id);
  d.enrollments = d.enrollments.filter((e) => e.courseId !== id);
}

// Videos & files
on('post', '/api/videos/upload', async ({ user, form, config }) => {
  requireRole(user, 'teacher', 'admin');
  const file = form?.get('video');
  await fakeUploadProgress(config, file);
  const fileUrl = sampleVideoUrl(db().videos.length);
  const video = {
    id: newId('v'), courseId: form?.get('courseId') || null, teacherId: user.id,
    title: form?.get('title') || file?.name || 'New lesson', description: form?.get('description') || '',
    fileUrl, videoVariants: [{ quality: '720p', url: fileUrl, fileSize: 400000 }], duration: 24, fileSize: file?.size || 0,
    quality: '720p', format: 'mp4', isPublished: true, order: 0, views: 0, processingStatus: 'completed', processingProgress: 100,
    type: 'video', createdAt: now(), updatedAt: now(),
  };
  db().videos.push(video);
  return [201, { success: true, message: 'Upload simulated — the demo plays a sample video instead of storing your file.', data: video }];
});
on('post', '/api/files/upload', async ({ user, form, config }) => {
  requireRole(user, 'teacher', 'admin');
  const file = form?.get('file');
  await fakeUploadProgress(config, file);
  const video = {
    id: newId('v'), courseId: form?.get('courseId') || null, teacherId: user.id, title: form?.get('title') || file?.name || 'Document',
    description: '', fileUrl: samplePdfUrl(), videoVariants: [], duration: 0, fileSize: file?.size || 0, quality: '720p', format: 'pdf',
    isPublished: true, order: 0, views: 0, processingStatus: 'completed', processingProgress: 100, type: 'file', createdAt: now(), updatedAt: now(),
  };
  db().videos.push(video);
  return [201, { success: true, message: 'Upload simulated — a sample PDF is shown instead.', data: video }];
});
on('get', '/api/videos/course/:courseId/progress', ({ user, params }) => ({
  success: true,
  data: courseVideos(params.courseId).map((v) => {
    const p = progressOf(user.id, v.id);
    return { ...v, course: { id: v.courseId }, Progress: p ? [p] : [] };
  }),
}));
on('get', '/api/videos/:id', ({ user, params }) => {
  const v = findOr404(db().videos, params.id, 'Video');
  if (!canAccessVideo(user, v)) fail(403, 'You must be enrolled in this course to watch this video');
  const c = db().courses.find((x) => x.id === v.courseId);
  v.views = (v.views || 0) + 1;
  return {
    success: true,
    data: {
      ...withVideoMeta(v),
      course: c ? { id: c.id, title: c.title, teacherId: c.teacherId, isPublished: c.isPublished } : null,
      progress: progressOf(user.id, v.id) || null,
    },
  };
});
on('put', '/api/videos/:id', ({ user, params, body }) => {
  const v = findOr404(db().videos, params.id, 'Video');
  if (v.teacherId !== user.id && user.role !== 'admin') fail(403, 'Not allowed');
  ['courseId', 'title', 'description'].forEach((k) => { if (body[k] !== undefined) v[k] = body[k]; });
  return { success: true, message: 'Video updated', data: v };
});

// Progress
on('put', '/api/progress/video/:videoId', ({ user, params, body }) => {
  const v = findOr404(db().videos, params.videoId, 'Video');
  const course = db().courses.find((c) => c.id === v.courseId);
  if (!course || !enrollmentOf(user.id, course.id)) fail(403, 'Progress is only tracked for enrolled students');
  let p = progressOf(user.id, v.id);
  if (!p) {
    p = { id: newId('p'), userId: user.id, videoId: v.id, watchedDuration: 0, totalDuration: v.duration || 0, watchPercentage: 0, isCompleted: false, watchedSegments: [], notes: null, engagementScore: 0, consecutiveWatchTime: 0, pauseCount: 0, seekCount: 0, replayCount: 0, playCount: 0, completionMethod: null, createdAt: now() };
    db().progress.push(p);
  }
  const pct = Math.max(Number(p.watchPercentage) || 0, Math.min(100, Number(body.watchPercentage) || 0));
  p.watchPercentage = Math.round(pct * 100) / 100;
  p.watchedDuration = Math.max(p.watchedDuration || 0, Number(body.watchDuration) || 0);
  p.totalDuration = Number(body.totalDuration) || p.totalDuration;
  if (Array.isArray(body.watchedSegments)) p.watchedSegments = body.watchedSegments.slice(0, 200);
  if (pct >= 90 && !p.isCompleted) { p.isCompleted = true; p.completionMethod = 'watched'; }
  p.lastWatchedAt = now();
  p.updatedAt = now();
  recomputeEnrollment(user.id, course.id);
  return { message: 'Progress updated', progress: p };
});
on('get', '/api/progress/video/:videoId', ({ user, params }) => {
  const p = progressOf(user.id, params.videoId);
  if (!p) return { progress: null, message: 'No progress found' };
  const v = db().videos.find((x) => x.id === p.videoId);
  return { progress: { ...p, video: v ? { id: v.id, title: v.title, duration: v.duration, fileUrl: v.fileUrl } : null } };
});
on('put', '/api/progress/video/:videoId/notes', ({ user, params, body }) => {
  let p = progressOf(user.id, params.videoId);
  if (!p) {
    p = { id: newId('p'), userId: user.id, videoId: params.videoId, watchedDuration: 0, totalDuration: 0, watchPercentage: 0, isCompleted: false, watchedSegments: [], createdAt: now() };
    db().progress.push(p);
  }
  p.notes = String(body.notes || '').slice(0, 5000);
  p.lastWatchedAt = now();
  p.updatedAt = now();
  return { message: 'Notes updated', progress: { id: p.id, videoId: p.videoId, notes: p.notes, lastWatchedAt: p.lastWatchedAt } };
});
on('get', '/api/progress/course/:courseId', ({ user, params }) => {
  const vids = courseVideos(params.courseId);
  const list = vids.map((v) => {
    const p = progressOf(user.id, v.id);
    return p ? { ...p, video: { id: v.id, title: v.title, duration: v.duration, order: v.order } } : null;
  }).filter(Boolean);
  return {
    progress: list,
    courseStats: { totalVideos: vids.length, completedVideos: list.filter((p) => p.isCompleted).length, totalWatchTime: list.reduce((s, p) => s + (p.watchedDuration || 0), 0), averageEngagement: 70 },
  };
});
on('get', '/api/progress/user', ({ user }) => ({
  progress: db().progress.filter((p) => p.userId === user.id).map((p) => {
    const v = db().videos.find((x) => x.id === p.videoId);
    const c = v && db().courses.find((x) => x.id === v.courseId);
    return { ...p, video: v ? { id: v.id, title: v.title, duration: v.duration, fileUrl: v.fileUrl, courseId: v.courseId, course: c ? { id: c.id, title: c.title } : null } : null };
  }),
}));
on('get', '/api/progress/student/:studentId/course/:courseId', ({ user, params }) => {
  requireRole(user, 'teacher', 'admin');
  return {
    progress: courseVideos(params.courseId).map((v) => {
      const p = progressOf(params.studentId, v.id);
      const vq = db().videoQuizzes.find((x) => x.videoId === v.id);
      const passed = vq ? db().attempts.some((a) => a.userId === params.studentId && a.quizId === vq.quizId && a.passed) : null;
      return { id: p?.id || `none-${v.id}`, videoId: v.id, video: { id: v.id, title: v.title, duration: v.duration }, watchedDuration: p?.watchedDuration || 0, totalDuration: v.duration, watchPercentage: p?.watchPercentage || 0, isCompleted: !!p?.isCompleted, lastWatchedAt: p?.lastWatchedAt || null, quizPassed: passed };
    }),
  };
});

// Notes
on('get', '/api/notes', ({ user }) => ({ notes: db().notes.filter((n) => n.userId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) }));
on('post', '/api/notes', ({ user, body }) => {
  if (!body.title || !body.content) fail(400, 'Title and content are required');
  const note = { id: newId('n'), userId: user.id, title: String(body.title).slice(0, 200), description: body.description || '', content: String(body.content).slice(0, 10000), createdAt: now(), updatedAt: now() };
  db().notes.push(note);
  return [201, { note }];
});
on('put', '/api/notes/:id', ({ user, params, body }) => {
  const n = db().notes.find((x) => x.id === params.id && x.userId === user.id) || fail(404, 'Note not found');
  ['title', 'description', 'content'].forEach((k) => { if (body[k] !== undefined) n[k] = String(body[k]).slice(0, 10000); });
  n.updatedAt = now();
  return { note: n };
});
on('delete', '/api/notes/:id', ({ user, params }) => {
  db().notes = db().notes.filter((x) => !(x.id === params.id && x.userId === user.id));
  return { success: true };
});

// Quizzes
const quizQuestionsOf = (quizId) =>
  db().quizQuestions.filter((q) => q.quizId === quizId).sort((a, b) => a.order - b.order)
    .map((qq) => db().questions.find((q) => q.id === qq.questionId)).filter(Boolean);

on('get', '/api/quizzes/my', ({ user }) => {
  requireRole(user, 'teacher', 'admin');
  return {
    success: true,
    data: db().quizzes.filter((q) => q.teacherId === user.id || user.role === 'admin').map((q) => ({
      id: q.id, title: q.title, passThreshold: q.passThreshold, shuffleQuestions: q.shuffleQuestions, shuffleOptions: q.shuffleOptions, isFinal: q.isFinal, updatedAt: q.updatedAt,
      questionCount: quizQuestionsOf(q.id).length, assignmentCount: db().videoQuizzes.filter((v) => v.quizId === q.id).length,
    })),
  };
});
on('post', '/api/quizzes/upload-image', async ({ user, form }) => {
  requireRole(user, 'teacher', 'admin');
  const url = await storeImage(form?.get('image'), 'Question image');
  return { success: true, data: { url, filename: 'image', size: 0 } };
});
on('get', '/api/quizzes/video/:videoId', ({ user, params }) => {
  const vq = db().videoQuizzes.find((x) => x.videoId === params.videoId);
  if (!vq) return { hasQuiz: false };
  const quiz = db().quizzes.find((q) => q.id === vq.quizId);
  if (!quiz) return { hasQuiz: false };
  const passed = db().attempts.some((a) => a.userId === user.id && a.quizId === quiz.id && a.passed);
  return { hasQuiz: true, isRequired: vq.isRequired, unlockNextOnPass: vq.unlockNextOnPass, quizId: quiz.id, quizTitle: quiz.title, passed };
});
on('post', '/api/quizzes/attempts/:attemptId/submit', ({ user, params, body }) => {
  const att = db().attempts.find((a) => a.id === params.attemptId && a.userId === user.id) || fail(404, 'Attempt not found');
  const quiz = db().quizzes.find((q) => q.id === att.quizId);
  const qs = quizQuestionsOf(att.quizId);
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const numCorrect = qs.filter((q) => {
    const a = answers.find((x) => x.questionId === q.id);
    return a && q.options.find((o) => o.id === a.optionId)?.isCorrect;
  }).length;
  const scorePct = qs.length ? Math.round((numCorrect / qs.length) * 10000) / 100 : 0;
  const passed = scorePct / 100 >= Number(quiz?.passThreshold || 0.7);
  Object.assign(att, { submittedAt: now(), numCorrect, numQuestions: qs.length, scorePct, passed });
  if (passed && att.videoId) {
    const p = progressOf(user.id, att.videoId);
    if (p) p.isCompleted = true;
  }
  return { success: true, data: { passed, scorePct, numCorrect, numQuestions: qs.length } };
});
on('post', '/api/quizzes/:quizId/attempts', ({ user, params, body }) => {
  const quiz = findOr404(db().quizzes, params.quizId, 'Quiz');
  const isStaff = user.role !== 'student';
  if (!isStaff && body.videoId && !progressOf(user.id, body.videoId)?.isCompleted) {
    fail(403, 'Finish the video before starting the quiz', { error: 'Video not completed' });
  }
  const att = { id: newId('att'), userId: user.id, quizId: quiz.id, videoId: body.videoId || null, startedAt: now(), submittedAt: null, attemptNo: db().attempts.filter((a) => a.userId === user.id && a.quizId === quiz.id).length + 1 };
  db().attempts.push(att);
  return {
    success: true,
    data: { attemptId: att.id, quiz: { id: quiz.id, title: quiz.title, passThreshold: quiz.passThreshold }, questions: quizQuestionsOf(quiz.id).map((q) => ({ id: q.id, text: q.text, imageUrl: q.imageUrl, options: q.options.map(({ id, text }) => ({ id, text })) })) },
  };
});
on('get', '/api/quizzes/:quizId', ({ user, params }) => {
  requireRole(user, 'teacher', 'admin');
  const quiz = findOr404(db().quizzes, params.quizId, 'Quiz');
  return { success: true, data: { quiz, questions: quizQuestionsOf(quiz.id) } };
});
on('post', '/api/quizzes', ({ user, body }) => {
  requireRole(user, 'teacher', 'admin');
  const quiz = { id: newId('qz'), title: String(body.title || 'Untitled quiz').slice(0, 200), description: '', passThreshold: Number(body.passThreshold) || 0.7, timeLimitSec: null, maxAttempts: null, shuffleQuestions: false, shuffleOptions: false, isFinal: false, teacherId: user.id, createdAt: now(), updatedAt: now() };
  db().quizzes.push(quiz);
  return { success: true, data: quiz };
});
on('put', '/api/quizzes/:quizId', ({ user, params, body }) => {
  requireRole(user, 'teacher', 'admin');
  const quiz = findOr404(db().quizzes, params.quizId, 'Quiz');
  if (body.title !== undefined) quiz.title = String(body.title).slice(0, 200);
  if (body.passThreshold !== undefined) quiz.passThreshold = Number(body.passThreshold) || quiz.passThreshold;
  quiz.updatedAt = now();
  return { success: true, data: quiz };
});
on('delete', '/api/quizzes/:quizId', ({ user, params }) => {
  requireRole(user, 'teacher', 'admin');
  const d = db();
  d.quizzes = d.quizzes.filter((q) => q.id !== params.quizId);
  d.videoQuizzes = d.videoQuizzes.filter((v) => v.quizId !== params.quizId);
  d.quizQuestions = d.quizQuestions.filter((q) => q.quizId !== params.quizId);
  return { success: true };
});
const toOptions = (qid, opts) => (Array.isArray(opts) ? opts : []).slice(0, 8).map((o, i) => ({ id: o.id || `${qid}-o${i + 1}`, text: String(o.text || '').slice(0, 300), isCorrect: !!o.isCorrect }));
on('post', '/api/quizzes/:quizId/questions', ({ user, params, body }) => {
  requireRole(user, 'teacher', 'admin');
  findOr404(db().quizzes, params.quizId, 'Quiz');
  const id = newId('q');
  const question = { id, text: String(body.text || '').slice(0, 500), imageUrl: body.imageUrl || null, options: toOptions(id, body.options) };
  db().questions.push(question);
  db().quizQuestions.push({ quizId: params.quizId, questionId: id, order: quizQuestionsOf(params.quizId).length + 1 });
  return { success: true, data: { question, options: question.options } };
});
on('put', '/api/quizzes/:quizId/questions/:questionId', ({ user, params, body }) => {
  requireRole(user, 'teacher', 'admin');
  const q = findOr404(db().questions, params.questionId, 'Question');
  if (body.text !== undefined) q.text = String(body.text).slice(0, 500);
  if (body.imageUrl !== undefined) q.imageUrl = body.imageUrl;
  if (body.options) q.options = toOptions(q.id, body.options);
  return { success: true };
});
const assign = (quizId, videoId, body) => {
  const d = db();
  d.videoQuizzes = d.videoQuizzes.filter((v) => v.videoId !== videoId);
  const link = { id: newId('vq'), videoId, quizId, isRequired: !!body.isRequired, unlockNextOnPass: !!body.unlockNextOnPass };
  d.videoQuizzes.push(link);
  return link;
};
on('post', '/api/quizzes/:quizId/assign', ({ user, params, body }) => {
  requireRole(user, 'teacher', 'admin');
  return { success: true, data: assign(params.quizId, body.videoId, body) };
});
on('post', '/api/quizzes/:quizId/assign-to-videos', ({ user, params, body }) => {
  requireRole(user, 'teacher', 'admin');
  const ids = Array.isArray(body.videoIds) ? body.videoIds : [];
  ids.forEach((v) => assign(params.quizId, v, body));
  return { success: true, data: { assignedVideos: ids.length } };
});

// Admin
const adminOnly = (user) => requireRole(user, 'admin');
const paginate = (list, query, defLimit) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, parseInt(query.limit, 10) || defLimit);
  return { rows: list.slice((page - 1) * limit, page * limit), page, limit, total: list.length, pages: Math.max(1, Math.ceil(list.length / limit)) };
};
on('get', '/api/admin/stats', ({ user }) => {
  adminOnly(user);
  const d = db();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  return {
    success: true,
    data: {
      totalUsers: d.users.length, totalTeachers: d.users.filter((u) => u.role === 'teacher').length, totalStudents: d.users.filter((u) => u.role === 'student').length,
      totalCourses: d.courses.length, totalVideos: d.videos.length, totalProgress: d.progress.length,
      recentActivity: { newUsers: d.users.filter((u) => u.createdAt > weekAgo).length, newCourses: d.courses.filter((c) => c.createdAt > weekAgo).length },
    },
  };
});
on('get', '/api/admin/users', ({ user, query }) => {
  adminOnly(user);
  const s = String(query.search || '').toLowerCase();
  const list = db().users.filter((u) => !s || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(s))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const p = paginate(list, query, 10);
  return { success: true, data: p.rows.map(publicUser), pagination: { page: p.page, limit: p.limit, total: p.total, pages: p.pages } };
});
const createUser = ({ email, firstName, lastName, role }) => {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) fail(400, 'A valid email is required');
  if (db().users.some((u) => u.email === cleanEmail)) fail(400, 'User with this email already exists');
  if (db().users.length >= 200) fail(400, 'Demo limit reached — reset the demo to start over.');
  const tempPassword = `Demo-${Math.random().toString(36).slice(2, 8)}`;
  const u = {
    id: newId('u'), email: cleanEmail, password: tempPassword, firstName: String(firstName || 'New').slice(0, 60), lastName: String(lastName || 'User').slice(0, 60),
    role: ['student', 'teacher', 'admin'].includes(role) ? role : 'student', isEmailVerified: false, profilePicture: null, bio: '', isActive: true, lastLogin: null,
    isPasswordChangeRequired: true, authProvider: 'local', isProtected: false, createdAt: now(), updatedAt: now(),
  };
  db().users.push(u);
  return { u, tempPassword };
};
on('post', '/api/admin/users', ({ user, body }) => {
  adminOnly(user);
  const { u, tempPassword } = createUser(body);
  log('info', `User created: ${u.email}`, 'admin', user.id);
  return [201, { success: true, data: { user: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role, isPasswordChangeRequired: true }, tempPassword, emailSent: false, emailError: 'Email sending is disabled in the live demo' }, message: 'User created successfully' }];
});
on('post', '/api/admin/users/bulk', async ({ user, form }) => {
  adminOnly(user);
  const file = form?.get('file');
  if (!file) fail(400, 'CSV file is required');
  if (file.size > 200 * 1024) fail(400, 'In the demo, CSV files are limited to 200 KB');
  const text = await file.text();
  const [header, ...lines] = text.split(/\r?\n/).filter((l) => l.trim());
  const cols = (header || '').split(',').map((c) => c.trim().toLowerCase());
  const results = [];
  const errors = [];
  lines.slice(0, 50).forEach((line, i) => {
    const vals = line.split(',').map((v) => v.trim());
    const row = Object.fromEntries(cols.map((c, j) => [c, vals[j]]));
    try {
      const { u, tempPassword } = createUser({ email: row.email, firstName: row.firstname || row['first name'], lastName: row.lastname || row['last name'], role: (row.role || 'student').toLowerCase() });
      results.push({ email: u.email, tempPassword, role: u.role });
    } catch (e) {
      errors.push({ row: i + 2, email: row.email, error: e.data?.message || 'Invalid row' });
    }
  });
  return { success: true, data: { created: results.length, failed: errors.length, total: results.length + errors.length, results, errors }, message: `Bulk user creation completed. ${results.length} users created, ${errors.length} failed.` };
});
on('delete', '/api/admin/users/:id', ({ user, params }) => {
  adminOnly(user);
  const target = findOr404(db().users, params.id, 'User');
  if (target.id === user.id) fail(400, 'You cannot delete your own account');
  if (target.isProtected) fail(403, PROTECTED_MSG);
  const d = db();
  d.users = d.users.filter((u) => u.id !== target.id);
  d.enrollments = d.enrollments.filter((e) => e.userId !== target.id);
  log('warn', `User deleted: ${target.email}`, 'admin', user.id);
  return { success: true, message: 'User deleted successfully' };
});
on('put', '/api/admin/users/:id/role', ({ user, params, body }) => {
  adminOnly(user);
  const target = findOr404(db().users, params.id, 'User');
  if (target.isProtected) fail(403, PROTECTED_MSG);
  if (!['student', 'teacher', 'admin'].includes(body.role)) fail(400, 'Invalid role. Must be student, teacher, or admin');
  target.role = body.role;
  return { success: true, data: { id: target.id, role: target.role }, message: 'User role updated successfully' };
});
on('get', '/api/admin/courses', ({ user, query }) => {
  adminOnly(user);
  const p = paginate([...db().courses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), query, 50);
  return {
    success: true,
    data: p.rows.map((c) => ({ id: c.id, title: c.title, category: c.category, department: c.department, isPublished: c.isPublished, adminDisabled: c.adminDisabled, teacherPublishAllowed: c.teacherPublishAllowed, createdAt: c.createdAt, teacher: teacherOf(c.teacherId), videos: courseVideos(c.id).map(({ id }) => ({ id })) })),
    pagination: { page: p.page, limit: p.limit, total: p.total, pages: p.pages },
  };
});
on('put', '/api/admin/courses/:id', ({ user, params, body }) => {
  adminOnly(user);
  const c = findOr404(db().courses, params.id, 'Course');
  if (body.teacherPublishAllowed !== undefined) c.teacherPublishAllowed = !!body.teacherPublishAllowed;
  if (body.adminDisabled !== undefined) c.adminDisabled = !!body.adminDisabled;
  return { success: true, data: c, message: 'Course updated successfully' };
});
on('delete', '/api/admin/courses/:id', ({ user, params }) => {
  adminOnly(user);
  findOr404(db().courses, params.id, 'Course');
  removeCourse(params.id);
  return { success: true, message: 'Course deleted successfully' };
});
['categories', 'departments'].forEach((kind) => {
  on('get', `/api/admin/${kind}`, ({ user }) => { adminOnly(user); return { success: true, data: db()[kind] }; });
  on('post', `/api/admin/${kind}`, ({ user, body }) => {
    adminOnly(user);
    const name = String(body.name || '').trim().slice(0, 60);
    if (!name) fail(400, 'Name is required');
    if (db()[kind].some((x) => x.name.toLowerCase() === name.toLowerCase())) fail(400, 'Already exists');
    const item = { id: newId(kind.slice(0, 3)), name, createdAt: now(), updatedAt: now() };
    db()[kind].push(item);
    return { success: true, data: item };
  });
  on('delete', `/api/admin/${kind}/:id`, ({ user, params }) => {
    adminOnly(user);
    db()[kind] = db()[kind].filter((x) => x.id !== params.id);
    return { success: true, message: 'Deleted successfully' };
  });
});
on('get', '/api/admin/logs', ({ user, query }) => {
  adminOnly(user);
  const s = String(query.search || '').toLowerCase();
  const list = db().logs.filter((l) => (!query.level || l.level === query.level) && (!s || l.message.toLowerCase().includes(s)));
  const p = paginate(list, query, 20);
  return { success: true, data: { logs: p.rows, pagination: { totalItems: p.total, totalPages: p.pages, currentPage: p.page, itemsPerPage: p.limit } } };
});
on('get', '/api/admin/config/ldap', ({ user }) => { adminOnly(user); return { ldapBindDn: 'CN=svc-viducate,OU=Service,DC=corp,DC=example', ldapEnabled: false }; });
on('post', '/api/admin/config/ldap', () => fail(403, 'Directory settings are read-only in the live demo.'));

// ---------- adapter ----------
function parseRequest(config) {
  const url = new URL(config.url, window.location.origin);
  const query = Object.fromEntries(url.searchParams);
  Object.assign(query, config.params || {});
  let body = {};
  let form = null;
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    form = config.data;
    form.forEach((v, k) => { if (typeof v === 'string') body[k] = v; });
  } else if (typeof config.data === 'string' && config.data) {
    try { body = JSON.parse(config.data); } catch { body = {}; }
  } else if (config.data && typeof config.data === 'object') {
    body = config.data;
  }
  return { path: url.pathname, query, body, form };
}

function currentUser(config) {
  const header = config.headers?.Authorization || config.headers?.authorization || '';
  const token = String(header).replace(/^Bearer\s+/i, '') || localStorage.getItem('token') || '';
  const id = token.startsWith('demo.') ? token.slice(5) : null;
  return id ? db().users.find((u) => u.id === id && u.isActive) : null;
}

export async function mockAdapter(config) {
  await latency();
  const method = (config.method || 'get').toLowerCase();
  const { path, query, body, form } = parseRequest(config);
  let status = 200;
  let data;
  try {
    const route = routes.find((r) => r.method === method && r.re.test(path));
    if (!route) fail(404, `Not available in the live demo: ${method.toUpperCase()} ${path}`);
    const m = path.match(route.re);
    const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const user = currentUser(config);
    if (route.auth && !user) fail(401, 'Authentication required');
    const result = await route.handler({ user, params, query, body, form, config });
    if (Array.isArray(result)) [status, data] = result;
    else data = result;
    save();
  } catch (e) {
    if (e instanceof HttpError) {
      status = e.status;
      data = e.data;
    } else {
      console.error('[demo api]', e);
      status = 500;
      data = { success: false, message: 'Something went wrong in the demo. Try "Reset demo".' };
    }
  }
  const response = { data, status, statusText: String(status), headers: { 'content-type': 'application/json' }, config, request: {} };
  if (status >= 200 && status < 300) return response;
  throw new AxiosError(data?.message || `Request failed with status code ${status}`, status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, config, {}, response);
}
