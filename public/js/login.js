$(document).ready(function () {
  $('#loginForm').on('submit', function (e) {
    e.preventDefault();
    const data = {
      email: $('#email').val().trim(),
      password: $('#password').val()
    };
    $.ajax({
      url: '/api/login',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function (user) {
        // salva utente e reindirizza
        localStorage.setItem('user', JSON.stringify(user));
        window.location.href = 'home.html';
      },
      error: function (xhr) {
        const msg = xhr.responseJSON?.error || 'Errore login.';
        alert(msg);
      }
    });
  });
});
