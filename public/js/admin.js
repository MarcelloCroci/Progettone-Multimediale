// public/js/admin.js

$(async function() {
  // Carica statistiche numeriche
  const stats = await $.getJSON('/api/admin/stats');
  $('#totalRes').text(stats.totalResources);
  $('#availRes').text(stats.availableResources);
  $('#activeLoans').text(stats.activeLoans);
  $('#pendRes').text(stats.pendingReservations);

  // ------------------------
  // 1) Grafico PRESTITI (line chart)
  // ------------------------
  const loanData = await $.getJSON('/api/admin/loan-stats');
  const loanLabels = loanData.map(r => r.month);
  const loanCounts = loanData.map(r => +r.cnt);

  const ctxLoan = document.getElementById('loanChart').getContext('2d');
  new Chart(ctxLoan, {
    type: 'line',
    data: {
      labels: loanLabels,
      datasets: [{
        label: 'Prestiti mensili',
        data: loanCounts,
        fill: false,
        tension: 0.3,
        borderWidth: 2,
        borderColor:'#714be1',
        backgroundColor:'#714be1'
      }]
    },
    options: {
      scales: {
        x: { 
          ticks: { color: '#4A5568' }  // text-gray-700
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#4A5568' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // ------------------------
  // 2) Grafico CATEGORIE (bar chart)
  // ------------------------
  const catData = await $.getJSON('/api/admin/category-stats');
  const catLabels = catData.map(r => r.category);
  const catCounts = catData.map(r => +r.cnt);

  const ctxCat = document.getElementById('catChart').getContext('2d');
  new Chart(ctxCat, {
    type: 'bar',
    data: {
      labels: catLabels,
      datasets: [{
        label: 'Prestiti per categoria',
        data: catCounts,
        borderWidth: 1,
        backgroundColor:'#704be19f'
      }]
    },
    options: {
      indexAxis: 'y',
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: '#4A5568' }
        },
        y: {
          ticks: { color: '#4A5568' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
    // ------------------------
  // 3) Utenti con prestiti >180 giorni
  // ------------------------
  const overdueUsers = await $.getJSON('/api/admin/overdue-users');
  const tbodyU = $('#overdueUserTable tbody').empty();
  if (overdueUsers.length) {
    $('#overdueUserTable').removeClass('hidden');
    overdueUsers.forEach(u => {
      tbodyU.append(`
        <tr class="border-b hover:bg-gray-50">
          <td class="px-4 py-2">${u.nome_utente} (${u.nome} ${u.cognome})</td>
          <td class="px-4 py-2">${u.email}</td>
          <td class="px-4 py-2">${u.risorsa_nome} (#${u.id_risorsa})</td>
          <td class="px-4 py-2">${new Date(u.data_prestito).toLocaleDateString()}</td>
          <td class="px-4 py-2">${u.giorni_loan}</td>
        </tr>
      `);
    });
  } else {
    $('#noOverdueUsers').removeClass('hidden');
  }

});
