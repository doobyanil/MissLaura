const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { hashPassword, generateRandomPassword } = require('../utils/password');
const { sendWelcomeEmail } = require('../utils/email');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${req.user.schoolId}${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Get school details
const getSchool = async (req, res, next) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            mustChangePassword: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { users: true, worksheets: true }
        }
      }
    });

    if (!school) {
      return next(new AppError('School not found', 404));
    }

    res.json({ school });
  } catch (error) {
    next(error);
  }
};

// Update school details
const updateSchool = async (req, res, next) => {
  try {
    const { name, phone, address } = req.body;

    const school = await prisma.school.update({
      where: { id: req.user.schoolId },
      data: { name, phone, address }
    });

    res.json({ message: 'School updated successfully', school });
  } catch (error) {
    next(error);
  }
};

// Upload school logo
const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload an image file', 400));
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;

    const school = await prisma.school.update({
      where: { id: req.user.schoolId },
      data: { logo: logoUrl }
    });

    res.json({
      message: 'Logo uploaded successfully',
      logo: logoUrl,
      school
    });
  } catch (error) {
    next(error);
  }
};

// Create teacher (Admin only)
const createTeacher = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return next(new AppError('Name and email are required', 400));
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return next(new AppError('A user with this email already exists', 409));
    }

    // Generate random password
    const tempPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(tempPassword);

    // Get school info
    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId }
    });

    // Create teacher
    const teacher = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'TEACHER',
        mustChangePassword: true,
        schoolId: req.user.schoolId
      }
    });

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(email, name, school.name, tempPassword);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      message: 'Teacher created successfully. Login credentials have been sent to their email.',
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        mustChangePassword: teacher.mustChangePassword,
        createdAt: teacher.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all teachers (Admin only)
const getTeachers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      schoolId: req.user.schoolId,
      role: 'TEACHER'
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [teachers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
          _count: { select: { worksheets: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      teachers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update teacher status (Admin only)
const updateTeacherStatus = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const { isActive } = req.body;

    // Verify teacher belongs to same school
    const teacher = await prisma.user.findFirst({
      where: {
        id: teacherId,
        schoolId: req.user.schoolId,
        role: 'TEACHER'
      }
    });

    if (!teacher) {
      return next(new AppError('Teacher not found', 404));
    }

    const updatedTeacher = await prisma.user.update({
      where: { id: teacherId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    });

    res.json({
      message: `Teacher ${isActive ? 'activated' : 'deactivated'} successfully`,
      teacher: updatedTeacher
    });
  } catch (error) {
    next(error);
  }
};

// Delete teacher (Admin only)
const deleteTeacher = async (req, res, next) => {
  try {
    const { teacherId } = req.params;

    // Verify teacher belongs to same school
    const teacher = await prisma.user.findFirst({
      where: {
        id: teacherId,
        schoolId: req.user.schoolId,
        role: 'TEACHER'
      }
    });

    if (!teacher) {
      return next(new AppError('Teacher not found', 404));
    }

    await prisma.user.delete({
      where: { id: teacherId }
    });

    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSchool,
  updateSchool,
  uploadLogo,
  upload,
  createTeacher,
  getTeachers,
  updateTeacherStatus,
  deleteTeacher
};