const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Get current user profile
const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { school: true }
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        school: user.school
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update profile
const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
      include: { school: true }
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        school: user.school
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;

    // Get counts
    const [totalTeachers, totalWorksheets, recentWorksheets] = await Promise.all([
      prisma.user.count({
        where: { schoolId, role: 'TEACHER' }
      }),
      prisma.worksheet.count({
        where: { schoolId }
      }),
      prisma.worksheet.findMany({
        where: { schoolId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { name: true }
          }
        }
      })
    ]);

    // Get worksheets by curriculum
    const worksheetsByCurriculum = await prisma.worksheet.groupBy({
      by: ['curriculum'],
      where: { schoolId },
      _count: true
    });

    // Get worksheets by grade
    const worksheetsByGrade = await prisma.worksheet.groupBy({
      by: ['grade'],
      where: { schoolId },
      _count: true
    });

    res.json({
      stats: {
        totalTeachers,
        totalWorksheets,
        worksheetsByCurriculum,
        worksheetsByGrade,
        recentWorksheets
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getDashboardStats
};