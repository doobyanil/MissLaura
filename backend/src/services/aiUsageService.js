/**
 * AI Usage Service
 * Handles logging, aggregation, and quota enforcement for AI token usage
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Model pricing (USD per 1K tokens) - Update as needed
const MODEL_PRICING = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
  'default': { input: 0.001, output: 0.002 }
};

/**
 * Calculate estimated cost for token usage
 */
function calculateCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING.default;
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Log AI usage
 * @param {Object} params - Usage parameters
 * @param {string} params.schoolId - School ID (nullable for system jobs)
 * @param {string} params.userId - User ID (nullable)
 * @param {string} params.feature - Feature name (e.g., "worksheet_generation")
 * @param {string} params.model - AI model used
 * @param {number} params.inputTokens - Input token count
 * @param {number} params.outputTokens - Output token count
 * @param {string} params.requestId - Optional request ID for correlation
 * @param {string} params.worksheetId - Optional worksheet ID
 * @param {string} params.source - "ai" or "db_fallback"
 * @param {object} params.metadata - Additional metadata
 */
async function logAiUsage(params) {
  const {
    schoolId,
    userId,
    feature,
    model,
    inputTokens = 0,
    outputTokens = 0,
    requestId,
    worksheetId,
    source = 'ai',
    metadata
  } = params;

  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = source === 'ai' ? calculateCost(model, inputTokens, outputTokens) : 0;

  try {
    const log = await prisma.aiUsageLog.create({
      data: {
        schoolId,
        userId,
        feature,
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost,
        requestId,
        worksheetId,
        source,
        metadata
      }
    });

    console.log(`[AI Usage] Logged: ${feature} - ${totalTokens} tokens (${inputTokens} in, ${outputTokens} out) for school ${schoolId || 'system'}`);
    return log;
  } catch (error) {
    console.error('[AI Usage] Failed to log usage:', error);
    // Don't throw - logging should not break the main flow
    return null;
  }
}

/**
 * Get usage statistics for a school within a date range
 * @param {string} schoolId - School ID
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 */
async function getSchoolUsage(schoolId, fromDate, toDate) {
  const logs = await prisma.aiUsageLog.findMany({
    where: {
      schoolId,
      createdAt: {
        gte: fromDate,
        lte: toDate
      }
    }
  });

  const summary = logs.reduce((acc, log) => {
    acc.totalRequests += 1;
    acc.totalInputTokens += log.inputTokens;
    acc.totalOutputTokens += log.outputTokens;
    acc.totalTokens += log.totalTokens;
    acc.totalCost += Number(log.estimatedCost || 0);
    
    // Count by source
    if (log.source === 'ai') {
      acc.aiRequests += 1;
    } else {
      acc.dbFallbackRequests += 1;
    }

    // Count by feature
    if (!acc.byFeature[log.feature]) {
      acc.byFeature[log.feature] = {
        requests: 0,
        tokens: 0,
        cost: 0
      };
    }
    acc.byFeature[log.feature].requests += 1;
    acc.byFeature[log.feature].tokens += log.totalTokens;
    acc.byFeature[log.feature].cost += Number(log.estimatedCost || 0);

    // Count by model
    if (!acc.byModel[log.model]) {
      acc.byModel[log.model] = {
        requests: 0,
        tokens: 0,
        cost: 0
      };
    }
    acc.byModel[log.model].requests += 1;
    acc.byModel[log.model].tokens += log.totalTokens;
    acc.byModel[log.model].cost += Number(log.estimatedCost || 0);

    return acc;
  }, {
    totalRequests: 0,
    aiRequests: 0,
    dbFallbackRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    byFeature: {},
    byModel: {}
  });

  // Calculate AI vs DB percentage
  summary.aiPercentage = summary.totalRequests > 0 
    ? Math.round((summary.aiRequests / summary.totalRequests) * 100) 
    : 0;
  summary.dbFallbackPercentage = summary.totalRequests > 0 
    ? Math.round((summary.dbFallbackRequests / summary.totalRequests) * 100) 
    : 0;

  return summary;
}

/**
 * Get usage statistics for a user within a date range
 */
async function getUserUsage(userId, fromDate, toDate) {
  const logs = await prisma.aiUsageLog.findMany({
    where: {
      userId,
      createdAt: {
        gte: fromDate,
        lte: toDate
      }
    }
  });

  return logs.reduce((acc, log) => {
    acc.totalTokens += log.totalTokens;
    acc.totalCost += Number(log.estimatedCost || 0);
    acc.requestCount += 1;
    return acc;
  }, { totalTokens: 0, totalCost: 0, requestCount: 0 });
}

/**
 * Get global usage statistics (for Super Admin)
 */
async function getGlobalUsage(fromDate, toDate) {
  const logs = await prisma.aiUsageLog.findMany({
    where: {
      createdAt: {
        gte: fromDate,
        lte: toDate
      }
    },
    include: {
      // We need to join with school to get school name
      // Since schoolId is nullable, we handle this separately
    }
  });

  // Get unique school IDs
  const schoolIds = [...new Set(logs.map(l => l.schoolId).filter(Boolean))];

  // Fetch school names
  const schools = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { id: true, name: true }
  });

  const schoolMap = schools.reduce((acc, s) => {
    acc[s.id] = s.name;
    return acc;
  }, {});

  const summary = logs.reduce((acc, log) => {
    acc.totalRequests += 1;
    acc.totalTokens += log.totalTokens;
    acc.totalCost += Number(log.estimatedCost || 0);

    // By school
    const schoolId = log.schoolId || 'system';
    if (!acc.bySchool[schoolId]) {
      acc.bySchool[schoolId] = {
        name: schoolMap[schoolId] || 'System',
        requests: 0,
        tokens: 0,
        cost: 0
      };
    }
    acc.bySchool[schoolId].requests += 1;
    acc.bySchool[schoolId].tokens += log.totalTokens;
    acc.bySchool[schoolId].cost += Number(log.estimatedCost || 0);

    // By feature
    if (!acc.byFeature[log.feature]) {
      acc.byFeature[log.feature] = { requests: 0, tokens: 0, cost: 0 };
    }
    acc.byFeature[log.feature].requests += 1;
    acc.byFeature[log.feature].tokens += log.totalTokens;
    acc.byFeature[log.feature].cost += Number(log.estimatedCost || 0);

    // By model
    if (!acc.byModel[log.model]) {
      acc.byModel[log.model] = { requests: 0, tokens: 0, cost: 0 };
    }
    acc.byModel[log.model].requests += 1;
    acc.byModel[log.model].tokens += log.totalTokens;
    acc.byModel[log.model].cost += Number(log.estimatedCost || 0);

    // By day
    const day = log.createdAt.toISOString().split('T')[0];
    if (!acc.byDay[day]) {
      acc.byDay[day] = { requests: 0, tokens: 0, cost: 0 };
    }
    acc.byDay[day].requests += 1;
    acc.byDay[day].tokens += log.totalTokens;
    acc.byDay[day].cost += Number(log.estimatedCost || 0);

    return acc;
  }, {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    bySchool: {},
    byFeature: {},
    byModel: {},
    byDay: {}
  });

  return summary;
}

/**
 * Check if a school has exceeded its AI token quota
 * @returns {Object} { exceeded: boolean, usage: number, limit: number, percentage: number }
 */
async function checkQuota(schoolId) {
  // Get school's subscription
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      subscription: {
        include: { plan: true }
      }
    }
  });

  if (!school || !school.subscription) {
    // No subscription = no quota (free tier limits apply)
    return { exceeded: false, usage: 0, limit: 0, percentage: 0, warning: null };
  }

  const subscription = school.subscription;
  
  // Determine the current billing period
  const now = new Date();
  let periodStart = subscription.currentPeriodStart || subscription.startDate;
  let periodEnd = subscription.currentPeriodEnd || subscription.endDate;

  // If period hasn't been set or has expired, calculate based on billing cycle
  if (!periodStart || !periodEnd || now > periodEnd) {
    // Calculate period based on billing cycle
    periodStart = subscription.startDate;
    if (subscription.billingCycle === 'monthly') {
      periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd = new Date(periodStart);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
  }

  // Get token limit (override or plan default)
  const tokenLimit = subscription.overrideMaxAiTokens || subscription.plan.maxAiTokensPerMonth || 100000;

  // Get current usage for the period
  const usage = await getSchoolUsage(schoolId, periodStart, now);
  const currentUsage = usage.totalTokens;
  const percentage = tokenLimit > 0 ? Math.round((currentUsage / tokenLimit) * 100) : 0;

  // Determine warning level
  let warning = null;
  if (percentage >= 100) {
    warning = 'exceeded';
  } else if (percentage >= 80) {
    warning = 'critical';
  } else if (percentage >= 50) {
    warning = 'warning';
  }

  return {
    exceeded: currentUsage >= tokenLimit,
    usage: currentUsage,
    limit: tokenLimit,
    percentage,
    warning,
    periodStart,
    periodEnd,
    aiRequests: usage.aiRequests,
    dbFallbackRequests: usage.dbFallbackRequests
  };
}

/**
 * Get daily usage for charts
 */
async function getDailyUsage(schoolId, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await prisma.aiUsageLog.findMany({
    where: {
      schoolId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Group by day
  const byDay = {};
  for (let i = 0; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    byDay[dateStr] = { tokens: 0, cost: 0, requests: 0 };
  }

  logs.forEach(log => {
    const day = log.createdAt.toISOString().split('T')[0];
    if (byDay[day]) {
      byDay[day].tokens += log.totalTokens;
      byDay[day].cost += Number(log.estimatedCost || 0);
      byDay[day].requests += 1;
    }
  });

  return Object.entries(byDay)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = {
  logAiUsage,
  getSchoolUsage,
  getUserUsage,
  getGlobalUsage,
  checkQuota,
  getDailyUsage,
  calculateCost,
  MODEL_PRICING
};