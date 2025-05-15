// public/js/profile.js

$(function() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Devi effettuare il login per accedere al profilo.');
    window.location.href = 'login.html';
    return;
  }

  // —————————————————————————————————————————————
  // 1) Carica e mostra info utente
  // —————————————————————————————————————————————
  function loadUserInfo() {
    $('#userInfo').html(`
      <p><span class="font-semibold">Nome utente:</span> ${user.nome_utente}</p>
      <p><span class="font-semibold">Nome:</span> ${user.nome}</p>
      <p><span class="font-semibold">Cognome:</span> ${user.cognome}</p>
      <p><span class="font-semibold">Email:</span> ${user.email}</p>
      <p><span class="font-semibold">Telefono:</span> ${user.numero_tel || '-'}</p>
      <p><span class="font-semibold">Data di nascita:</span> ${new Date(user.data_nascita).toLocaleDateString()}</p>
    `);
  }
  loadUserInfo();

  // —————————————————————————————————————————————
  // 2) Modifica profilo
  // —————————————————————————————————————————————
  $('#editProfileBtn').on('click', () => {
    // prefill
    $('#editNome').val(user.nome);
    $('#editCognome').val(user.cognome);
    $('#editEmail').val(user.email);
    $('#editTelefono').val(user.numero_tel);
    $('#editDdn').val(user.data_nascita);
    $('#editModal').removeClass('hidden').addClass('flex');
  });

  $('#cancelEdit').on('click', () => {
    $('#editModal').addClass('hidden');
  });

  $('#editForm').on('submit', function(e) {
    e.preventDefault();
    const payload = {
      nome: $('#editNome').val(),
      cognome: $('#editCognome').val(),
      email: $('#editEmail').val(),
      numero_tel: $('#editTelefono').val(),
      data_nascita: $('#editDdn').val()
    };
    $.ajax({
      url: `/api/utente/${user.id_utente}`,
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(payload)
    })
    .done(updated => {
      // aggiorna localStorage e UI
      Object.assign(user, updated);
      localStorage.setItem('user', JSON.stringify(user));
      loadUserInfo();
      $('#editModal').addClass('hidden');
      alert('Profilo aggiornato!');
    })
    .fail(() => alert('Errore durante l\'aggiornamento.'));
  });

  // —————————————————————————————————————————————
  // 3) Carica prestiti attivi e abilita recensione
  // —————————————————————————————————————————————
  function loadPrestiti() {
    $.get('/api/prestiti', { id_utente: user.id_utente })
      .done(list => {
        const container = $('#prestitiContainer').empty();
        if (!list.length) {
          $('#noPrestiti').show();
          return;
        }
        $('#noPrestiti').hide();
        list.forEach(p => {
          const card = $(`
            <div class="bg-white p-5 rounded-lg shadow-sm border hover:shadow-md transition cursor-pointer">
              <img src="${p.miniature}" alt="${p.nome}" class="h-32 w-full object-cover rounded mb-2">
              <h4 class="font-semibold mb-1">${p.nome}</h4>
              <p class="text-gray-600 text-sm">Prestito: ${new Date(p.data_prestito).toLocaleDateString()}</p>
            </div>
          `);
          // al click apro il modal di recensione
          card.on('click', () => openReviewModal(p.id_risorsa));
          container.append(card);
        });
      })
      .fail(() => {
        $('#prestitiContainer').html('<p class="text-red-500">Errore caricamento prestiti.</p>');
      });
  }
  loadPrestiti();

  // —————————————————————————————————————————————
  // 4) Modal recensione
  // —————————————————————————————————————————————
  function openReviewModal(risorsaId) {
    $('#reviewRisorsaId').val(risorsaId);
    $('#reviewTitolo').val('');
    $('#reviewTesto').val('');
    $('#reviewVoto').val('');
    $('#reviewModal').removeClass('hidden').addClass('flex');
  }
  $('#cancelReview').on('click', () => {
    $('#reviewModal').addClass('hidden');
  });

  $('#reviewForm').on('submit', function(e) {
    e.preventDefault();
    const payload = {
      id_utente: user.id_utente,
      id_risorsa: $('#reviewRisorsaId').val(),
      titolo_r: $('#reviewTitolo').val(),
      testo_r: $('#reviewTesto').val(),
      voto: parseInt($('#reviewVoto').val(), 10)
    };
    $.ajax({
      url: '/api/recensioni',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload)
    })
    .done(() => {
      alert('Recensione inviata con successo!');
      $('#reviewModal').addClass('hidden');
    })
    .fail(() => {
      alert('Errore durante l\'invio della recensione.');
    });
  });

  // —————————————————————————————————————————————
  // 5) Carica prenotazioni
  // —————————————————————————————————————————————
  function loadPrenotazioni() {
    $.get('/api/prenotazioni', { id_utente: user.id_utente })
      .done(list => {
        const c = $('#prenotazioniContainer').empty();
        if (!list.length) {
          $('#noPrenotazioni').show();
          return;
        }
        $('#noPrenotazioni').hide();
        list.forEach(p => {
          c.append(`
            <div class="bg-white p-5 rounded-lg shadow-sm border">
              <img src="${p.miniature}" alt="${p.nome}" class="h-32 w-full object-cover rounded mb-2">
              <h4 class="font-semibold mb-1">${p.nome}</h4>
              <p class="text-gray-600 text-sm">Prenotato: ${new Date(p.data_prenotazione).toLocaleDateString()}</p>
            </div>
          `);
        });
      })
      .fail(() => {
        $('#prenotazioniContainer').html('<p class="text-red-500">Errore caricamento prenotazioni.</p>');
      });
  }
  loadPrenotazioni();

  // —————————————————————————————————————————————
  // 6) Carica prestiti >180 giorni
  // —————————————————————————————————————————————
  function loadOverdue() {
    $.get('/api/admin/overdue-users')
      .done(list => {
        const table = $('#overdueTable').hide().find('tbody').empty();
        if (!list.length) {
          $('#noOverdue').show();
          return;
        }
        $('#noOverdue').hide();
        list.forEach(u => {
          const restituzione = new Date(u.data_prestito);
          restituzione.setDate(restituzione.getDate() + 180);
          table.append(`
            <tr>
              <td class="border px-4 py-2">${u.risorsa_nome}</td>
              <td class="border px-4 py-2">${new Date(u.data_prestito).toLocaleDateString()}</td>
              <td class="border px-4 py-2">${restituzione.toLocaleDateString()}</td>
            </tr>
          `);
        });
        $('#overdueTable').show();
      })
      .fail(() => {
        $('#overdueTable').replaceWith('<p class="text-red-500">Errore caricamento prestiti vecchi.</p>');
      });
  }
  loadOverdue();
});
