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
              <dt>Hva viser regnskapet?</dt>
              <dd>En overordnet arealfordeling for kommunen, klassifisert som Natur, Dyrket mark og Bebygd.</dd>
            </div>
            <div>
              <dt>Metode</dt>
              <dd>
                Arealene er klassifisert etter metoden som brukes i kommunale naturregnskap.
                {content.methodVersion && <> Metodeversjon: {content.methodVersion}.</>}
              </dd>
            </div>
            <div>
              <dt>Datadekning</dt>
              <dd>Regnskapsgrunnlaget er heldekkende innenfor den geografiske avgrensningen som inngår i beregningen.</dd>
            </div>
            <div>
              <dt>Viktige avgrensninger</dt>
              <dd>Regnskapet viser arealutbredelse på et overordnet nivå. Det beskriver ikke i seg selv naturtilstand eller alle naturverdier. Mer detaljert naturinformasjon kan vises som supplerende data.</dd>
            </div>
          </dl>
        </div>
      </details>
    </div>
  )
}
