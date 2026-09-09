export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function phoneLooksValid(value: string) {
  const digits = digitsOnly(value);
  return digits.length >= 8 && digits.length <= 15;
}

export function whatsappHref(phone: string) {
  const digits = digitsOnly(phone);
  if (!digits) return "";
  const intl = digits.length === 8 ? `506${digits}` : digits.replace(/^00/, "");
  return `https://wa.me/${intl}`;
}
