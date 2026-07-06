export const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getCurrentMonthDateRange = (today = new Date()) => ({
  dataInicial: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
  dataFinal: toDateInputValue(today),
});

export const formatDatePtBr = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
