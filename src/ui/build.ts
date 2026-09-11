/**
 * Which build this is.
 *
 * During a playtest the reports arrive over days, and fixes go out in between. A report
 * carried the *save* version before this existed - which is 7 on every build - so a bug
 * reported against the build before a fix and the same bug reported after it looked
 * identical, and there was no telling whether it was already dealt with.
 *
 * The stamp comes from whatever built the page, not from the page: the deploy workflow
 * hands the commit it checked out to Vite as `VITE_BUILD`, and Vite writes it into the
 * bundle. Nothing is fetched and nothing is read at runtime, so it cannot be wrong about
 * which code is running - it *is* the code that is running.
 *
 * A dev server has no commit to name, and a local `npm run build` has not been deployed,
 * so both say so rather than borrowing a SHA that would claim otherwise.
 */
const sha = import.meta.env.VITE_BUILD as string | undefined
const builtAt = import.meta.env.VITE_BUILT_AT as string | undefined

export const BUILD: string = sha
  ? `${sha.slice(0, 7)}${builtAt ? ` · ${builtAt}` : ''}`
  : import.meta.env.DEV
    ? 'dev'
    : 'local'
