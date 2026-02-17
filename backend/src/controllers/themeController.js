const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Get all themes
const getThemes = async (req, res, next) => {
  try {
    const themes = await prisma.theme.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json({ themes });
  } catch (error) {
    next(error);
  }
};

// Seed default themes (for setup)
const seedDefaultThemes = async (req, res, next) => {
  try {
    const defaultThemes = [
      { name: 'Animals', description: 'Cute animals and pets', iconUrl: null },
      { name: 'Fruits', description: 'Fresh fruits and vegetables', iconUrl: null },
      { name: 'Shapes', description: 'Basic geometric shapes', iconUrl: null },
      { name: 'Nature', description: 'Trees, flowers, and nature', iconUrl: null },
      { name: 'Vehicles', description: 'Cars, trucks, and transportation', iconUrl: null },
      { name: 'Space', description: 'Stars, planets, and space', iconUrl: null },
      { name: 'Colors', description: 'Rainbow and colors', iconUrl: null },
      { name: 'Numbers', description: 'Numbers and counting', iconUrl: null },
      { name: 'Letters', description: 'Alphabet and letters', iconUrl: null },
      { name: 'Seasons', description: 'Spring, Summer, Fall, Winter', iconUrl: null },
      { name: 'Holidays', description: 'Festive themes', iconUrl: null },
      { name: 'Sports', description: 'Sports and games', iconUrl: null },
      { name: 'Music', description: 'Musical instruments', iconUrl: null },
      { name: 'Food', description: 'Food and cooking', iconUrl: null },
      { name: 'Ocean', description: 'Sea creatures and ocean life', iconUrl: null }
    ];

    let created = 0;
    for (const theme of defaultThemes) {
      try {
        await prisma.theme.create({
          data: theme
        });
        created++;
      } catch (e) {
        // Skip if already exists
      }
    }

    res.json({
      message: `Seeded ${created} themes`,
      total: defaultThemes.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getThemes,
  seedDefaultThemes
};