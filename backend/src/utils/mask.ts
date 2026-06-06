export const maskPhone = (phone: string): string =>
  phone.replace(/(\d{2})\d{5}(\d{3})/, '$1*****$2');