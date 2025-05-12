$(document).ready(function () {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return alert('Devi prima effettuare il login.');

  const cont = $('#cartContainer');
  function loadCart() {
    $.get('/api/carrello', { id_utente: user.id_utente }, function(items) {
      cont.empty();
      if (!items.length) {
        $('#emptyCart').show();
        return;
      }
      $('#emptyCart').hide();
      items.forEach(it => {
        const card = `
          <div class="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
            <img src="${it.miniature}" alt="${it.nome}" class="h-16 w-16 object-cover rounded">
            <div class="flex-1">
              <h3 class="font-semibold">${it.nome}</h3>
              <p class="text-gray-500 text-sm">Added: ${new Date(it.data_inserimento).toLocaleDateString()}</p>
            </div>
            <button data-id="${it.id_carrello}" class="remove-btn text-red-500 hover:text-red-700">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>`;
        cont.append(card);
      });
    }).fail(() => alert('Errore nel caricamento del carrello.'));
  }

  // Rimuovi elemento
  $(document).on('click', '.remove-btn', function() {
    const id = $(this).data('id');
    $.ajax({
      url: `/api/carrello/${id}`,
      method: 'DELETE',
      success: () => loadCart(),
      error: () => alert('Errore durante la rimozione.')
    });
  });

  loadCart();
});
