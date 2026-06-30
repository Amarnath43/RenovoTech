export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\+/g, 'plus')       
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};