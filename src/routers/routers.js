const express = require('express');
const router = express.Router();

const UsuariosController = require('../controllers/UsuariosController');
const UserIngredientsController = require('../controllers/UserIngredientsController');
const Auth = require('../middleware/AdminAuth');
const IAController = require('../controllers/IAController')
const EstilosVidaController = require('../controllers/EstilosVidaController');
const NiveisExperienciaController = require('../controllers/NiveisExperienciaController');
const UserAllergiesController = require('../controllers/UserAllergiesController');
const UserRecipeIngredientsController = require('../controllers/UserRecipeIngredientsController');
const UserRecipesController = require('../controllers/UserRecipesController');
const UserRecipeResultsController = require('../controllers/UserRecipeResultsController');
const ReceitasController = require('../controllers/ReceitasController');

// Usuários
router.post('/users/register', UsuariosController.create);
router.post('/login', UsuariosController.login);
router.post('/password/send-token', UsuariosController.recuperarSenha);
router.post('/password/reset', UsuariosController.resetarSenha);
router.get('/users', Auth, UsuariosController.findAll);
router.get('/users/:id', Auth, UsuariosController.findById);
router.put('/users/:id', Auth, UsuariosController.editUser);
router.delete('/users/:id', Auth, UsuariosController.remove);

// Ingredientes
router.post('/ingredientes', UserIngredientsController.adicionar);
router.get('/ingredientes/:user_id', UserIngredientsController.listar);
router.get('/ingredientes', UserIngredientsController.buscarIngredientes);

router.post('/ia/recomendar-receitas', IAController.recomendarReceitas);





// Rota para buscar estilos de vida
router.get('/estilos-vida', EstilosVidaController.listar);

// Rota para buscar níveis de experiência
router.get('/niveis-experiencia', NiveisExperienciaController.listar);

router.post('/usuarios/alergias', UserAllergiesController.addAllergies);


router.post('/user-recipe-ingredients', UserRecipeIngredientsController.adicionarIngredienteNaUserRecipe);
router.post('/user-recipes', UserRecipesController.criarUserRecipe);
router.post('/user-recipe-results', UserRecipeResultsController.salvarResultados);

router.get('/receitas/recomendar/:user_id', IAController.getRecomendacoes);

// routes/ReceitasRoutes.js
router.get('/receitas/autocomplete', ReceitasController.autocomplete);
router.get('/receitas/random', ReceitasController.random);
router.get('/receitas/search', ReceitasController.search); // opcional se quiser usar via buscarReceitas()


router.get('/user_recipes/:userId', UserRecipesController.getUserRecipes);
router.get('/receitas/estilo/:estiloId', ReceitasController.buscarPorEstilo);

router.get('/usuarios/perfil/:id', UsuariosController.getPerfilDetalhado);
router.put('/usuarios/:id', UsuariosController.updateProfile);

router.get('/receitas/com-filtros', ReceitasController.buscarComFiltros);

router.get('/receitas/carnes', ReceitasController.buscarReceitasCarnes);

module.exports = router;
