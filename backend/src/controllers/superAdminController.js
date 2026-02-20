const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all schools with subscription info
 * GET /api/admin/schools
 */
const getAllSchools = async (req, res) => {
  try {
    const { status, plan, search, page = 1, limit = 20 } = req.query;
    
    const where = {};
    
    if (status) {
      where.subscription = { status };
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const schools = await prisma.school.findMany({
      where,
      include: {
        users: {
          where: { role: 'ADMIN' },
          take: 1
        },
        subscription: {
          include: { plan: true }
        },
        _count: {
          select: { users: true, worksheets: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });
    
    const total = await prisma.school.count({ where });
    
    res.json({
      schools,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ message: 'Failed to fetch schools', error: error.message });
  }
};

/**
 * Get school by ID with detailed info
 * GET /api/admin/schools/:id
 */
const getSchoolById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        users: {
          orderBy: { createdAt: 'asc' }
        },
        subscription: {
          include: { plan: true }
        },
        worksheets: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: { users: true, worksheets: true }
        }
      }
    });
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    // Get usage stats
    const usageStats = await getUsageStats(id);
    
    res.json({ ...school, usageStats });
  } catch (error) {
    console.error('Error fetching school:', error);
    res.status(500).json({ message: 'Failed to fetch school', error: error.message });
  }
};

/**
 * Update school status
 * PUT /api/admin/schools/:id/status
 */
const updateSchoolStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    const school = await prisma.school.findUnique({
      where: { id },
      include: { subscription: true }
    });
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    // Update subscription status
    if (school.subscription) {
      await prisma.subscription.update({
        where: { schoolId: id },
        data: { status }
      });
    }
    
    // Log audit
    await logAudit(req.user, 'SCHOOL_STATUS_CHANGED', 'School', id, 
      { status: school.subscription?.status }, 
      { status, reason }
    );
    
    res.json({ message: 'School status updated successfully' });
  } catch (error) {
    console.error('Error updating school status:', error);
    res.status(500).json({ message: 'Failed to update school status', error: error.message });
  }
};

/**
 * Change school plan
 * PUT /api/admin/schools/:id/plan
 */
const changeSchoolPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { planId, billingCycle, endDate } = req.body;
    
    const school = await prisma.school.findUnique({
      where: { id },
      include: { subscription: true }
    });
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    const oldPlan = school.subscription?.planId;
    
    if (school.subscription) {
      // Update existing subscription
      await prisma.subscription.update({
        where: { schoolId: id },
        data: {
          planId,
          billingCycle: billingCycle || 'monthly',
          endDate: endDate ? new Date(endDate) : undefined
        }
      });
    } else {
      // Create new subscription
      await prisma.subscription.create({
        data: {
          schoolId: id,
          planId,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          billingCycle: billingCycle || 'monthly'
        }
      });
    }
    
    // Log audit
    await logAudit(req.user, 'PLAN_CHANGED', 'School', id, 
      { oldPlan }, 
      { newPlan: planId }
    );
    
    res.json({ message: 'School plan updated successfully' });
  } catch (error) {
    console.error('Error changing school plan:', error);
    res.status(500).json({ message: 'Failed to change school plan', error: error.message });
  }
};

/**
 * Extend trial
 * PUT /api/admin/schools/:id/extend-trial
 */
const extendTrial = async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;
    
    const school = await prisma.school.findUnique({
      where: { id },
      include: { subscription: true }
    });
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    if (!school.subscription) {
      return res.status(400).json({ message: 'School has no subscription' });
    }
    
    const newTrialEnd = new Date(school.subscription.trialEndsAt || new Date());
    newTrialEnd.setDate(newTrialEnd.getDate() + parseInt(days));
    
    await prisma.subscription.update({
      where: { schoolId: id },
      data: {
        trialEndsAt: newTrialEnd,
        status: 'TRIAL'
      }
    });
    
    // Log audit
    await logAudit(req.user, 'TRIAL_EXTENDED', 'School', id, 
      { trialEndsAt: school.subscription.trialEndsAt }, 
      { trialEndsAt: newTrialEnd, days }
    );
    
    res.json({ message: 'Trial extended successfully', newTrialEnd });
  } catch (error) {
    console.error('Error extending trial:', error);
    res.status(500).json({ message: 'Failed to extend trial', error: error.message });
  }
};

/**
 * Get usage dashboard
 * GET /api/admin/usage
 */
const getUsageDashboard = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get usage logs aggregated
    const usageLogs = await prisma.usageLog.groupBy({
      by: ['action'],
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      _count: true,
      _sum: {
        aiTokensUsed: true,
        estimatedCost: true
      }
    });
    
    // Get worksheets count
    const worksheetsCount = await prisma.worksheet.count({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    });
    
    // Get active schools
    const activeSchools = await prisma.school.count({
      where: {
        subscription: {
          status: 'ACTIVE'
        }
      }
    });
    
    // Get total schools
    const totalSchools = await prisma.school.count();
    
    // Get total users
    const totalUsers = await prisma.user.count();
    
    // Get total teachers
    const totalTeachers = await prisma.user.count({
      where: { role: 'TEACHER' }
    });
    
    res.json({
      period: { start, end },
      usage: usageLogs,
      summary: {
        worksheetsCreated: worksheetsCount,
        activeSchools,
        totalSchools,
        totalUsers,
        totalTeachers
      }
    });
  } catch (error) {
    console.error('Error fetching usage dashboard:', error);
    res.status(500).json({ message: 'Failed to fetch usage dashboard', error: error.message });
  }
};

/**
 * Get audit logs
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const { action, resource, userId, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const where = {};
    
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (userId) where.userId = userId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });
    
    const total = await prisma.auditLog.count({ where });
    
    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs', error: error.message });
  }
};

/**
 * Get dashboard stats
 * GET /api/admin/dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const totalSchools = await prisma.school.count();
    const activeSchools = await prisma.school.count({
      where: { subscription: { status: 'ACTIVE' } }
    });
    const trialSchools = await prisma.school.count({
      where: { subscription: { status: 'TRIAL' } }
    });
    const totalUsers = await prisma.user.count();
    const totalTeachers = await prisma.user.count({ where: { role: 'TEACHER' } });
    const totalWorksheets = await prisma.worksheet.count();
    
    // Get worksheets this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const worksheetsThisMonth = await prisma.worksheet.count({
      where: { createdAt: { gte: thisMonth } }
    });
    
    // Get revenue (from completed payments)
    const revenue = await prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true }
    });
    
    // Get plan distribution
    const planDistribution = await prisma.subscription.groupBy({
      by: ['planId'],
      _count: true
    });
    
    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      counts: {
        totalSchools,
        activeSchools,
        trialSchools,
        totalUsers,
        totalTeachers,
        totalWorksheets,
        worksheetsThisMonth
      },
      revenue: revenue._sum.amount || 0,
      planDistribution,
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
};

// Helper functions
const getUsageStats = async (schoolId) => {
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  
  const worksheetsThisMonth = await prisma.worksheet.count({
    where: {
      schoolId,
      createdAt: { gte: thisMonth }
    }
  });
  
  const aiCallsThisMonth = await prisma.usageLog.count({
    where: {
      subscription: { schoolId },
      action: 'AI_CALL',
      createdAt: { gte: thisMonth }
    }
  });
  
  return {
    worksheetsThisMonth,
    aiCallsThisMonth
  };
};

const logAudit = async (user, action, resource, resourceId, oldValues, newValues) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action,
        resource,
        resourceId,
        oldValues,
        newValues,
        description: `${action} on ${resource}`
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

module.exports = {
  getAllSchools,
  getSchoolById,
  updateSchoolStatus,
  changeSchoolPlan,
  extendTrial,
  getUsageDashboard,
  getAuditLogs,
  getDashboardStats
};
