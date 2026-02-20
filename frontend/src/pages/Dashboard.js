import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentWorksheets, setRecentWorksheets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentWorksheets();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get('/users/dashboard');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentWorksheets = async () => {
    try {
      const response = await axios.get('/worksheets?limit=10');
      setRecentWorksheets(response.data.worksheets);
    } catch (error) {
      console.error('Failed to fetch worksheets:', error);
    }
  };

  const handleDownloadPDF = async (id, title) => {
    try {
      const response = await axios.get(`/worksheets/${id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded!');
    } catch (error) {
      toast.error('Failed to download PDF');
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
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Here's what's happening with your worksheets today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to="/worksheets/new"
          className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg shadow-purple-200 card-hover group"
        >
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">✨</div>
          <h3 className="text-xl font-bold mb-1">Create Worksheet</h3>
          <p className="text-purple-100 text-sm">Generate a new worksheet in 2-3 minutes</p>
        </Link>

        <Link
          to="/worksheets/curriculum"
          className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 card-hover group"
        >
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📚</div>
          <h3 className="text-xl font-bold mb-1">Curriculum Worksheet</h3>
          <p className="text-blue-100 text-sm">Generate from official textbooks</p>
        </Link>

        <Link
          to="/worksheets"
          className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100 card-hover border border-gray-100 group"
        >
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📝</div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">My Worksheets</h3>
          <p className="text-gray-500 text-sm">View and manage your worksheets</p>
        </Link>
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            to="/teachers"
            className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100 card-hover border border-gray-100 group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">👨‍🏫</div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">Manage Teachers</h3>
            <p className="text-gray-500 text-sm">Add and manage teacher accounts</p>
          </Link>
          <Link
            to="/admin"
            className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100 card-hover border border-gray-100 group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">⚙️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">Admin Settings</h3>
            <p className="text-gray-500 text-sm">Manage school settings and content</p>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Worksheets</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalWorksheets}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl">
                  📊
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Teachers</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalTeachers}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center text-2xl">
                    👨‍🏫
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Curricula Used</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">
                    {stats.worksheetsByCurriculum?.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center text-2xl">
                  📚
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Grades Covered</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">
                    {stats.worksheetsByGrade?.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl">
                  🎯
                </div>
              </div>
            </div>
          </div>

          {/* Usage Limit Banner for Free Plan */}
          {user?.school?.plan === 'FREE' && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 mb-8 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-purple-800">Free Plan</h3>
                  <p className="text-purple-600 text-sm">
                    You've created {stats.totalWorksheets} worksheets this month
                  </p>
                </div>
                <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                  Upgrade Plan
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Recent Worksheets History */}
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Recent Worksheets</h2>
          <Link to="/worksheets" className="text-purple-600 hover:text-purple-700 font-medium text-sm">
            View All →
          </Link>
        </div>
        
        {recentWorksheets.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentWorksheets.map((worksheet) => (
              <div key={worksheet.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-2xl">
                      📝
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{worksheet.title}</h3>
                      <p className="text-sm text-gray-500">
                        {worksheet.curriculum} • {worksheet.grade} • {worksheet.skill}
                        {worksheet.theme && ` • ${worksheet.theme}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(worksheet.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-400">
                        by {worksheet.createdBy?.name || 'You'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadPDF(worksheet.id, worksheet.title)}
                      className="px-4 py-2 bg-purple-100 text-purple-600 rounded-lg font-medium hover:bg-purple-200 transition-colors text-sm"
                    >
                      Download PDF
                    </button>
                    <Link
                      to={`/worksheets/${worksheet.id}`}
                      className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors text-sm"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Worksheets Yet</h3>
            <p className="text-gray-500 mb-6">Create your first worksheet to get started!</p>
            <Link
              to="/worksheets/new"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-200 hover:shadow-xl transition-all"
            >
              ✨ Create Your First Worksheet
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;