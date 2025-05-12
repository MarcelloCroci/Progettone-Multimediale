$(document).ready(function () {
  // Carica le risorse iniziali
  loadRisorse();

  // Applica i filtri quando cambiano i valori
  $("#searchInput, #tipoFiltro").on("change keyup", function () {
    loadRisorse();
  });

  function loadRisorse() {
    const params = {
      search: $("#searchInput").val(),
      tipo: $("#tipoFiltro").val(),
    };

    $.ajax({
      url: "/api/risorse",
      method: "GET",
      data: params,
      success: function (data) {
        $("#resourceContainer").empty();

        if (data.length === 0) {
          $("#resourceContainer").html(
            "<p class='text-gray-600'>Nessuna risorsa trovata.</p>"
          );
          return;
        }

        data.forEach((risorsa) => {
          const disponibile = risorsa.disponibilita > 0;
          const card = `
    <div class="bg-white border rounded-lg overflow-hidden shadow-sm">
      <!-- Immagine in cima -->
      
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
        
        <p class="text-gray-600 text-sm mb-2">${
          risorsa.casa_produttrice || ""
        }</p>
        <img
        src="${risorsa.miniature}"
        alt="${risorsa.nome}"
        class=" h-40 object-cover m-auto"
        onerror="this.src='/img/placeholder.png';"
      />
        <p class="text-gray-700 mb-4 line-clamp-3">${
          risorsa.descrizione || ""
        }</p>
        <button
          class="view-details bg-[#714be1] hover:bg-[#6131c4] text-white px-4 py-2 rounded-lg w-full transition"
          data-id="${risorsa.id_risorsa}"
        >
          View Details
        </button>
      </div>
    </div>
  `;
          $("#resourceContainer").append(card);
        });
      },
      error: function () {
        alert("Errore durante il caricamento delle risorse.");
      },
    });
  }

  // Gestione click "View Details"
  $(document).on("click", ".view-details", function () {
    const id = $(this).data("id");
    if (id) {
      localStorage.setItem("id_risorsa", id);
      window.location.href = "details.html";
    }
  });
});
