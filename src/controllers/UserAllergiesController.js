const db = require('../data/connection');

class UserAllergiesController {
  static async addAllergies(req, res) {
    const { user_id, allergy_ids } = req.body;

    if (!Array.isArray(allergy_ids) || !user_id) {
      return res.status(400).json({ message: 'Dados inválidos' });
    }

    try {
      const dados = allergy_ids.map(id => ({
        user_id,
        ingredient_id: parseInt(id)
      }));

      await db('user_allergies').insert(dados);

      res.status(200).json({ message: 'Alergias registradas com sucesso' });
    } catch (err) {
      console.error("Erro ao adicionar alergias:", err);
      res.status(500).json({ message: 'Erro interno ao registrar alergias' });
    }
  }
}

module.exports = UserAllergiesController;
