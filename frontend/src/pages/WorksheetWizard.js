import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const WorksheetWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState({});
  const [themes, setThemes] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [formData, setFormData] = useState({
    curriculum: '',
    grade: '',
    ageGroup: '',
    skill: '',
    theme: '',
    title: ''
  });

  const curricula = [
    { value: 'INDIAN', label: 'Indian Curriculum', description: 'CBSE, ICSE, State Boards', icon: 'flag' },
    { value: 'IB', label: 'International Baccalaureate', description: 'IB Primary Years Programme', icon: 'globe' },
    { value: 'MONTESSORI', label: 'Montessori', description: 'Montessori Method', icon: 'puzzle' }
  ];

  const grades = {
    INDIAN: [
      { value: 'Preschool', label: 'Preschool', ageGroup: '3-4 years', description: 'Nursery' },
      { value: 'LKG', label: 'LKG', ageGroup: '4-5 years', description: 'Lower Kindergarten' },
      { value: 'UKG', label: 'UKG', ageGroup: '5-6 years', description: 'Upper Kindergarten' },
      { value: 'Grade 1', label: 'Grade 1', ageGroup: '6-7 years', description: 'Class 1' },
      { value: 'Grade 2', label: 'Grade 2', ageGroup: '7-8 years', description: 'Class 2' },
      { value: 'Grade 3', label: 'Grade 3', ageGroup: '8-9 years', description: 'Class 3' },
      { value: 'Grade 4', label: 'Grade 4', ageGroup: '9-10 years', description: 'Class 4' },
      { value: 'Grade 5', label: 'Grade 5', ageGroup: '10-11 years', description: 'Class 5' }
    ],
    IB: [
      { value: 'Early Years 1', label: 'Early Years 1', ageGroup: '3-4 years', description: 'PYP Early Years' },
      { value: 'Early Years 2', label: 'Early Years 2', ageGroup: '4-5 years', description: 'PYP Early Years' },
      { value: 'Early Years 3', label: 'Early Years 3', ageGroup: '5-6 years', description: 'PYP Early Years' },
      { value: 'PYP Grade 1', label: 'PYP Grade 1', ageGroup: '6-7 years', description: 'Primary Years' },
      { value: 'PYP Grade 2', label: 'PYP Grade 2', ageGroup: '7-8 years', description: 'Primary Years' },
      { value: 'PYP Grade 3', label: 'PYP Grade 3', ageGroup: '8-9 years', description: 'Primary Years' },
      { value: 'PYP Grade 4', label: 'PYP Grade 4', ageGroup: '9-10 years', description: 'Primary Years' },
      { value: 'PYP Grade 5', label: 'PYP Grade 5', ageGroup: '10-11 years', description: 'Primary Years' }
    ],
    MONTESSORI: [
      { value: 'Primary 1', label: 'Primary Level 1', ageGroup: '2.5-3 years', description: 'Casa dei Bambini' },
      { value: 'Primary 2', label: 'Primary Level 2', ageGroup: '3-4 years', description: 'Casa dei Bambini' },
      { value: 'Primary 3', label: 'Primary Level 3', ageGroup: '4-5 years', description: 'Casa dei Bambini' },
      { value: 'Primary 4', label: 'Primary Level 4', ageGroup: '5-6 years', description: 'Casa dei Bambini' },
      { value: 'Elementary 1', label: 'Elementary 1', ageGroup: '6-9 years', description: 'Lower Elementary' },
      { value: 'Elementary 2', label: 'Elementary 2', ageGroup: '9-12 years', description: 'Upper Elementary' }
    ]
  };

  const defaultSkills = {
    'INDIAN-Preschool': [
      { name: 'Alphabet Recognition', description: 'Identify uppercase and lowercase letters' },
      { name: 'Number Recognition', description: 'Recognize numbers 1-10' },
      { name: 'Colors', description: 'Identify and name basic colors' },
      { name: 'Shapes', description: 'Recognize basic shapes' },
      { name: 'Tracing', description: 'Trace lines, curves, and shapes' },
      { name: 'Coloring', description: 'Color within boundaries' }
    ],
    'INDIAN-LKG': [
      { name: 'Phonics', description: 'Letter sounds and beginning sounds' },
      { name: 'Counting 1-20', description: 'Count objects up to 20' },
      { name: 'Letter Tracing', description: 'Trace uppercase and lowercase letters' },
      { name: 'Simple Patterns', description: 'Complete AB, AAB patterns' },
      { name: 'Matching', description: 'Match similar objects' }
    ],
    'INDIAN-UKG': [
      { name: 'CVC Words', description: 'Read and write CVC words' },
      { name: 'Addition', description: 'Add numbers within 10' },
      { name: 'Sight Words', description: 'Recognize common sight words' },
      { name: 'Number Names', description: 'Write number names 1-20' },
      { name: 'Patterns', description: 'Identify and extend patterns' }
    ],
    'INDIAN-Grade 1': [
      { name: 'Addition', description: 'Add numbers within 20' },
      { name: 'Subtraction', description: 'Subtract numbers within 20' },
      { name: 'Sentences', description: 'Build simple sentences' },
      { name: 'Number Patterns', description: 'Skip counting, number sequences' },
      { name: 'Word Problems', description: 'Simple math word problems' }
    ],
    'INDIAN-Grade 2': [
      { name: 'Addition', description: 'Add numbers within 100' },
      { name: 'Subtraction', description: 'Subtract numbers within 100' },
      { name: 'Multiplication Tables', description: 'Learn 2, 5, 10 times tables' },
      { name: 'Grammar', description: 'Nouns, verbs, adjectives' },
      { name: 'Money', description: 'Identify and count money' }
    ],
    'IB-Early Years 1': [
      { name: 'Letter Recognition', description: 'Identify letters of the alphabet' },
      { name: 'Number Sense', description: 'Count and recognize numbers 1-10' },
      { name: 'Colors', description: 'Identify and explore colors' },
      { name: 'Shapes', description: 'Explore 2D shapes' },
      { name: 'Fine Motor', description: 'Tracing and coloring activities' }
    ],
    'IB-Early Years 2': [
      { name: 'Phonics', description: 'Letter sounds and blending' },
      { name: 'Counting', description: 'Count objects up to 20' },
      { name: 'Patterns', description: 'Create and extend patterns' },
      { name: 'Sorting', description: 'Sort by color, size, shape' },
      { name: 'Pre-writing', description: 'Letter formation practice' }
    ],
    'MONTESSORI-Primary 1': [
      { name: 'Practical Life', description: 'Pouring, spooning, transferring' },
      { name: 'Sensorial', description: 'Color tablets, geometric solids' },
      { name: 'Language', description: 'Sandpaper letters' },
      { name: 'Math', description: 'Number rods, sandpaper numbers' }
    ],
    'MONTESSORI-Primary 2': [
      { name: 'Moveable Alphabet', description: 'Build words with letters' },
      { name: 'Golden Beads', description: 'Introduction to decimal system' },
      { name: 'Metal Insets', description: 'Pre-writing shapes' },
      { name: 'Sorting', description: 'Classify objects by attributes' }
    ]
  };

  const defaultThemes = [
    { name: 'Animals', icon: '🐶', description: 'Pets, farm animals, wild animals' },
    { name: 'Fruits', icon: '🍎', description: 'Fresh fruits and vegetables' },
    { name: 'Transport', icon: '🚗', description: 'Cars, trucks, planes, boats' },
    { name: 'Space', icon: '🚀', description: 'Stars, planets, astronauts' },
    { name: 'Nature', icon: '🌳', description: 'Trees, flowers, weather' },
    { name: 'Festivals', icon: '🎉', description: 'Celebrations and holidays' },
    { name: 'Ocean', icon: '🐠', description: 'Sea creatures and underwater' },
    { name: 'Sports', icon: '⚽', description: 'Games and physical activities' },
    { name: 'Food', icon: '🍕', description: 'Healthy foods and treats' },
    { name: 'Colors', icon: '🌈', description: 'Rainbow and color themes' }
  ];

  useEffect(() => {
    fetchSkills();
    fetchThemes();
  }, []);

  const fetchSkills = async () => {
    try {
      const response = await axios.get('/skills');
      if (response.data.skills && Object.keys(response.data.skills).length > 0) {
        setSkills(response.data.skills);
      } else {
        setSkills(defaultSkills);
      }
    } catch (error) {
      console.error('Failed to fetch skills, using defaults:', error);
      setSkills(defaultSkills);
    }
  };

  const fetchThemes = async () => {
    try {
      const response = await axios.get('/themes');
      if (response.data.themes && response.data.themes.length > 0) {
        setThemes(response.data.themes);
      } else {
        setThemes(defaultThemes);
      }
    } catch (error) {
      console.error('Failed to fetch themes, using defaults:', error);
      setThemes(defaultThemes);
    }
  };

  const handleCurriculumSelect = (curriculum) => {
    setFormData({ ...formData, curriculum, grade: '', skill: '' });
    setStep(2);
  };

  const handleGradeSelect = (grade, ageGroup) => {
    setFormData({ ...formData, grade, ageGroup, skill: '' });
    setStep(3);
  };

  const handleSkillSelect = (skill) => {
    setFormData({ ...formData, skill });
    setStep(4);
  };

  const handleThemeSelect = (theme) => {
    setFormData({ ...formData, theme });
    setStep(5);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/worksheets', {
        ...formData,
        title: formData.title || `${formData.skill} - ${formData.grade}`
      });
      
      setPreviewData(response.data.worksheet);
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
      const response = await axios.post('/worksheets', {
        ...formData,
        title: formData.title || `${formData.skill} - ${formData.grade}`
      });
      
      setPreviewData(response.data.worksheet);
      toast.success('New version generated!');
    } catch (error) {
      toast.error('Failed to regenerate worksheet');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`/worksheets/${previewData.id}/pdf`, {
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

  const getAvailableSkills = () => {
    const key = `${formData.curriculum}-${formData.grade}`;
    return skills[key] || [];
  };

  const goBack = () => {
    setStep(step - 1);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-800">
          Create Worksheet
        </h1>
        <p className="text-gray-500 mt-1">
          Generate a beautiful worksheet in just a few clicks
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 max-w-4xl">
        {[
          { num: 1, label: 'Curriculum' },
          { num: 2, label: 'Grade' },
          { num: 3, label: 'Skill' },
          { num: 4, label: 'Theme' },
          { num: 5, label: 'Details' },
          { num: 6, label: 'Preview' }
        ].map((s, index) => (
          <div key={s.num} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
              step > s.num ? 'bg-green-500 text-white' :
              step === s.num ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200' :
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
        {/* Step 1: Curriculum */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Choose Your Curriculum</h2>
            <p className="text-gray-500 mb-6">This determines the style and approach of the worksheet</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {curricula.map((c) => (
                <button
                  key={c.value}
                  onClick={() => handleCurriculumSelect(c.value)}
                  className="p-6 bg-white rounded-2xl shadow-lg shadow-gray-100 border-2 border-transparent hover:border-purple-400 hover:shadow-xl transition-all text-left group"
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                    {c.icon === 'flag' && '🇮🇳'}
                    {c.icon === 'globe' && '🌍'}
                    {c.icon === 'puzzle' && '🧩'}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{c.label}</h3>
                  <p className="text-sm text-gray-500">{c.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Grade */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Select Grade / Age Group</h2>
            <p className="text-gray-500 mb-6">This controls the difficulty level and font size</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {grades[formData.curriculum]?.map((g) => (
                <button
                  key={g.value}
                  onClick={() => handleGradeSelect(g.value, g.ageGroup)}
                  className="p-5 bg-white rounded-xl shadow-lg shadow-gray-100 border-2 border-transparent hover:border-purple-400 hover:shadow-xl transition-all text-left"
                >
                  <h3 className="font-bold text-gray-800 text-lg">{g.label}</h3>
                  <p className="text-sm text-purple-600 font-medium">{g.ageGroup}</p>
                  <p className="text-xs text-gray-400 mt-1">{g.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={goBack}
              className="mt-6 text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
            >
              ← Back to Curriculum
            </button>
          </div>
        )}

        {/* Step 3: Skill */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Choose a Skill / Topic</h2>
            <p className="text-gray-500 mb-6">What should the worksheet focus on?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getAvailableSkills().length > 0 ? (
                getAvailableSkills().map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSkillSelect(s.name)}
                    className="p-5 bg-white rounded-xl shadow-lg shadow-gray-100 border-2 border-transparent hover:border-purple-400 hover:shadow-xl transition-all text-left"
                  >
                    <h3 className="font-bold text-gray-800">{s.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                  </button>
                ))
              ) : (
                <div className="col-span-3 text-center py-8 bg-white rounded-xl">
                  <p className="text-gray-500">No skills available for this combination. Please go back and select a different grade.</p>
                </div>
              )}
            </div>
            <button
              onClick={goBack}
              className="mt-6 text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
            >
              ← Back to Grade
            </button>
          </div>
        )}

        {/* Step 4: Theme */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Choose a Theme (Optional)</h2>
            <p className="text-gray-500 mb-6">Make the worksheet more engaging with a fun theme!</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <button
                onClick={() => handleThemeSelect('')}
                className="p-4 bg-white rounded-xl shadow-lg shadow-gray-100 border-2 border-transparent hover:border-purple-400 transition-all text-center"
              >
                <span className="text-3xl block mb-2">🎨</span>
                <p className="text-sm font-medium text-gray-600">No Theme</p>
              </button>
              {(themes.length > 0 ? themes : defaultThemes).map((t, i) => (
                <button
                  key={i}
                  onClick={() => handleThemeSelect(t.name)}
                  className="p-4 bg-white rounded-xl shadow-lg shadow-gray-100 border-2 border-transparent hover:border-purple-400 transition-all text-center"
                >
                  <span className="text-3xl block mb-2">{t.icon || '🎨'}</span>
                  <p className="text-sm font-medium text-gray-600">{t.name}</p>
                </button>
              ))}
            </div>
            <button
              onClick={goBack}
              className="mt-6 text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
            >
              ← Back to Skill
            </button>
          </div>
        )}

        {/* Step 5: Details & Generate */}
        {step === 5 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Review & Generate</h2>
            <p className="text-gray-500 mb-6">Check your selections and click generate!</p>
            
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-100 p-6 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-xs text-purple-600 font-medium uppercase">Curriculum</p>
                  <p className="font-bold text-gray-800 mt-1">{formData.curriculum}</p>
                </div>
                <div className="bg-pink-50 rounded-xl p-4">
                  <p className="text-xs text-pink-600 font-medium uppercase">Grade</p>
                  <p className="font-bold text-gray-800 mt-1">{formData.grade}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs text-green-600 font-medium uppercase">Age Group</p>
                  <p className="font-bold text-gray-800 mt-1">{formData.ageGroup}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs text-orange-600 font-medium uppercase">Skill</p>
                  <p className="font-bold text-gray-800 mt-1">{formData.skill}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 col-span-2 md:col-span-2">
                  <p className="text-xs text-blue-600 font-medium uppercase">Theme</p>
                  <p className="font-bold text-gray-800 mt-1">{formData.theme || 'None'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Worksheet Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                  placeholder={`${formData.skill} - ${formData.grade}`}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={goBack}
                className="px-6 py-3 text-purple-600 hover:text-purple-700 font-medium"
              >
                ← Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 text-lg"
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
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                <h3 className="text-xl font-bold">{previewData.title}</h3>
                <p className="text-purple-100 text-sm">{previewData.curriculum} • {previewData.grade} • {previewData.skill}</p>
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
                    {previewData.content?.items?.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="text-gray-700">
                          {item.question || item.display || `Question ${i + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 text-center text-sm text-gray-400">
                    ... and more questions in the full PDF
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={goBack}
                className="px-6 py-3 text-purple-600 hover:text-purple-700 font-medium"
              >
                ← Back & Change
              </button>
              
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="px-6 py-3 bg-white border-2 border-purple-500 text-purple-600 font-semibold rounded-xl hover:bg-purple-50 transition-colors disabled:opacity-50"
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
          </div>
        )}
      </div>
    </div>
  );
};

export default WorksheetWizard;