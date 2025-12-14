const { User, Course, Video, Progress, UserCourse, Log } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { generateStrongPassword, sendCredentialsEmail, sendBulkCredentialsEmails } = require('../services/emailService');
const { parse } = require('csv-parse/sync');

// Get platform statistics
const getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalTeachers = await User.count({ where: { role: 'teacher' } });
    const totalStudents = await User.count({ where: { role: 'student' } });
    const totalCourses = await Course.count();
    const totalVideos = await Video.count();
    const totalProgress = await Progress.count();

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await User.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    const recentCourses = await Course.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalTeachers,
        totalStudents,
        totalCourses,
        totalVideos,
        totalProgress,
        recentActivity: {
          newUsers: recentUsers,
          newCourses: recentCourses
        }
      }
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all users with pagination
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = search ? {
      [Op.or]: [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Course,
          as: 'enrolledCourses',
          attributes: ['id', 'title', 'category'],
          through: { attributes: [] }
        },
        {
          model: Progress,
          attributes: ['id', 'videoId', 'watchPercentage', 'isCompleted', 'lastWatchedAt'],
          include: [
            {
              model: Video,
              attributes: ['id', 'title', 'courseId']
            }
          ]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be student, teacher, or admin'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ role });

    res.json({
      success: true,
      data: { id: user.id, role: user.role },
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all courses with teacher info
const getAllCoursesAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: courses } = await Course.findAndCountAll({
      attributes: [
        'id',
        'title',
        'description',
        'category',
        'department',
        'level',
        'isPublished',
        'adminDisabled',
        'teacherPublishAllowed',
        // Omit adminPublishLocked from attributes to avoid SELECT errors if column missing
        'duration',
        'totalVideos',
        'studentCount',
        'rating',
        'totalRatings',
        'thumbnail',
        'teacherId',
        'createdAt',
        'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Video,
          as: 'videos',
          attributes: ['id']
        }
      ],
      distinct: true,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: courses,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete course (admin only)
const { sequelize } = require('../config/database');
const deleteCourseAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id, { transaction });
    if (!course) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Cleanup related data (mirror teacher delete flow)
    const videos = await Video.findAll({ where: { courseId: id }, transaction });
    const videoIds = videos.map(v => v.id);
    if (videoIds.length > 0) {
      await Progress.destroy({ where: { videoId: videoIds }, transaction });
    }
    await UserCourse.destroy({ where: { courseId: id }, transaction });
    await Video.destroy({ where: { courseId: id }, transaction });
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

// Update course flags (admin only) - adminDisabled / isPublished
const updateCourseAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminDisabled, teacherPublishAllowed } = req.body;
    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    const updates = {};
    if (typeof adminDisabled === 'boolean') {
      updates.adminDisabled = adminDisabled;
      if (adminDisabled) {
        updates.isPublished = false;
      }
    }
    if (typeof teacherPublishAllowed === 'boolean') {
      updates.teacherPublishAllowed = teacherPublishAllowed;
      if (!teacherPublishAllowed) {
        // When admin disallows publishing, force unpublish
        updates.isPublished = false;
      }
    }
    await course.update(updates);
    // propagate publish status to videos only when we forced unpublish
    if (updates.isPublished === false) {
      await Video.update({ isPublished: updates.isPublished }, { where: { courseId: id } });
    }
    res.json({ success: true, data: course, message: 'Course updated' });
  } catch (error) {
    console.error('Error updating course (admin):', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Category/Department simple CRUD using dedicated models if available, otherwise fallback to distinct values
const { Category, Department } = require('../models');

const listCategories = async (req, res) => {
  try {
    const items = await Category.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to list categories' });
  }
};

const createCategoryAdmin = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const existing = await Category.findOne({ where: { name } });
    if (existing) return res.status(409).json({ success: false, message: 'Category already exists' });
    const cat = await Category.create({ name });
    res.json({ success: true, data: cat });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

const deleteCategoryAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const cat = await Category.findByPk(id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    await cat.destroy();
    res.json({ success: true, message: 'Category deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
};

const listDepartments = async (req, res) => {
  try {
    const items = await Department.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to list departments' });
  }
};

const createDepartmentAdmin = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const existing = await Department.findOne({ where: { name } });
    if (existing) return res.status(409).json({ success: false, message: 'Department already exists' });
    const dep = await Department.create({ name });
    res.json({ success: true, data: dep });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to create department' });
  }
};

const deleteDepartmentAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const dep = await Department.findByPk(id);
    if (!dep) return res.status(404).json({ success: false, message: 'Department not found' });
    await dep.destroy();
    res.json({ success: true, message: 'Department deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to delete department' });
  }
};
// Create user (admin only)
const createUser = async (req, res) => {
  try {
    const { email, firstName, lastName, role = 'student', sendEmail = false } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, firstName, and lastName are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate strong unique temporary password (8 chars)
    const tempPassword = generateStrongPassword(8);

    // Create user with password change required flag
    const user = await User.create({
      email,
      firstName,
      lastName,
      role,
      password: tempPassword, // Will be hashed by beforeCreate hook
      isPasswordChangeRequired: true,
      isEmailVerified: true, // Admin created users are auto-verified
      isActive: true
    });

    // Send email with credentials if requested
    let emailSent = false;
    let emailError = null;
    if (sendEmail) {
      try {
        await sendCredentialsEmail(email, tempPassword, firstName);
        emailSent = true;
      } catch (emailErr) {
        console.error('Error sending email:', emailErr);
        emailError = emailErr.message || 'Email could not be sent';
        // User is created but email failed - still return success but note email failure
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isPasswordChangeRequired: user.isPasswordChangeRequired
        },
        // Always return the temporary password to admin creating the user
        tempPassword,
        emailSent,
        emailError: emailError || undefined
      },
      message: emailSent
        ? 'Kullanıcı oluşturuldu ve email gönderildi. Geçici şifre aşağıda görüntülenmektedir.'
        : 'Kullanıcı oluşturuldu. Email gönderilemedi; geçici şifre aşağıda görüntülenmektedir.'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Bulk create users from CSV/Excel
const bulkCreateUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required'
      });
    }

    const { sendEmails = false } = req.body;

    // Parse CSV file
    let records;
    try {
      records = parse(req.file.buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CSV file format'
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const email = row.email || row.Email || row.EMAIL;
      const firstName = row.firstName || row['First Name'] || row['first_name'] || row.firstname;
      const lastName = row.lastName || row['Last Name'] || row['last_name'] || row.lastname;
      const role = (row.role || row.Role || 'student').toLowerCase();

      // Validate row
      if (!email || !firstName || !lastName) {
        errors.push({
          row: i + 2, // +2 because header is row 1 and 0-indexed
          error: 'Missing required fields: email, firstName, lastName'
        });
        continue;
      }

      if (!['student', 'teacher', 'admin'].includes(role)) {
        errors.push({
          row: i + 2,
          email,
          error: 'Invalid role. Must be student, teacher, or admin'
        });
        continue;
      }

      try {
        // Check if user exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          errors.push({
            row: i + 2,
            email,
            error: 'User already exists'
          });
          continue;
        }

        // Generate strong unique temporary password (8 chars)
        const tempPassword = generateStrongPassword(8);

        // Create user
        const user = await User.create({
          email,
          firstName,
          lastName,
          role,
          password: tempPassword,
          isPasswordChangeRequired: true,
          isEmailVerified: true,
          isActive: true
        });

        results.push({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tempPassword: tempPassword, // Store password for email sending
          success: true
        });
      } catch (createError) {
        errors.push({
          row: i + 2,
          email,
          error: createError.message || 'Failed to create user'
        });
      }
    }

    // Send bulk emails if requested
    let emailResults = [];
    if (sendEmails && results.length > 0) {
      const usersForEmail = results.map(r => ({
        email: r.email,
        tempPassword: r.tempPassword, // Use stored tempPassword
        firstName: r.firstName
      }));

      emailResults = await sendBulkCredentialsEmails(usersForEmail);

      // Update results with email status and remove tempPassword from response if emails sent
      results.forEach((result) => {
        const emailResult = emailResults.find(er => er.email === result.email);
        if (emailResult) {
          result.emailSent = emailResult.success;
          if (!emailResult.success) {
            result.emailError = emailResult.error;
          }
        }
        // Always remove tempPassword from response for security (never send passwords in response)
        delete result.tempPassword;
      });
    } else {
      // If emails not sent, still remove tempPassword from response for security
      // Users should get password through email only
      results.forEach((result) => {
        delete result.tempPassword;
      });
    }

    res.json({
      success: true,
      data: {
        created: results.length,
        failed: errors.length,
        total: records.length,
        results,
        errors
      },
      message: `Bulk user creation completed. ${results.length} users created, ${errors.length} failed.`
    });
  } catch (error) {
    console.error('Error in bulk create users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get system logs with pagination and filtering
const getSystemLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, level, search, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (level) where.level = level;
    if (search) {
      where.message = { [Op.iLike]: `%${search}%` };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const { count, rows } = await Log.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        logs: rows,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
};

module.exports = {
  getPlatformStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getAllCoursesAdmin,
  deleteCourseAdmin,
  getSystemLogs,
  createUser,
  bulkCreateUsers,
  updateCourseAdmin,
  listCategories,
  createCategoryAdmin,
  deleteCategoryAdmin,
  listDepartments,
  createDepartmentAdmin,
  deleteDepartmentAdmin
};
