import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, [search]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${search}` : '';
      const response = await axios.get(`/school/teachers${params}`);
      setTeachers(response.data.teachers);
    } catch (error) {
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    
    if (!newTeacher.name || !newTeacher.email) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/school/teachers', newTeacher);
      toast.success('Teacher added successfully! Login credentials sent to their email.');
      setShowAddModal(false);
      setNewTeacher({ name: '', email: '' });
      fetchTeachers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (teacherId, currentStatus) => {
    try {
      await axios.patch(`/school/teachers/${teacherId}/status`, {
        isActive: !currentStatus
      });
      toast.success(`Teacher ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchTeachers();
    } catch (error) {
      toast.error('Failed to update teacher status');
    }
  };

  const handleDelete = async (teacherId) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    
    try {
      await axios.delete(`/school/teachers/${teacherId}`);
      toast.success('Teacher deleted');
      fetchTeachers();
    } catch (error) {
      toast.error('Failed to delete teacher');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-800">
            Teachers
          </h1>
          <p className="text-gray-500 mt-1">
            Manage teacher accounts in your school
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transform hover:-translate-y-0.5 transition-all duration-200"
        >
          + Add Teacher
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-100 p-4 mb-6">
        <input
          type="text"
          placeholder="Search teachers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
        />
      </div>

      {/* Teachers List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">👨‍🏫</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Teachers Yet</h3>
          <p className="text-gray-500 mb-6">Add your first teacher to get started!</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl"
          >
            Add Teacher
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Worksheets</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                        {teacher.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{teacher.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{teacher.email}</td>
                  <td className="px-6 py-4 text-gray-600">{teacher._count?.worksheets || 0}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      teacher.isActive 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {teacher.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {teacher.mustChangePassword && (
                      <span className="ml-2 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-600">
                        Pending Password Change
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleStatus(teacher.id, teacher.isActive)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          teacher.isActive
                            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                      >
                        {teacher.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Teacher</h2>
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teacher Name
                </label>
                <input
                  type="text"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  placeholder="teacher@school.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Login credentials will be sent to this email
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-200 hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;