$(function() {
  // Funzione per caricare e mostrare tutte le risorse
  function loadRisorse() {
    const searchParams = {
      search: $('#searchInput').val(),
      tipo: $('#tipoFiltro').val()
    };

    $.ajax({
      url: '/api/risorse',
      method: 'GET',
      data: searchParams,
      success: function (response) {
        $('#resourceContainer').empty();
        response.forEach((risorsa) => {
          const disponibile = risorsa.disponibilita > 0;
          const card = `
            <div class="bg-white border rounded-lg overflow-hidden shadow-sm">
              
              <div class="p-4">
                <div class="flex justify-between items-center mb-2">
                  <h3 class="text-lg font-semibold">${risorsa.nome}</h3>
                  <span class="text-sm px-2 py-1 rounded-full ${
                    disponibile
                      ? "text-green-600 bg-green-100"
                      : "text-red-600 bg-red-100"
                  }">
                    ${disponibile ? "Available" : "Unavailable"}
                  </span>
                </div>
                <p class="text-gray-600 text-sm mb-2">${risorsa.casa_produttrice || ""}</p>
                <img
                src="${risorsa.miniature}"
                alt="${risorsa.nome}"
                class=" h-40 object-cover m-auto"
                onerror="this.src='/img/placeholder.png';"
              />
                <p class="text-gray-700 mb-4 line-clamp-3">${risorsa.descrizione || ""}</p>
                <button
                  class="view-details bg-[#714be1] hover:bg-[#6131c4] text-white px-4 py-2 rounded-lg w-full transition mb-2"
                  data-id="${risorsa.id_risorsa}"
                >
                  View Details
                </button>
              </div>
            </div>
          `;
          $('#resourceContainer').append(card);
        });
      },
      error: function () {
        alert("Errore durante il caricamento delle risorse!");
      }
    });
  }

  // Handler per filtro "Tipo"
  $('#tipoFiltro').on('change', loadRisorse);
  $('#searchInput').on('keyup', loadRisorse);

  $('button:contains("Apply")').on('click', loadRisorse);

  // Chiamata iniziale
  loadRisorse();

  // ---------------------------------------------------
  // ADMIN: Aggiunta Risorsa
  // ---------------------------------------------------

  // Controllo ruolo e mostra bottone solo per admin
  const user = JSON.parse(localStorage.getItem('user'));
  const isAdmin = user && (user.ruolo === 'admin' || user.ruolo === 'amministratore');
  if (isAdmin) {
    $('#addResBtnContainer').show();
  }

  // Carica i centri nel select del modal
  function loadCenters() {
    $.get('/api/centri', function(centri) {
      const sel = $('#id_centro').empty()
        .append('<option value="">Seleziona Centro</option>');
      centri.forEach(c => {
        sel.append(`<option value="${c.id_centro}">${c.nome_centro} (${c.citta})</option>`);
      });
    }).fail(() => {
      $('#id_centro').empty().append('<option value="">Errore caricamento</option>');
    });
  }

  // Apri modal Aggiungi Risorsa
  $('#addResBtn').click(() => {
    loadCenters();
    $('#addResModal').removeClass('hidden').addClass('flex');
  });

  // Chiudi modal
  $('#cancelAddRes').click(() => {
    $('#addResModal').addClass('hidden');
    $('#addResForm')[0].reset();
  });

  // Submit nuovo form risorsa
  $('#addResForm').submit(function(e) {
    e.preventDefault();
    const data = {
      nome:                   $('#nome').val().trim(),
      marca:                  $('#marca').val().trim(),
      tipo:                   $('#tipo').val(),
      disponibilita:          +$('#disponibilita').val(),
      quantita:               +$('#quantita').val(),
      descrizione:            $('#descrizione').val().trim(),
      data_rilascio:          $('#data_rilascio').val(),
      casa_produttrice:       $('#casa_produttrice').val().trim(),
      categoria_didattico:    $('#categoria_didattico').val().trim(),
      piattaforma_didattico:  $('#piattaforma_didattico').val().trim(),
      lingua_didattico:       $('#lingua_didattico').val().trim(),
      pegi:                   $('#pegi').val().trim(),
      miniature:              $('#miniature').val().trim(),
      id_centro:              +$('#id_centro').val()
    };

    $.ajax({
      url: '/api/risorse',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success(res) {
        alert('Risorsa creata: ' + res.nome);
        $('#addResModal').addClass('hidden');
        $('#addResForm')[0].reset();
        loadRisorse();
      },
      error(xhr) {
        alert('Errore creazione risorsa: ' + xhr.responseJSON?.error);
      }
    });
  });

  // ---------------------------------------------------
  // View Details handler
  // ---------------------------------------------------
  $(document).on('click', '.view-details', function() {
    const id = $(this).data('id');
    localStorage.setItem('id_risorsa', id);
    window.location.href = 'details.html';
  });
});
