// src/controllers/UserRecipeResultsController.js
const db = require('../data/connection');

async function salvarResultados(req, res) {
  const { user_recipe_id, receita_ids } = req.body;

  if (!user_recipe_id || !Array.isArray(receita_ids)) {
    return res.status(400).json({ error: 'Parâmetros inválidos.' });
  }

  try {
    const inserts = receita_ids.map(receita_id => ({
      user_recipe_id,
      receita_id
    }));

    await db('user_recipe_results').insert(inserts);

    return res.status(201).json({ message: 'Resultados salvos com sucesso.' });
  } catch (err) {
    console.error('Erro ao salvar resultados:', err);
    return res.status(500).json({ error: 'Erro interno ao salvar resultados.' });
  }
}

module.exports = { salvarResultados };
