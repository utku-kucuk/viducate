// Fictional seed data for the in-browser demo. No real people or emails.

export const DEMO_PASSWORD = 'demo1234';

export const DEMO_ACCOUNTS = [
  { role: 'admin', email: 'admin@viducate.demo', name: 'Ada Admin' },
  { role: 'teacher', email: 'teacher@viducate.demo', name: 'Elif Demir' },
  { role: 'student', email: 'student@viducate.demo', name: 'Deniz Yılmaz' },
];

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

// Absolute URLs so the app's media resolvers use them as-is
const asset = (path) => `${window.location.origin}${process.env.PUBLIC_URL || ''}/demo/${path}`;

export const SAMPLE_VIDEOS = ['videos/lesson-a.mp4', 'videos/lesson-b.mp4', 'videos/lesson-c.mp4'];
export const sampleVideoUrl = (i) => asset(SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length]);
export const samplePdfUrl = () => asset('files/course-handbook.pdf');

const PALETTES = [
  ['#1e1b4b', '#5b3df5'],
  ['#0f3d3a', '#0f766e'],
  ['#1f2937', '#2563eb'],
  ['#3b0764', '#9333ea'],
  ['#422006', '#d97706'],
  ['#450a0a', '#dc2626'],
];

export function thumbnailSvg(title, i = 0) {
  const [a, b] = PALETTES[i % PALETTES.length];
  const safe = String(title).replace(/[<>&"]/g, '').slice(0, 34);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><text x="40" y="70" font-family="Inter,Arial,sans-serif" font-size="20" fill="#ffffff" fill-opacity=".7" letter-spacing="3">VIDUCATE</text><text x="40" y="300" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="700" fill="#ffffff">${safe}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildSeed() {
  const users = [
    { id: 'u-admin', email: 'admin@viducate.demo', firstName: 'Ada', lastName: 'Admin', role: 'admin' },
    { id: 'u-teacher', email: 'teacher@viducate.demo', firstName: 'Elif', lastName: 'Demir', role: 'teacher', bio: 'Backend engineer and instructor. Teaches APIs, databases and containers.' },
    { id: 'u-student', email: 'student@viducate.demo', firstName: 'Deniz', lastName: 'Yılmaz', role: 'student', bio: 'Computer engineering student.' },
    { id: 'u-t2', email: 'can.aksoy@viducate.demo', firstName: 'Can', lastName: 'Aksoy', role: 'teacher' },
    { id: 'u-s2', email: 'mert.kaya@viducate.demo', firstName: 'Mert', lastName: 'Kaya', role: 'student' },
    { id: 'u-s3', email: 'zeynep.arslan@viducate.demo', firstName: 'Zeynep', lastName: 'Arslan', role: 'student' },
    { id: 'u-s4', email: 'emre.celik@viducate.demo', firstName: 'Emre', lastName: 'Çelik', role: 'student' },
    { id: 'u-s5', email: 'selin.ozturk@viducate.demo', firstName: 'Selin', lastName: 'Öztürk', role: 'student' },
    { id: 'u-s6', email: 'burak.sahin@viducate.demo', firstName: 'Burak', lastName: 'Şahin', role: 'student' },
    { id: 'u-s7', email: 'ayse.koc@viducate.demo', firstName: 'Ayşe', lastName: 'Koç', role: 'student' },
  ].map((u, i) => ({
    password: DEMO_PASSWORD,
    isEmailVerified: true,
    profilePicture: null,
    bio: '',
    isActive: true,
    lastLogin: daysAgo(i % 5),
    isPasswordChangeRequired: false,
    authProvider: 'local',
    isProtected: true,
    createdAt: daysAgo(60 - i),
    updatedAt: daysAgo(2),
    ...u,
  }));

  const categories = ['Software Development', 'Databases', 'DevOps', 'Security'].map((name, i) => ({
    id: `cat-${i + 1}`,
    name,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(90),
  }));
  const departments = ['Engineering', 'IT Operations', 'Data'].map((name, i) => ({
    id: `dep-${i + 1}`,
    name,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(90),
  }));

  const courseDefs = [
    {
      title: 'Building REST APIs',
      description: 'Design clean, predictable HTTP APIs: resources, verbs, status codes, pagination and error handling — with a small project at the end.',
      category: 'Software Development', department: 'Engineering', level: 'beginner', teacherId: 'u-teacher',
      lessons: ['Resources and endpoints', 'Status codes that make sense', 'Pagination and filtering'],
      pdf: 'API design checklist (PDF)',
    },
    {
      title: 'Relational Data Modeling',
      description: 'From entities to tables: keys, relationships, normalization and the indexes that keep queries fast.',
      category: 'Databases', department: 'Data', level: 'intermediate', teacherId: 'u-teacher',
      lessons: ['Entities and relationships', 'Normal forms in practice', 'Indexes and query plans'],
    },
    {
      title: 'Containers in Practice',
      description: 'Package services with Docker, wire them together with Compose and ship the same image from laptop to server.',
      category: 'DevOps', department: 'IT Operations', level: 'beginner', teacherId: 'u-teacher',
      lessons: ['Images and layers', 'Volumes and networks', 'Multi-service apps with Compose'],
    },
    {
      title: 'Web Security Essentials',
      description: 'Authentication, sessions and tokens, plus the OWASP issues every backend developer should recognise.',
      category: 'Security', department: 'Engineering', level: 'intermediate', teacherId: 'u-t2',
      lessons: ['Passwords, hashing and sessions', 'JWT done right', 'Common OWASP pitfalls'],
    },
    {
      title: 'Linux for Developers',
      description: 'The shell, processes, permissions and logs — enough Linux to run and debug your own services.',
      category: 'DevOps', department: 'IT Operations', level: 'beginner', teacherId: 'u-t2',
      lessons: ['Navigating the shell', 'Processes and services', 'Reading logs'],
    },
    {
      title: 'CI/CD Pipelines (draft)',
      description: 'Automate tests and deployments with a pipeline you can trust. Draft course — not yet published.',
      category: 'DevOps', department: 'Engineering', level: 'advanced', teacherId: 'u-teacher',
      lessons: ['Pipeline anatomy', 'Testing stages'],
      draft: true,
    },
  ];

  const courses = [];
  const videos = [];
  let videoIndex = 0;

  courseDefs.forEach((def, ci) => {
    const courseId = `c-${ci + 1}`;
    const items = def.lessons.map((title, li) => {
      const id = `v-${ci + 1}-${li + 1}`;
      const fileUrl = sampleVideoUrl(videoIndex++);
      videos.push({
        id, courseId, teacherId: def.teacherId, title,
        description: `${def.title} — lesson ${li + 1}.`,
        fileUrl,
        videoVariants: [{ quality: '720p', url: fileUrl, fileSize: 400000 }],
        thumbnail: null, duration: 24, fileSize: 400000, quality: '720p', format: 'mp4',
        isPublished: true, isFree: false, order: li + 1, views: 40 + ci * 7 + li * 3,
        processingStatus: 'completed', processingProgress: 100, type: 'video',
        createdAt: daysAgo(40 - ci), updatedAt: daysAgo(10),
      });
      return { id, title, description: '', type: 'video', fileUrl, duration: 24 };
    });
    if (def.pdf) {
      const id = `v-${ci + 1}-pdf`;
      const fileUrl = samplePdfUrl();
      videos.push({
        id, courseId, teacherId: def.teacherId, title: def.pdf, description: 'Reference material for the course.',
        fileUrl, videoVariants: [], thumbnail: null, duration: 0, fileSize: 60000, quality: '720p', format: 'pdf',
        isPublished: true, isFree: false, order: items.length + 1, views: 18,
        processingStatus: 'completed', processingProgress: 100, type: 'file',
        createdAt: daysAgo(30), updatedAt: daysAgo(10),
      });
      items.push({ id, title: def.pdf, description: '', type: 'file', fileUrl, duration: 0 });
    }
    const half = Math.ceil(items.length / 2);
    courses.push({
      id: courseId,
      title: def.title,
      description: def.description,
      thumbnail: thumbnailSvg(def.title, ci),
      category: def.category,
      department: def.department,
      level: def.level,
      adminDisabled: false,
      adminPublishLocked: false,
      teacherPublishAllowed: true,
      isPublished: !def.draft,
      duration: items.length * 24,
      totalVideos: items.length,
      studentCount: 0,
      rating: (4.3 + (ci % 3) * 0.2).toFixed(2),
      totalRatings: 12 + ci * 5,
      language: 'en',
      teacherId: def.teacherId,
      chapters: [
        { title: 'Chapter 1 · Foundations', description: '', sections: [{ title: 'Getting started', description: '', videos: items.slice(0, half) }] },
        { title: 'Chapter 2 · Going further', description: '', sections: [{ title: 'Hands-on', description: '', videos: items.slice(half) }] },
      ],
      createdAt: daysAgo(45 - ci * 3),
      updatedAt: daysAgo(5),
    });
  });

  // Enrollments: demo student + fictional students
  const enrollments = [];
  const enroll = (userId, courseId, days, progress = 0, completed = false) =>
    enrollments.push({ id: `e-${enrollments.length + 1}`, userId, courseId, enrolledAt: daysAgo(days), completedAt: completed ? daysAgo(1) : null, progress });
  enroll('u-student', 'c-1', 20, 33);
  enroll('u-student', 'c-2', 12, 0);
  enroll('u-student', 'c-3', 30, 100, true);
  ['u-s2', 'u-s3', 'u-s4', 'u-s5', 'u-s6', 'u-s7'].forEach((s, i) => {
    enroll(s, 'c-1', 25 - i, (i * 23) % 100, i === 2);
    if (i % 2 === 0) enroll(s, 'c-3', 18 - i, (i * 31) % 100);
    if (i % 3 === 0) enroll(s, 'c-4', 10 - i, 50);
  });
  courses.forEach((c) => { c.studentCount = enrollments.filter((e) => e.courseId === c.id).length; });

  const progress = [];
  const addProgress = (userId, videoId, pct, notes = null) =>
    progress.push({
      id: `p-${progress.length + 1}`, userId, videoId,
      watchedDuration: Math.round((24 * pct) / 100), totalDuration: 24, watchPercentage: pct,
      isCompleted: pct >= 90, lastWatchedAt: daysAgo(1), watchedSegments: [], notes,
      engagementScore: 70, consecutiveWatchTime: 0, pauseCount: 1, seekCount: 0, replayCount: 0, playCount: 1,
      completionMethod: pct >= 90 ? 'watched' : null, createdAt: daysAgo(3), updatedAt: daysAgo(1),
    });
  addProgress('u-student', 'v-1-1', 100, 'Use nouns for resources, verbs come from HTTP methods.');
  addProgress('u-student', 'v-1-2', 45);
  ['v-3-1', 'v-3-2', 'v-3-3'].forEach((v) => addProgress('u-student', v, 100));

  // Quizzes
  const quizzes = [];
  const questions = [];
  const quizQuestions = [];
  const videoQuizzes = [];
  const addQuiz = (id, title, videoId, isRequired, qs) => {
    quizzes.push({ id, title, description: '', passThreshold: 0.7, timeLimitSec: null, maxAttempts: null, shuffleQuestions: false, shuffleOptions: false, isFinal: false, teacherId: 'u-teacher', createdAt: daysAgo(20), updatedAt: daysAgo(8) });
    qs.forEach(([text, opts, correct], qi) => {
      const qid = `${id}-q${qi + 1}`;
      questions.push({ id: qid, text, imageUrl: null, options: opts.map((o, oi) => ({ id: `${qid}-o${oi + 1}`, text: o, isCorrect: oi === correct })) });
      quizQuestions.push({ quizId: id, questionId: qid, order: qi + 1 });
    });
    videoQuizzes.push({ id: `vq-${id}`, videoId, quizId: id, isRequired, unlockNextOnPass: isRequired });
  };
  addQuiz('qz-1', 'REST basics check', 'v-1-1', true, [
    ['Which HTTP method should create a new resource?', ['GET', 'POST', 'DELETE', 'HEAD'], 1],
    ['What status code means "created"?', ['200', '201', '204', '404'], 1],
    ['A good resource name is…', ['/getUsers', '/users', '/doUserList', '/user_action'], 1],
  ]);
  addQuiz('qz-2', 'Normalization quiz', 'v-2-2', false, [
    ['A primary key must be…', ['Nullable', 'Unique', 'A string', 'Optional'], 1],
    ['3NF removes…', ['Transitive dependencies', 'Indexes', 'Foreign keys', 'Views'], 0],
  ]);
  addQuiz('qz-3', 'Docker fundamentals', 'v-3-1', false, [
    ['An image is…', ['A running process', 'A read-only template for containers', 'A volume', 'A network'], 1],
    ['Which file defines multi-container apps?', ['Dockerfile', 'compose.yaml', 'package.json', '.env'], 1],
  ]);

  const attempts = [
    { id: 'att-1', userId: 'u-student', quizId: 'qz-1', videoId: 'v-1-1', startedAt: daysAgo(2), submittedAt: daysAgo(2), numCorrect: 3, numQuestions: 3, scorePct: 100, passed: true, attemptNo: 1, answers: [] },
  ];

  const notes = [
    { id: 'n-1', userId: 'u-student', title: 'API design', description: 'Things to remember', content: 'Prefer plural nouns. Return 201 + Location on create. Paginate with limit/offset or cursors.', createdAt: daysAgo(6), updatedAt: daysAgo(2) },
    { id: 'n-2', userId: 'u-student', title: 'Docker commands', description: '', content: 'docker build -t app .\ndocker compose up -d\ndocker logs -f app', createdAt: daysAgo(9), updatedAt: daysAgo(9) },
  ];

  const logMessages = [
    ['info', 'User logged in', 'auth'], ['info', 'Course published', 'courses'], ['info', 'Video processed', 'videos'],
    ['warn', 'Slow query on /api/courses (812 ms)', 'db'], ['info', 'Quiz attempt submitted', 'quizzes'],
    ['error', 'Thumbnail generation failed — retried', 'videos'], ['info', 'User enrolled in course', 'courses'],
    ['info', 'Bulk import: 6 users created', 'admin'], ['warn', 'Rate limit hit on /api/auth/login', 'auth'],
    ['info', 'Nightly backup completed', 'system'],
  ];
  const logs = Array.from({ length: 24 }, (_, i) => {
    const [level, message, context] = logMessages[i % logMessages.length];
    return { id: 24 - i, level, message, context, userId: i % 3 === 0 ? 'u-student' : null, meta: { requestId: `req-${1000 + i}` }, createdAt: new Date(Date.now() - i * 3.7 * 3600000).toISOString() };
  });

  return { users, categories, departments, courses, videos, enrollments, progress, quizzes, questions, quizQuestions, videoQuizzes, attempts, notes, logs };
}
