const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const planController = require('../controllers/planController');
const superAdminController = require('../controllers/superAdminController');
const { protect, authorize, superAdminOnly } = require('../middleware/auth');

// All routes require SUPER_ADMIN role
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// ============================================
// Dashboard
// ============================================

/**
 * @route GET /api/admin/dashboard
 * @desc Get admin dashboard stats
 * @access Private (Super Admin)
 */
router.get('/dashboard', superAdminController.getDashboardStats);

// ============================================
// Plans Management
// ============================================

/**
 * @route GET /api/admin/plans
 * @desc Get all subscription plans
 * @access Private (Super Admin)
 */
router.get('/plans', planController.getAllPlans);

/**
 * @route GET /api/admin/plans/:id
 * @desc Get plan by ID
 * @access Private (Super Admin)
 */
router.get('/plans/:id', planController.getPlanById);

/**
 * @route POST /api/admin/plans
 * @desc Create a new plan
 * @access Private (Super Admin)
 */
router.post('/plans', [
  body('name').trim().notEmpty().withMessage('Plan name is required'),
  body('displayName').trim().notEmpty().withMessage('Display name is required'),
  body('priceMonthly').isFloat({ min: 0 }).withMessage('Monthly price must be a positive number'),
  body('priceYearly').isFloat({ min: 0 }).withMessage('Yearly price must be a positive number')
], planController.createPlan);

/**
 * @route PUT /api/admin/plans/:id
 * @desc Update a plan
 * @access Private (Super Admin)
 */
router.put('/plans/:id', planController.updatePlan);

/**
 * @route DELETE /api/admin/plans/:id
 * @desc Delete a plan
 * @access Private (Super Admin)
 */
router.delete('/plans/:id', planController.deletePlan);

/**
 * @route PUT /api/admin/plans/:id/default
 * @desc Set plan as default
 * @access Private (Super Admin)
 */
router.put('/plans/:id/default', planController.setDefaultPlan);

// ============================================
// Schools Management
// ============================================

/**
 * @route GET /api/admin/schools
 * @desc Get all schools with subscription info
 * @access Private (Super Admin)
 */
router.get('/schools', superAdminController.getAllSchools);

/**
 * @route GET /api/admin/schools/:id
 * @desc Get school by ID with detailed info
 * @access Private (Super Admin)
 */
router.get('/schools/:id', superAdminController.getSchoolById);

/**
 * @route PUT /api/admin/schools/:id/status
 * @desc Update school status
 * @access Private (Super Admin)
 */
router.put('/schools/:id/status', [
  body('status').isIn(['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'])
    .withMessage('Invalid status')
], superAdminController.updateSchoolStatus);

/**
 * @route PUT /api/admin/schools/:id/plan
 * @desc Change school plan
 * @access Private (Super Admin)
 */
router.put('/schools/:id/plan', [
  body('planId').isUUID().withMessage('Valid plan ID is required')
], superAdminController.changeSchoolPlan);

/**
 * @route PUT /api/admin/schools/:id/extend-trial
 * @desc Extend school trial
 * @access Private (Super Admin)
 */
router.put('/schools/:id/extend-trial', [
  body('days').isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
], superAdminController.extendTrial);

// ============================================
// Usage & Analytics
// ============================================

/**
 * @route GET /api/admin/usage
 * @desc Get usage dashboard
 * @access Private (Super Admin)
 */
router.get('/usage', superAdminController.getUsageDashboard);

/**
 * @route GET /api/admin/audit-logs
 * @desc Get audit logs
 * @access Private (Super Admin)
 */
router.get('/audit-logs', superAdminController.getAuditLogs);

module.exports = router;
