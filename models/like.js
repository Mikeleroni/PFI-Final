import Model from './model.js';
import UserModel from './user.js';
import Repository from '../models/repository.js';

export default class Like extends Model {
    constructor()
    {
        super();
        
        this.addField('photoId', 'string');
        this.addField('userId', 'string');        

        // est-ce que c'est comme ca pour faire une cle combiné ?
        this.setKey("Id");
    }

    bindExtraData(instance) {
        instance = super.bindExtraData(instance);
        let usersRepository = new Repository(new UserModel());
        let user =  usersRepository.get(instance.userId);
        instance.UserName = user.Name;
        return instance;
    }
}