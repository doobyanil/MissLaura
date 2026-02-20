import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const SuperAdminPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    priceMonthly: '',
    priceYearly: '',
    maxTeachers: 1,
    maxWorksheets: 10,
    maxAiCalls: 100,
    hasTextbookAccess: false,
    hasMicrosoftForms: false,
    hasCustomThemes: false,
    isDefault: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/plans');
      setPlans(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err.response?.data?.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      displayName: '',
      description: '',
      priceMonthly: '',
      priceYearly: '',
      maxTeachers: 1,
      maxWorksheets: 10,
      maxAiCalls: 100,
      hasTextbookAccess: false,
      hasMicrosoftForms: false,
      hasCustomThemes: false,
      isDefault: false
    });
    setShowModal(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description || '',
      priceMonthly: plan.priceMonthly.toString(),
      priceYearly: plan.priceYearly.toString(),
      maxTeachers: plan.maxTeachers,
      maxWorksheets: plan.maxWorksheets,
      maxAiCalls: plan.maxAiCalls,
      hasTextbookAccess: plan.hasTextbookAccess,
      hasMicrosoftForms: plan.hasMicrosoftForms,
      hasCustomThemes: plan.hasCustomThemes,
      isDefault: plan.isDefault
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPlan(null);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        ...formData,
        priceMonthly: parseFloat(formData.priceMonthly),
        priceYearly: parseFloat(formData.priceYearly),
        maxTeachers: parseInt(formData.maxTeachers),
        maxWorksheets: parseInt(formData.maxWorksheets),
        maxAiCalls: parseInt(formData.maxAiCalls)
      };

      if (editingPlan) {
        await api.put(`/admin/plans/${editingPlan.id}`, data);
      } else {
        await api.post('/admin/plans', data);
      }

      closeModal();
      fetchPlans();
    } catch (err) {
      console.error('Error saving plan:', err);
      setError(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Are you sure you want to delete the "${plan.displayName}" plan?`)) {
      return;
    }

    try {
      await api.delete(`/admin/plans/${plan.id}`);
      fetchPlans();
    } catch (err) {
      console.error('Error deleting plan:', err);
      setError(err.response?.data?.message || 'Failed to delete plan');
    }
  };

  const handleSetDefault = async (plan) => {
    try {
      await api.put(`/admin/plans/${plan.id}/default`);
      fetchPlans();
    } catch (err) {
      console.error('Error setting default plan:', err);
      setError(err.response?.data?.message || 'Failed to set default plan');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-600 mt-1">Create and manage subscription plans for schools</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Plan
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No subscription plans created yet</p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create your first plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow overflow-hidden ${
                plan.isDefault ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              {plan.isDefault && (
                <div className="bg-indigo-600 text-white text-center text-sm py-1">
                  Default Plan
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{plan.displayName}</h3>
                    <p className="text-sm text-gray-500">{plan.name}</p>
                  </div>
                  {!plan.isActive && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">¥{plan.priceMonthly}</span>
                    <span className="text-gray-500 ml-1">/month</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    ¥{plan.priceYearly}/year (save {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%)
                  </p>
                </div>

                <p className="text-sm text-gray-600 mb-4">{plan.description || 'No description'}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">{plan.maxTeachers} teacher{plan.maxTeachers > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">{plan.maxWorksheets} worksheets/month</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">{plan.maxAiCalls} AI calls/month</span>
                  </div>
                  {plan.hasTextbookAccess && (
                    <div className="flex items-center text-sm">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Textbook access</span>
                    </div>
                  )}
                  {plan.hasMicrosoftForms && (
                    <div className="flex items-center text-sm">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Microsoft Forms export</span>
                    </div>
                  )}
                </div>

                <div className="text-sm text-gray-500 mb-4">
                  {plan._count?.subscriptions || 0} school(s) subscribed
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Edit
                  </button>
                  {!plan.isDefault && (
                    <button
                      onClick={() => handleSetDefault(plan)}
                      className="px-3 py-2 border border-indigo-300 rounded-lg text-indigo-600 hover:bg-indigo-50 text-sm"
                    >
                      Set Default
                    </button>
                  )}
                  {!plan.isDefault && (!plan._count?.subscriptions || plan._count.subscriptions === 0) && (
                    <button
                      onClick={() => handleDelete(plan)}
                      className="px-3 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plan Name (ID)
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="e.g., premium"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                      disabled={!!editingPlan}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleFormChange}
                      placeholder="e.g., Premium Plan"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Price (¥)
                    </label>
                    <input
                      type="number"
                      name="priceMonthly"
                      value={formData.priceMonthly}
                      onChange={handleFormChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Yearly Price (¥)
                    </label>
                    <input
                      type="number"
                      name="priceYearly"
                      value={formData.priceYearly}
                      onChange={handleFormChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Teachers
                    </label>
                    <input
                      type="number"
                      name="maxTeachers"
                      value={formData.maxTeachers}
                      onChange={handleFormChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Worksheets
                    </label>
                    <input
                      type="number"
                      name="maxWorksheets"
                      value={formData.maxWorksheets}
                      onChange={handleFormChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max AI Calls
                    </label>
                    <input
                      type="number"
                      name="maxAiCalls"
                      value={formData.maxAiCalls}
                      onChange={handleFormChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Features</label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="hasTextbookAccess"
                      checked={formData.hasTextbookAccess}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Textbook Access</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="hasMicrosoftForms"
                      checked={formData.hasMicrosoftForms}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Microsoft Forms Export</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="hasCustomThemes"
                      checked={formData.hasCustomThemes}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Custom Themes</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={formData.isDefault}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Set as Default Plan</label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Create Plan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPlans;