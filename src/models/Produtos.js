const knex = require('../data/connection');

class Produtos{

    async create(descricao){
        try {
            await knex.insert({
                descricao: descricao
            }).table('produtos');

            return {status: true }
        } catch (err) {
            return {status: false, err: err}  
        }
    }

    async findAll(){
        try {
            let produtos = await knex.select(['id','descricao']).table('produtos');
            return {status: true, values: produtos}
        } catch (err) {
            console.log(err)
            return { status: false, err: err }
        }
    }

    async findById(id){
        try {
            let produtos = await knex.select(['id','descricao']).where({id: id}).table('produtos');
            return produtos.length > 0 ? {status: true, values: produtos } : {status: undefined, message: 'Produtos Não existe!'}
        } catch (err) {
            return {status: false, err: err}
        }
    }

    async delete(id){
        let produtos = await this.findById(id)

        if (produtos.status){
            try {
                await knex.delete().where({id:id}).table('produtos')
                return {status: true, message:'Produto Excluido com Sucesso'}
            } catch (err) {
                return {status: false, err: err}
            }
        }else{
            return {status: false, err: 'Produto não existe, portanto não pode ser deletado.'}
        }
    }

    async update(id,descricao){
        let produtos = await this.findById(id)
        if(produtos.status){
            
            let editUser = {}

            descricao != undefined ? editUser.descricao = descricao : null
            try {
                await knex.update(editUser).where({id:id}).table('produtos')
                return ({status: true, message:'Produto editado com sucesso!'})
            } catch (err) {
                return ({status: false, err: err})
            }
        }else{
            return {status: false, err: 'Produto não existe, portanto não pode ser deletado.'}
        }    
    }

}

module.exports = new Produtos();