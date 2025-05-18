// public/js/resources.js

$(function() {
  // ------------------------
  // 1) Caricamento risorse e filtri
  // ------------------------
  function loadRisorse() {
    const params = {
      search: $('#searchInput').val(),
      tipo:   $('#tipoFiltro').val()
    };
    $.get('/api/risorse', params)
      .done(response => {
        const container = $('#resourceContainer').empty();
        response.forEach(r => {
          const disp = r.disponibilita > 0;
          container.append(`
            <div class="bg-white border rounded-lg overflow-hidden shadow-sm">
              <div class="p-4">
                <div class="flex justify-between items-center mb-2">
                  <h3 class="text-lg font-semibold">${r.nome}</h3>
                  <span class="text-sm px-2 py-1 rounded-full ${
                    disp ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                  }">${disp ? 'Disponibile' : 'Non disponibile'}</span>
                </div>
                <p class="text-gray-600 text-sm mb-2">${r.casa_produttrice||''}</p>
                <img src="${r.miniature}" alt="${r.nome}"
                   class="h-40 object-cover m-auto mb-6"
                   onerror="this.src='/img/placeholder.png'"/>
                
                <button class="view-details bg-[#714be1] hover:bg-[#6131c4] text-white px-4 py-2 rounded-lg w-full mb-2 transition"
                        data-id="${r.id_risorsa}">
                  View Details
                </button>
              </div>
            </div>
          `);
        });
      })
      .fail(() => alert('Errore caricamento risorse'));
  }

  $('#searchInput').on('keyup', loadRisorse);
  $('#tipoFiltro').on('change', loadRisorse);
  $('button:contains("Apply")').on('click', loadRisorse);
  loadRisorse();

  // ------------------------
  // 2) View Details
  // ------------------------
  $(document).on('click', '.view-details', function() {
    localStorage.setItem('id_risorsa', $(this).data('id'));
    window.location.href = 'details.html';
  });

  // ------------------------
  // 3) Aggiunta risorsa (ADMIN, multi-step)
  // ------------------------

  const user    = JSON.parse(localStorage.getItem('user'));
  const isAdmin = user && (user.ruolo === 'admin' || user.ruolo === 'amministratore');
  if (isAdmin) $('#addResBtnContainer').show();

  // carica centri
  async function loadCenters() {
    try {
      const centri = await $.get('/api/centri');
      const sel = $('#id_centro').empty().append('<option value="">Seleziona Centro</option>');
      centri.forEach(c => sel.append(`<option value="${c.id_centro}">${c.nome_centro}</option>`));
    } catch {
      $('#id_centro').empty().append('<option value="">Errore caricamento</option>');
    }
  }

  // utility multi-step
  function showStep(n) {
    $('.modal-step').hide();
    $(`#step${n}`).show();
  }

  // Apri modal: assicuriamoci il form esista
  $('#addResBtn').click(async () => {
    await loadCenters();
    const form = $('#addResForm')[0];
    if (form) form.reset();
    showStep(1);
    $('#addResModal').removeClass('hidden').addClass('flex');
  });

  // Chiudi modal
  $('#cancelAddRes').click(() => {
    $('#addResModal').addClass('hidden');
  });

  // Step1 → Step2 o Step4
  $('#step1Next').click(() => {
    const tipo = $('#tipoSelect').val();
    if (!tipo) return alert('Seleziona Hardware o Software');
    if (tipo === 'hardware') {
      $('#hwFields').show();
      $('#didatticoFields, #videogiocoFields').hide();
      showStep(4);
    } else {
      showStep(2);
    }
  });

  // Step2 → Step4
  $('#step2Next').click(() => {
    const sw = $('#swSelect').val();
    if (!sw) return alert('Seleziona tipo software');
    $('#hwFields').hide();
    if (sw === 'didattico') {
      $('#didatticoFields').show();
      $('#videogiocoFields').hide();
    } else {
      $('#videogiocoFields').show();
      $('#didatticoFields').hide();
    }
    showStep(4);
  });

  $('#step2Back').click(() => showStep(1));

  // Step4 Indietro
  $('#step4Back').click(() => {
    const tipo = $('#tipoSelect').val();
    showStep(tipo === 'hardware' ? 1 : 2);
  });

  // Step4 Submit
  $('#step4Submit').click(async () => {
    const data = {
      nome:             $('#nome').val().trim(),
      tipo:             $('#tipoSelect').val(),
      descrizione:      $('#descrizione').val().trim(),
      data_rilascio:    $('#data_rilascio').val(),
      casa_produttrice: $('#casa_produttrice').val().trim(),
      disponibilita: +$('#disponibilita').val(),
      quantita: +$('#disponibilita').val(),
      miniature:        $('#miniature').val().trim(),
      id_centro:        +$('#id_centro').val()
    };

    if (data.tipo === 'hardware') {
      Object.assign(data, {
        marca: $('#marca').val().trim(),
      });
    } else {
      if ($('#swSelect').val() === 'didattico') {
        Object.assign(data, {
          tipo: $('#swSelect').val().trim(),
          versione_didattico: $('#versione_didattico').val().trim(),
          categoria_didattico: $('#categoria_didattico').val().trim(),
          piattaforma_didattico: $('#piattaforma_didattico').val().trim(),
          lingua_didattico: $('#lingua_didattico').val().trim()
        });
      } else {
        // ottieni il valore, se è vuoto o non numerico lo trasformi in null
        Object.assign(data, {
          tipo: $('#swSelect').val().trim(),
          pegi: $('#pegi').val().trim(),
          genere_game: $('#genere_game').val().trim(),
          trama_game: $('#trama_game').val().trim(),
          trailer_game: $('#trailer_game').val().trim()
        });
      }
    }

    try {
      const res = await $.ajax({
        url: '/api/risorse',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data)
      });
      alert('Risorsa creata: ' + res.nome);
      $('#addResModal').addClass('hidden');
      loadRisorse();
    } catch (xhr) {
      alert('Errore: ' + xhr.responseJSON?.error);
    }
  });
});
