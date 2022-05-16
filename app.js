require('dotenv').config();

var cors = require('cors');
var bodyParser = require('body-parser');
var express = require('express');
const logger = require('morgan');
var request = require('request');
var app = express();

const mysql = require('mysql');
var connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASENAME
});
connection.connect();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(express.static('html'));
app.use(logger('dev'));

app.get('/', function (req, res) {
  res.sendFile("html/main/index.html", {
    root: __dirname
  })
});

// Inciar o processo de pagamento, retornando o ID da transação pro Widget
app.post('/api/create-transaction', function (req, res) {

  request.post(process.env.PAYPAL_API + '/v1/payments/payment', {
    auth: {
      user: process.env.PAYPAL_CLIENT,
      pass: process.env.PAYPAL_SECRET
    },
    body: {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      transactions: [{
        amount: {
          total: 5,
          currency: 'BRL'
        }
      }],
      redirect_urls: {
        return_url: 'https://localhost:3000',
        cancel_url: 'https://localhost:3000'
      }
    },
    json: true
  }, function (err, response) {
    if (err) {
      console.error(err);
      return res.sendStatus(500);
    }
    // 3. Return the payment ID to the client
    res.json({
      status: true,
      id: response.body.id
    });
  });
});

// Processando o Pagamernto
app.post('/api/confirm-transaction', function (req, res) {  
  var paymentID = req.body.paymentID;
  var payerID = req.body.payerID;
  var email = req.body.email;
  var name = req.body.name;

  if (!(paymentID && payerID)) return res.json({
    status: 'error',
    message: 'Necessário passar o ID do Pagamento e do Pagante'
  });

  if (!(email && name) || (email === '' || name === '') ) return res.json({
    status: 'error',
    message: 'Necessário informar um e-mail e nome.'
  });

  request.post(process.env.PAYPAL_API + '/v1/payments/payment/' + paymentID +
    '/execute', {
      auth: {
        user: process.env.PAYPAL_CLIENT,
        pass: process.env.PAYPAL_SECRET
      },
      body: {
        payer_id: payerID,
        transactions: [{
          amount: {
            total: 5,
            currency: 'BRL'
          }
        }]
      },
      json: true
    },
    function (err, response) {
      if (err) {
        console.error('here', err);
        return res.sendStatus(500);
      }

      //#region Validações
      if (response.body.name == 'INVALID_RESOURCE_ID') return res.json({ status: 'error', message: 'Pagamento inválido.'});
      if (response.body.name == 'INVALID_PAYER_ID') return res.json({ status: 'error', message: 'Pagador inválido.'});
      if (response.body.name == 'PAYMENT_NOT_APPROVED_FOR_EXECUTION') return res.json({ status: 'error', message: 'Pagamento não efeituado.'});
      if (response.body.name == 'MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED') return res.json({ status: 'error', message: 'Tentativas de pagamento excedida.'});
      if (response.body.state != 'approved') return res.json({ status: 'error', message: 'Pagamento não foi aprovado.'});
      //#endregion

      connection.query('INSERT INTO orders SET ?', {
        email: email,
        name: name,
        paymentId: paymentID
      }, function (error, results, fields) {
        if (error && error.code == 'ER_DUP_ENTRY') {
          return res.json({ status: 'error', message: 'Essa transação já foi concluida anteriormente.'})
        }

        if (results && results.insertId) {
          res.json({
            status: 'success',
            name: name
          });
        }
      });
    });
});

app.get('*', function (req, res) {
  res.redirect("/")
});

app.listen(3000, function () {
  console.log('Server listening at http://localhost:3000/');
});