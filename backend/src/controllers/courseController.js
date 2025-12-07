const { sequelize } = require('../config/database');
const { Course, User, Video, UserCourse, Progress, Quiz, QuizAttempt } = require('../models');
const { validationResult } = require('express-validator');

// Get all courses (for students)
const getAllCourses = async (req, res) => {
  try {
    const where = {};
    // Public browse list should only show publicly visible courses for all roles
    where.isPublished = true;
    where.adminDisabled = false;
    where.teacherPublishAllowed = true;

    const courses = await Course.findAll({
      where,
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Video,
          as: 'videos',
          attributes: ['id', 'title', 'duration', 'order']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get courses by teacher
const getTeacherCourses = async (req, res) => {
  try {
    const courses = await Course.findAll({
      where: { teacherId: req.user.id },
      include: [
        {
          model: Video,
          as: 'videos',
          attributes: ['id', 'title', 'duration', 'order', 'fileUrl', 'videoVariants', 'quality']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Process courses to enhance chapters with video data
    const processedCourses = courses.map(course => {
      const courseData = course.toJSON();
      
      // Parse chapters if they exist
      if (courseData.chapters && typeof courseData.chapters === 'string') {
        try {
          courseData.chapters = JSON.parse(courseData.chapters);
        } catch (error) {
          console.error('Error parsing chapters:', error);
          courseData.chapters = [];
        }
      }
      
      // Count videos from chapters
      let videoCount = 0;
      if (Array.isArray(courseData.chapters)) {
        courseData.chapters.forEach(chapter => {
          if (Array.isArray(chapter.sections)) {
            chapter.sections.forEach(section => {
              if (Array.isArray(section.videos)) {
                videoCount += section.videos.length;
              }
            });
          }
        });
      }
      
      // Set video count (from chapters or direct videos)
      courseData.videos = courseData.videos || [];
      courseData.totalVideos = videoCount || courseData.videos.length;
      
      return courseData;
    });

    res.json({
      success: true,
      courses: processedCourses
    });
  } catch (error) {
    console.error('Error fetching teacher courses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get students enrolled in teacher's courses
const getTeacherStudents = async (req, res) => {
  try {
    const students = await UserCourse.findAll({
      include: [
        {
          model: Course,
          where: { teacherId: req.user.id },
          attributes: ['id', 'title'],
          as: 'course'
        },
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email'],
          as: 'student'
        }
      ],
      order: [['enrolledAt', 'DESC']]
    });

    // Transform data for frontend
    const transformedStudents = students.map(enrollment => ({
      id: enrollment.student.id,
      firstName: enrollment.student.firstName,
      lastName: enrollment.student.lastName,
      email: enrollment.student.email,
      courseId: enrollment.course.id,
      courseTitle: enrollment.course.title,
      enrolledAt: enrollment.enrolledAt,
      progress: enrollment.progress || 0,
      completedAt: enrollment.completedAt,
      isCompleted: !!enrollment.completedAt
    }));

    res.json({
      success: true,
      students: transformedStudents
    });
  } catch (error) {
    console.error('Error fetching teacher students:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get enrolled courses for student
const getEnrolledCourses = async (req, res) => {
  try {
    const enrolledCourses = await Course.findAll({
      include: [
        {
          model: User,
          as: 'students',
          where: { id: req.user.id },
          attributes: [],
          through: { 
            attributes: ['completedAt', 'progress', 'enrolledAt']
          }
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Video,
          as: 'videos',
          attributes: ['id', 'title', 'duration', 'order']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Add enrollment info (completedAt, progress) to each course
    const coursesWithEnrollment = await Promise.all(enrolledCourses.map(async (course) => {
      const enrollment = await UserCourse.findOne({
        where: { userId: req.user.id, courseId: course.id }
      });
      
      const courseData = course.toJSON();
      if (enrollment) {
        courseData.completedAt = enrollment.completedAt;
        courseData.enrollmentProgress = enrollment.progress || 0;
        courseData.isCompleted = !!enrollment.completedAt;
      }
      return courseData;
    }));

    res.json({
      success: true,
      data: coursesWithEnrollment
    });
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Enroll in a course
const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    // Prevent creator (teacher/admin who created) from enrolling into own course
    if (course.teacherId === userId) {
      return res.status(403).json({
        success: false,
        message: 'You cannot enroll in your own course'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await UserCourse.findOne({
      where: { userId, courseId }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Create enrollment
    await UserCourse.create({
      userId,
      courseId,
      enrolledAt: new Date()
    });

    // Update student count
    await course.increment('studentCount');

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course'
    });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Unenroll from a course
const unenrollFromCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Check if enrolled
    const enrollment = await UserCourse.findOne({
      where: { userId, courseId }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Remove enrollment
    await enrollment.destroy();

    // Update student count
    const course = await Course.findByPk(courseId);
    if (course) {
      await course.decrement('studentCount');
    }

    res.json({
      success: true,
      message: 'Successfully unenrolled from course'
    });
  } catch (error) {
    console.error('Error unenrolling from course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create new course (teacher only)
const createCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, description, category, department, level, chapters, thumbnail, videoIds /*, isPublished*/ } = req.body;

    // Create course first
    // Some existing DBs may still enforce NOT NULL on category; use empty string fallback
    const safeCategory = category && String(category).trim() !== '' ? String(category).trim() : '';
    const safeDepartment = department && String(department).trim() !== '' ? String(department).trim() : null;

    const course = await Course.create({
      title,
      description,
      category: safeCategory,
      department: safeDepartment,
      level,
      chapters: chapters || [],
      thumbnail: thumbnail || null,
      teacherId: req.user.id,
      // Always keep unpublished initially; can be published after videos complete processing
      isPublished: false
    });
    // If client provided pre-uploaded video ids, attach them
    if (Array.isArray(videoIds) && videoIds.length > 0) {
      try {
        await Video.update(
          { courseId: course.id },
          { where: { id: videoIds, teacherId: req.user.id } }
        );

        // After linking, check publish condition: all videos completed
        // Do not auto-publish here; publishing will be controlled explicitly after processing
      } catch (linkErr) {
        console.error('Failed to link videos to course:', linkErr);
      }
    }

    console.log('Course created successfully:', course.id);
    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully'
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update course (teacher only)
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, department, level, chapters, thumbnail, isPublished } = req.body;

    console.log('Updating course:', id, 'with data:', { title, description, category, level, chapters });

    const course = await Course.findOne({
      where: { id, teacherId: req.user.id }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission'
      });
    }

    const updateData = {};
    // Only update fields that are provided and not empty
    if (title !== undefined && title && title.trim() !== '') updateData.title = title;
    if (description !== undefined && description && description.trim() !== '') updateData.description = description;
    if (category !== undefined) updateData.category = category && category.trim() !== '' ? category : null;
    if (department !== undefined) updateData.department = department && department.trim() !== '' ? department : null;
    if (level !== undefined && level) updateData.level = level;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (chapters !== undefined) {
      // Ensure chapters is properly formatted
      if (Array.isArray(chapters)) {
        updateData.chapters = chapters;
      } else {
        console.error('Invalid chapters format:', chapters);
        return res.status(400).json({
          success: false,
          message: 'Invalid chapters format'
        });
      }
    }
    if (isPublished !== undefined) {
      const desired = Boolean(isPublished);
      // If admin disallowed publishing, block publishing but allow unpublish
      if (desired === true && course.teacherPublishAllowed === false) {
        return res.status(403).json({ success: false, message: 'Publishing is not allowed by admin.' });
      }
      // Prevent publishing if admin disabled
      if (course.adminDisabled && desired === true) {
        return res.status(403).json({ success: false, message: 'Course is disabled by admin and cannot be published.' });
      }
      // Enforce: All course videos must finish processing before publishing
      if (desired === true) {
        try {
          const vids = await Video.findAll({ where: { courseId: id } });
          const hasVideos = vids.length > 0;
          const allCompleted = !hasVideos || vids.every(v => v.processingStatus === 'completed');
          if (!allCompleted) {
            return res.status(400).json({
              success: false,
              message: 'Course cannot be published until all videos finish processing.'
            });
          }
        } catch (e) {
          console.error('Failed to validate video processing before publish:', e);
          return res.status(500).json({ success: false, message: 'Failed to validate course videos for publishing.' });
        }
      }
      updateData.isPublished = desired;
    }

    console.log('Update data:', updateData);
    
    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return res.json({
        success: true,
        data: course,
        message: 'No updates needed'
      });
    }
    
    await course.update(updateData);

    // If publish status changed, propagate to videos of this course
    if (isPublished !== undefined) {
      try {
        await Video.update(
          { isPublished: Boolean(isPublished) },
          { where: { courseId: id } }
        );
      } catch (e) {
        console.error('Failed to propagate video publish status:', e);
      }
    }

    res.json({
      success: true,
      data: course,
      message: 'Course updated successfully'
    });
  } catch (error) {
    console.error('Error updating course:', error);
    
    // Handle validation errors specifically
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete course (teacher only) - ensure related rows are removed to avoid FK errors
const deleteCourse = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const course = await Course.findOne({
      where: { id, teacherId: req.user.id }
    });

    if (!course) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission'
      });
    }

    // Find videos to clean up progress rows first
    const videos = await Video.findAll({ where: { courseId: id }, transaction });
    const videoIds = videos.map(v => v.id);

    if (videoIds.length > 0) {
      await Progress.destroy({ where: { videoId: videoIds }, transaction });
    }

    // Remove enrollments for this course
    await UserCourse.destroy({ where: { courseId: id }, transaction });

    // Remove videos (hasMany with onDelete: 'CASCADE' but we do explicit delete for SQLite safety)
    await Video.destroy({ where: { courseId: id }, transaction });

    // Finally delete course
    await course.destroy({ transaction });

    await transaction.commit();
    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get single course with videos
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const adminPreview = isAdmin && (req.query.adminPreview === '1' || req.query.adminPreview === 'true');

  const course = await Course.findByPk(id, {
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Video,
          as: 'videos',
          attributes: ['id', 'title', 'description', 'duration', 'order', 'fileUrl'],
          order: [['order', 'ASC']]
        }
      ]
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled or is the teacher/admin
    const isEnrolled = await UserCourse.findOne({
      where: { userId, courseId: id }
    });

    const isTeacher = course.teacherId === userId;

    // If user is not enrolled and not the teacher (and not adminPreview), return basic course info only
    if (!isEnrolled && !isTeacher && !adminPreview) {
      // Hide courses not publicly visible from non-enrolled non-teachers
      if (!course.isPublished || course.adminDisabled || course.teacherPublishAllowed === false) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }
      const basicCourseInfo = {
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        studentCount: course.studentCount,
        teacher: course.teacher,
        videos: [], // Don't include videos for non-enrolled users
        chapters: course.chapters || []
      };

      return res.json({
        success: true,
        data: basicCourseInfo,
        message: 'Basic course information'
      });
    }

    // Add enrollment status to the course data
    const courseData = course.toJSON();
    // Only reflect real enrollment; adminPreview does not equal enrollment
    courseData.isEnrolled = !!isEnrolled;
    
    // Add completion status if enrolled
    if (isEnrolled) {
      const enrollment = await UserCourse.findOne({
        where: { userId, courseId: id }
      });
      if (enrollment) {
        courseData.completedAt = enrollment.completedAt;
        courseData.isCompleted = !!enrollment.completedAt;
        courseData.enrollmentProgress = enrollment.progress || 0;
      }
    }
    
    // Ensure chapters are properly parsed if they exist
    if (courseData.chapters && typeof courseData.chapters === 'string') {
      try {
        courseData.chapters = JSON.parse(courseData.chapters);
      } catch (error) {
        console.error('Error parsing chapters:', error);
        courseData.chapters = [];
      }
    }
    
    // Enhance chapters with actual video data from Video model
    if (Array.isArray(courseData.chapters)) {
      // Get all video IDs from chapters
      const videoIdsInChapters = [];
      courseData.chapters.forEach(chapter => {
        if (Array.isArray(chapter.sections)) {
          chapter.sections.forEach(section => {
            if (Array.isArray(section.videos)) {
              section.videos.forEach(video => {
                if (video.id) {
                  videoIdsInChapters.push(video.id);
                }
              });
            }
          });
        }
      });
      
      // Fetch actual video records if any IDs found
      if (videoIdsInChapters.length > 0) {
        try {
          const actualVideos = await Video.findAll({
            where: { id: videoIdsInChapters },
            attributes: ['id', 'title', 'fileUrl', 'videoVariants', 'quality', 'duration', 'description']
          });
          
          // Create a map for quick lookup
          const videoMap = new Map();
          actualVideos.forEach(video => {
            const videoData = video.toJSON();
            // Add resolution data
            try {
              videoData.availableQualities = video.getAvailableQualities();
              videoData.selectedUrl = video.getVideoUrl() || videoData.fileUrl;
              videoData.currentQuality = videoData.availableQualities.length > 0 
                ? videoData.availableQualities[videoData.availableQualities.length - 1] 
                : videoData.quality || null;
            } catch (error) {
              console.error('Error processing video in chapters:', error);
              videoData.availableQualities = videoData.quality ? [videoData.quality] : [];
              videoData.selectedUrl = videoData.fileUrl;
              videoData.currentQuality = videoData.quality || null;
            }
            videoMap.set(videoData.id, videoData);
          });
          
          // Update chapters with actual video data
          courseData.chapters = courseData.chapters.map(chapter => ({
            ...chapter,
            sections: chapter.sections ? chapter.sections.map(section => ({
              ...section,
              videos: section.videos ? section.videos.map(video => {
                const actualVideo = videoMap.get(video.id);
                if (actualVideo) {
                  // Merge chapter video data with actual video data
                  return {
                    ...video,
                    ...actualVideo,
                    // Preserve chapter-specific data
                    title: video.title || actualVideo.title,
                    description: video.description || actualVideo.description
                  };
                }
                // If video not found in DB, ensure it has at least fileUrl
                return {
                  ...video,
                  fileUrl: video.fileUrl || null,
                  selectedUrl: video.fileUrl || null,
                  availableQualities: video.quality ? [video.quality] : [],
                  currentQuality: video.quality || null
                };
              }) : []
            })) : []
          }));
        } catch (error) {
          console.error('Error fetching videos for chapters:', error);
          // Continue with chapters as-is if video fetch fails
        }
      }
    }
    
    console.log('Course data with chapters:', courseData.chapters);
    
    res.json({
      success: true,
      data: courseData
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Complete a course (mark as completed)
const completeCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Check if user is enrolled
    const enrollment = await UserCourse.findOne({
      where: { userId, courseId }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Check if already completed
    if (enrollment.completedAt) {
      return res.json({
        success: true,
        message: 'Course already completed',
        data: { completedAt: enrollment.completedAt }
      });
    }

    // Get course to check all content
    const course = await Course.findByPk(courseId, {
      include: [
        {
          model: Video,
          as: 'videos',
          attributes: ['id', 'title', 'fileUrl', 'type']
        }
      ]
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get all videos/files in the course (from chapters or videos list)
    let allContent = [];
    if (course.chapters && Array.isArray(course.chapters)) {
      course.chapters.forEach(chapter => {
        if (chapter.sections && Array.isArray(chapter.sections)) {
          chapter.sections.forEach(section => {
            if (section.videos && Array.isArray(section.videos)) {
              section.videos.forEach(video => {
                allContent.push(video);
              });
            }
          });
        }
      });
    }
    if (allContent.length === 0 && course.videos && Array.isArray(course.videos)) {
      allContent = course.videos;
    }

    // Check if all content is completed
    const contentIds = allContent.map(v => v.id).filter(Boolean);
    if (contentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Course has no content'
      });
    }

    // Get all progress for this course
    const allProgress = await Progress.findAll({
      where: {
        userId,
        videoId: contentIds
      }
    });

    const progressMap = new Map();
    allProgress.forEach(p => {
      progressMap.set(p.videoId, p);
    });

    // Check if all videos/files are completed
    let allCompleted = true;
    for (const content of allContent) {
      const progress = progressMap.get(content.id);
      const isCompleted = progress && (progress.isCompleted || progress.watchPercentage >= 90);
      if (!isCompleted) {
        allCompleted = false;
        break;
      }
    }

    // Check required quizzes
    if (allCompleted) {
      const quizzes = await Quiz.findAll({
        where: { videoId: contentIds, isRequired: true }
      });

      for (const quiz of quizzes) {
        const attempt = await QuizAttempt.findOne({
          where: {
            userId,
            quizId: quiz.id,
            passed: true
          },
          order: [['createdAt', 'DESC']]
        });

        if (!attempt) {
          allCompleted = false;
          break;
        }
      }
    }

    if (!allCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all course content before completing the course'
      });
    }

    // Mark course as completed
    enrollment.completedAt = new Date();
    enrollment.progress = 100;
    await enrollment.save();

    res.json({
      success: true,
      message: 'Course completed successfully',
      data: {
        completedAt: enrollment.completedAt,
        progress: 100
      }
    });
  } catch (error) {
    console.error('Error completing course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete course',
      error: error.message
    });
  }
};

module.exports = {
  getAllCourses,
  getTeacherCourses,
  getTeacherStudents,
  getEnrolledCourses,
  enrollInCourse,
  unenrollFromCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseById,
  completeCourse
};
