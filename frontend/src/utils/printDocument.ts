/**
 * Prints only the mounted printable document.
 *
 * `window.print()` on its own prints the whole dashboard — sidebar, header and
 * the full prescription list — which is not what the user asked to print. The
 * body class switches the print stylesheet over to the printable node, and is
 * always removed again so the next print is unaffected.
 */
export function printDocument(): void {
  const node = document.getElementById('printable-prescription');
  if (!node) {
    // Nothing prepared to print; fall back rather than printing a blank page.
    window.print();
    return;
  }

  const PRINTING = 'printing-document';
  document.body.classList.add(PRINTING);

  const cleanup = () => {
    document.body.classList.remove(PRINTING);
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  try {
    window.print();
  } finally {
    // Safari and some mobile browsers never fire `afterprint`.
    setTimeout(cleanup, 1000);
  }
}
