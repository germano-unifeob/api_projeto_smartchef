const Usuarios = require('../models/Usuarios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const crypto = require('crypto');
const knex = require('../data/connection');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

let tokensTemporarios = [];

class UsuariosController {
  async login(req, res) {
    const { email, senha } = req.body;

    const user = await Usuarios.findByEmail(email);

    if (!user.status) {
      return res.status(404).json({
        success: false,
        message: user.err || 'E-mail não encontrado',
      });
    }

    const isPassword = bcrypt.compareSync(senha, user.values.senha);

    if (!isPassword) {
      return res.status(406).json({
        success: false,
        message: 'Senha inválida',
      });
    }

    const token = jwt.sign(
      {
        email: user.values.email,
        telefone: user.values.telefone,
      },
      process.env.SECRET,
      { expiresIn: '10m' }
    );

    return res.status(200).json({
      success: true,
      token,
      user_id: user.values.id,
    });
  }

  async recuperarSenha(req, res) {
    const { email, telefone } = req.body;

    const user = await Usuarios.findByEmail(email);

    if (!user.status) {
      return res.status(404).json({
        success: false,
        message: 'E-mail não encontrado',
      });
    }

    if (user.values.telefone !== telefone) {
      return res.status(400).json({
        success: false,
        message: 'Telefone não confere com o cadastrado',
      });
    }

    const token = crypto.randomInt(100000, 999999).toString();

    try {
      await client.messages.create({
        body: `Seu código de recuperação é: ${token}`,
        from: twilioPhoneNumber,
        to: telefone,
      });

      tokensTemporarios.push({
        email,
        token,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        message: 'Token enviado por SMS',
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar token por SMS',
      });
    }
  }

  async resetarSenha(req, res) {
    const { phone, token, new_password } = req.body;
  
    const user = await Usuarios.findByTelefone(phone);
    if (!user.status) {
      return res.status(404).json({
        success: false,
        message: 'Telefone não encontrado',
      });
    }
  
    const tokenInfo = tokensTemporarios.find(
      (item) => item.email === user.values.email && item.token === token
    );
  
    if (!tokenInfo) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado.',
      });
    }
  
    if (Date.now() > tokenInfo.expiresAt) {
      tokensTemporarios = tokensTemporarios.filter((t) => t !== tokenInfo);
      return res.status(400).json({
        success: false,
        message: 'Token expirado. Solicite um novo.',
      });
    }
  
    const hashedPassword = await bcrypt.hash(new_password, 10);
    const updated = await Usuarios.updateSenha(user.values.email, hashedPassword);
  
    if (!updated.status) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar senha.',
      });
    }
  
    tokensTemporarios = tokensTemporarios.filter((t) => t !== tokenInfo);
  
    return res.status(200).json({
      success: true,
      message: 'Senha redefinida com sucesso.',
    });
  }

  async create(req, res) {
    try {
      const {
        name,
        email,
        phone,
        password,
        lifestyle_id,
        experience_level_id,
        allergy_ids // <- array de ingredient_id
      } = req.body;

      if (!name || !email || !phone || !password) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios não enviados!',
        });
      }

      const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

      const [user_id] = await knex('usuarios').insert({
        nome: name,
        email,
        telefone: phone,
        senha: hashedPassword,
        estilo_vida_id: lifestyle_id,
        nivel_experiencia_id: experience_level_id
      });

      if (Array.isArray(allergy_ids) && allergy_ids.length > 0) {
        const userAllergies = allergy_ids.map((ingredient_id) => ({
          user_id,
          ingredient_id
        }));
        await knex('user_allergies').insert(userAllergies);
      }

      return res.status(201).json({
        success: true,
        message: 'Usuário cadastrado com sucesso!'
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao cadastrar usuário',
        error: err
      });
    }
  }

  async findAll(req, res) {
    const dadosUsuario = await Usuarios.findAll();

    return dadosUsuario.status
      ? res.status(200).json({ success: true, values: dadosUsuario.values })
      : res.status(404).json({ success: false, message: dadosUsuario.err });
  }

  async findById(req, res) {
    if (isNaN(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetro ID inválido',
      });
    }

    const dadosUsuario = await Usuarios.findById(req.params.id);

    if (dadosUsuario.status === undefined) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
      });
    }

    return dadosUsuario.status
      ? res.status(200).json({ success: true, values: dadosUsuario.values })
      : res.status(404).json({ success: false, message: dadosUsuario.err });
  }

  async remove(req, res) {
    if (isNaN(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const result = await Usuarios.delete(req.params.id);

    return result.status
      ? res.status(200).json({ success: true, message: result.message })
      : res.status(400).json({ success: false, message: result.err });
  }

  async editUser(req, res) {
    const id = req.params.id;
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const { nome, senha } = req.body;
    const hashed = senha ? bcrypt.hashSync(senha, 10) : null;

    const result = await Usuarios.update(id, nome, null, hashed);

    return result.status
      ? res.status(200).json({ success: true, message: result.message })
      : res.status(400).json({ success: false, message: result.err });
  }

  async getPerfilDetalhado(req, res) {
    const { id } = req.params;
    const result = await Usuarios.getUserProfileDetalhado(id);

    if (!result.status) {
      return res.status(404).json({ message: result.message || 'Erro ao buscar perfil.' });
    }

    return res.json(result.values);
  }

  async updateProfile(req, res) {
    const { id } = req.params;
    const { nome, telefone, estilo_vida_id, nivel_experiencia_id } = req.body;
  
    try {
      await knex('usuarios')
        .where({ id })
        .update({
          nome,
          telefone,
          estilo_vida_id,
          nivel_experiencia_id
        });
  
      return res.json({ message: 'Perfil atualizado com sucesso' });
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      return res.status(500).json({ message: 'Erro ao atualizar perfil' });
    }
  }  

}

module.exports = new UsuariosController();
