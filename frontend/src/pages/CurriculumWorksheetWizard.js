import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const CurriculumWorksheetWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showFormsModal, setShowFormsModal] = useState(false);
  const [formsExportData, setFormsExportData] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Data from backend
  const [boards, setBoards] = useState([]);
  const [books, setBooks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    board: '',
    grade: '',
    subject: '',
    chapterId: '',
    chapterTitle: '',
    seedKeywords: '',
    numQuestions: 10,
    title: ''
  });

  // Available grades and subjects (derived from books)
  const [availableGrades, setAvailableGrades] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);

  // Fetch boards on mount
  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    setLoadingBoards(true);
    try {
      const response = await api.get('/boards');
      // API returns boards array directly
      const boardsData = Array.isArray(response.data) ? response.data : (response.data.boards || []);
      setBoards(boardsData);
    } catch (error) {
      console.error('Failed to fetch boards:', error);
      // Set default boards if API fails
      setBoards([
        { id: 'cbse', name: 'CBSE' },
        { id: 'icse', name: 'ICSE' },
        { id: 'state', name: 'State Board' }
      ]);
    } finally {
      setLoadingBoards(false);
    }
  };

  const fetchBooksByBoard = async (boardName) => {
    setLoadingBooks(true);
    try {
      const response = await api.get(`/books?board=${boardName}`);
      // API returns books array directly
      const booksData = Array.isArray(response.data) ? response.data : (response.data.books || []);
      setBooks(booksData);
      
      // Extract unique grades
      const grades = [...new Set(booksData.map(b => b.grade))].sort();
      setAvailableGrades(grades);
    } catch (error) {
      console.error('Failed to fetch books:', error);
      setBooks([]);
      setAvailableGrades([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  const fetchBooksByBoardAndGrade = async (boardName, grade) => {
    setLoadingBooks(true);
    try {
      const response = await api.get(`/books?board=${boardName}&grade=${grade}`);
      // API returns books array directly
      const booksData = Array.isArray(response.data) ? response.data : (response.data.books || []);
      setBooks(booksData);
      
      // Extract unique subjects
      const subjects = [...new Set(booksData.map(b => b.subject))].sort();
      setAvailableSubjects(subjects);
    } catch (error) {
      console.error('Failed to fetch books:', error);
      setBooks([]);
      setAvailableSubjects([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  const fetchChapters = async (bookId) => {
    setLoadingChapters(true);
    try {
      const response = await api.get(`/books/${bookId}/chapters`);
      setChapters(response.data.chapters || []);
    } catch (error) {
      console.error('Failed to fetch chapters:', error);
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  };

  // Handle board selection
  const handleBoardSelect = (boardName) => {
    setFormData({
      ...formData,
      board: boardName,
      grade: '',
      subject: '',
      chapterId: '',
      chapterTitle: ''
    });
    fetchBooksByBoard(boardName);
    setStep(2);
  };

  // Handle grade selection
  const handleGradeSelect = (grade) => {
    setFormData({
      ...formData,
      grade,
      subject: '',
      chapterId: '',
      chapterTitle: ''
    });
    fetchBooksByBoardAndGrade(formData.board, grade);
    setStep(3);
  };

  // Handle subject selection
  const handleSubjectSelect = async (subject) => {
    const selectedBook = books.find(b => b.subject === subject && b.grade === formData.grade);
    setFormData({
      ...formData,
      subject,
      chapterId: '',
      chapterTitle: ''
    });
    
    if (selectedBook) {
      await fetchChapters(selectedBook.id);
    }
    setStep(4);
  };

  // Handle chapter selection
  const handleChapterSelect = (chapterId, chapterTitle) => {
    setFormData({
      ...formData,
      chapterId,
      chapterTitle
    });
    setStep(5);
  };

  // Skip chapter selection
  const handleSkipChapter = () => {
    setFormData({
      ...formData,
      chapterId: '',
      chapterTitle: ''
    });
    setStep(5);
  };

  // Handle keywords and generate
  const handleGenerate = async () => {
    if (!formData.seedKeywords.trim()) {
      toast.error('Please enter at least one keyword');
      return;
    }

    setLoading(true);
    try {
      // First, retrieve content chunks
      const retrieveResponse = await api.post('/content/retrieve', {
        board: formData.board,
        grade: formData.grade,
        subject: formData.subject,
        chapterId: formData.chapterId || undefined,
        seedKeywords: formData.seedKeywords.split(',').map(k => k.trim()).filter(k => k),
        limit: 5
      });

      const chunks = retrieveResponse.data.chunks || [];

      if (chunks.length === 0) {
        toast.error('No relevant content found. Please try different keywords.');
        setLoading(false);
        return;
      }

      // Then generate worksheet with chunks
      const generateResponse = await api.post('/worksheets/curriculum', {
        board: formData.board,
        grade: formData.grade,
        subject: formData.subject,
        chapter: formData.chapterTitle || undefined,
        seedKeywords: formData.seedKeywords.split(',').map(k => k.trim()).filter(k => k),
        numQuestions: formData.numQuestions,
        chunks,
        title: formData.title || `${formData.subject} - ${formData.chapterTitle || formData.grade}`
      });

      setPreviewData(generateResponse.data.worksheet);
      setStep(6);
      toast.success('Worksheet generated!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create worksheet');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      // First, retrieve content chunks
      const retrieveResponse = await api.post('/content/retrieve', {
        board: formData.board,
        grade: formData.grade,
        subject: formData.subject,
        chapterId: formData.chapterId || undefined,
        seedKeywords: formData.seedKeywords.split(',').map(k => k.trim()).filter(k => k),
        limit: 5
      });

      const chunks = retrieveResponse.data.chunks || [];

      // Then generate worksheet with chunks
      const generateResponse = await api.post('/worksheets/curriculum', {
        board: formData.board,
        grade: formData.grade,
        subject: formData.subject,
        chapter: formData.chapterTitle || undefined,
        seedKeywords: formData.seedKeywords.split(',').map(k => k.trim()).filter(k => k),
        numQuestions: formData.numQuestions,
        chunks,
        title: formData.title || `${formData.subject} - ${formData.chapterTitle || formData.grade}`
      });

      setPreviewData(generateResponse.data.worksheet);
      toast.success('New version generated!');
    } catch (error) {
      toast.error('Failed to regenerate worksheet');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/worksheets/${previewData.id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${previewData.title.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded!');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  // Microsoft Forms Export Functions
  const handleExportToMicrosoftForms = async () => {
    setExportLoading(true);
    try {
      const response = await api.get(`/worksheets/${previewData.id}/microsoft-forms`);
      setFormsExportData(response.data.data);
      setShowFormsModal(true);
    } catch (error) {
      toast.error('Failed to export to Microsoft Forms');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const response = await api.get(`/worksheets/${previewData.id}/microsoft-forms/csv`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${previewData.title.replace(/\s+/g, '_')}_microsoft_forms.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('CSV downloaded!');
    } catch (error) {
      toast.error('Failed to download CSV');
    }
  };

  const handleCopyToClipboard = () => {
    if (formsExportData?.copyPasteText) {
      navigator.clipboard.writeText(formsExportData.copyPasteText);
      toast.success('Copied to clipboard!');
    }
  };

  const openMicrosoftForms = () => {
    window.open('https://forms.office.com/Pages/DesignPage.aspx', '_blank');
  };

  const goBack = () => {
    setStep(step - 1);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-800">
          Curriculum-Grounded Worksheet
        </h1>
        <p className="text-gray-500 mt-1">
          Generate worksheets aligned with official textbooks
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 max-w-4xl overflow-x-auto">
        {[
          { num: 1, label: 'Board' },
          { num: 2, label: 'Grade' },
          { num: 3, label: 'Subject' },
          { num: 4, label: 'Chapter' },
          { num: 5, label: 'Keywords' },
          { num: 6, label: 'Preview' }
        ].map((s, index) => (
          <div key={s.num} className="flex items-center flex-shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
              step > s.num ? 'bg-green-500 text-white' :
              step === s.num ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200' :
              'bg-gray-200 text-gray-500'
            }`}>
              {step > s.num ? '✓' : s.num}
            </div>
            <span className={`ml-2 text-sm font-medium hidden md:block ${
              step >= s.num ? 'text-gray-800' : 'text-gray-400'
            }`}>
              {s.label}
            </span>
            {index < 5 && (
              <div className={`w-8 md:w-16 h-1 mx-1 md:mx-3 rounded transition-all ${
                step > s.num ? 'bg-green-500' : 'bg-gray-200'
              }`}></div>
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="max-w-4xl">
        {/* Step 1: Board Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Select Education Board</h2>
            <p className="text-gray-500 mb-6">Choose the board for your curriculum</p>
            
            {loadingBoards ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {boards.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => handleBoardSelect(board.name)}
                    className="p-6 bg-white rounded-2xl shadow-lg shadow-gray-100 border-2 border-transparent hover:border-blue-400 hover:shadow-xl transition-all text-left group"
                  >
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                      📚
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{board.name}</h3>
                    <p className="text-sm text-gray-500">Official curriculum textbooks</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Grade Selection */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Select Grade</h2>
            <p className="text-gray-500 mb-6">Choose the grade level for your worksheet</p>
            
            {loadingBooks ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : availableGrades.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {availableGrades.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => handleGradeSelect(grade)}
                    className="p-5 bg-white rounded-xl shadow-lg shadow-gray-100 border-2 border-transparent hover:border-blue-400 hover:shadow-xl transition-all text-left"
                  >
                    <h3 className="font-bold text-gray-800 text-lg">{grade}</h3>
                    <p className="text-sm text-blue-600 font-medium">{formData.board}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl">
                <p className="text-gray-500">No grades available for this board. Please upload textbooks first.</p>
              </div>
            )}
            
            <button
              onClick={goBack}
              className="mt-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
            >
              ← Back to Board
            </button>
          </div>
        )}

        {/* Step 3: Subject Selection */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Select Subject</h2>
            <p className="text-gray-500 mb-6">Choose the subject for your worksheet</p>
            
            {loadingBooks ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : availableSubjects.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {availableSubjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => handleSubjectSelect(subject)}
                    className="p-5 bg-white rounded-xl shadow-lg shadow-gray-100 border-2 border-transparent hover:border-blue-400 hover:shadow-xl transition-all text-left"
                  >
                    <div className="text-2xl mb-2">
                      {subject === 'Math' && '🔢'}
                      {subject === 'Science' && '🔬'}
                      {subject === 'English' && '📖'}
                      {subject === 'Hindi' && '🔤'}
                      {subject === 'Social Studies' && '🌍'}
                      {!['Math', 'Science', 'English', 'Hindi', 'Social Studies'].includes(subject) && '📚'}
                    </div>
                    <h3 className="font-bold text-gray-800">{subject}</h3>
                    <p className="text-sm text-gray-500">{formData.grade} • {formData.board}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl">
                <p className="text-gray-500">No subjects available for this grade. Please upload textbooks first.</p>
              </div>
            )}
            
            <button
              onClick={goBack}
              className="mt-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
            >
              ← Back to Grade
            </button>
          </div>
        )}

        {/* Step 4: Chapter Selection */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Select Chapter (Optional)</h2>
            <p className="text-gray-500 mb-6">Choose a specific chapter or skip to use all available content</p>
            
            {loadingChapters ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {chapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => handleChapterSelect(chapter.id, chapter.title)}
                      className="p-5 bg-white rounded-xl shadow-lg shadow-gray-100 border-2 border-transparent hover:border-blue-400 hover:shadow-xl transition-all text-left"
                    >
                      <p className="text-sm text-blue-600 font-medium mb-1">Chapter {chapter.number}</p>
                      <h3 className="font-bold text-gray-800">{chapter.title}</h3>
                    </button>
                  ))}
                </div>
                
                {chapters.length === 0 && (
                  <div className="text-center py-8 bg-yellow-50 rounded-xl mb-6">
                    <p className="text-yellow-700">No chapters found. You can skip this step.</p>
                  </div>
                )}
                
                <button
                  onClick={handleSkipChapter}
                  className="w-full p-4 bg-gray-100 rounded-xl text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                >
                  Skip - Use all available content
                </button>
              </>
            )}
            
            <button
              onClick={goBack}
              className="mt-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
            >
              ← Back to Subject
            </button>
          </div>
        )}

        {/* Step 5: Keywords & Generate */}
        {step === 5 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Enter Keywords & Generate</h2>
            <p className="text-gray-500 mb-6">Provide keywords to find relevant content from textbooks</p>
            
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-100 p-6 mb-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 font-medium uppercase">Board</p>
                  <p className="font-bold text-gray-800 mt-1">{formData.board}</p>
                </div>
                <div className="bg-cyan-50 rounded-xl p-4">
                  <p className="text-xs text-cyan-600 font-medium uppercase">Grade</p>
                  <p className="font-bold text-gray-800 mt-1">{formData.grade}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs text-green-600 font-medium uppercase">Subject</p>
                  <p className="font-bold text-gray-800 mt-1">{formData.subject}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs text-orange-600 font-medium uppercase">Chapter</p>
                  <p className="font-bold text-gray-800 mt-1">{formData.chapterTitle || 'All'}</p>
                </div>
              </div>

              {/* Keywords Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seed Keywords <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.seedKeywords}
                  onChange={(e) => setFormData({ ...formData, seedKeywords: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="e.g., photosynthesis, chlorophyll, sunlight"
                />
                <p className="text-xs text-gray-500 mt-1">Enter comma-separated keywords related to the topic</p>
              </div>

              {/* Number of Questions */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions
                </label>
                <select
                  value={formData.numQuestions}
                  onChange={(e) => setFormData({ ...formData, numQuestions: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="5">5 questions</option>
                  <option value="10">10 questions</option>
                  <option value="15">15 questions</option>
                  <option value="20">20 questions</option>
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Worksheet Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder={`${formData.subject} - ${formData.chapterTitle || formData.grade}`}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={goBack}
                className="px-6 py-3 text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !formData.seedKeywords.trim()}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 text-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </span>
                ) : (
                  '✨ Generate Worksheet'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Preview */}
        {step === 6 && previewData && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Preview Your Worksheet</h2>
            <p className="text-gray-500 mb-6">Here's how your worksheet will look. Download or regenerate!</p>
            
            {/* Preview Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 overflow-hidden mb-6">
              {/* Preview Header */}
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 text-white">
                <h3 className="text-xl font-bold">{previewData.title}</h3>
                <p className="text-blue-100 text-sm">
                  {previewData.metadata?.board} • {previewData.metadata?.grade} • {previewData.metadata?.subject}
                  {previewData.metadata?.chapter && ` • ${previewData.metadata?.chapter}`}
                </p>
              </div>
              
              {/* Preview Content */}
              <div className="p-6 bg-gray-50">
                <div className="bg-white rounded-xl shadow-inner p-6 min-h-[400px]">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">🏫</div>
                    <p className="text-sm text-gray-400">School Logo</p>
                  </div>
                  
                  <h4 className="text-lg font-bold text-gray-800 text-center mb-4">
                    {previewData.content?.title || previewData.title}
                  </h4>
                  
                  {previewData.content?.instructions && (
                    <div className="bg-yellow-50 rounded-lg p-3 mb-4 border-l-4 border-yellow-400">
                      <p className="text-sm text-gray-700">
                        <strong>Instructions:</strong> {previewData.content.instructions}
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {previewData.content?.questions?.slice(0, 5).map((question, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="text-gray-700">
                          {question.question || `Question ${i + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 text-center text-sm text-gray-400">
                    ... and {Math.max(0, (previewData.content?.questions?.length || 0) - 5)} more questions in the full PDF
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata */}
            {previewData.metadata && (
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-700">
                  <strong>Generated from:</strong> {previewData.metadata.chunksUsed || 0} content chunks
                  {previewData.metadata.seedKeywords && (
                    <span> • Keywords: {previewData.metadata.seedKeywords.join(', ')}</span>
                  )}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={goBack}
                className="px-6 py-3 text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back & Change
              </button>
              
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="px-6 py-3 bg-white border-2 border-blue-500 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {loading ? 'Regenerating...' : '🔄 Regenerate'}
              </button>
              
              <button
                onClick={handleDownloadPDF}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-green-200 hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-lg"
              >
                📄 Download PDF
              </button>
            </div>

            {/* Microsoft Forms Export */}
            <div className="mt-4">
              <button
                onClick={handleExportToMicrosoftForms}
                disabled={exportLoading}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {exportLoading ? 'Preparing...' : '📋 Export to Microsoft Forms'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Microsoft Forms Export Modal */}
      {showFormsModal && formsExportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Export to Microsoft Forms</h2>
                <button
                  onClick={() => setShowFormsModal(false)}
                  className="text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-blue-100 mt-1">Convert your worksheet to an online quiz</p>
            </div>

            <div className="p-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button
                  onClick={openMicrosoftForms}
                  className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <div className="text-3xl mb-2">🔗</div>
                  <div className="font-semibold text-blue-700">Open Microsoft Forms</div>
                  <div className="text-sm text-gray-500">Create a new quiz</div>
                </button>

                <button
                  onClick={handleDownloadCSV}
                  className="p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <div className="text-3xl mb-2">📊</div>
                  <div className="font-semibold text-green-700">Download CSV</div>
                  <div className="text-sm text-gray-500">Import into Forms</div>
                </button>

                <button
                  onClick={handleCopyToClipboard}
                  className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl hover:bg-purple-100 transition-colors"
                >
                  <div className="text-3xl mb-2">📋</div>
                  <div className="font-semibold text-purple-700">Copy to Clipboard</div>
                  <div className="text-sm text-gray-500">Quick copy-paste</div>
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">How to use:</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>Click <strong>"Open Microsoft Forms"</strong> to go to Forms</li>
                  <li>Click <strong>"New Quiz"</strong> to create a quiz</li>
                  <li>Use the <strong>CSV file</strong> or <strong>copied text</strong> as reference</li>
                  <li>Add each question manually with correct answers</li>
                </ol>
              </div>

              {/* Preview */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                  Questions Preview ({formsExportData.formsData?.questions?.length || 0} questions)
                </div>
                <div className="p-4 max-h-60 overflow-y-auto">
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono">
                    {formsExportData.copyPasteText}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumWorksheetWizard;
