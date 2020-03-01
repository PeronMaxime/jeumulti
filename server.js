/***********************************************************
************************Serveur http************************
***********************************************************/

// Dépendances
const express = require('express');
const app = express();
app.set('view engine', 'pug');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const uri = "mongodb+srv://maxime:Mh9Sx5w2zx04acHu@maximeperon-ilsqk.mongodb.net/";
const MongoClient = require('mongodb').MongoClient(uri, { useNewUrlParser: true });
const uuidV1 = require('uuid/v1');
const MongoStore = require('connect-mongo')(session);



// Middleware
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(cookieParser());

app.use(session({
  store: new MongoStore({
    url: uri
  }),
  secret:'123456789SECRET',
  saveUninitialized : false,
  resave: false
}));

app.use(express.static(__dirname+'/src'));

// Global
const portNumber = process.env.PORT;


// Routes
app.get('/', (req,res) => {

  MongoClient.connect(function(err, client){
    if (err) {
      console.log('Impossible de se connecter à la base de données : '+err);
      res.render('error500');
    }
    else{
      const db = client.db('jeumulti');
      const users = db.collection('users');

      users.find({nbWin: {$gte: 1}}).sort({nbWin: -1}).limit(5).toArray(function(err, data){
        res.render('connect', {title: 'Connexion', listeJoueursWin: data});
      })
    }
  })

});

app.post('/', (req,res) => {

  // Récupération des données en post
  const joueur = req.body;
  if(joueur.pseudo === "" || joueur.mdp === ""){
    res.render('connect', {err: "Veuillez renseigner un pseudo et un mot de passe"});
  }

  // Connexion à la base de données
  MongoClient.connect(function(err, client){
    if (err) {
      console.log('Impossible de se connecter à la base de données : '+err);
      res.render('error500');
    }
    else {
      const uuid = uuidV1();
      const db = client.db('jeumulti');
      const users = db.collection('users');

      users.find({connected: true}).toArray(function(err, data){
        if(data.length < 2){

          // Recherche du joueur
          users.find({
            pseudo: joueur.pseudo
          }).toArray(function(err, data){
            if (err) {
              console.log('Erreur lors de la recherche de joueur');
            }
            else {
              if(data.length){
                // Le joueur existe, je test la validité de son mot de passe
                users.find({
                  pseudo: joueur.pseudo,
                  mdp: joueur.mdp
                }).toArray(function(err, data){
                  console.log('data: '+data);
                  if(data != ''){
                    // Le mot de passe est valide, je lui créer une session et je l'envoie sur le jeu
                    
                    // Création de la session
                    req.session.pseudo = joueur.pseudo;
                    req.session.uuid = data[0].uuid;
    
                    users.updateOne(
                      {pseudo: joueur.pseudo},
                      {$set: {connected: true}}
                    )
                
    
                    // Envoi vers le jeu
                    res.render('jeu', {title: "Jeu Multijoueur", uuid: req.session.uuid});
                  }
                  else {
                    // Le joueur existe mais le mdp ne correspond pas, je lui renvoie le formulaire de connexion
                    res.render('connect', {err: "Votre mot de passe ne correspond pas"});
                  }
                })
              }
              else{
                // Le joueur n'existe pas, je le créer
    
                // Création de la session
                req.session.pseudo = joueur.pseudo;
                req.session.uuid = uuid;
    
                // Insertion du joueur dans la base
                users.insertOne({
                  pseudo: joueur.pseudo,
                  mdp: joueur.mdp,
                  uuid: uuid,
                  connected: true
                });
    
                res.render('jeu', {title: "Jeu Multijoueur", uuid: req.session.uuid});
              }
            }
          })
        }
        else {
          res.render('tooMuchConnect');
        }
      })

    }
  })
})

// Server
const httpServer = app.listen(portNumber, function(){
  console.log(`Serveur démarré sur le port : ${portNumber}`)
});



/**********************************************************
*********************Serveur websocket*********************
**********************************************************/

const socketIo = require('socket.io');

const webSocketServer = socketIo(httpServer);

/***********************************************
***********Création du plateau de jeu***********
***********************************************/

const tableauBloc = [];
const nombreBlocHauteur = 7;
const nombreBlocLargeur = 10;
const initBlocs = function(){
  for(let i=0;i<nombreBlocHauteur;i++){
    tableauBloc.push([]);
    for(let j=0; j<nombreBlocLargeur;j++){
      
      let randomCase = Math.random();

      if((i == 3 && j == 0) || (i == 3 && j == 9)){
        tableauBloc[i][j] = "white";
      }
      else{
        if(randomCase>0.4){
          tableauBloc[i][j] = "black";
        }
        else{
          tableauBloc[i][j] = "white";
        }
      }
      
    }
  }
}
initBlocs();

const modifieColonne = function(colonne){
  for(let i=0;i<nombreBlocHauteur;i++){
    let randomCase = Math.random();
    if(randomCase>0.4){
      tableauBloc[i][colonne] = "black";
    }
    else{
      tableauBloc[i][colonne] = "white";
    }
  }
}

/*********************************************
**************Requetes websocket**************
*********************************************/

webSocketServer.on('connect', function(socket){
  console.log('socket connecté');

  socket.on('sendJoueur', function(data){
    socket.uuid = data.uuid

    // Calcul du nombre de joueurs connectés
    MongoClient.connect(function(err, client){
      if (err) {
        console.log('Impossible de se connecter à la BDD : '+err);
      }
      else {
        const db = client.db('jeumulti');
        const users = db.collection('users');
        users.find({connected: true}).toArray(function(err, data){
          
          // Création du plateau de jeu
          socket.emit('loadGame', {
            // Envoyer le tableau du plateau, qui doit être généré par le serveur au préalable
            gameBoard: tableauBloc,
            joueurs: data,
          })
        })
      }
    })
  })

  socket.on('sendNumberPlayer', function(data){
    MongoClient.connect(function(err, client){
      if (err) {
        console.log('Impossible de se connecter à la BDD : '+err);
      }
      else{
        const db = client.db('jeumulti');
        const users = db.collection('users');

        if(data.numberPlayer == 'j1'){
          users.updateOne(
            {uuid: data.uuid},
            {$set: {
              numberPlayer: data.numberPlayer,
              x: 0,
              y: 3,
              color: 'blue'
            }}
          )
        }
        else if(data.numberPlayer == 'j2'){
          users.updateOne(
            {uuid: data.uuid},
            {$set: {
              numberPlayer: data.numberPlayer,
              x: 9,
              y: 3,
              color: 'red'
            }}
          )
        }

        users.find({connected: true}).toArray(function(err,data){
          webSocketServer.emit('loadPlayer', {
            listeJoueurs: data
          })
        })
      }
    })
  })
  

  socket.on('deplacerJoueur', function(data){
    
    MongoClient.connect(function(err, client){
      if (err) {
        console.log('Impossible de se connecter à la BDD : '+err);
      }
      else {
        const db = client.db('jeumulti');
        const users = db.collection('users');

        users.find({uuid: data.uuid}).toArray(function(err,joueur){

          // Conditions de victoire
          if(joueur[0].numberPlayer == 'j1' && data.x == 9){

            users.updateOne(
              {uuid: data.uuid},
              {$inc: {
                nbWin: 1
              }}
            );

            webSocketServer.emit('win', {
              joueurWin: joueur[0].pseudo
            })

            initBlocs();
          }
          else if(joueur[0].numberPlayer == 'j2' && data.x == 0){

            users.updateOne(
              {uuid: data.uuid},
              {$inc: {
                nbWin: 1
              }}
            );

            webSocketServer.emit('win', {
              joueurWin: joueur[0].pseudo
            })

            initBlocs();
          }
          else {
            users.updateOne(
            {uuid: data.uuid},
            {$set: {
                x: data.x,
                y: data.y
              }}
            )
  
            webSocketServer.emit('updateJoueur', {
              uuid: data.uuid,
              x: data.x,
              y: data.y,
              numberPlayer: joueur[0].numberPlayer
            })
          }
        });
      }
    })
  })

  socket.on('modifieColonne', function(data){
    switch(data.colonne){
      case 1:
        modifieColonne(0);
        break;
      case 2:
        modifieColonne(1);
        break;
      case 3:
        modifieColonne(2);
        break;
      case 4:
        modifieColonne(3);
        break;
      case 5:
        modifieColonne(4);
        break;
      case 6:
        modifieColonne(5);
        break;
      case 7:
        modifieColonne(6);
        break;
      case 8:
        modifieColonne(7);
        break;
      case 9:
        modifieColonne(8);
        break;
      case 10:
        modifieColonne(9);
        break;
    }

    MongoClient.connect(function(err, client){
      if (err) {
        console.log('Impossible de se connecter à la BDD : '+err);
      }
      else{
        const db = client.db('jeumulti');
        const users = db.collection('users');

        users.find({uuid: data.uuid}).toArray(function(err, joueur){
          webSocketServer.emit('updateTableau',{
            gameBoard: tableauBloc,
            numberPlayer: joueur[0].numberPlayer
          })

        })
      }
    })
  })

  socket.on('disconnect', function(reason){
    // Gérer la deconnexion
    console.log(reason);

    MongoClient.connect(function(err, client){
      if (err) {
        console.log('Impossible de se connecter à la BDD : '+err);
      }
      else {
        const db = client.db('jeumulti');
        const users = db.collection('users');
        users.updateOne(
          {uuid: socket.uuid},
          {$set: {connected: false, numberPlayer: ''}}
        )

        users.find({uuid: socket.uuid}).toArray(function(err, data){
          if(data.length){
            webSocketServer.emit('deconnexion', {
              joueurDisconnect: data[0].pseudo
            });
          }
        })

      }
    })
  })
  




  
})

