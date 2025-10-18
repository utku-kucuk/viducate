const User = require('./User');
const Course = require('./Course');
const Video = require('./Video');
const Progress = require('./Progress');
const UserCourse = require('./UserCourse');

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

module.exports = {
  User,
  Course,
  Video,
  Progress,
  UserCourse
};
