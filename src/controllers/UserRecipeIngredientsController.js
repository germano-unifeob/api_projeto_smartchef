// src/controllers/UserRecipeIngredientsController.js
const knex = require('../data/connection');

async function adicionarIngredienteNaUserRecipe(req, res) {
  const { user_recipe_id, ingredient_id, expiration_date } = req.body;

  if (!user_recipe_id || !ingredient_id || !expiration_date) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  try {
    await knex('user_recipe_ingredients').insert({
      user_recipe_id,
      ingredient_id,
      expiration_date,
    });

    return res.status(201).json({ message: 'Ingrediente inserido com sucesso.' });
  } catch (err) {
    console.error('Erro ao adicionar ingrediente na user_recipe:', err);
    return res.status(500).json({ error: 'Erro ao inserir ingrediente na user_recipe.' });
  }
}

module.exports = { adicionarIngredienteNaUserRecipe };
