const knex = require('../data/connection');

class UserIngredients {
  // Adiciona um ingrediente para um usuário
  static async add(user_id, ingredient_id, expiration_date) {
    try {
      await knex('user_ingredients').insert({
        user_id,
        ingredient_id,
        expiration_date
      });

      return { status: true };
    } catch (err) {
      return { status: false, err };
    }
  }

  // Lista os ingredientes de um usuário
  static async findByUser(user_id) {
    try {
      const rows = await knex('user_ingredients as ui')
        .join('ingredients as i', 'ui.ingredient_id', 'i.ingredient_id')
        .select('ui.ingredient_id', 'i.ingredient', 'ui.expiration_date')
        .where('ui.user_id', user_id);

      return { status: true, values: rows };
    } catch (err) {
      return { status: false, err };
    }
  }
}

module.exports = UserIngredients;
