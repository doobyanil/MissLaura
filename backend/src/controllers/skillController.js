const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Get all skills
const getSkills = async (req, res, next) => {
  try {
    const { curriculum, grade } = req.query;

    const where = { isActive: true };

    if (curriculum) where.curriculum = curriculum;
    if (grade) where.grade = grade;

    const skills = await prisma.skill.findMany({
      where,
      orderBy: [{ curriculum: 'asc' }, { grade: 'asc' }, { name: 'asc' }]
    });

    res.json({ skills });
  } catch (error) {
    next(error);
  }
};

// Get skills by curriculum
const getSkillsByCurriculum = async (req, res, next) => {
  try {
    const { curriculum } = req.params;

    const skills = await prisma.skill.findMany({
      where: {
        curriculum,
        isActive: true
      },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }]
    });

    // Group by grade
    const groupedSkills = skills.reduce((acc, skill) => {
      if (!acc[skill.grade]) {
        acc[skill.grade] = [];
      }
      acc[skill.grade].push(skill);
      return acc;
    }, {});

    res.json({ skills: groupedSkills });
  } catch (error) {
    next(error);
  }
};

// Seed default skills (for setup)
const seedDefaultSkills = async (req, res, next) => {
  try {
    const defaultSkills = [
      // Indian Curriculum
      { name: 'Counting', curriculum: 'INDIAN', grade: 'Preschool', description: 'Learn to count numbers 1-10' },
      { name: 'Letter Recognition', curriculum: 'INDIAN', grade: 'Preschool', description: 'Identify and name letters' },
      { name: 'Coloring', curriculum: 'INDIAN', grade: 'Preschool', description: 'Color within boundaries' },
      { name: 'Tracing', curriculum: 'INDIAN', grade: 'Preschool', description: 'Trace letters and shapes' },
      { name: 'Counting', curriculum: 'INDIAN', grade: 'LKG', description: 'Count numbers 1-20' },
      { name: 'Addition', curriculum: 'INDIAN', grade: 'LKG', description: 'Basic addition within 10' },
      { name: 'Letter Recognition', curriculum: 'INDIAN', grade: 'LKG', description: 'Upper and lowercase letters' },
      { name: 'Counting', curriculum: 'INDIAN', grade: 'UKG', description: 'Count numbers 1-50' },
      { name: 'Addition', curriculum: 'INDIAN', grade: 'UKG', description: 'Addition within 20' },
      { name: 'Subtraction', curriculum: 'INDIAN', grade: 'UKG', description: 'Basic subtraction' },
      { name: 'Addition', curriculum: 'INDIAN', grade: 'Grade 1', description: 'Addition within 100' },
      { name: 'Subtraction', curriculum: 'INDIAN', grade: 'Grade 1', description: 'Subtraction within 100' },
      { name: 'Patterns', curriculum: 'INDIAN', grade: 'Grade 1', description: 'Identify and complete patterns' },
      { name: 'Multiplication', curriculum: 'INDIAN', grade: 'Grade 2', description: 'Basic multiplication tables' },
      { name: 'Division', curriculum: 'INDIAN', grade: 'Grade 2', description: 'Basic division concepts' },

      // IB Curriculum
      { name: 'Counting', curriculum: 'IB', grade: 'Early Years (3-4)', description: 'Count and recognize numbers' },
      { name: 'Letter Recognition', curriculum: 'IB', grade: 'Early Years (3-4)', description: 'Identify letters' },
      { name: 'Matching', curriculum: 'IB', grade: 'Early Years (3-4)', description: 'Match similar objects' },
      { name: 'Patterns', curriculum: 'IB', grade: 'Early Years (4-5)', description: 'Recognize patterns' },
      { name: 'Addition', curriculum: 'IB', grade: 'Early Years (4-5)', description: 'Simple addition' },
      { name: 'Counting', curriculum: 'IB', grade: 'Early Years (5-6)', description: 'Counting to 100' },
      { name: 'Addition', curriculum: 'IB', grade: 'PYP Grade 1', description: 'Addition strategies' },
      { name: 'Subtraction', curriculum: 'IB', grade: 'PYP Grade 1', description: 'Subtraction strategies' },
      { name: 'Patterns', curriculum: 'IB', grade: 'PYP Grade 1', description: 'Number patterns' },

      // Montessori
      { name: 'Tracing', curriculum: 'MONTESSORI', grade: 'Primary (2.5-3)', description: 'Trace shapes and lines' },
      { name: 'Matching', curriculum: 'MONTESSORI', grade: 'Primary (2.5-3)', description: 'Match objects and pictures' },
      { name: 'Counting', curriculum: 'MONTESSORI', grade: 'Primary (3-4)', description: 'Count with objects' },
      { name: 'Letter Recognition', curriculum: 'MONTESSORI', grade: 'Primary (3-4)', description: 'Sandpaper letters' },
      { name: 'Addition', curriculum: 'MONTESSORI', grade: 'Primary (4-5)', description: 'Golden bead addition' },
      { name: 'Subtraction', curriculum: 'MONTESSORI', grade: 'Primary (4-5)', description: 'Golden bead subtraction' },
      { name: 'Patterns', curriculum: 'MONTESSORI', grade: 'Primary (5-6)', description: 'Pattern recognition' },
      { name: 'Multiplication', curriculum: 'MONTESSORI', grade: 'Elementary (6-9)', description: 'Bead frame multiplication' }
    ];

    let created = 0;
    for (const skill of defaultSkills) {
      try {
        await prisma.skill.create({
          data: skill
        });
        created++;
      } catch (e) {
        // Skip if already exists
      }
    }

    res.json({
      message: `Seeded ${created} skills`,
      total: defaultSkills.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSkills,
  getSkillsByCurriculum,
  seedDefaultSkills
};