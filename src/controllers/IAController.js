const db = require('../data/connection');

async function recomendarReceitas(req, res) {
  const { user_id, ingredients } = req.body;

  try {
    // Obter perfil do usuário
    const userQuery = await db('usuarios')
      .where('id', user_id)
      .select('estilo_vida_id', 'nivel_experiencia_id');

    if (userQuery.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const user = userQuery[0];

    // Obter alergias
    const alergias = await db('user_allergies')
      .where('user_id', user_id)
      .pluck('ingredient_id');

    const receitasQuery = db('recipes as r')
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

    // Excluir receitas com ingredientes alérgicos
    if (alergias.length > 0) {
      const receitasComAlergia = await db('recipe_ingredients')
        .whereIn('ingredient_id', alergias)
        .pluck('receita_id');

      receitas = receitas.filter(r => !receitasComAlergia.includes(r.receita_id));
    }

    const ingredientesEnviadosIds = ingredients.map(i => i.ingredient_id);
    const scoredReceitas = [];

    for (const receita of receitas) {
      const ingredientesReceita = await db('recipe_ingredients')
        .where('receita_id', receita.receita_id)
        .pluck('ingredient_id');

      // Verifica se TODOS os ingredientes enviados estão na receita
      const contemTodos = ingredientesEnviadosIds.every(id => ingredientesReceita.includes(id));
      if (!contemTodos) continue;

      // Cálculo de prioridade pela validade
      let menorDias = Infinity;
      for (const ing of ingredients) {
        if (ingredientesReceita.includes(ing.ingredient_id)) {
          const diasRestantes = (new Date(ing.expiration_date) - new Date()) / (1000 * 60 * 60 * 24);
          if (diasRestantes < menorDias) menorDias = diasRestantes;
        }
      }

      const expirationPriority = menorDias < Infinity ? Math.max(0, 1 - menorDias / 30) : 0;
      const totalScore = expirationPriority;

      scoredReceitas.push({ ...receita, totalScore, total_ingredientes: ingredientesReceita.length });
    }

    scoredReceitas.sort((a, b) => a.total_ingredientes - b.total_ingredientes || b.totalScore - a.totalScore);
    const topReceitas = scoredReceitas.slice(0, 3);

    console.log('🔍 Receitas finais (com todos os ingredientes):', topReceitas.map(r => r.receita_id));

    res.status(200).json({ receitas: topReceitas });

    // Salvar recomendações
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
