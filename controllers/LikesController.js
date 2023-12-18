import Authorizations from '../authorizations.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';
import LikesModel from "../models/like.js";
import TokensManager from '../tokensManager.js';

export default class Likes extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new LikesModel()));
        //this.photoLikesRepository = new Repository(new PhotoLikeModel());
    }

    // on pourrait utiliser le GET pour get les likes d'une photo

    get(photoId = null) {
        if(photoId) {
            let photoLikes = this.repository.findByFilter((elem)=>elem.photoId==photoId);
            
            let photoLikesNames = photoLikes.map(photo => {
                let inst = this.repository.get(photo.Id);
                return {
                    Name: inst.UserName,
                    Id: inst.Id
                };
            });

            this.HttpContext.response.JSON(photoLikesNames);            
        }
        else{
            let likes = this.repository.getAll();
            let likesNumber = {};

            likes.forEach(like => {
                if(!likesNumber[like.photoId])
                    likesNumber[like.photoId] = 1;
                else
                    likesNumber[like.photoId] = likesNumber[like.photoId] + 1;
            });
            
            this.HttpContext.response.JSON(likesNumber);   
        }
    }

    // Pour like une photo
    post(photoId){

        if(this.repository != null){
            let currentUserToken = TokensManager.find(this.HttpContext.req.headers['authorization'].replace('Bearer ', ''));
            let instanceLiked = this.repository.findByFilter((elem)=>elem.photoId==photoId && elem.userId==currentUserToken.User.Id)[0];
            if(!instanceLiked){                                
                let like = {photoId:photoId,userId:currentUserToken.User.Id} 
                let newLike = this.repository.add(like);

                if(this.repository.model.state.isValid){
                    this.HttpContext.response.created(newLike);
                }else{
                    if (this.repository.model.state.inConflict)
                        this.HttpContext.response.conflict(this.repository.model.state.errors);
                    else
                        this.HttpContext.response.badRequest(this.repository.model.state.errors);
                }
            }
            else{
                super.remove(instanceLiked.Id);
            }
        }else
            this.HttpContext.response.notImplemented();
    }

}