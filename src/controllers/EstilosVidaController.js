const db = require('../data/connection');

module.exports = {
  async listar(req, res) {
    try {
      const estilos = await db.select('*').from('estilos_vida');
      res.json(estilos);
    } catch (err) {
      console.error('Erro ao buscar estilos de vida:', err);
      res.status(500).json({ erro: 'Erro ao buscar estilos de vida' });
    }
  }
};
