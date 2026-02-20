/**
 * AI Usage Controller
 * Handles API endpoints for AI usage tracking and reports
 */

const aiUsageService = require('../services/aiUsageService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get usage summary for the current school
 */
async function getSchoolUsageSummary(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { from, to, period = 'month' } = req.query;

    let fromDate, toDate;
    
    if (from && to) {
      fromDate = new Date(from);
      toDate = new Date(to);
    } else {
      // Default to current period
      toDate = new Date();
      if (period === 'month') {
        fromDate = new Date();
        fromDate.setDate(1);
        fromDate.setHours(0, 0, 0, 0);
      } else if (period === 'week') {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (period === 'day') {
        fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);
      } else {
        fromDate = new Date();
        fromDate.setDate(1);
      }
    }

    const usage = await aiUsageService.getSchoolUsage(schoolId, fromDate, toDate);
    const quota = await aiUsageService.checkQuota(schoolId);
    const dailyUsage = await aiUsageService.getDailyUsage(schoolId, 30);

    res.json({
      success: true,
      data: {
        summary: usage,
        quota,
        dailyUsage,
        period: { start: fromDate, end: toDate }
      }
    });
  } catch (error) {
    console.error('Error getting school usage:', error);
    res.status(500).json({ success: false, error: 'Failed to get usage data' });
  }
}

/**
 * Get quota status for the current school
 */
async function getQuotaStatus(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const quota = await aiUsageService.checkQuota(schoolId);

    res.json({
      success: true,
      data: quota
    });
  } catch (error) {
    console.error('Error checking quota:', error);
    res.status(500).json({ success: false, error: 'Failed to check quota' });
  }
}

/**
 * Get usage details for a specific feature
 */
async function getFeatureUsage(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { feature } = req.params;
    const { from, to, limit = 50, offset = 0 } = req.query;

    const where = {
      schoolId,
      feature
    };

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const logs = await prisma.aiUsageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.aiUsageLog.count({ where });

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    console.error('Error getting feature usage:', error);
    res.status(500).json({ success: false, error: 'Failed to get feature usage' });
  }
}

// ============================================
// Super Admin Endpoints
// ============================================

/**
 * Get global usage statistics (Super Admin only)
 */
async function getGlobalUsageStats(req, res) {
  try {
    const { from, to, groupBy = 'day' } = req.query;

    let fromDate, toDate;
    
    if (from && to) {
      fromDate = new Date(from);
      toDate = new Date(to);
    } else {
      // Default to current month
      toDate = new Date();
      fromDate = new Date();
      fromDate.setDate(1);
    }

    const usage = await aiUsageService.getGlobalUsage(fromDate, toDate);

    // Get all schools for detailed breakdown
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        subscription: {
          include: { plan: true }
        }
      }
    });

    // Enrich school data with usage
    const schoolUsageData = await Promise.all(
      schools.map(async (school) => {
        const schoolUsage = await aiUsageService.getSchoolUsage(school.id, fromDate, toDate);
        const quota = await aiUsageService.checkQuota(school.id);
        return {
          ...school,
          usage: schoolUsage,
          quota
        };
      })
    );

    res.json({
      success: true,
      data: {
        global: usage,
        schools: schoolUsageData,
        period: { start: fromDate, end: toDate }
      }
    });
  } catch (error) {
    console.error('Error getting global usage:', error);
    res.status(500).json({ success: false, error: 'Failed to get global usage' });
  }
}

/**
 * Get usage for a specific school (Super Admin only)
 */
async function getSchoolUsageById(req, res) {
  try {
    const { schoolId } = req.params;
    const { from, to } = req.query;

    let fromDate = from ? new Date(from) : new Date();
    let toDate = to ? new Date(to) : new Date();
    
    if (!from) {
      fromDate.setDate(1);
    }

    const usage = await aiUsageService.getSchoolUsage(schoolId, fromDate, toDate);
    const quota = await aiUsageService.checkQuota(schoolId);
    const dailyUsage = await aiUsageService.getDailyUsage(schoolId, 30);

    // Get school details
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        subscription: {
          include: { plan: true }
        },
        users: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Get usage by user
    const userUsage = {};
    for (const user of school?.users || []) {
      const usage = await aiUsageService.getUserUsage(user.id, fromDate, toDate);
      if (usage.requestCount > 0) {
        userUsage[user.id] = {
          ...user,
          usage
        };
      }
    }

    res.json({
      success: true,
      data: {
        school,
        usage,
        quota,
        dailyUsage,
        userUsage,
        period: { start: fromDate, end: toDate }
      }
    });
  } catch (error) {
    console.error('Error getting school usage by ID:', error);
    res.status(500).json({ success: false, error: 'Failed to get school usage' });
  }
}

/**
 * Get usage alerts (schools approaching or exceeding limits)
 */
async function getUsageAlerts(req, res) {
  try {
    const schools = await prisma.school.findMany({
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });

    const alerts = [];

    for (const school of schools) {
      const quota = await aiUsageService.checkQuota(school.id);
      
      if (quota.warning) {
        alerts.push({
          schoolId: school.id,
          schoolName: school.name,
          type: quota.warning,
          percentage: quota.percentage,
          usage: quota.usage,
          limit: quota.limit,
          planName: school.subscription?.plan?.name || 'No Plan'
        });
      }
    }

    // Sort by severity
    alerts.sort((a, b) => {
      const order = { exceeded: 0, critical: 1, warning: 2 };
      return order[a.type] - order[b.type];
    });

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error getting usage alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to get usage alerts' });
  }
}

/**
 * Get cost estimate report
 */
async function getCostReport(req, res) {
  try {
    const { from, to } = req.query;

    let fromDate = from ? new Date(from) : new Date();
    let toDate = to ? new Date(to) : new Date();
    
    if (!from) {
      fromDate.setDate(1);
      fromDate.setHours(0, 0, 0, 0);
    }

    const usage = await aiUsageService.getGlobalUsage(fromDate, toDate);

    // Calculate costs by model with pricing info
    const modelCosts = {};
    for (const [model, data] of Object.entries(usage.byModel)) {
      const pricing = aiUsageService.MODEL_PRICING[model] || aiUsageService.MODEL_PRICING.default;
      modelCosts[model] = {
        ...data,
        pricingPerKTokens: pricing,
        avgCostPerRequest: data.requests > 0 ? data.cost / data.requests : 0
      };
    }

    res.json({
      success: true,
      data: {
        totalCost: usage.totalCost,
        totalTokens: usage.totalTokens,
        totalRequests: usage.totalRequests,
        byModel: modelCosts,
        byFeature: usage.byFeature,
        bySchool: usage.bySchool,
        period: { start: fromDate, end: toDate }
      }
    });
  } catch (error) {
    console.error('Error getting cost report:', error);
    res.status(500).json({ success: false, error: 'Failed to get cost report' });
  }
}

/**
 * Get AI vs DB fallback ratio
 */
async function getAiVsDbStats(req, res) {
  try {
    const { from, to } = req.query;

    let fromDate = from ? new Date(from) : new Date();
    let toDate = to ? new Date(to) : new Date();
    
    if (!from) {
      fromDate.setDate(1);
    }

    const logs = await prisma.aiUsageLog.findMany({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate
        }
      }
    });

    const stats = logs.reduce((acc, log) => {
      acc.total += 1;
      if (log.source === 'ai') {
        acc.ai += 1;
      } else {
        acc.dbFallback += 1;
      }
      return acc;
    }, { total: 0, ai: 0, dbFallback: 0 });

    stats.aiPercentage = stats.total > 0 ? Math.round((stats.ai / stats.total) * 100) : 0;
    stats.dbFallbackPercentage = stats.total > 0 ? Math.round((stats.dbFallback / stats.total) * 100) : 0;

    // By school
    const bySchool = {};
    logs.forEach(log => {
      const id = log.schoolId || 'system';
      if (!bySchool[id]) {
        bySchool[id] = { ai: 0, dbFallback: 0, total: 0 };
      }
      bySchool[id].total += 1;
      if (log.source === 'ai') {
        bySchool[id].ai += 1;
      } else {
        bySchool[id].dbFallback += 1;
      }
    });

    res.json({
      success: true,
      data: {
        summary: stats,
        bySchool,
        period: { start: fromDate, end: toDate }
      }
    });
  } catch (error) {
    console.error('Error getting AI vs DB stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get AI vs DB stats' });
  }
}

/**
 * Log AI usage from n8n (internal endpoint)
 * POST /api/ai/usage/log
 * 
 * This endpoint is called by n8n after an AI request completes.
 * It requires an internal API key for authentication.
 */
async function logUsage(req, res) {
  try {
    const {
      schoolId,
      userId,
      feature,
      model,
      inputTokens = 0,
      outputTokens = 0,
      totalTokens,
      requestId,
      worksheetId,
      source = 'ai',
      metadata
    } = req.body;

    // Validate required fields
    if (!feature) {
      return res.status(400).json({ 
        success: false, 
        error: 'Feature is required' 
      });
    }

    if (!model) {
      return res.status(400).json({ 
        success: false, 
        error: 'Model is required' 
      });
    }

    // Calculate total tokens if not provided
    const finalTotalTokens = totalTokens || (inputTokens + outputTokens);

    // Log the usage
    const log = await aiUsageService.logAiUsage({
      schoolId,
      userId,
      feature,
      model,
      inputTokens,
      outputTokens,
      totalTokens: finalTotalTokens,
      requestId,
      worksheetId,
      source,
      metadata
    });

    res.json({
      success: true,
      data: {
        id: log.id,
        totalTokens: finalTotalTokens,
        loggedAt: log.createdAt
      }
    });
  } catch (error) {
    console.error('Error logging AI usage:', error);
    res.status(500).json({ success: false, error: 'Failed to log AI usage' });
  }
}

/**
 * Check quota before making AI request (for n8n pre-check)
 * GET /api/ai/usage/check-quota/:schoolId
 */
async function checkQuotaForN8n(req, res) {
  try {
    const { schoolId } = req.params;
    
    if (!schoolId) {
      return res.status(400).json({ 
        success: false, 
        error: 'School ID is required' 
      });
    }

    const quota = await aiUsageService.checkQuota(schoolId);

    res.json({
      success: true,
      data: {
        allowed: !quota.exceeded,
        ...quota
      }
    });
  } catch (error) {
    console.error('Error checking quota:', error);
    res.status(500).json({ success: false, error: 'Failed to check quota' });
  }
}

module.exports = {
  getSchoolUsageSummary,
  getQuotaStatus,
  getFeatureUsage,
  getGlobalUsageStats,
  getSchoolUsageById,
  getUsageAlerts,
  getCostReport,
  getAiVsDbStats,
  logUsage,
  checkQuotaForN8n
};