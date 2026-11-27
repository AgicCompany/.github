// Lettura dei campi di pianificazione (Priority, Severity, Target date) durante il passaggio dai campi
// di progetto agli Issue Field di organizzazione (AgicCompany/github-adoption#44).
// Finche' il campo di progetto esiste ed e' valorizzato vale quello (lo modificano le colonne di board e
// tabella); altrimenti vale l'Issue Field. Dopo l'eliminazione del campo di progetto resta l'Issue Field.

// Valore di un Issue Field single select o data dal content dell'Issue.
export function readIssuePlanning(content, name) {
  const v = (content?.issueFieldValues?.nodes || []).find(x => x?.field?.name === name
    && (x.__typename === 'IssueFieldSingleSelectValue' || x.__typename === 'IssueFieldDateValue'));
  return v ? (v.name ?? v.dateValue ?? null) : null;
}

// projectValues: valori dei campi di progetto dell'item, per nome.
export function planningValue(content, projectValues, name) {
  return projectValues[name] ?? readIssuePlanning(content, name);
}
