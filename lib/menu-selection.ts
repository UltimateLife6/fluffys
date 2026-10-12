export function selectedCategory(names: string[], requested: string | null) {
  return requested && names.includes(requested) ? requested : 'All';
}
