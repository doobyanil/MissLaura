import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const WorksheetView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worksheet, setWorksheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFormsModal, setShowFormsModal] = useState(false);
  const [formsExportData, setFormsExportData] = useState(null);

  useEffect(() => {
    fetchWorksheet();
  }, [id]);

  const fetchWorksheet = async () => {
    try {
      const response = await axios.get(`/worksheets/${id}`);
      console.log('Worksheet response:', response.data);
      setWorksheet(response.data.worksheet || response.data);
    } catch (error) {
      console.error('Failed to load worksheet:', error);
      toast.error('Failed to load worksheet');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`/worksheets/${id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${worksheet.title.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded!');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const handleExportToMicrosoftForms = async () => {
    try {
      const response = await axios.get(`/worksheets/${id}/microsoft-forms`);
      console.log('Microsoft Forms export:', response.data);
      setFormsExportData(response.data.data);
      setShowFormsModal(true);
    } catch (error) {
      console.error('Failed to export to Microsoft Forms:', error);
      toast.error('Failed to export to Microsoft Forms');
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const response = await axios.get(`/worksheets/${id}/microsoft-forms/csv`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${worksheet.title.replace(/\s+/g, '_')}_microsoft_forms.csv`);
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

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this worksheet?')) return;
    
    try {
      await axios.delete(`/worksheets/${id}`);
      toast.success('Worksheet deleted');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to delete worksheet');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading worksheet...</p>
        </div>
      </div>
    );
  }

  if (!worksheet) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Worksheet not found</p>
        <Link to="/dashboard" className="text-purple-600 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  // Parse content if it's a string
  let content = worksheet.content || {};
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse content:', e);
    }
  }
  const items = content.items || content.questions || [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/dashboard" className="text-purple-600 hover:text-purple-700 font-medium">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Worksheet Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Title Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">{worksheet.title}</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full">{worksheet.curriculum}</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">{worksheet.grade}</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">{worksheet.skill}</span>
            {worksheet.theme && (
              <span className="bg-white/20 px-3 py-1 rounded-full">{worksheet.theme}</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Instructions */}
          {content.instructions && (
            <div className="bg-yellow-50 rounded-lg p-4 mb-6 border-l-4 border-yellow-400">
              <p className="text-gray-700">
                <strong>Instructions:</strong> {content.instructions}
              </p>
            </div>
          )}

          {/* Questions */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Questions ({items.length})</h2>
            {items.map((item, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium">
                      {item.question || item.q || item.display || item.problem}
                    </p>
                    
                    {/* Options */}
                    {item.options && item.options.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.options.map((opt, i) => (
                          <span 
                            key={i}
                            className={`px-3 py-1 rounded-full text-sm ${
                              item.correctAnswer === opt || item.a === opt
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}) {opt}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Answer */}
                    {(item.answer || item.a) && !item.options && (
                      <p className="mt-2 text-sm text-green-600">
                        <strong>Answer:</strong> {item.answer || item.a}
                      </p>
                    )}

                    {/* Display for counting */}
                    {item.display && !item.question && !item.q && (
                      <p className="text-2xl mt-2 tracking-widest">{item.display}</p>
                    )}

                    {/* Math problem */}
                    {item.problem && (
                      <p className="text-xl mt-2 font-mono">{item.problem} = ?</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Metadata */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-sm text-gray-500">
            <p>Created: {worksheet.createdAt ? new Date(worksheet.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'N/A'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadPDF}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              📄 Download PDF
            </button>
            
            <button
              onClick={handleExportToMicrosoftForms}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              📋 Export to Microsoft Forms
            </button>

            <button
              onClick={handleDelete}
              className="px-6 py-3 bg-red-100 text-red-600 font-semibold rounded-xl hover:bg-red-200 transition-colors"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      {/* Microsoft Forms Modal */}
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
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button
                  onClick={() => window.open('https://forms.office.com/Pages/DesignPage.aspx', '_blank')}
                  className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <div className="text-3xl mb-2">🔗</div>
                  <div className="font-semibold text-blue-700">Open Microsoft Forms</div>
                </button>

                <button
                  onClick={handleDownloadCSV}
                  className="p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <div className="text-3xl mb-2">📊</div>
                  <div className="font-semibold text-green-700">Download CSV</div>
                </button>

                <button
                  onClick={handleCopyToClipboard}
                  className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl hover:bg-purple-100 transition-colors"
                >
                  <div className="text-3xl mb-2">📋</div>
                  <div className="font-semibold text-purple-700">Copy to Clipboard</div>
                </button>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                  Questions Preview
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

export default WorksheetView;
