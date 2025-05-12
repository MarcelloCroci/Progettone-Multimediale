$(document).ready(function () {
  $('#registerForm').on('submit', function (e) {
    e.preventDefault();
    const data = {
      nome: $('#nome').val().trim(),
      cognome: $('#cognome').val().trim(),
      email: $('#email').val().trim(),
      password: $('#password').val(),
      ddn: $('#ddn').val(),
      telefono: $('#telefono').val().trim()
    };
    // Basic validation
    if (data.password.length < 8) {
      return alert('Password almeno 8 caratteri.');
    }
    $.ajax({
      url: '/api/register',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function (user) {
        // salva in localStorage e vai a home
        localStorage.setItem('user', JSON.stringify(user));
        alert('Registrazione avvenuta!');
        window.location.href = 'home.html';
      },
      error: function (xhr) {
        const msg = xhr.responseJSON?.error || 'Errore registrazione.';
        alert(msg);
      }
    });
  });
});
