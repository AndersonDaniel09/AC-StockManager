export function currency(v) {
  return `$${Number(v || 0).toLocaleString('es-CO')}`;
}

function isWithinDateRange(dateValue, dateFrom, dateTo) {
  const date = new Date(dateValue);
  if (dateFrom && date < new Date(dateFrom)) return false;
  if (dateTo && date > new Date(`${dateTo}T23:59:59`)) return false;
  return true;
}

export function getCreditTotal(credit) {
  return (credit?.items || []).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function getCreditsTotal(credits) {
  return credits.reduce((sum, credit) => sum + getCreditTotal(credit), 0);
}

export function filterSalesByQueryAndDate(sales, { search, dateFrom, dateTo }) {
  const q = search.trim().toLowerCase();

  return sales.filter((sale) => {
    if (!isWithinDateRange(sale.createdAt, dateFrom, dateTo)) return false;
    if (!q) return true;

    const inSeller = sale.seller?.name?.toLowerCase().includes(q);
    const inProduct = (sale.items || []).some((item) => item.product?.name?.toLowerCase().includes(q));
    return Boolean(inSeller || inProduct);
  });
}

export function filterCreditsByStatusAndQueryAndDate(credits, status, { search, dateFrom, dateTo }) {
  const q = search.trim().toLowerCase();

  return credits
    .filter((credit) => credit.status === status)
    .filter((credit) => {
      if (!isWithinDateRange(credit.createdAt, dateFrom, dateTo)) return false;
      if (!q) return true;

      const inCustomer = credit.personName?.toLowerCase().includes(q);
      const inIdNumber = String(credit.customer?.idNumber || '').toLowerCase().includes(q);
      return Boolean(inCustomer || inIdNumber);
    });
}

export function groupItemsAsMiniInvoices(credit) {
  const groups = new Map();

  for (const item of credit.items || []) {
    const timestamp = item.createdAt || credit.createdAt;
    const key = new Date(timestamp).toISOString();

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        createdAt: timestamp,
        items: [],
      });
    }

    groups.get(key).items.push(item);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      subtotal: group.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
