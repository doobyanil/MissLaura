// n8n Webhook configuration
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://your-n8n-instance.com/webhook/worksheet-generate';
const N8N_API_KEY = process.env.N8N_API_KEY || 'your-api-key';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Generate worksheet content using n8n AI service
 * @param {Object} params - Worksheet parameters
 * @param {string} params.curriculum - Curriculum type (INDIAN, IB, MONTESSORI)
 * @param {string} params.grade - Grade level
 * @param {string} params.ageGroup - Age group
 * @param {string} params.skill - Skill/topic
 * @param {string} params.theme - Optional theme
 * @param {number} params.questionCount - Number of questions to generate
 * @returns {Promise<Object>} - Generated worksheet content
 */
async function generateWorksheetContent(params) {
  const { curriculum, grade, ageGroup, skill, theme, questionCount = 8 } = params;

  const payload = {
    curriculum,
    grade,
    ageGroup,
    skill,
    theme: theme || 'general',
    questionCount,
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
  validateWorksheetContent,
  normalizeContent,
  testConnection
};
