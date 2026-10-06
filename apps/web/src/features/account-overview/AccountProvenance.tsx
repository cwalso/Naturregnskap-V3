import type { AccountProvenanceContent } from './content'

interface AccountProvenanceProps {
  readonly content: AccountProvenanceContent
}

export function AccountProvenance({ content }: AccountProvenanceProps) {
  return (
    <div className="account-provenance">
      <p className="account-provenance__summary">
        <strong>Datagrunnlag:</strong> {content.sourceName} {content.referenceVersion}
      </p>
      <details>
        <summary>Om datagrunnlaget</summary>
        <div className="account-provenance__details">
          <h2>Om datagrunnlaget</h2>
          <dl>
            <div>
              <dt>Kilde</dt>
              <dd>{content.sourceName}</dd>
            </div>
            <div>
              <dt>Referanseversjon</dt>
              <dd>{content.referenceVersion}</dd>
            </div>
            <div>
              <dt>Hva viser visningen?</dt>
              <dd>En overordnet arealfordeling for kommunen, gruppert som Natur, Dyrket mark og Bebygd.</dd>
            </div>
            <div>
              <dt>Metode</dt>
              <dd>
                {content.methodDescription}
                {content.methodVersion && <> Metodeversjon: {content.methodVersion}.</>}
              </dd>
            </div>
            <div>
              <dt>Datadekning</dt>
              <dd>{content.coverageDescription}</dd>
            </div>
            <div>
              <dt>Viktige avgrensninger</dt>
              <dd>{content.limitations}</dd>
            </div>
          </dl>
        </div>
      </details>
    </div>
  )
}
