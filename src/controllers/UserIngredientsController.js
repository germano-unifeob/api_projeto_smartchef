const knex = require('../data/connection');
const UserIngredients = require('../models/UserIngredients');

class UserIngredientsController {
  async adicionar(req, res) {
    const { user_id, ingredient_name, expiration_date } = req.body;

    if (!user_id || !ingredient_name || !expiration_date) {
      return res.status(400).json({ success: false, message: 'Dados incompletos.' });
    }

    try {
      // Buscar o ID do ingrediente pelo nome
      let [ingredient] = await knex('ingredients')
        .where('ingredient', ingredient_name)
        .select('ingredient_id');

      // Se não existir, cria
      if (!ingredient) {
        const [newId] = await knex('ingredients').insert({ ingredient: ingredient_name });
        ingredient = { ingredient_id: newId };
      }

      // Inserir o ingrediente para o usuário (removido o "1" da quantidade)
      const result = await UserIngredients.add(user_id, ingredient.ingredient_id, expiration_date);

      return result.status
        ? res.status(201).json({ success: true, message: 'Ingrediente adicionado.' })
        : res.status(500).json({ success: false, message: 'Erro ao adicionar ingrediente.', error: result.err });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erro interno.', error: err.message });
    }
  }

  async listar(req, res) {
    const user_id = req.params.user_id;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'ID do usuário não informado.' });
    }

    const result = await UserIngredients.findByUser(user_id);

    return result.status
      ? res.status(200).json({ success: true, ingredients: result.values })
      : res.status(500).json({ success: false, message: 'Erro ao buscar ingredientes.', error: result.err });
  }
}

// função fora da classe
async function buscarIngredientes(req, res) {
  const query = req.query.q;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Query ausente' });
  }

  try {
    const rows = await knex('ingredients')
      .where('ingredient', 'like', `${query}%`)
      .select('ingredient_id', 'ingredient')
      .limit(10);

    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar ingredientes', error: err.message });
  }
}

const controller = new UserIngredientsController();

module.exports = {
  adicionar: controller.adicionar.bind(controller),
  listar: controller.listar.bind(controller),
  buscarIngredientes,
};
