// Inquiry form enhancement. Without this file the form posts normally and the server redirects
// to a result page. With it: topic-dependent fields, inline messages, in-place result.
// Validation here mirrors the server for convenience; the server remains the authority.

const MESSAGES: Record<string, string> = {
  valueMissing: 'Bitte füllen Sie dieses Feld aus.',
  typeMismatch: 'Bitte prüfen Sie die Schreibweise.',
  patternMismatch: 'Bitte prüfen Sie die Schreibweise.',
  tooShort: 'Diese Angabe ist zu kurz.',
  tooLong: 'Diese Angabe ist zu lang.',
  rangeUnderflow: 'Der Wert ist zu klein.',
  rangeOverflow: 'Der Wert ist zu groß.',
  stepMismatch: 'Bitte eine ganze Zahl angeben.',
  badInput: 'Bitte prüfen Sie die Eingabe.',
};
const FALLBACK_ERROR = 'Die Anfrage konnte gerade nicht gesendet werden. Bitte schreiben Sie uns direkt oder rufen Sie an.';

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

for (const form of document.querySelectorAll<HTMLFormElement>('[data-inquiry]')) enhance(form);

function enhance(form: HTMLFormElement) {
  const topic = form.querySelector<HTMLSelectElement>('[data-topic]')!;
  const groups = [...form.querySelectorAll<HTMLFieldSetElement>('[data-group]')];
  const status = form.querySelector<HTMLElement>('[data-status]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const submitLabel = form.querySelector<HTMLElement>('[data-submit-label]')!;
  const started = form.querySelector<HTMLInputElement>('[data-started]')!;
  const done = form.parentElement!.querySelector<HTMLElement>('[data-done]')!;
  const fields = () => [...form.elements].filter((el): el is Field => el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement);

  form.noValidate = true;
  started.value = String(Date.now());

  // Deep links: /kontakt/?anliegen=handel&format=lose
  const query = new URLSearchParams(location.search);
  const wanted = query.get('anliegen');
  if (wanted && [...topic.options].some((o) => o.value === wanted)) topic.value = wanted;
  const format = form.querySelector<HTMLSelectElement>('[name="format"]');
  const wantedFormat = query.get('format');
  if (format && wantedFormat && [...format.options].some((o) => o.value === wantedFormat)) format.value = wantedFormat;

  function syncGroups() {
    const catering = topic.value === 'catering';
    const other = topic.value === 'sonstiges';
    for (const group of groups) {
      const show = group.dataset.group === 'catering' ? catering : !catering && !other;
      group.hidden = !show;
      // hidden fields are not submitted and not validated
      group.disabled = !show;
    }
  }
  topic.addEventListener('change', syncGroups);
  syncGroups();

  function setError(field: Field | null, name: string, message: string) {
    const slot = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (slot) slot.textContent = message;
    if (!field) return;
    const described = new Set((field.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean));
    if (message) {
      field.setAttribute('aria-invalid', 'true');
      if (slot?.id) described.add(slot.id);
    } else {
      field.removeAttribute('aria-invalid');
      if (slot?.id) described.delete(slot.id);
    }
    if (described.size) field.setAttribute('aria-describedby', [...described].join(' '));
    else field.removeAttribute('aria-describedby');
  }

  function check(field: Field) {
    if (!field.name || field.type === 'hidden' || field.closest('.form__trap')) return true;
    const validity = field.validity;
    let message = '';
    if (!validity.valid) {
      const key = Object.keys(MESSAGES).find((k) => validity[k as keyof ValidityState]);
      message = field.type === 'email' && !validity.valueMissing ? 'Bitte geben Sie eine gültige E-Mail-Adresse an.' : MESSAGES[key ?? 'badInput'];
    }
    setError(field, field.name, message);
    return !message;
  }

  // Check a field when it is left; once it has an error, re-check while typing so the message clears promptly.
  form.addEventListener('focusout', (event) => {
    const field = event.target as Field;
    if (field.name && (field.value || field.getAttribute('aria-invalid'))) check(field);
  });
  form.addEventListener('input', (event) => {
    const field = event.target as Field;
    if (field.getAttribute?.('aria-invalid')) check(field);
  });

  function showStatus(message: string) {
    status.textContent = message;
    status.hidden = !message;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showStatus('');
    const invalid = fields().filter((field) => !field.disabled && !check(field));
    if (invalid.length) {
      invalid[0].focus();
      return;
    }

    submit.disabled = true;
    submitLabel.textContent = 'Wird gesendet …';
    try {
      const body = new URLSearchParams();
      for (const [key, value] of new FormData(form)) if (typeof value === 'string') body.append(key, value);
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
        body,
      });
      const result = (await response.json().catch(() => null)) as { ok: boolean; message?: string; fields?: Record<string, string> } | null;

      if (response.ok && result?.ok) {
        form.hidden = true;
        done.hidden = false;
        done.focus();
        return;
      }
      if (result?.fields) {
        let first: Field | null = null;
        for (const [name, message] of Object.entries(result.fields)) {
          const field = form.elements.namedItem(name) as Field | null;
          setError(field, name, message);
          first ??= field;
        }
        first?.focus();
      }
      showStatus(result?.message ?? FALLBACK_ERROR);
    } catch {
      showStatus(FALLBACK_ERROR);
    } finally {
      submit.disabled = false;
      submitLabel.textContent = 'Anfrage senden';
    }
  });
}
