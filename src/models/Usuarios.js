const knex = require('../data/connection');

class Usuarios {
  async create(userData) {
    const trx = await knex.transaction();

    try {
      // 1. Inserir usuário
      await trx('usuarios').insert({
        nome: userData.name,
        email: userData.email,
        telefone: userData.phone,
        senha: userData.password,
        estilo_vida_id: userData.lifestyle_id,
        nivel_experiencia_id: userData.experience_level_id
      });

      // 2. Buscar o ID do usuário recém-inserido
      const insertedUser = await trx('usuarios')
        .where({ email: userData.email })
        .first();

      const userId = insertedUser.id;

      // 3. Inserir alergias se existirem
      if (userData.allergy_ids && Array.isArray(userData.allergy_ids)) {
        const userAllergies = userData.allergy_ids.map((ingredientId) => ({
          user_id: userId,
          ingredient_id: ingredientId,
        }));

        await trx('user_allergies').insert(userAllergies);
      }

      await trx.commit();
      return { status: true };
    } catch (err) {
      await trx.rollback();
      return { status: false, err };
    }
  }

  async salvarToken(email, token) {
    let usuario = await this.findByEmail(email);

    if (usuario.status) {
      try {
        await knex('usuarios')
          .where({ id: usuario.values.id })
          .update({ token_recuperacao: token });
        return { status: true, message: 'Usuário editado com sucesso!' };
      } catch (err) {
        return { status: false, err };
      }
    } else {
      return {
        status: false,
        err: 'Usuário não existe, portanto não pode ser editado.',
      };
    }
  }

  async findAll() {
    try {
      const users = await knex
        .select(['id', 'nome', 'email', 'telefone', 'estilo_vida_id', 'nivel_experiencia_id'])
        .from('usuarios');
      return { status: true, values: users };
    } catch (err) {
      return { status: false, err };
    }
  }

  async findById(id) {
    try {
      const user = await knex
        .select(['id', 'nome', 'email', 'telefone', 'estilo_vida_id', 'nivel_experiencia_id'])
        .from('usuarios')
        .where({ id });
      return user.length > 0
        ? { status: true, values: user[0] }
        : { status: undefined, message: 'Usuário não existe!' };
    } catch (err) {
      return { status: false, err };
    }
  }

  async delete(id) {
    let user = await this.findById(id);

    if (user.status) {
      try {
        await knex('usuarios').where({ id }).delete();
        return { status: true, message: 'Usuário excluído com sucesso' };
      } catch (err) {
        return { status: false, err };
      }
    } else {
      return {
        status: false,
        err: 'Usuário não existe, portanto não pode ser deletado.',
      };
    }
  }

  async updateSenha(email, senhaNova) {
    let usuario = await this.findByEmail(email);

    if (usuario.status) {
      try {
        await knex('usuarios')
          .where({ id: usuario.values.id })
          .update({ senha: senhaNova });
        return { status: true, message: 'Senha atualizada com sucesso' };
      } catch (err) {
        return { status: false, err };
      }
    } else {
      return {
        status: false,
        err: 'Usuário não existe, portanto não pode ser editado.',
      };
    }
  }

  async findByEmail(email) {
    try {
      const user = await knex('usuarios')
        .select(['id', 'nome', 'email', 'telefone', 'senha'])
        .where({ email });

      return user.length > 0
        ? { status: true, values: user[0] }
        : { status: false, err: undefined };
    } catch (err) {
      return { status: false, err };
    }
  }

  async findByToken(token) {
    try {
      const user = await knex('usuarios')
        .select(['id', 'nome', 'email', 'telefone', 'senha'])
        .where({ token_recuperacao: token });

      return user.length > 0
        ? { status: true, values: user[0] }
        : { status: false, err: undefined };
    } catch (err) {
      return { status: false, err };
    }
  }


  async findByTelefone(telefone) {
    try {
      const result = await knex('usuarios').where({ telefone }).first();
      return result
        ? { status: true, values: result }
        : { status: false, err: 'Usuário não encontrado' };
    } catch (err) {
      return { status: false, err };
    }
  }

  

  async getUserProfileDetalhado(id) {
    try {
      console.log("🔍 Buscando usuário com ID:", id);
  
      const user = await knex('usuarios')
        .select(['id', 'nome', 'email', 'telefone', 'estilo_vida_id', 'nivel_experiencia_id'])
        .where({ id })
        .first();
  

      if (!user) return { status: false, message: 'Usuário não encontrado' };
  
      const estilo = await knex('estilos_vida').where({ estilo_vida_id: user.estilo_vida_id }).first();

  
      const nivel = await knex('niveis_experiencia').where({ nivel_experiencia_id: user.nivel_experiencia_id }).first();

  
      return {
        status: true,
        values: {
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          estilo_vida: estilo?.nome || 'Não informado',
          nivel_experiencia: nivel?.nome || 'Não informado',
        }
      };
    } catch (err) {
      console.error("🔥 Erro no getUserProfileDetalhado:", err);
      return { status: false, err };
    }
  }
  
}

module.exports = new Usuarios();
