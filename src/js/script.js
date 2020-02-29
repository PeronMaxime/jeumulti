window.addEventListener('load', function(){

  /*****************************************************************
   **************************Class de jeu**************************** 
   *****************************************************************/
  class Game {
    
    constructor(){
      this.modifierLigne = document.getElementById("modifier_ligne");
      
      /****************************************************************
       ***************************VARIABLES**************************** 
        ****************************************************************/
      
      // Variables plateau
      this.tailleBody = document.body.offsetWidth;
      // Variables blocs
      this.nombreBlocLargeur = 10;
      this.nombreBlocHauteur = 7;
      this.tableauBloc = [];
      // Variables joueurs
      this.positionJX = 0;
      this.positionJY = 0;
      this.direction = "";
    }
    
    /*****************************************************************
     ****************************Méthodes****************************** 
      *****************************************************************/
    createElements(){

      // Création du plateau
      this.plateau = document.createElement("div");
      document.body.appendChild(this.plateau);
      this.plateau.style.width = this.tailleBody/2+"px";
      this.plateau.style.height = this.plateau.offsetWidth*0.7-7+"px";
      this.plateau.style.display = "flex";
      this.plateau.style.flexWrap = "wrap";
      this.plateau.style.margin = "auto";

      // Définition de la taille d'un bloc en fonction de la taille du plateau
      this.tailleBloc = this.plateau.offsetWidth/10-3;

      // Blocs des boutons
      this.buttons = document.getElementById('buttons');
      this.buttons.style.width = this.tailleBody/2+"px";
      this.buttons.style.height = '20%';
      this.buttons.style.top = this.plateau.offsetTop+this.plateau.offsetHeight+'px';
      this.buttons.style.marginTop = '10px';
      this.buttons.style.marginLeft = this.tailleBody/4+"px";
      
    }
      
    initBlocs(){
      for(let i=0;i<this.nombreBlocHauteur;i++){
        this.tableauBloc.push([]);
        for(let j=0; j<this.nombreBlocLargeur;j++){
          
          this.tableauBloc[i][j] = document.createElement("div");
          // this.tableauBloc[i][j].id = "tableauBloc"+i+","+j;
          this.tableauBloc[i][j].className = "bloc";
          this.tableauBloc[i][j].style.display = "inline-block";
          this.tableauBloc[i][j].style.width = this.tailleBloc+"px";
          this.tableauBloc[i][j].style.height = this.tailleBloc+"px";
          this.plateau.appendChild(this.tableauBloc[i][j]);

        }
      }
    }

    initPseudo(){
      // Position des pseudos des joueurs
      const joueur1 = document.getElementById('joueur1');
      const joueur2 = document.getElementById('joueur2');

      joueur1.style.width = '20%';
      joueur1.style.top = this.tableauBloc[3][0].offsetTop+"px";
      joueur2.style.width = '20%';
      joueur2.style.top = this.tableauBloc[3][9].offsetTop+"px";
      joueur2.style.left = '78%';
    }
      
    deplacerJoueur(x, y){
      // Modification de la position du joueur 1 seulement si une case est blanche    
      if(this.tableauBloc[y][x].style.backgroundColor == "white"){
        if(this.direction == "droite"){
          this.positionJX+=1;
        }
        else if(this.direction == "gauche"){
          this.positionJX-=1;
        }
        else if(this.direction == "haut"){
          this.positionJY-=1;
        }
        else if(this.direction == "bas"){
          this.positionJY+=1;
        }

        return true;
        
      }
      else{
        alert("Déplacement impossible");
        return false;
      }
        
    }
    
  };
  
 
  // Création d'une nouvelle instance de ma class Game
  const jeuMulti = new Game();
  // Lancement des méthodes du jeu qui permet de l'initialiser
  jeuMulti.createElements();
  jeuMulti.initBlocs();
  jeuMulti.initPseudo();
  
  
  
  
  /*****************************************************************
   ***************************WebSocket****************************** 
   *****************************************************************/
  const socket = io('http://maximeperon.fr');
  
  // Envoi de l'uuid du joueur
  let uuid = document.getElementsByClassName('joueur')[0].id;
  let canPlay = false;
  let numJoueur = '';


  socket.emit('sendJoueur', {
    uuid: uuid
  })

  socket.on('loadGame', function(data){
    for(let i=0;i<jeuMulti.nombreBlocHauteur;i++){
      for(let j=0; j<jeuMulti.nombreBlocLargeur;j++){
        jeuMulti.tableauBloc[i][j].style.backgroundColor = data.gameBoard[i][j];
      }
    }

    // Il faut déterminer ici quel joueur est le J1 et le J2, puis le renvoyer au back, afin qu'il ajoute à la base
    let nombreJoueur = data.joueurs.length;
    if(nombreJoueur == 1){
      numJoueur = 'j1';
      canPlay = true;
      socket.emit('sendNumberPlayer', {
        uuid: uuid,
        numberPlayer: 'j1'
      })
    }
    else if(nombreJoueur == 2){
      numJoueur = 'j2';
      socket.emit('sendNumberPlayer', {
        uuid: uuid,
        numberPlayer: 'j2'
      })
    }
  })
  
  socket.on('loadPlayer', function(data){
    
    // Il faut afficher tous les joueurs qui sont connectés. Pour cela, il faut récupérer la liste des joueurs connectés, avec leur UUID, 
    // et ajouter une div avec comme id l'UUID de l'utilisateur s'il n'existe pas
    
    for(let i=0; i<data.listeJoueurs.length; i++){
      
      if(data.listeJoueurs[i].numberPlayer == 'j1'){
        const joueur1 = document.getElementById('joueur1');
        joueur1.children[0].innerHTML = data.listeJoueurs[i].pseudo;
      }
      else if(data.listeJoueurs[i].numberPlayer == 'j2'){
        const joueur2 = document.getElementById('joueur2');
        joueur2.children[0].innerHTML = data.listeJoueurs[i].pseudo;
      }
      
      let idJoueur = document.getElementById(data.listeJoueurs[i].uuid);
      if(idJoueur == null){
        // Si la div n'existe pas (si ce n'est pas le même client), je créer la div
        idJoueur = document.createElement('div');
        idJoueur.id = data.listeJoueurs[i].uuid;
        idJoueur.class = "joueur";
        document.body.appendChild(idJoueur);
      }
      else {
        jeuMulti.positionJX = data.listeJoueurs[i].x;
        jeuMulti.positionJY = data.listeJoueurs[i].y;
      }
      // Modifier les caractéristique de la div
      idJoueur.style.width = idJoueur.style.height = jeuMulti.tailleBloc+"px";
      idJoueur.style.borderRadius = jeuMulti.tailleBloc+"px";
      idJoueur.style.position = "absolute";
      idJoueur.style.backgroundColor = data.listeJoueurs[i].color;
      idJoueur.style.top = jeuMulti.tableauBloc[data.listeJoueurs[i].y][data.listeJoueurs[i].x].offsetTop+1+"px";
      idJoueur.style.left = jeuMulti.tableauBloc[data.listeJoueurs[i].y][data.listeJoueurs[i].x].offsetLeft+1+"px";

      
    }
  })

  socket.on('updateJoueur', function(data){
    let joueur = document.getElementById(data.uuid);
    joueur.style.top = jeuMulti.tableauBloc[data.y][data.x].offsetTop+1+"px";
    joueur.style.left = jeuMulti.tableauBloc[data.y][data.x].offsetLeft+1+"px";
    
    if(data.numberPlayer == 'j1'){
      if(numJoueur == 'j2'){
        canPlay = true;
      }
    }
    else if(data.numberPlayer == 'j2'){
      if(numJoueur == 'j1'){
        canPlay = true;
      }
    }
  })

  socket.on('updateTableau', function(data){
    for(let i=0;i<jeuMulti.nombreBlocHauteur;i++){
      for(let j=0; j<jeuMulti.nombreBlocLargeur;j++){
        jeuMulti.tableauBloc[i][j].style.backgroundColor = data.gameBoard[i][j];
      }
    }

    if(data.numberPlayer == 'j1'){
      if(numJoueur == 'j2'){
        canPlay = true;
      }
    }
    else if(data.numberPlayer == 'j2'){
      if(numJoueur == 'j1'){
        canPlay = true;
      }
    }

  })

  socket.on('win', function(data){
    alert(data.joueurWin+' a gagné !');
    setTimeout(() => {
      document.location.href= '/';
    }, 2000);
  })

  socket.on('deconnexion', function(data){
    alert(data.joueurDisconnect+' s\'est déconnecté');
    setTimeout(() => {
      document.location.href= '/';
    }, 2000);
  })
  
  /*****************************************************************
  ***************************Evenements***************************** 
  *****************************************************************/
  
  // Déplacement des joueurs

  const dh = document.getElementById('dh');
  const db = document.getElementById('db');
  const dg = document.getElementById('dg');
  const dd = document.getElementById('dd');
  
  dh.addEventListener('click', function(){
    if(canPlay){
      jeuMulti.direction = 'haut';
      let deplacement = jeuMulti.deplacerJoueur(jeuMulti.positionJX, jeuMulti.positionJY-1);
      if(deplacement){
        socket.emit('deplacerJoueur',{
          x: jeuMulti.positionJX,
          y: jeuMulti.positionJY,
          uuid
        })
        canPlay = false;
      }
    }
  })

  db.addEventListener('click', function(){
    if(canPlay){
      jeuMulti.direction = 'bas';
      let deplacement = jeuMulti.deplacerJoueur(jeuMulti.positionJX, jeuMulti.positionJY+1);
      if(deplacement){
        socket.emit('deplacerJoueur',{
          x: jeuMulti.positionJX,
          y: jeuMulti.positionJY,
          uuid
        })
        canPlay = false;
      }
    }
  })

  dg.addEventListener('click', function(){
    if(canPlay){
      jeuMulti.direction = 'gauche';
      let deplacement = jeuMulti.deplacerJoueur(jeuMulti.positionJX-1, jeuMulti.positionJY);
      if(deplacement){
        socket.emit('deplacerJoueur',{
          x: jeuMulti.positionJX,
          y: jeuMulti.positionJY,
          uuid
        })
        canPlay = false;
      }
    }
  })

  dd.addEventListener('click', function(){
    if(canPlay){
      jeuMulti.direction = 'droite';
      let deplacement = jeuMulti.deplacerJoueur(jeuMulti.positionJX+1, jeuMulti.positionJY);
      if(deplacement){
        socket.emit('deplacerJoueur',{
          x: jeuMulti.positionJX,
          y: jeuMulti.positionJY,
          uuid
        })
        canPlay = false;
      }
    }
  })

  // Modification des colonnes

  const mc1 = document.getElementById('mc1');
  const mc2 = document.getElementById('mc2');
  const mc3 = document.getElementById('mc3');
  const mc4 = document.getElementById('mc4');
  const mc5 = document.getElementById('mc5');
  const mc6 = document.getElementById('mc6');
  const mc7 = document.getElementById('mc7');
  const mc8 = document.getElementById('mc8');
  const mc9 = document.getElementById('mc9');
  const mc10 = document.getElementById('mc10');

  mc1.addEventListener('click', function(){
    if(canPlay){
      socket.emit('modifieColonne', {
        colonne: 1,
        uuid
      })
      canPlay = false;
    }
  })
  mc2.addEventListener('click', function(){
    if(canPlay){
      socket.emit('modifieColonne', {
        colonne: 2,
        uuid
      })
      canPlay = false;
    }
  })
  mc3.addEventListener('click', function(){
    if(canPlay){
      socket.emit('modifieColonne', {
        colonne: 3,
        uuid
      })
      canPlay = false;
    }
  })
  mc4.addEventListener('click', function(){
    if(canPlay){
      socket.emit('modifieColonne', {
        colonne: 4,
        uuid
      })
      canPlay = false;
    }
  })
  mc5.addEventListener('click', function(){
    if(canPlay){
      socket.emit('modifieColonne', {
        colonne: 5,
        uuid
      })
      canPlay = false;
    }
  })
  mc6.addEventListener('click', function(){
    if(canPlay){
      socket.emit('modifieColonne', {
        colonne: 6,
        uuid
      })
      canPlay = false;
    }
  })
  mc7.addEventListener('click', function(){
    if(canPlay){
      socket.emit('modifieColonne', {
        colonne: 7,
        uuid
      })
      canPlay = false;
    }
  })
  mc8.addEventListener('click', function(){
    if(canPlay){
      socket.emit('modifieColonne', {
        colonne: 8,
        uuid
      })
      canPlay = false;
    }
  })
  mc9.addEventListener('click', function(){
    if(canPlay){
      socket.emit('modifieColonne', {
        colonne: 9,
        uuid
      })
      canPlay = false;
    }
  })
  mc10.addEventListener('click', function(){
    if(canPlay){
      socket.emit('modifieColonne', {
        colonne: 10,
        uuid
      })
      canPlay = false;
    }
  })
  
  // jeuMulti.modifierLigne.addEventListener('click', function(){
  //   for(let i=0;i<jeuMulti.nombreBlocHauteur;i++){
  //     let randomCase = Math.random();
  //     if(randomCase>0.3){
  //       jeuMulti.tableauBloc[i][jeuMulti.positionJ1X].style.backgroundColor = "black";
  //     }
  //     else{
  //       jeuMulti.tableauBloc[i][jeuMulti.positionJ1X].style.backgroundColor = "white";
  //     }
  //   }
  // });
  
});







