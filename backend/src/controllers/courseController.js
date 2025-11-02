const { sequelize } = require('../config/database');
const { Course, User, Video, UserCourse, Progress } = require('../models');
const { validationResult } = require('express-validator');

// Get all courses (for students)
const getAllCourses = async (req, res) => {
  try {
    const where = {};
    // Only show published courses to non-teachers
    if (!['teacher', 'admin'].includes(req.user.role)) {
      where.isPublished = true;
    }

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
          attributes: ['id', 'title', 'duration', 'order']
        },
        {
          model: User,
          as: 'students',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          through: { attributes: [] }
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      courses: courses
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
      progress: enrollment.progress || 0
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
          through: { attributes: [] }
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

    res.json({
      success: true,
      data: enrolledCourses
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

    const { title, description, category, level, chapters, thumbnail, isPublished } = req.body;

    // Create course first
    const course = await Course.create({
      title,
      description,
      category,
      level,
      chapters: chapters || [],
      thumbnail: thumbnail || null,
      teacherId: req.user.id,
      isPublished: typeof isPublished === 'boolean' ? isPublished : false
    });

    // Note: Videos will be uploaded separately via the video upload endpoint
    // This allows for proper file handling and validation

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
    const { title, description, category, level, chapters, thumbnail, isPublished } = req.body;

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
    if (category !== undefined && category && category.trim() !== '') updateData.category = category;
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
    if (isPublished !== undefined) updateData.isPublished = Boolean(isPublished);

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

    // Check if user is enrolled or is the teacher
    const isEnrolled = await UserCourse.findOne({
      where: { userId, courseId: id }
    });

    const isTeacher = course.teacherId === userId;

    // If user is not enrolled and not the teacher, return basic course info only
  if (!isEnrolled && !isTeacher) {
      // Hide unpublished courses from non-enrolled non-teachers
      if (!course.isPublished) {
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
    courseData.isEnrolled = !!isEnrolled;
    
    // Ensure chapters are properly parsed if they exist
    if (courseData.chapters && typeof courseData.chapters === 'string') {
      try {
        courseData.chapters = JSON.parse(courseData.chapters);
      } catch (error) {
        console.error('Error parsing chapters:', error);
        courseData.chapters = [];
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
  getCourseById
};
