// public/js/details.js
$(function() {
  const id = localStorage.getItem('id_risorsa');
  if (!id) {
    alert('Risorsa non selezionata.');
    return;
  }

  let current;

  // 1) Carico dati risorsa
  $.get(`/api/risorsa/${id}`)
    .done(r => {
      current = r;

      // Header
      $('#resName').text(r.nome);
      $('#resType').text(r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1));
      $('#resStatus')
        .text(r.disponibilita > 0 ? 'Disponibile' : 'Non disponibile')
        .toggleClass('bg-green-100 text-green-600', r.disponibilita > 0)
        .toggleClass('bg-red-100 text-red-600', r.disponibilita === 0);

      // Immagine e descrizione
      $('#resImage').attr('src', r.miniature);
      $('#resDesc').text(r.descrizione || '-');

      // Dettagli comuni
      $('#resAvail').text(r.disponibilita);
      $('#resDate').text(new Date(r.data_rilascio).toLocaleDateString());
      $('#resCenter').text(`${r.centro_nome} (${r.centro_citta})`);

      if(r.tipo == "hardware"){
        $('#hardwareGroup').show();
        $('#resMarca').text(r.marca);
        $('#resCasaH').text(r.casa_produttrice);
      }
      // Dettagli specifici
      else if (r.tipo == "didattico") {
        // Software didattico
        $('#didatticoGroup').show();
        $('#resCasa').text(r.casa_produttrice || '-');
        $('#resVersione').text(r.versione_didattico);
        $('#resCategoria').text(r.categoria_didattico);
        $('#resLingua').text(r.lingua_didattico);
      } else if (r.tipo == "videogioco") {
        // Videogioco
        $('#gameGroup').show();
        $('#resCasaGame').text(r.casa_produttrice || '-');
        $('#resPegi').text(r.pegi);
        $('#resGenere').text(r.genere_game);
        $('#resTrama').text(r.trama_game);
        if (r.trailer_game) {
          $('#resTrailerContainer').show();
          $('#resTrailer').attr('src', r.trailer_game);
        }
      }

      // Pulsante d’azione
      const user = JSON.parse(localStorage.getItem('user'));
      const btn  = $('#actionBtn').off().removeClass();
      if (!user) {
        btn.text('Login per procedere')
           .addClass('bg-gray-500 cursor-not-allowed px-4 py-2 rounded-lg text-white')
           .prop('disabled', true);
      } else if (r.disponibilita > 0) {
        btn.text('Aggiungi al carrello')
            .removeClass('px-4 py-2 rounded-lg text-white transition')
            .addClass('bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600')
            .on('click', () => {
             $.post('/api/carrello', { id_utente: user.id_utente, id_risorsa: id })
              .done(() => alert('Risorsa aggiunta al carrello!'))
              .fail(() => alert('Errore aggiunta al carrello.'));
           });
      } else {
        btn.text('Prenota')
            .removeClass('px-4 py-2 rounded-lg text-white transition')
            .addClass('bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white h-fit')
            .on('click', () => {
              $.post('/api/prenotazioni', { id_utente: user.id_utente, id_risorsa: id })
                .done(() => alert('Prenotazione avvenuta!'))
                .fail(() => alert('Errore prenotazione.'));
            });
      }


      // Mostro Modifica se admin
      if (user && (user.ruolo === 'admin' || user.ruolo === 'amministratore')) {
        $('#adminActions').removeClass('hidden');
      }
    })
    .fail(() => alert('Errore caricamento dettagli.'));
    //carica le recensioni
        $.get('/api/recensioni', { risorsaId: id })
    .done(list => {
      const container = $('#reviewsContainer');
      if (!list.length) {
        $('#noReviews').show();
        return;
      }
      list.forEach(rv => {
        const stars = '★'.repeat(rv.voto) + '☆'.repeat(5 - rv.voto);
        container.append(`
          <div class="bg-white p-4 rounded-lg shadow">
            <div class="flex justify-between mb-2">
              <h4 class="font-semibold">${rv.titolo_r}</h4>
              <span class="text-yellow-500">${stars}</span>
            </div>
            <p class="text-gray-600 mb-2">${rv.testo_r}</p>
            <p class="text-gray-500 text-sm">by ${rv.nome_utente}</p>
          </div>`
        );
      });
    })
    .fail(() => alert('Errore nel caricamento delle recensioni.'));

  // Elimina risorsa
  $('#deleteResourceBtn').click(() => {
    if (!confirm('Eliminare risorsa?')) return;
    $.ajax({
      url: `/api/risorse/${id}`,
      method: 'DELETE'
    })
    .done(() => window.location.href='resources.html')
    .fail(() => alert('Errore eliminazione.'));
  });

  // 2) Dispo nei centri
  $.get(`/api/risorsa/${id}/centri`)
    .done(list => {
      const ul = $('#centerAvailabilityList').empty();
      if (!list.length) {
        ul.append('<li class="py-2 text-sm text-gray-500">Nessuna disponibilità.</li>');
      } else {
        list.forEach(c => {
          ul.append(`
            <li class="py-2 flex justify-between">
              <div>
                <p class="font-medium">${c.nome_centro}</p>
                <p class="text-gray-600 text-sm">${c.citta}, ${c.regione}</p>
              </div>
              <span class="text-green-600 font-semibold">${c.disponibilita} disponibili</span>
            </li>
          `);
        });
      }
    })
    .fail(() => {
      $('#centerAvailabilityList').html('<li class="py-2 text-sm text-red-500">Errore caricamento.</li>');
    });

  // 3) Apri Modal Modifica
  $('#editResourceBtn').click(() => {
    // Tipo
    $('#editTipoLabel').text(current.tipo.charAt(0).toUpperCase() + current.tipo.slice(1));

    // Campi comuni
    $('#editNome').val(current.nome);
    $('#editDisponibilita').val(current.disponibilita);
    $('#editMiniatura').val(current.miniature);
    $('#editCasa').val(current.casa_produttrice);
    // Nascondo tutti i blocchi
    $('#hwEdit, #didatticoEdit, #gameEdit').hide();

    // Mostro solo i campi rilevanti
    if (current.tipo === 'hardware') {
      $('#hwEdit').show();
      $('#editMarca').val(current.marca);
    }
    if (current.tipo === 'didattico') {
      $('#didatticoEdit').show();
      $('#editVersione').val(current.versione_didattico);
      $('#editCategoriaDid').val(current.categoria_didattico);
      $('#editPiattaforma').val(current.piattaforma_didattico);
      $('#editLingua').val(current.lingua_didattico);
    }
    if (current.tipo === 'videogioco') {
      $('#gameEdit').show();
      $('#editPegi').val(current.pegi);
      $('#editGenere').val(current.genere_game);
      $('#editTrama').val(current.trama_game);
      $('#editTrailer').val(current.trailer_game);
    }

    $('#editModal').removeClass('hidden');
  });

  // 4) Chiudi Modal
  $('#cancelEditBtn').click(() => {
    $('#editModal').addClass('hidden');
  });

  // 5) Submit Modifica
  $('#editForm').submit(function(e) {
    e.preventDefault();

    const upd = {
      nome:           $('#editNome').val().trim(),
      tipo:           current.tipo,
      disponibilita:  +$('#editDisponibilita').val(),
      descrizione:    current.descrizione,
      miniature:      $('#editMiniatura').val().trim(),
      casa_produttrice:$('#editCasa').val()
    };

    if (current.tipo === 'hardware') {
      upd.marca = $('#editMarca').val().trim();
    }
    if (current.tipo === 'didattico') {
      upd.versione_didattico  = $('#editVersione').val().trim();
      upd.categoria_didattico = $('#editCategoriaDid').val().trim();
      upd.piattaforma_didattico= $('#editPiattaforma').val().trim();
      upd.lingua_didattico     = $('#editLingua').val().trim();
    }
    if (current.tipo === 'videogioco') {
      upd.pegi         = $('#editPegi').val();
      upd.genere_game  = $('#editGenere').val().trim();
      upd.trama_game   = $('#editTrama').val().trim();
      upd.trailer_game   = $('#editTrailer').val().trim();
    }

    $.ajax({
      url: `/api/risorse/${id}`,
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(upd)
    })
    .done(() => location.reload())
    .fail(() => alert('Errore aggiornamento risorsa.'));
  });

});
