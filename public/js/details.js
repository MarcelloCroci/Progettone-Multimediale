// public/js/details.js

$(function() {
  const id_risorsa = localStorage.getItem('id_risorsa');
  if (!id_risorsa) {
    alert('Risorsa non selezionata.');
    return;
  }

  // —————————————————————————————————————————————
  // 1) Carica e popola dettagli risorsa
  // —————————————————————————————————————————————
  $.get(`/api/risorsa/${id_risorsa}`)
    .done(r => {
      $('#resImage')
        .attr('src', r.miniature)
        .attr('alt', r.nome);
      $('#resName').text(r.nome);
      $('#resType').text(r.tipo);
      $('#resStatus')
        .text(r.disponibilita > 0 ? 'Available' : 'Unavailable')
        .toggleClass('bg-green-100 text-green-600', r.disponibilita > 0)
        .toggleClass('bg-red-100 text-red-600', r.disponibilita === 0);
      $('#resDesc').text(r.descrizione);
      $('#resAvail').text(r.disponibilita);
      $('#resQty').text(r.quantita);
      $('#resDate').text(new Date(r.data_rilascio).toLocaleDateString());
      $('#resCenter').text(`${r.centro_nome} (${r.centro_citta})`);
      $('#resCat').text(r.categoria_didattico || '-');
      $('#resPegi').text(r.pegi || '-');

      // Configura pulsante d'azione (add to cart / prenota)
      const btn = $('#actionBtn').off();
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        btn
          .text('Login to proceed')
          .addClass('bg-gray-500 cursor-not-allowed')
          .prop('disabled', true);
      } else if (r.disponibilita > 0) {
        btn
          .text('Aggiungi al carrello')
          .attr('class', 'px-6 py-2 rounded-lg text-white bg-green-500 hover:bg-green-600 transition')
          .on('click', () => {
            $.post('/api/carrello', { id_utente: user.id_utente, id_risorsa })
              .done(() => alert('Risorsa aggiunta al carrello!'))
              .fail(() => alert('Errore aggiunta al carrello.'));
          });
      } else {
        btn
          .text('Prenota')
          .attr('class', 'px-6 py-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600 transition')
          .on('click', () => {
            $.post('/api/prenotazioni', { id_utente: user.id_utente, id_risorsa })
              .done(() => alert('Prenotazione avvenuta!'))
              .fail(() => alert('Errore prenotazione.'));
          });
      }
    })
    .fail(() => alert('Errore nel caricamento dei dettagli.'));

  // —————————————————————————————————————————————
  // 2) Carica e mostra recensioni
  // —————————————————————————————————————————————
  $.get('/api/recensioni', { risorsaId: id_risorsa })
    .done(list => {
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
    })
    .fail(() => alert('Errore nel caricamento delle recensioni.'));

  // —————————————————————————————————————————————
  // 3) Mostra azioni admin (Modifica / Elimina)
  // —————————————————————————————————————————————
  const currentUser = JSON.parse(localStorage.getItem('user'));
  if (currentUser && (currentUser.ruolo === 'admin' || currentUser.ruolo === 'amministratore')) {
    $('#adminActions').removeClass('hidden');
  }

  // Apri modal modifica
  $('#editResourceBtn').on('click', () => {
    $.get(`/api/risorse/${id_risorsa}`)
      .done(res => {
        $('#editNome').val(res.nome);
        $('#editMarca').val(res.marca);
        $('#editTipo').val(res.tipo);
        $('#editDisponibilita').val(res.disponibilita);
        $('#editQuantita').val(res.quantita);
        $('#editMiniatura').val(res.miniature);
        $('#editModal').removeClass('hidden');
      })
      .fail(() => alert('Errore nel caricamento per modifica.'));
  });

  // Chiudi modal
  $('#cancelEditBtn').on('click', () => {
    $('#editModal').addClass('hidden');
  });

  // Submit modifica
  $('#editForm').on('submit', function(e) {
    e.preventDefault();
    const updatedData = {
      nome: $('#editNome').val(),
      marca: $('#editMarca').val(),
      tipo: $('#editTipo').val(),
      disponibilita: +$('#editDisponibilita').val(),
      quantita: +$('#editQuantita').val(),
      miniature: $('#editMiniatura').val()
    };
    $.ajax({
      url: `/api/risorse/${id_risorsa}`,
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(updatedData)
    })
    .done(() => {
      alert('Risorsa aggiornata!');
      location.reload();
    })
    .fail(() => alert('Errore durante l\'aggiornamento.'));
  });

  // Elimina risorsa
  $('#deleteResourceBtn').on('click', () => {
    if (confirm('Sei sicuro di voler eliminare questa risorsa?')) {
      $.ajax({
        url: `/api/risorse/${id_risorsa}`,
        method: 'DELETE'
      })
      .done(() => {
        alert('Risorsa eliminata con successo.');
        window.location.href = 'resources.html';
      })
      .fail(() => alert('Errore durante l\'eliminazione.'));
    }
  });

  // —————————————————————————————————————————————
  // 4) Carica disponibilità nei centri
  // —————————————————————————————————————————————
  $.get(`/api/risorsa/${id_risorsa}/centri`)
    .done(centri => {
      const container = $('#centerAvailabilityList').empty();
      if (!centri.length) {
        container.append('<li class="py-2 text-sm text-gray-500">Nessuna disponibilità attuale.</li>');
        return;
      }
      centri.forEach(c => {
        container.append(`
          <li class="py-2 flex justify-between items-center">
            <div>
              <p class="font-medium text-gray-800">${c.nome_centro}</p>
              <p class="text-gray-600 text-sm">${c.citta} (${c.regione})</p>
            </div>
            <span class="text-green-600 font-semibold">${c.disponibilita} disponibili</span>
          </li>
        `);
      });
    })
    .fail(() => {
      $('#centerAvailabilityList').html('<li class="py-2 text-sm text-red-500">Errore caricamento dati.</li>');
    });
});
