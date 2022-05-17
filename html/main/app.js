$(document).ready(function () {

  $("#donation").click(function (e) {
    e.preventDefault();
    $("#donationPop").fadeIn();
  });

  $("#closeDonos").click(function (e) {
    e.preventDefault();
    $("#donationPop").fadeOut();
  });

  paypal.Button.render({
    env: 'production', // 'sandbox' Or 'production'
    style: {
      color:  'blue',
      shape:  'pill',
      label:  'pay',
      height: 40
    },

    validate: function(actions) {
      actions.disable();
      paypalActions = actions;
    },

    onClick: function(e) {
      var msgErrors = 0;

      var email = document.querySelector('#emailInput').value;
      var isValid = (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))

      if (isValid) {
        document.querySelector('#msgEmail').style.display = 'none';          
      } else {
        document.querySelector('#msgEmail').style.display = 'block'; 
        msgErrors +=1;
      }

      var name = document.querySelector('#nameInput').value;
      isValid = name.length >= 2 && name.length <= 30;
      formValid = isValid;

      if (isValid) {
        document.querySelector('#msgName').style.display = 'none';          
      } else {
        document.querySelector('#msgName').style.display = 'block';
        msgErrors +=1;
      }   

      if (msgErrors == 0) {
        paypalActions.enable();
      } else {
        paypalActions.disable();
      }        

    },
    // Set up the payment:
    // 1. Add a payment callback
    payment: function (data, actions) {
      // 2. Make a request to your server
      return actions.request.post('/api/create-transaction')
        .then(function (res) {
          // 3. Return res.id from the response
          if (res.status) {
            return res.id;
          }
        });
    },
    // Execute the payment:
    // 1. Add an onAuthorize callback
    onAuthorize: function (data, actions) {
      // 2. Make a request to your server
      return actions.request.post('/api/confirm-transaction', {
        paymentID: data.paymentID,
        payerID: data.payerID,
        email: $("#emailInput").val(),
        name: $("#nameInput").val()
      })
        .then(function (res) {
          showNotification("Transação concluida!")
          $("#donationPop").fadeOut();
          $("#emailInput").val('');
          $("#nameInput").val('');
          onPayment()
          $("#nameTicket").text(res.name)
        });
    }, 
    onCancel: function (data) {
      showNotification("Transação cancelada!")
    }
  }, '#paypal-button');
});

function onPayment() {
  $("#card").fadeOut();
  $("#ticket").css("display", "flex");
}

function showNotification(msg) {
  $("#notification").text(msg);
  $("#notification").fadeIn();
  setTimeout(function () {
    $("#notification").fadeOut();
  }, 8000);
}