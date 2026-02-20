const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const n8nService = require('../services/n8nService');
const microsoftFormsService = require('../services/microsoftFormsService');

// Usage limits per plan
const PLAN_LIMITS = {
  FREE: 10,      // 10 worksheets per month
  PREMIUM: 100,  // 100 worksheets per month
  ENTERPRISE: -1 // Unlimited
};

// Check if n8n is enabled
const USE_N8N = process.env.USE_N8N === 'true';

// Worksheet templates based on skill and curriculum
const worksheetTemplates = {
  counting: { generate: (params) => generateCountingWorksheet(params) },
  numberrecognition: { generate: (params) => generateNumberRecognitionWorksheet(params) },
  letterrecognition: { generate: (params) => generateLetterWorksheet(params) },
  phonics: { generate: (params) => generatePhonicsWorksheet(params) },
  addition: { generate: (params) => generateAdditionWorksheet(params) },
  subtraction: { generate: (params) => generateSubtractionWorksheet(params) },
  multiplication: { generate: (params) => generateMultiplicationWorksheet(params) },
  coloring: { generate: (params) => generateColoringWorksheet(params) },
  tracing: { generate: (params) => generateTracingWorksheet(params) },
  matching: { generate: (params) => generateMatchingWorksheet(params) },
  patterns: { generate: (params) => generatePatternsWorksheet(params) },
  shapes: { generate: (params) => generateShapesWorksheet(params) },
  colors: { generate: (params) => generateColorsWorksheet(params) },
  sentences: { generate: (params) => generateSentencesWorksheet(params) },
  sightwords: { generate: (params) => generateSightWordsWorksheet(params) },
  cvcwords: { generate: (params) => generateCVCWordsWorksheet(params) },
  wordproblems: { generate: (params) => generateWordProblemsWorksheet(params) },
  money: { generate: (params) => generateMoneyWorksheet(params) },
  grammar: { generate: (params) => generateGrammarWorksheet(params) }
};

// Check usage limit
const checkUsageLimit = async (schoolId) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      _count: { select: { worksheets: true } }
    }
  });

  const limit = PLAN_LIMITS[school.plan];
  
  // Get worksheets created this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const worksheetsThisMonth = await prisma.worksheet.count({
    where: {
      schoolId,
      createdAt: { gte: startOfMonth }
    }
  });

  if (limit !== -1 && worksheetsThisMonth >= limit) {
    return { allowed: false, current: worksheetsThisMonth, limit };
  }

  return { allowed: true, current: worksheetsThisMonth, limit };
};

// Helper function to generate worksheet content
function generateWorksheetContent(skill, curriculum, grade, theme) {
  const normalizedSkill = skill.toLowerCase().replace(/\s+/g, '').replace(/[/]/g, '');
  const template = worksheetTemplates[normalizedSkill];
  
  if (template) {
    return template.generate({ curriculum, grade, theme });
  }
  
  // Default template
  return generateDefaultWorksheet({ skill, curriculum, grade, theme });
}

// Generate counting worksheet
function generateCountingWorksheet({ curriculum, grade, theme }) {
  const maxNumber = grade.includes('Preschool') || grade.includes('Primary 1') ? 10 : 
                    grade.includes('KG') || grade.includes('Early Years') ? 20 : 50;
  const items = [];
  const themeItems = getThemeItems(theme || 'animals');
  
  for (let i = 0; i < 8; i++) {
    const count = Math.floor(Math.random() * maxNumber) + 1;
    const item = themeItems[Math.floor(Math.random() * themeItems.length)];
    items.push({ 
      count, 
      item, 
      display: Array(count).fill(getItemEmoji(item)).join('  '),
      answer: count
    });
  }
  
  return {
    title: 'Count the Objects',
    instructions: 'Count the objects and write the number in the box.',
    items,
    type: 'counting'
  };
}

// Generate number recognition worksheet
function generateNumberRecognitionWorksheet({ curriculum, grade, theme }) {
  const items = [];
  const numbers = grade.includes('Preschool') ? 10 : grade.includes('KG') ? 20 : 50;
  
  for (let i = 0; i < 8; i++) {
    const targetNumber = Math.floor(Math.random() * numbers) + 1;
    const options = [targetNumber];
    while (options.length < 4) {
      const opt = Math.floor(Math.random() * numbers) + 1;
      if (!options.includes(opt)) options.push(opt);
    }
    items.push({
      target: targetNumber,
      options: options.sort(() => Math.random() - 0.5),
      display: Array(targetNumber).fill('⭐').join(' ')
    });
  }
  
  return {
    title: 'Number Recognition',
    instructions: 'Find and circle the correct number.',
    items,
    type: 'numberRecognition'
  };
}

// Generate letter recognition worksheet
function generateLetterWorksheet({ curriculum, grade, theme }) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const selectedLetters = [];
  
  for (let i = 0; i < 6; i++) {
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const words = getWordsStartingWith(letter, 4);
    selectedLetters.push({ letter, words });
  }
  
  return {
    title: 'Letter Recognition',
    instructions: 'Circle all the words that start with the given letter.',
    items: selectedLetters,
    type: 'letterRecognition'
  };
}

// Generate phonics worksheet
function generatePhonicsWorksheet({ curriculum, grade, theme }) {
  const sounds = [
    { sound: 'a', words: ['cat', 'bat', 'hat', 'rat', 'mat'] },
    { sound: 'e', words: ['pen', 'hen', 'ten', 'men', 'den'] },
    { sound: 'i', words: ['pig', 'dig', 'big', 'wig', 'fig'] },
    { sound: 'o', words: ['dog', 'log', 'fog', 'hog', 'jog'] },
    { sound: 'u', words: ['bug', 'hug', 'mug', 'rug', 'tug'] }
  ];
  
  const items = sounds.slice(0, 5).map(s => ({
    sound: s.sound.toUpperCase(),
    words: s.words.sort(() => Math.random() - 0.5).slice(0, 4)
  }));
  
  return {
    title: 'Phonics Practice',
    instructions: 'Say the sound and circle the pictures that start with that sound.',
    items,
    type: 'phonics'
  };
}

// Generate addition worksheet
function generateAdditionWorksheet({ curriculum, grade, theme }) {
  const maxSum = grade.includes('Preschool') || grade.includes('Primary 1') ? 10 : 
                 grade.includes('KG') || grade.includes('Early Years') ? 20 : 100;
  const problems = [];
  
  for (let i = 0; i < 12; i++) {
    const a = Math.floor(Math.random() * maxSum);
    const b = Math.floor(Math.random() * (maxSum - a));
    problems.push({ a, b, answer: a + b });
  }
  
  return {
    title: 'Addition Practice',
    instructions: 'Solve the addition problems.',
    items: problems,
    type: 'addition'
  };
}

// Generate subtraction worksheet
function generateSubtractionWorksheet({ curriculum, grade, theme }) {
  const maxNum = grade.includes('Preschool') || grade.includes('Primary 1') ? 10 : 
                 grade.includes('KG') || grade.includes('Early Years') ? 20 : 50;
  const problems = [];
  
  for (let i = 0; i < 12; i++) {
    const a = Math.floor(Math.random() * maxNum) + 1;
    const b = Math.floor(Math.random() * a);
    problems.push({ a, b, answer: a - b });
  }
  
  return {
    title: 'Subtraction Practice',
    instructions: 'Solve the subtraction problems.',
    items: problems,
    type: 'subtraction'
  };
}

// Generate multiplication worksheet
function generateMultiplicationWorksheet({ curriculum, grade, theme }) {
  const problems = [];
  const tables = [2, 3, 4, 5, 10];
  
  for (let i = 0; i < 12; i++) {
    const a = tables[Math.floor(Math.random() * tables.length)];
    const b = Math.floor(Math.random() * 12) + 1;
    problems.push({ a, b, answer: a * b });
  }
  
  return {
    title: 'Multiplication Practice',
    instructions: 'Solve the multiplication problems.',
    items: problems,
    type: 'multiplication'
  };
}

// Generate coloring worksheet
function generateColoringWorksheet({ curriculum, grade, theme }) {
  const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple'];
  const themeItems = getThemeItems(theme || 'animals');
  
  const items = colors.map((color, i) => ({
    color,
    colorCode: getColorCode(color),
    item: themeItems[i % themeItems.length],
    instruction: `Color the ${themeItems[i % themeItems.length]} ${color.toLowerCase()}`
  }));
  
  return {
    title: 'Coloring Fun',
    instructions: 'Color each picture with the correct color.',
    items,
    type: 'coloring'
  };
}

// Generate tracing worksheet
function generateTracingWorksheet({ curriculum, grade, theme }) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const selectedLetters = letters.slice(0, 6);
  
  return {
    title: 'Letter Tracing',
    instructions: 'Trace the letters below.',
    items: selectedLetters.map(letter => ({
      letter,
      uppercase: letter,
      lowercase: letter.toLowerCase()
    })),
    type: 'tracing'
  };
}

// Generate matching worksheet
function generateMatchingWorksheet({ curriculum, grade, theme }) {
  const themeItems = getThemeItems(theme || 'animals');
  const pairs = [];
  
  for (let i = 0; i < 6; i++) {
    const item = themeItems[i % themeItems.length];
    pairs.push({
      left: getItemEmoji(item),
      right: item,
      hint: `Match: ${item}`
    });
  }
  
  const shuffledRight = [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5);
  pairs.forEach((p, i) => p.right = shuffledRight[i]);
  
  return {
    title: 'Matching Game',
    instructions: 'Draw a line to match the items.',
    items: pairs,
    type: 'matching'
  };
}

// Generate patterns worksheet
function generatePatternsWorksheet({ curriculum, grade, theme }) {
  const themeItems = getThemeItems(theme || 'shapes');
  const patterns = [];
  
  for (let i = 0; i < 6; i++) {
    const item1 = themeItems[Math.floor(Math.random() * themeItems.length)];
    const item2 = themeItems[Math.floor(Math.random() * themeItems.length)];
    const sequence = [
      getItemEmoji(item1), 
      getItemEmoji(item2), 
      getItemEmoji(item1), 
      getItemEmoji(item2), 
      getItemEmoji(item1), 
      '?'
    ];
    patterns.push({
      sequence,
      answer: getItemEmoji(item2),
      pattern: 'AB'
    });
  }
  
  return {
    title: 'Complete the Pattern',
    instructions: 'What comes next? Fill in the missing item.',
    items: patterns,
    type: 'patterns'
  };
}

// Generate shapes worksheet
function generateShapesWorksheet({ curriculum, grade, theme }) {
  const shapes = [
    { name: 'Circle', emoji: '⭕' },
    { name: 'Square', emoji: '⬜' },
    { name: 'Triangle', emoji: '🔺' },
    { name: 'Rectangle', emoji: '🟦' },
    { name: 'Star', emoji: '⭐' },
    { name: 'Heart', emoji: '❤️' }
  ];
  
  return {
    title: 'Shape Recognition',
    instructions: 'Identify and color the shapes.',
    items: shapes,
    type: 'shapes'
  };
}

// Generate colors worksheet
function generateColorsWorksheet({ curriculum, grade, theme }) {
  const colors = [
    { name: 'Red', emoji: '🔴' },
    { name: 'Blue', emoji: '🔵' },
    { name: 'Green', emoji: '🟢' },
    { name: 'Yellow', emoji: '🟡' },
    { name: 'Orange', emoji: '🟠' },
    { name: 'Purple', emoji: '🟣' }
  ];
  
  return {
    title: 'Color Recognition',
    instructions: 'Say the name of each color.',
    items: colors,
    type: 'colors'
  };
}

// Generate sentences worksheet
function generateSentencesWorksheet({ curriculum, grade, theme }) {
  const sentences = [
    { words: ['The', 'cat', 'sat', 'on', 'the', 'mat.'], sentence: 'The cat sat on the mat.' },
    { words: ['I', 'like', 'to', 'play', 'games.'], sentence: 'I like to play games.' },
    { words: ['She', 'has', 'a', 'red', 'ball.'], sentence: 'She has a red ball.' },
    { words: ['We', 'go', 'to', 'school', 'today.'], sentence: 'We go to school today.' },
    { words: ['The', 'dog', 'runs', 'fast.'], sentence: 'The dog runs fast.' }
  ];
  
  return {
    title: 'Build a Sentence',
    instructions: 'Arrange the words to make a sentence.',
    items: sentences.map(s => ({ ...s, shuffled: s.words.sort(() => Math.random() - 0.5) })),
    type: 'sentences'
  };
}

// Generate sight words worksheet
function generateSightWordsWorksheet({ curriculum, grade, theme }) {
  const sightWords = ['the', 'and', 'is', 'it', 'you', 'that', 'was', 'for', 'on', 'are', 'with', 'as'];
  
  return {
    title: 'Sight Words Practice',
    instructions: 'Read and trace each sight word.',
    items: sightWords.slice(0, 8).map(word => ({ word, uppercase: word.toUpperCase() })),
    type: 'sightWords'
  };
}

// Generate CVC words worksheet
function generateCVCWordsWorksheet({ curriculum, grade, theme }) {
  const cvcWords = [
    { word: 'cat', letters: ['c', 'a', 't'], picture: '🐱' },
    { word: 'dog', letters: ['d', 'o', 'g'], picture: '🐕' },
    { word: 'pig', letters: ['p', 'i', 'g'], picture: '🐷' },
    { word: 'hen', letters: ['h', 'e', 'n'], picture: '🐔' },
    { word: 'fox', letters: ['f', 'o', 'x'], picture: '🦊' },
    { word: 'bug', letters: ['b', 'u', 'g'], picture: '🐛' }
  ];
  
  return {
    title: 'CVC Words',
    instructions: 'Sound out and write the word for each picture.',
    items: cvcWords,
    type: 'cvcWords'
  };
}

// Generate word problems worksheet
function generateWordProblemsWorksheet({ curriculum, grade, theme }) {
  const problems = [
    { problem: 'Tom has 3 apples. He buys 2 more. How many apples does he have?', answer: 5 },
    { problem: 'There are 5 birds on a tree. 2 fly away. How many are left?', answer: 3 },
    { problem: 'Mary has 4 pencils. Her friend gives her 3 more. How many pencils now?', answer: 7 },
    { problem: 'There are 8 cookies. Sam eats 3. How many are left?', answer: 5 }
  ];
  
  return {
    title: 'Word Problems',
    instructions: 'Read and solve each problem.',
    items: problems,
    type: 'wordProblems'
  };
}

// Generate money worksheet
function generateMoneyWorksheet({ curriculum, grade, theme }) {
  const items = [
    { coins: '1 rupee + 1 rupee = ?', answer: '2 rupees' },
    { coins: '5 rupees + 2 rupees = ?', answer: '7 rupees' },
    { coins: '10 rupees - 3 rupees = ?', answer: '7 rupees' },
    { coins: '2 rupees + 2 rupees + 1 rupee = ?', answer: '5 rupees' }
  ];
  
  return {
    title: 'Money Math',
    instructions: 'Count the money and write the total.',
    items,
    type: 'money'
  };
}

// Generate grammar worksheet
function generateGrammarWorksheet({ curriculum, grade, theme }) {
  const items = [
    { sentence: 'The ___ is running.', options: ['dog', 'dogs'], answer: 'dog', type: 'noun' },
    { sentence: 'She ___ to school.', options: ['walk', 'walks'], answer: 'walks', type: 'verb' },
    { sentence: 'The ___ ball is red.', options: ['big', 'bigs'], answer: 'big', type: 'adjective' },
    { sentence: 'They ___ playing.', options: ['is', 'are'], answer: 'are', type: 'verb' }
  ];
  
  return {
    title: 'Grammar Practice',
    instructions: 'Choose the correct word.',
    items,
    type: 'grammar'
  };
}

// Default worksheet generator
function generateDefaultWorksheet({ skill, curriculum, grade, theme }) {
  return {
    title: `${skill} Practice`,
    instructions: 'Complete the exercises below.',
    items: [
      { question: 'Question 1', answer: '' },
      { question: 'Question 2', answer: '' },
      { question: 'Question 3', answer: '' }
    ],
    type: 'default'
  };
}

// Helper functions
function getThemeItems(theme) {
  const themes = {
    animals: ['Dog', 'Cat', 'Bird', 'Fish', 'Bear', 'Lion', 'Elephant', 'Rabbit'],
    fruits: ['Apple', 'Banana', 'Orange', 'Grape', 'Mango', 'Strawberry', 'Watermelon', 'Cherry'],
    shapes: ['Circle', 'Square', 'Triangle', 'Rectangle', 'Star', 'Heart', 'Oval', 'Diamond'],
    nature: ['Tree', 'Flower', 'Sun', 'Moon', 'Cloud', 'Rainbow', 'Mountain', 'River'],
    transport: ['Car', 'Bus', 'Train', 'Airplane', 'Boat', 'Bicycle', 'Truck', 'Motorcycle'],
    space: ['Star', 'Planet', 'Rocket', 'Moon', 'Astronaut', 'Comet', 'Galaxy', 'Satellite'],
    ocean: ['Fish', 'Dolphin', 'Whale', 'Shark', 'Octopus', 'Crab', 'Seahorse', 'Jellyfish'],
    sports: ['Ball', 'Bat', 'Goal', 'Net', 'Racket', 'Hoop', 'Helmet', 'Glove'],
    food: ['Pizza', 'Burger', 'Sandwich', 'Salad', 'Soup', 'Rice', 'Bread', 'Cake'],
    festivals: ['Lamp', 'Gift', 'Balloon', 'Cake', 'Candle', 'Star', 'Bell', 'Tree']
  };
  
  return themes[theme.toLowerCase()] || themes.animals;
}

function getItemEmoji(item) {
  const emojiMap = {
    'Dog': '🐕', 'Cat': '🐱', 'Bird': '🐦', 'Fish': '🐟', 'Bear': '🐻', 'Lion': '🦁',
    'Elephant': '🐘', 'Rabbit': '🐰', 'Apple': '🍎', 'Banana': '🍌', 'Orange': '🍊',
    'Grape': '🍇', 'Mango': '🥭', 'Strawberry': '🍓', 'Watermelon': '🍉', 'Cherry': '🍒',
    'Circle': '⭕', 'Square': '⬜', 'Triangle': '🔺', 'Rectangle': '🟦', 'Star': '⭐',
    'Heart': '❤️', 'Oval': '🔵', 'Diamond': '💎', 'Tree': '🌳', 'Flower': '🌸',
    'Sun': '☀️', 'Moon': '🌙', 'Cloud': '☁️', 'Rainbow': '🌈', 'Mountain': '⛰️',
    'River': '🏞️', 'Car': '🚗', 'Bus': '🚌', 'Train': '🚂', 'Airplane': '✈️',
    'Boat': '⛵', 'Bicycle': '🚲', 'Truck': '🚛', 'Motorcycle': '🏍️', 'Planet': '🪐',
    'Rocket': '🚀', 'Astronaut': '👨‍🚀', 'Comet': '☄️', 'Galaxy': '🌌', 'Satellite': '🛰️',
    'Dolphin': '🐬', 'Whale': '🐋', 'Shark': '🦈', 'Octopus': '🐙', 'Crab': '🦀',
    'Seahorse': ' Seahorse', 'Jellyfish': '🪼', 'Ball': '⚽', 'Bat': '🏏', 'Goal': '🥅',
    'Pizza': '🍕', 'Burger': '🍔', 'Sandwich': '🥪', 'Salad': '🥗', 'Soup': '🍲',
    'Rice': '🍚', 'Bread': '🍞', 'Cake': '🎂', 'Lamp': '🪔', 'Gift': '🎁',
    'Balloon': '🎈', 'Candle': '🕯️', 'Bell': '🔔'
  };
  return emojiMap[item] || '⭐';
}

function getWordsStartingWith(letter, count) {
  const wordLists = {
    A: ['Apple', 'Ant', 'Airplane', 'Alligator', 'Angel', 'Arrow'],
    B: ['Ball', 'Bat', 'Bear', 'Boat', 'Book', 'Bird'],
    C: ['Cat', 'Car', 'Cake', 'Cup', 'Cow', 'Cloud'],
    D: ['Dog', 'Duck', 'Door', 'Drum', 'Doll', 'Dolphin'],
    E: ['Elephant', 'Egg', 'Eye', 'Ear', 'Eagle', 'Eight'],
    F: ['Fish', 'Fan', 'Frog', 'Flower', 'Fox', 'Four'],
    G: ['Goat', 'Grapes', 'Girl', 'Gate', 'Guitar', 'Gift'],
    H: ['Hat', 'Horse', 'House', 'Hand', 'Heart', 'Hen'],
    I: ['Ice cream', 'Igloo', 'Insect', 'Island', 'Iron', 'Ivy'],
    J: ['Jam', 'Jug', 'Jet', 'Jellyfish', 'Jacket', 'Jungle'],
    K: ['Kite', 'Key', 'King', 'Kangaroo', 'Kitchen', 'Kitten'],
    L: ['Lion', 'Leaf', 'Lamp', 'Lemon', 'Leg', 'Lake'],
    M: ['Moon', 'Man', 'Mango', 'Mouse', 'Milk', 'Monkey'],
    N: ['Nest', 'Nose', 'Nut', 'Nail', 'Night', 'Nine'],
    O: ['Orange', 'Owl', 'Ocean', 'One', 'Ostrich', 'Onion'],
    P: ['Pen', 'Pig', 'Pot', 'Pan', 'Parrot', 'Penguin'],
    Q: ['Queen', 'Question', 'Quilt', 'Quail', 'Quarter', 'Quiet'],
    R: ['Rat', 'Rose', 'Ring', 'Rabbit', 'Rain', 'Rainbow'],
    S: ['Sun', 'Star', 'Ship', 'Snake', 'Swan', 'Shoe'],
    T: ['Tree', 'Tiger', 'Toy', 'Train', 'Table', 'Turtle'],
    U: ['Umbrella', 'Up', 'Uncle', 'Under', 'Unicorn', 'Uniform'],
    V: ['Van', 'Violin', 'Vase', 'Vegetable', 'Village', 'Violet'],
    W: ['Watch', 'Water', 'Whale', 'Window', 'Wolf', 'Wheel'],
    X: ['Xylophone', 'X-ray', 'Fox', 'Box', 'Six', 'Mix'],
    Y: ['Yak', 'Yarn', 'Yellow', 'Yogurt', 'Yacht', 'Year'],
    Z: ['Zebra', 'Zoo', 'Zip', 'Zero', 'Zucchini', 'Zone']
  };
  
  const words = wordLists[letter] || ['Word1', 'Word2', 'Word3', 'Word4'];
  return words.slice(0, count);
}

function getColorCode(color) {
  const colors = {
    'Red': '#FF0000',
    'Blue': '#0000FF',
    'Green': '#00FF00',
    'Yellow': '#FFFF00',
    'Orange': '#FFA500',
    'Purple': '#800080'
  };
  return colors[color] || '#000000';
}

// Create worksheet
const createWorksheet = async (req, res, next) => {
  try {
    const { title, curriculum, grade, ageGroup, skill, theme } = req.body;

    // Check usage limit
    const usageCheck = await checkUsageLimit(req.user.schoolId);
    if (!usageCheck.allowed) {
      return res.status(403).json({
        message: 'You have reached your monthly worksheet limit. Please upgrade your plan.',
        limitReached: true,
        current: usageCheck.current,
        limit: usageCheck.limit
      });
    }

    // Generate worksheet content - use n8n if enabled, otherwise use local templates
    let content;
    if (USE_N8N) {
      console.log('[Worksheet] Using n8n AI service for content generation');
      content = await n8nService.generateWorksheetContent({
        curriculum,
        grade,
        ageGroup,
        skill,
        theme,
        questionCount: 8
      });
    } else {
      console.log('[Worksheet] Using local templates for content generation');
      content = generateWorksheetContent(skill, curriculum, grade, theme);
    }

    const worksheet = await prisma.worksheet.create({
      data: {
        title: title || `${skill} - ${grade}`,
        curriculum,
        grade,
        ageGroup,
        skill,
        theme,
        content,
        schoolId: req.user.schoolId,
        createdById: req.user.id
      },
      include: {
        school: { select: { name: true, logo: true, plan: true } }
      }
    });

    res.status(201).json({
      message: 'Worksheet created successfully',
      worksheet,
      usage: { current: usageCheck.current + 1, limit: usageCheck.limit }
    });
  } catch (error) {
    next(error);
  }
};

// Get all worksheets
const getWorksheets = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, curriculum, grade, skill, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { schoolId: req.user.schoolId };

    if (curriculum) where.curriculum = curriculum;
    if (grade) where.grade = { contains: grade, mode: 'insensitive' };
    if (skill) where.skill = { contains: skill, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { skill: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [worksheets, total] = await Promise.all([
      prisma.worksheet.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.worksheet.count({ where })
    ]);

    res.json({
      worksheets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single worksheet
const getWorksheet = async (req, res, next) => {
  try {
    const { id } = req.params;

    const worksheet = await prisma.worksheet.findFirst({
      where: { id, schoolId: req.user.schoolId },
      include: {
        createdBy: { select: { id: true, name: true } },
        school: { select: { id: true, name: true, logo: true } }
      }
    });

    if (!worksheet) {
      return next(new AppError('Worksheet not found', 404));
    }

    res.json({ worksheet });
  } catch (error) {
    next(error);
  }
};

// Delete worksheet
const deleteWorksheet = async (req, res, next) => {
  try {
    const { id } = req.params;

    const worksheet = await prisma.worksheet.findFirst({
      where: { id, schoolId: req.user.schoolId }
    });

    if (!worksheet) {
      return next(new AppError('Worksheet not found', 404));
    }

    await prisma.worksheet.delete({ where: { id } });

    res.json({ message: 'Worksheet deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Generate PDF
const generatePDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { showAnswers = false } = req.query;

    const worksheet = await prisma.worksheet.findFirst({
      where: { id, schoolId: req.user.schoolId },
      include: { school: true }
    });

    if (!worksheet) {
      return next(new AppError('Worksheet not found', 404));
    }

    const html = generateWorksheetHTML(worksheet, showAnswers === 'true');

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${worksheet.title.replace(/\s+/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// Generate HTML for worksheet PDF
function generateWorksheetHTML(worksheet, showAnswers) {
  const school = worksheet.school;
  const logoUrl = school.logo ? `${process.env.BACKEND_URL}${school.logo}` : null;
  const isFreePlan = school.plan === 'FREE';

  let itemsHTML = '';

  // Check if this is a curriculum worksheet (has questions array instead of type)
  const isCurriculumWorksheet = worksheet.content.questions && Array.isArray(worksheet.content.questions);

  if (isCurriculumWorksheet) {
    // Handle curriculum worksheets with questions array
    itemsHTML = worksheet.content.questions.map((item, i) => {
      let questionHTML = `
        <div class="curriculum-question">
          <div class="question-number">${i + 1}.</div>
          <div class="question-content">
            <div class="question-text">${item.question}</div>`;
      
      // Handle different question types
      if (item.type === 'multiple-choice' && item.options) {
        questionHTML += `
            <div class="options-list">
              ${item.options.map((opt, oi) => `
                <div class="option">
                  <span class="option-letter">${String.fromCharCode(65 + oi)}.</span>
                  <span class="option-text">${opt}</span>
                </div>
              `).join('')}
            </div>`;
      } else if (item.type === 'true-false') {
        questionHTML += `
            <div class="options-list">
              <div class="option"><span class="option-letter">A.</span> <span class="option-text">True</span></div>
              <div class="option"><span class="option-letter">B.</span> <span class="option-text">False</span></div>
            </div>`;
      } else if (item.type === 'fill-blank') {
        questionHTML += `
            <div class="answer-line">Answer: ${showAnswers ? item.answer : '________________________'}</div>`;
      } else if (item.type === 'short-answer') {
        questionHTML += `
            <div class="answer-lines">
              <div class="answer-line"></div>
              <div class="answer-line"></div>
              <div class="answer-line"></div>
            </div>`;
      }
      
      questionHTML += `
          </div>
        </div>`;
      return questionHTML;
    }).join('');
  } else {
    // Handle regular worksheets with type
    switch (worksheet.content.type) {
      case 'counting':
        itemsHTML = worksheet.content.items.map((item, i) => `
          <div class="item">
            <div class="item-number">${i + 1}.</div>
            <div class="item-display">${item.display}</div>
            <div class="answer-box"></div>
          </div>
        `).join('');
        break;

      case 'addition':
      case 'subtraction':
      case 'multiplication':
        const operator = worksheet.content.type === 'addition' ? '+' : 
                        worksheet.content.type === 'subtraction' ? '−' : '×';
        itemsHTML = `<div class="math-grid">` + worksheet.content.items.map((item, i) => `
          <div class="math-problem">
            <span class="problem-number">${i + 1}.</span>
            <span class="problem">${item.a} ${operator} ${item.b} = </span>
            <span class="answer">${showAnswers ? item.answer : '____'}</span>
          </div>
        `).join('') + `</div>`;
        break;

      case 'letterRecognition':
      case 'phonics':
        itemsHTML = worksheet.content.items.map((item, i) => `
          <div class="letter-section">
            <div class="letter-header">Letter: <strong>${item.letter || item.sound}</strong></div>
            <div class="words-list">
              ${item.words.map(word => `<span class="word">${word}</span>`).join('')}
            </div>
          </div>
        `).join('');
        break;

      case 'tracing':
      case 'sightWords':
        itemsHTML = `<div class="tracing-grid">` + worksheet.content.items.map((item, i) => `
          <div class="tracing-item">
            <div class="tracing-letter">${item.letter || item.word}</div>
            ${item.lowercase ? `<div class="tracing-letter lowercase">${item.lowercase}</div>` : ''}
            ${item.uppercase ? `<div class="tracing-letter lowercase">${item.uppercase}</div>` : ''}
          </div>
        `).join('') + `</div>`;
        break;

      case 'matching':
        itemsHTML = `<div class="matching-container">
          <div class="matching-column">
            ${worksheet.content.items.map((item, i) => `<div class="matching-item">${item.left}</div>`).join('')}
          </div>
          <div class="matching-lines"></div>
          <div class="matching-column">
            ${worksheet.content.items.map((item, i) => `<div class="matching-item">${item.right}</div>`).join('')}
          </div>
        </div>`;
        break;

      case 'patterns':
        itemsHTML = worksheet.content.items.map((item, i) => `
          <div class="pattern-item">
            <span class="pattern-number">${i + 1}.</span>
            <div class="pattern-sequence">
              ${item.sequence.map(s => `<span class="pattern-element">${s}</span>`).join('')}
            </div>
          </div>
        `).join('');
        break;

      case 'shapes':
      case 'colors':
        itemsHTML = `<div class="shapes-grid">` + worksheet.content.items.map((item, i) => `
          <div class="shape-item">
            <div class="shape-emoji">${item.emoji}</div>
            <div class="shape-name">${item.name}</div>
          </div>
        `).join('') + `</div>`;
        break;

      case 'cvcWords':
        itemsHTML = `<div class="cvc-grid">` + worksheet.content.items.map((item, i) => `
          <div class="cvc-item">
            <div class="cvc-picture">${item.picture}</div>
            <div class="cvc-boxes">
              ${item.letters.map(l => `<div class="cvc-box">${showAnswers ? l : ''}</div>`).join('')}
            </div>
          </div>
        `).join('') + `</div>`;
        break;

      case 'wordProblems':
        itemsHTML = worksheet.content.items.map((item, i) => `
          <div class="word-problem">
            <div class="problem-number">${i + 1}.</div>
            <div class="problem-text">${item.problem}</div>
            <div class="answer-line">Answer: ${showAnswers ? item.answer : '______'}</div>
          </div>
        `).join('');
        break;

      case 'sentences':
        itemsHTML = worksheet.content.items.map((item, i) => `
          <div class="sentence-item">
            <div class="sentence-number">${i + 1}.</div>
            <div class="sentence-words">
              ${item.shuffled.map(w => `<span class="word-box">${w}</span>`).join('')}
            </div>
            <div class="answer-line">Answer: ${showAnswers ? item.sentence : '____________________'}</div>
          </div>
        `).join('');
        break;

      default:
        itemsHTML = worksheet.content.items?.map((item, i) => `
          <div class="item">
            <div class="item-number">${i + 1}.</div>
            <div class="item-content">${item.question || item.instruction || ''}</div>
          </div>
        `).join('') || '<div class="item">No content available</div>';
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        /* Ruled Paper Stationery Style */
        body {
          font-family: 'Comic Sans MS', 'Chalkboard', cursive, sans-serif;
          font-size: 16px;
          line-height: 32px;
          color: #333;
          background: #fff;
          position: relative;
        }
        
        /* Red margin line */
        body::before {
          content: '';
          position: fixed;
          left: 60px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e53935;
          z-index: 100;
        }
        
        /* Blue horizontal ruled lines */
        body::after {
          content: '';
          position: fixed;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            transparent,
            transparent 31px,
            #9ecef5 31px,
            #9ecef5 32px
          );
          z-index: -1;
          pointer-events: none;
        }
        
        .page-container {
          padding: 20px 20px 20px 80px;
          min-height: 100vh;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          margin-left: -60px;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
          border-bottom: 3px solid #6366f1;
          border-radius: 0;
        }
        .school-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .school-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }
        .school-name {
          font-size: 18px;
          font-weight: bold;
          color: #4f46e5;
        }
        .worksheet-title {
          font-size: 28px;
          color: #7c3aed;
          text-align: center;
          margin: 20px 0 15px 0;
          margin-left: -60px;
          padding: 10px;
          background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
          border-radius: 8px;
        }
        .worksheet-info {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding: 12px 15px;
          margin-left: -60px;
          margin-bottom: 25px;
          font-size: 14px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 8px;
          border: 2px dashed #f59e0b;
        }
        .worksheet-info span {
          background: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 500;
        }
        .instructions {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          padding: 15px 20px;
          margin-left: -60px;
          margin-bottom: 30px;
          border-radius: 8px;
          border-left: 4px solid #10b981;
          line-height: 1.8;
        }
        .instructions strong {
          color: #059669;
        }
        
        /* Content area with proper line spacing for ruled paper */
        .content {
          margin-top: 20px;
        }
        
        .item {
          display: flex;
          align-items: center;
          padding: 12px 15px;
          margin-bottom: 16px;
          margin-left: -60px;
          padding-left: 75px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          min-height: 48px;
        }
        .item-number {
          font-weight: bold;
          margin-right: 15px;
          color: #6366f1;
          min-width: 30px;
        }
        .item-display {
          flex: 1;
          font-size: 24px;
          letter-spacing: 5px;
        }
        .answer-box {
          width: 60px;
          height: 36px;
          border: 2px solid #6366f1;
          border-radius: 5px;
          margin-left: auto;
          background: white;
        }
        .math-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-left: -60px;
        }
        .math-problem {
          background: rgba(255, 255, 255, 0.95);
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          font-size: 20px;
          border: 2px solid #10b981;
          min-height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .problem-number {
          color: #6366f1;
          font-weight: bold;
        }
        .answer {
          font-weight: bold;
          color: ${showAnswers ? '#059669' : '#ccc'};
          min-width: 40px;
          display: inline-block;
          border-bottom: 2px solid ${showAnswers ? 'transparent' : '#ccc'};
        }
        .letter-section {
          background: rgba(255, 255, 255, 0.95);
          padding: 20px;
          margin-bottom: 20px;
          margin-left: -60px;
          padding-left: 75px;
          border-radius: 8px;
          border: 2px solid #d946ef;
        }
        .letter-header {
          font-size: 22px;
          margin-bottom: 15px;
          color: #a855f7;
        }
        .words-list {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .word {
          background: white;
          padding: 8px 18px;
          border-radius: 20px;
          border: 2px solid #d946ef;
          font-size: 16px;
        }
        .word-box {
          background: white;
          padding: 10px 18px;
          border-radius: 8px;
          border: 2px solid #6366f1;
          margin: 5px;
          display: inline-block;
          font-size: 16px;
        }
        .tracing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 25px;
          margin-left: -60px;
        }
        .tracing-item {
          text-align: center;
          padding: 25px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 10px;
          border: 2px solid #f97316;
        }
        .tracing-letter {
          font-size: 56px;
          font-weight: bold;
          color: #ea580c;
          font-family: 'Arial', sans-serif;
        }
        .lowercase {
          font-size: 42px;
          color: #f97316;
        }
        .matching-container {
          display: flex;
          justify-content: space-between;
          padding: 25px;
          margin-left: -60px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 8px;
        }
        .matching-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .matching-item {
          background: white;
          padding: 12px 25px;
          border-radius: 8px;
          border: 2px solid #10b981;
          font-size: 22px;
          text-align: center;
        }
        .pattern-item {
          display: flex;
          align-items: center;
          padding: 15px 20px;
          margin-bottom: 16px;
          margin-left: -60px;
          padding-left: 75px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 8px;
          border: 2px solid #ef4444;
          min-height: 48px;
        }
        .pattern-sequence {
          display: flex;
          gap: 12px;
          margin-left: 15px;
        }
        .pattern-element {
          background: white;
          padding: 8px 18px;
          border-radius: 5px;
          border: 2px solid #ef4444;
          font-size: 22px;
        }
        .shapes-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 25px;
          margin-left: -60px;
        }
        .shape-item {
          text-align: center;
          padding: 25px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 10px;
          border: 2px solid #0369a1;
        }
        .shape-emoji {
          font-size: 56px;
          margin-bottom: 12px;
        }
        .shape-name {
          font-weight: bold;
          color: #0369a1;
          font-size: 18px;
        }
        .cvc-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 25px;
          margin-left: -60px;
        }
        .cvc-item {
          text-align: center;
          padding: 20px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 10px;
          border: 2px solid #d946ef;
        }
        .cvc-picture {
          font-size: 56px;
          margin-bottom: 12px;
        }
        .cvc-boxes {
          display: flex;
          justify-content: center;
          gap: 8px;
        }
        .cvc-box {
          width: 45px;
          height: 45px;
          border: 2px solid #d946ef;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 22px;
          background: white;
        }
        .word-problem {
          padding: 20px;
          margin-bottom: 20px;
          margin-left: -60px;
          padding-left: 75px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 8px;
          border: 2px solid #10b981;
        }
        .problem-text {
          margin: 12px 0;
          font-size: 16px;
          line-height: 1.8;
        }
        .answer-line {
          margin-top: 15px;
          font-weight: bold;
          color: #059669;
        }
        
        /* Curriculum worksheet styles */
        .curriculum-question {
          padding: 20px;
          margin-bottom: 24px;
          margin-left: -60px;
          padding-left: 75px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 8px;
          border: 2px solid #6366f1;
          min-height: 64px;
        }
        .question-content {
          flex: 1;
        }
        .question-text {
          font-size: 16px;
          line-height: 1.8;
          margin-bottom: 12px;
        }
        .options-list {
          margin-top: 12px;
          padding-left: 20px;
        }
        .option {
          padding: 8px 12px;
          margin-bottom: 8px;
          background: white;
          border-radius: 5px;
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .option-letter {
          font-weight: bold;
          color: #6366f1;
          min-width: 25px;
        }
        .option-text {
          flex: 1;
        }
        .answer-lines {
          margin-top: 15px;
        }
        .answer-lines .answer-line {
          height: 32px;
          border-bottom: 1px solid #9ecef5;
          margin-bottom: 8px;
        }
        
        .sentence-item {
          padding: 20px;
          margin-bottom: 20px;
          margin-left: -60px;
          padding-left: 75px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 8px;
          border: 2px solid #f59e0b;
        }
        .sentence-words {
          margin: 12px 0;
        }
        .footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 11px;
          color: #666;
          background: rgba(255, 255, 255, 0.95);
          padding: 10px;
          border-top: 1px solid #ddd;
        }
        .watermark {
          position: fixed;
          bottom: 40px;
          right: 20px;
          font-size: 10px;
          color: #999;
          background: rgba(255, 255, 255, 0.9);
          padding: 5px 12px;
          border-radius: 5px;
          border: 1px solid #e5e7eb;
        }
        
        /* Writing lines for answer spaces */
        .writing-line {
          display: inline-block;
          min-width: 100px;
          border-bottom: 2px dotted #9ecef5;
          height: 24px;
          vertical-align: bottom;
        }
        
        /* Question container for ruled paper */
        .question-row {
          margin-left: -60px;
          padding-left: 75px;
          padding: 16px 15px 16px 75px;
          background: rgba(255, 255, 255, 0.85);
          margin-bottom: 8px;
          min-height: 64px;
          display: flex;
          align-items: center;
        }
        
        @media print {
          body::before, body::after {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div class="header">
          <div class="school-info">
            ${logoUrl ? `<img src="${logoUrl}" class="school-logo" alt="School Logo">` : ''}
            <div class="school-name">${school.name}</div>
          </div>
          <div style="font-size: 12px; color: #666;">Miss Laura Worksheets</div>
        </div>
        
        <h1 class="worksheet-title">${worksheet.title}</h1>
        
        <div class="worksheet-info">
          <span>📚 Curriculum: ${worksheet.curriculum}</span>
          <span>🎓 Grade: ${worksheet.grade}</span>
          <span>✏️ Skill: ${worksheet.skill}</span>
          ${worksheet.theme ? `<span>🎨 Theme: ${worksheet.theme}</span>` : ''}
        </div>
        
        <div class="instructions">
          <strong>📝 Instructions:</strong> ${worksheet.content.instructions}
        </div>
        
        <div class="content">
          ${itemsHTML}
        </div>
        
        ${isFreePlan ? '<div class="watermark">Created with Miss Laura - Free Plan</div>' : ''}
        
        <div class="footer">
          Generated by Miss Laura Worksheet Platform | ${new Date().toLocaleDateString()}
        </div>
      </div>
    </body>
    </html>
  `;
}

// Export to Microsoft Forms
const exportToMicrosoftForms = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query; // json, csv, text

    const worksheet = await prisma.worksheet.findFirst({
      where: { id, schoolId: req.user.schoolId },
      include: { school: true }
    });

    if (!worksheet) {
      return next(new AppError('Worksheet not found', 404));
    }

    const exportData = microsoftFormsService.generateExportFormats(worksheet);

    switch (format) {
      case 'csv':
        // Return CSV file for download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${worksheet.title.replace(/\s+/g, '_')}_forms.csv"`);
        res.send(exportData.csvData);
        break;

      case 'text':
        // Return plain text for copy-paste
        res.setHeader('Content-Type', 'text/plain');
        res.send(exportData.copyPasteText);
        break;

      case 'json':
      default:
        // Return JSON with all formats
        res.json({
          success: true,
          data: exportData
        });
    }
  } catch (error) {
    next(error);
  }
};

// Download CSV for Microsoft Forms import
const downloadFormsCSV = async (req, res, next) => {
  try {
    const { id } = req.params;

    const worksheet = await prisma.worksheet.findFirst({
      where: { id, schoolId: req.user.schoolId }
    });

    if (!worksheet) {
      return next(new AppError('Worksheet not found', 404));
    }

    const csvData = microsoftFormsService.generateExcelImportData(worksheet);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${worksheet.title.replace(/\s+/g, '_')}_microsoft_forms.csv"`);
    res.send(csvData);
  } catch (error) {
    next(error);
  }
};

// Create curriculum-grounded worksheet
const createCurriculumWorksheet = async (req, res, next) => {
  try {
    const {
      board,
      grade,
      subject,
      chapter,
      seedKeywords,
      numQuestions = 10,
      chunks,
      title
    } = req.body;

    // Validate required fields
    if (!board || !grade || !subject || !seedKeywords || !chunks) {
      return next(new AppError('Board, grade, subject, seedKeywords, and chunks are required', 400));
    }

    if (!Array.isArray(chunks) || chunks.length === 0) {
      return next(new AppError('At least one content chunk is required', 400));
    }

    // Check usage limit
    const usageCheck = await checkUsageLimit(req.user.schoolId);
    if (!usageCheck.allowed) {
      return next(new AppError(
        `Monthly worksheet limit reached (${usageCheck.limit}). Please upgrade your plan.`,
        403
      ));
    }

    let worksheetContent;

    // Use n8n for AI-powered generation if enabled
    if (USE_N8N) {
      try {
        worksheetContent = await n8nService.generateCurriculumWorksheet({
          board,
          grade,
          subject,
          chapter,
          seedKeywords,
          numQuestions,
          chunks
        });
      } catch (n8nError) {
        console.error('n8n generation failed:', n8nError.message);
        // Fall back to template-based generation
        worksheetContent = generateFallbackCurriculumContent({
          board,
          grade,
          subject,
          chapter,
          seedKeywords,
          numQuestions,
          chunks
        });
      }
    } else {
      // Use fallback content
      worksheetContent = generateFallbackCurriculumContent({
        board,
        grade,
        subject,
        chapter,
        seedKeywords,
        numQuestions,
        chunks
      });
    }

    // Create worksheet in database
    const worksheet = await prisma.worksheet.create({
      data: {
        schoolId: req.user.schoolId,
        title: title || `${subject} - ${chapter || grade}`,
        curriculum: board,
        grade,
        skill: subject,
        theme: chapter || '',
        content: worksheetContent,
        metadata: {
          board,
          grade,
          subject,
          chapter,
          seedKeywords,
          chunksUsed: chunks.length,
          generatedAt: new Date().toISOString(),
          type: 'curriculum-grounded'
        }
      }
    });

    console.log(`[Curriculum Worksheet] Created: ${worksheet.id} for school ${req.user.schoolId}`);

    res.status(201).json({
      success: true,
      message: 'Worksheet created successfully',
      worksheet
    });
  } catch (error) {
    next(error);
  }
};

// Generate fallback curriculum content
function generateFallbackCurriculumContent(params) {
  const { board, grade, subject, chapter, seedKeywords, numQuestions, chunks } = params;
  
  // Create questions based on keywords and context
  const questions = [];
  const questionTypes = ['multiple-choice', 'fill-blank', 'short-answer', 'true-false'];
  
  // Extract some context from chunks
  const contextText = chunks.map(c => c.text).join(' ').substring(0, 2000);
  
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
    instructions: 'Answer all questions carefully.',
    questions,
    metadata: {
      board,
      grade,
      subject,
      chapter,
      seedKeywords,
      chunksUsed: chunks.length,
      generatedAt: new Date().toISOString(),
      isFallback: true
    }
  };
}

module.exports = {
  createWorksheet,
  getWorksheets,
  getWorksheet,
  deleteWorksheet,
  generatePDF,
  exportToMicrosoftForms,
  downloadFormsCSV,
  createCurriculumWorksheet
};