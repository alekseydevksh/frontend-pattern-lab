import messages from '@messages/en.json';

const text = messages.footer;

const link = 'text-ink underline underline-offset-2';

/**
 * The footer: the credit for the article and the sample site, the note that diagram numbers
 * are simulated, and the licences. The credit wording is the spec's ("Credit wording"); both
 * links stay live.
 */
export function SiteFooter() {
  return (
    <footer
      aria-label={text.label}
      className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 px-4 pt-2 pb-8 text-[12.5px] text-muted-text"
    >
      <p className="max-w-[90ch]">
        {text.intro}{' '}
        <a className={link} href={text.articleUrl}>
          “{text.articleTitle}”
        </a>{' '}
        {text.by}{' '}
        <a className={link} href={text.sampleUrl}>
          {text.sampleName}
        </a>
        . {text.simulated}
      </p>
      <p className="max-w-[90ch]">
        {text.licenceCode}{' '}
        <a className={link} href={text.licenceCodeUrl}>
          {text.licenceCodeName}
        </a>
        . {text.licenceContent}{' '}
        <a className={link} href={text.licenceContentUrl}>
          {text.licenceContentName}
        </a>
        . {text.licenceFonts}
      </p>
    </footer>
  );
}
