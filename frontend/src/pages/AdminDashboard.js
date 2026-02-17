import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchoolData();
  }, []);

  const fetchSchoolData = async () => {
    try {
      const response = await axios.get('/school');
      setSchool(response.data.school);
    } catch (error) {
      console.error('Failed to fetch school data:', error);
      toast.error('Failed to load school data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await axios.post('/school/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSchool(response.data.school);
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload logo');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-800">
          Admin Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your school settings and teachers
        </p>
      </div>

      {/* School Info Card */}
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">School Information</h2>
        
        <div className="flex items-start gap-8">
          {/* Logo Section */}
          <div className="text-center">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-purple-200">
              {school?.logo ? (
                <img 
                  src={`${process.env.REACT_APP_API_URL?.replace('/api', '')}${school.logo}`} 
                  alt="School Logo" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl text-purple-300">🏫</span>
              )}
            </div>
            <label className="mt-3 inline-block cursor-pointer">
              <span className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                Upload Logo
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* School Details */}
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">School Name</label>
                <p className="font-semibold text-gray-800">{school?.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-semibold text-gray-800">{school?.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <p className="font-semibold text-gray-800">{school?.phone || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Address</label>
                <p className="font-semibold text-gray-800">{school?.address || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Plan</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  school?.plan === 'FREE' ? 'bg-gray-100 text-gray-600' :
                  school?.plan === 'PREMIUM' ? 'bg-purple-100 text-purple-600' :
                  'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                }`}>
                  {school?.plan}
                </span>
              </div>
              <div>
                <label className="text-sm text-gray-500">Total Users</label>
                <p className="font-semibold text-gray-800">{school?._count?.users || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg shadow-purple-200">
          <div className="text-4xl mb-2">👨‍🏫</div>
          <p className="text-purple-100 text-sm">Total Teachers</p>
          <p className="text-3xl font-bold">{school?._count?.users - 1 || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg shadow-green-200">
          <div className="text-4xl mb-2">📝</div>
          <p className="text-green-100 text-sm">Total Worksheets</p>
          <p className="text-3xl font-bold">{school?._count?.worksheets || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-200">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-orange-100 text-sm">Current Plan</p>
          <p className="text-3xl font-bold">{school?.plan}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/teachers"
          className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100 border border-gray-100 card-hover"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl">
              👨‍🏫
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Manage Teachers</h3>
              <p className="text-gray-500 text-sm">Add, edit, or remove teacher accounts</p>
            </div>
          </div>
        </Link>

        <Link
          to="/settings"
          className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100 border border-gray-100 card-hover"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center text-2xl">
              ⚙️
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">School Settings</h3>
              <p className="text-gray-500 text-sm">Update school details and preferences</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;