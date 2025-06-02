require('dotenv').config();
const api = require('./src/api');

const PORT = process.env.PORT || 3307;

api.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ API rodando em http://localhost:${PORT}`);
    console.log(`🌐 Acesse via IP local: http://192.168.0.108:${PORT}`); // ajuste o IP para o seu real
});