const knex = require('../data/connection');

class ReceitasController {
  // GET /receitas/random
  static async random(req, res) {
    try {
      const receitas = await knex('recipes')
        .select([
          'receita_id',
          'name',
          'description',
          'ingredients',
          'steps',
          'minutes',
          'calories'
        ])
        .orderByRaw('RAND()')
        .limit(5);

      return res.json(receitas);
    } catch (error) {
      console.error('Erro ao buscar receitas aleatórias:', error);
      return res.status(500).json({ message: 'Erro interno ao carregar receitas aleatórias' });
    }
  }

  // GET /receitas/autocomplete?q=bolo
  static async autocomplete(req, res) {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ message: 'Parâmetro de busca ausente' });
    }

    try {
      const receitas = await knex('recipes')
        .select([
          'receita_id',
          'name',
          'description',
          'ingredients',
          'steps',
          'minutes',
          'calories'
        ])
        .where('name', 'like', `%${q}%`)
        .limit(10);

      return res.json(receitas);
    } catch (error) {
      console.error('Erro no autocomplete:', error);
      return res.status(500).json({ message: 'Erro ao buscar receitas' });
    }
  }

  // GET /receitas/search?q=bolo
  static async search(req, res) {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ message: 'Parâmetro de busca ausente' });
    }

    try {
      const receitas = await knex('recipes')
        .select([
          'receita_id',
          'name',
          'description',
          'ingredients',
          'steps',
          'minutes',
          'calories'
        ])
        .where('name', 'like', `%${q}%`);

      return res.json(receitas);
    } catch (error) {
      console.error('Erro ao buscar receitas:', error);
      return res.status(500).json({ message: 'Erro ao buscar receitas' });
    }
  }

  // GET /receitas/estilo/:estiloId
  static async buscarPorEstilo(req, res) {
    const estiloId = parseInt(req.params.estiloId);
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const offset = (page - 1) * limit;

    try {
      const receitas = await knex('recipes')
        .where('estilo_vida_id', estiloId)
        .limit(limit)
        .offset(offset)
        .select([
          'receita_id',
          'name',
          'description',
          'ingredients',
          'steps',
          'minutes',
          'calories',
          'estilo_vida_id'
        ]);

      res.json(receitas);
    } catch (error) {
      console.error('Erro ao buscar receitas por estilo com paginação:', error);
      res.status(500).json({ error: 'Erro ao buscar receitas paginadas.' });
    }
  }

  // GET /receitas/por-estilo (com filtros)
  static async buscarComFiltros(req, res) {
    try {
      const {
        nivel_experiencia_id,
        estilo_vida_id,
        minMinutes,
        maxMinutes,
        page = 1,
        pageSize = 10
      } = req.query;
  
      const query = knex('recipes')
        .select([
          'receita_id',
          'name',
          'description',
          'ingredients',
          'steps',
          'minutes',
          'calories',
          'nivel_experiencia_id',
          'estilo_vida_id'
        ])
        .limit(parseInt(pageSize))
        .offset((parseInt(page) - 1) * parseInt(pageSize))
        .orderByRaw('RAND()');
  
      if (nivel_experiencia_id !== undefined && nivel_experiencia_id !== '') {
        query.andWhere('nivel_experiencia_id', nivel_experiencia_id);
      }
  
      if (estilo_vida_id !== undefined && estilo_vida_id !== '') {
        if (estilo_vida_id == 1) { // vegetariano
          const palavrasProibidas = ['beef', 'chicken', 'salmon', 'fish', 'pork', 'bacon', 'shrimp', 'ham', 'steak', 'turkey', 'sausage'];
          palavrasProibidas.forEach(palavra => {
            query.andWhereRaw(`LOWER(name) NOT LIKE ?`, [`%${palavra}%`]);
          });
        } else {
          query.andWhere('estilo_vida_id', estilo_vida_id);
        }
      }
  
      if (minMinutes) {
        query.andWhere('minutes', '>=', parseInt(minMinutes));
      }
      if (maxMinutes) {
        query.andWhere('minutes', '<=', parseInt(maxMinutes));
      }
  
      const results = await query;
      res.json(results);
    } catch (error) {
      console.error('Erro ao buscar receitas com filtros:', error);
      res.status(500).json({ error: 'Erro ao buscar receitas com filtros.' });
    }
  }

  
  // GET /receitas/carnes?page=1&pageSize=10
static async buscarReceitasCarnes(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const palavrasChaveCarnes = [
      'beef', 'chicken', 'pork', 'bacon', 'sausage',
      'ham', 'steak', 'ribs', 'turkey', 'duck', 'lamb', 'meat'
    ];

    let query = knex('recipes')
      .select([
        'receita_id',
        'name',
        'description',
        'ingredients',
        'steps',
        'minutes',
        'calories'
      ])
      .limit(pageSize)
      .offset(offset);

    query.where(function () {
      palavrasChaveCarnes.forEach((palavra, index) => {
        const condition = `LOWER(ingredients) LIKE ?`;
        if (index === 0) this.whereRaw(condition, [`%${palavra}%`]);
        else this.orWhereRaw(condition, [`%${palavra}%`]);
      });
    });

    const resultados = await query;
    return res.json(resultados);
  } catch (error) {
    console.error('Erro ao buscar receitas com carnes:', error);
    return res.status(500).json({ error: 'Erro ao buscar receitas com carnes.' });
  }
}  
  
  
}

module.exports = ReceitasController;
