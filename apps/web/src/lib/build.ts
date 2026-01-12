/**
 * Determines if the current build is the root marketing site build
 * (as opposed to the Mineiro app build).
 * 
 * The root build uses base URL "/" while the Mineiro build uses "/mineiro/".
 */
export function isRootBuild(): boolean {
  const baseUrl = import.meta.env.BASE_URL ?? '/';
  return baseUrl === '/' || baseUrl === '';
}
