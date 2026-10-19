import { Botao } from '@/components/ui/Botao'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { useSincronia } from '@/conversas/useSincronia'
import { t } from '@/i18n/pt-BR'
import { useSessao } from '@/nostr/useSessao'

// Configuracoes > Varios aparelhos: a lista de conversas portatil (RN-WEB-SYNC-004).
export function SecaoSincronizacao() {
  const assinante = useSessao((s) => s.assinante)
  const sincLigada = useSincronia((s) => s.ligada)
  const sincEstado = useSincronia((s) => s.estado)
  const sincUltima = useSincronia((s) => s.ultimaEm)
  const definirSincLigada = useSincronia((s) => s.definirLigada)
  const sincronizarAgora = useSincronia((s) => s.sincronizarAgora)
  if (!assinante) return null

  return (
    <main className="mx-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 py-8">
      <CabecalhoPagina
        titulo={t.configuracoes.sincronizacao}
        voltarPara="/configuracoes"
        soNoCelular
      />

      <section className="flex flex-col gap-2" aria-labelledby="lista-portatil">
        <h2 id="lista-portatil" className="font-bold">
          {t.sincronia.secao}
        </h2>
        <p className="text-sm text-tinta-suave">{t.sincronia.ajuda}</p>
        <p role="status">
          {!sincLigada
            ? t.sincronia.desligada
            : sincEstado === 'sincronizando'
              ? t.sincronia.sincronizando
              : sincEstado === 'falhou'
                ? t.sincronia.falhou
                : sincUltima
                  ? t.sincronia.ok(
                      new Date(sincUltima).toLocaleTimeString('pt-BR', { timeStyle: 'short' }),
                    )
                  : t.sincronia.aindaNao}
        </p>
        <div className="flex flex-wrap gap-3">
          <Botao variante="secundario" onClick={() => definirSincLigada(!sincLigada)}>
            {sincLigada ? t.sincronia.desligar : t.sincronia.ligar}
          </Botao>
          {sincLigada && (
            <Botao
              variante="secundario"
              disabled={sincEstado === 'sincronizando'}
              onClick={() => void sincronizarAgora(assinante)}
            >
              {t.sincronia.agora}
            </Botao>
          )}
        </div>
      </section>
    </main>
  )
}
