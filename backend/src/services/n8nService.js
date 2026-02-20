// n8n Webhook configuration
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://your-n8n-instance.com/webhook/worksheet-generate';
const N8N_API_KEY = process.env.N8N_API_KEY || 'your-api-key';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Import AI usage service for quota checking and logging
const aiUsageService = require('./aiUsageService');

/**
 * Generate worksheet content using n8n AI service
 * @param {Object} params - Worksheet parameters
 * @param {string} params.curriculum - Curriculum type (INDIAN, IB, MONTESSORI)
 * @param {string} params.grade - Grade level
 * @param {string} params.ageGroup - Age group
 * @param {string} params.skill - Skill/topic
 * @param {string} params.theme - Optional theme
 * @param {number} params.questionCount - Number of questions to generate
 * @param {string} params.schoolId - School ID for quota tracking
 * @param {string} params.userId - User ID for quota tracking
 * @param {string} params.requestId - Optional request ID for correlation
 * @returns {Promise<Object>} - Generated worksheet content
 */
async function generateWorksheetContent(params) {
  const { 
    curriculum, 
    grade, 
    ageGroup, 
    skill, 
    theme, 
    questionCount = 8,
    schoolId,
    userId,
    requestId
  } = params;

  // ============================================
  // QUOTA ENFORCEMENT - Check before calling AI
  // ============================================
  if (schoolId) {
    try {
      const quota = await aiUsageService.checkQuota(schoolId);
      
      if (quota.exceeded) {
        console.error(`[n8n] AI quota exceeded for school ${schoolId}`);
        throw new Error('AI_QUOTA_EXCEEDED: Your AI usage quota has been exceeded for this billing period. Please upgrade your plan or wait for the next billing cycle.');
      }

      // Log warning if approaching limit
      if (quota.warning) {
        console.warn(`[n8n] Quota warning for school ${schoolId}: ${quota.percentage}% used`);
      }
    } catch (error) {
      // If it's our quota error, re-throw it
      if (error.message.startsWith('AI_QUOTA_EXCEEDED')) {
        throw error;
      }
      // For other errors, log but continue (don't block on quota check failure)
      console.error('[n8n] Quota check failed:', error.message);
    }
  }

  // Generate unique request ID if not provided
  const trackingId = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const payload = {
    curriculum,
    grade,
    ageGroup,
    skill,
    theme: theme || 'general',
    questionCount,
    // Include tracking data for usage logging
    schoolId,
    userId,
    requestId: trackingId,
    timestamp: new Date().toISOString()
  };

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[n8n] Attempt ${attempt}: Generating worksheet for ${skill} - ${grade}`);
      console.log(`[n8n] Webhook URL: ${N8N_WEBHOOK_URL}`);
      console.log(`[n8n] Payload:`, JSON.stringify(payload, null, 2));

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': N8N_API_KEY
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      console.log(`[n8n] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[n8n] Error response body:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const content = await response.json();
      console.log(`[n8n] Response content:`, JSON.stringify(content, null, 2));

      // Validate response
      if (!validateWorksheetContent(content)) {
        throw new Error('Invalid worksheet content received from n8n');
      }

      // Normalize content to standard format
      const normalizedContent = normalizeContent(content);
      console.log('[n8n] Normalized content:', JSON.stringify(normalizedContent, null, 2));

      console.log('[n8n] Successfully generated worksheet content');
      
      // Note: Usage logging is now handled by n8n calling back to /api/ai-usage/log
      // This ensures accurate token counts from the actual AI response
      
      return normalizedContent;

    } catch (error) {
      lastError = error;
      console.error(`[n8n] Attempt ${attempt} failed:`, error.message);

      if (attempt < MAX_RETRIES) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  }

  // All retries failed, use fallback
  console.error('[n8n] All attempts failed, using fallback content');
  
  // Log fallback usage (no AI tokens used, but track the request)
  if (schoolId) {
    await aiUsageService.logAiUsage({
      schoolId,
      userId,
      feature: 'worksheet_generation',
      model: 'fallback',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      requestId: trackingId,
      source: 'db_fallback',
      metadata: { reason: 'n8n_unavailable', error: lastError?.message }
    });
  }
  
  return generateFallbackContent(params);
}

/**
 * Find questions array in any response structure
 * @param {Object} content - Response content
 * @returns {Array|null} - Questions array or null
 */
function findQuestionsArray(content) {
  if (!content || typeof content !== 'object') return null;
  
  // Direct array properties
  if (Array.isArray(content.questions)) return content.questions;
  if (Array.isArray(content.items)) return content.items;
  
  // Check nested content property
  if (content.content) {
    if (Array.isArray(content.content.questions)) return content.content.questions;
    if (Array.isArray(content.content.items)) return content.content.items;
    // content might be the array itself
    if (Array.isArray(content.content)) return content.content;
  }
  
  // Check for any array property that looks like questions
  for (const key of Object.keys(content)) {
    const value = content[key];
    if (Array.isArray(value) && value.length > 0) {
      const firstItem = value[0];
      // Check if items have question-like properties
      if (firstItem && (firstItem.q || firstItem.question || firstItem.display)) {
        console.log(`[n8n] Found questions array in property: "${key}"`);
        return value;
      }
    }
  }
  
  // Recursively search in nested objects
  for (const key of Object.keys(content)) {
    if (typeof content[key] === 'object' && !Array.isArray(content[key])) {
      const found = findQuestionsArray(content[key]);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Validate worksheet content structure
 * @param {Object} content - Content to validate
 * @returns {boolean} - Whether content is valid
 */
function validateWorksheetContent(content) {
  if (!content) return false;

  console.log('[n8n] Validating content structure...');
  console.log('[n8n] Content keys:', Object.keys(content));

  // Find questions array anywhere in the response
  const items = findQuestionsArray(content);
  
  if (!items) {
    console.error('[n8n] Validation failed: No questions array found in response');
    console.error('[n8n] Full response:', JSON.stringify(content, null, 2));
    return false;
  }
  
  if (items.length === 0) {
    console.error('[n8n] Validation failed: Questions array is empty');
    return false;
  }

  // Validate each item has at least some content
  // Accept multiple formats: question/q, answer/a, display, problem
  for (const item of items) {
    const hasQuestion = item.question || item.q || item.display || item.problem;
    if (!hasQuestion) {
      console.error('[n8n] Validation failed: Item missing question field:', item);
      return false;
    }
  }

  console.log(`[n8n] Validation passed: Found ${items.length} questions`);
  return true;
}

/**
 * Normalize worksheet content to standard format
 * @param {Object} content - Raw content from n8n
 * @returns {Object} - Normalized content
 */
function normalizeContent(content) {
  // Find questions array anywhere in the response
  const rawItems = findQuestionsArray(content) || [];
  
  // Extract title and instructions from various locations
  const data = content.success && content.content ? content.content : content;
  const title = content.title || data.title || (data.content && data.content.title) || 'Worksheet';
  const instructions = content.instructions || data.instructions || (data.content && data.content.instructions) || 'Complete the questions below.';
  
  // Normalize items to standard format
  const items = rawItems.map((item, index) => ({
    question: item.question || item.q || item.display || item.problem || `Question ${index + 1}`,
    answer: item.answer || item.a || item.correctAnswer || '',
    options: item.options || item.choices || [],
    type: item.type || 'question',
    imageUrl: item.imageUrl || item.image || null
  }));

  return {
    title,
    instructions,
    items,
    footer: content.footer || data.footer || ''
  };
}

/**
 * Generate fallback content when n8n is unavailable
 * @param {Object} params - Worksheet parameters
 * @returns {Object} - Fallback worksheet content
 */
function generateFallbackContent(params) {
  const { skill, grade, theme } = params;

  // Simple fallback templates
  const templates = {
    'Counting': {
      title: 'Count the Objects',
      instructions: 'Count the objects and write the number.',
      items: generateCountingItems(8, grade, theme),
      type: 'counting'
    },
    'Addition': {
      title: 'Addition Practice',
      instructions: 'Solve the addition problems.',
      items: generateMathItems(12, 'addition', grade),
      type: 'addition'
    },
    'Subtraction': {
      title: 'Subtraction Practice',
      instructions: 'Solve the subtraction problems.',
      items: generateMathItems(12, 'subtraction', grade),
      type: 'subtraction'
    },
    'Letter Recognition': {
      title: 'Letter Recognition',
      instructions: 'Identify the letters and words.',
      items: generateLetterItems(6),
      type: 'letterRecognition'
    },
    'default': {
      title: `${skill} Practice`,
      instructions: 'Complete the exercises below.',
      items: Array(8).fill(null).map((_, i) => ({
        question: `Question ${i + 1}`,
        answer: ''
      })),
      type: 'default'
    }
  };

  return templates[skill] || templates.default;
}

// Helper functions for fallback content
function generateCountingItems(count, grade, theme) {
  const maxNum = grade.includes('Preschool') ? 10 : grade.includes('KG') ? 20 : 50;
  const emojis = ['🍎', '🌟', '🎈', '🐱', '🌸', '🚗', '⚽', '📚'];
  
  return Array(count).fill(null).map((_, i) => {
    const num = Math.floor(Math.random() * maxNum) + 1;
    const emoji = emojis[i % emojis.length];
    return {
      display: Array(num).fill(emoji).join('  '),
      answer: num,
      count: num
    };
  });
}

function generateMathItems(count, operation, grade) {
  const maxNum = grade.includes('Preschool') ? 10 : grade.includes('KG') ? 20 : 50;
  
  return Array(count).fill(null).map(() => {
    const a = Math.floor(Math.random() * maxNum) + 1;
    const b = Math.floor(Math.random() * (operation === 'subtraction' ? a : maxNum)) + 1;
    return {
      a,
      b,
      answer: operation === 'addition' ? a + b : a - b,
      problem: `${a} ${operation === 'addition' ? '+' : '-'} ${b}`
    };
  });
}

function generateLetterItems(count) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  return Array(count).fill(null).map(() => {
    const letter = letters[Math.floor(Math.random() * letters.length)];
    return {
      letter,
      words: getWordsForLetter(letter, 4)
    };
  });
}

function getWordsForLetter(letter, count) {
  const wordLists = {
    A: ['Apple', 'Ant', 'Airplane', 'Alligator'],
    B: ['Ball', 'Bat', 'Bear', 'Boat'],
    C: ['Cat', 'Car', 'Cake', 'Cup'],
    D: ['Dog', 'Duck', 'Door', 'Drum'],
    E: ['Elephant', 'Egg', 'Eye', 'Ear'],
    F: ['Fish', 'Fan', 'Frog', 'Flower'],
    G: ['Goat', 'Grapes', 'Girl', 'Gate'],
    H: ['Hat', 'Horse', 'House', 'Hand'],
    I: ['Ice cream', 'Igloo', 'Insect', 'Island'],
    J: ['Jam', 'Jug', 'Jet', 'Jellyfish'],
    K: ['Kite', 'Key', 'King', 'Kangaroo'],
    L: ['Lion', 'Leaf', 'Lamp', 'Lemon'],
    M: ['Moon', 'Man', 'Mango', 'Mouse'],
    N: ['Nest', 'Nose', 'Nut', 'Nail'],
    O: ['Orange', 'Owl', 'Ocean', 'One'],
    P: ['Pen', 'Pig', 'Pot', 'Pan'],
    Q: ['Queen', 'Question', 'Quilt', 'Quail'],
    R: ['Rat', 'Rose', 'Ring', 'Rabbit'],
    S: ['Sun', 'Star', 'Ship', 'Snake'],
    T: ['Tree', 'Tiger', 'Toy', 'Train'],
    U: ['Umbrella', 'Up', 'Uncle', 'Under'],
    V: ['Van', 'Violin', 'Vase', 'Vegetable'],
    W: ['Watch', 'Water', 'Whale', 'Window'],
    X: ['Xylophone', 'X-ray', 'Fox', 'Box'],
    Y: ['Yak', 'Yarn', 'Yellow', 'Yogurt'],
    Z: ['Zebra', 'Zoo', 'Zip', 'Zero']
  };
  
  return (wordLists[letter] || ['Word1', 'Word2', 'Word3', 'Word4']).slice(0, count);
}

/**
 * Test n8n connection
 * @returns {Promise<boolean>} - Whether connection is successful
 */
async function testConnection() {
  try {
    const response = await fetch(N8N_WEBHOOK_URL.replace('/worksheet-generate', '/health'), {
      method: 'GET',
      headers: {
        'X-API-Key': N8N_API_KEY
      },
      signal: AbortSignal.timeout(5000)
    });
    return response.status === 200;
  } catch (error) {
    console.error('[n8n] Connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  generateWorksheetContent,
  generateCurriculumWorksheet,
  validateWorksheetContent,
  normalizeContent,
  testConnection
};

/**
 * Generate curriculum-grounded worksheet content using n8n AI service
 * This function uses textbook content chunks to generate syllabus-aligned worksheets
 * @param {Object} params - Worksheet parameters
 * @param {string} params.board - Board name (CBSE, ICSE, etc.)
 * @param {string} params.grade - Grade level
 * @param {string} params.subject - Subject (Math, Science, etc.)
 * @param {string} params.chapter - Chapter title (optional)
 * @param {string[]} params.seedKeywords - Keywords for content retrieval
 * @param {number} params.numQuestions - Number of questions to generate
 * @param {Object[]} params.chunks - Retrieved content chunks
 * @returns {Promise<Object>} - Generated worksheet content
 */
async function generateCurriculumWorksheet(params) {
  const { 
    board, 
    grade, 
    subject, 
    chapter, 
    seedKeywords, 
    numQuestions = 10,
    chunks 
  } = params;

  if (!chunks || chunks.length === 0) {
    console.error('[n8n] No content chunks provided for curriculum worksheet');
    return generateFallbackCurriculumContent(params);
  }

  // Combine chunks into context
  const contextText = chunks
    .map(c => c.text)
    .join('\n\n---\n\n')
    .substring(0, 8000); // Limit context size

  const payload = {
    type: 'curriculum-grounded',
    board,
    grade,
    subject,
    chapter: chapter || 'General',
    seedKeywords,
    numQuestions,
    context: contextText,
    timestamp: new Date().toISOString()
  };

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[n8n] Attempt ${attempt}: Generating curriculum worksheet for ${board} - ${grade} - ${subject}`);
      console.log(`[n8n] Chapter: ${chapter || 'N/A'}`);
      console.log(`[n8n] Keywords: ${seedKeywords.join(', ')}`);
      console.log(`[n8n] Context length: ${contextText.length} characters`);

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': N8N_API_KEY
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000) // 60 second timeout for larger context
      });

      console.log(`[n8n] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[n8n] Error response body:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const content = await response.json();
      console.log(`[n8n] Response content received`);

      // Validate response
      if (!validateWorksheetContent(content)) {
        throw new Error('Invalid worksheet content received from n8n');
      }

      // Normalize content to standard format
      const normalizedContent = normalizeContent(content);
      
      // Add metadata about the source
      normalizedContent.metadata = {
        board,
        grade,
        subject,
        chapter,
        seedKeywords,
        chunksUsed: chunks.length,
        generatedAt: new Date().toISOString()
      };

      console.log('[n8n] Successfully generated curriculum worksheet content');
      return normalizedContent;

    } catch (error) {
      lastError = error;
      console.error(`[n8n] Attempt ${attempt} failed:`, error.message);

      if (attempt < MAX_RETRIES) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  }

  // All retries failed, use fallback
  console.error('[n8n] All attempts failed, using fallback content');
  return generateFallbackCurriculumContent(params);
}

/**
 * Generate fallback curriculum worksheet content when n8n is unavailable
 * @param {Object} params - Worksheet parameters
 * @returns {Object} - Fallback worksheet content
 */
function generateFallbackCurriculumContent(params) {
  const { board, grade, subject, chapter, seedKeywords, numQuestions = 10, chunks } = params;
  
  // Create questions based on the keywords and available context
  const questions = [];
  const questionTypes = ['multiple-choice', 'fill-blank', 'short-answer', 'true-false'];
  
  for (let i = 0; i < numQuestions; i++) {
    const type = questionTypes[i % questionTypes.length];
    const keyword = seedKeywords[i % seedKeywords.length];
    
    let question;
    switch (type) {
      case 'multiple-choice':
        question = {
          type: 'multiple-choice',
          question: `Which of the following best describes ${keyword}?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: `This question is about ${keyword}.`
        };
        break;
      case 'fill-blank':
        question = {
          type: 'fill-blank',
          question: `Complete the following: The concept of ${keyword} is important because _______.`,
          answer: keyword,
          explanation: `This tests understanding of ${keyword}.`
        };
        break;
      case 'short-answer':
        question = {
          type: 'short-answer',
          question: `Explain the significance of ${keyword} in ${subject}.`,
          answer: `A brief explanation about ${keyword}.`,
          explanation: `This question assesses knowledge of ${keyword}.`
        };
        break;
      case 'true-false':
        question = {
          type: 'true-false',
          question: `${keyword} is an important concept in ${subject}.`,
          correctAnswer: true,
          explanation: `This statement is about ${keyword}.`
        };
        break;
    }
    
    questions.push({
      id: i + 1,
      ...question,
      difficulty: 'medium',
      topic: chapter || subject,
      keywords: [keyword]
    });
  }
  
  return {
    title: `${subject} - ${chapter || 'Worksheet'}`,
    description: `Practice questions for ${board} ${grade} ${subject}`,
    questions,
    metadata: {
      board,
      grade,
      subject,
      chapter,
      seedKeywords,
      chunksUsed: chunks ? chunks.length : 0,
      generatedAt: new Date().toISOString(),
      isFallback: true
    }
  };
}
