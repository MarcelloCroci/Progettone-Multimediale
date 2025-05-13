$(function() {
  // Recupera utente da localStorage
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return window.location.href = 'login.html';

  // Funzione per mostrare i dati utente
  function renderUser(u) {
    $('#userInfo').html(`
      <p><strong>Nome Utente:</strong> ${u.nome_utente}</p>
      <p><strong>Nome:</strong> ${u.nome} ${u.cognome}</p>
      <p><strong>Email:</strong> ${u.email}</p>
      <p><strong>Data di Nascita:</strong> ${new Date(u.data_nascita).toLocaleDateString()}</p>
      <p><strong>Telefono:</strong> ${u.numero_tel || '-'}</p>
    `);
  }
  renderUser(user);

  // ----- Modifica Profilo -----
  const modal = $('#editModal');
  $('#editProfileBtn').click(() => {
    $('#editNome').val(user.nome);
    $('#editCognome').val(user.cognome);
    $('#editEmail').val(user.email);
    $('#editTelefono').val(user.numero_tel);
    $('#editDdn').val(user.data_nascita);
    modal.removeClass('hidden').addClass('flex');
  });
  $('#cancelEdit').click(() => modal.addClass('hidden'));
  $('#editForm').submit(function(e) {
    e.preventDefault();
    const updated = {
      nome: $('#editNome').val().trim(),
      cognome: $('#editCognome').val().trim(),
      email: $('#editEmail').val().trim(),
      numero_tel: $('#editTelefono').val().trim(),
      data_nascita: $('#editDdn').val()
    };
    $.ajax({
      url: `/api/utente/${user.id_utente}`,
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(updated),
      success(u) {
        localStorage.setItem('user', JSON.stringify(u));
        renderUser(u);
        modal.addClass('hidden');
        alert('Profilo aggiornato!');
      },
      error(xhr) {
        alert(xhr.responseJSON?.error || 'Errore aggiornamento.');
      }
    });
  });

  // ----- Carica Prestiti e Overdue -----
  $.get('/api/prestiti', { id_utente: user.id_utente }, prestiti => {
    const c = $('#prestitiContainer');
    const overdue = [];
    const today = new Date();

    if (!prestiti.length) {
      $('#noPrestiti').show();
    } else {
      prestiti.forEach(p => {
        const start = new Date(p.data_prestito);
        const due = new Date(start);
        due.setDate(due.getDate() + 180);

        // Mostra nella sezione Prestiti Attivi
        c.append(`
          <div class="bg-white p-4 rounded-lg shadow flex flex-col">
            <img src="${p.miniature}" alt="${p.nome}" class="h-40 w-full object-cover mb-2 rounded"/>
            <h4 class="font-semibold mb-1">${p.nome}</h4>
            <p class="text-gray-600 text-sm">Preso il: ${start.toLocaleDateString()}</p>
            <p class="text-gray-600 text-sm">Scadenza: ${due.toLocaleDateString()}</p>
          </div>
        `);

        if (today > due) {
          overdue.push({ nome: p.nome, data_prestito: start, data_scadenza: due });
        }
      });
    }

    // Mostra tabella Overdue
    if (overdue.length) {
      $('#overdueTable').removeClass('hidden');
      const tbody = $('#overdueTable tbody').empty();
      overdue.forEach(o => {
        tbody.append(`
          <tr class="border-b">
            <td class="px-4 py-2">${o.nome}</td>
            <td class="px-4 py-2">${o.data_prestito.toLocaleDateString()}</td>
            <td class="px-4 py-2">${o.data_scadenza.toLocaleDateString()}</td>
          </tr>
        `);
      });
    } else {
      $('#noOverdue').show();
    }
  });

  // ----- Carica Prenotazioni -----
  $.get('/api/prenotazioni', { id_utente: user.id_utente }, prenotazioni => {
    const c = $('#prenotazioniContainer');
    if (!prenotazioni.length) {
      $('#noPrenotazioni').show();
    } else {
      prenotazioni.forEach(r => {
        const date = new Date(r.data_prenotazione);
        c.append(`
          <div class="bg-white p-4 rounded-lg shadow flex flex-col">
            <img src="${r.miniature}" alt="${r.nome}" class="h-40 w-full object-cover mb-2 rounded"/>
            <h4 class="font-semibold mb-1">${r.nome}</h4>
            <p class="text-gray-600 text-sm">Prenotato il: ${date.toLocaleDateString()}</p>
          </div>
        `);
      });
    }
  });
});