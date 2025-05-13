$(function() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return alert('Devi effettuare il login.');

  const cont = $('#cartContainer');
  const emptyMsg = $('#emptyCart');
  const orderBtn = $('#orderBtn');
  const orderModal = $('#orderModal');
  const centerSelect = $('#centerSelect');

  function loadCart() {
    $.get('/api/carrello', { id_utente: user.id_utente }, function(items) {
      cont.empty();
      if (!items.length) {
        emptyMsg.show();
        orderBtn.prop('disabled', true).addClass('opacity-50 cursor-not-allowed');
        return;
      }
      emptyMsg.hide();
      orderBtn.prop('disabled', false).removeClass('opacity-50 cursor-not-allowed');
      items.forEach(it => {
        cont.append(`
          <div class="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
            <img src="${it.miniature}" alt="${it.nome}" class="h-16 w-16 object-cover rounded"/>
            <div class="flex-1">
              <h3 class="font-semibold">${it.nome}</h3>
              <p class="text-gray-500 text-sm">Aggiunto: ${new Date(it.data_inserimento).toLocaleDateString()}</p>
            </div>
            <button data-id="${it.id_carrello}" class="remove-btn text-red-500 hover:text-red-700">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>`);
      });
    });
  }

  function loadCenters() {
    $.get('/api/centri', function(centri) {
      centerSelect.empty().append('<option value="">-- Seleziona Centro --</option>');
      centri.forEach(c => {
        centerSelect.append(`<option value="${c.id_centro}">${c.nome_centro} (${c.citta})</option>`);
      });
    });
  }

  // Remove
  $(document).on('click', '.remove-btn', function() {
    const id = $(this).data('id');
    $.ajax({ url: `/api/carrello/${id}`, method: 'DELETE' })
      .done(loadCart)
      .fail(() => alert('Errore rimozione.'));
  });

  // Apri modal ordina
  orderBtn.click(function() {
    loadCenters();
    orderModal.removeClass('hidden').addClass('flex');
  });
  $('#cancelOrder').click(() => orderModal.addClass('hidden'));

  // Conferma ordine
  $('#confirmOrder').click(function() {
    const centroId = centerSelect.val();
    if (!centroId) return alert('Seleziona un centro.');
    $.ajax({
      url: '/api/order',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ id_utente: user.id_utente, id_centro: centroId }),
      success() {
        alert('Ordine effettuato!');
        orderModal.addClass('hidden');
        loadCart();
      },
      error() {
        alert('Errore durante l\'ordine.');
      }
    });
  });

  loadCart();
});
