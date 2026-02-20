/**
 * AI Usage Routes
 */

const express = require('express');
const router = express.Router();
const aiUsageController = require('../controllers/aiUsageController');
const { requireAuth, requireRole, internalAuth } = require('../middleware/auth');

// ============================================
// Internal Service Routes (for n8n)
// ============================================

/**
 * @route POST /api/ai-usage/log
 * @desc Log AI usage from n8n (internal service)
 * @access Internal (requires x-internal-api-key header)
 * 
 * Body: {
 *   schoolId: string (nullable for system jobs),
 *   userId: string (nullable),
 *   feature: string (e.g., "worksheet_generation"),
 *   model: string (e.g., "gpt-4"),
 *   inputTokens: number,
 *   outputTokens: number,
 *   totalTokens: number (optional, calculated if not provided),
 *   requestId: string (optional),
 *   worksheetId: string (optional),
 *   source: string (default: "ai", or "db_fallback"),
 *   metadata: object (optional)
 * }
 */
router.post('/log', internalAuth, aiUsageController.logUsage);

/**
 * @route GET /api/ai-usage/check-quota/:schoolId
 * @desc Check if a school has quota remaining (for n8n pre-check)
 * @access Internal (requires x-internal-api-key header)
 */
router.get('/check-quota/:schoolId', internalAuth, aiUsageController.checkQuotaForN8n);

// ============================================
// School Admin / Teacher Routes
// ============================================

// Get usage summary for current school
router.get('/school/summary', requireAuth, aiUsageController.getSchoolUsageSummary);

// Get quota status
router.get('/school/quota', requireAuth, aiUsageController.getQuotaStatus);

// Get usage for a specific feature
router.get('/school/feature/:feature', requireAuth, aiUsageController.getFeatureUsage);

// ============================================
// Super Admin Routes
// ============================================

// Get global usage statistics
router.get('/global', requireAuth, requireRole('SUPER_ADMIN'), aiUsageController.getGlobalUsageStats);

// Get usage for a specific school
router.get('/school/:schoolId', requireAuth, requireRole('SUPER_ADMIN'), aiUsageController.getSchoolUsageById);

// Get usage alerts
router.get('/alerts', requireAuth, requireRole('SUPER_ADMIN'), aiUsageController.getUsageAlerts);

// Get cost report
router.get('/costs', requireAuth, requireRole('SUPER_ADMIN'), aiUsageController.getCostReport);

// Get AI vs DB fallback stats
router.get('/ai-vs-db', requireAuth, requireRole('SUPER_ADMIN'), aiUsageController.getAiVsDbStats);

module.exports = router;