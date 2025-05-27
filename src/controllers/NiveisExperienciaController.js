const db = require('../data/connection');

module.exports = {
  async listar(req, res) {
    try {
      const niveis = await db.select('*').from('niveis_experiencia');
      res.json(niveis);
    } catch (err) {
      console.error('Erro ao buscar níveis de experiência:', err);
      res.status(500).json({ erro: 'Erro ao buscar níveis de experiência' });
    }
  }
};
