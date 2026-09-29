import type { AccountProvenanceContent } from './content'

interface AccountProvenanceProps {
  readonly content: AccountProvenanceContent
}

const areaFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })

function areaMethodLabel(method?: string): string {
  if (!method) return 'Ikke oppgitt'
  if (method === 'geometry:shoelace:metric-crs') {
    return 'Beregnet direkte fra polygongeometri i metrisk ETRS89 / UTM'
  }
  if (method.startsWith('source-field:')) {
    return `Summert fra validert arealfelt ${method.slice('source-field:'.length)}`
  }
  return method
}

export function AccountProvenance({ content }: AccountProvenanceProps) {
  const excludedDekar = content.excludedAreaKm2 === undefined
    ? undefined
    : content.excludedAreaKm2 * 1000

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
              <dd>
                En overordnet arealfordeling for kommunen, klassifisert som
                Natur, Dyrket mark og Bebygd.
              </dd>
            </div>
            <div>
              <dt>Metode</dt>
              <dd>
                Arealene klassifiseres etter Level0-reglene for kommunale
                naturregnskap.
                {content.methodVersion && <> Metodeversjon: {content.methodVersion}.</>}
              </dd>
            </div>
            {content.areaMethod && (
              <div>
                <dt>Arealberegning</dt>
                <dd>{areaMethodLabel(content.areaMethod)}</dd>
              </div>
            )}
            {content.sourceFeatureCount !== undefined && (
              <div>
                <dt>Antall kildeobjekter</dt>
                <dd>{areaFormatter.format(content.sourceFeatureCount)}</dd>
              </div>
            )}
            {content.sourceFormat && (
              <div>
                <dt>Kildeformat</dt>
                <dd>{content.sourceFormat}</dd>
              </div>
            )}
            {content.sourceSha256 && (
              <div>
                <dt>Fingeravtrykk av kildefil</dt>
                <dd className="account-provenance__hash">{content.sourceSha256}</dd>
              </div>
            )}
            <div>
              <dt>Datadekning</dt>
              <dd>
                Regnskapsgrunnlaget er heldekkende innenfor den geografiske
                avgrensningen som inngår i beregningen.
              </dd>
            </div>
            <div>
              <dt>Viktige avgrensninger</dt>
              <dd>
                Regnskapet viser arealutbredelse på et overordnet nivå. Det
                beskriver ikke i seg selv naturtilstand eller alle naturverdier.
                {excludedDekar !== undefined && excludedDekar > 0 && (
                  <>
                    {' '}I gjeldende prototype er {areaFormatter.format(excludedDekar)}
                    {' '}dekar ekskludert fra de tre Level0-kategoriene. Dette er
                    areal som i Grunnkart er klassifisert som hav, og håndteringen
                    må avklares metodisk før produksjonssetting.
                  </>
                )}
              </dd>
            </div>
          </dl>

          {content.warnings.length > 0 && (
            <div className="account-provenance__warnings">
              <strong>Merknader fra beregningen</strong>
              <ul>
                {content.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
