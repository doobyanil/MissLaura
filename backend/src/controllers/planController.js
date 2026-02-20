const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all subscription plans
 * GET /api/admin/plans
 */
const getAllPlans = async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { priceMonthly: 'asc' }
      ],
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });
    
    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ message: 'Failed to fetch plans', error: error.message });
  }
};

/**
 * Get plan by ID
 * GET /api/admin/plans/:id
 */
const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    res.json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ message: 'Failed to fetch plan', error: error.message });
  }
};

/**
 * Create a new plan
 * POST /api/admin/plans
 */
const createPlan = async (req, res) => {
  try {
    const {
      name,
      displayName,
      description,
      priceMonthly,
      priceYearly,
      maxTeachers,
      maxWorksheets,
      maxStudents,
      features,
      isDefault
    } = req.body;
    
    // Check if plan with same name exists
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { name }
    });
    
    if (existingPlan) {
      return res.status(400).json({ message: 'Plan with this name already exists' });
    }
    
    // If this is set as default, remove default from other plans
    if (isDefault) {
      await prisma.subscriptionPlan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }
    
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        displayName,
        description,
        priceMonthly,
        priceYearly,
        maxTeachers: maxTeachers || 1,
        maxWorksheets: maxWorksheets || 10,
        maxStudents: maxStudents || 100,
        features: features || [],
        isDefault: isDefault || false
      }
    });
    
    // Log audit
    await logAudit(req.user, 'PLAN_CREATED', 'SubscriptionPlan', plan.id, null, plan);
    
    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ message: 'Failed to create plan', error: error.message });
  }
};

/**
 * Update a plan
 * PUT /api/admin/plans/:id
 */
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      displayName,
      description,
      priceMonthly,
      priceYearly,
      maxTeachers,
      maxWorksheets,
      maxStudents,
      features,
      isActive
    } = req.body;
    
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });
    
    if (!existingPlan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        displayName,
        description,
        priceMonthly,
        priceYearly,
        maxTeachers,
        maxWorksheets,
        maxStudents,
        features,
        isActive
      }
    });
    
    // Log audit
    await logAudit(req.user, 'PLAN_UPDATED', 'SubscriptionPlan', id, existingPlan, plan);
    
    res.json(plan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ message: 'Failed to update plan', error: error.message });
  }
};

/**
 * Delete a plan
 * DELETE /api/admin/plans/:id
 */
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Check if plan is in use
    if (plan._count.subscriptions > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete plan that is in use. Deactivate it instead.' 
      });
    }
    
    // Don't allow deleting default plan
    if (plan.isDefault) {
      return res.status(400).json({ 
        message: 'Cannot delete default plan. Set another plan as default first.' 
      });
    }
    
    await prisma.subscriptionPlan.delete({
      where: { id }
    });
    
    // Log audit
    await logAudit(req.user, 'PLAN_DELETED', 'SubscriptionPlan', id, plan, null);
    
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ message: 'Failed to delete plan', error: error.message });
  }
};

/**
 * Set plan as default
 * PUT /api/admin/plans/:id/default
 */
const setDefaultPlan = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    
    // Remove default from all plans
    await prisma.subscriptionPlan.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    });
    
    // Set this plan as default
    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: { isDefault: true }
    });
    
    // Log audit
    await logAudit(req.user, 'PLAN_SET_DEFAULT', 'SubscriptionPlan', id, plan, updatedPlan);
    
    res.json(updatedPlan);
  } catch (error) {
    console.error('Error setting default plan:', error);
    res.status(500).json({ message: 'Failed to set default plan', error: error.message });
  }
};

// Helper function for audit logging
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
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  setDefaultPlan
};
