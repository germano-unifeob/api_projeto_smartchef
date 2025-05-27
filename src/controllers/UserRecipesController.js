// src/controllers/UserRecipesController.js
const db = require('../data/connection');

async function criarUserRecipe(req, res) {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id é obrigatório.' });
  }

  try {
    const [id] = await db('user_recipes').insert({
      user_id,
      data_sugestao: db.fn.now(),
    });

    return res.status(201).json({ user_recipe_id: id });
  } catch (err) {
    console.error('Erro ao criar user_recipe (tentativa):', err);
    return res.status(500).json({ error: 'Erro ao criar tentativa de receita.' });
  }
}



const getUserRecipes = async (req, res) => {
  const userId = req.params.userId;

  try {
    const receitas = await db('user_recipes as ur')
      .join('recipes as r', 'ur.receita_id', 'r.receita_id') // corrigido aqui
      .select('r.*')
      .where('ur.user_id', userId)
      .orderBy('ur.data_sugestao', 'desc');

    res.json(receitas);
  } catch (err) {
    console.error('Erro ao buscar receitas do usuário:', err);
    res.status(500).json({ error: 'Erro ao buscar receitas do usuário' });
  }
};


module.exports = {
  criarUserRecipe,
  getUserRecipes
};