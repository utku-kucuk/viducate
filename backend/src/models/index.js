const User = require('./User');
const Course = require('./Course');
const Video = require('./Video');
const Progress = require('./Progress');
const UserCourse = require('./UserCourse');
const Note = require('./Note');
const Quiz = require('./Quiz');
const Question = require('./Question');
const Option = require('./Option');
const QuizQuestion = require('./QuizQuestion');
const VideoQuiz = require('./VideoQuiz');
const QuizAttempt = require('./QuizAttempt');
const AttemptAnswer = require('./AttemptAnswer');
const Category = require('./Category');
const Department = require('./Department');

// User - Course relationships (Teacher creates courses)
User.hasMany(Course, { 
  foreignKey: 'teacherId', 
  as: 'createdCourses' 
});
Course.belongsTo(User, { 
  foreignKey: 'teacherId', 
  as: 'teacher' 
});

// Course - Video relationships
Course.hasMany(Video, { 
  foreignKey: 'courseId', 
  as: 'videos',
  onDelete: 'CASCADE'
});
Video.belongsTo(Course, { 
  foreignKey: 'courseId', 
  as: 'course',
  onDelete: 'CASCADE'
});

// User - Video relationships (Teacher creates videos)
User.hasMany(Video, { 
  foreignKey: 'teacherId', 
  as: 'createdVideos' 
});
Video.belongsTo(User, { 
  foreignKey: 'teacherId', 
  as: 'teacher' 
});

// User - Video relationships (Students watch videos)
User.belongsToMany(Video, { 
  through: Progress, 
  foreignKey: 'userId',
  otherKey: 'videoId',
  as: 'watchedVideos'
});
Video.belongsToMany(User, { 
  through: Progress, 
  foreignKey: 'videoId',
  otherKey: 'userId',
  as: 'viewers'
});
// Ensure progress rows are removed when a video is deleted
Video.hasMany(Progress, {
  foreignKey: 'videoId',
  as: 'progressRecords',
  onDelete: 'CASCADE'
});

// Progress relationships
Progress.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user' 
});
Progress.belongsTo(Video, { 
  foreignKey: 'videoId', 
  as: 'video',
  onDelete: 'CASCADE'
});

// User - Course relationships (Students can enroll in courses)
User.belongsToMany(Course, { 
  through: UserCourse, 
  foreignKey: 'userId',
  otherKey: 'courseId',
  as: 'enrolledCourses'
});
Course.belongsToMany(User, { 
  through: UserCourse, 
  foreignKey: 'courseId',
  otherKey: 'userId',
  as: 'students'
});

// UserCourse associations
UserCourse.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'student' 
});
UserCourse.belongsTo(Course, { 
  foreignKey: 'courseId', 
  as: 'course',
  onDelete: 'CASCADE'
});
User.hasMany(UserCourse, { 
  foreignKey: 'userId', 
  as: 'enrollments' 
});
Course.hasMany(UserCourse, { 
  foreignKey: 'courseId', 
  as: 'enrollments',
  onDelete: 'CASCADE'
});

// User - Note relationship
User.hasMany(Note, { foreignKey: 'userId', as: 'notes' });
Note.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Quizzes ownership
User.hasMany(Quiz, { foreignKey: 'teacherId', as: 'quizzes' });
Quiz.belongsTo(User, { foreignKey: 'teacherId', as: 'owner' });

// Questions and options
Question.hasMany(Option, { foreignKey: 'questionId', as: 'options', onDelete: 'CASCADE' });
Option.belongsTo(Question, { foreignKey: 'questionId', as: 'question', onDelete: 'CASCADE' });

// Quiz <-> Questions through QuizQuestion
Quiz.belongsToMany(Question, { through: QuizQuestion, foreignKey: 'quizId', otherKey: 'questionId', as: 'questions' });
Question.belongsToMany(Quiz, { through: QuizQuestion, foreignKey: 'questionId', otherKey: 'quizId', as: 'quizzes' });
QuizQuestion.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });
QuizQuestion.belongsTo(Quiz, { foreignKey: 'quizId', as: 'quiz' });

// Video assigned quizzes
Video.hasMany(VideoQuiz, { foreignKey: 'videoId', as: 'videoQuizzes', onDelete: 'CASCADE' });
Quiz.hasMany(VideoQuiz, { foreignKey: 'quizId', as: 'videoLinks', onDelete: 'CASCADE' });
VideoQuiz.belongsTo(Video, { foreignKey: 'videoId', as: 'video', onDelete: 'CASCADE' });
VideoQuiz.belongsTo(Quiz, { foreignKey: 'quizId', as: 'quiz', onDelete: 'CASCADE' });

// Attempts
QuizAttempt.belongsTo(User, { foreignKey: 'userId', as: 'user' });
QuizAttempt.belongsTo(Quiz, { foreignKey: 'quizId', as: 'quiz' });
QuizAttempt.belongsTo(Video, { foreignKey: 'videoId', as: 'video' });
QuizAttempt.hasMany(AttemptAnswer, { foreignKey: 'attemptId', as: 'answers', onDelete: 'CASCADE' });
AttemptAnswer.belongsTo(QuizAttempt, { foreignKey: 'attemptId', as: 'attempt', onDelete: 'CASCADE' });
AttemptAnswer.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });
AttemptAnswer.belongsTo(Option, { foreignKey: 'optionId', as: 'option' });

module.exports = {
  User,
  Course,
  Video,
  Progress,
  UserCourse
  , Note,
  Quiz,
  Question,
  Option,
  QuizQuestion,
  VideoQuiz,
  QuizAttempt,
  AttemptAnswer,
  Category,
  Department
};
