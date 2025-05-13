$(document).ready(function() {
  const id = localStorage.getItem('id_risorsa');
  if (!id) return alert('Risorsa non selezionata.');

  // Carica dettagli risorsa
  $.get(`/api/risorsa/${id}`, function(r) {
    // Popola UI
    $('#resImage').attr('src', r.miniature).attr('alt', r.nome);
    $('#resName').text(r.nome);
    $('#resType').text(r.tipo);
    $('#resStatus')
      .text(r.disponibilita > 0 ? 'Available' : 'Unavailable')
      .toggleClass('bg-green-100 text-green-600', r.disponibilita > 0)
      .toggleClass('bg-red-100 text-red-600', r.disponibilita == 0);
    $('#resDesc').text(r.descrizione);
    $('#resAvail').text(r.disponibilita);
    $('#resQty').text(r.quantita);
    $('#resDate').text(new Date(r.data_rilascio).toLocaleDateString());
    $('#resCenter').text(`${r.centro_nome} (${r.centro_citta})`);
    $('#resCat').text(r.categoria_didattico || '-');
    $('#resPegi').text(r.pegi || '-');

    // Configura pulsante d'azione
    const btn = $('#actionBtn').off();  // rimuove eventuali handler precedenti
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      btn.text('Login to proceed')
         .addClass('bg-gray-500 cursor-not-allowed')
         .prop('disabled', true);
      return;
    }

    if (r.disponibilita > 0) {
      btn
        .text('Add to Cart')
        .removeClass()
        .addClass('px-6 py-2 rounded-lg text-white bg-green-500 hover:bg-green-600 transition')
        .on('click', () => {
          $.post('/api/carrello', { id_utente: user.id_utente, id_risorsa: r.id_risorsa })
            .done(() => alert('Risorsa aggiunta al carrello!'))
            .fail(() => alert('Errore aggiunta carrello.'));
        });
    } else {
      btn
        .text('Prenota')
        .removeClass()
        .addClass('px-6 py-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600 transition')
        .on('click', () => {
          $.post('/api/prenotazioni', { id_utente: user.id_utente, id_risorsa: r.id_risorsa })
            .done(() => alert('Prenotazione avvenuta!'))
            .fail(() => alert('Errore prenotazione.'));
        });
    }
  }).fail(() => alert('Errore nel caricamento dei dettagli.'));

  // Carica recensioni
  $.get('/api/recensioni', { risorsaId: id }, function(list) {
    const container = $('#reviewsContainer');
    if (!list.length) {
      $('#noReviews').show();
      return;
    }
    list.forEach(rv => {
      const stars = '★'.repeat(rv.voto) + '☆'.repeat(5 - rv.voto);
      const html = `
        <div class="bg-white p-4 rounded-lg shadow">
          <div class="flex justify-between mb-2">
            <h4 class="font-semibold">${rv.titolo_r}</h4>
            <span class="text-yellow-500">${stars}</span>
          </div>
          <p class="text-gray-600 mb-2">${rv.testo_r}</p>
          <p class="text-gray-500 text-sm">by ${rv.nome_utente}</p>
        </div>`;
      container.append(html);
    });
  }).fail(() => alert('Errore nel caricamento delle recensioni.'));
});
$(document).ready(function () {
  const user = JSON.parse(localStorage.getItem('user'));
  const id_risorsa = localStorage.getItem('id_risorsa');

  if (user && (user.ruolo === 'admin' || user.ruolo === 'amministratore')) {
    $('#adminActions').removeClass('hidden');
  }

  $('#editResourceBtn').on('click', function () {
    // Precompila il form con i dati attuali
    $.get(`/api/risorse/${id_risorsa}`, function (res) {
      $('#editNome').val(res.nome);
      $('#editMarca').val(res.marca);
      $('#editTipo').val(res.tipo);
      $('#editDisponibilita').val(res.disponibilita);
      $('#editQuantita').val(res.quantita);
      $('#editMiniatura').val(res.miniature);
      $('#editModal').removeClass('hidden');
    });
  });

  $('#cancelEditBtn').click(() => {
    $('#editModal').addClass('hidden');
  });

  $('#editForm').submit(function (e) {
    e.preventDefault();
    const updatedData = {
      nome: $('#editNome').val(),
      marca: $('#editMarca').val(),
      tipo: $('#editTipo').val(),
      disponibilita: parseInt($('#editDisponibilita').val()),
      quantita: parseInt($('#editQuantita').val()),
      miniature: $('#editMiniatura').val()
    };

    $.ajax({
      url: `/api/risorse/${id_risorsa}`,
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(updatedData),
      success: () => {
        alert('Risorsa aggiornata!');
        location.reload();
      },
      error: () => {
        alert('Errore durante l\'aggiornamento.');
      }
    });
  });

  $('#deleteResourceBtn').on('click', function () {
    if (confirm('Sei sicuro di voler eliminare questa risorsa?')) {
      $.ajax({
        url: `/api/risorse/${id_risorsa}`,
        method: 'DELETE',
        success: () => {
          alert('Risorsa eliminata con successo.');
          window.location.href = 'resources.html';
        },
        error: () => {
          alert('Errore durante l\'eliminazione.');
        }
      });
    }
  });
});
