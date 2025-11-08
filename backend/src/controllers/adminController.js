const { User, Course, Video, Progress } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { generateSimplePassword, sendCredentialsEmail, sendBulkCredentialsEmails } = require('../services/emailService');
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
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
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
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Video,
          attributes: ['id']
        }
      ],
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
const deleteCourseAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    await course.destroy();

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create user (admin only)
const createUser = async (req, res) => {
  try {
    const { email, firstName, lastName, role = 'student', sendEmail = true } = req.body;

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

    // Generate simple password based on user's name/email
    const tempPassword = generateSimplePassword(email, firstName, lastName);

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
        tempPassword: sendEmail && !emailSent ? tempPassword : undefined, // Return password only if email failed
        emailSent,
        emailError: emailError || undefined
      },
      message: emailSent 
        ? 'Kullanıcı oluşturuldu ve email başarıyla gönderildi ✅' 
        : emailError && emailError.includes('testing emails')
        ? 'Kullanıcı oluşturuldu. Email gönderilemedi: Resend test modunda sadece kayıtlı email adresinize (utkcursor@gmail.com) gönderebilirsiniz. Diğer adresler için domain doğrulaması gerekli. Şifreyi aşağıdaki dialog\'da görebilirsiniz.'
        : 'Kullanıcı oluşturuldu. Email gönderilemedi. Şifreyi aşağıdaki dialog\'da görebilirsiniz.'
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

    const { sendEmails = true } = req.body;

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

        // Generate simple password based on user's name/email
        const tempPassword = generateSimplePassword(email, firstName, lastName);

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

module.exports = {
  getPlatformStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getAllCoursesAdmin,
  deleteCourseAdmin,
  createUser,
  bulkCreateUsers
};
