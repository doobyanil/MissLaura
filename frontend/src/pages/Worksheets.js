import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const Worksheets = () => {
  const [worksheets, setWorksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    curriculum: '',
    grade: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchWorksheets();
  }, [pagination.page, filters]);

  const fetchWorksheets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      
      const response = await axios.get(`/worksheets?${params}`);
      setWorksheets(response.data.worksheets);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        pages: response.data.pagination.pages
      }));
    } catch (error) {
      toast.error('Failed to load worksheets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this worksheet?')) return;
    
    try {
      await axios.delete(`/worksheets/${id}`);
      toast.success('Worksheet deleted');
      fetchWorksheets();
    } catch (error) {
      toast.error('Failed to delete worksheet');
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-800">
            Worksheets
          </h1>
          <p className="text-gray-500 mt-1">
            View and manage your generated worksheets
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/worksheets/curriculum"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            📚 Curriculum Worksheet
          </Link>
          <Link
            to="/worksheets/new"
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            + Create New
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search worksheets..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />
          <select
            value={filters.curriculum}
            onChange={(e) => handleFilterChange('curriculum', e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          >
            <option value="">All Curricula</option>
            <option value="INDIAN">Indian</option>
            <option value="IB">IB</option>
            <option value="MONTESSORI">Montessori</option>
          </select>
          <input
            type="text"
            placeholder="Filter by grade..."
            value={filters.grade}
            onChange={(e) => handleFilterChange('grade', e.target.value)}
            className="w-40 px-4 py-2 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />
        </div>
      </div>

      {/* Worksheets Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      ) : worksheets.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Worksheets Yet</h3>
          <p className="text-gray-500 mb-6">Create your first worksheet to get started!</p>
          <Link
            to="/worksheets/new"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl"
          >
            Create Worksheet
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {worksheets.map((worksheet) => (
              <div
                key={worksheet.id}
                className="bg-white rounded-2xl shadow-lg shadow-gray-100 overflow-hidden card-hover"
              >
                <div className="h-32 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <span className="text-5xl">📝</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 mb-1 truncate">{worksheet.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {worksheet.curriculum} • {worksheet.grade}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                    <span>{worksheet.skill}</span>
                    <span>{new Date(worksheet.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/worksheets/${worksheet.id}`}
                      className="flex-1 py-2 px-3 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors text-sm text-center"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDownloadPDF(worksheet.id, worksheet.title)}
                      className="flex-1 py-2 px-3 bg-purple-100 text-purple-600 rounded-lg font-medium hover:bg-purple-200 transition-colors text-sm"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => handleDelete(worksheet.id)}
                      className="py-2 px-3 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-white rounded-lg shadow disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 bg-white rounded-lg shadow disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Worksheets;