$(document).ready(function () {
  const container = $('#centriContainer');

  function loadCentri() {
    const search = $('#searchCenter').val();
    
    $.ajax({
      url: '/api/centri',
      method: 'GET',
      data: { search },
      success: function (centri) {
        container.empty();

        if (!centri.length) {
          container.html('<p class="text-gray-600">Nessun centro trovato.</p>');
          return;
        }

        centri.forEach((centro) => {
          const card = `
            <div class="bg-white p-5 rounded-lg shadow-sm border hover:shadow-md transition">
              <h3 class="text-lg font-semibold mb-1">${centro.nome_centro}</h3>
              <p class="text-sm text-gray-600 flex items-center mb-1">
                <img src="../img/place.png" alt="place" class="h-5 w-auto mr-2">
                ${centro.citta}, ${centro.regione}
              </p>
              <p class="text-sm text-gray-600 mb-1">${centro.via} ${centro.numero_civico}, ${centro.cap}</p>
              <p class="text-sm text-gray-500">Tel: ${centro.telefono}</p>
            </div>
          `;
          container.append(card);
        });
      },
      error: function (err) {
        console.error('Errore nel caricamento dei centri:', err);
        container.html('<p class="text-red-500">Impossibile caricare i centri.</p>');
      }
    });
  }

  // Carica inizialmente
  loadCentri();

  // Ricarica ad ogni digitazione nel filtro
  $('#searchCenter').on('input', loadCentri);
});
