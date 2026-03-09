'use strict';

// Auto-dismiss alerts after 5 seconds
document.querySelectorAll('.alert[data-auto-dismiss]').forEach((el) => {
  setTimeout(() => {
    const bsAlert = bootstrap.Alert.getOrCreateInstance(el);
    bsAlert.close();
  }, 5000);
});