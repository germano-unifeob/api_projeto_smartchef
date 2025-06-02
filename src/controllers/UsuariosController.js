// Importações de bibliotecas e módulos do sistema
const Usuarios = require('../models/Usuarios'); // Modelo para acessar dados dos usuários
const bcrypt = require('bcryptjs'); // Biblioteca para criptografar senhas
const jwt = require('jsonwebtoken'); // Biblioteca para geração e verificação de JWTs
const twilio = require('twilio'); // SDK para envio de SMS
const crypto = require('crypto'); // Módulo nativo para gerar tokens seguros
const knex = require('../data/connection'); // Conexão com banco de dados via Knex

// Credenciais do Twilio definidas via variáveis de ambiente
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Instância do cliente Twilio
const client = twilio(accountSid, authToken);

// Armazena tokens de recuperação de senha temporários (em memória)
let tokensTemporarios = [];

class UsuariosController {
  // Método de login com autenticação e geração de JWT
  async login(req, res) {
    const { email, senha } = req.body;

    // Busca o usuário pelo email
    const user = await Usuarios.findByEmail(email);

    // Retorna erro se não encontrado
    if (!user.status) {
      return res.status(404).json({ success: false, message: user.err || 'E-mail não encontrado' });
    }

    // Compara a senha digitada com o hash salvo
    const isPassword = bcrypt.compareSync(senha, user.values.senha);

    // Retorna erro se a senha estiver errada
    if (!isPassword) {
      return res.status(406).json({ success: false, message: 'Senha inválida' });
    }

    // Gera token JWT com email e telefone, expira em 10 minutos
    const token = jwt.sign(
      { email: user.values.email, telefone: user.values.telefone },
      process.env.SECRET,
      { expiresIn: '10m' }
    );

    // Retorna token e ID do usuário
    return res.status(200).json({ success: true, token, user_id: user.values.id });
  }

  // Envio de token SMS para recuperação de senha
  async recuperarSenha(req, res) {
    const { email, telefone } = req.body;

    // Busca o usuário pelo email
    const user = await Usuarios.findByEmail(email);
    if (!user.status) {
      return res.status(404).json({ success: false, message: 'E-mail não encontrado' });
    }

    // Verifica se o telefone bate com o cadastrado
    if (user.values.telefone !== telefone) {
      return res.status(400).json({ success: false, message: 'Telefone não confere com o cadastrado' });
    }

    // Gera token numérico de 6 dígitos
    const token = crypto.randomInt(100000, 999999).toString();

    try {
      // Envia SMS com o token
      await client.messages.create({
        body: `Seu código de recuperação é: ${token}`,
        from: twilioPhoneNumber,
        to: telefone,
      });

      // Salva token em memória com data de expiração
      tokensTemporarios.push({
        email,
        token,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutos
      });

      return res.status(200).json({ success: true, message: 'Token enviado por SMS' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erro ao enviar token por SMS' });
    }
  }

  // Redefinição de senha com verificação de token
  async resetarSenha(req, res) {
    const { phone, token, new_password } = req.body;

    const user = await Usuarios.findByTelefone(phone);
    if (!user.status) {
      return res.status(404).json({ success: false, message: 'Telefone não encontrado' });
    }

    // Verifica token salvo
    const tokenInfo = tokensTemporarios.find(
      (item) => item.email === user.values.email && item.token === token
    );

    if (!tokenInfo) {
      return res.status(400).json({ success: false, message: 'Token inválido ou expirado.' });
    }

    // Se expirado, remove token e retorna erro
    if (Date.now() > tokenInfo.expiresAt) {
      tokensTemporarios = tokensTemporarios.filter((t) => t !== tokenInfo);
      return res.status(400).json({ success: false, message: 'Token expirado. Solicite um novo.' });
    }

    // Criptografa nova senha
    const hashedPassword = await bcrypt.hash(new_password, 10);
    const updated = await Usuarios.updateSenha(user.values.email, hashedPassword);

    if (!updated.status) {
      return res.status(500).json({ success: false, message: 'Erro ao atualizar senha.' });
    }

    // Remove token usado
    tokensTemporarios = tokensTemporarios.filter((t) => t !== tokenInfo);

    return res.status(200).json({ success: true, message: 'Senha redefinida com sucesso.' });
  }

  // Cadastro de novo usuário
  async create(req, res) {
    try {
      const { name, email, phone, password, lifestyle_id, experience_level_id, allergy_ids } = req.body;

      if (!name || !email || !phone || !password) {
        return res.status(400).json({ success: false, message: 'Campos obrigatórios não enviados!' });
      }

      // Criptografa senha antes de salvar
      const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

      // Insere usuário no banco
      const [user_id] = await knex('usuarios').insert({
        nome: name,
        email,
        telefone: phone,
        senha: hashedPassword,
        estilo_vida_id: lifestyle_id,
        nivel_experiencia_id: experience_level_id
      });

      // Registra alergias, se houver
      if (Array.isArray(allergy_ids) && allergy_ids.length > 0) {
        const userAllergies = allergy_ids.map((ingredient_id) => ({ user_id, ingredient_id }));
        await knex('user_allergies').insert(userAllergies);
      }

      return res.status(201).json({
        success: true,
        message: 'Usuário cadastrado com sucesso!',
        user_id
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erro interno ao cadastrar usuário', error: err });
    }
  }

  // Lista todos os usuários
  async findAll(req, res) {
    const dadosUsuario = await Usuarios.findAll();
    return dadosUsuario.status
      ? res.status(200).json({ success: true, values: dadosUsuario.values })
      : res.status(404).json({ success: false, message: dadosUsuario.err });
  }

  // Busca usuário por ID
  async findById(req, res) {
    if (isNaN(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Parâmetro ID inválido' });
    }

    const dadosUsuario = await Usuarios.findById(req.params.id);
    if (dadosUsuario.status === undefined) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    return dadosUsuario.status
      ? res.status(200).json({ success: true, values: dadosUsuario.values })
      : res.status(404).json({ success: false, message: dadosUsuario.err });
  }

  // Remove usuário por ID
  async remove(req, res) {
    if (isNaN(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const result = await Usuarios.delete(req.params.id);
    return result.status
      ? res.status(200).json({ success: true, message: result.message })
      : res.status(400).json({ success: false, message: result.err });
  }

  // Atualiza nome e/ou senha do usuário
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

  // Retorna perfil detalhado do usuário
  async getPerfilDetalhado(req, res) {
    const { id } = req.params;
    const result = await Usuarios.getUserProfileDetalhado(id);

    if (!result.status) {
      return res.status(404).json({ message: result.message || 'Erro ao buscar perfil.' });
    }

    return res.json(result.values);
  }

  // Atualiza perfil do usuário
  async updateProfile(req, res) {
    const { id } = req.params;
    const { nome, telefone, estilo_vida_id, nivel_experiencia_id } = req.body;

    try {
      await knex('usuarios').where({ id }).update({
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

// Exporta a instância da classe para uso nas rotas
module.exports = new UsuariosController();
