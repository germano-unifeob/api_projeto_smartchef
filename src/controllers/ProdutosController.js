const Produtos = require('../models/Produtos');

class ProdutosController{

    async create(req,res){
        let {descricao} = req.body;

        if(!descricao){
            return res.status(404).json({
                message: 'Parametro obrigatório!'
            });
        }

        let result = await Produtos.create(descricao);

        result.status
        ? res.status(200).json({sucess: true, message:"Usuário Cadastrado com Sucesso"})
        : res.status(404).json({sucess: false, message: result.err})
    }

    async findAll(req,res){
        let dadosProdutos= await Produtos.findAll();

        dadosProdutos.status
        ? res.status(200).json({sucess: true, values: dadosProdutos.values})
        : res.status(404).json({sucess: false, message: dadosProdutos.err})
    }

    async findById(req,res){
        if(isNaN(req.params.id)){
            return res.status(404).json({
                message: 'Parametro ID obrigatório!'
            });
        }

        let dadosProdutos = await Produtos.findById(req.params.id);

        if (dadosProdutos.status == undefined){
            res.status(406).json({sucess: false, message:"Produto não encontrado"});
        }else if (!dadosProdutos.status){
            res.status(404).json({sucess: false, message: dadosProdutos.err})
        }else{
            res.status(200).json({sucess: true, message:dadosProdutos.values})
        }
        
    }

    async remove(req, res){
        if(isNaN(req.params.id)){
            return res.status(404).json({sucess: false, message:'Parametro Inválido'})
        }

        let result = await Produtos.delete(req.params.id)

        result.status 
        ? res.status(200).json({sucess: result.status, message: result.message})
        : res.status(406).json({sucess: result.status, message: result.err})
    }

    async editProduto(req, res){
        let {descricao} = req.body
        if(isNaN(req.params.id)){
            return res.status(404).json({sucess: false, message:'Parametro Inválido'})
        }

        let result = await Produtos.update(req.params.id, descricao)

        result.status 
        ? res.status(200).json({sucess: result.status, message: result.message})
        : res.status(406).json({sucess: result.status, message: result.err})
    
    }

}

module.exports = new ProdutosController();