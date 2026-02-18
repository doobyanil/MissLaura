/**
 * Microsoft Forms Integration Service
 * 
 * This service provides functionality to export worksheets to Microsoft Forms.
 * Since Microsoft Forms doesn't have a public API for creating forms directly,
 * we provide multiple export options:
 * 
 * 1. Microsoft Forms URL with pre-filled structure (for manual creation)
 * 2. Excel/CSV export that can be imported into Forms
 * 3. Copy-paste formatted text for quick manual entry
 */

/**
 * Convert worksheet content to Microsoft Forms format
 * @param {Object} worksheet - Worksheet data from database
 * @returns {Object} - Microsoft Forms compatible data
 */
function convertToMicrosoftForms(worksheet) {
  const { title, content, skill, grade, curriculum } = worksheet;
  
  // Parse content if it's a string
  let parsedContent = content;
  if (typeof content === 'string') {
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse worksheet content:', e);
      parsedContent = {};
    }
  }
  
  const questions = parsedContent.items || parsedContent.questions || [];

  const formsData = {
    title: title || `${skill} - ${grade}`,
    description: parsedContent.instructions || `Worksheet for ${curriculum} curriculum`,
    questions: questions.map((q, index) => convertQuestionToForms(q, index)),
    settings: {
      isQuiz: true,
      showResultsAutomatically: true,
      shuffleQuestions: false,
      oneResponsePerPerson: true
    }
  };

  return formsData;
}

/**
 * Convert a single question to Microsoft Forms format
 * @param {Object} question - Question object
 * @param {number} index - Question index
 * @returns {Object} - Microsoft Forms question format
 */
function convertQuestionToForms(question, index) {
  const questionText = question.question || question.q || question.display || question.problem || `Question ${index + 1}`;
  const correctAnswer = question.answer || question.a || question.correctAnswer || '';
  const options = question.options || question.choices || [];

  // Determine question type
  let formsQuestionType = 'text'; // Default to text input
  let choices = [];

  if (options && options.length > 0) {
    formsQuestionType = 'choice'; // Multiple choice
    choices = options.map(opt => ({
      text: opt,
      isCorrect: opt === correctAnswer
    }));
    
    // If no correct answer marked, mark the first one
    if (!choices.some(c => c.isCorrect) && correctAnswer) {
      choices = options.map(opt => ({
        text: opt,
        isCorrect: opt.toLowerCase() === correctAnswer.toLowerCase()
      }));
    }
  } else if (correctAnswer) {
    // Text input with correct answer for quiz
    formsQuestionType = 'text';
  }

  return {
    id: `q_${index + 1}`,
    title: questionText,
    type: formsQuestionType,
    required: true,
    choices: choices,
    correctAnswer: formsQuestionType === 'text' ? correctAnswer : null,
    points: 1,
    feedback: {
      correct: 'Correct! Well done!',
      incorrect: `Incorrect. The correct answer is: ${correctAnswer}`
    }
  };
}

/**
 * Generate Microsoft Forms creation URL
 * Opens Microsoft Forms with a new form ready to create
 * @param {Object} worksheet - Worksheet data
 * @returns {string} - Microsoft Forms URL
 */
function generateFormsCreationUrl(worksheet) {
  // Microsoft Forms base URL for creating new forms
  const baseUrl = 'https://forms.office.com/Pages/DesignPage.aspx';
  
  // Note: Microsoft Forms doesn't support pre-filling via URL parameters
  // This URL opens a new form for manual creation
  return baseUrl;
}

/**
 * Generate Excel-compatible data for Microsoft Forms import
 * @param {Object} worksheet - Worksheet data
 * @returns {string} - CSV formatted string
 */
function generateExcelImportData(worksheet) {
  const formsData = convertToMicrosoftForms(worksheet);
  
  // CSV format for Excel
  // Headers
  const headers = ['Question Number', 'Question Text', 'Question Type', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Points'];
  
  // Rows
  const rows = formsData.questions.map((q, index) => {
    const options = q.choices || [];
    const correctAnswer = q.correctAnswer || 
      (options.find(c => c.isCorrect)?.text) || '';
    
    return [
      index + 1,
      `"${q.title.replace(/"/g, '""')}"`, // Escape quotes
      q.type,
      options[0]?.text || '',
      options[1]?.text || '',
      options[2]?.text || '',
      options[3]?.text || '',
      correctAnswer,
      q.points
    ];
  });

  // Combine into CSV
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csv;
}

/**
 * Generate copy-paste friendly format for manual entry
 * @param {Object} worksheet - Worksheet data
 * @returns {string} - Formatted text for copy-paste
 */
function generateCopyPasteFormat(worksheet) {
  const formsData = convertToMicrosoftForms(worksheet);
  
  let text = `📋 ${formsData.title}\n`;
  text += `${'─'.repeat(50)}\n\n`;
  text += `📝 ${formsData.description}\n\n`;
  text += `${'─'.repeat(50)}\n\n`;

  formsData.questions.forEach((q, index) => {
    text += `Question ${index + 1}: ${q.title}\n`;
    
    if (q.type === 'choice' && q.choices.length > 0) {
      q.choices.forEach((choice, i) => {
        const letter = String.fromCharCode(65 + i); // A, B, C, D
        const marker = choice.isCorrect ? '✓' : ' ';
        text += `  ${letter}) ${choice.text} ${marker}\n`;
      });
    } else {
      text += `  Answer: ${q.correctAnswer || '(Open-ended)'}\n`;
    }
    
    text += '\n';
  });

  text += `${'─'.repeat(50)}\n`;
  text += `Total Questions: ${formsData.questions.length}\n`;
  text += `Total Points: ${formsData.questions.reduce((sum, q) => sum + q.points, 0)}\n`;

  return text;
}

/**
 * Generate Microsoft Forms deep link for quiz creation
 * This creates a link that opens Microsoft Forms quiz editor
 * @param {Object} worksheet - Worksheet data
 * @returns {Object} - Object containing various export formats
 */
function generateExportFormats(worksheet) {
  return {
    formsData: convertToMicrosoftForms(worksheet),
    formsUrl: generateFormsCreationUrl(worksheet),
    csvData: generateExcelImportData(worksheet),
    copyPasteText: generateCopyPasteFormat(worksheet),
    instructions: {
      method1: {
        title: 'Create Manually in Microsoft Forms',
        steps: [
          'Click "Open Microsoft Forms" button below',
          'Click "New Quiz" to create a new quiz',
          'Copy questions from the preview and paste into Forms',
          'Set correct answers for each question'
        ]
      },
      method2: {
        title: 'Import from Excel',
        steps: [
          'Download the Excel/CSV file',
          'Open Microsoft Forms and create a new quiz',
          'Use the Excel file as reference to enter questions',
          'Set correct answers for each question'
        ]
      },
      method3: {
        title: 'Quick Copy-Paste',
        steps: [
          'Click "Copy to Clipboard" button',
          'Open Microsoft Forms and create a new quiz',
          'Paste the content and format as needed'
        ]
      }
    }
  };
}

/**
 * Generate Microsoft Forms JSON for API integration
 * This format can be used with Microsoft Graph API if configured
 * @param {Object} worksheet - Worksheet data
 * @returns {Object} - Microsoft Graph API compatible format
 */
function generateGraphApiFormat(worksheet) {
  const formsData = convertToMicrosoftForms(worksheet);
  
  return {
    displayName: formsData.title,
    description: formsData.description,
    settings: {
      isQuiz: true,
      calculationMode: 'manual',
      isAcceptingResponses: true
    },
    questions: formsData.questions.map((q, index) => ({
      id: q.id,
      title: q.title,
      type: q.type === 'choice' ? 'multipleChoice' : 'text',
      required: q.required,
      choices: q.choices?.map(c => c.text) || [],
      correctAnswer: q.correctAnswer || (q.choices?.find(c => c.isCorrect)?.text) || ''
    }))
  };
}

module.exports = {
  convertToMicrosoftForms,
  generateFormsCreationUrl,
  generateExcelImportData,
  generateCopyPasteFormat,
  generateExportFormats,
  generateGraphApiFormat
};
