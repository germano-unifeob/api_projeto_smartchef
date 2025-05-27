require('dotenv').config();
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  console.log('[DEBUG] Middleware Auth executado em:', req.method, req.originalUrl);

  // Ignorar autenticação para a rota de cadastro
  if (req.method === 'POST' && req.originalUrl === '/users/register') {
    return next();
  }

  const authToken = req.headers['authorization'];

  if (authToken !== undefined) {
    const bearer = authToken.split(' ');
    const token = bearer[1];

    try {
      const decoded = jwt.verify(token, process.env.SECRET);
      return decoded.role === 1
        ? next()
        : res.status(403).json({ success: false, message: 'Usuário sem permissão!' });
    } catch (err) {
      return res.status(403).json({ success: false, message: 'Usuário não autenticado!' });
    }
  } else {
    return res.status(403).json({ success: false, message: 'Usuário não autenticado!' });
  }
};
