$(document).ready(function() {
  const userBtn      = $('#userBtn');
  const dropdown     = $('#userDropdown .py-1');
  const dropdownBox  = $('#userDropdown');
  const userData     = JSON.parse(localStorage.getItem('user'));

  // 1) Rendi il bottone con l’icona o le iniziali
  if (userData && userData.nome && userData.cognome) {
    const initials = userData.nome.charAt(0).toUpperCase() +
                     userData.cognome.charAt(0).toUpperCase();
    userBtn.text(initials);
  } else {
    userBtn.html('<i class="fas fa-user"></i>');
  }

  // 2) Costruisci il menu
  if (userData) {
    dropdown.html(`
      <a href="../html/profile.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
        Profilo
      </a>
      <button id="logoutBtn" class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
        Logout
      </button>
    `);
  } else {
    dropdown.html(`
      <a href="../html/login.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
        Login
      </a>
      <a href="../html/register.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
        Registrati
      </a>
    `);
  }

  // 3) Toggle dropdown
  userBtn.on('click', function(e) {
    e.stopPropagation();
    dropdownBox.toggleClass('hidden');
  });

  // 4) Logout handler
  $(document).on('click', '#logoutBtn', function() {
    localStorage.removeItem('user');
    location.reload();
  });

  // 5) Chiudi cliccando altrove
  $(document).on('click', function(e) {
    if (!$(e.target).closest('#userMenu').length) {
      dropdownBox.addClass('hidden');
    }
  });
});
