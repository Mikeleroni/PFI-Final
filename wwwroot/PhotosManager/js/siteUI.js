//<span class="cmdIcon fa-solid fa-ellipsis-vertical"></span>
let contentScrollPosition = 0;
let sortType = "date";
let keywords = "";
let loginMessage = "";
let Email = "";
let EmailError = "";
let passwordError = "";
let currentETag = "";
let currentViewName = "photosList";
let delayTimeOut = 200; // seconds

// pour la pagination
let photoContainerWidth = 400;
let photoContainerHeight = 400;
let limit;
let HorizontalPhotosCount;
let VerticalPhotosCount;
let offset = 0;


// 
let canRefresh=true;
let idIntervalle = null;

let selected='';

let funcs = {
    '*' : renderPhotosList,
    'm' : sortByConnectedUser,
    'd' : sortByDate,
    'w' : sortByOwner
};

Init_UI();

function Init_UI() {
    getViewPortPhotosRanges();
    initTimeout(delayTimeOut, renderExpiredSession);
    installWindowResizeHandler();
    if (API.retrieveLoggedUser()) {
        renderPhotos();
        startUpdates();
    }
    else
        renderLoginForm();
}


///// refresh
async function checkForPhotoUpdates() {
    const photosEtag = await API.GetPhotosETag();
    
    if(photosEtag) {
        if(currentETag=="") {
            currentETag = photosEtag;
        } else if (photosEtag !== currentETag) {
            currentETag = photosEtag;
            if(canRefresh) {
                funcs[selected]();
            } 
        }
    }
}

function startUpdates() {
    console.log('debut');
    idIntervalle = setInterval(checkForPhotoUpdates, 2000);
}

function stopUpdates () {
    clearInterval(idIntervalle);
    console.log('arret');
}


// pour la pagination
function getViewPortPhotosRanges() {
    // estimate the value of limit according to height of content
    VerticalPhotosCount = Math.round($("#content").innerHeight() / photoContainerHeight);
    HorizontalPhotosCount = Math.round($("#content").innerWidth() / photoContainerWidth);
    limit = (VerticalPhotosCount + 1) * HorizontalPhotosCount;
    console.log("VerticalPhotosCount:", VerticalPhotosCount, "HorizontalPhotosCount:", HorizontalPhotosCount)
    offset = 0;
}
// pour la pagination
function installWindowResizeHandler() {
    var resizeTimer = null;
    var resizeEndTriggerDelai = 250;
    $(window).on('resize', function (e) {
        if (!resizeTimer) {
            $(window).trigger('resizestart');
        }
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            resizeTimer = null;
            $(window).trigger('resizeend');
        }, resizeEndTriggerDelai);
    }).on('resizestart', function () {
        console.log('resize start');
    }).on('resizeend', function () {
        console.log('resize end');
        if ($('#photosLayout') != null) {
            getViewPortPhotosRanges();
            if (currentViewName == "photosList")
                renderPhotosList();
        }
    });
}
function attachCmd() {
    $('#loginCmd').on('click', renderLoginForm);
    $('#logoutCmd').on('click', logout);
    $('#listPhotosCmd').on('click', renderPhotos);
    $('#listPhotosMenuCmd').on('click', renderPhotos);
    $('#editProfilMenuCmd').on('click', renderEditProfilForm);
    $('#renderManageUsersMenuCmd').on('click', renderManageUsers);
    $('#editProfilCmd').on('click', renderEditProfilForm);
    $('#aboutCmd').on("click", renderAbout);
    $('#newPhotoCmd').on("click", renderAddPhotoForm);
    $('#ownerOnlyCmd').on('click', sortByConnectedUser);
    $("#sortByDateCmd").on('click', sortByDate);
    $("#sortByOwnersCmd").on('click', sortByOwner);
    // $("#sortingFilters").on('click',assignCheck)
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Header management
function loggedUserMenu(viewName) {
    let loggedUser = API.retrieveLoggedUser();
    if (loggedUser) {
        let manageUserMenu = `
            <span class="dropdown-item" id="renderManageUsersMenuCmd">
                <i class="menuIcon fas fa-user-cog mx-2"></i> Gestion des usagers
            </span>
            <div class="dropdown-divider"></div>
        `;
        return `
            ${loggedUser.isAdmin ? manageUserMenu : ""}
            <span class="dropdown-item" id="logoutCmd">
                <i class="menuIcon fa fa-sign-out mx-2"></i> Déconnexion
            </span>
            <span class="dropdown-item" id="editProfilMenuCmd">
                <i class="menuIcon fa fa-user-edit mx-2"></i> Modifier votre profil
            </span>
            <div class="dropdown-divider"></div>
            <span class="dropdown-item" id="listPhotosMenuCmd">
                <i class="menuIcon fa fa-image mx-2"></i> Liste des photos
            </span>
            ${viewMenu(viewName)}
            
        `;
    }
    else
        return `
            <span class="dropdown-item" id="loginCmd">
                <i class="menuIcon fa fa-sign-in mx-2"></i> Connexion
            </span>`;
}
function viewMenu(viewName) {
    console.log(viewName);
    if (viewName == "photosList") {
        return `
        <div class="dropdown-divider"></div>
        <span id=sortingFilters>
            <span class="dropdown-item" id="sortByDateCmd">
                ${selected == 'd' ? `<i class="menuIcon fa fa-check mx-2"></i>` : '<i class="menuIcon fa fa-fw mx-2"></i>'}
                <i class="menuIcon fa fa-calendar mx-2"></i>
                Photos par date de création
            </span>
            <span class="dropdown-item" id="sortByOwnersCmd">
                ${selected == 'w' ? `<i class="menuIcon fa fa-check mx-2"></i>` : '<i class="menuIcon fa fa-fw mx-2"></i>'}
                <i class="menuIcon fa fa-users mx-2"></i>
                Photos par créateur
            </span>
            <span class="dropdown-item" id="sortByLikesCmd">
                ${selected == 'l' ? `<i class="menuIcon fa fa-check mx-2"></i>` : '<i class="menuIcon fa fa-fw mx-2"></i>'}
                <i class="menuIcon fa fa-user mx-2"></i>
                Photos les plus aimées
            </span>
            <span class="dropdown-item" id="ownerOnlyCmd">
                ${selected == 'm' ? `<i class="menuIcon fa fa-check mx-2"></i>` : '<i class="menuIcon fa fa-fw mx-2"></i>'}
                <i class="menuIcon fa fa-user mx-2"></i>
                Mes photos
            </span>
        </span>
        `;
    }
    else
        return "";
}
function connectedUserAvatar() {
    let loggedUser = API.retrieveLoggedUser();
    if (loggedUser)
        return `
            <div class="UserAvatarSmall" userId="${loggedUser.Id}" id="editProfilCmd" style="background-image:url('${loggedUser.Avatar}')" title="${loggedUser.Name}"></div>
        `;
    return "";
}
function refreshHeader() {
    UpdateHeader(currentViewTitle, currentViewName);
}
function UpdateHeader(viewTitle, viewName) {
    currentViewTitle = viewTitle;
    currentViewName = viewName;
    $("#header").empty();
    $("#header").append(`
        <span title="Liste des photos" id="listPhotosCmd"><img src="images/PhotoCloudLogo.png" class="appLogo"></span>
        <span class="viewTitle">${viewTitle} 
            <div class="cmdIcon fa fa-plus" id="newPhotoCmd" title="Ajouter une photo"></div>
        </span>

        <div class="headerMenusContainer">
            <span>&nbsp</span> <!--filler-->
            <i title="Modifier votre profil"> ${connectedUserAvatar()} </i>         
            <div class="dropdown ms-auto dropdownLayout">
                <div data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="cmdIcon fa fa-ellipsis-vertical"></i>
                </div>
                <div class="dropdown-menu noselect">
                    ${loggedUserMenu(viewName)}

                    
                    <div class="dropdown-divider"></div>
                    <span class="dropdown-item" id="aboutCmd">
                        <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
                    </span>
                </div>
            </div>

        </div>
    `);
    if (sortType == "keywords" && viewName == "photosList") {
        $("#customHeader").show();
        $("#customHeader").empty();
        $("#customHeader").append(`
            <div class="searchContainer">
                <input type="search" class="form-control" placeholder="Recherche par mots-clés" id="keywords" value="${keywords}"/>
                <i class="cmdIcon fa fa-search" id="setSearchKeywordsCmd"></i>
            </div>
        `);
    } else {
        $("#customHeader").hide();
    }
    attachCmd();
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Actions and command
async function login(credential) {
    console.log("login");
    loginMessage = "";
    EmailError = "";
    passwordError = "";
    Email = credential.Email;
    await API.login(credential.Email, credential.Password);
    if (API.error) {
        switch (API.currentStatus) {
            case 482: passwordError = "Mot de passe incorrect"; renderLoginForm(); break;
            case 481: EmailError = "Courriel introuvable"; renderLoginForm(); break;
            default: renderError("Le serveur ne répond pas"); break;
        }
    } else {
        let loggedUser = API.retrieveLoggedUser();
        if (loggedUser.VerifyCode == 'verified') {
            if (!loggedUser.isBlocked) {
                renderPhotos();
                startUpdates()
            }

            else {
                loginMessage = "Votre compte a été bloqué par l'administrateur";
                logout();
            }
        }
        else
            renderVerify();
    }
}
async function logout() {
    console.log('logout');
    await API.logout();
    stopUpdates();
    renderLoginForm();
}
function isVerified() {
    let loggedUser = API.retrieveLoggedUser();
    return loggedUser.VerifyCode == "verified";
}
async function verify(verifyCode) {
    let loggedUser = API.retrieveLoggedUser();
    if (await API.verifyEmail(loggedUser.Id, verifyCode)) {
        renderPhotos();
    } else {
        renderError("Désolé, votre code de vérification n'est pas valide...");
    }
}
async function editProfil(profil) {
    if (await API.modifyUserProfil(profil)) {
        let loggedUser = API.retrieveLoggedUser();
        if (loggedUser) {
            if (isVerified()) {
                renderPhotos();
            } else
                renderVerify();
        } else
            renderLoginForm();

    } else {
        renderError("Un problème est survenu.");
    }
}
async function createProfil(profil) {
    if (await API.register(profil)) {
        loginMessage = "Votre compte a été créé. Veuillez prendre vos courriels pour réccupérer votre code de vérification qui vous sera demandé lors de votre prochaine connexion."
        renderLoginForm();
    } else {
        renderError("Un problème est survenu.");
    }
}
async function adminDeleteAccount(userId) {
    if (await API.unsubscribeAccount(userId)) {
        renderManageUsers();
    } else {
        renderError("Un problème est survenu.");
    }
}
async function deleteProfil() {
    let loggedUser = API.retrieveLoggedUser();
    if (loggedUser) {
        if (await API.unsubscribeAccount(loggedUser.Id)) {
            loginMessage = "Votre compte a été effacé.";
            logout();
        } else
            renderError("Un problème est survenu.");
    }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Views rendering
function showWaitingGif() {
    eraseContent();
    $("#content").append($("<div class='waitingGifcontainer'><img class='waitingGif' src='images/Loading_icon.gif' /></div>'"));
}
function eraseContent() {
    $("#content").empty();
}
function saveContentScrollPosition() {
    contentScrollPosition = $("#content")[0].scrollTop;
}
function restoreContentScrollPosition() {
    $("#content")[0].scrollTop = contentScrollPosition;
}
async function renderError(message) {
    noTimeout();
    switch (API.currentStatus) {
        case 401:
        case 403:
        case 405:
            message = "Accès refusé...Expiration de votre session. Veuillez vous reconnecter.";
            await API.logout();
            renderLoginForm();
            break;
        case 404: message = "Ressource introuvable..."; break;
        case 409: message = "Ressource conflictuelle..."; break;
        default: if (!message) message = "Un problème est survenu...";
    }
    saveContentScrollPosition();
    eraseContent();
    UpdateHeader("Problème", "error");
    $("#newPhotoCmd").hide();
    let loggedUser = API.retrieveLoggedUser();
    $("#content").append(
        $(`
            <div class="errorContainer">
                <b>${message}</b>
            </div>
            <hr>
            ${loggedUser ? `
            <div class="form">
                <button id="indexCmd" class="form-control btn-primary">Liste des photos</button>
            </div>` :
                `<div class="form">
                <button id="connectCmd" class="form-control btn-primary">Connexion</button>
             </div>`}
            
        `)
    );
    $('#connectCmd').on('click', renderLoginForm);
    $('#indexCmd').on('click', renderPhotos);
    /* pour debug
     $("#content").append(
        $(`
            <div class="errorContainer">
                <b>${message}</b>
            </div>
            <hr>
            <div class="systemErrorContainer">
                <b>Message du serveur</b> : <br>
                ${API.currentHttpError} <br>

                <b>Status Http</b> :
                ${API.currentStatus}
            </div>
        `)
    ); */
}
function renderAbout() {
    canRefresh=false;
    timeout();
    saveContentScrollPosition();
    eraseContent();
    UpdateHeader("À propos...", "about");
    $("#newPhotoCmd").hide();
    $("#createContact").hide();
    $("#abort").show();
    $("#content").append(
        $(`
            <div class="aboutContainer">
                <h2>Gestionnaire de photos</h2>
                <hr>
                <p>
                    Petite application de gestion de photos multiusagers à titre de démonstration
                    d'interface utilisateur monopage réactive.
                </p>
                <p>
                    Auteur: vos noms d'équipiers
                </p>
                <p>
                    Collège Lionel-Groulx, automne 2023
                </p>
            </div>
        `))
}
async function renderPhotos() {
    timeout();
    showWaitingGif();
    UpdateHeader('Liste des photos', 'photosList')
    $("#newPhotoCmd").show();
    $("#abort").hide();
    let loggedUser = API.retrieveLoggedUser();
    if (loggedUser) {
        renderPhotosList();
    }
    else {
        renderLoginForm();
    }
}

function renderPhoto(photo, likes) {
    let loggedUser = API.retrieveLoggedUser();
    let isAdmin = loggedUser.Authorizations.writeAccess == 2;

    return `
        <div class="photoLayout" role=button>
                <div class=photoLayoutNoScrollSnap>
                    <div class=photoTitleContainer photoId=${photo.Id}>
                        <div class=photoTitle style=padding:5px; title="${photo.Title}">${photo.Title}</div>
                    ${(photo.OwnerId == loggedUser.Id) || isAdmin ? `
                    <i title=Modifier class="fa-solid fa-pencil cmdIconSmall" style=margin-right:5px;></i> 
                    <i title=Supprimer class="fa-solid fa-trash cmdIconSmall" style=margin-right:5px;></i>`:''}                
                </div>
                <div id='${photo.Id}' class=photoImage style=background-image:url("${photo.Image}")>
                    <div title="${photo.Owner.Name}" class=UserAvatarSmall style=background-image:url("${photo.Owner.Avatar}");></div>
                    ${(photo.OwnerId == loggedUser.Id) && photo.Shared ? `
                    <div title="Partagée" class=UserAvatarSmall style=background-image:url("images/shared.png");background-color:rgba(0,0,0,.5);background-color:white></div>`:''}  
                </div>
                <div class=photoCreationDate>
                    <span style=padding-left:5px;>${secondsToDateString(photo.Date)}</span>
                    <div class='likesSummary' idPub="${photo.Id}">
                        <div>${likes ? likes : '0'}</div>
                        <i class="fa-regular fa-thumbs-up cmdIconSmall like" idPub="${photo.Id}"></i>
                    </div>
                </div>
            </div>
        </div>
        `;
}

async function renderPhotosList(sortedPhotos=null) {
    timeout();
    eraseContent();
    UpdateHeader('Liste des photos', 'photosList');
    canRefresh=true;
    
    let photos;
    if(sortedPhotos && Array.isArray(sortedPhotos)) 
        photos = sortedPhotos;
    else {
        photos = await API.GetPhotos(`?limit=${limit}&offset=${offset}`); 
        photos = photos.data;    
        selected = '*'
    }

    
    
    // je fais les boutons pour modifier pour tester...
    
    console.log(photos);
    let html = '<div class=photosLayout>';
    
    // voir si le loggedUser est admin
    let likesNumber = await API.getLikes();
    likesNumber = likesNumber.data;

    console.log(likesNumber);

    if(photos.length > 1) {
        photos.forEach((photo) => {
            html += renderPhoto(photo,likesNumber[photo.Id]);
        });
    } else {
        html += renderPhoto(photos[0]);
    }

    html += '</div>';

    $("#content").append(html);
    $(".fa-pencil").on("click",function(event){
        let photoId = $(event.currentTarget).parent().attr('photoId');
        console.log(photoId);
        renderEditPhotoForm(photoId);
    });
    $('.fa-trash').on("click",function(event){
        let photoId = $(event.currentTarget).parent().attr('photoId');
        console.log(photoId);
        renderConfirmDeletePhoto(photoId);
    })
    $(".modifyBtn").on("click", function (event) {
        let idPhoto = event.currentTarget.id;
        console.log(idPhoto);
        renderEditPhotoForm(idPhoto);
    });

    renderDetail();

    like();
}
function renderVerify() {
    eraseContent();
    UpdateHeader("Vérification", "verify");
    $("#newPhotoCmd").hide();
    $("#content").append(`
        <div class="content">
            <form class="form" id="verifyForm">
                <b>Veuillez entrer le code de vérification de que vous avez reçu par courriel</b>
                <input  type='text' 
                        name='Code'
                        class="form-control"
                        required
                        RequireMessage = 'Veuillez entrer le code que vous avez reçu par courriel'
                        InvalidMessage = 'Courriel invalide';
                        placeholder="Code de vérification de courriel" > 
                <input type='submit' name='submit' value="Vérifier" class="form-control btn-primary">
            </form>
        </div>
    `);
    initFormValidation(); // important do to after all html injection!
    $('#verifyForm').on("submit", function (event) {
        let verifyForm = getFormData($('#verifyForm'));
        event.preventDefault();
        showWaitingGif();
        verify(verifyForm.Code);
    });
}
function renderCreateProfil() {
    noTimeout();
    eraseContent();
    UpdateHeader("Inscription", "createProfil");
    $("#newPhotoCmd").hide();
    $("#content").append(`
        <br/>
        <form class="form" id="createProfilForm"'>
            <fieldset>
                <legend>Adresse ce courriel</legend>
                <input  type="email" 
                        class="form-control Email" 
                        name="Email" 
                        id="Email"
                        placeholder="Courriel" 
                        required 
                        RequireMessage = 'Veuillez entrer votre courriel'
                        InvalidMessage = 'Courriel invalide'
                        CustomErrorMessage ="Ce courriel est déjà utilisé"/>

                <input  class="form-control MatchedInput" 
                        type="text" 
                        matchedInputId="Email"
                        name="matchedEmail" 
                        id="matchedEmail" 
                        placeholder="Vérification" 
                        required
                        RequireMessage = 'Veuillez entrez de nouveau votre courriel'
                        InvalidMessage="Les courriels ne correspondent pas" />
            </fieldset>
            <fieldset>
                <legend>Mot de passe</legend>
                <input  type="password" 
                        class="form-control" 
                        name="Password" 
                        id="Password"
                        placeholder="Mot de passe" 
                        required 
                        RequireMessage = 'Veuillez entrer un mot de passe'
                        InvalidMessage = 'Mot de passe trop court'/>

                <input  class="form-control MatchedInput" 
                        type="password" 
                        matchedInputId="Password"
                        name="matchedPassword" 
                        id="matchedPassword" 
                        placeholder="Vérification" required
                        InvalidMessage="Ne correspond pas au mot de passe" />
            </fieldset>
            <fieldset>
                <legend>Nom</legend>
                <input  type="text" 
                        class="form-control Alpha" 
                        name="Name" 
                        id="Name"
                        placeholder="Nom" 
                        required 
                        RequireMessage = 'Veuillez entrer votre nom'
                        InvalidMessage = 'Nom invalide'/>
            </fieldset>
            <fieldset>
                <legend>Avatar</legend>
                <div class='imageUploader' 
                        newImage='true' 
                        controlId='Avatar' 
                        imageSrc='images/no-avatar.png' 
                        waitingImage="images/Loading_icon.gif">
            </div>
            </fieldset>
   
            <input type='submit' name='submit' id='saveUser' value="Enregistrer" class="form-control btn-primary">
        </form>
        <div class="cancel">
            <button class="form-control btn-secondary" id="abortCreateProfilCmd">Annuler</button>
        </div>
    `);
    $('#loginCmd').on('click', renderLoginForm);
    initFormValidation(); // important do to after all html injection!
    initImageUploaders();
    $('#abortCreateProfilCmd').on('click', renderLoginForm);
    addConflictValidation(API.checkConflictURL(), 'Email', 'saveUser');
    $('#createProfilForm').on("submit", function (event) {
        let profil = getFormData($('#createProfilForm'));
        delete profil.matchedPassword;
        delete profil.matchedEmail;
        event.preventDefault();
        showWaitingGif();
        createProfil(profil);
    });
}
async function renderManageUsers() {
    timeout();
    canRefresh=false;
    let loggedUser = API.retrieveLoggedUser();
    if (loggedUser.isAdmin) {
        if (isVerified()) {
            showWaitingGif();
            UpdateHeader('Gestion des usagers', 'manageUsers')
            $("#newPhotoCmd").hide();
            $("#abort").hide();
            let users = await API.GetAccounts();
            if (API.error) {
                renderError();
            } else {
                $("#content").empty();
                users.data.forEach(user => {
                    if (user.Id != loggedUser.Id) {
                        let typeIcon = user.Authorizations.readAccess == 2 ? "fas fa-user-cog" : "fas fa-user-alt";
                        typeTitle = user.Authorizations.readAccess == 2 ? "Retirer le droit administrateur à" : "Octroyer le droit administrateur à";
                        let blockedClass = user.Authorizations.readAccess == -1 ? "class=' blockUserCmd cmdIconVisible fa fa-ban redCmd'" : "class='blockUserCmd cmdIconVisible fa-regular fa-circle greenCmd'";
                        let blockedTitle = user.Authorizations.readAccess == -1 ? "Débloquer $name" : "Bloquer $name";
                        let userRow = `
                        <div class="UserRow"">
                            <div class="UserContainer noselect">
                                <div class="UserLayout">
                                    <div class="UserAvatar" style="background-image:url('${user.Avatar}')"></div>
                                    <div class="UserInfo">
                                        <span class="UserName">${user.Name}</span>
                                        <a href="mailto:${user.Email}" class="UserEmail" target="_blank" >${user.Email}</a>
                                    </div>
                                </div>
                                <div class="UserCommandPanel">
                                    <span class="promoteUserCmd cmdIconVisible ${typeIcon} dodgerblueCmd" title="${typeTitle} ${user.Name}" userId="${user.Id}"></span>
                                    <span ${blockedClass} title="${blockedTitle}" userId="${user.Id}" ></span>
                                    <span class="removeUserCmd cmdIconVisible fas fa-user-slash goldenrodCmd" title="Effacer ${user.Name}" userId="${user.Id}"></span>
                                </div>
                            </div>
                        </div>           
                        `;
                        $("#content").append(userRow);
                    }
                });
                $(".promoteUserCmd").on("click", async function () {
                    let userId = $(this).attr("userId");
                    await API.PromoteUser(userId);
                    renderManageUsers();
                });
                $(".blockUserCmd").on("click", async function () {
                    let userId = $(this).attr("userId");
                    await API.BlockUser(userId);
                    renderManageUsers();
                });
                $(".removeUserCmd").on("click", function () {
                    let userId = $(this).attr("userId");
                    renderConfirmDeleteAccount(userId);
                });
            }
        } else
            renderVerify();
    } else
        renderLoginForm();
}
async function renderConfirmDeleteAccount(userId) {
    timeout();
    let loggedUser = API.retrieveLoggedUser();
    if (loggedUser) {
        let userToDelete = (await API.GetAccount(userId)).data;
        if (!API.error) {
            eraseContent();
            UpdateHeader("Retrait de compte", "confirmDeleteAccoun");
            $("#newPhotoCmd").hide();
            $("#content").append(`
                <div class="content loginForm">
                    <br>
                    <div class="form UserRow ">
                        <h4> Voulez-vous vraiment effacer cet usager et toutes ses photos? </h4>
                        <div class="UserContainer noselect">
                            <div class="UserLayout">
                                <div class="UserAvatar" style="background-image:url('${userToDelete.Avatar}')"></div>
                                <div class="UserInfo">
                                    <span class="UserName">${userToDelete.Name}</span>
                                    <a href="mailto:${userToDelete.Email}" class="UserEmail" target="_blank" >${userToDelete.Email}</a>
                                </div>
                            </div>
                        </div>
                    </div>           
                    <div class="form">
                        <button class="form-control btn-danger" id="deleteAccountCmd">Effacer</button>
                        <br>
                        <button class="form-control btn-secondary" id="abortDeleteAccountCmd">Annuler</button>
                    </div>
                </div>
            `);
            $("#deleteAccountCmd").on("click", function () {
                adminDeleteAccount(userToDelete.Id);
            });
            $("#abortDeleteAccountCmd").on("click", renderManageUsers);
        } else {
            renderError("Une erreur est survenue");
        }
    }
}
function renderEditProfilForm() {
    canRefresh=false;
    timeout();
    let loggedUser = API.retrieveLoggedUser();
    if (loggedUser) {
        eraseContent();
        UpdateHeader("Profil", "editProfil");
        $("#newPhotoCmd").hide();
        $("#content").append(`
            <br/>
            <form class="form" id="editProfilForm"'>
                <input type="hidden" name="Id" id="Id" value="${loggedUser.Id}"/>
                <fieldset>
                    <legend>Adresse ce courriel</legend>
                    <input  type="email" 
                            class="form-control Email" 
                            name="Email" 
                            id="Email"
                            placeholder="Courriel" 
                            required 
                            RequireMessage = 'Veuillez entrer votre courriel'
                            InvalidMessage = 'Courriel invalide'
                            CustomErrorMessage ="Ce courriel est déjà utilisé"
                            value="${loggedUser.Email}" >

                    <input  class="form-control MatchedInput" 
                            type="text" 
                            matchedInputId="Email"
                            name="matchedEmail" 
                            id="matchedEmail" 
                            placeholder="Vérification" 
                            required
                            RequireMessage = 'Veuillez entrez de nouveau votre courriel'
                            InvalidMessage="Les courriels ne correspondent pas" 
                            value="${loggedUser.Email}" >
                </fieldset>
                <fieldset>
                    <legend>Mot de passe</legend>
                    <input  type="password" 
                            class="form-control" 
                            name="Password" 
                            id="Password"
                            placeholder="Mot de passe" 
                            InvalidMessage = 'Mot de passe trop court' >

                    <input  class="form-control MatchedInput" 
                            type="password" 
                            matchedInputId="Password"
                            name="matchedPassword" 
                            id="matchedPassword" 
                            placeholder="Vérification" 
                            InvalidMessage="Ne correspond pas au mot de passe" >
                </fieldset>
                <fieldset>
                    <legend>Nom</legend>
                    <input  type="text" 
                            class="form-control Alpha" 
                            name="Name" 
                            id="Name"
                            placeholder="Nom" 
                            required 
                            RequireMessage = 'Veuillez entrer votre nom'
                            InvalidMessage = 'Nom invalide'
                            value="${loggedUser.Name}" >
                </fieldset>
                <fieldset>
                    <legend>Avatar</legend>
                    <div class='imageUploader' 
                            newImage='false' 
                            controlId='Avatar' 
                            imageSrc='${loggedUser.Avatar}' 
                            waitingImage="images/Loading_icon.gif">
                </div>
                </fieldset>

                <input type='submit' name='submit' id='saveUser' value="Enregistrer" class="form-control btn-primary">
                
            </form>
            <div class="cancel">
                <button class="form-control btn-secondary" id="abortEditProfilCmd">Annuler</button>
            </div>

            <div class="cancel">
                <hr>
                <button class="form-control btn-warning" id="confirmDelelteProfilCMD">Effacer le compte</button>
            </div>
        `);
        initFormValidation(); // important do to after all html injection!
        initImageUploaders();
        addConflictValidation(API.checkConflictURL(), 'Email', 'saveUser');
        $('#abortEditProfilCmd').on('click', renderPhotos);
        $('#confirmDelelteProfilCMD').on('click', renderConfirmDeleteProfil);
        $('#editProfilForm').on("submit", function (event) {
            let profil = getFormData($('#editProfilForm'));
            delete profil.matchedPassword;
            delete profil.matchedEmail;
            event.preventDefault();
            showWaitingGif();
            editProfil(profil);
        });
    }   
}
function renderConfirmDeleteProfil() {
    timeout();
    let loggedUser = API.retrieveLoggedUser();
    if (loggedUser) {
        eraseContent();
        UpdateHeader("Retrait de compte", "confirmDeleteProfil");
        $("#newPhotoCmd").hide();
        $("#content").append(`
            <div class="content loginForm">
                <br>
                
                <div class="form">
                 <h3> Voulez-vous vraiment effacer votre compte? </h3>
                    <button class="form-control btn-danger" id="deleteProfilCmd">Effacer mon compte</button>
                    <br>
                    <button class="form-control btn-secondary" id="cancelDeleteProfilCmd">Annuler</button>
                </div>
            </div>
        `);
        $("#deleteProfilCmd").on("click", deleteProfil);
        $('#cancelDeleteProfilCmd').on('click', renderEditProfilForm);
    }
}
function renderExpiredSession() {
    noTimeout();
    loginMessage = "Votre session est expirée. Veuillez vous reconnecter.";
    logout();
    renderLoginForm();
}
function renderLoginForm() {
    noTimeout();
    eraseContent();
    UpdateHeader("Connexion", "Login");
    $("#newPhotoCmd").hide();
    $("#content").append(`
        <div class="content" style="text-align:center">
            <div class="loginMessage">${loginMessage}</div>
            <form class="form" id="loginForm">
                <input  type='email' 
                        name='Email'
                        class="form-control"
                        required
                        RequireMessage = 'Veuillez entrer votre courriel'
                        InvalidMessage = 'Courriel invalide'
                        placeholder="adresse de courriel"
                        value='${Email}'> 
                <span style='color:red'>${EmailError}</span>
                <input  type='password' 
                        name='Password' 
                        placeholder='Mot de passe'
                        class="form-control"
                        required
                        RequireMessage = 'Veuillez entrer votre mot de passe'
                        InvalidMessage = 'Mot de passe trop court' >
                <span style='color:red'>${passwordError}</span>
                <input type='submit' name='submit' value="Entrer" class="form-control btn-primary">
            </form>
            <div class="form">
                <hr>
                <button class="form-control btn-info" id="createProfilCmd">Nouveau compte</button>
            </div>
        </div>
    `);
    initFormValidation(); // important do to after all html injection!
    $('#createProfilCmd').on('click', renderCreateProfil);
    $('#loginForm').on("submit", function (event) {
        let credential = getFormData($('#loginForm'));
        event.preventDefault();
        showWaitingGif();
        login(credential);
    });
}
function getFormData($form) {
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    console.log($form.serializeArray());
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}

///////////// Partie B PFI //////////////
function renderAddPhotoForm() {
    timeout();
    eraseContent();
    canRefresh=false;
    UpdateHeader("Ajout de photos", 'addPhoto');
    $("#newPhotoCmd").hide();
    let loggedUser = API.retrieveLoggedUser();
    $('#content').append(`
        <br/>
        <form class="form" id="addPhotoForm">
            <input type=hidden name=OwnerId value=${loggedUser.Id} />
            <fieldset>
                <legend>Informations</legend>
                <input  type="text" 
                        class="form-control " 
                        name="Title" 
                        id="Title"
                        placeholder="Titre" 
                        required 
                        RequireMessage = 'Veuillez entrer votre titre'
                        InvalidMessage = 'Titre invalide'
                        >

                <textarea id=Description 
                          class=form-control
                          name=Description
                          rows=5
                          cols=30
                          placeholder=Description
                          RequireMessage = 'Veuillez entrer votre description'
                          InvalidMessage = 'Description invalide'
                          required 

                ></textarea>
                <div class="d-flex align-items-center">
                    <input class="mt-0 mb-0" type=checkbox name=Shared id=Shared />
                    <label class=noselect style="margin-top:19px;margin-bottom:10px;margin-left:5px;" for=Shared>Partagée</label>
                </div>
            </fieldset>

            <fieldset>
                <legend>Image</legend>
                <div class='imageUploader' 
                        id='0'
                        controlId='Image' 
                        imageSrc='images/PhotoCloudLogo.png' 
                        waitingImage="images/Loading_icon.gif">
                </div>                
            </fieldset>
            <span id=errorImage class="errorContainer p-0 d-flex justify-content-center"></span>
            <span class="field-validation-valid text-danger" data-valmsg-for="Image" data-valmsg-replace="true"></span>
            <input type='submit' name='submit' id='savePhoto' value="Enregistrer" class="form-control btn-primary">
            
        </form>

        <div class="cancel">
            <button class="form-control btn-secondary" id="abortAddPhotoCmd">Annuler</button>
        </div>

    `);
    initImageUploaders();
    // 
    initFormValidation();
    // je ne pense pas qu'on doit checker si le title est pris... 
    // addConflictValidation(API.checkConflictURL(), 'Title', 'savePhoto');
    $("#abortAddPhotoCmd").click(() => renderPhotosList());
    $("#addPhotoForm").on('submit', function (event) {
        let photo = getFormData($('#addPhotoForm'));
        event.preventDefault();

        console.log(photo);

        if (photo.Image.trim() == '')
            $("#errorImage").text(`Veuillez ajouter une image`);
        else {
            showWaitingGif();
            addPhoto(photo);
        }
    })
}

async function renderEditPhotoForm(photoId) {
    timeout();
    eraseContent();
    UpdateHeader("Modification de photo", 'modifyPhoto');
    $("#newPhotoCmd").hide();
    let loggedUser = await API.retrieveLoggedUser();
    let photo = await API.GetPhotosById(photoId);
    let isAdmin = loggedUser.Authorizations.writeAccess == 2;
    console.log(photo.OwnerId, loggedUser.Id);
    if ((photo.OwnerId == loggedUser.Id) || isAdmin) {
        $('#content').append(`
            <br/>
            <form class="form" id="editPhotoForm">
                <input type=hidden name=OwnerId value="${photo.OwnerId}" />
                <input type=hidden name=Id value="${photo.Id}" />
                <fieldset>
                    <legend>Informations</legend>
                    <input  type="text" 
                            class="form-control " 
                            name="Title" 
                            id="Title"
                            placeholder="Titre" 
                            required 
                            RequireMessage = 'Veuillez entrer votre titre'
                            InvalidMessage = 'Titre invalide'
                            value = "${photo.Title}"
                            >
    
                    <textarea id=Description 
                              class=form-control
                              name=Description
                              rows=5
                              cols=30
                              placeholder=Description
                              RequireMessage = 'Veuillez entrer votre description'
                              InvalidMessage = 'Description invalide'
                              required 
    
                    >${photo.Description}</textarea>
                    <div class="d-flex align-items-center">
                        <input class="mt-0 mb-0" type=checkbox name=Shared id=Shared 
                        ${photo.Shared ? 'checked' : ''} />
                        <label class=noselect style="margin-top:19px;margin-bottom:10px;margin-left:5px;" for=Shared>Partagée</label>
                    </div>
                </fieldset>
    
                <fieldset>
                    <legend>Image</legend>
                    <div class='imageUploader'
                            required 
                            newImage='true' 
                            controlId='Image' 
                            imageSrc='${photo.Image}' 
                            waitingImage="images/Loading_icon.gif">
                    </div>                
                </fieldset>
                <span id=errorImage class="errorContainer p-0 d-flex justify-content-center"></span>
    
                <input type='submit' name='submit' id='savePhoto' value="Enregistrer" class="form-control btn-primary">
                
            </form>
    
            <div class="cancel">
                <button class="form-control btn-secondary" id="abortEditPhotoCmd">Annuler</button>
            </div>
    
        `);
        initImageUploaders();
        // 
        initFormValidation();
        // je ne pense pas qu'on doit checker si le title est pris... 
        // addConflictValidation(API.checkConflictURL(), 'Title', 'savePhoto');
        $("#abortEditPhotoCmd").click(() => renderPhotosList());
        $("#editPhotoForm").on('submit', function (event) {
            let photo = getFormData($('#editPhotoForm'));
            event.preventDefault();

            console.log(photo);

            showWaitingGif();
            editPhoto(photo);

        })
    } else {
        renderError("Vous n'avez pas l'autorisation de modifier cette photo.")
    }
}

async function addPhoto(photo) {
    if (await API.CreatePhoto(photo)) {
        renderPhotos();
        
    }
    else {
        renderError('Une erreur est survenu lors du téléversement de votre photo.');
    }
}

async function like() { 
    $(".like").click(async (e) => {
        let id = $(e.target).parent().attr('idPhoto');
        console.log(id);        
        let res = await API.Like(id);

        if (res) {
            console.log(res);

        }
    });
}

function renderDetail() {
    $(".photoImage").click(async (e) => {
        showWaitingGif();
        
        let id = $(e.target).attr('id');
        let photo = await API.GetPhotosById(id);
        let likesNames = await API.getLikes(id);

        
        let Names = '';
        likesNames.data.forEach(element => {
            Names += `${element.Name} \n`
        });

        if(photo) {
            let nbLikes = likesNames.data.length;
            const owner = photo.Owner;
            UpdateHeader("Détails","DetailPhoto");
            $("#newPhotoCmd").hide();
            $("#content").html(`
                <div class='photoDetailsOwner'> 
                    <div title='${owner.Name}' class="UserAvatarSmall" style="background-image:url('${owner.Avatar}');"> 
                    </div> 
                    <div> ${owner.Name} </div>
                </div>
                <hr>
                <div class ='photoDetailsTitle'> 
                    ${photo.Title}
                </div>
                <img class='photoDetailsLargeImage' src='${photo.Image}'>
                <div class='photoCreationDate' style='margin-left:5px;'>
                    ${secondsToDateString(photo.Date)}
                
                    <div class=likesSummary idPhoto='${photo.Id}' title="${Names}">
                            <div>${nbLikes}</div>
                            <i class="fa-regular fa-thumbs-up cmdIconSmall like"></i>
                    </div>
                </div> 

                <div class='photoDetailsDescription'>
                    ${photo.Description}
                </div>
                
            `);
            like();
            // generer les likes

        }
    });
}

async function editPhoto(photo) {
    if (await API.UpdatePhoto(photo)) {
        renderPhotos();
    } else {
        renderError('Une erreur est survenu lors de la modification de votre photo.');
    }
}

function secondsToDateString(dateInSeconds, localizationId = 'fr-FR') {
    const hoursOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    return new Date(dateInSeconds * 1000).toLocaleDateString(localizationId, hoursOptions);
}

async function renderConfirmDeletePhoto(photoId){
    timeout();
    let loggedUser = await API.retrieveLoggedUser();
    let photo = await API.GetPhotosById(photoId);
    if (loggedUser && photo) {
        eraseContent();
        UpdateHeader("Retrait de photo", "confirmDeletePhoto");
        $("#newPhotoCmd").hide();
        $("#content").append(`
            <div class="content">
                <br>                
                <div style="max-width:355px !important;margin:auto;">
                 <h4> Voulez-vous vraiment effacer cette photo? </h4>
                    <div class="photoLayout p-0">
      
                            <div class=photoTitleContainer photoId=${photo.Id}>
                                <div class=photoTitle style=padding:5px; title="${photo.Title}">${photo.Title}</div>                
                            </div>
                            <img class="photoImage" src="${photo.Image}"></img>                
                        
                    </div>
                    <button photoId=${photo.Id} class="form-control btn-danger" id="deletePhotoCmd">Effacer cette photo</button>
                    <br>
                    <button class="form-control btn-secondary" id="cancelDeletePhotoCmd">Annuler</button>
                </div>
            </div>
        `);
        $("#deletePhotoCmd").on("click", deletePhoto);
        $('#cancelDeletePhotoCmd').on('click', renderPhotos);
    } else {
        if(!loggedUser)
            renderError('Vous devez être connecté pour effacer une photo.');
        else if(!photo)
            renderError('Cette photo est introuvable.');
    }
}

async function deletePhoto(event){
    let loggedUser = await API.retrieveLoggedUser();
    let photoId = $(event.currentTarget).attr('photoId');
    if(loggedUser){
        if(await API.DeletePhoto(photoId)) {
            renderPhotos();
        } 
    }
}

// TRI
async function sortByConnectedUser() {
    showWaitingGif();   
    let photos = await API.GetPhotos();
    const logged = API.retrieveLoggedUser();

    if(photos && logged) {

        photos = photos['data'].filter(p => p.OwnerId === logged.Id);
        if(photos.length > 0) {
            console.log(photos);
            selected='m'
            renderPhotosList(photos);
        } else {
            $("#content").html(`
                vous n'avez aucune photo
            `);
        }
        $()
    }
}

async function sortByDate() {
    showWaitingGif();   
    let photos = await API.GetPhotos();
    if(photos) {
        photos = photos['data'];
        photos.sort((a, b) => {
            return b.Date - a.Date; 
        });
        selected='d'
        renderPhotosList(photos);
    }
}

async function sortByOwner (event) {

    let photos = await API.GetPhotos();
    
    if (photos) {
        photos = photos['data'];
        photos.sort((a, b) => {
            if (a.OwnerId < b.OwnerId) {
                return -1;
            }
            if (a.OwnerId > b.OwnerId) {
                return 1;
            }
            return 0;
        });
        selected='w'
        renderPhotosList(photos);
    }
}

// PAGINATION

async function renderPagination(){
    
}