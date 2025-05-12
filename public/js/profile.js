// public/js/profile.js
$(document).ready(function() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return window.location.href = 'login.html';

  // Popola User Info
  $('#userInfo').html(`
    <p><strong>Nome Utente:</strong> ${user.nome_utente}</p>
    <p><strong>Nome:</strong> ${user.nome} ${user.cognome}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>Data Nascita:</strong> ${new Date(user.data_nascita).toLocaleDateString()}</p>
  `);

  // Carica Prestiti Attivi
  $.get('/api/prestiti', { id_utente: user.id_utente }, function(prestiti) {
    const c = $('#prestitiContainer');
    if (!prestiti.length) return $('#noPrestiti').show();
    prestiti.forEach(p => {
      c.append(`
        <div class="bg-white p-4 rounded-lg shadow flex flex-col">
          <img src="${p.miniature}" alt="${p.nome}" class="h-40 w-full object-cover mb-2 rounded"/>
          <h4 class="font-semibold mb-1">${p.nome}</h4>
          <p class="text-gray-600 text-sm mb-2">Preso in prestito: ${new Date(p.data_prestito).toLocaleDateString()}</p>
        </div>
      `);
    });
  });

  // Carica Prenotazioni
  $.get('/api/prenotazioni', { id_utente: user.id_utente }, function(pren) {
    const c = $('#prenotazioniContainer');
    if (!pren.length) return $('#noPrenotazioni').show();
    pren.forEach(r => {
      c.append(`
        <div class="bg-white p-4 rounded-lg shadow flex flex-col">
          <img src="${r.miniature}" alt="${r.nome}" class="h-40 w-full object-cover mb-2 rounded"/>
          <h4 class="font-semibold mb-1">${r.nome}</h4>
          <p class="text-gray-600 text-sm mb-2">Prenotato: ${new Date(r.data_prenotazione).toLocaleDateString()}</p>
        </div>
      `);
    });
  });
});
