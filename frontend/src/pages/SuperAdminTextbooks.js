import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const SuperAdminTextbooks = () => {
  const [boards, setBoards] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    boardId: '',
    grade: '',
    subject: ''
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    boardId: '',
    grade: '',
    subject: '',
    title: '',
    edition: '',
    publisher: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [showChaptersModal, setShowChaptersModal] = useState(false);

  useEffect(() => {
    fetchBoards();
    fetchBooks();
  }, [filters]);

  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards');
      setBoards(response.data.boards || response.data || []);
    } catch (err) {
      console.error('Error fetching boards:', err);
    }
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.boardId) params.append('boardId', filters.boardId);
      if (filters.grade) params.append('grade', filters.grade);
      if (filters.subject) params.append('subject', filters.subject);

      const response = await api.get(`/books?${params.toString()}`);
      setBooks(response.data.books || response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError(err.response?.data?.message || 'Failed to load textbooks');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const openUploadModal = () => {
    setUploadData({
      boardId: '',
      grade: '',
      subject: '',
      title: '',
      edition: '',
      publisher: '',
      file: null
    });
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadData({
      boardId: '',
      grade: '',
      subject: '',
      title: '',
      edition: '',
      publisher: '',
      file: null
    });
  };

  const handleUploadChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setUploadData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setUploadData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file) {
      setError('Please select a PDF file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    // Append all fields except 'file' 
    Object.keys(uploadData).forEach(key => {
      if (key !== 'file' && uploadData[key]) {
        formData.append(key, uploadData[key]);
      }
    });
    // Append file with the field name 'pdf' as expected by backend
    formData.append('pdf', uploadData.file);

    try {
      await api.post('/ingestion/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      closeUploadModal();
      fetchBooks();
    } catch (err) {
      console.error('Error uploading book:', err);
      setError(err.response?.data?.message || 'Failed to upload textbook');
    } finally {
      setUploading(false);
    }
  };

  const viewChapters = async (book) => {
    try {
      setSelectedBook(book);
      const response = await api.get(`/chapters?bookId=${book.id}`);
      setChapters(response.data.chapters || response.data || []);
      setShowChaptersModal(true);
    } catch (err) {
      console.error('Error fetching chapters:', err);
      setError(err.response?.data?.message || 'Failed to load chapters');
    }
  };

  const processBook = async (book) => {
    if (!window.confirm(`Process "${book.title}"? This will extract text and create content chunks.`)) {
      return;
    }

    try {
      await api.post(`/ingestion/reprocess/${book.id}`);
      fetchBooks();
    } catch (err) {
      console.error('Error processing book:', err);
      setError(err.response?.data?.message || 'Failed to process textbook');
    }
  };

  const toggleBookStatus = async (book) => {
    try {
      await api.put(`/books/${book.id}`, { isActive: !book.isActive });
      fetchBooks();
    } catch (err) {
      console.error('Error updating book:', err);
      setError(err.response?.data?.message || 'Failed to update textbook');
    }
  };

  const deleteBook = async (book) => {
    if (!window.confirm(`Are you sure you want to delete "${book.title}"? This will also delete all chapters and content chunks.`)) {
      return;
    }

    try {
      await api.delete(`/books/${book.id}`);
      fetchBooks();
    } catch (err) {
      console.error('Error deleting book:', err);
      setError(err.response?.data?.message || 'Failed to delete textbook');
    }
  };

  const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const subjects = ['Math', 'Science', 'English', 'Hindi', 'Social Science', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Computer Science'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Textbook Management</h1>
          <p className="text-gray-600 mt-1">Upload and manage curriculum textbooks</p>
        </div>
        <button
          onClick={openUploadModal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Textbook
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <select
              name="boardId"
              value={filters.boardId}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Boards</option>
              {boards.map(board => (
                <option key={board.id} value={board.id}>{board.name}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <select
              name="grade"
              value={filters.grade}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Grades</option>
              {grades.map(grade => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <select
              name="subject"
              value={filters.subject}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => fetchBooks()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Search
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Books Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : books.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 6.477 9.246 6 7.5 6S4.168 6.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 6.477 14.754 6 16.5 6c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-gray-500 mb-4">No textbooks found</p>
          <button
            onClick={openUploadModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Upload your first textbook
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <div
              key={book.id}
              className={`bg-white rounded-lg shadow overflow-hidden ${
                !book.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 mb-2">
                      {book.board?.name || 'Unknown Board'}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">{book.title}</h3>
                  </div>
                  {!book.isActive && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <p>Grade: {book.grade} | Subject: {book.subject}</p>
                  {book.publisher && <p>Publisher: {book.publisher}</p>}
                  {book.edition && <p>Edition: {book.edition}</p>}
                </div>

                <div className="text-sm text-gray-500 mb-4">
                  <p>Chapters: {book._count?.chapters || 0}</p>
                  <p>Content Chunks: {book._count?.chunks || 0}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => viewChapters(book)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    View Chapters
                  </button>
                  {book.filePath && !book._count?.chunks && (
                    <button
                      onClick={() => processBook(book)}
                      className="px-3 py-2 border border-green-300 rounded-lg text-green-600 hover:bg-green-50 text-sm"
                    >
                      Process
                    </button>
                  )}
                  <button
                    onClick={() => toggleBookStatus(book)}
                    className={`px-3 py-2 border rounded-lg text-sm ${
                      book.isActive
                        ? 'border-yellow-300 text-yellow-600 hover:bg-yellow-50'
                        : 'border-green-300 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {book.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteBook(book)}
                    className="px-3 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Textbook</h3>

            <form onSubmit={handleUpload}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
                  <select
                    name="boardId"
                    value={uploadData.boardId}
                    onChange={handleUploadChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select Board</option>
                    {boards.map(board => (
                      <option key={board.id} value={board.id}>{board.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                    <select
                      name="grade"
                      value={uploadData.grade}
                      onChange={handleUploadChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Grade</option>
                      {grades.map(grade => (
                        <option key={grade} value={grade}>Grade {grade}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select
                      name="subject"
                      value={uploadData.subject}
                      onChange={handleUploadChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={uploadData.title}
                    onChange={handleUploadChange}
                    placeholder="e.g., Mathematics Textbook"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Edition (Optional)</label>
                    <input
                      type="text"
                      name="edition"
                      value={uploadData.edition}
                      onChange={handleUploadChange}
                      placeholder="e.g., 2024 Edition"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Publisher (Optional)</label>
                    <input
                      type="text"
                      name="publisher"
                      value={uploadData.publisher}
                      onChange={handleUploadChange}
                      placeholder="e.g., NCERT"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PDF File</label>
                  <input
                    type="file"
                    name="file"
                    onChange={handleUploadChange}
                    accept=".pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeUploadModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chapters Modal */}
      {showChaptersModal && selectedBook && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Chapters - {selectedBook.title}
              </h3>
              <button
                onClick={() => setShowChaptersModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {chapters.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No chapters found. Process the textbook to extract chapters.
              </p>
            ) : (
              <div className="space-y-2">
                {chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="p-4 bg-gray-50 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        Chapter {chapter.number}: {chapter.title}
                      </p>
                      {chapter.description && (
                        <p className="text-sm text-gray-500">{chapter.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {chapter._count?.chunks || 0} content chunks
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminTextbooks;