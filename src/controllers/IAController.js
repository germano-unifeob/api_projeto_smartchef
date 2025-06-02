const db = require('../data/connection');

async function recomendarReceitas(req, res) {
  const { user_id, ingredients } = req.body;

  try {
    const startTime = Date.now();
    const tempoLimiteMs = 30000; // 30 segundos

    // 1. Obter perfil do usuário
    const userQuery = await db('usuarios')
      .where('id', user_id)
      .select('estilo_vida_id', 'nivel_experiencia_id');

    if (userQuery.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const user = userQuery[0];

    // 2. Obter alergias do usuário
    const alergias = await db('user_allergies')
      .where('user_id', user_id)
      .pluck('ingredient_id');

    console.log('Alergias do usuário:', alergias);

    // 3. Obter receitas compatíveis com estilo de vida e nível de experiência
    let receitasQuery = db('recipes as r')
      .select(
        'r.receita_id',
        'r.name',
        'r.ingredients',
        'r.description',
        'r.steps',
        'r.calories',
        'r.minutes'
      )
      .whereIn(
        'r.nivel_experiencia_id',
        Array.from({ length: user.nivel_experiencia_id + 1 }, (_, i) => i)
      )
      .whereNotIn('r.receita_id', function () {
        this.select('receita_id').from('user_recipes').where('user_id', user_id);
      });

    if (user.estilo_vida_id === 1) {
      const palavrasProibidas = ['beef', 'chicken', 'salmon', 'fish', 'pork', 'bacon', 'shrimp', 'ham', 'steak', 'turkey', 'sausage'];
      palavrasProibidas.forEach(palavra => {
        receitasQuery.andWhereRaw(`LOWER(r.name) NOT LIKE ?`, [`%${palavra}%`]);
      });
    } else {
      receitasQuery.andWhere('r.estilo_vida_id', user.estilo_vida_id);
    }

    let receitas = await receitasQuery;

    // 4. Excluir receitas com ingredientes alérgicos
    if (alergias.length > 0) {
      const receitasComAlergia = await db('recipe_ingredients')
        .whereIn('ingredient_id', alergias)
        .pluck('receita_id');

      console.log('Receitas com alergias (a serem removidas):', receitasComAlergia);
      receitas = receitas.filter(r => !receitasComAlergia.includes(r.receita_id));
    }

    // 5. Verificar se todas os ingredientes enviados estão presentes e calcular score
    const ingredientesEnviadosIds = ingredients.map(i => i.ingredient_id);
    const scoredReceitas = [];

    for (const receita of receitas) {
      if (Date.now() - startTime > tempoLimiteMs) {
        console.log('⏱ Tempo limite excedido. Interrompendo busca.');
        break;
      }

      const ingredientesReceita = await db('recipe_ingredients')
        .where('receita_id', receita.receita_id)
        .pluck('ingredient_id');

      const contemTodos = ingredientesEnviadosIds.every(id => ingredientesReceita.includes(id));
      if (!contemTodos) continue;

      let menorDias = Infinity;
      for (const ing of ingredients) {
        if (ingredientesReceita.includes(ing.ingredient_id)) {
          const diasRestantes = (new Date(ing.expiration_date) - new Date()) / (1000 * 60 * 60 * 24);
          if (diasRestantes < menorDias) menorDias = diasRestantes;
        }
      }

      const expirationPriority = menorDias < Infinity ? Math.max(0, 1 - menorDias / 30) : 0;
      scoredReceitas.push({ ...receita, totalScore: expirationPriority, total_ingredientes: ingredientesReceita.length });
    }

    scoredReceitas.sort((a, b) => a.total_ingredientes - b.total_ingredientes || b.totalScore - a.totalScore);
    const topReceitas = scoredReceitas.slice(0, 3);

    console.log('🔍 Receitas finais (com todos os ingredientes):', topReceitas.map(r => r.receita_id));
    const statusCode = (Date.now() - startTime > tempoLimiteMs) ? 206 : 200;
    res.status(statusCode).json({ receitas: topReceitas });

    setImmediate(async () => {
      try {
        for (const r of topReceitas) {
          await db('user_recipes').insert({
            user_id: user_id,
            receita_id: r.receita_id
          });
        }
      } catch (err) {
        console.error('Erro ao salvar em user_recipes:', err);
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao recomendar receitas' });
  }
}

async function getRecomendacoes(req, res) {
  const user_id = req.params.user_id;

  try {
    const receitas = await db('user_recipes as ur')
      .join('recipes as r', 'r.receita_id', 'ur.receita_id')
      .where('ur.user_id', user_id)
      .orderBy('ur.data_sugestao', 'desc')
      .select(
        'r.receita_id',
        'r.name',
        'r.description',
        'r.steps',
        'r.ingredients',
        'r.calories',
        'r.minutes'
      );

    console.log("📦 Receitas retornadas pela API:", JSON.stringify(receitas, null, 2));
    return res.status(200).json({ receitas });

  } catch (err) {
    console.error('Erro ao buscar recomendações:', err);
    return res.status(500).json({ message: 'Erro ao buscar receitas' });
  }
}

module.exports = {
  recomendarReceitas,
  getRecomendacoes
};
